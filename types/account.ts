export type Event = {
  id: string;
  title: string;
  date: string;
  host_name?: string;
  point_value?: number;
  point_type?: string;
  is_non_event?: boolean;
};

export type Profile = {
  name: string | null;
  pledge_class: string | null;
  approved: boolean;
};

export type FeedbackSubmission = {
  user_id: string;
  content: string;
};

export type PointAppeal = {
  id: string;
  user_id: string;
  event_id: string;
  appeal_reason: string;
  picture_url?: string;
  status: 'pending' | 'approved' | 'denied';
  admin_response?: string;
  reviewed_by?: string;
  created_at: string;
  reviewed_at?: string;
  // Joined data
  event?: Event;
  user?: {
    first_name: string;
    last_name: string;
    pledge_class: string;
  };
  reviewer?: {
    first_name: string;
    last_name: string;
  };
};

export type PointAppealSubmission = {
  event_id: string;
  appeal_reason: string;
  picture_url?: string;
};
