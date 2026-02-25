/**
 * Manual verification script for compatibility evaluation logic
 * Run with: npx tsx apps/server/src/utils/version/__tests__/compatibility-manual-test.ts
 */

import {evaluateCompatibility} from '../compatibility';
import type {CompatibilityRule} from '../schema';

console.log('=== Compatibility Evaluation Manual Tests ===\n');

// Test 1: Compatible version within bounds
console.log('Test 1: Compatible version within bounds');
const matrix1: CompatibilityRule[] = [
  {
    clientVersionPattern: '2026-02-*',
    minApiVersion: '2026-02-01',
    maxApiVersion: '2026-12-31',
    platforms: ['ios', 'android', 'web'],
  },
];

const result1 = evaluateCompatibility(
  '2026-02-18',
  '2026-02-20',
  'ios',
  matrix1,
);
console.log('Result:', result1);
console.log('Expected: isCompatible=true, matchedRule defined');
console.log(
  '✓ Pass:',
  result1.isCompatible === true && result1.matchedRule !== undefined,
);
console.log();

// Test 2: Incompatible version below minimum
console.log('Test 2: Incompatible version below minimum');
const result2 = evaluateCompatibility(
  '2026-02-18',
  '2026-01-15',
  'ios',
  matrix1,
);
console.log('Result:', result2);
console.log('Expected: isCompatible=false');
console.log('✓ Pass:', result2.isCompatible === false);
console.log();

// Test 3: Incompatible version above maximum
console.log('Test 3: Incompatible version above maximum');
const result3 = evaluateCompatibility(
  '2026-02-18',
  '2027-01-01',
  'ios',
  matrix1,
);
console.log('Result:', result3);
console.log('Expected: isCompatible=false');
console.log('✓ Pass:', result3.isCompatible === false);
console.log();

// Test 4: Wildcard pattern matching
console.log('Test 4: Wildcard pattern matching');
const matrix2: CompatibilityRule[] = [
  {
    clientVersionPattern: '2026-*',
    minApiVersion: '2026-01-01',
    maxApiVersion: '2026-12-31',
    platforms: ['ios', 'android', 'web'],
  },
];

const result4 = evaluateCompatibility(
  '2026-05-15',
  '2026-06-01',
  'web',
  matrix2,
);
console.log('Result:', result4);
console.log('Expected: isCompatible=true, pattern matched "2026-*"');
console.log(
  '✓ Pass:',
  result4.isCompatible === true &&
    result4.matchedRule?.clientVersionPattern === '2026-*',
);
console.log();

// Test 5: Default policy - recent version (within 3 months)
console.log('Test 5: Default policy - recent version (within 3 months)');
const emptyMatrix: CompatibilityRule[] = [];
const today = new Date();
const twoMonthsAgo = new Date(today);
twoMonthsAgo.setMonth(today.getMonth() - 2);
const clientVersion5 = twoMonthsAgo.toISOString().split('T')[0];
const apiVersion5 = today.toISOString().split('T')[0];

const result5 = evaluateCompatibility(
  clientVersion5,
  apiVersion5,
  'ios',
  emptyMatrix,
);
console.log('Client version (2 months ago):', clientVersion5);
console.log('API version (today):', apiVersion5);
console.log('Result:', result5);
console.log(
  'Expected: isCompatible=true (default policy allows recent versions)',
);
console.log(
  '✓ Pass:',
  result5.isCompatible === true && result5.matchedRule === undefined,
);
console.log();

// Test 6: Default policy - old version (older than 3 months)
console.log('Test 6: Default policy - old version (older than 3 months)');
const fourMonthsAgo = new Date(today);
fourMonthsAgo.setMonth(today.getMonth() - 4);
const clientVersion6 = fourMonthsAgo.toISOString().split('T')[0];

const result6 = evaluateCompatibility(
  clientVersion6,
  apiVersion5,
  'android',
  emptyMatrix,
);
console.log('Client version (4 months ago):', clientVersion6);
console.log('API version (today):', apiVersion5);
console.log('Result:', result6);
console.log(
  'Expected: isCompatible=false (default policy blocks old versions)',
);
console.log(
  '✓ Pass:',
  result6.isCompatible === false && result6.matchedRule === undefined,
);
console.log();

// Test 7: Platform filtering
console.log('Test 7: Platform filtering');
const platformMatrix: CompatibilityRule[] = [
  {
    clientVersionPattern: '2026-02-*',
    minApiVersion: '2026-02-01',
    maxApiVersion: '2026-12-31',
    platforms: ['ios'],
  },
];

const result7a = evaluateCompatibility(
  '2026-02-18',
  '2026-02-20',
  'ios',
  platformMatrix,
);
const result7b = evaluateCompatibility(
  '2026-02-18',
  '2026-02-20',
  'android',
  platformMatrix,
);
console.log('iOS Result:', result7a);
console.log('Android Result:', result7b);
console.log('Expected: iOS matched, Android not matched');
console.log(
  '✓ Pass:',
  result7a.matchedRule !== undefined && result7b.matchedRule === undefined,
);
console.log();

// Test 8: Boundary conditions
console.log('Test 8: Boundary conditions (min and max)');
const result8a = evaluateCompatibility(
  '2026-02-18',
  '2026-02-01',
  'ios',
  matrix1,
);
const result8b = evaluateCompatibility(
  '2026-02-18',
  '2026-12-31',
  'ios',
  matrix1,
);
console.log('Min boundary result:', result8a);
console.log('Max boundary result:', result8b);
console.log('Expected: Both compatible');
console.log(
  '✓ Pass:',
  result8a.isCompatible === true && result8b.isCompatible === true,
);
console.log();

console.log('=== All Manual Tests Complete ===');
