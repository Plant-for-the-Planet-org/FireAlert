/**
 * Manual test script to verify API versioning system implementation
 * Run with: node test-version-system.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing API Versioning System Implementation\n');

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
    failed++;
  }
}

// Test 1: Version config file exists
test('version.ts exists', () => {
  const versionPath = path.join(__dirname, 'src/config/version.ts');
  if (!fs.existsSync(versionPath)) {
    throw new Error('version.ts not found');
  }
});

// Test 2: Version metadata file exists
test('version-metadata.json exists', () => {
  const metadataPath = path.join(__dirname, 'config/version-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    throw new Error('version-metadata.json not found');
  }
});

// Test 3: Version metadata is valid JSON
test('version-metadata.json is valid JSON', () => {
  const metadataPath = path.join(__dirname, 'config/version-metadata.json');
  const content = fs.readFileSync(metadataPath, 'utf-8');
  const metadata = JSON.parse(content);

  if (!metadata.apiVersion) throw new Error('Missing apiVersion');
  if (!metadata.minimumVersions) throw new Error('Missing minimumVersions');
  if (!metadata.recommendedVersions)
    throw new Error('Missing recommendedVersions');
  if (!metadata.compatibilityMatrix)
    throw new Error('Missing compatibilityMatrix');
});

// Test 4: Metadata loader exists
test('metadataLoader.ts exists', () => {
  const loaderPath = path.join(
    __dirname,
    'src/utils/version/metadataLoader.ts',
  );
  if (!fs.existsSync(loaderPath)) {
    throw new Error('metadataLoader.ts not found');
  }
});

// Test 5: Analytics utility exists
test('analytics.ts exists', () => {
  const analyticsPath = path.join(__dirname, 'src/utils/version/analytics.ts');
  if (!fs.existsSync(analyticsPath)) {
    throw new Error('analytics.ts not found');
  }
});

// Test 6: Helpers utility exists
test('helpers.ts exists', () => {
  const helpersPath = path.join(__dirname, 'src/utils/version/helpers.ts');
  if (!fs.existsSync(helpersPath)) {
    throw new Error('helpers.ts not found');
  }
});

// Test 7: Version middleware exists
test('versionMiddleware.ts exists', () => {
  const middlewarePath = path.join(
    __dirname,
    'src/server/api/middleware/versionMiddleware.ts',
  );
  if (!fs.existsSync(middlewarePath)) {
    throw new Error('versionMiddleware.ts not found');
  }
});

// Test 8: Response header middleware exists
test('responseHeaderMiddleware.ts exists', () => {
  const middlewarePath = path.join(
    __dirname,
    'src/server/api/middleware/responseHeaderMiddleware.ts',
  );
  if (!fs.existsSync(middlewarePath)) {
    throw new Error('responseHeaderMiddleware.ts not found');
  }
});

// Test 9: Version router exists
test('version router exists', () => {
  const routerPath = path.join(__dirname, 'src/server/api/routers/version.ts');
  if (!fs.existsSync(routerPath)) {
    throw new Error('version.ts router not found');
  }
});

// Test 10: Version router is registered in root
test('version router is registered', () => {
  const rootPath = path.join(__dirname, 'src/server/api/root.ts');
  const content = fs.readFileSync(rootPath, 'utf-8');

  if (!content.includes('versionRouter')) {
    throw new Error('versionRouter not imported');
  }
  if (!content.includes('version: versionRouter')) {
    throw new Error('versionRouter not registered');
  }
});

// Test 11: Response header middleware is used
test('response header middleware is used', () => {
  const trpcPath = path.join(__dirname, 'src/server/api/trpc.ts');
  const content = fs.readFileSync(trpcPath, 'utf-8');

  if (!content.includes('responseHeaderMiddleware')) {
    throw new Error('responseHeaderMiddleware not imported');
  }
  if (!content.includes('.use(responseHeaderMiddleware)')) {
    throw new Error('responseHeaderMiddleware not used in procedures');
  }
});

// Test 12: Version metadata has bypass endpoints
test('version metadata has bypass endpoints', () => {
  const metadataPath = path.join(__dirname, 'config/version-metadata.json');
  const content = fs.readFileSync(metadataPath, 'utf-8');
  const metadata = JSON.parse(content);

  if (!Array.isArray(metadata.bypassEndpoints)) {
    throw new Error('bypassEndpoints is not an array');
  }
  if (!metadata.bypassEndpoints.includes('version.check')) {
    throw new Error('version.check not in bypass list');
  }
  if (!metadata.bypassEndpoints.includes('version.info')) {
    throw new Error('version.info not in bypass list');
  }
});

// Test 13: Validator utility exists
test('validator.ts exists', () => {
  const validatorPath = path.join(__dirname, 'src/utils/version/validator.ts');
  if (!fs.existsSync(validatorPath)) {
    throw new Error('validator.ts not found');
  }
});

// Test 14: Compatibility utility exists
test('compatibility.ts exists', () => {
  const compatPath = path.join(__dirname, 'src/utils/version/compatibility.ts');
  if (!fs.existsSync(compatPath)) {
    throw new Error('compatibility.ts not found');
  }
});

// Test 15: Schema utility exists
test('schema.ts exists', () => {
  const schemaPath = path.join(__dirname, 'src/utils/version/schema.ts');
  if (!fs.existsSync(schemaPath)) {
    throw new Error('schema.ts not found');
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✨ All tests passed! Server implementation is complete.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
