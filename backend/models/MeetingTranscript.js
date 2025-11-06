const mongoose = require('mongoose');

const meetingTranscriptSchema = new mongoose.Schema({
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, 'Please provide a meeting'],
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
  },
  fileName: {
    type: String,
    required: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['txt', 'pdf', 'docx'],
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  parsedContent: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingError: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
meetingTranscriptSchema.index({ meetingId: 1 });
meetingTranscriptSchema.index({ projectId: 1 });

module.exports = mongoose.model('MeetingTranscript', meetingTranscriptSchema);

