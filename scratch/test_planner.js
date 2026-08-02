import { planProjectArchitecture } from '../backend/ai/plannerService.js';

async function testPlanner() {
  const prompt = "Build a Hospital Management REST API using MongoDB";
  console.log("Input Prompt:", prompt);
  const blueprint = await planProjectArchitecture(prompt);
  console.log("\n=== GENERATED PROJECT BLUEPRINT JSON ===");
  console.log(JSON.stringify(blueprint, null, 2));
}

testPlanner();
