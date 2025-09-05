const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireSpaceAccess } = require('../middleware/auth');

const router = express.Router();

// Get groups in a space
router.get('/space/:spaceId', authenticateToken, requireSpaceAccess('read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM tasks WHERE group_id = g.id) as task_count
       FROM groups g
       WHERE g.space_id = $1
       ORDER BY g.position ASC`,
      [req.params.spaceId]
    );

    res.json({
      success: true,
      data: {
        groups: result.rows
      }
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GROUPS_ERROR',
        message: 'Failed to get groups'
      }
    });
  }
});

// Create new group
router.post('/space/:spaceId', authenticateToken, requireSpaceAccess('write'), [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('position').isInt({ min: 0 }),
  body('workflow_stage').optional().isString(),
  body('rules').optional().isObject(),
  body('limits').optional().isObject(),
  body('sla_config').optional().isObject()
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

    const { name, description, color, position, workflow_stage, rules, limits, sla_config } = req.body;

    const result = await query(
      `INSERT INTO groups (space_id, name, description, color, position, workflow_stage, rules, limits, sla_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.params.spaceId, name, description, color, position, workflow_stage,
        JSON.stringify(rules || {}), JSON.stringify(limits || {}), JSON.stringify(sla_config || {})
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        group: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create group'
      }
    });
  }
});

// Update group
router.put('/:groupId', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('position').optional().isInt({ min: 0 }),
  body('workflow_stage').optional().isString(),
  body('rules').optional().isObject(),
  body('limits').optional().isObject(),
  body('sla_config').optional().isObject()
], async (req, res) => {
  try {
    // Check space access through group
    const groupResult = await query('SELECT space_id FROM groups WHERE id = $1', [req.params.groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Group not found'
        }
      });
    }

    req.params.spaceId = groupResult.rows[0].space_id;
    
    // Apply space access middleware
    await new Promise((resolve, reject) => {
      requireSpaceAccess('write')(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

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

    const allowedFields = ['name', 'description', 'color', 'position', 'workflow_stage', 'rules', 'limits', 'sla_config'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        const value = ['rules', 'limits', 'sla_config'].includes(key)
          ? JSON.stringify(req.body[key])
          : req.body[key];
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update'
        }
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.groupId);

    const result = await query(
      `UPDATE groups SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: {
        group: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update group'
      }
    });
  }
});

// Delete group
router.delete('/:groupId', authenticateToken, async (req, res) => {
  try {
    // Check space access through group
    const groupResult = await query('SELECT space_id FROM groups WHERE id = $1', [req.params.groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Group not found'
        }
      });
    }

    req.params.spaceId = groupResult.rows[0].space_id;
    
    // Apply space access middleware
    await new Promise((resolve, reject) => {
      requireSpaceAccess('admin')(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Check if group has tasks
    const taskCount = await query(
      'SELECT COUNT(*) FROM tasks WHERE group_id = $1',
      [req.params.groupId]
    );

    if (parseInt(taskCount.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'GROUP_HAS_TASKS',
          message: 'Cannot delete group that contains tasks'
        }
      });
    }

    const result = await query(
      'DELETE FROM groups WHERE id = $1 RETURNING id',
      [req.params.groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Group not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Group deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete group'
      }
    });
  }
});

// Reorder groups
router.post('/:groupId/reorder', authenticateToken, [
  body('newPosition').isInt({ min: 0 })
], async (req, res) => {
  try {
    // Check space access through group
    const groupResult = await query('SELECT space_id FROM groups WHERE id = $1', [req.params.groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Group not found'
        }
      });
    }

    req.params.spaceId = groupResult.rows[0].space_id;
    
    // Apply space access middleware
    await new Promise((resolve, reject) => {
      requireSpaceAccess('write')(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

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

    const { newPosition } = req.body;

    // Update positions (simplified - in production you'd want more sophisticated reordering)
    await query(
      'UPDATE groups SET position = $2, updated_at = NOW() WHERE id = $1',
      [req.params.groupId, newPosition]
    );

    // Get updated groups
    const result = await query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM tasks WHERE group_id = g.id) as task_count
       FROM groups g
       WHERE g.space_id = $1
       ORDER BY g.position ASC`,
      [req.params.spaceId]
    );

    res.json({
      success: true,
      data: {
        groups: result.rows
      }
    });

  } catch (error) {
    console.error('Reorder groups error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REORDER_ERROR',
        message: 'Failed to reorder groups'
      }
    });
  }
});

module.exports = router;