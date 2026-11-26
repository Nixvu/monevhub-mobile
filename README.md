# MonevHub AI - Chrome & Edge Extension
**Asisten Pengisian Laporan MagangHub Kemnaker Berbasis AI & Rekap Bulanan Cerdas**

Ekstensi Chromium (Chrome/Edge) dengan sistem lisensi terikat perangkat (*Hardware-Bound License 1 Key = 1 Device*), generator narasi formal minimal 100 karakter, dan rekapitulasi bulanan otomatis.

---

## ⚡ Fitur Utama

1. **Otomasi Isian Laporan Harian MagangHub**:
   - Cukup masukkan poin aktivitas mentah (misal: *"memperbaiki laptop pengguna, setting wifi"*).
   - AI otomatis menghasilkan 3 isian formal baku Kemnaker yang masing-masing **pasti &ge; 100 karakter**:
     - **Uraian Aktivitas** (&ge; 100 karakter).
     - **Pembelajaran yang Diperoleh** (&ge; 100 karakter).
     - **Kendala yang Dialami** (&ge; 100 karakter).
2. **Checkbox Kendala Cerdas**:
   - Jika **tidak dicentang**: AI otomatis menghasilkan narasi formal bahwa seluruh pekerjaan terlaksana lancar tanpa hambatan teknis.
   - Jika **dicentang**: Muncul kolom isian kendala singkat, AI akan menjabarkan kendala, penyebab teknis, mitigasi penanganan, dan solusinya.
3. **Injeksi Form Vue 3 / Vuetify Otomatis**:
   - Memilih dropdown presensi (**Hadir**).
   - Mengisi 3 textarea laporan dengan *native event dispatching* agar reaktif terdeteksi oleh sistem Monev.
   - Otomatis mencentang checkbox konfirmasi peninjauan laporan.
4. **Rekapitulasi Bulanan Cerdas**:
   - Menyaring dan merangkum seluruh log harian selama sebulan menjadi dokumen rekapitulasi komprehensif.
   - Format: Ringkasan Eksekutif, Capaian Utama, Rekapitulasi Kompetensi, dan Evaluasi Kendala.
   - Ekspor langsung ke format teks (.txt) atau salin ke clipboard.
5. **Sistem Lisensi Komersial (1 Key = 1 Perangkat)**:
   - Menggunakan Google Spreadsheet + Google Apps Script sebagai server database gratis.
   - Proteksi Hardware Fingerprint deterministik (WebGL GPU, CPU, Canvas rasterizer, OS, Timezone, SHA-256).
   - Fitur otomatis terkunci jika lisensi belum aktif atau kadaluarsa.
6. **Obfuscator & Anti-Reverse Engineering**:
   - Dilengkapi pipeline build dengan `javascript-obfuscator` (Control Flow Flattening, Dead Code Injection, String Array Encryption RC4/Base64, Anti-Debugging).
   - Menghasilkan folder distribusi `dist/` yang aman didistribusikan ke pembeli tanpa khawatir kode dibajak atau di-reverse engineer oleh AI/manusia.

---

## 🚀 Cara Pemasangan & Pengujian

### 1. Mode Pengembangan (Source Code)
1. Buka browser Chrome / Edge.
2. Buka URL: `chrome://extensions` atau `edge://extensions`.
3. Aktifkan **Developer mode** (Mode pengembang) di pojok kanan atas.
4. Klik **Load unpacked** (Muat yang belum dibongkar).
5. Pilih folder: `C:\laragon\www\extension\monevhub`.

### 2. Mode Distribusi Ter-Obfuscate (Untuk Dijual)
Jalankan perintah berikut di terminal:
```bash
npm run build
```
Folder `dist/` akan tercipta secara otomatis berisi kode yang telah terenkripsi dan siap dikompres menjadi ZIP/CRX untuk dibagikan ke pembeli.

---

## 🔑 Pengaturan Lisensi & AI

1. **Server Lisensi (Google Sheets)**:
   - Ikuti panduan lengkap pada [PANDUAN_SETUP_LISENSI.md](google-apps-script/PANDUAN_SETUP_LISENSI.md).
   - Deploy script [Code.gs](google-apps-script/Code.gs) sebagai Web App ("Who has access: Anyone").
2. **Kunci Gemini API (Gratis)**:
   - Dapatkan API Key di [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Masukkan API Key di tab **Lisensi & AI** pada popup ekstensi.
