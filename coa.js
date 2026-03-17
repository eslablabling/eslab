
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Ambil user secara mandiri
    let user;
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = "index.html";
            return;
        }
        user = session.user;
    } catch (e) {
        console.error("Auth Error:", e);
        return;
    }

    // 2. Isi Profil User
    const userDisplay = document.getElementById('userFullName');
    if (userDisplay) {
        userDisplay.innerText = user.user_metadata?.full_name || user.email;
    }
    await fetchMasterEmisi();

    // 3. Ambil ID Dokumen dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    // --- PERUBAHAN DI SINI ---
    if (!docId) {
        // Jika tidak ada ID di URL, tampilkan daftar semua CoA yang tersedia
        renderCoAList(); 
        return;
    }
    // -------------------------

    // 4. Ambil data spesifik dari Supabase (Jika docId ada)
    try {
        const { data: coc, error } = await _supabase
            .from('coc_emisi')
            .select('*')
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

// 2. Fungsi renderCoAList yang sudah ditambahkan tombol Export
async function renderCoAList() {
    const area = document.getElementById('coaRenderArea');
    area.innerHTML = `<div style="text-align:center; padding:50px;">🔍 Mencari daftar sertifikat...</div>`;

    try {
        // Ambil data tanpa filter .eq() ketat agar kita bisa debug
        const { data, error } = await _supabase
            .from('coc_emisi')
            .select('id, company_name, qt_no, updated_at, status_sampling')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Filter di JavaScript agar tidak sensitif terhadap huruf besar/kecil atau spasi
        const dataSelesai = data.filter(item => 
            item.status_sampling && item.status_sampling.trim().toLowerCase() === 'selesai'
        );

        if (dataSelesai.length === 0) {
            area.innerHTML = `
                <div style="text-align:center; padding:50px; color:var(--text-muted);">
                    <h3>Data Tidak Ditemukan</h3>
                    <p>Status yang ada di database saat ini: <b>${[...new Set(data.map(d => d.status_sampling))].join(', ') || 'Kosong'}</b></p>
                </div>`;
            return;
        }

        // Render Tabel (Gunakan dataSelesai)
        area.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
                <h2 style="color: var(--primary);">Daftar Sertifikat (CoA)</h2>
                <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f8fafc;">
                            <tr>
                                <th style="padding: 15px; text-align: left;">No. Quotation</th>
                                <th style="padding: 15px; text-align: left;">Nama Perusahaan</th>
                                <th style="padding: 15px; text-align: center;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataSelesai.map(item => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 15px; font-family: monospace;">${item.qt_no}</td>
                                    <td style="padding: 15px; font-weight: 600;">${item.company_name}</td>
                                    <td style="padding: 15px; text-align: center;">
                                        <a href="coa.html?id=${item.id}" style="background: var(--primary); color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 0.8rem;">Buka CoA 📄</a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;

    } catch (err) {
        console.error("Error:", err);
        area.innerHTML = `<div style="text-align:center; color:red; padding:50px;">Gagal memuat: ${err.message}</div>`;
    }
}

function renderCoA(data) {
    const area = document.getElementById('coaRenderArea');
    
    // Parsing data sampel
    let samples = [];
    try {
        samples = typeof data.samples_data === 'string' ? JSON.parse(data.samples_data) : (data.samples_data || []);
    } catch (e) { console.error("Error parsing:", e); }

    const verifiedSamples = samples.filter(s => 
    s.status_lab && typeof s.status_lab === 'string' && s.status_lab.toLowerCase() === 'verified'
);

    // 1. Render Cover Page (Halaman 1)
    let htmlContent = `
        <div class="coa-page coa-cover">
            <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px;">
                <h1 style="margin:0; font-size: 22px;">CERTIFICATE OF ANALYSIS</h1>
                <p style="margin:5px 0 0 0;">Certificate Number: ES.${data.qt_no?.split('/')[0] || '0000'}.${new Date().getFullYear()}${data.id.substring(0,4)}</p>
            </div>
            <div style="margin-top:40px;">
                <h3 style="text-decoration: underline;">Owners Identity</h3>
                <p>Name of Company : ${data.company_name}</p>
                <p>Address : ${data.company_address || '-'}</p>
                <p>Customer Contact : ${data.contact_person || '-'}</p>
            </div>
            <div style="position: absolute; bottom: 100px; right: 40px; text-align: right;">
                <p>Cikarang, ${new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</p>
                <p>Approved by,</p><br><br><br>
                <p><strong>Fadhel Verdino</strong></p>
            </div>
        </div>
    `;

    // 2. Render Data Pages (Halaman 2 dst)
    verifiedSamples.forEach((sample, index) => {
        htmlContent += `
        <div class="coa-page" style="padding: 20px; border: 2px solid #0000ff; margin-top: 20px;">
            <div style="text-align:center; border-bottom: 1.5px solid #0000ff; padding-bottom: 10px; margin-bottom: 10px;">
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
                        <th>No.</th>
                        <th>Testing Parameter</th>
                        <th>Sample Result</th>
                        <th>Regulatory Limit**</th>
                        <th>Unit#</th>
                        <th>Methods</th>
                    </tr>
                </thead>
                <tbody>

                   ${sample.parameters.map((p, i) => {
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
                    const finalDisplayResult = formatResultWithLOQ(p.parameter, valToFormat);

                    // ... Sisa kode untuk displayUnit dan autoLimit tetap sama ...

                    // 3. Tentukan Satuan (DISPLAY UNIT)
                    let displayUnit = '-';
                    if (pName.includes('velocity')) displayUnit = 'm/s';
                    else if (pName.includes('volumetric flow')) displayUnit = 'm³/s';
                    else if (isGasPolutan || pName.includes('particulate')) displayUnit = 'mg/Nm³';
                    else if (pName.includes('co2') || pName.includes('o2') || pName.includes('opacity') || pName.includes('isokinetic')) displayUnit = '%';
                    else displayUnit = p.unit || '-';

                    // 4. Regulasi & Limit
                    const currentReg = sample.regulations?.[0] || '-';
                    const autoLimit = getRegulatoryLimit(p.parameter, currentReg);

                    return `
                        <tr>
                            <td style="text-align:center; border: 1px solid #000;">${i + 1}</td>
                            <td style="padding: 8px; border: 1px solid #000;">${p.parameter}${p.is_accredited ? '' : '*'}</td>
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

            <div style="text-align: right; margin-top: 40px; font-size: 0.85rem;">
                <p>Cikarang, ${new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</p>
                <p>Approved by,</p><br><br>
                <p><strong>Fadhel Verdino</strong><br>Environment Lab Manager</p>
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
    
    // 1. Definisikan Urutan sesuai gambar (Gas Polutan -> Fisik/Isokinetik)
    const parameterOrder = {
        // Gas Polutan (Urutan Awal)
        "nitrogen oxide (no2)": 1,
        "nitrogen dioksida (no2)": 1, 
        "nitrogen monoksida (no)": 2,
        "oksida-oksida nitrogen (nox)": 3,
        "sulfur dioxide (so2)": 6,
        "sulfur dioksida (so2)": 6,
        "carbon monoxide (co)": 7,
        "karbon monoksida (co)": 7,

        // Parameter Fisik & Isokinetik (Urutan Akhir)
        "opacity": 4,
        "opasitas": 4,
        "particulate": 5,
        "partikulat": 5,
        "oksigen (o2)": 8,
        "o2": 8,
        "carbon dioxide (co2)": 9,
        "co2": 9,
        "velocity": 10,
        "laju alir": 10,
        "volumetric flow rate": 11,
        "water vapor in flue gas": 12,
        "num of traverse point": 13,
        "percent of isokinetic": 14
    };

    verifiedSamples.forEach(sample => {
        const regulation = sample?.regulation_name ?? docInfo?.regulation ?? '';

        // --- PROSES PENGURUTAN (SORTING) ---
        const sortedParameters = [...sample.parameters].sort((a, b) => {
            const nameA = (a.parameter || '').toLowerCase().trim();
            const nameB = (b.parameter || '').toLowerCase().trim();
            
            // Jika parameter tidak ada di daftar, beri urutan besar (99) agar tampil di paling bawah
            const orderA = parameterOrder[nameA] ?? 99;
            const orderB = parameterOrder[nameB] ?? 99;
            
            return orderA - orderB;
        });

        // Gunakan hasil sort (sortedParameters) untuk diproses ke baris Excel
        sortedParameters.forEach(p => {
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
            const finalDisplayResult = formatResultWithLOQ(pOriginal, processedValue);
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
                "No.": "", // Bisa diisi manual atau dibiarkan kosong untuk Excel
                "Testing Parameter": pOriginal,
                "Sample Result": finalDisplayResult, 
                "Regulatory Limit": limit,
                "Unit": displayUnit,
                "Methods": p.method || '-'
            });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Analisa");

    const cleanName = (docInfo.company_name || 'CoA').replaceAll(/[/\\?%*:|"<>]/g, '-');
    const fileName = `CoA_${cleanName}_${Date.now()}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
}
// Data master dari query INSERT Anda
// Pastikan properti menggunakan 'metode' agar konsisten dengan logika pencarian
let masterEmisi = []

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
            .select('parameter, metode, baku_mutu, unit, regulasi');

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
    "nox": 2.0,
    "no": 2.0,
    "co": 1.0,
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

    if (pName.includes('no2')) {
        loq = 1.88;
    } else if (pName.includes('so2')) {
        loq = 2.61;
    } else if (pName.includes('co') && !pName.includes('co2')) {
        loq = 2; // S7748: Gunakan 2 bukan 2.0
    } else if (pName.includes('partic')) {
        loq = 1.2;
    } else if (pName.includes('opacit') || pName.includes('opasitas')) {
        loq = 20; // Tambahkan LOQ Opasitas di sini
    }
    if (loq !== undefined) {
        if (Number.isNaN(numValue) || numValue < loq) {
            return `< ${loq}`;
        }
    }
    return Number.isNaN(numValue) ? value : numValue.toFixed(2);
}
