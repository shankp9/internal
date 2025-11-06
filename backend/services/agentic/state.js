/**
 * LangGraph State Definition
 * This defines the state structure for the agentic workflow
 */

const stateSchema = {
  // Input
  transcript: {
    type: 'string',
    description: 'The meeting transcript text',
  },
  projectId: {
    type: 'string',
    description: 'The project ID',
  },
  existingPRD: {
    type: 'string',
    description: 'Existing PRD content if available',
    default: null,
  },
  projectContext: {
    type: 'object',
    description: 'Project context (name, client, team members, etc.)',
    default: {},
  },
  availableDevelopers: {
    type: 'array',
    description: 'List of available developers with their skills and capacity',
    default: [],
  },

  // Intermediate results
  meetingAnalysis: {
    type: 'object',
    description: 'Analysis of the meeting transcript',
    default: null,
  },
  extractedAssignments: {
    type: 'array',
    description: 'Assignments extracted by PM agent',
    default: [],
  },
  prdUpdate: {
    type: 'object',
    description: 'PRD update generated from meeting',
    default: null,
  },
  taskBreakdowns: {
    type: 'array',
    description: 'Detailed task breakdowns for each assignment',
    default: [],
  },
  matchedAssignments: {
    type: 'array',
    description: 'Assignments matched to developers',
    default: [],
  },

  // Final output
  suggestions: {
    type: 'array',
    description: 'Final assignment suggestions ready for review',
    default: [],
  },
  errors: {
    type: 'array',
    description: 'Any errors encountered during processing',
    default: [],
  },
};

module.exports = stateSchema;

