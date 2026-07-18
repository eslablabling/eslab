-- ========================================================================
-- DATABASE FUNCTION UNTUK VERIFIKASI COA PUBLIK (SECURITY DEFINER)
-- ========================================================================
-- Jalankan skrip ini di SQL Editor Supabase Anda untuk mengizinkan halaman
-- verify.html menarik data verifikasi COA tanpa memerlukan login pengguna.

CREATE OR REPLACE FUNCTION public.verify_coa(target_coc_id UUID)
RETURNS JSONB AS $$
DECLARE
    coc_data RECORD;
    sample_data JSONB;
    result JSONB;
BEGIN
    -- Query detail Chain of Custody (COA/COC)
    SELECT id, company_name, company_address, contact_person, qt_no, status_sampling, sampling_date, updated_at
    INTO coc_data
    FROM public.coc_emisi
    WHERE id = target_coc_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Certificate of Analysis tidak ditemukan.');
    END IF;
    
    -- Tarik hanya sampel yang berstatus verified (layak masuk COA)
    SELECT jsonb_agg(
        jsonb_build_object(
            'sample_id', sample_id,
            'description', description,
            'nama_cerobong', nama_cerobong,
            'status_lab', status_lab,
            'is_verified', is_verified,
            'parameters', parameters,
            'opasitas_avg', opasitas_avg
        )
    ) INTO sample_data
    FROM public.samples
    WHERE coc_id = target_coc_id AND status_lab = 'verified';
    
    -- Bangun data response
    result := jsonb_build_object(
        'success', true,
        'id', coc_data.id,
        'company_name', coc_data.company_name,
        'company_address', COALESCE(coc_data.company_address, '-'),
        'contact_person', COALESCE(coc_data.contact_person, '-'),
        'qt_no', coc_data.qt_no,
        'status_sampling', coc_data.status_sampling,
        'sampling_date', coc_data.sampling_date,
        'verified_at', coc_data.updated_at,
        'samples', COALESCE(sample_data, '[]'::jsonb)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
