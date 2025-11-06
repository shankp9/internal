const { generateJSON } = require('../../aiService');

/**
 * Technical Analyst Node
 * Breaks down assignments into detailed developer tasks
 */
async function technicalAnalystNode(state) {
  const { extractedAssignments, projectContext } = state;

  try {
    // If no assignments extracted, return empty task breakdowns
    if (!extractedAssignments) {
      console.warn('[TechnicalAnalyst] extractedAssignments is undefined or null');
      return {
        ...state,
        taskBreakdowns: [],
      };
    }

    // Ensure extractedAssignments is an array
    if (!Array.isArray(extractedAssignments)) {
      console.error('[TechnicalAnalyst] extractedAssignments is not an array:', typeof extractedAssignments);
      console.error('[TechnicalAnalyst] extractedAssignments value:', extractedAssignments);
      return {
        ...state,
        taskBreakdowns: [],
        errors: [...(state.errors || []), 'Technical analyst error: extractedAssignments is not an array'],
      };
    }

    if (extractedAssignments.length === 0) {
      console.log('[TechnicalAnalyst] No assignments to process');
      return {
        ...state,
        taskBreakdowns: [],
      };
    }

    console.log(`[TechnicalAnalyst] Processing ${extractedAssignments.length} assignments`);
    const taskBreakdowns = [];

    for (const assignment of extractedAssignments) {
      const systemPrompt = `You are a Senior Technical Analyst. Your role is to break down assignments into detailed, actionable developer tasks.
For each assignment, create:
- A comprehensive task description
- Subtasks that need to be completed
- Acceptance criteria for each task
- Technical requirements
- Dependencies between subtasks
- Estimated effort in hours
- Any prerequisites or blockers`;

      const prompt = `Break down the following assignment into detailed developer tasks:

Project Context: ${JSON.stringify(projectContext, null, 2)}

Assignment:
${JSON.stringify(assignment, null, 2)}

Create a detailed task breakdown that a developer can use to execute this assignment.`;

      const schema = {
        taskTitle: 'string',
        taskDescription: 'string',
        subtasks: {
          type: 'array',
          items: {
            title: 'string',
            description: 'string',
            order: 'number',
          },
        },
        acceptanceCriteria: 'array of strings',
        technicalRequirements: 'array of strings',
        dependencies: {
          type: 'array',
          items: {
            taskId: 'string',
            description: 'string',
          },
        },
        estimatedEffortHours: 'number',
        prerequisites: 'array of strings',
        blockers: 'array of strings',
      };

      const breakdown = await generateJSON(prompt, schema, { 
        systemPrompt,
        functionName: 'technicalAnalystNode',
        model: 'gpt-4o-mini', // Use cost-efficient model
        projectId: state.metadata?.projectId,
        meetingId: state.metadata?.meetingId,
        userId: state.metadata?.userId,
      });
      taskBreakdowns.push({
        assignmentId: assignment.title, // Temporary ID
        assignment,
        breakdown,
      });
    }

    return {
      ...state,
      taskBreakdowns,
    };
  } catch (error) {
    return {
      ...state,
      errors: [...(state.errors || []), `Technical analyst error: ${error.message}`],
    };
  }
}

module.exports = technicalAnalystNode;

