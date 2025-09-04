# 🚨 URGENT: Mac Build Fix for Alyssa

## Problem Identified ✅

Alyssa's Mac has the **old problematic package.json** with incompatible package versions:
- `expo-symbols@~0.1.7` (doesn't exist on npm - causes ETARGET error)
- `@react-native-community/datetimepicker@^8.2.0` (requires Expo 52+, conflicts with Expo 50)
- `react-native-modal-datetime-picker@^17.1.0` (incompatible with Expo 50)

**Our Windows version has the FIXED package.json with compatible versions.**

## IMMEDIATE SOLUTION 🛠️

### Step 1: Pull Latest Changes
```bash
cd /Users/alyssamanchester/Documents/DSPapp
git pull origin main
```

### Step 2: Verify Fixed package.json
After pulling, check that package.json contains these CORRECT versions:
```json
{
  "@expo/vector-icons": "^13.0.0",
  "@react-native-community/datetimepicker": "7.6.2",
  "react-native-modal-datetime-picker": "^13.0.0",
  "expo": "~50.0.6"
}
```

**Should NOT contain:**
- ❌ `expo-symbols@~0.1.7`
- ❌ `@react-native-community/datetimepicker@^8.2.0`
- ❌ `react-native-modal-datetime-picker@^17.1.0`

### Step 3: Clean Install
```bash
rm -rf node_modules package-lock.json ios
npm install
```

### Step 4: Generate iOS Project
```bash
npx expo prebuild --platform ios --clean
```

### Step 5: Install Pods
```bash
cd ios && pod install --repo-update && cd ..
```

### Step 6: Open in Xcode
```bash
open ios/TheDSPApp.xcworkspace
```

## Alternative: Manual package.json Fix

If git pull doesn't work, manually replace package.json content with:

```json
{
  "name": "dspapp",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "dependencies": {
    "@expo/vector-icons": "^13.0.0",
    "@react-native-async-storage/async-storage": "1.21.0",
    "@react-native-community/datetimepicker": "7.6.2",
    "@react-native-picker/picker": "2.6.1",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/elements": "^1.3.21",
    "@react-navigation/native": "^6.1.9",
    "@supabase/supabase-js": "^2.39.3",
    "expo": "~50.0.6",
    "expo-blur": "~12.9.2",
    "expo-constants": "~15.4.5",
    "expo-document-picker": "~11.10.1",
    "expo-font": "~11.10.3",
    "expo-haptics": "~12.8.1",
    "expo-image": "~1.10.6",
    "expo-linking": "~6.2.2",
    "expo-router": "~3.4.7",
    "expo-splash-screen": "~0.26.4",
    "expo-status-bar": "~1.11.1",
    "expo-system-ui": "~2.9.3",
    "expo-web-browser": "~12.8.2",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.73.4",
    "react-native-calendars": "^1.1306.0",
    "react-native-confetti-cannon": "^1.5.2",
    "react-native-dropdown-picker": "^5.4.6",
    "react-native-gesture-handler": "~2.14.0",
    "react-native-google-places-autocomplete": "^2.5.6",
    "react-native-modal-datetime-picker": "^13.0.0",
    "react-native-modal-selector": "^2.1.2",
    "react-native-paper": "^5.12.3",
    "react-native-reanimated": "~3.6.2",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "react-native-svg": "14.1.0",
    "react-native-vector-icons": "^10.1.0",
    "react-native-web": "~0.19.6",
    "react-native-webview": "^13.6.4"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3"
  },
  "private": true
}
```

## Expected Result ✅

After these steps:
- `npm install` should complete without ERESOLVE errors
- `npx expo prebuild --platform ios --clean` should work
- No more "expo-symbols@~0.1.7" ETARGET errors
- No more peer dependency conflicts

## Root Cause 📝

The issue was that Alyssa's Mac repository wasn't updated with our Windows fixes. We already solved all these package version conflicts on Windows, but she had the old problematic versions.

## Next Steps After Fix 🚀

1. ✅ Clean iOS build
2. ✅ Open in Xcode
3. ✅ Test in iOS Simulator
4. ✅ Archive for TestFlight

**This should completely resolve all the npm errors she's experiencing!**
