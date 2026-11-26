/**
 * MonevHub Mobile Preview: In-Page DOM Injection per Route + Modal Settings + Permission Checker
 */
document.addEventListener('DOMContentLoaded', () => {
  const toastEl = document.getElementById('m-toast');
  const showToast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    setTimeout(() => { toastEl.style.display = 'none'; }, 2800);
  };

  // Bottom Navigation (Beranda, Riwayat, Perkembangan, Pengaturan)
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
    showToast('5 pengumuman resmi dari MagangHub Kemnaker.');
  });

  // Live Clock untuk chip Waktu Server
  const serverTimeEl = document.getElementById('km-server-time');
  const updateServerClock = () => {
    if (!serverTimeEl) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    serverTimeEl.textContent = `Waktu Server ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())} WIB (GMT+7)`;
  };
  updateServerClock();
  setInterval(updateServerClock, 1000);

  // Dynamic Presensi on Riwayat Injected Card
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

  // Generate & Isi ke Form Asli Monev di atasnya
  document.getElementById('btn-m-apply')?.addEventListener('click', () => {
    const raw = (actInput?.value || '').trim() || 'Melaksanakan tugas harian magang';
    const pres = presSel?.value || 'Hadir';
    document.getElementById('wv-real-presensi').value = pres;
    document.getElementById('wv-real-uraian').value =
      `Melaksanakan ${raw} secara tertib, terstruktur, dan profesional sesuai prosedur operasional instansi hingga tuntas.`;
    document.getElementById('wv-real-extra').value =
      'Pembelajaran: Meningkatkan ketelitian kerja dan koordinasi tim. Kendala: Tidak ada kendala berarti.';
    const badge = document.getElementById('wv-form-badge');
    if (badge) { badge.className = 'pill ok'; badge.textContent = 'Terisi AI'; }
    showToast('Form asli MonevHub di atas berhasil diisi otomatis!');
  });

  document.getElementById('btn-m-sync-period')?.addEventListener('click', () => showToast('Menarik data periode & absensi dari halaman Riwayat...'));
  document.getElementById('btn-m-export-period')?.addEventListener('click', () => showToast('Membuka opsi ekspor PDF / Word A4...'));
  document.getElementById('btn-m-run-recap')?.addEventListener('click', () => showToast('Menyusun Rekapitulasi Bulanan AI (plain text)...'));
  document.getElementById('btn-m-open-logs')?.addEventListener('click', () => showToast('Menampilkan daftar log tersimpan...'));

  // Modal Popup Pengaturan
  const modal = document.getElementById('m-settings-modal');
  const modalTitle = document.getElementById('m-modal-title');
  const modalBody = document.getElementById('m-modal-body');

  const modalTemplates = {
    'modal-set-ai': {
      title: 'Konfigurasi API & Model AI',
      html: `<div class="m-field"><label class="m-label">Mode AI</label><select class="m-select"><option>Server Lisensi (AI_KEYS)</option><option>API Key Mandiri</option></select></div>
             <div class="m-field"><label class="m-label">API Key</label><input type="password" class="m-input" placeholder="AIza... / sk-..."></div>`
    },
    'modal-set-export': {
      title: 'Template Laporan & TTD',
      html: `<div class="m-field"><label class="m-label">Orientasi Kertas (A4)</label><select class="m-select"><option>Portrait (A4 Tegak)</option><option>Landscape (A4 Mendatar)</option></select></div>
             <div class="m-field"><label class="m-label">Upload Gambar TTD (PNG)</label><input type="file" accept="image/png" class="m-input"></div>`
    },
    'modal-set-loc': {
      title: 'Lokasi Default GPS',
      html: `<div class="m-field"><label class="m-label">Link Google Maps / Koordinat</label><input type="text" class="m-input" value="-6.949180, 108.539136"></div>`
    },
    'modal-set-lic': {
      title: 'Lisensi Perangkat',
      html: `<div class="m-field"><label class="m-label">Kunci Lisensi</label><input type="text" class="m-input" placeholder="MH-XXXX-XXXX-XXXX"></div>
             <div style="font-size:11px;color:#64748b;">Terikat ke Android / iOS Device ID.</div>`
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
    showToast('Pengaturan disimpan.');
  });

  // Permission Checker (GPS, Unduhan, Notifikasi)
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
    // 1. GPS
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const res = await navigator.permissions.query({ name: 'geolocation' });
        setPermUI('perm-gps-badge', 'btn-req-gps', res.state);
      } catch (e) { setPermUI('perm-gps-badge', 'btn-req-gps', 'prompt'); }
    } else {
      setPermUI('perm-gps-badge', 'btn-req-gps', 'prompt');
    }

    // 2. Notifikasi
    if (typeof Notification !== 'undefined') {
      setPermUI('perm-notif-badge', 'btn-req-notif', Notification.permission);
    } else {
      setPermUI('perm-notif-badge', 'btn-req-notif', 'prompt');
    }

    // 3. Unduhan / Storage (via Native Filesystem di Capacitor)
    setPermUI('perm-dl-badge', 'btn-req-dl', dlGranted ? 'granted' : 'prompt');
  }

  document.getElementById('btn-req-gps')?.addEventListener('click', () => {
    if (!navigator.geolocation) return showToast('Geolocation tidak tersedia.');
    navigator.geolocation.getCurrentPosition(
      () => { setPermUI('perm-gps-badge', 'btn-req-gps', 'granted'); showToast('Izin GPS diaktifkan.'); },
      () => { setPermUI('perm-gps-badge', 'btn-req-gps', 'denied'); showToast('Izin GPS ditolak. Aktifkan di Setelan HP.'); }
    );
  });

  document.getElementById('btn-req-notif')?.addEventListener('click', async () => {
    if (typeof Notification === 'undefined') return showToast('Notifikasi tidak didukung browser ini.');
    const res = await Notification.requestPermission();
    setPermUI('perm-notif-badge', 'btn-req-notif', res);
    showToast(res === 'granted' ? 'Izin Notifikasi diaktifkan.' : 'Izin Notifikasi belum diberikan.');
  });

  document.getElementById('btn-req-dl')?.addEventListener('click', () => {
    dlGranted = true;
    setPermUI('perm-dl-badge', 'btn-req-dl', 'granted');
    showToast('Izin Penyimpanan / Unduhan diaktifkan (via Capacitor Filesystem di HP).');
  });

  document.getElementById('btn-recheck-perms')?.addEventListener('click', checkAllPermissions);
  checkAllPermissions();
});
