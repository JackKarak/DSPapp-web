/**
 * Type definitions for Operations screen
 */

export interface PointCategory {
  id: string;
  name: string;
  display_name: string;
  threshold: number;
  color: string;
  icon: string;
  sort_order: number;
  is_active?: boolean;
}

export interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  officer_position: string | null;
}

export interface CategoryForm {
  name: string;
  display_name: string;
  threshold: number;
  color: string;
  icon: string;
}
