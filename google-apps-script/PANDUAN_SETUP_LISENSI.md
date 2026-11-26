# PANDUAN SETUP SERVER LISENSI MONEVHUB (GOOGLE SHEETS)

Server lisensi ini menggunakan **Google Spreadsheet + Google Apps Script** sebagai database gratis dan andal.
Prinsip proteksi: **1 Kunci = 1 Laptop/Komputer** (*Hardware Fingerprint* stabil anti-cloning, anti-resale, dan deteksi multi-device).

---

## Struktur Database Spreadsheet

Google Apps Script akan otomatis membuat 2 tab sheet saat pertama kali dijalankan:

### Tab 1: `LISENSI`
| Kolom | Nama Kolom | Keterangan |
|---|---|---|
| **A** | `No` | Nomor urut |
| **B** | `License Key` | Format acak unik: `MH-XXXX-XXXX-XXXX` |
| **C** | `Nama Pengguna` | Nama pembeli / pemilik lisensi (Personal) |
| **D** | `Nama Device` | Terisi otomatis saat laptop aktivasi (misal: *Laptop Kerja*) |
| **E** | `HW Fingerprint` | Terisi otomatis identifier hardware laptop pembeli |
| **F** | `Tgl Aktivasi` | Waktu aktivasi pertama |
| **G** | `Status` | `AKTIF`, `BLOKIR`, atau `SUSPEND_DUPLIKAT` |
| **H** | `Tgl Expired` | Masa berlaku lisensi (contoh: `2027-12-31`) |
| **I** | `Limit Fiture` | `ALL` |
| **J** | `Terakhir Online` | Waktu terakhir ekstensi digunakan |
| **K** | `Indikasi Duplikat` | `AMAN` atau `TERDETEKSI (Nx Coba)` |

### Tab 2: `LOG_AKSES`
Mencatat riwayat seluruh percobaan aktivasi dan verifikasi lengkap dengan:
* `Timestamp`: Tanggal dan jam akses
* `License Key`: Kunci yang digunakan
* `Nama Pengguna` & `Nama Device`: Identitas perangkat
* `HW Fingerprint`: ID Hardware mesin
* `Tipe Event`: `AKTIVASI_BARU`, `RE_AKTIVASI`, `PERCOBAAN_DUPLIKAT`
* `Status Respons`: `SUCCESS` atau `BLOCKED`
* `Keterangan`: Catatan detil jika terjadi indikasi penyalahgunaan / jual ulang

---

## Langkah 1: Buat Google Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet: **`DATABASE LISENSI MONEVHUB`**.

---

## Langkah 2: Pasang Kode Google Apps Script

1. Di menu atas Google Spreadsheet, klik **Extensions** (Ekstensi) $\rightarrow$ **Apps Script**.
2. Hapus semua tulisan bawaan di editor.
3. Salin seluruh isi file [Code.gs](Code.gs) dan tempel ke editor Apps Script.
4. Klik tombol ikon **Save** (Simpan).

---

## Langkah 3: Deploy Web App (Dapatkan URL Server)

1. Di pojok kanan atas Apps Script, klik tombol biru **Deploy** $\rightarrow$ **New deployment**.
2. Klik ikon gear (*Select type*) $\rightarrow$ pilih **Web app**.
3. Isi parameter berikut:
   * **Description**: `Server Lisensi MonevHub AI Personal`
   * **Execute as**: `Me (email Anda)`
   * **Who has access**: **`Anyone`** *(Wajib "Anyone" agar ekstensi pembeli bisa memvalidasi lisensi tanpa login Google)*.
4. Klik **Deploy**.
5. Izinkan akses akun Google Anda (*Authorize Access* $\rightarrow$ *Advanced* $\rightarrow$ *Go to (unsafe)* $\rightarrow$ *Allow*).
6. Salin **Web app URL** yang muncul (contoh: `https://script.google.com/macros/s/AKfy.../exec`).

---

## Langkah 4: Hubungkan URL Server ke Ekstensi

1. Buka file `lib/license.js` pada project ekstensi Anda.
2. Ganti nilai variabel `DEFAULT_API_URL` dengan URL Web App yang Anda salin di Langkah 3:
   ```javascript
   DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfy.../exec',
   ```
3. Pengguna atau Anda juga bisa mengisinya langsung pada halaman Pengaturan ekstensi.

---

## Langkah 5: Cara Membuat Kunci & Mereset Perangkat

1. Buka kembali Google Spreadsheet Anda dan refresh halamannya.
2. Di bar menu atas akan muncul menu baru: **⚡ MonevHub Lisensi**.
3. Klik **Generate 10 Kunci Lisensi Baru**.
4. Salin kunci dan berikan ke pembeli personal.
5. **Jika pembeli ganti laptop**:
   * Buka tab `LISENSI`.
   * Klik sel pada baris kunci pembeli yang ingin direset.
   * Klik menu **⚡ MonevHub Lisensi** $\rightarrow$ **Reset Lisensi (Buka Kunci Perangkat)**.
   * Kunci otomatis bersih dan pembeli dapat mengaktivasi di laptop barunya.