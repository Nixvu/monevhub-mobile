/**
 * MonevHub Mobile In-Page DOM Injector
 * Menyisipkan card MonevHub AI langsung ke halaman asli monev.maganghub.kemnaker.go.id
 */
(function() {
  'use strict';
  if (window.__mhMobileInjected) return;
  window.__mhMobileInjected = true;

  const STYLE_ID = 'mh-mobile-inject-style';
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      .mh-inj-card {
        background: #ffffff;
        border: 1px solid #bfdbfe;
        border-left: 4px solid #1d4ed8;
        border-radius: 14px;
        padding: 14px;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(29,78,216,0.08);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .mh-inj-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .mh-inj-head strong { font-size: 13.5px; color: #0f172a; }
      .mh-inj-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; }
      .mh-inj-input, .mh-inj-select, .mh-inj-textarea {
        width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px;
        font-size: 12.5px; margin-bottom: 8px; background: #fff; color: #0f172a; box-sizing: border-box;
      }
      .mh-inj-btn {
        width: 100%; padding: 10px 12px; border: none; border-radius: 9px; font-size: 12.5px;
        font-weight: 700; background: #1d4ed8; color: #fff; cursor: pointer;
      }
      .mh-inj-btn-sec { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
      .mh-inj-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
      .mh-inj-row:last-child { border-bottom: none; }
      .mh-pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      .mh-pill-ok { background: #ecfdf5; color: #059669; }
      .mh-pill-warn { background: #fffbeb; color: #b45309; }
    `;
    document.head.appendChild(st);
  }

  function toast(msg) {
    if (window.AndroidBridge && window.AndroidBridge.showToast) {
      window.AndroidBridge.showToast(msg);
    } else {
      console.log('[MonevHub Mobile]', msg);
    }
  }

  function setNativeValue(el, val) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set ||
                   Object.getOwnPropertyDescriptor(el, 'value')?.set;
    if (setter) setter.call(el, val);
    else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renameAkunTab() {
    document.querySelectorAll('a, button, span').forEach(el => {
      if (el.childNodes.length === 1 && el.textContent.trim() === 'Akun') {
        el.textContent = 'Pengaturan';
      }
    });
  }

  function getMountTarget() {
    return document.querySelector('main, .v-main, #app .container, #app') || document.body;
  }

  function injectForCurrentRoute() {
    renameAkunTab();
    const path = window.location.pathname.toLowerCase();
    const target = getMountTarget();
    if (!target) return;

    // Bersihkan card rute lain
    document.querySelectorAll('.mh-route-block').forEach(el => {
      if (el.dataset.route !== path) el.remove();
    });
    if (document.querySelector(`.mh-route-block[data-route="${path}"]`)) return;

    const wrap = document.createElement('div');
    wrap.className = 'mh-route-block';
    wrap.dataset.route = path;
    wrap.style.padding = '0 14px 20px';

    if (path.includes('riwayat')) {
      wrap.innerHTML = `
        <div class="mh-inj-card">
          <div class="mh-inj-head">
            <strong>Asisten Isi Laporan AI</strong>
            <span class="mh-inj-tag">MonevHub AI</span>
          </div>
          <select id="mh-mob-presensi" class="mh-inj-select">
            <option value="Hadir" selected>Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
          </select>
          <textarea id="mh-mob-act" class="mh-inj-textarea" rows="2" placeholder="Poin kegiatan hari ini..."></textarea>
          <button type="button" id="mh-mob-fill" class="mh-inj-btn">Generate &amp; Isi Form di Atas</button>
        </div>
      `;
      target.appendChild(wrap);
      document.getElementById('mh-mob-fill')?.addEventListener('click', () => {
        const raw = (document.getElementById('mh-mob-act')?.value || '').trim() || 'Melaksanakan tugas harian magang';
        const areas = Array.from(document.querySelectorAll('textarea')).filter(t => !t.closest('.mh-inj-card'));
        if (areas.length < 3) {
          toast('Buka form laporan pada salah satu tanggal di kalender terlebih dahulu.');
          return;
        }
        setNativeValue(areas[0], `Melaksanakan ${raw} secara tertib, terstruktur, dan profesional sesuai prosedur instansi hingga tuntas.`);
        setNativeValue(areas[1], 'Pembelajaran: Meningkatkan ketelitian teknis, pemahaman alur kerja, dan koordinasi tim selama pelaksanaan tugas.');
        setNativeValue(areas[2], 'Kendala: Seluruh kegiatan terlaksana lancar dan tertib tanpa hambatan teknis yang berarti.');
        toast('Form laporan Monev berhasil diisi!');
      });
    } else if (path.includes('akun') || path.includes('profil')) {
      let perms = { gps: false, storage: false, notification: false };
      try {
        if (window.AndroidBridge) perms = JSON.parse(window.AndroidBridge.checkPermissions());
      } catch (e) {}
      wrap.innerHTML = `
        <div class="mh-inj-card">
          <div class="mh-inj-head">
            <strong>Cek Akses &amp; Izin Perangkat</strong>
            <span class="mh-inj-tag">Android</span>
          </div>
          <div class="mh-inj-row"><span>Lokasi / GPS</span><span class="mh-pill ${perms.gps ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.gps ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-row"><span>Penyimpanan / Unduhan</span><span class="mh-pill ${perms.storage ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.storage ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-row"><span>Notifikasi</span><span class="mh-pill ${perms.notification ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.notification ? 'Diizinkan' : 'Belum'}</span></div>
          <button type="button" id="mh-mob-req-perms" class="mh-inj-btn" style="margin-top:8px;">Minta Semua Izin Akses</button>
        </div>
      `;
      target.appendChild(wrap);
      document.getElementById('mh-mob-req-perms')?.addEventListener('click', () => {
        if (window.AndroidBridge) window.AndroidBridge.requestAllPermissions();
      });
    } else {
      wrap.innerHTML = `
        <div class="mh-inj-card">
          <div class="mh-inj-head">
            <strong>MonevHub AI Aktif</strong>
            <span class="mh-inj-tag">Siap Pakai</span>
          </div>
          <div style="font-size:12px;color:#334155;">Buka tab <strong>Riwayat</strong> untuk mengisi laporan otomatis atau tab <strong>Pengaturan</strong> untuk cek izin akses.</div>
        </div>
      `;
      target.appendChild(wrap);
    }
  }

  let routeTimer = null;
  const obs = new MutationObserver(() => {
    clearTimeout(routeTimer);
    routeTimer = setTimeout(injectForCurrentRoute, 250);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('mh-perms-updated', () => {
    document.querySelectorAll('.mh-route-block').forEach(el => el.remove());
    injectForCurrentRoute();
  });
  setTimeout(injectForCurrentRoute, 400);
})();
