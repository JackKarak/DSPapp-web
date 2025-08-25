/**
 * DSP App Color System
 * Primary colors: Purple (#330066) and Gold (#F7B910)
 */

const dspPurple = '#330066';
const dspGold = '#F7B910';
const dspPurpleLight = '#4d0099'; // Lighter shade for hover states
const dspPurpleDark = '#1a0033'; // Darker shade for dark mode

export const Colors = {
  // DSP Brand Colors
  primary: dspPurple,
  secondary: dspGold,
  primaryLight: dspPurpleLight,
  primaryDark: dspPurpleDark,
  
  light: {
    text: '#11181C',
    background: '#fff',
    tint: dspPurple,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: dspPurple,
    primary: dspPurple,
    secondary: dspGold,
    accent: dspGold,
    cardBackground: '#fff',
    borderColor: '#e0e0e0',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: dspGold,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: dspGold,
    primary: dspPurpleLight,
    secondary: dspGold,
    accent: dspGold,
    cardBackground: '#1f1f1f',
    borderColor: '#333',
  },
};
