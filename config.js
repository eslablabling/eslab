// config.js

// Gunakan URL dan Key Anda
const SB_URL = 'https://ucpomkfekmuqdappdudf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcG9ta2Zla211cWRhcHBkdWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTA0MDIsImV4cCI6MjA4NzYyNjQwMn0.nWRYzonk_NG2mmr5EJ_uguOoaoI-YAkNSrqFs6i2HDc';

// JANGAN gunakan nama 'supabase' untuk variabel baru.
// Gunakan '_supabase' dan pasang di window agar global.
window._supabase = window.supabase.createClient(SB_URL, SB_KEY);

console.log("✅ Supabase Client siap di window._supabase");