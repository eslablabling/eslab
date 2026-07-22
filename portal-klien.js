let currentRole = null;
let currentProfile = null;
let currentSession = null;
let clientCompanyName = "";
let clientCocs = [];
let trendChartInstance = null;
let activeCocSamples = [];

// 1. Inisialisasi saat auth-ready
window.addEventListener('auth-ready', async (e) => {
    const { session, profile, role } = e.detail;
    currentSession = session;
    currentProfile = profile;
    currentRole = role;

    // Set Initials
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'U';
    const initialsEl = document.getElementById('userInitials');
    if (initialsEl) initialsEl.innerText = initials;

    // Tentukan perusahaan klien
    if (currentRole === 'client') {
        clientCompanyName = profile?.company_name || "";
    } else {
        // Staff/Admin Mode: Ambil perusahaan pertama dari database sebagai preview
        const { data: sampleCocs, error } = await _supabase
            .from('coc_emisi')
            .select('company_name')
            .limit(1);
        if (!error && sampleCocs && sampleCocs.length > 0) {
            clientCompanyName = sampleCocs[0].company_name;
        }
    }

    if (!clientCompanyName) {
        console.warn("Nama perusahaan klien tidak ditemukan.");
        alert("Peringatan: Akun Anda tidak dikaitkan dengan instansi/perusahaan manapun.");
        return;
    }

    // Ubah subjudul topbar
    const subTitle = document.querySelector('.welcome-text p');
    if (subTitle) subTitle.innerText = `Menampilkan data emisi untuk: ${clientCompanyName}`;

    await loadClientData();
});

// 2. Mengambil semua data pengujian milik perusahaan klien
async function loadClientData() {
    try {
        const { data: cocs, error } = await _supabase
            .from('coc_emisi')
            .select('id, company_name, qt_no, created_at, status_sampling, scanned_coa_url, samples(*)')
            .eq('company_name', clientCompanyName)
            .order('created_at', { ascending: false });

        if (error) throw error;
        clientCocs = cocs || [];

        updateSummaryStats();
        populateCocSelect();
        setupTrendFilters();
    } catch (err) {
        console.error("Gagal memuat data portal klien:", err);
    }
}

// 3. Mengupdate Summary Cards
function updateSummaryStats() {
    const totalJobs = clientCocs.length;
    const completedJobs = clientCocs.filter(c => (c.status_sampling || '').toLowerCase() === 'verified').length;
    const activeJobs = totalJobs - completedJobs;

    document.getElementById('statTotalJobs').innerText = totalJobs;
    document.getElementById('statActiveJobs').innerText = activeJobs;
    document.getElementById('statCompletedJobs').innerText = completedJobs;
}

// 4. Memasukkan opsi ke dropdown Pekerjaan
function populateCocSelect() {
    const select = document.getElementById('cocSelect');
    if (!select) return;

    if (clientCocs.length === 0) {
        select.innerHTML = `<option value="">Belum ada pekerjaan uji</option>`;
        return;
    }

    select.innerHTML = clientCocs.map((c, idx) => {
        return `<option value="${c.id}" ${idx === 0 ? 'selected' : ''}>${c.qt_no || 'Tanpa No. Quotation'} (${new Date(c.created_at).toLocaleDateString('id-ID')})</option>`;
    }).join('');

    // Trigger update untuk item pertama
    if (clientCocs.length > 0) {
        handleCocChange(clientCocs[0].id);
    }
}

// 5. Perubahan opsi Pekerjaan dipilih
window.handleCocChange = function(cocId) {
    const coc = clientCocs.find(c => c.id === cocId);
    if (!coc) return;

    const samples = coc.samples || [];

    // Hitung status penyelesaian tracker
    // A. SAMPLING
    const isSamplingComplete = samples.length > 0 && samples.every(s => s.status === 'Done');
    const isSamplingActive = samples.some(s => s.status === 'Done' || s.status === 'In Progress');

    // B. DITERIMA LAB
    const isReceivedComplete = samples.length > 0 && samples.every(s => ['received', 'analyzed', 'verified'].includes((s.status_lab || '').toLowerCase()));
    const isReceivedActive = samples.some(s => ['received', 'analyzed', 'verified'].includes((s.status_lab || '').toLowerCase()));

    // C. DIANALISA
    const isAnalyzedComplete = samples.length > 0 && samples.every(s => ['analyzed', 'verified'].includes((s.status_lab || '').toLowerCase()));
    const isAnalyzedActive = samples.some(s => ['analyzed', 'verified'].includes((s.status_lab || '').toLowerCase()));

    // D. DIVERIFIKASI
    const isVerifiedComplete = samples.length > 0 && samples.every(s => (s.status_lab || '').toLowerCase() === 'verified');
    const isVerifiedActive = samples.some(s => (s.status_lab || '').toLowerCase() === 'verified');

    // E. COA SELESAI
    const isCoaSelesai = (coc.status_sampling || '').toLowerCase() === 'verified';

    // Update Bubble Styles
    updateStepStyle('step-sampling', isSamplingComplete, isSamplingActive);
    updateStepStyle('step-received', isReceivedComplete, isReceivedActive);
    updateStepStyle('step-analyzed', isAnalyzedComplete, isAnalyzedActive);
    updateStepStyle('step-verified', isVerifiedComplete, isVerifiedActive);
    updateStepStyle('step-coa', isCoaSelesai, isCoaSelesai);

    // Update Text Descriptors
    document.getElementById('desc-sampling').innerText = isSamplingComplete ? 'Selesai' : (isSamplingActive ? 'Dalam Proses' : 'Antre');
    document.getElementById('desc-received').innerText = isReceivedComplete ? 'Selesai' : (isReceivedActive ? 'Dalam Proses' : 'Antre');
    document.getElementById('desc-analyzed').innerText = isAnalyzedComplete ? 'Selesai' : (isAnalyzedActive ? 'Dalam Proses' : 'Antre');
    document.getElementById('desc-verified').innerText = isVerifiedComplete ? 'Selesai' : (isVerifiedActive ? 'Dalam Proses' : 'Antre');
    document.getElementById('desc-coa').innerText = isCoaSelesai ? 'Selesai Scan' : 'Proses Ttd';

    // Update Download Button Google Drive
    const downloadContainer = document.getElementById('downloadBtnContainer');
    if (downloadContainer) {
        if (coc.scanned_coa_url) {
            downloadContainer.innerHTML = `
                <a href="${coc.scanned_coa_url}" target="_blank" class="btn-download-coa">
                    📥 Unduh Scan COA Resmi
                </a>
            `;
        } else {
            downloadContainer.innerHTML = `<span style="font-size: 0.8rem; font-weight: 700; color: #f59e0b;">⏳ Menunggu Scan COA</span>`;
        }
    }

    // Simpan sampel ke variabel global untuk filter & sort
    activeCocSamples = samples;
    applySampleFilter();
}

function updateStepStyle(stepId, isComplete, isActive) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.classList.remove('complete', 'active');
    if (isComplete) {
        el.classList.add('complete');
    } else if (isActive) {
        el.classList.add('active');
    }
}

// 6. Setup filter untuk Tren Kepatuhan
function setupTrendFilters() {
    const chimneySelect = document.getElementById('chimneySelect');
    const parameterSelect = document.getElementById('parameterSelect');
    if (!chimneySelect || !parameterSelect) return;

    // Kumpulkan cerobong unik
    const chimneys = new Set();
    const parameters = new Set();

    clientCocs.forEach(coc => {
        (coc.samples || []).forEach(s => {
            if (s.nama_cerobong) chimneys.add(s.nama_cerobong);
            (s.parameters || []).forEach(p => {
                if (p.parameter) parameters.add(p.parameter);
            });
        });
    });

    if (chimneys.size === 0) {
        chimneySelect.innerHTML = `<option value="">Tidak ada data cerobong</option>`;
        parameterSelect.innerHTML = `<option value="">Tidak ada data parameter</option>`;
        return;
    }

    chimneySelect.innerHTML = Array.from(chimneys).map(ch => `<option value="${ch}">${ch}</option>`).join('');
    parameterSelect.innerHTML = Array.from(parameters).map(p => `<option value="${p}">${p}</option>`).join('');

    loadTrendChartData();
}

// 7. Load Data untuk Chart.js
async function loadTrendChartData() {
    const chimney = document.getElementById('chimneySelect').value;
    const parameter = document.getElementById('parameterSelect').value;
    if (!chimney || !parameter) return;

    const labels = [];
    const values = [];

    const dataPoints = [];
    const sortedCocs = [...clientCocs].reverse();

    sortedCocs.forEach(coc => {
        const matchingSamples = (coc.samples || []).filter(s => s.nama_cerobong === chimney);
        matchingSamples.forEach(matchingSample => {
            const p = (matchingSample.parameters || []).find(param => param.parameter === parameter);
            if (p) {
                // Ekstrak nilai numerik
                const isGasPolutan = (
                    parameter.toLowerCase().includes('sulfur') || parameter.toLowerCase().includes('so2') || 
                    parameter.toLowerCase().includes('nitrogen') || parameter.toLowerCase().includes('nox') || 
                    parameter.toLowerCase().includes('carbon mon') || parameter.toLowerCase().includes('co')
                ) && !parameter.toLowerCase().includes('co2');

                let rawValue = '0';
                if (isGasPolutan) {
                    rawValue = p.konsentrasi_1 || '0';
                } else if (parameter.toLowerCase().includes('opacity') || parameter.toLowerCase().includes('opasitas')) {
                    rawValue = matchingSample.opasitas_avg || p.result || p.konsentrasi_1 || '0';
                } else {
                    rawValue = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
                }

                // Parse numerik bersih
                const cleanValue = parseFloat(rawValue.replace(/[^\d.-]/g, '')) || 0;
                dataPoints.push({
                    sample_id: matchingSample.sample_id,
                    val: cleanValue
                });
            }
        });
    });

    // Urutkan dataPoints berdasarkan sample_id secara alfanumerik (kecil ke besar)
    dataPoints.sort((a, b) => a.sample_id.localeCompare(b.sample_id, undefined, { numeric: true, sensitivity: 'base' }));

    // Masukkan data terurut ke array labels dan values
    dataPoints.forEach(dp => {
        labels.push(dp.sample_id);
        values.push(dp.val);
    });

    // Ambil baku mutu untuk parameter jika ada di master emisi
    let limitVal = null;
    try {
        const { data: masterData } = await _supabase
            .from('master_emisi')
            .select('baku_mutu')
            .ilike('parameter', `%${parameter}%`)
            .limit(1);
        if (masterData && masterData.length > 0) {
            limitVal = parseFloat(masterData[0].baku_mutu) || null;
        }
    } catch (err) {
        console.error("Gagal mengambil baku mutu:", err);
    }

    renderTrendChart(labels, values, parameter, limitVal);
}

// 8. Menggambar Chart.js
function renderTrendChart(labels, values, paramName, limitVal) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    const datasets = [{
        label: `Kadar ${paramName}`,
        data: values,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.05)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointRadius: 6,
        pointHoverRadius: 8
    }];

    if (limitVal !== null && !isNaN(limitVal)) {
        datasets.push({
            label: `Baku Mutu (${limitVal})`,
            data: labels.map(() => limitVal),
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        });
    }

    trendChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    title: {
                        display: true,
                        text: 'Kadar / Konsentrasi',
                        font: { family: 'Plus Jakarta Sans', weight: 'bold' }
                    }
                },
                x: {
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'ID Sampel',
                        font: { family: 'Plus Jakarta Sans', weight: 'bold' }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
                }
            }
        }
    });
}

// Fungsi Filter & Sort Detail Titik Sampel Klien
window.applySampleFilter = function() {
    const samplesListContainer = document.getElementById('samplesStatusList');
    if (!samplesListContainer) return;

    if (activeCocSamples.length === 0) {
        samplesListContainer.innerHTML = `<div style="grid-column: 1/-1; color:#64748b; font-size:0.8rem; padding: 12px 0;">Belum ada data titik sampel pada pekerjaan ini.</div>`;
        return;
    }

    const filterVal = document.getElementById('statusFilter')?.value || 'all';
    const sortVal = document.getElementById('sampleSort')?.value || 'asc';

    // 1. Filter
    let filtered = [...activeCocSamples];
    if (filterVal !== 'all') {
        filtered = filtered.filter(s => {
            const labStatus = (s.status_lab || '').toLowerCase();
            if (filterVal === 'belum_lab') {
                return !['received', 'analyzed', 'verified'].includes(labStatus);
            }
            return labStatus === filterVal;
        });
    }

    // 2. Sort (Natural Alphanumeric Sort)
    filtered.sort((a, b) => {
        const idA = a.sample_id || '';
        const idB = b.sample_id || '';
        if (sortVal === 'asc') {
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        } else {
            return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
        }
    });

    if (filtered.length === 0) {
        samplesListContainer.innerHTML = `<div style="grid-column: 1/-1; color:#64748b; font-size:0.8rem; padding: 12px 0;">Tidak ada sampel yang cocok dengan filter status tersebut.</div>`;
        return;
    }

    // 3. Render
    samplesListContainer.innerHTML = filtered.map(s => {
        let badgeStyle = "background:#cbd5e1; color:#475569;";
        let displayLabStatus = "Belum Masuk Lab";
        const labStatus = (s.status_lab || '').toLowerCase();
        
        if (labStatus === 'received') {
            badgeStyle = "background:#eff6ff; color:#2563eb;";
            displayLabStatus = "Diterima Lab";
        } else if (labStatus === 'analyzed') {
            badgeStyle = "background:#fffbeb; color:#d97706;";
            displayLabStatus = "Sedang Dianalisa";
        } else if (labStatus === 'verified') {
            badgeStyle = "background:#f0fdf4; color:#16a34a;";
            displayLabStatus = "Terverifikasi";
        } else if (s.status === 'Done') {
            badgeStyle = "background:#f1f5f9; color:#0f172a;";
            displayLabStatus = "Sampling Selesai";
        }

        return `
            <div class="sample-status-item">
                <div>
                    <div style="font-weight:700; font-size:0.85rem; color:#0f172a;">${s.sample_id}</div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${s.nama_cerobong || 'Tanpa Nama Cerobong'}</div>
                </div>
                <span class="sample-status-badge" style="${badgeStyle}">${displayLabStatus}</span>
            </div>
        `;
    }).join('');
}
