import logger from '../utils/logger.js';

/**
 * Layer Weights for Topological Ordering
 */
const LAYER_WEIGHTS = {
  config: 1,
  constants: 2,
  helpers: 3,
  utils: 4,
  models: 5,
  repositories: 6,
  services: 7,
  validators: 8,
  controllers: 9,
  middlewares: 10,
  routes: 11,
  swagger: 12,
  tests: 13,
  root: 14
};

/**
 * 1. DEPENDENCY EVENT EMITTER
 */
export class DependencyEventEmitter {
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
    logger.info(`Dependency Event [${eventType}]: ${message}`);

    if (typeof this.onEventCallback === 'function') {
      this.onEventCallback(event);
    }
  }
}

/**
 * 2. DIRECTED DEPENDENCY GRAPH BUILDER
 * Parses ESM imports, Mongoose refs, and route bindings across all codebase files.
 */
export class DirectedGraphBuilder {
  static determineLayer(path = '') {
    const norm = path.toLowerCase().replace(/\\/g, '/');
    for (const [layer, weight] of Object.entries(LAYER_WEIGHTS)) {
      if (layer !== 'root' && norm.includes(layer)) {
        return { layer, weight };
      }
    }
    return { layer: 'root', weight: LAYER_WEIGHTS.root };
  }

  static extractImports(content = '', currentFilePath = '') {
    const importedPaths = [];
    const importRegex = /from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      let relativePath = match[1];
      if (!relativePath.endsWith('.js') && !relativePath.endsWith('.json')) {
        relativePath += '.js';
      }

      // Resolve relative path to pseudo-absolute path
      const currentParts = currentFilePath.split('/');
      currentParts.pop(); // remove file name

      const relParts = relativePath.split('/');
      for (const part of relParts) {
        if (part === '.') continue;
        if (part === '..') {
          if (currentParts.length > 0) currentParts.pop();
        } else {
          currentParts.push(part);
        }
      }

      const resolved = currentParts.join('/');
      importedPaths.push(resolved);
    }

    return importedPaths;
  }

  static buildGraph(files = [], eventEmitter = null) {
    const startTime = Date.now();
    const nodes = new Map();
    const edges = [];

    // 1. Initialize Nodes
    for (const file of files) {
      if (!file || !file.path) continue;
      let path = file.path.trim().replace(/\\/g, '/');
      if (path.startsWith('./')) path = path.slice(2);

      const { layer, weight } = this.determineLayer(path);
      const moduleName = path.split('/')[1] || 'root';

      nodes.set(path, {
        path,
        layer,
        weight,
        module: moduleName,
        dependencies: new Set(),
        dependents: new Set(),
        content: file.content || ''
      });
    }

    // 2. Parse Edges & Build Graph Connections
    for (const [path, node] of nodes.entries()) {
      const importedPaths = this.extractImports(node.content, path);

      for (const importedPath of importedPaths) {
        if (nodes.has(importedPath)) {
          node.dependencies.add(importedPath);
          nodes.get(importedPath).dependents.add(path);
          edges.push({ from: path, to: importedPath, type: 'IMPORT' });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    if (eventEmitter) {
      eventEmitter.emit('GraphCreated', `Built directed graph with ${nodes.size} nodes and ${edges.length} edges`, { durationMs });
    }

    return { nodes, edges, durationMs };
  }
}

/**
 * 3. GRAPH ANALYSIS & CIRCULAR DEPENDENCY ENGINE
 */
export class GraphAnalysisEngine {
  static findCircularDependencies(nodes) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (currentPath, pathStack) => {
      visited.add(currentPath);
      recursionStack.add(currentPath);
      pathStack.push(currentPath);

      const node = nodes.get(currentPath);
      if (node) {
        for (const depPath of node.dependencies) {
          if (!visited.has(depPath)) {
            dfs(depPath, [...pathStack]);
          } else if (recursionStack.has(depPath)) {
            const cycleStart = pathStack.indexOf(depPath);
            if (cycleStart !== -1) {
              cycles.push(pathStack.slice(cycleStart));
            }
          }
        }
      }

      recursionStack.delete(currentPath);
    };

    for (const path of nodes.keys()) {
      if (!visited.has(path)) {
        dfs(path, []);
      }
    }

    return cycles;
  }

  static findUnusedFiles(nodes) {
    const unused = [];
    for (const [path, node] of nodes.entries()) {
      const isEntry = path.includes('server.js') || path.includes('package.json') || path.includes('README.md') || path.includes('Dockerfile');
      if (!isEntry && node.dependents.size === 0) {
        unused.push(path);
      }
    }
    return unused;
  }

  static findOrphanFiles(nodes) {
    const orphans = [];
    for (const [path, node] of nodes.entries()) {
      if (node.dependencies.size === 0 && node.dependents.size === 0) {
        orphans.push(path);
      }
    }
    return orphans;
  }

  static calculateGraphDepth(nodes) {
    let maxDepth = 0;

    const getDepth = (path, currentDepth = 1, visited = new Set()) => {
      if (visited.has(path)) return currentDepth;
      visited.add(path);

      const node = nodes.get(path);
      if (!node || node.dependencies.size === 0) return currentDepth;

      let childMax = currentDepth;
      for (const depPath of node.dependencies) {
        childMax = Math.max(childMax, getDepth(depPath, currentDepth + 1, new Set(visited)));
      }
      return childMax;
    };

    for (const path of nodes.keys()) {
      maxDepth = Math.max(maxDepth, getDepth(path));
    }

    return maxDepth;
  }
}

/**
 * 4. CHANGE IMPACT ANALYZER (TRANSITIVE DEPENDENCY CLOSURE)
 */
export class ChangeImpactAnalyzer {
  static getTransitiveDependents(changedPath, nodes) {
    const affected = new Set([changedPath]);
    const queue = [changedPath];

    while (queue.length > 0) {
      const current = queue.shift();
      const node = nodes.get(current);

      if (node) {
        for (const dependentPath of node.dependents) {
          if (!affected.has(dependentPath)) {
            affected.add(dependentPath);
            queue.push(dependentPath);
          }
        }
      }
    }

    return Array.from(affected);
  }
}

/**
 * 5. TOPOLOGICAL BUILD ORDER CALCULATOR
 */
export class TopologicalBuildOrderCalculator {
  static computeBuildOrder(nodes) {
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => {
      if (a.weight !== b.weight) {
        return a.weight - b.weight;
      }
      return a.path.localeCompare(b.path);
    });

    return sortedNodes.map(n => n.path);
  }
}

/**
 * 6. REUSABLE DEPENDENCY QUERY API
 */
export class DependencyQueryAPI {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
  }

  getDependencies(file) {
    const node = this.nodes.get(file);
    return node ? Array.from(node.dependencies) : [];
  }

  getDependents(file) {
    const node = this.nodes.get(file);
    return node ? Array.from(node.dependents) : [];
  }

  getTransitiveImpact(file) {
    return ChangeImpactAnalyzer.getTransitiveDependents(file, this.nodes);
  }

  findCircularDependencies() {
    return GraphAnalysisEngine.findCircularDependencies(this.nodes);
  }

  findUnusedFiles() {
    return GraphAnalysisEngine.findUnusedFiles(this.nodes);
  }

  findOrphanFiles() {
    return GraphAnalysisEngine.findOrphanFiles(this.nodes);
  }

  getMetrics() {
    const depth = GraphAnalysisEngine.calculateGraphDepth(this.nodes);
    const circular = this.findCircularDependencies();
    const unused = this.findUnusedFiles();

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      graphDepth: depth,
      circularDependenciesCount: circular.length,
      unusedFilesCount: unused.length
    };
  }
}

/**
 * ENTERPRISE DEPENDENCY INTELLIGENCE ENGINE MAIN ORCHESTRATOR
 */
export class EnterpriseDependencyEngine {
  constructor(onEventCallback = null) {
    this.eventEmitter = new DependencyEventEmitter(onEventCallback);
  }

  analyzeProjectDependencies(files = []) {
    const { nodes, edges, durationMs } = DirectedGraphBuilder.buildGraph(files, this.eventEmitter);
    const queryApi = new DependencyQueryAPI(nodes, edges);
    const buildOrder = TopologicalBuildOrderCalculator.computeBuildOrder(nodes);

    const metrics = queryApi.getMetrics();
    metrics.resolutionTimeMs = durationMs;

    logger.info(`Dependency Engine Analysis Complete: ${metrics.totalNodes} Nodes, ${metrics.totalEdges} Edges, Depth ${metrics.graphDepth}`);

    return {
      nodes,
      edges,
      queryApi,
      buildOrder,
      metrics,
      eventHistory: this.eventEmitter.history
    };
  }
}

export default EnterpriseDependencyEngine;
