const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const { authenticateToken, requireSpaceAccess } = require('../middleware/auth');

const router = express.Router();

// Get tasks in a space
router.get('/space/:spaceId', authenticateToken, requireSpaceAccess('read'), async (req, res) => {
  try {
    const { groupId, assigneeId, status, priority, limit = 100, offset = 0 } = req.query;
    
    let whereClause = 'WHERE t.space_id = $1';
    const params = [req.params.spaceId];
    let paramCount = 2;

    if (groupId) {
      whereClause += ` AND t.group_id = $${paramCount}`;
      params.push(groupId);
      paramCount++;
    }

    if (assigneeId) {
      whereClause += ` AND t.assignee_id = $${paramCount}`;
      params.push(assigneeId);
      paramCount++;
    }

    if (status) {
      whereClause += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      whereClause += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    const result = await query(
      `SELECT t.*, 
              g.name as group_name, g.color as group_color,
              a.name as assignee_name, a.email as assignee_email,
              r.name as reporter_name, r.email as reporter_email
       FROM tasks t
       LEFT JOIN groups g ON t.group_id = g.id
       LEFT JOIN users a ON t.assignee_id = a.id
       LEFT JOIN users r ON t.reporter_id = r.id
       ${whereClause}
       ORDER BY t.position ASC, t.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        tasks: result.rows
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TASKS_ERROR',
        message: 'Failed to get tasks'
      }
    });
  }
});

// Create new task
router.post('/space/:spaceId', authenticateToken, requireSpaceAccess('write'), [
  body('title').trim().isLength({ min: 1, max: 500 }),
  body('description').optional().trim(),
  body('group_id').isUUID(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('assignee_id').optional().isUUID(),
  body('estimated_hours').optional().isDecimal(),
  body('due_date').optional().isISO8601(),
  body('custom_fields').optional().isObject(),
  body('tags').optional().isArray()
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

    const {
      title, description, group_id, priority = 'medium',
      assignee_id, estimated_hours, due_date, custom_fields = {},
      tags = []
    } = req.body;

    // Get next position in group
    const positionResult = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM tasks WHERE group_id = $1',
      [group_id]
    );
    const position = positionResult.rows[0].next_position;

    const result = await query(
      `INSERT INTO tasks (
        space_id, group_id, title, description, priority, assignee_id,
        reporter_id, estimated_hours, due_date, custom_fields, tags, position
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.params.spaceId, group_id, title, description, priority,
        assignee_id, req.user.id, estimated_hours, due_date,
        JSON.stringify(custom_fields), tags, position
      ]
    );

    const task = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activities (space_id, task_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, 'created', 'task', $2, $4)`,
      [
        req.params.spaceId, task.id, req.user.id,
        JSON.stringify({ title, group_id })
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        task
      }
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create task'
      }
    });
  }
});

// Get task details
router.get('/:taskId', authenticateToken, async (req, res) => {
  try {
    // Get task and verify space access
    const taskResult = await query(
      `SELECT t.*, s.id as space_id
       FROM tasks t
       JOIN spaces s ON t.space_id = s.id
       WHERE t.id = $1`,
      [req.params.taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    const task = taskResult.rows[0];
    req.params.spaceId = task.space_id;

    // Check space access
    await new Promise((resolve, reject) => {
      requireSpaceAccess('read')(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Get full task details with relationships
    const result = await query(
      `SELECT t.*, 
              g.name as group_name, g.color as group_color,
              a.name as assignee_name, a.email as assignee_email, a.avatar_url as assignee_avatar,
              r.name as reporter_name, r.email as reporter_email, r.avatar_url as reporter_avatar
       FROM tasks t
       LEFT JOIN groups g ON t.group_id = g.id
       LEFT JOIN users a ON t.assignee_id = a.id
       LEFT JOIN users r ON t.reporter_id = r.id
       WHERE t.id = $1`,
      [req.params.taskId]
    );

    // Get comments
    const commentsResult = await query(
      `SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_url
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );

    // Get time logs
    const timeLogsResult = await query(
      `SELECT tl.*, u.name as user_name, u.email as user_email
       FROM time_logs tl
       LEFT JOIN users u ON tl.user_id = u.id
       WHERE tl.task_id = $1
       ORDER BY tl.logged_date DESC`,
      [req.params.taskId]
    );

    const fullTask = {
      ...result.rows[0],
      comments: commentsResult.rows,
      time_logs: timeLogsResult.rows
    };

    res.json({
      success: true,
      data: {
        task: fullTask
      }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TASK_ERROR',
        message: 'Failed to get task'
      }
    });
  }
});

// Update task
router.put('/:taskId', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1, max: 500 }),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isString(),
  body('assignee_id').optional().isUUID(),
  body('estimated_hours').optional().isDecimal(),
  body('due_date').optional().isISO8601(),
  body('custom_fields').optional().isObject(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    // Get task and verify space access
    const taskResult = await query('SELECT space_id FROM tasks WHERE id = $1', [req.params.taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    req.params.spaceId = taskResult.rows[0].space_id;

    // Check space access
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

    const allowedFields = [
      'title', 'description', 'priority', 'status', 'assignee_id',
      'estimated_hours', 'due_date', 'custom_fields', 'tags'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        const value = ['custom_fields'].includes(key) && req.body[key]
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
    values.push(req.params.taskId);

    const result = await query(
      `UPDATE tasks SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    // Log activity
    await query(
      `INSERT INTO activities (space_id, task_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, 'updated', 'task', $2, $4)`,
      [req.params.spaceId, req.params.taskId, req.user.id, JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      data: {
        task: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update task'
      }
    });
  }
});

// Move task to different group
router.put('/:taskId/move', authenticateToken, [
  body('group_id').isUUID(),
  body('position').optional().isDecimal()
], async (req, res) => {
  try {
    // Get task and verify space access
    const taskResult = await query('SELECT space_id, group_id FROM tasks WHERE id = $1', [req.params.taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    req.params.spaceId = taskResult.rows[0].space_id;

    // Check space access
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

    const { group_id, position } = req.body;
    const oldGroupId = taskResult.rows[0].group_id;

    // Get position if not provided
    let newPosition = position;
    if (!newPosition) {
      const positionResult = await query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM tasks WHERE group_id = $1',
        [group_id]
      );
      newPosition = positionResult.rows[0].next_position;
    }

    const result = await query(
      `UPDATE tasks 
       SET group_id = $2, position = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.taskId, group_id, newPosition]
    );

    // Log activity
    await query(
      `INSERT INTO activities (space_id, task_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, 'moved', 'task', $2, $4)`,
      [
        req.params.spaceId, req.params.taskId, req.user.id,
        JSON.stringify({ from_group: oldGroupId, to_group: group_id })
      ]
    );

    res.json({
      success: true,
      data: {
        task: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MOVE_ERROR',
        message: 'Failed to move task'
      }
    });
  }
});

// Delete task
router.delete('/:taskId', authenticateToken, async (req, res) => {
  try {
    // Get task and verify space access
    const taskResult = await query('SELECT space_id FROM tasks WHERE id = $1', [req.params.taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found'
        }
      });
    }

    req.params.spaceId = taskResult.rows[0].space_id;

    // Check space access
    await new Promise((resolve, reject) => {
      requireSpaceAccess('admin')(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await withTransaction(async (client) => {
      // Delete related data
      await client.query('DELETE FROM time_logs WHERE task_id = $1', [req.params.taskId]);
      await client.query('DELETE FROM comments WHERE task_id = $1', [req.params.taskId]);
      await client.query('DELETE FROM task_dependencies WHERE predecessor_id = $1 OR successor_id = $1', [req.params.taskId]);
      await client.query('DELETE FROM activities WHERE task_id = $1', [req.params.taskId]);
      
      // Delete task
      const result = await client.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.taskId]);
      
      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }
    });

    res.json({
      success: true,
      data: {
        message: 'Task deleted successfully'
      }
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete task'
      }
    });
  }
});

module.exports = router;