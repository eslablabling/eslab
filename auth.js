
// ============================================================
// #26 — DARK MODE PREMIUM
// Injeksi CSS variabel dark mode ke halaman, toggle via sidebar
// ============================================================
function injectDarkModeStyles() {
    if (document.getElementById('dark-mode-styles')) return; // Jangan inject dua kali
    const style = document.createElement('style');
    style.id = 'dark-mode-styles';
    style.textContent = `
        /* === DARK MODE GLOBAL === */
        body.dark-mode {
            background-color: #0f172a !important;
            color: #e2e8f0 !important;
        }
        /* Sidebar */
        body.dark-mode .sidebar {
            background: #1e293b !important;
            border-right-color: #334155 !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.3) !important;
        }
        body.dark-mode .nav-item {
            color: #94a3b8 !important;
        }
        body.dark-mode .nav-item:hover,
        body.dark-mode .nav-item.active {
            background: #1d4ed820 !important;
            color: #60a5fa !important;
        }
        body.dark-mode .nav-label {
            color: #475569 !important;
        }
        /* Top Bar */
        body.dark-mode .top-bar,
        body.dark-mode .main > .top-bar {
            background: #0f172a !important;
            border-bottom-color: #1e293b !important;
        }
        /* Cards, containers, coc-card, table-section, data-container */
        body.dark-mode .coc-card,
        body.dark-mode .data-container,
        body.dark-mode .table-section,
        body.dark-mode .stat-card,
        body.dark-mode .menu-card,
        body.dark-mode .chart-placeholder,
        body.dark-mode .weather-card ~ div {
            background: #1e293b !important;
            border-color: #334155 !important;
            color: #e2e8f0 !important;
        }
        /* Weather card tetap gradien, hanya sedikit gelap */
        body.dark-mode .weather-card {
            background: linear-gradient(135deg, #1e3a8a, #1d4ed8) !important;
        }
        /* Input & Select */
        body.dark-mode input,
        body.dark-mode select,
        body.dark-mode textarea {
            background: #0f172a !important;
            color: #e2e8f0 !important;
            border-color: #334155 !important;
        }
        body.dark-mode input::placeholder,
        body.dark-mode textarea::placeholder {
            color: #475569 !important;
        }
        /* Table */
        body.dark-mode table th {
            color: #64748b !important;
            border-bottom-color: #1e293b !important;
        }
        body.dark-mode table td {
            border-bottom-color: #1e293b !important;
            color: #cbd5e1 !important;
        }
        body.dark-mode tbody tr:hover td,
        body.dark-mode tbody tr:hover {
            background-color: #1e293b !important;
        }
        /* Buttons */
        body.dark-mode .page-btn {
            background: #1e293b !important;
            border-color: #334155 !important;
            color: #94a3b8 !important;
        }
        body.dark-mode .page-btn:hover {
            background: #334155 !important;
            color: #e2e8f0 !important;
        }
        body.dark-mode .page-btn.active {
            background: #2563eb !important;
            color: white !important;
        }
        body.dark-mode .tab-btn {
            background: #1e293b !important;
            color: #94a3b8 !important;
        }
        body.dark-mode .tab-btn.active {
            background: #2563eb !important;
            color: white !important;
        }
        body.dark-mode .btn-primary {
            background: #2563eb !important;
        }
        body.dark-mode .btn-add {
            background: #1e293b !important;
            color: #94a3b8 !important;
            border-color: #334155 !important;
        }
        /* Modal */
        body.dark-mode .modal-content {
            background: #1e293b !important;
            color: #e2e8f0 !important;
        }
        body.dark-mode .form-group {
            background: #0f172a !important;
            border-color: #334155 !important;
        }
        body.dark-mode .form-control {
            background: #0f172a !important;
            color: #e2e8f0 !important;
            border-color: #334155 !important;
        }
        /* Badges & Tags */
        body.dark-mode .tag-orange { background: #431407 !important; color: #fb923c !important; }
        body.dark-mode .tag-blue   { background: #1e3a5f !important; color: #60a5fa !important; }
        body.dark-mode .tag-green  { background: #14532d !important; color: #4ade80 !important; }
        /* Scrollbar */
        body.dark-mode ::-webkit-scrollbar-track { background: #1e293b; }
        body.dark-mode ::-webkit-scrollbar-thumb { background: #334155; }
        body.dark-mode ::-webkit-scrollbar-thumb:hover { background: #475569; }
        /* Text colors */
        body.dark-mode h1, body.dark-mode h2, body.dark-mode h3, body.dark-mode h4 {
            color: #f1f5f9 !important;
        }
        body.dark-mode p { color: #94a3b8 !important; }
        body.dark-mode .welcome-text h2 { color: #f1f5f9 !important; }
        body.dark-mode .welcome-text p  { color: #64748b !important; }
        /* Dark mode toggle button */
        #darkModeToggleBtn {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 16px;
            background: none;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 700;
            color: #64748b;
            font-family: 'Plus Jakarta Sans', sans-serif;
            transition: all 0.2s;
            margin-top: 8px;
        }
        #darkModeToggleBtn:hover {
            background: #f1f5f9;
            color: #1e293b;
        }
        body.dark-mode #darkModeToggleBtn {
            border-color: #334155 !important;
            color: #94a3b8 !important;
            background: none !important;
        }
        body.dark-mode #darkModeToggleBtn:hover {
            background: #1e293b !important;
            color: #e2e8f0 !important;
        }
        /* Transition halus saat toggle */
        body, .sidebar, .coc-card, .data-container, .stat-card,
        .table-section, input, select, textarea, table th, table td {
            transition: background-color 0.25s ease, color 0.2s ease, border-color 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}

function applyDarkMode() {
    const isDark = localStorage.getItem('eslab_dark_mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    // Update ikon tombol jika sudah dirender
    const btn = document.getElementById('darkModeToggleBtn');
    if (btn) btn.innerHTML = isDark ? '☀️ Mode Terang' : '🌙 Mode Gelap';
}

window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('eslab_dark_mode', isDark);
    const btn = document.getElementById('darkModeToggleBtn');
    if (btn) {
        btn.innerHTML = isDark ? '☀️ Mode Terang' : '🌙 Mode Gelap';
        // Animasi kecil
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => { btn.style.transform = ''; }, 150);
    }
};

function renderSidebar(role) {
            const navContainer = document.getElementById('dynamicSidebar');
            if (!navContainer) return;

            const menuMapping = {
                admin_master: [
                    { title: "Master Data", icon: "🗂️", link: "master-data.html", cat: "Main" },
                    { title: "Kelola Klien", icon: "👥", link: "kelola-klien.html", cat: "Main" },
                    { title: "Kelola Users", icon: "🛡️", link: "kelola-users.html", cat: "Main" },
                    { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                    { title: "Hub Komunikasi", icon: "💬", link: "komunikasi.html", cat: "Menu Kerja" },
                    { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" },
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" },
                    { title: "Verifikasi & COA", icon: "📜", link: "coa.html", cat: "Menu Kerja" },
                    { title: "Tren Analisa", icon: "📈", link: "tren.html", cat: "Menu Kerja" },
                    { title: "Dokumen", icon: "📁", link: "dokumen.html", cat: "Menu Kerja" },
                    { title: "Activity Logger", icon: "🛡️", link: "logger.html", cat: "Developer" }
                ],
                manager: [
                    { title: "Master Data", icon: "🗂️", link: "master-data.html", cat: "Main" },
                    { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                    { title: "Hub Komunikasi", icon: "💬", link: "komunikasi.html", cat: "Menu Kerja" },
                    { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" },
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" },
                    { title: "Verifikasi & COA", icon: "📜", link: "coa.html", cat: "Menu Kerja" },
                    { title: "Tren Analisa", icon: "📈", link: "tren.html", cat: "Menu Kerja" },
                    { title: "Dokumen", icon: "📁", link: "dokumen.html", cat: "Menu Kerja" }
                ],
                sampling: [
                    { title: "Master Data", icon: "🗂️", link: "master-data.html", cat: "Main" },
                    { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                    { title: "Monitoring Sampling", icon: "📍", link: "sampling.html", cat: "Menu Kerja" },
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Tren Analisa", icon: "📈", link: "tren.html", cat: "Menu Kerja" },
                    { title: "Dokumen", icon: "📁", link: "dokumen.html", cat: "Menu Kerja" }
                ],
                admin_ts: [
                    { title: "Master Data", icon: "🗂️", link: "master-data.html", cat: "Main" },
                    { title: "COC Digital", icon: "📑", link: "coc.html", cat: "Menu Kerja" },
                    { title: "Hub Komunikasi", icon: "💬", link: "komunikasi.html", cat: "Menu Kerja" },
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Verifikasi & COA", icon: "📜", link: "coa.html", cat: "Menu Kerja" },
                    { title: "Tren Analisa", icon: "📈", link: "tren.html", cat: "Menu Kerja" },
                    { title: "Dokumen", icon: "📁", link: "dokumen.html", cat: "Menu Kerja" }
                ],
                analis: [
                    { title: "Penerimaan Sampel", icon: "📥", link: "penerimaan.html", cat: "Menu Kerja" },
                    { title: "Log Analisa", icon: "🧪", link: "analisa.html", cat: "Menu Kerja" },
                    { title: "Tren Analisa", icon: "📈", link: "tren.html", cat: "Menu Kerja" },
                    { title: "Dokumen", icon: "📁", link: "dokumen.html", cat: "Menu Kerja" }
                ],
                client: [
                    { title: "Portal Klien", icon: "🏢", link: "portal-klien.html", cat: "Main" },
                    { title: "Hub Komunikasi", icon: "💬", link: "komunikasi.html", cat: "Main" }
                ],
            };

            const activeMenus = menuMapping[role] || menuMapping['sampling'];
            const currentPath = window.location.pathname;

            let sidebarHTML = '';
            if (role !== 'client') {
                sidebarHTML += `
                    <p class="nav-label" style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 20px 0 10px 16px;">Main</p>
                    <a href="dashboard.html" class="nav-item ${currentPath.includes('dashboard.html') ? 'active' : ''}">
                        <span style="width: 25px; display: inline-block;">🏠</span> Dashboard Utama
                    </a>
                `;
            } else {
                sidebarHTML += `
                    <p class="nav-label" style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 20px 0 10px 16px;">Main</p>
                `;
            }

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

            // Tambahkan tombol Dark Mode di paling bawah sidebar (#26)
            sidebarHTML += `
                <button id="darkModeToggleBtn" onclick="toggleDarkMode()">
                    🌙 Mode Gelap
                </button>
            `;

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

// Fungsi Global untuk Logout
async function processLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        const isClient = !!sessionStorage.getItem('client-session');
        
        // 1. Catat Log Logout dulu
        if (!isClient) {
            await saveSecurityLog('LOGOUT');
        }
        
        // 2. Hapus status session storage
        sessionStorage.removeItem('logged_in_event');
        sessionStorage.removeItem('client-session');
        sessionStorage.removeItem('user_role');

        // 3. Baru jalankan SignOut
        if (!isClient) {
            await _supabase.auth.signOut();
            window.location.href = "index.html";
        } else {
            window.location.href = "login-klien.html";
        }
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
    // A. Cek Sesi Klien Kustom
    const clientSessionStr = sessionStorage.getItem('client-session');
    
    // Deteksi nama berkas saat ini secara aman
    let currentFilename = window.location.pathname.split('/').pop().toLowerCase();
    if (currentFilename === '' || currentFilename === 'eslab') {
        currentFilename = 'index.html';
    }

    if (clientSessionStr) {
        // Blokir akses ke halaman selain portal-klien.html dan komunikasi.html
        if (currentFilename !== 'portal-klien.html' && currentFilename !== 'komunikasi.html') {
            window.location.href = 'portal-klien.html';
            return;
        }

        const clientSession = JSON.parse(clientSessionStr);
        const mockSession = { user: { id: '00000000-0000-0000-0000-000000000000', email: clientSession.username } };
        const mockProfile = { role: 'client', full_name: clientSession.username, company_name: clientSession.company_name };
        
        window.userSession = mockSession;
        window.userProfile = mockProfile;
        window.userRole = 'client';
        
        if (userNameEl) {
            userNameEl.innerHTML = `Portal Klien <span style="font-size:0.85rem; font-weight:400; color:#64748b;">| ${clientSession.company_name}</span>`;
        }
        if (userFullNameEl) userFullNameEl.innerText = clientSession.company_name;
        if (userRoleEl) userRoleEl.innerText = 'CLIENT PORTAL';
        
        if (currentDateEl) {
            currentDateEl.innerText = new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        }
        
        renderSidebar('client');
        window.dispatchEvent(new CustomEvent('auth-ready', { detail: { session: mockSession, profile: mockProfile, role: 'client' } }));
        return;
    }

    // 1. Ambil Sesi Auth Utama
    let { data: { session }, error: authError } = await _supabase.auth.getSession();

    if (authError || !session) {
        // Jika klien tidak terotentikasi mencoba masuk ke portal klien, alihkan ke login-klien
        if (currentFilename === 'portal-klien.html' || currentFilename === 'komunikasi.html') {
            window.location.href = "login-klien.html";
        } else {
            window.location.href = "index.html";
        }
        return;
    }

    const hasLoggedThisSession = sessionStorage.getItem('logged_in_event');
    if (!hasLoggedThisSession) {
        try {
            await saveSecurityLog('LOGIN');
            sessionStorage.setItem('logged_in_event', 'true');
        } catch(e){}
    }

    const user = session.user;
    window.userSession = session;

    try {
        // 2. AMBIL DATA ROLE DARI TABEL PROFILES
        const { data: profile, error: profileError } = await _supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        // Expose globally
        window.userProfile = profile;
        const userRole = profile.role || 'sampling'; 
        window.userRole = userRole;
        sessionStorage.setItem('user_role', userRole);
        const fullName = profile.full_name || user.email.split('@')[0];

        // Tampilkan di UI
        if (userNameEl) {
            userNameEl.innerHTML = `Data LIMS <span style="font-size:0.85rem; font-weight:400; color:#64748b;">| ${fullName}</span>`;
        }
        if (userFullNameEl) userFullNameEl.innerText = fullName;
        if (userRoleEl) userRoleEl.innerText = userRole.toUpperCase().replace('_', ' ');
        
        if (currentDateEl) {
            currentDateEl.innerText = new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        }

        // 4. Render Sidebar dengan Role yang Benar
        console.log("Login sebagai:", userRole);
        renderSidebar(userRole);
        
        // Dispatch Custom Event for page-specific initialization
        window.dispatchEvent(new CustomEvent('auth-ready', { detail: { session, profile, role: userRole } }));

    } catch (err) {
        console.error("Gagal mengambil profil:", err.message);
        // Redirect to login if user profile can't be fetched
        window.location.href = "index.html";
    }
}

    // 4. Fungsi Render Sidebar Dinamis
        

    // 5. Event Listener Logout (Top Bar)
    if (btnLogout) {
        btnLogout.addEventListener('click', processLogout);
    }

    // Jalankan Prosedur
    await checkAuth();

    // #26 Dark Mode: inject CSS global dan terapkan preferensi tersimpan
    injectDarkModeStyles();
    // Terapkan setelah DOM siap (sedikit delay agar sidebar sudah dirender)
    setTimeout(applyDarkMode, 50);
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