/**
 * Semester Report Modal
 * Allows president to generate and download end-of-semester reports
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSemesterReport, SemesterReportData } from '../../hooks/analytics/useSemesterReport';
import { supabase } from '../../lib/supabase';

interface SemesterReportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SemesterReportModal({ visible, onClose }: SemesterReportModalProps) {
  const { generateReport, loading } = useSemesterReport();
  const [reportData, setReportData] = useState<SemesterReportData | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [restartingSemester, setRestartingSemester] = useState(false);

  // Default to current semester (Aug-Dec or Jan-Jul)
  const getCurrentSemester = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    if (month >= 8) {
      // Fall semester: Aug 1 - Dec 31
      return {
        start: `${year}-08-01`,
        end: `${year}-12-31`
      };
    } else {
      // Spring semester: Jan 1 - Jul 31
      return {
        start: `${year}-01-01`,
        end: `${year}-07-31`
      };
    }
  };

  const [dateRange, setDateRange] = useState(getCurrentSemester());

  const handleGenerateReport = async () => {
    const report = await generateReport(dateRange.start, dateRange.end);
    if (report) {
      setReportData(report);
    } else {
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    }
  };

  const generatePDFHTML = (data: SemesterReportData): string => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            padding: 30px;
            color: #2c3e50;
            line-height: 1.6;
            background: white;
          }
          .header {
            text-align: center;
            padding: 100px 40px;
            background: linear-gradient(135deg, #1a0033 0%, #330066 50%, #4d0099 100%);
            border-radius: 0;
            color: white;
            margin: -30px -30px 50px -30px;
          }
          .logo {
            font-size: 96px;
            font-weight: 300;
            margin-bottom: 30px;
            letter-spacing: 8px;
            font-family: Georgia, serif;
          }
          h1 {
            color: white;
            font-size: 42px;
            margin-bottom: 20px;
            font-family: Georgia, serif;
            font-weight: 600;
          }
          .subtitle {
            color: #D4AF37;
            font-size: 20px;
            font-weight: 400;
            margin-bottom: 10px;
            letter-spacing: 2px;
          }
          h2 {
            color: #330066;
            font-size: 20px;
            margin-top: 40px;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #D4AF37;
            font-family: Georgia, serif;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          h3 {
            color: #555;
            font-size: 16px;
            margin-top: 24px;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin: 24px 0;
          }
          .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
            border-left: 4px solid #330066;
            text-align: center;
          }
          .metric-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
          }
          .metric-value {
            font-size: 32px;
            font-weight: 600;
            color: #1a0033;
            line-height: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0 24px 0;
            font-size: 13px;
          }
          th {
            background: #330066;
            color: white;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 10px 16px;
            border-bottom: 1px solid #e0e0e0;
          }
          tr:nth-child(even) {
            background: #f8f9fa;
          }
          tr:hover {
            background: #f0f0f0;
          }
          .highlight {
            background: #fff8e1;
            padding: 16px;
            border-radius: 4px;
            border-left: 4px solid #D4AF37;
            margin: 20px 0;
            font-size: 14px;
          }
          .highlight strong {
            color: #1a0033;
            font-weight: 600;
          }
          .bar-chart {
            margin: 24px 0;
          }
          .bar-item {
            margin-bottom: 14px;
          }
          .bar-label {
            font-size: 13px;
            margin-bottom: 6px;
            color: #555;
            display: flex;
            justify-content: space-between;
            font-weight: 500;
          }
          .bar-value {
            font-weight: 600;
            color: #330066;
          }
          .bar-bg {
            height: 24px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
          }
          .bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #330066 0%, #5B21B6 100%);
            transition: width 0.3s ease;
            box-shadow: inset 0 1px 3px rgba(255,255,255,0.2);
          }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .footer {
            margin-top: 60px;
            padding-top: 24px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 11px;
            line-height: 1.8;
          }
          .footer p {
            margin: 4px 0;
          }
          @media print {
            body { padding: 15px; }
            .section { page-break-inside: avoid; }
            h2 { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ΔΣΠ</div>
          <h1>Delta Sigma Pi</h1>
          <h1>Semester Performance Report</h1>
          <p class="subtitle">Comprehensive Chapter Analytics</p>
          <p class="subtitle">${formatDate(data.semesterStart)} - ${formatDate(data.semesterEnd)}</p>
        </div>

        <!-- Executive Summary -->
        <div class="section">
          <h2>EXECUTIVE SUMMARY</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total Members</div>
              <div class="metric-value">${data.totalMembers}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Events</div>
              <div class="metric-value">${data.totalEvents}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Attendance Rate</div>
              <div class="metric-value">${data.overallAttendanceRate.toFixed(1)}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Avg Points/Member</div>
              <div class="metric-value">${data.averagePointsPerMember.toFixed(1)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Points Awarded</div>
              <div class="metric-value">${data.totalPointsAwarded.toFixed(0)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">New Members</div>
              <div class="metric-value">${data.newMembers}</div>
            </div>
          </div>
        </div>

        <!-- Event Statistics -->
        <div class="section">
          <h2>EVENT STATISTICS</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Events Held</th>
                <th>Points Distributed</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data.eventsByCategory).map(([category, count]) => `
                <tr>
                  <td>${category}</td>
                  <td>${count}</td>
                  <td>${(data.pointsByCategory[category] || 0).toFixed(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="highlight">
            <strong>📈 Most Attended Event:</strong> ${data.mostAttendedEvent?.name || 'N/A'} 
            (${data.mostAttendedEvent?.attendance || 0} attendees)<br>
            <strong>📉 Least Attended Event:</strong> ${data.leastAttendedEvent?.name || 'N/A'} 
            (${data.leastAttendedEvent?.attendance || 0} attendees)
          </div>
        </div>

        <!-- Top Performers -->
        <div class="section">
          <h2>TOP PERFORMERS</h2>
          ${data.highestPointEarner ? `
            <div class="highlight">
              <strong>🥇 Highest Point Earner:</strong> ${data.highestPointEarner.name} 
              (${data.highestPointEarner.points.toFixed(1)} points)
            </div>
          ` : ''}
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Total Points</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              ${data.topPerformers.slice(0, 10).map((performer, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${performer.name}</td>
                  <td>${performer.points.toFixed(1)}</td>
                  <td>${performer.attendanceRate.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Attendance Analysis -->
        <div class="section">
          <h2>ATTENDANCE ANALYSIS</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Perfect Attendance</div>
              <div class="metric-value">${data.perfectAttendance.length}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Low Attendance (<50%)</div>
              <div class="metric-value">${data.lowAttendance.length}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Avg Attendance/Event</div>
              <div class="metric-value">${data.averageAttendance.toFixed(1)}</div>
            </div>
          </div>
          
          ${data.perfectAttendance.length > 0 ? `
            <h3>✅ Perfect Attendance</h3>
            <p>${data.perfectAttendance.join(', ')}</p>
          ` : ''}
        </div>

        <!-- Officer Performance -->
        ${data.officerStats.length > 0 ? `
          <div class="section">
          <h2>OFFICER PERFORMANCE</h2>
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Name</th>
                  <th>Events Created</th>
                  <th>Avg Attendance</th>
                </tr>
              </thead>
              <tbody>
                ${data.officerStats.map(stat => `
                  <tr>
                    <td>${stat.position}</td>
                    <td>${stat.name}</td>
                    <td>${stat.eventsCreated}</td>
                    <td>${stat.avgEventAttendance.toFixed(1)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Category Performance -->
        <div class="section">
          <h2>CATEGORY PERFORMANCE</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Events</th>
                <th>Avg Attendance</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              ${data.categoryPerformance.map(cat => `
                <tr>
                  <td>${cat.category}</td>
                  <td>${cat.eventsHeld}</td>
                  <td>${cat.avgAttendance.toFixed(1)}</td>
                  <td>${cat.pointsDistributed.toFixed(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Diversity & Inclusion Deep Dive -->
        <div class="section">
          <h2>DIVERSITY & INCLUSION ANALYSIS</h2>
          
          <h3>Pledge Class Distribution</h3>
          <table>
            <thead>
              <tr>
                <th>Pledge Class</th>
                <th>Members</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data.diversityMetrics.pledgeClassDistribution).map(([pledgeClass, count]) => `
                <tr>
                  <td>${pledgeClass}</td>
                  <td>${count}</td>
                  <td>${((count / data.totalMembers) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h3>Top 5 Majors</h3>
          <table>
            <thead>
              <tr>
                <th>Major</th>
                <th>Members</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data.diversityMetrics.majorDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([major, count]) => `
                  <tr>
                    <td>${major}</td>
                    <td>${count}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">House Members</div>
              <div class="metric-value">${data.diversityMetrics.houseMembers}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Gender Diversity</div>
              <div class="metric-value">${Object.keys(data.diversityMetrics.genderDistribution).length}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Race Diversity</div>
              <div class="metric-value">${Object.keys(data.diversityMetrics.raceDistribution).length}</div>
            </div>
          </div>
        </div>

        <!-- Member Retention Signals -->
        <div class="section">
          <h2>MEMBER RETENTION ANALYSIS</h2>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Avg Events/Member</div>
              <div class="metric-value">${data.retentionMetrics.averageEventsPerMember.toFixed(1)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">At-Risk Members</div>
              <div class="metric-value">${data.retentionMetrics.atRiskMembers.length}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Inactive Members</div>
              <div class="metric-value">${data.retentionMetrics.inactiveMembers.length}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">High Engagement</div>
              <div class="metric-value">${data.retentionMetrics.highEngagementMembers.length}</div>
            </div>
          </div>
          
          ${data.retentionMetrics.atRiskMembers.length > 0 ? `
            <h3>🚨 At-Risk Members (Low Points or Attendance)</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Points</th>
                  <th>Attendance Rate</th>
                </tr>
              </thead>
              <tbody>
                ${data.retentionMetrics.atRiskMembers.map(member => `
                  <tr>
                    <td>${member.name}</td>
                    <td>${member.points.toFixed(1)}</td>
                    <td>${member.attendanceRate.toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${data.retentionMetrics.inactiveMembers.length > 0 ? `
            <h3>❌ Inactive Members (Zero Attendance)</h3>
            <p>${data.retentionMetrics.inactiveMembers.join(', ')}</p>
          ` : ''}
        </div>

        <!-- Point System Health -->
        <div class="section">
          <h2>POINT SYSTEM ANALYSIS</h2>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Avg Points Gap</div>
              <div class="metric-value">${data.pointSystemMetrics.averagePointsGap.toFixed(1)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Members On Track</div>
              <div class="metric-value">${data.pointSystemMetrics.membersOnTrack}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Members Struggling</div>
              <div class="metric-value">${data.pointSystemMetrics.membersStruggling}</div>
            </div>
          </div>
          
          <h3>Category Balance (% of Total Points)</h3>
          <div class="bar-chart">
            ${Object.entries(data.pointSystemMetrics.categoryBalance)
              .sort((a, b) => b[1] - a[1])
              .map(([category, percentage]) => `
                <div class="bar-item">
                  <div class="bar-label">
                    <span>${category}</span>
                    <span class="bar-value">${percentage.toFixed(1)}%</span>
                  </div>
                  <div class="bar-bg">
                    <div class="bar-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>

        <!-- Event Quality -->
        <div class="section">
          <h2>EVENT QUALITY FEEDBACK</h2>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Avg Rating</div>
              <div class="metric-value">${data.eventQualityMetrics.averageRating.toFixed(1)}/5</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Feedback</div>
              <div class="metric-value">${data.eventQualityMetrics.totalFeedback}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Would Attend Again</div>
              <div class="metric-value">${data.eventQualityMetrics.wouldAttendAgainRate.toFixed(1)}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Well Organized</div>
              <div class="metric-value">${data.eventQualityMetrics.wellOrganizedRate.toFixed(1)}%</div>
            </div>
          </div>
          
          ${data.eventQualityMetrics.topRatedEvents.length > 0 ? `
            <h3>🌟 Top Rated Events</h3>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                ${data.eventQualityMetrics.topRatedEvents.map(event => `
                  <tr>
                    <td>${event.title}</td>
                    <td>${event.rating.toFixed(1)}/5</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${data.eventQualityMetrics.lowRatedEvents.length > 0 ? `
            <h3>⚠️ Needs Improvement</h3>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                ${data.eventQualityMetrics.lowRatedEvents.map(event => `
                  <tr>
                    <td>${event.title}</td>
                    <td>${event.rating.toFixed(1)}/5</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>

        <div class="footer">
          <p>Report Generated: ${new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })}</p>
          <p>Delta Sigma Pi Professional Business Fraternity</p>
          <p>Confidential - For Internal Chapter Use Only</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;

    setGeneratingPDF(true);
    try {
      const html = generatePDFHTML(reportData);
      const { uri } = await Print.printToFileAsync({ html });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Semester Report',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', `Report saved to: ${uri}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRestartSemester = async () => {
    // First confirmation
    Alert.alert(
      '⚠️ Restart Semester',
      'This will permanently delete ALL events, pledges, feedback, attendance, and registration data for the current semester. This action CANNOT be undone.\n\nAre you absolutely sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              '🚨 FINAL WARNING',
              'This is your FINAL confirmation. All semester data will be PERMANENTLY DELETED.\n\nType YES in your mind and press Confirm to proceed.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'CONFIRM DELETE',
                  style: 'destructive',
                  onPress: performSemesterRestart
                }
              ]
            );
          }
        }
      ]
    );
  };

  const performSemesterRestart = async () => {
    setRestartingSemester(true);
    try {
      // Clear tables in order (children first, then parents)
      const { error: attendanceError } = await supabase
        .from('event_attendance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (attendanceError) throw attendanceError;

      const { error: registrationError } = await supabase
        .from('event_registration')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (registrationError) throw registrationError;

      const { error: feedbackError } = await supabase
        .from('feedback_submissions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (feedbackError) throw feedbackError;

      const { error: adminFeedbackError } = await supabase
        .from('admin_feedback')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (adminFeedbackError) throw adminFeedbackError;

      const { error: pledgeError } = await supabase
        .from('pledges')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (pledgeError) throw pledgeError;

      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (eventsError) throw eventsError;

      Alert.alert(
        '✅ Semester Restarted',
        'All semester data has been successfully cleared. You can now start fresh for the new semester.',
        [
          {
            text: 'OK',
            onPress: () => {
              setReportData(null);
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error restarting semester:', error);
      Alert.alert(
        'Error',
        'Failed to restart semester. Please try again or contact support.'
      );
    } finally {
      setRestartingSemester(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>End Semester Report</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#330066" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Semester Period</Text>
            <Text style={styles.dateText}>
              {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
            </Text>
          </View>

          {/* Generate Button */}
          {!reportData && (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="analytics" size={24} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Report</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Report Preview */}
          {reportData && (
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.cardTitle}>📊 Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Members</Text>
                    <Text style={styles.summaryValue}>{reportData.totalMembers}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Events</Text>
                    <Text style={styles.summaryValue}>{reportData.totalEvents}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Attendance</Text>
                    <Text style={styles.summaryValue}>{reportData.overallAttendanceRate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Avg Points</Text>
                    <Text style={styles.summaryValue}>{reportData.averagePointsPerMember.toFixed(1)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#330066" />
                <Text style={styles.infoText}>
                  Full report includes top performers, category breakdowns, officer stats, and more.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.pdfButton}
                  onPress={handleDownloadPDF}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-text" size={24} color="#fff" />
                      <Text style={styles.pdfButtonText}>Download PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.regenerateButton}
                  onPress={() => setReportData(null)}
                >
                  <Ionicons name="refresh" size={20} color="#330066" />
                  <Text style={styles.regenerateButtonText}>Regenerate</Text>
                </TouchableOpacity>
              </View>

              {/* Restart Semester Button (Danger Zone) */}
              <View style={styles.dangerZone}>
                <View style={styles.dangerHeader}>
                  <Ionicons name="warning" size={24} color="#EA4335" />
                  <Text style={styles.dangerTitle}>Danger Zone</Text>
                </View>
                <Text style={styles.dangerDescription}>
                  After saving your report, you can restart the semester to clear all data and start fresh.
                </Text>
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={handleRestartSemester}
                  disabled={restartingSemester}
                >
                  {restartingSemester ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={20} color="#fff" />
                      <Text style={styles.restartButtonText}>Restart Semester</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#555',
  },
  generateButton: {
    backgroundColor: '#330066',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#330066',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 15,
  },
  pdfButton: {
    backgroundColor: '#330066',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  regenerateButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#330066',
    gap: 8,
  },
  regenerateButtonText: {
    color: '#330066',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EA4335',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EA4335',
  },
  dangerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  restartButton: {
    backgroundColor: '#EA4335',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
