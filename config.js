// 1. Ambil URL dan Anon Key dari Dashboard Supabase Anda:
// Project Settings -> API
const SUPABASE_URL = 'https://ucpomkfekmuqdappdudf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcG9ta2Zla211cWRhcHBkdWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTA0MDIsImV4cCI6MjA4NzYyNjQwMn0.nWRYzonk_NG2mmr5EJ_uguOoaoI-YAkNSrqFs6i2HDc';

// 2. Inisialisasi Client Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tips: Pastikan variabel _supabase ini bisa diakses secara global 
// agar file coc.js dan master-data.js bisa menggunakannya.`