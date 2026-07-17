// dokumen.js

// 1. Inisialisasi State
let db = null;
let currentCategory = 'all';
let allDocuments = [];

const GOOGLE_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1ztYUlPERtgarjEuZPp1D_lAkzR54Ey62?usp=drive_link";

// 2. Setup IndexedDB
const DB_NAME = 'EslabDMS';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error: ", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("IndexedDB EslabDMS berhasil dibuka");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                console.log("Object store 'documents' berhasil dibuat");
            }
        };
    });
}

// 3. Data Seeding Default (Jika kosong)
const DEFAULT_SEED_DATA = [
    {
        title: "PermenLHK No. 11 Tahun 2021 - Baku Mutu Emisi",
        category: "regulasi",
        storageType: "drive",
        driveLink: "https://drive.google.com/file/d/1Buxb8oN87fHhD9zUjZ3L1P-8vR03N4uD/view?usp=sharing", // Tautan sampel
        fileName: "PermenLHK_P11_2021_Baku_Mutu.pdf",
        fileType: "pdf",
        description: "Regulasi baku mutu emisi mesin pembakaran dalam / genset laboratorium lingkungan.",
        uploadedBy: "Admin LIMS",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z"
    },
    {
        title: "SNI 7117.17:2009 - Penentuan Kadar Partikulat Secara Isokinetik",
        category: "metode",
        storageType: "drive",
        driveLink: GOOGLE_DRIVE_FOLDER,
        fileName: "SNI_7117.17-2009_Partikulat.pdf",
        fileType: "pdf",
        description: "Metode standar nasional Indonesia untuk pengujian partikulat cerobong emisi.",
        uploadedBy: "Manajer Teknis",
        createdAt: "2026-07-02T09:30:00.000Z",
        updatedAt: "2026-07-02T09:30:00.000Z"
    },
    {
        title: "Formulir Kalibrasi & Verifikasi Opasitas Lapangan",
        category: "verifikasi",
        storageType: "drive",
        driveLink: GOOGLE_DRIVE_FOLDER,
        fileName: "Form_Verifikasi_Opasitas.xlsx",
        fileType: "xlsx",
        description: "Template excel verifikasi alat uji opasitas sebelum dilakukan sampling emisi.",
        uploadedBy: "Koordinator Sampling",
        createdAt: "2026-07-10T14:20:00.000Z",
        updatedAt: "2026-07-10T14:20:00.000Z"
    },
    {
        title: "US EPA Method 5 - Determination of Particulate Matter",
        category: "metode",
        storageType: "drive",
        driveLink: GOOGLE_DRIVE_FOLDER,
        fileName: "US_EPA_Method_5.pdf",
        fileType: "pdf",
        description: "Metode internasional rujukan EPA untuk penentuan partikulat dari sumber stasioner.",
        uploadedBy: "Admin LIMS",
        createdAt: "2026-07-12T10:15:00.000Z",
        updatedAt: "2026-07-12T10:15:00.000Z"
    },
    {
        title: "Template Laporan Hasil Analisis (LHA) Emisi Cerobong",
        category: "template",
        storageType: "drive",
        driveLink: GOOGLE_DRIVE_FOLDER,
        fileName: "Template_LHA_Emisi_V1.docx",
        fileType: "docx",
        description: "Format word baku pembuatan laporan analisa laboratorium untuk parameter emisi.",
        uploadedBy: "Manajer Mutu",
        createdAt: "2026-07-15T11:00:00.000Z",
        updatedAt: "2026-07-15T11:00:00.000Z"
    },
    {
        title: "Checklist Verifikasi Data Lapangan Cerobong",
        category: "verifikasi",
        storageType: "drive",
        driveLink: GOOGLE_DRIVE_FOLDER,
        fileName: "Checklist_Verifikasi_Lapangan.xlsx",
        fileType: "xlsx",
        description: "Formulir checklist kualitas sampling lapangan pasca pengujian cerobong.",
        uploadedBy: "Koordinator Sampling",
        createdAt: "2026-07-16T08:00:00.000Z",
        updatedAt: "2026-07-16T08:00:00.000Z"
    }
];

async function seedDatabaseIfEmpty() {
    const docs = await getAllDocsFromDB();
    if (docs.length === 0) {
        console.log("Database DMS kosong, melakukan seeding data default...");
        for (const doc of DEFAULT_SEED_DATA) {
            await addDocToDB(doc);
        }
        console.log("Seeding data selesai");
    }
}

// 4. Operasi Database (IndexedDB Promises)
function getAllDocsFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function addDocToDB(doc) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(doc);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function updateDocInDB(doc) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(doc);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function deleteDocFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = (event) => {
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 5. Setup UI & Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Tunggu inisialisasi IndexedDB
        await openDatabase();
        await seedDatabaseIfEmpty();
        await loadDocuments();

        // Cari Input
        const searchDoc = document.getElementById('searchDoc');
        if (searchDoc) {
            searchDoc.addEventListener('input', (e) => {
                renderDocuments(e.target.value.toLowerCase().trim());
            });
        }

        // Bind Auto Fill Judul saat Berkas Lokal dipilih
        const localFileEl = document.getElementById('localFile');
        if (localFileEl) {
            localFileEl.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const titleEl = document.getElementById('title');
                    if (titleEl && !titleEl.value) {
                        titleEl.value = file.name.replace(/\.[^/.]+$/, "");
                    }
                }
            });
        }

        // Tampilkan tanggal hari ini jika element exist (jika renderSidebar telat)
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.innerText = new Date().toLocaleDateString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // Catatan: Inisialisasi API Google dihilangkan karena proses unggah & sinkronisasi
        // sekarang diproses di cloud secara aman melalui Supabase Edge Functions.
    } catch (e) {
        console.error("Gagal inisialisasi modul Dokumen:", e);
        showToast("Gagal memuat database dokumen: " + e.message, false);
    }
});

// Memuat data dari DB ke state dan me-render
async function loadDocuments() {
    allDocuments = await getAllDocsFromDB();
    // Sort descending berdasarkan tanggal update terbaru
    allDocuments.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    updateStats();
    renderDocuments();
}

// Mengupdate Kartu Statistik
function updateStats() {
    document.getElementById('statTotal').innerText = allDocuments.length;
    
    const regulasi = allDocuments.filter(d => d.category === 'regulasi').length;
    const metodeVerif = allDocuments.filter(d => d.category === 'metode' || d.category === 'verifikasi').length;
    const template = allDocuments.filter(d => d.category === 'template').length;

    document.getElementById('statRegulasi').innerText = regulasi;
    document.getElementById('statMetodeVerif').innerText = metodeVerif;
    document.getElementById('statTemplate').innerText = template;
}

// Render dokumen ke tabel HTML
function renderDocuments(keyword = '') {
    const tableBody = document.getElementById('docTableBody');
    if (!tableBody) return;

    // Filter kategori & pencarian kata kunci
    const filteredDocs = allDocuments.filter(doc => {
        const matchesCategory = (currentCategory === 'all' || doc.category === currentCategory);
        const matchesKeyword = !keyword || 
            doc.title.toLowerCase().includes(keyword) || 
            (doc.fileName && doc.fileName.toLowerCase().includes(keyword)) ||
            (doc.description && doc.description.toLowerCase().includes(keyword)) ||
            (doc.uploadedBy && doc.uploadedBy.toLowerCase().includes(keyword));
        return matchesCategory && matchesKeyword;
    });

    if (filteredDocs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <h3>Tidak ada dokumen ditemukan</h3>
                        <p>Belum ada file terdaftar dalam kategori ini atau hasil pencarian kosong.</p>
                    </div>
                </td>
            </div>
        `;
        return;
    }

    let rowsHtml = '';
    filteredDocs.forEach(doc => {
        // Tentukan ikon berdasarkan fileType
        let iconClass = 'icon-other';
        let emoji = '📄';
        switch (doc.fileType) {
            case 'pdf':
                iconClass = 'icon-pdf';
                emoji = '📕';
                break;
            case 'xlsx':
            case 'xls':
                iconClass = 'icon-xlsx';
                emoji = '🟢';
                break;
            case 'docx':
            case 'doc':
                iconClass = 'icon-docx';
                emoji = '📘';
                break;
            case 'pptx':
            case 'ppt':
                iconClass = 'icon-pptx';
                emoji = '📙';
                break;
        }

        // Format tanggal unggah
        const tglUnggah = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('id-ID') : '-';
        
        // Deskripsi ringkas
        const descText = doc.description || '-';
        const displayFileName = doc.fileName ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 500;">📁 ${doc.fileName}</div>` : '';

        // Tautan Drive Utama
        const mainUrl = doc.driveLink || GOOGLE_DRIVE_FOLDER;
        const escapedTitle = (doc.title || '').replace(/'/g, "\\'");
        
        rowsHtml += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center;">
                        <span class="doc-icon ${iconClass}">${emoji}</span>
                        <div>
                            <a href="javascript:void(0)" onclick="previewDoc('${mainUrl}', '${escapedTitle}')" style="font-weight: 700; color: #0f172a; text-decoration: none; display: block;" class="doc-title-link">
                                ${doc.title}
                            </a>
                            ${displayFileName}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge-cat badge-${doc.category}">
                        ${getCategoryLabel(doc.category)}
                    </span>
                </td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${descText}">
                    ${descText}
                </td>
                <td style="font-weight: 600;">${doc.uploadedBy || 'Staf Lab'}</td>
                <td>${tglUnggah}</td>
                <td>
                    <div class="action-btn-group" style="justify-content: center;">
                        <button onclick="previewDoc('${mainUrl}', '${escapedTitle}')" class="table-action-btn btn-view-drive" title="Lihat Pratinjau Dokumen">
                            🔗
                        </button>
                        <button onclick="copyDocLink('${mainUrl}')" class="table-action-btn" title="Salin Tautan" style="color: #64748b;">
                            📋
                        </button>
                        <button onclick="editDoc(${doc.id})" class="table-action-btn btn-edit" title="Edit Dokumen">
                            📝
                        </button>
                        <button onclick="deleteDoc(${doc.id})" class="table-action-btn btn-delete" title="Hapus">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
}

function getCategoryLabel(category) {
    switch (category) {
        case 'regulasi': return 'Regulasi';
        case 'metode': return 'Metode Uji';
        case 'verifikasi': return 'Verifikasi';
        case 'template': return 'Template';
        default: return 'Lainnya';
    }
}

// 6. Filter Kategori Tab
function filterCategory(category) {
    currentCategory = category;
    
    // Update active tab styles
    const tabs = document.querySelectorAll('#categoryTabs .tab-btn');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Cari tab yang diklik dan jadikan active
    event.currentTarget.classList.add('active');

    // Kosongkan keyword pencarian saat ganti tab agar mulus
    const searchDoc = document.getElementById('searchDoc');
    if (searchDoc) searchDoc.value = '';

    renderDocuments();
}

// 7. Kontrol Modal Tambah/Edit
window.openDocModal = function() {
    document.getElementById('modalTitle').innerText = "➕ Tambah Dokumen Baru";
    document.getElementById('formDoc').reset();
    document.getElementById('docId').value = '';
    
    const localFileEl = document.getElementById('localFile');
    if (localFileEl) {
        localFileEl.value = '';
        localFileEl.required = true;
    }
    
    document.getElementById('modalDoc').style.display = 'flex';
};

window.closeDocModal = function() {
    document.getElementById('modalDoc').style.display = 'none';
};

window.closeDocModalOuter = function(event) {
    if (event.target.id === 'modalDoc') {
        closeDocModal();
    }
};

// 8. Logika CRUD Dokumen dengan Unggah Otomatis ke Google Drive
window.saveDoc = async function(event) {
    event.preventDefault();

    const idVal = document.getElementById('docId').value;
    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    let driveLink = document.getElementById('driveLink').value.trim();
    const description = document.getElementById('description').value.trim();

    const localFileEl = document.getElementById('localFile');
    const localFile = localFileEl ? localFileEl.files[0] : null;

    if (!idVal && !localFile) {
        alert("Silakan pilih file lokal yang ingin diunggah!");
        return;
    }

    // Dapatkan nama user saat ini untuk 'uploadedBy'
    const userFullNameEl = document.getElementById('userFullName');
    const uploader = userFullNameEl ? userFullNameEl.innerText : 'Staf Lab';

    const progressEl = document.getElementById('uploadProgress');

    // Jika ada file lokal yang dipilih, unggah ke Google Drive terlebih dahulu
    if (localFile) {
        if (progressEl) progressEl.style.display = 'flex';
        try {
            const uploadRes = await uploadFileToGoogleDrive(localFile);
            driveLink = uploadRes.webViewLink;
        } catch (uploadErr) {
            console.error(uploadErr);
            if (progressEl) progressEl.style.display = 'none';
            alert("Gagal mengunggah file ke Google Drive:\n" + uploadErr.message);
            return;
        }
        if (progressEl) progressEl.style.display = 'none';
    }

    let fileType = 'other';
    let fileName = '';

    if (localFile) {
        fileName = localFile.name;
        const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        
        if (ext === 'pdf') fileType = 'pdf';
        else if (['xlsx', 'xls'].includes(ext)) fileType = 'xlsx';
        else if (['docx', 'doc'].includes(ext)) fileType = 'docx';
        else if (['pptx', 'ppt'].includes(ext)) fileType = 'pptx';
    } else {
        const lowerUrl = driveLink.toLowerCase();
        if (lowerUrl.includes('.pdf')) fileType = 'pdf';
        else if (lowerUrl.includes('.xlsx') || lowerUrl.includes('.xls') || lowerUrl.includes('spreadsheets')) fileType = 'xlsx';
        else if (lowerUrl.includes('.docx') || lowerUrl.includes('.doc') || lowerUrl.includes('document')) fileType = 'docx';
        else if (lowerUrl.includes('.pptx') || lowerUrl.includes('.ppt') || lowerUrl.includes('presentation')) fileType = 'pptx';
        
        fileName = driveLink ? driveLink.substring(driveLink.lastIndexOf('/') + 1).split('?')[0] : '';
        if (!fileName || fileName.length > 50) fileName = "Berkas Google Drive";
    }

    try {
        const timestamp = new Date().toISOString();

        if (idVal) {
            // Mode EDIT: Ambil data lama dulu
            const docId = parseInt(idVal);
            const existingDocs = await getAllDocsFromDB();
            const oldDoc = existingDocs.find(d => d.id === docId);

            if (!oldDoc) throw new Error("Dokumen tidak ditemukan!");

            const updatedDoc = {
                ...oldDoc,
                title,
                category,
                storageType: 'drive',
                driveLink: driveLink || GOOGLE_DRIVE_FOLDER,
                fileType,
                fileName,
                description,
                updatedAt: timestamp
            };

            await updateDocInDB(updatedDoc);
            showToast("Dokumen berhasil diperbarui!");
        } else {
            // Mode TAMBAH BARU
            const newDoc = {
                title,
                category,
                storageType: 'drive',
                driveLink: driveLink || GOOGLE_DRIVE_FOLDER,
                fileType,
                fileName,
                description,
                uploadedBy: uploader,
                createdAt: timestamp,
                updatedAt: timestamp
            };

            await addDocToDB(newDoc);
            showToast("Dokumen baru berhasil disimpan!");
        }

        closeDocModal();
        await loadDocuments();

    } catch (err) {
        console.error("Gagal menyimpan dokumen:", err);
        showToast("Gagal menyimpan dokumen: " + err.message, false);
    }
};

// Fungsi Edit Detail Dokumen
window.editDoc = async function(id) {
    try {
        const docs = await getAllDocsFromDB();
        const doc = docs.find(d => d.id === id);

        if (!doc) {
            alert("Dokumen tidak ditemukan!");
            return;
        }

        document.getElementById('modalTitle').innerText = "📝 Edit Detail Dokumen";
        document.getElementById('docId').value = doc.id;
        document.getElementById('title').value = doc.title;
        document.getElementById('category').value = doc.category;
        document.getElementById('driveLink').value = doc.driveLink === GOOGLE_DRIVE_FOLDER ? '' : (doc.driveLink || '');
        document.getElementById('description').value = doc.description || '';

        const localFileEl = document.getElementById('localFile');
        if (localFileEl) {
            localFileEl.value = '';
            localFileEl.required = false; // Opsional saat edit
        }

        document.getElementById('modalDoc').style.display = 'flex';

    } catch (err) {
        console.error("Gagal memuat form edit:", err);
        showToast("Error: " + err.message, false);
    }
};

// Fungsi Hapus Dokumen
window.deleteDoc = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini dari sistem?")) {
        try {
            await deleteDocFromDB(id);
            showToast("Dokumen berhasil dihapus!");
            await loadDocuments();
        } catch (err) {
            console.error("Gagal menghapus dokumen:", err);
            showToast("Gagal menghapus: " + err.message, false);
        }
    }
};

// Menyalin Link ke Clipboard
window.copyDocLink = function(linkKey) {
    const copyText = linkKey || GOOGLE_DRIVE_FOLDER;

    navigator.clipboard.writeText(copyText).then(() => {
        showToast("Tautan dokumen disalin ke clipboard!");
    }).catch(err => {
        console.error("Gagal menyalin link:", err);
        showToast("Gagal menyalin tautan", false);
    });
};

// 9. Floating Toast Helper
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastText = document.getElementById('toastText');

    if (!toast) return;

    toastIcon.innerText = isSuccess ? "✅" : "❌";
    toastText.innerText = message;
    
    toast.style.background = isSuccess ? "#0f172a" : "#dc2626";

    toast.classList.add('show');

    // Hilangkan toast setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- PREVIEW MODAL LOGIC (Pratinjau Langsung di Web LIMS) ---
function getGoogleDrivePreviewUrl(url) {
    if (!url) return '';
    
    // Jika ini adalah Google Docs/Sheets/Slides asli (bisa diedit langsung di dalam LIMS jika memiliki akses)
    if (url.includes('docs.google.com/document') || 
        url.includes('docs.google.com/spreadsheets') || 
        url.includes('docs.google.com/presentation')) {
        
        // rm=minimal menyembunyikan menu bar Google agar menyatu bersih dengan tampilan LIMS
        if (url.includes('/edit')) {
            return url.includes('?') ? `${url}&rm=minimal` : `${url}?rm=minimal`;
        }
        return url;
    }
    
    let fileId = '';
    
    // Cocokkan pola link file standar Google Drive: /file/d/[ID]/...
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
        fileId = fileMatch[1];
    } else {
        // Cocokkan pola query param: ?id=[ID]
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            fileId = idMatch[1];
        }
    }
    
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url; // Fallback ke url asli jika bukan link file drive standar
}

window.previewDoc = function(driveLink, title) {
    const modal = document.getElementById('modalPreview');
    const iframe = document.getElementById('previewIframe');
    const previewTitle = document.getElementById('previewTitle');
    const btnOpenExternal = document.getElementById('btnOpenExternal');
    const loader = document.getElementById('previewLoader');

    if (!modal || !iframe) return;

    previewTitle.innerText = `👁️ Pratinjau: ${title}`;
    btnOpenExternal.href = driveLink;
    
    const previewUrl = getGoogleDrivePreviewUrl(driveLink);
    
    // Tampilkan loader & pasang source iframe
    loader.style.display = 'flex';
    iframe.src = previewUrl;
    
    modal.style.display = 'flex';
};

window.closePreviewModal = function() {
    const modal = document.getElementById('modalPreview');
    const iframe = document.getElementById('previewIframe');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = ''; // Bersihkan source agar menghentikan loading/buffering
};

window.closePreviewModalOuter = function(event) {
    if (event.target.id === 'modalPreview') {
        window.closePreviewModal();
    }
};

// --- SYNC ALL LIMS DOCUMENTS WITH ACTUAL GOOGLE DRIVE FILES ---
async function syncDocumentsWithDrive() {
    showToast("Menghubungkan ke Google Drive via Supabase Helper...", true);
    try {
        // Panggil Supabase Edge Function untuk mendapatkan daftar file dari Google Drive
        const response = await fetch(`${SB_URL}/functions/v1/upload-to-drive`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'list' })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Gagal mendapatkan daftar file.");
        }

        const data = await response.json();
        const driveFiles = data.files || [];
        if (driveFiles.length === 0) {
            alert(`Tidak ada berkas yang ditemukan di folder Google Drive. Pastikan berkas-berkas tersebut sudah diunggah ke folder Drive Anda.`);
            return;
        }

        console.log("Berkas Google Drive ditemukan:", driveFiles);

        // Ambil semua dokumen dari IndexedDB lokal
        const docs = await getAllDocsFromDB();
        let updatedCount = 0;

        for (let doc of docs) {
            // Cari kecocokan file berdasarkan nama berkas di drive (case-insensitive)
            const match = driveFiles.find(df => df.name.toLowerCase().trim() === (doc.fileName || '').toLowerCase().trim());
            if (match) {
                doc.driveLink = match.webViewLink;
                doc.updatedAt = new Date().toISOString();
                await updateDocInDB(doc);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            showToast(`Sinkronisasi berhasil! ${updatedCount} berkas terhubung ke Google Drive.`, true);
            await loadDocuments();
        } else {
            alert("Sinkronisasi selesai. Tidak ada nama file dokumen LIMS saat ini yang cocok dengan nama file di folder Google Drive.");
        }

    } catch (err) {
        console.error("Error saat sinkronisasi:", err);
        alert("Gagal melakukan sinkronisasi dengan Google Drive: " + err.message);
    }
}

// --- FUNGSI UNGGAL BERKAS LOKAL LANGSUNG KE GOOGLE DRIVE ---
async function uploadFileToGoogleDrive(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Panggil Edge Function Supabase Anda secara langsung
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

window.syncDocumentsWithDrive = syncDocumentsWithDrive;
