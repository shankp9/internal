const mongoose = require('mongoose');

const pipelineExecutionSchema = new mongoose.Schema({
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, 'Please provide a meeting'],
    unique: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  },
  currentAgent: {
    type: String,
    enum: ['transcript-analysis', 'prd-writer', 'project-manager', 'technical-analyst', 'resource-matcher', 'validation', null],
    default: null,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  agentResults: {
    'transcript-analysis': {
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      result: mongoose.Schema.Types.Mixed, // Store the agent's output
      error: String,
    },
    'prd-writer': {
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      error: String,
    },
    'project-manager': {
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      error: String,
    },
    'technical-analyst': {
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      error: String,
    },
    'resource-matcher': {
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      error: String,
    },
    'validation': {
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      error: String,
    },
  },
  startedAt: Date,
  completedAt: Date,
  error: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
pipelineExecutionSchema.index({ meetingId: 1 });
pipelineExecutionSchema.index({ projectId: 1 });
pipelineExecutionSchema.index({ status: 1 });

module.exports = mongoose.model('PipelineExecution', pipelineExecutionSchema);

