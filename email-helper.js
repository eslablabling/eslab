// email-helper.js - Helper Notifikasi Email Otomatis (ESLab LIMS)
(function() {
    /**
     * Kirim email notifikasi otomatis di background
     */
    window.sendAutoEmail = function(subject, plainMessage, cocNo, companyName) {
        if (!window.EMAIL_CONFIG || !window.EMAIL_CONFIG.enabled) return;
        const targetEmail = window.EMAIL_CONFIG.targetEmail || 'supershadowanonymous@gmail.com';
        const serviceId = window.EMAIL_CONFIG.serviceId || 'service_1r3i42m';
        const templateId = window.EMAIL_CONFIG.templateId || 'template_v4k0hwg';
        const publicKey = window.EMAIL_CONFIG.publicKey || 'HjYTcT2ztfYsVCx6m';

        // Jika EmailJS SDK dimuat
        if (window.emailjs && publicKey) {
            window.emailjs.send(
                serviceId,
                templateId,
                {
                    to_email: targetEmail,
                    email_to: targetEmail,
                    subject: subject,
                    subject_title: subject,
                    message: plainMessage,
                    coc_number: cocNo || '-',
                    company_name: companyName || '-'
                },
                publicKey
            ).catch(err => {
                console.warn('⚠️ [Email Auto] Gagal mengirim email via EmailJS:', err);
            });
        }
    };

    /**
     * Helper Notifikasi Email COC Baru
     */
    window.notifyNewCOC = function(noCoc, namaPerusahaan, samplerName) {
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const subject = `[ESLab LIMS] COC Baru Dibuat - ${noCoc || 'COC'}`;
        const plainMsg = `📋 ESLab LIMS Notification: COC Baru Berhasil Dibuat\n\n` +
                         `• No. COC: ${noCoc || '-'}\n` +
                         `• Nama Klien: ${namaPerusahaan || '-'}\n` +
                         `• Petugas Sampler: ${samplerName || '-'}\n` +
                         `• Tanggal Dibuat: ${dateStr}\n\n` +
                         `Status: Menunggu proses sampling / pengiriman sampel ke lab.`;

        window.sendAutoEmail(subject, plainMsg, noCoc, namaPerusahaan);
    };

    /**
     * Helper Notifikasi Email Penerimaan Sampel
     */
    window.notifySampleReceived = function(noCoc, namaPerusahaan, jumlahSampel) {
        const subject = `[ESLab LIMS] Sampel Diterima di Lab - ${noCoc || 'COC'}`;
        const plainMsg = `🧪 ESLab LIMS Notification: Sampel Tiba & Diterima di Lab\n\n` +
                         `Sampel fisik telah diterima oleh Admin TS:\n` +
                         `• No. COC: ${noCoc || '-'}\n` +
                         `• Nama Perusahaan: ${namaPerusahaan || '-'}\n` +
                         `• Total Sampel: ${jumlahSampel || 1} Titik\n\n` +
                         `Status: Sampel diverifikasi dan siap diuji oleh Analis Laboratorium.`;

        window.sendAutoEmail(subject, plainMsg, noCoc, namaPerusahaan);
    };

    /**
     * Helper Notifikasi Email COA Diverifikasi
     */
    window.notifyCOAVerified = function(noCoa, noCoc, namaPerusahaan) {
        const subject = `[ESLab LIMS] COA Diverifikasi & Terbit - ${noCoa || 'COA'}`;
        const plainMsg = `📄 ESLab LIMS Notification: Sertifikat Hasil Uji (COA) Terbit\n\n` +
                         `Sertifikat Hasil Uji telah diverifikasi oleh Manajer Lab:\n` +
                         `• No. COA: ${noCoa || '-'}\n` +
                         `• No. COC / Quotation: ${noCoc || '-'}\n` +
                         `• Nama Perusahaan: ${namaPerusahaan || '-'}\n\n` +
                         `Status: Sertifikat resmi dapat diunduh melalui Portal Klien ESLab LIMS.`;

        window.sendAutoEmail(subject, plainMsg, noCoa, namaPerusahaan);
    };
})();
