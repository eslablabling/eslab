-- ========================================================================
-- TAMBAH KOLOM YANG HILANG DI TABEL SAMPLES
-- ========================================================================
-- Jalankan skrip ini di SQL Editor Supabase Anda untuk memperbaiki kesalahan
-- "Could not find the column..." di tabel samples.

ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS bahan_bakar TEXT;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS koordinat TEXT;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS temp_ambien NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS kelembaban NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS tgl_sampling DATE;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS kec_angin NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS catatan_cuaca TEXT;
