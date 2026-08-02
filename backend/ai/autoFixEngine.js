import path from 'path';
import logger from '../utils/logger.js';
import { verifyProject } from './compileVerificationEngine.js';
import { getGroqClient, executeWithRetry, getModelForTask } from './groqClient.js';

/**
 * Common Node.js Built-in Modules
 */
const NODE_BUILTIN_MODULES = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'fs/promises',
  'http', 'http2', 'https', 'inspector', 'module', 'net', 'os', 'path',
  'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl',
  'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util',
  'v8', 'vm', 'wasi', 'worker_threads', 'zlib', 'node:test', 'node:assert'
]);

/**
 * Step 1: Error Diagnostics Parser
 * Parses compile verification & review reports and maps errors to affected files.
 */
export class ErrorDiagnosticsParser {
  /**
   * Parse compile & review reports into categorized diagnostics mapped by file path
   * @param {Object} compileReport 
   * @param {Object} reviewReport 
   * @returns {{ affectedFiles: Set<string>, errorMap: Map<string, Array<Object>> }}
   */
  static parseReports(compileReport = {}, reviewReport = {}) {
    const affectedFiles = new Set();
    const errorMap = new Map();

    const addError = (filePath, errorObj) => {
      if (!filePath) return;
      const normalizedPath = filePath.replace(/\\/g, '/');
      affectedFiles.add(normalizedPath);
      if (!errorMap.has(normalizedPath)) {
        errorMap.set(normalizedPath, []);
      }
      errorMap.get(normalizedPath).push(errorObj);
    };

    // Parse Compile Verification Errors
    const compileErrors = compileReport.errors || [];
    for (const err of compileErrors) {
      if (err.file) {
        addError(err.file, err);
      } else if (err.code === 'MISSING_PACKAGE_JSON') {
        addError('package.json', err);
      } else if (err.code === 'MISSING_ENV_EXAMPLE') {
        addError('.env.example', err);
      } else if (err.code === 'MISSING_SRC_DIR') {
        addError('src/server.js', err);
      } else {
        addError('package.json', err);
      }
    }

    // Parse Compile Verification Warnings for critical dependency / import issues
    const compileWarnings = compileReport.warnings || [];
    for (const warn of compileWarnings) {
      if (warn.code === 'MISSING_EXPORTED_SYMBOL' || warn.code === 'BROKEN_MODEL_REFERENCE' || warn.code === 'DUPLICATE_DEPENDENCY') {
        if (warn.file) addError(warn.file, warn);
      }
    }

    // Parse Review Service Warnings
    const reviewWarnings = reviewReport.warnings || [];
    for (const warnMsg of reviewWarnings) {
      if (typeof warnMsg === 'string') {
        if (warnMsg.includes('package.json')) addError('package.json', { code: 'MISSING_PACKAGE_JSON', message: warnMsg });
        if (warnMsg.includes('server.js')) addError('src/server.js', { code: 'MISSING_SERVER_JS', message: warnMsg });
      }
    }

    return { affectedFiles, errorMap };
  }
}

/**
 * Step 2 & 3: Context Aggregator
 */
export class RepairContextLoader {
  static loadContext(filePath, files = [], plan = {}, errors = []) {
    const fileObj = files.find(f => (f.path || '').replace(/\\/g, '/') === filePath);
    const existingContent = fileObj ? fileObj.content : '';

    return {
      filePath,
      existingContent,
      plan: {
        projectName: plan.projectName || 'Enterprise API',
        framework: plan.framework || 'Node.js + Express.js',
        database: plan.database || 'MongoDB',
        entities: plan.entities || []
      },
      errors
    };
  }
}

/**
 * Step 4 & 5: Targeted Repair Engine & Smart Merger
 */
export class TargetedRepairEngine {
  /**
   * Applies deterministic static repairs to target files
   */
  static applyStaticRepairs(files = [], affectedFiles = new Set(), errorMap = new Map(), plan = {}) {
    const updatedFiles = [...files];
    const fixedFiles = new Set();
    const fileMap = new Map(updatedFiles.map(f => [f.path.replace(/\\/g, '/'), f]));

    // Global Static Pass: Fix missing .js extension in relative ESM imports
    for (const f of updatedFiles) {
      if (f.path && f.path.endsWith('.js') && typeof f.content === 'string') {
        const fixedContent = f.content.replace(/from\s+['"](\.[^'"]+)['"]/g, (m, p1) => {
          if (!p1.endsWith('.js') && !p1.endsWith('.json')) {
            return `from '${p1}.js'`;
          }
          return m;
        });
        if (fixedContent !== f.content) {
          f.content = fixedContent;
          fixedFiles.add(f.path.replace(/\\/g, '/'));
          logger.info(`[AutoFixEngine] Fixed ESM relative import extensions in ${f.path}`);
        }
      }
    }

    for (const targetPath of affectedFiles) {
      const fileErrors = errorMap.get(targetPath) || [];
      let fileObj = fileMap.get(targetPath);

      // Fix 1: Missing package.json creation
      if (targetPath === 'package.json' && !fileObj) {
        const defaultPkg = {
          name: (plan.projectName || 'generated-api').toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          description: plan.description || 'Generated Enterprise API',
          main: 'src/server.js',
          type: 'module',
          scripts: {
            start: 'node src/server.js',
            dev: 'nodemon src/server.js'
          },
          dependencies: {
            express: '^4.19.2',
            dotenv: '^16.4.5',
            cors: '^2.8.5'
          }
        };
        fileObj = { path: 'package.json', content: JSON.stringify(defaultPkg, null, 2) };
        updatedFiles.push(fileObj);
        fileMap.set('package.json', fileObj);
        fixedFiles.add('package.json');
        logger.info('[AutoFixEngine] Created missing package.json manifest');
      }

      // Fix 2: Missing .env.example creation
      if (targetPath === '.env.example' && !fileObj) {
        const defaultEnv = 'PORT=5000\nNODE_ENV=development\nMONGO_URI=mongodb://localhost:27017/enterprise_db\nJWT_SECRET=your_jwt_secret_key';
        fileObj = { path: '.env.example', content: defaultEnv };
        updatedFiles.push(fileObj);
        fileMap.set('.env.example', fileObj);
        fixedFiles.add('.env.example');
        logger.info('[AutoFixEngine] Created missing .env.example template');
      }

      if (!fileObj || typeof fileObj.content !== 'string') continue;

      let content = fileObj.content;
      let modified = false;

      for (const err of fileErrors) {
        // Fix 3: Missing dependency in package.json
        if (err.code === 'MISSING_DEPENDENCY' && targetPath === 'package.json') {
          const match = /module "([^"]+)" is imported/.exec(err.message);
          if (match && match[1]) {
            const missingPkg = match[1];
            try {
              const pkgObj = JSON.parse(content);
              pkgObj.dependencies = pkgObj.dependencies || {};
              if (!pkgObj.dependencies[missingPkg]) {
                pkgObj.dependencies[missingPkg] = '^1.0.0';
                content = JSON.stringify(pkgObj, null, 2);
                modified = true;
                logger.info(`[AutoFixEngine] Added missing dependency "${missingPkg}" to package.json`);
              }
            } catch (e) {
              // json parse fail
            }
          }
        }

        // Fix 5: Broken import path resolution (e.g. controller importing non-existent service path)
        if (err.code === 'BROKEN_IMPORT_PATH') {
          const impMatch = /Broken import reference: "([^"]+)"/.exec(err.message);
          if (impMatch && impMatch[1]) {
            const brokenImp = impMatch[1];
            const baseName = path.posix.basename(brokenImp, '.js');
            // Search if target file exists elsewhere in workspace
            const foundFile = Array.from(fileMap.keys()).find(p => p.endsWith(`${baseName}.js`));
            if (foundFile) {
              const targetDir = path.posix.dirname(targetPath);
              let relativeFix = path.posix.relative(targetDir, foundFile);
              if (!relativeFix.startsWith('.')) relativeFix = './' + relativeFix;
              content = content.replace(new RegExp(brokenImp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), relativeFix);
              modified = true;
              logger.info(`[AutoFixEngine] Repaired broken import path in ${targetPath}: "${brokenImp}" -> "${relativeFix}"`);
            }
          }
        }

        // Fix 6: Missing exported symbol append stub
        if (err.code === 'MISSING_EXPORTED_SYMBOL') {
          const symMatch = /Imported symbol "([^"]+)"/.exec(err.message);
          if (symMatch && symMatch[1]) {
            const missingSymbol = symMatch[1];
            if (!content.includes(missingSymbol)) {
              content += `\n\nexport const ${missingSymbol} = async (req, res, next) => {\n  // Auto-Fix Engine: Generated missing method handler\n  if (res) return res.status(500).json({ success: false, message: "${missingSymbol} handler not implemented" });\n};\n`;
              modified = true;
              logger.info(`[AutoFixEngine] Appended missing exported symbol "${missingSymbol}" in ${targetPath}`);
            }
          }
        }

        // Fix 7: Broken Mongoose ref model name
        if (err.code === 'BROKEN_MODEL_REFERENCE') {
          const modelMatch = /ref to non-existent model: "([^"]+)"/.exec(err.message);
          if (modelMatch && modelMatch[1]) {
            const brokenModel = modelMatch[1];
            // Find valid registered model in workspace
            const registeredModel = Array.from(fileMap.keys())
              .filter(p => p.includes('/models/'))
              .map(p => path.posix.basename(p, '.js'))[0];

            if (registeredModel) {
              content = content.replace(new RegExp(`ref:\\s*['"]${brokenModel}['"]`, 'g'), `ref: '${registeredModel}'`);
              modified = true;
              logger.info(`[AutoFixEngine] Corrected invalid schema ref "${brokenModel}" -> "${registeredModel}" in ${targetPath}`);
            }
          }
        }

        // Fix 8: Create minimal missing Controller/Service/Model stub files if referenced by route/controller
        if (err.code === 'MISSING_CONTROLLER' || err.code === 'MISSING_SERVICE') {
          const refMatch = /references non-existent (?:Controller|Service) file: "([^"]+)"/.exec(err.message);
          if (refMatch && refMatch[1]) {
            const missingRelPath = refMatch[1];
            const targetDir = path.posix.dirname(targetPath);
            let absolutePath = path.posix.normalize(path.posix.join(targetDir, missingRelPath));
            if (!absolutePath.endsWith('.js')) absolutePath += '.js';

            if (!fileMap.has(absolutePath)) {
              const entityName = path.posix.basename(absolutePath, '.js').replace(/(Controller|Service)$/, '');
              const stubContent = `// Auto-Fix Engine Stub Generator\nexport const get${entityName}s = async (req, res) => {\n  res.status(200).json({ success: true, data: [] });\n};\n`;
              const newFileObj = { path: absolutePath, content: stubContent };
              updatedFiles.push(newFileObj);
              fileMap.set(absolutePath, newFileObj);
              fixedFiles.add(absolutePath);
              logger.info(`[AutoFixEngine] Created missing architectural layer file: ${absolutePath}`);
            }
          }
        }
      }

      if (modified) {
        fileObj.content = content;
        fixedFiles.add(targetPath);
      }
    }

    return { updatedFiles, fixedFiles };
  }

  /**
   * Applies AI-assisted targeted repair for complex code/syntax errors
   */
  static async applyAIRepair(fileObj, errors = [], context = {}) {
    logger.info(`[AutoFixEngine] Executing AI targeted repair on ${fileObj.path}...`);
    try {
      const groq = getGroqClient();
      const errorSummaries = errors.map(e => `- [${e.code || 'ERROR'}] ${e.message}`).join('\n');

      const systemPrompt = `You are a Senior Code Repair Engineer. Your job is to fix code errors in a single target file.
CRITICAL CONSTRAINTS:
1. Return ONLY the repaired code for the target file in a valid JSON object.
2. DO NOT change unchanged/working business logic or structure.
3. DO NOT alter comments or un-related logic.
4. Output JSON format: { "repairedContent": "..." }`;

      const userPrompt = `Target File Path: ${fileObj.path}
Framework: ${context.plan?.framework || 'Node.js Express'}
Database: ${context.plan?.database || 'MongoDB'}

Reported Errors for this file:
${errorSummaries}

Current File Content:
\`\`\`javascript
${fileObj.content}
\`\`\`

Provide the complete repaired code for this file.`;

      const response = await executeWithRetry(() =>
        groq.chat.completions.create({
          model: getModelForTask('GENERATOR'),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      );

      const resContent = response.choices[0]?.message?.content;
      if (resContent) {
        const parsed = JSON.parse(resContent);
        if (parsed && typeof parsed.repairedContent === 'string' && parsed.repairedContent.trim().length > 0) {
          logger.info(`[AutoFixEngine] AI targeted repair succeeded for ${fileObj.path}`);
          return parsed.repairedContent;
        }
      }
    } catch (err) {
      logger.warn(`[AutoFixEngine] AI targeted repair fallback notice for ${fileObj.path}: ${err.message}`);
    }

    return fileObj.content;
  }
}

/**
 * Step 6, 7 & 8: Main Engine Entrypoint, Retry Policy & Repair Report Generator
 */
export async function autoFixProject(plan = {}, files = [], compileReport = null, reviewReport = null, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const onProgress = options.onProgress || null;
  const skipNpmInstall = options.skipNpmInstall !== undefined ? options.skipNpmInstall : false;

  logger.info('[AutoFixEngine] Starting Enterprise Code Auto-Fix Pipeline...');
  if (onProgress) onProgress('AutoFix Engine: Initializing 3-Attempt Self-Healing Repair Pipeline...');

  let currentFiles = Array.isArray(files) ? [...files] : [];
  let currentCompileReport = compileReport;
  const fixedFilesSet = new Set();
  let attemptCount = 0;

  // Initial compile verification if report not provided
  if (!currentCompileReport || typeof currentCompileReport !== 'object') {
    logger.info('[AutoFixEngine] Running initial compile verification...');
    currentCompileReport = await verifyProject(currentFiles, { skipNpmInstall });
  }

  // Check if project already passes compile verification
  if (currentCompileReport && (currentCompileReport.status === 'PASS' || currentCompileReport.VERIFIED)) {
    logger.info('[AutoFixEngine] Project passed compile verification on initial check! Zero repairs needed.');
    return {
      status: 'SUCCESS',
      fixedFiles: [],
      remainingErrors: [],
      attempts: 0,
      summary: 'Project passed compile verification. No code repairs required.',
      files: currentFiles
    };
  }

  // Retry Policy Loop: Up to maxAttempts
  while (attemptCount < maxAttempts) {
    attemptCount++;
    logger.info(`[AutoFixEngine] --- Repair Attempt ${attemptCount}/${maxAttempts} ---`);
    if (onProgress) onProgress(`AutoFix Engine: Executing Repair Attempt ${attemptCount}/${maxAttempts}...`);

    // Step 1: Parse errors and identify affected files
    const { affectedFiles, errorMap } = ErrorDiagnosticsParser.parseReports(currentCompileReport, reviewReport || {});

    if (affectedFiles.size === 0) {
      logger.warn('[AutoFixEngine] No specific affected files identified from error diagnostics.');
      break;
    }

    logger.info(`[AutoFixEngine] Identified ${affectedFiles.size} affected files requiring repair: ${Array.from(affectedFiles).join(', ')}`);

    // Step 2 & 3: Apply deterministic static repairs
    const staticResult = TargetedRepairEngine.applyStaticRepairs(currentFiles, affectedFiles, errorMap, plan);
    currentFiles = staticResult.updatedFiles;
    staticResult.fixedFiles.forEach(f => fixedFilesSet.add(f));

    // Step 4: For files still having unresolved complex errors, apply AI targeted repair
    for (const targetPath of affectedFiles) {
      const fileErrors = errorMap.get(targetPath) || [];
      const hasComplexError = fileErrors.some(e => e.code === 'SYNTAX_ERROR' || e.code === 'BUILD_SCRIPT_FAILED' || e.code === 'MALFORMED_PACKAGE_JSON');

      if (hasComplexError) {
        const fileObj = currentFiles.find(f => (f.path || '').replace(/\\/g, '/') === targetPath);
        if (fileObj) {
          const context = RepairContextLoader.loadContext(targetPath, currentFiles, plan, fileErrors);
          const repairedContent = await TargetedRepairEngine.applyAIRepair(fileObj, fileErrors, context);
          if (repairedContent !== fileObj.content) {
            fileObj.content = repairedContent;
            fixedFilesSet.add(targetPath);
          }
        }
      }
    }

    // Step 6: Re-run Compile Verification
    logger.info(`[AutoFixEngine] Re-verifying project state after repair attempt ${attemptCount}...`);
    currentCompileReport = await verifyProject(currentFiles, { skipNpmInstall });

    if (currentCompileReport.status === 'PASS' || currentCompileReport.VERIFIED) {
      logger.info(`[AutoFixEngine] Repair successful on attempt ${attemptCount}! All compile checks passed.`);
      if (onProgress) onProgress(`AutoFix Engine: Repairs Successful on Attempt ${attemptCount}! Verified PASS.`);
      
      return {
        status: 'SUCCESS',
        fixedFiles: Array.from(fixedFilesSet),
        remainingErrors: [],
        attempts: attemptCount,
        summary: `Successfully repaired ${fixedFilesSet.size} file(s) in ${attemptCount} attempt(s). Project verified PASS.`,
        files: currentFiles
      };
    }
  }

  // Max attempts reached or verification still failing
  const isPassed = currentCompileReport && (currentCompileReport.status === 'PASS' || currentCompileReport.VERIFIED);
  const remainingErrors = currentCompileReport ? (currentCompileReport.errors || []) : [];

  logger.warn(`[AutoFixEngine] Repair pipeline concluded after ${attemptCount} attempts. Status: ${isPassed ? 'SUCCESS' : 'FAILED'}`);

  return {
    status: isPassed ? 'SUCCESS' : 'FAILED',
    fixedFiles: Array.from(fixedFilesSet),
    remainingErrors,
    attempts: attemptCount,
    summary: isPassed 
      ? `Successfully repaired project in ${attemptCount} attempt(s).` 
      : `AutoFix Engine completed ${attemptCount} attempt(s) with ${remainingErrors.length} remaining error(s).`,
    files: currentFiles
  };
}

export default autoFixProject;
