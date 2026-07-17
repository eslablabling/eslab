// config.example.js
// Copy this file to config.js and fill in your credentials

// Kredensial di-obfuscate dengan Base64 atau gunakan string langsung
const _encUrl = 'YOUR_BASE64_ENCODED_SUPABASE_URL';
const _encKey = 'YOUR_BASE64_ENCODED_SUPABASE_ANON_KEY';

const SB_URL = atob(_encUrl);
const SB_KEY = atob(_encKey);

// JANGAN gunakan nama 'supabase' untuk variabel baru.
// Gunakan '_supabase' dan pasang di window agar global.
window._supabase = window.supabase.createClient(SB_URL, SB_KEY);

console.log("✅ Supabase Client siap di window._supabase");

// --- GOOGLE DRIVE & PICKER INTEGRATION CREDENTIALS ---
window.GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
window.GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY";
window.GOOGLE_APP_ID = "YOUR_GOOGLE_APP_ID";
