const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Search users in organization
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_TERM_REQUIRED',
          message: 'Search term is required'
        }
      });
    }

    const users = await User.search(req.user.organization_id, searchTerm, parseInt(limit));

    res.json({
      success: true,
      data: {
        users
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to search users'
      }
    });
  }
});

// Get users in organization (admin/manager only)
router.get('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const users = await User.findByOrganization(
      req.user.organization_id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: {
        users
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USERS_ERROR',
        message: 'Failed to get users'
      }
    });
  }
});

// Get user details
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    // Users can view their own profile, admins/managers can view others
    if (req.params.userId !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Don't return password hash
    delete user.password_hash;

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_ERROR',
        message: 'Failed to get user'
      }
    });
  }
});

// Update user (admin only for changing others, users can update themselves)
router.put('/:userId', authenticateToken, [
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('role').optional().isIn(['admin', 'manager', 'member']),
  body('permissions').optional().isArray(),
  body('avatar_url').optional().isURL(),
  body('settings').optional().isObject()
], async (req, res) => {
  try {
    // Check permissions
    const isOwnProfile = req.params.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const updateData = { ...req.body };

    // Non-admins cannot change role or permissions
    if (!isAdmin) {
      delete updateData.role;
      delete updateData.permissions;
    }

    const updatedUser = await User.update(req.params.userId, updateData);

    res.json({
      success: true,
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update user'
      }
    });
  }
});

// Delete user (admin only)
router.delete('/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Prevent admins from deleting themselves
    if (req.params.userId === req.user.id) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'Cannot delete your own account'
        }
      });
    }

    const deleted = await User.delete(req.params.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'User deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete user'
      }
    });
  }
});

// Get user's spaces
router.get('/:userId/spaces', authenticateToken, async (req, res) => {
  try {
    // Users can view their own spaces, admins can view others
    if (req.params.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    const spaces = await User.getUserSpaces(req.params.userId);

    res.json({
      success: true,
      data: {
        spaces
      }
    });

  } catch (error) {
    console.error('Get user spaces error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SPACES_ERROR',
        message: 'Failed to get user spaces'
      }
    });
  }
});

module.exports = router;