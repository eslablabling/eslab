// 1. Inisialisasi Supabase
const SUPABASE_URL = 'https://ucpomkfekmuqdappdudf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcG9ta2Zla211cWRhcHBkdWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTA0MDIsImV4cCI6MjA4NzYyNjQwMn0.nWRYzonk_NG2mmr5EJ_uguOoaoI-YAkNSrqFs6i2HDc';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Referensi Elemen UI
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');
const btnSubmit = document.getElementById('btnSubmit');

// 3. Event Listener Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.toLowerCase().trim();
    const password = document.getElementById('password').value;

    toggleLoading(true);

    // STRATEGI INVISIBLE DOMAIN
    const emailInternal = `${username}@lab.id`;

    try {
        // 1. Cek apakah username ada di database (tabel profiles)
        const { data: userProfile, error: checkError } = await _supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle(); // Menggunakan maybeSingle() lebih aman daripada .single()

        if (checkError || !userProfile) {
            displayStatus("Username tidak terdaftar", "error");
            toggleLoading(false);
            return;
        }

        // 2. Jika username ada, baru coba login (cek password)
        const { data, error: loginError } = await _supabase.auth.signInWithPassword({
            email: emailInternal,
            password: password
        });

        if (loginError) {
            // Jika masuk ke sini, berarti username benar tapi password salah
            displayStatus("Password yang Anda masukkan salah", "error");
            toggleLoading(false);
            return;
        }

        // Sukses
        displayStatus("Login Berhasil! Mengalihkan...", "success");
        setTimeout(() => {
            window.location.href = 'dashboard.html'; 
        }, 1200);

    } catch (err) {
        displayStatus("Terjadi gangguan sistem", "error");
        toggleLoading(false);
    }
});

// Fungsi Helper UI (HANYA SATU VERSI)
function displayStatus(msg, type) {
    messageDiv.innerText = msg;
    
    // PENTING: Mengubah display none menjadi block agar terlihat
    messageDiv.style.display = "block"; 
    
    // Styling manual agar konsisten dengan desain modern
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
        btnSubmit.style.cursor = "not-allowed";
    } else {
        btnSubmit.innerText = "Masuk ke Sistem";
        btnSubmit.disabled = false;
        btnSubmit.style.opacity = "1";
        btnSubmit.style.cursor = "pointer";
    }
}

const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        messageDiv.style.display = "none";
    });
});