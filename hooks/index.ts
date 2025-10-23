/**
 * Hooks Barrel Export
 * 
 * Central export point for all custom hooks.
 * Organized by feature for better maintainability.
 * 
 * Usage:
 *   import { useAccountData, useEventForm } from '@/hooks';
 *   // or
 *   import { useAccountData } from '@/hooks/account';
 */

// Account hooks
export * from './account';

// Appeals hooks
export * from './appeals';

// Events hooks
export * from './events';

// UI hooks
export * from './ui';

// Shared utility hooks
export * from './shared';
