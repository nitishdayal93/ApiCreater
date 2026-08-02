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
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', generateApiDirect);
router.get('/projects', optionalProtect, getProjects);
router.get('/projects/:id', optionalProtect, getProjectDetails);
router.delete('/projects/:id', protect, deleteProject);
router.post('/projects/bulk-delete', protect, bulkDeleteProjects);
router.post('/chat', optionalProtect, processChatPrompt);
router.get('/download/:id', downloadProjectZip);
router.get('/jobs/:id', optionalProtect, getJobStatus);

// Chat history endpoints
router.get('/chats', optionalProtect, getChats);
router.get('/chats/:id/messages', optionalProtect, getChatMessages);
router.put('/chats/:id', optionalProtect, updateChat);
router.delete('/chats/:id', protect, deleteChat);

export default router;
