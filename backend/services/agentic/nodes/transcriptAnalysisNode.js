const { generateJSON } = require('../../aiService');

/**
 * Transcript Analysis Node
 * Analyzes the meeting transcript to extract key information
 */
async function transcriptAnalysisNode(state) {
  const { transcript, projectContext } = state;

  try {
    const systemPrompt = `You are an expert meeting analyst. Analyze meeting transcripts and extract key information including:
- Meeting participants and their roles
- Key discussion points
- Decisions made
- Action items mentioned
- Technical requirements discussed
- Timeline references
- Priorities mentioned`;

    const prompt = `Analyze the following meeting transcript and extract structured information:

Project Context: ${JSON.stringify(projectContext, null, 2)}

Meeting Transcript:
${transcript}

Extract and structure the key information from this meeting.`;

    const schema = {
      participants: {
        type: 'array',
        items: {
          name: 'string',
          role: 'string',
          contributions: 'array of strings',
        },
      },
      keyDiscussionPoints: 'array of strings',
      decisions: 'array of strings',
      actionItems: 'array of strings',
      technicalRequirements: 'array of strings',
      timelineReferences: 'array of strings',
      priorities: 'array of strings',
      summary: 'string',
    };

    const analysis = await generateJSON(prompt, schema, { 
      systemPrompt,
      functionName: 'transcriptAnalysisNode',
      model: 'gpt-4o-mini', // Use cost-efficient model
      projectId: state.metadata?.projectId,
      meetingId: state.metadata?.meetingId,
      userId: state.metadata?.userId,
    });

    return {
      ...state,
      meetingAnalysis: analysis,
    };
  } catch (error) {
    return {
      ...state,
      errors: [...(state.errors || []), `Transcript analysis error: ${error.message}`],
    };
  }
}

module.exports = transcriptAnalysisNode;

