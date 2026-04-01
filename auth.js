function renderSidebar(role) {
            const navContainer = document.getElementById('dynamicSidebar');
            if (!navContainer) return;

            const menuMapping = {
                admin_master: [
                    { title: "Master Data", icon: "🗂️", link: "master-data.html", cat: "Main" },
                    { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                    { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" },
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" },
                    { title: "Verifikasi & COA", icon: "📜", link: "coa.html", cat: "Menu Kerja" },
                    { title: "Activity Logger", icon: "🛡️", link: "logger.html", cat: "Developer" }
                ],
                manager: [
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" },
                    { title: "Verifikasi & COA", icon: "📜", link: "coa.html", cat: "Menu Kerja" },
                ],
                sampling: [
                    { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                    { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" }
                ],
                admin_ts: [
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" }
                ],
                analis: [
                    { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" }
                ]
            };

            const activeMenus = menuMapping[role] || menuMapping['sampling'];
            const currentPath = window.location.pathname;

            let sidebarHTML = `
                <p class="nav-label" style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 20px 0 10px 16px;">Main</p>
                <a href="dashboard.html" class="nav-item ${currentPath.includes('dashboard.html') ? 'active' : ''}">
                    <span style="width: 25px; display: inline-block;">🏠</span> Dashboard Utama
                </a>
            `;

            let lastCat = 'Main';
            activeMenus.forEach(item => {
                if (item.cat !== lastCat) {
                    sidebarHTML += `<p class="nav-label" style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 20px 0 10px 16px;">${item.cat}</p>`;
                    lastCat = item.cat;
                }

                const isActive = currentPath.includes(item.link) ? 'active' : '';
                sidebarHTML += `
                    <a href="${item.link}" class="nav-item ${isActive}">
                        <span style="width: 25px; display: inline-block;">${item.icon}</span> ${item.title}
                    </a>
                `;
            });

            // Tambahkan tombol logout di paling bawah sidebar agar mudah diakses
            sidebarHTML += `
                <div style="margin-top: auto; padding-top: 20px;">
                    <a href="#" id="btnLogoutSidebar" class="nav-item" style="color: #ef4444;">
                        <span style="width: 25px; display: inline-block;">🚪</span> Keluar Sesi
                    </a>
                </div>
            `;

            navContainer.innerHTML = sidebarHTML;

            // Pasang event listener logout setelah HTML di-render
            const btnLogoutSidebar = document.getElementById('btnLogoutSidebar');
            if (btnLogoutSidebar) {
                btnLogoutSidebar.addEventListener('click', (e) => {
                    e.preventDefault();
                    processLogout();
                });
            }
        }

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inisialisasi Elemen UI
    const userNameEl = document.getElementById('userName');
    const userFullNameEl = document.getElementById('userFullName');
    const userRoleEl = document.getElementById('userRoleDisplay');
    const currentDateEl = document.getElementById('currentDate');
    const btnLogout = document.getElementById('btnLogout');

    // 2. Fungsi Cek Sesi & Ambil Role
    async function checkAuth() {
    // 1. Ambil Sesi Auth Utama
    const { data: { session }, error: authError } = await _supabase.auth.getSession();

    if (authError || !session) {
        window.location.href = "index.html";
        return;
    }
    const hasLoggedThisSession = sessionStorage.getItem('logged_in_event');
    if (!hasLoggedThisSession) {
        await saveSecurityLog('LOGIN');
        sessionStorage.setItem('logged_in_event', 'true');
    }

    const user = session.user;

    try {
        // 2. AMBIL DATA ROLE DARI TABEL PROFILES (Sesuai INSERT SQL Anda)
        const { data: profile, error: profileError } = await _supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        // 3. Gunakan Role dari Tabel Profiles
        const userRole = profile.role || 'sampling'; 
        const fullName = profile.full_name || user.email.split('@')[0];

        // Tampilkan di UI
        if (userNameEl) {
            userNameEl.innerHTML = `Data Sampling <span style="font-size:0.85rem; font-weight:400; color:#64748b;">| ${fullName}</span>`;
        }
        if (userFullNameEl) userFullNameEl.innerText = fullName;
        if (userRoleEl) userRoleEl.innerText = userRole.toUpperCase();
        
        if (currentDateEl) {
            currentDateEl.innerText = new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        }

        // 4. Render Sidebar dengan Role yang Benar
        console.log("Login sebagai:", userRole); // Cek di console F12
        renderSidebar(userRole);

    } catch (err) {
        console.error("Gagal mengambil profil:", err.message);
        // Fallback jika profile tidak ditemukan
        renderSidebar('sampling');
    }
}

    // 4. Fungsi Render Sidebar Dinamis
        

    // Di dalam fungsi processLogout()
        async function processLogout() {
            if (confirm("Apakah Anda yakin ingin keluar?")) {
                // 1. Catat Log Logout dulu
                await saveSecurityLog('LOGOUT');
                
                // 2. Hapus status session storage
                sessionStorage.removeItem('logged_in_event');

                // 3. Baru jalankan SignOut
                await _supabase.auth.signOut();
                window.location.href = "index.html";
            }
        }

    // 5. Event Listener Logout (Top Bar)
    if (btnLogout) {
        btnLogout.addEventListener('click', processLogout);
    }

    // Jalankan Prosedur
    await checkAuth();
});

// Tambahkan di auth.js
// auth.js

// Fungsi Global untuk mencatat Login/Logout ke audit_logs
async function saveSecurityLog(action) {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;

        const user = session.user;
        
        // Ambil data profile untuk mendapatkan nama lengkap (opsional)
        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const { error } = await _supabase.from('audit_logs').insert([{
            user_id: user.id,
            username: user.email,
            action_type: action, // 'LOGIN' atau 'LOGOUT'
            table_name: 'auth.users',
            description: `${profile?.full_name || user.email} telah melakukan ${action.toLowerCase()}`,
            new_data: { 
                last_login: new Date().toISOString(),
                user_agent: navigator.userAgent 
            }
        }]);

        if (error) throw error;
        console.log(`✅ Log ${action} berhasil dicatat`);
    } catch (err) {
        console.error(`❌ Gagal mencatat log ${action}:`, err.message);
    }
}

// Panggil saveSecurityLog('LOGIN') setelah await checkAuth() berhasil
// Panggil saveSecurityLog('LOGOUT') di dalam fungsi processLogout() sebelum signOut()