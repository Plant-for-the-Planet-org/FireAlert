/**
 * Test script to verify metrics output in API response
 * This demonstrates the expected metrics structure
 */

import {PerformanceMetrics} from './PerformanceMetrics';
import {OperationResult} from './OperationResult';
import {RequestHandler} from './RequestHandler';

// Create a sample metrics scenario
function createSampleMetrics(): PerformanceMetrics {
  const metrics = new PerformanceMetrics();

  // Simulate provider processing
  metrics.startTimer('total_processing');
  metrics.recordMemorySnapshot('start');

  // Simulate some processing time
  setTimeout(() => {
    metrics.endTimer('total_processing');
    metrics.recordMemorySnapshot('end');

    // Add provider-specific metrics
    const providerMetrics = {
      provider_1: {
        total_ms: 3200,
        fetch_ms: 800,
        deduplication_ms: 1500,
        alert_creation_ms: 900,
        chunks_processed: 3,
      },
      provider_2: {
        total_ms: 2100,
        fetch_ms: 600,
        deduplication_ms: 800,
        alert_creation_ms: 700,
        chunks_processed: 2,
      },
    };

    metrics.recordNestedMetric('provider_processing', providerMetrics);
    metrics.recordMetric('providers_processed', 2);
    metrics.recordMetric('avg_chunk_duration_ms', 450);
    metrics.recordMetric('slowest_chunk_ms', 1200);
  }, 10);

  return metrics;
}

// Test the metrics output
export function testMetricsOutput(): void {
  console.log('=== Testing Metrics Output ===\n');

  // Create sample operation result
  const result = new OperationResult();
  result.addEventsProcessed(5000);
  result.addEventsCreated(4500);
  result.addAlertsCreated(150);

  // Add metrics
  const metrics = createSampleMetrics();
  result.setMetrics(metrics);

  // Build response using RequestHandler
  const response = RequestHandler.buildSuccess(result);

  console.log('Sample API Response with Metrics:');
  console.log(JSON.stringify(response, null, 2));

  console.log('\n=== Expected Metrics Structure ===');
  console.log('✅ message: Success message');
  console.log('✅ eventsProcessed: Number of events processed');
  console.log('✅ eventsCreated: Number of events created');
  console.log('✅ alertsCreated: Number of alerts created');
  console.log('✅ errors: Array of error messages');
  console.log('✅ metrics: Object containing:');
  console.log('   - total_duration_ms: Total processing time');
  console.log('   - provider_processing: Per-provider metrics');
  console.log('   - avg_chunk_duration_ms: Average chunk processing time');
  console.log('   - slowest_chunk_ms: Slowest chunk processing time');
  console.log('   - memory_usage: Memory usage snapshots');
  console.log('   - providers_processed: Number of providers processed');
  console.log('✅ status: HTTP status code');

  console.log('\n=== Metrics Validation ===');
  const hasMetrics = response.metrics !== undefined;
  console.log(`Metrics included: ${hasMetrics ? '✅' : '❌'}`);

  if (hasMetrics && response.metrics) {
    const expectedFields = [
      'total_duration_ms',
      'provider_processing',
      'avg_chunk_duration_ms',
      'slowest_chunk_ms',
      'memory_usage',
      'providers_processed',
    ];

    expectedFields.forEach(field => {
      const hasField = field in response.metrics!;
      console.log(`${field}: ${hasField ? '✅' : '❌'}`);
    });
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMetricsOutput();
}
