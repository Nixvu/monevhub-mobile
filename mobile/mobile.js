/**
 * MonevHub Mobile Full Replica + Kemnaker-Matched Injected UI Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const toastEl = document.getElementById('m-toast');
  const showToast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    setTimeout(() => { toastEl.style.display = 'none'; }, 2800);
  };

  // Auto-detect device label (HP vs Laptop/PC)
  const detectDeviceLabel = () => {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'HP - Android Mobile';
    if (/iphone|ipad/i.test(ua)) return 'HP - iOS Mobile';
    if (/windows/i.test(ua)) return 'Laptop/PC - Windows';
    if (/macintosh/i.test(ua)) return 'Laptop/PC - macOS';
    return 'Perangkat Browser';
  };
  const autoDev = detectDeviceLabel();
  const berandaDevEl = document.getElementById('beranda-device-name');
  const setDevEl = document.getElementById('set-device-auto');
  const gateDevEl = document.getElementById('gate-auto-device');
  if (berandaDevEl) berandaDevEl.textContent = autoDev;
  if (setDevEl) setDevEl.textContent = autoDev;
  if (gateDevEl) gateDevEl.value = autoDev;

  // Onboarding / License Gate Toggle Preview
  const gateOverlay = document.getElementById('gate-license-overlay');
  document.getElementById('btn-toggle-onboarding')?.addEventListener('click', () => {
    gateOverlay?.classList.add('open');
  });
  document.getElementById('btn-gate-close-preview')?.addEventListener('click', () => {
    gateOverlay?.classList.remove('open');
  });
  document.getElementById('btn-gate-activate')?.addEventListener('click', () => {
    gateOverlay?.classList.remove('open');
    showToast('Lisensi aktif! Membuka halaman login MonevHub...');
  });

  // Bottom Navigation
  const activateTab = (targetId) => {
    document.querySelectorAll('.wv-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.wv === targetId));
    document.querySelectorAll('.wv-page').forEach(p => p.classList.toggle('active', p.id === targetId));
  };
  document.querySelectorAll('.wv-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.wv));
  });
  document.getElementById('btn-km-goto-riwayat')?.addEventListener('click', () => activateTab('wv-riwayat'));
  document.getElementById('btn-km-announce')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('5 pengumuman resmi MagangHub.');
  });

  // Live Clock
  const serverTimeEl = document.getElementById('km-server-time');
  const updateServerClock = () => {
    if (!serverTimeEl) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    serverTimeEl.textContent = `Waktu Server ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())} WIB (GMT+7)`;
  };
  updateServerClock();
  setInterval(updateServerClock, 1000);

  // Dynamic Presensi
  const presSel = document.getElementById('m-presensi');
  const actLabel = document.getElementById('m-act-label');
  const actInput = document.getElementById('m-act-input');
  const obsGroup = document.getElementById('m-obs-group');
  presSel?.addEventListener('change', () => {
    const v = presSel.value;
    if (v === 'Izin') {
      actLabel.textContent = 'Alasan / Keterangan Izin';
      actInput.placeholder = 'Contoh: Mengurus keperluan administrasi kampus...';
      obsGroup.style.display = 'none';
    } else if (v === 'Sakit') {
      actLabel.textContent = 'Keterangan / Kondisi Sakit';
      actInput.placeholder = 'Contoh: Istirahat sesuai anjuran dokter...';
      obsGroup.style.display = 'none';
    } else {
      actLabel.textContent = 'Poin Kegiatan Hari Ini';
      actInput.placeholder = 'Contoh: Pemeliharaan jaringan & input data harian';
      obsGroup.style.display = 'block';
    }
  });

  // Fill Form
  document.getElementById('btn-m-apply')?.addEventListener('click', () => {
    const raw = (actInput?.value || '').trim() || 'Melaksanakan tugas harian magang';
    document.getElementById('wv-real-presensi').value = presSel?.value || 'Hadir';
    document.getElementById('wv-real-uraian').value =
      `Melaksanakan ${raw} secara tertib, terstruktur, dan profesional sesuai prosedur operasional instansi hingga tuntas.`;
    document.getElementById('wv-real-extra').value =
      'Pembelajaran: Meningkatkan ketelitian kerja dan koordinasi tim. Kendala: Tidak ada kendala berarti.';
    const badge = document.getElementById('wv-form-badge');
    if (badge) { badge.className = 'pill ok'; badge.textContent = 'Terisi AI'; }
    showToast('Form asli MonevHub berhasil diisi otomatis!');
  });

  document.getElementById('btn-m-beranda-sync')?.addEventListener('click', () => showToast('Menyinkronkan absensi semua periode...'));

  // Mobile Log Riwayat List + Filter Toggle
  const sampleLogs = [
    { no: 1, periode: 'Periode 3', tgl: '2026-11-26', pres: 'Hadir', uraian: 'Melakukan pemeliharaan perangkat jaringan lokal, pengecekan printer layanan, serta rekapitulasi data harian.', belajar: 'Memahami troubleshooting jaringan LAN dan alur administrasi.', kendala: 'Tidak ditemui kendala teknis selama pelaksanaan tugas.' },
    { no: 2, periode: 'Periode 3', tgl: '2026-11-25', pres: 'Hadir', uraian: 'Melaksanakan input dan verifikasi data peserta layanan harian pada sistem informasi instansi secara tertib.', belajar: 'Meningkatkan ketelitian validasi data operasional.', kendala: 'Tidak ada kendala yang menghambat target kerja.' },
    { no: 3, periode: 'Periode 2', tgl: '2026-11-18', pres: 'Izin', uraian: 'Mengikuti kegiatan akademik resmi di kampus dengan surat izin dan persetujuan pembimbing lapangan.', belajar: 'Koordinasi penjadwalan tugas bersama mentor.', kendala: 'Tidak ada kendala berarti.' }
  ];

  const renderMobileLogs = (q = '') => {
    const listEl = document.getElementById('m-log-list');
    const cntEl = document.getElementById('m-log-count');
    if (!listEl) return;
    const filtered = sampleLogs.filter(l => `${l.tgl} ${l.periode} ${l.pres} ${l.uraian}`.toLowerCase().includes(q.toLowerCase()));
    if (cntEl) cntEl.textContent = `${filtered.length} laporan`;
    listEl.innerHTML = filtered.map(l => `
      <div class="m-log-card">
        <div class="m-log-head">
          <span><strong>#${l.no}</strong> • ${l.periode} • <strong>${l.tgl}</strong></span>
          <span class="pill ${l.pres === 'Hadir' ? 'ok' : 'warn'}">${l.pres}</span>
        </div>
        <div style="font-size:11.5px;color:#334155;line-height:1.4;margin-bottom:4px;">${l.uraian}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <span class="m-char-pill">Uraian ${l.uraian.length} char</span>
          <span class="m-char-pill">Belajar ${l.belajar.length} char</span>
          <span class="m-char-pill">Kendala ${l.kendala.length} char</span>
        </div>
      </div>
    `).join('');
  };
  renderMobileLogs();
  document.getElementById('m-log-search')?.addEventListener('input', (e) => renderMobileLogs(e.target.value));
  document.getElementById('btn-m-toggle-filter')?.addEventListener('click', () => {
    const p = document.getElementById('m-log-filter-panel');
    if (p) p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
  });

  // Modal Popup Templates
  const modal = document.getElementById('m-settings-modal');
  const modalTitle = document.getElementById('m-modal-title');
  const modalBody = document.getElementById('m-modal-body');

  const modalTemplates = {
    'modal-export-doc': {
      title: 'Ekspor Laporan Periode',
      html: `<div class="m-field"><label class="m-label">Format</label><select class="m-select"><option>PDF (Siap Cetak)</option><option>Word (.docx)</option><option>CSV</option></select></div>
             <div class="m-field"><label class="m-label">Template &amp; Kertas</label><select class="m-select"><option>Template 1 • A4 Portrait</option><option>Template 1 • A4 Landscape</option><option>Template 2 • Instansi</option></select></div>
             <label style="display:flex;gap:8px;align-items:center;font-size:12px;"><input type="checkbox"><span>Sertakan Rekapitulasi Bulanan AI</span></label>`
    },
    'modal-log-history': {
      title: 'Log Riwayat & Filter',
      html: `<div class="m-field"><input type="search" class="m-input" placeholder="Cari tanggal atau kata kunci..."></div>
             <div style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;"><strong>2026-11-26 • Hadir</strong><div style="color:#64748b;margin-top:2px;">Melaksanakan pemeliharaan jaringan... (142 char)</div></div>
             <div style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;"><strong>2026-11-25 • Hadir</strong><div style="color:#64748b;margin-top:2px;">Input dan verifikasi data layanan... (136 char)</div></div>`
    },
    'modal-ai-recap': {
      title: 'Rekapitulasi Bulanan AI',
      html: `<div class="m-field"><label class="m-label">Periode</label><select class="m-select"><option>Periode 3 (21 Nov - 20 Des 2026)</option><option>Periode 2 (21 Okt - 20 Nov 2026)</option></select></div>
             <textarea class="m-textarea" rows="5" readonly>1. RINGKASAN EKSEKUTIF\nSelama periode berjalan, seluruh tugas operasional dan administrasi terlaksana tertib (plain text tanpa markdown).</textarea>`
    },
    'modal-att-stats': {
      title: 'Statistik Kehadiran',
      html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
               <div style="padding:10px;background:#ecfdf5;border-radius:8px;"><strong>18 Hari</strong><div>Hadir</div></div>
               <div style="padding:10px;background:#fffbeb;border-radius:8px;"><strong>1 Hari</strong><div>Izin / Sakit</div></div>
               <div style="padding:10px;background:#eff6ff;border-radius:8px;"><strong>18 Siap</strong><div>Ekspor (&ge;100 char)</div></div>
               <div style="padding:10px;background:#f8fafc;border-radius:8px;"><strong>0 Alpha</strong><div>Tanpa Keterangan</div></div>
             </div>`
    },
    'modal-delete-history': {
      title: 'Hapus Log Riwayat',
      html: `<div class="m-field">
               <label class="m-label">Pilih Cakupan Penghapusan</label>
               <select class="m-select">
                 <option selected>Hapus Semua Periode (Seluruh Data Lokal)</option>
                 <option>Hapus Data Sesuai Filter Aktif</option>
                 <option>Hapus Periode 3 (21 Nov - 20 Des 2026)</option>
                 <option>Hapus Periode 2 (21 Okt - 20 Nov 2026)</option>
               </select>
             </div>
             <p style="font-size:11px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;padding:8px;border-radius:8px;">Data yang dihapus dapat diekstrak ulang kapan saja dari kalender MonevHub.</p>`
    },
    'modal-set-ai': {
      title: 'Konfigurasi AI (Trio Gateway)',
      html: `<div class="m-field"><label class="m-label">Mode AI</label><select class="m-select"><option>1. Server Lisensi (Sheet AI_KEYS)</option><option>2. API Key Mandiri (Auto-Fetch Model)</option><option>3. OAuth Bearer Token</option></select></div>
             <div class="m-field"><label class="m-label">Penyedia Gateway</label><select class="m-select"><option>Google Gemini</option><option>OpenAI</option><option>DeepSeek</option><option>Groq</option><option>Custom URL</option></select></div>
             <div class="m-field">
               <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                 <label class="m-label" style="margin:0;">API Key</label>
                 <div style="display:flex;gap:4px;">
                   <button type="button" class="m-btn m-btn-secondary m-btn-sm">Get API Key</button>
                   <button type="button" class="m-btn m-btn-secondary m-btn-sm">Tempel</button>
                 </div>
               </div>
               <input type="password" class="m-input" placeholder="AIza... / sk-...">
             </div>
             <div class="m-field">
               <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                 <label class="m-label" style="margin:0;">Pilih Model</label>
                 <button type="button" class="m-btn m-btn-secondary m-btn-sm">Muat Model</button>
               </div>
               <select class="m-select"><option>gemini-2.5-flash (Otomatis)</option><option>gemini-2.5-flash-lite</option></select>
             </div>
             <button type="button" class="m-btn m-btn-secondary" style="margin-top:4px;">Tes Koneksi AI</button>`
    },
    'modal-set-export': {
      title: 'Template Laporan, Identitas & TTD',
      html: `<div class="m-field">
               <label class="m-label">1. Pilihan Variant Template</label>
               <select class="m-select">
                 <option selected>Template 1 — Standar MonevHub</option>
                 <option>Template 2 — Logbook Instansi</option>
                 <option>Template 3 — Ringkas &amp; Kendala</option>
               </select>
             </div>
             <div class="m-field">
               <label class="m-label">2. Orientasi Kertas (Default A4)</label>
               <select class="m-select">
                 <option selected>Portrait (A4 Tegak)</option>
                 <option>Landscape (A4 Mendatar)</option>
               </select>
             </div>
             <div class="m-field"><label class="m-label">Nama Peserta (Kosong = titik-titik)</label><input type="text" class="m-input" placeholder="Kosongkan jika tidak perlu"></div>
             <div class="m-field"><label class="m-label">Nama Instansi</label><input type="text" class="m-input" placeholder="UPTD Puskesmas Cipicung"></div>
             <div class="m-field"><label class="m-label">Bagian / Unit Kerja</label><input type="text" class="m-input" placeholder="Subbag Tata Usaha"></div>
             <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;" class="m-field">
               <div><label class="m-label">Sen–Kam</label><input type="text" class="m-input" value="07.15–14.15"></div>
               <div><label class="m-label">Jumat</label><input type="text" class="m-input" value="07.15–13.00"></div>
               <div><label class="m-label">Sabtu</label><input type="text" class="m-input" value="07.15–12.30"></div>
             </div>
             <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;" class="m-field">
               <div><label class="m-label">Kota TTD</label><input type="text" class="m-input" placeholder="Kuningan"></div>
               <div><label class="m-label">Tanggal TTD</label><input type="text" class="m-input" placeholder="Otomatis"></div>
             </div>
             <label style="display:flex;gap:6px;align-items:center;font-size:12px;font-weight:700;margin-bottom:8px;"><input type="checkbox" checked> Tampilkan Blok TTD Akhir Dokumen</label>
             <div class="m-ttd-box">
               <label style="display:flex;gap:6px;align-items:center;font-weight:700;margin-bottom:6px;"><input type="checkbox" checked> Pihak 1 (Pimpinan)</label>
               <input type="text" class="m-input" placeholder="Jabatan" value="Kepala Instansi / Pimpinan" style="margin-bottom:5px;">
               <input type="text" class="m-input" placeholder="Nama Lengkap" style="margin-bottom:5px;">
               <input type="text" class="m-input" placeholder="NIP / NIK (Opsional)" style="margin-bottom:5px;">
               <label style="display:flex;gap:6px;align-items:center;font-size:11px;margin-bottom:4px;"><input type="checkbox"> Sertakan Gambar TTD (PNG)</label>
               <input type="file" accept="image/png" style="font-size:10.5px;">
             </div>
             <div class="m-ttd-box">
               <label style="display:flex;gap:6px;align-items:center;font-weight:700;margin-bottom:6px;"><input type="checkbox" checked> Pihak 2 (Mentor)</label>
               <input type="text" class="m-input" placeholder="Jabatan" value="Mentor MagangHub" style="margin-bottom:5px;">
               <input type="text" class="m-input" placeholder="Nama Lengkap" style="margin-bottom:5px;">
               <input type="text" class="m-input" placeholder="NIP / NIK (Opsional)" style="margin-bottom:5px;">
               <label style="display:flex;gap:6px;align-items:center;font-size:11px;margin-bottom:4px;"><input type="checkbox"> Sertakan Gambar TTD (PNG)</label>
               <input type="file" accept="image/png" style="font-size:10.5px;">
             </div>
             <div class="m-ttd-box" style="margin-bottom:0;">
               <label style="display:flex;gap:6px;align-items:center;font-weight:700;margin-bottom:6px;"><input type="checkbox" checked> Pihak 3 (Peserta)</label>
               <input type="text" class="m-input" placeholder="Jabatan" value="Peserta Program MagangHub" style="margin-bottom:5px;">
               <input type="text" class="m-input" placeholder="Nama Peserta (default kosong)" style="margin-bottom:5px;">
               <input type="text" class="m-input" placeholder="NIP / NIK (Opsional)" style="margin-bottom:5px;">
               <label style="display:flex;gap:6px;align-items:center;font-size:11px;margin-bottom:4px;"><input type="checkbox"> Sertakan Gambar TTD (PNG)</label>
               <input type="file" accept="image/png" style="font-size:10.5px;">
             </div>`
    },
    'modal-set-loc': {
      title: 'Lokasi Default GPS & Peta',
      html: `<div style="display:flex;gap:6px;margin-bottom:8px;">
               <input type="text" class="m-input" placeholder="Cari instansi / tempat..." style="margin:0;">
               <button type="button" class="m-btn m-btn-secondary m-btn-sm">Cari</button>
             </div>
             <div class="m-field"><label class="m-label">Atau Tempel Link Google Maps / Koordinat</label><input type="text" class="m-input" value="-6.949180, 108.539136"></div>
             <div style="display:flex;gap:6px;">
               <button type="button" class="m-btn m-btn-secondary m-btn-sm" style="flex:1;">Ambil GPS Sekarang</button>
               <button type="button" class="m-btn m-btn-secondary m-btn-sm" style="flex:1;">Pilih di Peta</button>
             </div>`
    },
    'modal-set-lic': {
      title: 'Lisensi & Perangkat',
      html: `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px;margin-bottom:8px;font-size:11.5px;display:grid;gap:4px;">
               <div style="display:flex;justify-content:space-between;"><span>Device ID:</span><code>MH-AND-8F3A19</code></div>
               <div style="display:flex;justify-content:space-between;"><span>Perangkat:</span><strong>${autoDev}</strong></div>
               <div style="display:flex;justify-content:space-between;"><span>Berlaku:</span><strong>2027-10-15</strong></div>
             </div>
             <div class="m-field"><label class="m-label">Ubah Kunci Lisensi</label><input type="text" class="m-input" placeholder="MH-XXXX-XXXX-XXXX"></div>
             <div class="m-field"><label class="m-label">Nama Pemilik</label><input type="text" class="m-input" placeholder="Nama Anda"></div>
             <button type="button" class="m-btn m-btn-secondary">Sinkronkan Status</button>`
    }
  };

  document.querySelectorAll('.btn-open-set-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = modalTemplates[btn.dataset.modal];
      if (!tpl) return;
      modalTitle.textContent = tpl.title;
      modalBody.innerHTML = tpl.html;
      modal?.classList.add('open');
    });
  });

  document.getElementById('btn-m-modal-close')?.addEventListener('click', () => modal?.classList.remove('open'));
  document.getElementById('btn-m-modal-save')?.addEventListener('click', () => {
    modal?.classList.remove('open');
    showToast('Selesai.');
  });

  // Permission Checker
  let dlGranted = false;
  const setPermUI = (badgeId, btnId, state) => {
    const b = document.getElementById(badgeId);
    const btn = document.getElementById(btnId);
    if (!b) return;
    if (state === 'granted') {
      b.className = 'pill ok'; b.textContent = 'Diizinkan';
      if (btn) btn.style.display = 'none';
    } else if (state === 'denied') {
      b.className = 'pill bad'; b.textContent = 'Ditolak';
      if (btn) btn.style.display = 'inline-block';
    } else {
      b.className = 'pill warn'; b.textContent = 'Belum';
      if (btn) btn.style.display = 'inline-block';
    }
  };

  async function checkAllPermissions() {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const res = await navigator.permissions.query({ name: 'geolocation' });
        setPermUI('perm-gps-badge', 'btn-req-gps', res.state);
      } catch (e) { setPermUI('perm-gps-badge', 'btn-req-gps', 'prompt'); }
    } else setPermUI('perm-gps-badge', 'btn-req-gps', 'prompt');

    setPermUI('perm-notif-badge', 'btn-req-notif', typeof Notification !== 'undefined' ? Notification.permission : 'prompt');
    setPermUI('perm-dl-badge', 'btn-req-dl', dlGranted ? 'granted' : 'prompt');
  }

  document.getElementById('btn-req-gps')?.addEventListener('click', () => {
    if (!navigator.geolocation) return showToast('Geolocation tidak tersedia.');
    navigator.geolocation.getCurrentPosition(
      () => { setPermUI('perm-gps-badge', 'btn-req-gps', 'granted'); showToast('Izin GPS diaktifkan.'); },
      () => { setPermUI('perm-gps-badge', 'btn-req-gps', 'denied'); showToast('Izin GPS ditolak.'); }
    );
  });
  document.getElementById('btn-req-notif')?.addEventListener('click', async () => {
    if (typeof Notification === 'undefined') return showToast('Notifikasi tidak didukung.');
    const res = await Notification.requestPermission();
    setPermUI('perm-notif-badge', 'btn-req-notif', res);
  });
  document.getElementById('btn-req-dl')?.addEventListener('click', () => {
    dlGranted = true;
    setPermUI('perm-dl-badge', 'btn-req-dl', 'granted');
    showToast('Izin Unduhan diaktifkan.');
  });
  document.getElementById('btn-recheck-perms')?.addEventListener('click', checkAllPermissions);
  checkAllPermissions();
});
