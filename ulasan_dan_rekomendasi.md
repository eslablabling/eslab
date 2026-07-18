# Cetak Biru (Blueprint) Pengembangan Fitur LIMS ESLab

Dokumen ini adalah rencana kerja komprehensif pengembangan fitur LIMS di masa mendatang untuk **PT Envirotama Solusindo**. Rencana ini dirancang secara bertahap, mulai dari kebutuhan logistik pra-lapangan hingga fitur interaktif pelengkap.

---

## I. Modul Logistik & Administrasi Pra-Lapangan

### 1. Perencanaan Sampling (Sampling Plan & Schedule)
* **Deskripsi**: Fitur untuk menjadwalkan dan merencanakan detail teknis sebelum berangkat ke lapangan.
* **Cara Kerja**: Admin/Manajer memilih nomor COC yang aktif, lalu mengisi data perencanaan:
  * **Personil Lapangan**: Memilih koordinator dan anggota tim sampling.
  * **Metode & Keselamatan**: Memilih jenis APD khusus yang diperlukan (misal: harness keselamatan untuk cerobong tinggi) dan kesiapan tangga/scaffolding di lokasi.
  * **Rencana Cerobong**: Menyusun urutan cerobong yang akan disampling per harinya jika pekerjaan berlangsung lebih dari 1 hari.
* **Output**: Formulir cetak Rencana Kerja Sampling yang memuat semua data checklist persiapan lapangan.

### 2. Surat Tugas Otomatis (Auto-Generated Duty Letter)
* **Deskripsi**: Dokumen resmi penugasan dari PT Envirotama Solusindo untuk ditunjukkan kepada pihak keamanan (security) atau manajemen pabrik tujuan.
* **Cara Kerja**: Sistem akan otomatis menarik data dari modul Perencanaan Sampling:
  * **Nomor Surat**: Generate nomor surat resmi otomatis secara berurutan (misal: `No: ST/025/ES-LIMS/VII/2026`).
  * **Nama Personil**: Menampilkan daftar nama tim sampling beserta jabatan mereka.
  * **Maksud Tugas**: Menampilkan kalimat penugasan dinamis (misal: *"...untuk melakukan pengujian emisi sumber tidak bergerak di PT TEST pada tanggal 18 Juli 2026..."*).
  * **Tanda Tangan Manajer**: Otomatis menempelkan tanda tangan digital Fadhel Verdino di bagian bawah surat.
* **Output**: Cetak Surat Tugas PDF dalam 1 detik tanpa perlu menyalin data satu per satu ke Microsoft Word.

### 3. Surat Jalan Peralatan (Equipment Pass & Checklist)
* **Deskripsi**: Surat resmi daftar peralatan yang dibawa untuk ditunjukkan ke petugas pos penjagaan pabrik agar peralatan tersebut diperbolehkan masuk dan keluar area industri.
* **Cara Kerja**: 
  * Sistem menampilkan Daftar Inventaris Alat LIMS (misal: *Gas Analyzer Testo 350, Isokinetic Control Box, Pitot Tube 1.5m, Tabung Gas Kalibrasi CO, dll*).
  * Koordinator sampling cukup menceklis alat-alat apa saja yang akan dibawa ke lapangan dari daftar inventaris tersebut.
  * Sistem mengunci daftar alat tersebut ke dalam nomor Surat Jalan Peralatan unik.
* **Output**: Cetak Surat Jalan Peralatan lengkap dengan kolom tanda tangan pengawas gudang, pembawa alat (sampler), dan petugas pos satpam pabrik.
* **Manfaat Tambahan**: Saat tim kembali ke kantor, sistem menyediakan checklist serah terima kembali untuk memastikan tidak ada alat mahal yang tertinggal atau hilang di pabrik klien.

### 4. Generator JSA Digital (Job Safety Analysis)
* **Deskripsi**: Sebelum bekerja di area industri berisiko tinggi (cerobong/pabrik), tim K3 (HSE) pabrik wajib meminta lembar JSA yang menguraikan potensi bahaya kerja lapangan dan mitigasinya.
* **Cara Kerja**: Saat mengisi Perencanaan Sampling, koordinator memilih bahaya di lokasi dari daftar template (misal: *Bekerja di Ketinggian, Sengatan Listrik, Paparan Gas Beracun*).
* **Output**: Dokumen JSA siap cetak berisi daftar bahaya, potensi cedera, langkah keselamatan, dan kolom persetujuan petugas HSE pabrik.

### 5. Modul Alokasi Alat Pelindung Diri (Safety PPE Checklist)
* **Deskripsi**: Formulir pencatatan alokasi APD untuk personil lapangan sebelum keberangkatan guna memenuhi kepatuhan K3.
* **Cara Kerja**: Sampler menandai daftar APD yang diambil dari loker keselamatan (misal: *Full Body Harness, Masker Respirator Gas, Sepatu Safety, Kacamata Pelindung, Safety Helmet*).
* **Manfaat**: Memastikan tidak ada personil yang dilarang naik ke atas platform cerobong oleh HSE pabrik akibat kekurangan perlengkapan APD wajib.

---

## II. Modul Laboratorium & Penjaminan Mutu (QA/QC ISO 17025)

### 6. Generator Sertifikat PDF (COA) Otomatis
* **Deskripsi**: Mengintegrasikan pustaka pembuat PDF client-side (seperti *jsPDF* atau *pdfmake*) untuk merender Certificate of Analysis (COA) secara otomatis dari database.
* **Manfaat**: Manajer dapat langsung mengunduh berkas PDF COA yang telah diverifikasi secara rapi, lengkap dengan tanda tangan digital atau QR Code verifikasi dokumen asli tanpa menggunakan cetak bawaan browser (`window.print()`).

### 7. Modul Quality Control (QC) Internal & Akurasi Pengujian
* **Deskripsi**: Fitur pengujian akurasi hasil lab guna pemenuhan akreditasi KAN:
  * **Method Blank (Blanko Metode)**: Memastikan tidak ada kontaminasi alat/reagen.
  * **Duplikat Analisis**: Menghitung deviasi hasil antar dua penimbangan (Relative Percent Difference / RPD). Jika RPD $> 10\%$, sistem otomatis memicu alarm bahwa pengujian harus diulang.

### 8. Alarm Kalibrasi Alat Laboratorium & Lapangan (Equipment Management)
* **Deskripsi**: Pendaftaran kalibrasi alat utama. Saat analis atau sampler memilih alat yang digunakan dari dropdown input data, sistem akan memeriksa status kalibrasi alat tersebut. Jika alat sudah melewati masa kalibrasi, sistem akan menampilkan peringatan kuning `⚠️ ALAT MELEWATI MASA KALIBRASI` dan merekomendasikan alat lain yang masih aktif.

### 9. Kalkulator Rata-Rata Opasitas Cerobong (EPA Method 9 Grid)
* **Deskripsi**: Membantu tim sampler menghitung rata-rata visual opasitas asap cerobong.
* **Cara Kerja**: Sampler menginput data grid opasitas (setiap 15 detik selama 6 menit). LIMS akan menghitung rata-rata matematisnya secara otomatis dan memberi alarm merah jika melanggar Baku Mutu peraturan.

### 10. Log Kalibrasi Pra-Keberangkatan Alat Gas (Pre-Trip Calibration Log)
* **Deskripsi**: Pencatatan uji linearitas alat gas analyzer sebelum dibawa ke lapangan (*zero & span gas check*).
* **Cara Kerja**: Sampler memasukkan nilai konsentrasi gas standar dan nilai pembacaan sensor alat. Sistem menghitung tingkat penyimpangan (drift). Jika drift di bawah $\pm 5\%$, alat dinyatakan layak jalan.

### 11. Kalkulator Pemilihan Nozel Isokinetik (Isokinetic Nozzle Selection)
* **Deskripsi**: Fitur bantu bagi petugas lapangan untuk memilih nozel isokinetik yang tepat saat di atas cerobong.
* **Cara Kerja**: Sampler mengetik diameter dalam cerobong, temperatur gas, dan tekanan dinamis (velocity head). Sistem langsung menghitung dan menampilkan nozel ideal (misal: *Nozzle 1/4\" atau 3/8\"*).
* **Manfaat**: Mencegah kesalahan isokinetik di lapangan yang dapat merusak akurasi pengujian partikulat.

### 12. Kalkulator Kelembaban Gas Otomatis (Gas Moisture Calculator)
* **Deskripsi**: Untuk analisis gas kering, kelembaban gas (kadar air) harus dihitung secara akurat.
* **Cara Kerja**: Sampler cukup menginput *berat awal kondensat (gram)*, *berat akhir kondensat (gram)*, dan *volume gas meter (liter)*. LIMS langsung menghitung persentase kelembaban gas cerobong secara otomatis.

---

## III. Integrasi & Portal Klien Mandiri

### 13. Portal Klien Mandiri (Self-Service Client Portal)
* **Deskripsi**: Memberikan akun login khusus dengan hak akses terbatas (Read-Only) untuk perwakilan perusahaan/klien (seperti PT Pertamina, PT PLN, dll). Melalui portal ini, klien dapat:
  * **Real-time Progress Tracker**: Melihat status sampel mereka yang sedang berjalan.
  * **Unduh Mandiri**: Mengunduh berkas COA yang sudah berstatus 'Verified'.
  * **Tren Kepatuhan Klien**: Melihat grafik riwayat emisi cerobong milik mereka sendiri dari waktu ke waktu.

### 14. Peta Interaktif Sebaran Titik Cerobong (GIS / Geolocation Map)
* **Deskripsi**: Memetakan koordinat cerobong klien ke peta interaktif (Leaflet.js). Pin peta akan disematkan di setiap lokasi cerobong klien di seluruh Indonesia dengan indikator warna (Hijau = Aman, Merah = Melebihi Baku Mutu).

### 15. Integrasi Pengiriman Notifikasi WhatsApp Otomatis
* **Deskripsi**: Menggunakan *Supabase Database Webhooks* untuk mengirim pesan WhatsApp otomatis ke personil yang bersangkutan saat terjadi pergantian status (misal: pemberitahuan sampel baru ke analis, pengumuman COA selesai ke klien).

### 16. Pelabelan Barcode / QR Code Botol Sampel (Sample Tracking)
* **Deskripsi**: Generate barcode/QR Code khusus saat COC dibuat untuk ditempel di botol/wadah sampel. Staf penerimaan lab cukup memindai barcode menggunakan kamera HP untuk mencatat sampel masuk dengan cepat.

---

## IV. Fitur Kemudahan Kerja (Micro-interactions)

### 17. Fitur Duplikat COC (Satu Klik untuk Klien Lama)
* **Cara Kerja**: Menambahkan tombol "Duplikat COC" di daftar COC. Jika diklik, sistem akan otomatis menyalin seluruh data identitas perusahaan, detail cerobong, dan parameter dari COC lama ke formulir baru. User hanya perlu mengganti tanggal rencana sampling dan nomor quotation baru.

### 18. Catatan Alasan Penolakan Analisa (Rework Log)
* **Cara Kerja**: Saat Manajer melakukan "Unverifikasi" hasil analisa, sistem memunculkan kotak dialog pengisian alasan penolakan. Catatan ini langsung tampil di modal analis untuk instruksi perbaikan penimbangan/analisis.

### 19. Filter Rentang Tanggal di Setiap Tabel (Date Range Filter)
* **Cara Kerja**: Menambahkan filter input kalender Tanggal Mulai dan Tanggal Selesai di bagian atas tabel daftar COC, Sampling, dan COA untuk membatasi tampilan data secara efisien.

### 20. Checklist Kondisi Fisik Sampel saat Penerimaan
* **Cara Kerja**: Formulir ceklis fisik wadah sampel saat diserahkan ke lab: *[x] Wadah Utuh & Segel Aman, [x] Suhu Wadah Sesuai, [x] Kertas Filter Bersih*.

### 21. Peringatan Sisa Batas Waktu Pengujian (TAT Countdown)
* **Cara Kerja**: Menampilkan lencana warna sisa waktu pengerjaan sampel berdasarkan tanggal registrasi dan batas penyelesaian (*Turn Around Time*).

### 22. Pengisian Data Cuaca Otomatis (Live Weather Auto-Fill)
* **Cara Kerja**: Tombol "Ambil Data Cuaca" memanggil API cuaca lokal berbasis posisi GPS HP petugas untuk mengisi kolom suhu ambien, kelembaban, dan catatan cuaca secara otomatis.

### 23. Unggah Foto Cerobong Langsung ke Google Drive
* **Cara Kerja**: Kolom upload foto di tab sampling lapangan terhubung dengan API Google Drive untuk menyimpan foto cerobong secara langsung sebagai bukti fisik autentik.

### 24. Detektor Tabrakan Edit Data (Real-time Presence Lock)
* **Cara Kerja**: Menggunakan Supabase Presence. Jika Analis A sedang membuka formulir Sampel X, tombol edit di komputer Analis B akan terkunci sementara dan menampilkan label: * sedang diedit oleh Analis A*.

### 25. Widget Kalkulator Konversi Terapung (Floating Unit Converter)
* **Cara Kerja**: Panel pop-up melayang di sudut layar untuk melakukan konversi cepat satuan (Celsius ke Kelvin, mmHg ke kPa, ppm ke mg/m³) sewaktu-waktu dibutuhkan.

### 26. Mode Gelap Premium (Dark Mode Toggle)
* **Cara Kerja**: Tombol sakelar di sidebar untuk mengubah UI aplikasi LIMS menjadi tema gelap dengan pencahayaan neon biru guna mengurangi ketegangan mata di malam hari.

### 27. Garis Waktu Aktivitas Berjalan (Live Activity Feed)
* **Cara Kerja**: Feed lini masa real-time di dashboard utama yang menampilkan aktivitas sistem (misalnya: *Siapa yang baru menginput data, Siapa yang memverifikasi COA*).
