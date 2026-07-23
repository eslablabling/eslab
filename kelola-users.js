// ============================================================
// kelola-users.js — Manajemen User Internal ESLab LIMS
// Khusus role: admin_master
// ============================================================

// --- STATE ---
let currentSession = null;
let currentProfile = null;
let usersList = [];         // Data asli dari DB
let filteredUsers = [];     // Setelah filter/search
let currentPage = 1;
const PAGE_SIZE = 10;
let revealTimers = {};      // Timer auto-hide password per row

// --- XOR Helper (konsisten dengan config.js) ---
const XOR_KEY = 'eslab';
function xorEncode(str) {
    return btoa(str.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
    ).join(''));
}
function xorDecode(encoded) {
    try {
        const str = atob(encoded);
        return str.split('').map((c, i) =>
            String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
        ).join('');
    } catch {
        return encoded; // Jika belum di-encode, kembalikan apa adanya
    }
}
function generatePassword() {
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ES-${suffix}`;
}

// --- TOAST ---
let _toastTimer = null;
function showToast(msg, type = 'success', duration = 3500) {
    const el = document.getElementById('toast');
    el.className = `show ${type}`;
    el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span> ${msg}`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.className = ''; }, duration);
}

// --- AUDIT LOG ---
async function logAction(actionType, description, oldData = null, newData = null) {
    try {
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: actionType,
            table_name: 'profiles',
            description,
            old_data: oldData,
            new_data: newData
        }]);
    } catch (e) {
        console.warn('Gagal mencatat audit log:', e.message);
    }
}

// ============================================================
// INIT — Listen auth-ready event
// ============================================================
window.addEventListener('auth-ready', async (e) => {
    const { session, profile, role } = e.detail;
    currentSession = session;
    currentProfile = profile;

    // Guard: hanya admin_master
    if (role !== 'admin_master') {
        showToast('Akses ditolak! Halaman ini khusus Admin Master.', 'error');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
        return;
    }

    // Set avatar initials
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'AM';
    const el = document.getElementById('userInitials');
    if (el) el.innerText = initials;

    // Username preview on input
    document.getElementById('addUsername').addEventListener('input', updateEmailPreview);

    await fetchUsers();
});

// ============================================================
// FETCH DATA
// ============================================================
async function fetchUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">⏳ Memuat data...</td></tr>`;

    try {
        // Gunakan select('*') agar tidak error 400 jika kolom baru belum ada di DB
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .order('role', { ascending: true })
            .order('full_name', { ascending: true });

        if (error) throw error;

        // Normalisasi: isi kolom opsional dengan default jika belum ada
        usersList = (data || []).map(u => ({
            ...u,
            is_active:            u.is_active            ?? true,
            plain_password:       u.plain_password       ?? null,
            last_password_reset:  u.last_password_reset  ?? null,
            phone:                u.phone                ?? null,
            notes:                u.notes                ?? null,
        }));

        // Deteksi apakah kolom baru sudah ada — tampilkan banner jika belum
        const firstRow = data?.[0];
        const needsMigration = firstRow && !('is_active' in firstRow);
        showMigrationBanner(needsMigration);

        updateStatCards();
        applyFilters();
    } catch (err) {
        console.error('Gagal memuat users:', err);
        tbody.innerHTML = `
            <tr><td colspan="8">
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
                    <p style="color:#ef4444;font-weight:700;margin-bottom:8px;">Gagal memuat data users</p>
                    <p style="color:#64748b;font-size:0.82rem;">${err.message}</p>
                    <p style="color:#64748b;font-size:0.78rem;margin-top:8px;">Pastikan SQL migration sudah dijalankan di Supabase SQL Editor.</p>
                </div>
            </td></tr>`;
        showMigrationBanner(true);
    }
}

// Banner peringatan SQL migration
function showMigrationBanner(show) {
    let banner = document.getElementById('migrationBanner');
    if (!show) { if (banner) banner.remove(); return; }
    if (banner) return; // sudah ada

    banner = document.createElement('div');
    banner.id = 'migrationBanner';
    banner.style.cssText = `
        background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px;
        padding: 16px 20px; margin: 0 40px 0; display: flex;
        align-items: flex-start; gap: 12px; font-size: 0.82rem;
    `;
    banner.innerHTML = `
        <span style="font-size:1.3rem;flex-shrink:0;">⚠️</span>
        <div>
            <strong style="color:#92400e;display:block;margin-bottom:4px;">SQL Migration Diperlukan</strong>
            <span style="color:#78350f;line-height:1.6;">
                Kolom baru (<code>is_active</code>, <code>plain_password</code>, <code>phone</code>, <code>notes</code>, <code>last_password_reset</code>)
                belum ada di tabel <code>profiles</code>. Jalankan perintah SQL berikut di
                <strong>Supabase → SQL Editor</strong> agar semua fitur berfungsi penuh:
            </span>
            <pre style="background:#fef3c7;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:0.75rem;color:#78350f;overflow-x:auto;line-height:1.7;">ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;</pre>
            <button onclick="navigator.clipboard.writeText(this.closest(\'div\').querySelector(\'pre\').innerText).then(()=>this.innerText=\'✅ Disalin!\')" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px solid #d97706;background:white;color:#92400e;font-size:0.75rem;font-weight:700;cursor:pointer;">📋 Salin SQL</button>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;flex-shrink:0;padding:0;" title="Tutup">✕</button>
    `;
    // Sisipkan sebelum content-body
    const contentBody = document.querySelector('.content-body');
    if (contentBody) contentBody.insertBefore(banner, contentBody.firstChild);
}

// Banner peringatan RLS Policy belum dikonfigurasi
function showRlsBanner() {
    if (document.getElementById('rlsBanner')) return;

    const SQL_RLS = `-- Aktifkan RLS dan izinkan admin_master mengelola profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id OR public.get_user_role() = 'admin_master') 
WITH CHECK (auth.uid() = id OR public.get_user_role() = 'admin_master');

DROP POLICY IF EXISTS "Allow admin_master insert profiles" ON public.profiles;
CREATE POLICY "Allow admin_master insert profiles" ON public.profiles FOR INSERT TO authenticated 
WITH CHECK (public.get_user_role() = 'admin_master' OR auth.uid() = id);

DROP POLICY IF EXISTS "Allow admin_master delete profiles" ON public.profiles;
CREATE POLICY "Allow admin_master delete profiles" ON public.profiles FOR DELETE TO authenticated 
USING (public.get_user_role() = 'admin_master');

-- Sync user di auth.users yang belum punya profil
INSERT INTO public.profiles (id, username, full_name, role, is_active, status_karyawan, last_password_reset)
SELECT u.id, split_part(u.email, '@', 1), split_part(u.email, '@', 1), 'sampling', true, 'aktif', NOW()
FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL;`;

    const banner = document.createElement('div');
    banner.id = 'rlsBanner';
    banner.style.cssText = `
        background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px;
        padding: 16px 20px; margin: 0 0 0; display: flex;
        align-items: flex-start; gap: 12px; font-size: 0.82rem;
    `;
    banner.innerHTML = `
        <span style="font-size:1.3rem;flex-shrink:0;">🔐</span>
        <div style="flex:1;">
            <strong style="color:#9f1239;display:block;margin-bottom:4px;">RLS Policy Belum Dikonfigurasi</strong>
            <span style="color:#881337;line-height:1.6;">
                Admin Master belum punya izin untuk mengelola profil user lain.
                Jalankan SQL berikut sekali di <strong>Supabase → SQL Editor</strong>:
            </span>
            <pre id="rlsSqlPre" style="background:#ffe4e6;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:0.72rem;color:#881337;overflow-x:auto;line-height:1.7;white-space:pre-wrap;">${SQL_RLS}</pre>
            <button onclick="navigator.clipboard.writeText(document.getElementById('rlsSqlPre').innerText).then(()=>this.innerText='✅ Disalin!')" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px solid #e11d48;background:white;color:#9f1239;font-size:0.75rem;font-weight:700;cursor:pointer;">📋 Salin SQL</button>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;flex-shrink:0;padding:0;" title="Tutup">✕</button>
    `;
    const contentBody = document.querySelector('.content-body');
    if (contentBody) contentBody.insertBefore(banner, contentBody.firstChild);
}

// ============================================================
// STAT CARDS
// ============================================================
function updateStatCards() {
    document.getElementById('statTotal').innerText    = usersList.length;
    document.getElementById('statActive').innerText   = usersList.filter(u => u.is_active !== false).length;
    document.getElementById('statInactive').innerText = usersList.filter(u => u.is_active === false).length;
    document.getElementById('statAdmin').innerText    = usersList.filter(u => u.role === 'admin_master').length;
}

// ============================================================
// FILTER & SEARCH
// ============================================================
function applyFilters() {
    const search  = document.getElementById('searchInput').value.toLowerCase().trim();
    const role    = document.getElementById('filterRole').value;
    const status  = document.getElementById('filterStatus').value;

    filteredUsers = usersList.filter(u => {
        const username = u.id ? '' : '';
        const matchSearch = !search
            || (u.full_name || '').toLowerCase().includes(search)
            || (u.role || '').toLowerCase().includes(search);
        const matchRole   = !role   || u.role === role;
        const matchStatus = !status
            || (status === 'active'   && u.is_active !== false)
            || (status === 'inactive' && u.is_active === false);
        return matchSearch && matchRole && matchStatus;
    });

    currentPage = 1;
    renderTable();
}

// ============================================================
// RENDER TABLE
// ============================================================
function renderTable() {
    const tbody = document.getElementById('usersTableBody');
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredUsers.slice(start, start + PAGE_SIZE);

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8">
                <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <p>Tidak ada user yang sesuai filter.</p>
                </div>
            </td></tr>`;
        document.getElementById('paginationArea').style.display = 'none';
        return;
    }

    tbody.innerHTML = pageData.map((u, idx) => {
        const no = start + idx + 1;
        const isAdmin = u.role === 'admin_master';
        const isActive = u.is_active !== false;
        const initials = (u.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const lastReset = u.last_password_reset
            ? new Date(u.last_password_reset).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
            : '—';
        const phone = u.phone || '—';

        // Password cell — admin_master tidak boleh terlihat
        const pwdCell = isAdmin
            ? `<span class="pwd-restricted">🔒 Terlindungi</span>`
            : `<span id="pwdCell_${u.id}" class="pwd-hidden">••••••</span>`;

        // Tombol lihat password — TIDAK dirender untuk admin_master
        const revealBtn = isAdmin
            ? `<button class="icon-btn" disabled title="Password Admin Master tidak dapat dilihat" style="opacity:0.2;cursor:not-allowed;">👁️</button>`
            : `<button class="icon-btn success" onclick="revealPassword('${u.id}')" title="Lihat password sementara (5 detik)">👁️</button>`;

        // Status toggle text
        const toggleTitle = isActive ? 'Nonaktifkan akun ini' : 'Aktifkan akun ini';
        const toggleIcon  = isActive ? '🔴' : '🟢';

        const rowOpacity = isActive ? '' : 'opacity:0.6;';

        return `
        <tr style="${rowOpacity}">
            <td style="text-align:center;font-weight:700;color:#94a3b8;">${no}</td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div class="user-initial avatar-${u.role}">${initials}</div>
                    <div>
                        <div style="font-weight:700;color:#0f172a;">${u.full_name || '—'}</div>
                        <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;font-family:monospace;">${u.username || u.id?.split('-')[0] || '—'}</div>
                    </div>
                </div>
            </td>
            <td><span class="role-badge badge-${u.role}">${formatRole(u.role)}</span></td>
            <td>
                <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                    ${isActive ? '🟢 Aktif' : '🔴 Nonaktif'}
                </span>
            </td>
            <td>${pwdCell}</td>
            <td style="font-size:0.78rem;color:#64748b;">${lastReset}</td>
            <td style="font-size:0.8rem;color:#64748b;">${phone}</td>
            <td>
                <div class="action-group">
                    ${revealBtn}
                    <button class="icon-btn" onclick="openResetModal('${u.id}')" title="Reset Password">🔑</button>
                    <button class="icon-btn" onclick="openEditModal('${u.id}')" title="Edit Data User">✏️</button>
                    <button class="icon-btn" onclick="toggleStatus('${u.id}')" title="${toggleTitle}">${toggleIcon}</button>
                    <button class="icon-btn danger" onclick="openDeleteModal('${u.id}')" title="Hapus User">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPagination();
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
    const area = document.getElementById('paginationArea');
    const info = document.getElementById('pageInfo');
    const btns = document.getElementById('pageBtns');

    if (filteredUsers.length <= PAGE_SIZE) {
        area.style.display = 'none';
        return;
    }

    area.style.display = 'flex';
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end   = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);
    info.innerText = `Menampilkan ${start}–${end} dari ${filteredUsers.length} user`;

    let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    for (let p = 1; p <= totalPages; p++) {
        html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    }
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    btns.innerHTML = html;
}

window.goPage = function(p) {
    const total = Math.ceil(filteredUsers.length / PAGE_SIZE);
    if (p < 1 || p > total) return;
    currentPage = p;
    renderTable();
};

// ============================================================
// HELPERS
// ============================================================
function formatRole(role) {
    const map = {
        admin_master: 'Admin Master',
        manager: 'Manager',
        admin_ts: 'Admin TS',
        sampling: 'Sampling',
        analis: 'Analis'
    };
    return map[role] || role;
}

function getUserById(id) {
    return usersList.find(u => u.id === id);
}

// ============================================================
// MODAL HELPERS
// ============================================================
window.openModal = function(id) {
    document.getElementById(id).classList.add('open');
};
window.closeModal = function(id) {
    document.getElementById(id).classList.remove('open');
};

// Close on backdrop click
document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('open');
    });
});

// ============================================================
// AKSI 1: TAMBAH USER
// ============================================================
function updateEmailPreview() {
    const val = document.getElementById('addUsername').value.trim();
    const box = document.getElementById('addPreviewBox');
    const span = document.getElementById('addEmailPreview');
    if (val) {
        span.innerText = `${val.toLowerCase().replace(/\s+/g, '')}@lab.id`;
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
}

window.openAddModal = function() {
    document.getElementById('formAdd').reset();
    document.getElementById('addPreviewBox').style.display = 'none';
    openModal('modalAdd');
};

window.handleUserAdd = async function(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSubmitAdd');
    btn.disabled = true;
    btn.innerText = '⏳ Menyimpan...';

    const fullName = document.getElementById('addFullName').value.trim();
    const username = document.getElementById('addUsername').value.trim().toLowerCase().replace(/\s+/g, '');
    const role     = document.getElementById('addRole').value;
    const phone    = document.getElementById('addPhone').value.trim();
    const notes    = document.getElementById('addNotes').value.trim();
    let   password = document.getElementById('addPassword').value.trim();

    if (!password) password = generatePassword();

    const email      = `${username}@lab.id`;
    const encodedPwd = xorEncode(password);

    // ── SIMPAN ID ADMIN untuk safety check ──
    const adminUserId = currentSession?.user?.id;
    if (!adminUserId) {
        showToast('Sesi admin tidak valid. Silakan login ulang.', 'error');
        btn.disabled = false;
        btn.innerText = '✅ Tambah User';
        return;
    }

    try {
        // ─── STEP 1: Cek apakah username sudah terdaftar di profiles ─────
        // Cegah duplikasi SEBELUM memanggil Supabase Auth (hemat rate limit)
        const { data: existingByUsername } = await _supabase
            .from('profiles')
            .select('id, full_name, role')
            .ilike('full_name', fullName)
            .maybeSingle();

        // Cek di auth.users lewat profiles (username == email prefix)
        // Kita akan validasi email duplikat setelah signup dengan cek UUID
        // (tidak ada cara langsung cek email di auth.users dari client)

        // ─── STEP 2: Buat akun via Supabase Auth REST (pure fetch) ───────
        // Pure fetch = ZERO side-effect ke Supabase JS session
        const signUpRes = await fetch(`${window.SB_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.SB_KEY,
            },
            body: JSON.stringify({ email, password }),
        });

        const signUpData = await signUpRes.json();

        if (!signUpRes.ok) {
            const rawMsg = signUpData?.error_description || signUpData?.msg || signUpData?.message || `HTTP ${signUpRes.status}`;
            // Deteksi rate limit error dan beri petunjuk spesifik
            if (rawMsg.toLowerCase().includes('rate limit') || rawMsg.toLowerCase().includes('too many')) {
                throw new Error(
                    `RATE_LIMIT: Terlalu banyak percobaan signup. ` +
                    `Tunggu beberapa menit, atau naikkan limit di Supabase → Authentication → Rate Limits.`
                );
            }
            // Jika user sudah terdaftar di Auth, cek apakah profilnya masih default/kosong (misal dari Trigger/gagal sebelumnya)
            if (rawMsg.toLowerCase().includes('already registered') || rawMsg.toLowerCase().includes('already exists')) {
                const { data: orphanProfile } = await _supabase
                    .from('profiles')
                    .select('*')
                    .or(`username.eq.${username},full_name.eq.${fullName}`)
                    .maybeSingle();

                if (orphanProfile) {
                    const { error: updateErr } = await _supabase
                        .from('profiles')
                        .update({
                            username,
                            full_name: fullName,
                            role,
                            phone: phone || null,
                            notes: notes || null,
                            plain_password: encodedPwd,
                            is_active: true,
                            status_karyawan: 'aktif',
                            last_password_reset: new Date().toISOString()
                        })
                        .eq('id', orphanProfile.id);

                    if (!updateErr) {
                        await logAction('UPDATE_USER',
                            `Memperbarui profil user terdaftar: ${fullName} (${email}), role: ${role}`,
                            null,
                            { full_name: fullName, email, role }
                        );
                        showToast(`✅ User "${fullName}" berhasil diperbarui dengan Role: ${formatRole(role)}! Password: ${password}`, 'success', 8000);
                        closeModal('modalAdd');
                        await fetchUsers();
                        return;
                    }
                }
            }
            throw new Error(`Auth Error: ${rawMsg}`);
        }

        const newUserId = signUpData?.user?.id || signUpData?.id;
        if (!newUserId) throw new Error('Gagal mendapatkan ID user baru dari Supabase.');

        // ─── STEP 3: SAFETY CHECK — pastikan UUID bukan milik admin ──────
        // Supabase kadang mengembalikan UUID user lama jika email sudah ada.
        // Jika UUID sama dengan admin, STOP — jangan overwrite profil admin!
        if (newUserId === adminUserId) {
            throw new Error(
                `Username "${username}" adalah akun Anda sendiri atau sudah terdaftar. ` +
                `Gunakan username yang berbeda.`
            );
        }

        // ─── STEP 4 & 5: UPSERT / UPDATE PROFIL ──────────────────────────
        // Supabase Trigger mungkin sudah otomatis membuat baris profil default (misal role='staff').
        // Kita gunakan update/upsert agar data dari form (nama, role, phone, password) langsung tersimpan!
        const profilePayload = {
            id: newUserId,
            username,
            full_name: fullName,
            role,
            phone: phone || null,
            notes: notes || null,
            plain_password: encodedPwd,
            is_active: true,
            status_karyawan: 'aktif',
            last_password_reset: new Date().toISOString()
        };

        const { data: existingProfileById } = await _supabase
            .from('profiles')
            .select('id, role')
            .eq('id', newUserId)
            .maybeSingle();

        let profileError = null;
        if (existingProfileById) {
            // Update profil yang baru saja dibuat oleh Trigger Supabase
            const { error: err } = await _supabase
                .from('profiles')
                .update(profilePayload)
                .eq('id', newUserId);
            profileError = err;
        } else {
            // Insert profil baru jika belum ada
            const { error: err } = await _supabase
                .from('profiles')
                .insert([profilePayload]);
            profileError = err;
        }

        if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

        // ─── STEP 6: Verifikasi sesi admin masih utuh ────────────────────
        const { data: { session: checkSession } } = await _supabase.auth.getSession();
        if (!checkSession || checkSession.user.id !== adminUserId) {
            console.error('[KU] ⚠️ Sesi admin berubah setelah signup! Memulihkan...');
            // Sesi hilang — arahkan ke login daripada diam-diam rusak
            showToast('User berhasil ditambahkan, tapi sesi Anda perlu diperbarui. Silakan login ulang.', 'warning', 8000);
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }

        // ── Audit log ──
        await logAction('CREATE_USER',
            `Membuat akun user baru: ${fullName} (${email}), role: ${role}`,
            null,
            { full_name: fullName, email, role }
        );

        showToast(`✅ User "${fullName}" berhasil ditambahkan! Password: ${password}`, 'success', 8000);
        closeModal('modalAdd');
        await fetchUsers();

    } catch (err) {
        console.error('Gagal tambah user:', err);

        let errMsg = err.message;
        if (errMsg.includes('User already registered')) {
            errMsg = `Email ${email} sudah terdaftar di sistem. Gunakan username yang berbeda.`;
        } else if (errMsg.includes('Password should be')) {
            errMsg = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
        } else if (errMsg.toLowerCase().includes('row-level security') || errMsg.toLowerCase().includes('violates row-level')) {
            errMsg = 'Akun Auth berhasil dibuat, tapi profil gagal disimpan karena RLS Policy. Lihat banner merah di atas.';
            showRlsBanner();
        }

        showToast(errMsg, 'error', 7000);
    } finally {
        btn.disabled = false;
        btn.innerText = '✅ Tambah User';
    }
};

// ============================================================
// AKSI 2: EDIT USER
// ============================================================
window.openEditModal = function(id) {
    const u = getUserById(id);
    if (!u) return;

    document.getElementById('editUserId').value        = u.id;
    document.getElementById('editFullName').value      = u.full_name || '';
    document.getElementById('editUsernameDisplay').value = `${u.id.split('-')[0]}@lab.id`;
    document.getElementById('editRole').value          = u.role || 'sampling';
    document.getElementById('editPhone').value         = u.phone || '';
    document.getElementById('editNotes').value         = u.notes || '';
    document.getElementById('editIsActive').checked    = u.is_active !== false;

    // Cek jika ini akun sendiri
    const isSelf = u.id === currentSession?.user?.id;
    const hint = document.getElementById('editActiveHint');
    const checkbox = document.getElementById('editIsActive');
    if (isSelf) {
        checkbox.disabled = true;
        hint.innerText = '⚠️ Tidak dapat menonaktifkan akun sendiri';
        hint.style.color = '#d97706';
    } else {
        checkbox.disabled = false;
        hint.innerText = '';
    }

    openModal('modalEdit');
};

window.handleUserUpdate = async function(event) {
    event.preventDefault();
    const id       = document.getElementById('editUserId').value;
    const fullName = document.getElementById('editFullName').value.trim();
    const role     = document.getElementById('editRole').value;
    const phone    = document.getElementById('editPhone').value.trim();
    const notes    = document.getElementById('editNotes').value.trim();
    const isActive = document.getElementById('editIsActive').checked;

    const old = getUserById(id);
    if (!old) return;

    // Guard: tidak boleh nonaktifkan diri sendiri
    if (!isActive && id === currentSession?.user?.id) {
        showToast('Tidak dapat menonaktifkan akun sendiri!', 'error');
        return;
    }

    try {
        const { error } = await _supabase.from('profiles').update({
            full_name: fullName,
            role,
            phone: phone || null,
            notes: notes || null,
            is_active: isActive
        }).eq('id', id);

        if (error) throw error;

        await logAction('UPDATE_USER',
            `Mengubah data user: ${fullName} (Role: ${role}, Aktif: ${isActive})`,
            { full_name: old.full_name, role: old.role, is_active: old.is_active },
            { full_name: fullName, role, is_active: isActive }
        );

        showToast(`Data user "${fullName}" berhasil diperbarui.`);
        closeModal('modalEdit');
        await fetchUsers();
    } catch (err) {
        console.error('Gagal update user:', err);
        showToast(err.message, 'error');
    }
};

// ============================================================
// AKSI 3: LIHAT PASSWORD (reveal sementara)
// ============================================================
window.revealPassword = function(id) {
    const u = getUserById(id);
    if (!u) return;

    // GUARD: admin_master tidak boleh terlihat
    if (u.role === 'admin_master') {
        showToast('Password Admin Master tidak dapat dilihat dari sistem.', 'warning');
        return;
    }

    const cell = document.getElementById(`pwdCell_${id}`);
    if (!cell) return;

    const decoded = u.plain_password ? xorDecode(u.plain_password) : '(tidak tersedia)';

    // Tampilkan
    cell.className = 'pwd-revealed';
    cell.innerText = decoded;

    // Catat audit log
    logAction('VIEW_PASSWORD',
        `Melihat password user: ${u.full_name}`,
        null, null
    );

    // Auto-hide setelah 5 detik
    clearTimeout(revealTimers[id]);
    revealTimers[id] = setTimeout(() => {
        cell.className = 'pwd-hidden';
        cell.innerText = '••••••';
    }, 5000);
};

// ============================================================
// AKSI 4: RESET PASSWORD
// ============================================================
window.openResetModal = function(id) {
    const u = getUserById(id);
    if (!u) return;

    document.getElementById('resetUserId').value  = id;
    document.getElementById('resetUserName').innerText = u.full_name || id;
    document.getElementById('modeAuto').checked   = true;
    document.getElementById('resetNewPwd').value  = '';
    document.getElementById('manualPwdWrap').style.display = 'none';

    openModal('modalReset');
};

window.toggleResetMode = function() {
    const isManual = document.getElementById('modeManual').checked;
    document.getElementById('manualPwdWrap').style.display = isManual ? 'block' : 'none';
};

window.handlePasswordReset = async function() {
    const id   = document.getElementById('resetUserId').value;
    const mode = document.querySelector('input[name="resetMode"]:checked')?.value;
    const u    = getUserById(id);
    if (!u) return;

    let newPwd;
    if (mode === 'auto') {
        newPwd = generatePassword();
    } else {
        newPwd = document.getElementById('resetNewPwd').value.trim();
        if (!newPwd || newPwd.length < 6) {
            showToast('Password minimal 6 karakter!', 'error');
            return;
        }
    }

    const userEmail = u.username ? `${u.username}@lab.id` : `(cari email di Supabase Auth)`;

    try {
        // Update profiles.plain_password untuk display di sistem
        const { error } = await _supabase.from('profiles').update({
            plain_password: xorEncode(newPwd),
            last_password_reset: new Date().toISOString()
        }).eq('id', id);

        if (error) throw error;

        await logAction('RESET_PASSWORD',
            `Reset password untuk user: ${u.full_name}`,
            { plain_password: '***' },
            { plain_password: '***', last_password_reset: new Date().toISOString() }
        );

        // Tampilkan SQL yang harus dijalankan untuk update password login
        showResetSqlBanner(u.full_name, userEmail, newPwd);
        showToast(`🔑 Password baru "${u.full_name}": ${newPwd} — Jalankan SQL di banner kuning!`, 'success', 10000);
        closeModal('modalReset');
        await fetchUsers();
    } catch (err) {
        console.error('Gagal reset password:', err);
        showToast(err.message, 'error');
    }
};

// Banner SQL untuk update auth.users password (muncul setelah reset)
function showResetSqlBanner(fullName, email, newPwd) {
    const old = document.getElementById('resetSqlBanner');
    if (old) old.remove();

    const SQL = `-- Update password login untuk: ${fullName}\nUPDATE auth.users\nSET encrypted_password = crypt('${newPwd}', gen_salt('bf')),\n    updated_at = NOW()\nWHERE email = '${email}';\n-- Verifikasi:\nSELECT email, email_confirmed_at, updated_at FROM auth.users WHERE email = '${email}';`;

    const banner = document.createElement('div');
    banner.id = 'resetSqlBanner';
    banner.style.cssText = `
        background:#fefce8;border:1px solid #fde047;border-radius:14px;
        padding:16px 20px;margin:0 0 16px;display:flex;
        align-items:flex-start;gap:12px;font-size:0.82rem;
    `;
    banner.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0;">🔑</span>
        <div style="flex:1;">
            <strong style="color:#713f12;display:block;margin-bottom:4px;">Satu Langkah Lagi — Update Password Login</strong>
            <span style="color:#78350f;line-height:1.6;">
                Password di sistem (profiles) sudah diperbarui. Agar <strong>${fullName}</strong> bisa login dengan password baru,
                jalankan SQL berikut di <strong>Supabase → SQL Editor</strong>:
            </span>
            <pre id="resetSqlPre" style="background:#fef9c3;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:0.72rem;color:#78350f;overflow-x:auto;line-height:1.7;white-space:pre;">${SQL}</pre>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                <button onclick="navigator.clipboard.writeText(document.getElementById('resetSqlPre').innerText).then(()=>this.innerText='✅ Disalin!')"
                    style="padding:6px 14px;border-radius:8px;border:1px solid #ca8a04;background:white;color:#713f12;font-size:0.75rem;font-weight:700;cursor:pointer;">
                    📋 Salin SQL
                </button>
                <button onclick="window.open('https://supabase.com/dashboard/project/'+window.SB_URL.split('.')[0].split('//')[1]+'/sql/new','_blank')"
                    style="padding:6px 14px;border-radius:8px;border:1px solid #ca8a04;background:#fbbf24;color:#713f12;font-size:0.75rem;font-weight:700;cursor:pointer;">
                    🚀 Buka SQL Editor
                </button>
            </div>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;flex-shrink:0;padding:0;">✕</button>
    `;
    const contentBody = document.querySelector('.content-body');
    if (contentBody) contentBody.insertBefore(banner, contentBody.firstChild);
}


// ============================================================
// AKSI 5: TOGGLE STATUS (AKTIF / NONAKTIF)
// ============================================================
window.toggleStatus = async function(id) {
    const u = getUserById(id);
    if (!u) return;

    // Guard: tidak boleh nonaktifkan diri sendiri
    if (id === currentSession?.user?.id) {
        showToast('Tidak dapat menonaktifkan akun sendiri!', 'error');
        return;
    }

    const newStatus = u.is_active === false;
    const action    = newStatus ? 'mengaktifkan' : 'menonaktifkan';

    if (!confirm(`Apakah Anda yakin ingin ${action} akun "${u.full_name}"?`)) return;

    try {
        const { error } = await _supabase.from('profiles')
            .update({ is_active: newStatus })
            .eq('id', id);

        if (error) throw error;

        await logAction(newStatus ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
            `${newStatus ? 'Mengaktifkan' : 'Menonaktifkan'} akun user: ${u.full_name}`,
            { is_active: u.is_active },
            { is_active: newStatus }
        );

        showToast(`Akun "${u.full_name}" berhasil di${action}kan.`);
        await fetchUsers();
    } catch (err) {
        console.error('Gagal toggle status:', err);
        showToast(err.message, 'error');
    }
};

// ============================================================
// AKSI 6: HAPUS USER
// ============================================================
window.openDeleteModal = function(id) {
    const u = getUserById(id);
    if (!u) return;

    // Guard: tidak boleh hapus diri sendiri
    if (id === currentSession?.user?.id) {
        showToast('Tidak dapat menghapus akun sendiri yang sedang aktif!', 'error');
        return;
    }

    document.getElementById('deleteUserId').value        = id;
    document.getElementById('deleteUserName').value      = u.full_name || id;
    document.getElementById('deleteConfirmInput').value  = '';

    // Ambil username (prefix ID)
    const usernameHint = document.getElementById('deleteUsernameHint');
    usernameHint.innerText = `Username untuk dikonfirmasi: ${u.id.split('-')[0]}`;

    openModal('modalDelete');
};

window.handleUserDelete = async function() {
    const id      = document.getElementById('deleteUserId').value;
    const confirm = document.getElementById('deleteConfirmInput').value.trim();
    const u       = getUserById(id);
    if (!u) return;

    const expectedUsername = u.id.split('-')[0];
    if (confirm !== expectedUsername) {
        showToast('Konfirmasi username tidak cocok!', 'error');
        return;
    }

    try {
        const { error } = await _supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;

        await logAction('DELETE_USER',
            `Menghapus akun user: ${u.full_name}`,
            { full_name: u.full_name, role: u.role },
            null
        );

        showToast(`User "${u.full_name}" berhasil dihapus dari sistem.`);
        closeModal('modalDelete');
        await fetchUsers();
    } catch (err) {
        console.error('Gagal hapus user:', err);
        showToast(err.message, 'error');
    }
};
