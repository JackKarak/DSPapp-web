/**
 * Platform Detection Utility
 * 
 * Provides utilities for detecting the current platform and conditionally
 * loading platform-specific implementations.
 */

import { Platform } from 'react-native';

/**
 * Check if running on web platform
 */
export const isWeb = Platform.OS === 'web';

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Check if running on native platform (iOS or Android)
 */
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Get platform-specific value
 * @example
 * const padding = platformSelect({ web: 20, native: 16 });
 */
export function platformSelect<T>(values: { web?: T; native?: T; ios?: T; android?: T; default?: T }): T | undefined {
  if (isIOS && values.ios !== undefined) {
    return values.ios;
  }
  if (isAndroid && values.android !== undefined) {
    return values.android;
  }
  if (isWeb && values.web !== undefined) {
    return values.web;
  }
  if (isNative && values.native !== undefined) {
    return values.native;
  }
  return values.default;
}

/**
 * Conditionally execute code based on platform
 */
export async function platformExecute<T>(handlers: {
  web?: () => T | Promise<T>;
  native?: () => T | Promise<T>;
  ios?: () => T | Promise<T>;
  android?: () => T | Promise<T>;
  default?: () => T | Promise<T>;
}): Promise<T | undefined> {
  if (isIOS && handlers.ios) {
    return await handlers.ios();
  }
  if (isAndroid && handlers.android) {
    return await handlers.android();
  }
  if (isWeb && handlers.web) {
    return await handlers.web();
  }
  if (isNative && handlers.native) {
    return await handlers.native();
  }
  if (handlers.default) {
    return await handlers.default();
  }
  return undefined;
}
