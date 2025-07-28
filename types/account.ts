export type Event = {
  id: string;
  title: string;
  date: string;
  host_name?: string;
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
