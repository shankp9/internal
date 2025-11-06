const mongoose = require('mongoose');

const assignmentSuggestionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
  },
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: [true, 'Please provide a meeting'],
  },
  developerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Optional - can be null if no developer matched (manager needs to assign)
  },
  suggestedUtilization: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  suggestedStartDate: {
    type: Date,
    required: true,
  },
  suggestedEndDate: {
    type: Date,
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  reasoning: {
    type: String,
    trim: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'merged'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  assignedAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    default: null,
  },
  needsManualAssignment: {
    type: Boolean,
    default: false, // True if no developer was matched and manager needs to assign
  },
  taskBreakdown: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeveloperTask',
    default: null,
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
assignmentSuggestionSchema.index({ projectId: 1, status: 1 });
assignmentSuggestionSchema.index({ meetingId: 1 });
assignmentSuggestionSchema.index({ developerId: 1, status: 1 });

module.exports = mongoose.model('AssignmentSuggestion', assignmentSuggestionSchema);

