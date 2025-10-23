# Error Boundary Implementation Guide

## Overview
Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of crashing the entire application.

## Implementation Summary

### Files Created
1. **`components/ErrorBoundary.tsx`** - Reusable error boundary components

### Files Modified
1. **`app/_layout.tsx`** - Root-level error boundary
2. **`app/(tabs)/_layout.tsx`** - Tab navigation error boundary
3. **`app/officer/_layout.tsx`** - Officer routes error boundary
4. **`app/president/_layout.tsx`** - President routes error boundary

## Error Boundary Components

### 1. Main ErrorBoundary Component
**Location**: `components/ErrorBoundary.tsx`

**Features**:
- ✅ Catches all JavaScript errors in child component tree
- ✅ Displays user-friendly error message
- ✅ Shows technical details in development mode
- ✅ Provides "Try Again" button to reset error state
- ✅ Supports custom fallback UI
- ✅ Supports custom error callback for logging
- ✅ Supports reset keys for automatic error recovery

**Basic Usage**:
```tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Advanced Usage**:
```tsx
// Custom fallback UI
<ErrorBoundary fallback={<CustomErrorScreen />}>
  <YourComponent />
</ErrorBoundary>

// Error logging callback
<ErrorBoundary 
  onError={(error, errorInfo) => {
    // Log to analytics service
    analytics.logError(error);
  }}
>
  <YourComponent />
</ErrorBoundary>

// Auto-reset on prop change
<ErrorBoundary resetKeys={[userId, dataVersion]}>
  <YourComponent />
</ErrorBoundary>
```

### 2. DataErrorBoundary Component
**Purpose**: Specialized error boundary for data loading errors

**Features**:
- Custom "Data Loading Error" message
- Database/chart icon
- "Reload" button
- Simplified UI for data-specific errors

**Usage**:
```tsx
import { DataErrorBoundary } from '../components/ErrorBoundary';

<DataErrorBoundary 
  errorMessage="Failed to load leaderboard. Please try again."
  onReset={() => fetchLeaderboard()}
>
  <LeaderboardComponent />
</DataErrorBoundary>
```

### 3. NavigationErrorBoundary Component
**Purpose**: Specialized error boundary for navigation errors

**Features**:
- Custom "Navigation Error" message
- Compass icon
- "Go Back" button
- Routing-specific error handling

**Usage**:
```tsx
import { NavigationErrorBoundary } from '../components/ErrorBoundary';

<NavigationErrorBoundary 
  errorMessage="Navigation error. Please restart the app."
  onReset={() => router.back()}
>
  <NavigationComponent />
</NavigationErrorBoundary>
```

## Error Boundary Hierarchy

```
App Root (_layout.tsx)
└─ ErrorBoundary (catches all app errors)
   ├─ Tabs (_layout.tsx)
   │  └─ ErrorBoundary (catches tab navigation errors)
   │     ├─ Calendar Tab (index.tsx)
   │     ├─ Attendance Tab (attendance.tsx)
   │     ├─ Points Tab (points.tsx)
   │     ├─ Newsletter Tab (newsletter.tsx)
   │     └─ Account Tab (account.tsx)
   │
   ├─ Officer Routes (officer/_layout.tsx)
   │  └─ ErrorBoundary (catches officer route errors)
   │     ├─ Officer Home
   │     ├─ Analytics
   │     ├─ Events
   │     └─ Register
   │
   └─ President Routes (president/_layout.tsx)
      └─ ErrorBoundary (catches president route errors)
         ├─ President Home
         ├─ Analytics
         ├─ Approve
         ├─ Override
         └─ Register
```

## Error Handling Flow

### 1. Error Occurs
```typescript
// Component throws error
const MyComponent = () => {
  const data = someUndefinedVariable.property; // ❌ Error!
  return <View>...</View>;
};
```

### 2. Error Boundary Catches
```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error('Error caught:', error);
  // Log to service
  logErrorToService(error, errorInfo);
}
```

### 3. Fallback UI Displays
```tsx
<View style={styles.errorCard}>
  <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
  <Text style={styles.errorMessage}>
    We encountered an unexpected error.
  </Text>
  <TouchableOpacity onPress={resetError}>
    <Text>Try Again</Text>
  </TouchableOpacity>
</View>
```

### 4. User Can Recover
- Click "Try Again" button → `resetError()` → Component re-renders
- Navigate away → Error boundary resets automatically
- Props change (if using `resetKeys`) → Auto-reset

## Development vs Production

### Development Mode (`__DEV__ === true`)
- ✅ Shows full error stack trace
- ✅ Displays component stack
- ✅ Red error overlay with details
- ✅ Console logging with full context

### Production Mode (`__DEV__ === false`)
- ✅ User-friendly error message only
- ✅ No technical details exposed
- ✅ Clean, branded error UI
- ✅ Optional error reporting to analytics service

## Best Practices

### 1. Place Error Boundaries Strategically
```tsx
// ✅ GOOD: Boundary around entire feature
<ErrorBoundary>
  <LeaderboardScreen />
</ErrorBoundary>

// ❌ BAD: Boundary around every tiny component
<ErrorBoundary><Text>Hello</Text></ErrorBoundary>
```

### 2. Use Specific Error Boundaries for Different Contexts
```tsx
// Data loading
<DataErrorBoundary onReset={refetchData}>
  <DataGrid />
</DataErrorBoundary>

// Navigation
<NavigationErrorBoundary onReset={() => router.back()}>
  <ComplexNavigation />
</NavigationErrorBoundary>
```

### 3. Log Errors to Analytics
```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Firebase Crashlytics
    crashlytics().recordError(error);
    
    // Sentry
    Sentry.captureException(error, { contexts: { react: errorInfo } });
    
    // Custom analytics
    analytics.logEvent('app_error', {
      error_message: error.message,
      component_stack: errorInfo.componentStack,
    });
  }}
>
  <App />
</ErrorBoundary>
```

### 4. Provide Meaningful Error Messages
```tsx
// ✅ GOOD: Helpful, actionable message
<ErrorBoundary 
  fallback={
    <ErrorScreen 
      message="Failed to load events. Check your internet connection."
      action="Retry"
    />
  }
>

// ❌ BAD: Generic, unhelpful message
<ErrorBoundary 
  fallback={<Text>Error</Text>}
>
```

### 5. Use Reset Keys for Auto-Recovery
```tsx
// Auto-reset when user or data changes
<ErrorBoundary resetKeys={[userId, dataTimestamp]}>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

## Error Scenarios Covered

### 1. Component Rendering Errors
```typescript
// Undefined property access
const name = user.profile.name; // ❌ user.profile is undefined

// Type errors
const count = items.length; // ❌ items is null

// Missing required props
<RequiredPropsComponent /> // ❌ Missing required prop
```

### 2. Lifecycle Method Errors
```typescript
useEffect(() => {
  throw new Error('Effect error'); // ✅ Caught by error boundary
}, []);
```

### 3. Event Handler Errors
**Note**: Error boundaries do NOT catch errors in event handlers by default.

```typescript
// ❌ NOT caught by error boundary
const handleClick = () => {
  throw new Error('Click error');
};

// ✅ Wrap in try-catch
const handleClick = () => {
  try {
    riskyOperation();
  } catch (error) {
    console.error(error);
    // Handle gracefully
  }
};
```

### 4. Async Errors
**Note**: Error boundaries do NOT catch errors in async code by default.

```typescript
// ❌ NOT caught by error boundary
useEffect(() => {
  fetchData().catch(error => {
    // Must handle here
  });
}, []);

// ✅ Use error state
const [error, setError] = useState(null);

useEffect(() => {
  fetchData()
    .catch(error => setError(error));
}, []);

if (error) {
  throw error; // Now caught by error boundary
}
```

## Testing Error Boundaries

### Manual Testing
```tsx
// Test component that throws error on mount
const ErrorTestComponent = () => {
  throw new Error('Test error');
  return <View />;
};

// In development, render to test error boundary
<ErrorBoundary>
  <ErrorTestComponent />
</ErrorBoundary>
```

### Automated Testing
```typescript
import { render } from '@testing-library/react-native';
import { ErrorBoundary } from './ErrorBoundary';

test('catches errors and displays fallback', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(getByText(/something went wrong/i)).toBeTruthy();
});
```

## Error Logging Integration

### Firebase Crashlytics
```typescript
import crashlytics from '@react-native-firebase/crashlytics';

<ErrorBoundary
  onError={(error, errorInfo) => {
    crashlytics().recordError(error);
    crashlytics().log('Component stack: ' + errorInfo.componentStack);
  }}
>
  <App />
</ErrorBoundary>
```

### Sentry
```typescript
import * as Sentry from '@sentry/react-native';

<ErrorBoundary
  onError={(error, errorInfo) => {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }}
>
  <App />
</ErrorBoundary>
```

### Custom Analytics
```typescript
import { supabase } from './lib/supabase';

<ErrorBoundary
  onError={async (error, errorInfo) => {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo.componentStack,
      user_id: currentUserId,
      timestamp: new Date().toISOString(),
    });
  }}
>
  <App />
</ErrorBoundary>
```

## Monitoring & Alerts

### Key Metrics to Track
1. **Error Rate**: Errors per session
2. **Error Frequency**: Specific errors occurring repeatedly
3. **User Impact**: How many users affected
4. **Recovery Rate**: How often users click "Try Again"
5. **Error Location**: Which components throw most errors

### Dashboard Queries
```sql
-- Most common errors
SELECT 
  error_message, 
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as affected_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;

-- Error rate over time
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## Future Enhancements

### 1. Error Recovery Strategies
```typescript
// Retry with exponential backoff
const [retryCount, setRetryCount] = useState(0);

<ErrorBoundary
  onError={(error) => {
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(c => c + 1);
        resetError();
      }, Math.pow(2, retryCount) * 1000);
    }
  }}
>
```

### 2. User Feedback Collection
```typescript
<ErrorBoundary
  fallback={
    <ErrorScreen 
      onSubmitFeedback={(feedback) => {
        logErrorWithFeedback(error, feedback);
      }}
    />
  }
>
```

### 3. Offline Error Queue
```typescript
// Queue errors when offline, send when online
const queueError = async (error, errorInfo) => {
  await AsyncStorage.setItem('error_queue', JSON.stringify([
    ...existingErrors,
    { error, errorInfo, timestamp: Date.now() }
  ]));
};
```

## Conclusion

Error boundaries provide:
- ✅ **Graceful degradation** - App doesn't crash completely
- ✅ **Better UX** - Users see friendly error messages
- ✅ **Error visibility** - Developers get detailed error logs
- ✅ **Recovery options** - Users can retry or navigate away
- ✅ **Production stability** - Isolated errors don't break entire app

**Current Implementation**: 4 error boundaries covering all major routes
**Coverage**: 100% of navigation trees
**Recovery**: Manual retry + automatic reset on navigation
**Logging**: Console logging (ready for analytics integration)
