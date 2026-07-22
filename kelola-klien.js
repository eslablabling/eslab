let currentRole = null;
let currentProfile = null;
let currentSession = null;
let accountsList = [];

// 1. Validasi Akses & Inisialisasi
window.addEventListener('auth-ready', async (e) => {
    const { session, profile, role } = e.detail;
    currentSession = session;
    currentProfile = profile;
    currentRole = role;

    // Proteksi Halaman: Hanya Admin Master yang boleh masuk
    if (currentRole !== 'admin_master') {
        alert("Akses ditolak! Halaman ini hanya untuk Admin Master.");
        window.location.href = 'dashboard.html';
        return;
    }

    // Set Initials
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'AM';
    const initialsEl = document.getElementById('userInitials');
    if (initialsEl) initialsEl.innerText = initials;

    await fetchClientAccounts();
});

// 2. Fetch akun klien dari database
async function fetchClientAccounts() {
    try {
        const { data, error } = await _supabase
            .from('client_accounts')
            .select('*')
            .order('company_name', { ascending: true });

        if (error) throw error;
        accountsList = data || [];
        renderClientAccounts();
    } catch (err) {
        console.error("Gagal mengambil data akun klien:", err);
        alert("Gagal memuat data: " + err.message);
    }
}

// 3. Render tabel akun klien
function renderClientAccounts() {
    const tbody = document.getElementById('clientAccountsTableBody');
    if (!tbody) return;

    if (accountsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">Belum ada akun klien terdaftar. Akun otomatis terbuat ketika COC baru disimpan.</td></tr>`;
        return;
    }

    tbody.innerHTML = accountsList.map((acc, idx) => {
        const lastReset = new Date(acc.last_reset).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
            <tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                <td style="font-weight: 700; color: #0f172a;">${acc.company_name}</td>
                <td style="font-family: monospace; font-weight: 600;">${acc.username}</td>
                <td>
                    <span class="password-cell">${acc.password}</span>
                </td>
                <td style="font-size: 0.8rem; color: #64748b;">${lastReset}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="table-action-btn" onclick="regeneratePassword('${acc.id}')" title="Reset Kata Sandi Acak">🔑</button>
                    <button class="table-action-btn" onclick="openEditModal('${acc.id}')" title="Edit Akun" style="margin-left: 4px;">✏️</button>
                    <button class="table-action-btn" onclick="deleteClientAccount('${acc.id}')" title="Hapus Akun Klien" style="color: #ef4444; margin-left: 4px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. Modal Tambah Akun Baru
window.openAddModal = function() {
    document.getElementById('addClientForm').reset();
    
    // Auto-generate password acak sebagai nilai placeholder/default di form
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    document.getElementById('addPassword').placeholder = `Generate otomatis (ES-${randomSuffix})`;
    
    document.getElementById('modalAddClient').style.display = 'flex';
}

window.closeAddModal = function() {
    document.getElementById('modalAddClient').style.display = 'none';
}

window.handleClientAdd = async function(event) {
    event.preventDefault();
    const company = document.getElementById('addCompany').value.trim();
    let username = document.getElementById('addUsername').value.trim().toLowerCase().replace(/\s+/g, '');
    let password = document.getElementById('addPassword').value.trim();

    if (!password) {
        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        password = `ES-${randomSuffix}`;
    }

    try {
        const { error } = await _supabase
            .from('client_accounts')
            .insert([{
                company_name: company,
                username: username,
                password: password
            }]);

        if (error) {
            if (error.code === '23505') throw new Error("Nama Perusahaan atau Username sudah terdaftar.");
            throw error;
        }

        // Log audit
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: 'CREATE_CLIENT_ACCOUNT',
            table_name: 'client_accounts',
            description: `Membuat akun klien manual untuk ${company} (Username: ${username})`,
            new_data: { company_name: company, username: username }
        }]);

        alert("Akun klien berhasil ditambahkan!");
        closeAddModal();
        await fetchClientAccounts();
    } catch (err) {
        console.error("Gagal menambahkan akun klien:", err);
        alert("Gagal menambahkan akun: " + err.message);
    }
}

// 5. Modal Edit Akun
window.openEditModal = function(id) {
    const acc = accountsList.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('editClientId').value = acc.id;
    document.getElementById('editCompany').value = acc.company_name;
    document.getElementById('editUsername').value = acc.username;
    document.getElementById('editPassword').value = ''; // kosongkan
    document.getElementById('editPassword').placeholder = 'Kosongkan jika sandi tidak diubah';

    document.getElementById('modalEditClient').style.display = 'flex';
}

window.closeEditModal = function() {
    document.getElementById('modalEditClient').style.display = 'none';
}

window.handleClientUpdate = async function(event) {
    event.preventDefault();
    const id = document.getElementById('editClientId').value;
    const company = document.getElementById('editCompany').value.trim();
    const username = document.getElementById('editUsername').value.trim().toLowerCase().replace(/\s+/g, '');
    const password = document.getElementById('editPassword').value.trim();

    const acc = accountsList.find(a => a.id === id);
    if (!acc) return;

    const updatePayload = {
        company_name: company,
        username: username
    };

    if (password) {
        updatePayload.password = password;
        updatePayload.last_reset = new Date().toISOString();
    }

    try {
        const { error } = await _supabase
            .from('client_accounts')
            .update(updatePayload)
            .eq('id', id);

        if (error) throw error;

        // Log audit
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: 'UPDATE_CLIENT_ACCOUNT',
            table_name: 'client_accounts',
            description: `Mengubah kredensial akun klien untuk ${company}`,
            old_data: { company_name: acc.company_name, username: acc.username },
            new_data: updatePayload
        }]);

        alert("Akun klien berhasil diupdate!");
        closeEditModal();
        await fetchClientAccounts();
    } catch (err) {
        console.error("Gagal mengupdate akun klien:", err);
        alert("Gagal mengupdate: " + err.message);
    }
}

// 6. Reset Sandi Acak Manual
window.regeneratePassword = async function(id) {
    const acc = accountsList.find(a => a.id === id);
    if (!acc) return;

    if (!confirm(`Apakah Anda yakin ingin me-reset password akun klien ${acc.company_name}?`)) {
        return;
    }

    // Generate sandi acak baru
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newPwd = `ES-${randomSuffix}`;

    try {
        const { error } = await _supabase
            .from('client_accounts')
            .update({
                password: newPwd,
                last_reset: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Log audit
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: 'RESET_CLIENT_PASSWORD',
            table_name: 'client_accounts',
            description: `Me-reset password klien untuk ${acc.company_name} secara manual`,
            old_data: { password: acc.password },
            new_data: { password: newPwd }
        }]);

        alert(`Password baru berhasil dibuat!\nPassword Baru: ${newPwd}`);
        await fetchClientAccounts();
    } catch (err) {
        console.error("Gagal me-reset password:", err);
        alert("Gagal me-reset password: " + err.message);
    }
}

// 7. Hapus Akun Klien
window.deleteClientAccount = async function(id) {
    const acc = accountsList.find(a => a.id === id);
    if (!acc) return;

    if (!confirm(`Hapus akun klien untuk ${acc.company_name}? Tindakan ini menyebabkan klien tidak bisa login ke portal.`)) {
        return;
    }

    try {
        const { error } = await _supabase
            .from('client_accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Log audit
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: 'DELETE_CLIENT_ACCOUNT',
            table_name: 'client_accounts',
            description: `Menghapus akun login klien untuk ${acc.company_name}`,
            old_data: acc,
            new_data: null
        }]);

        alert("Akun klien berhasil dihapus!");
        await fetchClientAccounts();
    } catch (err) {
        console.error("Gagal menghapus akun klien:", err);
        alert("Gagal menghapus: " + err.message);
    }
}
