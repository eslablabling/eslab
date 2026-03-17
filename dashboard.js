// 1. Inisialisasi Supabase
const SUPABASE_URL = 'https://ucpomkfekmuqdappdudf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcG9ta2Zla211cWRhcHBkdWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTA0MDIsImV4cCI6MjA4NzYyNjQwMn0.nWRYzonk_NG2mmr5EJ_uguOoaoI-YAkNSrqFs6i2HDc'; // Gunakan key lengkapmu
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    if (!logTableBody) return;

    try {
        // 1. Ambil data dari tabel coc_emisi
        const { data: logs, error } = await _supabase
            .from('coc_emisi') 
            .select('nomor_coc, company_name, sampling_date, samples_data, tat_requested')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        let tableRows = "";

        if (!logs || logs.length === 0) {
            logTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#94a3b8;">Belum ada data COC yang terdaftar.</td></tr>`;
            return;
        }

        logs.forEach(coc => {
            // 2. Proteksi Parsing JSON
            let samples = [];
            try {
                samples = typeof coc.samples_data === 'string' 
                          ? JSON.parse(coc.samples_data) 
                          : (coc.samples_data || []);
            } catch (e) {
                console.error("Gagal parse samples_data untuk COC:", coc.nomor_coc);
                samples = [];
            }

            if (Array.isArray(samples) && samples.length > 0) {
                samples.forEach(s => {
                    // --- LOGIKA STATUS ---
                    let statusLabel = "SAMPLING";
                    let statusClass = "tag-orange";
                    
                    // --- LOGIKA TANGGAL ---
                    const tglSampling = coc.sampling_date ? new Date(coc.sampling_date).toLocaleDateString('id-ID') : '-';
                    const tglTerima = s.received_at ? new Date(s.received_at).toLocaleDateString('id-ID') : '-';
                    
                    // Tgl Analisa Selesai (Jika status 'Done' atau sudah diverifikasi)
                    const tglSelesai = (s.status === 'Done' || s.status_lab === 'verified') && s.updated_at
                        ? new Date(s.updated_at).toLocaleDateString('id-ID') 
                        : '-';

                    // --- LOGIKA TAT ---
                    const tatLabel = coc.tat_requested || "Normal";
                    const tatStyle = tatLabel.toLowerCase() === 'urgent' 
                        ? 'color: #dc2626; font-weight: 800; background: #fef2f2; border: 1px solid #fee2e2; padding: 2px 6px; border-radius: 4px;' 
                        : 'color: #64748b; font-weight: 600;';

                    // Update Status Berdasarkan Progres
                    if (s.status_lab === 'verified') {
                        statusLabel = "FINISH";
                        statusClass = "tag-green";
                    } else if (s.status === 'Done' || s.received_at) {
                        statusLabel = "ANALISA";
                        statusClass = "tag-blue";
                    }

                    tableRows += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="font-weight: 700; color: #2563eb; padding: 12px;">${coc.nomor_coc}</td>
                            <td style="font-weight: 600; color: #1e293b;">${s.sample_id || '-'}</td>
                            <td style="font-size: 0.8rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${coc.company_name || '-'}</td>
                            <td style="font-size: 0.8rem;">${tglSampling}</td>
                            <td style="font-size: 0.8rem;">${tglTerima}</td>
                            <td style="font-size: 0.8rem;">${tglSelesai}</td>
                            <td><span style="${tatStyle}">${tatLabel.toUpperCase()}</span></td>
                            <td><span class="tag ${statusClass}">${statusLabel}</span></td>
                        </tr>
                    `;
                });
            }
        });

        logTableBody.innerHTML = tableRows;

    } catch (err) {
        console.error("Critical Error:", err.message);
        logTableBody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center; padding:20px;">Gagal memuat data dari database. Periksa koneksi Supabase.</td></tr>`;
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
function renderMenu(role) {
    // Pastikan role tidak kosong
    if (!role) return;

    const menuList = {
        admin_master: [
                { title: "Master Data", icon: "🗂️", link: "master-data.html", cat: "Main" },
                { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" },
                { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" },
                { title: "Verifikasi & COA", icon: "📜", link: "coa.html", cat: "Menu Kerja" }
            ],
            sampling: [
                { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" }
            ],
            penerimaan: [
                { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" }
            ],
            analis: [
                { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" }
            ]
        };

    // Ambil daftar menu berdasarkan role dari database
    const activeMenus = menuList[role] || [];

    // --- SIDEBAR NAV ---
    const navContainer = document.querySelector('.nav-menu');
    if (navContainer) {
        navContainer.innerHTML = `
            <div class="nav-label">Main</div>
            <a href="dashboard.html" class="nav-item active">🏠 Dashboard Utama</a>
            <div class="nav-label">Menu Kerja</div>
            ${activeMenus.map(item => `
                <a href="${item.link}" class="nav-item">
                    <span style="font-size: 1.1rem; width: 25px; display: inline-block;">${item.icon}</span> ${item.title}
                </a>
            `).join('')}
        `;
    }

    // --- DASHBOARD CARDS (TENGAH) ---
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
        if (activeMenus.length === 0) {
            menuContainer.innerHTML = `<p style="color: #64748b; padding: 20px;">Anda tidak memiliki akses menu kerja.</p>`;
            return;
        }

        menuContainer.innerHTML = activeMenus.map(item => `
            <div class="menu-card" onclick="window.location.href='${item.link}'" style="cursor: pointer;">
                <div class="icon" style="font-size: 2rem; background: #f1f5f9; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px; margin-right: 15px;">
                    ${item.icon}
                </div>
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0;">${item.title}</h4>
                    <p style="font-size: 0.75rem; color: #64748b; margin: 2px 0 0 0;">${item.desc}</p>
                </div>
            </div>
        `).join('');
    }
}

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