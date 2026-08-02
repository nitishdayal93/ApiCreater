import logger from '../utils/logger.js';

/**
 * Normalizes quotes and strips markdown code fences & surrounding explanation text
 */
export const cleanMarkdownBlocks = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Strip starting ```json, ```javascript, ```text, or ```
  cleaned = cleaned.replace(/^```(?:json|javascript|js|text)?\s*/i, '');
  // Strip trailing ```
  cleaned = cleaned.replace(/\s*```$/i, '');

  // Normalize smart double & single quotes
  cleaned = cleaned
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // Extract substring between outer-most { ... } or [ ... ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = cleaned.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }

  return cleaned.trim();
};

/**
 * Structural JSON Repair Helper
 * Automatically fixes trailing commas, duplicate commas, empty values, and unclosed brackets/braces
 */
export const repairJSONString = (jsonStr) => {
  if (!jsonStr || typeof jsonStr !== 'string') return '{}';

  let repaired = jsonStr;

  // 1. Remove trailing commas before closing braces or brackets
  repaired = repaired.replace(/,\s*([\}\]])/g, '$1');

  // 2. Remove duplicate/extra commas (e.g. [1,, 2] -> [1, 2])
  repaired = repaired.replace(/,\s*,+/g, ',');

  // 3. Fix empty JSON values (e.g. "key": , -> "key": null,)
  repaired = repaired.replace(/:\s*,/g, ': null,');
  repaired = repaired.replace(/:\s*\}/g, ': null}');
  repaired = repaired.replace(/:\s*\]/g, ': null]');

  // 4. Auto-close missing braces / brackets for truncated LLM responses
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (char === '\\' && !isEscaped) {
      isEscaped = true;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces = Math.max(0, openBraces - 1);
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
    }

    isEscaped = false;
  }

  // Close unclosed string if truncated inside double quotes
  if (inString) {
    repaired += '"';
  }

  // Close open brackets then open braces
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }

  return repaired;
};

/**
 * Enterprise Multi-Stage AI JSON Recovery Engine
 * Parses raw AI text safely with automatic recovery for malformed responses
 */
export const parseJSONSafely = (text) => {
  if (!text) {
    throw new Error('parseJSONSafely received null or empty input.');
  }

  const cleaned = cleanMarkdownBlocks(text);

  // Stage 1: Standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    logger.warn('JSON Recovery Stage 1 (Standard): Parse failed. Attempting Stage 2 Structural Repair...');
  }

  // Stage 2: Structural repair on cleaned string
  try {
    const repaired = repairJSONString(cleaned);
    return JSON.parse(repaired);
  } catch (err2) {
    logger.warn('JSON Recovery Stage 2 (Structural): Parse failed. Attempting Stage 3 Outer Extraction & Repair...');
  }

  // Stage 3: Regex extract outer-most block and repair
  const objectMatch = text.match(/\{[\s\S]*\}/);
  const arrayMatch = text.match(/\[[\s\S]*\]/);

  const matchedString = objectMatch ? objectMatch[0] : (arrayMatch ? arrayMatch[0] : null);

  if (matchedString) {
    try {
      const repairedMatch = repairJSONString(matchedString);
      return JSON.parse(repairedMatch);
    } catch (err3) {
      logger.error(`JSON Recovery Stage 3 (Regex & Repair) failed: ${err3.message}`);
      throw err3;
    }
  }

  throw new Error('JSON Recovery Engine: Failed to parse or repair malformed AI JSON response.');
};

export default parseJSONSafely;
