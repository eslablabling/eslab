-- ========================================================================
-- SKRIP PENGETATAN KEAMANAN ROW LEVEL SECURITY (RLS) - ES LAB LIMS (REV 2)
-- ========================================================================
-- Silakan jalankan seluruh isi berkas SQL ini pada SQL Editor Supabase Anda.
-- Berkas ini akan mengaktifkan RLS dan membuat kebijakan berdasarkan role baru:
-- 1. 'analis': Hanya dapat mengisi/mengubah parameter uji lab di tabel 'samples' jika belum diverifikasi.
-- 2. 'sampling': Hanya memiliki hak baca (Select). Tidak bisa membuat/mengubah COC & Sampel.
-- 3. 'manager' / 'admin_master' / 'admin_ts': Memiliki hak akses penuh untuk CRUD & verifikasi data.

-- ------------------------------------------------------------------------
-- 1. Bersihkan Kebijakan Lama & Fungsi Get User Role
-- ------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'sampling'); -- Default ke role terendah jika tidak diset
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------
-- 2. Aktifkan RLS pada Tabel Utama
-- ------------------------------------------------------------------------
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coc_emisi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 3. Kebijakan Keamanan untuk Tabel 'profiles'
-- ------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------
-- 4. Kebijakan Keamanan untuk Tabel 'coc_emisi'
-- ------------------------------------------------------------------------
DROP POLICY IF EXISTS "Select coc_emisi policy" ON public.coc_emisi;
DROP POLICY IF EXISTS "Insert coc_emisi policy" ON public.coc_emisi;
DROP POLICY IF EXISTS "Update coc_emisi policy" ON public.coc_emisi;
DROP POLICY IF EXISTS "Delete coc_emisi policy" ON public.coc_emisi;

-- Kebijakan SELECT: Semua user terautentikasi dapat membaca data COC
CREATE POLICY "Select coc_emisi policy" ON public.coc_emisi
    FOR SELECT TO authenticated USING (true);

-- Kebijakan INSERT: Hanya admin_master, admin_ts, dan manager yang dapat membuat COC baru
CREATE POLICY "Insert coc_emisi policy" ON public.coc_emisi
    FOR INSERT TO authenticated 
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- Kebijakan UPDATE: Hanya admin_master, admin_ts, dan manager yang dapat mengubah COC
CREATE POLICY "Update coc_emisi policy" ON public.coc_emisi
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'))
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- Kebijakan DELETE: Hanya admin_master, admin_ts, dan manager yang bisa menghapus COC
CREATE POLICY "Delete coc_emisi policy" ON public.coc_emisi
    FOR DELETE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- ------------------------------------------------------------------------
-- 5. Kebijakan Keamanan untuk Tabel 'samples'
-- ------------------------------------------------------------------------
DROP POLICY IF EXISTS "Select samples policy" ON public.samples;
DROP POLICY IF EXISTS "Insert samples policy" ON public.samples;
DROP POLICY IF EXISTS "Update samples policy" ON public.samples;
DROP POLICY IF EXISTS "Delete samples policy" ON public.samples;

-- Kebijakan SELECT: Semua user terautentikasi dapat membaca data titik sampel
CREATE POLICY "Select samples policy" ON public.samples
    FOR SELECT TO authenticated USING (true);

-- Kebijakan INSERT: Hanya admin_master, admin_ts, dan manager yang dapat menambahkan titik sampel baru
CREATE POLICY "Insert samples policy" ON public.samples
    FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- Kebijakan UPDATE:
-- * Manager, Admin Master & Admin TS memiliki hak akses penuh untuk memperbarui semua status.
-- * Analis hanya bisa memperbarui jika is_verified = false (belum diverifikasi oleh Manager).
-- * Sampling TIDAK diizinkan untuk mengupdate sampel.
CREATE POLICY "Update samples policy" ON public.samples
    FOR UPDATE TO authenticated
    USING (
        public.get_user_role() IN ('manager', 'admin_master', 'admin_ts') OR
        (public.get_user_role() = 'analis' AND (is_verified = false OR is_verified IS NULL))
    )
    WITH CHECK (
        public.get_user_role() IN ('manager', 'admin_master', 'admin_ts') OR
        (public.get_user_role() = 'analis' AND (is_verified = false OR is_verified IS NULL))
    );

-- Kebijakan DELETE: Hanya admin_master, admin_ts, dan manager yang bisa menghapus titik sampel
CREATE POLICY "Delete samples policy" ON public.samples
    FOR DELETE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- ------------------------------------------------------------------------
-- 6. Kebijakan Keamanan untuk Tabel 'master_emisi'
-- ------------------------------------------------------------------------
ALTER TABLE public.master_emisi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select master_emisi policy" ON public.master_emisi;
DROP POLICY IF EXISTS "Insert master_emisi policy" ON public.master_emisi;
DROP POLICY IF EXISTS "Update master_emisi policy" ON public.master_emisi;
DROP POLICY IF EXISTS "Delete master_emisi policy" ON public.master_emisi;

-- Kebijakan SELECT: Semua user terautentikasi dapat membaca master data
CREATE POLICY "Select master_emisi policy" ON public.master_emisi
    FOR SELECT TO authenticated USING (true);

-- Kebijakan INSERT: Hanya admin_master, admin_ts, dan manager yang dapat menambah data master
CREATE POLICY "Insert master_emisi policy" ON public.master_emisi
    FOR INSERT TO authenticated 
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- Kebijakan UPDATE: Hanya admin_master, admin_ts, dan manager yang dapat mengupdate data master
CREATE POLICY "Update master_emisi policy" ON public.master_emisi
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'))
    WITH CHECK (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- Kebijakan DELETE: Hanya admin_master, admin_ts, dan manager yang bisa menghapus data master
CREATE POLICY "Delete master_emisi policy" ON public.master_emisi
    FOR DELETE TO authenticated
    USING (public.get_user_role() IN ('manager', 'admin_master', 'admin_ts'));

-- ------------------------------------------------------------------------
-- 7. Aktifkan Replikasi Realtime (Wajib Agar Realtime Dashboard Berjalan)
-- ------------------------------------------------------------------------
-- Tambahkan tabel ke dalam publikasi realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'samples'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.samples;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'coc_emisi'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.coc_emisi;
    END IF;
END $$;
