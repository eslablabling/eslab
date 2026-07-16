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
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await _supabase.auth.getSession();

    if (error || !session) {
        window.location.href = 'index.html'; 
        return;
    }

    await loadUserProfile(session.user.id);
    updateDateDisplay();
    await fetchActiveLogs(); 

    // Setup event listeners untuk Pencarian, Paginasi & Ekspor
    const searchLog = document.getElementById('searchLog');
    if (searchLog) {
        searchLog.addEventListener('input', (e) => {
            handleSearch(e.target.value);
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
        const { data: logs, error } = await _supabase
            .from('coc_emisi') 
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        console.log("Data berhasil ditarik:", logs);

        if (!logs || logs.length === 0) {
            logTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Database kosong atau RLS memblokir data.</td></tr>`;
            return;
        }

        const activeSamples = [];

        logs.forEach(coc => {
            let samples = [];
            
            // Logika parsing sampel
            try {
                if (typeof coc.samples_data === 'string') {
                    samples = JSON.parse(coc.samples_data);
                } else {
                    samples = coc.samples_data || [];
                }
            } catch (e) {
                console.error("Gagal parse samples_data untuk:", coc.nomor_coc, e);
            }

            if (typeof samples === 'string') {
                try { samples = JSON.parse(samples); } catch(e) {}
            }

            if (Array.isArray(samples)) {
                samples.forEach(s => {
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

                    if (s.status_lab === 'verified' || s.is_verified === true) {
                        statusLabel = "FINISH";
                        statusClass = "tag-green";
                    } else if (s.status === 'Done' || s.tgl_terima_lab) {
                        statusLabel = "ANALISA";
                        statusClass = "tag-blue";
                    }

                    activeSamples.push({
                        nomor_coc: coc.nomor_coc,
                        sample_id: s.sample_id || '-',
                        company_name: coc.company_name || '-',
                        tglSampling,
                        tglTerima,
                        tglSelesai,
                        tatHari,
                        isUrgent,
                        statusLabel,
                        statusClass
                    });
                });
            }
        });

        allSamplesList = activeSamples;
        filteredSamplesList = [...allSamplesList];

        // Jalankan update widget & table
        updateStats();
        renderStatusChart();
        renderTableRows();
        renderPaginationControls();

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        logTableBody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
    }
}

// 5. Render Menu Akses Pintas Berdasarkan Role
function renderMenu(role) {
    const menuContainer = document.getElementById('menuContainer');
    if (!menuContainer) return;

    const menuMapping = {
        admin_master: [
            { title: "Master Data", icon: "🗂️", link: "master-data.html", desc: "Regulasi & Parameter Uji" },
            { title: "COC Digital", icon: "📑", link: "coc.html", desc: "Kelola Chain of Custody Emisi" },
            { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", desc: "Input Data Lapangan & Meteo" },
            { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", desc: "Registrasi Sampel ke Lab" },
            { title: "Log Analisa", icon: "🧪", link: "analisa.html", desc: "Input Hasil Analisa & Kadar" },
            { title: "Verifikasi & COA", icon: "📜", link: "coa.html", desc: "Verifikasi Hasil & Rilis COA" },
            { title: "Activity Logger", icon: "🛡️", link: "logger.html", desc: "Audit Trail & Keamanan Sistem" }
        ],
        manager: [
            { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", desc: "Registrasi Sampel ke Lab" },
            { title: "Log Analisa", icon: "🧪", link: "analisa.html", desc: "Input Hasil Analisa & Kadar" },
            { title: "Verifikasi & COA", icon: "📜", link: "coa.html", desc: "Verifikasi Hasil & Rilis COA" },
        ],
        sampling: [
            { title: "COC Digital", icon: "📑", link: "coc.html", desc: "Kelola Chain of Custody Emisi" },
            { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", desc: "Input Data Lapangan & Meteo" }
        ],
        admin_ts: [
            { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", desc: "Registrasi Sampel ke Lab" }
        ],
        analis: [
            { title: "Log Analisa", icon: "🧪", link: "analisa.html", desc: "Input Hasil Analisa & Kadar" }
        ]
    };

    const activeMenus = menuMapping[role] || menuMapping['sampling'];
    let cardsHTML = "";
    
    activeMenus.forEach(item => {
        cardsHTML += `
            <div class="menu-card" onclick="window.location.href='${item.link}'">
                <div class="icon">${item.icon}</div>
                <div>
                    <h4 style="font-weight: 800; color: #0f172a; font-size: 0.95rem; margin-bottom: 4px;">${item.title}</h4>
                    <p style="color: #64748b; font-size: 0.75rem;">${item.desc}</p>
                </div>
            </div>
        `;
    });

    menuContainer.innerHTML = cardsHTML;
}

// 6. Update Kartu Statistik Dinamis
function updateStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    const totalSamples = allSamplesList.length;
    const samplingCount = allSamplesList.filter(s => s.statusLabel === 'SAMPLING').length;
    const analisaCount = allSamplesList.filter(s => s.statusLabel === 'ANALISA').length;
    const finishCount = allSamplesList.filter(s => s.statusLabel === 'FINISH').length;

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
    `;
}

// 7. Visualisasi Diagram Donat Chart.js
function renderStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const samplingCount = allSamplesList.filter(s => s.statusLabel === 'SAMPLING').length;
    const analisaCount = allSamplesList.filter(s => s.statusLabel === 'ANALISA').length;
    const finishCount = allSamplesList.filter(s => s.statusLabel === 'FINISH').length;

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

// 8. Pencarian Dinamis
function handleSearch(keyword) {
    currentPage = 1;
    if (!keyword) {
        filteredSamplesList = [...allSamplesList];
    } else {
        const kw = keyword.toLowerCase();
        filteredSamplesList = allSamplesList.filter(s => {
            return (s.nomor_coc && s.nomor_coc.toLowerCase().includes(kw)) ||
                   (s.sample_id && s.sample_id.toLowerCase().includes(kw)) ||
                   (s.company_name && s.company_name.toLowerCase().includes(kw)) ||
                   (s.statusLabel && s.statusLabel.toLowerCase().includes(kw));
        });
    }
    renderTableRows();
    renderPaginationControls();
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
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            throw new Error(error?.message || "Profil tidak ditemukan");
        }

        const hours = new Date().getHours();
        let greeting = "Selamat Malam";
        if (hours >= 5 && hours < 11) greeting = "Selamat Pagi";
        else if (hours >= 11 && hours < 15) greeting = "Selamat Siang";
        else if (hours >= 15 && hours < 18) greeting = "Selamat Sore";

        const name = profile.full_name || "Staf Lab";
        
        if (userNameElement) userNameElement.innerText = `${greeting}, ${name}`;
        if (userFullName) userFullName.innerText = name;
        if (userRoleDisplay) userRoleDisplay.innerText = profile.role ? profile.role.replace('_', ' ') : 'User';

        renderMenu(profile.role);

    } catch (err) {
        console.error("Gagal memuat profil:", err.message);
        if (userNameElement) userNameElement.innerText = "Selamat Datang";
        if (userRoleDisplay) userRoleDisplay.innerText = "Sesi Aktif";
    }
}

// 13. Update Tampilan Tanggal
function updateDateDisplay() {
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.innerText = new Date().toLocaleDateString('id-ID', options);
    }
}

// 14. Logout Listener
document.querySelectorAll('#btnLogout').forEach(button => {
    button.addEventListener('click', async () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            const { error } = await _supabase.auth.signOut();
            if (error) {
                alert("Gagal logout: " + error.message);
            } else {
                window.location.href = 'index.html';
            }
        }
    });
});