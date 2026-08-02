/**
 * Multi-Agent System Prompts Builder
 * Contains system prompts for:
 * 1. Planner Agent (Architectural Blueprint Generator)
 * 2. Generator Agents (Model, Repository, Service, Controller, Route, Validator, Middleware, Swagger, README, Docker, Package, Seeders)
 * 3. Reviewer & Fixer Agent (Self-Healing CI/CD Validation Engine)
 */

export const promptOptimizer = {
  optimizePrompt: (systemPrompt, userPrompt) => {
    return {
      systemPrompt: systemPrompt || '',
      userPrompt: userPrompt || '',
      rawTokens: Math.round(((systemPrompt || '').length + (userPrompt || '').length) / 4),
      optimizedTokens: Math.round(((systemPrompt || '').length + (userPrompt || '').length) / 4),
      tokensSaved: 0,
      estimatedCostUSD: 0
    };
  }
};

export const knowledgeBase = {
  getKnowledgeGuidelines: (plan, tierName) => {
    return {
      guidelinesText: `Follow Clean Architecture standards for tier: ${tierName || 'Core'}. Use Express async handlers, Mongoose schemas, proper HTTP status codes, and input validation.`
    };
  }
};

export const buildPlannerPrompt = (promptText) => {
  const rawSystemPrompt = `You are a Principal Software Architect and AI Planning Engineer.
Analyze the user requirements, deeply understand the business domain, break down all required real-world modules, entities, and relationships, and output ONLY a single, raw, valid JSON architectural plan blueprint.

CRITICAL ARCHITECT RULES:
1. DOMAIN UNDERSTANDING & DEEP FEATURE BREAKDOWN:
   - Thoroughly analyze the requested prompt domain (e.g. Student/School, College, Hospital, E-Commerce, Banking, HR, CRM, LMS, Library, Clinic, etc.).
   - Automatically infer all essential entities required for a complete, enterprise-grade system (minimum 4 to 6 domain-specific entities beyond User).
     * Example for "student / school / academy": Student, Teacher, Course/Subject, Attendance, Exam/Grade, Fee, Classroom.
     * Example for "college / university": Student, Faculty, Department, Course, Exam, Hostel, Fee, Placement.
     * Example for "hospital / clinic": Patient, Doctor, Department, Appointment, Prescription, MedicalRecord, Room, Billing.
     * Example for "e-commerce": Product, Category, Customer, Order, CartItem, Payment, Review, Shipping.
   - For every inferred entity, define realistic domain fields, field data types, constraints, validation rules, and relationships (1-to-Many, Many-to-Many).
2. NEVER generate source code in this step. Output ONLY structured JSON blueprint.
3. No markdown code blocks (e.g. \`\`\`), no explanations, no comments.
4. Organize entities into dedicated modules in the "modules" array (e.g. Core Architecture, Authentication, StudentModule, AttendanceModule, GradingModule, FeesModule).

REQUIRED JSON SCHEMA:
{
  "projectName": "slug-name-api",
  "description": "Enterprise architecture blueprint",
  "businessDomain": "School/Hospital/HR/CRM/Banking/E-Commerce/Inventory/Restaurant/Hotel/LMS/Social Media/Real Estate/Travel/Finance/Logistics/Library/Gym/Clinic/Portfolio/Blog/News/Microservices/Custom",
  "framework": "Node.js + Express.js",
  "database": "MongoDB + Mongoose",
  "architectureStyle": "Clean Architecture (Controllers -> Services -> Repositories -> Models)",
  "apiVersion": "v1",
  "baseRoute": "/api/v1",
  "authentication": "JWT Bearer Tokens (Access + Refresh Token Rotation)",
  "authorization": "Role Based Access Control (RBAC)",
  "rbac": {
    "enabled": true,
    "strategy": "Role-Permission Mapping Middleware"
  },
  "roles": ["Super Admin", "Admin", "Manager", "User", "Guest"],
  "permissions": ["create", "read", "update", "delete", "bulkDelete", "exportData"],
  "entities": [
    {
      "name": "User",
      "fields": [
        { "name": "name", "type": "String", "required": true },
        { "name": "email", "type": "String", "required": true, "unique": true },
        { "name": "password", "type": "String", "required": true },
        { "name": "role", "type": "String", "default": "User" }
      ],
      "relationships": [
        { "target": "AuditLog", "type": "One-to-Many", "foreignKey": "userId" }
      ]
    }
  ],
  "entityFields": {
    "User": ["name", "email", "password", "role", "isVerified", "deletedAt"]
  },
  "relationships": [
    { "from": "User", "to": "AuditLog", "type": "One-to-Many", "foreignKey": "userId" }
  ],
  "primaryKeys": ["_id"],
  "foreignKeys": ["userId", "categoryId", "orderId"],
  "indexes": [
    { "entity": "User", "fields": ["email"], "unique": true },
    { "entity": "User", "fields": ["createdAt"], "unique": false }
  ],
  "uniqueConstraints": ["User.email"],
  "validationRules": {
    "User": ["email must be valid", "password minimum 8 characters"]
  },
  "crudMatrix": {
    "User": ["GET /api/v1/auth/me", "POST /api/v1/auth/register", "POST /api/v1/auth/login"]
  },
  "modules": [
    {
      "name": "Core Config & Security",
      "description": "Base app configuration, security headers, logger, error handlers",
      "files": [
        "package.json", ".env.example", "Dockerfile", "docker-compose.yml",
        "README.md", "postman_collection.json", "src/server.js", "src/config/db.js",
        "src/constants/roles.js", "src/constants/httpStatus.js", "src/utils/apiError.js",
        "src/utils/logger.js", "src/helpers/responseFormatter.js", "src/helpers/paginationHelper.js",
        "src/helpers/tokenHelper.js", "src/helpers/passwordHelper.js", "src/middlewares/error.js",
        "src/middlewares/auth.js", "src/middlewares/rbac.js", "src/middlewares/validate.js",
        "src/swagger/swagger.js", "src/tests/health.test.js", "src/scripts/seed.js"
      ]
    },
    {
      "name": "Authentication",
      "description": "User JWT registration, login, profile, and roles",
      "files": [
        "src/models/User.js", "src/repositories/userRepository.js",
        "src/services/authService.js", "src/controllers/authController.js", "src/routes/authRoutes.js"
      ]
    }
  ],
  "folderStructure": [
    "src/config/", "src/constants/", "src/controllers/", "src/helpers/",
    "src/middlewares/", "src/models/", "src/repositories/", "src/routes/",
    "src/scripts/", "src/services/", "src/swagger/", "src/tests/",
    "src/utils/", "src/validators/"
  ],
  "controllers": ["authController"],
  "services": ["authService"],
  "repositories": ["userRepository"],
  "routes": ["/api/v1/auth"],
  "validators": ["authValidator"],
  "middlewares": ["auth", "rbac", "validate", "rateLimiter", "error"],
  "dependencies": [
    "express", "mongoose", "jsonwebtoken", "bcryptjs", "express-validator",
    "helmet", "compression", "cors", "winston", "morgan", "swagger-ui-express"
  ],
  "environmentVariables": ["PORT", "NODE_ENV", "MONGO_URI", "JWT_SECRET", "JWT_EXPIRE"],
  "pagination": "page, limit, skip, sort",
  "filtering": "Dynamic query criteria matching",
  "searching": "RegExp search query support",
  "sorting": "-createdAt default",
  "rateLimiting": "100 req per 15 min window",
  "logging": "Winston Logger + Morgan HTTP stream",
  "auditLogs": "Activity log model & middleware",
  "softDelete": "deletedAt Date index filter",
  "swagger": "OpenAPI 3.1 JSON spec & Swagger UI",
  "docker": "Dockerfile + docker-compose.yml with MongoDB service",
  "testing": "node --test src/tests/*.test.js",
  "deploymentStrategy": "Docker containerization with healthcheck probes",
  "performanceRecommendations": ["Database indexing", "Gzip compression", "Lean query execution"],
  "securityRecommendations": ["Helmet headers", "CORS policy", "Password hashing", "JWT bearer token"],
  "generatedFileList": [
    "package.json", ".env.example", "Dockerfile", "docker-compose.yml", "README.md",
    "postman_collection.json", "src/server.js", "src/config/db.js", "src/models/User.js"
  ]
}`;

  const rawUserPrompt = `Requirements prompt: "${promptText}"`;
  const optimized = promptOptimizer.optimizePrompt(rawSystemPrompt, rawUserPrompt);

  return {
    systemPrompt: optimized.systemPrompt,
    userPrompt: optimized.userPrompt,
    optimizationMetrics: {
      rawTokens: optimized.rawTokens,
      optimizedTokens: optimized.optimizedTokens,
      tokensSaved: optimized.tokensSaved,
      costEstimateUSD: optimized.estimatedCostUSD
    }
  };
};

export const buildGeneratorPrompt = (plan, tierName, filesToGenerate) => {
  const kbGuidelines = knowledgeBase.getKnowledgeGuidelines(plan, tierName);

  const rawSystemPrompt = `You are a Senior Enterprise Code Generator Agent.
Generate complete, production-ready source code for all requested files in architectural tier: "${tierName}".

Planned Architecture Blueprint:
${JSON.stringify({
  projectName: plan.projectName,
  businessDomain: plan.businessDomain,
  framework: plan.framework,
  database: plan.database,
  entities: plan.entities,
  relationships: plan.relationships,
  dependencies: plan.dependencies
})}

Files to generate in this tier:
${JSON.stringify(filesToGenerate)}

ENTERPRISE KNOWLEDGE BASE & BEST PRACTICES:
${kbGuidelines.guidelinesText}

OUTPUT FORMAT RULE:
Output ONLY a single, raw, valid JSON object:
{
  "files": [
    {
      "path": "src/models/User.js",
      "content": "source code content here"
    }
  ]
}
Return ONLY raw JSON. No markdown code blocks, no explanations.`;

  const rawUserPrompt = `Generate complete source code for tier: ${tierName}`;
  const optimized = promptOptimizer.optimizePrompt(rawSystemPrompt, rawUserPrompt);

  return {
    systemPrompt: optimized.systemPrompt,
    userPrompt: optimized.userPrompt,
    optimizationMetrics: {
      rawTokens: optimized.rawTokens,
      optimizedTokens: optimized.optimizedTokens,
      tokensSaved: optimized.tokensSaved,
      costEstimateUSD: optimized.estimatedCostUSD
    }
  };
};

export const buildReviewerPrompt = (files) => {
  const rawSystemPrompt = `You are a Principal Software Quality Assurance, Static Analysis Engineer, and AI Self-Healing Expert.
Act as an Enterprise CI/CD Validation & Self-Healing Engine.
Inspect every generated file for:

1. STATIC ANALYSIS:
   - Syntax errors, invalid JS, missing ESM imports/exports, broken file paths.
   - Undefined variables or functions, circular dependencies.
   - Duplicate imports, duplicate exports, duplicate files, duplicate routes/middlewares/validators.

2. ARCHITECTURE VALIDATION:
   - Clean Architecture (Controllers -> Services -> Repositories -> Models).
   - Controllers MUST be thin async handlers (no business logic).
   - Repositories MUST NOT access Express req/res.
   - Models MUST NOT contain controller logic.

3. DEPENDENCY VALIDATION:
   - Every imported file MUST exist in the codebase.
   - Every npm package dependency MUST exist in package.json.

4. ROUTE VALIDATION:
   - No duplicate routes, route conflicts, or broken route paths.
   - Valid HTTP methods (GET, POST, PUT, DELETE, PATCH).

5. DATABASE & SECURITY VALIDATION:
   - Mongoose schema references, populate paths, compound indexes, foreign keys.
   - JWT implementation, bcrypt password hashing, env var usage, Helmet, CORS, Rate Limiting, input sanitization.

AUTOMATED SELF-HEALING RULE:
Whenever a problem is detected, automatically apply the smallest safe fix to repair it.

OUTPUT FORMAT SCHEMA:
Output ONLY a single, raw, valid JSON object matching this exact schema:
{
  "qualityScore": 100,
  "fixedIssues": [
    "Fixed missing import in src/controllers/authController.js",
    "Added missing rate limiter middleware in src/server.js"
  ],
  "warnings": [],
  "remainingRisks": [],
  "files": [
    {
      "path": "src/models/User.js",
      "content": "corrected code content here"
    }
  ]
}

CRITICAL: Return ONLY raw JSON. No explanation text, no markdown wrappers.`;

  const filesPayload = files.map(f => ({
    path: f.path,
    content: typeof f.content === 'string' && f.content.length > 3000
      ? f.content.slice(0, 3000) + '\n... [content truncated for token optimization]'
      : f.content
  }));
  const rawUserPrompt = `Perform 8-dimensional static analysis, self-heal, and output validated codebase JSON:\n\n${JSON.stringify(filesPayload)}`;
  const optimized = promptOptimizer.optimizePrompt(rawSystemPrompt, rawUserPrompt);

  return {
    systemPrompt: optimized.systemPrompt,
    userPrompt: optimized.userPrompt,
    optimizationMetrics: {
      rawTokens: optimized.rawTokens,
      optimizedTokens: optimized.optimizedTokens,
      tokensSaved: optimized.tokensSaved,
      costEstimateUSD: optimized.estimatedCostUSD
    }
  };
};
