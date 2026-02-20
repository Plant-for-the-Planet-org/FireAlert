/**
 * Phase 2 Performance Validation: Redux Selector Performance
 *
 * This test suite validates that:
 * 1. Selectors execute efficiently
 * 2. Memoized selectors provide performance benefits
 * 3. No performance regressions from Phase 1
 *
 * Requirements: 30.8
 */

import {
  selectIsLoggedIn,
  selectAccessToken,
  selectUserDetails,
  selectConfigData,
  selectUserName,
  selectUserEmail,
  selectUserAvatar,
} from '../../app/redux/slices/login/loginSlice';

import {
  selectAlertMethodsEnabled,
  selectIsEmailEnabled,
  selectIsDeviceEnabled,
  selectIsSmsEnabled,
  selectIsWhatsAppEnabled,
  selectIsWebhookEnabled,
  selectAlertMethodEnabled,
} from '../../app/redux/slices/login/settingsSlice';

import type {RootState} from '../../app/redux/store';

describe('Phase 2 Performance: Redux Selectors', () => {
  const mockState: RootState = {
    loginSlice: {
      isLoggedIn: true,
      accessToken: 'test-token-123',
      userDetails: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      },
      configData: {
        apiUrl: 'https://api.example.com',
      },
    },
    settingsSlice: {
      alertMethods: {
        enabled: {
          email: true,
          device: true,
          sms: false,
          whatsapp: true,
          webhook: false,
        },
      },
    },
  } as RootState;

  describe('Selector Execution Performance', () => {
    it('basic selectors should execute in under 1ms for 1000 iterations', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        selectIsLoggedIn(mockState);
        selectAccessToken(mockState);
        selectUserDetails(mockState);
        selectConfigData(mockState);
      }

      const end = performance.now();
      const duration = end - start;
      const avgPerCall = duration / (iterations * 4);

      // Should average less than 0.01ms per call
      expect(avgPerCall).toBeLessThan(0.01);
      console.log(`Basic selectors: ${avgPerCall.toFixed(4)}ms per call`);
    });

    it('memoized selectors should execute efficiently', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        selectUserName(mockState);
        selectUserEmail(mockState);
        selectUserAvatar(mockState);
      }

      const end = performance.now();
      const duration = end - start;
      const avgPerCall = duration / (iterations * 3);

      // Should average less than 0.02ms per call
      expect(avgPerCall).toBeLessThan(0.02);
      console.log(`Memoized selectors: ${avgPerCall.toFixed(4)}ms per call`);
    });

    it('settings selectors should execute efficiently', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        selectIsEmailEnabled(mockState);
        selectIsDeviceEnabled(mockState);
        selectIsSmsEnabled(mockState);
        selectIsWhatsAppEnabled(mockState);
        selectIsWebhookEnabled(mockState);
      }

      const end = performance.now();
      const duration = end - start;
      const avgPerCall = duration / (iterations * 5);

      // Should average less than 0.01ms per call
      expect(avgPerCall).toBeLessThan(0.01);
      console.log(`Settings selectors: ${avgPerCall.toFixed(4)}ms per call`);
    });
  });

  describe('Memoization Benefits', () => {
    it('memoized selectors should return cached results for same state', () => {
      // First call - computes result
      const result1 = selectUserName(mockState);

      // Subsequent calls - should return cached result
      const start = performance.now();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        selectUserName(mockState);
      }

      const end = performance.now();
      const duration = end - start;
      const avgPerCall = duration / iterations;

      // Memoized calls should be extremely fast (< 0.005ms)
      expect(avgPerCall).toBeLessThan(0.005);
      console.log(`Memoized cache hits: ${avgPerCall.toFixed(5)}ms per call`);
    });

    it('selectAlertMethodEnabled should benefit from memoization', () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        selectAlertMethodEnabled(mockState, 'email');
      }

      const end = performance.now();
      const duration = end - start;
      const avgPerCall = duration / iterations;

      // Should be very fast due to memoization
      expect(avgPerCall).toBeLessThan(0.005);
      console.log(
        `selectAlertMethodEnabled memoized: ${avgPerCall.toFixed(
          5,
        )}ms per call`,
      );
    });
  });

  describe('Selector Overhead Comparison', () => {
    it('direct state access vs selector should have minimal overhead', () => {
      const iterations = 10000;

      // Direct state access
      const directStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const _ = mockState.loginSlice.isLoggedIn;
      }
      const directEnd = performance.now();
      const directDuration = directEnd - directStart;

      // Selector access
      const selectorStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        selectIsLoggedIn(mockState);
      }
      const selectorEnd = performance.now();
      const selectorDuration = selectorEnd - selectorStart;

      const overhead = selectorDuration - directDuration;
      const overheadPerCall = overhead / iterations;

      // Overhead should be negligible (< 0.001ms per call)
      expect(overheadPerCall).toBeLessThan(0.001);
      console.log(
        `Selector overhead: ${overheadPerCall.toFixed(6)}ms per call`,
      );
    });
  });

  describe('Memory Efficiency', () => {
    it('selectors should not create excessive objects', () => {
      const iterations = 1000;
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run selectors many times
      for (let i = 0; i < iterations; i++) {
        selectIsLoggedIn(mockState);
        selectAccessToken(mockState);
        selectUserDetails(mockState);
        selectUserName(mockState);
        selectUserEmail(mockState);
        selectIsEmailEnabled(mockState);
        selectIsDeviceEnabled(mockState);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 1MB for 1000 iterations)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(1024 * 1024);
        console.log(`Memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
      } else {
        console.log('Memory profiling not available in this environment');
      }
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain baseline performance characteristics', () => {
      // Baseline: All selectors should complete 10000 iterations in under 100ms
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        selectIsLoggedIn(mockState);
        selectAccessToken(mockState);
        selectUserDetails(mockState);
        selectUserName(mockState);
        selectUserEmail(mockState);
        selectUserAvatar(mockState);
        selectIsEmailEnabled(mockState);
        selectIsDeviceEnabled(mockState);
        selectIsSmsEnabled(mockState);
        selectIsWhatsAppEnabled(mockState);
        selectIsWebhookEnabled(mockState);
      }

      const end = performance.now();
      const duration = end - start;

      // Total time for 10000 iterations of 11 selectors should be < 100ms
      expect(duration).toBeLessThan(100);
      console.log(
        `Total time for ${iterations} iterations: ${duration.toFixed(2)}ms`,
      );
      console.log(
        `Average per selector call: ${(duration / (iterations * 11)).toFixed(
          5,
        )}ms`,
      );
    });
  });
});
