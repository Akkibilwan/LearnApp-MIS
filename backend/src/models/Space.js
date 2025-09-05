const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Space {
  static async create(spaceData) {
    const {
      organization_id,
      name,
      description,
      color,
      icon,
      workflow_type = 'kanban',
      workflow_config = {},
      working_hours = {},
      timezone = 'UTC',
      sla_rules = [],
      integrations = {},
      permissions = {},
      settings = {},
      created_by
    } = spaceData;

    return withTransaction(async (client) => {
      // Create the space
      const spaceResult = await client.query(
        `INSERT INTO spaces (
          organization_id, name, description, color, icon, workflow_type,
          workflow_config, working_hours, timezone, sla_rules, integrations,
          permissions, settings, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          organization_id, name, description, color, icon, workflow_type,
          JSON.stringify(workflow_config), JSON.stringify(working_hours),
          timezone, JSON.stringify(sla_rules), JSON.stringify(integrations),
          JSON.stringify(permissions), JSON.stringify(settings), created_by
        ]
      );

      const space = spaceResult.rows[0];

      // Add creator as admin member
      await client.query(
        `INSERT INTO space_members (space_id, user_id, role, permissions)
         VALUES ($1, $2, 'admin', '{}')`,
        [space.id, created_by]
      );

      // Create default groups if workflow_config has stages
      if (workflow_config.stages && Array.isArray(workflow_config.stages)) {
        for (let i = 0; i < workflow_config.stages.length; i++) {
          const stage = workflow_config.stages[i];
          await client.query(
            `INSERT INTO groups (space_id, name, color, position, workflow_stage)
             VALUES ($1, $2, $3, $4, $5)`,
            [space.id, stage.name, stage.color, i, stage.id]
          );
        }
      }

      return space;
    });
  }

  static async findById(id, includeMembers = false) {
    let query_text = `
      SELECT s.*, u.name as created_by_name, u.email as created_by_email
      FROM spaces s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1
    `;

    const result = await query(query_text, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const space = result.rows[0];

    if (includeMembers) {
      const membersResult = await query(
        `SELECT sm.role, sm.permissions, sm.joined_at,
                u.id, u.name, u.email, u.avatar_url
         FROM space_members sm
         JOIN users u ON sm.user_id = u.id
         WHERE sm.space_id = $1
         ORDER BY sm.joined_at ASC`,
        [id]
      );
      
      space.members = membersResult.rows;
    }

    return space;
  }

  static async findByOrganization(organizationId, options = {}) {
    const { limit = 50, offset = 0, includeArchived = false, userId } = options;
    
    let whereClause = 'WHERE s.organization_id = $1';
    let joinClause = '';
    const params = [organizationId];

    if (!includeArchived) {
      whereClause += ' AND s.is_archived = FALSE';
    }

    if (userId) {
      joinClause = 'JOIN space_members sm ON s.id = sm.space_id';
      whereClause += ` AND sm.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    const result = await query(
      `SELECT s.*, u.name as created_by_name,
              (SELECT COUNT(*) FROM groups WHERE space_id = s.id) as group_count,
              (SELECT COUNT(*) FROM tasks WHERE space_id = s.id) as task_count
       FROM spaces s
       LEFT JOIN users u ON s.created_by = u.id
       ${joinClause}
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = [
      'name', 'description', 'color', 'icon', 'workflow_type',
      'workflow_config', 'working_hours', 'timezone', 'sla_rules',
      'integrations', 'permissions', 'settings'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        const value = ['workflow_config', 'working_hours', 'sla_rules', 'integrations', 'permissions', 'settings'].includes(key)
          ? JSON.stringify(updateData[key])
          : updateData[key];
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE spaces SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async archive(id) {
    const result = await query(
      `UPDATE spaces SET is_archived = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0];
  }

  static async unarchive(id) {
    const result = await query(
      `UPDATE spaces SET is_archived = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0];
  }

  static async delete(id) {
    return withTransaction(async (client) => {
      // Delete all related data
      await client.query(`DELETE FROM activities WHERE space_id = $1`, [id]);
      await client.query(`DELETE FROM time_logs WHERE task_id IN (SELECT id FROM tasks WHERE space_id = $1)`, [id]);
      await client.query(`DELETE FROM task_dependencies WHERE predecessor_id IN (SELECT id FROM tasks WHERE space_id = $1) OR successor_id IN (SELECT id FROM tasks WHERE space_id = $1)`, [id]);
      await client.query(`DELETE FROM comments WHERE task_id IN (SELECT id FROM tasks WHERE space_id = $1)`, [id]);
      await client.query(`DELETE FROM tasks WHERE space_id = $1`, [id]);
      await client.query(`DELETE FROM group_dependencies WHERE space_id = $1`, [id]);
      await client.query(`DELETE FROM groups WHERE space_id = $1`, [id]);
      await client.query(`DELETE FROM space_members WHERE space_id = $1`, [id]);
      
      const result = await client.query(
        `DELETE FROM spaces WHERE id = $1 RETURNING id`,
        [id]
      );

      return result.rows.length > 0;
    });
  }

  static async getMembers(spaceId) {
    const result = await query(
      `SELECT sm.role, sm.permissions, sm.joined_at,
              u.id, u.name, u.email, u.avatar_url
       FROM space_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.space_id = $1
       ORDER BY sm.joined_at ASC`,
      [spaceId]
    );

    return result.rows;
  }

  static async addMember(spaceId, userId, role = 'member', permissions = {}) {
    const result = await query(
      `INSERT INTO space_members (space_id, user_id, role, permissions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (space_id, user_id) 
       DO UPDATE SET role = $3, permissions = $4, joined_at = NOW()
       RETURNING *`,
      [spaceId, userId, role, JSON.stringify(permissions)]
    );

    return result.rows[0];
  }

  static async updateMemberRole(spaceId, userId, role, permissions = {}) {
    const result = await query(
      `UPDATE space_members 
       SET role = $3, permissions = $4
       WHERE space_id = $1 AND user_id = $2
       RETURNING *`,
      [spaceId, userId, role, JSON.stringify(permissions)]
    );

    return result.rows[0];
  }

  static async removeMember(spaceId, userId) {
    const result = await query(
      `DELETE FROM space_members 
       WHERE space_id = $1 AND user_id = $2
       RETURNING *`,
      [spaceId, userId]
    );

    return result.rows.length > 0;
  }

  static async getGroups(spaceId) {
    const result = await query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM tasks WHERE group_id = g.id) as task_count
       FROM groups g
       WHERE g.space_id = $1
       ORDER BY g.position ASC`,
      [spaceId]
    );

    return result.rows;
  }

  static async getTasks(spaceId, options = {}) {
    const { groupId, assigneeId, status, priority, limit = 100, offset = 0 } = options;
    
    let whereClause = 'WHERE t.space_id = $1';
    const params = [spaceId];
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
      [...params, limit, offset]
    );

    return result.rows;
  }

  static async getAnalytics(spaceId, dateRange = '30d') {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND status = 'in_progress') as in_progress_tasks,
        (SELECT COUNT(*) FROM tasks WHERE space_id = $1 AND priority = 'high') as high_priority_tasks,
        (SELECT COUNT(*) FROM groups WHERE space_id = $1) as total_groups,
        (SELECT COUNT(DISTINCT user_id) FROM space_members WHERE space_id = $1) as total_members,
        (SELECT AVG(logged_hours) FROM tasks WHERE space_id = $1 AND logged_hours > 0) as avg_task_hours`,
      [spaceId]
    );

    return result.rows[0];
  }

  static async duplicate(originalSpaceId, newSpaceData) {
    return withTransaction(async (client) => {
      // Get original space
      const originalSpace = await this.findById(originalSpaceId);
      if (!originalSpace) {
        throw new Error('Original space not found');
      }

      // Create new space
      const spaceData = {
        ...originalSpace,
        ...newSpaceData,
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      };

      const newSpaceResult = await client.query(
        `INSERT INTO spaces (
          organization_id, name, description, color, icon, workflow_type,
          workflow_config, working_hours, timezone, sla_rules, integrations,
          permissions, settings, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          spaceData.organization_id, spaceData.name, spaceData.description,
          spaceData.color, spaceData.icon, spaceData.workflow_type,
          spaceData.workflow_config, spaceData.working_hours, spaceData.timezone,
          spaceData.sla_rules, spaceData.integrations, spaceData.permissions,
          spaceData.settings, spaceData.created_by
        ]
      );

      const newSpace = newSpaceResult.rows[0];

      // Copy groups
      const groupsResult = await client.query(
        `SELECT * FROM groups WHERE space_id = $1 ORDER BY position ASC`,
        [originalSpaceId]
      );

      for (const group of groupsResult.rows) {
        await client.query(
          `INSERT INTO groups (space_id, name, description, color, position, workflow_stage, rules, limits, sla_config, permissions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newSpace.id, group.name, group.description, group.color,
            group.position, group.workflow_stage, group.rules,
            group.limits, group.sla_config, group.permissions
          ]
        );
      }

      // Add creator as admin
      await client.query(
        `INSERT INTO space_members (space_id, user_id, role, permissions)
         VALUES ($1, $2, 'admin', '{}')`,
        [newSpace.id, newSpaceData.created_by]
      );

      return newSpace;
    });
  }
}

module.exports = Space;