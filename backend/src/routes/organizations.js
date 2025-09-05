const express = require('express');
const { body, validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get organization details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found'
        }
      });
    }

    const stats = await Organization.getStats(organization.id);

    res.json({
      success: true,
      data: {
        organization: {
          ...organization,
          ...stats
        }
      }
    });

  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORGANIZATION_ERROR',
        message: 'Failed to get organization'
      }
    });
  }
});

// Update organization
router.put('/', authenticateToken, requireRole(['admin']), [
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
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

    const { name, settings } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (settings) updateData.settings = settings;

    const updatedOrganization = await Organization.update(req.user.organization_id, updateData);

    res.json({
      success: true,
      data: {
        organization: updatedOrganization
      }
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update organization'
      }
    });
  }
});

// Get all users in organization
router.get('/users', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { limit, offset, role, search } = req.query;

    const result = await Organization.getAllUsers(req.user.organization_id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      role,
      search
    });

    res.json({
      success: true,
      data: result,
      meta: {
        pagination: {
          limit: result.limit,
          offset: result.offset,
          total: result.total
        }
      }
    });

  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USERS_ERROR',
        message: 'Failed to get organization users'
      }
    });
  }
});

// Get all spaces in organization
router.get('/spaces', authenticateToken, async (req, res) => {
  try {
    const { limit, offset, includeArchived } = req.query;
    const userId = req.user.role === 'admin' ? null : req.user.id;

    const result = await Organization.getAllSpaces(req.user.organization_id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      includeArchived: includeArchived === 'true',
      userId
    });

    res.json({
      success: true,
      data: result,
      meta: {
        pagination: {
          limit: result.limit,
          offset: result.offset,
          total: result.total
        }
      }
    });

  } catch (error) {
    console.error('Get organization spaces error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SPACES_ERROR',
        message: 'Failed to get organization spaces'
      }
    });
  }
});

module.exports = router;