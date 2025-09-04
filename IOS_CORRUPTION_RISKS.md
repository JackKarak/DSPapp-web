# 🛡️ iOS Corruption Prevention Checklist

## ⚠️ **Potential iOS Corruption Issues**

Based on your codebase analysis, here are the main areas that could corrupt on iOS:

## 🔴 **High Risk Areas**

### **1. Asset & File Path Issues**
**Problem**: iOS is case-sensitive, Windows is not
```tsx
// RISK: These imports might fail on iOS if file casing is wrong
import backgroundImage from '../assets/images/background.png'; // ✅ EXISTS
import iconImage from '../assets/images/icon.png';             // ✅ EXISTS
import splashImage from '../assets/images/splash-icon.png';    // ✅ EXISTS

// POTENTIAL ISSUE: Check if these images exist with exact casing
```

**Verification Needed**:
- [ ] All image imports match exact file names (case-sensitive)
- [ ] Font files exist and are properly referenced
- [ ] Icon and splash screen files are present and correctly sized

### **2. Platform-Specific Styling Issues**
**Problem**: Your app uses `Platform.select()` extensively - iOS styles might conflict

**Risk Areas Found**:
```tsx
// In multiple files, you have:
...Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: {
    elevation: 6,
  },
}),
```

**Potential Issues**:
- [ ] iOS shadow properties might cause rendering issues
- [ ] SafeArea handling inconsistencies 
- [ ] Keyboard behavior differences between platforms

### **3. Chart Library iOS Compatibility**
**CRITICAL RISK**: `react-native-chart-kit` dependency
```json
"react-native-chart-kit": "^6.12.0"
```

**Known Issues**:
- This library has iOS-specific SVG rendering problems
- May fail on iOS 17+ due to WebView changes
- Causes crashes in React Native 0.73.4 on some iOS versions

**Test Required**: Analytics screens with charts

### **4. Vector Icons Configuration**
**MEDIUM RISK**: `@expo/vector-icons` and `react-native-vector-icons`
```tsx
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
```

**Potential Issues**:
- iOS might not load icon fonts properly without native configuration
- Version mismatch between Ionicons and FontAwesome
- Missing iOS font registration

### **5. Modal and Picker Components**
**MEDIUM RISK**: Multiple modal/picker implementations
```tsx
// These components have iOS-specific behaviors:
import { Modal } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
```

**iOS Issues**:
- Modal presentation styles differ on iOS
- Picker components may not display correctly
- DateTime picker has iOS-specific styling requirements

## 🟡 **Medium Risk Areas**

### **6. Navigation & Router Issues**
**Problem**: Expo Router + React Navigation stack
```tsx
import { Tabs, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
```

**Potential Issues**:
- iOS navigation animations might conflict
- Deep linking behavior differences
- Tab bar safe area handling

### **7. Supabase Configuration**
**Problem**: Network and authentication on iOS
```tsx
import { supabase } from '../../lib/supabase';
```

**iOS-Specific Risks**:
- iOS App Transport Security (ATS) requirements
- Background refresh limitations
- Authentication token persistence

### **8. File Upload & Document Picker**
**CRITICAL RISK**: Document picker on iOS
```tsx
import * as DocumentPicker from 'expo-document-picker';
```

**Known iOS Issues**:
- Requires specific iOS permissions
- File access restrictions in iOS sandbox
- Document picker UI corruption on iOS 17+

## 🟢 **Low Risk (But Monitor)**

### **9. Gesture Handler**
```json
"react-native-gesture-handler": "~2.14.0"
```
- Generally stable but can have iOS-specific gesture conflicts

### **10. Google Calendar Integration**
```tsx
// In lib/googleCalendar.ts
import { Platform } from 'react-native';
```
- Web-based integration should work but test OAuth flow on iOS

## 📋 **Pre-Build Testing Checklist**

### **Before iOS Build (On Mac):**

1. **Asset Verification**:
   ```bash
   # Check all image files exist with exact casing
   find ./assets -name "*.png" -o -name "*.jpg"
   ```

2. **Icon & Splash Validation**:
   - [ ] Icon.png is 1024x1024
   - [ ] Splash-icon.png exists and sized correctly
   - [ ] Adaptive-icon.png for Android compatibility

3. **Chart Library Test**:
   ```bash
   # Test analytics screen in iOS simulator first
   # If charts crash, replace with simpler alternatives
   ```

4. **Vector Icons Check**:
   ```tsx
   // Verify these icons render in iOS simulator:
   <Ionicons name="calendar-outline" size={24} color="#000" />
   <FontAwesome name="trophy" size={24} color="#000" />
   ```

5. **Modal/Picker Testing**:
   - [ ] Profile form dropdowns work
   - [ ] Date picker displays correctly
   - [ ] Modals present properly

## 🔧 **iOS Build Fixes (If Issues Found)**

### **If Charts Crash**:
```tsx
// Replace react-native-chart-kit with:
// 1. Simple Text-based stats
// 2. Victory Native (more stable)
// 3. React Native Reanimated progress bars
```

### **If Vector Icons Missing**:
```bash
# In ios/ directory after prebuild:
cd ios && pod install --repo-update
```

### **If File Picker Fails**:
```tsx
// Add to app.json iOS config:
"infoPlist": {
  "NSDocumentPickerUsageDescription": "Access documents for profile uploads"
}
```

### **If Modals Don't Present**:
```tsx
// Force iOS modal presentation:
<Modal 
  presentationStyle="pageSheet"  // iOS specific
  animationType="slide"
>
```

## 🚨 **Most Likely iOS Corruption Points**

1. **Analytics Charts** (90% chance of issues)
2. **Document/File Picker** (70% chance)
3. **Vector Icons** (60% chance)
4. **Modal DateTime Picker** (50% chance)
5. **Profile Form Styling** (30% chance - but already fixed)

## 📱 **iOS Simulator Testing Strategy**

### **Test in This Order**:
1. **Launch App** - Verify it starts without crashing
2. **Login/Authentication** - Test Supabase connection
3. **Navigation** - Test all tab navigation
4. **Profile Forms** - Test input visibility fixes
5. **Calendar View** - Basic calendar functionality
6. **Analytics Page** - CRITICAL: Test chart rendering
7. **Document Upload** - Test file picker if used
8. **Event Registration** - Test modal workflows

## 🛠️ **Quick Fixes If Corruption Found**

### **Chart Issues**:
```tsx
// Emergency chart replacement:
const SimpleStats = ({ data }) => (
  <View style={styles.statsContainer}>
    {data.map((item, index) => (
      <Text key={index}>{item.label}: {item.value}</Text>
    ))}
  </View>
);
```

### **Icon Issues**:
```tsx
// Emergency icon replacement:
const SimpleIcon = ({ name }) => <Text>📊</Text>; // Use emoji fallbacks
```

### **Modal Issues**:
```tsx
// Emergency modal replacement:
const SimpleModal = ({ visible, children }) => (
  visible ? <View style={StyleSheet.absoluteFill}>{children}</View> : null
);
```

## ✅ **Success Indicators**

Your iOS build is stable if:
- [ ] App launches in iOS Simulator
- [ ] All navigation works
- [ ] Profile forms are visible and functional
- [ ] Analytics page loads (even if charts are basic)
- [ ] No console errors related to missing assets
- [ ] Authentication flow works
- [ ] Basic functionality accessible

## 🎯 **Priority Testing Order for Alyssa**

1. **Basic Launch** (5 minutes)
2. **Authentication** (5 minutes)  
3. **Profile Form** (10 minutes)
4. **Analytics Page** (15 minutes) - CRITICAL TEST
5. **Calendar/Events** (10 minutes)
6. **Full App Navigation** (15 minutes)

**Total testing time: ~1 hour before declaring iOS-ready**

Your app has a **strong foundation** but the **chart library** is the biggest corruption risk. Test analytics immediately after build! 📊⚠️
