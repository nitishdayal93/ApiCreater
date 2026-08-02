import express from 'express';
import {
  getDashboardStats,
  getUsers,
  toggleUserStatus,
  updateUserRole,
  getReports,
  resolveReport,
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getSystemLogs,
  getAdminProjects,
  deleteAdminProject
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', protect, authorize('Super Admin', 'Admin'), getDashboardStats);
router.get('/users', protect, authorize('Super Admin', 'Admin'), getUsers);
router.patch('/users/:id/status', protect, authorize('Super Admin'), toggleUserStatus);
router.patch('/users/:id/role', protect, authorize('Super Admin'), updateUserRole);

router.get('/projects', protect, authorize('Super Admin', 'Admin'), getAdminProjects);
router.delete('/projects/:id', protect, authorize('Super Admin'), deleteAdminProject);

router.get('/reports', protect, authorize('Super Admin', 'Admin'), getReports);
router.patch('/reports/:id/resolve', protect, authorize('Super Admin', 'Admin'), resolveReport);

router.get('/settings', protect, authorize('Super Admin', 'Admin'), getSystemSettings);
router.put('/settings', protect, authorize('Super Admin'), updateSystemSettings);

router.get('/audit-logs', protect, authorize('Super Admin', 'Admin'), getAuditLogs);
router.get('/system-logs', protect, authorize('Super Admin'), getSystemLogs);

export default router;
