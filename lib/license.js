/**
 * MonevHub License System - Hardware Fingerprint & Client Validator
 * Arsitektur: 1 Kunci Lisensi = 1 Komputer / Laptop (Hardware-Bound)
 * Anti-Tamper & Anti-Clone Protection
 */
(function (global) {
  'use strict';

  const LicenseManager = {
    // Default endpoint Google Apps Script (bisa diubah pengguna di menu Pengaturan)
    DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycbyroaeRnFJCF3aIoRR3XWVmd8akUH9IxvUa_qTElN-gEL9PaWXRtAdpGXCFFKGVpXS-/exec',
    CACHE_KEY: 'monevhub_license',
    CACHE_DURATION_MS: 15 * 60 * 1000, // 15 menit cache validasi online
    SEC_SALT: 'MH@SecGuard#2026!Kemnaker',

    /**
     * Dapatkan endpoint API efektif (dari parameter, storage lisensi, storage AI, atau default)
     */
    async getEffectiveApiUrl(customUrl = '') {
      if (customUrl && customUrl.trim()) return customUrl.trim();
      try {
        const store = await chrome.storage.local.get(['monevhub_license', 'monevhub_ai_config']);
        const lic = store.monevhub_license || {};
        const aiCfg = store.monevhub_ai_config || {};
        if (lic.apiUrl && lic.apiUrl.trim()) return lic.apiUrl.trim();
        if (aiCfg.gasWebhookUrl && aiCfg.gasWebhookUrl.trim()) return aiCfg.gasWebhookUrl.trim();
      } catch (e) {}
      return this.DEFAULT_API_URL;
    },

    /**
     * Normalisasi string GPU WebGL agar tidak fluktuatif pada laptop dual-GPU (iGPU vs dGPU)
     * saat charger dilepas atau dipasang.
     */
    normalizeGpuRenderer(renderer) {
      if (!renderer) return 'GENERIC_GPU';
      // Tangkap tipe backend driver (Direct3D11, OpenGL, Metal, Vulkan) jika lewat ANGLE
      const angleMatch = renderer.match(/ANGLE \([^,]+,\s*([^,]+),\s*([^)]+)\)/i);
      let backend = '';
      if (angleMatch) {
        backend = (angleMatch[2] || '').trim().replace(/\s+/g, '_');
      }
      // Hapus model diskret spesifik (NVIDIA RTX/GTX, Intel Iris/UHD, AMD Radeon) agar switching daya tidak merusak hash
      const sanitized = renderer
        .replace(/(NVIDIA|GeForce|RTX|GTX|Intel|UHD Graphics|HD Graphics|Iris|AMD|Radeon)[\w\s.-]*/gi, 'GPU_CORE')
        .replace(/\s+/g, ' ')
        .trim();
      return backend ? `${sanitized}#${backend}` : sanitized;
    },

    /**
     * Hitung Hardware Fingerprint Mesin yang 100% Deterministik & Resilien
     * Menggunakan parameter hardware murni: WebGL GPU ternormalisasi, Canvas 2D engine, CPU Cores, OS, Layar
     */
    async getHardwareFingerprint() {
      const components = [];

      // 1. GPU Hardware (WebGL Ternormalisasi: Renderbuffer, Texture Size, Backend Driver)
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const rawVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
            const rawRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
            components.push(this.normalizeGpuRenderer(rawVendor));
            components.push(this.normalizeGpuRenderer(rawRenderer));
          }
          components.push(gl.getParameter(gl.MAX_TEXTURE_SIZE) || '');
          components.push(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || '');
        } else {
          components.push('NO_WEBGL');
        }
      } catch (e) {
        components.push('WEBGL_ERR');
      }

      // 2. CPU Cores & Platform OS
      components.push(navigator.hardwareConcurrency || '4');
      components.push(navigator.platform || 'Win32');

      // 3. System Timezone & Bahasa
      try {
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta');
      } catch (e) {
        components.push('Asia/Jakarta');
      }
      components.push((navigator.language || 'id').toLowerCase());

      // 4. Deterministic 2D Canvas Engine (Rasterizer font OS & antialiasing)
      try {
        const c2d = document.createElement('canvas');
        c2d.width = 160;
        c2d.height = 40;
        const ctx = c2d.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(5, 2, 70, 24);
          ctx.fillStyle = '#f59e0b';
          ctx.font = "14px 'Arial'";
          ctx.fillText('MonevHub!2026', 4, 18);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
          ctx.fillText('Kemnaker#Monev', 6, 20);
          components.push(c2d.toDataURL());
        }
      } catch (e) {
        components.push('CANVAS_ERR');
      }

      // 5. Kapasitas RAM / Device Memory & Karakteristik Layar
      if (navigator.deviceMemory) {
        components.push(navigator.deviceMemory);
      }
      if (typeof screen !== 'undefined') {
        components.push(screen.colorDepth || 24);
      }

      const raw = components.join('###');
      const hash = await this.sha256(raw);
      return 'MH-' + hash.substring(0, 24).toUpperCase();
    },

    /**
     * Hitung checksum tanda tangan anti-tamper untuk data lisensi lokal
     */
    async generateLicenseSignature(lic) {
      if (!lic) return '';
      const payload = [
        lic.key || '',
        lic.fingerprint || '',
        lic.expiredDate || '',
        Boolean(lic.active),
        this.SEC_SALT
      ].join('||');
      return await this.sha256(payload);
    },

    /**
     * SHA-256 Hasher
     */
    async sha256(str) {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },

    /**
     * Ambil data lisensi tersimpan di storage lokal
     */
    async getStoredLicense() {
      try {
        const store = await chrome.storage.local.get(this.CACHE_KEY);
        return store[this.CACHE_KEY] || null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Simpan data lisensi ke storage lokal dengan tanda tangan anti-tamper
     */
    async saveStoredLicense(data) {
      try {
        if (data && typeof data === 'object') {
          data.sig = await this.generateLicenseSignature(data);
        }
        const payload = {};
        payload[this.CACHE_KEY] = data;
        await chrome.storage.local.set(payload);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Hapus lisensi tersimpan (Logout / Reset)
     */
    async clearLicense() {
      try {
        await chrome.storage.local.remove(this.CACHE_KEY);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Validasi lisensi secara komprehensif (Integritas Lokal + Online jika diperlukan)
     */
    async verify(forceOnline = false) {
      const lic = await this.getStoredLicense();
      if (!lic || !lic.active || !lic.key) {
        return {
          valid: false,
          reason: 'NO_LICENSE',
          message: 'Ekstensi belum diaktivasi. Masukkan lisensi di menu Pengaturan.'
        };
      }

      // Validasi tanda tangan anti-tamper lokal
      if (lic.sig) {
        const expectedSig = await this.generateLicenseSignature(lic);
        if (lic.sig !== expectedSig) {
          return {
            valid: false,
            reason: 'TAMPERED',
            message: 'Integritas lisensi tidak valid (terdeteksi modifikasi lokal tanpa izin).'
          };
        }
      }

      // Validasi kesesuaian hardware fingerprint
      const currentFp = await this.getHardwareFingerprint();
      if (lic.fingerprint && lic.fingerprint !== currentFp) {
        return {
          valid: false,
          reason: 'DEVICE_MISMATCH',
          message: 'Lisensi terikat pada komputer/laptop lain. Hubungi admin untuk reset perangkat.'
        };
      }

      // Cek tanggal kadaluarsa lokal
      if (lic.expiredDate) {
        const exp = new Date(lic.expiredDate + 'T23:59:59');
        if (new Date() > exp) {
          return {
            valid: false,
            reason: 'EXPIRED',
            message: `Masa aktif lisensi telah berakhir pada ${lic.expiredDate}.`
          };
        }
      }

      // Cek interval online sync
      const now = Date.now();
      const shouldCheckOnline = forceOnline || !lic.lastVerified || (now - lic.lastVerified > this.CACHE_DURATION_MS);
      const apiUrl = await this.getEffectiveApiUrl(lic.apiUrl);

      if (shouldCheckOnline && apiUrl && !apiUrl.includes('SAMPLE')) {
        try {
          const query = new URLSearchParams({
            action: 'verify',
            key: lic.key,
            fingerprint: currentFp
          });

          const resp = await fetch(`${apiUrl}?${query.toString()}`, {
            method: 'GET',
            cache: 'no-store'
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.status === 'AKTIF') {
              lic.lastVerified = now;
              lic.expiredDate = data.expiredDate || lic.expiredDate;
              lic.owner = data.owner || data.instansi || lic.owner || 'Pengguna MonevHub';
              lic.features = data.features || lic.features || 'ALL';
              await this.saveStoredLicense(lic);
              return { valid: true, data: lic };
            } else {
              lic.active = false;
              await this.saveStoredLicense(lic);
              return {
                valid: false,
                reason: data.status || 'INVALID',
                message: data.message || 'Lisensi tidak aktif atau diblokir.'
              };
            }
          }
        } catch (err) {
          // Jika offline atau server down, berikan toleransi jika cache belum kadaluarsa
          const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 hari toleransi offline
          if (lic.lastVerified && (now - lic.lastVerified < gracePeriodMs)) {
            return { valid: true, data: lic, offlineGrace: true };
          }
          return {
            valid: false,
            reason: 'OFFLINE_EXPIRED',
            message: 'Gagal menghubungi server lisensi. Pastikan koneksi internet aktif.'
          };
        }
      }

      return { valid: true, data: lic };
    },

    /**
     * Aktivasi lisensi baru ke Google Apps Script
     */
    async activate(key, deviceName = '', userName = '', customApiUrl = '') {
      if (!key || !key.trim()) {
        return { success: false, message: 'Kunci lisensi wajib diisi.' };
      }

      const cleanKey = key.trim().toUpperCase();
      const fp = await this.getHardwareFingerprint();
      const apiUrl = await this.getEffectiveApiUrl(customApiUrl);

      try {
        const query = new URLSearchParams({
          action: 'activate',
          key: cleanKey,
          userName: userName.trim() || 'Pengguna',
          deviceName: deviceName.trim() || navigator.platform || 'PC-User',
          fingerprint: fp
        });

        const resp = await fetch(`${apiUrl}?${query.toString()}`, {
          method: 'GET',
          cache: 'no-store'
        });

        if (!resp.ok) {
          return { success: false, message: `Server merespon error: HTTP ${resp.status}` };
        }

        const res = await resp.json();
        if (res.success) {
          const licData = {
            active: true,
            key: cleanKey,
            userName: userName.trim() || res.owner || 'Pengguna',
            deviceName: deviceName.trim() || navigator.platform,
            fingerprint: fp,
            owner: res.owner || 'Pengguna Personal',
            expiredDate: res.expiredDate || '2099-12-31',
            features: res.features || 'ALL',
            apiUrl: apiUrl,
            activatedAt: new Date().toISOString(),
            lastVerified: Date.now()
          };
          await this.saveStoredLicense(licData);
          return { success: true, message: res.message || 'Aktivasi lisensi berhasil!', data: licData };
        } else {
          return {
            success: false,
            status: res.status || 'ERROR',
            message: res.message || 'Aktivasi ditolak. Periksa kunci lisensi Anda.'
          };
        }
      } catch (err) {
        return { success: false, message: 'Gagal terhubung ke server lisensi. Periksa koneksi internet.' };
      }
    }
  };

  // Export ke scope global / window
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicenseManager;
  } else {
    global.MonevHubLicense = LicenseManager;
  }
})(typeof window !== 'undefined' ? window : this);
