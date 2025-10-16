import React from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

// Skeleton Loading Components
export const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#e2e8f0',
          borderRadius: 8,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const KPICardSkeleton = () => (
  <View style={styles.kpiSkeletonCard}>
    <SkeletonBox width="60%" height={32} style={{ marginBottom: 8 }} />
    <SkeletonBox width="40%" height={16} style={{ marginBottom: 8 }} />
    <SkeletonBox width="50%" height={14} />
  </View>
);

export const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <View style={styles.chartSkeletonContainer}>
    <SkeletonBox width="60%" height={20} style={{ marginBottom: 16 }} />
    <SkeletonBox width="100%" height={height} />
  </View>
);

export const EventCardSkeleton = () => (
  <View style={styles.eventSkeletonCard}>
    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
      <SkeletonBox width={60} height={60} style={{ marginRight: 16, borderRadius: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonBox width="80%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBox width="50%" height={14} />
      </View>
    </View>
    <SkeletonBox width="100%" height={4} />
  </View>
);

// Reusable KPI Card Component
interface KPICardProps {
  value: string | number;
  label: string;
  sublabel: string;
  sublabelColor: string;
}

export const KPICard = React.memo(({ value, label, sublabel, sublabelColor }: KPICardProps) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiChange, { color: sublabelColor }]}>{sublabel}</Text>
  </View>
));

// Reusable Chart Section Wrapper
interface ChartSectionProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}

export const ChartSection = React.memo(({ title, children, loading = false }: ChartSectionProps) => (
  <View style={styles.chartSection}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {loading ? <ChartSkeleton /> : children}
  </View>
));

// List Footer Component for Loading More
export const LoadingFooter = () => (
  <View style={styles.loadingFooter}>
    <SkeletonBox width="100%" height={100} style={{ marginBottom: 12 }} />
    <SkeletonBox width="100%" height={100} style={{ marginBottom: 12 }} />
  </View>
);

// Empty State Component
interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
}

export const EmptyState = ({ icon, title, subtitle }: EmptyStateProps) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  kpiSkeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: (screenWidth - 36) / 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartSkeletonContainer: {
    padding: 16,
  },
  eventSkeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    width: (screenWidth - 36) / 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  kpiChange: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  loadingFooter: {
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
