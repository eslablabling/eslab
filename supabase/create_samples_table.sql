-- 1. Buat Tabel Baru 'samples'
CREATE TABLE IF NOT EXISTS public.samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coc_id UUID NOT NULL REFERENCES public.coc_emisi(id) ON DELETE CASCADE,
    sample_id TEXT NOT NULL,
    description TEXT,
    nama_cerobong TEXT,
    status TEXT DEFAULT 'Pending',
    status_lab TEXT DEFAULT 'Pending',
    is_verified BOOLEAN DEFAULT false,
    tgl_terima_lab TIMESTAMP WITH TIME ZONE,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    waktu_gas TEXT,
    no_alat_gas TEXT,
    temp_gas NUMERIC,
    tekanan_atm NUMERIC,
    
    -- Opacity fields
    jarak_pengamat_awal NUMERIC,
    jarak_pengamat_akhir NUMERIC,
    arah_pengamat_awal TEXT,
    arah_pengamat_akhir TEXT,
    warna_emisi_awal TEXT,
    warna_emisi_akhir TEXT,
    latar_asap_awal TEXT,
    latar_asap_akhir TEXT,
    kondisi_langit_awal TEXT,
    kondisi_langit_akhir TEXT,
    temp_ambien_awal NUMERIC,
    temp_ambien_akhir NUMERIC,
    kelembaban_awal NUMERIC,
    kelembaban_akhir NUMERIC,
    kec_angin_awal NUMERIC,
    kec_angin_akhir NUMERIC,
    arah_angin_awal TEXT,
    arah_angin_akhir TEXT,
    desc_emisi TEXT,
    opasitas_mulai TEXT,
    opasitas_akhir TEXT,
    opasitas_matrix JSONB,
    opasitas_avg NUMERIC,
    
    -- Opacity remarks (1-6)
    opasitas_ket_1 TEXT,
    opasitas_ket_2 TEXT,
    opasitas_ket_3 TEXT,
    opasitas_ket_4 TEXT,
    opasitas_ket_5 TEXT,
    opasitas_ket_6 TEXT,
    
    -- Regulations and parameters (JSONB Array)
    regulations JSONB DEFAULT '[]'::jsonb,
    parameters JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambahkan indeks untuk mempercepat kueri relasi
CREATE INDEX IF NOT EXISTS idx_samples_coc_id ON public.samples(coc_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_samples_coc_sample ON public.samples(coc_id, sample_id);

-- Enable RLS (Row Level Security) pada tabel baru
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan RLS (Sama seperti coc_emisi agar sinkron)
CREATE POLICY "Allow read access for authenticated users" ON public.samples
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access for authenticated users" ON public.samples
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users" ON public.samples
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete access for authenticated users" ON public.samples
    FOR DELETE TO authenticated USING (true);

-- 2. Migrasikan Data Lama dari coc_emisi.samples_data ke tabel samples
DO $$
DECLARE
    coc_row RECORD;
    sample_item JSONB;
    samples_array JSONB;
BEGIN
    FOR coc_row IN SELECT id, samples_data FROM public.coc_emisi LOOP
        -- Pastikan samples_data tidak null
        IF coc_row.samples_data IS NOT NULL THEN
            -- Kadang disimpan sebagai string JSON, pastikan ter-parse dengan benar
            BEGIN
                IF pg_typeof(coc_row.samples_data) = 'text'::regtype OR pg_typeof(coc_row.samples_data) = 'varchar'::regtype THEN
                    samples_array := coc_row.samples_data::jsonb;
                ELSE
                    samples_array := coc_row.samples_data;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                samples_array := NULL;
            END;
            
            IF samples_array IS NOT NULL AND jsonb_typeof(samples_array) = 'array' THEN
                FOR sample_item IN SELECT * FROM jsonb_array_elements(samples_array) LOOP
                    INSERT INTO public.samples (
                        coc_id,
                        sample_id,
                        description,
                        nama_cerobong,
                        status,
                        status_lab,
                        is_verified,
                        tgl_terima_lab,
                        analyzed_at,
                        verified_at,
                        waktu_gas,
                        no_alat_gas,
                        temp_gas,
                        tekanan_atm,
                        jarak_pengamat_awal,
                        jarak_pengamat_akhir,
                        arah_pengamat_awal,
                        arah_pengamat_akhir,
                        warna_emisi_awal,
                        warna_emisi_akhir,
                        latar_asap_awal,
                        latar_asap_akhir,
                        kondisi_langit_awal,
                        kondisi_langit_akhir,
                        temp_ambien_awal,
                        temp_ambien_akhir,
                        kelembaban_awal,
                        kelembaban_akhir,
                        kec_angin_awal,
                        kec_angin_akhir,
                        arah_angin_awal,
                        arah_angin_akhir,
                        desc_emisi,
                        opasitas_mulai,
                        opasitas_akhir,
                        opasitas_matrix,
                        opasitas_avg,
                        opasitas_ket_1,
                        opasitas_ket_2,
                        opasitas_ket_3,
                        opasitas_ket_4,
                        opasitas_ket_5,
                        opasitas_ket_6,
                        regulations,
                        parameters
                    ) VALUES (
                        coc_row.id,
                        COALESCE(sample_item->>'sample_id', ''),
                        COALESCE(sample_item->>'description', ''),
                        COALESCE(sample_item->>'nama_cerobong', ''),
                        COALESCE(sample_item->>'status', 'Pending'),
                        COALESCE(sample_item->>'status_lab', 'Pending'),
                        COALESCE((sample_item->>'is_verified')::boolean, false),
                        (sample_item->>'tgl_terima_lab')::timestamp with time zone,
                        (sample_item->>'analyzed_at')::timestamp with time zone,
                        (sample_item->>'verified_at')::timestamp with time zone,
                        sample_item->>'waktu_gas',
                        sample_item->>'no_alat_gas',
                        (sample_item->>'temp_gas')::numeric,
                        (sample_item->>'tekanan_atm')::numeric,
                        (sample_item->>'jarak_pengamat_awal')::numeric,
                        (sample_item->>'jarak_pengamat_akhir')::numeric,
                        sample_item->>'arah_pengamat_awal',
                        sample_item->>'arah_pengamat_akhir',
                        sample_item->>'warna_emisi_awal',
                        sample_item->>'warna_emisi_akhir',
                        sample_item->>'latar_asap_awal',
                        sample_item->>'latar_asap_akhir',
                        sample_item->>'kondisi_langit_awal',
                        sample_item->>'kondisi_langit_akhir',
                        (sample_item->>'temp_ambien_awal')::numeric,
                        (sample_item->>'temp_ambien_akhir')::numeric,
                        (sample_item->>'kelembaban_awal')::numeric,
                        (sample_item->>'kelembaban_akhir')::numeric,
                        (sample_item->>'kec_angin_awal')::numeric,
                        (sample_item->>'kec_angin_akhir')::numeric,
                        sample_item->>'arah_angin_awal',
                        sample_item->>'arah_angin_akhir',
                        sample_item->>'desc_emisi',
                        sample_item->>'opasitas_mulai',
                        sample_item->>'opasitas_akhir',
                        COALESCE(sample_item->'opasitas_matrix', '[]'::jsonb),
                        (sample_item->>'opasitas_avg')::numeric,
                        sample_item->>'opasitas_ket_1',
                        sample_item->>'opasitas_ket_2',
                        sample_item->>'opasitas_ket_3',
                        sample_item->>'opasitas_ket_4',
                        sample_item->>'opasitas_ket_5',
                        sample_item->>'opasitas_ket_6',
                        COALESCE(sample_item->'regulations', '[]'::jsonb),
                        COALESCE(sample_item->'parameters', '[]'::jsonb)
                    ) ON CONFLICT (coc_id, sample_id) DO NOTHING;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
END $$;
