# 📚 Test Bank Section - Quick Visual Guide

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  📚 Test Bank                           [3] ▼       │  ← Header (purple bg)
│  3 submissions • 2 approved                         │     (always visible)
└─────────────────────────────────────────────────────┘
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  📤  Upload New Material                      │ │  ← Upload button
│  └───────────────────────────────────────────────┘ │     (purple)
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ [📝 Test]              [✅ Approved]          │ │  ← Submission card #1
│  │                                               │ │
│  │ CS 101                                        │ │
│  │ midterm_exam_2024.pdf                        │ │
│  │ Uploaded Oct 15, 2025                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ [📓 Notes]             [⏳ Pending]          │ │  ← Submission card #2
│  │                                               │ │
│  │ MATH 201                                      │ │
│  │ calculus_notes.pdf                           │ │
│  │ Uploaded Oct 20, 2025                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ [📚 Materials]         [❌ Rejected]         │ │  ← Submission card #3
│  │                                               │ │
│  │ PHYS 301                                      │ │
│  │ lab_manual.pdf                               │ │
│  │ Uploaded Oct 18, 2025                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ ℹ️  Submissions are reviewed by scholarship   │ │  ← Info footer
│  │    chairs. Approved materials earn you        │ │     (light blue)
│  │    points!                                    │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Color Coding

### **Status Badges**

✅ **Approved**
```
┌─────────────────┐
│ ✅ Approved     │  Green background (#dcfce7)
└─────────────────┘  Green border (#16a34a)
                     Dark green text (#15803d)
```

⏳ **Pending**
```
┌─────────────────┐
│ ⏳ Pending      │  Yellow background (#fef3c7)
└─────────────────┘  Yellow border (#f59e0b)
                     Dark yellow text (#92400e)
```

❌ **Rejected**
```
┌─────────────────┐
│ ❌ Rejected     │  Red background (#fee2e2)
└─────────────────┘  Red border (#dc2626)
                     Dark red text (#991b1b)
```

### **File Type Badges**

📝 **Test** (Purple)
```
┌───────────┐
│ 📝 Test   │  White background
└───────────┘  Purple border (#8b5cf6)
               Purple text
```

📓 **Notes** (Blue)
```
┌───────────┐
│ 📓 Notes  │  White background
└───────────┘  Blue border (#3b82f6)
               Blue text
```

📚 **Materials** (Green)
```
┌──────────────┐
│ 📚 Materials │  White background
└──────────────┘  Green border (#10b981)
                  Green text
```

---

## Interactive States

### **Collapsed State**
```
┌─────────────────────────────────────┐
│  📚 Test Bank              [2] ▶    │  ← Click to expand
│  3 submissions • 2 approved         │     Shows pending badge
└─────────────────────────────────────┘     Arrow points right
```

### **Expanded State**
```
┌─────────────────────────────────────┐
│  📚 Test Bank              [2] ▼    │  ← Click to collapse
│  3 submissions • 2 approved         │     Arrow points down
├─────────────────────────────────────┤
│  [Upload button]                    │
│  [Submission cards...]              │
│  [Info footer]                      │
└─────────────────────────────────────┘
```

### **Empty State**
```
┌─────────────────────────────────────┐
│  📚 Test Bank                    ▼  │
│  0 submissions • 0 approved         │
├─────────────────────────────────────┤
│  [📤 Upload New Material]           │
│                                     │
│         📚                          │  ← Large book emoji
│                                     │
│    No submissions yet               │
│                                     │
│  Share your study materials to      │
│  help the chapter!                  │
└─────────────────────────────────────┘
```

---

## Submission Card Anatomy

```
┌─────────────────────────────────────────────────┐
│  ┌──────────┐              ┌───────────────┐   │
│  │ 📝 Test  │              │ ✅ Approved   │   │  ← Badges (top row)
│  └──────────┘              └───────────────┘   │
│                                                 │
│  CS 101                                         │  ← Class code (18px bold)
│                                                 │
│  midterm_exam_2024.pdf                         │  ← File name (14px)
│                                                 │
│  Uploaded Oct 15, 2025                         │  ← Date (12px gray)
└─────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### **Mobile View**
- Full width cards
- Scrollable submissions list (max 400px)
- Large touch targets (44pt minimum)
- Single column layout

### **Tablet/Desktop View**
- Same layout (optimized for touch)
- Wider cards with more breathing room
- Same scrollable behavior

---

## Animation Flow

1. **Tap header** → Smooth expand/collapse
2. **Tap upload button** → Navigate to scholarship page
3. **Scroll submissions** → Smooth scrolling with momentum

---

## Data Display Examples

### **Example 1: New User**
```
Header: "0 submissions • 0 approved"
Content: Empty state with encouragement
Pending badge: Hidden
```

### **Example 2: Active User**
```
Header: "5 submissions • 3 approved"
Content: 5 submission cards shown
Pending badge: Shows "2" (pending count)
```

### **Example 3: All Approved**
```
Header: "8 submissions • 8 approved"
Content: 8 green-badged submission cards
Pending badge: Hidden
```

---

## Status Flow Diagram

```
User uploads material
        ↓
   ⏳ PENDING
   (yellow badge)
        ↓
Officer reviews
        ↓
    ┌───┴───┐
    ↓       ↓
✅ APPROVED  ❌ REJECTED
(green)      (red)
    ↓
User earns
 points!
```

---

## Integration Points

### **1. Upload Flow**
```
Account Tab
    ↓
Test Bank Section
    ↓
Tap "Upload New Material"
    ↓
Navigate to /officer/scholarship
    ↓
Fill upload form
    ↓
Submit
    ↓
Return to Account Tab
    ↓
Pull to refresh
    ↓
New submission appears (pending)
```

### **2. Points Flow**
```
Material approved
    ↓
Points added to profile
    ↓
Analytics Section updates
    ↓
User sees increased point total
```

---

## Typography Hierarchy

```
┌─ Header Title: 20px bold #1f2937
│  ├─ Header Subtitle: 13px #6b7280
│  └─ Pending Badge: 12px bold #92400e
│
├─ Upload Button: 16px bold white
│
├─ Submission Cards:
│  ├─ Badge Text: 12-13px bold (color-coded)
│  ├─ Class Code: 18px bold #1f2937
│  ├─ File Name: 14px #4b5563
│  └─ Upload Date: 12px #9ca3af
│
└─ Info Footer: 12px #1e40af
```

---

## Shadow Depths

```
Container:
  shadowColor: #8b5cf6 (purple)
  shadowRadius: 12
  elevation: 4
  
Upload Button:
  shadowColor: #8b5cf6 (purple)
  shadowRadius: 4
  elevation: 3
```

---

## Spacing Guide

```
Section padding: 20px
Card margin: 12px between
Button padding: 14px vertical
Badge padding: 6px vertical, 10px horizontal
Info footer padding: 12px
```

---

## Emoji Icons Used

| Element | Emoji | Meaning |
|---------|-------|---------|
| Section header | 📚 | Books (test bank) |
| Upload button | 📤 | Upload action |
| Test file | 📝 | Written test |
| Notes file | 📓 | Study notes |
| Materials file | 📚 | Study materials |
| Approved status | ✅ | Checkmark (approved) |
| Pending status | ⏳ | Hourglass (waiting) |
| Rejected status | ❌ | X mark (rejected) |
| Info icon | ℹ️ | Information |
| Empty state | 📚 | Large books |

---

## Accessibility Labels

```typescript
Header:
  accessibilityRole: "button"
  accessibilityLabel: "Toggle test bank section"
  accessibilityState: { expanded: true/false }

Upload Button:
  accessibilityRole: "button"
  accessibilityLabel: "Upload to test bank"

Submission Cards:
  Screen reader reads:
  - File type badge
  - Status badge
  - Class code
  - File name
  - Upload date
```

---

## Summary

**The Test Bank Section provides:**
- ✅ Clean, modern design matching app theme
- ✅ Clear visual status indicators
- ✅ Easy submission management
- ✅ Helpful information for users
- ✅ Smooth user experience
- ✅ Full accessibility support

**Perfect integration with Account tab!** 🎉
