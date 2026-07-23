-- ========================================================================
-- PERBAIKAN RLS & SYNC PROFILES USER - ES LAB LIMS
-- ========================================================================
-- Jalankan seluruh isi SQL ini di Supabase -> SQL Editor.
-- 1. Mengaktifkan RLS dan membuat Kebijakan Access untuk tabel `profiles`
--    agar Admin Master dapat melakukan INSERT, UPDATE, dan DELETE pada profiles.
-- 2. Mengisi otomatis data `profiles` yang hilang bagi user di `auth.users`.

-- ------------------------------------------------------------------------
-- 1. Buat / Pastikan Fungsi get_user_role Ada
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'sampling');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------
-- 2. Aktifkan RLS & Buat Policy Lengkap pada Tabel `profiles`
-- ------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Semua user terautentikasi dapat membaca data profiles
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- Policy UPDATE: User bisa ubah profil sendiri, Admin Master bisa ubah semua profil
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin_master update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
CREATE POLICY "Allow update profiles" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id OR public.get_user_role() = 'admin_master')
    WITH CHECK (auth.uid() = id OR public.get_user_role() = 'admin_master');

-- Policy INSERT: Admin Master (atau user sendiri saat signup) dapat membuat profil baru
DROP POLICY IF EXISTS "Allow admin_master insert profiles" ON public.profiles;
CREATE POLICY "Allow admin_master insert profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() = 'admin_master' OR auth.uid() = id);

-- Policy DELETE: Hanya Admin Master yang dapat menghapus profil
DROP POLICY IF EXISTS "Allow admin_master delete profiles" ON public.profiles;
CREATE POLICY "Allow admin_master delete profiles" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.get_user_role() = 'admin_master');

-- ------------------------------------------------------------------------
-- 3. SINKRONISASI OTOMATIS: Buat profil bagi user di auth.users yang belum punya profil
-- ------------------------------------------------------------------------
INSERT INTO public.profiles (id, username, full_name, role, is_active, status_karyawan, last_password_reset)
SELECT 
    u.id, 
    split_part(u.email, '@', 1) AS username,
    split_part(u.email, '@', 1) AS full_name,
    'sampling' AS role,
    true AS is_active,
    'aktif' AS status_karyawan,
    NOW() AS last_password_reset
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
