const express = require('express');
const Group = require('../models/Group');
const Task = require('../models/Task');
const { spaceAuth } = require('../middleware/auth');

const router = express.Router();

// Get all groups in a space
router.get('/space/:spaceId', spaceAuth, async (req, res) => {
  try {
    const groups = await Group.find({ space: req.params.spaceId })
      .sort({ order: 1 })
      .populate('dependencies.group', 'name')
      .populate('tasks');

    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
});

// Get single group
router.get('/:groupId', spaceAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('dependencies.group', 'name')
      .populate({
        path: 'tasks',
        populate: {
          path: 'owner',
          select: 'username email'
        }
      });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error fetching group' });
  }
});

// Create new group
router.post('/space/:spaceId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can create groups' });
    }

    const {
      name,
      description,
      estimatedHours,
      dependencies,
      isApprovalGroup,
      isFinalGroup,
      isStartGroup,
      customStatuses
    } = req.body;

    // Get the next order number
    const lastGroup = await Group.findOne({ space: req.params.spaceId })
      .sort({ order: -1 });
    const order = lastGroup ? lastGroup.order + 1 : 1;

    const group = new Group({
      name,
      description,
      space: req.params.spaceId,
      order,
      estimatedHours,
      dependencies: dependencies || [],
      isApprovalGroup: isApprovalGroup || false,
      isFinalGroup: isFinalGroup || false,
      isStartGroup: isStartGroup || false,
      customStatuses: customStatuses || []
    });

    await group.save();

    // Add group to space
    const space = req.space;
    space.groups.push(group._id);
    await space.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('dependencies.group', 'name');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Create group error:', error);
    if (error.code === 'DUPLICATE_START_GROUP') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error creating group' });
  }
});

// Update group
router.put('/:groupId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can update groups' });
    }

    const {
      name,
      description,
      estimatedHours,
      dependencies,
      isApprovalGroup,
      isFinalGroup,
      isStartGroup,
      customStatuses
    } = req.body;

    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (estimatedHours) group.estimatedHours = estimatedHours;
    if (dependencies) group.dependencies = dependencies;
    if (isApprovalGroup !== undefined) group.isApprovalGroup = isApprovalGroup;
    if (isFinalGroup !== undefined) group.isFinalGroup = isFinalGroup;
    if (isStartGroup !== undefined) group.isStartGroup = isStartGroup;
    if (customStatuses) group.customStatuses = customStatuses;

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('dependencies.group', 'name');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Update group error:', error);
    if (error.code === 'DUPLICATE_START_GROUP') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error updating group' });
  }
});

// Reorder groups
router.put('/space/:spaceId/reorder', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can reorder groups' });
    }

    const { groupOrders } = req.body; // Array of { groupId, order }

    const updatePromises = groupOrders.map(({ groupId, order }) =>
      Group.findByIdAndUpdate(groupId, { order })
    );

    await Promise.all(updatePromises);

    const groups = await Group.find({ space: req.params.spaceId })
      .sort({ order: 1 })
      .populate('dependencies.group', 'name');

    res.json(groups);
  } catch (error) {
    console.error('Reorder groups error:', error);
    res.status(500).json({ message: 'Server error reordering groups' });
  }
});

// Insert group at specific position
router.post('/space/:spaceId/insert', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can insert groups' });
    }

    const {
      name,
      description,
      estimatedHours,
      dependencies,
      isApprovalGroup,
      isFinalGroup,
      insertAfter // Group ID to insert after, or null for beginning
    } = req.body;

    let order = 1;

    if (insertAfter) {
      const previousGroup = await Group.findById(insertAfter);
      if (!previousGroup) {
        return res.status(404).json({ message: 'Previous group not found' });
      }
      order = previousGroup.order + 1;

      // Shift all subsequent groups
      await Group.updateMany(
        { space: req.params.spaceId, order: { $gte: order } },
        { $inc: { order: 1 } }
      );
    } else {
      // Insert at beginning, shift all groups
      await Group.updateMany(
        { space: req.params.spaceId },
        { $inc: { order: 1 } }
      );
    }

    const group = new Group({
      name,
      description,
      space: req.params.spaceId,
      order,
      estimatedHours,
      dependencies: dependencies || [],
      isApprovalGroup: isApprovalGroup || false,
      isFinalGroup: isFinalGroup || false,
      isStartGroup: false // Can't insert a start group
    });

    await group.save();

    // Add group to space
    const space = req.space;
    space.groups.push(group._id);
    await space.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('dependencies.group', 'name');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Insert group error:', error);
    res.status(500).json({ message: 'Server error inserting group' });
  }
});

// Delete group
router.delete('/:groupId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can delete groups' });
    }

    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if there are tasks in this group
    const tasksInGroup = await Task.countDocuments({ currentGroup: group._id });
    if (tasksInGroup > 0) {
      return res.status(400).json({
        message: 'Cannot delete group with tasks. Move or complete all tasks first.'
      });
    }

    // Remove group from dependencies of other groups
    await Group.updateMany(
      { 'dependencies.group': group._id },
      { $pull: { dependencies: { group: group._id } } }
    );

    // Remove group from space
    const space = req.space;
    space.groups = space.groups.filter(g => g.toString() !== group._id.toString());
    await space.save();

    // Delete the group
    await Group.findByIdAndDelete(group._id);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error deleting group' });
  }
});

// Get group analytics
router.get('/:groupId/analytics', spaceAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const tasks = await Task.find({ currentGroup: group._id })
      .populate('owner', 'username');

    const analytics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.currentStatus === 'Completed').length,
      inProgressTasks: tasks.filter(t => t.currentStatus === 'In-progress').length,
      delayedTasks: tasks.filter(t => t.completionStatus === 'delayed').length,
      averageCompletionTime: 0,
      totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.timeline.estimatedHours || 0), 0),
      totalActualHours: tasks.reduce((sum, t) => sum + (t.timeline.actualHours || 0), 0)
    };

    // Calculate average completion time for completed tasks
    const completedTasks = tasks.filter(t => 
      t.currentStatus === 'Completed' && t.timeline.actualHours
    );

    if (completedTasks.length > 0) {
      analytics.averageCompletionTime = 
        completedTasks.reduce((sum, t) => sum + t.timeline.actualHours, 0) / completedTasks.length;
    }

    res.json(analytics);
  } catch (error) {
    console.error('Get group analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

module.exports = router;