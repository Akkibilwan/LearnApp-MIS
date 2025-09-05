const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireSpaceAccess } = require('../middleware/auth');

const router = express.Router();

// Get space analytics
router.get('/spaces/:spaceId', authenticateToken, requireSpaceAccess('read'), async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const spaceId = req.params.spaceId;

    // Calculate date range
    let startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get basic metrics
    const metricsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND status = 'in_progress') as in_progress_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND priority = 'high') as high_priority_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND priority = 'critical') as critical_tasks,
        (SELECT COUNT(*) FROM groups WHERE space_id = $1) as total_groups,
        (SELECT COUNT(DISTINCT user_id) FROM space_members WHERE space_id = $1) as total_members,
        (SELECT AVG(logged_hours) FROM tasks WHERE space_id = $1 AND logged_hours > 0) as avg_task_hours,
        (SELECT SUM(logged_hours) FROM tasks WHERE space_id = $1) as total_logged_hours,
        (SELECT AVG(estimated_hours) FROM tasks WHERE space_id = $1 AND estimated_hours > 0) as avg_estimated_hours`,
      [spaceId]
    );

    // Get task completion rate over time
    const completionTrendResult = await query(
      `SELECT DATE(created_at) as date, 
              COUNT(*) as created,
              COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM tasks 
       WHERE space_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [spaceId, startDate.toISOString()]
    );

    // Get tasks by priority distribution
    const priorityDistributionResult = await query(
      `SELECT priority, COUNT(*) as count
       FROM tasks 
       WHERE space_id = $1
       GROUP BY priority`,
      [spaceId]
    );

    // Get tasks by status distribution
    const statusDistributionResult = await query(
      `SELECT status, COUNT(*) as count
       FROM tasks 
       WHERE space_id = $1
       GROUP BY status`,
      [spaceId]
    );

    // Get group task distribution
    const groupDistributionResult = await query(
      `SELECT g.name, COUNT(t.id) as task_count
       FROM groups g
       LEFT JOIN tasks t ON g.id = t.group_id
       WHERE g.space_id = $1
       GROUP BY g.id, g.name
       ORDER BY task_count DESC`,
      [spaceId]
    );

    // Get top assignees by task count
    const assigneeStatsResult = await query(
      `SELECT u.name, u.email, 
              COUNT(t.id) as total_tasks,
              COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
              AVG(t.logged_hours) as avg_hours
       FROM users u
       JOIN tasks t ON u.id = t.assignee_id
       WHERE t.space_id = $1
       GROUP BY u.id, u.name, u.email
       ORDER BY total_tasks DESC
       LIMIT 10`,
      [spaceId]
    );

    // Get recent activities
    const recentActivitiesResult = await query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.space_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [spaceId]
    );

    // Get overdue tasks
    const overdueTasksResult = await query(
      `SELECT t.*, g.name as group_name, u.name as assignee_name
       FROM tasks t
       LEFT JOIN groups g ON t.group_id = g.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.space_id = $1 AND t.due_date < NOW() AND t.status != 'completed'
       ORDER BY t.due_date ASC`,
      [spaceId]
    );

    res.json({
      success: true,
      data: {
        metrics: metricsResult.rows[0],
        completion_trend: completionTrendResult.rows,
        priority_distribution: priorityDistributionResult.rows,
        status_distribution: statusDistributionResult.rows,
        group_distribution: groupDistributionResult.rows,
        assignee_stats: assigneeStatsResult.rows,
        recent_activities: recentActivitiesResult.rows,
        overdue_tasks: overdueTasksResult.rows,
        date_range: dateRange
      },
      meta: {
        generated_at: new Date().toISOString(),
        period: { start: startDate.toISOString(), end: new Date().toISOString() }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get analytics'
      }
    });
  }
});

// Get organization-wide analytics (admin only)
router.get('/organization', authenticateToken, async (req, res) => {
  try {
    // Only admins can view organization analytics
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    const organizationId = req.user.organization_id;

    // Get organization metrics
    const metricsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE organization_id = $1) as total_users,
        (SELECT COUNT(*) FROM spaces WHERE organization_id = $1 AND is_archived = FALSE) as active_spaces,
        (SELECT COUNT(*) FROM spaces WHERE organization_id = $1 AND is_archived = TRUE) as archived_spaces,
        (SELECT COUNT(*) FROM tasks t JOIN spaces s ON t.space_id = s.id WHERE s.organization_id = $1) as total_tasks,
        (SELECT COUNT(*) FROM tasks t JOIN spaces s ON t.space_id = s.id WHERE s.organization_id = $1 AND t.status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM groups g JOIN spaces s ON g.space_id = s.id WHERE s.organization_id = $1) as total_groups`,
      [organizationId]
    );

    // Get space activity summary
    const spaceActivityResult = await query(
      `SELECT s.name, s.id,
              COUNT(t.id) as task_count,
              COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
              COUNT(DISTINCT sm.user_id) as member_count
       FROM spaces s
       LEFT JOIN tasks t ON s.id = t.space_id
       LEFT JOIN space_members sm ON s.id = sm.space_id
       WHERE s.organization_id = $1 AND s.is_archived = FALSE
       GROUP BY s.id, s.name
       ORDER BY task_count DESC`,
      [organizationId]
    );

    // Get user activity summary
    const userActivityResult = await query(
      `SELECT u.name, u.email,
              COUNT(t.id) as assigned_tasks,
              COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
              COUNT(DISTINCT t.space_id) as spaces_involved
       FROM users u
       LEFT JOIN tasks t ON u.id = t.assignee_id
       WHERE u.organization_id = $1
       GROUP BY u.id, u.name, u.email
       ORDER BY assigned_tasks DESC
       LIMIT 10`,
      [organizationId]
    );

    res.json({
      success: true,
      data: {
        metrics: metricsResult.rows[0],
        space_activity: spaceActivityResult.rows,
        user_activity: userActivityResult.rows
      },
      meta: {
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get organization analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get organization analytics'
      }
    });
  }
});

module.exports = router;