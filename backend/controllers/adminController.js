import fs from 'fs';
import User from '../models/User.js';
import Project from '../models/Project.js';
import AuditLog from '../models/AuditLog.js';
import Report from '../models/Report.js';
import Settings from '../models/Settings.js';
import logger from '../utils/logger.js';

// Helper to log admin actions
const logAdminAction = async (adminId, action, targetType, targetId, details, ip) => {
  try {
    await AuditLog.create({
      admin: adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress: ip || 'unknown',
    });
  } catch (error) {
    logger.error(`Failed to write AuditLog: ${error.message}`);
  }
};

// @desc    Get Admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin / Super Admin)
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'Active' });
    const totalProjects = await Project.countDocuments();
    const totalReports = await Report.countDocuments({ status: 'Open' });
    
    // Calculate total downloads
    const downloadStats = await Project.aggregate([
      { $group: { _id: null, totalDownloads: { $sum: '$downloads' }, avgTime: { $avg: '$generationTime' } } }
    ]);

    const totalDownloads = downloadStats[0]?.totalDownloads || 0;
    const avgGenerationTime = Math.round(downloadStats[0]?.avgTime || 0);

    // Get database storage counts by project files
    const fileStats = await Project.aggregate([
      { $unwind: '$files' },
      { $group: { _id: null, totalFiles: { $sum: 1 } } }
    ]);
    const totalGeneratedFiles = fileStats[0]?.totalFiles || 0;

    res.status(200).json({
      success: true,
      data: {
        users: totalUsers,
        activeUsers,
        projects: totalProjects,
        reports: totalReports,
        downloads: totalDownloads,
        avgGenerationTime,
        generatedFiles: totalGeneratedFiles,
        serverHealth: 'Healthy'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users list (paginated)
// @route   GET /api/admin/users
// @access  Private (Admin / Super Admin)
export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
        total,
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active/blocked status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Super Admin Only)
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Block logic (cannot block yourself)
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot change your own status' });
    }

    user.status = user.status === 'Blocked' ? 'Active' : 'Blocked';
    await user.save();

    await logAdminAction(
      req.user.id,
      user.status === 'Blocked' ? 'Block User' : 'Unblock User',
      'User',
      user._id,
      `User ${user.email} status toggled to ${user.status}`,
      req.ip
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Super Admin Only)
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['Admin', 'Moderator', 'User'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid role name' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAdminAction(
      req.user.id,
      'Change User Role',
      'User',
      user._id,
      `Changed role from ${oldRole} to ${role} for ${user.email}`,
      req.ip
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedback/bug reports
// @route   GET /api/admin/reports
// @access  Private (Admin / Super Admin)
export const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve feedback/bug report
// @route   PATCH /api/admin/reports/:id/resolve
// @access  Private (Admin / Super Admin)
export const resolveReport = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status || !['Resolved', 'Closed', 'In Progress'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid status' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    report.status = status;
    report.resolutionNotes = notes || report.resolutionNotes;
    await report.save();

    await logAdminAction(
      req.user.id,
      'Resolve Report',
      'Report',
      report._id,
      `Report resolved with status: ${status}`,
      req.ip
    );

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global application settings
// @route   GET /api/admin/settings
// @access  Private (Admin / Super Admin)
export const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update global settings
// @route   PUT /api/admin/settings
// @access  Private (Super Admin Only)
export const updateSystemSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    // Update settings fields
    const allowedKeys = ['appName', 'maintenanceMode', 'disableRegistration', 'aiModel', 'rateLimitRequests'];
    allowedKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    await settings.save();

    await logAdminAction(
      req.user.id,
      'Update Settings',
      'Settings',
      settings._id,
      `Global application settings updated`,
      req.ip
    );

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin / Super Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('admin', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream server logs (reads combined.log)
// @route   GET /api/admin/system-logs
// @access  Private (Super Admin Only)
export const getSystemLogs = async (req, res, next) => {
  try {
    const logPath = 'logs/combined.log';
    if (!fs.existsSync(logPath)) {
      return res.status(200).json({ success: true, data: 'No log history available yet.' });
    }

    // Read last 200 lines
    const logContent = fs.readFileSync(logPath, 'utf8');
    const lines = logContent.split('\n');
    const lastLines = lines.slice(-200).join('\n');

    res.status(200).json({ success: true, data: lastLines });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all generated projects list
// @route   GET /api/admin/projects
// @access  Private (Admin / Super Admin)
export const getAdminProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .select('-files')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: projects.length,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
        total,
      },
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete generated project
// @route   DELETE /api/admin/projects/:id
// @access  Private (Super Admin Only)
export const deleteAdminProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await project.deleteOne();

    await logAdminAction(
      req.user.id,
      'Delete Project',
      'Project',
      project._id,
      `Deleted project codebase: ${project.name}`,
      req.ip
    );

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};
