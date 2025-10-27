# DSPapp Testing Checklist

## Date: October 27, 2025
## Status: READY FOR TESTING

---

## 🧪 Testing Overview

This checklist covers all critical areas that must be tested before Apple App Store submission.

---

## ✅ Phase 1: Critical Fixes Verification

### 1.1 Navigation Bug Fix
- [ ] Open app as President user
- [ ] Navigate to President section
- [ ] **VERIFY**: Only 5 tabs visible (Home, Analytics, Approve, Appeals, Register)
- [ ] **FAIL IF**: More than 5 tabs showing
- [ ] Tap each tab and verify it works

**Expected Result**: Exactly 5 tabs, all functional

---

### 1.2 Accessibility Testing

#### Login Screen
- [ ] Enable VoiceOver (iOS: Settings → Accessibility → VoiceOver)
- [ ] Navigate to login screen
- [ ] **VERIFY**: Email input has label "Email address"
- [ ] **VERIFY**: Password input has label "Password"
- [ ] **VERIFY**: Show/hide password button announces state
- [ ] **VERIFY**: Sign in button has clear label
- [ ] **VERIFY**: Forgot password button is accessible
- [ ] **VERIFY**: Sign up button is accessible

**Expected Result**: All elements clearly announced by VoiceOver

#### Reset Password Screen
- [ ] Navigate to reset password screen
- [ ] **VERIFY**: New password input accessible
- [ ] **VERIFY**: Confirm password input accessible
- [ ] **VERIFY**: Show/hide buttons work with VoiceOver
- [ ] **VERIFY**: Reset button clearly labeled
- [ ] **VERIFY**: Cancel button accessible

**Expected Result**: Complete VoiceOver navigation possible

#### Data Consent Modal
- [ ] Trigger data consent modal
- [ ] **VERIFY**: Each of 4 switches has clear label
- [ ] **VERIFY**: Switches announce checked/unchecked state
- [ ] **VERIFY**: "Skip All" button accessible
- [ ] **VERIFY**: "Continue" button accessible
- [ ] **VERIFY**: Close button accessible

**Expected Result**: All consent options navigable via VoiceOver

---

### 1.3 Privacy Implementation
- [ ] Open app for first time (new user)
- [ ] **VERIFY**: Data consent modal appears
- [ ] **VERIFY**: Can skip all data sharing
- [ ] **VERIFY**: Can select individual categories
- [ ] **VERIFY**: Privacy policy link works
- [ ] **VERIFY**: Terms of service link works
- [ ] **VERIFY**: Can close modal

**Expected Result**: Full privacy consent flow works

---

## ✅ Phase 2: Core Functionality Testing

### 2.1 Authentication Flow

#### Sign Up
- [ ] Open app
- [ ] Tap "Sign Up"
- [ ] Enter email (test@example.com)
- [ ] Enter password (Test123!)
- [ ] **VERIFY**: Validation errors show for weak password
- [ ] **VERIFY**: Email validation works
- [ ] **VERIFY**: Success message after signup
- [ ] **VERIFY**: Check email for confirmation link

**Expected Result**: Signup completes, email sent

#### Login
- [ ] Enter valid email
- [ ] Enter valid password
- [ ] Tap "Sign In"
- [ ] **VERIFY**: Loading indicator shows
- [ ] **VERIFY**: Navigates to correct screen based on role
  - Member → Main tabs
  - Officer → Officer dashboard
  - President → President dashboard

**Expected Result**: Successful login, correct navigation

#### Password Reset
- [ ] On login screen, enter email
- [ ] Tap "Forgot your password?"
- [ ] **VERIFY**: "Check Your Email" alert appears
- [ ] Check email inbox
- [ ] Click reset link in email
- [ ] **VERIFY**: Opens reset password screen
- [ ] Enter new password
- [ ] Confirm password
- [ ] Tap "Reset Password"
- [ ] **VERIFY**: Success message
- [ ] **VERIFY**: Redirects to login
- [ ] Login with new password
- [ ] **VERIFY**: Login successful

**Expected Result**: Complete password reset flow works

---

### 2.2 Navigation Testing

#### Member Navigation
- [ ] Login as regular member
- [ ] **VERIFY**: See 4 tabs (Home, Attendance, Newsletter, Points, Account)
- [ ] Tap each tab
- [ ] **VERIFY**: All tabs load correctly
- [ ] **VERIFY**: No errors in console

**Expected Result**: All member tabs functional

#### Officer Navigation
- [ ] Login as officer
- [ ] **VERIFY**: See officer dashboard
- [ ] Navigate to Analytics
- [ ] Navigate to Events
- [ ] Navigate to Register
- [ ] **VERIFY**: All screens load

**Expected Result**: All officer screens accessible

#### President Navigation
- [ ] Login as president/admin
- [ ] **VERIFY**: See exactly 5 tabs
- [ ] Tap Home → loads
- [ ] Tap Analytics → loads
- [ ] Tap Approve → loads
- [ ] Tap Appeals → loads
- [ ] Tap Register → loads
- [ ] **VERIFY**: No extra tabs appear

**Expected Result**: 5 tabs only, all functional ✅

---

### 2.3 Offline Testing

#### Network Connectivity
- [ ] Turn off WiFi and cellular data
- [ ] Try to login
- [ ] **VERIFY**: Error message about no connection
- [ ] Turn on network
- [ ] Try login again
- [ ] **VERIFY**: Login succeeds

**Expected Result**: Graceful offline handling

---

## ✅ Phase 3: Error Handling Testing

### 3.1 Form Validation

#### Login Errors
- [ ] Leave email blank, tap Sign In
- [ ] **VERIFY**: Error message appears
- [ ] Enter invalid email format
- [ ] **VERIFY**: Validation error shows
- [ ] Enter wrong password
- [ ] **VERIFY**: Clear error message

**Expected Result**: All validation errors show

#### Sign Up Errors
- [ ] Try weak password (e.g., "123")
- [ ] **VERIFY**: Password requirements shown
- [ ] Try duplicate email
- [ ] **VERIFY**: "Email already exists" error

**Expected Result**: Helpful error messages

---

### 3.2 Edge Cases

#### Rapid Tapping
- [ ] Rapidly tap Sign In button multiple times
- [ ] **VERIFY**: Only one request sent
- [ ] **VERIFY**: Button disabled during loading

**Expected Result**: No duplicate requests

#### Long Text
- [ ] Enter very long email (100+ characters)
- [ ] **VERIFY**: Field handles gracefully
- [ ] Enter very long password
- [ ] **VERIFY**: No crashes

**Expected Result**: Handles edge cases gracefully

---

## ✅ Phase 4: Device Testing

### 4.1 iPhone Sizes
Test on multiple screen sizes:
- [ ] iPhone SE (small screen - 4.7")
- [ ] iPhone 15 Pro (standard - 6.1")
- [ ] iPhone 15 Pro Max (large - 6.7")

**VERIFY for each**:
- [ ] All text readable
- [ ] No UI overlap
- [ ] Buttons reachable
- [ ] Keyboard doesn't cover inputs

**Expected Result**: Works on all sizes

### 4.2 Orientation
- [ ] Test in portrait mode
- [ ] Try rotating to landscape
- [ ] **VERIFY**: App stays in portrait (locked)

**Expected Result**: Portrait only (as configured)

---

## ✅ Phase 5: Performance Testing

### 5.1 Loading Times
- [ ] Measure app startup time
- [ ] **TARGET**: < 3 seconds to login screen
- [ ] Measure login response time
- [ ] **TARGET**: < 2 seconds to dashboard

### 5.2 Memory Usage
- [ ] Open app
- [ ] Navigate through all screens
- [ ] **VERIFY**: No memory leaks
- [ ] **VERIFY**: App doesn't crash on background/foreground

**Expected Result**: Stable performance

---

## 🐛 Known Issues to Watch For

### Critical (Must Fix)
- [ ] Navigation showing more than 5 tabs
- [ ] App crashes on any screen
- [ ] Unable to login
- [ ] VoiceOver completely broken

### High Priority
- [ ] Password reset link doesn't work
- [ ] Forms don't validate
- [ ] Network errors not handled
- [ ] Memory leaks

### Medium Priority
- [ ] Slow loading times
- [ ] UI alignment issues
- [ ] Minor accessibility gaps

---

## 📝 Testing Notes Template

### Test Session: [Date/Time]
**Device**: 
**iOS Version**: 
**Tester**: 

#### Issues Found:
1. **[Issue Title]**
   - **Severity**: Critical/High/Medium/Low
   - **Steps to Reproduce**:
   - **Expected**: 
   - **Actual**: 
   - **Screenshot**: 

---

## ✅ Testing Sign-Off

### Phase 1: Critical Fixes ⬜
- [ ] Navigation verified (5 tabs only)
- [ ] Accessibility tested
- [ ] Privacy flow works
- **Tester**: _____________ Date: _______

### Phase 2: Core Functionality ⬜
- [ ] Authentication complete
- [ ] All navigation works
- [ ] Offline handling tested
- **Tester**: _____________ Date: _______

### Phase 3: Error Handling ⬜
- [ ] Form validation works
- [ ] Edge cases handled
- **Tester**: _____________ Date: _______

### Phase 4: Device Testing ⬜
- [ ] Multiple screen sizes
- [ ] Orientation locked
- **Tester**: _____________ Date: _______

### Phase 5: Performance ⬜
- [ ] Load times acceptable
- [ ] Memory stable
- **Tester**: _____________ Date: _______

---

## 🚀 Ready for Submission When:

- [x] All critical fixes verified
- [ ] All core functionality works
- [ ] Accessibility fully functional
- [ ] No critical or high bugs
- [ ] Tested on 3+ device sizes
- [ ] Performance acceptable

**Estimated Testing Time**: 3-5 hours for complete pass

---

## 📱 How to Test

### Option 1: Expo Go (Development)
```bash
npx expo start
# Scan QR code with Expo Go app
```

**Limitations**: Some features may not work (e.g., SecureStore)

### Option 2: Development Build (Recommended)
```bash
eas build --profile development --platform ios
# Install on device
```

**Benefits**: Full feature testing, closest to production

### Option 3: TestFlight (Pre-Production)
```bash
eas build --profile preview --platform ios
eas submit --platform ios
```

**Benefits**: Exact production experience

---

**Start testing and mark items as complete!** ✅
