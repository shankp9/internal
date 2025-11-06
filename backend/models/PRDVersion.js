const mongoose = require('mongoose');

const prdVersionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
  },
  prdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PRD',
    required: [true, 'Please provide a PRD'],
  },
  version: {
    type: Number,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  changes: {
    type: String,
    required: true,
  },
  changeSummary: {
    type: String,
    trim: true,
  },
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  meetingDate: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
prdVersionSchema.index({ projectId: 1, version: -1 });
prdVersionSchema.index({ meetingId: 1 });
prdVersionSchema.index({ meetingDate: -1 });

module.exports = mongoose.model('PRDVersion', prdVersionSchema);

