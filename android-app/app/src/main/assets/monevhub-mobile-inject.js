/**
 * MonevHub Mobile In-Page DOM Injector (Full Feature Parity)
 * Menyisipkan UI bersih + License Gate + AI + Export PDF/Word + Peta + Template TTD + Permissions
 */
(function () {
  'use strict';
  if (window.__mhMobileInjected) return;
  window.__mhMobileInjected = true;

  const STYLE_ID = 'mh-mobile-inject-style';
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      .mh-km-card {
        background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
        padding: 15px; margin: 12px 0; box-shadow: 0 2px 8px rgba(15,23,42,0.04);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .mh-km-menu {
        background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
        padding: 14px 16px; margin: 10px 0; display: flex; align-items: center;
        justify-content: space-between; width: 100%; text-align: left; cursor: pointer;
        box-shadow: 0 2px 8px rgba(15,23,42,0.03);
      }
      .mh-km-left { display: flex; align-items: center; gap: 12px; }
      .mh-km-icon {
        width: 40px; height: 40px; border-radius: 12px; display: flex;
        align-items: center; justify-content: center; flex-shrink: 0; font-weight: 800; font-size: 13px;
      }
      .mh-inj-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 13.5px; color: #0f172a; }
      .mh-inj-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #eff6ff; color: #2563eb; }
      .mh-inj-lbl { display: block; font-size: 11px; font-weight: 600; color: #475569; margin: 6px 0 3px; }
      .mh-inj-input, .mh-inj-select, .mh-inj-textarea {
        width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 10px;
        font-size: 12.5px; margin-bottom: 8px; background: #fff; color: #0f172a; box-sizing: border-box;
      }
      .mh-inj-btn {
        width: 100%; padding: 10px 12px; border: none; border-radius: 10px; font-size: 12.5px;
        font-weight: 700; background: #2563eb; color: #fff; cursor: pointer;
      }
      .mh-inj-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .mh-inj-btn-sec { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
      .mh-inj-btn-danger { background: #dc2626; color: #fff; }
      .mh-inj-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .mh-inj-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
      .mh-inj-row:last-child { border-bottom: none; }
      .mh-pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      .mh-pill-ok { background: #ecfdf5; color: #059669; }
      .mh-pill-warn { background: #fffbeb; color: #b45309; }
      .mh-pill-err { background: #fef2f2; color: #dc2626; }
      .mh-char-badge {
        display: inline-block; font-size: 10.5px; font-weight: 700; padding: 2px 8px;
        border-radius: 6px; margin-top: 4px;
      }
      .mh-gate {
        position: fixed; inset: 0; background: #f8fafc; z-index: 999999;
        display: flex; align-items: center; justify-content: center; padding: 20px;
      }
      .mh-modal-bg {
        position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 999998;
        display: flex; align-items: flex-end; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .mh-modal-card {
        width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto;
        background: #fff; border-radius: 20px 20px 0 0; padding: 16px 16px 26px;
        box-shadow: 0 -8px 28px rgba(15,23,42,0.18); box-sizing: border-box;
      }
      .mh-modal-top {
        display: flex; justify-content: space-between; align-items: center;
        padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0;
      }
      .mh-modal-close {
        border: none; background: #f1f5f9; color: #334155; width: 30px; height: 30px;
        border-radius: 999px; font-weight: 700; cursor: pointer;
      }
      .mh-log-item {
        border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; margin-bottom: 8px; background: #f8fafc;
      }
      .mh-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 10px; }
      .mh-stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center; }
      .mh-stat-num { font-size: 18px; font-weight: 800; color: #0f172a; }
      .mh-stat-lbl { font-size: 11px; color: #64748b; }
    `;
    document.head.appendChild(st);
  }

  function toast(msg) {
    if (window.AndroidBridge && window.AndroidBridge.showToast) {
      window.AndroidBridge.showToast(String(msg));
    } else {
      console.log('[MonevHub Mobile]', msg);
    }
  }

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function setNativeValue(el, val) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set ||
                   Object.getOwnPropertyDescriptor(el, 'value')?.set;
    if (setter) setter.call(el, val);
    else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function storageGet(keys) {
    if (window.chrome?.storage?.local) return await window.chrome.storage.local.get(keys);
    return {};
  }

  async function storageSet(obj) {
    if (window.chrome?.storage?.local) await window.chrome.storage.local.set(obj);
  }

  function closeModal() {
    document.getElementById('mh-mobile-modal')?.remove();
  }

  function openModal(title, bodyHtml, onMount) {
    closeModal();
    const bg = document.createElement('div');
    bg.id = 'mh-mobile-modal';
    bg.className = 'mh-modal-bg';
    bg.innerHTML = `
      <div class="mh-modal-card">
        <div class="mh-modal-top">
          <strong style="font-size:15px;color:#0f172a;">${esc(title)}</strong>
          <button type="button" class="mh-modal-close" aria-label="Tutup">✕</button>
        </div>
        <div id="mh-mobile-modal-body">${bodyHtml}</div>
      </div>
    `;
    bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
    bg.querySelector('.mh-modal-close')?.addEventListener('click', closeModal);
    document.body.appendChild(bg);
    if (typeof onMount === 'function') onMount(bg);
  }

  async function ensureLicenseGate() {
    if (!window.MonevHubLicense) return true;
    const res = await window.MonevHubLicense.verify(false);
    if (res.valid) {
      document.getElementById('mh-mobile-license-gate')?.remove();
      return true;
    }
    if (document.getElementById('mh-mobile-license-gate')) return false;

    const autoDev = window.MonevHubLicense.detectDeviceLabel();
    const gate = document.createElement('div');
    gate.id = 'mh-mobile-license-gate';
    gate.className = 'mh-gate';
    gate.innerHTML = `
      <div class="mh-km-card" style="width:100%;max-width:380px;padding:20px;">
        <h2 style="font-size:17px;font-weight:800;margin:0 0 4px;">Aktivasi MonevHub AI</h2>
        <p style="font-size:12px;color:#64748b;margin:0 0 14px;">Aktifkan lisensi perangkat sebelum menggunakan portal.</p>
        <label class="mh-inj-lbl">Perangkat (Terdeteksi Otomatis)</label>
        <input id="mh-gate-dev" class="mh-inj-input" value="${esc(autoDev)}" readonly style="background:#f8fafc;color:#475569;">
        <label class="mh-inj-lbl">Kunci Lisensi</label>
        <input id="mh-gate-key" class="mh-inj-input" placeholder="MH-XXXX-XXXX-XXXX">
        <label class="mh-inj-lbl">Nama Pemilik</label>
        <input id="mh-gate-owner" class="mh-inj-input" placeholder="Nama Anda">
        <button id="mh-gate-btn" class="mh-inj-btn">Aktivasi Perangkat</button>
      </div>
    `;
    document.body.appendChild(gate);

    document.getElementById('mh-gate-btn')?.addEventListener('click', async () => {
      const key = (document.getElementById('mh-gate-key')?.value || '').trim();
      const owner = (document.getElementById('mh-gate-owner')?.value || '').trim();
      if (!key) return toast('Masukkan kunci lisensi.');
      const btn = document.getElementById('mh-gate-btn');
      btn.disabled = true;
      btn.textContent = 'Memverifikasi...';
      try {
        const act = await window.MonevHubLicense.activate(key, autoDev, owner);
        if (act.success) {
          toast('Aktivasi berhasil!');
          gate.remove();
          injectForCurrentRoute();
        } else {
          toast(act.message || 'Aktivasi ditolak.');
        }
      } catch (e) {
        toast('Error aktivasi: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Aktivasi Perangkat';
      }
    });
    return false;
  }

  function attachCharCounters() {
    const areas = Array.from(document.querySelectorAll('textarea')).filter(t => !t.closest('.mh-km-card') && !t.closest('.mh-modal-card'));
    if (areas.length < 3) return;
    areas.slice(0, 3).forEach(tx => {
      if (tx.dataset.mhMobCounter) return;
      tx.dataset.mhMobCounter = '1';
      const badge = document.createElement('span');
      badge.className = 'mh-char-badge';
      const update = () => {
        const len = (tx.value || '').length;
        badge.textContent = `${len} / 100 char`;
        badge.style.background = len >= 100 ? '#ecfdf5' : '#fffbeb';
        badge.style.color = len >= 100 ? '#059669' : '#b45309';
      };
      tx.addEventListener('input', update);
      update();
      tx.parentElement?.appendChild(badge);
    });
  }

  let autoSyncedOnce = false;
  function syncAttendanceAndProfileToAndroid() {
    if (!window.AndroidBridge) return;
    try {
      const h1 = document.querySelector('h1');
      if (h1 && /halo,\s*([^👋\n]+)/i.test(h1.textContent || '')) {
        const m = (h1.textContent || '').match(/halo,\s*([^👋\n]+)/i);
        if (m && m[1] && window.AndroidBridge.setParticipantName) {
          window.AndroidBridge.setParticipantName(m[1].trim());
        }
      }
      const bodyTxt = (document.body.innerText || '').toLowerCase();
      const todayIso = new Date().toISOString().slice(0, 10);
      if (bodyTxt.includes('laporan hari ini sudah diisi') && window.AndroidBridge.setTodayReportStatus) {
        window.AndroidBridge.setTodayReportStatus(todayIso, true);
      }
    } catch (e) {}
  }

  async function scheduleMobileAutoSync() {
    syncAttendanceAndProfileToAndroid();
    if (autoSyncedOnce || !window.location.pathname.toLowerCase().includes('riwayat')) return;
    const labelEl = document.querySelector('.ui-period-switcher__label');
    if (!labelEl) return;
    autoSyncedOnce = true;
    try {
      const text = (labelEl.textContent || '').trim();
      await storageSet({ monevhub_mobile_last_period: text, monevhub_last_autosync_ts: Date.now() });
    } catch (e) {}
  }

  function renameAkunTab() {
    document.querySelectorAll('a, button, span').forEach(el => {
      if (el.childNodes.length === 1 && el.textContent.trim() === 'Akun') {
        el.textContent = 'Pengaturan';
      }
    });
  }

  function getLogStatus(h) {
    return (h.presensi || h.kehadiran || h.status || 'Hadir').trim();
  }

  function filterLogs(logs, { start, end, skipWeekend, skipAbsent, skipEmpty }) {
    return (logs || []).filter(h => {
      const t = h.tanggal || '';
      if (start && t < start) return false;
      if (end && t > end) return false;
      if (skipWeekend && t) {
        const d = new Date(t + 'T00:00:00');
        if (!isNaN(d) && (d.getDay() === 0 || d.getDay() === 6)) return false;
      }
      const st = getLogStatus(h).toLowerCase();
      if (skipAbsent && (st.includes('alpa') || st.includes('izin') || st.includes('sakit') || st.includes('tidak'))) return false;
      if (skipEmpty && !(h.uraian_aktivitas || '').trim()) return false;
      return true;
    });
  }

  // ==========================================
  // MODAL 1: LOG RIWAYAT + FILTER + HAPUS + EKSPOR PDF/WORD
  // ==========================================
  async function openHistoryExportModal() {
    const store = await storageGet(['monevhub_history', 'monevhub_export_config']);
    const allLogs = Array.isArray(store.monevhub_history) ? store.monevhub_history : [];
    const expCfg = store.monevhub_export_config || {};

    openModal('Log Riwayat & Ekspor PDF / Word', `
      <div class="mh-inj-grid-2">
        <div>
          <label class="mh-inj-lbl">Dari Tanggal</label>
          <input id="mh-f-start" type="date" class="mh-inj-input">
        </div>
        <div>
          <label class="mh-inj-lbl">Sampai Tanggal</label>
          <input id="mh-f-end" type="date" class="mh-inj-input">
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11.5px;margin-bottom:10px;color:#334155;">
        <label><input id="mh-f-wknd" type="checkbox" checked> Lewati Sabtu/Minggu</label>
        <label><input id="mh-f-abs" type="checkbox"> Lewati Izin/Sakit/Alpa</label>
        <label><input id="mh-f-emp" type="checkbox" checked> Lewati Kosong</label>
      </div>
      <div class="mh-inj-grid-2" style="margin-bottom:10px;">
        <button type="button" id="mh-exp-pdf" class="mh-inj-btn">Ekspor PDF</button>
        <button type="button" id="mh-exp-docx" class="mh-inj-btn mh-inj-btn-sec">Ekspor Word (.docx)</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span id="mh-log-count" style="font-size:12px;font-weight:700;color:#334155;">0 laporan</span>
        <button type="button" id="mh-del-filtered" style="border:none;background:none;color:#dc2626;font-size:11.5px;font-weight:700;cursor:pointer;">Hapus Data Terfilter</button>
      </div>
      <div id="mh-log-list"></div>
    `, () => {
      const startEl = document.getElementById('mh-f-start');
      const endEl = document.getElementById('mh-f-end');
      const wkndEl = document.getElementById('mh-f-wknd');
      const absEl = document.getElementById('mh-f-abs');
      const empEl = document.getElementById('mh-f-emp');
      const listEl = document.getElementById('mh-log-list');
      const countEl = document.getElementById('mh-log-count');
      let currentLogs = allLogs;

      const getFiltered = () => filterLogs(currentLogs, {
        start: startEl.value,
        end: endEl.value,
        skipWeekend: wkndEl.checked,
        skipAbsent: absEl.checked,
        skipEmpty: empEl.checked
      });

      const render = () => {
        const rows = getFiltered();
        countEl.textContent = `${rows.length} laporan (dari ${currentLogs.length} tersimpan)`;
        if (!rows.length) {
          listEl.innerHTML = `<div style="text-align:center;color:#64748b;font-size:12px;padding:16px 0;">Belum ada data riwayat yang cocok. Buka halaman Riwayat untuk sinkronisasi otomatis.</div>`;
          return;
        }
        listEl.innerHTML = rows.slice(0, 60).map(h => `
          <div class="mh-log-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="font-size:12px;color:#0f172a;">${esc(h.tanggal || '-')}</strong>
              <span class="mh-pill mh-pill-ok">${esc(getLogStatus(h))}</span>
            </div>
            <div style="font-size:11.5px;color:#334155;line-height:1.4;">${esc((h.uraian_aktivitas || '(Belum diisi)').slice(0, 140))}</div>
          </div>
        `).join('');
      };

      [startEl, endEl, wkndEl, absEl, empEl].forEach(el => el?.addEventListener('change', render));
      render();

      const runExport = async (type) => {
        const rows = getFiltered();
        if (!rows.length) return toast('Tidak ada laporan untuk diekspor.');
        if (!window.MonevHubExport) return toast('Engine ekspor belum siap.');
        const periodLabel = (startEl.value && endEl.value) ? `${startEl.value}_sd_${endEl.value}` : (expCfg.bulanLabel || 'Semua_Periode');
        const owner = expCfg.pesertaNama || 'Peserta MagangHub';
        try {
          if (type === 'pdf') await window.MonevHubExport.exportToPDF(rows, periodLabel, owner);
          else await window.MonevHubExport.exportToDocx(rows, periodLabel, owner);
          toast(`Berhasil ekspor ${type.toUpperCase()} ke folder Downloads!`);
        } catch (err) {
          toast('Gagal ekspor: ' + err.message);
        }
      };

      document.getElementById('mh-exp-pdf')?.addEventListener('click', () => runExport('pdf'));
      document.getElementById('mh-exp-docx')?.addEventListener('click', () => runExport('docx'));
      document.getElementById('mh-del-filtered')?.addEventListener('click', async () => {
        const rows = getFiltered();
        if (!rows.length) return toast('Tidak ada data yang cocok.');
        if (!confirm(`Hapus ${rows.length} laporan terfilter dari penyimpanan lokal?`)) return;
        const removeSet = new Set(rows.map(r => r.tanggal + '|' + (r.uraian_aktivitas || '')));
        currentLogs = currentLogs.filter(h => !removeSet.has(h.tanggal + '|' + (h.uraian_aktivitas || '')));
        await storageSet({ monevhub_history: currentLogs });
        render();
        toast(`Berhasil menghapus ${rows.length} laporan.`);
      });
    });
  }

  // ==========================================
  // MODAL 2: REKAPITULASI AI BULANAN
  // ==========================================
  async function openAiRecapModal() {
    const store = await storageGet(['monevhub_history', 'monevhub_export_config']);
    const allLogs = Array.isArray(store.monevhub_history) ? store.monevhub_history : [];
    const defaultLabel = store.monevhub_export_config?.bulanLabel || '';

    openModal('Rekapitulasi Bulanan AI', `
      <label class="mh-inj-lbl">Label Periode / Bulan</label>
      <input id="mh-recap-label" class="mh-inj-input" value="${esc(defaultLabel)}" placeholder="Contoh: November 2026">
      <div class="mh-inj-grid-2">
        <div>
          <label class="mh-inj-lbl">Dari Tanggal</label>
          <input id="mh-recap-start" type="date" class="mh-inj-input">
        </div>
        <div>
          <label class="mh-inj-lbl">Sampai Tanggal</label>
          <input id="mh-recap-end" type="date" class="mh-inj-input">
        </div>
      </div>
      <button type="button" id="mh-recap-run" class="mh-inj-btn" style="margin-bottom:10px;">Generate Rekap AI</button>
      <textarea id="mh-recap-out" class="mh-inj-textarea" rows="8" placeholder="Hasil sintesis rekapitulasi bulanan akan muncul di sini..."></textarea>
      <button type="button" id="mh-recap-copy" class="mh-inj-btn mh-inj-btn-sec">Salin Teks Rekap</button>
    `, () => {
      document.getElementById('mh-recap-run')?.addEventListener('click', async () => {
        const start = document.getElementById('mh-recap-start').value;
        const end = document.getElementById('mh-recap-end').value;
        const label = document.getElementById('mh-recap-label').value.trim();
        const logs = filterLogs(allLogs, { start, end, skipWeekend: false, skipAbsent: false, skipEmpty: true });
        if (!logs.length) return toast('Tidak ada laporan berisi uraian pada rentang tersebut.');
        const btn = document.getElementById('mh-recap-run');
        btn.disabled = true;
        btn.textContent = 'Menyusun Rekap AI...';
        try {
          const text = await window.MonevHubAI.generateMonthlyRecap(logs, label);
          document.getElementById('mh-recap-out').value = text || '';
          toast('Rekap AI berhasil dibuat!');
        } catch (err) {
          toast('Gagal Rekap AI: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Generate Rekap AI';
        }
      });

      document.getElementById('mh-recap-copy')?.addEventListener('click', async () => {
        const val = document.getElementById('mh-recap-out').value;
        if (!val) return toast('Belum ada teks rekap.');
        try {
          await navigator.clipboard.writeText(val);
          toast('Teks rekap disalin!');
        } catch (e) {
          toast('Salin manual dari kotak teks.');
        }
      });
    });
  }

  // ==========================================
  // MODAL 3: STATISTIK KEHADIRAN & KESIAPAN EKSPOR
  // ==========================================
  async function openAttendanceStatsModal() {
    const store = await storageGet(['monevhub_history', 'monevhub_periods']);
    const logs = Array.isArray(store.monevhub_history) ? store.monevhub_history : [];
    const periods = Array.isArray(store.monevhub_periods?.periods) ? store.monevhub_periods.periods : [];

    let hadir = 0, izin = 0, sakit = 0, alpa = 0, ready = 0;
    logs.forEach(h => {
      const st = getLogStatus(h).toLowerCase();
      if (st.includes('izin')) izin++;
      else if (st.includes('sakit')) sakit++;
      else if (st.includes('alpa') || st.includes('tidak')) alpa++;
      else hadir++;
      if ((h.uraian_aktivitas || '').trim().length >= 100) ready++;
    });
    const pct = logs.length ? Math.round((ready / logs.length) * 100) : 0;

    const periodRows = periods.length
      ? periods.map(p => {
          const cnt = logs.filter(h => (h.tanggal || '') >= p.start && (h.tanggal || '') <= p.end).length;
          return `<div class="mh-inj-row"><span>${esc(p.label || p.id)}</span><strong>${cnt} laporan</strong></div>`;
        }).join('')
      : '<div style="font-size:12px;color:#64748b;">Belum ada periode tersinkron.</div>';

    openModal('Statistik Kehadiran & Kesiapan Ekspor', `
      <div class="mh-stat-grid">
        <div class="mh-stat-box"><div class="mh-stat-num" style="color:#059669;">${hadir}</div><div class="mh-stat-lbl">Hadir</div></div>
        <div class="mh-stat-box"><div class="mh-stat-num" style="color:#d97706;">${izin + sakit}</div><div class="mh-stat-lbl">Izin / Sakit</div></div>
        <div class="mh-stat-box"><div class="mh-stat-num" style="color:#dc2626;">${alpa}</div><div class="mh-stat-lbl">Alpa</div></div>
        <div class="mh-stat-box"><div class="mh-stat-num" style="color:#2563eb;">${pct}%</div><div class="mh-stat-lbl">Siap Ekspor (&ge;100 char)</div></div>
      </div>
      <strong style="font-size:12.5px;color:#0f172a;display:block;margin-bottom:6px;">Rekap per Periode</strong>
      ${periodRows}
    `);
  }

  // ==========================================
  // MODAL 4: KONFIGURASI ENGINE AI
  // ==========================================
  async function openAiSettingsModal() {
    if (!window.MonevHubAI) return toast('MonevHubAI belum dimuat.');
    const cfg = await window.MonevHubAI.getConfig();

    openModal('Konfigurasi Engine AI', `
      <label class="mh-inj-lbl">Mode Engine AI</label>
      <select id="mh-ai-mode" class="mh-inj-select">
        <option value="injected" ${cfg.mode === 'injected' ? 'selected' : ''}>Injected Server (Zero Config)</option>
        <option value="api_key" ${cfg.mode === 'api_key' ? 'selected' : ''}>API Key Pribadi</option>
        <option value="oauth" ${cfg.mode === 'oauth' ? 'selected' : ''}>OAuth Token</option>
      </select>
      <div id="mh-ai-injected-box" style="display:${cfg.mode === 'injected' ? 'block' : 'none'};background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:10px;margin-bottom:8px;font-size:11.5px;color:#065f46;line-height:1.45;">
        <strong>Siap Pakai &amp; Terproteksi:</strong> API key disediakan dan dikelola langsung oleh penyedia layanan secara aman di sisi server.
      </div>
      <div id="mh-ai-apikey-box" style="display:${cfg.mode === 'api_key' ? 'block' : 'none'};">
        <label class="mh-inj-lbl">Provider Gateway</label>
        <select id="mh-ai-gw" class="mh-inj-select">
          <option value="gemini" ${cfg.gateway === 'gemini' ? 'selected' : ''}>Google Gemini</option>
          <option value="openai" ${cfg.gateway === 'openai' ? 'selected' : ''}>OpenAI</option>
          <option value="deepseek" ${cfg.gateway === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
          <option value="groq" ${cfg.gateway === 'groq' ? 'selected' : ''}>Groq Cloud</option>
          <option value="custom" ${cfg.gateway === 'custom' ? 'selected' : ''}>Custom OpenAI URL</option>
        </select>
        <label class="mh-inj-lbl">API Key</label>
        <input id="mh-ai-key" type="password" class="mh-inj-input" value="${esc(cfg.apiKey)}" placeholder="Masukkan API Key...">
        <label class="mh-inj-lbl">Model</label>
        <input id="mh-ai-model" class="mh-inj-input" value="${esc(cfg.model)}" placeholder="gemini-2.5-flash">
        <label class="mh-inj-lbl">Custom Base URL (Opsional)</label>
        <input id="mh-ai-url" class="mh-inj-input" value="${esc(cfg.baseUrl)}" placeholder="https://openrouter.ai/api/v1">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-bottom:8px;font-size:11px;color:#475569;line-height:1.4;">
          <strong>Panduan API Key:</strong> Gemini gratis di <code>aistudio.google.com/apikey</code>; OpenAI/DeepSeek/Groq melalui menu <em>API Keys</em> di dashboard developer masing-masing.
        </div>
      </div>
      <div id="mh-ai-oauth-box" style="display:${cfg.mode === 'oauth' ? 'block' : 'none'};">
        <label class="mh-inj-lbl">OAuth Bearer Token</label>
        <input id="mh-ai-oauth" type="password" class="mh-inj-input" value="${esc(cfg.oauthToken || '')}" placeholder="ya29... / session token">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px;margin-bottom:8px;font-size:11px;color:#1e40af;line-height:1.4;">
          <strong>Panduan OAuth:</strong> Ambil Access Token melalui OAuth Playground / portal OAuth provider Anda. Token hanya disimpan lokal di perangkat.
        </div>
      </div>
      <button type="button" id="mh-ai-save" class="mh-inj-btn">Simpan Pengaturan AI</button>
    `, () => {
      const modeEl = document.getElementById('mh-ai-mode');
      const injEl = document.getElementById('mh-ai-injected-box');
      const boxEl = document.getElementById('mh-ai-apikey-box');
      const oauthEl = document.getElementById('mh-ai-oauth-box');
      modeEl?.addEventListener('change', () => {
        injEl.style.display = modeEl.value === 'injected' ? 'block' : 'none';
        boxEl.style.display = modeEl.value === 'api_key' ? 'block' : 'none';
        oauthEl.style.display = modeEl.value === 'oauth' ? 'block' : 'none';
      });
      document.getElementById('mh-ai-save')?.addEventListener('click', async () => {
        const next = {
          ...cfg,
          mode: modeEl.value,
          gateway: document.getElementById('mh-ai-gw').value,
          apiKey: document.getElementById('mh-ai-key').value.trim(),
          model: document.getElementById('mh-ai-model').value.trim() || 'gemini-2.5-flash',
          baseUrl: document.getElementById('mh-ai-url').value.trim(),
          oauthToken: document.getElementById('mh-ai-oauth').value.trim()
        };
        await window.MonevHubAI.saveConfig(next);
        toast('Pengaturan AI berhasil disimpan!');
        closeModal();
      });
    });
  }

  // ==========================================
  // MODAL 5: TEMPLATE LAPORAN & TANDA TANGAN (TTD PNG)
  // ==========================================
  async function openExportTemplateModal() {
    if (!window.MonevHubExport) return toast('MonevHubExport belum dimuat.');
    const cfg = await window.MonevHubExport.getConfig();
    const tpls = Object.values(window.MonevHubExport.TEMPLATES);

    const sigHtml = (cfg.signatures || []).map((s, i) => `
      <div class="mh-log-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:12px;">Blok TTD ${i + 1}</strong>
          <label style="font-size:11px;"><input type="checkbox" id="mh-sig-en-${i}" ${s.enabled ? 'checked' : ''}> Aktif</label>
        </div>
        <input id="mh-sig-jab-${i}" class="mh-inj-input" value="${esc(s.jabatan)}" placeholder="Jabatan">
        <input id="mh-sig-nama-${i}" class="mh-inj-input" value="${esc(s.nama)}" placeholder="Nama Lengkap">
        <input id="mh-sig-nip-${i}" class="mh-inj-input" value="${esc(s.nip)}" placeholder="NIP / ID (opsional)">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;">
          <label><input type="checkbox" id="mh-sig-useimg-${i}" ${s.useImage ? 'checked' : ''}> Pakai Gambar TTD PNG</label>
          <input type="file" id="mh-sig-file-${i}" accept="image/png,image/jpeg" style="font-size:11px;max-width:160px;">
        </div>
        <div id="mh-sig-prev-${i}" style="margin-top:4px;">
          ${s.imageDataUrl ? `<img src="${s.imageDataUrl}" style="max-height:42px;border:1px solid #cbd5e1;border-radius:6px;">` : ''}
        </div>
      </div>
    `).join('');

    openModal('Template Ekspor & Tanda Tangan', `
      <label class="mh-inj-lbl">Pilih Template Dokumen</label>
      <select id="mh-exp-tpl" class="mh-inj-select">
        ${tpls.map(t => `<option value="${esc(t.id)}" ${cfg.templateId === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
      </select>
      <div class="mh-inj-grid-2">
        <div>
          <label class="mh-inj-lbl">Orientasi Kertas</label>
          <select id="mh-exp-ori" class="mh-inj-select">
            <option value="landscape" ${cfg.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
            <option value="portrait" ${cfg.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
          </select>
        </div>
        <div>
          <label class="mh-inj-lbl">Bulan / Periode</label>
          <input id="mh-exp-bln" class="mh-inj-input" value="${esc(cfg.bulanLabel)}" placeholder="November 2026">
        </div>
      </div>
      <label class="mh-inj-lbl">Nama Peserta</label>
      <input id="mh-exp-nama" class="mh-inj-input" value="${esc(cfg.pesertaNama)}" placeholder="Nama Peserta">
      <div class="mh-inj-grid-2">
        <div>
          <label class="mh-inj-lbl">Instansi / Perusahaan</label>
          <input id="mh-exp-inst" class="mh-inj-input" value="${esc(cfg.instansi)}" placeholder="Nama Instansi">
        </div>
        <div>
          <label class="mh-inj-lbl">Bagian / Unit</label>
          <input id="mh-exp-unit" class="mh-inj-input" value="${esc(cfg.bagianUnit)}" placeholder="Divisi / Unit">
        </div>
      </div>
      <div class="mh-inj-grid-2">
        <div>
          <label class="mh-inj-lbl">Kota TTD</label>
          <input id="mh-exp-kota" class="mh-inj-input" value="${esc(cfg.ttdKota)}" placeholder="Jakarta">
        </div>
        <div>
          <label class="mh-inj-lbl">Tanggal TTD</label>
          <input id="mh-exp-tgl" class="mh-inj-input" value="${esc(cfg.ttdTanggal)}" placeholder="30 November 2026">
        </div>
      </div>
      <label style="display:block;font-size:12px;margin:6px 0 8px;"><input type="checkbox" id="mh-exp-showsig" ${cfg.showSignature !== false ? 'checked' : ''}> Tampilkan Blok Tanda Tangan</label>
      ${sigHtml}
      <button type="button" id="mh-exp-save" class="mh-inj-btn">Simpan Template &amp; TTD</button>
    `, () => {
      const sigImages = (cfg.signatures || []).map(s => s.imageDataUrl || '');
      [0, 1, 2].forEach(i => {
        document.getElementById(`mh-sig-file-${i}`)?.addEventListener('change', e => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            sigImages[i] = String(reader.result || '');
            document.getElementById(`mh-sig-useimg-${i}`).checked = true;
            document.getElementById(`mh-sig-prev-${i}`).innerHTML = `<img src="${sigImages[i]}" style="max-height:42px;border:1px solid #cbd5e1;border-radius:6px;">`;
          };
          reader.readAsDataURL(f);
        });
      });

      document.getElementById('mh-exp-save')?.addEventListener('click', async () => {
        const next = {
          ...cfg,
          templateId: document.getElementById('mh-exp-tpl').value,
          orientation: document.getElementById('mh-exp-ori').value,
          bulanLabel: document.getElementById('mh-exp-bln').value.trim(),
          pesertaNama: document.getElementById('mh-exp-nama').value.trim(),
          instansi: document.getElementById('mh-exp-inst').value.trim(),
          bagianUnit: document.getElementById('mh-exp-unit').value.trim(),
          ttdKota: document.getElementById('mh-exp-kota').value.trim(),
          ttdTanggal: document.getElementById('mh-exp-tgl').value.trim(),
          showSignature: document.getElementById('mh-exp-showsig').checked,
          signatures: [0, 1, 2].map(i => ({
            ...cfg.signatures[i],
            enabled: document.getElementById(`mh-sig-en-${i}`).checked,
            jabatan: document.getElementById(`mh-sig-jab-${i}`).value.trim(),
            nama: document.getElementById(`mh-sig-nama-${i}`).value.trim(),
            nip: document.getElementById(`mh-sig-nip-${i}`).value.trim(),
            useImage: document.getElementById(`mh-sig-useimg-${i}`).checked,
            imageDataUrl: sigImages[i]
          }))
        };
        await window.MonevHubExport.saveConfig(next);
        toast('Pengaturan template & TTD berhasil disimpan!');
        closeModal();
      });
    });
  }

  // ==========================================
  // MODAL 6: LOKASI PRESENSI & PETA
  // ==========================================
  async function openLocationModal() {
    const store = await storageGet('monevhub_location_config');
    const loc = store.monevhub_location_config || { sendLocation: true, defaultLat: '-6.200000', defaultLng: '106.816666' };

    openModal('Lokasi Presensi & Peta', `
      <label style="display:block;font-size:12px;margin-bottom:8px;">
        <input id="mh-loc-en" type="checkbox" ${loc.sendLocation !== false ? 'checked' : ''}> Sertakan Lokasi Default Saat Isi Laporan
      </label>
      <label class="mh-inj-lbl">Cari Tempat atau Tempel Link Google Maps</label>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <input id="mh-loc-search" class="mh-inj-input" style="margin-bottom:0;" placeholder="Nama kantor atau link Maps...">
        <button type="button" id="mh-loc-find" class="mh-inj-btn" style="width:auto;padding:0 14px;">Cari</button>
      </div>
      <canvas id="mh-loc-canvas" width="340" height="190" style="width:100%;height:190px;border-radius:12px;border:1px solid #cbd5e1;margin-bottom:8px;touch-action:none;"></canvas>
      <div class="mh-inj-grid-2">
        <div>
          <label class="mh-inj-lbl">Latitude</label>
          <input id="mh-loc-lat" class="mh-inj-input" value="${esc(loc.defaultLat || '-6.200000')}">
        </div>
        <div>
          <label class="mh-inj-lbl">Longitude</label>
          <input id="mh-loc-lng" class="mh-inj-input" value="${esc(loc.defaultLng || '106.816666')}">
        </div>
      </div>
      <button type="button" id="mh-loc-save" class="mh-inj-btn">Simpan Lokasi Default</button>
    `, () => {
      const latEl = document.getElementById('mh-loc-lat');
      const lngEl = document.getElementById('mh-loc-lng');
      const canvas = document.getElementById('mh-loc-canvas');
      let picker = null;

      if (window.MonevHubMap && canvas) {
        picker = new window.MonevHubMap.SlippyMapPicker(canvas, {
          lat: parseFloat(latEl.value) || -6.2,
          lng: parseFloat(lngEl.value) || 106.816666,
          zoom: 15,
          onChange: (la, ln) => {
            latEl.value = Number(la).toFixed(6);
            lngEl.value = Number(ln).toFixed(6);
          }
        });
      }

      document.getElementById('mh-loc-find')?.addEventListener('click', async () => {
        const q = document.getElementById('mh-loc-search').value.trim();
        if (!q || !window.MonevHubMap) return;
        const parsed = window.MonevHubMap.parseGoogleMapsUrl(q);
        if (parsed) {
          latEl.value = parsed.lat.toFixed(6);
          lngEl.value = parsed.lng.toFixed(6);
          if (picker) { picker.lat = parsed.lat; picker.lng = parsed.lng; picker.render(); }
          return toast('Koordinat dari link berhasil diambil!');
        }
        try {
          const items = await window.MonevHubMap.searchPlaceNominatim(q);
          if (!items.length) return toast('Lokasi tidak ditemukan.');
          const top = items[0];
          const la = parseFloat(top.lat), ln = parseFloat(top.lon);
          latEl.value = la.toFixed(6);
          lngEl.value = ln.toFixed(6);
          if (picker) { picker.lat = la; picker.lng = ln; picker.render(); }
          toast('Lokasi ditemukan: ' + (top.display_name || q).slice(0, 45));
        } catch (err) {
          toast('Gagal mencari lokasi.');
        }
      });

      document.getElementById('mh-loc-save')?.addEventListener('click', async () => {
        await storageSet({
          monevhub_location_config: {
            sendLocation: document.getElementById('mh-loc-en').checked,
            defaultLat: latEl.value.trim(),
            defaultLng: lngEl.value.trim()
          }
        });
        toast('Lokasi default presensi disimpan!');
        closeModal();
      });
    });
  }

  // ==========================================
  // MODAL 7: DETAIL LISENSI & PERANGKAT
  // ==========================================
  async function openLicenseModal() {
    if (!window.MonevHubLicense) return;
    const res = await window.MonevHubLicense.verify(false);
    const dev = window.MonevHubLicense.detectDeviceLabel();
    const lic = res.license || {};

    openModal('Detail Lisensi & Perangkat', `
      <div class="mh-inj-row"><span>Status</span><span class="mh-pill ${res.valid ? 'mh-pill-ok' : 'mh-pill-err'}">${res.valid ? 'AKTIF' : 'TIDAK AKTIF'}</span></div>
      <div class="mh-inj-row"><span>Perangkat</span><strong>${esc(dev)}</strong></div>
      <div class="mh-inj-row"><span>Pemilik</span><strong>${esc(lic.userName || '-')}</strong></div>
      <div class="mh-inj-row"><span>Kunci</span><strong>${esc(lic.key ? lic.key.slice(0, 7) + '••••' : '-')}</strong></div>
      <div class="mh-inj-grid-2" style="margin-top:12px;">
        <button type="button" id="mh-lic-reverify" class="mh-inj-btn">Verifikasi Ulang</button>
        <button type="button" id="mh-lic-reset" class="mh-inj-btn mh-inj-btn-danger">Reset Lisensi</button>
      </div>
    `, () => {
      document.getElementById('mh-lic-reverify')?.addEventListener('click', async () => {
        const check = await window.MonevHubLicense.verify(true);
        toast(check.valid ? 'Lisensi valid dan aktif!' : (check.message || 'Lisensi tidak valid.'));
        closeModal();
      });
      document.getElementById('mh-lic-reset')?.addEventListener('click', async () => {
        if (!confirm('Reset lisensi dari perangkat ini?')) return;
        await window.MonevHubLicense.clearLicense();
        closeModal();
        ensureLicenseGate();
      });
    });
  }

  function menuCard(id, badge, colorBg, colorFg, title, desc) {
    return `
      <button type="button" id="${id}" class="mh-km-menu">
        <div class="mh-km-left">
          <div class="mh-km-icon" style="background:${colorBg};color:${colorFg};">${badge}</div>
          <div>
            <div style="font-size:13.5px;font-weight:700;color:#0f172a;">${title}</div>
            <div style="font-size:11.5px;color:#64748b;">${desc}</div>
          </div>
        </div>
        <span style="color:#94a3b8;font-weight:700;">&rsaquo;</span>
      </button>
    `;
  }

  function getMountTarget() {
    return document.querySelector('main, .v-main, #app .container, #app') || document.body;
  }

  async function injectForCurrentRoute() {
    const ok = await ensureLicenseGate();
    if (!ok) return;

    renameAkunTab();
    attachCharCounters();
    scheduleMobileAutoSync();

    const path = window.location.pathname.toLowerCase();
    const target = getMountTarget();
    if (!target) return;

    document.querySelectorAll('.mh-route-block').forEach(el => {
      if (el.dataset.route !== path) el.remove();
    });
    if (document.querySelector(`.mh-route-block[data-route="${path}"]`)) return;

    const wrap = document.createElement('div');
    wrap.className = 'mh-route-block';
    wrap.dataset.route = path;
    wrap.style.padding = '0 14px 28px';

    if (path.includes('riwayat')) {
      wrap.innerHTML = `
        <div class="mh-km-card">
          <div class="mh-inj-head">
            <strong>Isi Laporan Harian AI</strong>
            <span class="mh-inj-tag">Asisten</span>
          </div>
          <select id="mh-mob-presensi" class="mh-inj-select">
            <option value="Hadir" selected>Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
          </select>
          <textarea id="mh-mob-act" class="mh-inj-textarea" rows="2" placeholder="Poin kegiatan hari ini..."></textarea>
          <button type="button" id="mh-mob-fill" class="mh-inj-btn">Generate &amp; Terapkan ke Form</button>
          <div class="mh-inj-grid-2" style="margin-top:8px;">
            <button type="button" id="mh-open-log-riwayat" class="mh-inj-btn mh-inj-btn-sec">Log &amp; Ekspor PDF/Word</button>
            <button type="button" id="mh-open-recap-riwayat" class="mh-inj-btn mh-inj-btn-sec">Rekap AI Bulanan</button>
          </div>
        </div>
      `;
      target.appendChild(wrap);

      const presEl = document.getElementById('mh-mob-presensi');
      const actEl = document.getElementById('mh-mob-act');
      presEl?.addEventListener('change', () => {
        if (presEl.value === 'Izin') actEl.placeholder = 'Alasan / keterangan izin...';
        else if (presEl.value === 'Sakit') actEl.placeholder = 'Keterangan / kondisi sakit...';
        else actEl.placeholder = 'Poin kegiatan hari ini...';
      });

      document.getElementById('mh-mob-fill')?.addEventListener('click', async () => {
        const raw = (actEl?.value || '').trim();
        if (!raw) return toast('Isi poin kegiatan terlebih dahulu.');
        const areas = Array.from(document.querySelectorAll('textarea')).filter(t => !t.closest('.mh-km-card') && !t.closest('.mh-modal-card'));
        if (areas.length < 3) return toast('Buka form laporan pada salah satu tanggal terlebih dahulu.');
        const btn = document.getElementById('mh-mob-fill');
        btn.disabled = true;
        btn.textContent = 'Memproses AI...';
        try {
          const rep = window.MonevHubAI
            ? await window.MonevHubAI.generateDailyReport({ rawKegiatan: raw, hasKendala: false, presensi: presEl.value })
            : {
                uraian_aktivitas: `Melaksanakan ${raw} secara tertib, terstruktur, dan profesional sesuai prosedur operasional instansi hingga tuntas.`,
                pembelajaran: 'Meningkatkan ketelitian teknis, pemahaman alur kerja, dan koordinasi tim selama pelaksanaan tugas.',
                kendala: 'Seluruh kegiatan terlaksana lancar dan tertib tanpa hambatan teknis yang berarti.'
              };
          setNativeValue(areas[0], rep.uraian_aktivitas);
          setNativeValue(areas[1], rep.pembelajaran);
          setNativeValue(areas[2], rep.kendala);
          toast('Form laporan Monev berhasil diisi!');
        } catch (err) {
          toast('Gagal AI: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Generate & Terapkan ke Form';
        }
      });

      document.getElementById('mh-open-log-riwayat')?.addEventListener('click', openHistoryExportModal);
      document.getElementById('mh-open-recap-riwayat')?.addEventListener('click', openAiRecapModal);

    } else if (path.includes('perkembangan')) {
      wrap.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#64748b;margin:8px 0 4px;">ASISTEN MONEVHUB</div>
        ${menuCard('mh-menu-log', 'PDF', '#eff6ff', '#2563eb', 'Log Riwayat & Ekspor PDF/Word', 'Filter tanggal, hapus data, cetak PDF & DOCX')}
        ${menuCard('mh-menu-recap', 'AI', '#f5f3ff', '#7c3aed', 'Ringkasan & Rekapitulasi AI', 'Buat rangkuman evaluasi bulanan otomatis')}
        ${menuCard('mh-menu-stats', '%', '#ecfdf5', '#059669', 'Statistik Kehadiran & Kesiapan', 'Pantau Hadir, Izin, Sakit, Alpa & kesiapan ekspor')}
      `;
      target.appendChild(wrap);
      document.getElementById('mh-menu-log')?.addEventListener('click', openHistoryExportModal);
      document.getElementById('mh-menu-recap')?.addEventListener('click', openAiRecapModal);
      document.getElementById('mh-menu-stats')?.addEventListener('click', openAttendanceStatsModal);

    } else if (path.includes('akun') || path.includes('profil')) {
      let perms = { gps: false, storage: false, notification: false };
      try {
        if (window.AndroidBridge) perms = JSON.parse(window.AndroidBridge.checkPermissions());
      } catch (e) {}

      wrap.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#64748b;margin:8px 0 4px;">PENGATURAN MONEVHUB</div>
        ${menuCard('mh-set-ai', 'AI', '#eff6ff', '#2563eb', 'Konfigurasi Engine AI', 'Pilih Injected, API Key (Gemini/OpenAI/Groq), atau OAuth')}
        ${menuCard('mh-set-tpl', 'TTD', '#ecfdf5', '#059669', 'Template Laporan & TTD PNG', 'Pilih 3 template PDF/Word, instansi, dan unggah TTD')}
        ${menuCard('mh-set-loc', 'GPS', '#fff7ed', '#ea580c', 'Lokasi Presensi & Peta', 'Atur koordinat default via peta atau link Google Maps')}
        ${menuCard('mh-set-lic', 'KEY', '#f5f3ff', '#7c3aed', 'Detail Lisensi & Perangkat', 'Cek aktivasi perangkat dan reset lisensi')}
        <div class="mh-km-card">
          <div class="mh-inj-head">
            <strong>Cek Akses &amp; Izin Perangkat</strong>
            <span class="mh-inj-tag">Android</span>
          </div>
          <div class="mh-inj-row"><span>Lokasi / GPS</span><span class="mh-pill ${perms.gps ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.gps ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-row"><span>Penyimpanan / Unduhan</span><span class="mh-pill ${perms.storage ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.storage ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-row"><span>Notifikasi</span><span class="mh-pill ${perms.notification ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.notification ? 'Diizinkan' : 'Belum'}</span></div>
          <button type="button" id="mh-mob-req-perms" class="mh-inj-btn" style="margin-top:8px;">Minta Semua Izin Akses</button>
          <button type="button" id="mh-mob-test-notif" class="mh-inj-btn mh-inj-btn-sec" style="margin-top:6px;">Tes Notifikasi Pengingat Absen</button>
        </div>
      `;
      target.appendChild(wrap);
      document.getElementById('mh-set-ai')?.addEventListener('click', openAiSettingsModal);
      document.getElementById('mh-set-tpl')?.addEventListener('click', openExportTemplateModal);
      document.getElementById('mh-set-loc')?.addEventListener('click', openLocationModal);
      document.getElementById('mh-set-lic')?.addEventListener('click', openLicenseModal);
      document.getElementById('mh-mob-req-perms')?.addEventListener('click', () => {
        if (window.AndroidBridge) window.AndroidBridge.requestAllPermissions();
      });
      document.getElementById('mh-mob-test-notif')?.addEventListener('click', () => {
        if (window.AndroidBridge && window.AndroidBridge.triggerTestNotification) {
          window.AndroidBridge.triggerTestNotification();
        }
      });

    } else {
      const autoDev = window.MonevHubLicense ? window.MonevHubLicense.detectDeviceLabel() : 'HP - Android';
      wrap.innerHTML = `
        <div class="mh-km-card">
          <div class="mh-inj-head">
            <strong>Ringkasan Asisten MonevHub</strong>
            <span class="mh-pill mh-pill-ok">AKTIF</span>
          </div>
          <div style="font-size:12px;color:#334155;display:grid;gap:6px;">
            <div style="display:flex;justify-content:space-between;"><span>Perangkat</span><strong>${esc(autoDev)}</strong></div>
            <div class="mh-inj-grid-2" style="margin-top:4px;">
              <button type="button" id="mh-home-log" class="mh-inj-btn mh-inj-btn-sec">Log &amp; Ekspor</button>
              <button type="button" id="mh-home-stats" class="mh-inj-btn mh-inj-btn-sec">Statistik</button>
            </div>
          </div>
        </div>
      `;
      target.appendChild(wrap);
      document.getElementById('mh-home-log')?.addEventListener('click', openHistoryExportModal);
      document.getElementById('mh-home-stats')?.addEventListener('click', openAttendanceStatsModal);
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
  injectForCurrentRoute();
})();
