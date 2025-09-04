const mongoose = require('mongoose');

const taskStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
});

const taskSchema = new mongoose.Schema({
  title: {
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
  currentGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  currentStatus: {
    type: String,
    default: 'In-progress'
  },
  statusHistory: [taskStatusSchema],
  timeline: {
    startTime: Date,
    dueTime: Date,
    completionTime: Date,
    pausedDuration: { type: Number, default: 0 }, // in minutes
    actualHours: { type: Number, default: 0 },
    estimatedHours: { type: Number, default: 0 }
  },
  completionStatus: {
    type: String,
    enum: ['before-time', 'on-time', 'delayed', 'in-progress'],
    default: 'in-progress'
  },
  delayedHours: {
    type: Number,
    default: 0
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalNotes: String,
  groupHistory: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    enteredAt: Date,
    exitedAt: Date,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    hoursSpent: { type: Number, default: 0 },
    completionStatus: {
      type: String,
      enum: ['before-time', 'on-time', 'delayed']
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: { type: Date, default: Date.now }
  }],
  googleDocId: String,
  slackThreadId: String
}, {
  timestamps: true
});

// Calculate due time when task moves to a new group
taskSchema.methods.calculateDueTime = function(group, workingHours, workingDays) {
  if (!this.timeline.startTime) return null;
  
  const moment = require('moment');
  let currentTime = moment(this.timeline.startTime);
  let remainingHours = group.estimatedHours;
  
  while (remainingHours > 0) {
    const dayOfWeek = currentTime.day();
    
    // Skip non-working days
    if (!workingDays.includes(dayOfWeek)) {
      currentTime.add(1, 'day').startOf('day');
      continue;
    }
    
    // Calculate working hours for the day
    const dayStart = moment(currentTime).hour(parseInt(workingHours.start.split(':')[0]))
                                        .minute(parseInt(workingHours.start.split(':')[1]));
    const dayEnd = moment(currentTime).hour(parseInt(workingHours.end.split(':')[0]))
                                      .minute(parseInt(workingHours.end.split(':')[1]));
    
    // If current time is before work start, move to work start
    if (currentTime.isBefore(dayStart)) {
      currentTime = dayStart.clone();
    }
    
    // If current time is after work end, move to next day
    if (currentTime.isAfter(dayEnd)) {
      currentTime.add(1, 'day').startOf('day');
      continue;
    }
    
    // Calculate available hours for the day
    const availableHours = dayEnd.diff(currentTime, 'hours', true);
    const hoursToUse = Math.min(remainingHours, availableHours);
    
    remainingHours -= hoursToUse;
    
    if (remainingHours > 0) {
      currentTime.add(1, 'day').startOf('day');
    } else {
      currentTime.add(hoursToUse, 'hours');
    }
  }
  
  return currentTime.toDate();
};

// Update completion status based on actual vs estimated time
taskSchema.methods.updateCompletionStatus = function() {
  if (this.currentStatus !== 'Completed') return;
  
  const actualEndTime = this.timeline.completionTime;
  const expectedEndTime = this.timeline.dueTime;
  
  if (!actualEndTime || !expectedEndTime) return;
  
  const moment = require('moment');
  const actual = moment(actualEndTime);
  const expected = moment(expectedEndTime);
  
  if (actual.isBefore(expected)) {
    this.completionStatus = 'before-time';
  } else if (actual.isSame(expected, 'hour')) {
    this.completionStatus = 'on-time';
  } else {
    this.completionStatus = 'delayed';
    this.delayedHours = actual.diff(expected, 'hours', true);
  }
};

module.exports = mongoose.model('Task', taskSchema);