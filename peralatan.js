// peralatan.js — Master Inventaris Peralatan Laboratorium (Form-ES-6.4.1 Rev.04)

// Data Awal Seed Inventaris 38 Item Sesuai Sampel PDF Resmi Form-ES-6.4.1 Rev.04
const INITIAL_SEED_PERALATAN = [
    { no_urut: '002.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/002.1', nama_alat: 'Heating Drying Oven', merek_brand: 'Ari Medical', type_model: 'DHG Series', no_seri: '25100078', rentang_akurasi: '10-200 °C', lokasi: 'Lab Utama', tgl_kalibrasi: '2026-06-26', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-26', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '003.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/003.1', nama_alat: 'Desikator', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Instrumen 1', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '004.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/004.1', nama_alat: 'Spektrofotometer Vis', merek_brand: 'UNICO', type_model: 'S-2150UV', no_seri: 'KA 25022211061', rentang_akurasi: '200 - 1000 nm', lokasi: 'R. Instrumen 2', tgl_kalibrasi: '2026-01-26', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-01-26', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '005.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/005.1', nama_alat: 'Lemari Asam', merek_brand: 'Lokal', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'Lab Utama', tgl_kalibrasi: '2026-06-26', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-26', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '006.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.1', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'R. Instrumen 1', tgl_kalibrasi: '2026-04-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-04-01', lembaga_kalibrasi: 'LK-106-IDN', kondisi: 'Baik' },
    { no_urut: '006.2', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.2', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'Lab Utama', tgl_kalibrasi: '2026-06-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-01', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '006.3', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.3', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'R. Office', tgl_kalibrasi: '2026-06-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-01', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '006.4', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.4', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'R. Instrumen 2', tgl_kalibrasi: '2026-06-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-01', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '006.5', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.5', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'Dry Box Filter 1', tgl_kalibrasi: '2026-04-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-04-01', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '006.6', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.6', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'Dry Box Filter 2', tgl_kalibrasi: '2026-04-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-04-01', lembaga_kalibrasi: 'LK-106-IDN', kondisi: 'Baik' },
    { no_urut: '006.7', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.7', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'HTC-1', no_seri: '-', rentang_akurasi: 'Suhu : 0~100°C; Kelembaban : 0~100 %', lokasi: 'Desikator', tgl_kalibrasi: '2026-04-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-04-01', lembaga_kalibrasi: 'LK-106-IDN', kondisi: 'Baik' },
    { no_urut: '006.8', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/006.8', nama_alat: 'Thermohygrometer', merek_brand: '-', type_model: 'DR Gray', no_seri: '-', rentang_akurasi: '-50 ~ +70°C', lokasi: 'Showcase Cooler', tgl_kalibrasi: '2026-03-01', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-03-01', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '007.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/007.1', nama_alat: 'Hot Plate', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '1 °C', lokasi: 'Lab Utama', tgl_kalibrasi: '2026-06-11', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-11', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '008.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/008.1', nama_alat: 'Gas Analyzer', merek_brand: 'Seitron', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '2026-04-03', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-04-03', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '009.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/009.1', nama_alat: 'Opasitas Ringleman', merek_brand: 'Fujis scope', type_model: 'OPIM-FS 102B', no_seri: '-', rentang_akurasi: '0~100%', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '010.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/010.1', nama_alat: 'Dry Box Filter', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '010.2', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/010.2', nama_alat: 'Dry Box Filter', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '011.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/011.1', nama_alat: 'Cooler Box', merek_brand: 'Lion star', type_model: '35s', no_seri: '-', rentang_akurasi: '35L', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '012.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/012.1', nama_alat: 'Jangka sorong', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '2026-01-07', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-01-07', lembaga_kalibrasi: 'LK-378-IDN', kondisi: 'Baik' },
    { no_urut: '013.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/013.1', nama_alat: 'Trolley', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '014.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/014.1', nama_alat: 'Neraca Teknis', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '0.01 gram', lokasi: 'R. Sampling', tgl_kalibrasi: '2026-01-26', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-01-26', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '015.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/015.1', nama_alat: 'Isokinetik Stack Sampler', merek_brand: 'Apex Instruments', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '2026-03-09', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-03-09', lembaga_kalibrasi: 'NC-27526-USA', kondisi: 'Baik' },
    { no_urut: '016.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/016.1', nama_alat: 'Isokinetik Stack Sampler', merek_brand: 'Polltech Instruments', type_model: 'PEM-SMK10-L', no_seri: '0825', rentang_akurasi: '0.02', lokasi: 'R. Sampling', tgl_kalibrasi: '2025-11-08', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2026-11-07', lembaga_kalibrasi: 'CC-4126', kondisi: 'Baik' },
    { no_urut: '017.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/017.1', nama_alat: 'Kabel Roll', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '017.2', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/017.2', nama_alat: 'Kabel Roll', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '017.3', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/017.3', nama_alat: 'Kabel Roll', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '018.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/018.1', nama_alat: 'Tripod', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '019.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/019.1', nama_alat: 'Tatakan', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '020.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/020.1', nama_alat: 'Banner Safety Bekerja diKetinggian', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '021.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/021.1', nama_alat: 'Stack Sampler Low Volume', merek_brand: 'Apex Instruments', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '2026-06-10', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2027-06-10', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '022.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/022.1', nama_alat: 'Tali 25 meter', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '023.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/023.1', nama_alat: 'Fylsheet 3x6', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '024.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/024.1', nama_alat: 'Katrol 1 ton', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '025.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/025.1', nama_alat: 'Terpal 2x4', merek_brand: '-', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '026.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/026.1', nama_alat: 'Gas Analyzer', merek_brand: 'MRU MGA PrimeQ', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '2026-01-05', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2026-04-15', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '009.3', yymm: '2001', no_inventaris: 'EQP/ES/2001/009.3', nama_alat: 'Timbangan Analitik Digital', merek_brand: 'AND', type_model: 'GH-252', no_seri: '15111635', rentang_akurasi: 'Max: 250 gr d: 0.0001 gr', lokasi: 'R. Instrumen 1', tgl_kalibrasi: '2025-06-25', periode_kalibrasi: '1 tahun', jadwal_kalibrasi: '2026-06-25', lembaga_kalibrasi: 'LK-361-IDN', kondisi: 'Baik' },
    { no_urut: '027.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/027.1', nama_alat: 'Panel listrik Portable', merek_brand: 'Lokal', type_model: '-', no_seri: '-', rentang_akurasi: '-', lokasi: 'R. Sampling', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' },
    { no_urut: '028.1', yymm: '2601', no_inventaris: 'EQP/ES/PL/2601/028.1', nama_alat: 'Showcase Cooler', merek_brand: 'STEKO', type_model: 'LG-300', no_seri: '0727LSP/QI/06.1-XI/2024', rentang_akurasi: '4 ~ 8°C', lokasi: 'Lab Utama', tgl_kalibrasi: '', periode_kalibrasi: '-', jadwal_kalibrasi: '', lembaga_kalibrasi: '-', kondisi: 'Baik' }
];

let peralatanList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Tanggal Cetak Form-ES-6.4.1
    const printDateToday = document.getElementById('printDateToday');
    if (printDateToday) {
        const today = new Date();
        printDateToday.innerText = today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    await fetchPeralatanData();
});

// Fetch Data Peralatan dari Supabase / LocalStorage Fallback
async function fetchPeralatanData() {
    try {
        if (typeof _supabase !== 'undefined') {
            let { data, error } = await _supabase.from('master_peralatan').select('*').order('no_urut', { ascending: true });
            
            if (!error && data && data.length > 0) {
                peralatanList = data;
                populateDatalistNamaAlat();
                renderTablePeralatan(peralatanList);
                updateStatsCards(peralatanList);
                return;
            }
        }
        
        console.log("Loading local storage or seed inventory...");
        const savedLocal = localStorage.getItem('master_peralatan_backup');
        if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            if (parsed.length >= INITIAL_SEED_PERALATAN.length) {
                peralatanList = parsed;
            } else {
                peralatanList = [...INITIAL_SEED_PERALATAN];
                localStorage.setItem('master_peralatan_backup', JSON.stringify(peralatanList));
            }
        } else {
            peralatanList = [...INITIAL_SEED_PERALATAN];
            localStorage.setItem('master_peralatan_backup', JSON.stringify(peralatanList));
        }
    } catch (err) {
        console.warn("Using local storage fallback for peralatan", err);
        const savedLocal = localStorage.getItem('master_peralatan_backup');
        peralatanList = savedLocal ? JSON.parse(savedLocal) : [...INITIAL_SEED_PERALATAN];
    }

    populateDatalistNamaAlat();
    renderTablePeralatan(peralatanList);
    updateStatsCards(peralatanList);
}

// Populate Auto-complete Datalist Nama Alat
function populateDatalistNamaAlat() {
    const listEl = document.getElementById('listNamaAlat');
    if (!listEl) return;

    const uniqueNames = [...new Set(peralatanList.map(p => p.nama_alat).filter(Boolean))].sort();
    listEl.innerHTML = uniqueNames.map(name => `<option value="${name}">`).join('');
}

// Fungsi Otomatis Penomoran Inventaris (misal Thermohygrometer 006.8 -> 006.9)
function autoGenerateNoInventaris() {
    // Hanya berjalan jika menambah baru (bukan mode edit)
    const editId = document.getElementById('editId').value;
    if (editId) return;

    const inputName = document.getElementById('inpNamaAlat').value.trim();
    if (!inputName) return;

    // Hitung Tahun & Bulan Saat Ini (contoh: 2607 untuk Juli 2026)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const currentYymm = `${yy}${mm}`;

    // Cari alat dengan Nama yang Sama (case-insensitive)
    const sameItems = peralatanList.filter(p => p.nama_alat && p.nama_alat.toLowerCase().trim() === inputName.toLowerCase());

    if (sameItems.length > 0) {
        // Ambil No Urut dasar dari item pertama (misal '006' dari '006.8')
        const firstNoUrut = sameItems[0].no_urut || '001.1';
        const basePrefix = firstNoUrut.split('.')[0]; // '006'

        // Cari sub-number tertinggi di antara item dengan basePrefix tersebut
        let maxSub = 0;
        peralatanList.forEach(p => {
            if (p.no_urut && p.no_urut.startsWith(basePrefix + '.')) {
                const subParts = p.no_urut.split('.');
                if (subParts.length > 1) {
                    const subVal = parseInt(subParts[1], 10);
                    if (!isNaN(subVal) && subVal > maxSub) maxSub = subVal;
                }
            }
        });

        const nextSub = maxSub + 1;
        const nextNoUrut = `${basePrefix}.${nextSub}`;
        const nextNoInv = `EQP/ES/PL/${currentYymm}/${nextNoUrut}`;

        document.getElementById('inpNoUrut').value = nextNoUrut;
        document.getElementById('inpYymm').value = currentYymm;
        document.getElementById('inpNoInventaris').value = nextNoInv;
    } else {
        // Jika Alat Baru (belum pernah ada di inventaris)
        let maxBase = 0;
        peralatanList.forEach(p => {
            if (p.no_urut) {
                const baseVal = parseInt(p.no_urut.split('.')[0], 10);
                if (!isNaN(baseVal) && baseVal > maxBase) maxBase = baseVal;
            }
        });

        const nextBase = String(maxBase + 1).padStart(3, '0');
        const nextNoUrut = `${nextBase}.1`;
        const nextNoInv = `EQP/ES/PL/${currentYymm}/${nextNoUrut}`;

        document.getElementById('inpNoUrut').value = nextNoUrut;
        document.getElementById('inpYymm').value = currentYymm;
        document.getElementById('inpNoInventaris').value = nextNoInv;
    }
}

// Render Tabel 14 Kolom Form-ES-6.4.1 Rev.04
function renderTablePeralatan(data) {
    const tbody = document.getElementById('tbodyPeralatan');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 25px; color: #94a3b8;">Tidak ada data peralatan ditemukan.</td></tr>`;
        return;
    }

    const today = new Date();

    tbody.innerHTML = data.map((item, idx) => {
        const tglKal = item.tgl_kalibrasi || item.tanggal_kalibrasi;
        const typeMod = item.type_model || item.type || '-';
        let periodeStr = item.periode_kalibrasi || '-';
        if (typeof periodeStr === 'number') {
            periodeStr = `${periodeStr} bulan`;
        }

        // Hitung Status Kalibrasi Badge & Highlight
        let kalibrasiBadge = `<span class="badge badge-gray">-</span>`;
        let rowClass = "";

        if (item.jadwal_kalibrasi) {
            const expDate = new Date(item.jadwal_kalibrasi);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                kalibrasiBadge = `<span class="badge badge-red">🔴 Expired (${formatDateIndo(item.jadwal_kalibrasi)})</span>`;
                rowClass = "style='background-color: #fef2f2;'";
            } else if (diffDays <= 30) {
                kalibrasiBadge = `<span class="badge badge-yellow">🟡 Warning (${formatDateIndo(item.jadwal_kalibrasi)})</span>`;
                rowClass = "style='background-color: #fefce8;'";
            } else {
                kalibrasiBadge = `<span class="badge badge-green">🟢 ${formatDateIndo(item.jadwal_kalibrasi)}</span>`;
            }
        }

        const kondisiBadge = item.kondisi === 'Baik' 
            ? `<span class="badge badge-green">Baik</span>` 
            : `<span class="badge badge-red">${item.kondisi || 'Baik'}</span>`;

        return `
            <tr ${rowClass}>
                <td style="font-weight: 700; text-align: center;">${item.no_urut || (idx + 1)}</td>
                <td style="text-align: center; color: #64748b;">${item.yymm || '-'}</td>
                <td style="font-weight: 700; color: #0f172a;">${item.no_inventaris || '-'}</td>
                <td style="font-weight: 600;">${item.nama_alat}</td>
                <td>${item.merek_brand || '-'}</td>
                <td>${typeMod}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${item.no_seri || '-'}</td>
                <td style="font-size: 0.78rem;">${item.rentang_akurasi || '-'}</td>
                <td><span class="badge badge-gray">${item.lokasi || '-'}</span></td>
                <td>${tglKal ? formatDateIndo(tglKal) : '-'}</td>
                <td>${periodeStr}</td>
                <td>${kalibrasiBadge}</td>
                <td>${item.lembaga_kalibrasi || '-'}</td>
                <td>${kondisiBadge}</td>
                <td class="action-col" style="text-align: center;">
                    <button onclick="openModalEdit('${item.id || item.no_inventaris}')" style="background: none; border: none; cursor: pointer; font-size: 0.95rem; margin-right: 6px;" title="Edit">✏️</button>
                    ${item.sertifikat_url ? `<a href="${item.sertifikat_url}" target="_blank" style="text-decoration: none;" title="Lihat Sertifikat">📄</a>` : ''}
                    <button onclick="deletePeralatan('${item.id || item.no_inventaris}')" style="background: none; border: none; cursor: pointer; font-size: 0.95rem;" title="Hapus">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper kalkulasi status kalibrasi item
function getItemCalibrationStatus(item) {
    const today = new Date();
    today.setHours(0,0,0,0);

    let isExpired = (item.kondisi === 'Perlu Kalibrasi' || item.kondisi === 'Expired');
    let isWarning = false;

    if (item.jadwal_kalibrasi) {
        const expDate = new Date(item.jadwal_kalibrasi);
        expDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            isExpired = true;
        } else if (diffDays <= 30) {
            isWarning = true;
        }
    }

    if (isExpired) return 'Expired';
    if (isWarning) return 'Warning';
    if (item.kondisi === 'Rusak' || item.kondisi === 'Dalam Perbaikan') return item.kondisi;
    return 'Baik';
}

// Update Stats Cards
function updateStatsCards(data) {
    let baik = 0;
    let warning = 0;
    let expired = 0;

    data.forEach(item => {
        const status = getItemCalibrationStatus(item);
        if (status === 'Expired') expired++;
        else if (status === 'Warning') warning++;
        else if (status === 'Baik') baik++;
    });

    document.getElementById('statTotalAlat').innerText = data.length;
    document.getElementById('statBaik').innerText = baik;
    document.getElementById('statWarningKalibrasi').innerText = warning;
    document.getElementById('statExpiredKalibrasi').innerText = expired;
}

// Filter Tabel berdasarkan Pencarian, Lokasi, dan Kondisi
function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const lok = document.getElementById('filterLokasi').value;
    const kon = document.getElementById('filterKondisi').value;

    const filtered = peralatanList.filter(item => {
        const matchQ = !q || 
            (item.nama_alat && item.nama_alat.toLowerCase().includes(q)) ||
            (item.no_inventaris && item.no_inventaris.toLowerCase().includes(q)) ||
            (item.merek_brand && item.merek_brand.toLowerCase().includes(q)) ||
            (item.no_seri && item.no_seri.toLowerCase().includes(q));

        const matchLok = !lok || item.lokasi === lok;

        let matchKon = true;
        if (kon) {
            const status = getItemCalibrationStatus(item);
            if (kon === 'Baik') {
                matchKon = (status === 'Baik');
            } else if (kon === 'Perlu Kalibrasi' || kon === 'Expired') {
                matchKon = (status === 'Expired');
            } else if (kon === 'Warning Kalibrasi') {
                matchKon = (status === 'Warning');
            } else {
                matchKon = (item.kondisi === kon || status === kon);
            }
        }

        return matchQ && matchLok && matchKon;
    });

    renderTablePeralatan(filtered);
}

// Modal Form Tambah & Edit
function openModalTambah() {
    document.getElementById('modalTitle').innerText = "Tambah Peralatan Baru";
    document.getElementById('editId').value = "";
    document.getElementById('formPeralatan').reset();
    populateDatalistNamaAlat();
    document.getElementById('modalPeralatan').style.display = "flex";
}

function openModalEdit(idKey) {
    const item = peralatanList.find(p => p.id === idKey || p.no_inventaris === idKey);
    if (!item) return;

    document.getElementById('modalTitle').innerText = "Edit Peralatan Inventaris";
    document.getElementById('editId').value = item.id || item.no_inventaris;
    document.getElementById('inpNoUrut').value = item.no_urut || "";
    document.getElementById('inpYymm').value = item.yymm || "";
    document.getElementById('inpNoInventaris').value = item.no_inventaris || "";
    document.getElementById('inpNamaAlat').value = item.nama_alat || "";
    document.getElementById('inpMerekBrand').value = item.merek_brand || "";
    document.getElementById('inpTypeModel').value = item.type_model || item.type || "";
    document.getElementById('inpNoSeri').value = item.no_seri || "";
    document.getElementById('inpRentangAkurasi').value = item.rentang_akurasi || "";
    document.getElementById('inpLokasi').value = item.lokasi || "R. Sampling";
    document.getElementById('inpKondisi').value = item.kondisi || "Baik";
    document.getElementById('inpTglKalibrasi').value = item.tgl_kalibrasi || item.tanggal_kalibrasi || "";
    document.getElementById('inpPeriodeKalibrasi').value = item.periode_kalibrasi || "1 tahun";
    document.getElementById('inpJadwalKalibrasi').value = item.jadwal_kalibrasi || "";
    document.getElementById('inpLembagaKalibrasi').value = item.lembaga_kalibrasi || "";
    document.getElementById('inpSertifikatUrl').value = item.sertifikat_url || "";

    document.getElementById('modalPeralatan').style.display = "flex";
}

function closeModalPeralatan() {
    document.getElementById('modalPeralatan').style.display = "none";
}

// Simpan Peralatan (Supabase / LocalStorage)
async function savePeralatan(e) {
    e.preventDefault();

    const editId = document.getElementById('editId').value;
    const newItem = {
        no_urut: document.getElementById('inpNoUrut').value,
        yymm: document.getElementById('inpYymm').value,
        no_inventaris: document.getElementById('inpNoInventaris').value,
        nama_alat: document.getElementById('inpNamaAlat').value,
        merek_brand: document.getElementById('inpMerekBrand').value,
        type_model: document.getElementById('inpTypeModel').value,
        no_seri: document.getElementById('inpNoSeri').value,
        rentang_akurasi: document.getElementById('inpRentangAkurasi').value,
        lokasi: document.getElementById('inpLokasi').value,
        kondisi: document.getElementById('inpKondisi').value,
        tgl_kalibrasi: document.getElementById('inpTglKalibrasi').value || null,
        periode_kalibrasi: document.getElementById('inpPeriodeKalibrasi').value || '1 tahun',
        jadwal_kalibrasi: document.getElementById('inpJadwalKalibrasi').value || null,
        lembaga_kalibrasi: document.getElementById('inpLembagaKalibrasi').value,
        sertifikat_url: document.getElementById('inpSertifikatUrl').value
    };

    try {
        if (typeof _supabase !== 'undefined') {
            if (editId) {
                await _supabase.from('master_peralatan').update(newItem).eq('no_inventaris', editId);
            } else {
                await _supabase.from('master_peralatan').insert([newItem]);
            }
        }
        if (editId) {
            const idx = peralatanList.findIndex(p => p.id === editId || p.no_inventaris === editId);
            if (idx !== -1) peralatanList[idx] = { ...peralatanList[idx], ...newItem };
        } else {
            peralatanList.push(newItem);
        }
    } catch (err) {
        console.warn("Supabase save error, fallback local storage", err);
        if (editId) {
            const idx = peralatanList.findIndex(p => p.id === editId || p.no_inventaris === editId);
            if (idx !== -1) peralatanList[idx] = { ...peralatanList[idx], ...newItem };
        } else {
            peralatanList.push(newItem);
        }
    }

    localStorage.setItem('master_peralatan_backup', JSON.stringify(peralatanList));
    closeModalPeralatan();
    renderTablePeralatan(peralatanList);
    updateStatsCards(peralatanList);
    alert("Data peralatan berhasil disimpan!");
}

// Hapus Peralatan
async function deletePeralatan(idKey) {
    if (!confirm("Apakah Anda yakin ingin menghapus data peralatan ini?")) return;

    try {
        if (typeof _supabase !== 'undefined') {
            await _supabase.from('master_peralatan').delete().eq('no_inventaris', idKey);
        }
    } catch (err) {
        console.warn("Supabase delete fallback", err);
    }

    peralatanList = peralatanList.filter(p => p.id !== idKey && p.no_inventaris !== idKey);
    localStorage.setItem('master_peralatan_backup', JSON.stringify(peralatanList));
    renderTablePeralatan(peralatanList);
    updateStatsCards(peralatanList);
}

// Ekspor ke Excel Form-ES-6.4.1
function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Library SheetJS (XLSX) belum dimuat.");
        return;
    }

    const excelData = peralatanList.map(item => ({
        "No.": item.no_urut,
        "YYMM": item.yymm,
        "Nomor Inventaris": item.no_inventaris,
        "Nama Alat": item.nama_alat,
        "Merek/Brand": item.merek_brand,
        "Type": item.type_model,
        "No. Seri": item.no_seri,
        "Rentang / Akurasi": item.rentang_akurasi,
        "Lokasi": item.lokasi,
        "Tanggal Kalibrasi": item.tgl_kalibrasi,
        "Periode": item.periode_kalibrasi,
        "Jadwal Kalibrasi": item.jadwal_kalibrasi,
        "Lembaga Kalibrasi": item.lembaga_kalibrasi,
        "Kondisi": item.kondisi
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Form-ES-6.4.1 Inventaris");
    XLSX.writeFile(wb, "Daftar_Inventaris_Alat_Laboratorium_Form-ES-6.4.1.xlsx");
}

// Utility Format Date Indo
function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
    }
    return dateStr;
}

// Upload PDF Sertifikat Langsung ke Google Drive via Supabase Edge Function
async function uploadFileToGoogleDrive(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${SB_URL}/functions/v1/upload-to-drive`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + SB_KEY
        },
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Respons server tidak berhasil.");
    }

    const result = await response.json();
    return {
        webViewLink: result.webViewLink
    };
}

async function handlePdfUploadToDrive(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('uploadPdfStatus');
    if (statusEl) {
        statusEl.innerText = '⏳ Mengunggah berkas PDF langsung ke Google Drive...';
        statusEl.style.display = 'block';
        statusEl.style.color = '#2563eb';
    }

    try {
        const result = await uploadFileToGoogleDrive(file);
        if (result && result.webViewLink) {
            document.getElementById('inpSertifikatUrl').value = result.webViewLink;
            if (statusEl) {
                statusEl.innerText = '✅ Berkas PDF berhasil diunggah & tersimpan di Google Drive!';
                statusEl.style.color = '#16a34a';
            }
        } else {
            throw new Error('Tautan file Google Drive tidak ditemukan.');
        }
    } catch (err) {
        console.error('Gagal upload ke Google Drive:', err);
        if (statusEl) {
            statusEl.innerText = '❌ Gagal mengunggah ke Google Drive: ' + err.message;
            statusEl.style.color = '#dc2626';
        }
    }
}
