let userRole = null;
let currentFilterTab = 'belum_verif';
let currentPage = 1;
const pageSize = 10;
let filteredSamplesList = [];
let rawCoAListData = [];

window.addEventListener('auth-ready', async (e) => {
    const { session, role } = e.detail;
    const user = session.user;
    userRole = role;
    console.log("Role terkonfirmasi di COA:", userRole);

    // 2. Isi Profil User
    const userDisplay = document.getElementById('userFullName');
    if (userDisplay) {
        userDisplay.innerText = user.user_metadata?.full_name || user.email;
    }
    await fetchMasterEmisi();

    // 3. Ambil ID Dokumen dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (!docId) {
        // Jika tidak ada ID di URL, tampilkan daftar semua CoA yang tersedia
        renderCoAList(); 
        return;
    }

    // 4. Ambil data spesifik dari Supabase (Jika docId ada)
    try {
        const { data: coc, error } = await _supabase
            .from('coc_emisi')
            .select('*, samples(*)')
            .eq('id', docId)
            .single();

        if (error) throw error;
        if (!coc) throw new Error("Data sertifikat tidak ditemukan.");

        renderCoA(coc);
        
    } catch (err) {
        console.error("Error loading CoA:", err);
        document.getElementById('coaRenderArea').innerHTML = `
            <div style="text-align:center; padding:50px; color:red;">
                <h3>Gagal Memuat Data</h3>
                <p>${err.message}</p>
            </div>`;
    }
});

// TAMBAHKAN FUNGSI INI DI BAWAH (di luar DOMContentLoaded)
// 1. Tambahkan fungsi helper ini di luar/di bawah renderCoAList
function exportToExcel(data) {
    // Format data agar rapi di Excel
    const excelData = data.map(item => ({
        "No. Quotation": item.qt_no || '-',
        "Nama Perusahaan": item.company_name,
        "Tanggal Update": new Date(item.updated_at).toLocaleDateString('id-ID'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Sertifikat");

    // Download file
    XLSX.writeFile(workbook, `Rekap_CoA_ESLab_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 2. Fungsi renderCoAList yang sudah ditambahkan tombol Export, Search, Tabs, dan Paginasi
async function renderCoAList() {
    const area = document.getElementById('coaRenderArea');
    
    area.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h2 style="color: var(--primary); font-weight: 800; letter-spacing: -0.02em; margin: 0;">Daftar Sertifikat (CoA)</h2>
                <input type="text" id="searchCoA" placeholder="Cari No. Quotation atau Perusahaan..." style="padding: 10px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; width: 300px;">
            </div>

            <!-- Tab Filter Status CoA -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button id="tabBelumVerif" class="tab-btn ${currentFilterTab === 'belum_verif' ? 'active' : ''}" onclick="switchCoATab('belum_verif')">⏳ Belum Verifikasi</button>
                <button id="tabSudahVerif" class="tab-btn ${currentFilterTab === 'sudah_verif' ? 'active' : ''}" onclick="switchCoATab('sudah_verif')">✅ Sudah Verifikasi</button>
            </div>

            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                        <tr>
                            <th style="padding: 15px; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 800;">No. Quotation</th>
                            <th style="padding: 15px; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 800;">Nama Perusahaan</th>
                            <th style="padding: 15px; text-align: center; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 800; width: 300px;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="coaTableBody">
                        <tr>
                            <td colspan="3" style="text-align: center; padding: 40px; color: #64748b;">
                                Memuat data...
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Panel Paginasi -->
                <div id="paginationControls" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-top: 1px solid #f1f5f9; font-size: 0.85rem; flex-wrap: wrap; gap: 10px;">
                    <div id="paginationInfo" style="color: #64748b; font-weight: 600;">
                        Menampilkan 0 - 0 dari 0 data
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <button id="btnPrevPage" class="page-btn">Sebelumnya</button>
                        <div id="pageNumbers" style="display: flex; gap: 5px;"></div>
                        <button id="btnNextPage" class="page-btn">Berikutnya</button>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                <button onclick="exportCoAList()" class="btn-print" style="font-size: 0.8rem; padding: 10px 20px;">📊 Export Rekap Excel</button>
            </div>
        </div>
    `;

    // Bind search event listener
    const searchBox = document.getElementById('searchCoA');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            fetchCoAList(e.target.value.toLowerCase());
        });
    }

    // Bind pagination listeners
    const btnPrevPage = document.getElementById('btnPrevPage');
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCoATableRows();
                renderCoAPaginationControls();
            }
        });
    }

    const btnNextPage = document.getElementById('btnNextPage');
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredSamplesList.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderCoATableRows();
                renderCoAPaginationControls();
            }
        });
    }

    // Ambil data pertama kali
    await fetchCoAList();
}

async function fetchCoAList(keyword = '') {
    try {
        const { data, error } = await _supabase
            .from('coc_emisi')
            .select('id, company_name, qt_no, updated_at, status_sampling, samples(*)')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        rawCoAListData = data;

        // Filter locally by tab and keyword
        let filtered = rawCoAListData.filter(item => {
            const status = item.status_sampling ? item.status_sampling.trim().toLowerCase() : 'pending';
            const isVerified = status === 'verified';
            const isSelesai = status === 'selesai';

            // Cek apakah semua sampel sudah diverifikasi oleh lab
            const samples = item.samples || [];
            
            const allLabVerified = samples.length > 0 && samples.every(s => s.status_lab && s.status_lab.toLowerCase() === 'verified');

            if (currentFilterTab === 'belum_verif') {
                return isSelesai && allLabVerified;
            } else {
                return isVerified;
            }
        });

        // Filter locally by search keyword
        if (keyword) {
            filtered = filtered.filter(item => 
                (item.qt_no && item.qt_no.toLowerCase().includes(keyword)) ||
                (item.company_name && item.company_name.toLowerCase().includes(keyword))
            );
        }

        filteredSamplesList = filtered;
        currentPage = 1;

        renderCoATableRows();
        renderCoAPaginationControls();
    } catch (err) {
        console.error("Error fetching CoA list:", err);
        const tbody = document.getElementById('coaTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red; padding:30px;">Gagal memuat data: ${err.message}</td></tr>`;
        }
    }
}

function renderCoATableRows() {
    const tbody = document.getElementById('coaTableBody');
    if (!tbody) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredSamplesList.length);
    const paginated = filteredSamplesList.slice(startIndex, endIndex);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#64748b;">Tidak ada data sertifikat (CoA).</td></tr>`;
        return;
    }

    const canVerify = ['manager', 'admin_master'].includes(userRole);

    tbody.innerHTML = paginated.map(item => {
        const isVerified = (item.status_sampling || '').trim().toLowerCase() === 'verified';

        // Hitung titik belum diverifikasi
        const samples = item.samples || [];
        const totalCount = samples.length;
        const verifiedCount = samples.filter(s => s.status_lab && s.status_lab.toLowerCase() === 'verified').length;
        const unverifiedCount = totalCount - verifiedCount;

        let verifyBtnHtml = '';
        if (canVerify) {
            if (isVerified) {
                verifyBtnHtml = `
                    <button onclick="unverifikasiCoASampling('${item.id}', '${item.qt_no}')" 
                            style="background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; margin-right: 6px;">
                        🔓 Batal Verif
                    </button>
                `;
            } else {
                verifyBtnHtml = `
                    <button onclick="verifikasiCoASampling('${item.id}', '${item.qt_no}')" 
                            style="background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; margin-right: 6px; box-shadow: 0 2px 4px rgba(34,197,94,0.2);">
                        ✅ Verifikasi
                    </button>
                `;
            }
        }

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 15px; font-family: monospace;">${item.qt_no || '-'}</td>
                <td style="padding: 15px;">
                    <div style="font-weight: 600; color: var(--text-main);">${item.company_name}</div>
                    ${unverifiedCount > 0 
                        ? `<div style="color: #ea580c; font-size: 0.75rem; margin-top: 4px; font-weight: 700;">⚠️ ${unverifiedCount} titik belum diverifikasi</div>` 
                        : `<div style="color: #16a34a; font-size: 0.75rem; margin-top: 4px; font-weight: 700;">✅ Semua titik terverifikasi</div>`
                    }
                </td>
                <td style="padding: 15px; text-align: center; white-space: nowrap;">
                    <div style="display: flex; align-items: center; justify-content: center;">
                        ${verifyBtnHtml}
                        <a href="coa.html?id=${item.id}" style="background: var(--primary); color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 700;">
                            Buka CoA 📄
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderCoAPaginationControls() {
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
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToCoAPage(${i})">
                ${i}
            </button>
        `;
    }

    pageNumbersContainer.innerHTML = pagesHtml;
}

window.switchCoATab = function(tabName) {
    currentFilterTab = tabName;
    currentPage = 1;
    
    const tabBelum = document.getElementById('tabBelumVerif');
    const tabSudah = document.getElementById('tabSudahVerif');
    if (tabBelum && tabSudah) {
        tabBelum.classList.toggle('active', tabName === 'belum_verif');
        tabSudah.classList.toggle('active', tabName === 'sudah_verif');
    }
    
    fetchCoAList(document.getElementById('searchCoA')?.value || '');
};

window.goToCoAPage = function(pageNumber) {
    const totalPages = Math.ceil(filteredSamplesList.length / pageSize) || 1;
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderCoATableRows();
        renderCoAPaginationControls();
    }
};

window.exportCoAList = function() {
    exportToExcel(filteredSamplesList);
};

async function verifikasiCoASampling(id, nomorCoc) {
    const item = rawCoAListData.find(d => d.id === id);
    const samples = item ? item.samples || [] : [];
    const totalCount = samples.length;
    const verifiedCount = samples.filter(s => s.status_lab && s.status_lab.toLowerCase() === 'verified').length;
    const unverifiedCount = totalCount - verifiedCount;

    let confirmMsg = `Apakah Anda yakin ingin memverifikasi sertifikat untuk quotation ${nomorCoc}? Status sampling akan diubah menjadi Verified.`;
    if (unverifiedCount > 0) {
        confirmMsg = `⚠️ PERHATIAN: Terdapat ${unverifiedCount} dari ${totalCount} titik yang BELUM diverifikasi di log analisa.\n\nApakah Anda yakin ingin tetap memverifikasi sertifikat untuk quotation ${nomorCoc}?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
        const { error } = await _supabase
            .from('coc_emisi')
            .update({ 
                status_sampling: 'Verified',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'VERIFY_COA',
                table_name: 'coc_emisi',
                description: `Memverifikasi sertifikat (CoA) untuk quotation ${nomorCoc}`,
                new_data: { status_sampling: 'Verified' }
            }]);
        }

        alert("Data sertifikat berhasil diverifikasi!");
        fetchCoAList(document.getElementById('searchCoA')?.value || '');
    } catch (err) {
        alert("Gagal memverifikasi: " + err.message);
    }
}

async function unverifikasiCoASampling(id, nomorCoc) {
    if (!confirm(`Apakah Anda yakin ingin membatalkan verifikasi sertifikat untuk quotation ${nomorCoc}? Status akan kembali menjadi Selesai.`)) return;

    try {
        const { error } = await _supabase
            .from('coc_emisi')
            .update({ 
                status_sampling: 'Selesai',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'UNVERIFY_COA',
                table_name: 'coc_emisi',
                description: `Membatalkan verifikasi sertifikat (CoA) untuk quotation ${nomorCoc}`,
                new_data: { status_sampling: 'Selesai' }
            }]);
        }

        alert("Verifikasi data sertifikat berhasil dibatalkan!");
        fetchCoAList(document.getElementById('searchCoA')?.value || '');
    } catch (err) {
        alert("Gagal membatalkan verifikasi: " + err.message);
    }
}

// Bind window functions
window.verifikasiCoASampling = verifikasiCoASampling;
window.unverifikasiCoASampling = unverifikasiCoASampling;

const COA_PARAMETER_ORDER = {
    // 1. Nitrogen Dioxide (NO2)
    "nitrogen dioxide (no2)": 1,
    "nitrogen dioxide": 1,
    "no2": 1,
    "nitrogen oxide (no2)": 1,
    "nitrogen dioksida (no2)": 1, 

    // 2. Nitrogen Monoxide (NO)
    "nitrogen monoxide (no)": 2,
    "nitrogen monoxide": 2,
    "no": 2,
    "nitrogen monoksida (no)": 2,

    // 3. Nitrogen Oxide (NOx)
    "nitrogen oxide (nox)": 3,
    "nitrogen oxide": 3,
    "nox": 3,
    "oksida-oksida nitrogen (nox)": 3,

    // 4. Opacity
    "opacity": 4,
    "opasitas": 4,

    // 5. Particulate
    "particulate": 5,
    "partikulat": 5,

    // 6. Sulfur Dioxide (SO2)
    "sulfur dioxide (so2)": 6,
    "sulfur dioksida (so2)": 6,
    "so2": 6,
    "sulfur dioxide": 6,
    "sulfur dioksida": 6,

    // 7. Carbon Monoxide (CO)
    "carbon monoxide (co)": 7,
    "karbon monoksida (co)": 7,
    "co": 7,
    "carbon monoxide": 7,
    "karbon monoksida": 7,

    // 8. Oksigen (O2)
    "oksigen (o2)": 8,
    "o2": 8,
    "oxygen (o2)": 8,
    "oxygen": 8,
    "oksigen": 8,

    // 9. Carbon Dioxide (CO2)
    "carbon dioxide (co2)": 9,
    "co2": 9,
    "carbon dioxide": 9,

    // 10. Metana (CH4)
    "metana (ch4)": 10,
    "ch4": 10,
    "methane (ch4)": 10,
    "metana": 10,
    "methane": 10,

    // 11. Velocity
    "velocity": 11,
    "laju alir": 11,

    // 12. Volumetric Flow Rate
    "volumetric flow rate": 12,
    "volumetric flow rate (gas volumetric flow rate)": 12,

    // 13. Water Vapor in flue gas
    "water vapor in flue gas": 13,
    "water vapor": 13,

    // 14. Num of Traverse Point
    "num of traverse point": 14,

    // 15. Percent of Isokinetic
    "percent of isokinetic": 15,
    "percent of isokinetik": 15
};

function sortParametersForCoa(parameters) {
    const getOrder = (paramName) => {
        if (!paramName) return 99;
        let clean = paramName.toLowerCase().trim();
        // Ganti spasi non-breaking (\xa0) dan spasi berulang dengan spasi standar
        clean = clean.replace(/[\s\xa0]+/g, ' ');
        // Buang tanda bintang di akhir jika ada
        if (clean.endsWith('*')) clean = clean.slice(0, -1).trim();
        
        // 1. Pencocokan langsung (exact match)
        if (COA_PARAMETER_ORDER[clean] !== undefined) {
            return COA_PARAMETER_ORDER[clean];
        }
        
        // 2. Pencocokan sebagian (substring) dengan memprioritaskan kunci terpanjang
        const keys = Object.keys(COA_PARAMETER_ORDER).sort((a, b) => b.length - a.length);
        for (const key of keys) {
            if (clean.includes(key) || key.includes(clean)) {
                return COA_PARAMETER_ORDER[key];
            }
        }
        
        return 99;
    };

    return [...parameters].sort((a, b) => {
        return getOrder(a.parameter) - getOrder(b.parameter);
    });
}

function formatDateEnglish(dateInput) {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function renderCoA(data) {
    const area = document.getElementById('coaRenderArea');
    
    // QR Code Verification Link & URL
    const verificationLink = window.location.origin + window.location.pathname.replace('coa.html', 'verify.html') + '?id=' + encodeURIComponent(data.id);
    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(verificationLink);

    // Parsing data sampel
    const samples = data.samples || [];

    const verifiedSamples = samples.filter(s => 
        s.status_lab && typeof s.status_lab === 'string' && s.status_lab.toLowerCase() === 'verified'
    );

    const totalCount = samples.length;
    const verifiedCount = verifiedSamples.length;
    const unverifiedCount = totalCount - verifiedCount;

    let warningBanner = '';
    if (unverifiedCount > 0) {
        warningBanner = `
            <div class="no-print" style="max-width: 210mm; margin: 10px auto; background: #fff7ed; border: 1.5px solid #ffedd5; padding: 16px; border-radius: 12px; color: #c2410c; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <span>⚠️ Catatan: Terdapat <strong>${unverifiedCount} titik</strong> yang belum diverifikasi di log analisa dan tidak dicetak pada CoA ini. (Hanya ${verifiedCount} dari ${totalCount} titik yang tercetak).</span>
            </div>
        `;
    }

    // Format dates for Customer Job Refference
    let samplingDates = [];
    let acceptanceDates = [];
    let analysisDates = [];

    verifiedSamples.forEach(s => {
        if (s.tgl_sampling) samplingDates.push(new Date(s.tgl_sampling));
        if (s.tgl_terima_lab) acceptanceDates.push(new Date(s.tgl_terima_lab));
        if (s.analyzed_at) analysisDates.push(new Date(s.analyzed_at));
    });

    if (samplingDates.length === 0 && data.sampling_date) {
        samplingDates.push(new Date(data.sampling_date));
    }

    function formatRange(dates) {
        if (dates.length === 0) return '-';
        const validDates = dates.filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
        if (validDates.length === 0) return '-';
        
        const minDate = validDates[0];
        const maxDate = validDates[validDates.length - 1];

        const minStr = formatDateEnglish(minDate);
        const maxStr = formatDateEnglish(maxDate);

        if (minStr === maxStr) return minStr;
        return `${minStr} - ${maxStr}`;
    }

    const displayDateOfSampling = formatRange(samplingDates);
    const displayDateOfAcceptance = formatRange(acceptanceDates);

    // Date of Analysis: dari min tanggal analisis (atau tgl_terima_lab) sampai max tanggal analisis (atau tanggal cetak/hari ini)
    let displayDateOfAnalysis = '-';
    const validAcceptance = acceptanceDates.filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
    const validAnalysis = analysisDates.filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
    const reportDateStr = formatDateEnglish(new Date());

    if (validAnalysis.length > 0) {
        const startAnalysis = validAnalysis[0];
        const endAnalysis = validAnalysis[validAnalysis.length - 1];
        
        const startStr = formatDateEnglish(startAnalysis);
        const endStr = formatDateEnglish(endAnalysis);

        if (startStr === endStr) {
            displayDateOfAnalysis = startStr;
        } else {
            displayDateOfAnalysis = `${startStr} until ${endStr}`;
        }
    } else if (validAcceptance.length > 0) {
        const startAnalysis = new Date(validAcceptance[0]);
        startAnalysis.setDate(startAnalysis.getDate() + 1); // default ke keesokan harinya
        displayDateOfAnalysis = `${formatDateEnglish(startAnalysis)} until ${reportDateStr}`;
    } else {
        displayDateOfAnalysis = reportDateStr;
    }

    // 1. Render Cover Page (Halaman 1)
    let htmlContent = warningBanner + `
        <div class="coa-page coa-cover" style="position: relative; display: flex; flex-direction: column; box-sizing: border-box;">
            <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px;">
                <h1 style="margin:0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em;">CERTIFICATE OF ANALYSIS</h1>
                <p style="margin:3px 0 0 0; font-size: 0.85rem;">Certificate Number: ES.${data.qt_no?.split('/')[0] || '0000'}.${new Date().getFullYear()}${data.id.substring(0,4)}</p>
            </div>
            
            <div style="margin-top: 10px; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                <h3 style="text-decoration: underline; margin-bottom: 4px; font-size: 1rem; font-weight: 700; color: #000;">Owners Identity</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <tr style="vertical-align: top;">
                        <td style="width: 160px; padding: 2px 0; font-weight: 600;">Name of Company</td>
                        <td style="width: 15px; padding: 2px 0;">:</td>
                        <td style="padding: 2px 0;">${data.company_name}</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Address</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 2px 0;">${data.company_address || '-'}</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Customer Contact</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 2px 0;">${data.contact_person || '-'}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-top: 12px; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                <h3 style="text-decoration: underline; margin-bottom: 4px; font-size: 1rem; font-weight: 700; color: #000;">Customer Job Refference</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <tr style="vertical-align: top;">
                        <td style="width: 160px; padding: 2px 0; font-weight: 600;">Subject test</td>
                        <td style="width: 15px; padding: 2px 0;">:</td>
                        <td style="padding: 3px 0;">${verifiedSamples.length} Air Emissions Stationary Source</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Sampled By</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 2px 0;">PT Envirotama Solusindo, Cikarang</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Date of Sampling</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 3px 0;">${displayDateOfSampling}</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Lab Facilities</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 3px 0;">PT Envirotama Solusindo, Cikarang</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Date of Acceptance</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 3px 0;">${displayDateOfAcceptance}</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Date of Analysis</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 3px 0;">${displayDateOfAnalysis}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-top: 12px; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 15px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <tr style="vertical-align: top;">
                        <td style="width: 160px; padding: 2px 0; font-weight: 600;">Number of Pages</td>
                        <td style="width: 15px; padding: 2px 0;">:</td>
                        <td style="padding: 2px 0;">${verifiedSamples.length + 1} pages (Including this cover)</td>
                    </tr>
                    <tr style="vertical-align: top;">
                        <td style="padding: 2px 0; font-weight: 600;">Additional Notes</td>
                        <td style="padding: 2px 0;">:</td>
                        <td style="padding: 2px 0;">-</td>
                    </tr>
                </table>
            </div>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
                <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
                    <img src="${qrCodeUrl}" alt="QR Code Verification" style="width: 75px; height: 75px; border: 1px solid #cbd5e1; padding: 2px; background: white;" />
                    <div style="font-size: 0.7rem; color: #475569;">
                        <p style="font-weight: bold; color: #0f172a; margin-bottom: 2px;">Scan to Verify</p>
                        <p style="margin: 0; line-height: 1.2;">Verify authenticity of this<br>certificate at ESLab online.</p>
                    </div>
                </div>
                <div style="text-align: right; padding-right: 20px;">
                    <p style="font-size: 0.85rem;">Cikarang, ${reportDateStr}</p>
                    <p style="font-size: 0.85rem;">Approved by,</p><br><br>
                    <p style="font-size: 0.85rem;"><strong>Fadhel Verdino</strong></p>
                </div>
            </div>
        </div>
    `;

    // 2. Render Data Pages (Halaman 2 dst)
    verifiedSamples.forEach((sample, index) => {
        const isAllowedToToggle = ['admin_master', 'manager', 'admin_ts'].includes(userRole);
        const showHeader = isAllowedToToggle ? `<th class="no-print" style="width: 40px; text-align: center;">Tampilkan</th>` : '';

        const o2Param = sample.parameters.find(sp => {
            const spName = (sp.parameter || '').toLowerCase().trim();
            return spName === 'o2' || spName === 'oksigen' || spName === 'oksigen (o2)' || spName === 'oxygen';
        });
        let o2Measured = null;
        if (o2Param) {
            const rawO2Val = o2Param.result || o2Param.konsentrasi_1 || '0';
            o2Measured = parseFloat(rawO2Val);
            if (isNaN(o2Measured)) o2Measured = null;
        }

        htmlContent += `
        <div class="coa-page" style="padding: 20px; margin-top: 20px;">
            <div style="text-align:center; border-bottom: 1.5px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
                <h2 style="margin:0; font-size: 1.4rem;">CERTIFICATE OF ANALYSIS</h2>
            </div>

            <div class="coa-info-grid">
                <div>
                    <table>
                        <tr><td>Customer Name</td><td>: <strong>${data.company_name}</strong></td></tr>
                        <tr><td>Subject Test</td><td>: Air Emissions Stationary Source</td></tr>
                        <tr><td>Customer Sample ID</td><td>: ${sample.description || '-'}</td></tr>
                        <tr><td>Lab Number</td><td>: ${sample.sample_id}</td></tr>
                    </table>
                </div>
                <div>
                    <table>
                        <tr><td>Sampling Methods</td><td>: Isokinetic</td></tr>
                        <tr><td>Sampling Date</td><td>: ${sample.tgl_sampling || data.sampling_date}</td></tr>
                        <tr><td>Sampling Time</td><td>: ${sample.opasitas_mulai || '-'}</td></tr>
                    </table>
                </div>
            </div>

            <table class="coa-table-v2">
                <thead style="background: #f0f0f0;">
                    <tr>
                        ${showHeader}
                        <th>No.</th>
                        <th>Testing Parameter</th>
                        <th>Sample Result</th>
                        <th>Regulatory Limit**</th>
                        <th>Unit#</th>
                        <th>Methods</th>
                    </tr>
                </thead>
                <tbody>

                   ${sortParametersForCoa(sample.parameters).map((p, i) => {
                    const pName = p.parameter ? p.parameter.replace(/\s+/g, ' ').trim().toLowerCase() : '';
                    
                    // Deteksi Gas Polutan
                    const isGasPolutan = (
                        pName.includes('sulfur') || pName.includes('so2') || 
                        pName.includes('nitrogen') || pName.includes('nox') || 
                        pName.includes('no2') || pName.includes(' no') || // spasi sebelum NO untuk membedakan dengan 'NO' di 'NITROGEN'
                        pName.includes('carbon mon') || pName.includes(' co')
                    ) && !pName.includes('co2');

                    let valToFormat;

                    if (isGasPolutan) {
                        // Ambil ppm mentah dari data Anda (seperti konsentrasi_1: "0")
                        const rawPpm = (p.konsentrasi_1 !== undefined && p.konsentrasi_1 !== null) ? p.konsentrasi_1 : '0';
                        valToFormat = getConversionMgm3(p.parameter, rawPpm);
                    } else if (pName.includes('opacity') || pName.includes('opasitas')) {
                        valToFormat = sample.opasitas_avg || '0';
                    } else {
                        valToFormat = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
                    }

                    // Eksekusi LOQ: Merubah angka 0 menjadi < LOQ
                    let finalDisplayResult = formatResultWithLOQ(p.parameter, valToFormat);

                    // --- OKSIGEN CORRECTION LOGIC ---
                    const currentReg = sample.regulations?.[0] || '-';
                    const refO2 = getO2Reference(p.parameter, currentReg);
                    
                    if (refO2 !== null && o2Measured !== null && o2Measured > 0 && o2Measured < 21) {
                        const rawNum = parseFloat(valToFormat) || 0;
                        if (rawNum > 0) {
                            const factor = (21 - refO2) / (21 - o2Measured);
                            const correctedVal = rawNum * factor;
                            const formattedCorrected = formatResultWithLOQ(p.parameter, correctedVal.toFixed(2));
                            const formattedRaw = formatResultWithLOQ(p.parameter, rawNum.toFixed(2));
                            
                            finalDisplayResult = `${formattedCorrected}<br><span style="font-size: 0.65rem; color: #64748b; font-weight: normal; display: block; margin-top: 2px;">(Terukur: ${formattedRaw}, Koreksi ${refO2}% O₂)</span>`;
                        }
                    }

                    // 3. Tentukan Satuan (DISPLAY UNIT)
                    let displayUnit = '-';
                    if (pName.includes('velocity')) displayUnit = 'm/s';
                    else if (pName.includes('volumetric flow')) displayUnit = 'm³/s';
                    else if (isGasPolutan || pName.includes('particulate')) displayUnit = 'mg/Nm³';
                    else if (pName.includes('co2') || pName.includes('o2') || pName.includes('opacity') || pName.includes('isokinetic') || pName.includes('water vapor')) displayUnit = '%';
                    else displayUnit = p.unit || '-';

                    // 4. Regulasi & Limit
                    const autoLimit = getRegulatoryLimit(p.parameter, currentReg);

                    const isChecked = p.show_in_coa !== false;
                    if (!isAllowedToToggle && !isChecked) {
                        return ''; // Sembunyikan baris jika tidak dicentang dan bukan role berwenang
                    }

                    const uncheckedClass = isChecked ? '' : 'unchecked-param-row';
                    const showCheckboxCell = isAllowedToToggle ? `
                        <td class="no-print" style="text-align:center; border: 1px solid #000;">
                            <input type="checkbox" 
                                   class="param-visibility-chk" 
                                   data-sample-id="${sample.sample_id}" 
                                   data-param-name="${p.parameter}" 
                                   ${isChecked ? 'checked' : ''} 
                                   style="width: 16px; height: 16px; cursor: pointer;">
                        </td>
                    ` : '';

                    return `
                        <tr class="${uncheckedClass}">
                            ${showCheckboxCell}
                            <td class="serial-col" style="text-align:center; border: 1px solid #000;"></td>
                            <td style="padding: 6px 8px; border: 1px solid #000; white-space: nowrap;">${p.parameter}${p.is_accredited ? '' : '*'}</td>
                            <td style="text-align:center; font-weight:bold; border: 1px solid #000;">${finalDisplayResult}</td>
                            <td style="text-align:center; border: 1px solid #000;">${autoLimit}</td>
                            <td style="text-align:center; border: 1px solid #000;">${displayUnit}</td>
                            <td style="font-size: 0.7rem; padding: 5px; border: 1px solid #000;">${p.method || '-'}</td>
                        </tr>
                    `;
                }).join('')}
                </tbody>
            </table>

            <div style="margin-top: 20px; font-size: 0.7rem;">
                <p>Note: ** Keputusan Menteri Negara Lingkungan Hidup Nomor 13 Tahun 1995 (Lampiran VB)</p>
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
                <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
                    <img src="${qrCodeUrl}" alt="QR Code Verification" style="width: 70px; height: 70px; border: 1px solid #cbd5e1; padding: 2px; background: white;" />
                    <div style="font-size: 0.65rem; color: #475569;">
                        <p style="font-weight: bold; color: #0f172a; margin-bottom: 1px;">Scan to Verify</p>
                        <p style="margin: 0; line-height: 1.2;">Original certificate available online.</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 0.85rem;">Cikarang, ${new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</p>
                    <p style="font-size: 0.85rem;">Approved by,</p><br><br>
                    <p style="font-size: 0.85rem;"><strong>Fadhel Verdino</strong><br>Environment Lab Manager</p>
                </div>
            </div>
        </div>
        `;
    });

    area.innerHTML = htmlContent;

    // Pasang listener tombol Export Excel (logika tetap sama)
    const btnExport = document.getElementById('btnExportSingleExcel');
    if (btnExport) {
        btnExport.addEventListener('click', () => exportSingleCoA(data, verifiedSamples));
    }
}
function exportSingleCoA(docInfo, verifiedSamples) {
    const excelRows = [];

    verifiedSamples.forEach(sample => {
        const regulation = sample?.regulation_name ?? docInfo?.regulation ?? '';

        // --- PROSES PENGURUTAN (SORTING) ---
        const sortedParameters = sortParametersForCoa(sample.parameters);

        const o2Param = sample.parameters.find(sp => {
            const spName = (sp.parameter || '').toLowerCase().trim();
            return spName === 'o2' || spName === 'oksigen' || spName === 'oksigen (o2)' || spName === 'oxygen';
        });
        let o2Measured = null;
        if (o2Param) {
            const rawO2Val = o2Param.result || o2Param.konsentrasi_1 || '0';
            o2Measured = parseFloat(rawO2Val);
            if (isNaN(o2Measured)) o2Measured = null;
        }

        // Gunakan hasil sort (sortedParameters) untuk diproses ke baris Excel, saring yang disembunyikan
        const visibleParams = sortedParameters.filter(p => p.show_in_coa !== false);
        
        visibleParams.forEach((p, idx) => {
            const pOriginal = p.parameter || '';
            const pName = pOriginal.replaceAll(/\s+/g, ' ').trim().toLowerCase();
            
            // 1. Identifikasi Kelompok Parameter
            const isOpacity = pName.includes('opacity') || pName.includes('opasitas');
            const isGasPolutan = (pName.includes('sulfur') || pName.includes('so2') || 
                                  pName.includes('nitrogen') || pName.includes('nox') || 
                                  pName.includes('no') || pName.includes('carbon mon') || 
                                  pName.includes('co')) && !pName.includes('co2');

            let processedValue = '0';
            
            // 2. Logika Pengambilan & Konversi Nilai
            try {
                if (isGasPolutan) {
                    const rawVal = p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
                    const converted = getConversionMgm3(pOriginal, rawVal);
                    processedValue = converted ?? rawVal;
                } else if (isOpacity) {
                    processedValue = sample.opasitas_avg || p.result || p.konsentrasi_1 || '0';
                } else {
                    processedValue = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
                }
            } catch (err) {
                console.error(`Gagal memproses parameter ${pOriginal}:`, err);
                processedValue = p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
            }

            // 3. Format LOQ & Baku Mutu
            let finalDisplayResult = formatResultWithLOQ(pOriginal, processedValue);

            // --- OKSIGEN CORRECTION LOGIC ---
            const refO2 = getO2Reference(pOriginal, regulation);
            if (refO2 !== null && o2Measured !== null && o2Measured > 0 && o2Measured < 21) {
                const rawNum = parseFloat(processedValue) || 0;
                if (rawNum > 0) {
                    const factor = (21 - refO2) / (21 - o2Measured);
                    const correctedVal = rawNum * factor;
                    const formattedCorrected = formatResultWithLOQ(pOriginal, correctedVal.toFixed(2));
                    const formattedRaw = formatResultWithLOQ(pOriginal, rawNum.toFixed(2));
                    
                    finalDisplayResult = `${formattedCorrected} (Terukur: ${formattedRaw}, Koreksi ${refO2}% O2)`;
                }
            }

            const limit = getRegulatoryLimit(pOriginal, regulation);

            // 4. Penentuan Satuan
            let displayUnit;
            if (pName.includes('velocity')) displayUnit = 'm/s';
            else if (pName.includes('volumetric flow')) displayUnit = 'm³/s';
            else if (isGasPolutan || pName.includes('particulate')) displayUnit = 'mg/Nm³';
            else if (pName.includes('co2') || pName.includes('o2') || isOpacity || pName.includes('water vapor')) displayUnit = '%';
            else displayUnit = p.unit || '-';

            // 5. Masukkan ke Baris Excel
            excelRows.push({
                "No.": idx + 1,
                "Testing Parameter": pOriginal,
                "Sample Result": finalDisplayResult, 
                "Regulatory Limit": limit,
                "Unit": displayUnit,
                "Methods": p.method || '-'
            });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Set page margins (SheetJS uses inches: cm / 2.54)
    worksheet['!margins'] = {
        left: 1.3 / 2.54,
        right: 1.3 / 2.54,
        top: 3.5 / 2.54,
        bottom: 4.2 / 2.54,
        header: 0 / 2.54,
        footer: 3.8 / 2.54
    };

    // Set page footer: Left = Form-ES..., Right = Page &P of &N
    worksheet['!headerFooter'] = {
        differentFirst: false,
        differentOddEven: false,
        oddHeader: "",
        oddFooter: "&LForm-ES-7.8.1; Rev.00; 3 Februari 2016&RPage &P of &N"
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Analisa");

    const cleanName = (docInfo.company_name || 'CoA').replaceAll(/[/\\?%*:|"<>]/g, '-');
    const fileName = `CoA_${cleanName}_${Date.now()}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
}
// Data master dari query INSERT Anda
// Pastikan properti menggunakan 'metode' agar konsisten dengan logika pencarian
let masterEmisi = []

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
    // Ambil regulasi pertama jika input berupa array, lalu bersihkan
    const cleanReg = (Array.isArray(regulationName) ? regulationName[0] : regulationName).trim().toLowerCase();

    const match = masterEmisi.find(m => {
        const masterParam = m.parameter ? m.parameter.toLowerCase().trim() : '';
        const masterReg = m.regulasi ? m.regulasi.toLowerCase().trim() : '';
        
        // Cocokkan parameter DAN regulasi
        return masterParam === cleanParam && masterReg === cleanReg;
    });
    
    if (match && (match.baku_mutu !== null && match.baku_mutu !== undefined)) {
        return match.baku_mutu.toString(); 
    }
    
    return '-';
}

// Tambahkan ini di bagian bawah kode atau sebelum DOMContentLoaded
async function fetchMasterEmisi() {
    try {
        const { data, error } = await _supabase
            .from('master_emisi')
            .select('parameter, metode, baku_mutu, unit, regulasi, koreksi_o2');

        if (error) throw error;
        
        // Simpan ke variabel global
        masterEmisi = data; 
        console.log("Master Emisi Loaded:", masterEmisi.length, "rows");
    } catch (err) {
        console.error("Gagal memuat Master Emisi:", err);
        masterEmisi = []; 
    }
}const LOQ_SETTINGS = {
    "so2": 2.61,
    "no2": 1.88,
    "nox": 1.88,
    "no": 1.88,
    "co": 1.143,
    "particulate": 0.05,
    "opacity": 20
};

// 1. Fungsi Konversi MG/NM3 yang Diperbaiki
// Sesuai S7773, S7748, S6645
function getConversionMgm3(parameter, ppmValue) {
    if (ppmValue === undefined || ppmValue === null || ppmValue === '') return 0;
    
    // S7773: Pakai Number.parseFloat
    let val = Number.parseFloat(ppmValue);
    if (Number.isNaN(val)) val = 0; // S7773: Pakai Number.isNaN

    const p = parameter.toUpperCase();
    let bm = 0;

    if (p.includes('SO2')) bm = 64.06;
    else if (p.includes('NO2')) bm = 46.01;
    else if (p.includes('NOX')) bm = 46.01;
    else if (p.includes('CO') && !p.includes('CO2')) bm = 28; // S7748: Jangan pakai 28.0
    else if (p.includes('NO')) bm = 30.01;

    return bm > 0 ? (val * bm) / 24.45 : val;
}

function formatResultWithLOQ(paramName, value) {
    if (value == null || value === '-') return '-'; // S6582: Contoh simplifikasi optional/null
    
    const pName = paramName.toLowerCase().trim();
    let numValue = Number.parseFloat(value);

    let loq; // S6645: Tidak perlu inisialisasi ke undefined

    if (pName.includes('no2') || /\bno2\b/i.test(pName)) {
        loq = LOQ_SETTINGS.no2;
    } else if (/\bnox\b/i.test(pName) || (pName.includes('nitrogen oxide') && !pName.includes('monoxide') && !pName.includes('dioxide'))) {
        loq = LOQ_SETTINGS.nox;
    } else if (/\bno\b/i.test(pName) || pName.includes('nitrogen monoxide')) {
        loq = LOQ_SETTINGS.no;
    } else if (pName.includes('so2') || /\bso2\b/i.test(pName)) {
        loq = LOQ_SETTINGS.so2;
    } else if (/\bco\b/i.test(pName) || pName.includes('carbon monoxide')) {
        loq = LOQ_SETTINGS.co;
    } else if (pName.includes('partic')) {
        loq = LOQ_SETTINGS.particulate;
    } else if (pName.includes('opacit') || pName.includes('opasitas')) {
        loq = LOQ_SETTINGS.opacity;
    }
    if (loq !== undefined) {
        if (Number.isNaN(numValue) || numValue < loq) {
            return `< ${loq}`;
        }
    }
    return Number.isNaN(numValue) ? value : numValue.toFixed(2);
}

// Fungsi global untuk mengubah visibilitas parameter di COA dan menyimpannya ke database Supabase
async function toggleParamVisibility(sampleId, paramName, isChecked) {
    const isAllowed = ['admin_master', 'manager', 'admin_ts'].includes(userRole);
    if (!isAllowed) {
        alert("Akses ditolak: Anda tidak memiliki wewenang untuk mengubah visibilitas parameter COA.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    if (!docId) return;

    try {
        const { data: s, error: fetchError } = await _supabase
            .from('samples')
            .select('*')
            .eq('coc_id', docId)
            .eq('sample_id', sampleId)
            .single();

        if (fetchError) throw fetchError;

        let parameters = s.parameters || [];
        let updated = false;

        for (let p of parameters) {
            if (p.parameter === paramName) {
                p.show_in_coa = isChecked;
                updated = true;
                break;
            }
        }

        if (!updated) {
            console.warn("Parameter tidak ditemukan untuk diupdate:", sampleId, paramName);
            return;
        }

        const { error: updateError } = await _supabase
            .from('samples')
            .update({ 
                parameters: parameters,
                updated_at: new Date().toISOString()
            })
            .eq('coc_id', docId)
            .eq('sample_id', sampleId);

        if (updateError) throw updateError;
        console.log(`Visibilitas parameter diperbarui: ${paramName} di sampel ${sampleId} menjadi ${isChecked}`);

        // Update styling baris di layar secara lokal
        const checkboxes = document.querySelectorAll(`.param-visibility-chk[data-sample-id="${sampleId}"][data-param-name="${paramName}"]`);
        checkboxes.forEach(chk => {
            chk.checked = isChecked;
            const row = chk.closest('tr');
            if (row) {
                if (isChecked) {
                    row.classList.remove('unchecked-param-row');
                } else {
                    row.classList.add('unchecked-param-row');
                }
            }
        });

    } catch (err) {
        console.error("Gagal memperbarui visibilitas parameter:", err);
        alert("Gagal menyimpan visibilitas parameter: " + err.message);
    }
}

window.toggleParamVisibility = toggleParamVisibility;

// Pasang event listener global dengan event delegation
document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('param-visibility-chk')) {
        const sampleId = e.target.getAttribute('data-sample-id');
        const paramName = e.target.getAttribute('data-param-name');
        const isChecked = e.target.checked;
        toggleParamVisibility(sampleId, paramName, isChecked);
    }
});
