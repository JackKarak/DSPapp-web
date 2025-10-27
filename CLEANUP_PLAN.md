# Project Cleanup Plan

## Files to Delete

### 1. Backup Files (Safe to Delete)
- [ ] `app/(tabs)/account.tsx.backup`

### 2. Duplicate Documentation in Root (Move to docs/)
These are duplicate or should be in docs/:
- [ ] `ANALYTICS_REFACTOR_COMPLETE.md` (duplicate in docs/archive/)
- [ ] `POINTS_REFACTOR_COMPLETE.md` (completed work)
- [ ] `ORGANIZATION_COMPLETE.md` (completed work)
- [ ] `POINTS_FIX_SUMMARY.md` (completed work)
- [ ] `PROFILE_FORM_FIXES.md` (completed work)

### 3. Keep in Root (Important)
- ✅ `CRITICAL_FIXES_COMPLETE.md` (LATEST - keep for reference)
- ✅ `README.md` (Project documentation)
- ✅ `PROJECT_STRUCTURE.md` (Important reference)
- ✅ `PRIVACY_POLICY.md` (Required for compliance)
- ✅ `TERMS_OF_SERVICE.md` (Required for compliance)

### 4. Organize docs/ Folder
Current structure is good, but consolidate:
- Keep: `docs/archive/` for old work
- Keep: `docs/compliance/` for compliance docs
- Keep: `docs/features/` for feature docs
- Keep: `docs/fixes/` for fix documentation

## Recommended File Organization

```
DSPapp/
├── README.md                           ✅ Keep
├── PROJECT_STRUCTURE.md                ✅ Keep
├── PRIVACY_POLICY.md                   ✅ Keep
├── TERMS_OF_SERVICE.md                 ✅ Keep
├── CRITICAL_FIXES_COMPLETE.md          ✅ Keep (Latest critical fixes)
│
├── docs/
│   ├── README.md                       ✅ Keep
│   ├── archive/                        ✅ Keep (historical docs)
│   │   ├── ANALYTICS_REFACTOR_COMPLETE.md
│   │   ├── POINTS_REFACTOR_COMPLETE.md      (MOVE HERE)
│   │   ├── ORGANIZATION_COMPLETE.md         (MOVE HERE)
│   │   ├── POINTS_FIX_SUMMARY.md            (MOVE HERE)
│   │   └── PROFILE_FORM_FIXES.md            (MOVE HERE)
│   ├── compliance/                     ✅ Keep
│   ├── features/                       ✅ Keep
│   ├── fixes/                          ✅ Keep
│   └── guides/                         ✅ Keep
│
├── app/                                ✅ Keep
├── components/                         ✅ Keep
├── hooks/                              ✅ Keep
├── lib/                                ✅ Keep
└── ... (other source folders)
```

## Actions to Take

1. **Delete** backup file
2. **Move** completed work docs to docs/archive/
3. **Keep** critical documentation in root
4. **Organize** docs folder properly

## Estimated Cleanup

- Files to delete: 1
- Files to move: 5
- Files to keep: Everything else
- Space saved: ~50KB (minimal)
- Organization improved: Significant ✅
