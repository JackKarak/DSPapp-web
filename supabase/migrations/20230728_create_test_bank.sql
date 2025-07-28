-- Create test_bank table
create table public.test_bank (
    id uuid default uuid_generate_v4() primary key,
    submitted_by uuid references auth.users(id) on delete set null,
    class_code text not null,
    file_type text not null check (file_type in ('test', 'notes', 'materials')),
    original_file_name text,
    stored_file_name text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    uploaded_at timestamp with time zone default now(),
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamp with time zone,
    notes text
);

-- Add RLS policies
alter table public.test_bank enable row level security;

create policy "Anyone can view approved test bank entries"
  on public.test_bank for select
  using (status = 'approved');

create policy "Users can submit test bank entries"
  on public.test_bank for insert
  with check (auth.uid() = submitted_by);

create policy "VP Scholarship can manage test bank entries"
  on public.test_bank for all
  using (
    exists (
      select 1
      from public.users u
      where u.user_id = auth.uid()
      and u.officer_position = 'vp_scholarship'
    )
  );

-- Add indexes
create index test_bank_submitted_by_idx on public.test_bank(submitted_by);
create index test_bank_status_idx on public.test_bank(status);
create index test_bank_class_code_idx on public.test_bank(class_code);
