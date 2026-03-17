/** * LOGIC ANALISA LABORATORIUM (KHUSUS PARTIKULAT)
 * Memisahkan parameter Direct Reading (Lapangan) dan Analisa (Lab)
 */

let currentEditSample = { dbId: null, sampleId: null };

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    fetchAntreanAnalisa();

    document.getElementById('searchAnalisa').addEventListener('input', (e) => {
        fetchAntreanAnalisa(e.target.value.toLowerCase());
    });

    document.getElementById('btnBatal').addEventListener('click', () => {
        document.getElementById('modalAnalisa').style.display = 'none';
    });
});

async function fetchAntreanAnalisa(keyword = '') {
    const tableBody = document.getElementById('analisaTableBody');
    
    // Pastikan fungsi hitungTAT tersedia
    const hitungTAT = (tglTerima) => {
        if (!tglTerima) return 0;
        const start = new Date(tglTerima);
        const now = new Date();
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    try {
        const { data: cocList, error } = await _supabase
            .from('coc_emisi')
            .select('*')
            // .eq('status_sampling', 'Selesai')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        let antreanSamples = [];
        cocList.forEach(coc => {
            const samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;

            samples.forEach(s => {
                console.log(`Checking Sample: ${s.sample_id}, Status Lab: ${s.status_lab}`); // Cek statusnya di sini
                
                const allowedStatus = ['received', 'analyzed', 'verified'];
                if (allowedStatus.includes(s.status_lab)) {
                    
                    // CEK: Apakah sampel ini punya parameter "Particulate"?
                    const hasLabWork = s.parameters.some(p => 
                        p.parameter && p.parameter.toLowerCase().includes('particulate')
                    );

                    antreanSamples.push({
                        ...s,
                        db_id: coc.id,
                        company: coc.company_name,
                        needLab: hasLabWork
                    });

                    console.log(`Sample ${s.sample_id} masuk antrean!`);
                }
            });
        });

        if (keyword) {
            antreanSamples = antreanSamples.filter(s => 
                s.sample_id.toLowerCase().includes(keyword) || s.company.toLowerCase().includes(keyword)
            );
        }

        if (antreanSamples.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:50px; color:var(--text-muted);">Tidak ada antrean analisa yang sudah diterima lab.</td></tr>`;
            return;
        }

        tableBody.innerHTML = antreanSamples.map(item => {
            // 1. Tambah logika status Verified
            const isDone = item.status_lab === 'analyzed';
            const isVerified = item.status_lab === 'verified';
            
            // Warna badge mengikuti status
            let labColor = '#f1f5f9';
            let labTextColor = '#64748b';
            let labText = '🔹 DIRECT READING';

            if (item.needLab) {
                if (isVerified) {
                    labColor = '#dcfce7'; // Hijau muda
                    labTextColor = '#15803d';
                    labText = '🔒 TERVERIFIKASI';
                } else if (isDone) {
                    labColor = '#f0fdf4';
                    labTextColor = '#166534';
                    labText = '✅ ANALISA SELESAI';
                } else {
                    labColor = '#fff7ed';
                    labTextColor = '#c2410c';
                    labText = '⏳ TUNGGU PARTIKULAT';
                }
            }

            const pPart = item.parameters.find(p => p.parameter.toLowerCase().includes('particulate'));
            let displayVolume = 'V.DGM: -';
            let displayHasil = '-';
            let metodeLabel = '';

            const hitungAvg = (val1, val2) => {
                const n1 = parseFloat(val1) || 0;
                const n2 = parseFloat(val2) || 0;
                if (n1 > 0 && n2 > 0) return (n1 + n2) / 2;
                return n1 || n2;
            };
            
            if (pPart) {
                const vDgm = parseFloat(pPart.volume_meter || 0);
                displayVolume = `V.DGM: ${vDgm.toFixed(4)} m³`;
                metodeLabel = pPart.method || '';

                if (pPart.grav_data) {
                    const d = pPart.grav_data;
                    const isSNI2021 = metodeLabel.includes('7117-21:2021');

                    const fAwal = hitungAvg(d.s_f_awal_1, d.s_f_awal_2);
                    const fAkhir = hitungAvg(d.s_f_akhir_1, d.s_f_akhir_2);
                    let totalNetGram = fAkhir - fAwal;

                    if (!isSNI2021) {
                        const cAwal = hitungAvg(d.s_c_awal_1, d.s_c_awal_2);
                        const cAkhir = hitungAvg(d.s_c_akhir_1, d.s_c_akhir_2);
                        totalNetGram += (cAkhir - cAwal);
                    }

                    const totalNetMg = totalNetGram * 1000;

                    if (vDgm > 0) {
                        const konsentrasi = (totalNetMg / vDgm).toFixed(2);
                        if (totalNetMg < 0) {
                            displayHasil = `<span style="color: #ef4444; font-weight: bold;">${konsentrasi} mg/m³ ⚠️</span>`;
                        } else {
                            displayHasil = `${konsentrasi} mg/m³`;
                        }
                    } else {
                        displayHasil = `<span style="color: #f59e0b;">Cek V.DGM</span>`;
                    }
                }
            }

            return `
            <tr>
                <td style="font-weight: 800; color: var(--primary);">${item.sample_id}</td>
                <td>
                    <div style="font-weight: 700;">${item.company}</div>
                    <div style="font-size: 0.65rem; color: #64748b;">${metodeLabel}</div>
                    <div style="font-size: 0.7rem; font-weight: 600; color: var(--primary);">${displayVolume}</div>
                </td>
                <td>
                    <div style="font-weight: 800; color: #0f172a; font-size: 1.1rem;">${displayHasil}</div>
                    <div style="font-size: 0.6rem; color: var(--text-muted);">Hasil Akhir (mg/m³)</div>
                </td>
                <td>
                    <span class="badge" style="background:${labColor}; color:${labTextColor};">
                        ${labText}
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    ${!isVerified ? `
                        <button onclick="bukaModalAnalisa('${item.db_id}', '${item.sample_id}')" class="btn-small">
                            ${isDone ? '📝 Edit' : '🧪 Input'}
                        </button>
                    ` : ''}

                    ${(isDone && !isVerified) ? `
                        <button onclick="verifikasiHasil('${item.db_id}', '${item.sample_id}')" class="btn-small" style="background:#22c55e; color:white; border:none; margin-left:4px;">
                            ✅ Verif
                        </button>
                    ` : ''}
                    
                    ${isVerified ? `
                    <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
                        <span style="color:#22c55e; font-size:0.7rem; font-weight:bold;">Selesai</span>
                        
                        <button onclick="unverifikasiHasil('${item.db_id}', '${item.sample_id}')" class="btn-small" style="background:#f1f5f9; color:#ef4444; border:1px solid #fee2e2;">
                            🔓 Unverif
                        </button>

                        <button onclick="window.location.assign('coa.html?id=' + '${item.db_id}')" class="btn-small" style="background:#6366f1; color:white; border:none;">
                            📜 Lihat CoA
                        </button>
                    </div>
                    ` : ''}
                </td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Debug Error:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Gagal memuat antrean: ${err.message}</td></tr>`;
    }
}
async function unverifikasiHasil(dbId, sampleId) {
    // Gunakan konfirmasi untuk mencegah ketidaksengajaan
    if (!confirm(`Buka kembali kunci data untuk ${sampleId}? Status akan kembali ke 'Analisa Selesai'.`)) return;

    try {
        const { data: coc } = await _supabase
            .from('coc_emisi')
            .select('samples_data')
            .eq('id', dbId)
            .single();

        let samples = typeof coc.samples_data === 'string' 
            ? JSON.parse(coc.samples_data) 
            : coc.samples_data;

        const updated = samples.map(s => {
            if (s.sample_id === sampleId) {
                // Menghapus flag verifikasi
                const { is_verified, verified_at, ...rest } = s; 
                return { 
                    ...rest, 
                    status_lab: 'analyzed', // Kembali ke status analisa
                    is_verified: false,
                    updated_at: new Date().toISOString()
                };
            }
            return s;
        });

        const { error } = await _supabase
            .from('coc_emisi')
            .update({ samples_data: updated })
            .eq('id', dbId);

        if (error) throw error;

        alert("Kunci data berhasil dibuka!");
        fetchAntreanAnalisa(); // Refresh tabel

    } catch (err) {
        alert("Gagal membuka kunci: " + err.message);
    }
}

async function bukaModalAnalisa(dbId, sampleId) {
    currentEditSample = { dbId, sampleId };
    const modal = document.getElementById('modalAnalisa');
    const inputContainer = document.getElementById('parameterInputs');
    
    try {
        const { data: coc } = await _supabase.from('coc_emisi').select('samples_data').eq('id', dbId).single();
        const samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;
        const s = samples.find(item => item.sample_id === sampleId);

        // 1. TAMBAHKAN PENGECEKAN VERIFIKASI
        const isVerified = s.status_lab === 'verified';

        document.getElementById('modalTitle').innerText = `Analisa Gravimetri: ${sampleId}`;
        document.getElementById('modalSubtitle').innerText = s.description;

        const labParams = s.parameters.filter(p => p.parameter.toLowerCase().includes('particulate'));

        inputContainer.innerHTML = labParams.map((p) => {
            const originalIndex = s.parameters.findIndex(op => op.parameter === p.parameter);
            const isSNI2021 = p.method.includes('7117-21:2021');
            const isGravimetriLama = p.method.includes('7117.17') || p.method.includes('Method 5');

            // Tambahkan atribut disabled jika isVerified true
            const disabledAttr = isVerified ? 'disabled' : '';

            if (isSNI2021) {
                return `
                    <div style="background: ${isVerified ? '#f8fafc' : '#f0f9ff'}; padding: 15px; border-radius: 12px; border: 1px solid #bae6fd; opacity: ${isVerified ? '0.7' : '1'};">
                        <input type="hidden" class="original-idx" value="${originalIndex}">
                        <div style="font-size: 0.65rem; font-weight: 800; color: #0369a1; margin-bottom: 10px;">METODE: SNI 7117-21:2021 (FILTER ONLY) ${isVerified ? '🔒 LOCKED' : ''}</div>
                        
                        <div style="margin-bottom: 15px;">
                            <h4 style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">🛡️ QC BLANKO FILTER (mg)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 1" class="qc-input" data-key="b_f_awal_1" value="${p.qc_data?.b_f_awal_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 2" class="qc-input" data-key="b_f_awal_2" value="${p.qc_data?.b_f_awal_2 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 1" class="qc-input" data-key="b_f_akhir_1" value="${p.qc_data?.b_f_akhir_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 2" class="qc-input" data-key="b_f_akhir_2" value="${p.qc_data?.b_f_akhir_2 || ''}">
                            </div>
                        </div>

                        <div>
                            <h4 style="font-size: 0.7rem; color: var(--primary); margin-bottom: 8px;">🧪 SAMPEL FILTER (g)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 1" class="grav-input" data-key="s_f_awal_1" value="${p.grav_data?.s_f_awal_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 2" class="grav-input" data-key="s_f_awal_2" value="${p.grav_data?.s_f_awal_2 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 1" class="grav-input" data-key="s_f_akhir_1" value="${p.grav_data?.s_f_akhir_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 2" class="grav-input" data-key="s_f_akhir_2" value="${p.grav_data?.s_f_akhir_2 || ''}">
                            </div>
                        </div>
                    </div>
                `;
            } else if (isGravimetriLama) {
                return `
                    <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; opacity: ${isVerified ? '0.7' : '1'};">
                        <input type="hidden" class="original-idx" value="${originalIndex}">
                        <div style="font-size: 0.65rem; font-weight: 800; color: #475569; margin-bottom: 10px;">METODE: GRAVIMETRI (FILTER + CAWAN) ${isVerified ? '🔒 LOCKED' : ''}</div>
                        
                        <div style="margin-bottom: 15px;">
                            <h4 style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">🛡️ QC BLANKO (mg)</h4>
                            <div style="display: grid; gap: 5px;">
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Aw 1" class="qc-input" data-key="b_f_awal_1" value="${p.qc_data?.b_f_awal_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Aw 2" class="qc-input" data-key="b_f_awal_2" value="${p.qc_data?.b_f_awal_2 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Ak 1" class="qc-input" data-key="b_f_akhir_1" value="${p.qc_data?.b_f_akhir_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Ak 2" class="qc-input" data-key="b_f_akhir_2" value="${p.qc_data?.b_f_akhir_2 || ''}">
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Aw 1" class="qc-input" data-key="b_c_awal_1" value="${p.qc_data?.b_c_awal_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Aw 2" class="qc-input" data-key="b_c_awal_2" value="${p.qc_data?.b_c_awal_2 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Ak 1" class="qc-input" data-key="b_c_akhir_1" value="${p.qc_data?.b_c_akhir_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Ak 2" class="qc-input" data-key="b_c_akhir_2" value="${p.qc_data?.b_c_akhir_2 || ''}">
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 style="font-size: 0.7rem; color: var(--primary); margin-bottom: 8px;">🧪 DATA SAMPEL (g)</h4>
                            <div style="display: grid; gap: 5px;">
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Aw 1" class="grav-input" data-key="s_f_awal_1" value="${p.grav_data?.s_f_awal_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Aw 2" class="grav-input" data-key="s_f_awal_2" value="${p.grav_data?.s_f_awal_2 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Ak 1" class="grav-input" data-key="s_f_akhir_1" value="${p.grav_data?.s_f_akhir_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="F.Ak 2" class="grav-input" data-key="s_f_akhir_2" value="${p.grav_data?.s_f_akhir_2 || ''}">
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Ko 1" class="grav-input" data-key="s_c_awal_1" value="${p.grav_data?.s_c_awal_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Ko 2" class="grav-input" data-key="s_c_awal_2" value="${p.grav_data?.s_c_awal_2 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Re 1" class="grav-input" data-key="s_c_akhir_1" value="${p.grav_data?.s_c_akhir_1 || ''}">
                                    <input ${disabledAttr} type="number" step="0.0001" placeholder="C.Re 2" class="grav-input" data-key="s_c_akhir_2" value="${p.grav_data?.s_c_akhir_2 || ''}">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            return `<div class="form-group"><label>${p.parameter}</label><input ${disabledAttr} type="text" class="hasil-biasa" data-orig-idx="${originalIndex}" value="${p.result || ''}"></div>`;
        }).join('');

        // 2. TAMPILKAN ATAU SEMBUNYIKAN TOMBOL SIMPAN
        const modalFooter = modal.querySelector('.modal-footer'); // Pastikan Anda punya selector ini
        if (modalFooter) {
            modalFooter.innerHTML = isVerified ? 
                `<div style="color: #ef4444; font-weight: bold; font-size: 0.8rem; text-align: center; width: 100%;">🔒 Data ini sudah diverifikasi dan dikunci.</div>` : 
                `<button onclick="simpanDataAnalisa()" class="btn-primary">Simpan Hasil</button>`;
        }

        modal.style.display = 'block';
    } catch (err) {
        alert("Gagal memuat form: " + err.message);
    }
}

document.getElementById('btnSimpanAnalisa').addEventListener('click', async () => {
    const { dbId, sampleId } = currentEditSample;

    try {
        const { data: coc } = await _supabase.from('coc_emisi').select('samples_data').eq('id', dbId).single();
        let samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;

        const updatedSamples = samples.map(s => {
            if (s.sample_id === sampleId) {
                const newParams = [...s.parameters];
                
                // Cari parameter Particulate untuk ambil data volume_meter (Vdgm)
                const pIdx = s.parameters.findIndex(p => p.parameter.toLowerCase().includes('particulate'));
                const vDgm = parseFloat(s.parameters[pIdx]?.volume_meter || 0);

               // ... di dalam event listener btnSimpanAnalisa ...
                const gravSections = document.querySelectorAll('#parameterInputs > div');

                gravSections.forEach(section => {
                    const idx = section.querySelector('.original-idx')?.value;
                    if (idx !== undefined) {
                        // 1. AMBIL DATA SAMPEL (dari .grav-input)
                        const gravData = {};
                        section.querySelectorAll('.grav-input').forEach(input => {
                            gravData[input.dataset.key] = input.value;
                        });

                        // 2. AMBIL DATA QC BLANKO (dari .qc-input) <-- INI YANG SERING TERLEWAT
                        const qcData = {};
                        section.querySelectorAll('.qc-input').forEach(input => {
                            qcData[input.dataset.key] = input.value;
                        });

                        // 3. HITUNG BERAT BERSIH (mg) UNTUK RESULT
                        const fNet = parseFloat(gravData.s_f_akhir_1 || 0) - parseFloat(gravData.s_f_awal_1 || 0);
                        const cNet = parseFloat(gravData.s_c_akhir_1 || 0) - parseFloat(gravData.s_c_awal_1 || 0);
                        
                        // Ambil Volume DGM untuk perhitungan konsentrasi
                        const vDgm = parseFloat(s.parameters[idx]?.volume_meter || 0);
                        const totalNetMg = (fNet + cNet) * 1000;
                        const hasilKonsentrasi = vDgm > 0 ? (totalNetMg / vDgm).toFixed(2) : 0;

                        // SIMPAN KE DALAM PARAMETER
                        newParams[idx].grav_data = gravData;
                        newParams[idx].qc_data = qcData; // Menyimpan data blanko ke database
                        newParams[idx].result = hasilKonsentrasi; 
                    }
                });

                return { 
                    ...s, 
                    parameters: newParams, 
                    status_lab: 'analyzed',
                    analyzed_at: new Date().toISOString() 
                };
            }
            return s;
        });

        const { error } = await _supabase.from('coc_emisi').update({ samples_data: updatedSamples }).eq('id', dbId);
        if (error) throw error;

        alert("Data Penimbangan Berhasil Disimpan!");
        document.getElementById('modalAnalisa').style.display = 'none';
        fetchAntreanAnalisa();

    } catch (err) {
        alert("Gagal menyimpan penimbangan: " + err.message);
    }
}); 

const hitungTAT = (tglTerima) => {
    if (!tglTerima) return 0;
    const start = new Date(tglTerima);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
};

async function verifikasiHasil(dbId, sampleId) {
    if (!confirm(`Verifikasi hasil untuk ${sampleId}? Data akan dikunci.`)) return;

    try {
        const { data: coc } = await _supabase
            .from('coc_emisi')
            .select('samples_data')
            .eq('id', dbId)
            .single();

        let samples = typeof coc.samples_data === 'string' 
            ? JSON.parse(coc.samples_data) 
            : coc.samples_data;

        const updated = samples.map(s => {
            if (s.sample_id === sampleId) {
                return { 
                    ...s, 
                    status_lab: 'verified', // <--- WAJIB TAMBAH INI
                    is_verified: true, 
                    verified_at: new Date().toISOString()
                };
            }
            return s;
        });

        const { error } = await _supabase
            .from('coc_emisi')
            .update({ samples_data: updated })
            .eq('id', dbId);

        if (error) throw error;

        alert("Sampel berhasil diverifikasi!");
        
        // Memanggil fungsi refresh yang benar
        fetchAntreanAnalisa(); 

    } catch (err) {
        alert("Gagal verifikasi: " + err.message);
    }
}