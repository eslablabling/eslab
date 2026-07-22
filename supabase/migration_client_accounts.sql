-- ================================================================
-- MIGRATION: Client Accounts & Custom Security Definer Login RPC
-- Jalankan di Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Buat Tabel Baru 'client_accounts'
CREATE TABLE IF NOT EXISTS public.client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_client_accounts_company ON public.client_accounts(company_name);

-- Enable RLS
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Select client_accounts policy" ON public.client_accounts;
DROP POLICY IF EXISTS "Insert client_accounts policy" ON public.client_accounts;
DROP POLICY IF EXISTS "Update client_accounts policy" ON public.client_accounts;
DROP POLICY IF EXISTS "Delete client_accounts policy" ON public.client_accounts;

-- 2. RLS Policies
-- SELECT: Admin Master, Admin TS, dan Manager dapat melihat data akun
CREATE POLICY "Select client_accounts policy" ON public.client_accounts
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('admin_master', 'admin_ts', 'manager'));

-- INSERT: Admin Master, Admin TS, dan Manager dapat membuat akun baru (untuk otomatisasi dari simpan COC)
CREATE POLICY "Insert client_accounts policy" ON public.client_accounts
    FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() IN ('admin_master', 'admin_ts', 'manager'));

-- UPDATE: Hanya Admin Master yang dapat mengubah kata sandi / data akun
CREATE POLICY "Update client_accounts policy" ON public.client_accounts
    FOR UPDATE TO authenticated
    USING (public.get_user_role() = 'admin_master')
    WITH CHECK (public.get_user_role() = 'admin_master');

-- DELETE: Hanya Admin Master yang dapat menghapus akun
CREATE POLICY "Delete client_accounts policy" ON public.client_accounts
    FOR DELETE TO authenticated
    USING (public.get_user_role() = 'admin_master');


-- 3. Postgres RPC Function untuk Login Klien (SECURITY DEFINER)
-- Bypasses RLS agar login dapat memvalidasi kredensial klien anonim dengan aman
CREATE OR REPLACE FUNCTION public.check_client_login(p_username text, p_password text)
RETURNS TABLE (
    success boolean,
    company_name text,
    username text,
    password_reset_trigger boolean,
    new_password text
) SECURITY DEFINER AS $$
DECLARE
    v_id uuid;
    v_company text;
    v_last_reset timestamptz;
    v_new_pwd text;
    v_triggered boolean := false;
BEGIN
    -- Cari akun berdasarkan username dan password
    SELECT id, client_accounts.company_name, last_reset
    INTO v_id, v_company, v_last_reset
    FROM public.client_accounts
    WHERE client_accounts.username = p_username AND client_accounts.password = p_password;

    IF v_id IS NOT NULL THEN
        -- Cek apakah sudah > 30 hari sejak reset terakhir
        IF v_last_reset < now() - interval '30 days' THEN
            -- Generate password acak baru 8 karakter
            v_new_pwd := 'ES-' || upper(substring(md5(random()::text) from 1 for 5));
            
            -- Update password baru
            UPDATE public.client_accounts
            SET password = v_new_pwd,
                last_reset = now()
            WHERE id = v_id;
            
            v_triggered := true;
        ELSE
            v_new_pwd := p_password;
        END IF;

        RETURN QUERY SELECT true, v_company, p_username, v_triggered, v_new_pwd;
    ELSE
        RETURN QUERY SELECT false, NULL::text, NULL::text, false, NULL::text;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 4. PENGISIAN OTOMATIS AKUN UNTUK PERUSAHAAN/PT YANG SUDAH ADA SEBELUMNYA
-- Mengambil seluruh nama perusahaan unik dari coc_emisi yang sudah diinput sebelumnya, 
-- lalu membuatkan username ('klien_' + nama PT dibersihkan) dan password acak awal ('ES-XXXXX') secara otomatis.
INSERT INTO public.client_accounts (company_name, username, password)
SELECT DISTINCT 
    company_name,
    'klien_' || lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g')),
    'ES-' || upper(substring(md5(random()::text) from 1 for 5))
FROM public.coc_emisi
WHERE company_name IS NOT NULL AND company_name <> ''
ON CONFLICT (company_name) DO NOTHING;

