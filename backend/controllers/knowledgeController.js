import MemoryItem from '../models/MemoryItem.js';

/**
 * 1. Save or Update Memory Item
 * @route POST /api/knowledge/memory
 */
export const saveMemoryItem = async (req, res, next) => {
  try {
    const { category, key, content, tags = [] } = req.body;
    if (!category || !key || !content) {
      return res.status(400).json({ success: false, error: 'category, key, and content are required.' });
    }

    const item = await MemoryItem.create({ category, key, content, tags, user: req.user.id });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get User Memory Items
 * @route GET /api/knowledge/memory
 */
export const getMemoryItem = async (req, res, next) => {
  try {
    const items = await MemoryItem.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Delete Memory Item
 * @route DELETE /api/knowledge/memory
 */
export const deleteMemoryItem = async (req, res, next) => {
  try {
    const { id } = req.body || req.query;
    if (id) {
      await MemoryItem.findOneAndDelete({ _id: id, user: req.user.id });
    } else {
      await MemoryItem.deleteMany({ user: req.user.id });
    }
    res.status(200).json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Search Semantic Memory
 * @route POST /api/knowledge/search
 */
export const searchSemanticMemory = async (req, res, next) => {
  try {
    const { query } = req.body;
    const items = await MemoryItem.find({
      user: req.user.id,
      $or: [
        { key: { $regex: query || '', $options: 'i' } },
        { content: { $regex: query || '', $options: 'i' } }
      ]
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get Generation Context
 * @route GET /api/knowledge/context
 */
export const getGenerationContext = async (req, res, next) => {
  try {
    const memories = await MemoryItem.find({ user: req.user.id }).limit(10);
    res.status(200).json({
      success: true,
      context: {
        totalMemories: memories.length,
        memories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get User Preferences
 * @route GET /api/knowledge/preferences
 */
export const getUserPreferences = async (req, res, next) => {
  try {
    const pref = await MemoryItem.findOne({ user: req.user.id, category: 'preferences' });
    res.status(200).json({
      success: true,
      preferences: pref ? pref.content : { defaultDatabase: 'MongoDB', defaultFramework: 'Express' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Update User Preferences
 * @route POST /api/knowledge/preferences
 */
export const updateUserPreferences = async (req, res, next) => {
  try {
    const { defaultDatabase, defaultFramework } = req.body;
    const pref = await MemoryItem.findOneAndUpdate(
      { user: req.user.id, category: 'preferences' },
      { key: 'user_pref', content: { defaultDatabase, defaultFramework }, tags: ['preferences'] },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: pref });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get Knowledge Graph
 * @route GET /api/knowledge/graph
 */
export const getKnowledgeGraph = async (req, res, next) => {
  try {
    const items = await MemoryItem.find({ user: req.user.id });
    const nodes = items.map(i => ({ id: i._id, label: i.key, category: i.category }));
    res.status(200).json({ success: true, data: { nodes, edges: [] } });
  } catch (error) {
    next(error);
  }
};
