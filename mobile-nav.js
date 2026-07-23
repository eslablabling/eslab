/**
 * ESLab LIMS Mobile Navigation & Responsiveness Script
 * Handles Mobile Navigation Drawer & Touch Layout Enhancements for Android & iOS
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        initMobileNavigation();
        wrapTablesResponsive();
    });

    function initMobileNavigation() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // 1. Buat Mobile Header jika belum ada
        if (!document.querySelector('.mobile-header')) {
            const mobileHeader = document.createElement('div');
            mobileHeader.className = 'mobile-header';
            mobileHeader.innerHTML = `
                <div class="mobile-brand">
                    <img src="logo_es.jfif" alt="ESLab Logo">
                    <span style="font-weight: 800; font-size: 0.95rem; color: #1e293b;">ESLab LIMS</span>
                </div>
                <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Buka Menu">
                    ☰
                </button>
            `;
            document.body.prepend(mobileHeader);
        }

        // 2. Buat Backdrop Overlay jika belum ada
        let backdrop = document.querySelector('.mobile-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'mobile-backdrop';
            document.body.appendChild(backdrop);
        }

        // 3. Event Toggle Sidebar
        const toggleBtn = document.getElementById('mobileMenuToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                backdrop.classList.toggle('active');
            });
        }

        // 4. Tutup Sidebar saat Backdrop ditotok
        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            backdrop.classList.remove('active');
        });

        // 5. Tutup Sidebar saat item menu diklik
        const navItems = sidebar.querySelectorAll('.nav-item, a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                backdrop.classList.remove('active');
            });
        });
    }

    // Wrap tabel-tabel secara otomatis agar dapat di-swipe di HP
    function wrapTablesResponsive() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-responsive')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

    // Expose Global Helper
    window.ESLabMobile = {
        closeDrawer: function() {
            const sidebar = document.querySelector('.sidebar');
            const backdrop = document.querySelector('.mobile-backdrop');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (backdrop) backdrop.classList.remove('active');
        }
    };

})();
