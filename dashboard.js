// dashboard.js

// 1. State Halaman Dashboard
let allSamplesList = [];
let filteredSamplesList = [];
let currentPage = 1;
const pageSize = 10;
let sortState = { col: 'default', dir: 'none' };
let statusChartInstance = null;

// 2. Elemen UI
const userNameElement = document.getElementById('userName');
const dateElement = document.getElementById('currentDate'); 
const userFullName = document.getElementById('userFullName');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const menuContainer = document.getElementById('menuContainer');
const btnLogout = document.getElementById('btnLogout');

// 3. Cek Sesi & Load Data
window.addEventListener('auth-ready', async (e) => {
    const { profile } = e.detail;

    setDashboardGreeting(profile);
    updateDateDisplay();
    await fetchActiveLogs(); 
    setupRealtimeSubscription(); 

    // Setup event listeners untuk Pencarian, Paginasi, Filter & Ekspor
    const searchLog = document.getElementById('searchLog');
    if (searchLog) {
        searchLog.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    }

    const filterStatsMonth = document.getElementById('filterStatsMonth');
    if (filterStatsMonth) {
        filterStatsMonth.addEventListener('change', () => {
            applyDashboardFilters();
        });
    }

    const filterStatsYear = document.getElementById('filterStatsYear');
    if (filterStatsYear) {
        filterStatsYear.addEventListener('change', () => {
            applyDashboardFilters();
        });
    }

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

    const btnExportDashboard = document.getElementById('btnExportDashboard');
    if (btnExportDashboard) {
        btnExportDashboard.addEventListener('click', () => {
            exportDashboardToExcel();
        });
    }

    // Filter Rentang Tanggal Dashboard (#19)
    const filterDashDateStart = document.getElementById('filterDashDateStart');
    const filterDashDateEnd   = document.getElementById('filterDashDateEnd');
    const btnResetDashDate    = document.getElementById('btnResetDashDate');
    if (filterDashDateStart) filterDashDateStart.addEventListener('change', applyDashboardFilters);
    if (filterDashDateEnd)   filterDashDateEnd.addEventListener('change', applyDashboardFilters);
    if (btnResetDashDate) {
        btnResetDashDate.addEventListener('click', () => {
            if (filterDashDateStart) filterDashDateStart.value = '';
            if (filterDashDateEnd)   filterDashDateEnd.value   = '';
            applyDashboardFilters();
        });
    }
});

// 4. Ambil data dari Supabase
async function fetchActiveLogs() {
    const logTableBody = document.getElementById('logTableBody'); 
    if (!logTableBody) {
        console.error("ID 'logTableBody' tidak ditemukan di HTML!");
        return;
    }

    try {
        console.log("Mencoba mengambil data dari Supabase...");
        const { data: samples, error } = await _supabase
            .from('samples') 
            .select('*, coc_emisi(*)')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        console.log("Data berhasil ditarik:", samples);

        if (!samples || samples.length === 0) {
            logTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Database kosong atau RLS memblokir data.</td></tr>`;
            return;
        }

        const activeSamples = [];

        samples.forEach(s => {
            const coc = s.coc_emisi || {};
            const rawTerima = s.tgl_terima_lab; 
            const rawSelesai = s.analyzed_at || s.verified_at; 

            const tatPriority = (coc.tat_requested || "NORMAL").toUpperCase();
            const isUrgent = tatPriority === 'URGENT';

            // Hitung Turnaround Time (TAT)
            let tatHari = "-";
            if (rawTerima && rawSelesai) {
                const d1 = new Date(rawTerima);
                const d2 = new Date(rawSelesai);
                const diffInMs = d2 - d1;
                const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
                tatHari = diffInDays <= 0 ? "1 Hari" : `${diffInDays} Hari`;
            }

            // Hitung status kepatuhan & keterlambatan TAT (menggunakan hari kerja)
            let actualDuration = null;
            let isDelayed = false;
            let delayDays = 0;
            const targetDays = isUrgent ? 5 : 14;

            if (rawTerima) {
                const start = new Date(rawTerima);
                const end = rawSelesai ? new Date(rawSelesai) : new Date();
                actualDuration = getWorkingDays(start, end);
                isDelayed = actualDuration > targetDays;
                delayDays = isDelayed ? (actualDuration - targetDays) : 0;
            }

            // Format Tanggal
            const tglSampling = coc.sampling_date ? new Date(coc.sampling_date).toLocaleDateString('id-ID') : '-';
            const tglTerima = rawTerima ? new Date(rawTerima).toLocaleDateString('id-ID') : '-';
            const tglSelesai = rawSelesai ? new Date(rawSelesai).toLocaleDateString('id-ID') : '-';

            // Logika Status — berdasarkan status_lab di tabel samples
            let statusLabel = "SAMPLING";
            let statusClass = "tag-orange";

            if (s.status_lab === 'verified' || s.is_verified === true) {
                // Lab sudah verifikasi → FINISH
                statusLabel = "FINISH";
                statusClass = "tag-green";
            } else if (s.status_lab === 'analyzed' || s.status_lab === 'received' || s.tgl_terima_lab) {
                // Sampel sudah diterima/dianalisa tapi belum diverifikasi → ANALISA
                statusLabel = "ANALISA";
                statusClass = "tag-blue";
            } else {
                // COC belum diverifikasi atau belum diterima lab → masih tahap SAMPLING
                statusLabel = "SAMPLING";
                statusClass = "tag-orange";
            }

            activeSamples.push({
                db_id: coc.id || null,
                nomor_coc: coc.nomor_coc || '-',
                sample_id: s.sample_id || '-',
                company_name: coc.company_name || '-',
                sampling_date: coc.sampling_date,
                tgl_terima_lab: s.tgl_terima_lab,
                tgl_selesai: s.analyzed_at || s.verified_at,
                tglSampling,
                tglTerima,
                tglSelesai,
                tatHari,
                isUrgent,
                statusLabel,
                statusClass,
                actualDuration,
                isDelayed,
                delayDays,
                targetDays
            });
        });

        allSamplesList = activeSamples;
        populateYearFilter();
        applyDashboardFilters();
        // Pastikan TAT chart dirender dengan data penuh saat pertama kali load
        updateTatAnalysis(activeSamples);

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        logTableBody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
    }
}

// 6. Update Kartu Statistik Dinamis
function updateStats(samplesList = allSamplesList) {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    const totalSamples = samplesList.length;
    const samplingCount = samplesList.filter(s => s.statusLabel === 'SAMPLING').length;
    const analisaCount = samplesList.filter(s => s.statusLabel === 'ANALISA').length;
    const finishCount = samplesList.filter(s => s.statusLabel === 'FINISH').length;

    // Hitung jumlah unik Perusahaan dan COC
    const uniqueCompanies = new Set(samplesList.map(s => s.company_name).filter(name => name && name !== '-')).size;
    const uniqueCocs = new Set(samplesList.map(s => s.nomor_coc).filter(coc => coc && coc !== '-')).size;

    statsContainer.innerHTML = `
        <div class="stat-card" style="border-left: 4px solid #64748b;" onclick="navigateFromStat('total')">
            <h4>Total Sampel</h4>
            <div class="number" style="color: #1e293b;">${totalSamples}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Terdaftar di sistem LIMS</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #f97316;" onclick="navigateFromStat('sampling')">
            <h4>Proses Sampling</h4>
            <div class="number" style="color: #ea580c;">${samplingCount}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Persiapan & Data Lapangan</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #2563eb;" onclick="navigateFromStat('analisa')">
            <h4>Proses Analisa</h4>
            <div class="number" style="color: #1d4ed8;">${analisaCount}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Tahap pengujian lab</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #16a34a;" onclick="navigateFromStat('finish')">
            <h4>Verifikasi & COA</h4>
            <div class="number" style="color: #15803d;">${finishCount}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Tervalidasi & COA terbit</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #8b5cf6;" onclick="navigateFromStat('companies')">
            <h4>Jumlah Perusahaan</h4>
            <div class="number" style="color: #6d28d9;">${uniqueCompanies}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Perusahaan terlayani</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #06b6d4;" onclick="navigateFromStat('cocs')">
            <h4>Jumlah COC</h4>
            <div class="number" style="color: #0e7490;">${uniqueCocs}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Chain of Custody terbit</p>
        </div>
    `;
}

// 7. Visualisasi Diagram Donat Chart.js
function renderStatusChart(samplesList = allSamplesList) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const samplingCount = samplesList.filter(s => s.statusLabel === 'SAMPLING').length;
    const analisaCount = samplesList.filter(s => s.statusLabel === 'ANALISA').length;
    const finishCount = samplesList.filter(s => s.statusLabel === 'FINISH').length;

    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    const hasData = (samplingCount + analisaCount + finishCount) > 0;
    const dataValues = hasData ? [samplingCount, analisaCount, finishCount] : [1, 1, 1];
    const backgroundColors = hasData ? ['#fff7ed', '#eff6ff', '#f0fdf4'] : ['#f8fafc', '#f1f5f9', '#cbd5e1'];
    const borderColors = hasData ? ['#ffedd5', '#dbeafe', '#dcfce7'] : ['#e2e8f0', '#cbd5e1', '#94a3b8'];
    const hoverColors = hasData ? ['#ffedd5', '#dbeafe', '#dcfce7'] : ['#cbd5e1', '#cbd5e1', '#94a3b8'];

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sampling', 'Analisa', 'Selesai'],
            datasets: [{
                data: dataValues,
                backgroundColor: hasData ? ['#ea580c', '#2563eb', '#16a34a'] : backgroundColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                hoverBackgroundColor: hasData ? ['#c2410c', '#1d4ed8', '#15803d'] : hoverColors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 10,
                        padding: 10,
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 9,
                            weight: '700'
                        },
                        color: '#64748b'
                    }
                },
                tooltip: {
                    enabled: hasData,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const val = context.raw || 0;
                            return ` ${label}: ${val} sampel`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// 8. Pencarian & Filter Terintegrasi
function applyDashboardFilters() {
    const monthSelect = document.getElementById('filterStatsMonth');
    const yearSelect  = document.getElementById('filterStatsYear');
    const searchLog   = document.getElementById('searchLog');

    const monthVal = monthSelect ? monthSelect.value : 'all';
    const yearVal  = yearSelect  ? yearSelect.value  : 'all';
    const keyword  = searchLog   ? searchLog.value.toLowerCase().trim() : '';

    // Filter tanggal rentang dari filterDashDate (#19)
    const dashDateStart = document.getElementById('filterDashDateStart')?.value || '';
    const dashDateEnd   = document.getElementById('filterDashDateEnd')?.value   || '';

    // Step 1: Filter berdasarkan Bulan & Tahun dari tanggal sampling
    const dateFiltered = allSamplesList.filter(s => {
        if (monthVal === 'all' && yearVal === 'all' && !dashDateStart && !dashDateEnd) return true;
        if (!s.sampling_date) return false;

        const date = new Date(s.sampling_date);
        const m = date.getMonth();
        const y = date.getFullYear();
        // Format YYYY-MM-DD dari sampling_date
        const samplingDateStr = s.sampling_date.slice(0, 10);

        if (monthVal !== 'all' && m !== parseInt(monthVal)) return false;
        if (yearVal !== 'all' && y !== parseInt(yearVal)) return false;
        if (dashDateStart && samplingDateStr < dashDateStart) return false;
        if (dashDateEnd   && samplingDateStr > dashDateEnd)   return false;

        return true;
    });

    // Step 2: Perbarui statistik dan diagram berdasarkan filter tanggal saja
    updateStats(dateFiltered);
    renderStatusChart(dateFiltered);

    // Step 3: Filter tabel berdasarkan pencarian keyword
    if (!keyword) {
        filteredSamplesList = [...dateFiltered];
    } else {
        filteredSamplesList = dateFiltered.filter(s => {
            return (s.nomor_coc && s.nomor_coc.toLowerCase().includes(keyword)) ||
                   (s.sample_id && s.sample_id.toLowerCase().includes(keyword)) ||
                   (s.company_name && s.company_name.toLowerCase().includes(keyword)) ||
                   (s.statusLabel && s.statusLabel.toLowerCase().includes(keyword));
        });
    }

    // Urutkan berdasarkan state sort saat ini
    const headers = {
        'nomor_coc': document.getElementById('hdrCoc'),
        'sample_id': document.getElementById('hdrSample'),
        'company_name': document.getElementById('hdrCompany'),
        'sampling_date': document.getElementById('hdrTglSampling'),
        'tgl_terima_lab': document.getElementById('hdrTglTerima'),
        'tgl_selesai': document.getElementById('hdrTglSelesai'),
        'tat': document.getElementById('hdrTat'),
        'status': document.getElementById('statusHeader')
    };

    Object.keys(headers).forEach(k => {
        const el = headers[k];
        if (el) {
            let label = el.innerText.replace(/[▲▼⇅]/g, '').trim();
            el.innerText = label + ' ⇅';
        }
    });

    if (sortState.col === 'default') {
        // Default sort: nomor_coc desc, sample_id asc
        filteredSamplesList.sort((a, b) => {
            const cocCompare = (b.nomor_coc || '').localeCompare(a.nomor_coc || '');
            if (cocCompare !== 0) return cocCompare;
            return (a.sample_id || '').localeCompare(b.sample_id || '');
        });
    } else {
        const activeHeader = headers[sortState.col];
        if (activeHeader) {
            let label = activeHeader.innerText.replace(/[▲▼⇅]/g, '').trim();
            activeHeader.innerText = label + (sortState.dir === 'asc' ? ' ▲' : ' ▼');
        }

        filteredSamplesList.sort((a, b) => {
            let valA = a[sortState.col];
            let valB = b[sortState.col];

            // Penanganan khusus untuk kolom tanggal dan numerik
            if (sortState.col === 'sampling_date' || sortState.col === 'tgl_terima_lab' || sortState.col === 'tgl_selesai') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else if (sortState.col === 'tat') {
                valA = parseInt(a.tatHari) || 0;
                valB = parseInt(b.tatHari) || 0;
            } else if (sortState.col === 'status') {
                valA = a.statusLabel || '';
                valB = b.statusLabel || '';
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortState.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sortState.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    currentPage = 1;
    renderTableRows();
    renderPaginationControls();
    updateTatAnalysis(filteredSamplesList);
}

function populateYearFilter() {
    const yearSelect = document.getElementById('filterStatsYear');
    if (!yearSelect) return;

    const years = new Set();
    allSamplesList.forEach(s => {
        if (s.sampling_date) {
            const y = new Date(s.sampling_date).getFullYear();
            if (!isNaN(y)) years.add(y);
        }
    });

    yearSelect.innerHTML = '<option value="all">Semua Tahun</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    });
}

function handleSearch(keyword) {
    applyDashboardFilters();
}

// 9. Render Baris Tabel Berdasarkan Halaman (Paginasi)
function renderTableRows() {
    const logTableBody = document.getElementById('logTableBody');
    if (!logTableBody) return;

    if (filteredSamplesList.length === 0) {
        logTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b; font-weight:600;">Data tidak ditemukan.</td></tr>`;
        return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredSamplesList.length);
    const paginatedItems = filteredSamplesList.slice(startIndex, endIndex);

    let tableRows = "";
    paginatedItems.forEach(s => {
        tableRows += `
            <tr onclick="navigateFromRow('${s.db_id}', '${s.statusLabel}')" style="cursor: pointer;">
                <td style="font-weight:700; color:#2563eb;">${s.nomor_coc}</td>
                <td style="font-weight:600; color:#1e293b;">${s.sample_id}</td>
                <td style="max-width:220px; overflow:hidden; text-overflow:ellipsis;" title="${s.company_name}">
                    ${s.company_name}
                </td>
                <td>${s.tglSampling}</td>
                <td>${s.tglTerima}</td>
                <td>${s.tglSelesai}</td>
                <td>
                    <div style="font-weight:800; color:#0f172a; font-size:0.85rem;">${s.tatHari}</div>
                    <div style="font-size:0.65rem; ${s.isUrgent ? 'color:#dc2626; font-weight:900;' : 'color:#94a3b8;'}">
                        ${s.isUrgent ? '⚠️ URGENT' : 'NORMAL'}
                    </div>
                </td>
                <td><span class="tag ${s.statusClass}">${s.statusLabel}</span></td>
            </tr>`;
    });

    logTableBody.innerHTML = tableRows;
}

// 10. Render Panel Kontrol Paginasi
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

// Global page jump helper function
window.goToPage = function(pageNumber) {
    const totalPages = Math.ceil(filteredSamplesList.length / pageSize) || 1;
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderTableRows();
        renderPaginationControls();
    }
}

// 11. Ekspor Data Terfilter Ke Excel (SheetJS)
function exportDashboardToExcel() {
    if (filteredSamplesList.length === 0) {
        alert("Tidak ada data yang dapat diekspor.");
        return;
    }

    try {
        const excelData = filteredSamplesList.map(s => ({
            "Nomor COC": s.nomor_coc,
            "ID Sampel": s.sample_id,
            "Nama Perusahaan": s.company_name,
            "Tanggal Sampling": s.tglSampling,
            "Tanggal Terima Lab": s.tglTerima,
            "Tanggal Analisa Selesai": s.tglSelesai,
            "Turnaround Time (TAT)": s.tatHari,
            "Prioritas": s.isUrgent ? "URGENT" : "NORMAL",
            "Status": s.statusLabel
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Log Sampel LIMS");
        
        // Auto-fit kolom
        const maxLen = {};
        excelData.forEach(row => {
            Object.keys(row).forEach(key => {
                const val = String(row[key] || '');
                maxLen[key] = Math.max(maxLen[key] || 10, val.length);
            });
        });
        worksheet['!cols'] = Object.keys(maxLen).map(key => ({ wch: maxLen[key] + 3 }));

        XLSX.writeFile(workbook, `LIMS_Dashboard_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error("Gagal ekspor Excel:", e);
        alert("Gagal melakukan ekspor data ke Excel.");
    }
}

// 12. Ambil Profil & Sapaan Pengguna
function setDashboardGreeting(profile) {
    const hours = new Date().getHours();
    let greeting = "Selamat Malam";
    if (hours >= 5 && hours < 11) greeting = "Selamat Pagi";
    else if (hours >= 11 && hours < 15) greeting = "Selamat Siang";
    else if (hours >= 15 && hours < 18) greeting = "Selamat Sore";

    const name = profile?.full_name || "Staf Lab";
    
    if (userNameElement) userNameElement.innerText = `${greeting}, ${name}`;
    if (userFullName) userFullName.innerText = name;
    if (userRoleDisplay) userRoleDisplay.innerText = profile?.role ? profile.role.replace('_', ' ') : 'User';
}

// 13. Update Tampilan Tanggal
function updateDateDisplay() {
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.innerText = new Date().toLocaleDateString('id-ID', options);
    }
}

// 14. Setup Supabase Realtime Subscription
function setupRealtimeSubscription() {
    console.log("Memulai langganan Realtime Supabase...");
    _supabase
        .channel('lims-realtime-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'samples' },
            (payload) => {
                console.log('Perubahan real-time terdeteksi pada tabel samples:', payload);
                fetchActiveLogs();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'coc_emisi' },
            (payload) => {
                console.log('Perubahan real-time terdeteksi pada tabel coc_emisi:', payload);
                fetchActiveLogs();
            }
        )
        .subscribe((status) => {
            console.log("Status langganan Realtime Supabase:", status);
        });
}

// 15. Navigasi Cerdas Berdasarkan Kartu Statistik & Akses Role
window.navigateFromStat = function(targetType) {
    const role = sessionStorage.getItem('userRole') || 'sampling';
    
    // Pemetaan izin akses halaman LIMS
    const hasAccess = {
        'sampling.html': ['admin_master', 'manager', 'sampling'].includes(role),
        'analisa.html': ['admin_master', 'manager', 'analis'].includes(role),
        'coa.html': ['admin_master', 'manager', 'admin_ts'].includes(role),
        'master-data.html': ['admin_master', 'manager', 'sampling', 'admin_ts'].includes(role),
        'coc.html': ['admin_master', 'manager', 'sampling', 'admin_ts'].includes(role),
        'penerimaan.html': ['admin_master', 'manager', 'sampling', 'admin_ts', 'analis'].includes(role)
    };

    let destination = 'coc.html'; // Default target utama

    if (targetType === 'sampling') {
        destination = hasAccess['sampling.html'] ? 'sampling.html' : 'coc.html';
    } else if (targetType === 'analisa') {
        destination = hasAccess['analisa.html'] ? 'analisa.html' : 'coc.html';
    } else if (targetType === 'finish') {
        destination = hasAccess['coa.html'] ? 'coa.html' : 'coc.html';
    } else if (targetType === 'companies') {
        destination = hasAccess['master-data.html'] ? 'master-data.html' : 'coc.html';
    } else if (targetType === 'cocs' || targetType === 'total') {
        destination = hasAccess['coc.html'] ? 'coc.html' : 'penerimaan.html';
    }

    // Jika user tidak berhak mengakses halaman target (misal analis mengklik total sampel),
    // alihkan ke menu kerja terdekat mereka, atau kembalikan ke dashboard.
    if (!hasAccess[destination]) {
        destination = hasAccess['penerimaan.html'] ? 'penerimaan.html' : 'dashboard.html';
    }

    window.location.assign(destination);
};

// 16. Navigasi Baris Tabel Berdasarkan Status Proses Sampel
window.navigateFromRow = function(dbId, statusLabel) {
    const role = sessionStorage.getItem('userRole') || 'sampling';

    // Pemetaan izin akses halaman LIMS
    const hasAccess = {
        'sampling.html': ['admin_master', 'manager', 'sampling'].includes(role),
        'analisa.html': ['admin_master', 'manager', 'analis'].includes(role),
        'coa.html': ['admin_master', 'manager', 'admin_ts'].includes(role),
        'coc.html': ['admin_master', 'manager', 'sampling', 'admin_ts'].includes(role),
        'penerimaan.html': ['admin_master', 'manager', 'sampling', 'admin_ts', 'analis'].includes(role)
    };

    let destination = '';

    if (statusLabel === 'SAMPLING') {
        destination = hasAccess['sampling.html'] ? 'sampling.html' : (hasAccess['coc.html'] ? 'coc.html' : '');
    } else if (statusLabel === 'ANALISA') {
        destination = hasAccess['analisa.html'] ? 'analisa.html' : (hasAccess['penerimaan.html'] ? 'penerimaan.html' : '');
    } else if (statusLabel === 'FINISH') {
        if (hasAccess['coa.html'] && dbId && dbId !== 'null') {
            destination = `coa.html?id=${dbId}`;
        } else {
            destination = hasAccess['coc.html'] ? 'coc.html' : '';
        }
    }

    if (destination) {
        window.location.assign(destination);
    } else {
        alert("Akses dibatasi atau data modul ini tidak tersedia untuk role Anda.");
    }
};

// 17. Pengurutan Dinamis Kolom (Multi-State)
window.handleHeaderSort = function(colName) {
    if (sortState.col === colName) {
        if (sortState.dir === 'asc') {
            sortState.dir = 'desc';
        } else {
            sortState.col = 'default';
            sortState.dir = 'none';
        }
    } else {
        sortState.col = colName;
        sortState.dir = 'asc';
    }
    applyDashboardFilters();
};

window.resetTableSort = function() {
    sortState.col = 'default';
    sortState.dir = 'none';
    applyDashboardFilters();
};

// 18. Analisis TAT & Kepatuhan Keterlambatan LIMS
let tatChartInstance = null;
let currentTatPeriod = 'daily';

window.changeTatPeriod = function(period) {
    currentTatPeriod = period;
    
    // Update kelas active pada tombol UI
    const btnDaily = document.getElementById('btnTatDaily');
    const btnMonthly = document.getElementById('btnTatMonthly');
    const btnYearly = document.getElementById('btnTatYearly');
    
    if (btnDaily) btnDaily.classList.toggle('active', period === 'daily');
    if (btnMonthly) btnMonthly.classList.toggle('active', period === 'monthly');
    if (btnYearly) btnYearly.classList.toggle('active', period === 'yearly');
    
    updateTatAnalysis(filteredSamplesList);
};

function updateTatAnalysis(samplesList = filteredSamplesList) {
    // Hanya hitung sampel yang telah diverifikasi terima fisiknya di lab
    const activeSamples = samplesList.filter(s => s.tgl_terima_lab);
    
    // 1. Hitung Ringkasan Statistik
    const total = activeSamples.length;
    const delayedCount = activeSamples.filter(s => s.isDelayed).length;
    const onTimeCount = total - delayedCount;
    const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
    
    let sumDuration = 0;
    let countWithDuration = 0;
    activeSamples.forEach(s => {
        if (s.actualDuration !== null) {
            sumDuration += s.actualDuration;
            countWithDuration++;
        }
    });
    const avgDuration = countWithDuration > 0 ? (sumDuration / countWithDuration).toFixed(1) : 0;
    
    // Perbarui nilai pada elemen HTML
    const onTimeEl = document.getElementById('tatOnTimeRate');
    const delayEl = document.getElementById('tatDelayCount');
    const avgEl = document.getElementById('tatAverageDuration');
    
    if (onTimeEl) onTimeEl.innerText = `${onTimeRate}%`;
    if (delayEl) delayEl.innerText = `${delayedCount} Sampel`;
    if (avgEl) avgEl.innerText = `${avgDuration} Hari`;
    
    // 2. Kelompokkan Data Berdasarkan Periode Terpilih
    const groupedData = groupTatData(samplesList, currentTatPeriod);
    const labels = groupedData.map(g => g.label);
    const averageDaysData = groupedData.map(g => g.averageDays);
    const limitLineData = Array(labels.length).fill(14); // Batas toleransi 14 hari
    
    // 3. Render Trend Chart dengan Chart.js
    const ctx = document.getElementById('tatTrendChart');
    if (!ctx) return;
    
    if (tatChartInstance) {
        tatChartInstance.destroy();
        tatChartInstance = null;
    }

    // Tampilkan pesan kosong HANYA jika benar-benar tidak ada data kelompok
    if (groupedData.length === 0) {
        ctx.style.display = 'none';
        let emptyMsg = document.getElementById('tatEmptyMsg');
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.id = 'tatEmptyMsg';
            emptyMsg.style.cssText = 'display:flex; align-items:center; justify-content:center; height:100%; color:#94a3b8; font-size:0.85rem; font-weight:700; flex-direction:column; gap:8px;';
            emptyMsg.innerHTML = '📊<br>Belum ada data penerimaan sampel lab<br>untuk periode yang dipilih';
            ctx.parentElement.appendChild(emptyMsg);
        }
        emptyMsg.style.display = 'flex';
        return;
    }
    // Sembunyikan pesan kosong jika data ada
    const emptyMsg = document.getElementById('tatEmptyMsg');
    if (emptyMsg) emptyMsg.style.display = 'none';
    ctx.style.display = '';

    tatChartInstance = new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rata-Rata Durasi Aktual (Hari)',
                    data: averageDaysData,
                    backgroundColor: '#3b82f6', // Biru
                    borderRadius: 6,
                    barThickness: 32
                },
                {
                    type: 'line',
                    label: 'Batas Toleransi (14 Hari)',
                    data: limitLineData,
                    borderColor: '#ef4444', // Merah
                    borderWidth: 2,
                    borderDash: [6, 6],
                    fill: false,
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 9, weight: '600' },
                        color: '#64748b'
                    }
                },
                y: {
                    min: 0,
                    suggestedMax: 16,
                    grid: { color: '#f1f5f9' },
                    ticks: { 
                        stepSize: 2, 
                        font: { family: 'Plus Jakarta Sans', size: 9, weight: '600' },
                        color: '#64748b'
                    },
                    title: {
                        display: true,
                        text: 'Durasi Pengerjaan (Hari Kerja)',
                        font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
                        color: '#475569'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Plus Jakarta Sans', weight: '700', size: 10 },
                        color: '#475569'
                    }
                }
            }
        }
    });
}

function groupTatData(samplesList, period) {
    // Gunakan HANYA samplesList yang sudah difilter dari luar — tidak re-filter dropdown lagi
    const activeSamples = samplesList.filter(s => s.tgl_terima_lab && s.actualDuration !== null);

    let groups = {};

    if (period === 'daily') {
        // Kelompokkan per tanggal aktual yang ADA di data (format: "DD Mmm YYYY")
        // Ini memastikan semua data Juli 2026 (dan bulan lain) muncul apa adanya
        activeSamples.forEach(s => {
            const date = new Date(s.tgl_terima_lab);
            if (isNaN(date)) return;
            // Buat label unik per tanggal penuh agar tidak bentrok lintas bulan
            const label = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
            const sortKey = date.toISOString().split('T')[0]; // YYYY-MM-DD untuk sorting
            if (!groups[sortKey]) {
                groups[sortKey] = { label, sortKey, totalDays: 0, count: 0 };
            }
            groups[sortKey].totalDays += s.actualDuration;
            groups[sortKey].count++;
        });

        // Urutkan berdasarkan tanggal
        return Object.values(groups)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(g => ({
                label: g.label,
                averageDays: g.count > 0 ? parseFloat((g.totalDays / g.count).toFixed(1)) : 0
            }));

    } else if (period === 'monthly') {
        // Kelompokkan per bulan-tahun yang ADA di data
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        activeSamples.forEach(s => {
            const date = new Date(s.tgl_terima_lab);
            if (isNaN(date)) return;
            const y = date.getFullYear();
            const m = date.getMonth();
            const sortKey = `${y}-${String(m + 1).padStart(2, '0')}`;
            const label = `${monthNames[m]} ${y}`;
            if (!groups[sortKey]) {
                groups[sortKey] = { label, sortKey, totalDays: 0, count: 0 };
            }
            groups[sortKey].totalDays += s.actualDuration;
            groups[sortKey].count++;
        });

        return Object.values(groups)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(g => ({
                label: g.label,
                averageDays: g.count > 0 ? parseFloat((g.totalDays / g.count).toFixed(1)) : 0
            }));

    } else if (period === 'yearly') {
        // Kelompokkan per tahun yang ADA di data
        activeSamples.forEach(s => {
            const date = new Date(s.tgl_terima_lab);
            if (isNaN(date)) return;
            const y = String(date.getFullYear());
            if (!groups[y]) {
                groups[y] = { label: y, sortKey: y, totalDays: 0, count: 0 };
            }
            groups[y].totalDays += s.actualDuration;
            groups[y].count++;
        });

        return Object.values(groups)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(g => ({
                label: g.label,
                averageDays: g.count > 0 ? parseFloat((g.totalDays / g.count).toFixed(1)) : 0
            }));
    }

    return [];
}


function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

function getWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    
    if (start > end) return 0;
    // Sampel diterima dan selesai pada hari yang sama dihitung 1 hari kerja
    if (start.getTime() === end.getTime()) return 1;
    
    let count = 0;
    let curDate = new Date(start);
    
    while (curDate < end) {
        curDate.setDate(curDate.getDate() + 1);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat & Sun
            count++;
        }
    }
    // Minimal 1 hari kerja jika ada rentang waktu
    return Math.max(count, 1);
}