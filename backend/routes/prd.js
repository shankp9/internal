const express = require('express');
const PRD = require('../models/PRD');
const PRDVersion = require('../models/PRDVersion');
const Project = require('../models/Project');
const Meeting = require('../models/Meeting');
const MeetingTranscript = require('../models/MeetingTranscript');
const { protect } = require('../middleware/auth');
const { executeWorkflow } = require('../services/agentic/orchestrator');
const { calculateDiff, generateChangeSummary } = require('../services/diffService');
const User = require('../models/User');
const Assignment = require('../models/Assignment');

const router = express.Router();

// @route   POST /api/meetings/:meetingId/generate-prd
// @desc    Generate PRD from transcript using AI
// @access  Private
router.post('/meetings/:meetingId/generate-prd', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId)
      .populate('projectId')
      .populate('transcriptId');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    if (!meeting.transcriptId) {
      return res.status(400).json({
        success: false,
        message: 'No transcript found for this meeting',
      });
    }

    const transcript = await MeetingTranscript.findById(meeting.transcriptId);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: 'Transcript not found',
      });
    }

    // Get project context
    const project = await Project.findById(meeting.projectId)
      .populate('clientId')
      .populate('managerId');

    // Get existing PRD if any
    const existingPRD = await PRD.findOne({ projectId: meeting.projectId });

    // Get available developers for the project
    const assignments = await Assignment.find({ projectId: meeting.projectId, status: 'approved' })
      .populate('developerId');
    const developers = assignments.map(a => a.developerId).filter(Boolean);
    
    // Get all developers with skills
    const allDevelopers = await User.find({ role: 'employee', isActive: true })
      .select('name email skills');

    // Prepare workflow input
    const workflowInput = {
      transcript: transcript.parsedContent,
      projectId: meeting.projectId.toString(),
      meetingId: meeting._id.toString(),
      userId: req.user._id.toString(),
      existingPRD: existingPRD ? existingPRD.content : null,
      projectContext: {
        name: project.name,
        client: project.clientId?.name,
        manager: project.managerId?.name,
        startDate: project.startDate,
        endDate: project.endDate,
        tags: project.tags,
      },
      availableDevelopers: allDevelopers.map(dev => ({
        id: dev._id.toString(),
        name: dev.name,
        email: dev.email,
        skills: dev.skills || [],
      })),
    };

    // Execute workflow
    const result = await executeWorkflow(workflowInput);

    if (result.errors && result.errors.length > 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PRD',
        errors: result.errors,
      });
    }

    // Save PRD if generated
    let savedPRD = null;
    if (result.prdUpdate) {
      try {
        const PRDVersion = require('../models/PRDVersion');
        
        let prd = await PRD.findOne({ projectId: meeting.projectId });
        const oldContent = prd ? prd.content : '';
        const oldVersion = prd ? prd.version : 0;

        if (prd) {
          prd.content = result.prdUpdate.content;
          prd.version = oldVersion + 1;
          prd.lastUpdatedBy = req.user._id;
          prd.lastMeetingId = meeting._id;
          await prd.save();
        } else {
          prd = await PRD.create({
            projectId: meeting.projectId,
            content: result.prdUpdate.content,
            version: 1,
            lastUpdatedBy: req.user._id,
            lastMeetingId: meeting._id,
          });
          
          project.prdId = prd._id;
          await project.save();
        }

        // Create version record
        await PRDVersion.create({
          projectId: meeting.projectId,
          prdId: prd._id,
          version: oldVersion + 1,
          content: result.prdUpdate.content,
          changes: JSON.stringify({}),
          changeSummary: oldVersion === 0 
            ? 'Initial PRD generated from meeting transcript'
            : 'PRD updated from meeting transcript',
          meetingId: meeting._id,
          meetingDate: meeting.meetingDate,
          createdBy: req.user._id,
        });

        savedPRD = prd;
        console.log('[PRD] PRD saved successfully');
      } catch (prdSaveError) {
        console.error('[PRD] Error saving PRD:', prdSaveError);
        // Continue even if PRD save fails - log but don't throw
      }
    }

    res.json({
      success: true,
      data: {
        prdUpdate: result.prdUpdate,
        prd: savedPRD,
        suggestions: result.suggestions || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:projectId/prd
// @desc    Get master PRD
// @access  Private
router.get('/projects/:projectId/prd', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const prd = await PRD.findOne({ projectId: req.params.projectId })
      .populate('lastUpdatedBy', 'name email')
      .populate('lastMeetingId');

    if (!prd) {
      return res.status(404).json({
        success: false,
        message: 'PRD not found for this project',
      });
    }

    res.json({
      success: true,
      data: prd,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:projectId/prd/versions
// @desc    Get PRD version history
// @access  Private
router.get('/projects/:projectId/prd/versions', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const versions = await PRDVersion.find({ projectId: req.params.projectId })
      .populate('meetingId', 'title meetingDate')
      .populate('createdBy', 'name email')
      .sort({ version: -1 });

    res.json({
      success: true,
      count: versions.length,
      data: versions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:projectId/prd/versions/:versionId
// @desc    Get specific PRD version
// @access  Private
router.get('/projects/:projectId/prd/versions/:versionId', protect, async (req, res) => {
  try {
    const version = await PRDVersion.findById(req.params.versionId)
      .populate('meetingId', 'title meetingDate')
      .populate('createdBy', 'name email');

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:projectId/prd/diff/:versionId
// @desc    Get changes for a version
// @access  Private
router.get('/projects/:projectId/prd/diff/:versionId', protect, async (req, res) => {
  try {
    const version = await PRDVersion.findById(req.params.versionId);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    // Get previous version
    const previousVersion = await PRDVersion.findOne({
      projectId: version.projectId,
      version: version.version - 1,
    });

    const oldContent = previousVersion ? previousVersion.content : '';
    const newContent = version.content;

    const diff = calculateDiff(oldContent, newContent);
    const summary = generateChangeSummary(diff);

    res.json({
      success: true,
      data: {
        version,
        diff,
        summary,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/projects/:projectId/prd/merge
// @desc    Merge PRD update (with review)
// @access  Private
router.post('/projects/:projectId/prd/merge', protect, async (req, res) => {
  try {
    const { prdContent, meetingId, changeSummary } = req.body;

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Verify user has access
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    // Get existing PRD
    let prd = await PRD.findOne({ projectId: req.params.projectId });
    const oldContent = prd ? prd.content : '';
    const oldVersion = prd ? prd.version : 0;

    // Calculate diff
    const diff = calculateDiff(oldContent, prdContent);
    const summary = generateChangeSummary(diff);

    // Create version record
    const version = await PRDVersion.create({
      projectId: req.params.projectId,
      prdId: prd ? prd._id : null,
      version: oldVersion + 1,
      content: prdContent,
      changes: JSON.stringify(diff),
      changeSummary: changeSummary || summary,
      meetingId,
      meetingDate: meeting.meetingDate,
      createdBy: req.user._id,
    });

    // Update or create PRD
    if (prd) {
      prd.content = prdContent;
      prd.version = oldVersion + 1;
      prd.lastUpdatedBy = req.user._id;
      prd.lastMeetingId = meetingId;
      await prd.save();
    } else {
      prd = await PRD.create({
        projectId: req.params.projectId,
        content: prdContent,
        version: 1,
        lastUpdatedBy: req.user._id,
        lastMeetingId: meetingId,
      });
      
      // Update project with PRD reference
      project.prdId = prd._id;
      await project.save();
    }

    // Update version with PRD ID
    version.prdId = prd._id;
    await version.save();

    res.json({
      success: true,
      data: {
        prd,
        version,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

