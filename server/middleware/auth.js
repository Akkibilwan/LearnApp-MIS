const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authorization failed' });
  }
};

const spaceAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    const spaceId = req.params.spaceId || req.body.spaceId;
    
    if (!spaceId) {
      return res.status(400).json({ message: 'Space ID required' });
    }
    
    const Space = require('../models/Space');
    const space = await Space.findById(spaceId);
    
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }
    
    // Check if user is admin of the space or a member
    const isAdmin = space.admin.toString() === req.user._id.toString();
    const isMember = space.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );
    
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Access denied to this space' });
    }
    
    req.space = space;
    req.isSpaceAdmin = isAdmin;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error in space authorization' });
  }
};

module.exports = { auth, adminAuth, spaceAuth };