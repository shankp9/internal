const express = require('express');
const AssignmentSuggestion = require('../models/AssignmentSuggestion');
const Assignment = require('../models/Assignment');
const DeveloperTask = require('../models/DeveloperTask');
const Project = require('../models/Project');
const Meeting = require('../models/Meeting');
const MeetingTranscript = require('../models/MeetingTranscript');
const { protect } = require('../middleware/auth');
const { executeWorkflow } = require('../services/agentic/orchestrator');
const User = require('../models/User');

// Helper function to find developer efficiently
async function findDeveloper(developerId, developerName, developerMap) {
  if (developerId) {
    return developerMap.get(developerId.toString()) || developerMap.get(developerId);
  }
  if (developerName) {
    return developerMap.get(developerName);
  }
  return null;
}

const router = express.Router();

// @route   POST /api/meetings/:meetingId/generate-assignments
// @desc    Generate assignment suggestions via LangGraph agent
// @access  Private
router.post('/meetings/:meetingId/generate-assignments', protect, async (req, res) => {
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
    const PRDModel = require('../models/PRD');
    const existingPRD = await PRDModel.findOne({ projectId: meeting.projectId });

    // Get available developers
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
        message: 'Failed to generate assignments',
        errors: result.errors,
      });
    }

    // Save PRD if generated (before saving suggestions)
    let savedPRD = null;
    if (result.prdUpdate) {
      try {
        const PRDModel = require('../models/PRD');
        const PRDVersion = require('../models/PRDVersion');
        
        let prd = await PRDModel.findOne({ projectId: meeting.projectId });
        const oldContent = prd ? prd.content : '';
        const oldVersion = prd ? prd.version : 0;

        if (prd) {
          prd.content = result.prdUpdate.content;
          prd.version = oldVersion + 1;
          prd.lastUpdatedBy = req.user._id;
          prd.lastMeetingId = meeting._id;
          await prd.save();
        } else {
          prd = await PRDModel.create({
            projectId: meeting.projectId,
            content: result.prdUpdate.content,
            version: 1,
            lastUpdatedBy: req.user._id,
            lastMeetingId: meeting._id,
          });
          
          const project = await Project.findById(meeting.projectId);
          if (project) {
            project.prdId = prd._id;
            await project.save();
          }
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
        console.log('[AssignmentSuggestions] PRD saved successfully');
      } catch (prdSaveError) {
        console.error('[AssignmentSuggestions] Error saving PRD:', prdSaveError);
        // Continue even if PRD save fails - log but don't throw
      }
    }

    // Save suggestions to database (optimized with batch operations)
    console.log(`[AssignmentSuggestions] Saving ${result.suggestions?.length || 0} suggestions to database...`);
    const saveStart = Date.now();
    
    if (!result.suggestions || result.suggestions.length === 0) {
      console.log('[AssignmentSuggestions] No suggestions to save');
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Collect all developer IDs and names
    const developerIds = result.suggestions.map(s => s.developerId).filter(Boolean);
    const developerNames = result.suggestions.map(s => s.developerName).filter(Boolean);
    
    // Batch fetch all developers at once
    const developers = await User.find({
      $or: [
        { _id: { $in: developerIds } },
        { name: { $in: developerNames } },
      ],
    });
    
    const developerMap = new Map();
    developers.forEach(dev => {
      developerMap.set(dev._id.toString(), dev);
      if (dev.name) developerMap.set(dev.name, dev);
    });

    // Prepare all suggestions for batch creation
    const suggestionsToCreate = [];
    
    for (const suggestion of result.suggestions) {
      // Handle suggestions without developer (needsManualAssignment flag)
      if (suggestion.needsManualAssignment || !suggestion.developerId) {
        console.log(`[AssignmentSuggestions] Creating suggestion without developer for: ${suggestion.title}`);
        suggestionsToCreate.push({
          projectId: meeting.projectId,
          meetingId: meeting._id,
          developerId: null, // No developer assigned - manager needs to decide
          suggestedUtilization: suggestion.utilization || 50,
          suggestedStartDate: new Date(suggestion.startDate),
          suggestedEndDate: new Date(suggestion.endDate),
          tags: suggestion.tags || [],
          title: suggestion.title,
          description: suggestion.description || '',
          reasoning: suggestion.reasoning || 'No developer matched - manager needs to assign from existing resources or add new resources',
          priority: suggestion.priority || 'medium',
          status: 'pending',
          createdBy: req.user._id,
          _tempTaskBreakdown: suggestion.taskBreakdown,
          needsManualAssignment: true,
        });
        continue;
      }

      const developer = findDeveloper(
        suggestion.developerId,
        suggestion.developerName,
        developerMap
      );

      if (!developer) {
        console.warn(`[AssignmentSuggestions] Developer not found for suggestion: ${suggestion.title}, creating without developer`);
        // Create suggestion without developer so manager can assign
        suggestionsToCreate.push({
          projectId: meeting.projectId,
          meetingId: meeting._id,
          developerId: null,
          suggestedUtilization: suggestion.utilization || 50,
          suggestedStartDate: new Date(suggestion.startDate),
          suggestedEndDate: new Date(suggestion.endDate),
          tags: suggestion.tags || [],
          title: suggestion.title,
          description: suggestion.description || '',
          reasoning: suggestion.reasoning || 'Developer not found - manager needs to assign',
          priority: suggestion.priority || 'medium',
          status: 'pending',
          createdBy: req.user._id,
          _tempTaskBreakdown: suggestion.taskBreakdown,
          needsManualAssignment: true,
        });
        continue;
      }

      suggestionsToCreate.push({
        projectId: meeting.projectId,
        meetingId: meeting._id,
        developerId: developer._id,
        suggestedUtilization: suggestion.utilization || 50,
        suggestedStartDate: new Date(suggestion.startDate),
        suggestedEndDate: new Date(suggestion.endDate),
        tags: suggestion.tags || [],
        title: suggestion.title,
        description: suggestion.description || '',
        reasoning: suggestion.reasoning || '',
        priority: suggestion.priority || 'medium',
        status: 'pending',
        createdBy: req.user._id,
        _tempTaskBreakdown: suggestion.taskBreakdown,
        needsManualAssignment: false,
      });
    }

    if (suggestionsToCreate.length === 0) {
      console.log('[AssignmentSuggestions] No valid suggestions after developer validation');
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Batch create all suggestions
    const createdSuggestions = await AssignmentSuggestion.insertMany(suggestionsToCreate);
    console.log(`[AssignmentSuggestions] Created ${createdSuggestions.length} suggestions`);

    // Create tasks for suggestions that have breakdowns (batch)
    const tasksToCreate = [];
    const suggestionTaskMap = new Map(); // Map suggestion index to task data

    // First pass: collect all task titles for dependency resolution
    const taskTitleMap = new Map(); // Will map task title to task index
    const tasksWithDependencies = [];

    createdSuggestions.forEach((suggestion, index) => {
      const originalSuggestion = suggestionsToCreate[index];
      if (originalSuggestion._tempTaskBreakdown) {
        const breakdown = originalSuggestion._tempTaskBreakdown;
        const taskTitle = breakdown.taskTitle || suggestion.title;
        taskTitleMap.set(taskTitle, index);
        tasksWithDependencies.push({
          index,
          suggestion,
          breakdown,
          originalSuggestion,
        });
      }
    });

    // Create tasks without dependencies first
    tasksWithDependencies.forEach(({ suggestion, breakdown, originalSuggestion }) => {
      const taskData = {
        assignmentSuggestionId: suggestion._id,
        projectId: meeting.projectId,
        developerId: suggestion.developerId || null,
        title: breakdown.taskTitle || suggestion.title,
        description: breakdown.taskDescription || suggestion.description || '',
        subtasks: breakdown.subtasks || [],
        acceptanceCriteria: breakdown.acceptanceCriteria || [],
        dependencies: [], // Will be resolved after all tasks are created
        technicalRequirements: breakdown.technicalRequirements || [],
        estimatedEffort: breakdown.estimatedEffortHours || 0,
        estimatedUtilization: suggestion.suggestedUtilization,
        priority: suggestion.priority,
        status: 'pending',
      };
      tasksToCreate.push(taskData);
      suggestionTaskMap.set(suggestion._id.toString(), taskData);
    });

    // Batch create all tasks (without dependencies first)
    let createdTasks = [];
    if (tasksToCreate.length > 0) {
      createdTasks = await DeveloperTask.insertMany(tasksToCreate);
      console.log(`[AssignmentSuggestions] Created ${createdTasks.length} developer tasks`);
      
      // Resolve dependencies by matching task titles to created task ObjectIds
      const titleToTaskIdMap = new Map();
      createdTasks.forEach((task, idx) => {
        const taskInfo = tasksWithDependencies[idx];
        if (taskInfo) {
          const taskTitle = taskInfo.breakdown.taskTitle || task.title;
          titleToTaskIdMap.set(taskTitle, task._id);
        }
      });

      // Update tasks with resolved dependencies
      const dependencyUpdateOps = [];
      createdTasks.forEach((task, idx) => {
        const taskInfo = tasksWithDependencies[idx];
        if (taskInfo && taskInfo.breakdown.dependencies && taskInfo.breakdown.dependencies.length > 0) {
          const resolvedDependencies = taskInfo.breakdown.dependencies
            .map(dep => {
              // Try to find matching task by title
              const dependentTaskId = titleToTaskIdMap.get(dep.taskId);
              if (dependentTaskId) {
                return {
                  taskId: dependentTaskId,
                  description: dep.description || `Depends on: ${dep.taskId}`,
                  taskTitle: dep.taskId, // Store title for reference
                };
              }
              // If no match found, store with just description and title
              return {
                taskId: null,
                description: dep.description || `Depends on: ${dep.taskId}`,
                taskTitle: dep.taskId,
              };
            })
            .filter(Boolean);

          if (resolvedDependencies.length > 0) {
            dependencyUpdateOps.push({
              updateOne: {
                filter: { _id: task._id },
                update: { $set: { dependencies: resolvedDependencies } },
              },
            });
          }
        }
      });

      // Batch update tasks with resolved dependencies
      if (dependencyUpdateOps.length > 0) {
        await DeveloperTask.bulkWrite(dependencyUpdateOps);
        console.log(`[AssignmentSuggestions] Resolved dependencies for ${dependencyUpdateOps.length} tasks`);
      }
      
      // Batch update suggestions with task references
      const updateOps = createdTasks.map(task => ({
        updateOne: {
          filter: { _id: task.assignmentSuggestionId },
          update: { $set: { taskBreakdown: task._id } },
        },
      }));
      
      if (updateOps.length > 0) {
        await AssignmentSuggestion.bulkWrite(updateOps);
      }
    }

    // Populate and return (batch)
    const populatedSuggestions = await AssignmentSuggestion.find({
      _id: { $in: createdSuggestions.map(s => s._id) },
    })
      .populate('developerId', 'name email skills')
      .populate('meetingId', 'title meetingDate')
      .populate('createdBy', 'name email');

    const saveEnd = Date.now();
    console.log(`[AssignmentSuggestions] Database save completed in ${saveEnd - saveStart}ms`);

    const savedSuggestions = populatedSuggestions;

    res.json({
      success: true,
      count: savedSuggestions.length,
      data: savedSuggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:projectId/assignment-suggestions
// @desc    Get pending suggestions with detailed tasks
// @access  Private
router.get('/projects/:projectId/assignment-suggestions', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { projectId: req.params.projectId };
    
    if (status) {
      query.status = status;
    }

    const suggestions = await AssignmentSuggestion.find(query)
      .populate('developerId', 'name email skills')
      .populate('meetingId', 'title meetingDate')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate({
        path: 'taskBreakdown',
        select: 'taskDescription description subtasks acceptanceCriteria technicalRequirements estimatedEffortHours',
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/assignment-suggestions/:id/tasks
// @desc    Get detailed task breakdown for suggestion
// @access  Private
router.get('/assignment-suggestions/:id/tasks', protect, async (req, res) => {
  try {
    const suggestion = await AssignmentSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found',
      });
    }

    const tasks = await DeveloperTask.find({
      assignmentSuggestionId: req.params.id,
    })
      .populate('developerId', 'name email skills')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/assignment-suggestions/:id/approve
// @desc    Approve and create assignment with tasks
// @access  Private
router.post('/assignment-suggestions/:id/approve', protect, async (req, res) => {
  try {
    const suggestion = await AssignmentSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found',
      });
    }

    // Verify user has access
    const project = await Project.findById(suggestion.projectId);
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Create assignment
    const assignment = await Assignment.create({
      projectId: suggestion.projectId,
      developerId: suggestion.developerId,
      utilization: suggestion.suggestedUtilization,
      startDate: suggestion.suggestedStartDate,
      endDate: suggestion.suggestedEndDate,
      tags: suggestion.tags,
      status: 'pending',
      submittedBy: req.user._id,
      suggestionSource: 'ai-generated',
      assignmentSuggestionId: suggestion._id,
    });

    // Get tasks for this suggestion
    const tasks = await DeveloperTask.find({
      assignmentSuggestionId: suggestion._id,
    });

    // Update tasks with assignment ID
    for (const task of tasks) {
      task.assignmentId = assignment._id;
      await task.save();
    }

    if (tasks.length > 0) {
      assignment.taskBreakdown = tasks[0]._id;
      await assignment.save();
    }

    // Update suggestion
    suggestion.status = 'approved';
    suggestion.reviewedBy = req.user._id;
    suggestion.reviewedAt = new Date();
    suggestion.assignedAssignmentId = assignment._id;
    await suggestion.save();

    await assignment.populate('developerId', 'name email skills');
    await assignment.populate('projectId', 'name');

    res.json({
      success: true,
      data: {
        assignment,
        tasks,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/assignment-suggestions/:id/reject
// @desc    Reject suggestion
// @access  Private
router.post('/assignment-suggestions/:id/reject', protect, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const suggestion = await AssignmentSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found',
      });
    }

    // Verify user has access
    const project = await Project.findById(suggestion.projectId);
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    suggestion.status = 'rejected';
    suggestion.reviewedBy = req.user._id;
    suggestion.reviewedAt = new Date();
    suggestion.rejectionReason = rejectionReason || 'No reason provided';
    await suggestion.save();

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:projectId/assignment-suggestions/history
// @desc    Track generation history
// @access  Private
router.get('/projects/:projectId/assignment-suggestions/history', protect, async (req, res) => {
  try {
    const suggestions = await AssignmentSuggestion.find({
      projectId: req.params.projectId,
    })
      .populate('meetingId', 'title meetingDate')
      .populate('developerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

