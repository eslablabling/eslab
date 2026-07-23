/**
 * ESLab LIMS - PWA Shortcut & Cross-Platform Install Manager
 * Supports: Android, iOS (Safari), Desktop (Chrome/Edge/Brave)
 */

(function () {
    'use strict';

    let deferredPrompt = null;

    // 1. Registrasi Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('✓ Service Worker ESLab terdaftar:', reg.scope))
                .catch(err => console.error('✕ Gagal registrasi SW:', err));
        });
    }

    // 2. Deteksi Perangkat (Platform)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    // 3. Tangkap Event beforeinstallprompt (Android & Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showFloatingFab();
    });

    // 4. Inisialisasi UI saat DOM siap
    document.addEventListener('DOMContentLoaded', () => {
        // Jika belum standalone, siapkan Floating FAB & Modal
        if (!isStandalone) {
            createPwaUI();
        } else {
            console.log('ESLab LIMS berjalan dalam mode Standalone PWA');
        }
    });

    function createPwaUI() {
        if (document.getElementById('eslabPwaFab')) return;

        // Container Floating Action Button (FAB)
        const fab = document.createElement('button');
        fab.id = 'eslabPwaFab';
        fab.className = 'eslab-pwa-fab';
        fab.setAttribute('aria-label', 'Tambah Shortcut Aplikasi');
        fab.innerHTML = `
            <div class="eslab-pwa-fab-icon"><img src="icon-192.png" style="width: 22px; height: 22px; border-radius: 6px; object-fit: contain;" alt="Logo ESLab"></div>
            <span>Tambah Shortcut</span>
            <div class="eslab-pwa-fab-badge"></div>
        `;
        fab.addEventListener('click', () => openPwaModal());
        document.body.appendChild(fab);

        // Container Modal
        const overlay = document.createElement('div');
        overlay.id = 'eslabPwaOverlay';
        overlay.className = 'eslab-pwa-overlay';
        overlay.innerHTML = `
            <div class="eslab-pwa-modal">
                <button class="eslab-pwa-close-btn" id="eslabPwaCloseBtn">&times;</button>
                
                <div class="eslab-pwa-header">
                    <img src="icon-192.png" alt="Logo ESLab" class="eslab-pwa-app-icon">
                    <div>
                        <div class="eslab-pwa-title">ESLab LIMS Shortcut</div>
                        <div class="eslab-pwa-subtitle">Tambah ke Layar Utama / Desktop</div>
                    </div>
                </div>

                <div class="eslab-pwa-tabs">
                    <div class="eslab-pwa-tab ${isAndroid ? 'active' : ''}" data-target="android">Android</div>
                    <div class="eslab-pwa-tab ${isIOS ? 'active' : ''}" data-target="ios">iOS (iPhone)</div>
                    <div class="eslab-pwa-tab ${!isAndroid && !isIOS ? 'active' : ''}" data-target="desktop">Desktop</div>
                </div>

                <div id="eslabPwaContent">
                    <!-- Dynamic Step Content -->
                </div>

                <div class="eslab-pwa-shortcuts-preview">
                    <div class="eslab-pwa-shortcuts-title">Menu Cepat (Long-Press / Quick Actions):</div>
                    <div class="eslab-pwa-shortcuts-grid">
                        <div class="eslab-pwa-shortcut-chip"><span>📊</span> Dashboard</div>
                        <div class="eslab-pwa-shortcut-chip"><span>🧪</span> Sampling</div>
                        <div class="eslab-pwa-shortcut-chip"><span>🔬</span> Analisa</div>
                        <div class="eslab-pwa-shortcut-chip"><span>📜</span> Cetak COA</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Bind Close Event
        document.getElementById('eslabPwaCloseBtn').addEventListener('click', closePwaModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePwaModal();
        });

        // Tab Switching Event
        const tabs = overlay.querySelectorAll('.eslab-pwa-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderTabContent(tab.dataset.target);
            });
        });

        // Render initial active tab content
        const defaultPlatform = isAndroid ? 'android' : (isIOS ? 'ios' : 'desktop');
        renderTabContent(defaultPlatform);
    }

    function showFloatingFab() {
        const fab = document.getElementById('eslabPwaFab');
        if (fab) {
            fab.style.display = 'flex';
        }
    }

    function openPwaModal() {
        const overlay = document.getElementById('eslabPwaOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    function closePwaModal() {
        const overlay = document.getElementById('eslabPwaOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    function renderTabContent(platform) {
        const container = document.getElementById('eslabPwaContent');
        if (!container) return;

        if (platform === 'android') {
            container.innerHTML = `
                <div class="eslab-pwa-steps">
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">1</div>
                        <div class="eslab-pwa-step-text">Ketuk tombol <strong>'Install Shortcut Sekarang'</strong> di bawah ini.</div>
                    </div>
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">2</div>
                        <div class="eslab-pwa-step-text">Jika tidak muncul otomatis, ketuk menu <strong>Titik 3 (⋮)</strong> di pojok kanan atas browser Chrome/Edge.</div>
                    </div>
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">3</div>
                        <div class="eslab-pwa-step-text">Pilih <strong>'Tambahkan ke Layar Utama'</strong> atau <strong>'Install Aplikasi'</strong>.</div>
                    </div>
                </div>
                <button class="eslab-pwa-btn-primary" id="eslabPwaInstallBtn">
                    <span>⚡</span> Install Shortcut Sekarang
                </button>
            `;

            const btn = document.getElementById('eslabPwaInstallBtn');
            if (btn) {
                btn.addEventListener('click', triggerNativeInstall);
            }

        } else if (platform === 'ios') {
            container.innerHTML = `
                <div class="eslab-pwa-steps">
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">1</div>
                        <div class="eslab-pwa-step-text">Buka aplikasi ini di <strong>Safari</strong>, lalu ketuk tombol <strong>Bagikan (Share ⎋)</strong> di baris bawah.</div>
                    </div>
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">2</div>
                        <div class="eslab-pwa-step-text">Gulir opsi ke bawah dan pilih <strong>'Tambah ke Layar Utama' (Add to Home Screen ➕)</strong>.</div>
                    </div>
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">3</div>
                        <div class="eslab-pwa-step-text">Ketuk <strong>'Tambah'</strong> di pojok kanan atas layar iPhone/iPad Anda.</div>
                    </div>
                </div>
                <div style="text-align: center; font-size: 0.78rem; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 10px; border-radius: 12px;">
                    💡 Ikon ESLab LIMS akan langsung muncul di Home Screen iPhone Anda.
                </div>
            `;

        } else if (platform === 'desktop') {
            container.innerHTML = `
                <div class="eslab-pwa-steps">
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">1</div>
                        <div class="eslab-pwa-step-text">Ketuk tombol <strong>'Install Aplikasi Desktop'</strong> di bawah ini.</div>
                    </div>
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">2</div>
                        <div class="eslab-pwa-step-text">Atau klik ikon <strong>Install App (⊕)</strong> di bilah alamat URL (Address Bar) Chrome/Edge.</div>
                    </div>
                    <div class="eslab-pwa-step-item">
                        <div class="eslab-pwa-step-num">3</div>
                        <div class="eslab-pwa-step-text">Aplikasi akan terpasang di Desktop & Taskbar Windows/Mac dengan akses cepat (Right-Click menu).</div>
                    </div>
                </div>
                <button class="eslab-pwa-btn-primary" id="eslabPwaDesktopInstallBtn">
                    <span>💻</span> Install Aplikasi Desktop
                </button>
            `;

            const btn = document.getElementById('eslabPwaDesktopInstallBtn');
            if (btn) {
                btn.addEventListener('click', triggerNativeInstall);
            }
        }
    }

    async function triggerNativeInstall() {
        if (!deferredPrompt) {
            alert('Panduan manual: Silakan gunakan menu browser (Titik 3 ➔ "Tambahkan ke Layar Utama" / "Install Aplikasi").');
            return;
        }

        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('Pengguna menerima prompt instalasi PWA ESLab');
            closePwaModal();
            const fab = document.getElementById('eslabPwaFab');
            if (fab) fab.style.display = 'none';
        } else {
            console.log('Pengguna menolak prompt instalasi');
        }
        deferredPrompt = null;
    }

    // Expose global API
    window.ESLabPWA = {
        openInstallModal: openPwaModal,
        closeInstallModal: closePwaModal
    };

})();
