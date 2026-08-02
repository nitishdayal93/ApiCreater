import express from 'express';
import {
  saveMemoryItem,
  getMemoryItem,
  searchSemanticMemory,
  getGenerationContext,
  getUserPreferences,
  updateUserPreferences,
  getKnowledgeGraph,
  deleteMemoryItem
} from '../controllers/knowledgeController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/memory')
  .post(protect, saveMemoryItem)
  .get(protect, getMemoryItem)
  .delete(protect, deleteMemoryItem);

router.post('/search', protect, searchSemanticMemory);
router.get('/context', protect, getGenerationContext);

router.route('/preferences')
  .get(protect, getUserPreferences)
  .post(protect, updateUserPreferences);

router.get('/graph', protect, getKnowledgeGraph);

export default router;
