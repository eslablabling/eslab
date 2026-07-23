// logger.js

// 1. Fungsi Helper untuk Encode & Decode UTF-8 Base64
function utoa(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}

function atou(str) {
    return decodeURIComponent(atob(str).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

window.addEventListener('auth-ready', async (e) => {
    fetchLogs(); 
});

async function fetchLogs() {
    const tableBody = document.getElementById('log-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Memuat data log...</td></tr>';

    const { data: logs, error } = await _supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Error: ${error.message}</td></tr>`;
        return;
    }

    if (logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada aktivitas log.</td></tr>';
        return;
    }

    tableBody.innerHTML = ''; 

    logs.forEach(log => {
        const date = new Date(log.created_at).toLocaleString('id-ID');
        
        // Pilih class badge berdasarkan aksi
        const action = log.action_type || 'INFO';
        let badgeClass = 'bg-secondary';
        
        const greenActions = ['INSERT', 'CREATE_COC', 'RECEIVE_SAMPLE', 'INPUT_ANALYSIS', 'VERIFY_ANALYSIS', 'VERIFY_SAMPLING', 'VERIFY_COA', 'LOGIN'];
        const orangeActions = ['UPDATE', 'UPDATE_COC', 'EDIT_RECEIPT_DATE', 'EDIT_ANALYSIS'];
        const redActions = ['DELETE', 'DELETE_COC', 'UNRECEIVE_SAMPLE', 'UNVERIFY_SAMPLING', 'UNVERIFY_COA', 'LOGOUT'];

        if (greenActions.includes(action)) badgeClass = 'bg-success';
        else if (orangeActions.includes(action)) badgeClass = 'bg-warning text-dark';
        else if (redActions.includes(action)) badgeClass = 'bg-danger';

        // Encode data lama dan baru menggunakan utoa (UTF-8 safe)
        const oldDataB64 = utoa(JSON.stringify(log.old_data || null));
        const newDataB64 = utoa(JSON.stringify(log.new_data || null));

        const row = `
            <tr>
                <td><small class="text-muted">${date}</small></td>
                <td><strong>${log.username || 'System'}</strong></td>
                <td><span class="badge ${badgeClass}">${action}</span></td>
                <td><code class="text-primary">${log.table_name || '-'}</code></td>
                <td>
                    <div class="d-flex flex-column">
                        <small class="text-muted mb-1">${log.description || 'Tidak ada deskripsi'}</small>
                        <button class="btn btn-outline-primary btn-sm w-fit" 
                                onclick="showDiff('${oldDataB64}', '${newDataB64}', '${action}')">
                            🔍 Cek Perubahan
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// Fungsi pembantu untuk membandingkan array detail sampel secara rekursif
function diffSamplesData(oldSamples, newSamples) {
    if (!Array.isArray(oldSamples) || !Array.isArray(newSamples)) {
        return "Detail sampel tidak valid.";
    }
    
    let html = "<ul style='padding-left: 15px; margin: 0; font-size: 0.8rem;'>";
    let changesFound = false;

    // Map by sample_id
    const oldMap = {};
    oldSamples.forEach(s => { oldMap[s.sample_id] = s; });
    const newMap = {};
    newSamples.forEach(s => { newMap[s.sample_id] = s; });

    const allSampleIds = [...new Set([...Object.keys(oldMap), ...Object.keys(newMap)])];

    allSampleIds.forEach(id => {
        const oldS = oldMap[id];
        const newS = newMap[id];

        if (!oldS && newS) {
            changesFound = true;
            html += `<li><span class="text-success fw-bold">[DITAMBAH]</span> Titik Uji Sampel <strong>${id}</strong> (${newS.description || ''})</li>`;
        } else if (oldS && !newS) {
            changesFound = true;
            html += `<li><span class="text-danger fw-bold">[DIHAPUS]</span> Titik Uji Sampel <strong>${id}</strong> (${oldS.description || ''})</li>`;
        } else if (oldS && newS) {
            let sampleChanges = [];

            if (oldS.description !== newS.description) {
                sampleChanges.push(`Nama Titik Uji: "${oldS.description || ''}" &rarr; "${newS.description || ''}"`);
            }
            if (oldS.tgl_terima_lab !== newS.tgl_terima_lab) {
                sampleChanges.push(`Tanggal Terima Lab: "${oldS.tgl_terima_lab || '-'}" &rarr; "${newS.tgl_terima_lab || '-'}"`);
            }
            if (oldS.status_lab !== newS.status_lab) {
                sampleChanges.push(`Status Lab: "${oldS.status_lab || '-'}" &rarr; "${newS.status_lab || '-'}"`);
            }
            if (JSON.stringify(oldS.regulations) !== JSON.stringify(newS.regulations)) {
                sampleChanges.push(`Regulasi: [${(oldS.regulations || []).join(', ')}] &rarr; [${(newS.regulations || []).join(', ')}]`);
            }

            // Bandingkan parameter
            const oldParams = oldS.parameters || [];
            const newParams = newS.parameters || [];
            const oldParamMap = {};
            oldParams.forEach(p => { oldParamMap[p.parameter] = p; });
            const newParamMap = {};
            newParams.forEach(p => { newParamMap[p.parameter] = p; });

            const allParams = [...new Set([...Object.keys(oldParamMap), ...Object.keys(newParamMap)])];

            allParams.forEach(pName => {
                const oldP = oldParamMap[pName];
                const newP = newParamMap[pName];

                if (!oldP && newP) {
                    sampleChanges.push(`Parameter ditambahkan: <strong>${pName}</strong> (Metode: ${newP.method || '-'})`);
                } else if (oldP && !newP) {
                    sampleChanges.push(`Parameter dihapus: <strong>${pName}</strong>`);
                } else if (oldP && newP) {
                    if (oldP.method !== newP.method) {
                        sampleChanges.push(`Metode <strong>${pName}</strong>: "${oldP.method || '-'}" &rarr; "${newP.method || '-'}"`);
                    }
                    if (oldP.result !== newP.result) {
                        sampleChanges.push(`Hasil <strong>${pName}</strong>: "${oldP.result || '-'}" &rarr; "${newP.result || '-'}"`);
                    }

                    // Bandingkan data timbang grav/qc
                    const allTimbangKeys = [...new Set([
                        ...Object.keys(oldP.qc_data || {}), ...Object.keys(newP.qc_data || {}),
                        ...Object.keys(oldP.grav_data || {}), ...Object.keys(newP.grav_data || {})
                    ])];

                    allTimbangKeys.forEach(k => {
                        const oldVal = (oldP.qc_data?.[k] !== undefined) ? oldP.qc_data[k] : oldP.grav_data?.[k];
                        const newVal = (newP.qc_data?.[k] !== undefined) ? newP.qc_data[k] : newP.grav_data?.[k];
                        if (oldVal !== newVal) {
                            sampleChanges.push(`Data timbang <strong>${pName} (${k})</strong>: "${oldVal || '-'}" &rarr; "${newVal || '-'}"`);
                        }
                    });
                }
            });

            if (sampleChanges.length > 0) {
                changesFound = true;
                html += `<li>Sampel <strong>${id}</strong>: <ul style="padding-left: 15px; margin: 2px 0;">`;
                sampleChanges.forEach(sc => {
                    html += `<li>${sc}</li>`;
                });
                html += `</ul></li>`;
            }
        }
    });

    html += "</ul>";
    return changesFound ? html : "Tidak ada perubahan nilai data sampel.";
}

// Fungsi untuk menampilkan perbandingan data
function showDiff(oldB64, newB64, action) {
    try {
        const oldData = JSON.parse(atou(oldB64)) || {};
        const newData = JSON.parse(atou(newB64)) || {};
        const modalBody = document.getElementById('modalContent');
        const modalTitle = document.getElementById('logModalLabel');
        
        modalTitle.innerText = `Detail Perubahan: ${action}`;
        let htmlContent = "";

        const hasOld = oldData && Object.keys(oldData).length > 0;
        const hasNew = newData && Object.keys(newData).length > 0;

        if (hasOld && hasNew) {
            const allKeys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];
            let rowsHtml = "";
            let anyChange = false;

            allKeys.forEach(key => {
                // Abaikan kolom sistem agar tidak memenuhi tampilan
                if (['updated_at', 'created_at', 'created_by', 'id'].includes(key)) return;

                const valOld = oldData[key];
                const valNew = newData[key];

                // Hanya proses jika nilainya BERBEDA
                if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
                    anyChange = true;
                    
                    let displayOld = "";
                    let displayNew = "";
                    
                    if (key === 'samples_data') {
                        displayOld = `<div style="max-height: 250px; overflow-y: auto; text-align: left;">${diffSamplesData(valOld, valNew)}</div>`;
                        displayNew = `<div class="text-success fw-bold text-center" style="vertical-align: middle;">Pembaruan Detail Sampel Berhasil</div>`;
                    } else {
                        displayOld = valOld !== undefined ? formatValue(valOld) : '<small><i>(kosong)</i></small>';
                        displayNew = valNew !== undefined ? formatValue(valNew) : '<small><i>(dihapus)</i></small>';
                    }

                    rowsHtml += `
                        <tr>
                            <td class="fw-bold bg-light" style="width: 25%; font-size: 0.85rem;">${key}</td>
                            <td class="text-danger" style="width: 37.5%; font-size: 0.85rem; background-color: #fff8f8; vertical-align: top;">
                                ${displayOld}
                            </td>
                            <td class="text-success fw-bold" style="width: 37.5%; font-size: 0.85rem; background-color: #f8fff8; vertical-align: top;">
                                ${displayNew}
                            </td>
                        </tr>`;
                }
            });

            if (!anyChange) {
                htmlContent = `<div class="alert alert-info m-0">Hanya terjadi pembaruan sistem (timestamp), tidak ada nilai data yang berubah.</div>`;
            } else {
                htmlContent = `
                    <table class="table table-bordered align-middle mb-0">
                        <thead class="table-dark">
                            <tr>
                                <th>Kolom</th>
                                <th>Lama</th>
                                <th>Baru</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>`;
            }
        } else {
            // Untuk INSERT/DELETE/LOGIN: Tampilkan ringkasan saja, bukan JSON mentah
            const data = hasNew ? newData : oldData;
            let summaryHtml = "";
            
            // Ambil kunci utama
            const mainKeys = ['nomor_coc', 'company_name', 'full_name', 'role', 'parameter', 'description', 'qt_no'];
            if (data) {
                mainKeys.forEach(k => {
                    if (data[k]) summaryHtml += `<li><strong>${k}:</strong> ${data[k]}</li>`;
                });
            }

            htmlContent = `
                <div class="alert ${action.includes('CREATE') || action === 'INSERT' ? 'alert-success' : 'alert-danger'} border-0">
                    <h6>Ringkasan Data ${action}:</h6>
                    <ul class="mb-0">${summaryHtml || '<li>Aktivitas tercatat tanpa detail ringkasan</li>'}</ul>
                </div>
                <details>
                    <summary class="text-muted small mt-2" style="cursor:pointer">Lihat JSON Lengkap</summary>
                    <pre class="mt-2 p-2 bg-white border small">${JSON.stringify(data, null, 2)}</pre>
                </details>`;
        }

        modalBody.innerHTML = htmlContent;
        new bootstrap.Modal(document.getElementById('logModal')).show();

    } catch (err) {
        console.error("Gagal Diff:", err);
        alert("Gagal memproses data perubahan.");
    }
}

// Fungsi helper agar tampilan object (seperti samples_data) tidak berantakan
function formatValue(val) {
    if (typeof val === 'object' && val !== null) {
        return `<code style="font-size: 11px;">{Object/Array}</code>`;
    }
    return val;
}

// Auto-initialized via auth-ready listener above