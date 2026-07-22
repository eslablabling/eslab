let currentRole = null;
let currentProfile = null;
let currentSession = null;
let messagesData = [];

// 1. Inisialisasi saat auth-ready
window.addEventListener('auth-ready', async (e) => {
    const { session, profile, role } = e.detail;
    currentSession = session;
    currentProfile = profile;
    currentRole = role;

    // Set Initials
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : (profile?.company_name ? 'CL' : 'U');
    const initialsEl = document.getElementById('userInitials');
    if (initialsEl) initialsEl.innerText = initials;

    // Tampilkan form pengiriman pesan hanya jika role adalah client
    if (currentRole === 'client') {
        const formCard = document.getElementById('formMessageCard');
        if (formCard) formCard.style.display = 'block';
        
        const msgCompanyInput = document.getElementById('msgCompany');
        if (msgCompanyInput) {
            msgCompanyInput.value = profile?.company_name || '';
        }
    }

    // Ambil data pesan
    await fetchMessages();
});

// 2. Fetch data pesan dari database
async function fetchMessages() {
    try {
        if (currentRole === 'client') {
            // Gunakan Stored Procedure RPC agar aman & bypass RLS khusus klien
            const { data, error } = await _supabase.rpc('fetch_client_messages', {
                p_company_name: currentProfile?.company_name || ''
            });
            if (error) throw error;
            messagesData = data || [];
        } else {
            // Untuk Staf Lab, langsung baca tabel client_messages dengan RLS
            const { data, error } = await _supabase
                .from('client_messages')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            messagesData = data || [];
        }

        renderMessagesTable();
    } catch (err) {
        console.error("Gagal memuat pesan:", err);
        alert("Gagal memuat pesan: " + err.message);
    }
}

// 3. Render tabel log pesan
function renderMessagesTable() {
    const tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;

    if (messagesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 24px;">Belum ada pesan komunikasi terkirim.</td></tr>`;
        return;
    }

    // Hanya manager, admin_master, dan admin_ts yang memiliki akses edit (balas)
    const isStaffWithReplyAccess = ['admin_master', 'manager', 'admin_ts'].includes(currentRole);
    const thActions = document.getElementById('thActions');
    if (thActions) {
        thActions.style.display = isStaffWithReplyAccess ? 'table-cell' : 'none';
    }

    tbody.innerHTML = messagesData.map(msg => {
        const tglKirim = new Date(msg.created_at).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Status Badge
        const isReplied = msg.status === 'Sudah Dibalas';
        const badgeClass = isReplied ? 'badge-replied' : 'badge-pending';
        const statusText = isReplied ? 'Sudah Dibalas' : 'Belum Dibalas';

        // Teks Balasan
        let replyHtml = '';
        if (isReplied) {
            const repliedAt = new Date(msg.replied_at).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
            replyHtml = `
                <div style="font-weight: 600; color: #16a34a; margin-bottom: 4px;">${msg.reply}</div>
                <div style="font-size: 0.7rem; color: #94a3b8;">Dibalas oleh ${msg.replied_by.split('@')[0]} pada ${repliedAt}</div>
            `;
        } else {
            replyHtml = `<span style="font-style: italic; color: #94a3b8;">⏳ Menunggu tanggapan dari staf...</span>`;
        }

        // Action Buttons
        let actionsHtml = '';
        if (isStaffWithReplyAccess) {
            actionsHtml += `<button class="table-action-btn" onclick="openReplyModal('${msg.id}')" title="Balas Pesan">💬</button>`;
            
            if (currentRole === 'admin_master') {
                actionsHtml += `<button class="table-action-btn" onclick="deleteMessage('${msg.id}')" title="Hapus Pesan" style="color: #ef4444; margin-left: 6px;">🗑️</button>`;
            }
        }

        return `
            <tr>
                <td style="font-size: 0.8rem; color: #64748b;">${tglKirim}</td>
                <td style="font-weight: 700; color: #0f172a;">${msg.company_name}</td>
                <td style="font-weight: 500;">${msg.sender_name}</td>
                <td style="font-weight: 600; color: #2563eb;">${msg.subject}</td>
                <td>
                    <div style="white-space: pre-wrap; max-width: 250px; font-size: 0.8rem; line-height: 1.4; color: #475569;">${msg.message}</div>
                </td>
                <td>${replyHtml}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                ${isStaffWithReplyAccess ? `<td style="text-align: center; white-space: nowrap;">${actionsHtml}</td>` : ''}
            </tr>
        `;
    }).join('');
}

// 4. Form Submission Klien
window.handleMessageSubmit = async function(event) {
    event.preventDefault();
    if (!currentProfile) return;

    const sender = document.getElementById('msgSender').value.trim();
    const subject = document.getElementById('msgSubject').value.trim();
    const message = document.getElementById('msgContent').value.trim();

    try {
        // Panggil RPC Stored Procedure send_client_message agar aman
        const { error } = await _supabase.rpc('send_client_message', {
            p_company_name: currentProfile.company_name || 'Klien Anonim',
            p_sender_name: sender,
            p_subject: subject,
            p_message: message
        });

        if (error) throw error;

        alert("Pesan berhasil dikirim ke Staf Lab!");
        document.getElementById('clientMessageForm').reset();

        // Kembalikan value nama perusahaan karena form.reset() mengosongkannya
        const msgCompanyInput = document.getElementById('msgCompany');
        if (msgCompanyInput) msgCompanyInput.value = currentProfile.company_name || '';

        await fetchMessages();
    } catch (err) {
        console.error("Gagal mengirim pesan:", err);
        alert("Gagal mengirim pesan: " + err.message);
    }
}

// 5. Modal Operations (Staff)
window.openReplyModal = function(id) {
    const msg = messagesData.find(m => m.id === id);
    if (!msg) return;

    document.getElementById('replyMsgId').value = msg.id;
    document.getElementById('replySubj').innerText = msg.subject;
    document.getElementById('replyMeta').innerText = `Dari ${msg.company_name} oleh ${msg.sender_name}`;
    document.getElementById('replyMsg').innerText = msg.message;
    document.getElementById('staffReplyText').value = msg.reply || '';

    document.getElementById('modalReplyMessage').style.display = 'flex';
}

window.closeReplyModal = function() {
    document.getElementById('modalReplyMessage').style.display = 'none';
}

// 6. Kirim Balasan (Staff)
window.handleMessageReply = async function(event) {
    event.preventDefault();
    const id = document.getElementById('replyMsgId').value;
    const replyText = document.getElementById('staffReplyText').value.trim();

    const msg = messagesData.find(m => m.id === id);
    if (!msg) return;

    try {
        const { error } = await _supabase
            .from('client_messages')
            .update({
                reply: replyText,
                replied_by: currentSession.user.email,
                replied_at: new Date().toISOString(),
                status: 'Sudah Dibalas'
            })
            .eq('id', id);

        if (error) throw error;

        // Log audit
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: 'REPLY_CLIENT_MESSAGE',
            table_name: 'client_messages',
            description: `Membalas pesan dari ${msg.company_name} - Subjek: ${msg.subject}`,
            old_data: { reply: msg.reply, status: msg.status },
            new_data: { reply: replyText, status: 'Sudah Dibalas' }
        }]);

        alert("Balasan pesan berhasil dikirim!");
        closeReplyModal();
        await fetchMessages();
    } catch (err) {
        console.error("Gagal mengirim balasan:", err);
        alert("Gagal mengirim balasan: " + err.message);
    }
}

// 7. Hapus Pesan (Admin Master Only)
window.deleteMessage = async function(id) {
    const msg = messagesData.find(m => m.id === id);
    if (!msg) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus pesan "${msg.subject}" dari ${msg.company_name}?`)) {
        return;
    }

    try {
        const { error } = await _supabase
            .from('client_messages')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Log audit
        await _supabase.from('audit_logs').insert([{
            user_id: currentSession.user.id,
            username: currentSession.user.email,
            action_type: 'DELETE_CLIENT_MESSAGE',
            table_name: 'client_messages',
            description: `Menghapus pesan dari ${msg.company_name} - Subjek: ${msg.subject}`,
            old_data: msg,
            new_data: null
        }]);

        alert("Pesan berhasil dihapus!");
        await fetchMessages();
    } catch (err) {
        console.error("Gagal menghapus pesan:", err);
        alert("Gagal menghapus: " + err.message);
    }
}
