# Event Approval and Attendance Code System

## Overview
The DSP app handles two types of events with a unified approval and attendance tracking system:

### Event Types
1. **Registerable Events** - Brothers can register in advance
2. **Non-Registerable Events** - No advance registration required

## Key System Behavior

### ✅ All Events Get Admin Approval
- Both registerable and non-registerable events require admin approval
- Events are created with `status: 'pending'`
- Admins review events in the President dashboard

### ✅ All Approved Events Get Attendance Codes
- **Every approved event receives an attendance code** regardless of type
- Codes are generated when admin approves the event
- Brothers use these codes to record attendance and earn points

### ✅ Attendance Tracking for All Events
- All events (registerable or not) can track attendance
- Brothers scan/enter codes to mark attendance
- Points are awarded based on event point value
- Attendance is recorded in `event_attendance` table

## Code Changes Made

### Enhanced President Approval Interface
**File:** `app/president/confirm.tsx`

#### New Features:
1. **Event Type Display**: Shows whether event is "📝 Registerable" or "📋 Non-Registerable"
2. **Point Information**: Displays point value and type
3. **Clear Messaging**: 
   - "All approved events receive attendance codes, regardless of registration type"
   - Enhanced success message explaining code usage
4. **Additional Context**: Shows description and full event details

#### Code Comments:
```typescript
// Generate attendance code for all approved events
// Both registerable and non-registerable events get codes for attendance tracking
```

### Database Query Enhancement:
- Added `is_registerable`, `point_type`, `point_value`, `description` to approval interface
- Provides complete event information for admin decision-making

## User Flow

### For Event Creators:
1. Create event with registerable/non-registerable option
2. Event goes to pending status
3. Wait for admin approval

### For Admins:
1. Review pending events with full details including registration type
2. Approve events → automatic code generation
3. Clear confirmation that codes work for attendance

### For Brothers:
1. Attend any approved event (registerable or not)
2. Use attendance code to record attendance
3. Earn points automatically

## Technical Implementation

### Event Creation:
```typescript
// In register.tsx
is_registerable: isRegisterable,  // Set by event creator
status: 'pending',               // Always starts pending
```

### Event Approval:
```typescript
// In confirm.tsx - works for all event types
const code = generateRandomCode();
await supabase.from('events').update({ 
  status: 'approved', 
  code 
}).eq('id', eventId);
```

### Attendance Recording:
```typescript
// In attendance.tsx - works for all approved events
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('code', code.trim().toUpperCase());
```

## Benefits

✅ **Consistent Experience**: All events follow same approval process
✅ **Point Tracking**: All events can award points regardless of type  
✅ **Admin Control**: Full oversight of all events
✅ **Flexibility**: Supports both registration models
✅ **Clear Communication**: UI makes system behavior explicit

## Result
Non-registerable events now clearly receive the same admin review and attendance code generation as registerable events, ensuring brothers can earn points for all approved activities.
