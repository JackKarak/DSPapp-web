const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { excludedFonts } = require('./metro.assetExts');

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

// Exclude unused icon fonts to reduce bundle size
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ttf');
config.resolver.assetExts.push('ttf');

// Custom asset resolution to exclude fonts
const defaultAssetExts = config.resolver.assetExts;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude unused fonts
  if (moduleName.includes('vector-icons') && moduleName.includes('Fonts')) {
    const fontName = moduleName.split('/').pop();
    if (excludedFonts.includes(fontName)) {
      return {
        type: 'empty',
      };
    }
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

// Optimize for production
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: false,
  },
  compress: {
    drop_console: true,
    drop_debugger: true,
    pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
  },
};

module.exports = config;
