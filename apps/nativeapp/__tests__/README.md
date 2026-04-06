# Map Display Mode - Test Suite

This directory contains comprehensive tests for the Map Display Mode feature.

## Test Structure

```
__tests__/
├── utils/
│   ├── mapDisplayMode.test.ts                    # Unit tests for utility functions
│   └── mapDisplayModeStateTransitions.test.ts    # State transition logic tests
├── integration/
│   └── mapDisplayModeIntegration.test.tsx        # Integration tests
├── performance/
│   └── mapDisplayModePerformance.test.ts         # Performance benchmarks
├── POLISH_CHECKLIST.md                           # Manual testing checklist
└── README.md                                     # This file
```

## Running Tests

### Run All Tests

```bash
cd apps/nativeapp
yarn test
```

### Run Specific Test Suite

```bash
# Unit tests only
yarn test utils/mapDisplayMode

# Integration tests only
yarn test integration/mapDisplayModeIntegration

# Performance tests only
yarn test performance/mapDisplayModePerformance

# State transition tests only
yarn test utils/mapDisplayModeStateTransitions
```

### Run Tests in Watch Mode

```bash
yarn test --watch
```

### Run Tests with Coverage

```bash
yarn test --coverage
```

## Test Coverage

### Unit Tests (`utils/mapDisplayMode.test.ts`)

- ✅ `composeIncidents` function
  - Empty input handling
  - Alert grouping by siteIncidentId
  - Ignoring alerts without siteIncidentId
  - N=60 incident cap
  - Circle calculation
  - Single alert per incident
  - Missing site data handling
- ✅ `filterAlertsByDuration` function
  - Empty input handling
  - Zero/negative duration handling
  - 1-day, 7-day, 30-day filtering
  - Boundary cases
  - All alerts within duration
  - No alerts within duration

### State Transition Tests (`utils/mapDisplayModeStateTransitions.test.ts`)

- ✅ Mode switching logic
  - Clear selectedAlertId when switching to incidents
  - Clear selectedIncidentId when switching to alerts
  - Maintain mode when switching to same mode
  - Ensure only one selection active at a time
- ✅ Duration change logic
  - Update duration without affecting mode
  - Accept valid duration values (1, 3, 7, 30)
  - Reject invalid duration values
  - Work in both modes
- ✅ State consistency
  - Never have both selections set
  - Maintain duration across mode switches
  - Allow clearing selections without changing mode
- ✅ Initial state defaults
- ✅ Complex state transitions

### Integration Tests (`integration/mapDisplayModeIntegration.test.tsx`)

- ✅ Mode switching with real data flow
- ✅ Duration changes in incidents mode
- ✅ Bottom sheet data preparation
- ✅ Alert tap from incident bottom sheet
- ✅ Marker rendering in alerts mode
- ✅ Circle rendering in incidents mode
- ✅ Performance with large datasets (100+ alerts)
- ✅ Rapid duration changes
- ✅ Edge cases (empty data, alerts without incidents, mixed alerts)
- ✅ Memoization behavior

### Performance Tests (`performance/mapDisplayModePerformance.test.ts`)

- ✅ Memoization verification
- ✅ Large dataset handling (100, 200, 500 alerts)
- ✅ Rendering performance considerations
- ✅ Memory efficiency
- ✅ Rapid state changes
- ✅ Circle calculation performance

## Test Results Summary

### Expected Results

All tests should pass with the following performance characteristics:

- **Filtering 100 alerts**: < 10ms
- **Composing 60 incidents**: < 50ms
- **Filtering + composing 200 alerts**: < 100ms
- **Filtering + composing 500 alerts**: < 200ms
- **10 rapid duration changes**: < 100ms
- **20 rapid mode switches**: < 50ms

### Coverage Goals

- **Utility functions**: 100% coverage
- **State management logic**: 100% coverage
- **Integration scenarios**: Key user flows covered
- **Performance benchmarks**: All scenarios under target times

## Manual Testing

For manual testing on iOS and Android devices, refer to:

- **[POLISH_CHECKLIST.md](./POLISH_CHECKLIST.md)** - Comprehensive manual testing guide

Manual testing covers:

- Loading states
- Empty states
- Error handling
- Accessibility (VoiceOver/TalkBack)
- iOS-specific behavior
- Android-specific behavior
- Cross-platform consistency

## Debugging Tests

### Common Issues

#### Mock Not Working

If mocks aren't working, ensure `jest.setup.js` is loaded:

```javascript
// Check jest.config.js
setupFilesAfterEnv: ['<rootDir>/jest.setup.js'];
```

#### Import Errors

If you see import errors, check `moduleNameMapper` in `jest.config.js`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/app/$1',
}
```

#### Moment.js Issues

If moment.js tests fail, ensure timezone is mocked correctly:

```javascript
jest
  .spyOn(moment, 'now')
  .mockReturnValue(moment('2024-01-15T12:00:00Z').valueOf());
```

### Debugging Tips

1. **Run single test**:

   ```bash
   yarn test -t "should group alerts by siteIncidentId"
   ```

2. **Enable verbose output**:

   ```bash
   yarn test --verbose
   ```

3. **Debug in VS Code**:
   Add to `.vscode/launch.json`:
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Jest Debug",
     "program": "${workspaceFolder}/node_modules/.bin/jest",
     "args": ["--runInBand", "--no-cache"],
     "console": "integratedTerminal",
     "internalConsoleOptions": "neverOpen"
   }
   ```

## Continuous Integration

These tests should be run in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    cd apps/nativeapp
    yarn test --coverage --maxWorkers=2

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./apps/nativeapp/coverage/lcov.info
```

## Contributing

When adding new features to Map Display Mode:

1. **Write tests first** (TDD approach)
2. **Ensure all tests pass** before submitting PR
3. **Maintain coverage** at 100% for utility functions
4. **Add integration tests** for new user flows
5. **Update POLISH_CHECKLIST.md** for new manual test scenarios

## Test Maintenance

### When to Update Tests

- **New feature added**: Add corresponding tests
- **Bug fixed**: Add regression test
- **Performance optimization**: Update performance benchmarks
- **API changes**: Update integration tests
- **UI changes**: Update manual testing checklist

### Test Review Checklist

- [ ] All tests pass locally
- [ ] Coverage maintained or improved
- [ ] Performance benchmarks met
- [ ] No flaky tests (run 10 times to verify)
- [ ] Tests are readable and well-documented
- [ ] Mocks are minimal and realistic

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For questions or issues with tests:

1. Check this README
2. Review test comments for context
3. Check POLISH_CHECKLIST.md for manual testing guidance
4. Consult team documentation
