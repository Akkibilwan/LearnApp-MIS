const express = require('express');
const Task = require('../models/Task');
const Group = require('../models/Group');
const Space = require('../models/Space');
const { spaceAuth } = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// Get all tasks in a space
router.get('/space/:spaceId', spaceAuth, async (req, res) => {
  try {
    const { status, owner, group } = req.query;
    
    let filter = { space: req.params.spaceId };
    
    if (status) filter.currentStatus = status;
    if (owner) filter.owner = owner;
    if (group) filter.currentGroup = group;

    const tasks = await Task.find(filter)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get single task
router.get('/:taskId', spaceAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name estimatedHours')
      .populate('approvedBy', 'username email')
      .populate('statusHistory.user', 'username email')
      .populate('groupHistory.group', 'name')
      .populate('groupHistory.owner', 'username email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error fetching task' });
  }
});

// Create new task
router.post('/space/:spaceId', spaceAuth, async (req, res) => {
  try {
    const { title, description, priority, owner } = req.body;

    // Find the start group for this space
    const startGroup = await Group.findOne({
      space: req.params.spaceId,
      isStartGroup: true
    });

    if (!startGroup) {
      return res.status(400).json({
        message: 'No start group found. Please create a start group first.'
      });
    }

    const task = new Task({
      title,
      description,
      space: req.params.spaceId,
      currentGroup: startGroup._id,
      owner: owner || req.user._id,
      priority: priority || 'medium',
      timeline: {
        estimatedHours: startGroup.estimatedHours
      }
    });

    // Add initial status
    task.statusHistory.push({
      status: 'In-progress',
      user: req.user._id,
      timestamp: new Date()
    });

    await task.save();

    // Add task to group
    startGroup.tasks.push(task._id);
    await startGroup.save();

    const populatedTask = await Task.findById(task._id)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name estimatedHours');

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// Update task status
router.put('/:taskId/status', spaceAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const task = await Task.findById(req.params.taskId)
      .populate('currentGroup')
      .populate('space');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is the owner or space admin
    if (task.owner.toString() !== req.user._id.toString() && !req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only task owner or space admin can update status' });
    }

    const previousStatus = task.currentStatus;
    task.currentStatus = status;

    // Add status to history
    task.statusHistory.push({
      status,
      user: req.user._id,
      timestamp: new Date(),
      notes
    });

    // Handle timeline updates based on status
    const now = new Date();

    if (status === 'In-progress' && previousStatus !== 'Resume') {
      // Starting the task
      task.timeline.startTime = now;
      
      // Calculate due time
      const dueTime = task.calculateDueTime(
        task.currentGroup,
        task.space.workingHours,
        task.space.workingDays
      );
      task.timeline.dueTime = dueTime;

    } else if (status === 'Completed') {
      // Completing the task
      task.timeline.completionTime = now;
      
      // Calculate actual hours spent
      if (task.timeline.startTime) {
        const totalMinutes = moment(now).diff(moment(task.timeline.startTime), 'minutes');
        task.timeline.actualHours = Math.max(0, (totalMinutes - task.timeline.pausedDuration) / 60);
      }
      
      // Update completion status
      task.updateCompletionStatus();

    } else if (status === 'Pause') {
      // Pausing the task - record pause time
      task.pauseStartTime = now;

    } else if (status === 'Resume') {
      // Resuming the task - add to paused duration
      if (task.pauseStartTime) {
        const pausedMinutes = moment(now).diff(moment(task.pauseStartTime), 'minutes');
        task.timeline.pausedDuration += pausedMinutes;
        delete task.pauseStartTime;
      }
    }

    await task.save();

    // Send Slack notification if configured
    if (task.space.settings.slackWebhookUrl) {
      // TODO: Implement Slack notification
    }

    const populatedTask = await Task.findById(task._id)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name estimatedHours')
      .populate('statusHistory.user', 'username email');

    res.json(populatedTask);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error updating task status' });
  }
});

// Move task to different group
router.put('/:taskId/move', spaceAuth, async (req, res) => {
  try {
    const { groupId, newOwner } = req.body;

    const task = await Task.findById(req.params.taskId)
      .populate('currentGroup')
      .populate('space');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const targetGroup = await Group.findById(groupId)
      .populate('dependencies.group');

    if (!targetGroup) {
      return res.status(404).json({ message: 'Target group not found' });
    }

    // Check if user can move this task
    if (task.owner.toString() !== req.user._id.toString() && !req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only task owner or space admin can move task' });
    }

    // Check dependencies
    for (const dependency of targetGroup.dependencies) {
      if (dependency.type === 'sequential') {
        // Check if task has completed the dependent group
        const hasCompletedDependency = task.groupHistory.some(
          history => 
            history.group.toString() === dependency.group._id.toString() &&
            history.exitedAt &&
            history.completionStatus
        );

        if (!hasCompletedDependency) {
          return res.status(400).json({
            message: `Task must complete "${dependency.group.name}" before moving to "${targetGroup.name}"`
          });
        }
      }
    }

    // Check if this is an approval group and task needs approval
    if (targetGroup.isApprovalGroup && task.approvalStatus !== 'approved') {
      return res.status(400).json({
        message: 'Task needs approval before moving to this group'
      });
    }

    // Record exit from current group
    const currentGroupHistory = task.groupHistory.find(
      h => h.group.toString() === task.currentGroup._id.toString() && !h.exitedAt
    );

    if (currentGroupHistory) {
      currentGroupHistory.exitedAt = new Date();
      
      // Calculate hours spent in current group
      if (currentGroupHistory.enteredAt) {
        const minutesSpent = moment().diff(moment(currentGroupHistory.enteredAt), 'minutes');
        currentGroupHistory.hoursSpent = Math.max(0, (minutesSpent - task.timeline.pausedDuration) / 60);
      }

      // Determine completion status for current group
      if (task.timeline.dueTime) {
        const now = moment();
        const due = moment(task.timeline.dueTime);
        
        if (now.isBefore(due)) {
          currentGroupHistory.completionStatus = 'before-time';
        } else if (now.isSame(due, 'hour')) {
          currentGroupHistory.completionStatus = 'on-time';
        } else {
          currentGroupHistory.completionStatus = 'delayed';
        }
      }
    }

    // Remove task from current group
    await Group.findByIdAndUpdate(
      task.currentGroup._id,
      { $pull: { tasks: task._id } }
    );

    // Add task to new group
    await Group.findByIdAndUpdate(
      targetGroup._id,
      { $push: { tasks: task._id } }
    );

    // Update task
    task.currentGroup = targetGroup._id;
    if (newOwner) task.owner = newOwner;
    
    // Add to group history
    task.groupHistory.push({
      group: targetGroup._id,
      enteredAt: new Date(),
      owner: newOwner || task.owner
    });

    // Update timeline for new group
    task.timeline.estimatedHours = targetGroup.estimatedHours;
    task.timeline.startTime = new Date();
    
    const dueTime = task.calculateDueTime(
      targetGroup,
      task.space.workingHours,
      task.space.workingDays
    );
    task.timeline.dueTime = dueTime;

    // Reset status to In-progress
    task.currentStatus = 'In-progress';
    task.statusHistory.push({
      status: 'In-progress',
      user: req.user._id,
      timestamp: new Date(),
      notes: `Moved to ${targetGroup.name}`
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name estimatedHours');

    res.json(populatedTask);
  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({ message: 'Server error moving task' });
  }
});

// Approve/Reject task (for approval groups)
router.put('/:taskId/approval', spaceAuth, async (req, res) => {
  try {
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can approve/reject tasks' });
    }

    const task = await Task.findById(req.params.taskId)
      .populate('currentGroup');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.currentGroup.isApprovalGroup) {
      return res.status(400).json({ message: 'Task is not in an approval group' });
    }

    task.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    task.approvedBy = req.user._id;
    task.approvalNotes = notes;

    // Add status to history
    task.statusHistory.push({
      status: action === 'approve' ? 'Approved' : 'Rejected',
      user: req.user._id,
      timestamp: new Date(),
      notes
    });

    if (action === 'approve') {
      task.currentStatus = 'Approved';
    } else {
      task.currentStatus = 'Rejected';
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name estimatedHours')
      .populate('approvedBy', 'username email');

    res.json(populatedTask);
  } catch (error) {
    console.error('Task approval error:', error);
    res.status(500).json({ message: 'Server error processing approval' });
  }
});

// Update task details
router.put('/:taskId', spaceAuth, async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can update this task
    if (task.owner.toString() !== req.user._id.toString() && !req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only task owner or space admin can update task' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('owner', 'username email')
      .populate('currentGroup', 'name estimatedHours');

    res.json(populatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// Delete task
router.delete('/:taskId', spaceAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can delete this task
    if (task.owner.toString() !== req.user._id.toString() && !req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only task owner or space admin can delete task' });
    }

    // Remove task from group
    await Group.findByIdAndUpdate(
      task.currentGroup,
      { $pull: { tasks: task._id } }
    );

    // Delete the task
    await Task.findByIdAndDelete(task._id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

// Get task analytics for a space
router.get('/space/:spaceId/analytics', spaceAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ space: req.params.spaceId })
      .populate('currentGroup', 'name')
      .populate('owner', 'username');

    const analytics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.currentStatus === 'Completed').length,
      inProgressTasks: tasks.filter(t => t.currentStatus === 'In-progress').length,
      delayedTasks: tasks.filter(t => t.completionStatus === 'delayed').length,
      approvalPendingTasks: tasks.filter(t => t.approvalStatus === 'pending').length,
      averageCompletionTime: 0,
      totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.timeline.estimatedHours || 0), 0),
      totalActualHours: tasks.reduce((sum, t) => sum + (t.timeline.actualHours || 0), 0),
      tasksByGroup: {},
      tasksByOwner: {},
      tasksByStatus: {}
    };

    // Group analytics
    tasks.forEach(task => {
      const groupName = task.currentGroup.name;
      analytics.tasksByGroup[groupName] = (analytics.tasksByGroup[groupName] || 0) + 1;

      const ownerName = task.owner?.username || 'Unassigned';
      analytics.tasksByOwner[ownerName] = (analytics.tasksByOwner[ownerName] || 0) + 1;

      analytics.tasksByStatus[task.currentStatus] = (analytics.tasksByStatus[task.currentStatus] || 0) + 1;
    });

    // Calculate average completion time
    const completedTasks = tasks.filter(t => 
      t.currentStatus === 'Completed' && t.timeline.actualHours
    );

    if (completedTasks.length > 0) {
      analytics.averageCompletionTime = 
        completedTasks.reduce((sum, t) => sum + t.timeline.actualHours, 0) / completedTasks.length;
    }

    res.json(analytics);
  } catch (error) {
    console.error('Get task analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

module.exports = router;