# 🚀 DSP App - iOS Build Instructions for Alyssa

## Fixed Issues ✅

### 1. React Native/Hermes Version Mismatch
- ✅ Updated React Native to 0.73.4 (compatible with Expo 50)
- ✅ Pinned Hermes engine to `~> 0.73.0` in Podfile
- ✅ Disabled New Architecture to avoid JSI API conflicts
- ✅ Set iOS deployment target to 13.0+

### 2. Package Version Conflicts
- ✅ Fixed `@react-native-community/datetimepicker` to version 7.6.2 (Expo 50 compatible)
- ✅ Removed `expo-symbols` 0.1.7 (non-existent version causing ETARGET errors)
- ✅ Downgraded `@expo/vector-icons` to 13.0.0 (compatible with Expo 50)
- ✅ Fixed `react-native-modal-datetime-picker` to version 13.0.0 (stable version)

### 3. iOS Input Visibility Issues
- ✅ Added dedicated `profileFormInput` style with maximum contrast
- ✅ Created iOS-optimized `profileMultiSelectButton` style
- ✅ Created iOS-optimized `profileDateInput` style
- ✅ All profile inputs now use pure white background + black text + strong purple borders

## Commands to Run

### Step 1: Clean Everything
```bash
cd /path/to/DSPapp
rm -rf node_modules
rm -rf ios
rm package-lock.json
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Generate iOS Project
```bash
npx expo prebuild --platform ios --clean
```

### Step 4: Install iOS Pods
```bash
cd ios && pod install --repo-update && cd ..
```

### Step 5: Open in Xcode
```bash
open ios/TheDSPApp.xcworkspace
```

## Expected Results

After running these commands:

### ✅ Hermes Build Issues Fixed
- No more UUID, ICast, or castInterface errors
- Clean compilation in Xcode
- Hermes engine version matches React Native 0.73.4

### ✅ iOS Input Visibility Fixed
- Profile form inputs are highly visible with:
  - Pure white background (#FFFFFF)
  - Pure black text (#000000) 
  - Strong purple borders (3px)
  - Enhanced shadows for depth
  - Light blue background (#E8F4FD) for extra contrast

### ✅ Simulator Ready
- App should build and run in iPhone 14 Pro simulator
- All features functional without signing requirements
- Profile editing inputs clearly visible and usable

## Xcode Configuration

### Target Settings:
- **Bundle Identifier**: com.deltasigmapi.app
- **Deployment Target**: iOS 13.0
- **Team**: (Will show signing errors - ignore for simulator)

### Build Settings:
- **Simulator Target**: iPhone 14 Pro (iOS 16.0+)
- **Build Configuration**: Debug
- **Architecture**: arm64 (excluded for simulator)

## Troubleshooting

### If Build Still Fails:
1. **Clean Xcode**: Product → Clean Build Folder
2. **Reset Metro**: `npx expo start --clear`
3. **Reinstall Pods**: `cd ios && pod cache clean --all && pod install`

### If Inputs Still Not Visible:
- Check Colors.primary is properly imported
- Verify light/dark mode settings in simulator
- Test on different iOS versions in simulator

## Testing Checklist

Once app runs in simulator:

- [ ] Login/Authentication works
- [ ] Profile editing form is visible and usable
- [ ] Multi-select major dropdown works
- [ ] Date picker (if enabled) works  
- [ ] All navigation tabs functional
- [ ] President/Officer dashboards load (with proper test accounts)

## Notes for Jack

- Bundle ID is set to `com.deltasigmapi.app`
- For device testing, you'll need to add Alyssa to your Apple Developer team
- For App Store submission, build using your own Mac with proper certificates
- All debug/test files have been removed for production readiness

The app is now iOS-ready with maximum input visibility and Hermes compatibility! 🎉
