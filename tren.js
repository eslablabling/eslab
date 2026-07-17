// tren.js

// 1. State Halaman
let allLogsData = [];
let allSamplesList = [];
let companySamplesList = [];
let masterEmisi = [];
let trendChartInstance = null;
let userRole = null;

const LOQ_SETTINGS = {
    "so2": 2.61,
    "no2": 1.88,
    "nox": 1.88,
    "no": 1.88,
    "co": 1.143,
    "particulate": 0.05,
    "opacity": 20
};

// 2. Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    // A. Cek Sesi Auth
    let user;
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = "index.html";
            return;
        }
        user = session.user;

        userRole = session.user.user_metadata?.role;
        if (!userRole) {
            const { data: profile } = await _supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', session.user.id)
                .single();
            userRole = profile?.role;
            if (profile?.full_name) {
                user.full_name = profile.full_name;
            }
        }
    } catch (e) {
        console.error("Auth Error:", e);
        window.location.href = "index.html";
        return;
    }

    // B. Tampilkan User Profile
    const userNameElement = document.getElementById('userName');
    const userFullNameEl = document.getElementById('userFullName');
    const userRoleEl = document.getElementById('userRoleDisplay');
    const currentDateEl = document.getElementById('currentDate');
    const btnLogout = document.getElementById('btnLogout');

    if (userFullNameEl) userFullNameEl.innerText = user.full_name || user.email.split('@')[0];
    if (userRoleEl) userRoleEl.innerText = userRole ? userRole.toUpperCase().replace('_', ' ') : 'USER';
    
    if (currentDateEl) {
        currentDateEl.innerText = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const hours = new Date().getHours();
    let greeting = "Selamat Malam";
    if (hours >= 5 && hours < 11) greeting = "Selamat Pagi";
    else if (hours >= 11 && hours < 15) greeting = "Selamat Siang";
    else if (hours >= 15 && hours < 18) greeting = "Selamat Sore";
    if (userNameElement) userNameElement.innerHTML = `Tren Analisa <span style="font-size:0.85rem; font-weight:400; color:#64748b;">| ${greeting}</span>`;

    // Logout listener
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm("Apakah Anda yakin ingin keluar?")) {
                await _supabase.auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }

    // C. Render Sidebar
    if (typeof renderSidebar === 'function') {
        renderSidebar(userRole || 'sampling');
    }

    // D. Ambil Data Master & COC
    await fetchMasterEmisi();
    await fetchCocLogs();

    // E. Setup UI Event Listeners
    const companySelect = document.getElementById('companySelect');
    const parameterSelect = document.getElementById('parameterSelect');
    const btnExportExcel = document.getElementById('btnExportExcel');

    if (companySelect) {
        companySelect.addEventListener('change', (e) => {
            handleCompanyChange(e.target.value);
        });
    }

    if (parameterSelect) {
        parameterSelect.addEventListener('change', (e) => {
            handleParameterChange(e.target.value);
        });
    }

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            exportTrendToExcel();
        });
    }
});

// 3. Ambil Data Master Emisi
async function fetchMasterEmisi() {
    try {
        const { data, error } = await _supabase
            .from('master_emisi')
            .select('parameter, metode, baku_mutu, unit, regulasi');
        if (error) throw error;
        masterEmisi = data || [];
        console.log("Master Emisi Loaded:", masterEmisi.length);
    } catch (err) {
        console.error("Gagal memuat Master Emisi:", err);
    }
}

// 4. Ambil Data COC Emisi & Parse Sampel
async function fetchCocLogs() {
    try {
        const { data, error } = await _supabase
            .from('coc_emisi')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        allLogsData = data || [];

        // Parse semua sampel
        allSamplesList = [];
        allLogsData.forEach(coc => {
            let samples = [];
            try {
                if (typeof coc.samples_data === 'string') {
                    samples = JSON.parse(coc.samples_data);
                } else {
                    samples = coc.samples_data || [];
                }
            } catch (e) {
                console.error("Gagal parsing samples_data COC:", coc.nomor_coc, e);
            }

            if (Array.isArray(samples)) {
                samples.forEach(s => {
                    allSamplesList.push({
                        id: coc.id,
                        nomor_coc: coc.nomor_coc,
                        company_name: coc.company_name || '-',
                        sampling_date: coc.sampling_date || s.tgl_sampling || '',
                        sample_id: s.sample_id || '-',
                        description: s.description || '-',
                        parameters: s.parameters || [],
                        opasitas_avg: s.opasitas_avg || null,
                        status_lab: s.status_lab || '',
                        is_verified: s.is_verified || false
                    });
                });
            }
        });

        // Isi dropdown Perusahaan
        populateCompanies();

    } catch (err) {
        console.error("Gagal memuat log COC:", err);
        alert("Gagal memuat data dari database: " + err.message);
    }
}

// 5. Isi Dropdown Perusahaan
function populateCompanies() {
    const companySelect = document.getElementById('companySelect');
    if (!companySelect) return;

    // Ambil nama perusahaan unik & urutkan
    const companies = [...new Set(allSamplesList.map(s => s.company_name).filter(c => c && c !== '-'))].sort();

    companySelect.innerHTML = '<option value="" disabled selected>Pilih Perusahaan...</option>';
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        companySelect.appendChild(opt);
    });
}

// 6. Handler Perubahan Perusahaan
function handleCompanyChange(companyName) {
    const parameterSelect = document.getElementById('parameterSelect');
    if (!parameterSelect) return;

    // Filter sampel milik perusahaan tersebut
    companySamplesList = allSamplesList.filter(s => s.company_name === companyName);

    // Cari seluruh parameter unik yang pernah diuji untuk perusahaan ini
    const params = new Set();
    companySamplesList.forEach(s => {
        if (Array.isArray(s.parameters)) {
            s.parameters.forEach(p => {
                if (p.parameter) {
                    params.add(p.parameter.trim());
                }
            });
        }
    });

    // Populate dropdown parameter
    parameterSelect.innerHTML = '<option value="" disabled selected>Pilih parameter...</option>';
    Array.from(params).sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        parameterSelect.appendChild(opt);
    });

    parameterSelect.disabled = false;
    
    // Reset Chart & Tabel
    if (trendChartInstance) {
        trendChartInstance.destroy();
        trendChartInstance = null;
    }
    document.getElementById('chartSubLabel').innerText = "Silakan pilih parameter analisa untuk menggambar grafik tren.";
    document.getElementById('detailsTableBody').innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; color: #64748b; padding: 40px; font-weight: 600;">
                Silakan pilih parameter analisa terlebih dahulu.
            </td>
        </tr>
    `;
    document.getElementById('btnExportExcel').disabled = true;
}

// 7. Handler Perubahan Parameter
function handleParameterChange(parameterName) {
    // Saring sampel yang mengandung parameter terpilih & urutkan secara kronologis (tanggal terlama ke terbaru)
    const activeSamples = companySamplesList.filter(s => {
        return s.parameters.some(p => p.parameter === parameterName);
    }).sort((a, b) => {
        const dateA = a.sampling_date ? new Date(a.sampling_date) : new Date(0);
        const dateB = b.sampling_date ? new Date(b.sampling_date) : new Date(0);
        return dateA - dateB;
    });

    if (activeSamples.length === 0) {
        document.getElementById('detailsTableBody').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #64748b; padding: 40px; font-weight: 600;">
                    Tidak ada data pengukuran untuk parameter ini.
                </td>
            </tr>
        `;
        document.getElementById('btnExportExcel').disabled = true;
        if (trendChartInstance) {
            trendChartInstance.destroy();
            trendChartInstance = null;
        }
        return;
    }

    // Persiapkan data grafik per Point Source (Description)
    // Sumbu X: Tanggal sampling unik yang terurut secara kronologis
    const uniqueDates = [...new Set(activeSamples.map(s => {
        return s.sampling_date ? new Date(s.sampling_date).toLocaleDateString('id-ID') : '-';
    }))].sort((a, b) => {
        const parseDate = (dStr) => {
            if (dStr === '-') return new Date(0);
            const [d, m, y] = dStr.split('/');
            return new Date(`${y}-${m}-${d}`);
        };
        return parseDate(a) - parseDate(b);
    });

    const pointSources = [...new Set(activeSamples.map(s => s.description || 'General'))].sort();
    
    let displayUnit = '-';
    let displayLimit = '-';
    const tableRows = [];

    // Tentukan Unit & Limit dari sampel pertama sebagai referensi
    const firstSample = activeSamples[0];
    const firstP = firstSample.parameters.find(param => param.parameter === parameterName);
    if (firstP) {
        const pName = parameterName.replace(/\s+/g, ' ').trim().toLowerCase();
        const isGasPolutan = (
            pName.includes('sulfur') || pName.includes('so2') || 
            pName.includes('nitrogen') || pName.includes('nox') || 
            pName.includes('no2') || pName.includes(' no') || 
            pName.includes('carbon mon') || pName.includes(' co')
        ) && !pName.includes('co2');

        if (pName.includes('velocity')) displayUnit = 'm/s';
        else if (pName.includes('volumetric flow')) displayUnit = 'm³/s';
        else if (isGasPolutan || pName.includes('particulate') || pName.includes('partikulat')) displayUnit = 'mg/Nm³';
        else if (pName.includes('co2') || pName.includes('o2') || pName.includes('opacity') || pName.includes('opasitas') || pName.includes('isokinetic') || pName.includes('water vapor')) displayUnit = '%';
        else displayUnit = firstP.unit || '-';

        const currentReg = firstSample.regulations?.[0] || '-';
        displayLimit = getRegulatoryLimit(parameterName, currentReg);
    }

    const colors = [
        '#2563eb', // Royal Blue
        '#16a34a', // Emerald Green
        '#ea580c', // Orange
        '#d946ef', // Fuchsia
        '#06b6d4', // Cyan
        '#8b5cf6', // Violet
        '#f43f5e', // Rose
        '#10b981', // Emerald
        '#f59e0b'  // Amber
    ];

    const datasets = pointSources.map((source, colorIdx) => {
        const color = colors[colorIdx % colors.length];
        
        const dataPoints = uniqueDates.map(dateStr => {
            const match = activeSamples.find(s => {
                const sDateStr = s.sampling_date ? new Date(s.sampling_date).toLocaleDateString('id-ID') : '-';
                return (s.description || 'General') === source && sDateStr === dateStr;
            });
            
            if (match) {
                const p = match.parameters.find(param => param.parameter === parameterName);
                if (p) {
                    const pName = parameterName.replace(/\s+/g, ' ').trim().toLowerCase();
                    const isGasPolutan = (
                        pName.includes('sulfur') || pName.includes('so2') || 
                        pName.includes('nitrogen') || pName.includes('nox') || 
                        pName.includes('no2') || pName.includes(' no') || 
                        pName.includes('carbon mon') || pName.includes(' co')
                    ) && !pName.includes('co2');

                    let rawValue = '0';
                    let valToFormat;

                    if (isGasPolutan) {
                        rawValue = (p.konsentrasi_1 !== undefined && p.konsentrasi_1 !== null) ? p.konsentrasi_1 : '0';
                        valToFormat = getConversionMgm3(p.parameter, rawValue);
                    } else if (pName.includes('opacity') || pName.includes('opasitas')) {
                        valToFormat = match.opasitas_avg || p.result || p.konsentrasi_1 || '0';
                    } else {
                        valToFormat = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
                    }

                    const finalDisplayResult = formatResultWithLOQ(p.parameter, valToFormat);
                    return parseNumericValue(finalDisplayResult);
                }
            }
            return null;
        });

        return {
            label: source,
            data: dataPoints,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 3,
            tension: 0.2,
            spanGaps: true,
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
        };
    });

    // Populate data baris tabel secara kronologis untuk semua titik sampel
    activeSamples.forEach(s => {
        const p = s.parameters.find(param => param.parameter === parameterName);
        if (!p) return;

        const pName = parameterName.replace(/\s+/g, ' ').trim().toLowerCase();
        const isGasPolutan = (
            pName.includes('sulfur') || pName.includes('so2') || 
            pName.includes('nitrogen') || pName.includes('nox') || 
            pName.includes('no2') || pName.includes(' no') || 
            pName.includes('carbon mon') || pName.includes(' co')
        ) && !pName.includes('co2');

        let rawValue = '0';
        let valToFormat;

        if (isGasPolutan) {
            rawValue = (p.konsentrasi_1 !== undefined && p.konsentrasi_1 !== null) ? p.konsentrasi_1 : '0';
            valToFormat = getConversionMgm3(p.parameter, rawValue);
        } else if (pName.includes('opacity') || pName.includes('opasitas')) {
            valToFormat = s.opasitas_avg || p.result || p.konsentrasi_1 || '0';
        } else {
            valToFormat = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
        }

        const finalDisplayResult = formatResultWithLOQ(p.parameter, valToFormat);
        const limit = getRegulatoryLimit(p.parameter, s.regulations?.[0] || '-');

        tableRows.push({
            nomor_coc: s.nomor_coc,
            sample_id: s.sample_id,
            description: s.description,
            tgl_sampling: s.sampling_date ? new Date(s.sampling_date).toLocaleDateString('id-ID') : '-',
            hasil_display: finalDisplayResult,
            satuan: displayUnit,
            baku_mutu: limit,
            metode: p.method || '-'
        });
    });

    // Render Tabel
    renderDetailsTable(tableRows);

    // Render Grafik
    renderTrendChart(uniqueDates, datasets, activeSamples, parameterName, displayUnit);

    // Update Label Header Grafik
    document.getElementById('chartLabel').innerText = `Tren Analisa: ${parameterName}`;
    document.getElementById('chartSubLabel').innerText = `Grafik historis parameter ${parameterName} per Point Source untuk perusahaan ${document.getElementById('companySelect').value}`;
    document.getElementById('btnExportExcel').disabled = false;
}

// 8. Tampilkan Baris Tabel
function renderDetailsTable(rows) {
    const tbody = document.getElementById('detailsTableBody');
    if (!tbody) return;

    let html = "";
    rows.forEach(r => {
        html += `
            <tr>
                <td style="font-weight: 700; color: #2563eb;">${r.nomor_coc}</td>
                <td style="font-weight: 600; color: #1e293b;">${r.sample_id}</td>
                <td>${r.description}</td>
                <td>${r.tgl_sampling}</td>
                <td style="text-align: right; font-weight: 800; color: #0f172a;">${r.hasil_display}</td>
                <td>${r.satuan}</td>
                <td style="text-align: center; font-weight: 600; color: #475569;">${r.baku_mutu}</td>
                <td style="font-size: 0.75rem; color: #64748b;">${r.metode}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// 9. Gambar Grafik Tren dengan Chart.js (Multi-Dataset per Point Source)
function renderTrendChart(labels, datasets, activeSamples, paramName, unitName) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 10,
                            weight: '700'
                        },
                        color: '#475569'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dateStr = context.label;
                            const source = context.dataset.label;
                            const val = context.raw;

                            // Cari data asli untuk memformat LOQ string dengan tepat di tooltip
                            const match = activeSamples.find(s => {
                                const sDateStr = s.sampling_date ? new Date(s.sampling_date).toLocaleDateString('id-ID') : '-';
                                return (s.description || 'General') === source && sDateStr === dateStr;
                            });

                            let displayVal = val;
                            if (match) {
                                const p = match.parameters.find(param => param.parameter === paramName);
                                if (p) {
                                    const pName = paramName.replace(/\s+/g, ' ').trim().toLowerCase();
                                    const isGasPolutan = (
                                        pName.includes('sulfur') || pName.includes('so2') || 
                                        pName.includes('nitrogen') || pName.includes('nox') || 
                                        pName.includes('no2') || pName.includes(' no') || 
                                        pName.includes('carbon mon') || pName.includes(' co')
                                    ) && !pName.includes('co2');

                                    let rawValue = '0';
                                    let valToFormat;

                                    if (isGasPolutan) {
                                        rawValue = (p.konsentrasi_1 !== undefined && p.konsentrasi_1 !== null) ? p.konsentrasi_1 : '0';
                                        valToFormat = getConversionMgm3(p.parameter, rawValue);
                                    } else if (pName.includes('opacity') || pName.includes('opasitas')) {
                                        valToFormat = match.opasitas_avg || p.result || p.konsentrasi_1 || '0';
                                    } else {
                                        valToFormat = p.result || p.hasil_mg_nm3 || p.konsentrasi_1 || '0';
                                    }

                                    displayVal = formatResultWithLOQ(p.parameter, valToFormat);
                                }
                            }
                            return ` ${source}: ${displayVal} ${unitName}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 10,
                            weight: '600'
                        },
                        color: '#64748b'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 9,
                            weight: '600'
                        },
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// 10. Konversi PPM ke MG/NM3 (Sama dengan COA)
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

// 11. Format Hasil dengan LOQ (Sama dengan COA)
function formatResultWithLOQ(paramName, value) {
    if (value == null || value === '-') return '-';
    
    const pName = paramName.toLowerCase().trim();
    let numValue = Number.parseFloat(value);
    
    let loq;
    
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

// 12. Cari Baku Mutu
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

// 13. Ekstrak Nilai Numerik Murni untuk Grafik (Handling LOQ)
function parseNumericValue(valueStr) {
    if (valueStr === undefined || valueStr === null || valueStr === '') return 0;
    let val = valueStr.toString().trim();
    val = val.replace(/^[<>\s]+/g, '');
    let parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
}

// 14. Ekspor Data Tren ke Excel
function exportTrendToExcel() {
    const compName = document.getElementById('companySelect').value;
    const paramName = document.getElementById('parameterSelect').value;
    const tbody = document.getElementById('detailsTableBody');

    if (!compName || !paramName || !tbody) return;

    const rows = [];
    const tableTrs = tbody.querySelectorAll('tr');

    tableTrs.forEach((tr, i) => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 8) return; // Skip if no data
        rows.push({
            "No.": i + 1,
            "Nomor COC": tds[0].innerText,
            "ID Sampel": tds[1].innerText,
            "Deskripsi / Lokasi": tds[2].innerText,
            "Tanggal Sampling": tds[3].innerText,
            "Hasil Ukur": tds[4].innerText,
            "Satuan": tds[5].innerText,
            "Baku Mutu": tds[6].innerText,
            "Metode Uji": tds[7].innerText
        });
    });

    if (rows.length === 0) {
        alert("Tidak ada data tren untuk diekspor.");
        return;
    }

    try {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tren Analisa");
        
        // Auto-fit kolom
        const maxLen = {};
        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                const val = String(row[key] || '');
                maxLen[key] = Math.max(maxLen[key] || 10, val.length);
            });
        });
        worksheet['!cols'] = Object.keys(maxLen).map(key => ({ wch: maxLen[key] + 3 }));

        const cleanComp = compName.replace(/[/\\?%*:|"<>]/g, '-');
        const cleanParam = paramName.replace(/[/\\?%*:|"<>]/g, '-');
        XLSX.writeFile(workbook, `Tren_${cleanParam}_${cleanComp}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error("Gagal ekspor Excel:", e);
        alert("Gagal mengekspor data ke Excel.");
    }
}
