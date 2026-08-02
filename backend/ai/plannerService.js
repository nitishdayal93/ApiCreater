import { getGroqClient, executeWithRetry } from './groqClient.js';
import { buildPlannerPrompt } from './promptBuilder.js';
import { parseJSONSafely } from './parser.js';
import UniversalDatabaseEngine from './databaseEngine.js';
import UniversalFrameworkEngine from './frameworkEngine.js';
import EnterpriseChiefArchitectEngine from './chiefArchitectEngine.js';
import logger from '../utils/logger.js';

/**
 * Prompt Corrector Agent
 * Corrects spelling & typographical errors without altering architecture intent.
 */
export const correctPromptSpelling = async (promptText) => {
  try {
    const groq = getGroqClient();
    const systemPrompt = `You are a Prompt Corrector Agent. Correct spelling, grammar, and typographical mistakes in the user's software architecture prompt. Preserve all technical context, framework selection, entities, and database preferences. Return ONLY the corrected prompt text without quotes or markdown wrappers.`;

    const response = await executeWithRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Prompt to correct: "${promptText}"` }
        ],
        temperature: 0.1
      })
    );

    const corrected = response.choices[0]?.message?.content;
    if (corrected) {
      return corrected.trim().replace(/^"|"$/g, '');
    }
  } catch (error) {
    logger.error(`Prompt Corrector Agent notice: ${error.message}`);
  }
  return promptText;
};

/**
 * 1. Relationship Inference Engine
 * Automatically infers 1-1, 1-N, N-N relations, join tables, foreign keys, and indexes.
 */
export const inferRelationships = (entities = [], promptText = '') => {
  const entityNames = new Set(entities.map(e => (typeof e === 'string' ? e : e.name).toLowerCase()));
  const inferredRelations = [];
  const joinTables = [];
  const foreignKeys = new Set(['userId']);
  const extraEntities = [];

  const hasEntity = (name) => entityNames.has(name.toLowerCase());

  // User + Order
  if (hasEntity('User') && hasEntity('Order')) {
    inferredRelations.push({ from: 'User', to: 'Order', type: 'One-to-Many', foreignKey: 'userId', cascade: 'CASCADE_DELETE' });
    foreignKeys.add('userId');
  }

  // Category + Product
  if (hasEntity('Category') && hasEntity('Product')) {
    inferredRelations.push({ from: 'Category', to: 'Product', type: 'One-to-Many', foreignKey: 'categoryId', cascade: 'SET_NULL' });
    foreignKeys.add('categoryId');
  }

  // Order + Product -> Many-to-Many => OrderItem join table
  if (hasEntity('Order') && hasEntity('Product')) {
    inferredRelations.push({ from: 'Order', to: 'Product', type: 'Many-to-Many', via: 'OrderItem' });
    joinTables.push('OrderItem');
    foreignKeys.add('orderId');
    foreignKeys.add('productId');
    extraEntities.push({
      name: 'OrderItem',
      fields: ['orderId', 'productId', 'quantity', 'unitPrice'],
      relationships: [{ from: 'Order', type: 'Many-to-One' }, { from: 'Product', type: 'Many-to-One' }]
    });
  }

  // User + Address
  if (hasEntity('User') && hasEntity('Address')) {
    inferredRelations.push({ from: 'User', to: 'Address', type: 'One-to-Many', foreignKey: 'userId', cascade: 'CASCADE_DELETE' });
  }

  // Doctor + Patient + Appointment
  if (hasEntity('Doctor') && hasEntity('Appointment')) {
    inferredRelations.push({ from: 'Doctor', to: 'Appointment', type: 'One-to-Many', foreignKey: 'doctorId' });
    foreignKeys.add('doctorId');
  }
  if (hasEntity('Patient') && hasEntity('Appointment')) {
    inferredRelations.push({ from: 'Patient', to: 'Appointment', type: 'One-to-Many', foreignKey: 'patientId' });
    foreignKeys.add('patientId');
  }

  // Teacher + Student + Course -> Enrollment join table
  if (hasEntity('Teacher') && hasEntity('Course')) {
    inferredRelations.push({ from: 'Teacher', to: 'Course', type: 'One-to-Many', foreignKey: 'teacherId' });
    foreignKeys.add('teacherId');
  }
  if (hasEntity('Student') && hasEntity('Course')) {
    inferredRelations.push({ from: 'Student', to: 'Course', type: 'Many-to-Many', via: 'Enrollment' });
    joinTables.push('Enrollment');
    foreignKeys.add('studentId');
    foreignKeys.add('courseId');
    extraEntities.push({
      name: 'Enrollment',
      fields: ['studentId', 'courseId', 'enrolledAt', 'progressPercentage', 'status'],
      relationships: [{ from: 'Student', type: 'Many-to-One' }, { from: 'Course', type: 'Many-to-One' }]
    });
  }

  // Role + Permission -> RolePermission join table
  if (hasEntity('Role') && hasEntity('Permission')) {
    inferredRelations.push({ from: 'Role', to: 'Permission', type: 'Many-to-Many', via: 'RolePermission' });
    joinTables.push('RolePermission');
    foreignKeys.add('roleId');
    foreignKeys.add('permissionId');
    extraEntities.push({
      name: 'RolePermission',
      fields: ['roleId', 'permissionId'],
      relationships: [{ from: 'Role', type: 'Many-to-One' }, { from: 'Permission', type: 'Many-to-One' }]
    });
  }

  return {
    relationships: inferredRelations,
    joinTables,
    foreignKeys: Array.from(foreignKeys),
    extraEntities
  };
};

/**
 * 2. Feature Dependency Engine
 * Automatically expands architecture when specific features are detected in prompt.
 */
export const expandFeatureDependencies = (plan, promptText = '') => {
  const normalized = promptText.toLowerCase();
  const extraModules = [];
  const extraDependencies = [];
  const extraEnvVars = [];
  const extraFiles = [];

  // JWT Refresh Token
  if (normalized.includes('refresh') || normalized.includes('token rotation') || normalized.includes('jwt refresh')) {
    logger.info('Feature Engine: Expanding Refresh Token & Rotation architecture');
    extraDependencies.push('ioredis');
    extraEnvVars.push('JWT_REFRESH_SECRET', 'JWT_REFRESH_EXPIRE', 'REDIS_URI');
    extraFiles.push('src/models/RefreshToken.js', 'src/services/tokenService.js', 'src/controllers/tokenController.js');
    extraModules.push({
      name: 'JWT Refresh Token & Rotation Module',
      description: 'RefreshToken model, token rotation, Redis blacklist, logout flow, token cleanup job',
      files: ['src/models/RefreshToken.js', 'src/services/tokenService.js', 'src/controllers/tokenController.js']
    });
  }

  // Email Verification
  if (normalized.includes('verify email') || normalized.includes('email verification') || normalized.includes('confirm email')) {
    logger.info('Feature Engine: Expanding Email Verification architecture');
    extraDependencies.push('nodemailer');
    extraEnvVars.push('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS');
    extraFiles.push('src/models/VerificationToken.js', 'src/services/emailService.js', 'src/controllers/verifyController.js');
    extraModules.push({
      name: 'Email Verification Module',
      description: 'Mail service, verification tokens, SMTP delivery, email queue, retry policy',
      files: ['src/models/VerificationToken.js', 'src/services/emailService.js', 'src/controllers/verifyController.js']
    });
  }

  // Password Reset
  if (normalized.includes('password reset') || normalized.includes('forgot password')) {
    logger.info('Feature Engine: Expanding Password Reset architecture');
    extraDependencies.push('nodemailer');
    extraFiles.push('src/models/ResetToken.js', 'src/models/AuditLog.js', 'src/services/passwordResetService.js');
    extraModules.push({
      name: 'Password Reset Module',
      description: 'Reset token generation, expiry checking, mail service notification, audit logging',
      files: ['src/models/ResetToken.js', 'src/models/AuditLog.js', 'src/services/passwordResetService.js']
    });
  }

  // Analytics & Reports
  if (normalized.includes('analytics') || normalized.includes('dashboard') || normalized.includes('report') || normalized.includes('chart')) {
    logger.info('Feature Engine: Expanding Analytics & Reporting architecture');
    extraFiles.push('src/controllers/dashboardController.js', 'src/services/dashboardService.js', 'src/helpers/exportHelper.js', 'src/routes/dashboardRoutes.js');
    extraModules.push({
      name: 'Analytics & Reporting Module',
      description: 'Dashboard aggregations, metric charts API, automated reports, CSV/JSON data export',
      files: ['src/controllers/dashboardController.js', 'src/services/dashboardService.js', 'src/helpers/exportHelper.js', 'src/routes/dashboardRoutes.js']
    });
  }

  // OTP
  if (normalized.includes('otp') || normalized.includes('2fa') || normalized.includes('sms auth')) {
    logger.info('Feature Engine: Expanding OTP architecture');
    extraDependencies.push('ioredis');
    extraEnvVars.push('REDIS_URI', 'SMS_PROVIDER_API_KEY');
    extraFiles.push('src/models/Otp.js', 'src/services/otpService.js', 'src/helpers/smsHelper.js', 'src/routes/otpRoutes.js');
    extraModules.push({
      name: 'OTP Authentication Module',
      description: 'Redis TTL caching, SMS delivery, OTP validation',
      files: ['src/models/Otp.js', 'src/services/otpService.js', 'src/helpers/smsHelper.js', 'src/routes/otpRoutes.js']
    });
  }

  // Payments / Stripe
  if (normalized.includes('payment') || normalized.includes('stripe') || normalized.includes('checkout')) {
    logger.info('Feature Engine: Expanding Payments architecture');
    extraDependencies.push('stripe');
    extraEnvVars.push('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET');
    extraFiles.push('src/models/Transaction.js', 'src/services/paymentService.js', 'src/controllers/webhookController.js', 'src/helpers/invoiceHelper.js');
    extraModules.push({
      name: 'Payments Module',
      description: 'Stripe webhook listener, transaction records, refunds, invoice PDF generation',
      files: ['src/models/Transaction.js', 'src/services/paymentService.js', 'src/controllers/webhookController.js', 'src/helpers/invoiceHelper.js']
    });
  }

  // Chat / Socket.io
  if (normalized.includes('chat') || normalized.includes('socket') || normalized.includes('messaging')) {
    logger.info('Feature Engine: Expanding Real-Time Chat architecture');
    extraDependencies.push('socket.io');
    extraFiles.push('src/models/Message.js', 'src/models/Conversation.js', 'src/helpers/socketHelper.js', 'src/services/chatService.js');
    extraModules.push({
      name: 'Real-Time Chat Module',
      description: 'Socket.io event handler, direct messaging, typing events, unread count',
      files: ['src/models/Message.js', 'src/models/Conversation.js', 'src/helpers/socketHelper.js', 'src/services/chatService.js']
    });
  }

  // Image Upload / Storage
  if (normalized.includes('upload') || normalized.includes('image') || normalized.includes('file') || normalized.includes('cloudinary')) {
    logger.info('Feature Engine: Expanding Storage Upload architecture');
    extraDependencies.push('cloudinary', 'multer');
    extraEnvVars.push('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
    extraFiles.push('src/middlewares/upload.js', 'src/services/storageService.js', 'src/routes/uploadRoutes.js');
    extraModules.push({
      name: 'Storage Upload Module',
      description: 'Multer upload handling, Cloudinary storage service integration',
      files: ['src/middlewares/upload.js', 'src/services/storageService.js', 'src/routes/uploadRoutes.js']
    });
  }

  const existingDeps = Array.isArray(plan.dependencies) ? plan.dependencies : [];
  const existingEnvs = Array.isArray(plan.environmentVariables) ? plan.environmentVariables : [];
  const existingMods = Array.isArray(plan.modules) ? plan.modules : [];
  const existingFiles = Array.isArray(plan.generatedFileList) ? plan.generatedFileList : [];

  return {
    ...plan,
    dependencies: [...new Set([...existingDeps, ...extraDependencies])],
    environmentVariables: [...new Set([...existingEnvs, ...extraEnvVars])],
    modules: [...existingMods, ...extraModules],
    generatedFileList: [...new Set([...existingFiles, ...extraFiles])]
  };
};

/**
 * 3. Conflict Detection Engine
 * Detects contradictory architectural requirements.
 */
export const detectArchitectureConflicts = (plan, promptText = '') => {
  const normalized = promptText.toLowerCase();
  const conflicts = [];

  // Database Conflicts
  if ((normalized.includes('mongodb') || plan.database?.includes('MongoDB')) && normalized.includes('postgresql')) {
    conflicts.push({
      conflict: 'Database Ambiguity: Both MongoDB and PostgreSQL specified',
      severity: 'HIGH',
      recommendedResolution: 'Standardized on MongoDB + Mongoose as primary document store.'
    });
  }

  // Auth Conflicts
  if (normalized.includes('session') && (normalized.includes('jwt') || plan.authentication?.includes('JWT'))) {
    conflicts.push({
      conflict: 'Authentication Paradigm Contradiction: Session-based vs JWT',
      severity: 'MEDIUM',
      recommendedResolution: 'Standardized on Stateless JWT Bearer tokens with refresh token rotation.'
    });
  }

  // API Conflicts
  if (normalized.includes('graphql') && normalized.includes('rest')) {
    conflicts.push({
      conflict: 'API Protocol Mixing: REST and GraphQL specified simultaneously',
      severity: 'LOW',
      recommendedResolution: 'Standardized on Express REST endpoints with OpenAPI 3.1 documentation.'
    });
  }

  // Redis + OTP Conflict
  if ((normalized.includes('no redis') || normalized.includes('without redis')) && normalized.includes('otp')) {
    conflicts.push({
      conflict: 'OTP Storage Constraint: OTP requested without Redis cache',
      severity: 'HIGH',
      recommendedResolution: 'Include Redis ioredis client for short-lived OTP TTL key storage.'
    });
  }

  // SQLite + High Scalability
  if (normalized.includes('sqlite') && (normalized.includes('high scalability') || normalized.includes('enterprise'))) {
    conflicts.push({
      conflict: 'Database Scale Warning: SQLite selected for high-scalability target',
      severity: 'MEDIUM',
      recommendedResolution: 'Upgrade to MongoDB cluster for multi-instance horizontal scaling.'
    });
  }

  return conflicts;
};

/**
 * 4. Planning Confidence & Assumptions Engine
 */
export const calculatePlanningConfidence = (plan, promptText = '') => {
  const normalized = promptText.toLowerCase();
  let confidence = 98;
  const assumptions = [];
  const missingInformation = [];
  const warnings = [];

  // Assumptions
  assumptions.push('Single-tenant cloud backend deployment architecture');
  assumptions.push('RESTful HTTP API interface adhering to JSON standards');
  assumptions.push('Stateless JWT bearer authentication strategy');

  // Missing Info
  if (!normalized.includes('stripe') && !normalized.includes('paypal') && normalized.includes('payment')) {
    confidence -= 2;
    missingInformation.push('Payment gateway provider unspecified (defaulting to Stripe SDK)');
  }
  if (!normalized.includes('nodemailer') && !normalized.includes('sendgrid') && (normalized.includes('email') || normalized.includes('notification'))) {
    confidence -= 2;
    missingInformation.push('SMTP email provider unspecified (defaulting to Nodemailer SMTP)');
  }

  // Warnings
  if (!normalized.includes('redis') && !normalized.includes('cache')) {
    warnings.push('No distributed cache configured (defaulting to In-Memory/Redis Ready structure)');
  }
  if (!normalized.includes('docker') && !normalized.includes('kubernetes')) {
    warnings.push('No container orchestration specified (defaulting to Dockerfile + docker-compose)');
  }

  return {
    confidence: Math.max(85, confidence),
    assumptions,
    missingInformation,
    warnings
  };
};

/**
 * 5. Smart Defaults Engine
 */
export const applySmartDefaults = (plan) => {
  return {
    ...plan,
    authentication: plan.authentication || 'JWT Bearer Tokens (Access + Refresh Token Rotation)',
    database: plan.database || 'MongoDB + Mongoose',
    apiVersion: plan.apiVersion || 'v1',
    baseRoute: plan.baseRoute || '/api/v1',
    architectureStyle: plan.architectureStyle || 'Clean Architecture (Controllers -> Services -> Repositories -> Models)',
    validators: plan.validators?.length ? plan.validators : ['express-validator rules'],
    logging: plan.logging || 'Winston Logger + Morgan HTTP stream',
    swagger: plan.swagger || 'OpenAPI 3.1 JSON spec & Swagger UI'
  };
};

/**
 * 6. Deterministic Normalization & Deduplication Engine
 */
export const normalizeAndDeduplicatePlan = (plan) => {
  const dedupeArray = (arr) => Array.isArray(arr) ? [...new Set(arr)] : [];

  const normalizedEntities = (plan.entities || []).map(ent => {
    if (typeof ent === 'string') return { name: ent, fields: ['name', 'createdAt'], relationships: [] };
    return ent;
  });

  return {
    ...plan,
    entities: normalizedEntities,
    primaryKeys: dedupeArray(plan.primaryKeys || ['_id']),
    foreignKeys: dedupeArray(plan.foreignKeys || []),
    middlewares: dedupeArray(plan.middlewares || ['auth', 'rbac', 'validate', 'rateLimiter', 'error']),
    dependencies: dedupeArray(plan.dependencies || ['express', 'mongoose', 'jsonwebtoken', 'bcryptjs', 'express-validator', 'helmet', 'compression', 'cors', 'winston', 'swagger-ui-express']),
    environmentVariables: dedupeArray(plan.environmentVariables || ['PORT', 'NODE_ENV', 'MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRE']),
    generatedFileList: dedupeArray(plan.generatedFileList || [])
  };
};

/**
 * 7. Domain Detection Engine
 */
export const detectBusinessDomain = (promptText = '') => {
  const normalized = promptText.toLowerCase();
  if (normalized.includes('school') || normalized.includes('student') || normalized.includes('teacher')) return 'School Management';
  if (normalized.includes('hospital') || normalized.includes('patient') || normalized.includes('doctor')) return 'Hospital & Healthcare';
  if (normalized.includes('hr') || normalized.includes('employee') || normalized.includes('payroll')) return 'Human Resources & Payroll';
  if (normalized.includes('crm') || normalized.includes('lead') || normalized.includes('deal')) return 'CRM Enterprise';
  if (normalized.includes('bank') || normalized.includes('fintech') || normalized.includes('loan')) return 'Fintech & Banking';
  if (normalized.includes('e-commerce') || normalized.includes('ecommerce') || normalized.includes('shop') || normalized.includes('store')) return 'E-Commerce Platform';
  if (normalized.includes('inventory') || normalized.includes('stock') || normalized.includes('warehouse')) return 'Inventory & Warehouse';
  if (normalized.includes('restaurant') || normalized.includes('food') || normalized.includes('dish')) return 'Restaurant & Food Delivery';
  if (normalized.includes('hotel') || normalized.includes('booking') || normalized.includes('room')) return 'Hotel & Accommodation Booking';
  if (normalized.includes('lms') || normalized.includes('course') || normalized.includes('quiz')) return 'Learning Management System (LMS)';
  if (normalized.includes('social') || normalized.includes('post') || normalized.includes('feed')) return 'Social Media Network';
  if (normalized.includes('real estate') || normalized.includes('property') || normalized.includes('agent')) return 'Real Estate Portal';
  if (normalized.includes('travel') || normalized.includes('flight') || normalized.includes('tour')) return 'Travel & Tourism';
  if (normalized.includes('logistics') || normalized.includes('shipment') || normalized.includes('fleet')) return 'Logistics & Fleet Management';
  if (normalized.includes('library') || normalized.includes('book') || normalized.includes('isbn')) return 'Library Management';
  if (normalized.includes('gym') || normalized.includes('fitness') || normalized.includes('workout')) return 'Gym & Fitness Management';
  if (normalized.includes('clinic') || normalized.includes('dentist')) return 'Clinic & Healthcare';
  if (normalized.includes('microservice')) return 'Microservices Architecture';
  return 'Custom Enterprise Business Domain';
};

/**
 * Main Planner Agent Entry Point
 * Executes 7 deterministic architectural engines to assemble complete blueprint JSON.
 * NEVER generates source code.
 */
export const planProjectArchitecture = async (promptText) => {
  logger.info('Planner Agent: Initiating Enterprise Software Architecture Planning');

  const groq = getGroqClient();
  const { systemPrompt, userPrompt } = buildPlannerPrompt(promptText);

  const response = await executeWithRetry(() =>
    groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Planner Agent returned empty content.');
  }

  logger.info('Planner Agent: Architecture Blueprint JSON Received');
  let rawPlan = parseJSONSafely(content);

  // 1. Relationship Inference Engine
  const relInference = inferRelationships(rawPlan.entities || [], promptText);
  if (relInference.extraEntities.length > 0) {
    rawPlan.entities = [...(rawPlan.entities || []), ...relInference.extraEntities];
  }

  // 2. Feature Dependency Engine
  let enrichedPlan = expandFeatureDependencies(rawPlan, promptText);

  // 3. Conflict Detection Engine
  const conflicts = detectArchitectureConflicts(enrichedPlan, promptText);

  // 4. Planning Confidence & Assumptions Engine
  const confidenceData = calculatePlanningConfidence(enrichedPlan, promptText);

  // 5. Smart Defaults Engine
  enrichedPlan = applySmartDefaults(enrichedPlan);

  // 6. Normalization & Deduplication Engine
  enrichedPlan = normalizeAndDeduplicatePlan(enrichedPlan);

  // 7. Domain Detection
  const detectedDomain = detectBusinessDomain(promptText);

  // 8. Universal Framework Engine Resolution
  const frameworkEngine = new UniversalFrameworkEngine();
  const frameworkCtx = frameworkEngine.resolveFrameworkContext(enrichedPlan);

  // 9. Universal Database Engine Resolution
  const databaseEngine = new UniversalDatabaseEngine();
  const databaseCtx = databaseEngine.resolveDatabaseContext(enrichedPlan);

  // 10. Chief Software Architect Autonomous Planning
  const chiefArchitectEngine = new EnterpriseChiefArchitectEngine();
  const chiefArchitectCtx = chiefArchitectEngine.planSoftwareArchitecture(promptText, enrichedPlan);

  return {
    projectName: enrichedPlan.projectName || 'enterprise-backend-api',
    description: enrichedPlan.description || 'Enterprise Node.js & Express REST API with Clean Architecture',
    businessDomain: enrichedPlan.businessDomain || detectedDomain,
    framework: enrichedPlan.framework || 'Node.js + Express.js',
    database: enrichedPlan.database || 'MongoDB + Mongoose',
    architectureStyle: enrichedPlan.architectureStyle || 'Clean Architecture (Controllers -> Services -> Repositories -> Models)',
    apiVersion: enrichedPlan.apiVersion || 'v1',
    baseRoute: enrichedPlan.baseRoute || '/api/v1',
    authentication: enrichedPlan.authentication,
    authorization: enrichedPlan.authorization || 'Role Based Access Control (RBAC)',
    rbac: enrichedPlan.rbac || { enabled: true, strategy: 'Role-Permission Mapping Middleware' },
    roles: enrichedPlan.roles || ['Super Admin', 'Admin', 'Manager', 'User'],
    permissions: enrichedPlan.permissions || ['create', 'read', 'update', 'delete', 'bulkDelete'],
    entities: enrichedPlan.entities,
    entityFields: enrichedPlan.entityFields || {},
    relationships: [...(enrichedPlan.relationships || []), ...relInference.relationships],
    primaryKeys: relInference.foreignKeys.length ? [...new Set(['_id', ...relInference.foreignKeys])] : ['_id'],
    foreignKeys: relInference.foreignKeys,
    indexes: enrichedPlan.indexes || [{ entity: 'User', fields: ['email'], unique: true }],
    uniqueConstraints: enrichedPlan.uniqueConstraints || ['User.email'],
    validationRules: enrichedPlan.validationRules || {},
    crudMatrix: enrichedPlan.crudMatrix || {},
    modules: enrichedPlan.modules,
    folderStructure: enrichedPlan.folderStructure || [
      'src/config/', 'src/constants/', 'src/controllers/', 'src/helpers/',
      'src/middlewares/', 'src/models/', 'src/repositories/', 'src/routes/',
      'src/scripts/', 'src/services/', 'src/swagger/', 'src/tests/',
      'src/utils/', 'src/validators/'
    ],
    controllers: enrichedPlan.controllers || [],
    services: enrichedPlan.services || [],
    repositories: enrichedPlan.repositories || [],
    routes: enrichedPlan.routes || [],
    validators: enrichedPlan.validators || [],
    middlewares: enrichedPlan.middlewares,
    dependencies: enrichedPlan.dependencies,
    environmentVariables: enrichedPlan.environmentVariables,
    pagination: enrichedPlan.pagination || 'page, limit, skip, sort',
    filtering: enrichedPlan.filtering || 'Dynamic criteria matching',
    searching: enrichedPlan.searching || 'RegExp search query support',
    sorting: enrichedPlan.sorting || '-createdAt default',
    rateLimiting: enrichedPlan.rateLimiting || '100 req per 15 min window',
    logging: enrichedPlan.logging || 'Winston Logger + Morgan',
    auditLogs: enrichedPlan.auditLogs || 'Activity tracking helper',
    softDelete: enrichedPlan.softDelete || 'deletedAt date filter',
    swagger: enrichedPlan.swagger,
    docker: enrichedPlan.docker || 'Dockerfile + docker-compose.yml with MongoDB service',
    testing: enrichedPlan.testing || 'node --test src/tests/*.test.js',
    deploymentStrategy: enrichedPlan.deploymentStrategy || 'Docker containerization with healthcheck probes',
    performanceRecommendations: enrichedPlan.performanceRecommendations || ['Database indexing', 'Gzip compression', 'Lean query execution'],
    securityRecommendations: enrichedPlan.securityRecommendations || ['Helmet headers', 'CORS policy', 'Password hashing', 'JWT bearer token'],
    conflicts,
    confidence: confidenceData.confidence,
    assumptions: confidenceData.assumptions,
    missingInformation: confidenceData.missingInformation,
    warnings: confidenceData.warnings,
    generatedFileList: enrichedPlan.generatedFileList
  };
};

export default planProjectArchitecture;
