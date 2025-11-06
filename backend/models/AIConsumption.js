const mongoose = require('mongoose');

const aiConsumptionSchema = new mongoose.Schema({
  functionName: {
    type: String,
    required: true,
    index: true,
  },
  model: {
    type: String,
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    default: null,
  },
  promptTokens: {
    type: Number,
    required: true,
  },
  completionTokens: {
    type: Number,
    required: true,
  },
  totalTokens: {
    type: Number,
    required: true,
  },
  inputCost: {
    type: Number,
    required: true,
  },
  outputCost: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
aiConsumptionSchema.index({ projectId: 1, createdAt: -1 });
aiConsumptionSchema.index({ meetingId: 1 });
aiConsumptionSchema.index({ functionName: 1, createdAt: -1 });
aiConsumptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AIConsumption', aiConsumptionSchema);

