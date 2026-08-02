import logger from '../utils/logger.js';

export const FRAMEWORKS = {
  EXPRESS: 'Express.js',
  NESTJS: 'NestJS',
  FASTIFY: 'Fastify',
  KOA: 'Koa.js',
  NEXTJS: 'Next.js API Routes'
};

export class UniversalFrameworkEngine {
  constructor() {
    this.name = 'UniversalFrameworkEngine';
  }

  resolveFrameworkContext(plan = {}) {
    const selectedFramework = plan.framework || FRAMEWORKS.EXPRESS;
    logger.info(`UniversalFrameworkEngine: Resolved target framework "${selectedFramework}"`);

    return {
      framework: selectedFramework,
      architectureStyle: plan.architectureStyle || 'Clean Architecture (Controllers -> Services -> Repositories -> Models)',
      routingPattern: 'Express Router with Async Handler middleware',
      status: 'RESOLVED'
    };
  }
}

export default UniversalFrameworkEngine;
