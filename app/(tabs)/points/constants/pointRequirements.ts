/**
 * Point Requirements Constants
 * 
 * Defines the required points for each category/pillar
 * and associated metadata
 */

export const POINT_REQUIREMENTS: Record<string, { required: number; name: string; description: string }> = {
  brotherhood: { 
    required: 20, 
    name: 'Brotherhood', 
    description: 'Build lasting bonds with your brothers' 
  },
  professional: { 
    required: 4, 
    name: 'Professional Development', 
    description: 'Advance your career and skills' 
  },
  service: { 
    required: 4, 
    name: 'Service', 
    description: 'Give back to the community' 
  },
  scholarship: { 
    required: 4, 
    name: 'Scholarship', 
    description: 'Excel academically and learn' 
  },
  health: { 
    required: 3, 
    name: 'Health & Wellness', 
    description: 'Maintain physical and mental well-being' 
  },
  fundraising: { 
    required: 3, 
    name: 'Fundraising', 
    description: 'Support chapter financial goals' 
  },
  dei: { 
    required: 3, 
    name: 'Diversity, Equity & Inclusion', 
    description: 'Promote understanding and inclusion' 
  },
};

/**
 * Get category display information (icon and color)
 */
export const getCategoryInfo = (category: string, primaryColor: string) => {
  switch (category) {
    case 'brotherhood':
      return { icon: 'people', color: primaryColor };
    case 'professional':
      return { icon: 'business-center', color: '#4A90E2' };
    case 'service':
      return { icon: 'volunteer-activism', color: '#50C878' };
    case 'scholarship':
      return { icon: 'school', color: '#8E44AD' };
    case 'health':
      return { icon: 'fitness-center', color: '#E67E22' };
    case 'fundraising':
      return { icon: 'attach-money', color: '#F39C12' };
    case 'dei':
      return { icon: 'groups', color: '#E74C3C' };
    default:
      return { icon: 'category', color: '#95A5A6' };
  }
};
