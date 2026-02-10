/**
 * Type definitions for custom hooks used throughout the app
 */

import { Event, PointAppeal } from './account';

/**
 * User profile data structure
 */
export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  uid: string | null;
  role: 'pledge' | 'brother' | 'officer' | 'president' | 'alumni' | 'abroad' | null;
  majors: string | null;
  minors: string | null;
  house_membership: string | null;
  race: string | null;
  pronouns: string | null;
  living_type: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  expected_graduation: string | null;
  pledge_class: string | null;
  last_profile_update: string | null;
  approved: boolean;
}

/**
 * Analytics data structure
 */
export interface Analytics {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  eventsThisMonth: number;
  eventsThisSemester: number;
  attendanceRate: number;
  rankInPledgeClass: number;
  totalInPledgeClass: number;
  rankInFraternity: number;
  totalInFraternity: number;
  achievements: string[];
  monthlyProgress: MonthlyProgress[];
}

/**
 * Monthly progress data point
 */
export interface MonthlyProgress {
  month: string;
  points: number;
}

/**
 * Profile form data for editing
 */
export interface ProfileFormData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  uid?: string;
  majors?: string;
  minors?: string;
  houseMembership?: string | null;
  race?: string | null;
  pronouns?: string | null;
  livingType?: string | null;
  gender?: string | null;
  sexualOrientation?: string | null;
  expectedGraduation?: string | null;
  pledgeClass?: string | null;
  selectedMajors?: string[];
}

/**
 * Point appeal submission data
 */
export interface AppealData {
  reason: string;
  pictureUrl: string;
}

/**
 * Event feedback submission data
 */
export interface FeedbackData {
  rating: number;
  would_attend_again: boolean | null;
  well_organized: boolean | null;
  comments: string;
}
