import logger from './logger.js';
import Groq from 'groq-sdk';

// Fallback project generator when Groq API Key is missing or service fails
const generateFallbackProject = (promptText) => {
  logger.info('Using fallback template generator for: ' + promptText);
  const normalized = promptText.toLowerCase();

  let name = 'hospital-api';
  let description = 'Hospital Management REST API generated via OpenAPI AI';
  let entities = ['patient', 'doctor', 'appointment'];

  if (normalized.includes('e-commerce') || normalized.includes('ecommerce') || normalized.includes('shop') || normalized.includes('store')) {
    name = 'ecommerce-api';
    description = 'E-Commerce Management REST API generated via OpenAPI AI';
    entities = ['product', 'user', 'order'];
  } else if (normalized.includes('blog') || normalized.includes('post') || normalized.includes('article')) {
    name = 'blog-api';
    description = 'Content Management Blog REST API generated via OpenAPI AI';
    entities = ['post', 'comment', 'category'];
  } else if (normalized.includes('task') || normalized.includes('todo') || normalized.includes('project')) {
    name = 'task-manager-api';
    description = 'Task and Project Management REST API generated via OpenAPI AI';
    entities = ['task', 'project', 'user'];
  } else {
    // Dynamically extract entities for custom prompt to make the fallback generator dynamic
    const extracted = promptText.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .split(' ');
      
    const stopWords = new Set([
      'i', 'want', 'to', 'make', 'a', 'an', 'the', 'api', 'connect', 'with', 'that', 'and', 'for', 
      'in', 'on', 'at', 'by', 'of', 'from', 'create', 'build', 'generate', 'setup', 'database', 
      'db', 'rest', 'backend', 'server', 'application', 'project', 'app', 'system', 'management', 
      'please', 'can', 'you', 'hello', 'hi', 'assistant', 'openapi', 'rest-api', 'crud'
    ]);

    const customEntities = [];
    extracted.forEach(word => {
      const cleanWord = word.trim();
      let singular = cleanWord;
      if (cleanWord.endsWith('s') && cleanWord.length > 3 && !cleanWord.endsWith('ss')) {
        singular = cleanWord.slice(0, -1);
      }
      if (singular && !stopWords.has(singular) && singular.length > 2) {
        if (!customEntities.includes(singular)) {
          customEntities.push(singular);
        }
      }
    });

    if (customEntities.length > 0) {
      entities = customEntities.slice(0, 3);
      if (entities.length === 1 && !entities.includes('user')) {
        entities.push('user');
      }
      name = entities.slice(0, 2).join('-') + '-api';
      description = `${entities.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(' and ')} REST API generated via OpenAPI AI`;
    }
  }

  // Build files array
  const files = [];

  // package.json
  files.push({
    path: 'package.json',
    content: `{
  "name": "${name}",
  "version": "1.0.0",
  "description": "${description}",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongoose": "^8.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}`
  });

  // .env.example
  files.push({
    path: '.env.example',
    content: `PORT=5000\nMONGO_URI=mongodb://localhost:27017/${name}`
  });

  // index.js
  files.push({
    path: 'index.js',
    content: `import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
${entities.map(e => `import ${e}Routes from './routes/${e}Routes.js';`).join('\n')}

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Main Health Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Register Entity Routes
${entities.map(e => `app.use('/api/${e}s', ${e}Routes);`).join('\n')}

// Connect Database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/${name}')
  .then(() => {
    console.log('Database Connected Successfully!');
    app.listen(PORT, () => console.log(\`Server is running on port \${PORT}\`));
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });
`
  });

  // README.md
  files.push({
    path: 'README.md',
    content: `# ${name.toUpperCase()} - REST API

${description}

Generated dynamically by OpenAPI AI.

## Setup Instructions

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   Rename \`.env.example\` to \`.env\` and configure the variables.

3. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Endpoints

- **Health Check**: \`GET /api/health\`
${entities.map(e => `- **${e.toUpperCase()} Route**: \`/api/${e}s\``).join('\n')}
`
  });

  // Schemas, controllers, and routes
  entities.forEach(e => {
    const caps = e.charAt(0).toUpperCase() + e.slice(1);
    
    // Model
    files.push({
      path: `models/${caps}.js`,
      content: `import mongoose from 'mongoose';

const ${caps}Schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

export default mongoose.model('${caps}', ${caps}Schema);
`
    });

    // Controller
    files.push({
      path: `controllers/${e}Controller.js`,
      content: `import ${caps} from '../models/${caps}.js';

export const getAll = async (req, res) => {
  try {
    const items = await ${caps}.find();
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const item = await ${caps}.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Resource not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const newItem = await ${caps}.create(req.body);
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const updatedItem = await ${caps}.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedItem) return res.status(404).json({ success: false, error: 'Resource not found' });
    res.json({ success: true, data: updatedItem });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const item = await ${caps}.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Resource not found' });
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
`
    });

    // Route
    files.push({
      path: `routes/${e}Routes.js`,
      content: `import express from 'express';
import { getAll, getById, create, update, remove } from '../controllers/${e}Controller.js';

const router = express.Router();

router.route('/')
  .get(getAll)
  .post(create);

router.route('/:id')
  .get(getById)
  .put(update)
  .delete(remove);

export default router;
`
    });
  });

  return {
    name,
    description,
    framework: 'Node.js + Express',
    database: 'MongoDB',
    files
  };
};

export const generateAPIProject = async (promptText) => {
  const groqApiKey = process.env.GROQ_API_KEY;

  const systemPrompt = `You are a professional backend software architect.
Generate a complete, fully functional, production-ready Node.js + Express backend REST API using ES6 modules based on the user request.
The project MUST include proper Mongoose database configuration, Mongoose models, Express controllers with full CRUD logic, Express route definitions, and complete configuration files.
Include an index.js (app entry point), a standard package.json file, a .env.example file, and a clean README.md with setup instructions and endpoint docs.

You must respond ONLY with a raw, valid JSON object fitting this schema:
{
  "name": "project-slug-name",
  "description": "Detailed project description",
  "framework": "Node.js + Express",
  "database": "MongoDB",
  "files": [
    {
      "path": "relative/file/path.js",
      "content": "Full source code file contents..."
    }
  ]
}

CRITICAL RULES:
1. Every file listed must be complete. Do not write placeholders or partial files.
2. Return ONLY raw JSON. Do not include markdown code block syntax (like \`\`\`json) or any additional formatting. Start directly with { and end with }.
3. Ensure the JSON is properly escaped. Use double quotes for all strings and key names.`;

  // Use Groq SDK if available
  if (groqApiKey && groqApiKey !== 'your_groq_api_key_here') {
    try {
      logger.info('Querying Groq API with user prompt: ' + promptText);
      const groq = new Groq({ apiKey: groqApiKey });
      
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User request: "${promptText}"` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const generatedText = response.choices[0]?.message?.content;
      if (!generatedText) {
        throw new Error('Groq API returned empty completion content.');
      }

      const parsedData = JSON.parse(generatedText.trim());
      if (!parsedData.files || !Array.isArray(parsedData.files)) {
        throw new Error('Invalid project structure returned by Groq: files array missing.');
      }

      return {
        name: parsedData.name || 'openapi-project',
        description: parsedData.description || 'Generated backend project',
        framework: parsedData.framework || 'Node.js + Express',
        database: parsedData.database || 'MongoDB',
        files: parsedData.files,
      };
    } catch (error) {
      logger.error(`Groq generation failed: ${error.message}. Running fallback generator.`);
    }
  }

  // Fallback template generator if no key is set or Groq fails
  logger.warn('No active GROQ_API_KEY found or API call failed. Running template generator.');
  return generateFallbackProject(promptText);
};
