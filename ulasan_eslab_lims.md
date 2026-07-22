# 📋 Ulasan Proyek: ESLab LIMS
**PT Envirotama Solusindo — Laboratory Information Management System**

---

## 🔍 Ringkasan Singkat

ESLab LIMS adalah aplikasi web **berbasis browser** (Vanilla HTML/CSS/JS) yang berfungsi sebagai sistem manajemen informasi laboratorium lingkungan. Dibangun di atas **Supabase** sebagai backend-as-a-service, aplikasi ini mencakup alur kerja penuh dari penerimaan sampel hingga penerbitan sertifikat analisis (COA), dilengkapi portal khusus untuk klien eksternal.

| Atribut | Detail |
|---|---|
| **Stack** | HTML + Vanilla JS + CSS + Supabase |
| **Autentikasi** | Supabase Auth (email internal `@lab.id`) |
| **Database** | Supabase PostgreSQL |
| **Arsitektur** | Multi-page Application (MPA), tanpa framework |
| **PWA** | ✅ Service Worker + `manifest.json` |
| **Dark Mode** | ✅ Toggle dengan persistensi `localStorage` |
| **Versi** | V.01 (2026) |

---

## 🗂️ Peta Modul

```
index.html / app.js          → Login internal staff
login-klien.html / .js       → Login portal klien eksternal
dashboard.html / .js         → Dashboard utama + statistik + chart
coc.html / coc.js            → Chain of Custody digital (pembuatan COC)
sampling.html / sampling.js  → Monitoring & input data lapangan
penerimaan.html / .js        → Penerimaan sampel di lab
analisa.html / analisa.js    → Log analisa & hasil pengujian
coa.html / coa.js            → Verifikasi & penerbitan COA
tren.html / tren.js          → Tren & grafik historis emisi
portal-klien.html / .js      → Portal mandiri klien (read-only)
komunikasi.html / .js        → Hub komunikasi internal/klien
dokumen.html / dokumen.js    → Manajemen dokumen (IndexedDB + Drive)
master-data.html / .js       → Data referensi (parameter, regulasi)
kelola-klien.html / .js      → Manajemen akun klien
peta.html / peta.js          → Peta GIS lokasi cerobong
logger.html / logger.js      → Activity logger (developer only)
verify.html                  → Verifikasi dokumen via QR/link
auth.js                      → Guard sesi + render sidebar dinamis
config.js                    → Inisialisasi Supabase (terenkripsi XOR)
sw.js                        → Service Worker (PWA, cache-first)
```

---

## ✅ Kelebihan

### 1. Desain UI Premium
- Animasi **aurora background** pada halaman login menggunakan `radial-gradient` + keyframe CSS.
- Glassmorphism card (`backdrop-filter: blur`) yang konsisten.
- Font **Plus Jakarta Sans** dari Google Fonts, tipografi rapi.
- **Dark mode** lengkap dengan injeksi CSS dinamis dan transisi halus, tersimpan di `localStorage`.

### 2. Arsitektur Autentikasi yang Solid
- Strategi **"invisible domain"**: username `john` → email internal `john@lab.id` sehingga pengguna tidak perlu tahu formatnya.
- **Guard sesi terpusat** di `auth.js` yang menjaga semua halaman sekaligus; satu file menangani redirect untuk semua role.
- **RBAC (Role-Based Access Control)** untuk 6 role: `admin_master`, `manager`, `sampling`, `admin_ts`, `analis`, `client` — sidebar dirender secara dinamis sesuai role.
- **Audit log** login/logout tersimpan ke tabel `audit_logs` di Supabase.

### 3. Alur Kerja Lab yang Lengkap & Realistis
- Alur data tersambung: `COC → Sampling → Penerimaan → Analisa → Verifikasi → COA` — mencerminkan SOP laboratorium lingkungan yang sebenarnya.
- Modul **Sampling** menangani regulasi baku mutu, koreksi O₂, dan pemilihan metode.
- **COC Digital** menyimpan riwayat perusahaan klien dan petugas sampling sebagai autocomplete.

### 4. Fitur Teknis Canggih
- **PWA ready**: `manifest.json` + `sw.js` dengan strategi *stale-while-revalidate*, bypass cache untuk request Supabase.
- **IndexedDB** di modul Dokumen untuk penyimpanan offline lokal (hybrid dengan Google Drive link).
- **Custom event `auth-ready`** sebagai mekanisme koordinasi inisialisasi antar modul JS.
- **Obfuscasi kredensial** di `config.js` menggunakan XOR cipher sederhana untuk menyembunyikan URL & API key dari plain text.
- Modul **Tren** menggunakan Chart.js untuk visualisasi data historis.
- Modul **Peta** untuk GIS/geolocation titik cerobong.

### 5. Portal Klien Terpisah
- Klien login via `login-klien.html` → sesi disimpan di `sessionStorage` (terpisah dari sesi Supabase Auth internal).
- Guard di `auth.js` memblokir klien dari halaman internal secara otomatis.

---

## ⚠️ Catatan & Area Perbaikan

### 🔴 Keamanan

| Masalah | Detail |
|---|---|
| **Obfuscasi bukan enkripsi** | XOR cipher di `config.js` mudah di-reverse oleh siapapun yang membuka DevTools browser. Supabase URL & Anon Key tetap terekspos di client-side — ini bersifat normal untuk Supabase, namun **Row Level Security (RLS) di Supabase harus dikonfigurasi dengan benar** agar menjadi satu-satunya garis pertahanan. |
| **Session klien di `sessionStorage`** | Data sesi klien (termasuk nama perusahaan) disimpan di `sessionStorage` tanpa enkripsi; rentan terhadap XSS. |
| **Inline `onmouseover`** di `index.html` | Baris 174 menggunakan event handler inline (`onmouseover`, `onmouseout`) — gaya kode yang sudah usang. |

### 🟡 Kualitas Kode

| Masalah | Detail |
|---|---|
| **File JS sangat besar** | `sampling.js` (1.933 baris, 97 KB), `coc.js` (1.631 baris), `analisa.js` (77 KB), `dokumen.js` (55 KB) — semuanya dalam satu file, sulit dipelihara. |
| **Variabel global** | `currentPage`, `pageSize`, `filteredCocList`, dll. dideklarasikan di scope global (`let` di luar fungsi) — berpotensi konflik antar halaman jika suatu saat digabungkan. |
| **CSS hardcoded per halaman** | Setiap HTML memiliki blok `<style>` sendiri yang besar; tidak ada file CSS shared, menyebabkan duplikasi. |
| **`!important` berlebihan** | `auth.js` menggunakan `!important` secara masif di dark mode CSS (~80+ deklarasi) — menandakan specificity CSS yang tidak terstruktur. |
| **Service Worker tidak mencakup semua halaman** | `sw.js` hanya mencache sebagian halaman (tidak termasuk `coc.html`, `dokumen.html`, dll.). |
| **`console.log` di production** | Banyak `console.log` debug yang tersisa, termasuk logging data sensitif seperti role pengguna. |

### 🟢 Saran Pengembangan (sesuai `ulasan_dan_rekomendasi.md` yang sudah ada)

Dokumen blueprint sudah sangat bagus dan realistis. Prioritas yang disarankan:
1. **Generator PDF COA** (Fitur #6) — nilai bisnis tertinggi, menggantikan `window.print()`.
2. **Barcode/QR tracking** (Fitur #16) — mempercepat penerimaan sampel.
3. **Notifikasi WhatsApp** (Fitur #15) — via Supabase Webhooks, tidak perlu backend tambahan.
4. **Filter rentang tanggal** (Fitur #19) — improvement UX sederhana namun sangat praktis.

---

## 📊 Skor Evaluasi

| Dimensi | Nilai | Catatan |
|---|---|---|
| **Desain UI/UX** | ⭐⭐⭐⭐⭐ | Premium, konsisten, animasi halus |
| **Kelengkapan Fitur** | ⭐⭐⭐⭐½ | Alur lab lengkap, PWA, portal klien |
| **Kualitas Kode** | ⭐⭐⭐ | File monolitik, banyak global var |
| **Keamanan** | ⭐⭐⭐ | Bergantung pada RLS Supabase yang benar |
| **Maintainability** | ⭐⭐½ | Butuh modularisasi & shared CSS |
| **Potensi Bisnis** | ⭐⭐⭐⭐⭐ | Spesifik domain, fungsional, siap digunakan |

---

> **Kesimpulan**: ESLab LIMS adalah proyek dengan **ambisi tinggi dan eksekusi desain yang sangat baik** untuk sebuah aplikasi Vanilla JS tanpa framework. Alur kerjanya mencerminkan pemahaman mendalam tentang proses laboratorium lingkungan. Langkah selanjutnya yang paling berdampak adalah: (1) refaktorisasi JS menjadi modul yang lebih kecil, (2) memastikan RLS Supabase dikonfigurasi dengan ketat, dan (3) implementasi generator PDF COA otomatis.
