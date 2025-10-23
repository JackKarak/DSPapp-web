/**
 * Point Type Color Utilities
 * 
 * Shared color schemes for point type tags across the app
 */

export interface PointTypeColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export function getPointTypeColors(type: string): PointTypeColors {
  const normalizedType = type.toLowerCase();
  
  const colorMap: Record<string, PointTypeColors> = {
    service: {
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6',
      textColor: '#1e40af',
    },
    brotherhood: {
      backgroundColor: '#fce7f3',
      borderColor: '#ec4899',
      textColor: '#9f1239',
    },
    fundraising: {
      backgroundColor: '#d1fae5',
      borderColor: '#10b981',
      textColor: '#047857',
    },
    dei: {
      backgroundColor: '#e0e7ff',
      borderColor: '#6366f1',
      textColor: '#4338ca',
    },
    professional: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      textColor: '#b45309',
    },
    'h&w': {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      textColor: '#b45309',
    },
    scholarship: {
      backgroundColor: '#e9d5ff',
      borderColor: '#a855f7',
      textColor: '#7e22ce',
    },
    'no point': {
      backgroundColor: '#f3f4f6',
      borderColor: '#9ca3af',
      textColor: '#6b7280',
    },
  };

  return colorMap[normalizedType] || {
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
    textColor: '#374151',
  };
}

export function formatPointTypeText(type: string): string {
  const normalizedType = type.toLowerCase();
  
  if (normalizedType === 'dei') return 'DEI';
  if (normalizedType === 'h&w') return 'H&W';
  
  return type.toUpperCase();
}
