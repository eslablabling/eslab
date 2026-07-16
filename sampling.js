let currentCocId = null;
let samplesDataArray = [];
let activeTab = 'identitas';
let userRole = null;
let currentFilterTab = 'belum_verif';
let currentPage = 1;
const pageSize = 10;
let filteredSamplesList = [];
let currentSampleIdx = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pastikan Sesi Auth Valid sebelum memuat data berat
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        // Jika tidak ada sesi, biarkan auth.js yang menangani redirect
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

    console.log("Role terkonfirmasi di sampling:", userRole);

    // 3. Jika sesi aman, muat data sampling
    await fetchSamplingData();

    // 4. Inisialisasi Event Listeners
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => fetchSamplingData(e.target.value));
    }

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => fetchSamplingData());
    }

    const btnCloseModal = document.getElementById('btnCloseModal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeSamplingModal);
    }

    const btnCancel = document.getElementById('btnCancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', closeSamplingModal);
    }

    const btnSaveSampling = document.getElementById('btnSaveSampling');
    if (btnSaveSampling) {
        btnSaveSampling.addEventListener('click', saveAllSamplingData);
    }

    // 5. Inisialisasi Paginasi
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
window.switchSamplingTab = function(tabName) {
    currentFilterTab = tabName;
    currentPage = 1; // Reset to page 1
    
    // Update active class on buttons
    const btnBelum = document.getElementById('tabBelumVerif');
    const btnSudah = document.getElementById('tabSudahVerif');
    if (btnBelum && btnSudah) {
        btnBelum.classList.toggle('active', tabName === 'belum_verif');
        btnSudah.classList.toggle('active', tabName === 'sudah_verif');
    }
    
    // Refresh table view
    fetchSamplingData(document.getElementById('searchBox')?.value || '');
};

window.goToPage = function(pageNumber) {
    const totalPages = Math.ceil(filteredSamplesList.length / pageSize) || 1;
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderTableRows();
        renderPaginationControls();
    }
};

// 1. Ambil data dari Supabase
async function fetchSamplingData(keyword = '') {
    let query = _supabase.from('coc_emisi').select('*').order('created_at', { ascending: false });
    if (keyword) query = query.or(`nomor_coc.ilike.%${keyword}%,company_name.ilike.%${keyword}%`);

    const { data, error } = await query;
    if (error) return console.error("Fetch Error:", error);

    // Saring data berdasarkan tab aktif secara lokal
    const filteredData = data.filter(item => {
        const status = item.status_sampling || 'Pending';
        if (currentFilterTab === 'belum_verif') {
            return status !== 'Verified';
        } else {
            return status === 'Verified';
        }
    });

    filteredSamplesList = filteredData;
    currentPage = 1;

    renderTableRows();
    renderPaginationControls();
}

// 2. Render Tabel Utama
function renderTableRows() {
    const tbody = document.getElementById('samplingTableBody');
    if (!tbody) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredSamplesList.length);
    
    const paginatedSamples = filteredSamplesList.slice(startIndex, endIndex);

    if (paginatedSamples.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-weight:600;">Tidak ada data sampling.</td></tr>`;
        return;
    }

    const canVerify = ['manager', 'admin_master'].includes(userRole);

    tbody.innerHTML = paginatedSamples.map(item => {
        const total = item.samples_data ? item.samples_data.length : 0;
        const done = item.samples_data ? item.samples_data.filter(s => s.status === 'Done').length : 0;
        const isVerified = item.status_sampling === 'Verified';
        const isSelesai = item.status_sampling === 'Selesai';

        // Styling Badge Status
        let badgeClass = "badge-progress";
        let statusLabel = item.status_sampling || 'Pending';
        let badgeStyle = "";

        if (isVerified) {
            statusLabel = "🔒 Verified";
            badgeStyle = "background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;";
        } else if (isSelesai) {
            statusLabel = "Selesai";
            badgeClass = "badge-done";
        }

        // Generate Tombol Aksi
        let aksiHtml = '';
        if (isVerified) {
            // Lihat Data (ReadOnly = true)
            aksiHtml += `<button class="btn-input" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;" onclick="openSamplingModal('${item.id}', true)">👁️ Lihat Data</button>`;
            
            // Tombol Batal Verif (hanya untuk Manager / Admin Master)
            if (canVerify) {
                aksiHtml += `<button class="btn-input" style="background:#fff1f2; color:#e11d48; border:1px solid #ffe4e6; margin-left:6px;" onclick="unverifikasiSampling('${item.id}', '${item.nomor_coc}')">🔓 Batal Verif</button>`;
            }
        } else {
            // Input Data (ReadOnly = false)
            aksiHtml += `<button class="btn-input" onclick="openSamplingModal('${item.id}', false)">📝 Input Data</button>`;
            
            // Tombol Verifikasi (hanya untuk Manager / Admin Master dan statusnya sudah 'Selesai')
            if (isSelesai && canVerify) {
                aksiHtml += `<button class="btn-input" style="background:#22c55e; color:white; border:none; margin-left:6px; box-shadow:0 4px 12px rgba(34, 197, 94, 0.2);" onclick="verifikasiSampling('${item.id}', '${item.nomor_coc}')">✅ Verifikasi</button>`;
            }
        }

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px; font-weight: 800; color: #2563eb;">${item.nomor_coc}</td>
                <td>${item.company_name}</td>
                <td>${item.sampling_date || '-'}</td>
                <td><small>${done} / ${total} Selesai</small></td>
                <td><span class="status-badge ${badgeClass}" style="${badgeStyle}">${statusLabel}</span></td>
                <td>
                    <div style="display:flex; align-items:center;">
                        ${aksiHtml}
                    </div>
                </td>
            </tr>`;
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

// 3. Logika Modal & Tab
async function openSamplingModal(id, readOnly = false) {
    const { data, error } = await _supabase.from('coc_emisi').select('*').eq('id', id).single();
    if (error) return alert("Gagal mengambil detail");

    currentCocId = id;
    samplesDataArray = data.samples_data || [];
    
    // Auto-inject missing Nitrogen Monoxide (NO) and Nitrogen Dioxide (NO2) if Nitrogen Oxide (NOx) is present
    samplesDataArray.forEach(s => {
        if (s.parameters) {
            const hasNOx = s.parameters.some(p => {
                const name = p.parameter.toUpperCase();
                return name.includes('NOX') || name.includes('NITROGEN OXIDE');
            });
            if (hasNOx) {
                const hasNO = s.parameters.some(p => {
                    const name = p.parameter.toUpperCase();
                    return name.includes('NITROGEN MONOXIDE') || name.replace(/\s+/g, '').includes('(NO)');
                });
                const hasNO2 = s.parameters.some(p => {
                    const name = p.parameter.toUpperCase();
                    return name.includes('NITROGEN DIOXIDE') || name.replace(/\s+/g, '').includes('(NO2)');
                });

                const noxParam = s.parameters.find(p => {
                    const name = p.parameter.toUpperCase();
                    return name.includes('NOX') || name.includes('NITROGEN OXIDE');
                });
                const copiedMethod = noxParam ? noxParam.method || noxParam.metode || 'Gas Analyzer' : 'Gas Analyzer';

                if (!hasNO) {
                    s.parameters.push({
                        parameter: "Nitrogen Monoxide (NO)",
                        method: copiedMethod,
                        konsentrasi_1: "",
                        konsentrasi_2: "",
                        konsentrasi_3: ""
                    });
                }
                if (!hasNO2) {
                    s.parameters.push({
                        parameter: "Nitrogen Dioxide (NO2)",
                        method: copiedMethod,
                        konsentrasi_1: "",
                        konsentrasi_2: "",
                        konsentrasi_3: ""
                    });
                }
            }
        }
    });

    currentSampleIdx = 0;
    activeTab = 'identitas'; 
    
    document.getElementById('mdlNoCoc').innerText = data.nomor_coc;
    document.getElementById('mdlCompany').innerText = data.company_name;
    
    renderTabNavigation(readOnly);
    renderSamplingForm(readOnly);
    
    const btnSave = document.getElementById('btnSaveSampling');
    if (btnSave) {
        if (readOnly) {
            btnSave.style.display = 'none';
        } else {
            btnSave.style.display = 'inline-block';
        }
    }
    
    document.getElementById('modalSamplingInput').style.display = 'flex';
}

function renderTabNavigation(readOnly = false) {
    const isIdentitasIncomplete = samplesDataArray.some(s => 
        !s.nama_cerobong?.trim() || 
        !s.bahan_bakar?.trim() || 
        !s.koordinat?.trim() || 
        !s.tgl_sampling
    );

    const isGasIncomplete = samplesDataArray.some(s => {
        const hasGasParams = s.parameters.some(p => {
            const name = p.parameter.toUpperCase();
            return ['NO', 'NO2', 'NOX', 'SO2', 'CO', 'O2', 'CO2', 'VELOCITY'].some(key => name.includes(key));
        });
        if (!hasGasParams) return false;
        
        if (!s.waktu_gas || !s.no_alat_gas?.trim() || !s.temp_gas || !s.tekanan_atm) return true;

        return s.parameters.some(p => {
            const name = p.parameter.toUpperCase();
            const isGas = ['NO', 'NO2', 'NOX', 'SO2', 'CO', 'O2', 'CO2', 'VELOCITY'].some(key => name.includes(key));
            if (!isGas) return false;
            if (name.includes('NOX') || name.includes('NITROGEN OXIDE')) return false;
            return p.konsentrasi_1 === undefined || p.konsentrasi_1 === '' ||
                   p.konsentrasi_2 === undefined || p.konsentrasi_2 === '' ||
                   p.konsentrasi_3 === undefined || p.konsentrasi_3 === '';
        });
    });

    const isOpacityIncomplete = samplesDataArray.some(s => {
        const hasOpacity = s.parameters.some(p => p.parameter.toUpperCase().includes('OPACITY') || p.parameter.toUpperCase().includes('OPASITAS'));
        if (!hasOpacity) return false;

        if (!s.jarak_pengamat_awal || !s.jarak_pengamat_akhir || !s.arah_pengamat_awal || !s.arah_pengamat_akhir ||
            !s.warna_emisi_awal || !s.warna_emisi_akhir || !s.latar_asap_awal || !s.latar_asap_akhir ||
            !s.kondisi_langit_awal || !s.kondisi_langit_akhir || !s.temp_ambien_awal || !s.temp_ambien_akhir ||
            !s.kelembaban_awal || !s.kelembaban_akhir || !s.kec_angin_awal || !s.kec_angin_akhir ||
            !s.arah_angin_awal || !s.arah_angin_akhir || !s.opasitas_mulai || !s.opasitas_akhir) {
            return true;
        }

        if (!s.opasitas_matrix) return true;
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 4; c++) {
                if (s.opasitas_matrix[r][c] === undefined || s.opasitas_matrix[r][c] === '') return true;
            }
        }
        return false;
    });

    const isIsokineticIncomplete = samplesDataArray.some(s => {
        const hasIsokinetic = s.parameters.some(p => {
            const name = p.parameter.toUpperCase();
            return ['VELOCITY', 'WATER VAPOR', 'ISOKINETIC', 'PARTICULATE'].some(k => name.includes(k));
        });
        if (!hasIsokinetic) return false;

        return s.parameters.some(p => {
            const name = p.parameter.toUpperCase();
            const isTech = ['VELOCITY', 'VOLUMETRIC FLOW RATE', 'WATER VAPOR', 'NUM OF TRAVERSE POINT', 'PERCENT OF ISOKINETIC'].some(k => name.includes(k));
            const isParticulate = name.includes('PARTICULATE');

            if (isTech && (p.konsentrasi_1 === undefined || p.konsentrasi_1 === '')) return true;
            if (isParticulate && (!p.no_filter || p.volume_meter === undefined || p.volume_meter === '')) return true;
            return false;
        });
    });

    const hasAnyOpacity = samplesDataArray.some(s => s.parameters.some(p => p.parameter.toUpperCase().includes('OPACITY') || p.parameter.toUpperCase().includes('OPASITAS')));
    const hasAnyParticulate = samplesDataArray.some(s => s.parameters.some(p => p.parameter.toUpperCase().includes('PARTICULATE') || p.parameter.toUpperCase().includes('PARTIKULAT')));

    if (!hasAnyOpacity && activeTab === 'opacity') {
        activeTab = 'identitas';
    }
    if (!hasAnyParticulate && activeTab === 'isokinetic') {
        activeTab = 'identitas';
    }

    let opacityTabHtml = "";
    if (hasAnyOpacity) {
        opacityTabHtml = `
            <button class="tab-btn ${activeTab === 'opacity' ? 'active' : ''}" onclick="switchTab('opacity', ${readOnly})">
                ☁️ OPASITAS ${isOpacityIncomplete ? '<span style="color:#ef4444; font-weight:bold; margin-left:4px;">⚠️</span>' : ''}
            </button>
        `;
    }

    let isokineticTabHtml = "";
    if (hasAnyParticulate) {
        isokineticTabHtml = `
            <button class="tab-btn ${activeTab === 'isokinetic' ? 'active' : ''}" onclick="switchTab('isokinetic', ${readOnly})">
                🏗️ ISOKINETIK ${isIsokineticIncomplete ? '<span style="color:#ef4444; font-weight:bold; margin-left:4px;">⚠️</span>' : ''}
            </button>
        `;
    }

    const navHtml = `
        <div class="modal-tabs" style="display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; overflow-x: auto;">
            <button class="tab-btn ${activeTab === 'identitas' ? 'active' : ''}" onclick="switchTab('identitas', ${readOnly})">
                📋 IDENTITAS & METEO ${isIdentitasIncomplete ? '<span style="color:#ef4444; font-weight:bold; margin-left:4px;">⚠️</span>' : ''}
            </button>
            <button class="tab-btn ${activeTab === 'gas' ? 'active' : ''}" onclick="switchTab('gas', ${readOnly})">
                📟 GAS DIRECT ${isGasIncomplete ? '<span style="color:#ef4444; font-weight:bold; margin-left:4px;">⚠️</span>' : ''}
            </button>
            ${opacityTabHtml}
            ${isokineticTabHtml}
        </div>
    `;
    const container = document.getElementById('samplingDetailContainer');
    if(!document.querySelector('.modal-tabs')) {
        container.insertAdjacentHTML('beforebegin', navHtml);
    } else {
        document.querySelector('.modal-tabs').outerHTML = navHtml;
    }
}

function switchTab(tabName, readOnly = false) {
    activeTab = tabName;
    renderTabNavigation(readOnly);
    renderSamplingForm(readOnly);
}

function renderSamplingForm(readOnly = false) {
    const container = document.getElementById('samplingDetailContainer');
    const disabledAttr = readOnly ? 'disabled style="background: #f1f5f9; cursor: not-allowed;"' : '';
    
    // --- EVALUATE INCOMPLETE FIELDS FOR WARNING BANNER ---
    const missingFields = [];
    const currentSample = samplesDataArray[currentSampleIdx];

    if (activeTab === 'identitas' && currentSample) {
        const checkMap = {
            'nama_cerobong': 'Nama Cerobong',
            'bahan_bakar': 'Bahan Bakar',
            'koordinat': 'Koordinat',
            'tgl_sampling': 'Tgl Sampling',
            'temp_ambien': 'Ambien (°C)',
            'kelembaban': 'Lembab (%)',
            'kec_angin': 'Kec. Angin (m/s)',
            'catatan_cuaca': 'Cuaca'
        };
        const missingSet = new Set();
        Object.keys(checkMap).forEach(key => {
            const val = currentSample[key];
            if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                missingSet.add(checkMap[key]);
            }
        });
        if (missingSet.size > 0) {
            missingFields.push(...missingSet);
        }
    }

    if (activeTab === 'gas' && currentSample) {
        const headerMap = {
            'waktu_gas': 'Waktu Gas Analyzer',
            'no_alat_gas': 'No. Alat Gas Analyzer',
            'temp_gas': 'Suhu Gas (°C)',
            'tekanan_atm': 'Tekanan ATM (mmHg)'
        };
        const missingSet = new Set();
        Object.keys(headerMap).forEach(key => {
            const val = currentSample[key];
            if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                missingSet.add(headerMap[key]);
            }
        });

        const hasGasParams = currentSample.parameters.some(p => {
            const name = p.parameter.toUpperCase();
            return ['NO', 'NO2', 'NOX', 'SO2', 'CO', 'O2', 'CO2', 'VELOCITY'].some(key => name.includes(key));
        });
        if (hasGasParams) {
            currentSample.parameters.forEach(p => {
                const name = p.parameter.toUpperCase();
                const isGas = ['NO', 'NO2', 'NOX', 'SO2', 'CO', 'O2', 'CO2', 'VELOCITY'].some(key => name.includes(key));
                if (!isGas) return;
                if (name.includes('NOX') || name.includes('NITROGEN OXIDE')) return;
                
                if (p.konsentrasi_1 === undefined || p.konsentrasi_1 === '' ||
                    p.konsentrasi_2 === undefined || p.konsentrasi_2 === '' ||
                    p.konsentrasi_3 === undefined || p.konsentrasi_3 === '') {
                    missingSet.add(`Hasil Pembacaan Gas (${p.parameter})`);
                }
            });
        }
        if (missingSet.size > 0) {
            missingFields.push(...missingSet);
        }
    }

    if (activeTab === 'opacity' && currentSample) {
        const opacityMap = {
            'jarak_pengamat_awal': 'Jarak Pengamat Awal',
            'jarak_pengamat_akhir': 'Jarak Pengamat Akhir',
            'arah_pengamat_awal': 'Arah Pengamat Awal',
            'arah_pengamat_akhir': 'Arah Pengamat Akhir',
            'warna_emisi_awal': 'Warna Emisi Awal',
            'warna_emisi_akhir': 'Warna Emisi Akhir',
            'latar_asap_awal': 'Latar Belakang Awal',
            'latar_asap_akhir': 'Latar Belakang Akhir',
            'kondisi_langit_awal': 'Kondisi Langit Awal',
            'kondisi_langit_akhir': 'Kondisi Langit Akhir',
            'temp_ambien_awal': 'Temp Ambien Awal',
            'temp_ambien_akhir': 'Temp Ambien Akhir',
            'kelembaban_awal': 'Kelembaban Awal',
            'kelembaban_akhir': 'Kelembaban Akhir',
            'kec_angin_awal': 'Kec. Angin Awal',
            'kec_angin_akhir': 'Kec. Angin Akhir',
            'arah_angin_awal': 'Arah Angin Awal',
            'arah_angin_akhir': 'Arah Angin Akhir',
            'opasitas_mulai': 'Opasitas Waktu Mulai',
            'opasitas_akhir': 'Opasitas Waktu Akhir'
        };
        const missingSet = new Set();
        const hasOpacity = currentSample.parameters.some(p => p.parameter.toUpperCase().includes('OPACITY') || p.parameter.toUpperCase().includes('OPASITAS'));
        if (hasOpacity) {
            Object.keys(opacityMap).forEach(key => {
                const val = currentSample[key];
                if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                    missingSet.add(opacityMap[key]);
                }
            });

            let matrixIncomplete = false;
            if (!currentSample.opasitas_matrix) {
                matrixIncomplete = true;
            } else {
                for (let r = 0; r < 6; r++) {
                    for (let c = 0; c < 4; c++) {
                        if (currentSample.opasitas_matrix[r][c] === undefined || currentSample.opasitas_matrix[r][c] === '') {
                            matrixIncomplete = true;
                            break;
                        }
                    }
                    if (matrixIncomplete) break;
                }
            }
            if (matrixIncomplete) {
                missingSet.add('Tabel Matrix Pembacaan Opasitas');
            }
        }
        if (missingSet.size > 0) {
            missingFields.push(...missingSet);
        }
    }

    if (activeTab === 'isokinetic' && currentSample) {
        const missingSet = new Set();
        const hasIsokinetic = currentSample.parameters.some(p => {
            const name = p.parameter.toUpperCase();
            return ['VELOCITY', 'WATER VAPOR', 'ISOKINETIC', 'PARTICULATE'].some(k => name.includes(k));
        });
        if (hasIsokinetic) {
            currentSample.parameters.forEach(p => {
                const name = p.parameter.toUpperCase();
                const isTech = ['VELOCITY', 'VOLUMETRIC FLOW RATE', 'WATER VAPOR', 'NUM OF TRAVERSE POINT', 'PERCENT OF ISOKINETIC'].some(k => name.includes(k));
                const isParticulate = name.includes('PARTICULATE');

                if (isTech && (p.konsentrasi_1 === undefined || p.konsentrasi_1 === '')) {
                    missingSet.add(`Konsentrasi ${p.parameter}`);
                }
                if (isParticulate) {
                    if (!p.no_filter) {
                        missingSet.add(`No. Filter ${p.parameter}`);
                    }
                    if (p.volume_meter === undefined || p.volume_meter === '') {
                        missingSet.add(`Vol Gas Meter ${p.parameter}`);
                    }
                }
            });
        }
        if (missingSet.size > 0) {
            missingFields.push(...missingSet);
        }
    }

    let warningBannerHtml = "";
    if (missingFields.length > 0) {
        warningBannerHtml = `
            <div style="background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 12px 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.05);">
                <span style="font-size: 1.3rem;">⚠️</span>
                <div style="font-size: 0.8rem; color: #b45309; font-weight: 600; line-height: 1.4;">
                    Beberapa kolom pengisian belum lengkap pada tab ini: 
                    <span style="font-weight: 800; color: #92400e;">${missingFields.join(', ')}</span>.
                </div>
            </div>
        `;
    }

    let sampleSelectorHtml = "";
    if (samplesDataArray.length > 0) {
        sampleSelectorHtml = `
            <div class="sample-selector-bar" style="display: flex; gap: 8px; margin-bottom: 20px; align-items: center; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto;">
                <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Pilih Titik/ID Sampel:</span>
                <div style="display: flex; gap: 6px; overflow-x: auto;">
                    ${samplesDataArray.map((s, idx) => {
                        const isActive = idx === currentSampleIdx;
                        const activeStyle = isActive 
                            ? 'background: #2563eb; color: white; border-color: #2563eb; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);' 
                            : 'background: white; color: #475569; border-color: #cbd5e1;';
                        return `
                            <button type="button" class="page-btn" style="padding: 6px 14px; font-size: 0.8rem; font-weight: 700; border: 1px solid; border-radius: 8px; cursor: pointer; transition: all 0.2s; ${activeStyle}" onclick="switchSample(${idx}, ${readOnly})">
                                📍 ${s.sample_id}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const cardsHtml = samplesDataArray.map((s, idx) => {
        if (idx !== currentSampleIdx) return '';
        // --- LOGIKA AWAL (Identitas & Meteo) ---
        if (activeTab === 'identitas') {
            return `
            <div class="sampling-card-item">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0; color:#0f172a;">📍 ${s.sample_id} - ${s.description || ''}</h4>
                    <select class="inp-field" style="width:120px; font-weight:700;" ${disabledAttr} onchange="updateLocalData(${idx}, 'status', this.value)">
                        <option value="Pending" ${s.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Done" ${s.status === 'Done' ? 'selected' : ''}>Done</option>
                    </select>
                </div>
                <div class="grid-field">
                    <div><label class="input-label">Nama Cerobong</label><input type="text" class="inp-field" ${disabledAttr} value="${s.nama_cerobong || s.description || ''}" oninput="updateLocalData(${idx}, 'nama_cerobong', this.value)"></div>
                    <div><label class="input-label">Bahan Bakar</label><input type="text" class="inp-field" ${disabledAttr} value="${s.bahan_bakar || ''}" oninput="updateLocalData(${idx}, 'bahan_bakar', this.value)"></div>
                    <div><label class="input-label">Koordinat</label><input type="text" class="inp-field" ${disabledAttr} value="${s.koordinat || ''}" oninput="updateLocalData(${idx}, 'koordinat', this.value)"></div>
                    <div><label class="input-label">Tgl Sampling</label><input type="date" class="inp-field" ${disabledAttr} value="${s.tgl_sampling || ''}" oninput="updateLocalData(${idx}, 'tgl_sampling', this.value)"></div>
                </div>
                <div style="background:#f8fafc; padding:15px; border-radius:10px; margin-top:15px; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; border: 1px solid #e2e8f0;">
                    <div><label class="input-label">Ambien (°C)</label><input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.temp_ambien || ''}" oninput="updateLocalData(${idx}, 'temp_ambien', this.value)"></div>
                    <div><label class="input-label">Lembab (%)</label><input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.kelembaban || ''}" oninput="updateLocalData(${idx}, 'kelembaban', this.value)"></div>
                    <div><label class="input-label">Kec. Angin (m/s)</label><input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.kec_angin || ''}" oninput="updateLocalData(${idx}, 'kec_angin', this.value)"></div>
                    <div><label class="input-label">Cuaca</label><input type="text" class="inp-field" ${disabledAttr} placeholder="Cerah" value="${s.catatan_cuaca || ''}" oninput="updateLocalData(${idx}, 'catatan_cuaca', this.value)"></div>
                </div>
            </div>`;
        }

       if (activeTab === 'gas') {
            // 1. Urutan tampilan
            const insituOrder = [
                { key: /Nitrogen Monoxide|\bNO\b/i, label: 'NO' },
                { key: /Nitrogen Dioxide|\bNO2\b/i, label: 'NO2' },
                { key: /Nitrogen Oxide|\bNOx\b/i, label: 'NOX' },
                { key: /Sulfur Dioxide|\bSO2\b/i, label: 'SO2' },
                { key: /Carbon Monoxide|\bCO\b/i, label: 'CO' },
                { key: /Oxygen|Oksigen|\bO2\b/i, label: 'O2' },
                { key: /Carbon Dioxide|\bCO2\b/i, label: 'CO2' },
                { key: /Velocity/i, label: 'VELOCITY' }
            ];

            // 2. Sinkronisasi data awal (Hard Sync NOx) - Versi Super Safe
            const findPSafe = (targetKey) => {
                return s.parameters.find(p => {
                    // Normalisasi: Hapus semua spasi dan ubah ke lowercase
                    const cleanName = p.parameter.replace(/\s+/g, '').toLowerCase();
                    const cleanTarget = targetKey.replace(/\s+/g, '').toLowerCase();
                    return cleanName.includes(cleanTarget);
                });
            };

            const noObj = findPSafe("(NO)"); 
            const no2Obj = findPSafe("(NO2)");
            const noxObj = findPSafe("(NOx)");

            // Jika objek ditemukan, jalankan kalkulasi
            if (noxObj && noObj && no2Obj) {
                ['konsentrasi_1', 'konsentrasi_2', 'konsentrasi_3'].forEach(k => {
                    const valNO = parseFloat(noObj[k]);
                    const valNO2 = parseFloat(no2Obj[k]);
                    
                    // Cek jika salah satu memiliki nilai (bukan string kosong atau undefined)
                    if (!isNaN(valNO) || !isNaN(valNO2)) {
                        const total = (valNO || 0) + (valNO2 || 0);
                        noxObj[k] = total.toFixed(2);
                    }
                });
            }

            // 3. Sorting & Filter Duplikasi
            let sortedInsitu = [];
            let seenParams = new Set();
            insituOrder.forEach(item => {
                const found = s.parameters.find(p => item.key.test(p.parameter) && !seenParams.has(p.parameter));
                if (found) {
                    sortedInsitu.push(found);
                    seenParams.add(found.parameter);
                }
            });

            // 4. Mapping Baris ke HTML
            const gasRowsHtml = sortedInsitu.map(p => {
                const actualPIdx = s.parameters.findIndex(op => op.parameter === p.parameter);
                const currentP = s.parameters[actualPIdx];
                const paramName = currentP.parameter;
                const isNox = paramName === "Nitrogen Oxide (NOx)";

                const getAvgVal = (obj) => {
                    if (!obj) return 0;
                    const r1 = parseFloat(obj.konsentrasi_1) || 0;
                    const r2 = parseFloat(obj.konsentrasi_2) || 0;
                    const r3 = parseFloat(obj.konsentrasi_3) || 0;
                    return (r1 + r2 + r3) / 3;
                };

                const currentAvg = getAvgVal(currentP);
                let displayHtml = "";

                if (paramName.includes("Oxygen") || paramName.includes("CO2")) {
                    displayHtml = `<span style="font-size:0.75rem; color:#166534; font-weight:800; background:#f0fdf4; padding:3px 10px; border-radius:6px; border:1px solid #bbf7d0;">Average: ${currentAvg.toFixed(2)} %</span>`;
                } else if (paramName.toUpperCase().includes("VELOCITY")) {
                    displayHtml = `<span style="font-size:0.75rem; color:#334155; font-weight:800; background:#f8fafc; padding:3px 10px; border-radius:6px; border:1px solid #e2e8f0;">Average: ${currentAvg.toFixed(2)} m/s</span>`;
                } else if (isNox) {
                    const mgNO = parseFloat(calculateGasMg("Nitrogen Monoxide (NO)", getAvgVal(noObj))) || 0;
                    const mgNO2 = parseFloat(calculateGasMg("Nitrogen Dioxide (NO2)", getAvgVal(no2Obj))) || 0;
                    displayHtml = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.7rem; color:#64748b;">Total Avg: ${currentAvg.toFixed(2)} ppm</span>
                            <span style="font-size:0.75rem; background:#fff1f2; color:#be123c; padding:3px 10px; border-radius:6px; font-weight:900; border:1.5px solid #fecdd3;">${(mgNO + mgNO2).toFixed(2)} mg/Nm³</span>
                        </div>`;
                } else {
                    const mgValue = calculateGasMg(paramName, currentAvg) || 0;
                    displayHtml = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.7rem; color:#64748b;">Avg: ${currentAvg.toFixed(2)} ppm</span>
                            <span style="font-size:0.75rem; background:#eff6ff; color:#1e40af; padding:3px 10px; border-radius:6px; font-weight:900; border:1px solid #dbeafe;">${parseFloat(mgValue).toFixed(2)} mg/Nm³</span>
                        </div>`;
                }

                return `
                <div style="border-bottom:1px solid #f1f5f9; padding:12px 0;">
                    <div style="display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr; gap:12px; align-items:center; padding:0 10px;">
                        <div style="font-size:0.8rem; font-weight:700; color:#1e293b;">${paramName}</div>
                        <input type="number" step="0.01" class="inp-field" ${disabledAttr} id="inp-${idx}-${actualPIdx}-konsentrasi_1" value="${currentP.konsentrasi_1 || ''}" ${isNox ? 'readonly style="background:#f1f5f9;"' : ''} onchange="updateParamFieldWithLogic(${idx}, ${actualPIdx}, 'konsentrasi_1', this.value)">
                        <input type="number" step="0.01" class="inp-field" ${disabledAttr} id="inp-${idx}-${actualPIdx}-konsentrasi_2" value="${currentP.konsentrasi_2 || ''}" ${isNox ? 'readonly style="background:#f1f5f9;"' : ''} onchange="updateParamFieldWithLogic(${idx}, ${actualPIdx}, 'konsentrasi_2', this.value)">
                        <input type="number" step="0.01" class="inp-field" ${disabledAttr} id="inp-${idx}-${actualPIdx}-konsentrasi_3" value="${currentP.konsentrasi_3 || ''}" ${isNox ? 'readonly style="background:#f1f5f9;"' : ''} onchange="updateParamFieldWithLogic(${idx}, ${actualPIdx}, 'konsentrasi_3', this.value)">
                    </div>
                    <div id="display-container-${idx}-${actualPIdx}" style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 15px;">
                        ${displayHtml}
                    </div>
                </div>`;
            }).join('');

            // --- RETURN TEMPLATE UTAMA UNTUK TAB GAS ---
            return `
                <div class="sampling-card-item">
                    <div style="background:#1e40af; color:white; padding:10px 15px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; font-size:0.9rem;">📍 ID: ${s.sample_id}</span>
                        <span style="font-size:0.75rem; opacity:0.9;">${s.nama_cerobong || ''}</span>
                    </div>
                    <div style="background:#f0fdf4; padding:12px; border-radius:0 0 8px 8px; margin-bottom:15px; border: 1px solid #bbf7d0; border-top:none; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:#166534; font-size:0.8rem;">📟 GAS ANALYZER</span>
                        <div style="display:flex; gap:8px;">
                            <input type="time" class="inp-field" ${disabledAttr} style="width:100px; height:30px;" value="${s.waktu_gas || ''}" oninput="updateLocalData(${idx}, 'waktu_gas', this.value)">
                            <input type="text" class="inp-field" ${disabledAttr} style="width:100px; height:30px;" placeholder="No. Alat" value="${s.no_alat_gas || ''}" oninput="updateLocalData(${idx}, 'no_alat_gas', this.value)">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr; gap:10px; margin-bottom:10px; padding:0 10px;">
                        <span class="input-label">Parameter</span><span class="input-label">R1</span><span class="input-label">R2</span><span class="input-label">R3</span>
                    </div>
                    ${gasRowsHtml}
                    <div style="margin-top:15px; padding:10px; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                            <div>
                                <label style="font-size:0.65rem; font-weight:800; color:#475569; display:block; margin-bottom:5px;">SUHU GAS (°C)</label>
                                <input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.temp_gas || ''}" oninput="updateLocalData(${idx}, 'temp_gas', this.value)">
                            </div>
                            <div>
                                <label style="font-size:0.65rem; font-weight:800; color:#475569; display:block; margin-bottom:5px;">TEKANAN ATM (mmHg)</label>
                                <input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.tekanan_atm || ''}" oninput="updateLocalData(${idx}, 'tekanan_atm', this.value)">
                            </div>
                        </div>
                    </div>
                </div>`;
        } 

        // --- TAB 3: OPASITAS (Kondisi Lingkungan Awal/Akhir + Matrix Pembacaan) ---
        if (activeTab === 'opacity') {
            // Inisialisasi matrix jika data baru
            if (!s.opasitas_matrix) s.opasitas_matrix = Array(6).fill().map(() => Array(4).fill(''));
            
            return `
            <div class="sampling-card-item">
                <div style="background:#059669; color:white; padding:10px 15px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; font-size:0.9rem;">👁️ OPASITAS: ${s.sample_id}</span>
                    <span style="font-size:0.75rem; opacity:0.9;">${s.nama_cerobong || ''}</span>
                </div>

                <div style="padding:15px; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 8px 8px; background: white;">
                    
                    <div style="background:#f0fdf4; padding:12px; border-radius:8px; border:1px solid #bbf7d0; margin-bottom:20px;">
                        <table style="width:100%; border-collapse: collapse; font-size:0.75rem;">
                            <thead>
                                <tr style="color:#065f46; text-align:left;">
                                    <th style="padding-bottom:8px; width:40%;">Parameter</th>
                                    <th style="padding-bottom:8px;">Awal</th>
                                    <th style="padding-bottom:8px;">Akhir</th>
                                </tr>
                            </thead>
                            <tbody class="opasitas-input-grid">
                                <tr>
                                    <td>Jarak Pengamat (m)</td>
                                    <td><input type="number" class="inp-field" ${disabledAttr} value="${s.jarak_pengamat_awal || ''}" oninput="updateLocalData(${idx}, 'jarak_pengamat_awal', this.value)"></td>
                                    <td><input type="number" class="inp-field" ${disabledAttr} value="${s.jarak_pengamat_akhir || ''}" oninput="updateLocalData(${idx}, 'jarak_pengamat_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Arah Pengamat</td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.arah_pengamat_awal || ''}" oninput="updateLocalData(${idx}, 'arah_pengamat_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.arah_pengamat_akhir || ''}" oninput="updateLocalData(${idx}, 'arah_pengamat_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Warna Emisi</td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.warna_emisi_awal || ''}" oninput="updateLocalData(${idx}, 'warna_emisi_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.warna_emisi_akhir || ''}" oninput="updateLocalData(${idx}, 'warna_emisi_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Latar Belakang</td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.latar_asap_awal || ''}" oninput="updateLocalData(${idx}, 'latar_asap_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.latar_asap_akhir || ''}" oninput="updateLocalData(${idx}, 'latar_asap_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Kondisi Langit</td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.kondisi_langit_awal || ''}" oninput="updateLocalData(${idx}, 'kondisi_langit_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.kondisi_langit_akhir || ''}" oninput="updateLocalData(${idx}, 'kondisi_langit_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Temp Ambien (°C)</td>
                                    <td><input type="number" class="inp-field" ${disabledAttr} value="${s.temp_ambien_awal || ''}" oninput="updateLocalData(${idx}, 'temp_ambien_awal', this.value)"></td>
                                    <td><input type="number" class="inp-field" ${disabledAttr} value="${s.temp_ambien_akhir || ''}" oninput="updateLocalData(${idx}, 'temp_ambien_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Kelembaban (%)</td>
                                    <td><input type="number" class="inp-field" ${disabledAttr} value="${s.kelembaban_awal || ''}" oninput="updateLocalData(${idx}, 'kelembaban_awal', this.value)"></td>
                                    <td><input type="number" class="inp-field" ${disabledAttr} value="${s.kelembaban_akhir || ''}" oninput="updateLocalData(${idx}, 'kelembaban_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Kec. Angin (m/s)</td>
                                    <td><input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.kec_angin_awal || ''}" oninput="updateLocalData(${idx}, 'kec_angin_awal', this.value)"></td>
                                    <td><input type="number" step="0.1" class="inp-field" ${disabledAttr} value="${s.kec_angin_akhir || ''}" oninput="updateLocalData(${idx}, 'kec_angin_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Arah Angin</td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.arah_angin_awal || ''}" oninput="updateLocalData(${idx}, 'arah_angin_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" ${disabledAttr} value="${s.arah_angin_akhir || ''}" oninput="updateLocalData(${idx}, 'arah_angin_akhir', this.value)"></td>
                                </tr>
                            </tbody>
                        </table>
                        <div style="margin-top:10px;">
                            <label class="input-label">Deskripsi Emisi</label>
                            <textarea class="inp-field" style="height:40px;" ${disabledAttr} placeholder="Deskripsi tambahan..." oninput="updateLocalData(${idx}, 'desc_emisi', this.value)">${s.desc_emisi || ''}</textarea>
                        </div>
                    </div>

                    <h4 style="color:#065f46; font-size:0.8rem; margin-bottom:10px; display:flex; align-items:center; gap:5px;">
                        📊 HASIL PEMBACAAN (DETIK)
                        <div style="display:flex; gap:5px; margin-left:auto;">
                            <input type="time" class="inp-field" ${disabledAttr} style="width:90px; height:25px; font-size:0.7rem;" value="${s.opasitas_mulai || ''}" oninput="updateLocalData(${idx}, 'opasitas_mulai', this.value)">
                            <span style="font-size:0.7rem; color:#64748b;">s/d</span>
                            <input type="time" class="inp-field" ${disabledAttr} style="width:90px; height:25px; font-size:0.7rem;" value="${s.opasitas_akhir || ''}" oninput="updateLocalData(${idx}, 'opasitas_akhir', this.value)">
                        </div>
                    </h4>

                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse: collapse; text-align: center; font-size:0.75rem; background:white;">
                            <thead>
                                <tr style="background:#059669; color:white;">
                                    <th rowspan="2" style="padding:5px; border:1px solid #047857; width:40px;">Mnt</th>
                                    <th colspan="4" style="padding:5px; border:1px solid #047857;">Detik</th>
                                    <th rowspan="2" style="padding:5px; border:1px solid #047857;">Keterangan</th>
                                </tr>
                                <tr style="background:#10b981; color:white;">
                                    <th style="border:1px solid #047857; width:50px;">0</th>
                                    <th style="border:1px solid #047857; width:50px;">15</th>
                                    <th style="border:1px solid #047857; width:50px;">30</th>
                                    <th style="border:1px solid #047857; width:50px;">45</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${[1,2,3,4,5,6].map((m, mIdx) => `
                                    <tr>
                                        <td style="background:#f1f5f9; font-weight:bold; border:1px solid #cbd5e1;">${m}</td>
                                        ${[0,1,2,3].map(dIdx => `
                                            <td style="border:1px solid #cbd5e1; padding:0;">
                                                <input type="number" class="inp-table" style="text-align:center;" ${disabledAttr} 
                                                    value="${s.opasitas_matrix[mIdx][dIdx] || ''}" 
                                                    oninput="updateOpasitasMatrix(${idx}, ${mIdx}, ${dIdx}, this.value)">
                                            </td>
                                        `).join('')}
                                        <td style="border:1px solid #cbd5e1; padding:0;">
                                            <input type="text" class="inp-table" placeholder="..." ${disabledAttr} 
                                                value="${s['opasitas_ket_'+m] || ''}" 
                                                oninput="updateLocalData(${idx}, 'opasitas_ket_${m}', this.value)">
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top:15px; padding:12px; background:#ecfdf5; border-radius:8px; border:1px solid #a7f3d0; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; color:#065f46; font-size:0.75rem;">RATA-RATA OPASITAS:</span>
                        <span id="avg-opasitas-${idx}" style="font-size:1.2rem; font-weight:900; color:#059669;">
                            ${s.opasitas_avg || '0'} %
                        </span>
                    </div>
                </div>
            </div>`;
        }

        // --- TAB 4: ISOKINETIK & INLAB ---
        if (activeTab === 'isokinetic') {
            const techOrder = [
                { key: 'VELOCITY', unit: 'm/s' },
                { key: 'VOLUMETRIC FLOW RATE', unit: 'm³/s' },
                { key: 'WATER VAPOR', unit: '%' },
                { key: 'NUM OF TRAVERSE POINT', unit: '-' },
                { key: 'PERCENT OF ISOKINETIC', unit: '%' }
            ];

            let sortedTechParams = [];
            techOrder.forEach(ref => {
                const found = s.parameters.find(p => p.parameter.toUpperCase().includes(ref.key));
                if (found) sortedTechParams.push({ ...found, displayUnit: ref.unit });
            });

            const inlabParams = s.parameters.filter(p => p.parameter.toUpperCase().includes('PARTICULATE'));

            return `
                <div class="sampling-card-item">
                    <div class="card-header-id">
                        <span style="font-weight: 800; font-size: 0.9rem;">🏗️ ID: ${s.sample_id}</span>
                        <span style="font-size: 0.75rem; opacity: 0.9; font-weight: 600;">${s.nama_cerobong || ''}</span>
                    </div>

                    <div class="card-body-sampling">
                        <div class="section-panel panel-insitu">
                            <p class="section-title">📋 Parameter Teknis (Insitu)</p>
                            
                            ${sortedTechParams.map(p => {
                                const pIdx = s.parameters.findIndex(op => op.parameter === p.parameter);
                                // Gunakan fungsi validasi warna yang kita buat sebelumnya
                                const isIso = p.parameter.toUpperCase().includes('PERCENT OF ISOKINETIC');
                                const valIso = parseFloat(p.konsentrasi_1);
                                let isoStyle = "";
                                if (isIso && !isNaN(valIso)) {
                                    const isOk = valIso >= 90 && valIso <= 110;
                                    isoStyle = `border: 2px solid ${isOk ? '#22c55e' : '#ef4444'}; background: ${isOk ? '#f0fdf4' : '#fef2f2'}; font-weight: 800;`;
                                }

                                return `
                                <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px; margin-bottom: 12px; align-items: center;">
                                    <span style="font-size: 0.75rem; font-weight: 700; color: #475569;">${p.parameter} (${p.displayUnit})</span>
                                    <input type="number" step="0.0001" class="inp-field" ${disabledAttr} 
                                        style="${isoStyle}"
                                        value="${p.konsentrasi_1 || ''}" 
                                        oninput="updateParamFieldWithCalc(${idx}, ${pIdx}, 'konsentrasi_1', this.value, '${p.parameter}')">
                                </div>`;
                            }).join('')}
                        </div>

                        <div class="section-panel panel-inlab">
                            <p class="section-title" style="color: #475569;">🧪 Persiapan Lab (Inlab)</p>
                            
                            ${inlabParams.map(p => {
                                const pIdx = s.parameters.findIndex(op => op.parameter === p.parameter);
                                const currentFilterVal = p.no_filter || s.sample_id;
                                
                                return `
                                <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
                                    <span style="font-size: 0.75rem; font-weight: 800; color: #1e293b; display: block; margin-bottom: 8px;">${p.parameter}</span>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div>
                                            <label class="input-label">No. Filter</label>
                                            <input type="text" class="inp-field" ${disabledAttr} style="background: #fff; font-weight: 600;" 
                                                value="${currentFilterVal}" 
                                                oninput="updateParamField(${idx}, ${pIdx}, 'no_filter', this.value)">
                                        </div>
                                        <div>
                                            <label class="input-label">Vol Gas Meter (m³)</label>
                                            <input type="number" step="0.0001" class="inp-field" ${disabledAttr} 
                                                value="${p.volume_meter || ''}" 
                                                oninput="updateParamField(${idx}, ${pIdx}, 'volume_meter', this.value)">
                                        </div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>`;
            }
    }).join('');
    container.innerHTML = warningBannerHtml + sampleSelectorHtml + cardsHtml;
}

function updateParamFieldWithCalc(sampleIdx, paramIdx, key, val, paramName) {
    const s = samplesDataArray[sampleIdx];
    const p = s.parameters[paramIdx];
    
    // Simpan nilai dasar
    p[key] = val;

    // Logika Validasi Isokinetik
    if (paramName.toUpperCase().includes('PERCENT OF ISOKINETIC')) {
        const value = parseFloat(val);
        const inputEl = document.querySelector(`[oninput*="${paramIdx}"][oninput*="PERCENT OF ISOKINETIC"]`);
        
        if (inputEl) {
            if (isNaN(value) || val === '') {
                inputEl.style.border = "1px solid #e2e8f0";
                inputEl.style.background = "white";
            } else if (value >= 90 && value <= 110) {
                // Masuk rentang SNI
                inputEl.style.border = "2px solid #22c55e";
                inputEl.style.background = "#f0fdf4";
                inputEl.style.color = "#166534";
            } else {
                // Di luar rentang (Non-Comply)
                inputEl.style.border = "2px solid #ef4444";
                inputEl.style.background = "#fef2f2";
                inputEl.style.color = "#991b1b";
            }
        }
    }
    
    // Sinkronisasi otomatis ke Tab Gas jika Velocity diubah di sini
    if (paramName.toUpperCase().includes('VELOCITY')) {
        const gasVelocityIdx = s.parameters.findIndex(item => 
            item.parameter.toUpperCase().includes('VELOCITY')
        );
        if (gasVelocityIdx !== -1) {
            s.parameters[gasVelocityIdx][key] = val;
        }
    }
    triggerTabCompletenessUpdate();
}

const PARAM_CONFIG = {
    insitu: [
        'NITROGEN DIOXIDE', 'VOLUMETRIC FLOW RATE', 'NUM OF TRAVERSE POINT', 
        'PERCENT OF ISOKINETIC', 'OPACITY', 'SULFUR DIOXIDE', 'OXYGEN', 
        'NITROGEN MONOXIDE', 'NITROGEN OXIDE', 'CARBON MONOXIDE', 
        'CARBON DIOXIDE', 'VELOCITY', 'NO2', 'SO2', 'O2', 'NO', 'NOX', 'CO', 'CO2'
    ],
    inlab: ['PARTICULATE', 'PARTIKULAT']
};

function getParamCategory(paramName) {
    const name = paramName.toUpperCase();
    if (PARAM_CONFIG.insitu.some(k => name.includes(k))) return 'insitu';
    if (PARAM_CONFIG.inlab.some(k => name.includes(k))) return 'inlab';
    return 'inlab'; // Default ke inlab untuk parameter kimia lainnya
}


function triggerTabCompletenessUpdate() {
    const isReadOnly = document.getElementById('btnSaveSampling')?.style.display === 'none';
    renderTabNavigation(isReadOnly);
}

function updateOpasitasMatrix(idx, menitIdx, detikIdx, val) {
    if (!samplesDataArray[idx].opasitas_matrix) {
        samplesDataArray[idx].opasitas_matrix = Array(6).fill().map(() => Array(4).fill(''));
    }
    samplesDataArray[idx].opasitas_matrix[menitIdx][detikIdx] = val;
    calculateOpasitasAverage(idx);
    triggerTabCompletenessUpdate();
}

// 5. Helper Functions
function syncGasFields(sampleIdx, key, val) {
    const gasList = ['NO', 'NO2', 'NOX', 'SO2', 'CO', 'O2', 'CO2', 'CH4', 'TEKANAN ATMOSFIR', 'SUHU GAS', 'VELOCITY'];
    samplesDataArray[sampleIdx].parameters.forEach((p, pIdx) => {
        if (gasList.includes(p.parameter.toUpperCase())) {
            updateParamField(sampleIdx, pIdx, key, val);
        }
    });
}

function updateParamField(sampleIdx, paramIdx, key, val) {
    if (!samplesDataArray[sampleIdx].parameters[paramIdx]) samplesDataArray[sampleIdx].parameters[paramIdx] = {};
    samplesDataArray[sampleIdx].parameters[paramIdx][key] = val;
    triggerTabCompletenessUpdate();
}

function updateLocalData(idx, key, val) {
    samplesDataArray[idx][key] = val;
    triggerTabCompletenessUpdate();
}

async function saveAllSamplingData() {
    const btn = document.getElementById('btnSaveSampling');
    btn.disabled = true;
    btn.innerText = "⏳ MENYIMPAN...";

    const allDone = samplesDataArray.length > 0 && samplesDataArray.every(s => s.status === 'Done');
    const globalStatus = allDone ? 'Selesai' : 'In Progress';

    const { error } = await _supabase.from('coc_emisi').update({ 
        samples_data: samplesDataArray,
        status_sampling: globalStatus,
        updated_at: new Date().toISOString()
    }).eq('id', currentCocId);

    if (error) {
        alert("Gagal Simpan: " + error.message);
    } else {
        alert("Data sampling berhasil diperbarui!");
        closeSamplingModal();
        fetchSamplingData();
    }
    btn.disabled = false;
    btn.innerText = "💾 Simpan Data Sampling";
}

function closeSamplingModal() {
    document.getElementById('modalSamplingInput').style.display = 'none';
    const tabs = document.querySelector('.modal-tabs');
    if(tabs) tabs.remove(); 
    currentCocId = null;
    samplesDataArray = [];
    activeTab = 'identitas';
}

function calculateOpasitasAverage(idx) {
    const matrix = samplesDataArray[idx].opasitas_matrix;
    if (!matrix) return 0;

    let total = 0;
    let count = 0;

    // Iterasi setiap baris (menit) dan kolom (detik)
    matrix.forEach(row => {
        row.forEach(val => {
            if (val !== '' && val !== null) {
                total += parseFloat(val);
                count++;
            }
        });
    });

    const avg = count > 0 ? (total / count).toFixed(2) : 0;
    
    // Simpan hasil rata-rata ke dalam objek data lokal
    samplesDataArray[idx].opasitas_avg = avg;
    
    // Update tampilan angka rata-rata di UI
    const avgDisplay = document.getElementById(`avg-opasitas-${idx}`);
    if (avgDisplay) {
        avgDisplay.innerText = avg + " %";
    }
    
    return avg;
}

function calculateGasMg(parameter, avgPpm) {
    if (avgPpm === null || avgPpm === undefined || isNaN(avgPpm)) return null;
    
    const p = parameter.trim().toUpperCase();

    // 1. Filter Ketat: Parameter yang TIDAK memiliki satuan mg/Nm3
    // Menggunakan regex agar tidak salah deteksi (contoh: menghindari Nitrogen di Nitrogen Monoxide)
    if (/^(OXYGEN|O2|CO2|CARBON DIOXIDE|VELOCITY|TEMP|TEMPERATURE)$/.test(p)) {
        return null;
    }

    // 2. Mapping BM (Bobot Molekul)
    // Ditambahkan NOX (sebagai NO2) sesuai standar KLHK/SNI jika diperlukan konversi langsung
    const bmMap = {
        'NITROGEN MONOXIDE': 30.01,
        'NO': 30.01,
        'NITROGEN DIOXIDE': 46.01,
        'NO2': 46.01,
        'SULFUR DIOXIDE': 64.06,
        'SO2': 64.06,
        'CARBON MONOXIDE': 28.01,
        'CO': 28.01,
    };

    let bm = 0;
    // Cari kecocokan kunci (Exact Match atau Includes)
    for (let key in bmMap) {
        if (p === key || p.includes(key) || p.includes(key.replace(' ', ''))) {
            bm = bmMap[key];
            break;
        }
    }

    if (bm === 0) return null;

    // 3. Rumus Konversi: (PPM * BM) / 24.45
    const mgNm3 = (parseFloat(avgPpm) * bm) / 24.45;
    
    return mgNm3.toFixed(2);
}
function updateParamFieldWithLogic(sampleIdx, paramIdx, key, val) {
    const s = samplesDataArray[sampleIdx];
    const p = s.parameters[paramIdx];
    
    // Simpan nilai input ke memori
    p[key] = val;

    const pName = p.parameter; 
    
    // Jika yang diedit mengandung "(NO)" atau "(NO2)" (bukan NOx)
    if ((pName.includes("(NO)") || pName.includes("(NO2)")) && !pName.includes("(NOx)")) {
        
        const noObj = getParamByKey(s.parameters, "(NO)");
        const no2Obj = getParamByKey(s.parameters, "(NO2)");
        
        // Cari index NOx untuk update UI
        const noxIdx = s.parameters.findIndex(item => 
            item.parameter.replace(/\s+/g, '').toLowerCase().includes("(nox)")
        );

        if (noxIdx !== -1 && noObj && no2Obj) {
            const noxObj = s.parameters[noxIdx];
            
            ['konsentrasi_1', 'konsentrasi_2', 'konsentrasi_3'].forEach(k => {
                const v1 = parseFloat(noObj[k]) || 0;
                const v2 = parseFloat(no2Obj[k]) || 0;
                const total = (v1 + v2).toFixed(2);
                
                // Update data di memori
                noxObj[k] = total; 

                // Update tampilan input input NOx di layar agar langsung berubah
                const noxInput = document.getElementById(`inp-${sampleIdx}-${noxIdx}-${k}`);
                if (noxInput) noxInput.value = total;
            });

            // Update label hasil (mg/Nm3) untuk baris NOx
            updateSingleDisplay(sampleIdx, noxIdx);
        }
    }

    // Update label hasil (mg/Nm3) untuk baris yang sedang diketik
    updateSingleDisplay(sampleIdx, paramIdx);
    triggerTabCompletenessUpdate();
}
function updateSingleDisplay(sampleIdx, paramIdx) {
    const s = samplesDataArray[sampleIdx];
    const p = s.parameters[paramIdx];
    const container = document.getElementById(`display-container-${sampleIdx}-${paramIdx}`);
    if (!container) return;

    const getAvg = (obj) => {
        if (!obj) return 0;
        const r1 = parseFloat(obj.konsentrasi_1) || 0;
        const r2 = parseFloat(obj.konsentrasi_2) || 0;
        const r3 = parseFloat(obj.konsentrasi_3) || 0;
        return (r1 + r2 + r3) / 3;
    };

    const currentAvg = getAvg(p);
    const pName = p.parameter;
    let html = "";

    if (pName.includes("Oxygen") || pName.includes("Carbon Dioxide")) {
        html = `<span style="font-size:0.75rem; color:#166534; font-weight:800; background:#f0fdf4; padding:3px 10px; border-radius:6px; border:1px solid #bbf7d0;">Average: ${currentAvg.toFixed(2)} %</span>`;
    } 
    else if (pName.toUpperCase().includes("VELOCITY")) {
        html = `<span style="font-size:0.75rem; color:#334155; font-weight:800; background:#f8fafc; padding:3px 10px; border-radius:6px; border:1px solid #e2e8f0;">Average: ${currentAvg.toFixed(2)} m/s</span>`;
    } 
    else {
        let finalMg = 0;
        let labelText = `Avg: ${currentAvg.toFixed(2)} ppm`;

        if (pName.includes("NOx") || pName.includes("Nitrogen Oxide")) {
            // Gunakan Regex agar lebih aman mencari NO dan NO2
            const no = s.parameters.find(i => /Nitrogen Monoxide|\bNO\b/i.test(i.parameter));
            const no2 = s.parameters.find(i => /Nitrogen Dioxide|\bNO2\b/i.test(i.parameter));
            
            const avgNO = getAvg(no);
            const avgNO2 = getAvg(no2);
            
            // Hitung mg/Nm3 masing-masing
            const mgNO = parseFloat(calculateGasMg("Nitrogen Monoxide (NO)", avgNO)) || 0;
            const mgNO2 = parseFloat(calculateGasMg("Nitrogen Dioxide (NO2)", avgNO2)) || 0;
            
            finalMg = mgNO + mgNO2;
            labelText = `Total Avg: ${(avgNO + avgNO2).toFixed(2)} ppm`;
        } else {
            finalMg = parseFloat(calculateGasMg(pName, currentAvg)) || 0;
        }

        const isNox = pName.includes("NOx");
        html = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.7rem; color:#64748b;">${labelText}</span>
                <span style="font-size:0.75rem; background:${isNox ? '#fff1f2' : '#eff6ff'}; color:${isNox ? '#be123c' : '#1e40af'}; padding:3px 10px; border-radius:6px; font-weight:900; border:1px solid ${isNox ? '#fecdd3' : '#dbeafe'};">
                    ${finalMg.toFixed(2)} mg/Nm³
                </span>
            </div>`;
    }
    container.innerHTML = html;
}
const getParamByKey = (params, key) => {
    return params.find(p => {
        const cleanName = p.parameter.replace(/\s+/g, '').toLowerCase();
        const cleanKey = key.replace(/\s+/g, '').toLowerCase();
        return cleanName.includes(cleanKey);
    });
};

async function verifikasiSampling(id, nomorCoc) {
    if (!confirm(`Apakah Anda yakin ingin memverifikasi data sampling untuk COC ${nomorCoc}? Data ini akan dikunci dan tidak bisa diedit.`)) return;

    try {
        const { error } = await _supabase
            .from('coc_emisi')
            .update({ 
                status_sampling: 'Verified',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'VERIFY_SAMPLING',
                table_name: 'coc_emisi',
                description: `Memverifikasi data sampling untuk COC ${nomorCoc}`,
                old_data: { status_sampling: 'Selesai' },
                new_data: { status_sampling: 'Verified' }
            }]);
        }

        alert("Data sampling berhasil diverifikasi!");
        fetchSamplingData();
    } catch (err) {
        alert("Gagal memverifikasi: " + err.message);
    }
}

async function unverifikasiSampling(id, nomorCoc) {
    if (!confirm(`Apakah Anda yakin ingin membatalkan verifikasi data sampling untuk COC ${nomorCoc}? Status akan kembali menjadi 'Selesai' dan data dapat diedit kembali.`)) return;

    try {
        const { error } = await _supabase
            .from('coc_emisi')
            .update({ 
                status_sampling: 'Selesai',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'UNVERIFY_SAMPLING',
                table_name: 'coc_emisi',
                description: `Membatalkan verifikasi data sampling untuk COC ${nomorCoc}`,
                old_data: { status_sampling: 'Verified' },
                new_data: { status_sampling: 'Selesai' }
            }]);
        }

        alert("Verifikasi data sampling berhasil dibatalkan!");
        fetchSamplingData();
    } catch (err) {
        alert("Gagal membatalkan verifikasi: " + err.message);
    }
}

window.verifikasiSampling = verifikasiSampling;
window.unverifikasiSampling = unverifikasiSampling;
window.openSamplingModal = openSamplingModal;
window.switchSample = function(idx, readOnly = false) {
    currentSampleIdx = idx;
    renderSamplingForm(readOnly);
};