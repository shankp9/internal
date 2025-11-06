const { generateJSON } = require('../../aiService');

/**
 * Project Manager Node
 * Extracts assignments from meeting context like a PM would
 */
async function projectManagerNode(state) {
  const { transcript, meetingAnalysis, projectContext, existingPRD } = state;

  try {
    const systemPrompt = `You are an experienced Project Manager. Your role is to identify and extract assignments from meeting discussions.
You need to think like a PM and identify:
- Explicit assignments (clearly stated tasks)
- Implicit assignments (tasks implied from discussions)
- Skill requirements for each assignment
- Priority levels
- Dependencies between tasks
- Estimated utilization percentages based on task complexity
- Deadlines and timeframes

Be intelligent about understanding context - if someone mentions a feature needs to be built, that's an assignment even if not explicitly stated.`;

    const prompt = `Based on the meeting transcript and analysis, extract all assignments as a Project Manager would:

Project Context: ${JSON.stringify(projectContext, null, 2)}
Existing PRD: ${existingPRD || 'No existing PRD'}

Meeting Analysis:
${JSON.stringify(meetingAnalysis, null, 2)}

Meeting Transcript:
${transcript}

Extract all assignments, including both explicit and implicit ones. For each assignment, identify:
1. What needs to be done (description)
2. What skills are required
3. Estimated utilization percentage (0-100%)
4. Priority level
5. Dependencies on other tasks
6. Suggested timeline/deadline
7. Any tags/categories

IMPORTANT: Return the actual assignments array with real data, NOT the schema structure. Each assignment should have actual values for title, description, requiredSkills, estimatedUtilization, priority, dependencies, suggestedStartDate, suggestedEndDate, tags, and reasoning.`;

    const schema = {
      assignments: {
        type: 'array',
        items: {
          title: 'string',
          description: 'string',
          requiredSkills: 'array of strings',
          estimatedUtilization: 'number (0-100)',
          priority: 'string (low/medium/high/critical)',
          dependencies: 'array of strings',
          suggestedStartDate: 'string (ISO date)',
          suggestedEndDate: 'string (ISO date)',
          tags: 'array of strings',
          reasoning: 'string (why this assignment was identified)',
        },
      },
    };

    const result = await generateJSON(prompt, schema, { 
      systemPrompt,
      functionName: 'projectManagerNode',
      model: 'gpt-4o-mini', // Use cost-efficient model
      projectId: state.metadata?.projectId,
      meetingId: state.metadata?.meetingId,
      userId: state.metadata?.userId,
    });

    console.log('[PM Node] Raw result:', JSON.stringify(result, null, 2));
    
    // Handle case where AI returns schema structure instead of data
    let assignments = [];
    if (result && result.assignments) {
      // Check if it's the actual array or schema structure
      if (Array.isArray(result.assignments)) {
        assignments = result.assignments;
      } else if (result.assignments.items && Array.isArray(result.assignments.items)) {
        // AI returned schema structure, extract items
        console.warn('[PM Node] AI returned schema structure, extracting items');
        assignments = result.assignments.items;
      } else if (result.assignments.type === 'array' && result.assignments.items) {
        // Another schema format
        console.warn('[PM Node] AI returned schema format, extracting items');
        assignments = result.assignments.items;
      }
    }

    console.log(`[PM Node] Extracted ${assignments.length} assignments`);
    
    return {
      ...state,
      extractedAssignments: assignments,
    };
  } catch (error) {
    console.error('PM agent error:', error);
    return {
      ...state,
      extractedAssignments: [],
      errors: [...(state.errors || []), `PM agent error: ${error.message}`],
    };
  }
}

module.exports = projectManagerNode;

