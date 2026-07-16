let currentCocTab = 'form';
let currentPage = 1;
const pageSize = 10;
let filteredCocList = [];
let rawCocListData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Sesi Autentikasi
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    
    if (sessionError || !session) {
        window.location.href = 'index.html'; 
        return;
    }

    // 2. Ambil Profil User
    const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error("Gagal memuat profil:", profileError);
        return;
    }

    // 3. Update UI & Sidebar
    updateTopBar(profile.full_name, profile.role);
    renderSidebar(profile.role);
    
    // 4. Inisialisasi Logika Khusus COC
    await generateCocNumber();    // Membuat nomor ES-COC/2026/... otomatis saat load
    await initQuotationNumber();
    await loadRegulasiDropdown(); // Mengisi list regulasi untuk auto-complete

    // 5. Setup Event Listeners (Logout & Tambah Baris)
        document.addEventListener('click', async (e) => {
            if (e.target && e.target.id === 'btnLogout') {
                if (confirm("Keluar dari sistem?")) {
                    await _supabase.auth.signOut();
                    window.location.href = 'index.html';
                }
            }
        });

    // Tambahkan di dalam document.addEventListener('DOMContentLoaded', ...)
        document.getElementById('nomorCoc').addEventListener('input', (e) => {
            const val = e.target.value;
            const sequenceOnly = val.slice(-4); // Ambil 4 digit terakhir
            
            document.querySelectorAll('#cocBody tr').forEach((row, index) => {
                const input = row.querySelector('.sample-id');
                if(input) {
                    input.value = `${sequenceOnly}.${index + 1}`;
                }
            });
        });

        // 6. Setup Paginasi & Pencarian COC Tersimpan
        const searchKeyword = document.getElementById('searchKeyword');
        if (searchKeyword) {
            searchKeyword.addEventListener('input', (e) => {
                fetchSavedCoc(e.target.value.toLowerCase());
            });
        }

        const btnPrevPage = document.getElementById('btnPrevPage');
        if (btnPrevPage) {
            btnPrevPage.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderCocTableRows();
                    renderCocPaginationControls();
                }
            });
        }

        const btnNextPage = document.getElementById('btnNextPage');
        if (btnNextPage) {
            btnNextPage.addEventListener('click', () => {
                const totalPages = Math.ceil(filteredCocList.length / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    renderCocTableRows();
                    renderCocPaginationControls();
                }
            });
        }
});

async function generateCocNumber() {
    const now = new Date();
    const year2Digit = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    
    try {
        const { count } = await _supabase
            .from('coc_headers')
            .select('*', { count: 'exact', head: true });

        // Ini adalah 0001
        const sequence = String((count || 0) + 1).padStart(4, '0');
        
        // Nomor COC lengkap: ES-COC26030001
        const nomorFormat = `ES-COC${year2Digit}${month}${sequence}`;
        
        const inputCoc = document.getElementById('nomorCoc');
        if (inputCoc) {
            inputCoc.value = nomorFormat;
            
            // Sample ID hanya ambil 0001 + .1
            const firstSampleId = document.querySelector('#cocBody .sample-id');
            if (firstSampleId) {
                firstSampleId.value = `${sequence}.1`;
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

function updateTopBar(fullName, role) {
    document.getElementById('userName').innerText = `Halo, ${fullName.split(' ')[0]}!`;
    document.getElementById('userFullName').innerText = fullName;
    document.getElementById('userRoleDisplay').innerText = role.replace('_', ' ');
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('id-ID', options);
}

// FUNGSI RENDER SIDEBAR (Sama persis dengan Master Data Anda)


// Fungsi tambahan untuk mengisi datalist regulasi di form COC
async function loadRegulasiDropdown() {
    const { data } = await _supabase.from('master_emisi').select('regulasi');
    const uniqueRegs = [...new Set(data.map(item => item.regulasi))];
    const datalist = document.getElementById('listRegulasi');
    if (datalist) {
        datalist.innerHTML = uniqueRegs.map(reg => `<option value="${reg}">`).join('');
    }
}

// Fungsi pembantu untuk mengubah angka bulan ke Romawi
function getRomanMonth(month) {
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[month - 1];
}

async function initQuotationNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 3 untuk Maret
    const romanMonth = getRomanMonth(month);
    
    // Inisiasi nomor urut (contoh 0246)
    // Di sini kita bisa mengambil jumlah QT dari database jika sudah ada tabelnya
    const sequence = "0000"; // Anda bisa mengubah ini jadi dinamis nantinya
    
    const qtFormat = `${sequence}/QT-ES/${romanMonth}/${year}`;
    
    const inputQt = document.getElementById('qtNo');
    if (inputQt && !inputQt.value) {
        inputQt.value = qtFormat;
    }
}

function addNewRow() {
    const tableBody = document.getElementById('cocBody');
    const rowCount = tableBody.rows.length + 1;
    const fullCocNumber = document.getElementById('nomorCoc').value;
    const sequenceOnly = fullCocNumber.slice(-4); 

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${rowCount}</td>
        <td><input type="text" class="form-control sample-id" value="${sequenceOnly}.${rowCount}" readonly style="background: #f8fafc; font-weight: 800; color: #2563eb;"></td>
        <td><input type="text" class="form-control titik-uji" placeholder="Nama Titik & Deskripsi"></td>
        <td>
            <input type="text" class="form-control regulasi-search" list="listRegulasi" onkeypress="if(event.key === 'Enter') addRegulasiTag(this)" placeholder="Ketik & Enter...">
            <div class="selected-regulasi-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px;"></div>
        </td>
                <td style="vertical-align: top;">
            <div class="param-main-wrapper">
                <div class="select-all-area" style="display: none; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <label style="font-size: 0.75rem; font-weight: 800; color: #2563eb; cursor:pointer;">
                        <input type="checkbox" onchange="toggleSelectAll(this)"> SELECT ALL
                    </label>
                </div>
                <div class="param-container" style="display: flex; flex-direction: column; gap: 6px;">
                    <small style="color: #94a3b8;">Pilih regulasi...</small>
                </div>
            </div>
        </td>
        <td class="no-print"><button type="button" onclick="removeRow(this)" style="background:none; border:none; cursor:pointer;">❌</button></td>
    `;
    tableBody.appendChild(newRow);
}

function removeRow(btn) {
    const row = btn.closest('tr');
    const tableBody = document.getElementById('cocBody');
    const cocNumber = document.getElementById('nomorCoc').value;

    if (tableBody.rows.length > 1) {
        row.remove();
        
        // Re-indexing Nomor dan Sample ID
        document.querySelectorAll('#cocBody tr').forEach((r, index) => {
            const newIndex = index + 1;
            r.cells[0].innerText = newIndex; // Update Kolom No
            r.querySelector('.sample-id').value = `${cocNumber}.${newIndex}`; // Update Sample ID
        });
    } else {
        alert("Minimal harus ada satu titik uji.");
    }
}

// 1. Fungsi untuk menambah tag regulasi (Bisa lebih dari satu)
function addRegulasiTag(input) {
    const val = input.value.trim();
    if (!val) return;

    const tagContainer = input.closest('td').querySelector('.selected-regulasi-tags');
    
    // Cek agar tidak duplikat
    const existingTags = Array.from(tagContainer.querySelectorAll('.reg-tag')).map(t => t.dataset.val);
    if (existingTags.includes(val)) {
        input.value = '';
        return;
    }

    // Buat element Tag/Badge
    const tag = document.createElement('span');
    tag.className = 'reg-tag';
    tag.dataset.val = val;
    tag.style = "background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: 1px solid #bfdbfe; display: flex; align-items: center; gap: 5px;";
    tag.innerHTML = `${val} <span onclick="this.parentElement.remove(); updateParametersByTags(this)" style="cursor:pointer; color: #ef4444;">×</span>`;
    
    tagContainer.appendChild(tag);
    input.value = '';
    
    // Update daftar parameter berdasarkan semua tag yang ada
    updateParametersByTags(tagContainer);
}


function toggleSelectAll(source) {
    // Cari container parameter terdekat
    const container = source.closest('.param-container');
    const checkboxes = container.querySelectorAll('.param-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        
        // Opsional: Tambahkan efek visual pada label saat diceklis
        const label = cb.closest('.param-label');
        if (source.checked) {
            label.style.borderColor = '#2563eb';
            label.style.background = '#eff6ff';
        } else {
            label.style.borderColor = '#e2e8f0';
            label.style.background = '#fff';
        }
    });
}

async function loadParametersToRow(input) {
    const regulasi = input.value;
    const container = input.closest('tr').querySelector('.param-container');
    
    if (!regulasi) return;

    container.innerHTML = "<small>Memuat parameter...</small>";

    // Ambil data dari tabel master_emisi
    const { data, error } = await _supabase
        .from('master_emisi')
        .select('parameter')
        .eq('regulasi', regulasi);

    if (error || !data || data.length === 0) {
        container.innerHTML = "<small style='color:red;'>Regulasi tidak ditemukan.</small>";
        return;
    }

    // Hilangkan duplikat parameter (karena satu parameter bisa punya banyak metode)
    const uniqueParams = [...new Set(data.map(d => d.parameter))];

    container.innerHTML = uniqueParams.map(param => `
        <label style="display: inline-flex; align-items: center; margin-right: 12px; margin-bottom: 8px; font-size: 0.8rem; cursor:pointer; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;">
            <input type="checkbox" class="param-checkbox" value="${param}" style="margin-right: 6px;">
            ${param}
        </label>
    `).join('');
}

async function saveCoc() {
    const btnSave = document.querySelector('.btn-save');
    btnSave.disabled = true;
    btnSave.innerText = "⏳ SEDANG MENYIMPAN...";

    try {
        // 1. Ambil data Header
        const cocData = {
            nomor_coc: document.getElementById('nomorCoc').value,
            company_name: document.getElementById('companyName').value,
            company_address: document.getElementById('companyAddress').value,
            contact_person: document.getElementById('contactPerson').value,
            phone_no: document.getElementById('phoneNumber').value,
            email_coa: document.getElementById('emailCoa').value,
            qt_no: document.getElementById('qtNo').value,
            tat_requested: document.getElementById('tatRequest').value,
            sampling_date: document.getElementById('samplingDate').value,
            sampling_officer: [
                document.getElementById('officer1')?.value,
                document.getElementById('officer2')?.value,
                document.getElementById('officer3')?.value
            ].filter(Boolean).join(', '),
            created_by: (await _supabase.auth.getUser()).data.user?.id,
            created_at: new Date().toISOString()
        };

        // 2. Ambil data Detail (Items)
        const items = [];
        const rows = document.querySelectorAll('#cocBody tr');

        rows.forEach(row => {
            const sampleId = row.querySelector('.sample-id').value;
            const description = row.querySelector('.titik-uji').value;
            const regulations = Array.from(row.querySelectorAll('.reg-tag')).map(t => t.dataset.val);

            const parameters = [];
            const checkedBoxes = row.querySelectorAll('.param-checkbox:checked');
            
            checkedBoxes.forEach(cb => {
                const pName = cb.value;
                const methodSelect = row.querySelector(`select[data-param="${pName}"]`);
                parameters.push({
                    parameter: pName,
                    method: methodSelect ? methodSelect.value : ''
                });
            });

            if (description && parameters.length > 0) {
                items.push({
                    sample_id: sampleId,
                    description: description,
                    regulations: regulations,
                    parameters: parameters
                });
            }
        });

        // Validasi minimal data
        if (items.length === 0) {
            alert("Pilih minimal satu titik uji dan parameter!");
            return;
        }

        // 3. Cek Duplikat / Konfirmasi Update
        const { data: existing } = await _supabase
            .from('coc_emisi')
            .select('id')
            .eq('nomor_coc', cocData.nomor_coc)
            .single();

        if (existing) {
            if (!confirm("Nomor COC ini sudah ada. Update data lama?")) return;
        }

        // 4. Simpan ke Database (UPSERT)
        const payload = { ...cocData, samples_data: items };
        const { error } = await _supabase
            .from('coc_emisi')
            .upsert([payload], { onConflict: 'nomor_coc' });

        if (error) throw error;

        // 5. UPDATE TEMPLATE CETAK & PRINT
        // Kita panggil fungsi fillPrintTemplate (yang sudah diletakkan di luar)
        alert("Berhasil disimpan! Menyiapkan dokumen...");
        
        fillPrintTemplate(cocData, items); // Mengisi data ke area preview cetak

        // Beri jeda 500ms agar browser sempat me-render tabel sebelum kotak print muncul
        setTimeout(() => {
            window.print();
        }, 500);

    } catch (err) {
        console.error("Gagal Simpan:", err);
        alert("Gagal menyimpan: " + err.message);
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = "💾 SIMPAN & GENERATE COC DIGITAL";
    }
}
        function fillPrintTemplate(cocData, items) {
    // 1. Ambil data tambahan dari elemen input form
    const phone = document.getElementById('phoneNumber')?.value || '-';
    const email = document.getElementById('emailCoa')?.value || '-';
    const tat = document.getElementById('tatRequest')?.value || '-';

    // 2. Isi Header Laporan (Tabel Informasi Atas)
    document.getElementById('p-companyName').innerText = `: ${cocData.company_name || '-'}`;
    document.getElementById('p-nomorCoc').innerText = `: ${cocData.nomor_coc || '-'}`;
    document.getElementById('p-address').innerText = `: ${cocData.company_address || '-'}`;
    document.getElementById('p-qtNo').innerText = `: ${cocData.qt_no || '-'}`;
    document.getElementById('p-cp').innerText = `: ${cocData.contact_person || '-'}`;
    document.getElementById('p-date').innerText = `: ${cocData.sampling_date || '-'}`;
    
    // Field Tambahan: Phone/Email, TAT, dan Sampling Officer (Header)
    if(document.getElementById('p-contactDetail')) {
        document.getElementById('p-contactDetail').innerText = `: ${phone} / ${email}`;
    }
    if(document.getElementById('p-tat')) {
        document.getElementById('p-tat').innerText = `: ${tat}`;
    }
    if(document.getElementById('p-officerHeader')) {
        document.getElementById('p-officerHeader').innerText = `: ${cocData.sampling_officer || '-'}`;
    }

    // 3. Kontrol Area Preview
    const printArea = document.getElementById('printArea');
    if(printArea) printArea.classList.add('show-preview');
    
    // 4. Kosongkan Area Tanda Tangan (Footer)
    // Walaupun data petugas ada, kotak TTD tetap dikosongkan untuk tanda tangan manual
    const officerSign = document.getElementById('p-officerList');
    if (officerSign) {
        officerSign.innerText = ""; 
        officerSign.style.textAlign = "center"; // Memastikan center
    }

    // 5. Render Tabel Utama (Logika Rowspan)
    const printBody = document.getElementById('printTableBody');
    if (!printBody) return;
    printBody.innerHTML = '';

    let globalNo = 1;
    items.forEach((item) => {
        const totalParams = item.parameters.length;
        item.parameters.forEach((p, index) => {
            const tr = document.createElement('tr');
            // Style border manual untuk memastikan garis muncul di print PDF
            const borderStyle = "border: 1px solid black; padding: 5px; vertical-align: middle;";

            if (index === 0) {
                tr.innerHTML = `
                    <td rowspan="${totalParams}" style="${borderStyle} text-align:center;">${globalNo++}</td>
                    <td rowspan="${totalParams}" style="${borderStyle} font-weight:bold; text-align:center;">${item.sample_id}</td>
                    <td rowspan="${totalParams}" style="${borderStyle}">${item.description}</td>
                    <td rowspan="${totalParams}" style="${borderStyle}">${item.regulations.join('<br>')}</td>
                    <td style="${borderStyle}">${p.parameter}</td>
                    <td style="${borderStyle}">${p.method}</td>
                    <td rowspan="${totalParams}" style="${borderStyle}"></td>
                    <td rowspan="${totalParams}" style="${borderStyle}"></td>
                `;
            } else {
                tr.innerHTML = `
                    <td style="${borderStyle}">${p.parameter}</td>
                    <td style="${borderStyle}">${p.method}</td>
                `;
            }
            printBody.appendChild(tr);
        });
    });
}

// Fungsi untuk merender daftar parameter saat regulasi dipilih
async function updateParametersByTags(tagContainer) {
    const row = tagContainer.closest('tr');
    const paramContainer = row.querySelector('.param-container');
    const selectAllArea = row.querySelector('.select-all-area'); // Ambil elemen Select All
    const selectedRegs = Array.from(tagContainer.querySelectorAll('.reg-tag')).map(t => t.dataset.val);
    
    // Jika tidak ada regulasi dipilih
    if (selectedRegs.length === 0) {
        paramContainer.innerHTML = '<small style="color: #94a3b8;">Pilih regulasi...</small>';
        selectAllArea.style.display = 'none'; // Sembunyikan Select All
        return;
    }

    const { data } = await _supabase.from('master_emisi').select('parameter, metode').in('regulasi', selectedRegs);
    
    const paramMap = {};
    data.forEach(item => {
        if (!paramMap[item.parameter]) paramMap[item.parameter] = [];
        if (item.metode && !paramMap[item.parameter].includes(item.metode)) {
            paramMap[item.parameter].push(item.metode);
        }
    });

    row.dataset.paramMethods = JSON.stringify(paramMap);
    const uniqueParams = Object.keys(paramMap);

    // Tampilkan tombol Select All karena parameter sudah siap
    selectAllArea.style.display = 'block'; 

    paramContainer.innerHTML = uniqueParams.map(p => `
        <div class="param-row" style="display: flex; align-items: center; justify-content: space-between; gap: 15px; min-height: 32px;">
            <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 10px; cursor:pointer; margin:0; flex: 1; color: #334155;">
                <input type="checkbox" class="param-checkbox" value="${p}" onchange="renderMethodDropdown(this)"> 
                <span style="font-weight: 600;">${p}</span>
            </label>
            <div id="slot-metode-${p.replace(/[^a-z0-9]/gi, '-')}" style="width: 220px; display: flex; align-items: center;"></div>
        </div>
    `).join('');
}

// Fungsi untuk memunculkan dropdown saat checkbox dicentang
function renderMethodDropdown(checkbox) {
    const row = checkbox.closest('tr');
    const paramName = checkbox.value;
    const safeId = paramName.replace(/[^a-z0-9]/gi, '-');
    const slot = row.querySelector(`#slot-metode-${safeId}`);
    
    const paramMap = JSON.parse(row.dataset.paramMethods || "{}");
    const availableMethods = paramMap[paramName] || [];

    if (checkbox.checked) {
        slot.innerHTML = `
            <select class="form-control select-metode" data-param="${paramName}" 
                    style="font-size: 0.7rem; height: 28px; padding: 0 10px; border-radius: 20px; border: 1px solid #2563eb; width: 100%; background: #fff; cursor: pointer;">
                ${availableMethods.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
        `;
    } else {
        slot.innerHTML = ''; 
    }
}

function toggleSelectAll(source) {
    // 1. Cari container utama tempat checkbox parameter berada
    const row = source.closest('tr');
    const checkboxes = row.querySelectorAll('.param-checkbox');
    
    checkboxes.forEach(cb => {
        // 2. Samakan status checked dengan status 'Select All'
        cb.checked = source.checked;
        
        // 3. Panggil renderMethodDropdown secara manual agar dropdown muncul/hilang
        renderMethodDropdown(cb);
    });
}

// Fungsi ini dipanggil setiap kali checkbox parameter diklik
function syncMethods(checkbox) {
    const row = checkbox.closest('tr');
    const paramContainer = row.querySelector('.param-container');
    const metodeInput = row.querySelector('.metode-uji');
    
    // Ambil data master yang disimpan sementara di dataset container
    const masterData = JSON.parse(paramContainer.dataset.rawSource || "[]");
    
    // Ambil semua parameter yang saat ini sedang dicentang
    const checkedParams = Array.from(row.querySelectorAll('.param-checkbox:checked')).map(cb => cb.value);
    
    // Map parameter terpilih ke metodenya (1 parameter = 1 metode)
    const selectedMethods = masterData
        .filter(item => checkedParams.includes(item.parameter))
        .map(item => item.metode)
        .filter(m => m && m.trim() !== "");

    // Gabungkan metode unik (menggunakan Set agar jika ada metode yang sama tidak double)
    const uniqueMethods = [...new Set(selectedMethods)];
    
    // Tampilkan di textarea (dipisahkan dengan baris baru atau koma)
    metodeInput.value = uniqueMethods.join("\n"); 
}

// --- TABS & TERSIMPAN LOGIC ---
window.switchCocMainTab = function(tabName) {
    currentCocTab = tabName;
    
    const btnForm = document.getElementById('tabFormRegistrasi');
    const btnSaved = document.getElementById('tabCocTersimpan');
    if (btnForm && btnSaved) {
        btnForm.classList.toggle('active', tabName === 'form');
        btnSaved.classList.toggle('active', tabName === 'saved');
    }

    const formContainer = document.getElementById('cocFormContainer');
    const savedContainer = document.getElementById('cocSavedContainer');
    if (formContainer && savedContainer) {
        formContainer.style.display = tabName === 'form' ? 'block' : 'none';
        savedContainer.style.display = tabName === 'saved' ? 'block' : 'none';
    }

    if (tabName === 'saved') {
        fetchSavedCoc();
    }
};

window.goToCocPage = function(pageNumber) {
    const totalPages = Math.ceil(filteredCocList.length / pageSize) || 1;
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderCocTableRows();
        renderCocPaginationControls();
    }
};

async function fetchSavedCoc(keyword = '') {
    try {
        const { data, error } = await _supabase
            .from('coc_emisi')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        rawCocListData = data;
        
        let filtered = rawCocListData;
        if (keyword) {
            filtered = filtered.filter(item => 
                (item.nomor_coc && item.nomor_coc.toLowerCase().includes(keyword)) ||
                (item.company_name && item.company_name.toLowerCase().includes(keyword))
            );
        }

        filteredCocList = filtered;
        currentPage = 1;

        renderCocTableRows();
        renderCocPaginationControls();
    } catch (err) {
        console.error("Error loading saved COC:", err);
    }
}

function renderCocTableRows() {
    const container = document.getElementById('listCocSaved');
    if (!container) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredCocList.length);
    const paginated = filteredCocList.slice(startIndex, endIndex);

    container.innerHTML = '';
    if (paginated.length === 0) {
        container.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">Tidak ada data COC tersimpan.</td></tr>`;
        return;
    }

    paginated.forEach(item => {
        container.innerHTML += `
            <tr>
                <td style="padding:10px;">${new Date(item.sampling_date).toLocaleDateString('id-ID')}</td>
                <td style="padding:10px; font-weight:800; color:#2563eb;">${item.nomor_coc}</td>
                <td style="padding:10px;">${item.company_name}</td>
                <td style="padding:10px; text-align:center; display: flex; gap: 5px; justify-content: center;">
                    <button class="btn-primary" onclick="loadCocToForm('${item.id}')" style="padding:5px 10px; font-size:0.7rem; background: #2563eb;">EDIT</button>
                    <button class="btn-primary" onclick="directPrint('${item.id}')" style="padding:5px 10px; font-size:0.7rem; background: #059669;">CETAK</button>
                </td>
            </tr>
        `;
    });
}

function renderCocPaginationControls() {
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const infoContainer = document.getElementById('paginationInfo');

    if (!prevBtn || !nextBtn || !pageNumbersContainer || !infoContainer) return;

    const totalItems = filteredCocList.length;
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
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToCocPage(${i})">
                ${i}
            </button>
        `;
    }

    pageNumbersContainer.innerHTML = pagesHtml;
}

async function directPrint(id) {
    const { data, error } = await _supabase.from('coc_emisi').select('*').eq('id', id).single();
    
    if (error || !data) {
        alert("Gagal mengambil data untuk dicetak");
        return;
    }

    const cocData = {
        nomor_coc: data.nomor_coc,
        company_name: data.company_name,
        company_address: data.company_address,
        contact_person: data.contact_person,
        qt_no: data.qt_no,
        sampling_date: data.sampling_date,
        sampling_officer: data.sampling_officer
    };

    fillPrintTemplate(cocData, data.samples_data);

    setTimeout(() => {
        window.print();
    }, 500);
}

// --- MEMASUKKAN DATA KE FORM (LOAD DATA) ---
async function loadCocToForm(id) {
    const { data, error } = await _supabase.from('coc_emisi').select('*').eq('id', id).single();
    if (error) return alert("Gagal memuat data");

    // 1. Load Header
    document.getElementById('nomorCoc').value = data.nomor_coc;
    document.getElementById('companyName').value = data.company_name;
    document.getElementById('companyAddress').value = data.company_address;
    document.getElementById('contactPerson').value = data.contact_person;
    document.getElementById('phoneNumber').value = data.phone_no;
    document.getElementById('emailCoa').value = data.email_coa;
    document.getElementById('qtNo').value = data.qt_no;
    document.getElementById('tatRequest').value = data.tat_requested;
    document.getElementById('samplingDate').value = data.sampling_date;

    const officers = data.sampling_officer ? data.sampling_officer.split(', ') : [];
    document.getElementById('officer1').value = officers[0] || '';
    document.getElementById('officer2').value = officers[1] || '';
    document.getElementById('officer3').value = officers[2] || '';

    // 2. Load Items (Titik Uji)
    const tbody = document.getElementById('cocBody');
    tbody.innerHTML = '';

    for (const [index, item] of data.samples_data.entries()) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="form-control sample-id" value="${item.sample_id}" readonly style="background:#f8fafc; font-weight:800; color:#2563eb;"></td>
            <td><input type="text" class="form-control titik-uji" value="${item.description}"></td>
            <td>
                <input type="text" class="form-control regulasi-search" list="listRegulasi" onkeypress="if(event.key === 'Enter') addRegulasiTag(this)" placeholder="Ketik & Enter...">
                <div class="selected-regulasi-tags" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">
                    ${item.regulations.map(reg => `<span class="reg-tag" data-val="${reg}" style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:5px; font-size:0.7rem; display:flex; align-items:center; gap:5px; border:1px solid #dbeafe;">${reg}<span onclick="this.parentElement.remove(); updateParametersByTags(this.closest('td'))" style="cursor:pointer; font-weight:bold;">&times;</span></span>`).join('')}
                </div>
            </td>
            <td style="vertical-align:top;">
                <div class="param-main-wrapper">
                    <div class="select-all-area" style="margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <label style="font-size:0.75rem; font-weight:800; color:#2563eb; cursor:pointer;"><input type="checkbox" onchange="toggleSelectAll(this)"> SELECT ALL</label>
                    </div>
                    <div class="param-container" style="display:flex; flex-direction:column; gap:6px;"></div>
                </div>
            </td>
            <td class="no-print"><button type="button" onclick="removeRow(this)" style="background:none; border:none; cursor:pointer;">❌</button></td>
        `;
        tbody.appendChild(row);

        const tagContainer = row.querySelector('.selected-regulasi-tags');
        await updateParametersByTags(tagContainer);

        item.parameters.forEach(p => {
            const cb = row.querySelector(`.param-checkbox[value="${p.parameter}"]`);
            if (cb) {
                cb.checked = true;
                renderMethodDropdown(cb);
                setTimeout(() => {
                    const sel = row.querySelector(`select[data-param="${p.parameter}"]`);
                    if (sel) sel.value = p.method;
                }, 100);
            }
        });
    }
    let existingPrintBtn = document.getElementById('extraPrintBtn');
    if (!existingPrintBtn) {
        const printBtn = document.createElement('button');
        printBtn.id = 'extraPrintBtn';
        printBtn.className = 'btn-save no-print';
        printBtn.style.background = '#059669';
        printBtn.style.marginTop = '10px';
        printBtn.innerText = '🖨️ CETAK DOKUMEN INI';
        printBtn.onclick = () => window.print();
        document.querySelector('.coc-card').appendChild(printBtn);
    }

    switchCocMainTab('form');
    alert("Data COC berhasil dimuat!");
}

function preparePrintData(cocData, items) {
    const printBody = document.getElementById('printTableBody');
    printBody.innerHTML = '';

    items.forEach((item, index) => {
        // Gabungkan parameter menjadi baris-baris (rowspan)
        item.parameters.forEach((p, pIndex) => {
            const row = document.createElement('tr');
            
            // Hanya munculkan No, ID, Desc di baris pertama tiap item (Rowspan)
            if (pIndex === 0) {
                row.innerHTML = `
                    <td rowspan="${item.parameters.length}">${index + 1}</td>
                    <td rowspan="${item.parameters.length}">${item.sample_id}</td>
                    <td rowspan="${item.parameters.length}">${item.description}</td>
                    <td rowspan="${item.parameters.length}">${item.regulations.join('<br>')}</td>
                `;
            }
            
            // Detail Parameter & Metode
            row.innerHTML += `
                <td>${p.parameter}</td>
                <td>${p.method}</td>
            `;
            printBody.appendChild(row);
        });
    });
}