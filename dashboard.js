// dashboard.js

// 1. State Halaman Dashboard
let allSamplesList = [];
let filteredSamplesList = [];
let currentPage = 1;
const pageSize = 10;
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

            // Hitung Turnaround Time (TAT)
            let tatHari = "-";
            if (rawTerima && rawSelesai) {
                const d1 = new Date(rawTerima);
                const d2 = new Date(rawSelesai);
                const diffInMs = d2 - d1;
                const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
                tatHari = diffInDays <= 0 ? "1 Hari" : `${diffInDays} Hari`;
            }

            // Format Tanggal
            const tglSampling = coc.sampling_date ? new Date(coc.sampling_date).toLocaleDateString('id-ID') : '-';
            const tglTerima = rawTerima ? new Date(rawTerima).toLocaleDateString('id-ID') : '-';
            const tglSelesai = rawSelesai ? new Date(rawSelesai).toLocaleDateString('id-ID') : '-';
            
            const tatPriority = (coc.tat_requested || "NORMAL").toUpperCase();
            const isUrgent = tatPriority === 'URGENT';

            // Logika Status
            let statusLabel = "SAMPLING";
            let statusClass = "tag-orange";

            if (!coc.status_sampling || coc.status_sampling.trim().toLowerCase() !== 'verified') {
                statusLabel = "SAMPLING";
                statusClass = "tag-orange";
            } else if (s.status_lab === 'verified' || s.is_verified === true) {
                statusLabel = "FINISH";
                statusClass = "tag-green";
            } else if (s.status === 'Done' || s.tgl_terima_lab) {
                statusLabel = "ANALISA";
                statusClass = "tag-blue";
            }

            activeSamples.push({
                nomor_coc: coc.nomor_coc || '-',
                sample_id: s.sample_id || '-',
                company_name: coc.company_name || '-',
                sampling_date: coc.sampling_date,
                tglSampling,
                tglTerima,
                tglSelesai,
                tatHari,
                isUrgent,
                statusLabel,
                statusClass
            });
        });

        allSamplesList = activeSamples;
        populateYearFilter();
        applyDashboardFilters();

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
        <div class="stat-card" style="border-left: 4px solid #64748b;">
            <h4>Total Sampel</h4>
            <div class="number" style="color: #1e293b;">${totalSamples}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Terdaftar di sistem LIMS</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #f97316;">
            <h4>Proses Sampling</h4>
            <div class="number" style="color: #ea580c;">${samplingCount}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Persiapan & Data Lapangan</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #2563eb;">
            <h4>Proses Analisa</h4>
            <div class="number" style="color: #1d4ed8;">${analisaCount}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Tahap pengujian lab</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #16a34a;">
            <h4>Verifikasi & COA</h4>
            <div class="number" style="color: #15803d;">${finishCount}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Tervalidasi & COA terbit</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #8b5cf6;">
            <h4>Jumlah Perusahaan</h4>
            <div class="number" style="color: #6d28d9;">${uniqueCompanies}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 600;">Perusahaan terlayani</p>
        </div>
        <div class="stat-card" style="border-left: 4px solid #06b6d4;">
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
    const yearSelect = document.getElementById('filterStatsYear');
    const searchLog = document.getElementById('searchLog');

    const monthVal = monthSelect ? monthSelect.value : 'all';
    const yearVal = yearSelect ? yearSelect.value : 'all';
    const keyword = searchLog ? searchLog.value.toLowerCase().trim() : '';

    // Step 1: Filter berdasarkan Bulan & Tahun dari tanggal sampling
    const dateFiltered = allSamplesList.filter(s => {
        if (monthVal === 'all' && yearVal === 'all') return true;
        if (!s.sampling_date) return false;

        const date = new Date(s.sampling_date);
        const m = date.getMonth();
        const y = date.getFullYear();

        if (monthVal !== 'all' && m !== parseInt(monthVal)) return false;
        if (yearVal !== 'all' && y !== parseInt(yearVal)) return false;

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

    currentPage = 1;
    renderTableRows();
    renderPaginationControls();
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
            <tr>
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