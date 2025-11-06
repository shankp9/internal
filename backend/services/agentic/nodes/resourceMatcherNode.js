const { generateJSON } = require('../../aiService');

/**
 * Resource Matcher Node
 * Matches tasks to developers based on skills and capacity
 */
async function resourceMatcherNode(state) {
  const { taskBreakdowns, availableDevelopers, projectContext } = state;

  try {
    // If no task breakdowns, return empty matches
    if (!taskBreakdowns || taskBreakdowns.length === 0) {
      return {
        ...state,
        matchedAssignments: [],
      };
    }

    const matchedAssignments = [];

    for (const { assignment, breakdown } of taskBreakdowns) {
      const systemPrompt = `You are a Resource Allocation Specialist. Match assignments to the best-fit developers based on:
- Required skills vs developer skills
- Current capacity and availability
- Developer experience level
- Project team composition
- Workload balance

Return the best match with reasoning.`;

      const prompt = `Match the following assignment to the best developer:

Project Context: ${JSON.stringify(projectContext, null, 2)}

Assignment:
${JSON.stringify(assignment, null, 2)}

Task Breakdown:
${JSON.stringify(breakdown, null, 2)}

Available Developers:
${JSON.stringify(availableDevelopers, null, 2)}

Find the best developer match and provide reasoning.`;

      const schema = {
        developerId: 'string',
        developerName: 'string',
        matchScore: 'number (0-100)',
        reasoning: 'string',
        recommendedUtilization: 'number (0-100)',
        skillMatch: {
          type: 'array',
          items: {
            skill: 'string',
            matchLevel: 'string (exact/partial/none)',
          },
        },
        capacityAnalysis: 'string',
      };

      const match = await generateJSON(prompt, schema, { 
        systemPrompt,
        functionName: 'resourceMatcherNode',
        model: 'gpt-4o-mini', // Use cost-efficient model
        projectId: state.metadata?.projectId,
        meetingId: state.metadata?.meetingId,
        userId: state.metadata?.userId,
      });

      matchedAssignments.push({
        assignment,
        breakdown,
        match,
      });
    }

    return {
      ...state,
      matchedAssignments,
    };
  } catch (error) {
    return {
      ...state,
      errors: [...(state.errors || []), `Resource matcher error: ${error.message}`],
    };
  }
}

module.exports = resourceMatcherNode;

