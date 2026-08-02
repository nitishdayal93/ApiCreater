import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Protect routes - Verify JWT
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret_key');

      // Get user from the token, exclude password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
      }

      if (req.user.status === 'Blocked' || req.user.status === 'Suspended') {
        return res.status(403).json({ success: false, error: `Account access has been ${req.user.status.toLowerCase()}` });
      }

      next();
    } catch (error) {
      logger.warn(`Failed token authorization attempt: ${error.message}`);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(
        `User ${req.user ? req.user.email : 'Anonymous'} denied access to route requiring roles: [${roles.join(', ')}]. User role: ${req.user ? req.user.role : 'None'}`
      );
      return res.status(403).json({
        success: false,
        error: `User role '${req.user ? req.user.role : 'unknown'}' is not authorized to access this resource`,
      });
    }
    next();
  };
};
