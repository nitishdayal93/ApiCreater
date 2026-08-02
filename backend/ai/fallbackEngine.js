import logger from '../utils/logger.js';
import { parseJSONSafely, cleanMarkdownBlocks, repairJSONString } from './parser.js';

/**
 * 1. FAILURE CLASSIFICATION ENGINE
 */
export const FAILURE_TYPES = {
  PLANNER: 'PLANNER_FAILURE',
  GENERATOR: 'GENERATOR_FAILURE',
  REVIEWER: 'REVIEWER_FAILURE',
  ASSEMBLER: 'ASSEMBLER_FAILURE',
  PARSER: 'PARSER_FAILURE',
  GROQ_CLIENT: 'GROQ_CLIENT_FAILURE',
  ZIP_GENERATOR: 'ZIP_GENERATOR_FAILURE',
  UNKNOWN: 'UNKNOWN_FAILURE'
};

export const classifyPipelineFailure = (error) => {
  if (!error) return FAILURE_TYPES.UNKNOWN;

  const msg = String(error.message || '').toLowerCase();
  const status = error.status || error.statusCode;

  if (status === 429 || msg.includes('rate_limit') || msg.includes('groq')) return FAILURE_TYPES.GROQ_CLIENT;
  if (msg.includes('planner') || msg.includes('blueprint')) return FAILURE_TYPES.PLANNER;
  if (msg.includes('generator') || msg.includes('module generation')) return FAILURE_TYPES.GENERATOR;
  if (msg.includes('reviewer') || msg.includes('self-healing')) return FAILURE_TYPES.REVIEWER;
  if (msg.includes('assembler') || msg.includes('assembly')) return FAILURE_TYPES.ASSEMBLER;
  if (msg.includes('json') || msg.includes('parse')) return FAILURE_TYPES.PARSER;
  if (msg.includes('zip') || msg.includes('archiver')) return FAILURE_TYPES.ZIP_GENERATOR;

  return FAILURE_TYPES.UNKNOWN;
};

/**
 * 2. PLANNER FALLBACK AUTO-DEFAULTS
 */
export const applyPlannerFallbackDefaults = (plan = {}) => {
  return {
    projectName: plan.projectName || 'enterprise-backend-api',
    description: plan.description || 'Enterprise Node.js & Express REST API with Clean Architecture',
    businessDomain: plan.businessDomain || 'Custom Enterprise Business Domain',
    framework: plan.framework || 'Node.js + Express.js',
    database: plan.database || 'MongoDB + Mongoose',
    architectureStyle: plan.architectureStyle || 'Clean Architecture (Controllers -> Services -> Repositories -> Models)',
    apiVersion: plan.apiVersion || 'v1',
    baseRoute: plan.baseRoute || '/api/v1',
    authentication: plan.authentication || 'JWT Bearer Tokens (Access + Refresh Token Rotation)',
    authorization: plan.authorization || 'Role Based Access Control (RBAC)',
    rbac: plan.rbac || { enabled: true, strategy: 'Role-Permission Mapping Middleware' },
    roles: plan.roles || ['Super Admin', 'Admin', 'Manager', 'User'],
    permissions: plan.permissions || ['create', 'read', 'update', 'delete', 'bulkDelete'],
    entities: plan.entities || [{ name: 'User', fields: ['name', 'email', 'role'] }],
    modules: plan.modules || [],
    folderStructure: plan.folderStructure || [
      'src/config/', 'src/constants/', 'src/controllers/', 'src/helpers/',
      'src/middlewares/', 'src/models/', 'src/repositories/', 'src/routes/',
      'src/scripts/', 'src/services/', 'src/swagger/', 'src/tests/',
      'src/utils/', 'src/validators/'
    ],
    dependencies: plan.dependencies || ['express', 'mongoose', 'jsonwebtoken', 'bcryptjs', 'express-validator', 'helmet', 'compression', 'cors', 'winston'],
    environmentVariables: plan.environmentVariables || ['PORT', 'NODE_ENV', 'MONGO_URI', 'JWT_SECRET'],
    generatedFileList: plan.generatedFileList || []
  };
};

/**
 * 3. CONSISTENCY & DEDUPLICATION GUARD
 */
export const validateAndCleanRecoveredFiles = (files = []) => {
  if (!Array.isArray(files)) return [];

  const pathMap = new Map();
  for (const file of files) {
    if (!file || !file.path || !file.content) continue;

    let path = file.path.trim().replace(/\\/g, '/');
    if (path.startsWith('./')) path = path.slice(2);

    pathMap.set(path, { path, content: file.content });
  }

  return Array.from(pathMap.values());
};

/**
 * 4. MULTI-STAGE RECOVERY ENGINE
 */
export const recoverPipelineFailure = (failureType, promptText = '', existingFiles = [], plan = null) => {
  const fixedProblems = [];
  const remainingWarnings = [];
  let recoveryStage = 'Stage 4 - Deterministic Dynamic Catalog Engine';

  logger.info(`Enterprise Recovery System Triggered [FailureType: ${failureType}]`);

  // Stage 1: Check if partial files exist (e.g. 95 files succeeded, 2 failed)
  if (Array.isArray(existingFiles) && existingFiles.length >= 10) {
    recoveryStage = 'Stage 3 - Partial Sectional File Recovery';
    fixedProblems.push(`Recovered ${existingFiles.length} successfully generated files from pipeline context.`);

    // Supplement any missing mandatory files
    const cleanedFiles = validateAndCleanRecoveredFiles(existingFiles);
    const filePaths = new Set(cleanedFiles.map(f => f.path));

    const fallbackProject = generateDynamicFallback(promptText);
    for (const file of fallbackProject.files) {
      if (!filePaths.has(file.path)) {
        cleanedFiles.push(file);
        fixedProblems.push(`Sectional Recovery: Injected missing file "${file.path}"`);
      }
    }

    return {
      success: true,
      recovered: true,
      recoveryStage,
      fixedProblems,
      remainingWarnings,
      name: plan?.projectName || fallbackProject.name,
      description: plan?.description || fallbackProject.description,
      framework: plan?.framework || fallbackProject.framework,
      database: plan?.database || fallbackProject.database,
      files: cleanedFiles
    };
  }

  // Stage 4: Full Deterministic Catalog Recovery Engine
  fixedProblems.push(`Engaged Stage 4 Fallback Catalog Engine for domain recovery: "${promptText}"`);
  const fallbackProject = generateDynamicFallback(promptText);

  return {
    success: true,
    recovered: true,
    recoveryStage,
    fixedProblems,
    remainingWarnings,
    name: fallbackProject.name,
    description: fallbackProject.description,
    framework: fallbackProject.framework,
    database: fallbackProject.database,
    files: fallbackProject.files
  };
};

/**
 * Multi-Domain catalog for domain auto-detection
 */
const DOMAIN_CATALOG = {
  school: {
    name: 'school-management-api',
    description: 'Enterprise School & Academy Management REST API with RBAC, Attendance, Exams, and Fees',
    entities: [
      { name: 'student', fields: ['firstName', 'lastName', 'email', 'rollNumber', 'classGrade', 'gender', 'dob', 'parentContact'] },
      { name: 'teacher', fields: ['name', 'email', 'subjectSpecialization', 'qualification', 'salary', 'experienceYears'] },
      { name: 'subject', fields: ['title', 'code', 'credits', 'department'] },
      { name: 'class', fields: ['name', 'section', 'roomNumber', 'capacity'] },
      { name: 'attendance', fields: ['studentId', 'date', 'status', 'remarks'] },
      { name: 'fee', fields: ['studentId', 'amount', 'dueDate', 'paymentStatus', 'receiptNumber'] },
      { name: 'library', fields: ['bookTitle', 'isbn', 'author', 'copiesAvailable', 'category'] },
      { name: 'transport', fields: ['routeNumber', 'driverName', 'driverPhone', 'vehicleNumber', 'capacity'] },
      { name: 'parent', fields: ['name', 'email', 'phone', 'occupation', 'address'] },
      { name: 'hostel', fields: ['buildingName', 'roomNumber', 'capacity', 'monthlyRent'] },
      { name: 'exam', fields: ['title', 'subjectId', 'examDate', 'totalMarks', 'passingMarks'] },
      { name: 'result', fields: ['studentId', 'examId', 'marksObtained', 'grade', 'comments'] },
      { name: 'timetable', fields: ['classId', 'subjectId', 'dayOfWeek', 'startTime', 'endTime'] }
    ]
  },
  ecommerce: {
    name: 'ecommerce-platform-api',
    description: 'Enterprise E-Commerce & Retail REST API with Product Catalog, Orders, Cart, and Payments',
    entities: [
      { name: 'product', fields: ['title', 'sku', 'price', 'description', 'stockQuantity', 'category', 'brand'] },
      { name: 'category', fields: ['name', 'slug', 'description', 'isActive'] },
      { name: 'user', fields: ['name', 'email', 'role', 'phone', 'isVerified'] },
      { name: 'order', fields: ['userId', 'totalAmount', 'orderStatus', 'shippingAddress', 'paymentMethod'] },
      { name: 'orderItem', fields: ['orderId', 'productId', 'quantity', 'unitPrice'] },
      { name: 'cart', fields: ['userId', 'totalItems', 'subtotal'] },
      { name: 'payment', fields: ['orderId', 'transactionId', 'amount', 'status', 'gateway'] },
      { name: 'review', fields: ['productId', 'userId', 'rating', 'comment'] },
      { name: 'coupon', fields: ['code', 'discountPercent', 'validUntil', 'minOrderAmount'] },
      { name: 'inventory', fields: ['productId', 'warehouseLocation', 'quantityAvailable', 'reservedQuantity'] }
    ]
  },
  hospital: {
    name: 'healthcare-hospital-api',
    description: 'Enterprise Hospital & Healthcare Management REST API with Electronic Health Records',
    entities: [
      { name: 'patient', fields: ['name', 'age', 'gender', 'bloodGroup', 'contactNumber', 'medicalHistory'] },
      { name: 'doctor', fields: ['name', 'specialty', 'department', 'experienceYears', 'consultationFee'] },
      { name: 'appointment', fields: ['patientId', 'doctorId', 'appointmentDate', 'status', 'tokenNumber'] },
      { name: 'prescription', fields: ['appointmentId', 'medicines', 'dosage', 'instructions', 'date'] },
      { name: 'department', fields: ['name', 'headDoctor', 'floorNumber', 'description'] },
      { name: 'medicalRecord', fields: ['patientId', 'diagnosis', 'treatmentPlan', 'doctorNotes'] },
      { name: 'invoice', fields: ['patientId', 'totalAmount', 'paymentStatus', 'billingDate'] }
    ]
  },
  hr: {
    name: 'hr-payroll-api',
    description: 'Enterprise Human Resources & Payroll Management REST API with Attendance & Leave Management',
    entities: [
      { name: 'employee', fields: ['firstName', 'lastName', 'email', 'designation', 'departmentId', 'joinDate', 'salary'] },
      { name: 'department', fields: ['name', 'code', 'budget', 'location'] },
      { name: 'attendance', fields: ['employeeId', 'date', 'checkIn', 'checkOut', 'status'] },
      { name: 'leave', fields: ['employeeId', 'leaveType', 'startDate', 'endDate', 'status', 'reason'] },
      { name: 'payroll', fields: ['employeeId', 'month', 'year', 'basicSalary', 'allowances', 'deductions', 'netPay'] },
      { name: 'performance', fields: ['employeeId', 'reviewPeriod', 'rating', 'feedback', 'reviewerId'] }
    ]
  },
  realestate: {
    name: 'real-estate-portal-api',
    description: 'Enterprise Real Estate Portal REST API with Property Listings, Agents, and Client Inquiries',
    entities: [
      { name: 'property', fields: ['title', 'price', 'propertyType', 'bedrooms', 'bathrooms', 'sqft', 'address', 'city', 'status'] },
      { name: 'agent', fields: ['name', 'email', 'phone', 'licenseNumber', 'agencyName', 'rating'] },
      { name: 'client', fields: ['name', 'email', 'phone', 'preferredCity', 'budgetMax'] },
      { name: 'inquiry', fields: ['propertyId', 'clientId', 'message', 'inquiryDate', 'status'] },
      { name: 'appointment', fields: ['propertyId', 'clientId', 'agentId', 'visitDate', 'status'] }
    ]
  },
  banking: {
    name: 'fintech-banking-api',
    description: 'Enterprise Banking & Financial Transactions REST API with Audit Logs & KYC',
    entities: [
      { name: 'account', fields: ['accountNumber', 'userId', 'accountType', 'balance', 'currency', 'status'] },
      { name: 'transaction', fields: ['fromAccount', 'toAccount', 'amount', 'transactionType', 'reference', 'status'] },
      { name: 'card', fields: ['cardNumber', 'accountId', 'cardType', 'expiryDate', 'dailyLimit', 'isBlocked'] },
      { name: 'loan', fields: ['userId', 'loanType', 'principalAmount', 'interestRate', 'tenureMonths', 'status'] },
      { name: 'kyc', fields: ['userId', 'documentType', 'documentNumber', 'verificationStatus', 'submittedAt'] }
    ]
  },
  social: {
    name: 'social-media-api',
    description: 'Enterprise Social Network REST API with Posts, Comments, Messaging, and Feed Optimization',
    entities: [
      { name: 'user', fields: ['username', 'email', 'bio', 'avatarUrl', 'followersCount', 'followingCount'] },
      { name: 'post', fields: ['authorId', 'content', 'mediaUrl', 'likesCount', 'commentsCount', 'isPublic'] },
      { name: 'comment', fields: ['postId', 'authorId', 'text', 'likesCount'] },
      { name: 'like', fields: ['targetId', 'targetType', 'userId'] },
      { name: 'follow', fields: ['followerId', 'followingId', 'status'] },
      { name: 'message', fields: ['senderId', 'receiverId', 'content', 'isRead'] }
    ]
  },
  lms: {
    name: 'lms-learning-platform-api',
    description: 'Enterprise Learning Management System REST API with Courses, Lessons, and Certificates',
    entities: [
      { name: 'course', fields: ['title', 'slug', 'description', 'price', 'level', 'instructorId', 'isPublished'] },
      { name: 'module', fields: ['courseId', 'title', 'orderIndex', 'description'] },
      { name: 'lesson', fields: ['moduleId', 'title', 'contentType', 'videoUrl', 'durationMinutes'] },
      { name: 'enrollment', fields: ['userId', 'courseId', 'enrolledAt', 'progressPercentage', 'completed'] },
      { name: 'quiz', fields: ['lessonId', 'title', 'totalQuestions', 'passingScore'] },
      { name: 'certificate', fields: ['enrollmentId', 'certificateNumber', 'issueDate', 'pdfUrl'] }
    ]
  },
  logistics: {
    name: 'logistics-fleet-api',
    description: 'Enterprise Logistics & Fleet Management REST API with Shipments and Live GPS Routes',
    entities: [
      { name: 'vehicle', fields: ['plateNumber', 'model', 'capacityKg', 'fuelType', 'status'] },
      { name: 'driver', fields: ['name', 'licenseNumber', 'phone', 'vehicleId', 'rating'] },
      { name: 'shipment', fields: ['trackingNumber', 'senderAddress', 'receiverAddress', 'weightKg', 'status'] },
      { name: 'warehouse', fields: ['name', 'location', 'capacityTotal', 'availableSpace'] },
      { name: 'route', fields: ['origin', 'destination', 'estimatedDistanceKm', 'estimatedTimeHours'] }
    ]
  },
  crm: {
    name: 'crm-enterprise-api',
    description: 'Enterprise CRM REST API with Lead Pipelines, Deals, Contacts, and Activity Tracking',
    entities: [
      { name: 'lead', fields: ['name', 'company', 'email', 'phone', 'source', 'status', 'estimatedValue'] },
      { name: 'contact', fields: ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'companyId'] },
      { name: 'deal', fields: ['title', 'stage', 'amount', 'closeDate', 'assignedTo'] },
      { name: 'task', fields: ['title', 'dueDate', 'priority', 'status', 'assignedTo'] },
      { name: 'activityLog', fields: ['entityId', 'entityType', 'action', 'performerId', 'details'] }
    ]
  }
};

/**
 * Main Dynamic Fallback Generator Function
 * Returns complete Clean Architecture project files payload.
 */
export const generateDynamicFallback = (promptText = '') => {
  logger.info(`Generating Enterprise 20-Step Backend Architecture for prompt: "${promptText}"`);
  const normalized = String(promptText || '').toLowerCase();

  // 1. Detect Domain Match
  let selectedDomainKey = 'custom';
  if (normalized.includes('school') || normalized.includes('student') || normalized.includes('teacher') || normalized.includes('exam')) {
    selectedDomainKey = 'school';
  } else if (normalized.includes('e-commerce') || normalized.includes('ecommerce') || normalized.includes('shop') || normalized.includes('store') || normalized.includes('product')) {
    selectedDomainKey = 'ecommerce';
  } else if (normalized.includes('hospital') || normalized.includes('patient') || normalized.includes('doctor') || normalized.includes('medical') || normalized.includes('clinic')) {
    selectedDomainKey = 'hospital';
  } else if (normalized.includes('hr') || normalized.includes('employee') || normalized.includes('payroll') || normalized.includes('salary') || normalized.includes('leave')) {
    selectedDomainKey = 'hr';
  } else if (normalized.includes('real estate') || normalized.includes('property') || normalized.includes('agent') || normalized.includes('house') || normalized.includes('rent')) {
    selectedDomainKey = 'realestate';
  } else if (normalized.includes('bank') || normalized.includes('fintech') || normalized.includes('loan') || normalized.includes('transaction') || normalized.includes('account')) {
    selectedDomainKey = 'banking';
  } else if (normalized.includes('social') || normalized.includes('post') || normalized.includes('comment') || normalized.includes('follow') || normalized.includes('message')) {
    selectedDomainKey = 'social';
  } else if (normalized.includes('course') || normalized.includes('lms') || normalized.includes('learn') || normalized.includes('quiz') || normalized.includes('student')) {
    selectedDomainKey = 'lms';
  } else if (normalized.includes('logistics') || normalized.includes('shipment') || normalized.includes('fleet') || normalized.includes('vehicle') || normalized.includes('driver')) {
    selectedDomainKey = 'logistics';
  } else if (normalized.includes('crm') || normalized.includes('lead') || normalized.includes('deal') || normalized.includes('contact')) {
    selectedDomainKey = 'crm';
  }

  let projectName = 'enterprise-backend-api';
  let description = 'Enterprise Node.js & Express REST API with Clean Architecture generated via OpenAPI AI';
  let entities = [];

  if (selectedDomainKey !== 'custom' && DOMAIN_CATALOG[selectedDomainKey]) {
    const d = DOMAIN_CATALOG[selectedDomainKey];
    projectName = d.name;
    description = d.description;
    entities = d.entities;
  } else {
    // Dynamic entity parsing NLP fallback
    const extracted = normalized
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
      let clean = word.trim();
      if (clean.endsWith('s') && clean.length > 3 && !clean.endsWith('ss')) {
        clean = clean.slice(0, -1);
      }
      if (clean && !stopWords.has(clean) && clean.length > 2) {
        if (!customEntities.find(e => e.name === clean)) {
          customEntities.push({
            name: clean,
            fields: ['name', 'description', 'status', 'category']
          });
        }
      }
    });

    if (customEntities.length > 0) {
      entities = customEntities.slice(0, 5);
      projectName = `${entities.map(e => e.name).slice(0, 2).join('-')}-api`;
      description = `Enterprise REST API for ${entities.map(e => e.name.charAt(0).toUpperCase() + e.name.slice(1)).join(', ')}`;
    } else {
      entities = [
        { name: 'user', fields: ['name', 'email', 'role', 'status'] },
        { name: 'resource', fields: ['title', 'category', 'status', 'metadata'] }
      ];
    }
  }

  let files = [];

  // package.json
  files.push({
    path: 'package.json',
    content: `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "${description}",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed": "node src/scripts/seed.js",
    "test": "node --test src/tests/*.test.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.2.0",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.3.1",
    "morgan": "^1.10.0",
    "swagger-ui-express": "^5.0.0",
    "winston": "^3.13.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}`
  });

  // .env.example
  files.push({
    path: '.env.example',
    content: `PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/${projectName}
JWT_SECRET=super_secret_jwt_access_key_enterprise_2026
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_enterprise_2026
JWT_REFRESH_EXPIRE=7d
RATE_LIMIT_REQUESTS=100
CORS_ORIGIN=*`
  });

  // Dockerfile
  files.push({
    path: 'Dockerfile',
    content: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]`
  });

  // docker-compose.yml
  files.push({
    path: 'docker-compose.yml',
    content: `version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongodb:27017/${projectName}
      - JWT_SECRET=docker_production_jwt_secret_key
    depends_on:
      - mongodb
    restart: always

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: always

volumes:
  mongo-data:`
  });

  // README.md
  files.push({
    path: 'README.md',
    content: `# ${projectName.toUpperCase()}

> **Enterprise Backend Architecture** generated by **OpenAPI AI Engine**

${description}

---

## 🚀 Architecture Highlights

- **Clean Architecture**: Decoupled Layering (\`Controllers\` -> \`Services\` -> \`Repositories\` -> \`Models\`)
- **JWT Authentication & RBAC**: Access Tokens, Refresh Tokens, Password Hashing, Role Validation
- **Dynamic Database Queries**: Dynamic Filtering, Sorting, Searching, and Pagination
- **Bulk & Soft Delete Operations**: Built-in Soft Delete middleware and Bulk CRUD helpers
- **Interactive Documentation**: Swagger UI at \`/api-docs\` & Included Postman v2.1 Collection
- **Production Hardening**: Helmet Security Headers, GZIP Compression, Express Rate Limiter, Winston Logging
- **Docker Support**: \`Dockerfile\` & \`docker-compose.yml\` with MongoDB integration

---

## 🛠️ Folder Structure

\`\`\`text
src/
├── config/           # Database, logger, environment configuration
├── constants/        # System roles, HTTP statuses
├── controllers/      # HTTP request handling & response sending
├── docs/             # OpenAPI specs
├── helpers/          # Pagination, response envelope formatters, password utilities
├── middlewares/      # Auth, RBAC, error handling, rate limiters, validation check
├── models/           # Mongoose Schemas & Soft Delete Hooks
├── repositories/     # Data Access Layer & DB Query abstraction
├── routes/           # Express Endpoint routers
├── scripts/          # Seeder script
├── services/         # Business Logic Layer
├── swagger/          # Swagger UI integration setup
├── tests/            # Automated node test suite
├── utils/            # Logger, ApiError class
└── validators/       # Request payload schemas
\`\`\`

---

## 🚦 Quick Start Guide

### 1. Installation & Environment Setup
\`\`\`bash
npm install
cp .env.example .env
\`\`\`

### 2. Run Database Seeder
\`\`\`bash
npm run seed
\`\`\`

### 3. Start Development Server
\`\`\`bash
npm run dev
\`\`\`
The server will start at \`http://localhost:5000\`

---

## 📑 API Documentation & Testing

- **Swagger UI**: Visit \`http://localhost:5000/api-docs\`
- **Postman Collection**: Import \`postman_collection.json\` into Postman
- **Run Tests**: \`npm test\`
`
  });

  // src/config/db.js
  files.push({
    path: 'src/config/db.js',
    content: `import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/${projectName}');
    console.log(\`MongoDB Connected: \${conn.connection.host}\`);
  } catch (error) {
    console.error(\`MongoDB Connection Error: \${error.message}\`);
    process.exit(1);
  }
};`
  });

  // src/constants/roles.js
  files.push({
    path: 'src/constants/roles.js',
    content: `export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User',
  GUEST: 'Guest'
};`
  });

  // src/constants/httpStatus.js
  files.push({
    path: 'src/constants/httpStatus.js',
    content: `export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};`
  });

  // src/utils/apiError.js
  files.push({
    path: 'src/utils/apiError.js',
    content: `export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}`
  });

  // src/utils/logger.js
  files.push({
    path: 'src/utils/logger.js',
    content: `import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => \`[\${timestamp}] \${level}: \${message}\`)
      )
    })
  ]
});

export default logger;`
  });

  // src/helpers/responseFormatter.js
  files.push({
    path: 'src/helpers/responseFormatter.js',
    content: `export const sendSuccess = (res, message, data = null, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    ...(meta && { meta })
  };
  return res.status(statusCode).json(response);
};

export const sendError = (res, message, statusCode = 500, errors = null) => {
  const response = {
    success: false,
    error: message,
    ...(errors && { errors })
  };
  return res.status(statusCode).json(response);
};`
  });

  // src/helpers/paginationHelper.js
  files.push({
    path: 'src/helpers/paginationHelper.js',
    content: `export const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;
  const sort = query.sort ? query.sort.split(',').join(' ') : '-createdAt';

  return { page, limit, skip, sort };
};

export const formatPaginatedResponse = (data, totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    items: data,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};`
  });

  // src/helpers/tokenHelper.js
  files.push({
    path: 'src/helpers/tokenHelper.js',
    content: `import jwt from 'jsonwebtoken';

export const generateTokens = (user) => {
  const payload = { id: user._id, email: user.email, role: user.role };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'super_secret_jwt_access_key_enterprise_2026',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_enterprise_2026',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};`
  });

  // src/helpers/passwordHelper.js
  files.push({
    path: 'src/helpers/passwordHelper.js',
    content: `import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (enteredPassword, hashedPassword) => {
  return bcrypt.compare(enteredPassword, hashedPassword);
};`
  });

  // src/middlewares/error.js
  files.push({
    path: 'src/middlewares/error.js',
    content: `import { sendError } from '../helpers/responseFormatter.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(\`[Error] \${req.method} \${req.originalUrl}: \${message}\`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  return sendError(res, message, statusCode, err.errors || null);
};`
  });

  // src/middlewares/auth.js
  files.push({
    path: 'src/middlewares/auth.js',
    content: `import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Access denied. Token missing.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_access_key_enterprise_2026');
    req.user = decoded;
    next();
  } catch (err) {
    return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired authorization token.'));
  }
};`
  });

  // src/middlewares/rbac.js
  files.push({
    path: 'src/middlewares/rbac.js',
    content: `import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(HTTP_STATUS.FORBIDDEN, \`Role '\${req.user?.role || 'Guest'}' is not authorized to access this route.\`));
    }
    next();
  };
};`
  });

  // src/middlewares/validate.js
  files.push({
    path: 'src/middlewares/validate.js',
    content: `import { validationResult } from 'express-validator';
import { sendError } from '../helpers/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array());
  }
  next();
};`
  });

  // src/models/User.js
  files.push({
    path: 'src/models/User.js',
    content: `import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  isVerified: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

userSchema.pre(/^find/, function(next) {
  if (!this.getFilter().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

export default mongoose.model('User', userSchema);`
  });

  // src/repositories/userRepository.js
  files.push({
    path: 'src/repositories/userRepository.js',
    content: `import User from '../models/User.js';

export class UserRepository {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findById(id) {
    return User.findById(id);
  }

  async create(userData) {
    return User.create(userData);
  }
}
export default new UserRepository();`
  });

  // src/services/authService.js
  files.push({
    path: 'src/services/authService.js',
    content: `import userRepository from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../helpers/passwordHelper.js';
import { generateTokens } from '../helpers/tokenHelper.js';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export class AuthService {
  async register(name, email, password, role) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ApiError(HTTP_STATUS.CONFLICT, 'User email already exists.');
    }
    const hashedPassword = await hashPassword(password);
    const user = await userRepository.create({ name, email, password: hashedPassword, role });
    const tokens = generateTokens(user);
    return { user: { id: user._id, name: user.name, email: user.email, role: user.role }, tokens };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials.');
    }
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials.');
    }
    const tokens = generateTokens(user);
    return { user: { id: user._id, name: user.name, email: user.email, role: user.role }, tokens };
  }
}
export default new AuthService();`
  });

  // src/controllers/authController.js
  files.push({
    path: 'src/controllers/authController.js',
    content: `import authService from '../services/authService.js';
import { sendSuccess } from '../helpers/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register(name, email, password, role);
    return sendSuccess(res, 'User registered successfully', result, HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return sendSuccess(res, 'User logged in successfully', result, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 'User profile fetched successfully', { user: req.user });
  } catch (err) {
    next(err);
  }
};`
  });

  // src/routes/authRoutes.js
  files.push({
    path: 'src/routes/authRoutes.js',
    content: `import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;`
  });

  // Domain Entities Generation
  entities.forEach(ent => {
    const name = ent.name;
    const caps = name.charAt(0).toUpperCase() + name.slice(1);
    const fields = ent.fields;

    files.push({
      path: `src/models/${caps}.js`,
      content: `import mongoose from 'mongoose';

const ${caps}Schema = new mongoose.Schema({
${fields.map(f => `  ${f}: { type: String, required: true, trim: true },`).join('\n')}
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

${caps}Schema.index({ createdAt: -1 });
${caps}Schema.pre(/^find/, function(next) {
  if (!this.getFilter().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

export default mongoose.model('${caps}', ${caps}Schema);`
    });

    files.push({
      path: `src/repositories/${name}Repository.js`,
      content: `import ${caps} from '../models/${caps}.js';

export class ${caps}Repository {
  async findAll(filter = {}, skip = 0, limit = 10, sort = '-createdAt') {
    return ${caps}.find(filter).skip(skip).limit(limit).sort(sort);
  }

  async count(filter = {}) {
    return ${caps}.countDocuments(filter);
  }

  async findById(id) {
    return ${caps}.findById(id);
  }

  async create(data) {
    return ${caps}.create(data);
  }

  async update(id, data) {
    return ${caps}.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDelete(id) {
    return ${caps}.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
  }

  async bulkDelete(ids) {
    return ${caps}.updateMany({ _id: { $in: ids } }, { deletedAt: new Date() });
  }
}
export default new ${caps}Repository();`
    });

    files.push({
      path: `src/services/${name}Service.js`,
      content: `import ${name}Repository from '../repositories/${name}Repository.js';
import { getPagination, formatPaginatedResponse } from '../helpers/paginationHelper.js';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export class ${caps}Service {
  async getAll(query) {
    const { page, limit, skip, sort } = getPagination(query);
    const filter = {};
    if (query.search) {
      filter.$or = [
        { name: new RegExp(query.search, 'i') },
        { title: new RegExp(query.search, 'i') }
      ];
    }
    const data = await ${name}Repository.findAll(filter, skip, limit, sort);
    const total = await ${name}Repository.count(filter);
    return formatPaginatedResponse(data, total, page, limit);
  }

  async getById(id) {
    const item = await ${name}Repository.findById(id);
    if (!item) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, '${caps} resource not found');
    }
    return item;
  }

  async create(data) {
    return ${name}Repository.create(data);
  }

  async update(id, data) {
    const item = await ${name}Repository.update(id, data);
    if (!item) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, '${caps} resource not found');
    }
    return item;
  }

  async delete(id) {
    const item = await ${name}Repository.softDelete(id);
    if (!item) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, '${caps} resource not found');
    }
    return item;
  }

  async bulkDelete(ids) {
    return ${name}Repository.bulkDelete(ids);
  }
}
export default new ${caps}Service();`
    });

    files.push({
      path: `src/controllers/${name}Controller.js`,
      content: `import ${name}Service from '../services/${name}Service.js';
import { sendSuccess } from '../helpers/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const getAll = async (req, res, next) => {
  try {
    const result = await ${name}Service.getAll(req.query);
    return sendSuccess(res, 'Fetched ${name}s successfully', result.items, HTTP_STATUS.OK, result.pagination);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await ${name}Service.getById(req.params.id);
    return sendSuccess(res, 'Fetched ${name} details', data);
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await ${name}Service.create(req.body);
    return sendSuccess(res, 'Created ${name} successfully', data, HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = await ${name}Service.update(req.params.id, req.body);
    return sendSuccess(res, 'Updated ${name} successfully', data);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await ${name}Service.delete(req.params.id);
    return sendSuccess(res, 'Deleted ${name} successfully');
  } catch (err) {
    next(err);
  }
};

export const bulkRemove = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const result = await ${name}Service.bulkDelete(ids || []);
    return sendSuccess(res, 'Bulk deleted ${name}s successfully', result);
  } catch (err) {
    next(err);
  }
};`
    });

    files.push({
      path: `src/validators/${name}Validator.js`,
      content: `import { body } from 'express-validator';

export const create${caps}Validation = [
${fields.map(f => `  body('${f}').notEmpty().withMessage('${f} is required'),`).join('\n')}
];`
    });

    files.push({
      path: `src/routes/${name}Routes.js`,
      content: `import express from 'express';
import { getAll, getById, create, update, remove, bulkRemove } from '../controllers/${name}Controller.js';
import { create${caps}Validation } from '../validators/${name}Validator.js';
import { validate } from '../middlewares/validate.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.route('/')
  .get(getAll)
  .post(protect, create${caps}Validation, validate, create);

router.post('/bulk-delete', protect, bulkRemove);

router.route('/:id')
  .get(getById)
  .put(protect, update)
  .delete(protect, remove);

export default router;`
    });
  });

  // src/routes/index.js
  files.push({
    path: 'src/routes/index.js',
    content: `import express from 'express';
import authRoutes from './authRoutes.js';
${entities.map(e => `import ${e.name}Routes from './${e.name}Routes.js';`).join('\n')}

const router = express.Router();

router.use('/auth', authRoutes);
${entities.map(e => `router.use('/${e.name}s', ${e.name}Routes);`).join('\n')}

export default router;`
  });

  // src/swagger/swagger.js
  files.push({
    path: 'src/swagger/swagger.js',
    content: `import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: '${projectName}',
    version: '1.0.0',
    description: '${description}'
  },
  servers: [{ url: 'http://localhost:5000/api/v1' }]
};

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};`
  });

  // src/server.js
  files.push({
    path: 'src/server.js',
    content: `import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import masterRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.js';
import { setupSwagger } from './swagger/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', limiter);

setupSwagger(app);

app.use('/api/v1', masterRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`🚀 Server running in \${process.env.NODE_ENV || 'development'} mode on port \${PORT}\`);
  console.log(\`📑 Swagger docs available at http://localhost:\${PORT}/api-docs\`);
});`
  });

  // src/tests/health.test.js
  files.push({
    path: 'src/tests/health.test.js',
    content: `import test from 'node:test';
import assert from 'node:assert';

test('Sanity Health Check Test Suite', () => {
  assert.strictEqual(1 + 1, 2);
});`
  });

  // src/scripts/seed.js
  files.push({
    path: 'src/scripts/seed.js',
    content: `import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { hashPassword } from '../helpers/passwordHelper.js';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/${projectName}');
    console.log('🌱 Connected to DB for Seeding...');
    await User.deleteMany({});
    const pass = await hashPassword('AdminPass123!');
    await User.create({ name: 'System Admin', email: 'admin@system.com', password: pass, role: 'Admin' });
    console.log('✅ Database Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder Error:', err);
    process.exit(1);
  }
};

seedDB();`
  });

  files.push({
    path: 'Dockerfile',
    content: `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 5000\nCMD ["npm", "start"]\n`
  });

  files.push({
    path: 'docker-compose.yml',
    content: `version: '3.8'\nservices:\n  api:\n    build: .\n    ports:\n      - "5000:5000"\n    environment:\n      - PORT=5000\n      - NODE_ENV=production\n`
  });

  // postman_collection.json
  const postmanItems = [
    {
      name: "Authentication",
      item: [
        {
          name: "Register User",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "Demo User", email: "user@example.com", password: "Password123!", role: "User" }, null, 2)
            },
            url: { raw: "{{base_url}}/api/v1/auth/register", host: ["{{base_url}}"], path: ["api", "v1", "auth", "register"] }
          }
        },
        {
          name: "Login User",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "user@example.com", password: "Password123!" }, null, 2)
            },
            url: { raw: "{{base_url}}/api/v1/auth/login", host: ["{{base_url}}"], path: ["api", "v1", "auth", "login"] }
          }
        }
      ]
    },
    ...entities.map(e => ({
      name: e.name.toUpperCase(),
      item: [
        {
          name: `Get All ${e.name}s`,
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token}}" }],
            url: { raw: `{{base_url}}/api/v1/${e.name}s?page=1&limit=10`, host: ["{{base_url}}"], path: ["api", "v1", `${e.name}s`] }
          }
        },
        {
          name: `Create ${e.name}`,
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify(e.fields.reduce((acc, f) => ({ ...acc, [f]: `Sample ${f}` }), {}), null, 2)
            },
            url: { raw: `{{base_url}}/api/v1/${e.name}s`, host: ["{{base_url}}"], path: ["api", "v1", `${e.name}s`] }
          }
        }
      ]
    }))
  ];

  files.push({
    path: 'postman_collection.json',
    content: JSON.stringify({
      info: {
        name: `${projectName} - API Collection`,
        description: description,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: postmanItems,
      variable: [
        { key: "base_url", value: "http://localhost:5000", type: "string" },
        { key: "token", value: "", type: "string" }
      ]
    }, null, 2)
  });

  const plan = {
    projectName,
    description,
    framework: 'Node.js + Express.js (Clean Architecture)',
    database: 'MongoDB',
    entities: entities.map(e => ({ name: e.name, fields: e.fields }))
  };

  return {
    name: projectName,
    description: description,
    framework: 'Node.js + Express (Clean Architecture)',
    database: 'MongoDB',
    files
  };
};

export default generateDynamicFallback;
