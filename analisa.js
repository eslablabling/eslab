/** * LOGIC ANALISA LABORATORIUM (KHUSUS PARTIKULAT)
 * Memisahkan parameter Direct Reading (Lapangan) dan Analisa (Lab)
 */

let currentEditSample = { dbId: null, sampleId: null };
let userRole = null;
let masterEmisi = [];

// Helper to compute average of two values (ignoring 0/empty values)
function hitungAvg(val1, val2) {
    const n1 = parseFloat(val1) || 0;
    const n2 = parseFloat(val2) || 0;
    if (n1 > 0 && n2 > 0) return (n1 + n2) / 2;
    return n1 || n2;
}

async function fetchMasterEmisi() {
    try {
        const { data, error } = await _supabase
            .from('master_emisi')
            .select('parameter, metode, baku_mutu, unit, regulasi, koreksi_o2');
        if (error) throw error;
        masterEmisi = data || [];
        console.log("Master Emisi Loaded in Analisa:", masterEmisi.length, "rows");
    } catch (err) {
        console.error("Gagal memuat Master Emisi:", err);
        masterEmisi = [];
    }
}

function getO2Reference(paramName, regulationName) {
    if (!paramName || !regulationName || masterEmisi.length === 0) return null;

    const cleanParam = paramName.trim().toLowerCase();
    const cleanReg = (Array.isArray(regulationName) ? regulationName[0] : regulationName).trim().toLowerCase();

    const match = masterEmisi.find(m => {
        const masterParam = m.parameter ? m.parameter.toLowerCase().trim() : '';
        const masterReg = m.regulasi ? m.regulasi.toLowerCase().trim() : '';
        return masterParam === cleanParam && masterReg === cleanReg;
    });

    if (match && match.koreksi_o2 !== null && match.koreksi_o2 !== undefined) {
        return parseFloat(match.koreksi_o2);
    }
    return null;
}

function getRegulatoryLimit(paramName, regulationName) {
    if (!paramName || !regulationName || masterEmisi.length === 0) return '-';

    const cleanParam = paramName.trim().toLowerCase();
    const cleanReg = (Array.isArray(regulationName) ? regulationName[0] : regulationName).trim().toLowerCase();

    const match = masterEmisi.find(m => {
        const masterParam = m.parameter ? m.parameter.toLowerCase().trim() : '';
        const masterReg = m.regulasi ? m.regulasi.toLowerCase().trim() : '';
        return masterParam === cleanParam && masterReg === cleanReg;
    });
    
    if (match && (match.baku_mutu !== null && match.baku_mutu !== undefined)) {
        return match.baku_mutu.toString(); 
    }
    return '-';
}
let currentFilterTab = 'belum_selesai';
let currentPage = 1;
const pageSize = 10;
let filteredSamplesList = [];

window.addEventListener('auth-ready', async (e) => {
    const { role } = e.detail;
    userRole = role;
    if (userRole) {
        sessionStorage.setItem('userRole', userRole);
    }
    console.log("Role terkonfirmasi:", userRole);

    // 3. BARU PANGGIL TABEL
    await fetchMasterEmisi();
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
        
        const o2Param = item.parameters.find(sp => {
            const spName = (sp.parameter || '').toLowerCase().trim();
            return spName === 'o2' || spName === 'oksigen' || spName === 'oksigen (o2)' || spName === 'oxygen';
        });
        let o2Measured = null;
        if (o2Param) {
            const rawO2Val = o2Param.result || o2Param.konsentrasi_1 || '0';
            o2Measured = parseFloat(rawO2Val);
            if (isNaN(o2Measured)) o2Measured = null;
        }

        const pPart = item.parameters.find(p => p.parameter.toLowerCase().includes('particulate'));
        let displayVolume = 'V.DGM: -';
        let displayHasil = '-';
        let metodeLabel = '';
        
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
            if (pPart) {
                const vDgm = parseFloat(pPart.volume_meter || 0);
                displayVolume = `V.DGM: ${vDgm.toFixed(4)} m³`;
                metodeLabel = pPart.method || '';

                let rawVal = null;

                if (pPart.grav_data) {
                    const d = pPart.grav_data;
                    const q = pPart.qc_data || {};
                    const isSNI2021 = metodeLabel.includes('7117-21:2021');

                    // 1. Hitung Net Filter (Sampel - Blanko)
                    const s_fAwal = hitungAvg(d.s_f_awal_1, d.s_f_awal_2);
                    const s_fAkhir = hitungAvg(d.s_f_akhir_1, d.s_f_akhir_2);
                    const s_fNet = s_fAkhir - s_fAwal;

                    const b_fAwal = hitungAvg(q.b_f_awal_1, q.b_f_awal_2);
                    const b_fAkhir = hitungAvg(q.b_f_akhir_1, q.b_f_akhir_2);
                    const b_fNet = b_fAkhir - b_fAwal;

                    const netFilter = s_fNet - b_fNet;

                    let totalNetGram = netFilter;

                    if (isSNI2021) {
                        // 2. Hitung Net Aceton (Sampel - Blanko)
                        const s_aAwal = hitungAvg(d.s_a_awal_1, d.s_a_awal_2);
                        const s_aAkhir = hitungAvg(d.s_a_akhir_1, d.s_a_akhir_2);
                        const s_aNet = s_aAkhir - s_aAwal;

                        const b_aAwal = hitungAvg(q.b_a_awal_1, q.b_a_awal_2);
                        const b_aAkhir = hitungAvg(q.b_a_akhir_1, q.b_a_akhir_2);
                        const b_aNet = b_aAkhir - b_aAwal;

                        const netAceton = s_aNet - b_aNet;
                        totalNetGram += netAceton;
                    } else {
                        // 2. Hitung Net Cawan (Sampel - Blanko)
                        const s_cAwal = hitungAvg(d.s_c_awal_1, d.s_c_awal_2);
                        const s_cAkhir = hitungAvg(d.s_c_akhir_1, d.s_c_akhir_2);
                        const s_cNet = s_cAkhir - s_cAwal;

                        const b_cAwal = hitungAvg(q.b_c_awal_1, q.b_c_awal_2);
                        const b_cAkhir = hitungAvg(q.b_c_akhir_1, q.b_c_akhir_2);
                        const b_cNet = b_cAkhir - b_cAwal;

                        const netCawan = s_cNet - b_cNet;
                        totalNetGram += netCawan;
                    }

                    const totalNetMg = totalNetGram * 1000;
                    if (vDgm > 0) {
                        rawVal = parseFloat((totalNetMg / vDgm).toFixed(2));
                    }
                }

                // Fallback jika tidak ada grav_data atau vDgm <= 0
                if (rawVal === null) {
                    const rawStr = pPart.result || pPart.hasil_mg_nm3 || pPart.konsentrasi_1;
                    if (rawStr !== undefined && rawStr !== null && rawStr !== '') {
                        rawVal = parseFloat(rawStr);
                    }
                }

                if (rawVal !== null && !isNaN(rawVal)) {
                    const currentReg = item.regulations?.[0] || item.regulation_name || '-';
                    const limitStr = getRegulatoryLimit(pPart.parameter, currentReg);
                    const limitVal = parseFloat(limitStr);
                    const limitDisplay = isNaN(limitVal) ? '-' : `${limitStr} mg/m³`;
                    
                    const refO2 = getO2Reference(pPart.parameter, currentReg);
                    
                    let correctedVal = rawVal;
                    let isCorrected = false;

                    if (refO2 !== null) {
                        isCorrected = true;
                        if (o2Measured !== null && o2Measured > 0 && o2Measured < 21) {
                            const factor = (21 - refO2) / (21 - o2Measured);
                            correctedVal = parseFloat((rawVal * factor).toFixed(2));
                        }
                    }

                    const rawExceeds = !isNaN(limitVal) && rawVal > limitVal;
                    const correctedExceeds = !isNaN(limitVal) && correctedVal > limitVal;

                    if (isCorrected) {
                        displayHasil = `
                            <div style="font-size: 0.85rem; line-height: 1.4; text-align: left;">
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; margin-bottom: 2px; gap: 20px;">
                                    <span style="color: #64748b; font-weight: 600;">Terukur:</span>
                                    <strong style="color: ${rawExceeds ? '#ef4444' : '#1e293b'}">${rawVal.toFixed(2)} mg/m³ ${rawExceeds ? '⚠️' : ''}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; margin-bottom: 2px; gap: 20px;">
                                    <span style="color: #0284c7; font-weight: 700;">Terkoreksi (${refO2}% O₂):</span>
                                    <strong style="color: ${correctedExceeds ? '#ef4444' : '#0284c7'}">${correctedVal.toFixed(2)} mg/m³ ${correctedExceeds ? '⚠️' : ''}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                                    <span style="color: #64748b; font-weight: 600;">Baku Mutu:</span>
                                    <span style="font-weight: 700; color: #334155;">${limitDisplay}</span>
                                </div>
                            </div>
                        `;
                    } else {
                        displayHasil = `
                            <div style="font-size: 0.85rem; line-height: 1.4; text-align: left;">
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; margin-bottom: 2px; gap: 20px;">
                                    <span style="color: #64748b; font-weight: 600;">Terukur:</span>
                                    <strong style="color: ${rawExceeds ? '#ef4444' : '#1e293b'}">${rawVal.toFixed(2)} mg/m³ ${rawExceeds ? '⚠️' : ''}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                                    <span style="color: #64748b; font-weight: 600;">Baku Mutu:</span>
                                    <span style="font-weight: 700; color: #334155;">${limitDisplay}</span>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    displayHasil = `<span style="color: #f59e0b; font-weight: bold;">Cek V.DGM</span>`;
                }
            }
        }

        const exceeds = isSampleExceedingBakuMutu(item);
        const rowClass = exceeds ? 'class="blinking-alert"' : '';

        return `
            <tr ${rowClass}>
                <td style="font-weight: 800; color: var(--primary);">${item.sample_id}</td>
                <td>
                    <div style="font-weight: 700;">${item.company}</div>
                    <div style="font-size: 0.65rem; color: #64748b;">${metodeLabel}</div>
                    <div style="font-size: 0.7rem; font-weight: 600; color: var(--primary);">${displayVolume}</div>
                </td>
                <td>
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 12px; width: max-content; min-width: 220px; display: inline-block;">
                        ${displayHasil}
                    </div>
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
        const { data: samples, error } = await _supabase
            .from('samples')
            .select('*, coc_emisi(*)')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        let antreanSamples = [];
        samples.forEach(s => {
            const coc = s.coc_emisi || {};
            const canViewVerified = ['admin_master', 'manager', 'analis'].includes(userRole);
            let isAllowed = false;

            if (canViewVerified) {
                const allStatus = ['received', 'analyzed', 'verified'];
                isAllowed = allStatus.includes(s.status_lab);
            } else {
                const otherStatus = ['received', 'analyzed'];
                isAllowed = otherStatus.includes(s.status_lab);
            }

            if (isAllowed) {
                const hasLabWork = s.parameters && s.parameters.some(p => 
                    p.parameter && p.parameter.toLowerCase().includes('particulate')
                );

                const isReceived = s.status_lab === 'received';
                const isDone = s.status_lab === 'analyzed' || s.status_lab === 'verified';

                const sampleObj = {
                    ...s,
                    db_id: coc.id,
                    company: coc.company_name,
                    needLab: hasLabWork,
                    regulation_name: s.regulation_name || coc.regulation || ''
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
        const { error } = await _supabase
            .from('samples')
            .update({ 
                status_lab: 'received', 
                is_verified: false,
                verified_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId);

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
        const { data: s, error } = await _supabase
            .from('samples')
            .select('*')
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId)
            .single();
        if (error) throw error;

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
                        <div style="font-size: 0.65rem; font-weight: 800; color: #0369a1; margin-bottom: 10px;">METODE: SNI 7117-21:2021 (FILTER + ACETON) ${isVerified ? '🔒 LOCKED' : ''}</div>
                        
                        <div style="margin-bottom: 15px;">
                            <h4 style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">🛡️ QC BLANKO FILTER (g)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 1" class="qc-input" data-key="b_f_awal_1" value="${p.qc_data?.b_f_awal_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 2" class="qc-input" data-key="b_f_awal_2" value="${p.qc_data?.b_f_awal_2 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 1" class="qc-input" data-key="b_f_akhir_1" value="${p.qc_data?.b_f_akhir_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 2" class="qc-input" data-key="b_f_akhir_2" value="${p.qc_data?.b_f_akhir_2 || ''}">
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <h4 style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">🛡️ QC BLANKO ACETON (g)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 1" class="qc-input" data-key="b_a_awal_1" value="${p.qc_data?.b_a_awal_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 2" class="qc-input" data-key="b_a_awal_2" value="${p.qc_data?.b_a_awal_2 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 1" class="qc-input" data-key="b_a_akhir_1" value="${p.qc_data?.b_a_akhir_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 2" class="qc-input" data-key="b_a_akhir_2" value="${p.qc_data?.b_a_akhir_2 || ''}">
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <h4 style="font-size: 0.7rem; color: var(--primary); margin-bottom: 8px;">🧪 SAMPEL FILTER (g)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 1" class="grav-input" data-key="s_f_awal_1" value="${p.grav_data?.s_f_awal_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 2" class="grav-input" data-key="s_f_awal_2" value="${p.grav_data?.s_f_awal_2 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 1" class="grav-input" data-key="s_f_akhir_1" value="${p.grav_data?.s_f_akhir_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 2" class="grav-input" data-key="s_f_akhir_2" value="${p.grav_data?.s_f_akhir_2 || ''}">
                            </div>
                        </div>

                        <div>
                            <h4 style="font-size: 0.7rem; color: var(--primary); margin-bottom: 8px;">🧪 SAMPEL ACETON (g)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 1" class="grav-input" data-key="s_a_awal_1" value="${p.grav_data?.s_a_awal_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Awal 2" class="grav-input" data-key="s_a_awal_2" value="${p.grav_data?.s_a_awal_2 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 1" class="grav-input" data-key="s_a_akhir_1" value="${p.grav_data?.s_a_akhir_1 || ''}">
                                <input ${disabledAttr} type="number" step="0.0001" placeholder="Akhir 2" class="grav-input" data-key="s_a_akhir_2" value="${p.grav_data?.s_a_akhir_2 || ''}">
                            </div>
                        </div>
                        <div id="grav-live-preview-${originalIndex}" style="margin-top: 15px; padding: 12px; background: #fff; border: 1.5px solid #0284c7; border-radius: 12px; font-size: 0.8rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); color: #1e293b;"></div>
                    </div>
                `;
            } else if (isGravimetriLama) {
                return `
                    <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; opacity: ${isVerified ? '0.7' : '1'}; margin-bottom:10px;">
                        <input type="hidden" class="original-idx" value="${originalIndex}">
                        <div style="font-size: 0.65rem; font-weight: 800; color: #475569; margin-bottom: 10px;">METODE: GRAVIMETRI (FILTER + CAWAN) ${isVerified ? '🔒 LOCKED' : ''}</div>
                        
                        <div style="margin-bottom: 15px;">
                            <h4 style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px;">🛡️ QC BLANKO (g)</h4>
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
                        <div id="grav-live-preview-${originalIndex}" style="margin-top: 15px; padding: 12px; background: #fff; border: 1.5px solid #475569; border-radius: 12px; font-size: 0.8rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); color: #1e293b;"></div>
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

        // Register event listener untuk real-time calculation
        inputContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                updateLiveCalculations(s);
            });
        });
        
        // Panggil pertama kali untuk menampilkan kalkulasi awal (jika data sudah ada)
        updateLiveCalculations(s);

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
        const { data: s, error: fetchErr } = await _supabase
            .from('samples')
            .select('*')
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId)
            .single();
        if (fetchErr) throw fetchErr;

        const newParams = [...s.parameters];
        const gravSections = document.querySelectorAll('#parameterInputs > div');

        gravSections.forEach(section => {
            const idxInput = section.querySelector('.original-idx');
            if (idxInput) {
                const idx = idxInput.value;
                const gravData = {};
                section.querySelectorAll('.grav-input').forEach(input => {
                    gravData[input.dataset.key] = input.value;
                });

                const qcData = {};
                section.querySelectorAll('.qc-input').forEach(input => {
                    qcData[input.dataset.key] = input.value;
                });

                const method = s.parameters[idx]?.method || '';
                const isSNI2021 = method.includes('7117-21:2021');
                
                const s_fAwal = hitungAvg(gravData.s_f_awal_1, gravData.s_f_awal_2);
                const s_fAkhir = hitungAvg(gravData.s_f_akhir_1, gravData.s_f_akhir_2);
                const s_fNet = s_fAkhir - s_fAwal;

                const b_fAwal = hitungAvg(qcData.b_f_awal_1, qcData.b_f_awal_2);
                const b_fAkhir = hitungAvg(qcData.b_f_akhir_1, qcData.b_f_akhir_2);
                const b_fNet = b_fAkhir - b_fAwal;

                const netFilter = s_fNet - b_fNet;
                let totalNetGram = netFilter;
                
                if (isSNI2021) {
                    const s_aAwal = hitungAvg(gravData.s_a_awal_1, gravData.s_a_awal_2);
                    const s_aAkhir = hitungAvg(gravData.s_a_akhir_1, gravData.s_a_akhir_2);
                    const s_aNet = s_aAkhir - s_aAwal;

                    const b_aAwal = hitungAvg(qcData.b_a_awal_1, qcData.b_a_awal_2);
                    const b_aAkhir = hitungAvg(qcData.b_a_akhir_1, qcData.b_a_akhir_2);
                    const b_aNet = b_aAkhir - b_aAwal;

                    const netAceton = s_aNet - b_aNet;
                    totalNetGram += netAceton;
                } else {
                    const s_cAwal = hitungAvg(gravData.s_c_awal_1, gravData.s_c_awal_2);
                    const s_cAkhir = hitungAvg(gravData.s_c_akhir_1, gravData.s_c_akhir_2);
                    const s_cNet = s_cAkhir - s_cAwal;

                    const b_cAwal = hitungAvg(qcData.b_c_awal_1, qcData.b_c_awal_2);
                    const b_cAkhir = hitungAvg(qcData.b_c_akhir_1, qcData.b_c_akhir_2);
                    const b_cNet = b_cAkhir - b_cAwal;

                    const netCawan = s_cNet - b_cNet;
                    totalNetGram += netCawan;
                }
                
                const totalNetMg = totalNetGram * 1000;
                const vDgm = parseFloat(s.parameters[idx]?.volume_meter || 0);
                const hasilKonsentrasi = vDgm > 0 ? (totalNetMg / vDgm).toFixed(2) : 0;

                newParams[idx].grav_data = gravData;
                newParams[idx].qc_data = qcData;
                newParams[idx].result = hasilKonsentrasi; 
            }
        });

        const originalStatus = s.status_lab;
        const actionType = originalStatus === 'analyzed' || originalStatus === 'verified' ? 'EDIT_ANALYSIS' : 'INPUT_ANALYSIS';
        const desc = originalStatus === 'analyzed' || originalStatus === 'verified'
            ? `Mengubah hasil analisa gravimetri untuk sampel ${sampleId}`
            : `Menginput hasil analisa gravimetri untuk sampel ${sampleId}`;

        const { error } = await _supabase
            .from('samples')
            .update({
                parameters: newParams, 
                status_lab: 'analyzed',
                analyzed_at: finalDate
            })
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId);

        if (error) throw error;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: actionType,
                table_name: 'samples',
                description: desc,
                old_data: { sample_id: sampleId, parameters: s.parameters },
                new_data: { sample_id: sampleId, parameters: newParams, status_lab: 'analyzed' }
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
        const { error } = await _supabase
            .from('samples')
            .update({ 
                status_lab: 'verified',
                is_verified: true, 
                verified_at: new Date().toISOString()
            })
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId);

        if (error) throw error;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'VERIFY_ANALYSIS',
                table_name: 'samples',
                description: `Memverifikasi hasil analisa untuk sampel ${sampleId}`,
                old_data: { sample_id: sampleId, status_lab: 'analyzed' },
                new_data: { sample_id: sampleId, status_lab: 'verified' }
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

// ========================================================================
// FUNGSI UTILITY BARU UNTUK KALKULASI PARAMETER & BERSINAR BERSAMA
// ========================================================================

function getConversionMgm3(parameter, ppmValue) {
    if (ppmValue === undefined || ppmValue === null || ppmValue === '') return 0;
    
    let val = Number.parseFloat(ppmValue);
    if (Number.isNaN(val)) val = 0;

    const p = parameter.toUpperCase();
    let bm = 0;

    if (p.includes('SO2')) bm = 64.06;
    else if (p.includes('NO2')) bm = 46.01;
    else if (p.includes('NOX')) bm = 46.01;
    else if (p.includes('CO') && !p.includes('CO2')) bm = 28;
    else if (p.includes('NO')) bm = 30.01;

    return bm > 0 ? (val * bm) / 24.45 : val;
}

function isSampleExceedingBakuMutu(item) {
    const currentReg = item.regulations?.[0] || item.regulation_name || '-';
    
    const o2Param = item.parameters.find(sp => {
        const spName = (sp.parameter || '').toLowerCase().trim();
        return spName === 'o2' || spName === 'oksigen' || spName === 'oksigen (o2)' || spName === 'oxygen';
    });
    let o2Measured = null;
    if (o2Param) {
        const rawO2Val = o2Param.result || o2Param.konsentrasi_1 || '0';
        o2Measured = parseFloat(rawO2Val);
        if (isNaN(o2Measured)) o2Measured = null;
    }

    for (let p of item.parameters) {
        const pName = p.parameter ? p.parameter.replace(/\s+/g, ' ').trim().toLowerCase() : '';
        const isGasPolutan = (
            pName.includes('sulfur') || pName.includes('so2') || 
            pName.includes('nitrogen') || pName.includes('nox') || 
            pName.includes('no2') || pName.includes(' no') || 
            pName.includes('carbon mon') || pName.includes(' co')
        ) && !pName.includes('co2');

        let valToFormat;
        if (isGasPolutan) {
            const rawPpm = (p.konsentrasi_1 !== undefined && p.konsentrasi_1 !== null) ? p.konsentrasi_1 : '0';
            valToFormat = getConversionMgm3(p.parameter, rawPpm);
        } else if (pName.includes('opacity') || pName.includes('opasitas')) {
            valToFormat = item.opasitas_avg || '0';
        } else {
            valToFormat = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
        }

        const rawVal = parseFloat(valToFormat) || 0;
        if (rawVal <= 0) continue;

        const limitStr = getRegulatoryLimit(p.parameter, currentReg);
        const limitVal = parseFloat(limitStr);
        if (isNaN(limitVal)) continue;

        const refO2 = getO2Reference(p.parameter, currentReg);
        let finalVal = rawVal;
        if (refO2 !== null && o2Measured !== null && o2Measured > 0 && o2Measured < 21) {
            const factor = (21 - refO2) / (21 - o2Measured);
            finalVal = rawVal * factor;
        }

        if (finalVal > limitVal) {
            return true;
        }
    }
    return false;
}

function updateLiveCalculations(sampleObj) {
    const currentReg = sampleObj.regulation_name || '-';
    
    const o2Param = sampleObj.parameters.find(sp => {
        const spName = (sp.parameter || '').toLowerCase().trim();
        return spName === 'o2' || spName === 'oksigen' || spName === 'oksigen (o2)' || spName === 'oxygen';
    });
    let o2Measured = null;
    if (o2Param) {
        const rawO2Val = o2Param.result || o2Param.konsentrasi_1 || '0';
        o2Measured = parseFloat(rawO2Val);
        if (isNaN(o2Measured)) o2Measured = null;
    }

    const gravSections = document.querySelectorAll('#parameterInputs > div');
    gravSections.forEach(section => {
        const idxInput = section.querySelector('.original-idx');
        if (!idxInput) return;
        const idx = idxInput.value;
        const p = sampleObj.parameters[idx];
        const previewDiv = document.getElementById(`grav-live-preview-${idx}`);
        if (!previewDiv) return;

        const gravData = {};
        section.querySelectorAll('.grav-input').forEach(input => {
            gravData[input.dataset.key] = input.value;
        });

        const qcData = {};
        section.querySelectorAll('.qc-input').forEach(input => {
            qcData[input.dataset.key] = input.value;
        });

        const method = p.method || '';
        const isSNI2021 = method.includes('7117-21:2021');

        const s_fAwal = hitungAvg(gravData.s_f_awal_1, gravData.s_f_awal_2);
        const s_fAkhir = hitungAvg(gravData.s_f_akhir_1, gravData.s_f_akhir_2);
        const s_fNet = s_fAkhir - s_fAwal;

        const b_fAwal = hitungAvg(qcData.b_f_awal_1, qcData.b_f_awal_2);
        const b_fAkhir = hitungAvg(qcData.b_f_akhir_1, qcData.b_f_akhir_2);
        const b_fNet = b_fAkhir - b_fAwal;

        const netFilter = s_fNet - b_fNet;
        let totalNetGram = netFilter;

        let detailsHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                <div>Filter Sampel (Net): <strong>${s_fNet.toFixed(4)} g</strong></div>
                <div>Filter Blanko (Net): <strong>${b_fNet.toFixed(4)} g</strong></div>
            </div>
        `;

        if (isSNI2021) {
            const s_aAwal = hitungAvg(gravData.s_a_awal_1, gravData.s_a_awal_2);
            const s_aAkhir = hitungAvg(gravData.s_a_akhir_1, gravData.s_a_akhir_2);
            const s_aNet = s_aAkhir - s_aAwal;

            const b_aAwal = hitungAvg(qcData.b_a_awal_1, qcData.b_a_awal_2);
            const b_aAkhir = hitungAvg(qcData.b_a_akhir_1, qcData.b_a_akhir_2);
            const b_aNet = b_aAkhir - b_aAwal;

            const netAceton = s_aNet - b_aNet;
            totalNetGram += netAceton;

            detailsHtml += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                    <div>Aseton Sampel (Net): <strong>${s_aNet.toFixed(4)} g</strong></div>
                    <div>Aseton Blanko (Net): <strong>${b_aNet.toFixed(4)} g</strong></div>
                </div>
            `;
        } else {
            const s_cAwal = hitungAvg(gravData.s_c_awal_1, gravData.s_c_awal_2);
            const s_cAkhir = hitungAvg(gravData.s_c_akhir_1, gravData.s_c_akhir_2);
            const s_cNet = s_cAkhir - s_cAwal;

            const b_cAwal = hitungAvg(qcData.b_c_awal_1, qcData.b_c_awal_2);
            const b_cAkhir = hitungAvg(qcData.b_c_akhir_1, qcData.b_c_akhir_2);
            const b_cNet = b_cAkhir - b_cAwal;

            const netCawan = s_cNet - b_cNet;
            totalNetGram += netCawan;

            detailsHtml += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                    <div>Cawan Sampel (Net): <strong>${s_cNet.toFixed(4)} g</strong></div>
                    <div>Cawan Blanko (Net): <strong>${b_cNet.toFixed(4)} g</strong></div>
                </div>
            `;
        }

        const totalNetMg = totalNetGram * 1000;
        const vDgm = parseFloat(p.volume_meter || 0);
        const hasilKonsentrasi = vDgm > 0 ? (totalNetMg / vDgm) : 0;

        let resultsHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span>Total Partikulat Bersih:</span>
                <strong>${totalNetMg.toFixed(2)} mg</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span>Hasil Terukur:</span>
                <strong>${hasilKonsentrasi.toFixed(2)} mg/Nm³</strong>
            </div>
        `;

        const refO2 = getO2Reference(p.parameter, currentReg);
        let finalVal = hasilKonsentrasi;
        if (refO2 !== null) {
            if (o2Measured !== null && o2Measured > 0 && o2Measured < 21) {
                const factor = (21 - refO2) / (21 - o2Measured);
                finalVal = hasilKonsentrasi * factor;
                resultsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; color: #0284c7; font-weight: 700; margin-bottom: 4px;">
                        <span>Koreksi (${refO2}% O₂):</span>
                        <span>${finalVal.toFixed(2)} mg/Nm³</span>
                    </div>
                `;
            } else {
                resultsHtml += `
                    <div style="font-size: 0.7rem; color: #f59e0b; font-style: italic; margin-bottom: 4px;">
                        Menunggu data O₂ lapangan (${o2Measured !== null ? o2Measured + '%' : 'belum ada'}) untuk koreksi ${refO2}%
                    </div>
                `;
            }
        }

        const limitStr = getRegulatoryLimit(p.parameter, currentReg);
        const limitVal = parseFloat(limitStr);
        let alertHtml = '';
        
        if (!isNaN(limitVal)) {
            const isExceeded = finalVal > limitVal;
            resultsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
                    <span>Baku Mutu:</span>
                    <strong>${limitStr} mg/Nm³</strong>
                </div>
            `;
            if (isExceeded) {
                alertHtml = `
                    <div style="margin-top: 8px; padding: 6px 10px; background: #fee2e2; border: 1px solid #fecdd3; border-radius: 8px; color: #ef4444; font-weight: bold; text-align: center; text-transform: uppercase; box-shadow: 0 4px 6px rgba(239,68,68,0.1);">
                        ⚠️ MELEBIHI BAKU MUTU!
                    </div>
                `;
                section.style.borderColor = '#fca5a5';
                section.style.background = '#fef2f2';
            } else {
                section.style.borderColor = '#bae6fd';
                section.style.background = isVerified ? '#f8fafc' : '#f0f9ff';
            }
        }

        previewDiv.innerHTML = detailsHtml + resultsHtml + alertHtml;
    });
}