/**
 * Functional test for API versioning system
 * Tests the actual runtime behavior of version utilities
 * Run with: node test-version-functionality.mjs
 */

import {
  loadVersionMetadata,
  clearCache,
} from './src/utils/version/metadataLoader.ts';
import {
  compareVersions,
  isValidCalVer,
  isValidSemVer,
  matchesPattern,
} from './src/utils/version/validator.ts';
import {evaluateCompatibility} from './src/utils/version/compatibility.ts';
import {
  logVersionCheck,
  getVersionDistribution,
  getUpdateMetrics,
} from './src/utils/version/analytics.ts';
import {getDownloadUrl, getNewFeatures} from './src/utils/version/helpers.ts';
import {VERSION_CONFIG} from './src/config/version.ts';

console.log('🧪 Testing API Versioning System Functionality\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test VERSION_CONFIG
test('VERSION_CONFIG has required fields', () => {
  if (!VERSION_CONFIG.CALVER) throw new Error('Missing CALVER');
  if (!VERSION_CONFIG.API_VERSION) throw new Error('Missing API_VERSION');
  if (!isValidCalVer(VERSION_CONFIG.CALVER))
    throw new Error('Invalid CALVER format');
});

// Test version validators
test('isValidCalVer accepts valid dates', () => {
  if (!isValidCalVer('2026-02-18')) throw new Error('Should accept 2026-02-18');
  if (!isValidCalVer('2025-12-31')) throw new Error('Should accept 2025-12-31');
});

test('isValidCalVer rejects invalid dates', () => {
  if (isValidCalVer('2026-13-01'))
    throw new Error('Should reject invalid month');
  if (isValidCalVer('2026-02-30')) throw new Error('Should reject invalid day');
  if (isValidCalVer('not-a-date')) throw new Error('Should reject non-date');
});

test('isValidSemVer accepts valid versions', () => {
  if (!isValidSemVer('1.0.0')) throw new Error('Should accept 1.0.0');
  if (!isValidSemVer('2.5.10')) throw new Error('Should accept 2.5.10');
});

test('isValidSemVer rejects invalid versions', () => {
  if (isValidSemVer('1.0')) throw new Error('Should reject 1.0');
  if (isValidSemVer('v1.0.0')) throw new Error('Should reject v1.0.0');
});

test('compareVersions works correctly', () => {
  if (compareVersions('2026-02-18', '2026-02-18') !== 0)
    throw new Error('Equal versions should return 0');
  if (compareVersions('2026-02-18', '2026-01-15') !== 1)
    throw new Error('Later version should return 1');
  if (compareVersions('2026-01-15', '2026-02-18') !== -1)
    throw new Error('Earlier version should return -1');
});

test('matchesPattern works with wildcards', () => {
  if (!matchesPattern('2026-02-18', '2026-02-*'))
    throw new Error('Should match month wildcard');
  if (!matchesPattern('2026-02-18', '2026-*'))
    throw new Error('Should match year wildcard');
  if (!matchesPattern('2026-02-18', '*'))
    throw new Error('Should match universal wildcard');
  if (matchesPattern('2026-02-18', '2025-*'))
    throw new Error('Should not match different year');
});

// Test metadata loader
await asyncTest('loadVersionMetadata returns valid metadata', async () => {
  const metadata = loadVersionMetadata();

  if (!metadata.apiVersion) throw new Error('Missing apiVersion');
  if (!metadata.minimumVersions) throw new Error('Missing minimumVersions');
  if (!metadata.recommendedVersions)
    throw new Error('Missing recommendedVersions');
  if (!metadata.compatibilityMatrix)
    throw new Error('Missing compatibilityMatrix');
  if (!Array.isArray(metadata.bypassEndpoints))
    throw new Error('bypassEndpoints should be array');
});

// Test compatibility evaluation
await asyncTest('evaluateCompatibility works correctly', async () => {
  const metadata = loadVersionMetadata();

  // Test compatible version
  const compatible = evaluateCompatibility(
    '2026-02-18',
    '2026-02-18',
    'ios',
    metadata.compatibilityMatrix,
  );

  if (!compatible.isCompatible) throw new Error('Should be compatible');
  if (!compatible.matchedRule) throw new Error('Should have matched rule');

  // Test incompatible version (too old)
  const incompatible = evaluateCompatibility(
    '2025-01-01',
    '2026-02-18',
    'ios',
    metadata.compatibilityMatrix,
  );

  if (incompatible.isCompatible) throw new Error('Should be incompatible');
});

// Test analytics
test('logVersionCheck creates log entry', () => {
  const log = logVersionCheck({
    clientVersion: '2026-02-18',
    platform: 'ios',
    buildNumber: 24,
    appVersion: '1.9.0',
    result: 'success',
    timestamp: new Date(),
  });

  if (!log.id) throw new Error('Log should have ID');
  if (log.clientVersion !== '2026-02-18')
    throw new Error('Wrong client version');
  if (log.platform !== 'ios') throw new Error('Wrong platform');
});

test('getVersionDistribution returns statistics', () => {
  // Log some test data
  logVersionCheck({
    clientVersion: '2026-02-18',
    platform: 'ios',
    result: 'success',
    timestamp: new Date(),
  });

  logVersionCheck({
    clientVersion: '2026-01-15',
    platform: 'android',
    result: 'soft_update',
    timestamp: new Date(),
  });

  const distribution = getVersionDistribution();

  if (!Array.isArray(distribution)) throw new Error('Should return array');
  if (distribution.length === 0) throw new Error('Should have entries');
});

test('getUpdateMetrics returns metrics', () => {
  const metrics = getUpdateMetrics();

  if (typeof metrics.forceUpdateRate !== 'number')
    throw new Error('Missing forceUpdateRate');
  if (typeof metrics.softUpdateRate !== 'number')
    throw new Error('Missing softUpdateRate');
  if (typeof metrics.adoptionRate !== 'number')
    throw new Error('Missing adoptionRate');
});

// Test helpers
test('getDownloadUrl returns correct URLs', () => {
  const iosUrl = getDownloadUrl('ios');
  const androidUrl = getDownloadUrl('android');
  const webUrl = getDownloadUrl('web');

  if (!iosUrl || !iosUrl.includes('apps.apple.com'))
    throw new Error('Invalid iOS URL');
  if (!androidUrl || !androidUrl.includes('play.google.com'))
    throw new Error('Invalid Android URL');
  if (webUrl !== undefined) throw new Error('Web should return undefined');
});

await asyncTest('getNewFeatures returns features', async () => {
  const features = await getNewFeatures('2026-01-15', '2026-02-18');

  if (!Array.isArray(features)) throw new Error('Should return array');
  // Features array might be empty if version-config.json doesn't have the mapping
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

// Cleanup
clearCache();

if (failed === 0) {
  console.log('\n✨ All functionality tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
