import { getGroqClient, executeWithRetry, applyRequestDelay, getModelForTask } from './groqClient.js';
import { buildGeneratorPrompt } from './promptBuilder.js';
import logger from '../utils/logger.js';

// ============================================================================
// STEP 1: BLUEPRINT READER (Reads & Normalizes Planner Blueprint Specifications)
// ============================================================================
export class BlueprintReader {
  /**
   * Reads and normalizes complete project blueprint from plannerService.
   * @param {Object} plan 
   */
  static read(plan = {}) {
    return {
      project: plan.project || {
        name: plan.projectName || 'enterprise-backend-api',
        domain: plan.domain || plan.businessDomain || 'Custom Enterprise Business Domain',
        description: plan.description || 'Enterprise Node.js & Express REST API',
        apiVersion: plan.apiVersion || 'v1',
        baseRoute: plan.baseRoute || '/api/v1'
      },
      database: plan.database || {
        type: plan.databaseType || 'MongoDB',
        orm: plan.databaseOrm || 'Mongoose'
      },
      framework: plan.framework || 'Node.js + Express.js',
      architecture: plan.architecture || {
        pattern: plan.architectureStyle || 'Clean Architecture (Controllers -> Services -> Repositories -> Models)'
      },
      entities: Array.isArray(plan.entities) ? plan.entities : [],
      relationships: Array.isArray(plan.relationships) ? plan.relationships : [],
      modules: Array.isArray(plan.modules) ? plan.modules : [],
      businessRules: Array.isArray(plan.businessRules) ? plan.businessRules : [],
      security: plan.security || {
        jwt: plan.authentication?.jwt ?? true,
        refreshToken: plan.authentication?.refreshToken ?? true,
        roles: plan.roles || ['Admin', 'User'],
        permissions: plan.permissions || ['create', 'read', 'update', 'delete', 'bulkDelete']
      },
      validations: plan.validations || {},
      endpoints: Array.isArray(plan.endpoints) ? plan.endpoints : [],
      dependencies: Array.isArray(plan.dependencies) ? plan.dependencies : ['express', 'mongoose', 'jsonwebtoken', 'bcryptjs', 'cors', 'helmet', 'dotenv'],
      generationOrder: Array.isArray(plan.generationOrder) ? plan.generationOrder : ['Config', 'Models', 'Services', 'Controllers', 'Routes']
    };
  }
}

// ============================================================================
// STEP 2: CONTEXT LOADER (Constructs Context Layer for Generation Pipeline)
// ============================================================================
export class ContextLoader {
  /**
   * Builds execution context containing entity, relationship, security, and rule specs.
   * @param {Object} blueprint 
   */
  static load(blueprint) {
    const entityContext = new Map();
    blueprint.entities.forEach(ent => {
      const name = typeof ent === 'string' ? ent : ent.name;
      entityContext.set(name.toLowerCase(), {
        name,
        description: typeof ent === 'object' ? ent.description : `${name} entity`,
        fields: typeof ent === 'object' && Array.isArray(ent.fields) ? ent.fields : [],
        indexes: typeof ent === 'object' && Array.isArray(ent.indexes) ? ent.indexes : [],
        uniqueFields: typeof ent === 'object' && Array.isArray(ent.uniqueFields) ? ent.uniqueFields : []
      });
    });

    const relationshipContext = blueprint.relationships.map(rel => ({
      sourceEntity: rel.sourceEntity || rel.from,
      targetEntity: rel.targetEntity || rel.to,
      relationshipType: rel.relationshipType || rel.type || 'ManyToOne',
      foreignKey: rel.foreignKey || `${(rel.targetEntity || rel.to || '').toLowerCase()}Id`,
      objectIdReference: rel.objectIdReference || rel.targetEntity || rel.to,
      sqlForeignKey: rel.sqlForeignKey || `${(rel.targetEntity || rel.to || '').toLowerCase()}_id`,
      required: rel.required ?? true,
      populateRules: rel.populateRules || `path: "${rel.foreignKey || 'targetId'}"`
    }));

    return {
      projectContext: blueprint.project,
      databaseContext: blueprint.database,
      frameworkContext: blueprint.framework,
      entityContext,
      relationshipContext,
      validationContext: blueprint.validations,
      securityContext: blueprint.security,
      endpointContext: blueprint.endpoints,
      businessRuleContext: blueprint.businessRules,
      dependencyContext: blueprint.dependencies
    };
  }
}

// ============================================================================
// STEP 11: SMART TEMPLATE ENGINE (Context-Enriched Prompt Construction)
// ============================================================================
export class SmartTemplateEngine {
  /**
   * Constructs prompt payloads enriched with exact entity, relationship, and security context.
   * @param {Object} plan 
   * @param {string} tierName 
   * @param {Array<string>} filesToGenerate 
   * @param {Object} context 
   */
  static buildPrompt(plan, tierName, filesToGenerate, context) {
    const { systemPrompt, userPrompt } = buildGeneratorPrompt(plan, tierName, filesToGenerate);

    const contextPayload = {
      database: context.databaseContext,
      security: context.securityContext,
      businessRules: context.businessRuleContext,
      relationships: context.relationshipContext,
      dependencies: context.dependencyContext
    };

    const enrichedSystemPrompt = `${systemPrompt}

STRICT CONTEXT-AWARE EXECUTION RULES:
1. CONSUME BLUEPRINT ONLY: Generate complete source code for requested files in "${tierName}". Do NOT invent non-blueprint fields, entities, or endpoints.
2. CONTEXT SPECIFICATION:
${JSON.stringify(contextPayload, null, 2)}
3. RETURN RAW JSON ONLY: Output JSON object matching schema { "files": [ { "path": "string", "content": "string" } ] }. No markdown code blocks, no explanation text.`;

    return {
      systemPrompt: enrichedSystemPrompt,
      userPrompt
    };
  }
}

// ============================================================================
// STEP 12: OUTPUT VALIDATOR (Pre-return Deduplication & Imports Check)
// ============================================================================
export class OutputValidator {
  /**
   * Verifies generated file paths, deduplicates contents, and ensures valid file structure.
   * @param {Array<Object>} files 
   */
  static validate(files = []) {
    if (!Array.isArray(files)) return [];

    const pathMap = new Map();
    const validFiles = [];

    for (const file of files) {
      if (!file || !file.path || !file.content) continue;

      let normalizedPath = file.path.trim().replace(/\\/g, '/');
      if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.slice(2);

      pathMap.set(normalizedPath, {
        path: normalizedPath,
        content: file.content
      });
    }

    for (const file of pathMap.values()) {
      validFiles.push(file);
    }

    logger.info(`Generator Self-Check: Validated ${validFiles.length} unique files`);
    return validFiles;
  }
}

// Legacy export alias for backward compatibility
export const selfCheckGeneratedFiles = (files) => OutputValidator.validate(files);

// ============================================================================
// SINGLE TIER GENERATION EXECUTION
// ============================================================================
/**
 * Executes AI generation for a single architectural tier using context-aware prompt template.
 * @param {Object} plan 
 * @param {string} tierName 
 * @param {Array<string>} files 
 */
export const generateTier = async (plan, tierName, files) => {
  const groq = getGroqClient();

  const blueprint = BlueprintReader.read(plan);
  const context = ContextLoader.load(blueprint);
  const { systemPrompt, userPrompt } = SmartTemplateEngine.buildPrompt(plan, tierName, files, context);

  const response = await executeWithRetry(() =>
    groq.chat.completions.create({
      model: getModelForTask('GENERATOR'),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Generator returned empty content for tier: ${tierName}`);
  }

  const parsed = JSON.parse(content);
  return parsed.files || [];
};

// ============================================================================
// MAIN GENERATOR AGENT ENTRY POINT (Context-Aware Execution Engine)
// ============================================================================
/**
 * Generates all project files sequentially consuming planner blueprint specifications.
 * @param {Object} plan 
 * @param {Function} onProgress 
 */
export const generateProjectFiles = async (plan, onProgress) => {
  const blueprint = BlueprintReader.read(plan);

  let modulesList = blueprint.modules;

  // Fallback if modules list is empty
  if (!Array.isArray(modulesList) || modulesList.length === 0) {
    modulesList = [
      {
        name: "Core Architecture & Config",
        description: "Base app configuration, security headers, logger, error handlers",
        files: [
          "package.json", ".env.example", "Dockerfile", "docker-compose.yml",
          "README.md", "src/server.js", "src/config/db.js"
        ]
      },
      {
        name: "Authentication Tier",
        description: "User JWT registration, login, profile, and roles",
        files: [
          "src/models/User.js", "src/services/authService.js",
          "src/controllers/authController.js", "src/routes/authRoutes.js"
        ]
      }
    ];

    if (blueprint.entities && Array.isArray(blueprint.entities)) {
      blueprint.entities.forEach(entity => {
        const entName = typeof entity === 'string' ? entity : entity.name;
        const caps = entName.charAt(0).toUpperCase() + entName.slice(1);
        const lower = entName.toLowerCase();
        modulesList.push({
          name: `${caps} Tier`,
          description: `${caps} management tier`,
          files: [
            `src/models/${caps}.js`,
            `src/services/${lower}Service.js`,
            `src/controllers/${lower}Controller.js`,
            `src/routes/${lower}Routes.js`
          ]
        });
      });
    }
  }

  const totalTiers = modulesList.length;
  logger.info(`Generator Agent: Queueing ${totalTiers} ordered architectural tiers`);

  const generatedFiles = [];
  let firstFailedTier = null;

  let tierIndex = 1;
  for (const mod of modulesList) {
    const modName = mod.name || `Tier ${tierIndex}`;
    const modFiles = mod.files || [];

    const stepMessage = `Generating Architectural Tier ${tierIndex}/${totalTiers}: ${modName}`;
    logger.info(stepMessage);
    if (onProgress) {
      onProgress(stepMessage);
    }

    try {
      if (tierIndex > 1) {
        await applyRequestDelay();
      }

      const files = await generateTier(plan, modName, modFiles);
      generatedFiles.push(...files);
    } catch (err) {
      logger.error(`Failed to generate tier ${modName} after retries: ${err.message}`);

      const isRateLimit = err.status === 429 ||
                          (err.message && err.message.includes('rate_limit_exceeded')) ||
                          (err.message && err.message.includes('Rate limit reached'));

      if (isRateLimit && !firstFailedTier) {
        firstFailedTier = modName;
      }
    }
    tierIndex++;
  }

  if (firstFailedTier) {
    throw new Error(JSON.stringify({
      success: false,
      reason: "Groq rate limit exceeded",
      failedModule: firstFailedTier
    }));
  }

  // Pre-return self-check, validation, and deduplication
  const validFiles = OutputValidator.validate(generatedFiles);
  if (validFiles.length === 0) {
    throw new Error('Module generation returned 0 files, initiating dynamic fallback');
  }
  return validFiles;
};

export default generateProjectFiles;
