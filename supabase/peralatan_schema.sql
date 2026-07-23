-- Migration: SQL Schema untuk Menu Peralatan & Surat Jalan Peralatan Laboratorium
-- Form-ES-6.4.1; Rev.04 (Daftar Inventaris Alat Laboratorium)

-- 1. Tabel Master Peralatan
CREATE TABLE IF NOT EXISTS public.master_peralatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_urut VARCHAR(20),                   -- contoh: 002.1, 008.1, 016.1, 006.8
    yymm VARCHAR(10),                      -- contoh: 2601, 2001
    no_inventaris VARCHAR(100) UNIQUE NOT NULL, -- contoh: EQP/ES/PL/2601/008.1
    nama_alat VARCHAR(255) NOT NULL,       -- contoh: Gas Analyzer, Thermohygrometer
    merek_brand VARCHAR(150),              -- contoh: Seitron, Apex Instruments, UNICO
    type_model VARCHAR(150),               -- contoh: PEM-SMK10-L, HTC-1, DHG Series
    no_seri VARCHAR(150),                  -- contoh: 25100078, 0825
    rentang_akurasi VARCHAR(255),          -- contoh: 10-200 °C, 0.01 gram
    lokasi VARCHAR(150),                   -- contoh: R. Sampling, Lab Utama
    tgl_kalibrasi DATE,                    -- contoh: 2026-06-26
    periode_kalibrasi VARCHAR(50) DEFAULT '1 tahun',
    jadwal_kalibrasi DATE,                 -- Tanggal Expired / Kalibrasi Berikutnya
    lembaga_kalibrasi VARCHAR(150),        -- contoh: LK-361-IDN, NC-27526-USA
    kondisi VARCHAR(50) DEFAULT 'Baik',    -- Baik, Perlu Kalibrasi, Rusak, Dalam Perbaikan
    sertifikat_url TEXT,                   -- URL dokumen / PDF sertifikat kalibrasi
    box_pengaman_default BOOLEAN DEFAULT true,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_peralatan_no_inventaris ON public.master_peralatan(no_inventaris);
CREATE INDEX IF NOT EXISTS idx_peralatan_nama_alat ON public.master_peralatan(nama_alat);
CREATE INDEX IF NOT EXISTS idx_peralatan_jadwal_kalibrasi ON public.master_peralatan(jadwal_kalibrasi);

-- 2. Tabel Surat Jalan Peralatan Laboratorium (Form-ES-6.4.5; Rev.03)
CREATE TABLE IF NOT EXISTS public.surat_jalan_peralatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_surat_jalan VARCHAR(100) UNIQUE NOT NULL,
    coc_id UUID REFERENCES public.coc_emisi(id) ON DELETE CASCADE,
    nama_pekerjaan VARCHAR(255) DEFAULT 'Pengambilan Sampel',
    nomor_qt VARCHAR(100),
    nomor_coc VARCHAR(100),
    nama_pelanggan VARCHAR(255),
    lokasi_pengerjaan VARCHAR(255),
    transportasi VARCHAR(50) DEFAULT 'Darat', -- Darat, Laut, Udara
    tgl_pengerjaan_start DATE,
    tgl_pengerjaan_end DATE,
    items_json JSONB,                          -- Menyimpan array 33 item inventaris yang dibawa
    teknisi_lab VARCHAR(150),                  -- Name of lab technician
    lab_manager VARCHAR(150) DEFAULT 'Fadhel Verdino, S.T.',
    diserahkan_oleh VARCHAR(150),
    diterima_kembali_oleh VARCHAR(150),
    status VARCHAR(50) DEFAULT 'Dipinjam',     -- Dipinjam, Dikembalikan
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Data Inventaris Awal 38 Row (Sesuai Form-ES-6.4.1 Rev.04 PDF)
INSERT INTO public.master_peralatan 
(no_urut, yymm, no_inventaris, nama_alat, merek_brand, type_model, no_seri, rentang_akurasi, lokasi, tgl_kalibrasi, periode_kalibrasi, jadwal_kalibrasi, lembaga_kalibrasi, kondisi)
VALUES
('002.1', '2601', 'EQP/ES/PL/2601/002.1', 'Heating Drying Oven', 'Ari Medical', 'DHG Series', '25100078', '10-200 °C', 'Lab Utama', '2026-06-26', '1 tahun', '2027-06-26', 'LK-361-IDN', 'Baik'),
('003.1', '2601', 'EQP/ES/PL/2601/003.1', 'Desikator', '-', '-', '-', '-', 'R. Instrumen 1', NULL, NULL, NULL, '-', 'Baik'),
('004.1', '2601', 'EQP/ES/PL/2601/004.1', 'Spektrofotometer Vis', 'UNICO', 'S-2150UV', 'KA 25022211061', '200 - 1000 nm', 'R. Instrumen 2', '2026-01-26', '1 tahun', '2027-01-26', 'LK-361-IDN', 'Baik'),
('005.1', '2601', 'EQP/ES/PL/2601/005.1', 'Lemari Asam', 'Lokal', '-', '-', '-', 'Lab Utama', '2026-06-26', '1 tahun', '2027-06-26', 'LK-361-IDN', 'Baik'),
('006.1', '2601', 'EQP/ES/PL/2601/006.1', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'R. Instrumen 1', '2026-04-01', '1 tahun', '2027-04-01', 'LK-106-IDN', 'Baik'),
('006.2', '2601', 'EQP/ES/PL/2601/006.2', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'Lab Utama', '2026-06-01', '1 tahun', '2027-06-01', 'LK-361-IDN', 'Baik'),
('006.3', '2601', 'EQP/ES/PL/2601/006.3', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'R. Office', '2026-06-01', '1 tahun', '2027-06-01', 'LK-361-IDN', 'Baik'),
('006.4', '2601', 'EQP/ES/PL/2601/006.4', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'R. Instrumen 2', '2026-06-01', '1 tahun', '2027-06-01', 'LK-361-IDN', 'Baik'),
('006.5', '2601', 'EQP/ES/PL/2601/006.5', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'Dry Box Filter 1', '2026-04-01', '1 tahun', '2027-04-01', 'LK-361-IDN', 'Baik'),
('006.6', '2601', 'EQP/ES/PL/2601/006.6', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'Dry Box Filter 2', '2026-04-01', '1 tahun', '2027-04-01', 'LK-106-IDN', 'Baik'),
('006.7', '2601', 'EQP/ES/PL/2601/006.7', 'Thermohygrometer', '-', 'HTC-1', '-', 'Suhu : 0~100°C; Kelembaban : 0~100 %', 'Desikator', '2026-04-01', '1 tahun', '2027-04-01', 'LK-106-IDN', 'Baik'),
('006.8', '2601', 'EQP/ES/PL/2601/006.8', 'Thermohygrometer', '-', 'DR Gray', '-', '-50 ~ +70°C', 'Showcase Cooler', '2026-03-01', '1 tahun', '2027-03-01', 'LK-361-IDN', 'Baik'),
('007.1', '2601', 'EQP/ES/PL/2601/007.1', 'Hot Plate', '-', '-', '-', '1 °C', 'Lab Utama', '2026-06-11', '1 tahun', '2027-06-11', 'LK-361-IDN', 'Baik'),
('008.1', '2601', 'EQP/ES/PL/2601/008.1', 'Gas Analyzer', 'Seitron', '-', '-', '-', 'R. Sampling', '2026-04-03', '1 tahun', '2027-04-03', 'LK-361-IDN', 'Baik'),
('009.1', '2601', 'EQP/ES/PL/2601/009.1', 'Opasitas Ringleman', 'Fujis scope', 'OPIM-FS 102B', '-', '0~100%', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('010.1', '2601', 'EQP/ES/PL/2601/010.1', 'Dry Box Filter', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('010.2', '2601', 'EQP/ES/PL/2601/010.2', 'Dry Box Filter', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('011.1', '2601', 'EQP/ES/PL/2601/011.1', 'Cooler Box', 'Lion star', '35s', '-', '35L', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('012.1', '2601', 'EQP/ES/PL/2601/012.1', 'Jangka sorong', '-', '-', '-', '-', 'R. Sampling', '2026-01-07', '1 tahun', '2027-01-07', 'LK-378-IDN', 'Baik'),
('013.1', '2601', 'EQP/ES/PL/2601/013.1', 'Trolley', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('014.1', '2601', 'EQP/ES/PL/2601/014.1', 'Neraca Teknis', '-', '-', '-', '0.01 gram', 'R. Sampling', '2026-01-26', '1 tahun', '2027-01-26', 'LK-361-IDN', 'Baik'),
('015.1', '2601', 'EQP/ES/PL/2601/015.1', 'Isokinetik Stack Sampler', 'Apex Instruments', '-', '-', '-', 'R. Sampling', '2026-03-09', '1 tahun', '2027-03-09', 'NC-27526-USA', 'Baik'),
('016.1', '2601', 'EQP/ES/PL/2601/016.1', 'Isokinetik Stack Sampler', 'Polltech Instruments', 'PEM-SMK10-L', '0825', '0.02', 'R. Sampling', '2025-11-08', '1 tahun', '2026-11-07', 'CC-4126', 'Baik'),
('017.1', '2601', 'EQP/ES/PL/2601/017.1', 'Kabel Roll', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('017.2', '2601', 'EQP/ES/PL/2601/017.2', 'Kabel Roll', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('017.3', '2601', 'EQP/ES/PL/2601/017.3', 'Kabel Roll', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('018.1', '2601', 'EQP/ES/PL/2601/018.1', 'Tripod', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('019.1', '2601', 'EQP/ES/PL/2601/019.1', 'Tatakan', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('020.1', '2601', 'EQP/ES/PL/2601/020.1', 'Banner Safety Bekerja diKetinggian', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('021.1', '2601', 'EQP/ES/PL/2601/021.1', 'Stack Sampler Low Volume', 'Apex Instruments', '-', '-', '-', 'R. Sampling', '2026-06-10', '1 tahun', '2027-06-10', 'LK-361-IDN', 'Baik'),
('022.1', '2601', 'EQP/ES/PL/2601/022.1', 'Tali 25 meter', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('023.1', '2601', 'EQP/ES/PL/2601/023.1', 'Fylsheet 3x6', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('024.1', '2601', 'EQP/ES/PL/2601/024.1', 'Katrol 1 ton', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('025.1', '2601', 'EQP/ES/PL/2601/025.1', 'Terpal 2x4', '-', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('026.1', '2601', 'EQP/ES/PL/2601/026.1', 'Gas Analyzer', 'MRU MGA PrimeQ', '-', '-', '-', 'R. Sampling', '2026-01-05', '1 tahun', '2026-04-15', 'LK-361-IDN', 'Baik'),
('009.3', '2001', 'EQP/ES/2001/009.3', 'Timbangan Analitik Digital', 'AND', 'GH-252', '15111635', 'Max: 250 gr d: 0.0001 gr', 'R. Instrumen 1', '2025-06-25', '1 tahun', '2026-06-25', 'LK-361-IDN', 'Baik'),
('027.1', '2601', 'EQP/ES/PL/2601/027.1', 'Panel listrik Portable', 'Lokal', '-', '-', '-', 'R. Sampling', NULL, NULL, NULL, '-', 'Baik'),
('028.1', '2601', 'EQP/ES/PL/2601/028.1', 'Showcase Cooler', 'STEKO', 'LG-300', '0727LSP/QI/06.1-XI/2024', '4 ~ 8°C', 'Lab Utama', NULL, NULL, NULL, '-', 'Baik')
ON CONFLICT (no_inventaris) DO NOTHING;

-- 3. RLS Policies (Row Level Security) untuk akses Client Supabase
ALTER TABLE public.master_peralatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_jalan_peralatan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for master_peralatan" ON public.master_peralatan;
CREATE POLICY "Public access for master_peralatan" ON public.master_peralatan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for surat_jalan_peralatan" ON public.surat_jalan_peralatan;
CREATE POLICY "Public access for surat_jalan_peralatan" ON public.surat_jalan_peralatan FOR ALL USING (true) WITH CHECK (true);
