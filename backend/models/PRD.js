const mongoose = require('mongoose');

const prdSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
    unique: true,
  },
  content: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    default: null,
  },
}, {
  timestamps: true,
});

// Index
prdSchema.index({ projectId: 1 });

module.exports = mongoose.model('PRD', prdSchema);

