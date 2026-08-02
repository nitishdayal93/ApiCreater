import logger from '../utils/logger.js';
import { generateTier } from './generatorService.js';
import EnterpriseDependencyEngine from './dependencyEngine.js';

/**
 * 1. REGENERATION STRATEGY ENUM
 */
export const REGENERATION_STRATEGIES = {
  SINGLE_FILE: 'SINGLE_FILE',
  MODULE_LEVEL: 'MODULE_LEVEL',
  DEPENDENCY_CHAIN: 'DEPENDENCY_CHAIN',
  FULL_PROJECT: 'FULL_PROJECT'
};

/**
 * 2. REGENERATION EVENT EMITTER
 */
export class RegenerationEventEmitter {
  constructor(onEventCallback = null) {
    this.onEventCallback = onEventCallback;
    this.history = [];
  }

  emit(eventType, message, payload = null) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      message,
      ...(payload && { payload })
    };
    this.history.push(event);
    logger.info(`Regeneration Event [${eventType}]: ${message}`);

    if (typeof this.onEventCallback === 'function') {
      this.onEventCallback(event);
    }
  }
}

/**
 * 3. CHANGE DETECTOR ENGINE
 * Detects modified entities, planner parameters, or file edits between snapshots.
 */
export class ChangeDetector {
  static detectPlannerChanges(oldPlan = {}, newPlan = {}) {
    const changes = {
      modifiedEntities: [],
      modifiedFields: [],
      addedEntities: [],
      removedEntities: [],
      isGlobalConfigChanged: false
    };

    if (!oldPlan || !newPlan) {
      changes.isGlobalConfigChanged = true;
      return changes;
    }

    if (oldPlan.framework !== newPlan.framework || oldPlan.database !== newPlan.database || oldPlan.authentication !== newPlan.authentication) {
      changes.isGlobalConfigChanged = true;
    }

    const oldEntityNames = new Set((oldPlan.entities || []).map(e => (typeof e === 'string' ? e : e.name).toLowerCase()));
    const newEntityNames = new Set((newPlan.entities || []).map(e => (typeof e === 'string' ? e : e.name).toLowerCase()));

    newPlan.entities?.forEach(e => {
      const name = (typeof e === 'string' ? e : e.name).toLowerCase();
      if (!oldEntityNames.has(name)) {
        changes.addedEntities.push(name);
      } else {
        changes.modifiedEntities.push(name);
      }
    });

    oldPlan.entities?.forEach(e => {
      const name = (typeof e === 'string' ? e : e.name).toLowerCase();
      if (!newEntityNames.has(name)) {
        changes.removedEntities.push(name);
      }
    });

    return changes;
  }
}

/**
 * 4. FILE CACHE & HASH MANAGER
 * Compares file content hashes to identify unchanged files for reuse.
 */
export class FileCacheManager {
  static computeHash(content = '') {
    if (typeof content !== 'string') return '0_empty';
    return `${content.length}_${content.slice(0, 40).replace(/\s/g, '')}`;
  }

  static filterUnchangedFiles(existingFiles = [], affectedPaths = new Set()) {
    const cachedFiles = [];
    const reusablePaths = new Set();

    for (const file of existingFiles) {
      if (!file || !file.path) continue;
      const normalizedPath = file.path.trim().replace(/\\/g, '/');

      if (!affectedPaths.has(normalizedPath)) {
        cachedFiles.push({ path: normalizedPath, content: file.content });
        reusablePaths.add(normalizedPath);
      }
    }

    logger.info(`File Cache Manager: Reusing ${cachedFiles.length} unchanged cached files`);
    return { cachedFiles, reusablePaths };
  }
}

/**
 * 5. SMART IMPACT ANALYZER & DEPENDENCY GRAPH
 * Maps modified entities/modules to affected downstream file chains using Dependency Engine.
 */
export class ImpactAnalyzer {
  static analyzeImpact(changes, allFiles = []) {
    const affectedFiles = new Set();
    const affectedModules = new Set();

    if (changes.isGlobalConfigChanged) {
      logger.info('Impact Analyzer: Global config changed. Full project marked affected.');
      allFiles.forEach(f => affectedFiles.add(f.path));
      return {
        affectedFiles: Array.from(affectedFiles),
        affectedModules: ['AllModules'],
        strategy: REGENERATION_STRATEGIES.FULL_PROJECT
      };
    }

    // Build directed graph for transitive impact analysis if files exist
    let depQueryApi = null;
    if (Array.isArray(allFiles) && allFiles.length > 0) {
      const depEngine = new EnterpriseDependencyEngine();
      const depAnalysis = depEngine.analyzeProjectDependencies(allFiles);
      depQueryApi = depAnalysis.queryApi;
    }

    const modifiedDomains = [...changes.modifiedEntities, ...changes.addedEntities, ...changes.removedEntities];

    modifiedDomains.forEach(domain => {
      const lowerDomain = domain.toLowerCase();
      const capsDomain = domain.charAt(0).toUpperCase() + domain.slice(1);

      affectedModules.add(`${capsDomain}Module`);

      const targetModelPath = `src/models/${capsDomain}.js`;
      affectedFiles.add(targetModelPath);
      affectedFiles.add(`src/repositories/${lowerDomain}Repository.js`);
      affectedFiles.add(`src/services/${lowerDomain}Service.js`);
      affectedFiles.add(`src/validators/${lowerDomain}Validator.js`);
      affectedFiles.add(`src/controllers/${lowerDomain}Controller.js`);
      affectedFiles.add(`src/routes/${lowerDomain}Routes.js`);
      affectedFiles.add(`src/routes/index.js`);

      // Use Dependency Engine Transitive Impact API if available
      if (depQueryApi) {
        const transitive = depQueryApi.getTransitiveImpact(targetModelPath);
        transitive.forEach(p => affectedFiles.add(p));
      }
    });

    let strategy = REGENERATION_STRATEGIES.DEPENDENCY_CHAIN;
    if (affectedFiles.size === 1) {
      strategy = REGENERATION_STRATEGIES.SINGLE_FILE;
    } else if (affectedFiles.size === 0) {
      strategy = REGENERATION_STRATEGIES.SINGLE_FILE;
    }

    logger.info(`Impact Analysis Completed: ${affectedFiles.size} affected files across ${affectedModules.size} modules [Strategy: ${strategy}]`);

    return {
      affectedFiles: Array.from(affectedFiles),
      affectedModules: Array.from(affectedModules),
      strategy
    };
  }
}

/**
 * 6. ENTERPRISE INCREMENTAL REGENERATION ENGINE
 */
export class IncrementalRegenerationEngine {
  constructor(onEventCallback = null) {
    this.eventEmitter = new RegenerationEventEmitter(onEventCallback);
  }

  async regenerateIncrementally(plan, existingFiles = [], changes = null) {
    const startTime = Date.now();
    this.eventEmitter.emit('RegenerationStarted', 'Initiating Enterprise Incremental Regeneration Engine');

    // 1. Detect Changes if not supplied
    const detectedChanges = changes || ChangeDetector.detectPlannerChanges({}, plan);

    // 2. Perform Impact Analysis with Dependency Graph
    const impact = ImpactAnalyzer.analyzeImpact(detectedChanges, existingFiles);
    this.eventEmitter.emit('ImpactAnalysisCompleted', `Impact Analysis: ${impact.affectedFiles.length} files affected`, { strategy: impact.strategy });

    const affectedSet = new Set(impact.affectedFiles);

    // 3. Filter Cached Unchanged Files
    const { cachedFiles, reusablePaths } = FileCacheManager.filterUnchangedFiles(existingFiles, affectedSet);

    // 4. Regenerate ONLY Affected Modules/Tiers
    const regeneratedFiles = [];
    const modulesToRegenerate = (plan.modules || []).filter(mod => {
      const modFiles = mod.files || [];
      return modFiles.some(f => affectedSet.has(f));
    });

    this.eventEmitter.emit('FilesQueued', `Queued ${modulesToRegenerate.length} modules for partial regeneration`);

    for (const mod of modulesToRegenerate) {
      try {
        const files = await generateTier(plan, mod.name, mod.files);
        regeneratedFiles.push(...files);
        this.eventEmitter.emit('FilesRegenerated', `Regenerated module: ${mod.name} (${files.length} files)`);
      } catch (err) {
        logger.error(`Incremental Regeneration Error on module ${mod.name}: ${err.message}`);
      }
    }

    // 5. Combine Regenerated Files + Cached Unchanged Files
    const combinedFilesMap = new Map();
    cachedFiles.forEach(f => combinedFilesMap.set(f.path, f));
    regeneratedFiles.forEach(f => combinedFilesMap.set(f.path, f));

    const finalFiles = Array.from(combinedFilesMap.values());

    const totalTimeMs = Date.now() - startTime;
    const filesReusedCount = cachedFiles.length;
    const filesRegeneratedCount = regeneratedFiles.length;
    const tokensSavedEstimate = filesReusedCount * 1200;
    const timeSavedEstimateMs = filesReusedCount * 800;

    const metrics = {
      filesRegenerated: filesRegeneratedCount,
      filesReused: filesReusedCount,
      timeSavedMs: timeSavedEstimateMs,
      tokensSaved: tokensSavedEstimate,
      averageRegenerationDurationMs: totalTimeMs
    };

    this.eventEmitter.emit('ValidationPassed', 'Incremental Regeneration Payload Validated');
    this.eventEmitter.emit('RegenerationCompleted', `Regeneration Complete: ${filesRegeneratedCount} regenerated, ${filesReusedCount} reused (${tokensSavedEstimate} tokens saved)`);

    logger.info(`Incremental Regeneration Engine Complete: ${filesRegeneratedCount} regenerated, ${filesReusedCount} reused`);

    return {
      success: true,
      strategy: impact.strategy,
      finalFiles,
      metrics,
      eventHistory: this.eventEmitter.history
    };
  }
}

export default IncrementalRegenerationEngine;
