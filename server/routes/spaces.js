const express = require('express');
const Space = require('../models/Space');
const Group = require('../models/Group');
const Task = require('../models/Task');
const { auth, spaceAuth } = require('../middleware/auth');

const router = express.Router();

// Get all spaces for current user
router.get('/', auth, async (req, res) => {
  try {
    const spaces = await Space.find({
      $or: [
        { admin: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('admin', 'username email')
    .populate('members.user', 'username email')
    .populate('groups', 'name order estimatedHours');

    res.json(spaces);
  } catch (error) {
    console.error('Get spaces error:', error);
    res.status(500).json({ message: 'Server error fetching spaces' });
  }
});

// Get single space
router.get('/:spaceId', spaceAuth, async (req, res) => {
  try {
    const space = await Space.findById(req.params.spaceId)
      .populate('admin', 'username email')
      .populate('members.user', 'username email')
      .populate({
        path: 'groups',
        populate: {
          path: 'dependencies.group',
          select: 'name'
        }
      });

    res.json(space);
  } catch (error) {
    console.error('Get space error:', error);
    res.status(500).json({ message: 'Server error fetching space' });
  }
});

// Create new space
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, workingHours, workingDays, settings } = req.body;

    const space = new Space({
      name,
      description,
      admin: req.user._id,
      workingHours: workingHours || req.user.workingHours,
      workingDays: workingDays || req.user.workingDays,
      settings: settings || {}
    });

    await space.save();

    // Add space to user's spaces
    req.user.spaces.push(space._id);
    await req.user.save();

    const populatedSpace = await Space.findById(space._id)
      .populate('admin', 'username email');

    res.status(201).json(populatedSpace);
  } catch (error) {
    console.error('Create space error:', error);
    res.status(500).json({ message: 'Server error creating space' });
  }
});

// Update space
router.put('/:spaceId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can update space settings' });
    }

    const { name, description, workingHours, workingDays, settings } = req.body;
    
    const space = await Space.findById(req.params.spaceId);
    
    if (name) space.name = name;
    if (description) space.description = description;
    if (workingHours) space.workingHours = workingHours;
    if (workingDays) space.workingDays = workingDays;
    if (settings) space.settings = { ...space.settings, ...settings };
    
    await space.save();
    
    const populatedSpace = await Space.findById(space._id)
      .populate('admin', 'username email')
      .populate('members.user', 'username email');
    
    res.json(populatedSpace);
  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({ message: 'Server error updating space' });
  }
});

// Add member to space
router.post('/:spaceId/members', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can add members' });
    }

    const { userId, role } = req.body;
    const space = req.space;

    // Check if user is already a member
    const existingMember = space.members.find(
      member => member.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    space.members.push({ user: userId, role: role || 'member' });
    await space.save();

    // Add space to user's spaces
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (user && !user.spaces.includes(space._id)) {
      user.spaces.push(space._id);
      await user.save();
    }

    const populatedSpace = await Space.findById(space._id)
      .populate('admin', 'username email')
      .populate('members.user', 'username email');

    res.json(populatedSpace);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
});

// Remove member from space
router.delete('/:spaceId/members/:userId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can remove members' });
    }

    const space = req.space;
    space.members = space.members.filter(
      member => member.user.toString() !== req.params.userId
    );
    
    await space.save();

    // Remove space from user's spaces
    const User = require('../models/User');
    const user = await User.findById(req.params.userId);
    if (user) {
      user.spaces = user.spaces.filter(
        spaceId => spaceId.toString() !== space._id.toString()
      );
      await user.save();
    }

    const populatedSpace = await Space.findById(space._id)
      .populate('admin', 'username email')
      .populate('members.user', 'username email');

    res.json(populatedSpace);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
});

// Duplicate space
router.post('/:spaceId/duplicate', spaceAuth, async (req, res) => {
  try {
    const originalSpace = req.space;
    const { name } = req.body;

    // Create new space with same settings
    const newSpace = new Space({
      name: name || `${originalSpace.name} (Copy)`,
      description: originalSpace.description,
      admin: req.user._id,
      workingHours: originalSpace.workingHours,
      workingDays: originalSpace.workingDays,
      settings: originalSpace.settings
    });

    await newSpace.save();

    // Duplicate all groups
    const originalGroups = await Group.find({ space: originalSpace._id })
      .sort({ order: 1 });

    const groupMapping = new Map();

    for (const originalGroup of originalGroups) {
      const newGroup = new Group({
        name: originalGroup.name,
        description: originalGroup.description,
        space: newSpace._id,
        order: originalGroup.order,
        estimatedHours: originalGroup.estimatedHours,
        isApprovalGroup: originalGroup.isApprovalGroup,
        isFinalGroup: originalGroup.isFinalGroup,
        isStartGroup: originalGroup.isStartGroup,
        customStatuses: originalGroup.customStatuses,
        defaultStatuses: originalGroup.defaultStatuses
      });

      await newGroup.save();
      groupMapping.set(originalGroup._id.toString(), newGroup._id);
      newSpace.groups.push(newGroup._id);
    }

    // Update group dependencies
    for (const originalGroup of originalGroups) {
      const newGroupId = groupMapping.get(originalGroup._id.toString());
      const newGroup = await Group.findById(newGroupId);

      newGroup.dependencies = originalGroup.dependencies.map(dep => ({
        group: groupMapping.get(dep.group.toString()),
        type: dep.type
      }));

      await newGroup.save();
    }

    await newSpace.save();

    // Add space to user's spaces
    req.user.spaces.push(newSpace._id);
    await req.user.save();

    const populatedSpace = await Space.findById(newSpace._id)
      .populate('admin', 'username email')
      .populate('groups', 'name order estimatedHours');

    res.status(201).json(populatedSpace);
  } catch (error) {
    console.error('Duplicate space error:', error);
    res.status(500).json({ message: 'Server error duplicating space' });
  }
});

// Delete space
router.delete('/:spaceId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can delete space' });
    }

    const space = req.space;

    // Delete all tasks in this space
    await Task.deleteMany({ space: space._id });

    // Delete all groups in this space
    await Group.deleteMany({ space: space._id });

    // Remove space from all users
    const User = require('../models/User');
    await User.updateMany(
      { spaces: space._id },
      { $pull: { spaces: space._id } }
    );

    // Delete the space
    await Space.findByIdAndDelete(space._id);

    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Delete space error:', error);
    res.status(500).json({ message: 'Server error deleting space' });
  }
});

module.exports = router;