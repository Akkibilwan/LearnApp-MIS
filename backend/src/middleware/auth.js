const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token required'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    const userResult = await query(
      `SELECT u.*, o.name as organization_name, o.slug as organization_slug 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired'
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

const requireSpaceAccess = (permission = 'read') => {
  return async (req, res, next) => {
    try {
      const spaceId = req.params.spaceId || req.body.spaceId;
      
      if (!spaceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SPACE_ID',
            message: 'Space ID required'
          }
        });
      }

      // Check if user is a member of the space or is admin
      const membershipResult = await query(
        `SELECT sm.role, sm.permissions, s.created_by 
         FROM space_members sm
         JOIN spaces s ON s.id = sm.space_id
         WHERE sm.space_id = $1 AND sm.user_id = $2`,
        [spaceId, req.user.id]
      );

      if (membershipResult.rows.length === 0) {
        // Check if user is the space creator or organization admin
        const spaceResult = await query(
          `SELECT created_by FROM spaces WHERE id = $1 AND organization_id = $2`,
          [spaceId, req.user.organization_id]
        );

        if (spaceResult.rows.length === 0 || 
            (spaceResult.rows[0].created_by !== req.user.id && req.user.role !== 'admin')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'SPACE_ACCESS_DENIED',
              message: 'Access denied to this space'
            }
          });
        }
      }

      // Add space access info to request
      req.spaceAccess = {
        spaceId,
        role: membershipResult.rows[0]?.role || 'owner',
        permissions: membershipResult.rows[0]?.permissions || {}
      };

      next();
    } catch (error) {
      console.error('Space access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ACCESS_CHECK_ERROR',
          message: 'Failed to verify space access'
        }
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSpaceAccess
};