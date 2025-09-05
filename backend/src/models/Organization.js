const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Organization {
  static async create(organizationData) {
    const { name, slug, settings = {} } = organizationData;

    const result = await query(
      `INSERT INTO organizations (name, slug, settings)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, JSON.stringify(settings)]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT * FROM organizations WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async findBySlug(slug) {
    const result = await query(
      `SELECT * FROM organizations WHERE slug = $1`,
      [slug]
    );

    return result.rows[0] || null;
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'slug', 'settings'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(key === 'settings' ? JSON.stringify(updateData[key]) : updateData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE organizations SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    return withTransaction(async (client) => {
      // Check if organization has users
      const userCount = await client.query(
        `SELECT COUNT(*) FROM users WHERE organization_id = $1`,
        [id]
      );

      if (parseInt(userCount.rows[0].count) > 0) {
        throw new Error('Cannot delete organization with existing users');
      }

      const result = await client.query(
        `DELETE FROM organizations WHERE id = $1 RETURNING id`,
        [id]
      );

      return result.rows.length > 0;
    });
  }

  static async getStats(id) {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE organization_id = $1) as user_count,
        (SELECT COUNT(*) FROM spaces WHERE organization_id = $1 AND is_archived = FALSE) as space_count,
        (SELECT COUNT(*) FROM tasks t JOIN spaces s ON t.space_id = s.id WHERE s.organization_id = $1) as task_count,
        (SELECT COUNT(*) FROM activities a JOIN spaces s ON a.space_id = s.id WHERE s.organization_id = $1) as activity_count`,
      [id]
    );

    return result.rows[0];
  }

  static async generateUniqueSlug(baseName) {
    let slug = baseName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let counter = 0;
    let uniqueSlug = slug;

    while (true) {
      const existing = await query(
        `SELECT id FROM organizations WHERE slug = $1`,
        [uniqueSlug]
      );

      if (existing.rows.length === 0) {
        return uniqueSlug;
      }

      counter++;
      uniqueSlug = `${slug}-${counter}`;
    }
  }

  static async getAllUsers(organizationId, options = {}) {
    const { limit = 50, offset = 0, role, search } = options;
    
    let whereClause = 'WHERE organization_id = $1';
    let params = [organizationId];
    let paramCount = 2;

    if (role) {
      whereClause += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const result = await query(
      `SELECT id, email, name, avatar_url, role, created_at, updated_at
       FROM users 
       ${whereClause}
       ORDER BY name ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  static async getAllSpaces(organizationId, options = {}) {
    const { limit = 50, offset = 0, includeArchived = false } = options;
    
    let whereClause = 'WHERE organization_id = $1';
    const params = [organizationId];

    if (!includeArchived) {
      whereClause += ' AND is_archived = FALSE';
    }

    const result = await query(
      `SELECT s.*, u.name as created_by_name
       FROM spaces s
       LEFT JOIN users u ON s.created_by = u.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM spaces ${whereClause}`,
      [organizationId]
    );

    return {
      spaces: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }
}

module.exports = Organization;