const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  space: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Space',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  estimatedHours: {
    type: Number,
    required: true,
    min: 0
  },
  dependencies: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    type: {
      type: String,
      enum: ['sequential', 'parallel'], // sequential = must complete before, parallel = can run simultaneously
      default: 'sequential'
    }
  }],
  isApprovalGroup: {
    type: Boolean,
    default: false
  },
  isFinalGroup: {
    type: Boolean,
    default: false
  },
  isStartGroup: {
    type: Boolean,
    default: false
  },
  customStatuses: [{
    name: String,
    color: String,
    isDefault: { type: Boolean, default: false }
  }],
  defaultStatuses: {
    type: [String],
    default: ['In-progress', 'Completed', 'Pause', 'Resume']
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }]
}, {
  timestamps: true
});

// Ensure only one start group per space
groupSchema.pre('save', async function(next) {
  if (this.isStartGroup && this.isNew) {
    const existingStartGroup = await this.constructor.findOne({
      space: this.space,
      isStartGroup: true,
      _id: { $ne: this._id }
    });
    
    if (existingStartGroup) {
      const error = new Error('Only one start group allowed per space');
      error.code = 'DUPLICATE_START_GROUP';
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);