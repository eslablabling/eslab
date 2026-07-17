// dokumen.js

// 1. Inisialisasi State
let db = null;
let currentCategory = 'all';
let allDocuments = [];
let allCategories = [];

const GOOGLE_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1ztYUlPERtgarjEuZPp1D_lAkzR54Ey62?usp=drive_link";

// 2. Setup IndexedDB
const DB_NAME = 'EslabDMS';
const DB_VERSION = 2;
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
            if (!dbInstance.objectStoreNames.contains('categories')) {
                dbInstance.createObjectStore('categories', { keyPath: 'id' });
                console.log("Object store 'categories' berhasil dibuat");
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

// 4b. Operasi Database Kategori (IndexedDB)
function getAllCategoriesFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function addCategoryToDB(cat) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.add(cat);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function updateCategoryInDB(cat) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.put(cat);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function deleteCategoryFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.delete(id);

        request.onsuccess = (event) => {
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

const DEFAULT_CATEGORIES = [
    { id: 'regulasi', name: 'Regulasi & Hukum' },
    { id: 'metode', name: 'Metode Uji' },
    { id: 'verifikasi', name: 'Verifikasi & Laporan' },
    { id: 'template', name: 'Template File' },
    { id: 'lainnya', name: 'Lainnya' }
];

async function seedCategoriesIfEmpty() {
    const cats = await getAllCategoriesFromDB();
    if (cats.length === 0) {
        console.log("Database kategori kosong, melakukan seeding default...");
        for (const cat of DEFAULT_CATEGORIES) {
            await addCategoryToDB(cat);
        }
        console.log("Seeding kategori selesai");
    }
}

// 5. Setup UI & Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Tunggu inisialisasi IndexedDB
        await openDatabase();
        await seedDatabaseIfEmpty();
        await seedCategoriesIfEmpty();
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

        // Tunggu event auth-ready untuk me-render tombol berdasarkan hak akses yang tepat
        window.addEventListener('auth-ready', () => {
            renderDocuments();
        });

        // Catatan: Inisialisasi API Google dihilangkan karena proses unggah & sinkronisasi
        // sekarang diproses di cloud secara aman melalui Supabase Edge Functions.
    } catch (e) {
        console.error("Gagal inisialisasi modul Dokumen:", e);
        showToast("Gagal memuat database dokumen: " + e.message, false);
    }
});

// Render Tab Kategori secara Dinamis dari DB Kategori
async function renderCategoryTabs() {
    const tabGroup = document.getElementById('categoryTabs');
    if (!tabGroup) return;

    let html = `<button class="tab-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">Semua</button>`;
    allCategories.forEach(cat => {
        html += `<button class="tab-btn ${currentCategory === cat.id ? 'active' : ''}" onclick="filterCategory('${cat.id}')">${cat.name}</button>`;
    });

    // Tambahkan tombol Kelola Kategori di ujung kanan jika user adalah admin_master
    const userRole = sessionStorage.getItem('user_role') || 'sampling';
    const isAdmin = (userRole === 'admin_master');
    if (isAdmin) {
        html += `
            <button class="btn-outline" onclick="openCategoryModal()" style="margin-left: auto; padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; font-weight: 700; border-color: #cbd5e1; cursor: pointer;">
                ⚙️ Kelola Kategori
            </button>
        `;
    }

    tabGroup.innerHTML = html;
}

// Mengisi Dropdown Pilihan Kategori di Form Dokumen secara Dinamis
function populateCategoryDropdown() {
    const select = document.getElementById('category');
    if (!select) return;

    select.innerHTML = allCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

// Memuat data dari DB ke state dan me-render
async function loadDocuments() {
    allDocuments = await getAllDocsFromDB();
    allCategories = await getAllCategoriesFromDB();
    // Sort descending berdasarkan tanggal update terbaru
    allDocuments.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    await renderCategoryTabs();
    await populateCategoryDropdown();
    updateStats();
    renderDocuments();

    // Jalankan auto-sync background secara senyap setelah loading pertama selesai
    performDriveSync(true);
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

    // Ambil role user dari sessionStorage untuk pengecekan hak akses (Semua bisa tambah & edit, hapus hanya admin_master & manager)
    const userRole = sessionStorage.getItem('user_role') || 'sampling';
    const canDelete = ['admin_master', 'manager'].includes(userRole);

    const btnTambah = document.getElementById('btnTambahDokumen');
    if (btnTambah) {
        btnTambah.style.display = 'inline-block'; // Semua role bisa tambah dokumen
    }

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
        // Tentukan ikon berdasarkan category dokumen
        let iconClass = 'icon-lainnya';
        let emoji = '📄';
        switch (doc.category) {
            case 'regulasi':
                iconClass = 'icon-regulasi';
                emoji = '📕';
                break;
            case 'metode':
                iconClass = 'icon-metode';
                emoji = '🧪';
                break;
            case 'verifikasi':
                iconClass = 'icon-verifikasi';
                emoji = '📋';
                break;
            case 'template':
                iconClass = 'icon-template';
                emoji = '📂';
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
                        ${canDelete ? `
                            <button onclick="deleteDoc(${doc.id})" class="table-action-btn btn-delete" title="Hapus">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
}

function getCategoryLabel(categoryId) {
    const cat = allCategories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
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
                fileType: localFile ? fileType : oldDoc.fileType,
                fileName: localFile ? fileName : oldDoc.fileName,
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
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini dari sistem LIMS dan Google Drive?")) {
        try {
            // 1. Ambil data dokumen dari DB untuk mendapatkan driveLink-nya
            const docs = await getAllDocsFromDB();
            const doc = docs.find(d => d.id === id);
            
            if (doc && doc.driveLink && doc.driveLink !== GOOGLE_DRIVE_FOLDER) {
                // Ekstrak file ID dari Google Drive link
                const match = doc.driveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                const fileId = match ? match[1] : null;
                
                if (fileId) {
                    showToast("Menghapus berkas dari Google Drive...", true);
                    // Panggil Supabase Edge Function untuk memindahkan file ke trash di Google Drive
                    const response = await fetch(`${SB_URL}/functions/v1/upload-to-drive`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + SB_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'delete', fileId })
                    });
                    
                    if (!response.ok) {
                        const errText = await response.text();
                        console.warn("Berkas di Drive gagal dihapus (mungkin sudah terhapus manual):", errText);
                    }
                }
            }

            // 2. Hapus dari database lokal (IndexedDB)
            await deleteDocFromDB(id);
            showToast("Dokumen berhasil dihapus dari LIMS dan Google Drive!");
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

// Helper untuk mengekstrak File ID Google Drive dari url
function extractFileId(url) {
    if (!url) return null;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
    return null;
}

// --- SYNC ALL LIMS DOCUMENTS WITH ACTUAL GOOGLE DRIVE FILES ---
async function performDriveSync(silent = false) {
    if (!silent) showToast("Menghubungkan ke Google Drive via Supabase Helper...", true);
    try {
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
            if (!silent) alert(`Tidak ada berkas yang ditemukan di folder Google Drive. Pastikan berkas-berkas tersebut sudah diunggah ke folder Drive Anda.`);
            return;
        }

        console.log("Berkas Google Drive ditemukan:", driveFiles);

        const docs = await getAllDocsFromDB();
        let updatedCount = 0;
        let importedCount = 0;
        let deletedCount = 0;
        let changed = false;

        // 1. Sinkronisasi berkas LIMS lokal yang cocok dengan file di Drive (berdasarkan file ID atau nama file)
        for (let doc of docs) {
            const localId = extractFileId(doc.driveLink);
            const match = driveFiles.find(df => {
                const driveId = df.id;
                const nameMatch = (doc.fileName || '').toLowerCase().trim() === df.name.toLowerCase().trim();
                return (localId && driveId && localId === driveId) || nameMatch;
            });

            if (match) {
                let docChanged = false;
                if (doc.driveLink !== match.webViewLink) {
                    doc.driveLink = match.webViewLink;
                    docChanged = true;
                }
                if (doc.fileName !== match.name) {
                    doc.fileName = match.name;
                    docChanged = true;
                }
                if (docChanged) {
                    doc.updatedAt = new Date().toISOString();
                    await updateDocInDB(doc);
                    updatedCount++;
                    changed = true;
                }
            }
        }

        // 2. Cari file di Drive yang BELUM terdaftar di LIMS lokal, lalu impor otomatis
        for (let df of driveFiles) {
            const isRegistered = docs.some(doc => {
                const localId = extractFileId(doc.driveLink);
                const driveId = df.id;
                const nameMatch = (doc.fileName || '').toLowerCase().trim() === df.name.toLowerCase().trim();
                return (localId && driveId && localId === driveId) || nameMatch;
            });

            if (!isRegistered) {
                const extMatch = df.name.match(/\.([a-zA-Z0-9]+)$/);
                const ext = extMatch ? extMatch[1].toLowerCase() : '';
                let fileType = 'other';
                if (ext === 'pdf') fileType = 'pdf';
                else if (['xlsx', 'xls'].includes(ext)) fileType = 'xlsx';
                else if (['docx', 'doc'].includes(ext)) fileType = 'docx';
                else if (['pptx', 'ppt'].includes(ext)) fileType = 'pptx';

                let title = df.name.replace(/\.[a-zA-Z0-9]+$/, "");
                
                let category = 'lainnya';
                const lowerName = df.name.toLowerCase();
                if (lowerName.includes('regulasi') || lowerName.includes('hukum') || lowerName.includes('permen')) category = 'regulasi';
                else if (lowerName.includes('metode') || lowerName.includes('sop') || lowerName.includes('uji')) category = 'metode';
                else if (lowerName.includes('verifikasi') || lowerName.includes('laporan') || lowerName.includes('lha')) category = 'verifikasi';
                else if (lowerName.includes('template') || lowerName.includes('form')) category = 'template';

                const newDoc = {
                    title: title,
                    category: category,
                    storageType: 'drive',
                    driveLink: df.webViewLink,
                    fileType: fileType,
                    fileName: df.name,
                    description: "Diimpor otomatis dari Google Drive saat sinkronisasi.",
                    uploadedBy: "Google Drive Sync",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await addDocToDB(newDoc);
                importedCount++;
                changed = true;
            }
        }

        // 3. Hapus berkas LIMS lokal yang sudah tidak ada di Google Drive
        for (let doc of docs) {
            if (doc.driveLink && doc.driveLink !== GOOGLE_DRIVE_FOLDER && doc.fileName) {
                const localId = extractFileId(doc.driveLink);
                const stillExists = driveFiles.some(df => {
                    const driveId = df.id;
                    const nameMatch = doc.fileName.toLowerCase().trim() === df.name.toLowerCase().trim();
                    return (localId && driveId && localId === driveId) || nameMatch;
                });

                if (!stillExists) {
                    await deleteDocFromDB(doc.id);
                    deletedCount++;
                    changed = true;
                }
            }
        }

        if (changed) {
            allDocuments = await getAllDocsFromDB();
            allDocuments.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
            updateStats();
            renderDocuments();
        }

        if (!silent) {
            if (updatedCount > 0 || importedCount > 0 || deletedCount > 0) {
                showToast(`Sinkronisasi berhasil! ${updatedCount} berkas terhubung, ${importedCount} berkas baru diimpor, ${deletedCount} berkas usang dihapus.`, true);
            } else {
                alert("Sinkronisasi selesai. Semua berkas di Google Drive sudah tersinkronisasi dengan sistem LIMS.");
            }
        }
    } catch (err) {
        console.error("Gagal melakukan sinkronisasi dengan Google Drive:", err);
        if (!silent) {
            alert("Gagal melakukan sinkronisasi dengan Google Drive: " + err.message);
        }
    }
}

async function syncDocumentsWithDrive() {
    await performDriveSync(false);
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

// --- DYNAMIC CATEGORY MANAGER MODAL UI & CRUD LOGIC ---

window.openCategoryModal = function() {
    resetCategoryForm();
    renderCategoriesTable();
    document.getElementById('modalCategory').style.display = 'flex';
}

window.closeCategoryModal = function() {
    document.getElementById('modalCategory').style.display = 'none';
}

window.closeCategoryModalOuter = function(event) {
    if (event.target.id === 'modalCategory') {
        closeCategoryModal();
    }
}

function renderCategoriesTable() {
    const tbody = document.getElementById('categoryTableBody');
    if (!tbody) return;
    
    let html = '';
    allCategories.forEach(cat => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-size: 0.8rem; font-weight: 600; color: #475569;">${cat.id}</td>
                <td style="padding: 10px; font-size: 0.8rem; font-weight: 500; color: #0f172a;">${cat.name}</td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button type="button" class="table-action-btn" onclick="editCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')" style="color: #2563eb; background: none; border: none; cursor: pointer; font-size: 0.9rem;" title="Edit Kategori">📝</button>
                        <button type="button" class="table-action-btn" onclick="deleteCategory('${cat.id}')" style="color: #ef4444; background: none; border: none; cursor: pointer; font-size: 0.9rem;" title="Hapus Kategori">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    if (allCategories.length === 0) {
        html = `<tr><td colspan="3" style="padding: 15px; text-align: center; color: #64748b; font-size: 0.8rem;">Belum ada kategori terdaftar.</td></tr>`;
    }
    
    tbody.innerHTML = html;
}

window.editCategory = function(id, name) {
    document.getElementById('categoryFormTitle').innerText = "📝 Edit Kategori";
    const idInput = document.getElementById('catId');
    idInput.value = id;
    idInput.disabled = true; // ID tidak boleh diubah saat edit karena menjadi KeyPath utama
    
    document.getElementById('catName').value = name;
    document.getElementById('btnCancelCategoryEdit').style.display = 'inline-block';
}

window.resetCategoryForm = function() {
    document.getElementById('categoryFormTitle').innerText = "➕ Tambah Kategori Baru";
    const idInput = document.getElementById('catId');
    idInput.value = '';
    idInput.disabled = false;
    
    document.getElementById('catName').value = '';
    document.getElementById('btnCancelCategoryEdit').style.display = 'none';
}

window.saveCategory = async function(event) {
    event.preventDefault();
    const idInput = document.getElementById('catId');
    const nameInput = document.getElementById('catName');
    
    const id = idInput.value.trim().toLowerCase();
    const name = nameInput.value.trim();
    
    if (!id || !name) return;
    
    // Validasi format ID Kategori agar URL-friendly
    if (!/^[a-z0-9_-]+$/.test(id)) {
        alert("Kode ID Kategori hanya boleh berisi huruf kecil, angka, garis bawah (_), atau tanda hubung (-).");
        return;
    }
    
    try {
        const isEdit = idInput.disabled;
        const newCat = { id, name };
        
        await updateCategoryInDB(newCat);
        showToast(isEdit ? "Kategori berhasil diperbarui!" : "Kategori baru berhasil ditambahkan!");
        
        resetCategoryForm();
        await loadDocuments();
        renderCategoriesTable();
    } catch (err) {
        console.error("Gagal menyimpan kategori:", err);
        showToast("Error: " + err.message, false);
    }
}

window.deleteCategory = async function(catId) {
    // Validasi keselamatan utama: "kalau hapus hanya jika kosong" (jika tidak ada dokumen yang memakai kategori ini)
    const hasDocs = allDocuments.some(doc => doc.category === catId);
    
    if (hasDocs) {
        const docCount = allDocuments.filter(doc => doc.category === catId).length;
        alert(`⚠️ Kategori '${catId}' tidak dapat dihapus karena masih digunakan oleh ${docCount} dokumen!\nSilakan pindahkan atau hapus dokumen tersebut terlebih dahulu.`);
        return;
    }
    
    if (confirm(`Apakah Anda yakin ingin menghapus kategori '${catId}'?`)) {
        try {
            await deleteCategoryFromDB(catId);
            showToast("Kategori berhasil dihapus!");
            await loadDocuments();
            renderCategoriesTable();
        } catch (err) {
            console.error("Gagal menghapus kategori:", err);
            showToast("Error: " + err.message, false);
        }
    }
}
