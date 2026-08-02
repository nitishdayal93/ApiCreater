import archiver from 'archiver';
import logger from '../utils/logger.js';

/**
 * Pre-Packaging Validation & UTF-8 Line Ending Normalizer
 */
export const validateAndNormalizeFiles = (files = []) => {
  if (!Array.isArray(files)) {
    logger.error('ZIP Packaging Engine: Files payload must be an array.');
    return { normalizedFiles: [], folderCount: 0, warnings: ['Invalid files array payload.'], errors: ['Payload is not an array.'] };
  }

  const pathMap = new Map();
  const folders = new Set();
  const warnings = [];
  const errors = [];

  for (const file of files) {
    if (!file || typeof file !== 'object') {
      warnings.push('Encountered non-object file entry in packaging payload.');
      continue;
    }

    if (!file.path || typeof file.path !== 'string') {
      warnings.push('File entry missing valid path string.');
      continue;
    }

    let normalizedPath = file.path.trim().replace(/\\/g, '/');
    if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.slice(2);

    // Normalize text content line endings to LF (\n) for clean UTF-8
    let content = file.content || '';
    if (typeof content === 'string') {
      content = content.replace(/\r\n/g, '\n');
    }

    // Extract directory structure
    const pathParts = normalizedPath.split('/');
    if (pathParts.length > 1) {
      folders.add(pathParts.slice(0, -1).join('/'));
    }

    if (pathMap.has(normalizedPath)) {
      warnings.push(`Duplicate path detected during ZIP packaging: "${normalizedPath}". Overwritten with latest version.`);
    }

    pathMap.set(normalizedPath, {
      path: normalizedPath,
      content
    });
  }

  return {
    normalizedFiles: Array.from(pathMap.values()),
    folderCount: folders.size,
    warnings,
    errors
  };
};

/**
 * Enterprise Package Manifest Auto-Generator
 */
export const generatePackageManifest = (files = [], projectName = 'enterprise-backend-api', folderCount = 0) => {
  return {
    projectName,
    generationTimestamp: new Date().toISOString(),
    aiVersion: '1.0.0-enterprise',
    totalFiles: files.length,
    folderCount,
    packageVersion: '1.0.0',
    generatorVersion: 'OpenAPI AI Enterprise Release Packaging Engine v1.0.0'
  };
};

/**
 * Creates and pipes an Enterprise Production-Ready ZIP Archive Stream
 * 100% Backward Compatible Function Signature: (files, writeStream)
 */
export const createProjectZipStream = (files, writeStream, options = {}) => {
  const projectName = options.projectName || 'openapi-ai-project';
  const { normalizedFiles, folderCount, warnings, errors } = validateAndNormalizeFiles(files);

  if (normalizedFiles.length === 0) {
    logger.warn('ZIP Packaging Engine: Attempting to package empty file set.');
  }

  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    logger.error(`Enterprise ZIP Archiver Notice: ${err.message}`);
  });

  archive.on('warning', (warn) => {
    if (warn.code === 'ENOENT') {
      logger.warn(`ZIP Archiver Warning: ${warn.message}`);
    } else {
      logger.error(`ZIP Archiver Warning: ${warn.message}`);
    }
  });

  // Pipe to destination writeStream (e.g. Express Response HTTP stream)
  archive.pipe(writeStream);

  // Append normalized files preserving exact folder hierarchy
  normalizedFiles.forEach((file) => {
    archive.append(file.content, { name: file.path });
  });

  // Auto-inject manifest.json if not present
  const hasManifest = normalizedFiles.some(f => f.path === 'manifest.json');
  if (!hasManifest) {
    const manifest = generatePackageManifest(normalizedFiles, projectName, folderCount);
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  }

  archive.finalize();
  logger.info(`Enterprise Packaging Engine: Finalized ZIP archive with ${normalizedFiles.length} files`);
  return archive;
};

export default createProjectZipStream;
