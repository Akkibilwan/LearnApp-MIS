const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('spaces', 'name description');

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Search users by username or email
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username email role')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// Get user by ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('spaces', 'name description');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Update user (admin only or self)
router.put('/:userId', auth, async (req, res) => {
  try {
    const { username, email, role, workingHours, workingDays } = req.body;

    // Check if user can update this profile
    const isOwnProfile = req.user._id.toString() === req.params.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only admins can change roles
    if (role && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can change user roles' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (role && isAdmin) user.role = role;
    if (workingHours) user.workingHours = workingHours;
    if (workingDays) user.workingDays = workingDays;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('spaces', 'name description');

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// Delete user (admin only)
router.delete('/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user' });
      }
    }

    // Remove user from all spaces
    const Space = require('../models/Space');
    await Space.updateMany(
      { 'members.user': user._id },
      { $pull: { members: { user: user._id } } }
    );

    // Transfer ownership of spaces to another admin
    const spaces = await Space.find({ admin: user._id });
    if (spaces.length > 0) {
      const anotherAdmin = await User.findOne({ role: 'admin', _id: { $ne: user._id } });
      if (anotherAdmin) {
        await Space.updateMany(
          { admin: user._id },
          { admin: anotherAdmin._id }
        );
      }
    }

    // Update tasks owned by this user to unassigned
    const Task = require('../models/Task');
    await Task.updateMany(
      { owner: user._id },
      { $unset: { owner: 1 } }
    );

    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Get user's leave requests
router.get('/:userId/leaves', auth, async (req, res) => {
  try {
    const isOwnProfile = req.user._id.toString() === req.params.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.userId).select('leaves');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.leaves);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ message: 'Server error fetching leaves' });
  }
});

// Add leave request
router.post('/:userId/leaves', auth, async (req, res) => {
  try {
    const { date, reason } = req.body;

    const isOwnProfile = req.user._id.toString() === req.params.userId;

    if (!isOwnProfile) {
      return res.status(403).json({ message: 'Can only add leave for yourself' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.leaves.push({ date, reason });
    await user.save();

    res.status(201).json({ message: 'Leave request added successfully' });
  } catch (error) {
    console.error('Add leave error:', error);
    res.status(500).json({ message: 'Server error adding leave request' });
  }
});

// Approve/reject leave request (admin only)
router.put('/:userId/leaves/:leaveId', adminAuth, async (req, res) => {
  try {
    const { approved } = req.body;

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const leave = user.leaves.id(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leave.approved = approved;
    await user.save();

    res.json({ message: `Leave request ${approved ? 'approved' : 'rejected'} successfully` });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ message: 'Server error updating leave request' });
  }
});

// Get user statistics
router.get('/:userId/stats', auth, async (req, res) => {
  try {
    const isOwnProfile = req.user._id.toString() === req.params.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const Task = require('../models/Task');
    
    const tasks = await Task.find({ owner: req.params.userId });

    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.currentStatus === 'Completed').length,
      inProgressTasks: tasks.filter(t => t.currentStatus === 'In-progress').length,
      delayedTasks: tasks.filter(t => t.completionStatus === 'delayed').length,
      onTimeTasks: tasks.filter(t => t.completionStatus === 'on-time').length,
      beforeTimeTasks: tasks.filter(t => t.completionStatus === 'before-time').length,
      totalHoursWorked: tasks.reduce((sum, t) => sum + (t.timeline.actualHours || 0), 0),
      averageTaskCompletionTime: 0
    };

    const completedTasks = tasks.filter(t => 
      t.currentStatus === 'Completed' && t.timeline.actualHours
    );

    if (completedTasks.length > 0) {
      stats.averageTaskCompletionTime = 
        completedTasks.reduce((sum, t) => sum + t.timeline.actualHours, 0) / completedTasks.length;
    }

    res.json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error fetching user statistics' });
  }
});

module.exports = router;