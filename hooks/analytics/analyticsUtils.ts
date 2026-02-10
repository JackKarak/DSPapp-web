/**
 * Analytics Utilities
 * Helper functions for analytics calculations
 */

import type { Member, Event } from '../../types/analytics';

/**
 * Create lookup map for O(1) member access
 */
export function createMemberLookup(members: Member[]): Map<string, Member> {
  return new Map(members.map((m) => [m.user_id, m]));
}

/**
 * Create lookup map for O(1) event access
 */
export function createEventLookup(events: Event[]): Map<string, Event> {
  return new Map(events.map((e) => [e.id, e]));
}

/**
 * Get active brothers (includes officers and president)
 */
export function getActiveBrothers(members: Member[]): Member[] {
  return members.filter(
    m => (m.role === 'brother' || m.role === 'officer' || m.role === 'president') && m.role !== 'alumni' && m.role !== 'abroad'
  );
}

/**
 * Format time for display
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
