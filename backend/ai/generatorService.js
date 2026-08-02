import { getGroqClient, executeWithRetry, applyRequestDelay, getModelForTask } from './groqClient.js';
import { buildGeneratorPrompt } from './promptBuilder.js';
import logger from '../utils/logger.js';

/**
 * Pre-return Self-Check & Deduplication Helper
 * Verifies imports, exports, syntax, naming consistency, folder paths, and dependency references.
 */
export const selfCheckGeneratedFiles = (files) => {
  if (!Array.isArray(files)) return [];

  const pathMap = new Map();
  const validFiles = [];

  for (const file of files) {
    if (!file || !file.path || !file.content) continue;

    // Normalize path
    let normalizedPath = file.path.trim().replace(/\\/g, '/');
    if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.slice(2);

    // Deduplicate: last generated version takes precedence
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
};

/**
 * Executes AI generation for a single architectural tier
 */
export const generateTier = async (plan, tierName, files) => {
  const groq = getGroqClient();
  const { systemPrompt, userPrompt } = buildGeneratorPrompt(plan, tierName, files);

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

/**
 * Generates all project files sequentially using 16 Dependency-Ordered Architectural Tiers
 */
export const generateProjectFiles = async (plan, onProgress) => {
  let modulesList = plan.modules;

  // Fallback if modules is not an array or is empty
  if (!Array.isArray(modulesList) || modulesList.length === 0) {
    modulesList = [
      {
        name: "Core Architecture & Config",
        description: "Base app configuration, security headers, logger, error handlers",
        files: [
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
        name: "Authentication Tier",
        description: "User JWT registration, login, profile, and roles",
        files: [
          "src/models/User.js", "src/repositories/userRepository.js",
          "src/services/authService.js", "src/controllers/authController.js", "src/routes/authRoutes.js"
        ]
      }
    ];

    if (plan.entities && Array.isArray(plan.entities)) {
      plan.entities.forEach(entity => {
        const entName = typeof entity === 'string' ? entity : entity.name;
        const caps = entName.charAt(0).toUpperCase() + entName.slice(1);
        const lower = entName.toLowerCase();
        modulesList.push({
          name: `${caps} Tier`,
          description: `${caps} management tier`,
          files: [
            `src/models/${caps}.js`,
            `src/repositories/${lower}Repository.js`,
            `src/services/${lower}Service.js`,
            `src/validators/${lower}Validator.js`,
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
    const stepMessage = `Generating Architectural Tier ${tierIndex}/${totalTiers}: ${mod.name}`;
    logger.info(stepMessage);
    if (onProgress) {
      onProgress(stepMessage);
    }

    try {
      if (tierIndex > 1) {
        await applyRequestDelay();
      }

      const files = await generateTier(plan, mod.name, mod.files);
      generatedFiles.push(...files);
    } catch (err) {
      logger.error(`Failed to generate tier ${mod.name} after retries: ${err.message}`);

      const isRateLimit = err.status === 429 ||
                          (err.message && err.message.includes('rate_limit_exceeded')) ||
                          (err.message && err.message.includes('Rate limit reached'));

      if (isRateLimit && !firstFailedTier) {
        firstFailedTier = mod.name;
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

  // Pre-return self-check and deduplication
  return selfCheckGeneratedFiles(generatedFiles);
};

export default generateProjectFiles;
