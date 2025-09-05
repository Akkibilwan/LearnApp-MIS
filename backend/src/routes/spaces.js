const express = require('express');
const { body, validationResult } = require('express-validator');
const Space = require('../models/Space');
const { authenticateToken, requireSpaceAccess } = require('../middleware/auth');

const router = express.Router();

// Get user's spaces
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, offset, includeArchived } = req.query;
    const userId = req.user.role === 'admin' ? null : req.user.id;

    const spaces = await Space.findByOrganization(req.user.organization_id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      includeArchived: includeArchived === 'true',
      userId
    });

    res.json({
      success: true,
      data: {
        spaces
      }
    });

  } catch (error) {
    console.error('Get spaces error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SPACES_ERROR',
        message: 'Failed to get spaces'
      }
    });
  }
});

// Create new space
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('icon').optional().isString(),
  body('workflow_type').optional().isIn(['kanban', 'linear', 'custom']),
  body('workflow_config').optional().isObject(),
  body('working_hours').optional().isObject(),
  body('timezone').optional().isString(),
  body('sla_rules').optional().isArray(),
  body('integrations').optional().isObject(),
  body('settings').optional().isObject()
], async (req, res) => {
  try {
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

    const spaceData = {
      ...req.body,
      organization_id: req.user.organization_id,
      created_by: req.user.id
    };

    const space = await Space.create(spaceData);

    res.status(201).json({
      success: true,
      data: {
        space
      }
    });

  } catch (error) {
    console.error('Create space error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create space'
      }
    });
  }
});

// Get space details
router.get('/:spaceId', authenticateToken, requireSpaceAccess('read'), async (req, res) => {
  try {
    const space = await Space.findById(req.params.spaceId, true);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SPACE_NOT_FOUND',
          message: 'Space not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        space
      }
    });

  } catch (error) {
    console.error('Get space error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SPACE_ERROR',
        message: 'Failed to get space'
      }
    });
  }
});

// Update space
router.put('/:spaceId', authenticateToken, requireSpaceAccess('write'), [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('icon').optional().isString(),
  body('workflow_type').optional().isIn(['kanban', 'linear', 'custom']),
  body('workflow_config').optional().isObject(),
  body('working_hours').optional().isObject(),
  body('timezone').optional().isString(),
  body('sla_rules').optional().isArray(),
  body('integrations').optional().isObject(),
  body('settings').optional().isObject()
], async (req, res) => {
  try {
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

    const updatedSpace = await Space.update(req.params.spaceId, req.body);

    res.json({
      success: true,
      data: {
        space: updatedSpace
      }
    });

  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update space'
      }
    });
  }
});

// Archive space
router.put('/:spaceId/archive', authenticateToken, requireSpaceAccess('admin'), async (req, res) => {
  try {
    const archivedSpace = await Space.archive(req.params.spaceId);

    res.json({
      success: true,
      data: {
        space: archivedSpace
      }
    });

  } catch (error) {
    console.error('Archive space error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARCHIVE_ERROR',
        message: 'Failed to archive space'
      }
    });
  }
});

// Delete space
router.delete('/:spaceId', authenticateToken, requireSpaceAccess('admin'), async (req, res) => {
  try {
    const deleted = await Space.delete(req.params.spaceId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SPACE_NOT_FOUND',
          message: 'Space not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Space deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete space error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete space'
      }
    });
  }
});

// Get space members
router.get('/:spaceId/members', authenticateToken, requireSpaceAccess('read'), async (req, res) => {
  try {
    const members = await Space.getMembers(req.params.spaceId);

    res.json({
      success: true,
      data: {
        members
      }
    });

  } catch (error) {
    console.error('Get space members error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MEMBERS_ERROR',
        message: 'Failed to get space members'
      }
    });
  }
});

// Add space member
router.post('/:spaceId/members', authenticateToken, requireSpaceAccess('admin'), [
  body('userId').isUUID(),
  body('role').optional().isIn(['admin', 'manager', 'member']),
  body('permissions').optional().isObject()
], async (req, res) => {
  try {
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

    const { userId, role = 'member', permissions = {} } = req.body;

    const member = await Space.addMember(req.params.spaceId, userId, role, permissions);

    res.status(201).json({
      success: true,
      data: {
        member
      }
    });

  } catch (error) {
    console.error('Add space member error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_MEMBER_ERROR',
        message: 'Failed to add space member'
      }
    });
  }
});

// Update space member
router.put('/:spaceId/members/:userId', authenticateToken, requireSpaceAccess('admin'), [
  body('role').optional().isIn(['admin', 'manager', 'member']),
  body('permissions').optional().isObject()
], async (req, res) => {
  try {
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

    const { role, permissions = {} } = req.body;

    const member = await Space.updateMemberRole(req.params.spaceId, req.params.userId, role, permissions);

    res.json({
      success: true,
      data: {
        member
      }
    });

  } catch (error) {
    console.error('Update space member error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_MEMBER_ERROR',
        message: 'Failed to update space member'
      }
    });
  }
});

// Remove space member
router.delete('/:spaceId/members/:userId', authenticateToken, requireSpaceAccess('admin'), async (req, res) => {
  try {
    const removed = await Space.removeMember(req.params.spaceId, req.params.userId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Member removed successfully'
      }
    });

  } catch (error) {
    console.error('Remove space member error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_MEMBER_ERROR',
        message: 'Failed to remove space member'
      }
    });
  }
});

// Get space analytics
router.get('/:spaceId/analytics', authenticateToken, requireSpaceAccess('read'), async (req, res) => {
  try {
    const analytics = await Space.getAnalytics(req.params.spaceId, req.query.range);

    res.json({
      success: true,
      data: {
        analytics
      }
    });

  } catch (error) {
    console.error('Get space analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get space analytics'
      }
    });
  }
});

module.exports = router;