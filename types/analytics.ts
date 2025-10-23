/**
 * Analytics Types
 * Shared type definitions for analytics features
 */

export type Member = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  pledge_class: string;
  grad_year: number;
  role: string;
  major?: string;
  majors?: string;
  selectedMajors?: string;
  minors?: string;
  gender?: string;
  pronouns?: string;
  housing?: string;
  living_type?: string;
  race?: string;
  sexualOrientation?: string;
  houseMembership?: string;
  expectedGraduation?: number;
};

export type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  point_value: number;
  point_type: string;
  creator_id: string;
  status?: string;
};

export type Attendance = {
  user_id: string;
  event_id: string;
  rsvp: boolean;
  attended: boolean;
};

export type EventAnalytics = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendanceCount: number;
  attendanceRate: number;
  pointValue: number;
  pointType: string;
  rsvpCount: number;
  noShowRate: number;
  topAttendees: string[];
  creator: string;
};

export type MemberPerformance = {
  userId: string;
  name: string;
  pledgeClass: string;
  points: number;
  eventsAttended: number;
  attendanceRate: number;
};

export type HealthMetrics = {
  totalMembers: number;
  activeMembers: number;
  retentionRate: number;
  avgAttendanceRate: number;
  avgPoints: number;
};

export type CategoryPointsBreakdown = {
  category: string;
  totalPoints: number;
  averagePoints: number;
  eventCount: number;
  attendanceCount: number;
  averageAttendancePerMember?: number; // e.g., 4.7 out of 6 events
};

export type DiversityMetrics = {
  genderDistribution: { label: string; count: number; percentage: number }[];
  pronounDistribution: { label: string; count: number; percentage: number }[];
  raceDistribution: { label: string; count: number; percentage: number }[];
  sexualOrientationDistribution: { label: string; count: number; percentage: number }[];
  majorDistribution: { label: string; count: number; percentage: number }[];
  livingTypeDistribution: { label: string; count: number; percentage: number }[];
  houseMembershipDistribution: { label: string; count: number; percentage: number }[];
  graduationYearDistribution: { label: string; count: number; percentage: number }[];
  pledgeClassDistribution: { label: string; count: number; percentage: number }[];
  diversityScore: number;
  insights: string[];
};

export type AnalyticsState = {
  members: Member[];
  events: Event[];
  attendance: Attendance[];
  membersPagination: { page: number; pageSize: number; hasMore: boolean };
  eventsPagination: { page: number; pageSize: number; hasMore: boolean };
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  dateRange: { start: Date; end: Date };
  selectedMetric: 'overview' | 'members' | 'events' | 'engagement';
};

export type AnalyticsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MEMBERS'; payload: { members: Member[]; hasMore: boolean } }
  | { type: 'SET_EVENTS'; payload: { events: Event[]; hasMore: boolean } }
  | { type: 'SET_ATTENDANCE'; payload: Attendance[] }
  | { type: 'LOAD_MORE_MEMBERS' }
  | { type: 'LOAD_MORE_EVENTS' }
  | { type: 'SET_DATE_RANGE'; payload: { start: Date; end: Date } }
  | { type: 'SET_METRIC'; payload: AnalyticsState['selectedMetric'] }
  | { type: 'RESET' };
