-- ========================================================================
-- TAMBAH KOLOM REWORK_REASON DI TABEL SAMPLES
-- ========================================================================
-- Jalankan skrip ini di SQL Editor Supabase Anda untuk mengizinkan penyimpanan
-- alasan penolakan (rework log) hasil analisa oleh manajer.

ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS rework_reason TEXT;
