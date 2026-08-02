import Project from '../models/Project.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Job from '../models/Job.js';
import QueueService from '../infrastructure/queue/QueueService.js';
import logger from '../utils/logger.js';

// @desc    Get user generated projects
// @route   GET /api/generator/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    let projects = [];
    if (req.user && req.user.id) {
      projects = await Project.find({ owner: req.user.id })
        .select('-files') // Exclude heavy files list for list overview
        .sort({ createdAt: -1 });
    }

    if (!projects || projects.length === 0) {
      projects = await Project.find()
        .select('-files')
        .sort({ createdAt: -1 })
        .limit(30);
    }

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project details with files
// @route   GET /api/generator/projects/:id
// @access  Private
export const getProjectDetails = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete generated project
// @route   DELETE /api/generator/projects/:id
// @access  Private
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete user generated projects
// @route   POST /api/generator/projects/bulk-delete
// @access  Private
export const bulkDeleteProjects = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No project IDs provided' });
    }

    const result = await Project.deleteMany({ _id: { $in: ids }, owner: req.user.id });
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} projects deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process prompt, queue job and stream/return generation details
// @route   POST /api/generator/chat
// @access  Private
export const processChatPrompt = async (req, res, next) => {
  try {
    const { prompt, chatId, stream = false } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Please enter a generation prompt' });
    }

    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, user: req.user.id });
    }

    if (!chat) {
      chat = await Chat.create({
        user: req.user.id,
        title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
      });
    }

    // Save user message in database
    await Message.create({
      chat: chat._id,
      sender: 'user',
      content: prompt,
    });

    // Enqueue the generation task in MongoDB-backed queue
    const job = await QueueService.enqueue(req.user.id, prompt, chat._id);

    const isStreaming = stream || req.headers.accept === 'text/event-stream';

    if (isStreaming) {
      // Establish Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let sentStepsCount = 0;
      let isDisconnected = false;

      req.on('close', () => {
        isDisconnected = true;
        logger.info(`Client disconnected from SSE stream for job ${job._id}`);
      });

      // Poll database for job progress and update the SSE stream
      const pollInterval = setInterval(async () => {
        if (isDisconnected) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const currentJob = await Job.findById(job._id);
          if (!currentJob) {
            clearInterval(pollInterval);
            res.end();
            return;
          }

          // Send any new progress steps
          if (currentJob.progress.length > sentStepsCount) {
            for (let i = sentStepsCount; i < currentJob.progress.length; i++) {
              res.write(`data: ${JSON.stringify({ type: 'thinking', data: currentJob.progress[i] })}\n\n`);
            }
            sentStepsCount = currentJob.progress.length;
          }

          // Handle completed state
          if (currentJob.status === 'completed') {
            clearInterval(pollInterval);
            
            const project = await Project.findById(currentJob.project);
            const aiMsg = await Message.findOne({ chat: chat._id, sender: 'ai', project: currentJob.project });

            res.write(`data: ${JSON.stringify({
              type: 'done',
              chatId: chat._id,
              message: aiMsg,
              project: project ? {
                id: project._id,
                name: project.name,
                description: project.description,
                framework: project.framework,
                database: project.database,
                files: project.files,
                generationTime: project.generationTime,
              } : null
            })}\n\n`);
            res.end();
          }

          // Handle failed state
          if (currentJob.status === 'failed') {
            clearInterval(pollInterval);
            let displayErr = currentJob.error;
            try {
              const parsed = JSON.parse(currentJob.error);
              if (parsed && parsed.reason === 'Groq rate limit exceeded') {
                displayErr = `Groq rate limit exceeded while generating module "${parsed.failedModule}".`;
              }
            } catch (e) {
              // Ignore
            }
            res.write(`data: ${JSON.stringify({ type: 'thinking', data: `Error: ${displayErr}` })}\n\n`);
            res.end();
          }

        } catch (pollErr) {
          logger.error(`Error polling job status: ${pollErr.message}`);
          clearInterval(pollInterval);
          res.end();
        }
      }, 1000);

    } else {
      // Non-streaming wait loop
      const pollInterval = setInterval(async () => {
        try {
          const currentJob = await Job.findById(job._id);
          if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
            clearInterval(pollInterval);
            
            if (currentJob && currentJob.status === 'completed') {
              const project = await Project.findById(currentJob.project);
              const aiMsg = await Message.findOne({ chat: chat._id, sender: 'ai', project: currentJob.project });
              
              return res.status(200).json({
                success: true,
                chatId: chat._id,
                message: aiMsg,
                project: {
                  id: project._id,
                  name: project.name,
                  description: project.description,
                  framework: project.framework,
                  database: project.database,
                  files: project.files,
                  generationTime: project.generationTime,
                },
              });
            } else {
              if (currentJob && currentJob.error) {
                try {
                  const parsedErr = JSON.parse(currentJob.error);
                  return res.status(500).json(parsedErr);
                } catch (e) {
                  return res.status(500).json({
                    success: false,
                    error: currentJob.error,
                  });
                }
              }
              return res.status(500).json({
                success: false,
                error: 'Job not found',
              });
            }
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          next(pollErr);
        }
      }, 1000);
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Download project files as ZIP
// @route   GET /api/generator/download/:id
// @access  Public
export const downloadProjectZip = async (req, res, next) => {
  try {
    let project = null;
    const { id } = req.params;

    // Check if ID is a valid 24-hex ObjectId
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id);
    }

    // Fallback: find latest generated project from MongoDB
    if (!project) {
      project = await Project.findOne().sort({ createdAt: -1 });
    }

    // Ultimate fallback: generate dynamic backend ZIP payload
    if (!project) {
      const { generateDynamicFallback } = await import('../ai/fallbackEngine.js');
      const fallback = generateDynamicFallback('openapi-backend-api');
      project = {
        name: fallback.name || 'openapi-backend-api',
        files: fallback.files || [],
        downloads: 0,
        save: async () => {}
      };
    } else {
      project.downloads = (project.downloads || 0) + 1;
      await project.save().catch(() => {});
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${project.name || 'openapi-backend-api'}.zip`);

    const { createProjectZipStream } = await import('../ai/zipGenerator.js');
    createProjectZipStream(project.files || [], res);

  } catch (error) {
    logger.error('Error generating project ZIP: ' + error.message);
    next(error);
  }
};

// @desc    Get user chats list
// @route   GET /api/generator/chats
// @access  Private
export const getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ user: req.user.id }).sort({ pinned: -1, updatedAt: -1 });
    res.status(200).json({ success: true, data: chats });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a specific chat
// @route   GET /api/generator/chats/:id/messages
// @access  Private
export const getChatMessages = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const messages = await Message.find({ chat: req.params.id }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Update chat (rename or toggle pin)
// @route   PUT /api/generator/chats/:id
// @access  Private
export const updateChat = async (req, res, next) => {
  try {
    const { title, pinned } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    if (title !== undefined) chat.title = title;
    if (pinned !== undefined) chat.pinned = pinned;

    await chat.save();
    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete chat and messages
// @route   DELETE /api/generator/chats/:id
// @access  Private
export const deleteChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    await Message.deleteMany({ chat: req.params.id });

    res.status(200).json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get status/details of a specific generation job
// @route   GET /api/generator/jobs/:id
// @access  Private
export const getJobStatus = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

// @desc    Direct REST API generation endpoint for initial stage frontend
// @route   POST /api/generator/generate
// @access  Public
export const generateApiDirect = async (req, res, next) => {
  try {
    const { prompt, database } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    let files = [];
    let projectName = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'api-repository';
    if (!projectName.endsWith('-api')) projectName += '-api';
    let projectDescription = `${prompt} generated via OpenAPI AI Engine`;

    // 1. Try Live Groq Llama 3 AI Generation Pipeline for 100% dynamic, tailored code
    try {
      logger.info(`Initiating live Groq Llama 3 AI generation pipeline for prompt: "${prompt}"`);
      const { planProjectArchitecture } = await import('../ai/plannerService.js');
      const { generateProjectFiles } = await import('../ai/generatorService.js');
      const { reviewAndSelfHealProject } = await import('../ai/reviewService.js');

      const plan = await planProjectArchitecture(prompt);
      if (plan) {
        if (plan.projectName) projectName = plan.projectName;
        if (plan.description) projectDescription = plan.description;

        const rawFiles = await generateProjectFiles(plan);
        if (rawFiles && rawFiles.length > 0) {
          files = await reviewAndSelfHealProject(rawFiles);
          logger.info(`Live Groq Llama 3 AI generated ${files.length} custom files for "${projectName}"`);
        }
      }
    } catch (aiErr) {
      logger.warn(`Live Groq Llama 3 AI pipeline notice (${aiErr.message}). Switching to fallback catalog engine...`);
    }

    // 2. Fallback to Catalog Engine ONLY if LLM API is unavailable or quota exceeded
    if (!files || files.length === 0) {
      const { generateDynamicFallback } = await import('../ai/fallbackEngine.js');
      const fallback = generateDynamicFallback(prompt);
      files = fallback.files || [];
      if (fallback.name) projectName = fallback.name;
      if (fallback.description) projectDescription = fallback.description;
    }

    // 3. Auto-save project into MongoDB database so it persists permanently
    let ownerId = req.user ? req.user._id : null;
    if (!ownerId) {
      const defaultUser = await User.findOne();
      if (defaultUser) ownerId = defaultUser._id;
    }

    let savedProject = null;
    if (ownerId) {
      try {
        savedProject = await Project.create({
          owner: ownerId,
          name: projectName,
          description: projectDescription,
          framework: 'Node.js + Express',
          database: database || 'MongoDB',
          prompt: prompt,
          files: files
        });
      } catch (dbErr) {
        logger.error('Failed to auto-save generated project to MongoDB: ' + dbErr.message);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: savedProject ? savedProject._id : Date.now().toString(),
        name: projectName,
        description: projectDescription,
        database: database || 'MongoDB',
        files: files
      }
    });
  } catch (error) {
    logger.error('Error in generateApiDirect: ' + error.message);
    next(error);
  }
};
