const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Disable problematic features for React Native compatibility
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
