# Dynamic Point Categories System - Implementation Guide

## Overview
VP Operations can now dynamically manage point categories (add, edit, delete) that automatically update across:
- ✅ Event creation forms
- ✅ Brother points display
- ✅ Analytics dashboards
- ✅ Approval screens

## Database Migration Required

### Step 1: Apply the Main Migration
Go to Supabase Dashboard → SQL Editor → Run this migration:

**File:** `supabase/migrations/20260127_create_point_categories.sql`

This creates:
- `point_categories` table with default categories
- RLS policies for security
- RPC functions:
  - `get_point_categories()` - Fetch all active categories
  - `add_point_category()` - Add new category (VP Ops only)
  - `update_point_category()` - Update category (VP Ops only)
  - `delete_point_category()` - Soft delete category (VP Ops only)
  - `reorder_point_categories()` - Change sort order (VP Ops only)

### Step 2: Apply the Threshold Function Fix
If you haven't already, also run:

**File:** `supabase/migrations/20260127_add_update_thresholds_function.sql`

This fixes the RLS error for updating point thresholds.

## Features Implemented

### 1. Operations Screen (`app/officer/operations.tsx`)
VP Operations can now:
- **View all categories** with their thresholds, icons, and colors
- **Add new categories** with custom:
  - Display name
  - Point threshold
  - Icon (emoji picker)
  - Color (color picker)
- **Edit existing categories** - update display name, threshold, icon, color
- **Delete categories** - soft delete (hides from UI but preserves historical data)
- **Quick threshold updates** - inline editing with auto-save

### 2. Dynamic Categories Hook (`hooks/shared/usePointCategories.ts`)
Reusable hook provides:
- `categories` - Array of active categories
- `loading` - Loading state
- `error` - Error message if fetch fails
- `refetch()` - Manual refresh function
- Fallback to default categories if database fails

### 3. Event Forms (`components/FormSections.tsx`)
Point type dropdown now:
- Automatically loads categories from database
- Updates when VP Ops makes changes
- Shows loading indicator while fetching
- Falls back gracefully if categories can't be loaded

## How It Works

### Data Flow
```
VP Ops adds/edits category
    ↓
Saved to point_categories table
    ↓
usePointCategories() hook fetches updated data
    ↓
All screens using the hook automatically update
```

### Category Structure
```typescript
{
  id: string;              // UUID
  name: string;            // Internal name (lowercase, underscored)
  display_name: string;    // User-facing name
  threshold: number;       // Required points
  color: string;           // Hex color code
  icon: string;            // Emoji
  sort_order: number;      // Display order
  is_active: boolean;      // Soft delete flag
}
```

## Usage Examples

### In Operations Screen
```typescript
// Categories are managed via UI
// No code changes needed
```

### In Any Component
```typescript
import { usePointCategories } from '../hooks/shared/usePointCategories';

function MyComponent() {
  const { categories, loading } = usePointCategories();
  
  if (loading) return <ActivityIndicator />;
  
  return categories.map(cat => (
    <View key={cat.id}>
      <Text>{cat.icon} {cat.display_name}</Text>
      <Text>{cat.threshold} points required</Text>
    </View>
  ));
}
```

### Get Specific Category
```typescript
import { useCategoryByName } from '../hooks/shared/usePointCategories';

const { category, loading } = useCategoryByName('professional');
// Returns the professional category or undefined
```

## Security

### RLS Policies
- **Read:** All authenticated users can read active categories
- **Write:** Only VP Operations can add/edit/delete categories
- **Soft Delete:** Deleted categories remain in database but `is_active = false`

### Benefits
- Historical data integrity (events still have correct point_type)
- Audit trail of all changes
- VP Ops can restore deleted categories by setting is_active = true

## Backward Compatibility

The old hardcoded `POINT_TYPE_OPTIONS` in `formConstants.ts` is kept but marked deprecated. All new code uses `usePointCategories()`.

## Testing Checklist

After applying migrations:
1. ✅ Log in as VP Operations
2. ✅ Navigate to Operations screen
3. ✅ Try adding a new category (e.g., "Community Service")
4. ✅ Verify it appears in event creation form
5. ✅ Edit the category (change color/icon)
6. ✅ Update threshold inline
7. ✅ Delete the category
8. ✅ Verify it disappears from event forms
9. ✅ Create an event using a custom category
10. ✅ Check analytics show the new category

## Migration Commands

```bash
# If using Supabase CLI
supabase db push

# Or copy SQL files to Supabase Dashboard → SQL Editor → Run
```

## Files Changed

### New Files
- `supabase/migrations/20260127_create_point_categories.sql`
- `supabase/migrations/20260127_add_update_thresholds_function.sql`
- `hooks/shared/usePointCategories.ts`

### Modified Files
- `app/officer/operations.tsx` - Complete rewrite for category management
- `components/FormSections.tsx` - Use dynamic categories in forms
- `constants/formConstants.ts` - Deprecated static options

## Future Enhancements

Potential additions:
- Category reordering UI (drag and drop)
- Category usage statistics
- Bulk import/export of categories
- Category templates for different semesters
- Point multipliers per category
- Category-specific attendance rules

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify migrations were applied successfully
3. Confirm user has VP Operations role
4. Check Supabase logs for RPC function errors
5. Verify RLS policies are active

## Rollback Plan

To revert to hardcoded categories:
1. Change `FormSections.tsx` back to use `POINT_TYPE_OPTIONS`
2. Remove `usePointCategories` import
3. Keep the database table (don't delete - historical data)
