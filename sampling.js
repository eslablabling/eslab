let currentCocId = null;
let samplesDataArray = [];
let activeTab = 'identitas';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Pastikan Sesi Auth Valid sebelum memuat data berat
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        // Jika tidak ada sesi, biarkan auth.js yang menangani redirect
        return; 
    }

    // 2. Jika sesi aman, muat data sampling
    console.log("Sesi diverifikasi, memuat data sampling...");
    await fetchSamplingData();

    // 3. Inisialisasi Event Listeners (Gunakan Optional Chaining ?. untuk keamanan)
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
});

// 1. Ambil data dari Supabase
async function fetchSamplingData(keyword = '') {
    let query = _supabase.from('coc_emisi').select('*').order('created_at', { ascending: false });
    if (keyword) query = query.or(`nomor_coc.ilike.%${keyword}%,company_name.ilike.%${keyword}%`);

    const { data, error } = await query;
    if (error) return console.error("Fetch Error:", error);
    renderTable(data);
}

// 2. Render Tabel Utama
function renderTable(data) {
    const tbody = document.getElementById('samplingTableBody');
    tbody.innerHTML = data.map(item => {
        const total = item.samples_data ? item.samples_data.length : 0;
        const done = item.samples_data ? item.samples_data.filter(s => s.status === 'Done').length : 0;
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px; font-weight: 800; color: #2563eb;">${item.nomor_coc}</td>
                <td>${item.company_name}</td>
                <td>${item.sampling_date || '-'}</td>
                <td><small>${done} / ${total} Selesai</small></td>
                <td><span class="status-badge ${item.status_sampling === 'Selesai' ? 'badge-done' : 'badge-progress'}">${item.status_sampling || 'Pending'}</span></td>
                <td><button class="btn-input" onclick="openSamplingModal('${item.id}')">INPUT DATA</button></td>
            </tr>`;
    }).join('');
}

// 3. Logika Modal & Tab
async function openSamplingModal(id) {
    const { data, error } = await _supabase.from('coc_emisi').select('*').eq('id', id).single();
    if (error) return alert("Gagal mengambil detail");

    currentCocId = id;
    samplesDataArray = data.samples_data || [];
    activeTab = 'identitas'; 
    
    document.getElementById('mdlNoCoc').innerText = data.nomor_coc;
    document.getElementById('mdlCompany').innerText = data.company_name;
    
    renderTabNavigation();
    renderSamplingForm();
    document.getElementById('modalSamplingInput').style.display = 'flex';
}

function renderTabNavigation() {
    const navHtml = `
        <div class="modal-tabs" style="display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; overflow-x: auto;">
            <button class="tab-btn ${activeTab === 'identitas' ? 'active' : ''}" onclick="switchTab('identitas')">📋 IDENTITAS & METEO</button>
            <button class="tab-btn ${activeTab === 'gas' ? 'active' : ''}" onclick="switchTab('gas')">📟 GAS DIRECT</button>
            <button class="tab-btn ${activeTab === 'opacity' ? 'active' : ''}" onclick="switchTab('opacity')">☁️ OPASITAS</button>
            <button class="tab-btn ${activeTab === 'isokinetic' ? 'active' : ''}" onclick="switchTab('isokinetic')">🏗️ ISOKINETIK</button>
        </div>
    `;
    const container = document.getElementById('samplingDetailContainer');
    if(!document.querySelector('.modal-tabs')) {
        container.insertAdjacentHTML('beforebegin', navHtml);
    } else {
        document.querySelector('.modal-tabs').outerHTML = navHtml;
    }
}

function switchTab(tabName) {
    activeTab = tabName;
    renderTabNavigation();
    renderSamplingForm();
}

// 4. Render Form Berdasarkan Tab
function renderSamplingForm() {
    const container = document.getElementById('samplingDetailContainer');
    
    container.innerHTML = samplesDataArray.map((s, idx) => {
        // --- LOGIKA AWAL (Identitas & Meteo) ---
        if (activeTab === 'identitas') {
            return `
            <div class="sampling-card-item">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0; color:#0f172a;">📍 ${s.sample_id} - ${s.description || ''}</h4>
                    <select class="inp-field" style="width:120px; font-weight:700;" onchange="updateLocalData(${idx}, 'status', this.value)">
                        <option value="Pending" ${s.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Done" ${s.status === 'Done' ? 'selected' : ''}>Done</option>
                    </select>
                </div>
                <div class="grid-field">
                    <div><label class="input-label">Nama Cerobong</label><input type="text" class="inp-field" value="${s.nama_cerobong || s.description || ''}" oninput="updateLocalData(${idx}, 'nama_cerobong', this.value)"></div>
                    <div><label class="input-label">Bahan Bakar</label><input type="text" class="inp-field" value="${s.bahan_bakar || ''}" oninput="updateLocalData(${idx}, 'bahan_bakar', this.value)"></div>
                    <div><label class="input-label">Koordinat</label><input type="text" class="inp-field" value="${s.koordinat || ''}" oninput="updateLocalData(${idx}, 'koordinat', this.value)"></div>
                    <div><label class="input-label">Tgl Sampling</label><input type="date" class="inp-field" value="${s.tgl_sampling || ''}" oninput="updateLocalData(${idx}, 'tgl_sampling', this.value)"></div>
                </div>
                <div style="background:#f8fafc; padding:15px; border-radius:10px; margin-top:15px; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; border: 1px solid #e2e8f0;">
                    <div><label class="input-label">Ambien (°C)</label><input type="number" step="0.1" class="inp-field" value="${s.temp_ambien || ''}" oninput="updateLocalData(${idx}, 'temp_ambien', this.value)"></div>
                    <div><label class="input-label">Lembab (%)</label><input type="number" step="0.1" class="inp-field" value="${s.kelembaban || ''}" oninput="updateLocalData(${idx}, 'kelembaban', this.value)"></div>
                    <div><label class="input-label">Kec. Angin (m/s)</label><input type="number" step="0.1" class="inp-field" value="${s.kec_angin || ''}" oninput="updateLocalData(${idx}, 'kec_angin', this.value)"></div>
                    <div><label class="input-label">Cuaca</label><input type="text" class="inp-field" placeholder="Cerah" value="${s.catatan_cuaca || ''}" oninput="updateLocalData(${idx}, 'catatan_cuaca', this.value)"></div>
                </div>
            </div>`;
        }

       if (activeTab === 'gas') {
            // 1. Urutan tampilan
            const insituOrder = [
                { key: /Nitrogen Monoxide|NO\)/i, label: 'NO' },
                { key: /Nitrogen Dioxide|NO2\)/i, label: 'NO2' },
                { key: /Nitrogen Oxide|NOx\)/i, label: 'NOX' },
                { key: /Sulfur Dioxide|SO2\)/i, label: 'SO2' },
                { key: /Carbon Monoxide|CO\)/i, label: 'CO' },
                { key: /Oxygen|O2\)/i, label: 'O2' },
                { key: /Carbon Dioxide|CO2\)/i, label: 'CO2' },
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
                        <input type="number" step="0.01" class="inp-field" id="inp-${idx}-${actualPIdx}-konsentrasi_1" value="${currentP.konsentrasi_1 || ''}" ${isNox ? 'readonly style="background:#f1f5f9;"' : ''} onchange="updateParamFieldWithLogic(${idx}, ${actualPIdx}, 'konsentrasi_1', this.value)">
                        <input type="number" step="0.01" class="inp-field" id="inp-${idx}-${actualPIdx}-konsentrasi_2" value="${currentP.konsentrasi_2 || ''}" ${isNox ? 'readonly style="background:#f1f5f9;"' : ''} onchange="updateParamFieldWithLogic(${idx}, ${actualPIdx}, 'konsentrasi_2', this.value)">
                        <input type="number" step="0.01" class="inp-field" id="inp-${idx}-${actualPIdx}-konsentrasi_3" value="${currentP.konsentrasi_3 || ''}" ${isNox ? 'readonly style="background:#f1f5f9;"' : ''} onchange="updateParamFieldWithLogic(${idx}, ${actualPIdx}, 'konsentrasi_3', this.value)">
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
                            <input type="time" class="inp-field" style="width:100px; height:30px;" value="${s.waktu_gas || ''}" oninput="updateLocalData(${idx}, 'waktu_gas', this.value)">
                            <input type="text" class="inp-field" style="width:100px; height:30px;" placeholder="No. Alat" value="${s.no_alat_gas || ''}" oninput="updateLocalData(${idx}, 'no_alat_gas', this.value)">
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
                                <input type="number" step="0.1" class="inp-field" value="${s.temp_gas || ''}" oninput="updateLocalData(${idx}, 'temp_gas', this.value)">
                            </div>
                            <div>
                                <label style="font-size:0.65rem; font-weight:800; color:#475569; display:block; margin-bottom:5px;">TEKANAN ATM (mmHg)</label>
                                <input type="number" step="0.1" class="inp-field" value="${s.tekanan_atm || ''}" oninput="updateLocalData(${idx}, 'tekanan_atm', this.value)">
                            </div>
                        </div>
                    </div>
                </div>`;
        } // <--- Pastikan ini adalah penutup activeTab === 'gas'

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
                                    <td><input type="number" class="inp-field" value="${s.jarak_pengamat_awal || ''}" oninput="updateLocalData(${idx}, 'jarak_pengamat_awal', this.value)"></td>
                                    <td><input type="number" class="inp-field" value="${s.jarak_pengamat_akhir || ''}" oninput="updateLocalData(${idx}, 'jarak_pengamat_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Arah Pengamat</td>
                                    <td><input type="text" class="inp-field" value="${s.arah_pengamat_awal || ''}" oninput="updateLocalData(${idx}, 'arah_pengamat_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" value="${s.arah_pengamat_akhir || ''}" oninput="updateLocalData(${idx}, 'arah_pengamat_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Warna Emisi</td>
                                    <td><input type="text" class="inp-field" value="${s.warna_emisi_awal || ''}" oninput="updateLocalData(${idx}, 'warna_emisi_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" value="${s.warna_emisi_akhir || ''}" oninput="updateLocalData(${idx}, 'warna_emisi_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Latar Belakang</td>
                                    <td><input type="text" class="inp-field" value="${s.latar_asap_awal || ''}" oninput="updateLocalData(${idx}, 'latar_asap_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" value="${s.latar_asap_akhir || ''}" oninput="updateLocalData(${idx}, 'latar_asap_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Kondisi Langit</td>
                                    <td><input type="text" class="inp-field" value="${s.kondisi_langit_awal || ''}" oninput="updateLocalData(${idx}, 'kondisi_langit_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" value="${s.kondisi_langit_akhir || ''}" oninput="updateLocalData(${idx}, 'kondisi_langit_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Temp Ambien (°C)</td>
                                    <td><input type="number" class="inp-field" value="${s.temp_ambien_awal || ''}" oninput="updateLocalData(${idx}, 'temp_ambien_awal', this.value)"></td>
                                    <td><input type="number" class="inp-field" value="${s.temp_ambien_akhir || ''}" oninput="updateLocalData(${idx}, 'temp_ambien_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Kelembaban (%)</td>
                                    <td><input type="number" class="inp-field" value="${s.kelembaban_awal || ''}" oninput="updateLocalData(${idx}, 'kelembaban_awal', this.value)"></td>
                                    <td><input type="number" class="inp-field" value="${s.kelembaban_akhir || ''}" oninput="updateLocalData(${idx}, 'kelembaban_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Kec. Angin (m/s)</td>
                                    <td><input type="number" step="0.1" class="inp-field" value="${s.kec_angin_awal || ''}" oninput="updateLocalData(${idx}, 'kec_angin_awal', this.value)"></td>
                                    <td><input type="number" step="0.1" class="inp-field" value="${s.kec_angin_akhir || ''}" oninput="updateLocalData(${idx}, 'kec_angin_akhir', this.value)"></td>
                                </tr>
                                <tr>
                                    <td>Arah Angin</td>
                                    <td><input type="text" class="inp-field" value="${s.arah_angin_awal || ''}" oninput="updateLocalData(${idx}, 'arah_angin_awal', this.value)"></td>
                                    <td><input type="text" class="inp-field" value="${s.arah_angin_akhir || ''}" oninput="updateLocalData(${idx}, 'arah_angin_akhir', this.value)"></td>
                                </tr>
                            </tbody>
                        </table>
                        <div style="margin-top:10px;">
                            <label class="input-label">Deskripsi Emisi</label>
                            <textarea class="inp-field" style="height:40px;" placeholder="Deskripsi tambahan..." oninput="updateLocalData(${idx}, 'desc_emisi', this.value)">${s.desc_emisi || ''}</textarea>
                        </div>
                    </div>

                    <h4 style="color:#065f46; font-size:0.8rem; margin-bottom:10px; display:flex; align-items:center; gap:5px;">
                        📊 HASIL PEMBACAAN (DETIK)
                        <div style="display:flex; gap:5px; margin-left:auto;">
                            <input type="time" class="inp-field" style="width:90px; height:25px; font-size:0.7rem;" value="${s.opasitas_mulai || ''}" oninput="updateLocalData(${idx}, 'opasitas_mulai', this.value)">
                            <span style="font-size:0.7rem; color:#64748b;">s/d</span>
                            <input type="time" class="inp-field" style="width:90px; height:25px; font-size:0.7rem;" value="${s.opasitas_akhir || ''}" oninput="updateLocalData(${idx}, 'opasitas_akhir', this.value)">
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
                                                <input type="number" class="inp-table" style="text-align:center;" 
                                                    value="${s.opasitas_matrix[mIdx][dIdx] || ''}" 
                                                    oninput="updateOpasitasMatrix(${idx}, ${mIdx}, ${dIdx}, this.value)">
                                            </td>
                                        `).join('')}
                                        <td style="border:1px solid #cbd5e1; padding:0;">
                                            <input type="text" class="inp-table" placeholder="..." 
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
                                    <input type="number" step="0.0001" class="inp-field" 
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
                                            <input type="text" class="inp-field" style="background: #fff; font-weight: 600;" 
                                                value="${currentFilterVal}" 
                                                oninput="updateParamField(${idx}, ${pIdx}, 'no_filter', this.value)">
                                        </div>
                                        <div>
                                            <label class="input-label">Vol Gas Meter (m³)</label>
                                            <input type="number" step="0.0001" class="inp-field" 
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


function updateOpasitasMatrix(idx, menitIdx, detikIdx, val) {
    if (!samplesDataArray[idx].opasitas_matrix) {
        samplesDataArray[idx].opasitas_matrix = Array(6).fill().map(() => Array(4).fill(''));
    }
    samplesDataArray[idx].opasitas_matrix[menitIdx][detikIdx] = val;
    calculateOpasitasAverage(idx);
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
}

function updateLocalData(idx, key, val) {
    samplesDataArray[idx][key] = val;
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
    else if (pName === "Velocity") {
        html = `<span style="font-size:0.75rem; color:#334155; font-weight:800; background:#f8fafc; padding:3px 10px; border-radius:6px; border:1px solid #e2e8f0;">Average: ${currentAvg.toFixed(2)} m/s</span>`;
    } 
    else {
        let finalMg = 0;
        let labelText = `Avg: ${currentAvg.toFixed(2)} ppm`;

        if (pName.includes("NOx") || pName.includes("Nitrogen Oxide")) {
            // Gunakan Regex agar lebih aman mencari NO dan NO2
            const no = s.parameters.find(i => /Nitrogen Monoxide|NO\)/i.test(i.parameter));
            const no2 = s.parameters.find(i => /Nitrogen Dioxide|NO2\)/i.test(i.parameter));
            
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