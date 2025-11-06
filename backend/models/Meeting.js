const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
  },
  title: {
    type: String,
    required: [true, 'Please provide a meeting title'],
    trim: true,
  },
  meetingDate: {
    type: Date,
    required: [true, 'Please provide a meeting date'],
  },
  participants: [{
    name: String,
    role: String,
    email: String,
  }],
  agenda: {
    type: String,
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  transcriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeetingTranscript',
    default: null,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
}, {
  timestamps: true,
});

// Indexes
meetingSchema.index({ projectId: 1, meetingDate: -1 });
meetingSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);

