/** * LOGIC PENERIMAAN SAMPEL 
 * Menampilkan data dari table 'coc_emisi' dengan status_sampling = 'Selesai'
 */

let userRole = null;
let currentFilterTab = 'belum_diterima';
let currentPage = 1;
const pageSize = 10;
let filteredSamplesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Sesi (Pastikan _supabase sudah didefinisikan di config.js)
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Ambil Role
    userRole = session.user.user_metadata?.role;
    if (!userRole) {
        const { data: profile } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
        userRole = profile?.role;
    }

    console.log("Role terkonfirmasi di penerimaan:", userRole);

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

        const canBatal = isReceived && userRole === 'admin_master';
        
        let aksiHtml = `
            <button onclick="prosesTerimaSampel('${item.db_id}', '${item.sample_id}')" 
                    class="btn-receive" 
                    style="${isReceived ? 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;' : ''}">
                ${isReceived ? '📝 Edit Tgl' : '📥 Terima'}
            </button>
        `;

        if (canBatal) {
            aksiHtml += `
                <button onclick="batalTerimaSampel('${item.db_id}', '${item.sample_id}')" 
                        class="btn-receive" 
                        style="background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; margin-left: 6px;">
                    🔓 Batal Terima
                </button>
            `;
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
                    ${isReceived && item.tgl_terima_lab ? `<div style="font-size:0.65rem; color:#64748b; margin-top:4px;">Masuk: ${item.tgl_terima_lab}</div>` : ''}
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
        const { data: cocList, error } = await _supabase
            .from('coc_emisi')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        let allSamples = [];

        cocList.forEach(coc => {
            let samples = [];
            try {
                samples = typeof coc.samples_data === 'string' 
                    ? JSON.parse(coc.samples_data) 
                    : coc.samples_data;
            } catch (e) {
                console.error("Gagal parse JSON pada ID:", coc.id);
            }

            samples.forEach(s => {
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

        renderTableRows();
        renderPaginationControls();

    } catch (err) {
        console.error(err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Koneksi Gagal.</td></tr>`;
        }
    }
}

async function prosesTerimaSampel(dbId, sampleId) {
    try {
        // 1. Ambil data COC terlebih dahulu untuk cek tanggal lama
        const { data: coc } = await _supabase.from('coc_emisi').select('samples_data').eq('id', dbId).single();
        let samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;
        
        // Cari data sampel yang spesifik
        const targetSample = samples.find(s => s.sample_id === sampleId);
        const tglLama = targetSample.tgl_terima_lab || new Date().toISOString().split('T')[0];
        
        // 2. Tampilkan prompt (Jika sudah ada tanggal, user bisa edit)
        const pesanPrompt = targetSample.status_lab === 'received' 
            ? `Edit Tanggal Penerimaan untuk ${sampleId}:` 
            : `Masukkan Tanggal Penerimaan Fisik (${sampleId}):`;
            
        const tglInput = prompt(pesanPrompt, tglLama);
        
        if (!tglInput) return; // Batal jika cancel

        // 3. Update array JSON
        const updated = samples.map(s => {
            if (s.sample_id === sampleId) {
                return { 
                    ...s, 
                    status_lab: 'received', 
                    tgl_terima_lab: tglInput 
                };
            }
            return s;
        });

        // 4. Simpan ke Supabase
        const { error } = await _supabase.from('coc_emisi').update({ samples_data: updated }).eq('id', dbId);
        if (error) throw error;

        fetchDataPenerimaan(); 
    } catch (err) {
        alert("Gagal memperbarui data: " + err.message);
    }
}

// Fungsi pembantu untuk notifikasi yang lebih cantik daripada alert bawaan
function showNotification(msg) {
    // Anda bisa mengganti ini dengan Toast library atau custom div
    console.log("LIMS-NOTIF:", msg);
}

async function batalTerimaSampel(dbId, sampleId) {
    if (!confirm(`Apakah Anda yakin ingin membatalkan penerimaan sampel ${sampleId}? Status lab akan dikembalikan ke Belum Diterima.`)) return;

    try {
        // 1. Ambil data COC
        const { data: coc } = await _supabase.from('coc_emisi').select('samples_data').eq('id', dbId).single();
        let samples = typeof coc.samples_data === 'string' ? JSON.parse(coc.samples_data) : coc.samples_data;

        // 2. Reset status_lab & tgl_terima_lab
        const updated = samples.map(s => {
            if (s.sample_id === sampleId) {
                const { status_lab, tgl_terima_lab, ...rest } = s;
                return {
                    ...rest,
                    status_lab: null,
                    tgl_terima_lab: null
                };
            }
            return s;
        });

        // 3. Simpan ke Supabase
        const { error } = await _supabase.from('coc_emisi').update({ samples_data: updated }).eq('id', dbId);
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

