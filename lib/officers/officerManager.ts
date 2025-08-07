import { supabase } from '../supabase';

export interface Officer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  officer_position: string;
  phone_number?: number;
  role: 'officer' | 'admin';
  activated_at: string;
}

export interface OfficerPosition {
  position: string;
  label: string;
  permissions: string[];
  hierarchy_level: number;
}

export const OFFICER_POSITIONS: Record<string, OfficerPosition> = {
  // Executive positions (highest level)
  'president': { position: 'president', label: 'President', permissions: ['all'], hierarchy_level: 1 },
  'vp_operations': { position: 'vp_operations', label: 'VP Operations', permissions: ['manage_events', 'manage_members', 'view_analytics'], hierarchy_level: 2 },
  'vp_finance': { position: 'vp_finance', label: 'VP Finance', permissions: ['manage_finances', 'view_payments'], hierarchy_level: 2 },
  'vp_pledge_ed': { position: 'vp_pledge_ed', label: 'VP Pledge Education', permissions: ['manage_pledges', 'manage_events'], hierarchy_level: 2 },
  'svp': { position: 'svp', label: 'SVP', permissions: ['manage_members', 'manage_events'], hierarchy_level: 2 },
  
  // Department heads
  'vp_scholarship': { position: 'vp_scholarship', label: 'VP Scholarship', permissions: ['manage_academics'], hierarchy_level: 3 },
  'vp_branding': { position: 'vp_branding', label: 'VP Branding', permissions: ['manage_marketing'], hierarchy_level: 3 },
  'vp_service': { position: 'vp_service', label: 'VP Community Service', permissions: ['manage_service'], hierarchy_level: 3 },
  'vp_dei': { position: 'vp_dei', label: 'VP DEI', permissions: ['manage_dei'], hierarchy_level: 3 },
  'vp_professional': { position: 'vp_professional', label: 'VP Professional', permissions: ['manage_professional'], hierarchy_level: 3 },
  
  // Regular officer positions
  'social': { position: 'social', label: 'Social Chair', permissions: ['manage_social_events'], hierarchy_level: 4 },
  'marketing': { position: 'marketing', label: 'Marketing Chair', permissions: ['manage_marketing'], hierarchy_level: 4 },
  'wellness': { position: 'wellness', label: 'Wellness Chair', permissions: ['manage_wellness'], hierarchy_level: 4 },
  'fundraising': { position: 'fundraising', label: 'Fundraising Chair', permissions: ['manage_fundraising'], hierarchy_level: 4 },
  'brotherhood': { position: 'brotherhood', label: 'Brotherhood Chair', permissions: ['manage_brotherhood'], hierarchy_level: 4 },
  'risk': { position: 'risk', label: 'Risk Manager', permissions: ['manage_risk'], hierarchy_level: 4 },
  'historian': { position: 'historian', label: 'Historian', permissions: ['manage_media'], hierarchy_level: 4 },
  'chancellor': { position: 'chancellor', label: 'Chancellor', permissions: ['manage_discipline'], hierarchy_level: 4 },
};

export class OfficerManager {
  static async getAllOfficers(): Promise<Officer[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['officer', 'admin'])
      .order('officer_position');

    if (error) throw error;
    return data || [];
  }

  static async getOfficerByPosition(position: string): Promise<Officer | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('officer_position', position)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getCurrentUserOfficerInfo(userId: string): Promise<Officer | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .in('role', ['officer', 'admin'])
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static hasPermission(officer: Officer, requiredPermission: string): boolean {
    if (!officer.officer_position) return false;
    
    const position = OFFICER_POSITIONS[officer.officer_position];
    if (!position) return false;

    // Admins and presidents have all permissions
    if (officer.role === 'admin' || officer.officer_position === 'president') {
      return true;
    }

    return position.permissions.includes(requiredPermission) || 
           position.permissions.includes('all');
  }

  static canManagePosition(managerPosition: string, targetPosition: string): boolean {
    const manager = OFFICER_POSITIONS[managerPosition];
    const target = OFFICER_POSITIONS[targetPosition];
    
    if (!manager || !target) return false;
    
    // Can only manage positions at same or lower hierarchy level
    return manager.hierarchy_level <= target.hierarchy_level;
  }

  static getOfficerHierarchy(): OfficerPosition[] {
    return Object.values(OFFICER_POSITIONS).sort((a, b) => a.hierarchy_level - b.hierarchy_level);
  }
}
