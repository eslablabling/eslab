
// 2. Elemen UI
const userNameElement = document.getElementById('userName');
const dateElement = document.getElementById('currentDate'); // Pastikan di HTML ada id="currentDate"
const userFullName = document.getElementById('userFullName');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const menuContainer = document.getElementById('menuContainer');
const btnLogout = document.getElementById('btnLogout');

// 3. Cek Sesi & Load Data
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await _supabase.auth.getSession();

    if (error || !session) {
        window.location.href = 'index.html'; 
        return;
    }

    await loadUserProfile(session.user.id);
    updateDateDisplay();
    
    // --- TAMBAHKAN INI ---
    await fetchActiveLogs(); 
});

async function fetchActiveLogs() {
    const logTableBody = document.getElementById('logTableBody'); 
    if (!logTableBody) {
        console.error("ID 'logTableBody' tidak ditemukan di HTML!");
        return;
    }

    try {
        console.log("Mencoba mengambil data dari Supabase...");
        const { data: logs, error } = await _supabase
            .from('coc_emisi') 
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        console.log("Data berhasil ditarik:", logs);

        if (!logs || logs.length === 0) {
            logTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Database kosong atau RLS memblokir data.</td></tr>`;
            return;
        }

        let tableRows = "";

        logs.forEach(coc => {
            let samples = [];
            
            // LOGIKA PARSING YG LEBIH KUAT
            try {
                if (typeof coc.samples_data === 'string') {
                    samples = JSON.parse(coc.samples_data);
                } else {
                    samples = coc.samples_data || [];
                }
            } catch (e) {
                console.error("Gagal parse samples_data untuk:", coc.nomor_coc, e);
            }

            // Jika samples masih berupa string setelah parse pertama (terjadi jika double encode)
            if (typeof samples === 'string') {
                try { samples = JSON.parse(samples); } catch(e) {}
            }

            if (Array.isArray(samples)) {
                samples.forEach(s => {
                    // 1. Ambil Data Tanggal Mentah
                    const rawTerima = s.tgl_terima_lab; 
                    
                    // PRIORITAS: Gunakan analyzed_at (yang baru kita buat), 
                    // jika kosong baru gunakan verified_at (lama)
                    const rawSelesai = s.analyzed_at || s.verified_at; 

                    // 2. Logika Hitung Selisih Hari (TAT) - Tetap sama
                    let tatHari = "-";
                    if (rawTerima && rawSelesai) {
                        const d1 = new Date(rawTerima);
                        const d2 = new Date(rawSelesai);
                        const diffInMs = d2 - d1;
                        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
                        tatHari = diffInDays <= 0 ? "1 Hari" : `${diffInDays} Hari`;
                    }

                    // 3. Format Tanggal untuk Tampilan
                    const tglSampling = coc.sampling_date ? new Date(coc.sampling_date).toLocaleDateString('id-ID') : '-';
                    const tglTerima = rawTerima ? new Date(rawTerima).toLocaleDateString('id-ID') : '-';
                    
                    // Tampilkan tanggal analisa di kolom "Selesai" pada dashboard
                    const tglSelesai = rawSelesai ? new Date(rawSelesai).toLocaleDateString('id-ID') : '-';
                    
                    // 4. Deteksi Priority (Urgent vs Normal)
                    const tatPriority = (coc.tat_requested || "NORMAL").toUpperCase();
                    const isUrgent = tatPriority === 'URGENT';

                    // 5. Logika Status Badge
                    let statusLabel = "SAMPLING";
                    let statusClass = "tag-orange";

                    if (s.status_lab === 'verified' || s.is_verified === true) {
                        statusLabel = "FINISH";
                        statusClass = "tag-green";
                    } else if (s.status === 'Done' || s.tgl_terima_lab) {
                        statusLabel = "ANALISA";
                        statusClass = "tag-blue";
                    }

                    // 6. Gabungkan ke HTML (Urutan kolom sesuai table head Anda)
                    tableRows += `
                        <tr>
                            <td style="font-weight:700; color:#2563eb;">${coc.nomor_coc}</td>
                            <td style="font-weight:600; color:#1e293b;">${s.sample_id || '-'}</td>
                            <td style="max-width:220px; overflow:hidden; text-overflow:ellipsis;" title="${coc.company_name}">
                                ${coc.company_name}
                            </td>
                            <td>${tglSampling}</td>
                            <td>${tglTerima}</td>
                            <td>${tglSelesai}</td>
                            <td>
                                <div style="font-weight:800; color:#0f172a; font-size:0.85rem;">${tatHari}</div>
                                <div style="font-size:0.65rem; ${isUrgent ? 'color:#dc2626; font-weight:900;' : 'color:#94a3b8;'}">
                                    ${isUrgent ? '⚠️ URGENT' : 'NORMAL'}
                                </div>
                            </td>
                            <td><span class="tag ${statusClass}">${statusLabel}</span></td>
                        </tr>`;
                });
            }
        });

        logTableBody.innerHTML = tableRows || `<tr><td colspan="8" style="text-align:center;">Data ditemukan tapi gagal diproses.</td></tr>`;

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        logTableBody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
    }
}

// 4. Ambil Data Profil & Update UI Dashboard
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            throw new Error(error?.message || "Profil tidak ditemukan");
        }

        // --- Logika Sapaan ---
        const hours = new Date().getHours();
        let greeting = "Selamat Malam";
        if (hours >= 5 && hours < 11) greeting = "Selamat Pagi";
        else if (hours >= 11 && hours < 15) greeting = "Selamat Siang";
        else if (hours >= 15 && hours < 18) greeting = "Selamat Sore";

        const name = profile.full_name || "Staf Lab";
        
        // Update Elemen UI dengan Safety Check
        if (userNameElement) userNameElement.innerText = `${greeting}, ${name}`;
        if (userFullName) userFullName.innerText = name;
        if (userRoleDisplay) userRoleDisplay.innerText = profile.role ? profile.role.replace('_', ' ') : 'User';

        // Panggil renderMenu yang sudah disesuaikan dengan auth.js
        renderMenu(profile.role);

    } catch (err) {
        console.error("Gagal memuat profil:", err.message);
        // Fallback jika profil gagal dimuat agar dashboard tidak kosong total
        if (userNameElement) userNameElement.innerText = "Selamat Datang";
        if (userRoleDisplay) userRoleDisplay.innerText = "Sesi Aktif";
    }
}

// 5. Update Tanggal Indonesia
function updateDateDisplay() {
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.innerText = new Date().toLocaleDateString('id-ID', options);
    }
}

// Perbarui fungsi renderMenu di dashboard.js


// 7. Logout
document.querySelectorAll('#btnLogout').forEach(button => {
    button.addEventListener('click', async () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            const { error } = await _supabase.auth.signOut();
            if (error) {
                alert("Gagal logout: " + error.message);
            } else {
                window.location.href = 'index.html';
            }
        }
    });
});