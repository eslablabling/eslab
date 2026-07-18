-- ================================================================
-- MIGRATION: QC Internal Columns (#7) + Koordinat GIS (#14)
-- Jalankan di Supabase Dashboard > SQL Editor
-- ================================================================

-- #7: Kolom QC Internal di tabel samples
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS qc_blank_weight  NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS qc_dup_weight_1  NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS qc_dup_weight_2  NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS qc_rpd           NUMERIC;
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS qc_status        TEXT; -- 'PASS' | 'FAIL' | null

-- #14: Kolom koordinat GIS di tabel coc_emisi
ALTER TABLE public.coc_emisi ADD COLUMN IF NOT EXISTS latitude   NUMERIC;
ALTER TABLE public.coc_emisi ADD COLUMN IF NOT EXISTS longitude  NUMERIC;
ALTER TABLE public.coc_emisi ADD COLUMN IF NOT EXISTS lokasi_kota TEXT;

-- Indeks cepat untuk query GIS
CREATE INDEX IF NOT EXISTS idx_coc_emisi_lat_lon ON public.coc_emisi(latitude, longitude);

COMMENT ON COLUMN public.samples.qc_blank_weight IS 'Berat blanko (filter kosong), mg';
COMMENT ON COLUMN public.samples.qc_dup_weight_1 IS 'Penimbangan duplikat pertama, mg';
COMMENT ON COLUMN public.samples.qc_dup_weight_2 IS 'Penimbangan duplikat kedua, mg';
COMMENT ON COLUMN public.samples.qc_rpd          IS 'Relative Percent Difference (%), threshold 10%';
COMMENT ON COLUMN public.samples.qc_status       IS 'Status QC: PASS / FAIL';
COMMENT ON COLUMN public.coc_emisi.latitude      IS 'Koordinat lintang lokasi cerobong (decimal degrees)';
COMMENT ON COLUMN public.coc_emisi.longitude     IS 'Koordinat bujur lokasi cerobong (decimal degrees)';
COMMENT ON COLUMN public.coc_emisi.lokasi_kota   IS 'Nama kota/kabupaten lokasi cerobong';
