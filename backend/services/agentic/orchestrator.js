const transcriptAnalysisNode = require('./nodes/transcriptAnalysisNode');
const projectManagerNode = require('./nodes/projectManagerNode');
const technicalAnalystNode = require('./nodes/technicalAnalystNode');
const resourceMatcherNode = require('./nodes/resourceMatcherNode');
const prdWriterNode = require('./nodes/prdWriterNode');
const validationNode = require('./nodes/validationNode');
const PipelineExecution = require('../../models/PipelineExecution');

/**
 * Execute the agentic workflow
 * Orchestrates multiple AI agents in sequence to process meeting transcripts
 * @param {Object} input - Workflow input
 * @param {Object} options - Optional options including pipelineNamespace for Socket.IO events
 */
async function executeWorkflow(input, options = {}) {
  const { pipelineNamespace, pipelineExecutionId } = options;
  const emitEvent = (eventName, data) => {
    if (pipelineNamespace && input.meetingId) {
      const meetingIdString = typeof input.meetingId === 'string' 
        ? input.meetingId 
        : (input.meetingId._id ? input.meetingId._id.toString() : input.meetingId.toString());
      const room = `meeting-${meetingIdString}`;
      const eventData = {
        meetingId: meetingIdString,
        ...data,
      };
      console.log(`[Pipeline] Emitting ${eventName} to room ${room}:`, eventData);
      pipelineNamespace.to(room).emit(eventName, eventData);
    } else {
      console.warn(`[Pipeline] Cannot emit ${eventName}:`, {
        hasNamespace: !!pipelineNamespace,
        hasMeetingId: !!input.meetingId,
      });
    }
  };

  // Helper function to save agent result
  const saveAgentResult = async (agentName, status, result = null, error = null) => {
    if (!pipelineExecutionId) return;
    
    try {
      const updateData = {
        [`agentResults.${agentName}.status`]: status,
        [`agentResults.${agentName}.result`]: result,
        [`agentResults.${agentName}.error`]: error || null,
      };

      if (status === 'running') {
        updateData[`agentResults.${agentName}.startedAt`] = new Date();
        updateData.currentAgent = agentName;
        updateData.status = 'running';
        if (!updateData.startedAt) {
          updateData.startedAt = new Date();
        }
      } else if (status === 'completed') {
        updateData[`agentResults.${agentName}.completedAt`] = new Date();
      } else if (status === 'failed') {
        updateData[`agentResults.${agentName}.completedAt`] = new Date();
        updateData.status = 'failed';
        updateData.error = error || 'Pipeline execution failed';
      }

      await PipelineExecution.findByIdAndUpdate(pipelineExecutionId, {
        $set: updateData,
      });
    } catch (error) {
      console.error(`[Pipeline] Failed to save ${agentName} result:`, error);
    }
  };

  try {
    // Ensure projectId is always a string (ObjectId string)
    let projectIdString = input.projectId;
    if (projectIdString && typeof projectIdString !== 'string') {
      // If it's an object, extract _id
      if (projectIdString._id) {
        projectIdString = projectIdString._id.toString();
      } else if (projectIdString.toString) {
        projectIdString = projectIdString.toString();
      }
    }
    
    let meetingIdString = input.meetingId;
    if (meetingIdString && typeof meetingIdString !== 'string') {
      if (meetingIdString._id) {
        meetingIdString = meetingIdString._id.toString();
      } else if (meetingIdString.toString) {
        meetingIdString = meetingIdString.toString();
      }
    }
    
    let userIdString = input.userId;
    if (userIdString && typeof userIdString !== 'string') {
      if (userIdString._id) {
        userIdString = userIdString._id.toString();
      } else if (userIdString.toString) {
        userIdString = userIdString.toString();
      }
    }

    let state = {
      transcript: input.transcript,
      projectId: projectIdString,
      existingPRD: input.existingPRD || null,
      projectContext: input.projectContext || {},
      availableDevelopers: input.availableDevelopers || [],
      errors: [],
      metadata: {
        projectId: projectIdString, // Always a string
        meetingId: meetingIdString || null,
        userId: userIdString || null,
      },
    };

    // Step 1: Analyze transcript
    console.log('Step 1: Analyzing transcript...');
    await saveAgentResult('transcript-analysis', 'running');
    emitEvent('pipeline-status', {
      currentAgent: 'transcript-analysis',
      status: 'active',
      progress: 10,
      message: 'Analyzing transcript...',
    });
    state = await transcriptAnalysisNode(state);
    await saveAgentResult('transcript-analysis', 'completed', state.transcriptAnalysis || state);
    emitEvent('pipeline-status', {
      currentAgent: 'transcript-analysis',
      status: 'completed',
      progress: 20,
      message: 'Transcript analysis completed',
    });

    // Step 2: Generate PRD first (this should be saved to database before generating assignments)
    console.log('Step 2: Generating PRD...');
    await saveAgentResult('prd-writer', 'running');
    emitEvent('pipeline-status', {
      currentAgent: 'prd-writer',
      status: 'active',
      progress: 30,
      message: 'Generating PRD...',
    });
    state = await prdWriterNode(state);
    await saveAgentResult('prd-writer', 'completed', state.prdUpdate || state);
    
    // Save PRD to database
    if (state.prdUpdate && state.metadata.projectId) {
      try {
        const PRDModel = require('../../models/PRD');
        const PRDVersion = require('../../models/PRDVersion');
        const Project = require('../../models/Project');
        
        const project = await Project.findById(state.metadata.projectId);
        if (project) {
          let prd = await PRDModel.findOne({ projectId: state.metadata.projectId });
          const oldVersion = prd ? prd.version : 0;

          if (prd) {
            prd.content = state.prdUpdate.content;
            prd.version = oldVersion + 1;
            prd.lastUpdatedBy = state.metadata.userId;
            prd.lastMeetingId = state.metadata.meetingId;
            await prd.save();
          } else {
            prd = await PRDModel.create({
              projectId: state.metadata.projectId,
              content: state.prdUpdate.content,
              version: 1,
              lastUpdatedBy: state.metadata.userId,
              lastMeetingId: state.metadata.meetingId,
            });
            
            project.prdId = prd._id;
            await project.save();
          }

          // Create version record
          await PRDVersion.create({
            projectId: state.metadata.projectId,
            prdId: prd._id,
            version: oldVersion + 1,
            content: state.prdUpdate.content,
            changes: JSON.stringify({}),
            changeSummary: oldVersion === 0 
              ? 'Initial PRD generated from meeting transcript'
              : 'PRD updated from meeting transcript',
            meetingId: state.metadata.meetingId,
            meetingDate: new Date(),
            createdBy: state.metadata.userId,
          });
          
          console.log('[Pipeline] PRD saved successfully');
        }
      } catch (prdError) {
        console.error('[Pipeline] Error saving PRD:', prdError);
      }
    }
    
    emitEvent('pipeline-status', {
      currentAgent: 'prd-writer',
      status: 'completed',
      progress: 40,
      message: 'PRD generation completed',
    });

    // Step 3: Extract assignments from meeting
    console.log('Step 3: Extracting assignments from meeting...');
    await saveAgentResult('project-manager', 'running');
    emitEvent('pipeline-status', {
      currentAgent: 'project-manager',
      status: 'active',
      progress: 50,
      message: 'Extracting assignments from meeting...',
    });
    state = await projectManagerNode(state);
    await saveAgentResult('project-manager', 'completed', state.extractedAssignments || state);
    emitEvent('pipeline-status', {
      currentAgent: 'project-manager',
      status: 'completed',
      progress: 60,
      message: 'Assignment extraction completed',
    });
    
    // If no assignments found, still return PRD
    if (!state.extractedAssignments || state.extractedAssignments.length === 0) {
      console.log('[Workflow] No assignments extracted, returning PRD only');
      
      // Mark pipeline as completed
      if (pipelineExecutionId) {
        try {
          await PipelineExecution.findByIdAndUpdate(pipelineExecutionId, {
            $set: {
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              currentAgent: null,
            },
          });
        } catch (error) {
          console.error('[Pipeline] Failed to mark pipeline as completed:', error);
        }
      }
      
      emitEvent('pipeline-completed', {
        progress: 100,
        message: 'Pipeline completed (no assignments found)',
      });
      return {
        ...state,
        suggestions: [],
        errors: state.errors || [],
      };
    }

    // Step 4: Technical analysis - break down assignments into tasks
    console.log('Step 4: Breaking down assignments into technical tasks...');
    await saveAgentResult('technical-analyst', 'running');
    emitEvent('pipeline-status', {
      currentAgent: 'technical-analyst',
      status: 'active',
      progress: 70,
      message: 'Breaking down assignments into technical tasks...',
    });
    state = await technicalAnalystNode(state);
    await saveAgentResult('technical-analyst', 'completed', state.technicalAnalysis || state);
    emitEvent('pipeline-status', {
      currentAgent: 'technical-analyst',
      status: 'completed',
      progress: 80,
      message: 'Technical analysis completed',
    });

    // Step 5: Resource matching - match tasks to developers
    console.log('Step 5: Matching resources to assignments...');
    await saveAgentResult('resource-matcher', 'running');
    emitEvent('pipeline-status', {
      currentAgent: 'resource-matcher',
      status: 'active',
      progress: 85,
      message: 'Matching resources to assignments...',
    });
    state = await resourceMatcherNode(state);
    await saveAgentResult('resource-matcher', 'completed', state.matchedResources || state);
    emitEvent('pipeline-status', {
      currentAgent: 'resource-matcher',
      status: 'completed',
      progress: 90,
      message: 'Resource matching completed',
    });

    // Step 6: Validation and final output
    console.log('Step 6: Validating and formatting output...');
    await saveAgentResult('validation', 'running');
    emitEvent('pipeline-status', {
      currentAgent: 'validation',
      status: 'active',
      progress: 95,
      message: 'Validating and formatting output...',
    });
    const validationStart = Date.now();
    state = await validationNode(state);
    const validationEnd = Date.now();
    console.log(`[Workflow] Validation completed in ${validationEnd - validationStart}ms`);
    await saveAgentResult('validation', 'completed', state.suggestions || state);
    
    // Save assignment suggestions to database
    if (state.suggestions && state.suggestions.length > 0 && state.metadata.projectId && state.metadata.meetingId) {
      try {
        const AssignmentSuggestion = require('../../models/AssignmentSuggestion');
        const DeveloperTask = require('../../models/DeveloperTask');
        const User = require('../../models/User');
        
        console.log(`[Pipeline] Saving ${state.suggestions.length} assignment suggestions...`);
        
        // Batch fetch all developers at once
        const developerIds = state.suggestions.map(s => s.developerId).filter(Boolean);
        const developerNames = state.suggestions.map(s => s.developerName).filter(Boolean);
        
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
        
        for (const suggestion of state.suggestions) {
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
            projectId: state.metadata.projectId,
            meetingId: state.metadata.meetingId,
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
            createdBy: state.metadata.userId,
            needsManualAssignment: needsManual,
            _tempTaskBreakdown: suggestion.taskBreakdown,
            _tempMatchScore: suggestion.matchScore || 0,
          });
        }

        // Batch create all suggestions
        const createdSuggestions = await AssignmentSuggestion.insertMany(suggestionsToCreate);
        console.log(`[Pipeline] Created ${createdSuggestions.length} assignment suggestions`);

        // Create tasks for suggestions that have breakdowns (batch)
        const tasksToCreate = [];
        const taskDependencyMap = new Map();

        createdSuggestions.forEach((suggestion, index) => {
          const originalSuggestion = suggestionsToCreate[index];
          if (originalSuggestion._tempTaskBreakdown) {
            const breakdown = originalSuggestion._tempTaskBreakdown;
            
            const rawDependencies = breakdown.dependencies || [];
            taskDependencyMap.set(index, {
              rawDependencies,
              taskTitle: breakdown.taskTitle || suggestion.title,
            });
            
            tasksToCreate.push({
              assignmentSuggestionId: suggestion._id,
              projectId: state.metadata.projectId,
              developerId: suggestion.developerId || null,
              title: breakdown.taskTitle || suggestion.title,
              description: breakdown.taskDescription || suggestion.description || '',
              subtasks: breakdown.subtasks || [],
              acceptanceCriteria: breakdown.acceptanceCriteria || [],
              dependencies: [],
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
          console.log(`[Pipeline] Created ${createdTasks.length} developer tasks`);
          
          // Resolve dependencies
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
                  const dependentTaskId = titleToTaskIdMap.get(dep.taskId);
                  if (dependentTaskId) {
                    return {
                      taskId: dependentTaskId,
                      description: dep.description || `Depends on: ${dep.taskId}`,
                      taskTitle: dep.taskId,
                    };
                  }
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
            console.log(`[Pipeline] Resolved dependencies for ${dependencyUpdateOps.length} tasks`);
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
        
        console.log('[Pipeline] Assignment suggestions saved successfully');
      } catch (suggestionError) {
        console.error('[Pipeline] Error saving assignment suggestions:', suggestionError);
        console.error('[Pipeline] Error stack:', suggestionError.stack);
      }
    }
    
    emitEvent('pipeline-status', {
      currentAgent: 'validation',
      status: 'completed',
      progress: 100,
      message: 'Validation completed',
    });

    // Log any errors but don't fail completely
    if (state.errors && state.errors.length > 0) {
      console.warn('Workflow completed with errors:', state.errors);
    }

    // Mark pipeline as completed
    if (pipelineExecutionId) {
      try {
        await PipelineExecution.findByIdAndUpdate(pipelineExecutionId, {
          $set: {
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            currentAgent: null,
          },
        });
      } catch (error) {
        console.error('[Pipeline] Failed to mark pipeline as completed:', error);
      }
    }

    console.log('[Workflow] Workflow execution completed successfully');
    emitEvent('pipeline-completed', {
      progress: 100,
      message: 'Pipeline completed successfully',
    });
    return state;
  } catch (error) {
    console.error('Workflow execution error:', error);
    
    // Mark pipeline as failed
    if (pipelineExecutionId) {
      try {
        await PipelineExecution.findByIdAndUpdate(pipelineExecutionId, {
          $set: {
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error('[Pipeline] Failed to mark pipeline as failed:', dbError);
      }
    }
    
    emitEvent('pipeline-error', {
      error: error.message,
      message: 'Pipeline execution failed',
    });
    throw new Error(`Workflow execution error: ${error.message}`);
  }
}

module.exports = {
  executeWorkflow,
};

