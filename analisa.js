/** * LOGIC ANALISA LABORATORIUM (KHUSUS PARTIKULAT)
 * Memisahkan parameter Direct Reading (Lapangan) dan Analisa (Lab)
 */

let currentEditSample = { dbId: null, sampleId: null };
let userRole = null;
let currentFilterTab = 'belum_selesai';
let currentPage = 1;
const pageSize = 10;
let filteredSamplesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pastikan Session Ada
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { 
        window.location.href = 'index.html'; 
        return; 
    }

    // 2. AMBIL ROLE (Tunggu sampai dapat)
    userRole = session.user.user_metadata?.role;
    if (!userRole) {
        const { data: profile } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
        userRole = profile?.role;
    }

    if (userRole) {
        sessionStorage.setItem('userRole', userRole);
    }

    console.log("Role terkonfirmasi:", userRole);

    // 3. BARU PANGGIL TABEL
    fetchAntreanAnalisa();

    // Listener lainnya...
    const searchAnalisa = document.getElementById('searchAnalisa');
    if (searchAnalisa) {
        searchAnalisa.addEventListener('input', (e) => {
            fetchAntreanAnalisa(e.target.value.toLowerCase());
        });
    }

    // 4. Listener untuk Paginasi
    const btnPrevPage = document.getElementById('btnPrevPage');
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTableRows();
                renderPaginationControls();
            }
        });
    }

    const btnNextPage = document.getElementById('btnNextPage');
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredSamplesList.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderTableRows();
                renderPaginationControls();
            }
        });
    }
});

// Expose global functions to window
window.switchAnalisaTab = function(tabName) {
    currentFilterTab = tabName;
    currentPage = 1;
    
    // Update active class on buttons
    document.getElementById('tabBelumSelesai').classList.toggle('active', tabName === 'belum_selesai');
    document.getElementById('tabSudahSelesai').classList.toggle('active', tabName === 'sudah_selesai');
    
    // Refresh table view
    fetchAntreanAnalisa(document.getElementById('searchAnalisa')?.value || '');
};

window.goToPage = function(pageNumber) {
    const totalPages = Math.ceil(filteredSamplesList.length / pageSize) || 1;
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderTableRows();
        renderPaginationControls();
    }
};

function renderTableRows() {
    const tableBody = document.getElementById('analisaTableBody');
    if (!tableBody) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredSamplesList.length);
    
    const paginatedSamples = filteredSamplesList.slice(startIndex, endIndex);

    if (paginatedSamples.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:50px; color:var(--text-muted);">Tidak ada antrean analisa.</td></tr>`;
        return;
    }

    const canVerify = ['manager', 'admin_master'].includes(userRole);

    tableBody.innerHTML = paginatedSamples.map(item => {
        const isDone = item.status_lab === 'analyzed';
        const isVerified = item.status_lab === 'verified';
        let tglAnalisaDisplay = "";
        if (item.analyzed_at) {
            const d = new Date(item.analyzed_at);
            tglAnalisaDisplay = d.toLocaleDateString('id-ID', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        }
        
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
                    ${item.analyzed_at ? `
                        <div style="font-size: 0.65rem; color: #64748b; margin-top: 6px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            📅 Analisa: <span style="color: #0f172a;">${tglAnalisaDisplay}</span>
                        </div>
                    ` : ''}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    ${!isVerified ? `
                        <button onclick="bukaModalAnalisa('${item.db_id}', '${item.sample_id}')" class="btn-small">
                            ${isDone ? '📝 Edit' : '🧪 Input'}
                        </button>
                    ` : ''}

                    ${(isDone && !isVerified && canVerify) ? `
                        <button onclick="verifikasiHasil('${item.db_id}', '${item.sample_id}')" class="btn-small" style="background:#22c55e; color:white; border:none; margin-left:4px;">
                            ✅ Verif
                        </button>
                    ` : ''}
                    
                    ${isVerified ? `
                        <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
                            <span style="color:#22c55e; font-size:0.7rem; font-weight:bold;">Selesai</span>
                            ${canVerify ? `
                                <button onclick="unverifikasiHasil('${item.db_id}', '${item.sample_id}')" class="btn-small" style="background:#f1f5f9; color:#ef4444; border:1px solid #fee2e2;">
                                    🔓 Unverif
                                </button>
                            ` : ''}
                            <button onclick="window.location.assign('coa.html?id=' + '${item.db_id}')" class="btn-small" style="background:#6366f1; color:white; border:none;">
                                📜 Lihat CoA
                            </button>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function renderPaginationControls() {
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const infoContainer = document.getElementById('paginationInfo');

    if (!prevBtn || !nextBtn || !pageNumbersContainer || !infoContainer) return;

    const totalItems = filteredSamplesList.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const startRange = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRange = Math.min(currentPage * pageSize, totalItems);
    infoContainer.innerText = `Menampilkan ${startRange} - ${endRange} dari ${totalItems} data`;

    let pagesHtml = "";
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        pagesHtml += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    pageNumbersContainer.innerHTML = pagesHtml;
}

async function fetchAntreanAnalisa(keyword = '') {
    const tableBody = document.getElementById('analisaTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:50px;">Memuat antrean analisa...</td></tr>';
    }

    try {
        const { data: cocList, error } = await _supabase
            .from('coc_emisi')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        let antreanSamples = [];
        cocList.forEach(coc => {
            const samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;

            samples.forEach(s => {
                const isAdmin = ['admin_master', 'manager'].includes(userRole);
                let isAllowed = false;

                if (isAdmin) {
                    const allStatus = ['received', 'analyzed', 'verified'];
                    isAllowed = allStatus.includes(s.status_lab);
                } else {
                    const analisStatus = ['received', 'analyzed'];
                    isAllowed = analisStatus.includes(s.status_lab);
                }

                if (isAllowed) {
                    const hasLabWork = s.parameters.some(p => 
                        p.parameter && p.parameter.toLowerCase().includes('particulate')
                    );

                    const isReceived = s.status_lab === 'received';
                    const isDone = s.status_lab === 'analyzed' || s.status_lab === 'verified';

                    const sampleObj = {
                        ...s,
                        db_id: coc.id,
                        company: coc.company_name,
                        needLab: hasLabWork
                    };

                    // Saring lokal berdasarkan tab aktif
                    if (currentFilterTab === 'belum_selesai') {
                        // Belum selesai: Butuh analisa lab (needLab === true) dan belum di-verifikasi (status_lab adalah 'received' atau 'analyzed')
                        if (hasLabWork && (s.status_lab === 'received' || s.status_lab === 'analyzed')) {
                            antreanSamples.push(sampleObj);
                        }
                    } else {
                        // Sudah selesai: Analisa lab terverifikasi (status_lab === 'verified') ATAU Direct Reading (hasLabWork === false)
                        if (s.status_lab === 'verified' || !hasLabWork) {
                            antreanSamples.push(sampleObj);
                        }
                    }
                }
            });
        });

        if (keyword) {
            antreanSamples = antreanSamples.filter(s => 
                s.sample_id.toLowerCase().includes(keyword) || s.company.toLowerCase().includes(keyword)
            );
        }

        filteredSamplesList = antreanSamples;
        currentPage = 1;

        renderTableRows();
        renderPaginationControls();

    } catch (err) {
        console.error(err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Koneksi Gagal.</td></tr>`;
        }
    }
}

async function unverifikasiHasil(dbId, sampleId) {
    // Gunakan konfirmasi untuk mencegah ketidaksengajaan
    if (!confirm(`Buka kembali kunci data untuk ${sampleId}? Status akan kembali ke 'Belum Selesai'.`)) return;

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
                // Menghapus flag verifikasi dan mengembalikan ke 'received' (Belum Selesai)
                const { is_verified, verified_at, analyzed_at, ...rest } = s; 
                return { 
                    ...rest, 
                    status_lab: 'received', 
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

        const isVerified = s.status_lab === 'verified';
        const disabledAttr = isVerified ? 'disabled' : '';

        document.getElementById('modalTitle').innerText = `Analisa Gravimetri: ${sampleId}`;
        
        // Menampilkan info update terakhir di subtitle
        let lastUpdateInfo = "";
        if (s.analyzed_at) {
            const tglFull = new Date(s.analyzed_at).toLocaleString('id-ID');
            lastUpdateInfo = `<br><span style="color:var(--primary); font-size:0.7rem;">Update: ${tglFull}</span>`;
        }
        document.getElementById('modalSubtitle').innerHTML = s.description + lastUpdateInfo;

        // Jika sudah ada analyzed_at, ambil YYYY-MM-DD-nya. Jika belum, pakai hari ini.
        const tglDefault = s.analyzed_at ? s.analyzed_at.split('T')[0] : new Date().toISOString().split('T')[0];

        // Konversi tglDefault (YYYY-MM-DD) ke DD/MM/YYYY
        let tglTextVal = "";
        if (tglDefault) {
            const parts = tglDefault.split('-');
            if (parts.length === 3) {
                tglTextVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }

        const tglInputHtml = `
            <div style="margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <label style="font-size: 0.7rem; font-weight: 800; color: #475569; display: block; margin-bottom: 5px;">📅 TANGGAL ANALISA</label>
                <div style="position: relative; display: flex; align-items: center; width: 100%;">
                    <input type="text" id="editTglAnalisaText" placeholder="DD/MM/YYYY" value="${tglTextVal}" ${disabledAttr} 
                        style="width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; padding-right: 40px; font-size: 0.9rem; font-family: inherit; font-weight: 600; color: #1e293b; background: ${isVerified ? '#f1f5f9' : '#fff'};">
                    ${!isVerified ? `
                    <input type="date" id="editTglAnalisaPicker" value="${tglDefault}" 
                        style="position: absolute; right: 8px; width: 28px; height: 28px; opacity: 0; cursor: pointer; z-index: 10;"
                        onchange="syncDatePickerToText(this.value)">
                    <span style="position: absolute; right: 10px; font-size: 1.1rem; pointer-events: none; z-index: 5;">📅</span>
                    ` : ''}
                </div>
            </div>
        `;
        // ----------------------------

        const labParams = s.parameters.filter(p => p.parameter.toLowerCase().includes('particulate'));

        // Gabungkan Input Tanggal dengan Map Parameter
        inputContainer.innerHTML = tglInputHtml + labParams.map((p) => {
            const originalIndex = s.parameters.findIndex(op => op.parameter === p.parameter);
            const isSNI2021 = p.method.includes('7117-21:2021');
            const isGravimetriLama = p.method.includes('7117.17') || p.method.includes('Method 5');

            if (isSNI2021) {
                return `
                    <div style="background: ${isVerified ? '#f8fafc' : '#f0f9ff'}; padding: 15px; border-radius: 12px; border: 1px solid #bae6fd; opacity: ${isVerified ? '0.7' : '1'}; margin-bottom:10px;">
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
                    <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; opacity: ${isVerified ? '0.7' : '1'}; margin-bottom:10px;">
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

        const modalFooter = modal.querySelector('.modal-footer'); 
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

    // --- 1. AMBIL TANGGAL DARI INPUT MODAL ---
    const tglText = document.getElementById('editTglAnalisaText').value.trim();
    let finalDate = new Date().toISOString();
    if (tglText) {
        const parts = tglText.split('/');
        if (parts.length === 3) {
            // DD/MM/YYYY -> YYYY-MM-DD
            const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
            const d = new Date(formatted);
            if (!isNaN(d.getTime())) {
                finalDate = d.toISOString();
            }
        } else {
            const d = new Date(tglText);
            if (!isNaN(d.getTime())) {
                finalDate = d.toISOString();
            }
        }
    }

    try {
        const { data: coc } = await _supabase.from('coc_emisi').select('samples_data').eq('id', dbId).single();
        let samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;

        const updatedSamples = samples.map(s => {
            if (s.sample_id === sampleId) {
                const newParams = [...s.parameters];
                
                // Ambil semua section input (Tanggal sekarang ada di urutan pertama/atas)
                const gravSections = document.querySelectorAll('#parameterInputs > div');

                gravSections.forEach(section => {
                    const idxInput = section.querySelector('.original-idx');
                    if (idxInput) {
                        const idx = idxInput.value;
                        
                        // 1. AMBIL DATA SAMPEL
                        const gravData = {};
                        section.querySelectorAll('.grav-input').forEach(input => {
                            gravData[input.dataset.key] = input.value;
                        });

                        // 2. AMBIL DATA QC BLANKO
                        const qcData = {};
                        section.querySelectorAll('.qc-input').forEach(input => {
                            qcData[input.dataset.key] = input.value;
                        });

                        // 3. HITUNG BERAT BERSIH (mg)
                        // Menggunakan perhitungan sederhana fNet + cNet
                        const fNet = parseFloat(gravData.s_f_akhir_1 || 0) - parseFloat(gravData.s_f_awal_1 || 0);
                        const cNet = parseFloat(gravData.s_c_akhir_1 || 0) - parseFloat(gravData.s_c_awal_1 || 0);
                        
                        const vDgm = parseFloat(s.parameters[idx]?.volume_meter || 0);
                        const totalNetMg = (fNet + cNet) * 1000;
                        const hasilKonsentrasi = vDgm > 0 ? (totalNetMg / vDgm).toFixed(2) : 0;

                        // SIMPAN KE DALAM PARAMETER
                        newParams[idx].grav_data = gravData;
                        newParams[idx].qc_data = qcData;
                        newParams[idx].result = hasilKonsentrasi; 
                    }
                });

                const targetSample = samples.find(s => s.sample_id === sampleId);
                const originalStatus = targetSample ? targetSample.status_lab : null;

                return { 
                    ...s, 
                    parameters: newParams, 
                    status_lab: 'analyzed',
                    analyzed_at: finalDate // --- 2. SIMPAN TANGGAL YANG DIPILIH ---
                };
            }
            return s;
        });

        // Tentukan action type & description sebelum update
        const targetS = samples.find(s => s.sample_id === sampleId);
        const originalStatus = targetS ? targetS.status_lab : null;
        const actionType = originalStatus === 'analyzed' || originalStatus === 'verified' ? 'EDIT_ANALYSIS' : 'INPUT_ANALYSIS';
        const desc = originalStatus === 'analyzed' || originalStatus === 'verified'
            ? `Mengubah hasil analisa gravimetri untuk sampel ${sampleId}`
            : `Menginput hasil analisa gravimetri untuk sampel ${sampleId}`;

        const { error } = await _supabase.from('coc_emisi').update({ samples_data: updatedSamples }).eq('id', dbId);
        if (error) throw error;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: actionType,
                table_name: 'coc_emisi',
                description: desc,
                old_data: { samples_data: coc.samples_data },
                new_data: { samples_data: updatedSamples }
            }]);
        }

        alert("Data Penimbangan & Tanggal Berhasil Disimpan!");
        document.getElementById('modalAnalisa').style.display = 'none';
        fetchAntreanAnalisa();

    } catch (err) {
        console.error(err);
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

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'VERIFY_ANALYSIS',
                table_name: 'coc_emisi',
                description: `Memverifikasi hasil analisa untuk sampel ${sampleId}`,
                old_data: { samples_data: coc.samples_data },
                new_data: { samples_data: updated }
            }]);
        }

        alert("Sampel berhasil diverifikasi!");
        
        // Memanggil fungsi refresh yang benar
        fetchAntreanAnalisa(); 

    } catch (err) {
        alert("Gagal verifikasi: " + err.message);
    }
}

function tutupModalAnalisa() {
    document.getElementById('modalAnalisa').style.display = 'none';
}
window.tutupModalAnalisa = tutupModalAnalisa;

function syncDatePickerToText(val) {
    if (val) {
        const parts = val.split('-');
        if (parts.length === 3) {
            document.getElementById('editTglAnalisaText').value = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
}
window.syncDatePickerToText = syncDatePickerToText;