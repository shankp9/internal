const transcriptAnalysisNode = require('./nodes/transcriptAnalysisNode');
const projectManagerNode = require('./nodes/projectManagerNode');
const technicalAnalystNode = require('./nodes/technicalAnalystNode');
const resourceMatcherNode = require('./nodes/resourceMatcherNode');
const prdWriterNode = require('./nodes/prdWriterNode');
const validationNode = require('./nodes/validationNode');

/**
 * Execute the agentic workflow
 * Orchestrates multiple AI agents in sequence to process meeting transcripts
 */
async function executeWorkflow(input) {
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
    state = await transcriptAnalysisNode(state);

    // Step 2: Generate PRD first (this should be saved to database before generating assignments)
    console.log('Step 2: Generating PRD...');
    state = await prdWriterNode(state);
    
    // PRD is now in state.prdUpdate - will be saved by the route handler before proceeding

    // Step 3: Extract assignments from meeting
    console.log('Step 3: Extracting assignments from meeting...');
    state = await projectManagerNode(state);
    
    // If no assignments found, still return PRD
    if (!state.extractedAssignments || state.extractedAssignments.length === 0) {
      console.log('[Workflow] No assignments extracted, returning PRD only');
      return {
        ...state,
        suggestions: [],
        errors: state.errors || [],
      };
    }

    // Step 4: Technical analysis - break down assignments into tasks
    console.log('Step 4: Breaking down assignments into technical tasks...');
    state = await technicalAnalystNode(state);

    // Step 5: Resource matching - match tasks to developers
    console.log('Step 5: Matching resources to assignments...');
    state = await resourceMatcherNode(state);

    // Step 6: Validation and final output
    console.log('Step 6: Validating and formatting output...');
    const validationStart = Date.now();
    state = await validationNode(state);
    const validationEnd = Date.now();
    console.log(`[Workflow] Validation completed in ${validationEnd - validationStart}ms`);

    // Log any errors but don't fail completely
    if (state.errors && state.errors.length > 0) {
      console.warn('Workflow completed with errors:', state.errors);
    }

    console.log('[Workflow] Workflow execution completed successfully');
    return state;
  } catch (error) {
    console.error('Workflow execution error:', error);
    throw new Error(`Workflow execution error: ${error.message}`);
  }
}

module.exports = {
  executeWorkflow,
};

