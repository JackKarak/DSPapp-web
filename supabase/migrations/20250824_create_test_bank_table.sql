-- Create test_bank table for scholarship materials
CREATE TABLE IF NOT EXISTS public.test_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_code VARCHAR(20) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('test', 'notes', 'materials')),
    file_name TEXT NOT NULL,
    file_url TEXT,
    submitted_by UUID REFERENCES auth.users(id) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_bank_class_code ON public.test_bank(class_code);
CREATE INDEX IF NOT EXISTS idx_test_bank_file_type ON public.test_bank(file_type);
CREATE INDEX IF NOT EXISTS idx_test_bank_submitted_by ON public.test_bank(submitted_by);
CREATE INDEX IF NOT EXISTS idx_test_bank_status ON public.test_bank(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.test_bank ENABLE ROW LEVEL SECURITY;
