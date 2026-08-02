import test from 'node:test';
import assert from 'node:assert';
import { 
  verifyProject, 
  StructureVerifier, 
  StaticAnalyzer, 
  RouteChainVerifier, 
  DatabaseVerifier, 
  SwaggerVerifier 
} from '../ai/compileVerificationEngine.js';

test('CompileVerificationEngine - Valid Enterprise Project Payload Test', async () => {
  const validFiles = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'test-api',
        version: '1.0.0',
        main: 'src/server.js',
        type: 'module',
        dependencies: {
          express: '^4.19.2',
          mongoose: '^8.3.1'
        }
      }, null, 2)
    },
    {
      path: '.env.example',
      content: 'PORT=5000\nMONGO_URI=mongodb://localhost:27017/test'
    },
    {
      path: 'src/config/db.js',
      content: 'import mongoose from "mongoose"; export const connectDB = async () => {};'
    },
    {
      path: 'src/models/User.js',
      content: 'import mongoose from "mongoose"; const schema = new mongoose.Schema({ name: String }); export default mongoose.model("User", schema);'
    },
    {
      path: 'src/controllers/userController.js',
      content: 'import User from "../models/User.js"; export const getUsers = async (req, res) => {};'
    },
    {
      path: 'src/routes/userRoutes.js',
      content: 'import express from "express"; import { getUsers } from "../controllers/userController.js"; const router = express.Router(); router.get("/", getUsers); export default router;'
    },
    {
      path: 'src/server.js',
      content: 'import express from "express"; import userRoutes from "./routes/userRoutes.js"; const app = express(); app.use("/users", userRoutes);'
    }
  ];

  const report = await verifyProject(validFiles, { skipNpmInstall: true });

  assert.strictEqual(report.status, 'PASS');
  assert.strictEqual(report.VERIFIED, true);
  assert.strictEqual(report.errors.length, 0);
  assert.strictEqual(report.summary.isRunnable, true);
  assert.ok(report.verifiedFiles.includes('package.json'));
});

test('CompileVerificationEngine - Invalid Structure & Missing Import Error Detection', async () => {
  const invalidFiles = [
    {
      path: 'src/server.js',
      content: 'import nonExistent from "./nonExistent.js";'
    }
  ];

  const report = await verifyProject(invalidFiles, { skipNpmInstall: true });

  assert.strictEqual(report.status, 'FAIL');
  assert.strictEqual(report.VERIFIED, false);
  assert.ok(report.errors.length > 0);

  const missingPkgError = report.errors.find(e => e.code === 'MISSING_PACKAGE_JSON');
  assert.ok(missingPkgError, 'Should report missing package.json error');

  const brokenImportError = report.errors.find(e => e.code === 'BROKEN_IMPORT_PATH');
  assert.ok(brokenImportError, 'Should report broken import path error');
});

test('CompileVerificationEngine - Database Reference & Swagger Validation', async () => {
  const filesWithDbAndSwagger = [
    {
      path: 'package.json',
      content: JSON.stringify({ name: 'swagger-test', dependencies: { express: '^4.0.0' } })
    },
    {
      path: '.env.example',
      content: 'PORT=5000'
    },
    {
      path: 'src/server.js',
      content: 'console.log("Server starting");'
    },
    {
      path: 'src/models/Post.js',
      content: 'import mongoose from "mongoose"; const postSchema = new mongoose.Schema({ author: { type: String, ref: "NonExistentUser" } });'
    },
    {
      path: 'swagger.json',
      content: JSON.stringify({
        openapi: '3.0.0',
        paths: {
          'users': { get: {} } // invalid path without leading slash
        }
      })
    }
  ];

  const report = await verifyProject(filesWithDbAndSwagger, { skipNpmInstall: true });

  assert.strictEqual(report.status, 'FAIL');
  const dbError = report.errors.find(e => e.code === 'BROKEN_MODEL_REFERENCE');
  assert.ok(dbError, 'Should report broken model ref error');

  const swaggerError = report.errors.find(e => e.code === 'INVALID_SWAGGER_PATH');
  assert.ok(swaggerError, 'Should report invalid swagger path error');
});
