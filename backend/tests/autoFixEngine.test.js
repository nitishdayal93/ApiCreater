import test from 'node:test';
import assert from 'node:assert';
import { autoFixProject, ErrorDiagnosticsParser, TargetedRepairEngine } from '../ai/autoFixEngine.js';

test('AutoFixEngine - Missing Dependency & ESM Extension Repair Test', async () => {
  const plan = { projectName: 'Test API', framework: 'Node.js Express', database: 'MongoDB' };
  
  // Broken project: missing package.json dependency (cors), missing .js extension in relative import
  const brokenFiles = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'test-api',
        version: '1.0.0',
        main: 'src/server.js',
        type: 'module',
        dependencies: {
          express: '^4.19.2'
        }
      }, null, 2)
    },
    {
      path: '.env.example',
      content: 'PORT=5000'
    },
    {
      path: 'src/controllers/userController.js',
      content: 'export const getUsers = async (req, res) => res.json([]);'
    },
    {
      path: 'src/routes/userRoutes.js',
      content: 'import express from "express"; import { getUsers } from "../controllers/userController"; const router = express.Router(); router.get("/", getUsers); export default router;'
    },
    {
      path: 'src/server.js',
      content: 'import express from "express"; import cors from "cors"; import userRoutes from "./routes/userRoutes.js"; const app = express(); app.use(cors()); app.use("/users", userRoutes);'
    }
  ];

  const result = await autoFixProject(plan, brokenFiles, null, null, { skipNpmInstall: true, maxAttempts: 3 });

  assert.strictEqual(result.status, 'SUCCESS');
  assert.ok(result.fixedFiles.length > 0, 'Should record repaired files');

  // Verify missing dependency cors was added to package.json
  const pkgFile = result.files.find(f => f.path === 'package.json');
  const pkgJson = JSON.parse(pkgFile.content);
  assert.ok(pkgJson.dependencies.cors, 'cors dependency should be added to package.json');

  // Verify missing .js extension was fixed in userRoutes.js
  const routeFile = result.files.find(f => f.path === 'src/routes/userRoutes.js');
  assert.ok(routeFile.content.includes('../controllers/userController.js'), 'Import extension .js should be fixed');
});

test('AutoFixEngine - Missing Manifest & Missing Controller Repair Test', async () => {
  const plan = { projectName: 'Auto Repair API' };

  // Broken project: missing package.json and missing controller file referenced by route
  const brokenFiles = [
    {
      path: 'src/routes/userRoutes.js',
      content: 'import express from "express"; import { getUsers } from "../controllers/userController.js"; const router = express.Router(); router.get("/", getUsers); export default router;'
    },
    {
      path: 'src/server.js',
      content: 'import express from "express"; import userRoutes from "./routes/userRoutes.js"; const app = express(); app.use("/users", userRoutes);'
    }
  ];

  const result = await autoFixProject(plan, brokenFiles, null, null, { skipNpmInstall: true, maxAttempts: 3 });

  assert.strictEqual(result.status, 'SUCCESS');
  assert.ok(result.fixedFiles.includes('package.json'), 'package.json should be auto-created');
  
  const hasController = result.files.some(f => f.path.includes('userController.js'));
  assert.ok(hasController, 'Missing controller file should be auto-generated stub');
});

test('AutoFixEngine - Error Diagnostics Parsing Test', () => {
  const compileReport = {
    errors: [
      { file: 'src/controllers/authController.js', code: 'SYNTAX_ERROR', message: 'Unexpected token' },
      { file: null, code: 'MISSING_PACKAGE_JSON', message: 'Missing package.json' }
    ]
  };

  const reviewReport = {
    warnings: ['package.json file missing']
  };

  const { affectedFiles, errorMap } = ErrorDiagnosticsParser.parseReports(compileReport, reviewReport);

  assert.ok(affectedFiles.has('src/controllers/authController.js'));
  assert.ok(affectedFiles.has('package.json'));
  assert.strictEqual(errorMap.get('src/controllers/authController.js').length, 1);
});
