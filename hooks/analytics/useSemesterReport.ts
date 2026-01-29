/**
 * Semester Report Hook
 * Fetches comprehensive semester data for end-of-semester reporting
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface SemesterReportData {
  // Semester Info
  semesterStart: string;
  semesterEnd: string;
  
  // Membership Metrics
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  retentionRate: number;
  membersMetRequirements: number;
  
  // Event Statistics
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  totalAttendance: number;
  averageAttendance: number;
  mostAttendedEvent: { name: string; attendance: number } | null;
  leastAttendedEvent: { name: string; attendance: number } | null;
  
  // Point System Analysis
  averagePointsPerMember: number;
  highestPointEarner: { name: string; points: number } | null;
  totalPointsAwarded: number;
  pointsByCategory: Record<string, number>;
  categoryCompletionRates: Record<string, number>;
  
  // Top Performers
  topPerformers: Array<{
    name: string;
    points: number;
    attendanceRate: number;
  }>;
  
  // Attendance Trends
  overallAttendanceRate: number;
  perfectAttendance: string[];
  lowAttendance: string[];
  
  // Officer Performance
  officerStats: Array<{
    position: string;
    name: string;
    eventsCreated: number;
    avgEventAttendance: number;
  }>;
  
  // Category Performance
  categoryPerformance: Array<{
    category: string;
    eventsHeld: number;
    avgAttendance: number;
    pointsDistributed: number;
    completionRate: number;
  }>;
  
  // Diversity & Inclusion Deep Dive
  diversityMetrics: {
    pledgeClassDistribution: Record<string, number>;
    majorDistribution: Record<string, number>;
    graduationYearDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    pronounDistribution: Record<string, number>;
    raceDistribution: Record<string, number>;
    livingTypeDistribution: Record<string, number>;
    houseMembers: number;
  };
  
  // Member Retention Signals
  retentionMetrics: {
    atRiskMembers: Array<{ name: string; points: number; attendanceRate: number }>;
    inactiveMembers: string[];
    highEngagementMembers: string[];
    averageEventsPerMember: number;
  };
  
  // Point System Health
  pointSystemMetrics: {
    averagePointsGap: number;
    membersOnTrack: number;
    membersStruggling: number;
    categoryBalance: Record<string, number>;
  };
  
  // Event Quality
  eventQualityMetrics: {
    averageRating: number;
    totalFeedback: number;
    wouldAttendAgainRate: number;
    wellOrganizedRate: number;
    topRatedEvents: Array<{ title: string; rating: number }>;
    lowRatedEvents: Array<{ title: string; rating: number }>;
  };
}

export function useSemesterReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<SemesterReportData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all necessary data in parallel
      const [
        membersResult,
        eventsResult,
        pointsResult,
      ] = await Promise.all([
        // Members with diversity data
        supabase
          .from('users')
          .select('user_id, first_name, last_name, role, officer_position, pledge_class, expected_graduation, majors, gender, pronouns, race, living_type, house_membership')
          .in('role', ['brother', 'officer']),
        
        // Events
        supabase
          .from('events')
          .select('id, title, point_type, created_by, point_value')
          .gte('start_time', startDate)
          .lte('start_time', endDate)
          .eq('status', 'approved'),
        
        // Points (using RPC function)
        supabase.rpc('get_points_dashboard')
      ]);

      if (membersResult.error) throw membersResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const members = membersResult.data || [];
      const events = eventsResult.data || [];
      
      // Fetch attendance for the events we got
      const eventIds = events.map(e => e.id);
      const attendanceResult = eventIds.length > 0
        ? await supabase
            .from('event_attendance')
            .select('event_id, user_id')
            .in('event_id', eventIds)
        : { data: [], error: null };
      
      if (attendanceResult.error) throw attendanceResult.error;
      const attendance = attendanceResult.data || [];
      const pointsData = Array.isArray(pointsResult.data) ? pointsResult.data : [];
      
      // Fetch feedback for these events (optional - may not exist in all chapters)
      let feedback: any[] = [];
      try {
        const feedbackResult = eventIds.length > 0
          ? await supabase
              .from('feedback_submission')
              .select('event_id, rating, would_attend_again, well_organized')
              .in('event_id', eventIds)
          : { data: [], error: null };
        
        if (!feedbackResult.error && feedbackResult.data) {
          feedback = feedbackResult.data;
        }
      } catch (error) {
        console.log('Feedback table not available, skipping event quality metrics');
        feedback = [];
      }

      // Calculate metrics
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.role === 'brother' || m.role === 'officer').length;
      const newMembers = 0; // Would need registration/created_at data to calculate

      // Event statistics
      const eventsByCategory: Record<string, number> = {};
      events.forEach(event => {
        eventsByCategory[event.point_type] = (eventsByCategory[event.point_type] || 0) + 1;
      });

      const totalAttendance = attendance.length;
      const averageAttendance = events.length > 0 ? totalAttendance / events.length : 0;

      // Event attendance counts
      const eventAttendanceCounts = new Map<string, number>();
      attendance.forEach(att => {
        eventAttendanceCounts.set(
          att.event_id,
          (eventAttendanceCounts.get(att.event_id) || 0) + 1
        );
      });

      let mostAttendedEvent = null;
      let leastAttendedEvent = null;
      let maxAttendance = 0;
      let minAttendance = Infinity;

      events.forEach(event => {
        const count = eventAttendanceCounts.get(event.id) || 0;
        if (count > maxAttendance) {
          maxAttendance = count;
          mostAttendedEvent = { name: event.title, attendance: count };
        }
        // Only set least attended if we have events with attendance
        if (count < minAttendance) {
          minAttendance = count;
          leastAttendedEvent = { name: event.title, attendance: count };
        }
      });
      
      // If minAttendance is still Infinity, no events had attendance
      if (minAttendance === Infinity) {
        leastAttendedEvent = null;
      }

      // Points analysis
      const memberPoints = new Map<string, number>();
      const pointsByCategory: Record<string, number> = {};
      
      pointsData.forEach((point: any) => {
        memberPoints.set(
          point.user_id,
          (memberPoints.get(point.user_id) || 0) + (point.total_points || 0)
        );
        if (point.category) {
          pointsByCategory[point.category] = 
            (pointsByCategory[point.category] || 0) + (point.total_points || 0);
        }
      });

      const totalPointsAwarded = Array.from(memberPoints.values()).reduce((sum, p) => sum + p, 0);
      const averagePointsPerMember = totalMembers > 0 ? totalPointsAwarded / totalMembers : 0;

      // Find highest point earner
      let highestPointEarner = null;
      let maxPoints = 0;
      members.forEach(member => {
        const points = memberPoints.get(member.user_id) || 0;
        if (points > maxPoints) {
          maxPoints = points;
          highestPointEarner = {
            name: `${member.first_name} ${member.last_name}`,
            points
          };
        }
      });

      // Top performers (top 10)
      const topPerformers = members
        .map(member => {
          const points = memberPoints.get(member.user_id) || 0;
          const memberAttendance = attendance.filter(a => a.user_id === member.user_id).length;
          const attendanceRate = events.length > 0 ? (memberAttendance / events.length) * 100 : 0;
          
          return {
            name: `${member.first_name} ${member.last_name}`,
            points,
            attendanceRate
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

      // Attendance analysis
      const memberAttendanceCounts = new Map<string, number>();
      attendance.forEach(att => {
        memberAttendanceCounts.set(
          att.user_id,
          (memberAttendanceCounts.get(att.user_id) || 0) + 1
        );
      });

      const totalEvents = events.length;
      const perfectAttendance: string[] = [];
      const lowAttendance: string[] = [];

      members.forEach(member => {
        const attended = memberAttendanceCounts.get(member.user_id) || 0;
        const rate = totalEvents > 0 ? attended / totalEvents : 0;
        const fullName = `${member.first_name} ${member.last_name}`;
        
        if (rate === 1 && totalEvents > 0) {
          perfectAttendance.push(fullName);
        } else if (rate < 0.5) {
          lowAttendance.push(fullName);
        }
      });

      const overallAttendanceRate = totalEvents > 0 && totalMembers > 0
        ? (totalAttendance / (totalEvents * totalMembers)) * 100
        : 0;

      // Officer performance
      const officerStats = members
        .filter(m => m.role === 'officer' && m.officer_position)
        .map(officer => {
          const officerEvents = events.filter(e => e.created_by === officer.user_id);
          const officerEventsAttendance = officerEvents
            .map(e => eventAttendanceCounts.get(e.id) || 0)
            .reduce((sum, count) => sum + count, 0);
          const avgEventAttendance = officerEvents.length > 0
            ? officerEventsAttendance / officerEvents.length
            : 0;

          return {
            position: officer.officer_position || 'Unknown',
            name: `${officer.first_name} ${officer.last_name}`,
            eventsCreated: officerEvents.length,
            avgEventAttendance
          };
        })
        .filter(stat => stat.eventsCreated > 0);

      // Category performance
      const categoryPerformance = Object.keys(eventsByCategory).map(category => {
        const categoryEvents = events.filter(e => e.point_type === category);
        const categoryAttendance = attendance.filter(att =>
          categoryEvents.some(e => e.id === att.event_id)
        ).length;
        const avgAttendance = categoryEvents.length > 0
          ? categoryAttendance / categoryEvents.length
          : 0;

        return {
          category,
          eventsHeld: eventsByCategory[category],
          avgAttendance,
          pointsDistributed: pointsByCategory[category] || 0,
          completionRate: 0 // Would need threshold data to calculate
        };
      });

      // Calculate category completion rates (unique members per category)
      const categoryCompletionRates: Record<string, number> = {};
      Object.keys(eventsByCategory).forEach(category => {
        const uniqueMembers = new Set<string>();
        pointsData.forEach((p: any) => {
          if (p.category === category && p.total_points > 0 && p.user_id) {
            uniqueMembers.add(p.user_id);
          }
        });
        categoryCompletionRates[category] = totalMembers > 0
          ? (uniqueMembers.size / totalMembers) * 100
          : 0;
      });
      
      // Diversity & Inclusion Deep Dive
      const pledgeClassDistribution: Record<string, number> = {};
      const majorDistribution: Record<string, number> = {};
      const graduationYearDistribution: Record<string, number> = {};
      const genderDistribution: Record<string, number> = {};
      const pronounDistribution: Record<string, number> = {};
      const raceDistribution: Record<string, number> = {};
      const livingTypeDistribution: Record<string, number> = {};
      let houseMembers = 0;
      
      members.forEach(member => {
        // Pledge class
        if (member.pledge_class) {
          pledgeClassDistribution[member.pledge_class] = 
            (pledgeClassDistribution[member.pledge_class] || 0) + 1;
        }
        
        // Majors (could be array or string)
        if (member.majors) {
          const majors = Array.isArray(member.majors) ? member.majors : [member.majors];
          majors.forEach(major => {
            if (major) {
              majorDistribution[major] = (majorDistribution[major] || 0) + 1;
            }
          });
        }
        
        // Graduation year
        if (member.expected_graduation) {
          graduationYearDistribution[member.expected_graduation] = 
            (graduationYearDistribution[member.expected_graduation] || 0) + 1;
        }
        
        // Gender
        if (member.gender) {
          genderDistribution[member.gender] = (genderDistribution[member.gender] || 0) + 1;
        }
        
        // Pronouns
        if (member.pronouns) {
          pronounDistribution[member.pronouns] = (pronounDistribution[member.pronouns] || 0) + 1;
        }
        
        // Race
        if (member.race) {
          raceDistribution[member.race] = (raceDistribution[member.race] || 0) + 1;
        }
        
        // Living type
        if (member.living_type) {
          livingTypeDistribution[member.living_type] = 
            (livingTypeDistribution[member.living_type] || 0) + 1;
        }
        
        // House membership
        if (member.house_membership) {
          houseMembers++;
        }
      });
      
      // Member Retention Signals
      const averageEventsPerMember = totalMembers > 0 ? totalEvents / totalMembers : 0;
      
      // At-risk: members with low points OR low attendance
      const allMembersWithStats = members.map(member => {
        const points = memberPoints.get(member.user_id) || 0;
        const memberAttendance = attendance.filter(a => a.user_id === member.user_id).length;
        const attendanceRate = events.length > 0 ? (memberAttendance / events.length) * 100 : 0;
        
        return {
          name: `${member.first_name} ${member.last_name}`,
          points,
          attendanceRate
        };
      });
      
      const atRiskMembers = allMembersWithStats
        .filter(m => m.points < averagePointsPerMember * 0.5 || m.attendanceRate < 50)
        .sort((a, b) => a.points - b.points) // Sort by points ascending (worst first)
        .slice(0, 10);
      
      const inactiveMembers = members
        .filter(m => (memberAttendanceCounts.get(m.user_id) || 0) === 0)
        .map(m => `${m.first_name} ${m.last_name}`);
      
      const highEngagementMembers = allMembersWithStats
        .filter(m => m.attendanceRate > 80 && m.points > averagePointsPerMember * 1.2)
        .sort((a, b) => b.points - a.points) // Sort by points descending (best first)
        .slice(0, 10)
        .map(m => m.name);
      
      // Point System Health
      const pointsArray = Array.from(memberPoints.values());
      
      // Average points gap: how far below average are the struggling members?
      const belowAverageMembers = pointsArray.filter(p => p < averagePointsPerMember);
      const averagePointsGap = belowAverageMembers.length > 0
        ? belowAverageMembers.reduce((sum, p) => sum + (averagePointsPerMember - p), 0) / belowAverageMembers.length
        : 0;
      
      // Include members with zero points in the count
      const membersOnTrack = members.filter(m => {
        const points = memberPoints.get(m.user_id) || 0;
        return points >= averagePointsPerMember * 0.7;
      }).length;
      
      const membersStruggling = members.filter(m => {
        const points = memberPoints.get(m.user_id) || 0;
        return points < averagePointsPerMember * 0.5;
      }).length;
      
      const categoryBalance: Record<string, number> = {};
      Object.keys(pointsByCategory).forEach(category => {
        categoryBalance[category] = totalPointsAwarded > 0
          ? (pointsByCategory[category] / totalPointsAwarded) * 100
          : 0;
      });
      
      // Event Quality Metrics
      const totalFeedback = feedback.length;
      const averageRating = totalFeedback > 0
        ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedback
        : 0;
      
      const wouldAttendAgainCount = feedback.filter(f => f.would_attend_again).length;
      const wouldAttendAgainRate = totalFeedback > 0
        ? (wouldAttendAgainCount / totalFeedback) * 100
        : 0;
      
      const wellOrganizedCount = feedback.filter(f => f.well_organized).length;
      const wellOrganizedRate = totalFeedback > 0
        ? (wellOrganizedCount / totalFeedback) * 100
        : 0;
      
      // Calculate average rating per event
      const eventRatings = new Map<string, { total: number; count: number; title: string }>();
      feedback.forEach(f => {
        if (f.rating && f.event_id) {
          const event = events.find(e => e.id === f.event_id);
          if (event) {
            const current = eventRatings.get(f.event_id) || { total: 0, count: 0, title: event.title };
            eventRatings.set(f.event_id, {
              total: current.total + f.rating,
              count: current.count + 1,
              title: event.title
            });
          }
        }
      });
      
      const eventRatingsList = Array.from(eventRatings.values())
        .map(e => ({ title: e.title, rating: e.total / e.count }))
        .sort((a, b) => b.rating - a.rating);
      
      const topRatedEvents = eventRatingsList.slice(0, 5);
      const lowRatedEvents = eventRatingsList.slice(-5).reverse();

      const report: SemesterReportData = {
        semesterStart: startDate,
        semesterEnd: endDate,
        totalMembers,
        activeMembers,
        newMembers,
        retentionRate: 0, // Would need historical data
        membersMetRequirements: 0, // Would need threshold comparison
        totalEvents: events.length,
        eventsByCategory,
        totalAttendance,
        averageAttendance,
        mostAttendedEvent,
        leastAttendedEvent,
        averagePointsPerMember,
        highestPointEarner,
        totalPointsAwarded,
        pointsByCategory,
        categoryCompletionRates,
        topPerformers,
        overallAttendanceRate,
        perfectAttendance,
        lowAttendance,
        officerStats,
        categoryPerformance,
        diversityMetrics: {
          pledgeClassDistribution,
          majorDistribution,
          graduationYearDistribution,
          genderDistribution,
          pronounDistribution,
          raceDistribution,
          livingTypeDistribution,
          houseMembers
        },
        retentionMetrics: {
          atRiskMembers,
          inactiveMembers,
          highEngagementMembers,
          averageEventsPerMember
        },
        pointSystemMetrics: {
          averagePointsGap,
          membersOnTrack,
          membersStruggling,
          categoryBalance
        },
        eventQualityMetrics: {
          averageRating,
          totalFeedback,
          wouldAttendAgainRate,
          wellOrganizedRate,
          topRatedEvents,
          lowRatedEvents
        }
      };

      setLoading(false);
      return report;
    } catch (err: any) {
      console.error('Error generating semester report:', err);
      setError(err.message || 'Failed to generate report');
      setLoading(false);
      return null;
    }
  }, []);

  return { generateReport, loading, error };
}
