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

const router = express.Router();

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

            // Execute workflow to generate PRD and assignments
            const result = await executeWorkflow(workflowInput);

            // Step 1: Save PRD first (if generated) - Always try to save even if there are errors
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

                prdGenerated = true;
                console.log('[Meeting] PRD saved successfully');
              } catch (prdSaveError) {
                console.error('[Meeting] Error saving PRD:', prdSaveError);
                // Continue even if PRD save fails - log but don't throw
              }
            } else {
              console.log('[Meeting] No PRD update in workflow result');
            }

            // Step 2: Save assignment suggestions immediately (if any) - Always try even if there were workflow errors
            if (result.suggestions && result.suggestions.length > 0) {
              try {
                console.log(`[Meeting] Saving ${result.suggestions.length} assignment suggestions...`);
                const AssignmentSuggestion = require('../models/AssignmentSuggestion');
                const DeveloperTask = require('../models/DeveloperTask');
                
                // Batch fetch all developers at once
                const developerIds = result.suggestions.map(s => s.developerId).filter(Boolean);
                const developerNames = result.suggestions.map(s => s.developerName).filter(Boolean);
                
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

                // Prepare suggestions for batch creation
                const suggestionsToCreate = [];
                
                for (const suggestion of result.suggestions) {
                  let developer = null;
                  if (suggestion.developerId) {
                    developer = developerMap.get(suggestion.developerId);
                  } else if (suggestion.developerName) {
                    developer = developerMap.get(suggestion.developerName);
                  }

                  // If matchScore is 0 or very low, mark for manual assignment
                  const needsManual = !developer || !suggestion.developerId || 
                                    (suggestion.matchScore !== undefined && suggestion.matchScore < 30);

                  suggestionsToCreate.push({
                    projectId: meeting.projectId,
                    meetingId: meeting._id,
                    developerId: developer ? developer._id : null,
                    suggestedUtilization: suggestion.utilization || 50,
                    suggestedStartDate: new Date(suggestion.startDate),
                    suggestedEndDate: new Date(suggestion.endDate),
                    tags: suggestion.tags || [],
                    title: suggestion.title,
                    description: suggestion.description || '',
                    reasoning: suggestion.reasoning || 
                      (needsManual ? 'No suitable developer matched - manager needs to assign' : ''),
                    priority: suggestion.priority || 'medium',
                    status: 'pending',
                    createdBy: req.user._id,
                    needsManualAssignment: needsManual,
                    _tempTaskBreakdown: suggestion.taskBreakdown,
                    _tempMatchScore: suggestion.matchScore || 0,
                  });
                }

                // Batch create all suggestions
                const createdSuggestions = await AssignmentSuggestion.insertMany(suggestionsToCreate);
                console.log(`[Meeting] Created ${createdSuggestions.length} assignment suggestions`);

                // Create tasks for suggestions that have breakdowns (batch)
                const tasksToCreate = [];
                const taskDependencyMap = new Map(); // Map task index to dependency info for later resolution

                createdSuggestions.forEach((suggestion, index) => {
                  const originalSuggestion = suggestionsToCreate[index];
                  if (originalSuggestion._tempTaskBreakdown) {
                    const breakdown = originalSuggestion._tempTaskBreakdown;
                    
                    // Store dependency info for later resolution (since taskIds are titles, not ObjectIds yet)
                    const rawDependencies = breakdown.dependencies || [];
                    taskDependencyMap.set(index, {
                      rawDependencies,
                      taskTitle: breakdown.taskTitle || suggestion.title,
                    });
                    
                    // Create task without dependencies first (will be resolved after all tasks are created)
                    tasksToCreate.push({
                      assignmentSuggestionId: suggestion._id,
                      projectId: meeting.projectId,
                      developerId: suggestion.developerId || null, // Allow null if no developer assigned
                      title: breakdown.taskTitle || suggestion.title,
                      description: breakdown.taskDescription || suggestion.description || '',
                      subtasks: breakdown.subtasks || [],
                      acceptanceCriteria: breakdown.acceptanceCriteria || [],
                      dependencies: [], // Will be populated after task creation
                      technicalRequirements: breakdown.technicalRequirements || [],
                      estimatedEffort: breakdown.estimatedEffortHours || 0,
                      estimatedUtilization: suggestion.suggestedUtilization,
                      priority: suggestion.priority,
                      status: 'pending',
                    });
                  }
                });

                // Batch create all tasks (without dependencies first)
                if (tasksToCreate.length > 0) {
                  const createdTasks = await DeveloperTask.insertMany(tasksToCreate);
                  console.log(`[Meeting] Created ${createdTasks.length} developer tasks`);
                  
                  // Now resolve dependencies by matching task titles to created task ObjectIds
                  const titleToTaskIdMap = new Map();
                  createdTasks.forEach((task, idx) => {
                    const depInfo = taskDependencyMap.get(idx);
                    if (depInfo) {
                      titleToTaskIdMap.set(depInfo.taskTitle, task._id);
                    }
                  });

                  // Update tasks with resolved dependencies
                  const dependencyUpdateOps = [];
                  createdTasks.forEach((task, idx) => {
                    const depInfo = taskDependencyMap.get(idx);
                    if (depInfo && depInfo.rawDependencies.length > 0) {
                      const resolvedDependencies = depInfo.rawDependencies
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
                          // If no match found, store with just description and title (taskId will be null)
                          return {
                            taskId: null,
                            description: dep.description || `Depends on: ${dep.taskId}`,
                            taskTitle: dep.taskId,
                          };
                        });

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
                    console.log(`[Meeting] Resolved dependencies for ${dependencyUpdateOps.length} tasks`);
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

                console.log('[Meeting] Assignment suggestions saved successfully');
              } catch (suggestionSaveError) {
                console.error('[Meeting] Error saving assignment suggestions:', suggestionSaveError);
                console.error('[Meeting] Error details:', suggestionSaveError.message);
                // Try to save suggestions individually if batch fails
                if (result.suggestions && result.suggestions.length > 0) {
                  try {
                    console.log('[Meeting] Attempting to save suggestions individually...');
                    const AssignmentSuggestion = require('../models/AssignmentSuggestion');
                    let savedCount = 0;
                    for (const suggestion of result.suggestions) {
                      try {
                        // Try to save each suggestion individually (without tasks)
                        await AssignmentSuggestion.create({
                          projectId: meeting.projectId,
                          meetingId: meeting._id,
                          developerId: suggestion.developerId || null,
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
                          needsManualAssignment: suggestion.needsManualAssignment || false,
                        });
                        savedCount++;
                      } catch (individualError) {
                        console.error(`[Meeting] Failed to save suggestion "${suggestion.title}":`, individualError.message);
                      }
                    }
                    console.log(`[Meeting] Saved ${savedCount} suggestions individually (tasks will need to be added manually)`);
                  } catch (individualSaveError) {
                    console.error('[Meeting] Failed to save suggestions individually:', individualSaveError.message);
                  }
                }
              }
            } else {
              console.log('[Meeting] No assignment suggestions generated');
            }
          } catch (prdError) {
            console.error('[Meeting] Workflow execution error:', prdError);
            console.error('[Meeting] Error stack:', prdError.stack);
            // Don't fail the meeting creation if PRD generation fails
            // But log the error for debugging
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

    res.status(201).json({
      success: true,
      data: {
        meeting,
        transcript,
        prdGenerated,
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

      const result = await executeWorkflow(workflowInput);
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

    res.json({
      success: true,
      data: meeting,
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

