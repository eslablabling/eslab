let currentCocTab = 'form';
let currentPage = 1;
const pageSize = 10;
let filteredCocList = [];
let rawCocListData = [];
let currentUserRole = '';
let companyHistory = [];
let officerHistory = [];

async function loadCompanyHistory() {
    try {
        const { data, error } = await _supabase
            .from('coc_emisi')
            .select('company_name, company_address, contact_person, phone_no, email_coa')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Filter unique by company_name
        const seen = new Set();
        companyHistory = [];
        (data || []).forEach(item => {
            if (item.company_name && !seen.has(item.company_name.trim().toLowerCase())) {
                seen.add(item.company_name.trim().toLowerCase());
                companyHistory.push(item);
            }
        });
        
        // Populate datalist
        const datalist = document.getElementById('companyHistoryList');
        if (datalist) {
            datalist.innerHTML = companyHistory
                .map(item => `<option value="${item.company_name}">${item.company_name}</option>`)
                .join('');
        }
        
        console.log("Company history loaded in COC:", companyHistory.length, "companies");
    } catch (err) {
        console.error("Gagal memuat history perusahaan:", err);
    }
}

async function loadOfficerHistory() {
    try {
        const { data, error } = await _supabase
            .from('coc_emisi')
            .select('sampling_officer')
            .order('created_at', { ascending: false });
            
        if (error) throw error;

        const seen = new Set();
        officerHistory = [];
        
        (data || []).forEach(item => {
            if (item.sampling_officer) {
                const officersList = item.sampling_officer.split(',').map(name => name.trim());
                officersList.forEach(name => {
                    if (name && !seen.has(name.toLowerCase())) {
                        seen.add(name.toLowerCase());
                        officerHistory.push(name);
                    }
                });
            }
        });

        // Populate datalist
        const datalist = document.getElementById('officerHistoryList');
        if (datalist) {
            datalist.innerHTML = officerHistory
                .map(name => `<option value="${name}">${name}</option>`)
                .join('');
        }
        
        console.log("Officer history loaded in COC:", officerHistory.length, "officers");
    } catch (err) {
        console.error("Gagal memuat history petugas:", err);
    }
}

window.addEventListener('auth-ready', async (e) => {
    const { role } = e.detail;

    window.currentUserRole = role;
    currentUserRole = role;
    
    // 4. Inisialisasi Logika Khusus COC
    await generateCocNumber();    // Membuat nomor ES-COC/2026/... otomatis saat load
    await initQuotationNumber();
    await loadRegulasiDropdown(); // Mengisi list regulasi untuk auto-complete
    await loadCompanyHistory();   // Memuat riwayat nama perusahaan
    await loadOfficerHistory();   // Memuat riwayat petugas sampling

    if (role === 'sampling') {
        setFormReadonly(true);
    }

    // Event listener untuk auto-fill nama perusahaan dari history
    const companyInput = document.getElementById('companyName');
    if (companyInput) {
        companyInput.addEventListener('input', (e) => {
            const selectedVal = e.target.value.trim().toLowerCase();
            const match = companyHistory.find(item => item.company_name && item.company_name.trim().toLowerCase() === selectedVal);
            if (match) {
                document.getElementById('companyAddress').value = match.company_address || '';
                document.getElementById('contactPerson').value = match.contact_person || '';
                document.getElementById('phoneNumber').value = match.phone_no || '';
                document.getElementById('emailCoa').value = match.email_coa || '';
            }
        });
    }


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

        // Filter Tanggal COC (#19)
        const filterCocDateStart = document.getElementById('filterCocDateStart');
        const filterCocDateEnd = document.getElementById('filterCocDateEnd');
        if (filterCocDateStart) {
            filterCocDateStart.addEventListener('change', () => {
                const keyword = document.getElementById('searchKeyword')?.value.toLowerCase() || '';
                fetchSavedCoc(keyword);
            });
        }
        if (filterCocDateEnd) {
            filterCocDateEnd.addEventListener('change', () => {
                const keyword = document.getElementById('searchKeyword')?.value.toLowerCase() || '';
                fetchSavedCoc(keyword);
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
            .from('coc_emisi')
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
            <input type="text" class="form-control regulasi-search" list="listRegulasi" oninput="onRegulasiInput(this)" onkeypress="if(event.key === 'Enter') addRegulasiTag(this)" placeholder="Ketik & Pilih...">
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
        <td class="no-print" style="text-align: center; vertical-align: middle;">
            <button type="button" onclick="copyRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem; margin-right: 8px;" title="Duplikat baris">📋</button>
            <button type="button" onclick="removeRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem;">❌</button>
        </td>
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
        const sequenceOnly = cocNumber.slice(-4);
        document.querySelectorAll('#cocBody tr').forEach((r, index) => {
            const newIndex = index + 1;
            r.cells[0].innerText = newIndex; // Update Kolom No
            r.querySelector('.sample-id').value = `${sequenceOnly}.${newIndex}`; // Update Sample ID
        });
    } else {
        alert("Minimal harus ada satu titik uji.");
    }
}

async function copyRow(btn) {
    const srcRow = btn.closest('tr');
    if (!srcRow) return;

    const description = srcRow.querySelector('.titik-uji').value.trim();
    const regTags = Array.from(srcRow.querySelectorAll('.selected-regulasi-tags .reg-tag')).map(t => t.dataset.val);

    const selectedParams = [];
    srcRow.querySelectorAll('.param-checkbox:checked').forEach(cb => {
        const paramName = cb.value;
        const safeId = paramName.replace(/[^a-z0-9]/gi, '-');
        const methodSelect = srcRow.querySelector(`#slot-metode-${safeId} .method-select`);
        const methodVal = methodSelect ? methodSelect.value : '';
        selectedParams.push({ parameter: paramName, method: methodVal });
    });

    // Buat baris baru
    addNewRow();

    const tableBody = document.getElementById('cocBody');
    const destRow = tableBody.rows[tableBody.rows.length - 1];
    if (!destRow) return;

    // Set deskripsi
    destRow.querySelector('.titik-uji').value = description;

    // Set tag regulasi
    const destTagContainer = destRow.querySelector('.selected-regulasi-tags');
    regTags.forEach(val => {
        const tag = document.createElement('span');
        tag.className = 'reg-tag';
        tag.dataset.val = val;
        tag.style = "background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: 1px solid #bfdbfe; display: flex; align-items: center; gap: 5px;";
        tag.innerHTML = `${val} <span onclick="const p=this.parentElement; const c=p.closest('td'); p.remove(); updateParametersByTags(c)" style="cursor:pointer; color: #ef4444;">×</span>`;
        destTagContainer.appendChild(tag);
    });

    // Update parameter list
    await updateParametersByTags(destTagContainer);

    // Centang checkbox & set metode
    selectedParams.forEach(p => {
        const cb = destRow.querySelector(`.param-checkbox[value="${p.parameter}"]`);
        if (cb) {
            cb.checked = true;
            renderMethodDropdown(cb);
            
            const safeId = p.parameter.replace(/[^a-z0-9]/gi, '-');
            const methodSelect = destRow.querySelector(`#slot-metode-${safeId} .method-select`);
            if (methodSelect && p.method) {
                methodSelect.value = p.method;
            }
        }
    });

    // Sesuaikan status Select All
    const selectAllCb = destRow.querySelector('.select-all-area input[type="checkbox"]');
    if (selectAllCb) {
        const totalCbs = destRow.querySelectorAll('.param-checkbox').length;
        const checkedCbs = destRow.querySelectorAll('.param-checkbox:checked').length;
        selectAllCb.checked = totalCbs > 0 && totalCbs === checkedCbs;
    }
}
window.copyRow = copyRow;

function onRegulasiInput(input) {
    const val = input.value.trim();
    if (!val) return;
    
    const datalist = document.getElementById('listRegulasi');
    if (!datalist) return;
    
    const options = Array.from(datalist.options).map(opt => opt.value.trim());
    if (options.includes(val)) {
        addRegulasiTag(input);
    }
}
window.onRegulasiInput = onRegulasiInput;

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
    tag.innerHTML = `${val} <span onclick="const p=this.parentElement; const c=p.closest('td'); p.remove(); updateParametersByTags(c)" style="cursor:pointer; color: #ef4444;">×</span>`;
    
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
        
        let oldData = null;
        if (existing) {
            const { data: oldRow } = await _supabase
                .from('coc_emisi')
                .select('*')
                .eq('nomor_coc', cocData.nomor_coc)
                .single();
            oldData = oldRow;
        }

        const { data: cocRow, error: cocError } = await _supabase
            .from('coc_emisi')
            .upsert([cocData], { onConflict: 'nomor_coc' })
            .select('id')
            .single();

        if (cocError) throw cocError;
        const cocId = cocRow.id;

        // Sync samples table
        const { data: existingSamples } = await _supabase
            .from('samples')
            .select('*')
            .eq('coc_id', cocId);

        const existingSamplesMap = new Map();
        if (existingSamples) {
            existingSamples.forEach(es => existingSamplesMap.set(es.sample_id, es));
        }

        // Delete removed samples
        const inputSampleIds = items.map(it => it.sample_id);
        if (existingSamples) {
            const deleteIds = existingSamples
                .filter(es => !inputSampleIds.includes(es.sample_id))
                .map(es => es.id);
            if (deleteIds.length > 0) {
                await _supabase.from('samples').delete().in('id', deleteIds);
            }
        }

        // Helper untuk generate UUID secara offline/client-side jika sampel baru
        const generateUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        // Bulk upsert samples
        const samplesPayload = items.map(item => {
            const existingSample = existingSamplesMap.get(item.sample_id) || {};
            return {
                id: existingSample.id || generateUUID(),
                coc_id: cocId,
                sample_id: item.sample_id,
                description: item.description,
                nama_cerobong: item.description,
                regulations: item.regulations,
                parameters: item.parameters,
                status: existingSample.status || 'Pending',
                status_lab: existingSample.status_lab || 'Pending',
                is_verified: existingSample.is_verified || false
            };
        });

        const { error: samplesError } = await _supabase
            .from('samples')
            .upsert(samplesPayload, { onConflict: 'coc_id, sample_id' });

        if (samplesError) throw samplesError;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            const actionType = existing ? 'UPDATE_COC' : 'CREATE_COC';
            const desc = existing 
                ? `Memperbarui data COC ${cocData.nomor_coc} (${cocData.company_name})` 
                : `Membuat COC Baru ${cocData.nomor_coc} (${cocData.company_name})`;
                
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: actionType,
                table_name: 'coc_emisi',
                description: desc,
                old_data: oldData,
                new_data: payload
            }]);
        }

        // Buat akun klien otomatis jika belum ada
        await autoCreateClientAccount(cocData.company_name);

        // 5. UPDATE TEMPLATE CETAK & PRINT
        // Kita panggil fungsi fillPrintTemplate (yang sudah diletakkan di luar)
        await loadCompanyHistory();
        await loadOfficerHistory();
        alert("Berhasil disimpan! Menyiapkan dokumen...");
        
        fillPrintTemplate(cocData, items); // Mengisi data ke area preview cetak COC
        fillSpkTemplate(cocData);          // Mengisi data ke area preview cetak SPK

        showCocPrintModal(cocData, items); // Tampilkan modal pilihan cetak (COC / SPK)

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

    const formContainer = document.getElementById('cocFormContainer');
    const isReadonly = formContainer && formContainer.dataset.readonly === 'true';

    // Tampilkan tombol Select All karena parameter sudah siap
    selectAllArea.style.display = isReadonly ? 'none' : 'block'; 

    const hasDashReg = selectedRegs.includes('-');
    const hasParticulateInMap = uniqueParams.some(param => param.toUpperCase().includes('PARTICULATE') || param.toUpperCase().includes('PARTIKULAT'));

    const shouldAutoCheck = (p) => {
        if (window.isLoadingSavedCoc) return false;

        const pUpper = p.toUpperCase();
        const isO2 = pUpper.includes('OXYGEN') || pUpper.includes('O2');
        const isCO2 = pUpper.includes('CARBON DIOXIDE') || pUpper.includes('CO2');
        if (isO2 || isCO2) return true;

        if (hasDashReg && hasParticulateInMap) {
            const isIsokineticOrParticulate = [
                'VOLUMETRIC FLOW RATE', 'NUM OF TRAVERSE POINT', 'PERCENT OF ISOKINETIC', 
                'VELOCITY', 'PARTICULATE', 'PARTIKULAT', 'WATER VAPOR'
            ].some(k => pUpper.includes(k));
            if (isIsokineticOrParticulate) return true;
        }

        return false;
    };

    paramContainer.innerHTML = uniqueParams.map(p => {
        const checkedStr = shouldAutoCheck(p) ? 'checked' : '';
        return `
            <div class="param-row" style="display: flex; align-items: center; justify-content: space-between; gap: 15px; min-height: 32px;">
                <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 10px; cursor:${isReadonly ? 'not-allowed' : 'pointer'}; margin:0; flex: 1; color: #334155;">
                    <input type="checkbox" class="param-checkbox" value="${p}" ${checkedStr} ${isReadonly ? 'disabled' : ''} onchange="renderMethodDropdown(this)"> 
                    <span style="font-weight: 600;">${p}</span>
                </label>
                <div id="slot-metode-${p.replace(/[^a-z0-9]/gi, '-')}" style="width: 220px; display: flex; align-items: center;"></div>
            </div>
        `;
    }).join('');

    // Render dropdown metode untuk parameter yang otomatis dicentang
    if (!window.isLoadingSavedCoc) {
        paramContainer.querySelectorAll('.param-checkbox:checked').forEach(cb => {
            renderMethodDropdown(cb);
        });
    }
}

// Fungsi untuk memunculkan dropdown saat checkbox dicentang
function renderMethodDropdown(checkbox) {
    const row = checkbox.closest('tr');
    const paramName = checkbox.value;
    const safeId = paramName.replace(/[^a-z0-9]/gi, '-');
    const slot = row.querySelector(`#slot-metode-${safeId}`);
    
    const paramMap = JSON.parse(row.dataset.paramMethods || "{}");
    const availableMethods = paramMap[paramName] || [];

    const formContainer = document.getElementById('cocFormContainer');
    const isReadonly = formContainer && formContainer.dataset.readonly === 'true';

    if (checkbox.checked) {
        let defaultValue = availableMethods[0] || '';
        
        // 1. Isokinetik & Velocity matching Particulate
        const targetParams = ['Volumetric Flow Rate', 'Num of Traverse Point', 'Percent of Isokinetic', 'Velocity', 'Water Vapor in flue gas'];
        if (targetParams.includes(paramName)) {
            const partSelect = row.querySelector(`select[data-param="Particulate"]`) || row.querySelector(`select[data-param="Partikulat"]`);
            if (partSelect) {
                const partVal = partSelect.value || '';
                let keyword = '';
                if (partVal.toUpperCase().includes('EPA')) {
                    keyword = 'EPA';
                } else if (partVal.includes('2009')) {
                    keyword = '2009';
                } else if (partVal.includes('2021')) {
                    keyword = '2021';
                }
                
                if (keyword) {
                    const match = availableMethods.find(m => {
                        const txt = m.toUpperCase();
                        if (keyword === 'EPA') return txt.includes('EPA');
                        if (keyword === '2009') return txt.includes('2009');
                        if (keyword === '2021') return txt.includes('2021');
                        return false;
                    });
                    if (match) {
                        defaultValue = match;
                    }
                }
            }
        }

        // 2. Gas NDIR matching Oxygen Paramagnetic
        const gasParams = ['CARBON MONOXIDE', 'CARBON DIOXIDE', 'NITROGEN OXIDE', 'NITROGEN MONOXIDE', 'SULFUR DIOXIDE', 'NITROGEN DIOXIDE', 'CO', 'CO2', 'NOX', 'NO', 'SO2', 'NO2'];
        if (gasParams.some(g => paramName.toUpperCase().includes(g))) {
            const o2Select = row.querySelector(`select[data-param="Oxygen (O2)"]`) || row.querySelector(`select[data-param="O2"]`);
            if (o2Select) {
                const o2Val = o2Select.value || '';
                const isParamagnetic = o2Val.toUpperCase().includes('PARAMAGNETIC') || o2Val.toUpperCase().includes('PARAMAGNETIK');
                if (isParamagnetic) {
                    const match = availableMethods.find(m => m.toUpperCase().includes('NDIR'));
                    if (match) defaultValue = match;
                } else {
                    const match = availableMethods.find(m => !m.toUpperCase().includes('NDIR'));
                    if (match) defaultValue = match;
                }
            }
        }

        slot.innerHTML = `
            <select class="form-control select-metode" data-param="${paramName}" ${isReadonly ? 'disabled' : ''}
                    onchange="handleMethodDropdownChange(this)"
                    style="font-size: 0.7rem; height: 28px; padding: 0 10px; border-radius: 20px; border: 1px solid ${isReadonly ? '#cbd5e1' : '#2563eb'}; width: 100%; background: ${isReadonly ? '#f1f5f9' : '#fff'}; cursor: ${isReadonly ? 'not-allowed' : 'pointer'};">
                ${availableMethods.map(m => `<option value="${m}" ${m === defaultValue ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
        `;
    } else {
        slot.innerHTML = ''; 
    }
}

function handleMethodDropdownChange(select) {
    const paramName = select.dataset.param;
    
    // 1. Particulate / Partikulat change propagates to isokinetic / velocity
    if (paramName.toUpperCase().includes('PARTICULATE') || paramName.toUpperCase().includes('PARTIKULAT')) {
        const val = select.value || '';
        let keyword = '';
        if (val.toUpperCase().includes('EPA')) {
            keyword = 'EPA';
        } else if (val.includes('2009')) {
            keyword = '2009';
        } else if (val.includes('2021')) {
            keyword = '2021';
        }

        if (keyword) {
            const row = select.closest('tr');
            const targetParams = ['Volumetric Flow Rate', 'Num of Traverse Point', 'Percent of Isokinetic', 'Velocity', 'Water Vapor in flue gas'];
            targetParams.forEach(target => {
                const safeId = target.replace(/[^a-z0-9]/gi, '-');
                const otherSelect = row.querySelector(`#slot-metode-${safeId} select`);
                if (otherSelect) {
                    const options = Array.from(otherSelect.options);
                    const match = options.find(opt => {
                        const txt = opt.value.toUpperCase();
                        if (keyword === 'EPA') return txt.includes('EPA');
                        if (keyword === '2009') return txt.includes('2009');
                        if (keyword === '2021') return txt.includes('2021');
                        return false;
                    });
                    if (match) {
                        otherSelect.value = match.value;
                    }
                }
            });
        }
    }

    // 2. Oxygen (O2) / O2 change propagates to gas parameters (NDIR vs non-NDIR)
    const isO2 = paramName.toUpperCase() === 'OXYGEN (O2)' || paramName.toUpperCase() === 'O2';
    if (isO2) {
        const val = select.value || '';
        const isParamagnetic = val.toUpperCase().includes('PARAMAGNETIC') || val.toUpperCase().includes('PARAMAGNETIK');
        const row = select.closest('tr');
        
        const gasParams = ['CARBON MONOXIDE', 'CARBON DIOXIDE', 'NITROGEN OXIDE', 'NITROGEN MONOXIDE', 'SULFUR DIOXIDE', 'NITROGEN DIOXIDE', 'CO', 'CO2', 'NOX', 'NO', 'SO2', 'NO2'];
        const otherSelects = Array.from(row.querySelectorAll('select.select-metode'));
        otherSelects.forEach(otherSelect => {
            const otherParamName = otherSelect.dataset.param;
            if (otherParamName.toUpperCase() === 'OXYGEN (O2)' || otherParamName.toUpperCase() === 'O2') return;

            const isGas = gasParams.some(g => otherParamName.toUpperCase().includes(g));
            if (isGas) {
                if (isParamagnetic) {
                    const ndirOption = Array.from(otherSelect.options).find(opt => opt.value.toUpperCase().includes('NDIR'));
                    if (ndirOption) {
                        otherSelect.value = ndirOption.value;
                    }
                } else {
                    const nonNdirOption = Array.from(otherSelect.options).find(opt => !opt.value.toUpperCase().includes('NDIR'));
                    if (nonNdirOption) {
                        otherSelect.value = nonNdirOption.value;
                    }
                }
            }
        });
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

    // Selalu sembunyikan area preview cetak saat berpindah tab utama
    const printArea = document.getElementById('printArea');
    if (printArea) {
        printArea.classList.remove('show-preview');
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
        
        // Filter teks (No. COC / Nama Perusahaan)
        if (keyword) {
            filtered = filtered.filter(item => 
                (item.nomor_coc && item.nomor_coc.toLowerCase().includes(keyword)) ||
                (item.company_name && item.company_name.toLowerCase().includes(keyword))
            );
        }

        // Filter Rentang Tanggal (#19) - berdasarkan sampling_date
        const dateStart = document.getElementById('filterCocDateStart')?.value;
        const dateEnd   = document.getElementById('filterCocDateEnd')?.value;
        if (dateStart) {
            filtered = filtered.filter(item => item.sampling_date && item.sampling_date >= dateStart);
        }
        if (dateEnd) {
            filtered = filtered.filter(item => item.sampling_date && item.sampling_date <= dateEnd);
        }

        filteredCocList = filtered;
        currentPage = 1;

        renderCocTableRows();
        renderCocPaginationControls();
    } catch (err) {
        console.error("Error loading saved COC:", err);
    }
}

// Reset filter tanggal COC (#19)
window.resetCocDateFilter = function() {
    const start = document.getElementById('filterCocDateStart');
    const end   = document.getElementById('filterCocDateEnd');
    if (start) start.value = '';
    if (end)   end.value   = '';
    const keyword = document.getElementById('searchKeyword')?.value.toLowerCase() || '';
    fetchSavedCoc(keyword);
};


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
        const allowedToEdit = ['admin_master', 'admin_ts', 'manager'].includes(currentUserRole);
        let actionButtons = `<button class="btn-primary" onclick="loadCocToForm('${item.id}', true)" style="padding:5px 10px; font-size:0.7rem; background: #64748b;">BUKA</button>`;
        
        if (allowedToEdit) {
            actionButtons += `
                <button class="btn-primary" onclick="loadCocToForm('${item.id}', false)" style="padding:5px 8px; font-size:0.7rem; background: #2563eb;">EDIT</button>
                <button class="btn-primary" onclick="duplicateCoc('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #7c3aed;" title="Duplikat COC">📋 DUPLIKAT</button>
                <button class="btn-primary" onclick="directPrintCoc('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #059669;" title="Cetak COC Landscape">🖨️ COC</button>
                <button class="btn-primary" onclick="directPrintSpk('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #0891b2;" title="Cetak SPK Portrait">📄 SPK</button>
                <button class="btn-primary" onclick="directPrintSuratJalan('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #6d28d9;" title="Cetak Surat Jalan Alat (Form-ES-6.4.5)">🚚 SURAT JALAN</button>
                <button class="btn-primary" onclick="deleteCoc('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #ef4444;">HAPUS</button>
            `;
        } else {
            actionButtons += `
                <button class="btn-primary" onclick="directPrintCoc('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #059669;" title="Cetak COC Landscape">🖨️ COC</button>
                <button class="btn-primary" onclick="directPrintSpk('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #0891b2;" title="Cetak SPK Portrait">📄 SPK</button>
                <button class="btn-primary" onclick="directPrintSuratJalan('${item.id}')" style="padding:5px 8px; font-size:0.7rem; background: #6d28d9;" title="Cetak Surat Jalan Alat (Form-ES-6.4.5)">🚚 SURAT JALAN</button>
            `;
        }

        container.innerHTML += `
            <tr>
                <td style="padding:10px;">${new Date(item.sampling_date).toLocaleDateString('id-ID')}</td>
                <td style="padding:10px; font-weight:800; color:#2563eb;">${item.nomor_coc}</td>
                <td style="padding:10px;">${item.company_name}</td>
                <td style="padding:10px; text-align:center; display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                    ${actionButtons}
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

// --- DUPLIKAT COC PENUH (#17) ---
// Menyalin seluruh data COC lama ke form baru dengan nomor COC baru otomatis.
// User hanya perlu mengganti tanggal sampling dan nomor quotation.
window.duplicateCoc = async function(id) {
    if (!confirm('Duplikat COC ini ke form baru? Nomor COC baru akan digenerate otomatis. Anda hanya perlu mengubah tanggal & nomor quotation.')) return;

    const { data, error } = await _supabase.from('coc_emisi').select('*, samples(*)').eq('id', id).single();
    if (error || !data) {
        alert('Gagal memuat data COC untuk diduplikat.');
        return;
    }

    // 1. Switch ke tab form
    switchCocMainTab('form');

    // 2. Generate nomor COC baru
    await generateCocNumber();

    // 3. Isi header — KECUALI nomor COC (sudah di-generate baru) dan tanggal (dikosongkan)
    document.getElementById('companyName').value   = data.company_name || '';
    document.getElementById('companyAddress').value = data.company_address || '';
    document.getElementById('contactPerson').value  = data.contact_person || '';
    document.getElementById('phoneNumber').value    = data.phone_no || '';
    document.getElementById('emailCoa').value       = data.email_coa || '';
    document.getElementById('tatRequest').value     = data.tat_requested || 'Normal';
    // Kosongkan tanggal & quotation agar user wajib isi ulang
    document.getElementById('samplingDate').value   = '';
    document.getElementById('qtNo').value           = '';

    const officers = data.sampling_officer ? data.sampling_officer.split(', ') : [];
    document.getElementById('officer1').value = officers[0] || '';
    document.getElementById('officer2').value = officers[1] || '';
    document.getElementById('officer3').value = officers[2] || '';

    // Trigger auto-fill nomor sampel dari nomor COC baru
    const nomorCocVal = document.getElementById('nomorCoc').value;
    const sequenceOnly = nomorCocVal.slice(-4);

    // 4. Isi baris titik uji (cerobong) dari data lama
    const tbody = document.getElementById('cocBody');
    tbody.innerHTML = '';

    window.isLoadingSavedCoc = true;
    for (const [index, item] of (data.samples || []).entries()) {
        const row = document.createElement('tr');
        const newSampleId = `${sequenceOnly}.${index + 1}`;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="form-control sample-id" value="${newSampleId}" readonly style="background:#f8fafc; font-weight:800; color:#2563eb;"></td>
            <td><input type="text" class="form-control titik-uji" value="${item.description || ''}"></td>
            <td>
                <input type="text" class="form-control regulasi-search" list="listRegulasi" oninput="onRegulasiInput(this)" onkeypress="if(event.key === 'Enter') addRegulasiTag(this)" placeholder="Ketik &amp; Pilih...">
                <div class="selected-regulasi-tags" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">
                    ${(item.regulations || []).map(reg => `<span class="reg-tag" data-val="${reg}" style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:5px; font-size:0.7rem; display:flex; align-items:center; gap:5px; border:1px solid #dbeafe;">${reg}<span onclick="const p=this.parentElement; const c=p.closest('td'); p.remove(); updateParametersByTags(c)" style="cursor:pointer; font-weight:bold;">&times;</span></span>`).join('')}
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
            <td class="no-print" style="text-align: center; vertical-align: middle;">
                <button type="button" onclick="copyRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem; margin-right: 8px;" title="Duplikat baris">📋</button>
                <button type="button" onclick="removeRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem;">❌</button>
            </td>
        `;
        tbody.appendChild(row);

        const tagContainer = row.querySelector('.selected-regulasi-tags');
        await updateParametersByTags(tagContainer);

        (item.parameters || []).forEach(p => {
            const cb = row.querySelector(`.param-checkbox[value="${p.parameter}"]`);
            if (cb) {
                cb.checked = true;
                renderMethodDropdown(cb);
                setTimeout(() => {
                    const sel = row.querySelector(`select[data-param="${p.parameter}"]`);
                    if (sel) sel.value = p.method;
                }, 150);
            }
        });
    }
    window.isLoadingSavedCoc = false;

    // 5. Pastikan form dalam mode editable
    setFormReadonly(false);
    document.getElementById('cocFormContainer').dataset.readonly = 'false';

    // Scroll ke atas form
    document.querySelector('.content-body').scrollIntoView({ behavior: 'smooth' });

    // Notifikasi
    const banner = document.createElement('div');
    banner.id = 'duplicateBanner';
    banner.style.cssText = 'position:fixed; top:20px; right:20px; background:#7c3aed; color:white; padding:16px 24px; border-radius:16px; font-weight:800; font-size:0.85rem; z-index:9999; box-shadow:0 10px 30px rgba(124,58,237,0.3); display:flex; align-items:center; gap:10px;';
    banner.innerHTML = '📋 COC berhasil diduplikat! Ubah <strong>Tanggal Sampling</strong> dan <strong>No. Quotation</strong> sebelum menyimpan.';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
};

// --- LOGIKA OTOMATISASI SURAT PERINTAH KERJA (SPK) ---
function getRomanMonth(monthNum) {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romans[(parseInt(monthNum, 10) - 1)] || 'I';
}

function formatIndonesianDate(dateStr) {
    if (!dateStr) return '-';
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${d} ${months[m] || ''} ${y}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}

function formatShortDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function generateSpkNumber(nomorCoc, samplingDate) {
    let seq = '0001';
    if (nomorCoc) {
        const matches = nomorCoc.match(/\d{4}$/);
        if (matches) seq = matches[0];
    }
    
    let dateObj = new Date();
    if (samplingDate) {
        const parts = samplingDate.split('-');
        if (parts.length === 3) {
            dateObj = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
        } else {
            dateObj = new Date(samplingDate);
        }
    }
    
    const romanMonth = getRomanMonth(dateObj.getMonth() + 1);
    const year2Digit = String(dateObj.getFullYear()).slice(-2);
    
    return `No.${seq}/SPK/ES/${romanMonth}/${year2Digit}`;
}

function fillSpkTemplate(cocData) {
    const spkNomorEl = document.getElementById('spk-nomor');
    if (spkNomorEl) {
        spkNomorEl.innerText = generateSpkNumber(cocData.nomor_coc, cocData.sampling_date);
    }
    
    const custEl = document.getElementById('spk-customer');
    if (custEl) custEl.innerText = cocData.company_name || '-';

    const poEl = document.getElementById('spk-po');
    if (poEl) poEl.innerText = cocData.qt_no || '-';

    const alamatEl = document.getElementById('spk-alamat');
    if (alamatEl) alamatEl.innerText = cocData.company_address || '-';

    const tglOnsiteEl = document.getElementById('spk-tanggal-onsite');
    if (tglOnsiteEl) tglOnsiteEl.innerText = formatShortDate(cocData.sampling_date);

    const tglSuratEl = document.getElementById('spk-tgl-surat');
    if (tglSuratEl) tglSuratEl.innerText = formatIndonesianDate(cocData.sampling_date || new Date().toISOString().split('T')[0]);

    // Populate Petugas Table
    const tbody = document.getElementById('spk-table-petugas');
    if (tbody) {
        tbody.innerHTML = '';
        const officers = (cocData.sampling_officer || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
            
        if (officers.length > 0) {
            officers.forEach((name, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="border: 1pt solid black; padding: 6px; text-align: center !important; vertical-align: middle !important;">${idx + 1}</td>
                    <td style="border: 1pt solid black; padding: 6px; vertical-align: middle !important;">${name}</td>
                    <td style="border: 1pt solid black; padding: 6px; text-align: center !important; vertical-align: middle !important;">Petugas Sampling</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td style="border: 1pt solid black; padding: 6px; text-align: center !important; vertical-align: middle !important;">1</td>
                    <td style="border: 1pt solid black; padding: 6px; vertical-align: middle !important;">-</td>
                    <td style="border: 1pt solid black; padding: 6px; text-align: center !important; vertical-align: middle !important;">Petugas Sampling</td>
                </tr>
            `;
        }
    }
}

function fillSuratJalanTemplate(cocData) {
    const namaPekerjaan = document.getElementById('sj-nama-pekerjaan');
    if (namaPekerjaan) namaPekerjaan.innerText = "Pengambilan Sampel";

    const noQt = document.getElementById('sj-no-qt');
    if (noQt) noQt.innerText = `${cocData.qt_no || '-'} - ${cocData.nomor_coc || '-'}`;

    const tglPengerjaan = document.getElementById('sj-tgl-pengerjaan');
    if (tglPengerjaan) tglPengerjaan.innerText = formatShortDate(cocData.sampling_date) || '-';

    const namaPelanggan = document.getElementById('sj-nama-pelanggan');
    if (namaPelanggan) namaPelanggan.innerText = cocData.company_name || '-';

    const lokasiPengerjaan = document.getElementById('sj-lokasi-pengerjaan');
    if (lokasiPengerjaan) lokasiPengerjaan.innerText = cocData.company_address || 'MM2100';

    const tglTtdManager = document.getElementById('sj-tgl-ttd-manager');
    if (tglTtdManager) tglTtdManager.innerText = formatIndonesianDate(cocData.sampling_date || new Date().toISOString().split('T')[0]);

    // Master Catalog Peralatan Berdasarkan Tabel Matriks Parameter & Metode
    const MASTER_EQUIPMENT_RULES = [
        // Oksigen / Gas Direct Reading
        { 
            inv: 'EQP/ES/PL/2601/008.1', nama: 'Gas Analyzer', merek: 'Seitron', qty: 1, 
            match: (p, m) => (p.includes('oksigen') || p.includes('o2') || p.includes('gas')) && !m.includes('ndir') 
        },
        { 
            inv: 'EQP/ES/PL/2601/026.1', nama: 'Gas Analyzer', merek: 'MRU MGA PrimeQ', qty: 1, 
            match: (p, m) => (p.includes('oksigen') || p.includes('o2') || p.includes('gas')) && m.includes('ndir') 
        },

        // Opasitas / Opacity
        { 
            inv: 'EQP/ES/PL/2601/009.1', nama: 'Opasitas Ringlemann', merek: 'Fujis scope', qty: 1, 
            match: (p, m) => p.includes('opacit') || p.includes('opasitas') || p.includes('asap') 
        },

        // Apex Instruments Isokinetic Set (SNI 7117.17:2009 / EPA Method 5)
        { inv: 'EQP/ES/PL/2601/015.1', nama: 'Isokinetik Stack Sampler', merek: 'Apex Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117.17') || m.includes('epa method 5')) },
        { inv: 'EQP/ES/PL/2601/015.2', nama: 'Sampling Pumps apex', merek: 'Apex Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117.17') || m.includes('epa method 5')) },
        { inv: 'EQP/ES/PL/2601/015.3', nama: 'Heated Probes with liners apex', merek: 'Apex Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117.17') || m.includes('epa method 5')) },
        { inv: 'EQP/ES/PL/2601/015.4', nama: 'Nozzle Set apex', merek: 'Apex Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117.17') || m.includes('epa method 5')) },
        { inv: 'EQP/ES/PL/2601/015.5', nama: 'Filter Holder apex', merek: 'Apex Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117.17') || m.includes('epa method 5')) },
        { inv: 'EQP/ES/PL/2601/015.6', nama: 'Box Impinger glassware set apex', merek: 'Apex Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117.17') || m.includes('epa method 5')) },

        // Polltech Instruments Isokinetic Set (SNI 7117-21:2021)
        { inv: 'EQP/ES/PL/2601/016.1', nama: 'Isokinetik Stack Sampler', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.2', nama: 'Sampling Pumps polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.3', nama: 'Heated Probes with liners polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.4', nama: 'Pitot tube polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.5', nama: 'Nozzle Set polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.6', nama: 'Filter Holder polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.7', nama: 'stack gas temperature sensor polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },
        { inv: 'EQP/ES/PL/2601/016.8', nama: 'Box Impinger glassware set polltech', merek: 'Polltech Instruments', qty: 1, match: (p, m) => (p.includes('partic') || p.includes('debu')) && (m.includes('7117-21') || m.includes('7117.21') || m.includes('polltech')) },

        // Peralatan Pendukung General Particulate & Field Safety
        { inv: 'EQP/ES/PL/2601/010.1', nama: 'Dry Box Filter', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/011.1', nama: 'Cooler Box', merek: 'Lion star', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') || p.includes('sampel') },
        { inv: 'EQP/ES/PL/2601/012.1', nama: 'Jangka sorong', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/013.1', nama: 'Trolley', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/014.1', nama: 'Neraca Teknis', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/017.1<br>EQP/ES/PL/2601/017.2<br>EQP/ES/PL/2601/017.3', nama: 'Kabel Roll', merek: '-', qty: 3, match: (p) => p.includes('partic') || p.includes('debu') || p.includes('gas') },
        { inv: 'EQP/ES/PL/2601/018.1', nama: 'Tripod', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/019.1', nama: 'Tatakan', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/020.1', nama: 'Banner Safety Bekerja diKetinggian', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') || p.includes('gas') },
        { inv: 'EQP/ES/PL/2601/022.1', nama: 'Tali 25 meter', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/023.1', nama: 'Fylsheet 3x6', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/024.1', nama: 'Katrol 1 ton', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/025.1', nama: 'Terpal 2x4', merek: '-', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') },
        { inv: 'EQP/ES/PL/2601/027.1', nama: 'Panel listrik Portable', merek: 'Lokal', qty: 1, match: (p) => p.includes('partic') || p.includes('debu') || p.includes('gas') }
    ];

    // Ambil Semua Pasangan (Parameter, Metode) yang Dipilih di COC
    const selectedPairs = [];
    if (cocData.samples_data && Array.isArray(cocData.samples_data)) {
        cocData.samples_data.forEach(s => {
            (s.parameters || []).forEach(p => {
                selectedPairs.push({
                    param: (p.parameter || '').toLowerCase().trim(),
                    method: (p.method || '').toLowerCase().trim()
                });
            });
        });
    } else if (cocData.samples && Array.isArray(cocData.samples)) {
        cocData.samples.forEach(s => {
            (s.parameters || []).forEach(p => {
                selectedPairs.push({
                    param: (p.parameter || '').toLowerCase().trim(),
                    method: (p.method || '').toLowerCase().trim()
                });
            });
        });
    }

    // Filter Alat Berdasarkan Pasangan Parameter & Metode
    let matchedEquipment = [];
    if (selectedPairs.length > 0) {
        matchedEquipment = MASTER_EQUIPMENT_RULES.filter(rule => {
            return selectedPairs.some(pair => rule.match(pair.param, pair.method));
        });
    }

    // Fallback: Jika tidak ada match khusus atau parameter belum diisi, tampilkan daftar standar 33 item
    if (matchedEquipment.length === 0) {
        matchedEquipment = MASTER_EQUIPMENT_RULES;
    }

    // Format Nomor Urut 1..N
    const finalItems = matchedEquipment.map((item, idx) => ({
        no: idx + 1,
        inv: item.inv,
        nama: item.nama,
        qty: item.qty
    }));

    const managerDateText = formatIndonesianDate(cocData.sampling_date || new Date().toISOString().split('T')[0]);
    document.querySelectorAll('.sj-tgl-ttd-manager-val').forEach(el => el.innerText = managerDateText);

    const isTwoPages = finalItems.length > 20;
    const page1Items = isTwoPages ? finalItems.slice(0, 20) : finalItems;
    const page2Items = isTwoPages ? finalItems.slice(20) : [];

    const tbodyPage1 = document.getElementById('sj-tbody-page1');
    if (tbodyPage1) {
        tbodyPage1.innerHTML = page1Items.map(item => `
            <tr>
                <td style="border: 1pt solid black; padding: 2px; text-align: center;">${item.no}</td>
                <td style="border: 1pt solid black; padding: 2px 4px; font-family: monospace; font-size: 7pt;">${item.inv}</td>
                <td style="border: 1pt solid black; padding: 2px 4px;">${item.nama}</td>
                <td style="border: 1pt solid black; padding: 2px; text-align: center;">${item.qty}</td>
                <td style="border: 1pt solid black; padding: 2px; text-align: center;"></td>
                <td style="border: 1pt solid black; padding: 2px; text-align: center;"></td>
                <td style="border: 1pt solid black; padding: 1px 2px; font-size: 6.5pt; text-align: center; white-space: nowrap;">☐ Ada &nbsp; ☐ Tdk</td>
                <td style="border: 1pt solid black; padding: 1px 2px; font-size: 6.5pt; text-align: center; white-space: nowrap;">☐ Ada &nbsp; ☐ Tdk</td>
                <td style="border: 1pt solid black; padding: 2px;"></td>
            </tr>
        `).join('');
    }

    const sjSignaturesPage1 = document.getElementById('sj-signatures-page1');
    if (sjSignaturesPage1) {
        sjSignaturesPage1.style.display = isTwoPages ? 'none' : 'block';
    }

    const sjFooterPage1Num = document.getElementById('sj-footer-page1-num');
    if (sjFooterPage1Num) {
        sjFooterPage1Num.innerText = isTwoPages ? '1 dari 2' : '1 dari 1';
    }

    const sjPage2Wrapper = document.getElementById('sj-page-2-wrapper');
    if (sjPage2Wrapper) {
        if (isTwoPages) {
            sjPage2Wrapper.style.display = 'flex';
            const tbodyPage2 = document.getElementById('sj-tbody-page2');
            if (tbodyPage2) {
                tbodyPage2.innerHTML = page2Items.map(item => `
                    <tr>
                        <td style="border: 1pt solid black; padding: 2px; text-align: center;">${item.no}</td>
                        <td style="border: 1pt solid black; padding: 2px 4px; font-family: monospace; font-size: 7pt;">${item.inv}</td>
                        <td style="border: 1pt solid black; padding: 2px 4px;">${item.nama}</td>
                        <td style="border: 1pt solid black; padding: 2px; text-align: center;">${item.qty}</td>
                        <td style="border: 1pt solid black; padding: 2px; text-align: center;"></td>
                        <td style="border: 1pt solid black; padding: 2px; text-align: center;"></td>
                        <td style="border: 1pt solid black; padding: 1px 2px; font-size: 6.5pt; text-align: center; white-space: nowrap;">☐ Ada &nbsp; ☐ Tdk</td>
                        <td style="border: 1pt solid black; padding: 1px 2px; font-size: 6.5pt; text-align: center; white-space: nowrap;">☐ Ada &nbsp; ☐ Tdk</td>
                        <td style="border: 1pt solid black; padding: 2px;"></td>
                    </tr>
                `).join('');
            }
        } else {
            sjPage2Wrapper.style.display = 'none';
        }
    }
}

window.showCocPrintModal = function(cocData, items) {
    if (cocData) {
        fillSpkTemplate(cocData);
        fillSuratJalanTemplate(cocData);
    }
    const modal = document.getElementById('cocPrintModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.closeCocPrintModal = function() {
    const modal = document.getElementById('cocPrintModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.triggerPrintCocFromModal = function() {
    closeCocPrintModal();
    document.body.classList.remove('print-spk-mode', 'print-sj-mode');
    document.body.classList.add('print-coc-mode');
    
    // Paksa orientasi Landscape secara dinamis pada @page
    let styleEl = document.getElementById('printPageOrientation');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'printPageOrientation';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: A4 landscape !important; margin: 0.9cm 0cm 0.9cm 0cm !important; }`;

    const printArea = document.getElementById('printArea');
    if (printArea) printArea.classList.add('show-preview');
    const printAreaSpk = document.getElementById('printAreaSpk');
    if (printAreaSpk) printAreaSpk.style.display = 'none';
    const printAreaSj = document.getElementById('printAreaSuratJalan');
    if (printAreaSj) printAreaSj.style.display = 'none';

    setTimeout(() => {
        window.print();
    }, 300);
};

window.triggerPrintSpkFromModal = function() {
    closeCocPrintModal();
    document.body.classList.remove('print-coc-mode', 'print-sj-mode');
    document.body.classList.add('print-spk-mode');
    
    // Paksa orientasi Portrait secara dinamis pada @page
    let styleEl = document.getElementById('printPageOrientation');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'printPageOrientation';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: A4 portrait !important; margin: 2.54cm 2.54cm 2.54cm 3.25cm !important; }`;

    const printAreaSpk = document.getElementById('printAreaSpk');
    if (printAreaSpk) printAreaSpk.style.display = 'block';
    const printAreaSj = document.getElementById('printAreaSuratJalan');
    if (printAreaSj) printAreaSj.style.display = 'none';

    setTimeout(() => {
        window.print();
    }, 300);
};

window.triggerPrintSuratJalanFromModal = function() {
    closeCocPrintModal();
    document.body.classList.remove('print-coc-mode', 'print-spk-mode');
    document.body.classList.add('print-sj-mode');
    
    // Paksa orientasi Portrait secara dinamis pada @page untuk Surat Jalan Alat
    let styleEl = document.getElementById('printPageOrientation');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'printPageOrientation';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: A4 portrait !important; margin: 0.6cm 0.8cm 0.6cm 0.8cm !important; }`;

    const printAreaSj = document.getElementById('printAreaSuratJalan');
    if (printAreaSj) printAreaSj.style.display = 'block';
    const printAreaSpk = document.getElementById('printAreaSpk');
    if (printAreaSpk) printAreaSpk.style.display = 'none';

    setTimeout(() => {
        window.print();
    }, 300);
};

window.directPrintCoc = async function(id) {
    const { data, error } = await _supabase.from('coc_emisi').select('*, samples(*)').eq('id', id).single();
    if (error || !data) {
        alert("Gagal mengambil data COC untuk dicetak");
        return;
    }
    const cocData = {
        nomor_coc: data.nomor_coc,
        company_name: data.company_name,
        company_address: data.company_address,
        contact_person: data.contact_person,
        phone_no: data.phone_no,
        email_coa: data.email_coa,
        tat_requested: data.tat_requested,
        qt_no: data.qt_no,
        sampling_date: data.sampling_date,
        sampling_officer: data.sampling_officer
    };

    fillPrintTemplate(cocData, data.samples || []);
    triggerPrintCocFromModal();
};

window.directPrintSpk = async function(id) {
    const { data, error } = await _supabase.from('coc_emisi').select('*').eq('id', id).single();
    if (error || !data) {
        alert("Gagal mengambil data SPK untuk dicetak");
        return;
    }
    fillSpkTemplate(data);
    triggerPrintSpkFromModal();
};

window.directPrintSuratJalan = async function(id) {
    const { data, error } = await _supabase.from('coc_emisi').select('*, samples(*)').eq('id', id).single();
    if (error || !data) {
        alert("Gagal mengambil data Surat Jalan Alat untuk dicetak");
        return;
    }
    fillSuratJalanTemplate(data);
    triggerPrintSuratJalanFromModal();
};

window.directPrint = window.directPrintCoc;

// --- MEMASUKKAN DATA KE FORM (LOAD DATA) ---
async function loadCocToForm(id, isReadonly = false) {
    window.isLoadingSavedCoc = true;
    const { data, error } = await _supabase.from('coc_emisi').select('*, samples(*)').eq('id', id).single();
    if (error) {
        window.isLoadingSavedCoc = false;
        return alert("Gagal memuat data");
    }

    const formContainer = document.getElementById('cocFormContainer');
    if (formContainer) {
        formContainer.dataset.readonly = isReadonly ? 'true' : 'false';
    }

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

    for (const [index, item] of (data.samples || []).entries()) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="form-control sample-id" value="${item.sample_id}" readonly style="background:#f8fafc; font-weight:800; color:#2563eb;"></td>
            <td><input type="text" class="form-control titik-uji" value="${item.description}"></td>
            <td>
                <input type="text" class="form-control regulasi-search" list="listRegulasi" oninput="onRegulasiInput(this)" onkeypress="if(event.key === 'Enter') addRegulasiTag(this)" placeholder="Ketik & Pilih...">
                <div class="selected-regulasi-tags" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">
                    ${item.regulations.map(reg => `<span class="reg-tag" data-val="${reg}" style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:5px; font-size:0.7rem; display:flex; align-items:center; gap:5px; border:1px solid #dbeafe;">${reg}<span onclick="const p=this.parentElement; const c=p.closest('td'); p.remove(); updateParametersByTags(c)" style="cursor:pointer; font-weight:bold;">&times;</span></span>`).join('')}
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
            <td class="no-print" style="text-align: center; vertical-align: middle;">
                <button type="button" onclick="copyRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem; margin-right: 8px;" title="Duplikat baris">📋</button>
                <button type="button" onclick="removeRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem;">❌</button>
            </td>
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

    window.isLoadingSavedCoc = false;
    setFormReadonly(isReadonly);

    let existingPrintBtn = document.getElementById('extraPrintBtn');
    if (!existingPrintBtn) {
        const printBtn = document.createElement('button');
        printBtn.id = 'extraPrintBtn';
        printBtn.className = 'btn-save no-print';
        printBtn.style.background = '#059669';
        printBtn.style.marginTop = '10px';
        printBtn.innerText = '🖨️ CETAK DOKUMEN (COC / SPK / SURAT JALAN)';
        printBtn.onclick = () => showCocPrintModal(data, data.samples || []);
        document.querySelector('.coc-card').appendChild(printBtn);
    } else {
        existingPrintBtn.onclick = () => showCocPrintModal(data, data.samples || []);
    }

    switchCocMainTab('form');

    // Mengisi data ke area preview cetak di bawah form agar bisa dilihat langsung
    const cocData = {
        nomor_coc: data.nomor_coc,
        company_name: data.company_name,
        company_address: data.company_address,
        contact_person: data.contact_person,
        qt_no: data.qt_no,
        sampling_date: data.sampling_date,
        sampling_officer: data.sampling_officer
    };
    fillPrintTemplate(cocData, data.samples || []);

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

function setFormReadonly(readonly) {
    const formContainer = document.getElementById('cocFormContainer');
    if (formContainer) {
        formContainer.dataset.readonly = readonly ? 'true' : 'false';
    }

    // 1. Enable/Disable header inputs
    const headerInputIds = [
        'nomorCoc', 'companyName', 'companyAddress', 'contactPerson', 
        'phoneNumber', 'emailCoa', 'qtNo', 'tatRequest', 'samplingDate', 
        'officer1', 'officer2', 'officer3'
    ];
    headerInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = readonly;
    });

    // 2. Enable/Disable inputs and selects in the table
    const tableInputs = document.querySelectorAll('#cocBody input, #cocBody select, #cocBody textarea');
    tableInputs.forEach(el => {
        el.disabled = readonly;
    });

    // 3. Hide/Show action buttons
    const btnAdd = document.querySelector('.btn-add');
    if (btnAdd) {
        btnAdd.style.display = readonly ? 'none' : 'block';
    }
    const btnSave = document.querySelector('.btn-save:not(#extraPrintBtn)');
    if (btnSave) {
        btnSave.style.display = readonly ? 'none' : 'block';
    }

    // 4. Hide/Show remove row buttons (❌)
    const removeBtns = document.querySelectorAll('#cocBody tr td button');
    removeBtns.forEach(btn => {
        btn.style.display = readonly ? 'none' : 'inline-block';
    });

    // 5. Hide/Show delete tag buttons (×)
    const tagCloses = document.querySelectorAll('#cocBody .reg-tag span');
    tagCloses.forEach(span => {
        span.style.display = readonly ? 'none' : 'inline';
    });

    // 6. Disable parameter checkboxes and select all checkboxes
    const paramCbs = document.querySelectorAll('#cocBody .param-checkbox');
    paramCbs.forEach(cb => {
        cb.disabled = readonly;
    });

    const selectAllCbs = document.querySelectorAll('#cocBody .select-all-area input[type="checkbox"]');
    selectAllCbs.forEach(cb => {
        cb.disabled = readonly;
    });
}

window.createNewCoc = async function() {
    // Reset all header inputs
    const headerFields = [
        'companyName', 'companyAddress', 'contactPerson', 'phoneNumber', 
        'emailCoa', 'samplingDate', 'officer1', 'officer2', 'officer3'
    ];
    headerFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Clear extra print button if exists
    const extraPrintBtn = document.getElementById('extraPrintBtn');
    if (extraPrintBtn) {
        extraPrintBtn.remove();
    }

    // Reset table rows to 1 empty row
    const tbody = document.getElementById('cocBody');
    tbody.innerHTML = `
        <tr>
            <td>1</td>
            <td><input type="text" class="form-control sample-id" readonly style="background: #f8fafc; font-weight: 800; color: #2563eb;" placeholder="Auto"></td>
            <td><input type="text" class="form-control titik-uji" placeholder="Nama Titik & Deskripsi"></td>
            <td>
                <input type="text" class="form-control regulasi-search" list="listRegulasi" oninput="onRegulasiInput(this)" onkeypress="if(event.key === 'Enter') addRegulasiTag(this)" placeholder="Ketik & Pilih...">
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
            <td class="no-print" style="text-align: center; vertical-align: middle;">
                <button type="button" onclick="removeRow(this)" style="background:none; border:none; cursor:pointer; font-size: 1.1rem;">❌</button>
            </td>
        </tr>
    `;

    // Make editable
    setFormReadonly(false);

    // Generate new COC number
    await generateCocNumber();
    await initQuotationNumber();

    // Switch tab
    switchCocMainTab('form');
};

window.deleteCoc = async function(id) {
    const warningText = "Warning!! COC yang dihapus tidak dapat dikembalikan, hanya admin_master yang bisa hapus\n\nApakah Anda yakin ingin menghapus COC ini?";
    if (!confirm(warningText)) return;
    
    if (window.currentUserRole !== 'admin_master') {
        alert("Maaf, hanya admin_master yang bisa hapus COC.");
        return;
    }
    
    try {
        // Fetch old data for audit log first
        const { data: oldData } = await _supabase
            .from('coc_emisi')
            .select('*')
            .eq('id', id)
            .single();

        const { error } = await _supabase.from('coc_emisi').delete().eq('id', id);
        if (error) throw error;

        // Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session && oldData) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'DELETE_COC',
                table_name: 'coc_emisi',
                description: `Menghapus COC ${oldData.nomor_coc} (${oldData.company_name})`,
                old_data: oldData,
                new_data: null
            }]);
        }

        alert("COC berhasil dihapus.");
        fetchSavedCoc(document.getElementById('searchKeyword')?.value.toLowerCase());
    } catch (err) {
        console.error("Gagal menghapus COC:", err);
        alert("Gagal menghapus: " + err.message);
    }
};

// Fungsi otomatis membuat akun login klien jika belum ada
async function autoCreateClientAccount(companyName) {
    if (!companyName) return;
    try {
        const { data: existingAccount, error: fetchErr } = await _supabase
            .from('client_accounts')
            .select('id')
            .eq('company_name', companyName)
            .maybeSingle();

        if (fetchErr) {
            console.error("Gagal memeriksa akun klien:", fetchErr);
            return;
        }

        if (!existingAccount) {
            // Generasi username: klien_ + nama PT disederhanakan
            const cleanCompanyName = companyName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20);
            
            const username = `klien_${cleanCompanyName}`;
            
            // Generasi password acak awal
            const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
            const password = `ES-${randomSuffix}`;

            // Insert ke tabel client_accounts
            const { error: insertErr } = await _supabase
                .from('client_accounts')
                .insert([{
                    company_name: companyName,
                    username: username,
                    password: password
                }]);

            if (insertErr) {
                console.error("Gagal membuat akun klien otomatis:", insertErr);
            } else {
                console.log(`Akun klien otomatis dibuat: ${username} / ${password}`);
            }
        }
    } catch (err) {
        console.error("Error auto-creating client account:", err);
    }
}