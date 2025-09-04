const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' }
  },
  workingDays: {
    type: [Number], // 0 = Sunday, 1 = Monday, etc.
    default: [1, 2, 3, 4, 5] // Monday to Friday
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  settings: {
    allowParallelTasks: { type: Boolean, default: true },
    requireApprovalForTaskMove: { type: Boolean, default: false },
    slackWebhookUrl: String,
    googleDocsTemplateId: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Space', spaceSchema);