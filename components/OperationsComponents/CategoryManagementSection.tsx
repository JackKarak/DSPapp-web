/**
 * Category Management Section
 * Allows VP Operations to add, edit, and delete point categories
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PointCategory } from '../../types/operations';

interface CategoryManagementSectionProps {
  categories: PointCategory[];
  loading: boolean;
  onAddCategory: () => void;
  onEditCategory: (category: PointCategory) => void;
  onDeleteCategory: (category: PointCategory) => void;
}

export function CategoryManagementSection({
  categories,
  loading,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryManagementSectionProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎯 Point Categories</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#330066" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Point Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddCategory}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesGrid}>
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <View>
                  <Text style={styles.categoryName}>{category.display_name}</Text>
                  <Text style={styles.categoryThreshold}>{category.threshold} points</Text>
                </View>
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onEditCategory(category)}
                >
                  <Ionicons name="pencil" size={20} color="#330066" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDeleteCategory(category)}
                >
                  <Ionicons name="trash" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.colorBar, { backgroundColor: category.color }]} />
          </View>
        ))}
      </View>

      {categories.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No categories yet</Text>
          <Text style={styles.emptySubtext}>Tap "Add Category" to create one</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#330066',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoryThreshold: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  colorBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});
