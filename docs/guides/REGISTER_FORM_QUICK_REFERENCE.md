# Quick Reference: Refactored Register Form

## File Overview

### 📄 Main Component
**`app/officer/register.tsx`** (160 lines)
- Orchestrates form sections
- Manages date picker UI state
- No business logic - just composition

### 🎣 Custom Hook
**`hooks/useEventForm.ts`** (260 lines)
- Form state management
- Debounced validation (300ms)
- Submit logic with error handling
- Mode switching

### 🎨 UI Components
**`components/FormComponents.tsx`** (150 lines)
- `ErrorBanner` - Dismissible error display
- `SuccessOverlay` - Non-blocking success animation
- `CustomDropdown` - Accessible point type picker

**`components/FormSections.tsx`** (380 lines)
- `BasicDetailsSection` - Title, location, description
- `PointsConfigSection` - Point configuration
- `AccessSection` - Registration & pledge settings
- `ScheduleSection` - Date/time pickers

### 🔧 Utilities
**`lib/formValidation.ts`** (60 lines)
- Pure validation functions
- Debounce utility
- Type-safe `ValidationResult`

**`constants/formConstants.ts`** (60 lines)
- All magic numbers
- Point type options
- Time rounding helpers

### 🎨 Styles
**`styles/registerForm.styles.ts`** (330 lines)
- All form styles centralized
- No more inline styles

## Usage Examples

### Adding New Validation
```tsx
// lib/formValidation.ts
export const validateEmail = (email: string): ValidationResult => {
  if (!email || !email.includes('@')) {
    return { isValid: false, error: 'Invalid email address' };
  }
  return { isValid: true };
};

// hooks/useEventForm.ts
const emailResult = validateEmail(formData.email);
if (!emailResult.isValid) {
  newErrors.email = emailResult.error;
}
```

### Adding New Form Field
1. Add to `FormData` type in `hooks/useEventForm.ts`
2. Add to initial state
3. Add validation if needed
4. Add UI in appropriate section component
5. Update submit logic if needed

### Creating New Section
```tsx
// components/FormSections.tsx
export const NewSection: React.FC<{
  formData: FormData;
  errors: FormErrors;
  onUpdate: (field: keyof FormData, value: any) => void;
}> = ({ formData, errors, onUpdate }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>New Section</Text>
    {/* Your fields here */}
  </View>
);

// app/officer/register.tsx
<NewSection 
  formData={formData}
  errors={errors}
  onUpdate={updateField}
/>
```

## Key Patterns

### ✅ DO
```tsx
// Use debounced validation for real-time feedback
const debouncedValidate = debounce(validateField, 300);

// Keep UI state local
const [showPicker, setShowPicker] = useState(false);

// Use accessibility props
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Submit form"
  accessibilityHint="Creates new event"
/>

// Provide specific error messages
setGlobalError(`Database error: ${error.message}. Please contact support.`);
```

### ❌ DON'T
```tsx
// Don't validate on every keystroke without debounce
onChangeText={(value) => {
  updateField('title', value);
  validateField('title', value); // ❌ Too frequent
}}

// Don't use useCallback for pure functions
const formatDate = useCallback((date) => { // ❌ Unnecessary
  return date.toLocaleDateString();
}, []); // No dependencies = no need for callback

// Don't use generic errors
setError('An error occurred'); // ❌ Not helpful

// Don't block UI during loading
<View style={styles.fullScreenOverlay}> // ❌ Can't see submission
  <ActivityIndicator />
</View>
```

## Testing Strategy

### Unit Tests
```tsx
// lib/formValidation.test.ts
describe('validateTitle', () => {
  it('requires title', () => {
    const result = validateTitle('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('required');
  });
});

// hooks/useEventForm.test.ts
describe('useEventForm', () => {
  it('updates field values', () => {
    const { result } = renderHook(() => useEventForm());
    act(() => {
      result.current.updateField('title', 'Test Event');
    });
    expect(result.current.formData.title).toBe('Test Event');
  });
});
```

### Component Tests
```tsx
// components/FormComponents.test.tsx
describe('ErrorBanner', () => {
  it('displays error message', () => {
    render(<ErrorBanner message="Test error" onDismiss={jest.fn()} />);
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });
});
```

## Performance Checklist

- ✅ Validation debounced (300ms)
- ✅ No unnecessary useCallback/useMemo
- ✅ Components split for better re-render isolation
- ✅ Styles extracted (no recreation on hot reload)
- ✅ Initial state uses lazy initialization
- ✅ Refs used to avoid callback dependencies

## Accessibility Checklist

- ✅ All buttons have `accessibilityRole="button"`
- ✅ All inputs have descriptive labels
- ✅ Errors have `accessibilityRole="alert"`
- ✅ Switches announce state changes
- ✅ Complex interactions have hints
- ✅ Forms have proper focus management

## Common Tasks

### Change Validation Debounce Delay
```tsx
// constants/formConstants.ts
export const VALIDATION_DEBOUNCE_DELAY = 500; // Change from 300ms
```

### Add New Point Type
```tsx
// constants/formConstants.ts
export const POINT_TYPE_OPTIONS = [
  // ... existing options
  { label: 'New Type', value: 'new_type' }
];
```

### Modify Time Rounding Interval
```tsx
// constants/formConstants.ts
export const TIME_PICKER_INTERVAL = 30; // Change from 15 minutes
```

### Change Success Animation Duration
```tsx
// constants/formConstants.ts
export const SUCCESS_ANIMATION_DURATION = 2000; // Change from 1500ms
```

## Troubleshooting

### Validation Not Working
- Check debounce delay hasn't been removed
- Verify field name matches `FormData` keys
- Check validation function in `lib/formValidation.ts`

### Styles Not Applying
- Ensure import: `import { registerFormStyles as styles }`
- Check style exists in `styles/registerForm.styles.ts`
- Clear cache: Delete `.expo` folder

### Form Not Submitting
- Check browser console for errors
- Verify Supabase connection
- Check validation isn't blocking submission

## Migration from Old Code

If you have custom modifications to the old register form:

1. **Logic changes**: Add to `hooks/useEventForm.ts`
2. **UI changes**: Modify appropriate section in `components/FormSections.tsx`
3. **Style changes**: Update `styles/registerForm.styles.ts`
4. **New fields**: Follow "Adding New Form Field" pattern above
5. **Validation changes**: Update `lib/formValidation.ts`

## Resources

- [React Hook Form Docs](https://react-hook-form.com/) - For future migration
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility reference
- [React Native Accessibility](https://reactnative.dev/docs/accessibility) - Platform guide

---

**Need help?** Check `REGISTER_FORM_REFACTORING_SUMMARY.md` for detailed explanation of changes.
