/**
 * PointCategories Component
 * 
 * Displays all point categories in an Excel-like table format
 * Uses dynamic categories from the database
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { styles as pointsStyles } from '../../styles/points/pointsStyles';
import { usePointThresholds } from '../../hooks/points/usePointThresholds';

interface PointCategoriesProps {
  pointsByCategory: Record<string, number>;
  colors: any;
}

export const PointCategories: React.FC<PointCategoriesProps> = ({
  pointsByCategory,
  colors,
}) => {
  const { pointRequirements, loading } = usePointThresholds();

  if (loading) {
    return (
      <View style={pointsStyles.auditSection}>
        <Text style={[pointsStyles.sectionTitle, { color: colors.text }]}>
          📊 Point Categories
        </Text>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={pointsStyles.auditSection}>
      <Text style={[pointsStyles.sectionTitle, { color: colors.text }]}>
        📊 Point Categories
      </Text>
      
      {/* Excel-like Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={[styles.headerCell, styles.categoryColumn]}>
            <Text style={styles.headerText}>Category</Text>
          </View>
          <View style={[styles.headerCell, styles.earnedColumn]}>
            <Text style={styles.headerText}>Earned</Text>
          </View>
          <View style={[styles.headerCell, styles.requiredColumn]}>
            <Text style={styles.headerText}>Required</Text>
          </View>
          <View style={[styles.headerCell, styles.statusColumn]}>
            <Text style={styles.headerText}>Status</Text>
          </View>
        </View>

        {/* Table Rows */}
        {Object.entries(pointRequirements).map(([category, config], index) => {
          const earned = pointsByCategory[category] || 0;
          const met = earned >= config.required;
          const categoryColor = config.color || '#330066';
          const categoryIcon = config.icon || '⭐';

          return (
            <View
              key={category}
              style={[
                styles.tableRow,
                index % 2 === 0 ? styles.evenRow : styles.oddRow,
                met && styles.completedRow,
              ]}
            >
              {/* Category Column */}
              <View style={[styles.cell, styles.categoryColumn]}>
                <View style={styles.categoryCell}>
                  <View style={[styles.iconCircle, { backgroundColor: categoryColor }]}>
                    <Text style={styles.iconText}>{categoryIcon}</Text>
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {config.name}
                  </Text>
                </View>
              </View>

              {/* Earned Column */}
              <View style={[styles.cell, styles.earnedColumn]}>
                <Text style={[styles.cellText, met && styles.metText]}>
                  {earned.toFixed(1)}
                </Text>
              </View>

              {/* Required Column */}
              <View style={[styles.cell, styles.requiredColumn]}>
                <Text style={styles.cellText}>{config.required}</Text>
              </View>

              {/* Status Column */}
              <View style={[styles.cell, styles.statusColumn]}>
                {met ? (
                  <Text style={styles.statusMet}>✓</Text>
                ) : (
                  <Text style={styles.statusPending}>
                    {(config.required - earned).toFixed(1)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    borderWidth: 2,
    borderColor: '#330066',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#330066',
    borderBottomWidth: 2,
    borderBottomColor: '#F7B910',
  },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#F7B910',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d8d0e0',
    minHeight: 50,
  },
  evenRow: {
    backgroundColor: 'white',
  },
  oddRow: {
    backgroundColor: '#faf8fc',
  },
  completedRow: {
    backgroundColor: '#f0fdf4',
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#d8d0e0',
  },
  categoryColumn: {
    flex: 3,
  },
  earnedColumn: {
    flex: 1,
    alignItems: 'center',
  },
  requiredColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 0,
  },
  categoryCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 14,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#330066',
    flex: 1,
    lineHeight: 16,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#330066',
  },
  metText: {
    color: '#059669',
    fontWeight: '700',
  },
  statusMet: {
    fontSize: 20,
    color: '#059669',
    fontWeight: '700',
  },
  statusPending: {
    fontSize: 12,
    color: '#6b5b7a',
    fontWeight: '700',
  },
});
