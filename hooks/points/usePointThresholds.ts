/**
 * usePointThresholds Hook
 * 
 * Fetches dynamic point thresholds from point_categories table
 * Falls back to default values if fetch fails
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface PointRequirement {
  required: number;
  name: string;
  description: string;
  color?: string;
  icon?: string;
}

export function usePointThresholds() {
  const [pointRequirements, setPointRequirements] = useState<Record<string, PointRequirement>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThresholds = useCallback(async () => {
    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('point_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if (data && data.length > 0) {
        // Convert array to object keyed by category name
        const requirements: Record<string, PointRequirement> = {};
        
        data.forEach(category => {
          requirements[category.name] = {
            required: category.threshold,
            name: category.display_name,
            description: `Earn ${category.threshold} points in ${category.display_name}`,
            color: category.color,
            icon: category.icon,
          };
        });
        
        setPointRequirements(requirements);
      } else {
        // Fallback to defaults if no categories found
        setPointRequirements({
          brotherhood: {
            required: 20,
            name: 'Brotherhood',
            description: 'Build lasting bonds with your brothers',
            color: '#8B4513',
            icon: '🤝',
          },
          professional: {
            required: 4,
            name: 'Professional',
            description: 'Advance your career and skills',
            color: '#1E90FF',
            icon: '💼',
          },
          service: {
            required: 4,
            name: 'Service',
            description: 'Give back to the community',
            color: '#32CD32',
            icon: '🤲',
          },
          scholarship: {
            required: 4,
            name: 'Scholarship',
            description: 'Excel academically and learn',
            color: '#FFD700',
            icon: '📚',
          },
          health: {
            required: 3,
            name: 'Health & Wellness',
            description: 'Maintain physical and mental well-being',
            color: '#FF69B4',
            icon: '💪',
          },
          fundraising: {
            required: 3,
            name: 'Fundraising',
            description: 'Support chapter financial goals',
            color: '#9370DB',
            icon: '💰',
          },
          dei: {
            required: 3,
            name: 'DEI',
            description: 'Promote understanding and inclusion',
            color: '#20B2AA',
            icon: '🌈',
          },
        });
      }
    } catch (err: any) {
      console.error('Error fetching point thresholds:', err);
      setError(err.message);
      // Use fallback defaults on error
      setPointRequirements({
        brotherhood: { required: 20, name: 'Brotherhood', description: 'Build lasting bonds with your brothers' },
        professional: { required: 4, name: 'Professional', description: 'Advance your career and skills' },
        service: { required: 4, name: 'Service', description: 'Give back to the community' },
        scholarship: { required: 4, name: 'Scholarship', description: 'Excel academically and learn' },
        health: { required: 3, name: 'Health & Wellness', description: 'Maintain physical and mental well-being' },
        fundraising: { required: 3, name: 'Fundraising', description: 'Support chapter financial goals' },
        dei: { required: 3, name: 'DEI', description: 'Promote understanding and inclusion' },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  // Legacy thresholds object for backward compatibility
  const thresholds = Object.entries(pointRequirements).reduce((acc, [key, value]) => {
    acc[key] = value.required;
    return acc;
  }, {} as Record<string, number>);

  return {
    thresholds,
    pointRequirements,
    loading,
    error,
    refetch: fetchThresholds,
  };
}
