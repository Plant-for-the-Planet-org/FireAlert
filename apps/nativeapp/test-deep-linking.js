/**
 * Test script to verify deep linking functionality
 * Run with: node test-deep-linking.js
 */

const {
  parseDeepLink,
  createIncidentDeepLink,
  createAlertDeepLink,
  isFireAlertDeepLink,
  isValidUUID,
} = require('./app/utils/deepLinking.ts');

// Mock Config for testing
global.Config = {
  APP_URL: 'https://firealert.plant-for-the-planet.org',
};

console.log('🧪 Testing Deep Linking Implementation\n');

// Test 1: UUID/CUID validation
console.log('1️⃣ Testing UUID/CUID validation:');
console.log(
  '   Valid UUID:',
  isValidUUID('123e4567-e89b-12d3-a456-426614174000'),
);
console.log('   Valid CUID:', isValidUUID('abc123def456ghi789jkl012mno'));
console.log('   Invalid ID:', isValidUUID('invalid-id'));

// Test 2: URL generation
console.log('\n2️⃣ Testing URL generation:');
const incidentLink = createIncidentDeepLink(
  '123e4567-e89b-12d3-a456-426614174000',
  {
    centerCoordinate: [-3.2, 10.5],
    zoomLevel: 12,
  },
);
const alertLink = createAlertDeepLink('abc123def456ghi789jkl012mno', {
  centerCoordinate: [2.1, 48.8],
  zoomLevel: 15,
});

console.log('   Incident link:', incidentLink);
console.log('   Alert link:', alertLink);

// Test 3: URL detection
console.log('\n3️⃣ Testing URL detection:');
const testUrls = [
  'https://firealert.plant-for-the-planet.org/incident/123e4567-e89b-12d3-a456-426614174000',
  'https://firealert.plant-for-the-planet.org/alert/abc123def456ghi789jkl012mno?lat=48.8&lng=2.1&zoom=15',
  'firealert://incident/123e4567-e89b-12d3-a456-426614174000',
  'https://example.com/not-firealert',
];

testUrls.forEach(url => {
  console.log(
    `   ${url} → ${isFireAlertDeepLink(url) ? '✅ Valid' : '❌ Invalid'}`,
  );
});

// Test 4: URL parsing
console.log('\n4️⃣ Testing URL parsing:');
const parsedIncident = parseDeepLink(
  'https://firealert.plant-for-the-planet.org/incident/123e4567-e89b-12d3-a456-426614174000?lat=10.5&lng=-3.2&zoom=12',
);
const parsedAlert = parseDeepLink(
  'https://firealert.plant-for-the-planet.org/alert/abc123def456ghi789jkl012mno?lat=48.8&lng=2.1&zoom=15',
);

console.log('   Parsed incident:', JSON.stringify(parsedIncident, null, 2));
console.log('   Parsed alert:', JSON.stringify(parsedAlert, null, 2));

console.log('\n✅ Deep linking test completed!');
