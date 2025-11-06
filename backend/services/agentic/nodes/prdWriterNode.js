const { generateText } = require('../../aiService');

/**
 * PRD Writer Node
 * Generates or updates PRD based on meeting discussions
 */
async function prdWriterNode(state) {
  const { transcript, meetingAnalysis, existingPRD, projectContext } = state;

  try {
    const systemPrompt = `You are an expert Product Requirements Document (PRD) writer. 
Create comprehensive PRDs that include:
- Overview and objectives
- User stories and requirements
- Technical specifications
- Acceptance criteria
- Timeline and milestones
- Dependencies and risks

If updating an existing PRD, maintain consistency and add/modify sections as needed.`;

    let prompt;
    if (existingPRD) {
      prompt = `Update the existing PRD based on the new meeting discussion:

Project Context: ${JSON.stringify(projectContext, null, 2)}

Existing PRD:
${existingPRD}

Meeting Analysis:
${JSON.stringify(meetingAnalysis, null, 2)}

Meeting Transcript:
${transcript}

Update the PRD to reflect new requirements, changes, and decisions from this meeting. Highlight what changed and why.`;
    } else {
      prompt = `Create a comprehensive PRD based on the meeting discussion:

Project Context: ${JSON.stringify(projectContext, null, 2)}

Meeting Analysis:
${JSON.stringify(meetingAnalysis, null, 2)}

Meeting Transcript:
${transcript}

Create a detailed PRD that captures all requirements, specifications, and expectations discussed.`;
    }

    const prdContent = await generateText(prompt, {
      systemPrompt,
      maxTokens: 4000,
      functionName: 'prdWriterNode',
      model: 'gpt-4o-mini', // Use cost-efficient model
      projectId: state.metadata?.projectId,
      meetingId: state.metadata?.meetingId,
      userId: state.metadata?.userId,
    });

    return {
      ...state,
      prdUpdate: {
        content: prdContent,
        isUpdate: !!existingPRD,
      },
    };
  } catch (error) {
    return {
      ...state,
      errors: [...(state.errors || []), `PRD writer error: ${error.message}`],
    };
  }
}

module.exports = prdWriterNode;

