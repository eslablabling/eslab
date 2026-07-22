-- ================================================================
-- MIGRATION: Client Messages (Hub Komunikasi)
-- Jalankan di Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Buat Tabel Baru 'client_messages'
CREATE TABLE IF NOT EXISTS public.client_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    reply TEXT,
    replied_by TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Belum Dibalas', -- 'Belum Dibalas' | 'Sudah Dibalas'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_client_messages_company ON public.client_messages(company_name);

-- Enable RLS
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff read messages" ON public.client_messages;
DROP POLICY IF EXISTS "Staff update messages" ON public.client_messages;
DROP POLICY IF EXISTS "Admin delete messages" ON public.client_messages;

-- 2. RLS Policies (Hanya untuk Staf Terautentikasi)
-- SELECT: Manager, Admin Master, dan Admin TS dapat melihat semua pesan
CREATE POLICY "Staff read messages" ON public.client_messages
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- UPDATE: Manager, Admin Master, dan Admin TS dapat membalas pesan
CREATE POLICY "Staff update messages" ON public.client_messages
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'))
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- DELETE: Hanya Admin Master yang dapat menghapus pesan
CREATE POLICY "Admin delete messages" ON public.client_messages
    FOR DELETE TO authenticated
    USING (public.get_user_role() = 'admin_master');


-- 3. Stored Procedure RPC untuk Akses Klien (SECURITY DEFINER)
-- Bypasses RLS secara aman sehingga klien anonim dapat membaca/mengirim pesan milik perusahaan mereka sendiri tanpa membuka akses tabel ke publik.

-- RPC A: Ambil semua pesan untuk perusahaan tertentu
CREATE OR REPLACE FUNCTION public.fetch_client_messages(p_company_name text)
RETURNS TABLE (
    id uuid,
    company_name text,
    sender_name text,
    subject text,
    message text,
    reply text,
    replied_by text,
    replied_at timestamptz,
    status text,
    created_at timestamptz
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        m.id, m.company_name, m.sender_name, m.subject, m.message, 
        m.reply, m.replied_by, m.replied_at, m.status, m.created_at
    FROM public.client_messages m
    WHERE m.company_name = p_company_name
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RPC B: Kirim pesan baru dari klien
CREATE OR REPLACE FUNCTION public.send_client_message(
    p_company_name text,
    p_sender_name text,
    p_subject text,
    p_message text
) RETURNS uuid SECURITY DEFINER AS $$
DECLARE
    v_new_id uuid;
BEGIN
    INSERT INTO public.client_messages (company_name, sender_name, subject, message)
    VALUES (p_company_name, p_sender_name, p_subject, p_message)
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;
