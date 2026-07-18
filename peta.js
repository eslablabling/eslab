// peta.js — Logika Peta GIS Cerobong ESLab LIMS (#14)

let map = null;
let allMarkers = [];
let allCocData = [];
let masterEmisiData = [];

// ============================================================
// Inisialisasi Peta Leaflet
// ============================================================
function initMap() {
    map = L.map('map', {
        center: [-2.5, 117.0], // Tengah Indonesia
        zoom: 5,
        zoomControl: true,
    });

    // Tile layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// ============================================================
// Fetch data dari Supabase
// ============================================================
async function fetchPetaData() {
    try {
        // 1. Ambil master emisi untuk perbandingan baku mutu
        const { data: masterData } = await _supabase
            .from('master_emisi')
            .select('parameter, regulasi, baku_mutu');
        masterEmisiData = masterData || [];

        // 2. Ambil semua COC dengan sampel dan koordinat
        const { data: cocList, error } = await _supabase
            .from('coc_emisi')
            .select('id, nomor_coc, company_name, sampling_date, latitude, longitude, lokasi_kota, samples(id, sample_id, description, is_verified, status_lab, parameters, regulations)')
            .order('sampling_date', { ascending: false });

        if (error) throw error;

        allCocData = (cocList || []).filter(c => c.latitude && c.longitude);

        renderMarkers(allCocData);
        updateStatChips(cocList || []);

    } catch (err) {
        console.error('Gagal memuat data peta:', err);
    } finally {
        const loader = document.getElementById('mapLoader');
        if (loader) loader.style.display = 'none';
    }
}

// ============================================================
// Tentukan Status Kepatuhan COC
// ============================================================
function getCocComplianceStatus(coc) {
    const samples = coc.samples || [];
    if (samples.length === 0) return 'pending';

    const anyVerified = samples.some(s => s.is_verified === true || s.status_lab === 'verified' || s.status_lab === 'analyzed');
    if (!anyVerified) return 'pending';

    // Cek apakah ada parameter yang melebihi baku mutu
    let hasExceed = false;

    for (const sample of samples) {
        const params = sample.parameters || [];
        const regs = sample.regulations || [];

        for (const p of params) {
            const result = parseFloat(p.result || p.konsentrasi_1 || p.hasil_mg_nm3);
            if (isNaN(result)) continue;

            // Cari baku mutu di master
            const masterMatch = masterEmisiData.find(m => {
                const pm = (m.parameter || '').toLowerCase().trim();
                const pp = (p.parameter || '').toLowerCase().trim();
                const regsLower = regs.map(r => (r || '').toLowerCase().trim());
                return pm === pp && regsLower.includes((m.regulasi || '').toLowerCase().trim());
            });

            if (masterMatch && masterMatch.baku_mutu !== null) {
                const limit = parseFloat(masterMatch.baku_mutu);
                if (!isNaN(limit) && result > limit) {
                    hasExceed = true;
                    break;
                }
            }
        }
        if (hasExceed) break;
    }

    return hasExceed ? 'exceed' : 'comply';
}

// ============================================================
// Warna marker berdasarkan status
// ============================================================
const STATUS_COLOR = {
    comply:  '#16a34a',
    exceed:  '#dc2626',
    pending: '#d97706'
};

function createMarkerIcon(status) {
    const color = STATUS_COLOR[status] || '#94a3b8';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22s14-12.67 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
            <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
        </svg>
    `;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36]
    });
}

// ============================================================
// Render marker di peta
// ============================================================
function renderMarkers(cocList) {
    // Bersihkan marker lama
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];

    if (cocList.length === 0) return;

    const bounds = [];

    cocList.forEach(coc => {
        if (!coc.latitude || !coc.longitude) return;

        const status = getCocComplianceStatus(coc);
        const icon = createMarkerIcon(status);

        const marker = L.marker([coc.latitude, coc.longitude], { icon })
            .addTo(map)
            .on('click', () => bukaInfoPanel(coc, status));

        marker._cocData = coc;
        marker._status = status;
        allMarkers.push(marker);
        bounds.push([coc.latitude, coc.longitude]);
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
}

// ============================================================
// Panel Info Detail COC
// ============================================================
function bukaInfoPanel(coc, status) {
    const panel = document.getElementById('infoPanelCoc');
    const body  = document.getElementById('infoPanelBody');
    document.getElementById('infoNomorCoc').innerText = coc.nomor_coc || '-';
    document.getElementById('infoCompany').innerText  = coc.company_name || '-';

    const tglSampling = coc.sampling_date
        ? new Date(coc.sampling_date).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
        : '-';

    const statusLabel = {
        comply:  '<span class="badge-comply">✅ Memenuhi BM</span>',
        exceed:  '<span class="badge-exceed">⚠️ Melebihi BM</span>',
        pending: '<span class="badge-pending">⏳ Belum Diuji</span>',
    }[status] || '';

    const samples = coc.samples || [];
    const sampelRows = samples.map(s => `
        <div style="background:#f8fafc; border-radius:10px; padding:10px; margin-top:8px; font-size:0.75rem;">
            <div style="font-weight:800; color:var(--primary); margin-bottom:4px;">${s.sample_id} — ${s.description || ''}</div>
            <div style="color:var(--text-muted); font-weight:600;">Status: ${s.is_verified ? '🔒 Terverifikasi' : (s.status_lab === 'analyzed' ? '✅ Dianalisa' : '⏳ Pending')}</div>
        </div>
    `).join('');

    body.innerHTML = `
        <div class="info-row">
            <span class="info-label">Tanggal Sampling</span>
            <span class="info-value">${tglSampling}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Lokasi</span>
            <span class="info-value">${coc.lokasi_kota || `${coc.latitude?.toFixed(4)}, ${coc.longitude?.toFixed(4)}`}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Status Emisi</span>
            <span>${statusLabel}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Jumlah Cerobong</span>
            <span class="info-value">${samples.length} titik uji</span>
        </div>
        ${sampelRows}
        <div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">
            <a href="coc.html" style="flex:1; text-align:center; padding:8px; background:var(--primary); color:white; border-radius:10px; font-size:0.78rem; font-weight:800; text-decoration:none;">📋 Buka COC</a>
            <a href="edit-lokasi.html?id=${coc.id}" style="flex:1; text-align:center; padding:8px; background:#f1f5f9; color:var(--text-muted); border-radius:10px; font-size:0.78rem; font-weight:800; text-decoration:none;">📍 Edit Lokasi</a>
        </div>
    `;

    panel.classList.add('visible');
}

window.tutupInfoPanel = function() {
    document.getElementById('infoPanelCoc').classList.remove('visible');
};

// ============================================================
// Update statistik chip
// ============================================================
function updateStatChips(allCoc) {
    const withCoord  = allCoc.filter(c => c.latitude && c.longitude);
    const comply  = withCoord.filter(c => getCocComplianceStatus(c) === 'comply').length;
    const exceed  = withCoord.filter(c => getCocComplianceStatus(c) === 'exceed').length;
    const pending = withCoord.filter(c => getCocComplianceStatus(c) === 'pending').length;

    document.getElementById('statTotal').innerText   = `${allCoc.length} COC`;
    document.getElementById('statComply').innerText  = `${comply} Memenuhi`;
    document.getElementById('statExceed').innerText  = `${exceed} Melebihi`;
    document.getElementById('statPending').innerText = `${pending} Belum Diuji`;
}

// ============================================================
// Filter peta
// ============================================================
window.applyMapFilter = function() {
    const statusFilter  = document.getElementById('filterStatus')?.value  || 'all';
    const companyFilter = document.getElementById('filterCompany')?.value.toLowerCase().trim() || '';

    let filtered = allCocData;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(c => getCocComplianceStatus(c) === statusFilter);
    }
    if (companyFilter) {
        filtered = filtered.filter(c => (c.company_name || '').toLowerCase().includes(companyFilter));
    }

    renderMarkers(filtered);
};

// ============================================================
// Inisialisasi saat auth-ready
// ============================================================
window.addEventListener('auth-ready', async () => {
    initMap();
    await fetchPetaData();
});
