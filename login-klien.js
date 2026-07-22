const loginForm = document.getElementById('clientLoginForm');
const messageDiv = document.getElementById('message');
const btnSubmit = document.getElementById('btnSubmit');
const pwdResetModal = document.getElementById('pwdResetModal');
const newPwdBox = document.getElementById('newPwdBox');

let pendingSessionData = null;

// Handle Submit Form Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    toggleLoading(true);

    try {
        // Panggil Postgres RPC Function ( SECURITY DEFINER )
        const { data, error } = await _supabase.rpc('check_client_login', {
            p_username: username,
            p_password: password
        });

        if (error) throw error;

        const result = data && data[0]; // Hasil RPC mengembalikan array of object

        if (!result || !result.success) {
            displayStatus("Username atau password salah", "error");
            toggleLoading(false);
            return;
        }

        // Simpan sesi sementara
        pendingSessionData = {
            company_name: result.company_name,
            username: result.username,
            role: 'client'
        };

        // Cek apakah dipicu reset password bulanan
        if (result.password_reset_trigger) {
            // Tampilkan modal kata sandi baru
            newPwdBox.innerText = result.new_password;
            pwdResetModal.style.display = 'flex';
            toggleLoading(false);
        } else {
            // Langsung login
            proceedLogin();
        }

    } catch (err) {
        console.error("Gagal melakukan login:", err);
        displayStatus("Terjadi gangguan sistem: " + err.message, "error");
        toggleLoading(false);
    }
});

// Lanjutkan proses login & simpan session
function proceedLogin() {
    if (!pendingSessionData) return;
    
    sessionStorage.setItem('client-session', JSON.stringify(pendingSessionData));
    sessionStorage.setItem('user_role', 'client');
    
    displayStatus("Login Berhasil! Mengalihkan...", "success");
    setTimeout(() => {
        window.location.href = 'portal-klien.html';
    }, 1200);
}

// Tutup modal reset password
window.closePwdModal = function() {
    pwdResetModal.style.display = 'none';
    proceedLogin();
}

// UI Helpers
function displayStatus(msg, type) {
    messageDiv.innerText = msg;
    messageDiv.style.display = "block"; 
    messageDiv.style.padding = "14px";
    messageDiv.style.borderRadius = "16px";
    messageDiv.style.marginTop = "20px";
    messageDiv.style.fontSize = "0.8rem";
    messageDiv.style.fontWeight = "700";
    messageDiv.style.textAlign = "center";
    messageDiv.style.transition = "all 0.3s ease";
    
    if (type === "success") {
        messageDiv.style.backgroundColor = "#ecfdf5"; 
        messageDiv.style.color = "#059669";
        messageDiv.style.border = "1px solid #d1fae5";
    } else {
        messageDiv.style.backgroundColor = "#fff1f2"; 
        messageDiv.style.color = "#e11d48";
        messageDiv.style.border = "1px solid #ffe4e6";
    }
}

function toggleLoading(isLoading) {
    if (isLoading) {
        btnSubmit.innerText = "Memproses...";
        btnSubmit.disabled = true;
        btnSubmit.style.opacity = "0.7";
    } else {
        btnSubmit.innerText = "Masuk Ke Portal";
        btnSubmit.disabled = false;
        btnSubmit.style.opacity = "1";
    }
}

// Reset status pesan saat mengetik
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        messageDiv.style.display = "none";
    });
});
