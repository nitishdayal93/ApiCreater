import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync } from 'child_process';
import util from 'util';
import vm from 'vm';
import logger from '../utils/logger.js';

const execPromise = util.promisify(exec);

/**
 * Node.js Built-in Core Modules (to exclude from missing dependency checks)
 */
const NODE_BUILTIN_MODULES = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'fs/promises',
  'http', 'http2', 'https', 'inspector', 'module', 'net', 'os', 'path',
  'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl',
  'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'dgram', 'url',
  'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib', 'node:test', 'node:assert'
]);

/**
 * Step 1: Workspace & File System Isolator
 */
export class TempWorkspaceManager {
  /**
   * Creates an isolated workspace and populates it with project files.
   * @param {Array<{path: string, content: string}>} files 
   * @returns {Promise<{tempDir: string, cleanup: Function}>}
   */
  static async createWorkspace(files = []) {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'compile-verify-'));
    logger.info(`[CompileVerificationEngine] Created temporary workspace: ${tempDir}`);

    for (const file of files) {
      if (!file || typeof file.path !== 'string') continue;
      const normalizedPath = file.path.replace(/\\/g, '/');
      const absoluteFilePath = path.join(tempDir, normalizedPath);
      const fileDir = path.dirname(absoluteFilePath);

      await fs.promises.mkdir(fileDir, { recursive: true });
      await fs.promises.writeFile(absoluteFilePath, file.content || '', 'utf-8');
    }

    const cleanup = async () => {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        logger.info(`[CompileVerificationEngine] Cleaned up temp workspace: ${tempDir}`);
      } catch (err) {
        logger.warn(`[CompileVerificationEngine] Cleanup warning for ${tempDir}: ${err.message}`);
      }
    };

    return { tempDir, cleanup };
  }
}

/**
 * Step 2: Project Structure Verifier
 */
export class StructureVerifier {
  static verify(files = []) {
    const errors = [];
    const warnings = [];
    const filePaths = files.map(f => (f.path || '').replace(/\\/g, '/'));

    // Check package.json
    if (!filePaths.includes('package.json')) {
      errors.push({
        step: 'STRUCTURE',
        file: 'package.json',
        message: 'Missing mandatory manifest file: package.json',
        code: 'MISSING_PACKAGE_JSON'
      });
    }

    // Check .env.example or .env
    if (!filePaths.some(p => p === '.env.example' || p === '.env')) {
      warnings.push({
        step: 'STRUCTURE',
        file: '.env.example',
        message: 'Missing environment template file: .env.example',
        code: 'MISSING_ENV_EXAMPLE'
      });
    }

    // Check src/ folder or root JS server file
    const hasSrcFolder = filePaths.some(p => p.startsWith('src/'));
    const hasRootEntry = filePaths.some(p => p === 'server.js' || p === 'app.js' || p === 'index.js');
    
    if (!hasSrcFolder && !hasRootEntry) {
      errors.push({
        step: 'STRUCTURE',
        file: 'src/',
        message: 'Missing source directory (src/) or root server entry file (server.js/app.js)',
        code: 'MISSING_SRC_DIR'
      });
    }

    // Check configuration files presence
    const hasConfig = filePaths.some(p => p.includes('config/') || p.includes('database') || p.includes('db'));
    if (!hasConfig) {
      warnings.push({
        step: 'STRUCTURE',
        file: 'src/config/',
        message: 'No explicit database/application configuration file detected.',
        code: 'MISSING_CONFIG_FILES'
      });
    }

    return { errors, warnings };
  }
}

/**
 * Step 3 & 4: Dependency Installer & Compilation Verifier
 */
export class DependencyAndBuildVerifier {
  /**
   * Run npm install in temporary workspace
   */
  static async verifyNpmInstall(tempDir, timeoutMs = 25000) {
    const errors = [];
    const warnings = [];

    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';

    try {
      logger.info(`[CompileVerificationEngine] Running dependency installation check in ${tempDir}...`);
      const { stderr } = await execPromise(`${npmCmd} install --no-audit --no-fund --package-lock=false`, {
        cwd: tempDir,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      });

      if (stderr && stderr.toLowerCase().includes('err!')) {
        errors.push({
          step: 'INSTALL',
          file: 'package.json',
          message: `npm install failure: ${stderr.split('\n')[0]}`,
          code: 'NPM_INSTALL_ERROR',
          details: { stderr }
        });
      }
    } catch (err) {
      if (err.killed) {
        warnings.push({
          step: 'INSTALL',
          file: 'package.json',
          message: `npm install timed out after ${timeoutMs}ms.`,
          code: 'NPM_INSTALL_TIMEOUT'
        });
      } else {
        // npm install might fail if no internet or invalid package version
        errors.push({
          step: 'INSTALL',
          file: 'package.json',
          message: `npm install failed: ${err.message}`,
          code: 'NPM_INSTALL_FAILED',
          details: { error: err.message, stderr: err.stderr }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Run npm run build (if present) and syntax check JS files
   */
  static async verifyCompilation(tempDir, files = []) {
    const errors = [];
    const warnings = [];

    // Read package.json to check for build script
    const pkgPath = path.join(tempDir, 'package.json');
    let pkg = {};
    if (fs.existsSync(pkgPath)) {
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      } catch (e) {
        errors.push({
          step: 'COMPILE',
          file: 'package.json',
          message: `Invalid JSON format in package.json: ${e.message}`,
          code: 'MALFORMED_PACKAGE_JSON'
        });
      }
    }

    // Run build script if available
    if (pkg.scripts && pkg.scripts.build) {
      const isWindows = process.platform === 'win32';
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      try {
        logger.info(`[CompileVerificationEngine] Executing npm run build...`);
        await execPromise(`${npmCmd} run build`, { cwd: tempDir, timeout: 20000 });
      } catch (err) {
        errors.push({
          step: 'COMPILE',
          file: 'package.json',
          message: `Build script 'npm run build' failed: ${err.message}`,
          code: 'BUILD_SCRIPT_FAILED',
          details: { stderr: err.stderr }
        });
      }
    }

    // Perform static syntax verification on all JS files
    const jsFiles = files.filter(f => f.path && (f.path.endsWith('.js') || f.path.endsWith('.mjs') || f.path.endsWith('.cjs')));
    
    for (const file of jsFiles) {
      const absolutePath = path.join(tempDir, file.path);
      const syntaxResult = DependencyAndBuildVerifier.checkFileSyntax(absolutePath, file.content);
      if (!syntaxResult.valid) {
        errors.push({
          step: 'COMPILE',
          file: file.path,
          message: `Syntax error: ${syntaxResult.error}`,
          code: 'SYNTAX_ERROR',
          details: { line: syntaxResult.line, column: syntaxResult.column }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Check syntax of a JS file using node --check or VM script parsing
   */
  static checkFileSyntax(filePath, content = '') {
    if (fs.existsSync(filePath)) {
      try {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        return { valid: true };
      } catch (err) {
        const errMsg = err.stderr ? err.stderr.toString() : err.message;
        return { valid: false, error: errMsg };
      }
    }

    // Fallback: Test parse with vm script
    try {
      new vm.Script(content, { filename: filePath });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message, line: err.stack ? err.stack.split('\n')[0] : null };
    }
  }
}

/**
 * Step 5 & 6: Static Dependency & Import/Export Verifier
 */
export class StaticAnalyzer {
  /**
   * Verify package dependencies against imported modules
   */
  static verifyDependencies(files = []) {
    const errors = [];
    const warnings = [];

    const pkgFile = files.find(f => f.path === 'package.json');
    if (!pkgFile) return { errors, warnings };

    let pkg = {};
    try {
      pkg = JSON.parse(pkgFile.content);
    } catch (e) {
      return { errors, warnings };
    }

    const declaredDeps = new Set(Object.keys(pkg.dependencies || {}));
    const declaredDevDeps = new Set(Object.keys(pkg.devDependencies || {}));
    const allDeclared = new Set([...declaredDeps, ...declaredDevDeps]);

    // Check duplicate dependencies between dependencies and devDependencies
    for (const dep of declaredDeps) {
      if (declaredDevDeps.has(dep)) {
        warnings.push({
          step: 'DEPENDENCY',
          file: 'package.json',
          message: `Duplicate dependency found in both dependencies and devDependencies: "${dep}"`,
          code: 'DUPLICATE_DEPENDENCY'
        });
      }
    }

    // Check invalid version formats
    const allDepEntries = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const [depName, ver] of Object.entries(allDepEntries)) {
      if (!ver || typeof ver !== 'string' || ver.trim() === '') {
        errors.push({
          step: 'DEPENDENCY',
          file: 'package.json',
          message: `Invalid or empty version declared for dependency: "${depName}"`,
          code: 'INVALID_DEPENDENCY_VERSION'
        });
      }
    }

    // Extract all third-party package imports from source code files
    const importedPackages = new Set();
    const jsFiles = files.filter(f => f.path && f.path.endsWith('.js'));

    for (const file of jsFiles) {
      const imports = StaticAnalyzer.extractImports(file.content);
      for (const imp of imports) {
        if (!imp.startsWith('.') && !imp.startsWith('/') && !imp.startsWith('@/')) {
          // It's a package import, e.g. "express", "mongoose", "lodash/get"
          const pkgName = imp.startsWith('@') ? imp.split('/').slice(0, 2).join('/') : imp.split('/')[0];
          if (!NODE_BUILTIN_MODULES.has(pkgName)) {
            importedPackages.add(pkgName);
          }
        }
      }
    }

    // Check for missing dependencies
    for (const impPkg of importedPackages) {
      if (!allDeclared.has(impPkg)) {
        errors.push({
          step: 'DEPENDENCY',
          file: 'package.json',
          message: `Missing dependency in package.json: module "${impPkg}" is imported in code but not declared in dependencies.`,
          code: 'MISSING_DEPENDENCY'
        });
      }
    }

    // Check for unused dependencies
    for (const dep of declaredDeps) {
      if (!importedPackages.has(dep) && !['nodemon', 'dotenv', 'cors', 'helmet', 'morgan', 'compression'].includes(dep)) {
        warnings.push({
          step: 'DEPENDENCY',
          file: 'package.json',
          message: `Unused dependency detected in package.json: "${dep}" is declared but never imported.`,
          code: 'UNUSED_DEPENDENCY'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Extract import/require paths from file content
   */
  static extractImports(content = '') {
    const importPaths = [];
    // Matches import ... from 'path' or import 'path'
    const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    // Matches require('path')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      importPaths.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      importPaths.push(match[1]);
    }

    return importPaths;
  }

  /**
   * Step 6: Verify internal relative imports and exports existence
   */
  static verifyImports(files = []) {
    const errors = [];
    const warnings = [];

    const fileMap = new Map();
    files.forEach(f => fileMap.set((f.path || '').replace(/\\/g, '/'), f));

    const jsFiles = files.filter(f => f.path && f.path.endsWith('.js'));

    for (const sourceFile of jsFiles) {
      const sourcePath = sourceFile.path.replace(/\\/g, '/');
      const sourceDir = path.posix.dirname(sourcePath);
      const imports = StaticAnalyzer.extractImportDetails(sourceFile.content);

      for (const imp of imports) {
        if (imp.modulePath.startsWith('.')) {
          // Resolve relative path
          let resolvedPath = path.posix.normalize(path.posix.join(sourceDir, imp.modulePath));

          // Try resolving extensions
          let targetFile = fileMap.get(resolvedPath);
          if (!targetFile && !resolvedPath.endsWith('.js')) {
            if (fileMap.get(resolvedPath + '.js')) {
              targetFile = fileMap.get(resolvedPath + '.js');
              resolvedPath = resolvedPath + '.js';
            } else if (fileMap.get(path.posix.join(resolvedPath, 'index.js'))) {
              targetFile = fileMap.get(path.posix.join(resolvedPath, 'index.js'));
              resolvedPath = path.posix.join(resolvedPath, 'index.js');
            }
          }

          if (!targetFile) {
            errors.push({
              step: 'IMPORT',
              file: sourcePath,
              message: `Broken import reference: "${imp.modulePath}" in ${sourcePath} target file does not exist.`,
              code: 'BROKEN_IMPORT_PATH'
            });
            continue;
          }

          // Verify imported symbols exist in target file
          if (imp.namedImports && imp.namedImports.length > 0) {
            const targetContent = targetFile.content || '';
            for (const symbol of imp.namedImports) {
              const exportPattern = new RegExp(`export\\s+(?:const|let|var|function|class|async\\s+function)\\s+${symbol}\\b|export\\s*\\{[^}]*\\b${symbol}\\b|exports\\.${symbol}\\b|module\\.exports\\.${symbol}\\b`, 'm');
              if (!exportPattern.test(targetContent)) {
                warnings.push({
                  step: 'IMPORT',
                  file: sourcePath,
                  message: `Imported symbol "${symbol}" from "${imp.modulePath}" was not found in target file ${targetFile.path}.`,
                  code: 'MISSING_EXPORTED_SYMBOL'
                });
              }
            }
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Extract import details including named imports
   */
  static extractImportDetails(content = '') {
    const results = [];
    
    // Named import: import { a, b as c } from './module.js'
    const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = namedImportRegex.exec(content)) !== null) {
      const symbols = match[1].split(',').map(s => {
        const parts = s.trim().split(/\s+as\s+/);
        return parts[0].trim();
      }).filter(Boolean);
      results.push({ modulePath: match[2], namedImports: symbols, isDefault: false });
    }

    // Default import: import User from './models/User.js'
    const defaultImportRegex = /import\s+([A-Za-z0-9_$]+)\s+from\s*['"]([^'"]+)['"]/g;
    while ((match = defaultImportRegex.exec(content)) !== null) {
      if (match[1] !== 'type' && match[1] !== '{') {
        results.push({ modulePath: match[2], defaultImport: match[1], isDefault: true });
      }
    }

    return results;
  }
}

/**
 * Step 7: Architectural Route Verification
 */
export class RouteChainVerifier {
  /**
   * Ensures Route -> Controller -> Service -> Repository -> Model chain is intact
   */
  static verifyRouteChain(files = []) {
    const errors = [];
    const warnings = [];

    const filePaths = files.map(f => (f.path || '').replace(/\\/g, '/'));
    const routeFiles = files.filter(f => f.path && (f.path.includes('/routes/') || f.path.includes('routes.js')));

    if (routeFiles.length === 0) {
      warnings.push({
        step: 'ROUTE',
        file: 'src/routes/',
        message: 'No route definition files detected in project.',
        code: 'NO_ROUTES_FOUND'
      });
      return { errors, warnings };
    }

    const controllerFiles = filePaths.filter(p => p.includes('/controllers/'));
    const serviceFiles = filePaths.filter(p => p.includes('/services/'));
    const repositoryFiles = filePaths.filter(p => p.includes('/repositories/'));
    const modelFiles = filePaths.filter(p => p.includes('/models/'));

    for (const routeFile of routeFiles) {
      const routeContent = routeFile.content || '';
      
      // Check if controllers are referenced and exist
      const controllerImports = StaticAnalyzer.extractImportDetails(routeContent)
        .filter(i => i.modulePath.includes('controller'));

      if (controllerImports.length === 0 && controllerFiles.length > 0) {
        warnings.push({
          step: 'ROUTE',
          file: routeFile.path,
          message: `Route file ${routeFile.path} does not import any controller.`,
          code: 'ROUTE_WITHOUT_CONTROLLER'
        });
      }

      for (const ctrlImp of controllerImports) {
        const targetPath = path.posix.normalize(path.posix.join(path.posix.dirname(routeFile.path), ctrlImp.modulePath));
        const matchedCtrl = filePaths.find(p => p.startsWith(targetPath) || p.startsWith(targetPath + '.js'));

        if (!matchedCtrl) {
          errors.push({
            step: 'ROUTE',
            file: routeFile.path,
            message: `Route references non-existent Controller file: "${ctrlImp.modulePath}"`,
            code: 'MISSING_CONTROLLER'
          });
          continue;
        }

        // Trace Controller -> Service
        const ctrlFileObj = files.find(f => f.path.replace(/\\/g, '/') === matchedCtrl);
        if (ctrlFileObj) {
          const ctrlContent = ctrlFileObj.content || '';
          const serviceImports = StaticAnalyzer.extractImportDetails(ctrlContent)
            .filter(i => i.modulePath.includes('service'));

          for (const srvImp of serviceImports) {
            const srvPath = path.posix.normalize(path.posix.join(path.posix.dirname(matchedCtrl), srvImp.modulePath));
            const matchedSrv = filePaths.find(p => p.startsWith(srvPath) || p.startsWith(srvPath + '.js'));

            if (!matchedSrv && serviceFiles.length > 0) {
              errors.push({
                step: 'ROUTE',
                file: matchedCtrl,
                message: `Controller ${matchedCtrl} references non-existent Service file: "${srvImp.modulePath}"`,
                code: 'MISSING_SERVICE'
              });
              continue;
            }

            // Trace Service -> Repository / Model
            const srvFileObj = files.find(f => f.path.replace(/\\/g, '/') === matchedSrv);
            if (srvFileObj) {
              const srvContent = srvFileObj.content || '';
              const repoImports = StaticAnalyzer.extractImportDetails(srvContent)
                .filter(i => i.modulePath.includes('repository') || i.modulePath.includes('model'));

              for (const repoImp of repoImports) {
                const repoPath = path.posix.normalize(path.posix.join(path.posix.dirname(matchedSrv), repoImp.modulePath));
                const matchedRepo = filePaths.find(p => p.startsWith(repoPath) || p.startsWith(repoPath + '.js'));

                if (!matchedRepo && (repositoryFiles.length > 0 || modelFiles.length > 0)) {
                  errors.push({
                    step: 'ROUTE',
                    file: matchedSrv,
                    message: `Service ${matchedSrv} references non-existent Repository/Model file: "${repoImp.modulePath}"`,
                    code: 'MISSING_REPOSITORY_OR_MODEL'
                  });
                }
              }
            }
          }
        }
      }
    }

    return { errors, warnings };
  }
}

/**
 * Step 8: Database & Schema Verifier
 */
export class DatabaseVerifier {
  /**
   * Validates MongoDB models, schemas, ref targets, indexes, and SQL foreign keys/relations
   */
  static verifyDatabase(files = []) {
    const errors = [];
    const warnings = [];

    const modelFiles = files.filter(f => f.path && (f.path.includes('/models/') || f.path.endsWith('Model.js')));
    const registeredModelNames = new Set();

    // Extract registered model names
    for (const mFile of modelFiles) {
      const baseName = path.basename(mFile.path, '.js');
      registeredModelNames.add(baseName);
      
      // Match mongoose.model('ModelName', ...)
      const mongooseModelMatch = /mongoose\.model\s*\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = mongooseModelMatch.exec(mFile.content || '')) !== null) {
        registeredModelNames.add(match[1]);
      }
    }

    // Verify MongoDB/Mongoose Schemas
    for (const mFile of modelFiles) {
      const content = mFile.content || '';

      // Check Schema definition
      if (!content.includes('Schema') && !content.includes('mongoose') && !content.includes('sequelize') && !content.includes('prisma')) {
        warnings.push({
          step: 'DATABASE',
          file: mFile.path,
          message: `Model file ${mFile.path} does not contain standard ORM/ODM Schema definition.`,
          code: 'UNRECOGNIZED_MODEL_SCHEMA'
        });
      }

      // Check ref: 'ModelName' targets in Mongoose Schemas
      const refRegex = /ref:\s*['"]([^'"]+)['"]/g;
      let refMatch;
      while ((refMatch = refRegex.exec(content)) !== null) {
        const targetModel = refMatch[1];
        if (!registeredModelNames.has(targetModel)) {
          errors.push({
            step: 'DATABASE',
            file: mFile.path,
            message: `Mongoose Schema in ${mFile.path} contains ref to non-existent model: "${targetModel}"`,
            code: 'BROKEN_MODEL_REFERENCE'
          });
        }
      }

      // Check SQL Foreign Key references: references: { model: 'TableName', key: 'id' }
      const sqlRefRegex = /references:\s*\{\s*model:\s*['"]([^'"]+)['"]/g;
      let sqlMatch;
      while ((sqlMatch = sqlRefRegex.exec(content)) !== null) {
        const targetTable = sqlMatch[1];
        if (!registeredModelNames.has(targetTable) && !registeredModelNames.has(targetTable.slice(0, -1))) {
          warnings.push({
            step: 'DATABASE',
            file: mFile.path,
            message: `SQL foreign key reference target model/table "${targetTable}" in ${mFile.path} may be missing.`,
            code: 'MISSING_FOREIGN_KEY_TARGET'
          });
        }
      }
    }

    return { errors, warnings };
  }
}

/**
 * Step 9: Swagger & OpenAPI Specification Verifier
 */
export class SwaggerVerifier {
  static verifySwagger(files = []) {
    const errors = [];
    const warnings = [];

    const swaggerFiles = files.filter(f => f.path && (f.path.includes('swagger') || f.path.includes('openapi')));

    for (const sFile of swaggerFiles) {
      const content = sFile.content || '';

      // Check if file contains paths object or JSON
      let specObj = null;
      if (sFile.path.endsWith('.json')) {
        try {
          specObj = JSON.parse(content);
        } catch (e) {
          errors.push({
            step: 'SWAGGER',
            file: sFile.path,
            message: `Invalid Swagger JSON format: ${e.message}`,
            code: 'INVALID_SWAGGER_JSON'
          });
          continue;
        }
      }

      if (specObj && specObj.paths) {
        const paths = Object.keys(specObj.paths);
        const endpointSet = new Set();

        for (const p of paths) {
          if (!p.startsWith('/')) {
            errors.push({
              step: 'SWAGGER',
              file: sFile.path,
              message: `Swagger path must start with '/': "${p}"`,
              code: 'INVALID_SWAGGER_PATH'
            });
          }

          const methods = Object.keys(specObj.paths[p]);
          for (const m of methods) {
            const key = `${m.toUpperCase()} ${p}`;
            if (endpointSet.has(key)) {
              errors.push({
                step: 'SWAGGER',
                file: sFile.path,
                message: `Duplicate Swagger endpoint declaration: ${key}`,
                code: 'DUPLICATE_SWAGGER_ENDPOINT'
              });
            }
            endpointSet.add(key);
          }
        }

        // Verify $ref targets in components/schemas
        const specString = JSON.stringify(specObj);
        const refRegex = /"\$ref":\s*"#\/components\/schemas\/([^"]+)"/g;
        const declaredSchemas = new Set(Object.keys((specObj.components && specObj.components.schemas) || {}));

        let refMatch;
        while ((refMatch = refRegex.exec(specString)) !== null) {
          const schemaTarget = refMatch[1];
          if (!declaredSchemas.has(schemaTarget)) {
            errors.push({
              step: 'SWAGGER',
              file: sFile.path,
              message: `Swagger specification references missing component schema: "${schemaTarget}"`,
              code: 'MISSING_SWAGGER_SCHEMA'
            });
          }
        }
      }
    }

    return { errors, warnings };
  }
}

/**
 * Step 10, 11, 12: Main Engine Entrypoint & Report Generator
 */
export async function verifyProject(projectPayload = {}, options = {}) {
  const startTime = Date.now();
  logger.info('[CompileVerificationEngine] Starting project compile verification pipeline...');

  // Normalize project input payload
  const files = Array.isArray(projectPayload) 
    ? projectPayload 
    : (projectPayload.files || projectPayload.projectFiles || []);

  const timeoutMs = options.timeoutMs || 25000;
  const skipNpmInstall = options.skipNpmInstall !== undefined ? options.skipNpmInstall : false;

  const errors = [];
  const warnings = [];
  const verifiedFiles = files.map(f => f.path).filter(Boolean);

  // Step 1: Create isolated temporary workspace
  let tempWorkspace = null;
  try {
    tempWorkspace = await TempWorkspaceManager.createWorkspace(files);
    const { tempDir } = tempWorkspace;

    // Step 2: Structure verification
    const structRes = StructureVerifier.verify(files);
    errors.push(...structRes.errors);
    warnings.push(...structRes.warnings);

    // Step 3: Dependency installation check
    if (!skipNpmInstall) {
      const installRes = await DependencyAndBuildVerifier.verifyNpmInstall(tempDir, timeoutMs);
      errors.push(...installRes.errors);
      warnings.push(...installRes.warnings);
    }

    // Step 4: Compile / Syntax verification
    const compileRes = await DependencyAndBuildVerifier.verifyCompilation(tempDir, files);
    errors.push(...compileRes.errors);
    warnings.push(...compileRes.warnings);

    // Step 5: Static dependency check
    const depRes = StaticAnalyzer.verifyDependencies(files);
    errors.push(...depRes.errors);
    warnings.push(...depRes.warnings);

    // Step 6: Import & export verification
    const importRes = StaticAnalyzer.verifyImports(files);
    errors.push(...importRes.errors);
    warnings.push(...importRes.warnings);

    // Step 7: Route chain verification
    const routeRes = RouteChainVerifier.verifyRouteChain(files);
    errors.push(...routeRes.errors);
    warnings.push(...routeRes.warnings);

    // Step 8: Database & model schema verification
    const dbRes = DatabaseVerifier.verifyDatabase(files);
    errors.push(...dbRes.errors);
    warnings.push(...dbRes.warnings);

    // Step 9: Swagger verification
    const swaggerRes = SwaggerVerifier.verifySwagger(files);
    errors.push(...swaggerRes.errors);
    warnings.push(...swaggerRes.warnings);

  } catch (pipelineErr) {
    logger.error(`[CompileVerificationEngine] Verification pipeline exception: ${pipelineErr.message}`);
    errors.push({
      step: 'PIPELINE',
      file: 'workspace',
      message: `Fatal engine exception: ${pipelineErr.message}`,
      code: 'FATAL_ENGINE_ERROR'
    });
  } finally {
    if (tempWorkspace && typeof tempWorkspace.cleanup === 'function') {
      await tempWorkspace.cleanup();
    }
  }

  const elapsedMs = Date.now() - startTime;
  const isRunnable = errors.length === 0;
  const status = isRunnable ? 'PASS' : 'FAIL';

  logger.info(`[CompileVerificationEngine] Verification complete in ${elapsedMs}ms. Status: ${status} (Errors: ${errors.length}, Warnings: ${warnings.length})`);

  const report = {
    status,
    VERIFIED: isRunnable,
    errors,
    warnings,
    verifiedFiles,
    compileTime: `${elapsedMs}ms`,
    summary: {
      totalFiles: files.length,
      verifiedSteps: 9,
      errorCount: errors.length,
      warningCount: warnings.length,
      isRunnable
    }
  };

  return report;
}

export default verifyProject;
