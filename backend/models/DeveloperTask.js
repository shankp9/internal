const mongoose = require('mongoose');

const developerTaskSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    default: null,
  },
  assignmentSuggestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssignmentSuggestion',
    default: null,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Please provide a project'],
  },
  developerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Can be null if no developer assigned yet
  },
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  subtasks: [{
    title: String,
    description: String,
    completed: {
      type: Boolean,
      default: false,
    },
    order: Number,
  }],
  acceptanceCriteria: [{
    type: String,
    trim: true,
  }],
  dependencies: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeveloperTask',
      default: null, // Can be null if dependency not resolved yet
    },
    description: String,
    taskTitle: String, // Store task title for reference if taskId not yet resolved
  }],
  technicalRequirements: [{
    type: String,
    trim: true,
  }],
  estimatedEffort: {
    type: Number,
    default: 0,
    comment: 'Estimated hours',
  },
  estimatedUtilization: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'review', 'completed', 'blocked'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  dueDate: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes
developerTaskSchema.index({ developerId: 1, status: 1 });
developerTaskSchema.index({ projectId: 1 });
developerTaskSchema.index({ assignmentId: 1 });
developerTaskSchema.index({ assignmentSuggestionId: 1 });

module.exports = mongoose.model('DeveloperTask', developerTaskSchema);

