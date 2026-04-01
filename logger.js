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

async function initLogger() {
    if (typeof _supabase === 'undefined') {
        console.error("Koneksi Supabase belum siap!");
        return;
    }

    const { data: { user }, error } = await _supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }
    
    console.log("Logger diinisialisasi untuk:", user.email);
    fetchLogs(); 
}

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
        if (action === 'INSERT') badgeClass = 'badge-insert';
        if (action === 'UPDATE') badgeClass = 'badge-update';
        if (action === 'DELETE') badgeClass = 'badge-delete';
        if (action === 'LOGIN') badgeClass = 'bg-info text-dark';  // Warna biru muda
        if (action === 'LOGOUT') badgeClass = 'bg-dark text-white'; // Warna hitam

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

// Fungsi untuk menampilkan perbandingan data
function showDiff(oldB64, newB64, action) {
    try {
        const oldData = JSON.parse(atou(oldB64)) || {};
        const newData = JSON.parse(atou(newB64)) || {};
        const modalBody = document.getElementById('modalContent');
        const modalTitle = document.getElementById('logModalLabel');
        
        modalTitle.innerText = `Detail Perubahan: ${action}`;
        let htmlContent = "";

        if (action === 'UPDATE') {
            const allKeys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];
            let rowsHtml = "";
            let anyChange = false;

            allKeys.forEach(key => {
                // Abaikan kolom sistem agar tidak memenuhi tampilan
                if (['updated_at', 'created_at'].includes(key)) return;

                const valOld = oldData[key];
                const valNew = newData[key];

                // Hanya proses jika nilainya BERBEDA
                if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
                    anyChange = true;
                    rowsHtml += `
                        <tr>
                            <td class="fw-bold bg-light" style="width: 30%; font-size: 0.85rem;">${key}</td>
                            <td class="text-danger" style="width: 35%; font-size: 0.85rem; background-color: #fff8f8;">
                                ${valOld !== undefined ? formatValue(valOld) : '<small><i>(kosong)</i></small>'}
                            </td>
                            <td class="text-success fw-bold" style="width: 35%; font-size: 0.85rem; background-color: #f8fff8;">
                                ${valNew !== undefined ? formatValue(valNew) : '<small><i>(dihapus)</i></small>'}
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
            const data = newData || oldData;
            let summaryHtml = "";
            
            // Ambil 3-4 kunci utama saja agar tidak kepanjangan
            const mainKeys = ['nomor_coc', 'company_name', 'full_name', 'role', 'parameter'];
            mainKeys.forEach(k => {
                if (data[k]) summaryHtml += `<li><strong>${k}:</strong> ${data[k]}</li>`;
            });

            htmlContent = `
                <div class="alert ${action === 'INSERT' ? 'alert-success' : 'alert-danger'} border-0">
                    <h6>Ringkasan Data ${action}:</h6>
                    <ul class="mb-0">${summaryHtml || '<li>Lihat detail di konsol untuk data lengkap</li>'}</ul>
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
        // Jika data berupa JSON, kita ringkas tampilannya
        return `<code style="font-size: 11px;">{Object/Array}</code>`;
    }
    return val;
}

initLogger();