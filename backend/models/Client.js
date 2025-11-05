const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a client name'],
    trim: true,
  },
  industry: {
    type: String,
    trim: true,
  },
  accountManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide an account manager'],
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Virtual for total utilization across all projects
clientSchema.virtual('totalUtilization').get(function() {
  // This will be calculated in the API
  return 0;
});

module.exports = mongoose.model('Client', clientSchema);
