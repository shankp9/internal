const express = require('express');
const Meeting = require('../models/Meeting');
const MeetingTranscript = require('../models/MeetingTranscript');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const { upload, uploadMultiple } = require('../middleware/upload');
const { parseFile } = require('../utils/fileParser');
const path = require('path');
const fs = require('fs');
const { executeWorkflow } = require('../services/agentic/orchestrator');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { openai } = require('../services/aiService');
const PipelineExecution = require('../models/PipelineExecution');

const router = express.Router();

// @route   POST /api/meetings/extract-transcript
// @desc    Extract meeting details from transcript using AI with streaming
// @access  Private
router.post('/extract-transcript', protect, upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Parse the file
    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
    let parsedContent;
    
    try {
      parsedContent = await parseFile(req.file.path, fileType);
    } catch (parseError) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Failed to parse file: ${parseError.message}`,
      });
    }

    // Set up Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Helper function to send SSE message
    const sendSSE = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial message
    sendSSE({ type: 'start', message: 'Starting transcript extraction...' });

    if (!openai) {
      fs.unlinkSync(req.file.path);
      sendSSE({ type: 'error', message: 'OpenAI API key is not configured' });
      res.end();
      return;
    }

    try {
      // Create prompt for extracting meeting details
      const prompt = `Analyze the following meeting transcript and extract the following information:
1. Meeting Title - A concise, descriptive title for the meeting
2. Summary - A comprehensive summary of the meeting (2-3 paragraphs)
3. Agenda - A list of agenda items discussed (bullet points)
4. Participants - A list of participants with their names, roles, and emails if mentioned

Transcript:
${parsedContent}

Return the response as JSON with the following structure:
{
  "title": "Meeting title here",
  "summary": "Meeting summary here",
  "agenda": "Agenda items here (bullet points)",
  "participants": [
    {
      "name": "Participant name",
      "role": "Participant role",
      "email": "email@example.com" or ""
    }
  ]
}

Return only valid JSON, no markdown formatting.`;

      // Use OpenAI streaming API
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts meeting information from transcripts. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        stream: true,
      });

      let fullResponse = '';
      let currentField = null;
      let currentText = '';
      let extractedData = {
        title: '',
        summary: '',
        agenda: '',
        participants: [],
      };

      // Process streaming response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          
          // Try to parse JSON incrementally
          // For word-by-word streaming, we'll send updates as we receive them
          // The client will handle the word-by-word display
          
          // Send word-by-word updates
          const words = content.split(/(\s+)/);
          for (const word of words) {
            if (word.trim()) {
              sendSSE({
                type: 'word',
                word: word,
                fullText: fullResponse,
              });
            }
          }
        }
      }

      // Parse the final JSON response
      try {
        // Clean up the response - remove markdown code blocks if present
        let jsonText = fullResponse.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\n?/g, '');
        }

        // Extract JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonText);
        
        // Send field-by-field updates
        if (parsed.title) {
          sendSSE({
            type: 'field',
            field: 'title',
            text: parsed.title,
            isComplete: true,
          });
        }
        
        if (parsed.summary) {
          sendSSE({
            type: 'field',
            field: 'summary',
            text: parsed.summary,
            isComplete: true,
          });
        }
        
        if (parsed.agenda) {
          sendSSE({
            type: 'field',
            field: 'agenda',
            text: parsed.agenda,
            isComplete: true,
          });
        }
        
        if (parsed.participants && Array.isArray(parsed.participants)) {
          sendSSE({
            type: 'field',
            field: 'participants',
            text: JSON.stringify(parsed.participants),
            isComplete: true,
          });
        }

        // Send final complete data
        sendSSE({
          type: 'complete',
          data: {
            title: parsed.title || '',
            summary: parsed.summary || '',
            agenda: parsed.agenda || '',
            participants: parsed.participants || [],
          },
        });
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        sendSSE({
          type: 'error',
          message: 'Failed to parse extracted data',
          rawResponse: fullResponse,
        });
      }

      // Clean up file
      fs.unlinkSync(req.file.path);
      
      // End SSE stream
      res.end();
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      fs.unlinkSync(req.file.path);
      sendSSE({
        type: 'error',
        message: error.message || 'Failed to extract meeting details',
      });
      res.end();
    }
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/meetings/:projectId
// @desc    Create meeting record with optional transcript upload
// @access  Private
router.post('/:projectId', protect, uploadMultiple, async (req, res) => {
  try {
    const { title, meetingDate, participants, agenda, summary, autoGeneratePRD } = req.body;
    const file = req.files && req.files.transcript ? req.files.transcript[0] : null;

    // Parse participants if it's a string (from FormData)
    let parsedParticipants = [];
    if (participants) {
      if (typeof participants === 'string') {
        try {
          const parsed = JSON.parse(participants);
          // Ensure it's an array and each item has the correct structure
          if (Array.isArray(parsed)) {
            parsedParticipants = parsed.map(p => ({
              name: p.name || '',
              role: p.role || '',
              email: p.email || '',
            })).filter(p => p.name); // Only include participants with a name
          }
        } catch (e) {
          // If JSON parse fails, participants array stays empty
          console.warn('Failed to parse participants:', e.message);
          parsedParticipants = [];
        }
      } else if (Array.isArray(participants)) {
        // Ensure each participant has the correct structure
        parsedParticipants = participants.map(p => ({
          name: p.name || (typeof p === 'string' ? p : ''),
          role: p.role || '',
          email: p.email || '',
        })).filter(p => p.name || (typeof p === 'string' && p));
      }
    }

    // Verify project exists and user has access
    const project = await Project.findById(req.params.projectId)
      .populate('clientId')
      .populate('managerId');
    
    if (!project) {
      if (file) fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Managers can only create meetings for their projects
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      if (file) fs.unlinkSync(file.path);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create meetings for this project',
      });
    }

    // Create meeting
    const meeting = await Meeting.create({
      projectId: req.params.projectId,
      title,
      meetingDate,
      participants: parsedParticipants,
      agenda,
      summary,
      createdBy: req.user._id,
      status: 'scheduled',
    });

    let transcript = null;
    let prdGenerated = false;

    // If file is uploaded, process it
    if (file) {
      try {
        // Parse the file
        const fileType = path.extname(file.originalname).slice(1).toLowerCase();
        const parsedContent = await parseFile(file.path, fileType);

        // Create transcript record
        transcript = await MeetingTranscript.create({
          meetingId: meeting._id,
          projectId: meeting.projectId,
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          fileType,
          fileSize: file.size,
          parsedContent,
          uploadedBy: req.user._id,
          processingStatus: 'completed',
        });

        // Update meeting with transcript reference
        meeting.transcriptId = transcript._id;
        await meeting.save();

        // Auto-generate PRD if requested
        if (autoGeneratePRD === 'true' || autoGeneratePRD === true) {
          try {
            // Check if pipeline execution already exists for this meeting
            let pipelineExecution = await PipelineExecution.findOne({ meetingId: meeting._id });
            
            if (pipelineExecution && pipelineExecution.status === 'completed') {
              console.log('[Meeting] Pipeline already completed for this meeting, skipping execution');
              prdGenerated = true;
            } else {
              // Create or update pipeline execution record
              if (!pipelineExecution) {
                pipelineExecution = await PipelineExecution.create({
                  meetingId: meeting._id,
                  projectId: meeting.projectId,
                  status: 'pending',
                  createdBy: req.user._id,
                });
              }

              // Get existing PRD if any
              const PRDModel = require('../models/PRD');
              const existingPRD = await PRDModel.findOne({ projectId: meeting.projectId });

              // Get available developers
              const allDevelopers = await User.find({ role: 'employee', isActive: true })
                .select('name email skills');

              // Prepare workflow input
              const workflowInput = {
                transcript: parsedContent,
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

              // Get pipeline namespace for Socket.IO events
              const pipelineNamespace = req.app.get('pipelineNamespace');
              
              // Execute workflow to generate PRD and assignments (async - don't wait)
              executeWorkflow(workflowInput, { 
                pipelineNamespace,
                pipelineExecutionId: pipelineExecution._id.toString(),
              }).catch((error) => {
                console.error('[Meeting] Pipeline execution error:', error);
              });
              
              // Don't wait for pipeline to complete - return immediately
              prdGenerated = true;
            }
          } catch (prdError) {
            console.error('[Meeting] Pipeline execution error:', prdError);
            // Don't fail the meeting creation if pipeline fails
            // Pipeline will handle its own errors and save state
          }
        }
      } catch (parseError) {
        // Clean up file on error
        if (file) fs.unlinkSync(file.path);
        // Continue with meeting creation even if file parsing fails
        console.error('File parsing error:', parseError);
      }
    }

    await meeting.populate('projectId', 'name clientId');
    await meeting.populate('createdBy', 'name email');
    if (transcript) {
      await meeting.populate('transcriptId');
    }

    // Get pipeline execution status if it exists
    let pipelineExecution = null;
    if (meeting.transcriptId) {
      pipelineExecution = await PipelineExecution.findOne({ meetingId: meeting._id })
        .select('status currentAgent progress agentResults startedAt completedAt error')
        .lean();
    }

    res.status(201).json({
      success: true,
      data: {
        meeting,
        transcript,
        prdGenerated,
        pipelineExecution,
      },
    });
  } catch (error) {
    if (req.files && req.files.transcript) {
      req.files.transcript.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/meetings/:meetingId/transcript
// @desc    Upload transcript file
// @access  Private
router.post('/:meetingId/transcript', protect, upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const meeting = await Meeting.findById(req.params.meetingId);
    if (!meeting) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    // Verify user has access to this meeting's project
    const project = await Project.findById(meeting.projectId);
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Parse the file
    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
    let parsedContent;
    
    try {
      parsedContent = await parseFile(req.file.path, fileType);
    } catch (parseError) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Failed to parse file: ${parseError.message}`,
      });
    }

    // Create transcript record
    const transcript = await MeetingTranscript.create({
      meetingId: req.params.meetingId,
      projectId: meeting.projectId,
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileType,
      fileSize: req.file.size,
      parsedContent,
      uploadedBy: req.user._id,
      processingStatus: 'completed',
    });

    // Update meeting with transcript reference
    meeting.transcriptId = transcript._id;
    await meeting.save();

    // Auto-generate PRD after transcript upload
    let prdGenerated = false;
    try {
      const project = await Project.findById(meeting.projectId)
        .populate('clientId')
        .populate('managerId');

      const PRDModel = require('../models/PRD');
      const existingPRD = await PRDModel.findOne({ projectId: meeting.projectId });

      const allDevelopers = await User.find({ role: 'employee', isActive: true })
        .select('name email skills');

      const workflowInput = {
        transcript: parsedContent,
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

      // Get pipeline namespace for Socket.IO events
      const pipelineNamespace = req.app.get('pipelineNamespace');
      
      const result = await executeWorkflow(workflowInput, { pipelineNamespace });
      if (result.prdUpdate && !result.errors?.length) {
        // Auto-save PRD
        const PRDModel = require('../models/PRD');
        const PRDVersion = require('../models/PRDVersion');
        
        let prd = await PRDModel.findOne({ projectId: meeting.projectId });
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
          changeSummary: 'PRD generated from meeting transcript',
          meetingId: meeting._id,
          meetingDate: meeting.meetingDate,
          createdBy: req.user._id,
        });

        prdGenerated = true;
      }
    } catch (prdError) {
      console.error('PRD generation error:', prdError);
    }

    res.status(201).json({
      success: true,
      data: {
        transcript,
        prdGenerated,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/meetings/pipeline-status/:meetingId
// @desc    Get pipeline execution status for a meeting
// @access  Private
router.get('/pipeline-status/:meetingId', protect, async (req, res) => {
  try {
    const pipelineExecution = await PipelineExecution.findOne({ meetingId: req.params.meetingId })
      .select('status currentAgent progress agentResults startedAt completedAt error')
      .lean();

    if (!pipelineExecution) {
      return res.status(404).json({
        success: false,
        message: 'Pipeline execution not found',
      });
    }

    res.json({
      success: true,
      data: pipelineExecution,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/meetings/:meetingId
// @desc    Get meeting details
// @access  Private
router.get('/:meetingId', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId)
      .populate('projectId', 'name clientId managerId')
      .populate('createdBy', 'name email')
      .populate('transcriptId');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    // Verify access
    const project = await Project.findById(meeting.projectId);
    if (req.user.role === 'employee') {
      // Employees can only see meetings for projects they're assigned to
      // This would require checking assignments
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this meeting',
      });
    }

    // Get pipeline execution status if it exists
    let pipelineExecution = null;
    if (meeting.transcriptId) {
      pipelineExecution = await PipelineExecution.findOne({ meetingId: meeting._id })
        .select('status currentAgent progress agentResults startedAt completedAt error')
        .lean();
    }

    res.json({
      success: true,
      data: {
        meeting,
        pipelineExecution,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/meetings/project/:projectId
// @desc    List all meetings for project
// @access  Private
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Verify access
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const meetings = await Meeting.find({ projectId: req.params.projectId })
      .populate('createdBy', 'name email')
      .populate('transcriptId')
      .sort({ meetingDate: -1 });

    res.json({
      success: true,
      count: meetings.length,
      data: meetings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

