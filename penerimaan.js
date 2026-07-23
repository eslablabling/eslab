/** * LOGIC PENERIMAAN SAMPEL 
 * Menampilkan data dari table 'coc_emisi' dengan status_sampling = 'Selesai'
 */

let userRole = null;
let currentFilterTab = 'belum_diterima';
let currentPage = 1;
const pageSize = 10;
let filteredSamplesList = [];
let sortState = { col: 'sample_id', dir: 'asc' };

window.addEventListener('auth-ready', async (e) => {
    const { role } = e.detail;
    userRole = role;

    // 2. Ambil data pertama kali
    fetchDataPenerimaan();

    // 3. Listener untuk fitur pencarian
    const searchPenerimaan = document.getElementById('searchPenerimaan');
    if (searchPenerimaan) {
        searchPenerimaan.addEventListener('input', (e) => {
            fetchDataPenerimaan(e.target.value.toLowerCase());
        });
    }

    // 4. Listener untuk Paginasi
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
});

// Expose global functions to window
window.switchPenerimaanTab = function(tabName) {
    currentFilterTab = tabName;
    currentPage = 1;
    
    // Update active class on buttons
    document.getElementById('tabBelumDiterima').classList.toggle('active', tabName === 'belum_diterima');
    document.getElementById('tabSudahDiterima').classList.toggle('active', tabName === 'sudah_diterima');
    
    // Refresh table view
    fetchDataPenerimaan(document.getElementById('searchPenerimaan')?.value || '');
};

window.goToPage = function(pageNumber) {
    const totalPages = Math.ceil(filteredSamplesList.length / pageSize) || 1;
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderTableRows();
        renderPaginationControls();
    }
};

function formatTimestampDisplay(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthStr = months[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day} ${monthStr} ${year} ${hours}:${minutes}`;
}

// Helper untuk menghitung hari kerja (Sabtu & Minggu tidak dihitung)
function getWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    
    if (start > end) return 0;
    
    let count = 0;
    let curDate = new Date(start);
    
    while (curDate < end) {
        curDate.setDate(curDate.getDate() + 1);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat & Sun
            count++;
        }
    }
    return count;
}

// Helper untuk menambahkan hari kerja ke tanggal mulai
function addWorkingDays(startDate, days) {
    const date = new Date(startDate);
    date.setHours(0,0,0,0);
    let count = 0;
    while (count < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat & Sun
            count++;
        }
    }
    return date;
}

function renderTableRows() {
    const tableBody = document.getElementById('penerimaanTableBody');
    if (!tableBody) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredSamplesList.length);
    
    const paginatedSamples = filteredSamplesList.slice(startIndex, endIndex);

    if (paginatedSamples.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">Tidak ada sampel.</td></tr>`;
        return;
    }

    tableBody.innerHTML = paginatedSamples.map(item => {
        const isReceived = ['received', 'analyzed', 'verified'].includes(item.status_lab);
        
        // 1. Tentukan Durasi Berdasarkan Priority
        const priority = (item.tat_requested || "NORMAL").toUpperCase();
        const isUrgent = priority === 'URGENT';
        const durasiTarget = isUrgent ? 5 : 14; // Urgent 5 hari, Normal 14 hari

        let tatDisplay = "";

        if (isReceived && item.tgl_terima_lab) {
            // 2. Hitung Tanggal Deadline Kerja
            const tglDeadline = addWorkingDays(item.tgl_terima_lab, durasiTarget);

            // 3. Tentukan tanggal akhir perbandingan (tgl selesai analisa atau sekarang)
            const tglAkhir = item.analyzed_at ? new Date(item.analyzed_at) : new Date();
            const workingDaysElapsed = getWorkingDays(item.tgl_terima_lab, tglAkhir);
            const sisaHariKerja = durasiTarget - workingDaysElapsed;

            const isCompleted = ['analyzed', 'verified'].includes(item.status_lab);
            
            // 4. Tentukan Warna dan Label
            let labelWarna = '#64748b'; // default
            let statusTeks = '';

            if (sisaHariKerja < 0) {
                labelWarna = '#ef4444'; // merah jika terlambat
                statusTeks = `Terlambat ${Math.abs(sisaHariKerja)} Hari Kerja${isCompleted ? ' (Selesai)' : ''}`;
            } else {
                if (isCompleted) {
                    labelWarna = '#10b981'; // hijau jika selesai tepat waktu
                    statusTeks = `Selesai dalam ${workingDaysElapsed} Hari Kerja (Tepat Waktu)`;
                } else {
                    labelWarna = sisaHariKerja <= 2 ? '#f59e0b' : '#64748b'; // orange jika sisa <= 2
                    statusTeks = `Sisa ${sisaHariKerja} Hari Kerja lagi`;
                }
            }

            const tglDeadlineStr = tglDeadline.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

            tatDisplay = `
                <div style="margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${labelWarna};">
                    <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">Target Selesai (${priority})</div>
                    <div style="font-weight: 800; color: ${labelWarna}; font-size: 0.85rem;">📅 ${tglDeadlineStr}</div>
                    <div style="font-size: 0.7rem; color: ${labelWarna}; font-weight: 600;">
                        ${statusTeks}
                    </div>
                </div>
            `;
        }

        const allowedToReceive = ['analis', 'admin_master', 'manager', 'admin_ts'].includes(userRole);
        const canBatal = isReceived && ['admin_master', 'manager'].includes(userRole);
        
        let aksiHtml = '';
        if (isReceived) {
            // Jika sudah diterima, tidak ada tombol Edit Tgl. Hanya tombol Batal Terima untuk role tertentu.
            if (canBatal) {
                aksiHtml = `
                    <button onclick="batalTerimaSampel('${item.db_id}', '${item.sample_id}')" 
                            class="btn-receive" 
                            style="background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6;">
                        🔓 Batal Terima
                    </button>
                `;
            }
        } else {
            // Jika belum diterima, tunjukkan tombol Terima untuk role yang berwenang
            if (allowedToReceive) {
                aksiHtml = `
                    <button onclick="prosesTerimaSampel('${item.db_id}', '${item.sample_id}')" 
                            class="btn-receive">
                        📥 Terima
                    </button>
                `;
            } else {
                aksiHtml = `<span style="font-size: 0.75rem; color: #94a3b8; font-style: italic;">Akses Terbatas</span>`;
            }
        }

        return `
            <tr>
                <td style="font-weight: 800; color: var(--primary);">${item.sample_id}</td>
                <td>
                    <div style="font-weight: 700;">${item.company}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${item.description || '-'}</div>
                    
                    ${tatDisplay}

                    ${item.isPartikulat ? '<span class="tag" style="background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe; font-size:0.6rem; margin-top:8px; display:inline-block;">⚖️ ISOKINETIK</span>' : ''}
                </td>
                <td>
                    <span class="tag ${isReceived ? 'tag-green' : 'tag-orange'}">
                        ${isReceived ? '● DITERIMA LAB' : '○ FISIK DITUNGGU'}
                    </span>
                    ${isReceived && item.tgl_terima_lab ? `<div style="font-size:0.65rem; color:#64748b; margin-top:4px;">Masuk: ${formatTimestampDisplay(item.tgl_terima_lab)}</div>` : ''}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; align-items: center; justify-content: flex-end;">
                        ${aksiHtml}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

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

async function fetchDataPenerimaan(keyword = '') {
    const tableBody = document.getElementById('penerimaanTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px;">Memuat data...</td></tr>';
    }

    try {
        const { data: samples, error } = await _supabase
            .from('samples')
            .select('*, coc_emisi(*)')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        let allSamples = [];

        samples.forEach(s => {
            const coc = s.coc_emisi || {};
            const isReceivedVal = ['received', 'analyzed', 'verified'].includes(s.status_lab);
            if (s.status === 'Done' || isReceivedVal) {
                const hasParticulate = s.parameters && s.parameters.some(p => 
                    p.parameter.toLowerCase().includes('particulate')
                );

                const sampleObj = {
                    ...s,
                    db_id: coc.id,
                    company: coc.company_name,
                    isPartikulat: hasParticulate
                };

                if (currentFilterTab === 'belum_diterima' && !isReceivedVal) {
                    allSamples.push(sampleObj);
                } else if (currentFilterTab === 'sudah_diterima' && isReceivedVal) {
                    allSamples.push(sampleObj);
                }
            }
        });

        if (keyword) {
            allSamples = allSamples.filter(s => 
                s.sample_id.toLowerCase().includes(keyword) || 
                s.company.toLowerCase().includes(keyword) ||
                (s.description && s.description.toLowerCase().includes(keyword))
            );
        }

        filteredSamplesList = allSamples;
        currentPage = 1;

        applyPenerimaanSortAndRender();

    } catch (err) {
        console.error(err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Koneksi Gagal.</td></tr>`;
        }
    }
}

async function prosesTerimaSampel(dbId, sampleId) {
    const allowed = ['analis', 'admin_master', 'manager', 'admin_ts'].includes(userRole);
    if (!allowed) {
        alert("Akses ditolak: Hanya Analis, Admin, dan Manager yang dapat memproses penerimaan sampel.");
        return;
    }

    try {
        // 1. Ambil data sampel beserta relasi coc_emisi
        const { data: targetSample, error: sampleError } = await _supabase
            .from('samples')
            .select('*, coc_emisi(*)')
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId)
            .single();
            
        if (sampleError) throw sampleError;
        
        let oldDate = "";
        let oldTime = "08:00"; // default time

        if (targetSample.tgl_terima_lab) {
            const d = new Date(targetSample.tgl_terima_lab);
            if (!isNaN(d.getTime())) {
                oldDate = d.toISOString().split('T')[0];
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                oldTime = `${hours}:${minutes}`;
            }
        } else {
            const d = new Date();
            oldDate = d.toISOString().split('T')[0];
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            oldTime = `${hours}:${minutes}`;
        }
        
        // 2. Format tanggal lama DD/MM/YYYY
        let tglTextVal = "";
        if (oldDate) {
            const parts = oldDate.split('-');
            if (parts.length === 3) {
                tglTextVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                tglTextVal = oldDate;
            }
        }

        // Tampilkan modal
        const modalTitle = targetSample.status_lab === 'received' 
            ? `Edit Tanggal Penerimaan untuk ${sampleId}` 
            : `Masukkan Tanggal Penerimaan Fisik (${sampleId})`;
            
        document.getElementById('penerimaanModalTitle').innerText = modalTitle;
        document.getElementById('penerimaanTglText').value = tglTextVal;
        document.getElementById('penerimaanTglPicker').value = oldDate;
        document.getElementById('penerimaanJam').value = oldTime;
        document.getElementById('modalPenerimaan').style.display = 'flex';

        // Bind simpan action
        const btnSimpan = document.getElementById('btnSimpanPenerimaan');
        const newBtn = btnSimpan.cloneNode(true);
        btnSimpan.parentNode.replaceChild(newBtn, btnSimpan);

        newBtn.addEventListener('click', async () => {
            const typedVal = document.getElementById('penerimaanTglText').value.trim();
            const timeVal = document.getElementById('penerimaanJam').value.trim() || '08:00';
            
            let finalDate = "";
            if (typedVal) {
                const parts = typedVal.split('/');
                if (parts.length === 3) {
                    finalDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                } else {
                    const d = new Date(typedVal);
                    if (!isNaN(d.getTime())) {
                        finalDate = d.toISOString().split('T')[0];
                    } else {
                        finalDate = typedVal;
                    }
                }
            }
            
            if (!finalDate) {
                alert("Tanggal penerimaan tidak valid!");
                return;
            }

            // Gabungkan tanggal dengan jam (lokal timezone)
            const combinedString = `${finalDate}T${timeVal}:00`;
            const dateObj = new Date(combinedString);
            
            if (isNaN(dateObj.getTime())) {
                alert("Format waktu tidak valid!");
                return;
            }

            // Simpan ke Supabase sebagai ISO string UTC/Tz
            const isoTimestamp = dateObj.toISOString();

            const { error } = await _supabase
                .from('samples')
                .update({ 
                    status_lab: 'received', 
                    tgl_terima_lab: isoTimestamp 
                })
                .eq('coc_id', dbId)
                .eq('sample_id', sampleId);
                
            if (error) {
                alert("Gagal memperbarui data: " + error.message);
            } else {
                if (typeof window.notifySampleReceived === 'function') {
                    const cocInfo = targetSample?.coc_emisi || {};
                    const cocNo = cocInfo.no_coc || cocInfo.coc_number || targetSample?.sample_id || 'COC';
                    const compName = cocInfo.company_name || 'Klien';
                    window.notifySampleReceived(
                        cocNo,
                        compName,
                        1
                    );
                }
                tutupModalPenerimaan();
                fetchDataPenerimaan();
            }
        });

    } catch (err) {
        alert("Gagal memproses penerimaan: " + err.message);
    }
}

// Fungsi pembantu untuk notifikasi yang lebih cantik daripada alert bawaan
function showNotification(msg) {
    // Notifikasi internal
}

async function batalTerimaSampel(dbId, sampleId) {
    const allowed = ['admin_master', 'manager'].includes(userRole);
    if (!allowed) {
        alert("Akses ditolak: Hanya Admin Master dan Manager yang dapat membatalkan penerimaan sampel.");
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin membatalkan penerimaan sampel ${sampleId}? Status lab akan dikembalikan ke Belum Diterima.`)) return;

    try {
        // Update status_lab & tgl_terima_lab langsung ke tabel samples
        const { error } = await _supabase
            .from('samples')
            .update({
                status_lab: null,
                tgl_terima_lab: null
            })
            .eq('coc_id', dbId)
            .eq('sample_id', sampleId);
        if (error) throw error;

        // 4. Log audit
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.from('audit_logs').insert([{
                user_id: session.user.id,
                username: session.user.email,
                action_type: 'UNRECEIVE_SAMPLE',
                table_name: 'coc_emisi',
                description: `Membatalkan penerimaan sampel ${sampleId}`,
                new_data: { sample_id: sampleId, status_lab: null }
            }]);
        }

        alert("Penerimaan sampel berhasil dibatalkan!");
        fetchDataPenerimaan();
    } catch (err) {
        alert("Gagal membatalkan penerimaan: " + err.message);
    }
}

// Bind to window for HTML onclick attributes
window.batalTerimaSampel = batalTerimaSampel;
window.prosesTerimaSampel = prosesTerimaSampel;

function tutupModalPenerimaan() {
    document.getElementById('modalPenerimaan').style.display = 'none';
}
window.tutupModalPenerimaan = tutupModalPenerimaan;

function syncPenerimaanDatePicker(val) {
    if (val) {
        const parts = val.split('-');
        if (parts.length === 3) {
            document.getElementById('penerimaanTglText').value = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
}
window.syncPenerimaanDatePicker = syncPenerimaanDatePicker;

function applyPenerimaanSortAndRender() {
    if (sortState.col && sortState.col !== 'none') {
        filteredSamplesList.sort((a, b) => {
            let valA = a[sortState.col];
            let valB = b[sortState.col];

            if (sortState.col === 'company') {
                valA = a.company || '';
                valB = b.company || '';
            } else if (sortState.col === 'status_lab') {
                valA = a.status_lab || '';
                valB = b.status_lab || '';
            } else {
                valA = a.sample_id || '';
                valB = b.sample_id || '';
            }

            const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            return sortState.dir === 'asc' ? cmp : -cmp;
        });
    }

    const headers = {
        sample_id: document.getElementById('hdrSampleId'),
        company: document.getElementById('hdrInfo'),
        status_lab: document.getElementById('hdrStatus')
    };

    Object.keys(headers).forEach(key => {
        const el = headers[key];
        if (el) {
            let label = el.innerText.replace(/[▲▼⇅]/g, '').trim();
            if (sortState.col === key) {
                el.innerText = label + (sortState.dir === 'asc' ? ' ▲' : ' ▼');
            } else {
                el.innerText = label + ' ⇅';
            }
        }
    });

    renderTableRows();
    renderPaginationControls();
}

window.handlePenerimaanSort = function(colName) {
    if (sortState.col === colName) {
        if (sortState.dir === 'asc') {
            sortState.dir = 'desc';
        } else {
            sortState.col = 'sample_id';
            sortState.dir = 'asc';
        }
    } else {
        sortState.col = colName;
        sortState.dir = 'asc';
    }
    applyPenerimaanSortAndRender();
};

