import { getGroqClient, executeWithRetry } from './groqClient.js';
import { buildPlannerPrompt } from './promptBuilder.js';
import { parseJSONSafely } from './parser.js';
import UniversalDatabaseEngine from './databaseEngine.js';
import UniversalFrameworkEngine from './frameworkEngine.js';
import EnterpriseChiefArchitectEngine from './chiefArchitectEngine.js';
import logger from '../utils/logger.js';

// ============================================================================
// 1. PROMPT ANALYZER (SOLID: Single Responsibility - Intent Extraction)
// ============================================================================
export class PromptAnalyzer {
  /**
   * Analyzes raw user prompt to extract architectural cues.
   * @param {string} promptText 
   */
  static analyze(promptText = '') {
    const raw = promptText.trim();
    const normalized = raw.toLowerCase();

    // Database Detection
    let dbType = 'MongoDB';
    let dbOrm = 'Mongoose';

    if (normalized.includes('postgres') || normalized.includes('postgresql')) {
      dbType = 'PostgreSQL';
      dbOrm = normalized.includes('prisma') ? 'Prisma' : 'Sequelize';
    } else if (normalized.includes('mysql')) {
      dbType = 'MySQL';
      dbOrm = 'Sequelize';
    } else if (normalized.includes('sqlite')) {
      dbType = 'SQLite';
      dbOrm = 'Sequelize';
    } else if (normalized.includes('mongodb') || normalized.includes('mongo')) {
      dbType = 'MongoDB';
      dbOrm = 'Mongoose';
    }

    // Auth & Roles Cues
    const hasJwt = !normalized.includes('no auth') && !normalized.includes('public api');
    const hasRefresh = normalized.includes('refresh') || normalized.includes('rotation') || hasJwt;

    return {
      rawPrompt: raw,
      normalizedPrompt: normalized,
      dbType,
      dbOrm,
      hasJwt,
      hasRefresh
    };
  }
}

// ============================================================================
// 2. DOMAIN DETECTOR (SOLID: Domain Classification Specialist)
// ============================================================================
export class DomainDetector {
  /**
   * Detects enterprise domain type from prompt text.
   * @param {string} normalizedPrompt 
   */
  static detect(normalizedPrompt = '') {
    if (normalizedPrompt.includes('hospital') || normalizedPrompt.includes('patient') || normalizedPrompt.includes('doctor') || normalizedPrompt.includes('medical') || normalizedPrompt.includes('clinic')) {
      return 'Hospital & Healthcare';
    }
    if (normalizedPrompt.includes('school') || normalizedPrompt.includes('student') || normalizedPrompt.includes('teacher') || normalizedPrompt.includes('college')) {
      return 'School & Education Management';
    }
    if (normalizedPrompt.includes('e-commerce') || normalizedPrompt.includes('ecommerce') || normalizedPrompt.includes('shop') || normalizedPrompt.includes('cart') || normalizedPrompt.includes('product')) {
      return 'E-Commerce Platform';
    }
    if (normalizedPrompt.includes('blog') || normalizedPrompt.includes('post') || normalizedPrompt.includes('comment') || normalizedPrompt.includes('article')) {
      return 'Blogging & Content Management';
    }
    if (normalizedPrompt.includes('bank') || normalizedPrompt.includes('fintech') || normalizedPrompt.includes('loan') || normalizedPrompt.includes('wallet')) {
      return 'Fintech & Banking';
    }
    if (normalizedPrompt.includes('hr') || normalizedPrompt.includes('employee') || normalizedPrompt.includes('payroll') || normalizedPrompt.includes('attendance')) {
      return 'Human Resources & Payroll';
    }
    if (normalizedPrompt.includes('real estate') || normalizedPrompt.includes('property') || normalizedPrompt.includes('tenant')) {
      return 'Real Estate Portal';
    }
    if (normalizedPrompt.includes('hotel') || normalizedPrompt.includes('booking') || normalizedPrompt.includes('room')) {
      return 'Hotel & Accommodation Booking';
    }
    return 'Custom Enterprise Business Domain';
  }
}

// ============================================================================
// 3. ENTITY EXTRACTOR (SOLID: Domain Entity Extraction Specialist)
// ============================================================================
export class EntityExtractor {
  /**
   * Extracts primary domain entities as singular capitalized strings.
   * @param {string} domain 
   * @param {string} normalizedPrompt 
   */
  static extract(domain, normalizedPrompt = '') {
    const entitySet = new Set();

    // Universal User entity for authentication
    entitySet.add('User');

    switch (domain) {
      case 'Hospital & Healthcare':
        entitySet.add('Patient');
        entitySet.add('Doctor');
        entitySet.add('Appointment');
        entitySet.add('Prescription');
        entitySet.add('Department');
        break;

      case 'School & Education Management':
        entitySet.add('Student');
        entitySet.add('Teacher');
        entitySet.add('Course');
        entitySet.add('Enrollment');
        entitySet.add('Grade');
        break;

      case 'E-Commerce Platform':
        entitySet.add('Product');
        entitySet.add('Category');
        entitySet.add('Order');
        entitySet.add('Payment');
        entitySet.add('Review');
        break;

      case 'Blogging & Content Management':
        entitySet.add('Post');
        entitySet.add('Comment');
        entitySet.add('Category');
        entitySet.add('Tag');
        break;

      case 'Fintech & Banking':
        entitySet.add('Account');
        entitySet.add('Transaction');
        entitySet.add('Card');
        entitySet.add('Beneficiary');
        break;

      case 'Human Resources & Payroll':
        entitySet.add('Employee');
        entitySet.add('Department');
        entitySet.add('Payroll');
        entitySet.add('Attendance');
        break;

      default:
        entitySet.add('Item');
        entitySet.add('Category');
        entitySet.add('AuditLog');
        break;
    }

    // Additional prompt keyword checks
    if (normalizedPrompt.includes('billing') || normalizedPrompt.includes('invoice')) {
      entitySet.add('Invoice');
    }
    if (normalizedPrompt.includes('notification')) {
      entitySet.add('Notification');
    }

    return Array.from(entitySet);
  }
}

// ============================================================================
// 4. RELATIONSHIP BUILDER (SOLID: Entity Relationship Inference Specialist)
// ============================================================================
export class RelationshipBuilder {
  /**
   * Infers valid ManyToOne, OneToMany, and ManyToMany relationships among entities.
   * @param {string[]} entities 
   */
  static build(entities = []) {
    const set = new Set(entities.map(e => e.toLowerCase()));
    const relationships = [];

    const has = (name) => set.has(name.toLowerCase());

    if (has('Appointment') && has('Patient')) {
      relationships.push({ from: 'Appointment', to: 'Patient', type: 'ManyToOne' });
    }
    if (has('Appointment') && has('Doctor')) {
      relationships.push({ from: 'Appointment', to: 'Doctor', type: 'ManyToOne' });
    }
    if (has('Prescription') && has('Patient')) {
      relationships.push({ from: 'Prescription', to: 'Patient', type: 'ManyToOne' });
    }
    if (has('Prescription') && has('Doctor')) {
      relationships.push({ from: 'Prescription', to: 'Doctor', type: 'ManyToOne' });
    }
    if (has('Order') && has('User')) {
      relationships.push({ from: 'Order', to: 'User', type: 'ManyToOne' });
    }
    if (has('Product') && has('Category')) {
      relationships.push({ from: 'Product', to: 'Category', type: 'ManyToOne' });
    }
    if (has('Comment') && has('Post')) {
      relationships.push({ from: 'Comment', to: 'Post', type: 'ManyToOne' });
    }
    if (has('Comment') && has('User')) {
      relationships.push({ from: 'Comment', to: 'User', type: 'ManyToOne' });
    }
    if (has('Enrollment') && has('Student')) {
      relationships.push({ from: 'Enrollment', to: 'Student', type: 'ManyToOne' });
    }
    if (has('Enrollment') && has('Course')) {
      relationships.push({ from: 'Enrollment', to: 'Course', type: 'ManyToOne' });
    }

    return relationships;
  }
}

// ============================================================================
// 5. FEATURE PLANNER (SOLID: Capabilities & Cross-Cutting Feature Specialist)
// ============================================================================
export class FeaturePlanner {
  /**
   * Plans core architectural features based on user prompt.
   * @param {string} normalizedPrompt 
   */
  static plan(normalizedPrompt = '') {
    const features = [
      'CRUD',
      'Pagination',
      'Search',
      'Filtering',
      'Sorting',
      'Soft Delete',
      'Swagger'
    ];

    if (normalizedPrompt.includes('payment') || normalizedPrompt.includes('stripe')) {
      features.push('Payment Integration (Stripe Webhooks)');
    }
    if (normalizedPrompt.includes('email') || normalizedPrompt.includes('verify')) {
      features.push('Email Notifications');
    }
    if (normalizedPrompt.includes('upload') || normalizedPrompt.includes('image')) {
      features.push('File Storage & Uploads');
    }
    if (normalizedPrompt.includes('chat') || normalizedPrompt.includes('socket')) {
      features.push('Real-Time WebSockets');
    }

    return features;
  }
}

// ============================================================================
// 6. SECURITY PLANNER (SOLID: Security & Authentication Specs Specialist)
// ============================================================================
export class SecurityPlanner {
  /**
   * Plans authentication strategy, refresh token rotation, and RBAC roles.
   * @param {string} domain 
   * @param {Object} analysis 
   */
  static plan(domain, analysis) {
    let roles = ['Admin', 'User'];

    if (domain === 'Hospital & Healthcare') {
      roles = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient'];
    } else if (domain === 'School & Education Management') {
      roles = ['Admin', 'Teacher', 'Student', 'Parent'];
    } else if (domain === 'E-Commerce Platform') {
      roles = ['Admin', 'Vendor', 'Customer'];
    }

    return {
      authentication: {
        jwt: analysis.hasJwt,
        refreshToken: analysis.hasRefresh,
        roles
      },
      security: [
        'JWT Bearer Token Authentication',
        'Bcrypt Password Hashing',
        'Role Based Access Control (RBAC)',
        'Rate Limiting Middleware',
        'Helmet Security Headers',
        'CORS Policy Enforcement'
      ]
    };
  }
}

// ============================================================================
// 7. VALIDATION LAYER (SOLID: Blueprint Validation & Automatic Repair Engine)
// ============================================================================
export class ValidationLayer {
  /**
   * Validates and repairs blueprint object automatically to satisfy schema rules.
   * @param {Object} rawBlueprint 
   * @param {string} promptText 
   */
  static validateAndRepair(rawBlueprint = {}, promptText = '') {
    const analysis = PromptAnalyzer.analyze(promptText);
    const domain = DomainDetector.detect(analysis.normalizedPrompt);
    const fallbackEntities = EntityExtractor.extract(domain, analysis.normalizedPrompt);

    // 1. Repair Project Name
    let projectName = rawBlueprint.projectName;
    if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
      projectName = `${domain.split(' ')[0]} Management API`;
    }

    // 2. Repair Database
    let database = rawBlueprint.database;
    if (!database || typeof database !== 'object' || !database.type) {
      database = {
        type: analysis.dbType,
        orm: analysis.dbOrm
      };
    }

    // 3. Repair Authentication & Roles
    let authentication = rawBlueprint.authentication;
    if (!authentication || typeof authentication !== 'object') {
      const secPlan = SecurityPlanner.plan(domain, analysis);
      authentication = secPlan.authentication;
    } else {
      authentication.jwt = typeof authentication.jwt === 'boolean' ? authentication.jwt : true;
      authentication.refreshToken = typeof authentication.refreshToken === 'boolean' ? authentication.refreshToken : true;
      if (!Array.isArray(authentication.roles) || authentication.roles.length === 0) {
        authentication.roles = ['Admin', 'User'];
      }
      // Deduplicate roles
      authentication.roles = [...new Set(authentication.roles)];
    }

    // 4. Repair Entities (Remove duplicates, ensure valid string formatting)
    let entities = Array.isArray(rawBlueprint.entities) ? rawBlueprint.entities : fallbackEntities;
    entities = entities.map(e => (typeof e === 'string' ? e.trim() : e?.name || 'Item')).filter(Boolean);
    // Capitalize & Deduplicate
    const uniqueEntitiesMap = new Map();
    entities.forEach(ent => {
      const formatted = ent.charAt(0).toUpperCase() + ent.slice(1);
      if (!uniqueEntitiesMap.has(formatted.toLowerCase())) {
        uniqueEntitiesMap.set(formatted.toLowerCase(), formatted);
      }
    });
    entities = Array.from(uniqueEntitiesMap.values());

    if (entities.length === 0) {
      entities = ['User', 'Resource'];
    }

    // 5. Repair Relationships (Verify 'from' and 'to' exist in entities)
    let relationships = Array.isArray(rawBlueprint.relationships) ? rawBlueprint.relationships : [];
    const validEntitySet = new Set(entities.map(e => e.toLowerCase()));

    relationships = relationships.filter(rel => {
      if (!rel || typeof rel !== 'object') return false;
      if (!rel.from || !rel.to) return false;
      return validEntitySet.has(rel.from.toLowerCase()) && validEntitySet.has(rel.to.toLowerCase());
    });

    if (relationships.length === 0) {
      relationships = RelationshipBuilder.build(entities);
    }

    // 6. Repair Modules (Remove duplicates, guarantee non-empty formatted objects)
    let modules = Array.isArray(rawBlueprint.modules) ? rawBlueprint.modules : [];
    const moduleNames = [];

    modules.forEach(m => {
      const name = typeof m === 'string' ? m.trim() : m?.name || 'Module';
      if (name && !moduleNames.some(existing => existing.toLowerCase() === name.toLowerCase())) {
        moduleNames.push(name);
      }
    });

    if (moduleNames.length === 0) {
      moduleNames.push('Authentication', ...entities.map(e => `${e}s`), 'Billing');
    }

    // Convert strings to structured module tier objects for generatorService compatibility
    const formattedModules = moduleNames.map(modName => {
      const entName = modName.replace(/s$|Module$/i, '').trim() || 'Core';
      const entCapitalized = entName.charAt(0).toUpperCase() + entName.slice(1);
      const entLower = entName.toLowerCase();
      return {
        name: modName.includes('Module') || modName.includes('Tier') ? modName : `${modName} Module`,
        description: `${modName} architecture tier with REST routes, controllers, and services`,
        files: [
          `src/models/${entCapitalized}.js`,
          `src/services/${entLower}Service.js`,
          `src/controllers/${entLower}Controller.js`,
          `src/routes/${entLower}Routes.js`
        ]
      };
    });

    // 7. Repair Features
    let features = Array.isArray(rawBlueprint.features) ? rawBlueprint.features : [];
    features = features.filter(f => typeof f === 'string' && f.trim());
    if (features.length === 0) {
      features = FeaturePlanner.plan(analysis.normalizedPrompt);
    }
    features = [...new Set(features)];

    // 8. Repair Security & API Style
    const secPlan = SecurityPlanner.plan(domain, analysis);
    const security = Array.isArray(rawBlueprint.security) && rawBlueprint.security.length > 0 
      ? [...new Set(rawBlueprint.security)]
      : secPlan.security;

    const architecture = rawBlueprint.architecture || 'Clean Architecture';
    const apiStyle = rawBlueprint.apiStyle || 'RESTful HTTP API';

    return {
      projectName,
      domain,
      architecture,
      database,
      authentication,
      entities,
      relationships,
      modules: formattedModules,
      moduleNames,
      features,
      security,
      apiStyle
    };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY HELPERS (Preserved Exports)
// ============================================================================

export const correctPromptSpelling = async (promptText) => {
  try {
    const groq = getGroqClient();
    const systemPrompt = `You are a Prompt Corrector Agent. Correct spelling, grammar, and typographical mistakes in the user's software architecture prompt. Return ONLY the corrected prompt text.`;

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

export const inferRelationships = (entities = [], promptText = '') => {
  const entityNames = entities.map(e => typeof e === 'string' ? e : e.name);
  const rels = RelationshipBuilder.build(entityNames);
  return {
    relationships: rels,
    joinTables: [],
    foreignKeys: ['userId'],
    extraEntities: []
  };
};

export const expandFeatureDependencies = (plan, promptText = '') => plan;
export const detectArchitectureConflicts = (plan, promptText = '') => [];
export const calculatePlanningConfidence = (plan, promptText = '') => ({ confidence: 98, assumptions: [], missingInformation: [], warnings: [] });
export const applySmartDefaults = (plan) => plan;
export const normalizeAndDeduplicatePlan = (plan) => plan;
export const detectBusinessDomain = (promptText = '') => DomainDetector.detect(promptText.toLowerCase());

// ============================================================================
// MAIN PLANNER AGENT ENTRY POINT (Intelligent Planning Engine)
// ============================================================================
/**
  Transforms user requirements into a validated, deterministic Project Blueprint JSON.
 * Returns ONLY the blueprint structure while maintaining backward-compatibility with downstream services.
 * 
 * @param {string} promptText 
 * @returns {Promise<Object>} Validated Project Blueprint JSON
 */
export const planProjectArchitecture = async (promptText = '') => {
  logger.info(`Planner Agent: Analyzing project prompt - "${promptText}"`);

  let rawBlueprint = {};

  try {
    const groq = getGroqClient();
    const { systemPrompt, userPrompt } = buildPlannerPrompt(promptText);

    const response = await executeWithRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.0, // Strict deterministic output
        response_format: { type: "json_object" }
      })
    );

    const content = response.choices[0]?.message?.content;
    if (content) {
      rawBlueprint = parseJSONSafely(content);
    }
  } catch (error) {
    logger.error(`Planner Agent LLM notice (utilizing deterministic engine): ${error.message}`);
  }

  // Execute 7-Stage Modular Pipeline Validation & Auto-Repair Layer
  const validatedBlueprint = ValidationLayer.validateAndRepair(rawBlueprint, promptText);

  // Universal Framework & DB Context for downstream pipeline compatibility
  const frameworkEngine = new UniversalFrameworkEngine();
  const databaseEngine = new UniversalDatabaseEngine();
  const chiefArchitectEngine = new EnterpriseChiefArchitectEngine();

  const frameworkCtx = frameworkEngine.resolveFrameworkContext(validatedBlueprint);
  const databaseCtx = databaseEngine.resolveDatabaseContext(validatedBlueprint);
  const chiefArchitectCtx = chiefArchitectEngine.planSoftwareArchitecture(promptText, validatedBlueprint);

  // Return validated blueprint JSON enriched with downstream pipeline compatibility properties
  return {
    // 1. Upgraded Intelligent Blueprint Properties
    projectName: validatedBlueprint.projectName,
    domain: validatedBlueprint.domain,
    architecture: validatedBlueprint.architecture,
    database: validatedBlueprint.database,
    authentication: validatedBlueprint.authentication,
    entities: validatedBlueprint.entities,
    relationships: validatedBlueprint.relationships,
    modules: validatedBlueprint.modules,
    features: validatedBlueprint.features,
    security: validatedBlueprint.security,
    apiStyle: validatedBlueprint.apiStyle,

    // 2. Downstream Pipeline Compatibility Attributes
    businessDomain: validatedBlueprint.domain,
    framework: 'Node.js + Express.js',
    architectureStyle: 'Clean Architecture (Controllers -> Services -> Repositories -> Models)',
    apiVersion: 'v1',
    baseRoute: '/api/v1',
    roles: validatedBlueprint.authentication.roles,
    permissions: ['create', 'read', 'update', 'delete', 'bulkDelete'],
    primaryKeys: ['_id'],
    foreignKeys: ['userId'],
    dependencies: [
      'express',
      validatedBlueprint.database.type === 'MongoDB' ? 'mongoose' : 'pg',
      'jsonwebtoken',
      'bcryptjs',
      'cors',
      'helmet',
      'dotenv'
    ],
    environmentVariables: ['PORT', 'NODE_ENV', 'MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRE'],
    generatedFileList: []
  };
};

export default planProjectArchitecture;
