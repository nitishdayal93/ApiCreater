import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_jwt_secret_key', {
    expiresIn: process.env.JWT_EXPIRES || '1d',
  });
};

// Helper to generate JWT Refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'fallback_jwt_refresh_secret_key', {
    expiresIn: process.env.REFRESH_EXPIRES || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    let { name, username, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, and password' });
    }

    if (!username) {
      username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);
    }

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'Email or username already registered' });
    }

    // First user registered becomes Super Admin
    const isFirstUser = (await User.countDocuments({})) === 0;
    const role = isFirstUser ? 'Super Admin' : 'User';

    const user = await User.create({
      name,
      username,
      email,
      password,
      role,
      subscription: 'Free',
      status: 'Active',
    });

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    logger.info(`User registered successfully: ${user.email} with role ${user.role}`);

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if blocked or suspended
    if (user.status === 'Blocked' || user.status === 'Suspended') {
      return res.status(403).json({ success: false, error: `Your account is ${user.status.toLowerCase()}` });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    logger.info(`User logged in successfully: ${user.email}`);

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_jwt_refresh_secret_key');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Token user not found' });
    }

    if (user.status === 'Blocked' || user.status === 'Suspended') {
      return res.status(403).json({ success: false, error: 'Account has been blocked' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
    });
  } catch (error) {
    logger.warn(`Failed token refresh attempt: ${error.message}`);
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};
