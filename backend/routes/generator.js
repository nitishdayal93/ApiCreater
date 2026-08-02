import express from 'express';
import { 
  getProjects, 
  getProjectDetails, 
  deleteProject,
  bulkDeleteProjects,
  processChatPrompt, 
  downloadProjectZip,
  getChats,
  getChatMessages,
  updateChat,
  deleteChat,
  getJobStatus,
  generateApiDirect
} from '../controllers/generatorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', generateApiDirect);
router.get('/projects', protect, getProjects);
router.get('/projects/:id', protect, getProjectDetails);
router.delete('/projects/:id', protect, deleteProject);
router.post('/projects/bulk-delete', protect, bulkDeleteProjects);
router.post('/chat', protect, processChatPrompt);
router.get('/download/:id', downloadProjectZip);
router.get('/jobs/:id', protect, getJobStatus);

// Chat history endpoints
router.get('/chats', protect, getChats);
router.get('/chats/:id/messages', protect, getChatMessages);
router.put('/chats/:id', protect, updateChat);
router.delete('/chats/:id', protect, deleteChat);

export default router;
