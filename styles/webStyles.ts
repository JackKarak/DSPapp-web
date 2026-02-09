/**
 * Web-specific Style Enhancements
 * 
 * Additional styles that improve the web experience
 */

import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export const webStyles = StyleSheet.create({
  // Container for web that centers content on large screens
  webContainer: {
    maxWidth: isDesktop ? 1200 : '100%',
    marginHorizontal: 'auto' as any,
    width: '100%',
  },

  // Form container on web - narrower for better readability
  webFormContainer: {
    maxWidth: isDesktop ? 600 : '100%',
    marginHorizontal: 'auto' as any,
    width: '100%',
    padding: 20,
  },

  // Card container for web with better shadows
  webCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    // Web-specific shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Input styles optimized for web
  webInput: {
    outlineStyle: 'none' as any,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },

  webInputFocused: {
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },

  // Button optimized for web (hover states handled by CSS)
  webButton: {
    userSelect: 'none' as any,
  },

  // Text selection enabled for web
  webSelectableText: {
    userSelect: 'text' as any,
    cursor: 'text' as any,
  },

  // Scrollable area for web
  webScrollable: {
    overflowY: 'auto' as any,
    height: '100%',
  },

  // Responsive grid for web
  webGrid: {
    display: 'flex' as any,
    flexDirection: isDesktop ? 'row' : 'column',
    flexWrap: 'wrap' as any,
  },

  webGridItem: {
    minWidth: isDesktop ? 300 : undefined,
  },
});

// Helper function to merge web styles
export function mergeWebStyles(...styles: any[]) {
  return StyleSheet.flatten(styles);
}

// Platform-specific style helper
export function webStyle(webStyleObj: any, nativeStyleObj: any) {
  return typeof window !== 'undefined' ? webStyleObj : nativeStyleObj;
}
