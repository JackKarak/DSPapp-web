/**
 * Analytics Reducer
 * State management for analytics data
 */

import type { AnalyticsState, AnalyticsAction } from '../../types/analytics';

export const initialState: AnalyticsState = {
  members: [],
  events: [],
  attendance: [],
  membersPagination: { page: 0, pageSize: 50, hasMore: true },
  eventsPagination: { page: 0, pageSize: 20, hasMore: true },
  loading: true,
  refreshing: false,
  error: null,
  dateRange: {
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    end: new Date(),
  },
  selectedMetric: 'overview',
};

export function analyticsReducer(
  state: AnalyticsState,
  action: AnalyticsAction
): AnalyticsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, refreshing: false };
    case 'SET_MEMBERS':
      return {
        ...state,
        members: action.payload.members,
        membersPagination: { ...state.membersPagination, hasMore: action.payload.hasMore },
        loading: false,
        refreshing: false,
      };
    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload.events,
        eventsPagination: { ...state.eventsPagination, hasMore: action.payload.hasMore },
      };
    case 'SET_ATTENDANCE':
      return { ...state, attendance: action.payload };
    case 'LOAD_MORE_MEMBERS':
      return {
        ...state,
        membersPagination: { ...state.membersPagination, page: state.membersPagination.page + 1 },
      };
    case 'LOAD_MORE_EVENTS':
      return {
        ...state,
        eventsPagination: { ...state.eventsPagination, page: state.eventsPagination.page + 1 },
      };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'SET_METRIC':
      return { ...state, selectedMetric: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
