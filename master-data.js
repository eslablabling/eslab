
let currentUserRole = '';
const paramTableBody = document.getElementById('paramTableBody');
let currentEditId = null; // Untuk melacak apakah kita sedang edit atau tambah baru

window.addEventListener('auth-ready', async (e) => {
    const { role } = e.detail;
    currentUserRole = role;
    
    // Check if user is allowed to edit master data
    const isAllowed = ['manager', 'admin_master', 'admin_ts'].includes(role);
    
    // Hide buttons if not allowed
    const btnAdd = document.querySelector('button[onclick="openModal()"]');
    if (btnAdd) {
        btnAdd.style.display = isAllowed ? 'block' : 'none';
    }
    
    const btnImport = document.querySelector('button[onclick*="importFile"]');
    if (btnImport) {
        btnImport.style.display = isAllowed ? 'block' : 'none';
    }
    
    // Jalankan fungsi spesifik halaman ini setelah auth siap
    fetchMasterEmisi();
});

// Fungsi untuk update tampilan Top Bar
function updateTopBar(fullName, role) {
    document.getElementById('userName').innerText = `Halo, ${fullName.split(' ')[0]}!`;
    document.getElementById('userFullName').innerText = fullName;
    document.getElementById('userRoleDisplay').innerText = role.replace('_', ' ');
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('id-ID', options);
}

// --- LOGIKA FETCH DATA MASTER ---

async function fetchMasterEmisi() {
    const { data, error } = await _supabase
        .from('master_emisi') 
        .select('*')
        .order('regulasi', { ascending: true })
        .order('parameter', { ascending: true });

    if (error) {
        paramTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data.</td></tr>`;
        return;
    }
    renderTable(data);
}

// --- LOGIKA RENDER TABEL (Rowspan Logic) ---

function renderTable(data) {
    paramTableBody.innerHTML = "";
    let currentReg = "";
    let currentParam = "";

    const isAllowed = ['manager', 'admin_master', 'admin_ts'].includes(currentUserRole);

    // Hide or show action header
    const actionHeader = document.querySelector('.action-header');
    if (actionHeader) {
        actionHeader.style.display = isAllowed ? 'table-cell' : 'none';
    }

    data.forEach((item) => {
        const tr = document.createElement('tr');
        
        // 1. Grouping Regulasi
        if (item.regulasi !== currentReg) {
            const regCount = data.filter(d => d.regulasi === item.regulasi).length;
            tr.innerHTML += `
                <td rowspan="${regCount}" style="vertical-align: top; font-weight: 800; color: #1e40af; border-right: 2px solid #e2e8f0; background: #fff; padding: 15px;">
                    ${item.regulasi}
                </td>`;
            currentReg = item.regulasi;
            currentParam = ""; // Reset parameter setiap kali regulasi berganti
        }

        // 2. Grouping Parameter (Hanya gabung jika regulasi & parameter sama)
        if (item.parameter !== currentParam) {
            const paramCount = data.filter(d => 
                d.regulasi === item.regulasi && 
                d.parameter === item.parameter
            ).length;
            
            tr.innerHTML += `
                <td rowspan="${paramCount}" style="font-weight: 700; vertical-align: middle; background: #fff; border-right: 1px solid #f1f5f9;">
                    ${item.parameter}
                </td>`;
            currentParam = item.parameter;
        }

        let actionCellHtml = '';
        if (isAllowed) {
            actionCellHtml = `
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon" onclick="editData('${item.id}')">📝</button>
                        <button class="btn-icon" onclick="deleteData('${item.id}')">🗑️</button>
                    </div>
                </td>
            `;
        }

        // 3. Sisanya (Metode, Baku Mutu, Aksi)
        tr.innerHTML += `
            <td><span class="badge-method">${item.metode}</span></td>
            <td style="text-align:center;">${item.satuan || '-'}</td>
            <td style="font-weight: 800; color: #dc2626; text-align: center;">${item.baku_mutu || '-'}</td>
            <td style="text-align:center; color: #059669; font-weight: bold;">${item.koreksi_o2 ? item.koreksi_o2 + '%' : '-'}</td>
            ${actionCellHtml}
        `;
        paramTableBody.appendChild(tr);
    });
}
// --- FUNGSI LOGOUT (Clear Session) ---

async function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    }
}



// Tambahkan listener untuk menutup modal jika user klik di luar area modal
window.onclick = function(event) {
    const modal = document.getElementById('modalParam');
    if (event.target == modal) closeModal();
}

// --- LOGIKA SIMPAN DATA KE SUPABASE ---

document.getElementById('formMaster').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const isAllowed = ['manager', 'admin_master', 'admin_ts'].includes(currentUserRole);
    if (!isAllowed) {
        alert("Akses ditolak: Anda tidak memiliki wewenang untuk mengubah master data.");
        return;
    }
    
    const regulasiValue = document.getElementById('regulasi').value;
    const paramRows = document.querySelectorAll('.param-row');
    
    if (currentEditId) {
    // --- LOGIKA UPDATE (Ditingkatkan agar bisa tambah metode saat edit) ---
    const row = paramRows[0];
    const allMethods = row.querySelectorAll('.method-name'); // Ambil SEMUA input metode
    
    const updateData = {
        regulasi: regulasiValue,
        parameter: row.querySelector('.param-name').value,
        metode: allMethods[0].value, // Update metode yang pertama
        baku_mutu: row.querySelector('.baku-mutu').value ? parseFloat(row.querySelector('.baku-mutu').value) : null
    };

    // 1. Update data yang lama
    const { error: updateError } = await _supabase
        .from('master_emisi')
        .update(updateData)
        .eq('id', currentEditId);

    if (updateError) return alert("Gagal update: " + updateError.message);

    // 2. PERBAIKAN: Jika user menambah metode baru (klik tanda +) saat edit
    if (allMethods.length > 1) {
        let newMethods = [];
        for (let i = 1; i < allMethods.length; i++) {
            newMethods.push({
                regulasi: updateData.regulasi,
                parameter: updateData.parameter,
                metode: allMethods[i].value,
                baku_mutu: updateData.baku_mutu
            });
        }
        // Masukkan metode tambahan sebagai data baru di database
        await _supabase.from('master_emisi').insert(newMethods);
    }
    
    alert("Data berhasil diperbaiki!");

} else {
    // --- LOGIKA INSERT BANYAK (Ini sudah benar, tidak perlu dirubah) ---
    let dataToInsert = [];
    paramRows.forEach(row => {
        const methods = row.querySelectorAll('.method-name');
        methods.forEach(m => {
            // Di dalam event listener submit, bagian mapping data:
        const rowData = {
            regulasi: regulasiValue,
            parameter: row.querySelector('.param-name').value,
            satuan: row.querySelector('.satuan').value, // Ambil Satuan
            metode: m.value,
            baku_mutu: row.querySelector('.baku-mutu').value ? parseFloat(row.querySelector('.baku-mutu').value) : null,
            koreksi_o2: row.querySelector('.koreksi-o2').value ? parseFloat(row.querySelector('.koreksi-o2').value) : null // Ambil O2
        };
        });
    });

    const { error } = await _supabase.from('master_emisi').insert(dataToInsert);
    if (error) alert("Gagal simpan: " + error.message);
    else alert("Data berhasil ditambahkan!");
}

    currentEditId = null; // Reset ID
    closeModal();
    fetchMasterEmisi();
});

// --- FITUR SEARCH (Filter Tabel secara Real-time) ---
document.getElementById('searchBar').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#paramTableBody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// --- FUNGSI HAPUS DATA ---
async function deleteData(id) {
    const isAllowed = ['manager', 'admin_master', 'admin_ts'].includes(currentUserRole);
    if (!isAllowed) {
        alert("Akses ditolak: Anda tidak memiliki wewenang untuk mengubah master data.");
        return;
    }

    if (confirm("Apakah Anda yakin ingin menghapus parameter ini dari Master Data?")) {
        try {
            const { error } = await _supabase
                .from('master_emisi')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert("Data berhasil dihapus.");
            fetchMasterEmisi(); // Refresh tabel
        } catch (error) {
            alert("Gagal menghapus: " + error.message);
        }
    }
}

async function editData(id) {
    const isAllowed = ['manager', 'admin_master', 'admin_ts'].includes(currentUserRole);
    if (!isAllowed) {
        alert("Akses ditolak: Anda tidak memiliki wewenang untuk mengubah master data.");
        return;
    }
    const { data: item, error } = await _supabase
        .from('master_emisi')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return alert("Gagal mengambil data");

    currentEditId = id; // Simpan ID yang sedang diedit
    openModal();
    
    document.querySelector('#modalParam h2').innerText = "📝 Edit Parameter (Perbaikan Typo)";
    document.getElementById('regulasi').value = item.regulasi;

    const container = document.getElementById('parameterContainer');
    container.innerHTML = ""; 
    
    // Gunakan template untuk membuat satu baris
    addParameterRow();
    
    // Isi baris tersebut dengan data yang typo tadi
    const row = container.querySelector('.param-row');
    row.querySelector('.param-name').value = item.parameter;
    row.querySelector('.satuan').value = item.satuan || ''; // Load Satuan
    row.querySelector('.baku-mutu').value = item.baku_mutu;
    row.querySelector('.koreksi-o2').value = item.koreksi_o2 || ''; // Load O2
    row.querySelector('.method-name').value = item.metode;

    // Sembunyikan tombol "Tambah Parameter Lain" saat mode edit tunggal agar tidak bingung
    document.querySelector('button[onclick="addParameterRow()"]').style.display = 'none';
}

window.closeModal = () => {
    document.getElementById('modalParam').style.display = 'none';
    document.getElementById('formMaster').reset();
    currentEditId = null; // Reset mode edit
    document.querySelector('#modalParam h2').innerText = "🛠️ Tambah Master Data";
    document.querySelector('button[onclick="addParameterRow()"]').style.display = 'block';
};

// Simpan template baris parameter di variabel global (di luar fungsi)
// 1. Deklarasikan template di luar agar bisa diakses semua fungsi
let paramRowTemplate = null;

function setupDynamicInputs() {
    // 2. Ambil template baris PERTAMA KALI saat halaman dimuat
    if (!paramRowTemplate) {
        const firstRow = document.querySelector('.param-row');
        if (firstRow) {
            paramRowTemplate = firstRow.cloneNode(true);
        }
    }

    window.openModal = () => {
        document.getElementById('modalParam').style.display = 'block';
    };

    window.closeModal = () => {
        document.getElementById('modalParam').style.display = 'none';
        document.getElementById('formMaster').reset();
        
        const container = document.getElementById('parameterContainer');
        container.innerHTML = "";
        if (paramRowTemplate) {
            container.appendChild(paramRowTemplate.cloneNode(true));
        }
        
        currentEditId = null;
        document.querySelector('#modalParam h2').innerText = "🛠️ Tambah Master Data";
        document.querySelector('button[onclick="addParameterRow()"]').style.display = 'block';
    };

    // --- TAMBAHKAN DUA FUNGSI DI BAWAH INI ---

    // Fungsi untuk menambah baris parameter baru
    window.addParameterRow = () => {
        const container = document.getElementById('parameterContainer');
        if (paramRowTemplate) {
            const newRow = paramRowTemplate.cloneNode(true);
            // Reset input di baris baru
            newRow.querySelectorAll('input').forEach(input => input.value = '');
            // Sisakan hanya satu input metode
            const methodGroups = newRow.querySelectorAll('.method-input-group');
            for (let i = 1; i < methodGroups.length; i++) methodGroups[i].remove();
            
            container.appendChild(newRow);
        }
    };

    // Fungsi untuk menambah input metode dalam satu baris
    window.addMethodInput = (btn) => {
        const methodList = btn.closest('.method-list');
        const div = document.createElement('div');
        div.className = 'method-input-group';
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.marginTop = '8px';
        div.innerHTML = `
            <input type="text" class="method-name form-control" placeholder="Metode lainnya..." required style="flex:1;">
            <button type="button" onclick="this.parentElement.remove()" ...>✕</button>
        `;
        methodList.appendChild(div);
    };
}

// Tambahkan ini di akhir fungsi fetchMasterEmisi
function updateRegulasiDatalist(data) {
    const datalist = document.getElementById('listRegulasi');
    if (!datalist) return;

    // Mengambil nama regulasi yang unik (tidak duplikat)
    const uniqueRegs = [...new Set(data.map(item => item.regulasi))];
    
    // Masukkan ke dalam datalist
    datalist.innerHTML = uniqueRegs
        .map(reg => `<option value="${reg}">`)
        .join('');
}

async function fetchMasterEmisi() {
    // Ambil data dengan urutan yang BENAR (agar tabel tidak berantakan)
    const { data, error } = await _supabase
        .from('master_emisi') 
        .select('*')
        .order('regulasi', { ascending: true }) // Utama: Regulasi
        .order('parameter', { ascending: true }); // Kedua: Parameter

    if (error) {
        console.error("Gagal memuat data:", error);
        paramTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data.</td></tr>`;
        return;
    }

    // 1. Render Tabel (Agar rapi)
    renderTable(data);
    
    // 2. Update Datalist (Agar bisa auto-complete)
    // Pastikan fungsi ini dipanggil dengan membawa variabel 'data'
    updateRegulasiDatalist(data); 
}

async function exportToExcel() {
    const { data, error } = await _supabase.from('master_emisi').select('*');
    
    if (error) return alert("Gagal mengambil data untuk export");

    // Format data agar header Excel lebih rapi
    const formattedData = data.map(item => ({
        'Dasar Regulasi': item.regulasi,
        'Parameter Uji': item.parameter,
        'Satuan': item.satuan,
        'Metode Analisa': item.metode,
        'Baku Mutu': item.baku_mutu,
        'Koreksi O2 (%)': item.koreksi_o2
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master_Emisi");

    // Download file
    XLSX.writeFile(workbook, `Master_Emisi_Envirotama_${new Date().toLocaleDateString()}.xlsx`);
}

async function importFromExcel(event) {
    const isAllowed = ['manager', 'admin_master', 'admin_ts'].includes(currentUserRole);
    if (!isAllowed) {
        alert("Akses ditolak: Anda tidak memiliki wewenang untuk mengimpor master data.");
        return;
    }
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataArray = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataArray, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // 1. Map data dari Excel ke format database
        const dataToUpsert = jsonData.map(row => ({
            regulasi: row['Dasar Regulasi'],
            parameter: row['Parameter Uji'],
            satuan: row['Satuan'],
            metode: row['Metode Analisa'],
            baku_mutu: row['Baku Mutu'] ? parseFloat(row['Baku Mutu']) : null,
            koreksi_o2: row['Koreksi O2 (%)'] ? parseFloat(row['Koreksi O2 (%)']) : null
        }));

        if (confirm(`Sistem akan memperbarui data yang sudah ada dan menambah data baru dari ${dataToUpsert.length} baris Excel. Lanjutkan?`)) {
            
            // 2. Gunakan onConflict untuk memberitahu Supabase 
            // kolom mana yang menjadi acuan "Unik"
            const { error } = await _supabase
                .from('master_emisi')
                .upsert(dataToUpsert, { 
                    onConflict: 'regulasi, parameter, metode' 
                });

            if (error) {
                alert("Gagal import/update: " + error.message);
            } else {
                alert("Berhasil sinkronisasi data Excel ke Database!");
                fetchMasterEmisi();
            }
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ""; 
}
