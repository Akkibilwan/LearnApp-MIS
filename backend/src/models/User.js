const { query, withTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async create(userData) {
    const { 
      email, 
      name, 
      password, 
      organization_id,
      role = 'member',
      permissions = [],
      settings = {}
    } = userData;

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (email, name, password_hash, organization_id, role, permissions, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, permissions, settings, created_at, updated_at`,
      [email, name, password_hash, organization_id, role, JSON.stringify(permissions), JSON.stringify(settings)]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.permissions, u.settings,
              u.created_at, u.updated_at, o.name as organization_name, o.slug as organization_slug
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await query(
      `SELECT u.*, o.name as organization_name, o.slug as organization_slug
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  static async findByOrganization(organizationId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.permissions, u.settings,
              u.created_at, u.updated_at
       FROM users u
       WHERE u.organization_id = $1
       ORDER BY u.name ASC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );

    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'avatar_url', 'role', 'permissions', 'settings'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(typeof updateData[key] === 'object' ? JSON.stringify(updateData[key]) : updateData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING id, email, name, avatar_url, role, permissions, settings, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const result = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name`,
      [password_hash, id]
    );

    return result.rows[0];
  }

  static async verifyPassword(email, password) {
    const result = await query(
      `SELECT id, email, password_hash FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return null;
    }

    return { id: user.id, email: user.email };
  }

  static async delete(id) {
    const result = await query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );

    return result.rows.length > 0;
  }

  static async getUserSpaces(userId) {
    const result = await query(
      `SELECT s.*, sm.role as user_role, sm.permissions as user_permissions
       FROM spaces s
       JOIN space_members sm ON s.id = sm.space_id
       WHERE sm.user_id = $1 AND s.is_archived = FALSE
       ORDER BY s.name ASC`,
      [userId]
    );

    return result.rows;
  }

  static async addToSpace(userId, spaceId, role = 'member', permissions = {}) {
    try {
      const result = await query(
        `INSERT INTO space_members (user_id, space_id, role, permissions)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (space_id, user_id) 
         DO UPDATE SET role = $3, permissions = $4, joined_at = NOW()
         RETURNING *`,
        [userId, spaceId, role, JSON.stringify(permissions)]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') {
        throw new Error('User or Space not found');
      }
      throw error;
    }
  }

  static async removeFromSpace(userId, spaceId) {
    const result = await query(
      `DELETE FROM space_members WHERE user_id = $1 AND space_id = $2 RETURNING *`,
      [userId, spaceId]
    );

    return result.rows.length > 0;
  }

  static async search(organizationId, searchTerm, limit = 20) {
    const result = await query(
      `SELECT id, email, name, avatar_url, role
       FROM users
       WHERE organization_id = $1 
       AND (name ILIKE $2 OR email ILIKE $2)
       ORDER BY name ASC
       LIMIT $3`,
      [organizationId, `%${searchTerm}%`, limit]
    );

    return result.rows;
  }
}

module.exports = User;