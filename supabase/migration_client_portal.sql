-- ================================================================
-- MIGRATION: Client Portal & Sampling Requests
-- Jalankan di Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Tambahkan kolom scanned_coa_url di tabel coc_emisi
ALTER TABLE public.coc_emisi ADD COLUMN IF NOT EXISTS scanned_coa_url TEXT;
COMMENT ON COLUMN public.coc_emisi.scanned_coa_url IS 'URL berkas PDF COA resmi hasil scan basah + stempel di Google Drive';

-- 2. Tambahkan kolom company_name di tabel profiles untuk mengaitkan akun klien
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
COMMENT ON COLUMN public.profiles.company_name IS 'Nama perusahaan klien (e.g. PT Pertamina, PT PLN) untuk membatasi hak baca data emisi';

-- 3. Buat Tabel Baru 'sampling_requests'
CREATE TABLE IF NOT EXISTS public.sampling_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    tgl_rencana DATE NOT NULL,
    jumlah_cerobong INTEGER NOT NULL DEFAULT 1,
    parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
    lain_lain TEXT,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Scheduled' | 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add column if the table already exists
ALTER TABLE public.sampling_requests ADD COLUMN IF NOT EXISTS lain_lain TEXT;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_sampling_requests_client ON public.sampling_requests(client_id);

-- Enable RLS
ALTER TABLE public.sampling_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Select sampling_requests policy" ON public.sampling_requests;
DROP POLICY IF EXISTS "Insert sampling_requests policy" ON public.sampling_requests;
DROP POLICY IF EXISTS "Update sampling_requests policy" ON public.sampling_requests;
DROP POLICY IF EXISTS "Delete sampling_requests policy" ON public.sampling_requests;

-- 4. RLS Policies
-- SELECT: Klien hanya dapat melihat data miliknya sendiri. Admin TS, Manager, & Admin Master dapat melihat semua.
CREATE POLICY "Select sampling_requests policy" ON public.sampling_requests
    FOR SELECT TO authenticated 
    USING (
        public.get_user_role() IN ('manager', 'admin_master', 'admin_ts') OR
        (auth.uid() = client_id)
    );

-- INSERT: Semua user terautentikasi dapat membuat pengajuan (terutama klien).
CREATE POLICY "Insert sampling_requests policy" ON public.sampling_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = client_id);

-- UPDATE: Hanya manager, admin_master, dan admin_ts yang dapat mengubah permohonan.
CREATE POLICY "Update sampling_requests policy" ON public.sampling_requests
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'))
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- DELETE: Hanya admin_master yang dapat menghapus permohonan.
CREATE POLICY "Delete sampling_requests policy" ON public.sampling_requests
    FOR DELETE TO authenticated
    USING (public.get_user_role() = 'admin_master');
