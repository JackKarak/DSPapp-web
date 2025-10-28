/**
 * Analytics Screen Styles
 * 
 * All styles for the president analytics screen and its components
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Loading & Error States
  loader: {
    marginVertical: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626', // Red for errors
    textAlign: 'center',
    marginTop: 16,
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  // Insights
  insightsContainer: {
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', // Light gold background
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37', // DSP Gold
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  
  // Diversity Score
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreSubLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Charts
  chartsSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  chartsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6D28D9', // Dark DSP Purple
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6D28D9', // Dark DSP Purple
    marginBottom: 12,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  // Category Chart
  categoryLegend: {
    marginTop: 16,
    width: '100%',
  },
  categoryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  categoryLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6', // DSP Purple
    marginRight: 8,
  },
  categoryLegendText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  
  // Diversity Grid
  diversityGrid: {
    marginTop: 16,
  },
  
  // Event Time
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6D28D9', // Dark DSP Purple
    marginBottom: 12,
  },
  
  // Load More Button
  loadMoreButton: {
    backgroundColor: '#8B5CF6', // DSP Purple
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
