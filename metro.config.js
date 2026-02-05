const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.platforms = ['ios', 'android', 'web'];

// Platform-specific extensions resolution order
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.ts', 'web.tsx', 'web.js', 'web.jsx'];

// Disable problematic features for React Native compatibility
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
