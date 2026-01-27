/**
 * Hook to fetch and manage point categories
 * Used across the app for event forms, analytics, and point displays
 */

/**
 * usePointCategories Hook
 * 
 * Fetches active point categories from the database. Categories are dynamically
 * managed by VP Operations and automatically update across the entire application.
 * 
 * @returns {Object} Hook state and methods
 * @returns {PointCategory[]} categories - Array of active point categories
 * @returns {boolean} loading - True while fetching data
 * @returns {string | null} error - Error message if fetch failed
 * @returns {Function} refetch - Manual refresh function
 * 
 * @example
 * ```typescript
 * const { categories, loading, error, refetch } = usePointCategories();
 * 
 * if (loading) return <ActivityIndicator />;
 * if (error) return <Text>Error: {error}</Text>;
 * 
 * return (
 *   <View>
 *     {categories.map(cat => (
 *       <Text key={cat.id}>{cat.icon} {cat.display_name}</Text>
 *     ))}
 *   </View>
 * );
 * ```
 * 
 * @see docs/features/DYNAMIC_POINT_CATEGORIES.md for complete documentation
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface PointCategory {
  id: string;
  name: string;
  display_name: string;
  threshold: number;
  color: string;
  icon: string;
  sort_order: number;
}

export function usePointCategories() {
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('point_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Failed to load categories');
      
      // Fallback to default categories if fetch fails
      setCategories([
        { id: '1', name: 'brotherhood', display_name: 'Brotherhood', threshold: 20, color: '#8B4513', icon: '🤝', sort_order: 1 },
        { id: '2', name: 'professional', display_name: 'Professional', threshold: 4, color: '#1E90FF', icon: '💼', sort_order: 2 },
        { id: '3', name: 'service', display_name: 'Service', threshold: 4, color: '#32CD32', icon: '🤲', sort_order: 3 },
        { id: '4', name: 'scholarship', display_name: 'Scholarship', threshold: 4, color: '#FFD700', icon: '📚', sort_order: 4 },
        { id: '5', name: 'health', display_name: 'Health & Wellness', threshold: 3, color: '#FF69B4', icon: '💪', sort_order: 5 },
        { id: '6', name: 'fundraising', display_name: 'Fundraising', threshold: 3, color: '#9370DB', icon: '💰', sort_order: 6 },
        { id: '7', name: 'dei', display_name: 'DEI', threshold: 3, color: '#20B2AA', icon: '🌈', sort_order: 7 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

/**
 * Get a category by name
 */
export function useCategoryByName(name: string) {
  const { categories, loading } = usePointCategories();
  const category = categories.find(cat => cat.name === name);
  
  return { category, loading };
}

/**
 * Get all category names for dropdowns
 */
export function useCategoryNames() {
  const { categories, loading } = usePointCategories();
  const names = categories.map(cat => cat.display_name);
  
  return { names, loading };
}
