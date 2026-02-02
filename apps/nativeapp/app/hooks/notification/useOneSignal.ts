/**
 * OneSignal consumer hook. Init and state live in OneSignalProvider (contexts/OneSignalContext).
 * Re-exports useOneSignal and OneSignalProvider for backward compatibility.
 */

export {
  useOneSignal,
  OneSignalProvider,
  OneSignalContext,
  type OneSignalContextValue,
  type OneSignalProviderProps,
} from '../../contexts/OneSignalContext';
