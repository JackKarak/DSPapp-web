# Analytics Category Calculation Fix

## Issue
The total events by category calculation was counting ALL events, including:
- Unapproved/pending events
- Future events that haven't occurred yet

This inflated the event counts and made the analytics data inaccurate.

## Root Cause
In `hooks/analytics/useCategoryBreakdown.ts`, the code was iterating through all fetched events without filtering by:
1. **Approval status** - Should only count events with `status === 'approved'`
2. **Date** - Should only count events that have already passed

Additionally, `hooks/analytics/useAnalyticsData.ts` was fetching all events regardless of approval status.

## Solution

### 1. Updated Event Type
**File:** `types/analytics.ts`

Added optional `status` field to Event type:
```typescript
export type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  point_value: number;
  point_type: string;
  creator_id: string;
  status?: string;  // ← Added
};
```

### 2. Fixed Category Breakdown Hook
**File:** `hooks/analytics/useCategoryBreakdown.ts`

Added filtering logic before counting events:
```typescript
// Only count approved events that have already passed
const eventDate = new Date(event.start_time);
const now = new Date();
const isApproved = event.status === 'approved';
const hasPassed = eventDate < now;

if (!isApproved || !hasPassed) {
  return; // Skip unapproved or future events
}
```

### 3. Fixed Event Fetching
**File:** `hooks/analytics/useAnalyticsData.ts`

Added filter to only fetch approved events from database:
```typescript
const { data, error, count } = await supabase
  .from('events')
  .select('*', { count: 'exact' })
  .eq('status', 'approved')  // ← Added filter
  .gte('start_time', start.toISOString())
  .lte('start_time', end.toISOString())
  .order('start_time', { ascending: false })
  .range(from, to);
```

## Impact

### Before Fix
- All events counted regardless of status (pending, approved, rejected)
- Future events counted even though they haven't happened
- Inflated event counts in category breakdown
- Inaccurate analytics data

### After Fix
- ✅ Only approved events counted
- ✅ Only past events counted (events that have already occurred)
- ✅ Accurate event counts per category
- ✅ Reliable analytics data
- ✅ Better database performance (fewer events fetched)

## Event Status Flow

Events in the system follow this lifecycle:
1. **Created** - Status: `'pending'` (not counted in analytics)
2. **Approved** - Status: `'approved'` (counted only if date has passed)
3. **Rejected** - Status: `'rejected'` (never counted in analytics)

## Files Changed
- ✅ `types/analytics.ts` - Added status field to Event type
- ✅ `hooks/analytics/useCategoryBreakdown.ts` - Added filtering logic
- ✅ `hooks/analytics/useAnalyticsData.ts` - Added database filter

## Validation
- Zero TypeScript errors
- All hooks compile successfully
- Logic matches business requirements

## Related Systems
This fix affects:
- **Category Breakdown Chart** - Now shows accurate event counts
- **Analytics Dashboard** - All calculations based on approved, past events
- **Health Metrics** - Event counts now accurate
- **Performance Metrics** - Based on legitimate events only

## Next Steps
After this fix is deployed, consider:
1. Verifying event approval workflow is working correctly
2. Checking if any other analytics calculations need similar fixes
3. Adding unit tests to ensure approved + past event filtering
4. Documenting event status lifecycle for future developers
