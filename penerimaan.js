/** * LOGIC PENERIMAAN SAMPEL 
 * Menampilkan data dari table 'coc_emisi' dengan status_sampling = 'Selesai'
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Sesi (Pastikan _supabase sudah didefinisikan di config.js)
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Ambil data pertama kali
    fetchDataPenerimaan();

    // 3. Listener untuk fitur pencarian
    document.getElementById('searchPenerimaan').addEventListener('input', (e) => {
        fetchDataPenerimaan(e.target.value.toLowerCase());
    });
});

async function fetchDataPenerimaan(keyword = '') {
    const tableBody = document.getElementById('penerimaanTableBody');

    // 1. Definisikan fungsi helper di dalam atau di luar
    const hitungHari = (tglTerima) => {
        if (!tglTerima) return 0;
        const start = new Date(tglTerima);
        const now = new Date();
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    };

    try {
        const { data: cocList, error } = await _supabase
            .from('coc_emisi')
            .select('*')
            // .eq('status_sampling', 'Selesai') 
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

            // DI DALAM cocList.forEach
            samples.forEach(s => {
                // TAMBAHKAN LOGIKA INI: 
                // Hanya masukkan sampel ke daftar penerimaan jika sudah 'Done' (lapangan) 
                // ATAU jika memang sudah pernah diterima lab sebelumnya.
                if (s.status === 'Done' || s.status_lab === 'received') {
                    
                    const hasParticulate = s.parameters && s.parameters.some(p => 
                        p.parameter.toLowerCase().includes('particulate')
                    );

                    allSamples.push({
                        ...s,
                        db_id: coc.id,
                        company: coc.company_name,
                        isPartikulat: hasParticulate
                    });
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

        if (allSamples.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">Tidak ada sampel.</td></tr>`;
            return;
        }

        // --- RENDER TABEL ---
        tableBody.innerHTML = allSamples.map(item => {
            const isReceived = ['received', 'analyzed', 'verified'].includes(item.status_lab);
            
            // Logika TAT: Hitung hari jika tgl_terima_lab ada
            const jumlahHari = isReceived ? hitungHari(item.tgl_terima_lab) : 0;
            const tatColor = jumlahHari > 10 ? '#ef4444' : '#64748b'; // Merah jika > 10 hari

            return `
                <tr>
                    <td style="font-weight: 800; color: var(--primary);">${item.sample_id}</td>
                    <td>
                        <div style="font-weight: 700;">${item.company}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${item.description || '-'}</div>
                        
                        ${isReceived ? `
                            <div style="font-size: 0.7rem; margin-top: 5px; font-weight: 700; color: ${tatColor}; display: flex; align-items: center; gap: 4px;">
                                ⏳ TAT: ${jumlahHari} Hari
                            </div>
                        ` : ''}

                        ${item.isPartikulat ? '<span class="tag" style="background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe; font-size:0.6rem; margin-top:5px; display:inline-block;">⚖️ ISOKINETIK</span>' : ''}
                    </td>
                    <td>
                        <span class="tag ${isReceived ? 'tag-green' : 'tag-orange'}">
                            ${isReceived ? '● DITERIMA LAB' : '○ FISIK DITUNGGU'}
                        </span>
                        ${isReceived && item.tgl_terima_lab ? `<div style="font-size:0.65rem; color:#64748b; margin-top:4px;">Masuk: ${item.tgl_terima_lab}</div>` : ''}
                    </td>
                    <td style="text-align: right;">
                        <button onclick="prosesTerimaSampel('${item.db_id}', '${item.sample_id}')" 
                                class="btn-receive" 
                                style="${isReceived ? 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;' : ''}">
                            ${isReceived ? '📝 Edit Tgl' : '📥 Terima'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Koneksi Gagal.</td></tr>`;
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

