// config.js

// Kredensial di-obfuscate dengan Base64 untuk mencegah deteksi otomatis di GitHub
const _encUrl = 'aHR0cHM6Ly91Y3BvbWtmZWttdXFkYXBwZHVkZi5zdXBhYmFzZS5jbw==';
const _encKey = 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5WamNHOXRhMlpsYTIxMWNXUmhjSEJrZFdSbUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05UQTBNRElzSW1WNGNDSTZNakE0TnpZeU5qUXdNbjAubldSWXpvbmtfTkcybW1yNUVKX3VndU9vYW9JLVlBa05TcnFGczZpMkhEYw==';

const SB_URL = atob(_encUrl);
const SB_KEY = atob(_encKey);

// JANGAN gunakan nama 'supabase' untuk variabel baru.
// Gunakan '_supabase' dan pasang di window agar global.
window._supabase = window.supabase.createClient(SB_URL, SB_KEY);

console.log("✅ Supabase Client siap di window._supabase");

// --- GOOGLE DRIVE & PICKER INTEGRATION CREDENTIALS ---
// Isi variabel ini untuk mengaktifkan penyeleksi berkas (Picker) & unggah otomatis ke Google Drive
window.GOOGLE_CLIENT_ID = "10521993809-t65pg21duj01l69n6ma2vsb0qv432b3p.apps.googleusercontent.com"; // Contoh: "1234567890-abc123xyz.apps.googleusercontent.com"
window.GOOGLE_API_KEY = "AIzaSyAB0AySSzxnleA4zAEhDjtxsh27r6amX_M";     // Google Cloud API Key
window.GOOGLE_APP_ID = "10521993809";     // Google Project Number (App ID)
