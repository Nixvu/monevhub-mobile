/**
 * MonevHub Mobile In-Page DOM Injector (Full Feature Parity)
 * Menyisipkan UI bersih + License Gate + AI + Export PDF/Word + Peta + Template TTD + Permissions
 */
(function () {
  'use strict';
  if (window.__mhMobileInjected) return;
  window.__mhMobileInjected = true;

  // Bypass CORS WebView untuk panggilan API eksternal (GAS Lisensi, Gemini/OpenAI/Groq, Peta)
  if (window.AndroidBridge && window.AndroidBridge.httpRequest && !window.__mhFetchPatched) {
    window.__mhFetchPatched = true;
    const origFetch = window.fetch.bind(window);
    const EXTERNAL_HOSTS = [
      'script.google.com',
      'script.googleusercontent.com',
      'generativelanguage.googleapis.com',
      'api.openai.com',
      'api.deepseek.com',
      'api.groq.com',
      'openrouter.ai',
      'nominatim.openstreetmap.org',
      'photon.komoot.io'
    ];
    window.fetch = async function (input, init = {}) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isExternal = EXTERNAL_HOSTS.some(h => url.includes(h));
      if (!isExternal) {
        return origFetch(input, init);
      }
      const method = (init.method || (input && input.method) || 'GET').toUpperCase();
      let hdrs = {};
      if (init.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => { hdrs[k] = v; });
        } else if (typeof init.headers === 'object') {
          hdrs = { ...init.headers };
        }
      }
      const body = typeof init.body === 'string' ? init.body : (init.body ? String(init.body) : '');
      const raw = window.AndroidBridge.httpRequest(url, method, body, JSON.stringify(hdrs));
      const parsed = JSON.parse(raw || '{}');
      if (parsed.status === 0 && parsed.error) {
        throw new TypeError(parsed.error);
      }
      const textBody = parsed.text || '';
      return {
        ok: Boolean(parsed.ok),
        status: parsed.status || 200,
        statusText: parsed.ok ? 'OK' : 'Error',
        text: async () => textBody,
        json: async () => JSON.parse(textBody)
      };
    };
  }

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
      .mh-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 12px 0; }
      .mh-kpi-box {
        background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px;
        box-shadow: 0 2px 6px rgba(15,23,42,0.03); display: flex; flex-direction: column; gap: 3px;
      }
      .mh-kpi-val { font-size: 17px; font-weight: 800; color: #0f172a; }
      .mh-kpi-lbl { font-size: 11px; color: #64748b; line-height: 1.3; }
      .mh-table-wrap { overflow-x: auto; }
      .mh-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
      .mh-table th { text-align: left; padding: 7px 6px; border-bottom: 1px solid #cbd5e1; color: #475569; font-weight: 700; white-space: nowrap; }
      .mh-table td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; color: #0f172a; vertical-align: middle; }
      .mh-btn-xs { padding: 4px 8px; border-radius: 7px; font-size: 10.5px; font-weight: 700; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; cursor: pointer; }
      .mh-btn-xs-pri { background: #2563eb; color: #fff; border-color: #2563eb; }
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

  const BULAN_MAP = { jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06', jul: '07', agu: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12', januari: '01', februari: '02', maret: '03', april: '04', juni: '06', juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12' };

  function parseIndoDateIso(str) {
    const m = String(str || '').toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
    if (!m) return '';
    const mon = BULAN_MAP[m[2]] || BULAN_MAP[m[2].slice(0, 3)];
    if (!mon) return '';
    return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }

  function shiftIsoMonths(iso, delta) {
    const p = String(iso || '').split('-').map(Number);
    if (p.length !== 3) return iso;
    const d = new Date(p[0], p[1] - 1 + delta, p[2]);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function collectCalendarAndPeriodSync() {
    const labelEl = document.querySelector('.ui-period-switcher__label');
    if (!labelEl) return;
    const raw = (labelEl.textContent || '').replace(/\s+/g, ' ').trim();
    const pMatch = raw.match(/Periode\s+(\d+)/i);
    const activeNum = pMatch ? parseInt(pMatch[1], 10) : 1;
    const rangeParts = raw.replace(/Periode\s+\d+/i, '').trim().split(/\s*[-–]\s*/);
    const startIso = parseIndoDateIso(rangeParts[0] || '');
    const endIso = parseIndoDateIso(rangeParts[1] || '');

    if (startIso && endIso) {
      const store = await storageGet('monevhub_periods');
      const prevLen = (store.monevhub_periods?.periods || []).length;
      const nextBtn = document.querySelector('button[aria-label="Periode berikutnya"]');
      const maxP = (nextBtn && nextBtn.disabled) ? activeNum : Math.max(activeNum, prevLen || activeNum);
      const periods = [];
      for (let i = 1; i <= maxP; i++) {
        const delta = i - activeNum;
        const s = shiftIsoMonths(startIso, delta);
        const e = shiftIsoMonths(endIso, delta);
        periods.push({ id: `P${i}`, num: i, name: `Periode ${i}`, start: s, end: e, label: `${s} s/d ${e}` });
      }
      await storageSet({ monevhub_periods: { periods, activePeriodNum: activeNum, updatedAt: Date.now() } });
    }

    const dayButtons = Array.from(document.querySelectorAll('button.calendar-day-button')).filter(b => b.offsetParent !== null);
    if (dayButtons.length > 0) {
      const summary = { id: `P${activeNum}`, name: `Periode ${activeNum}`, start: startIso, end: endIso, hadir: 0, sakit: 0, izin: 0, alpha: 0, libur: 0, belumDiisi: 0, updatedAt: Date.now() };
      dayButtons.forEach(btn => {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        const td = btn.closest('td');
        if ((td && (td.classList.contains('scheduled-off-day') || td.classList.contains('api-holiday'))) || aria.includes('libur')) summary.libur++;
        else if (aria.includes('sakit')) summary.sakit++;
        else if (aria.includes('izin')) summary.izin++;
        else if (aria.includes('tidak hadir') || aria.includes('alpha') || aria.includes('ditolak')) summary.alpha++;
        else if (aria.includes('hadir')) summary.hadir++;
        else summary.belumDiisi++;
      });
      const st = await storageGet('monevhub_attendance_summary');
      const map = st.monevhub_attendance_summary || {};
      map[`P${activeNum}`] = summary;
      await storageSet({ monevhub_attendance_summary: map });
    }
  }

  async function scrapeActivePeriodForMobile(showNotice) {
    const btns = Array.from(document.querySelectorAll('button.calendar-day-button')).filter(b => b.offsetParent !== null);
    if (!btns.length) return 0;
    const filled = btns.filter(b => {
      const a = (b.getAttribute('aria-label') || '').toLowerCase();
      return (a.includes('hadir') || a.includes('izin') || a.includes('sakit')) && !a.includes('belum diisi');
    });
    if (!filled.length) {
      if (showNotice) toast('Belum ada laporan terisi di periode ini.');
      return 0;
    }
    const store = await storageGet('monevhub_history');
    const history = Array.isArray(store.monevhub_history) ? store.monevhub_history : [];
    let added = 0;

    for (const btn of filled) {
      const aria = btn.getAttribute('aria-label') || '';
      const iso = parseIndoDateIso(aria);
      if (!iso) continue;
      btn.click();
      await new Promise(r => setTimeout(r, 420));
      const areas = Array.from(document.querySelectorAll('textarea')).filter(t => !t.closest('.mh-km-card') && !t.closest('.mh-modal-card'));
      let uraian = '', pembelajaran = '', kendala = '';
      if (areas.length >= 3) {
        uraian = (areas[0].value || '').trim();
        pembelajaran = (areas[1].value || '').trim();
        kendala = (areas[2].value || '').trim();
      } else {
        const bodyTxt = (document.body.innerText || '');
        const uMatch = bodyTxt.match(/Uraian Aktivitas\s*\n+([^\n]+)/i);
        if (uMatch) uraian = uMatch[1].trim();
      }
      const presensi = /izin/i.test(aria) ? 'Izin' : (/sakit/i.test(aria) ? 'Sakit' : 'Hadir');
      if (uraian) {
        const item = { tanggal: iso, presensi, uraian, uraian_aktivitas: uraian, pembelajaran, kendala };
        const idx = history.findIndex(h => h.tanggal === iso);
        if (idx >= 0) history[idx] = item;
        else history.push(item);
        added++;
      }
    }
    history.sort((a, b) => ((a.tanggal || '') > (b.tanggal || '') ? 1 : -1));
    await storageSet({ monevhub_history: history, monevhub_last_autosync_ts: Date.now() });
    if (showNotice) toast(`Sinkronisasi selesai: ${added} laporan tersimpan.`);
    return added;
  }

  async function scheduleMobileAutoSync() {
    syncAttendanceAndProfileToAndroid();
    if (!window.location.pathname.toLowerCase().includes('riwayat')) return;
    await collectCalendarAndPeriodSync();
    if (autoSyncedOnce) return;
    const labelEl = document.querySelector('.ui-period-switcher__label');
    if (!labelEl) return;
    autoSyncedOnce = true;
    try {
      const text = (labelEl.textContent || '').trim();
      await storageSet({ monevhub_mobile_last_period: text, monevhub_last_autosync_ts: Date.now() });
      const st = await storageGet('monevhub_history');
      const forceSync = window.location.search.includes('mh_sync=1');
      if (forceSync || !Array.isArray(st.monevhub_history) || st.monevhub_history.length === 0) {
        setTimeout(() => { scrapeActivePeriodForMobile(forceSync).catch(() => {}); }, 700);
      }
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

  function getLogText(h) {
    return (h.uraian || h.uraian_aktivitas || '').trim();
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
      if (skipEmpty && !getLogText(h)) return false;
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
            <div style="font-size:11.5px;color:#334155;line-height:1.4;">${esc((getLogText(h) || '(Belum diisi)').slice(0, 140))}</div>
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
        const removeSet = new Set(rows.map(r => r.tanggal + '|' + getLogText(r)));
        currentLogs = currentLogs.filter(h => !removeSet.has(h.tanggal + '|' + getLogText(h)));
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
      if (getLogText(h).length >= 100) ready++;
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
            <button type="button" id="mh-riwayat-sync" class="mh-btn-xs">Sinkron Data</button>
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

      document.getElementById('mh-riwayat-sync')?.addEventListener('click', async () => {
        await collectCalendarAndPeriodSync();
        await scrapeActivePeriodForMobile(true);
      });

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
                uraian_aktivitas: `Melaksanakan ${raw} secara tertib, terstruktur, dan profesional sesuai prosedur operasional hingga tuntas.`,
                pembelajaran: 'Meningkatkan ketelitian teknis, pemahaman alur kerja, dan koordinasi tim selama pelaksanaan tugas.',
                kendala: 'Seluruh kegiatan terlaksana lancar dan tertib tanpa hambatan teknis yang berarti.'
              };
          setNativeValue(areas[0], rep.uraian_aktivitas);
          setNativeValue(areas[1], rep.pembelajaran);
          setNativeValue(areas[2], rep.kendala);
          toast('Form laporan berhasil diisi!');
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
        ${menuCard('mh-menu-log', 'PDF', '#eff6ff', '#2563eb', 'Log Riwayat & Ekspor', 'Filter periode, cari laporan, unduh PDF/Word')}
        ${menuCard('mh-menu-recap', 'AI', '#f5f3ff', '#7c3aed', 'Rekapitulasi Bulanan AI', 'Susun evaluasi bulanan otomatis per periode')}
        ${menuCard('mh-menu-stats', '%', '#ecfdf5', '#059669', 'Statistik Kehadiran', 'Rekap Hadir, Sakit, Izin, Alpha, & Siap Ekspor')}
      `;
      target.prepend(wrap);
      document.getElementById('mh-menu-log')?.addEventListener('click', openHistoryExportModal);
      document.getElementById('mh-menu-recap')?.addEventListener('click', openAiRecapModal);
      document.getElementById('mh-menu-stats')?.addEventListener('click', openAttendanceStatsModal);

    } else if (path.includes('akun') || path.includes('profil')) {
      let perms = { gps: false, storage: false, notification: false };
      try {
        if (window.AndroidBridge) perms = JSON.parse(window.AndroidBridge.checkPermissions());
      } catch (e) {}

      // Sembunyikan kartu "Notifikasi perangkat" bawaan web agar menyatu dengan kartu Android
      document.querySelectorAll('div, section, article').forEach(el => {
        if (el.closest('.mh-route-block')) return;
        const txt = (el.innerText || '').toLowerCase();
        if (txt.includes('notifikasi perangkat') && txt.includes('browser ini tidak mendukung') && txt.length < 180) {
          el.style.display = 'none';
        }
      });

      wrap.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:#64748b;margin:8px 0 4px;">PENGATURAN MONEVHUB</div>
        ${menuCard('mh-set-ai', 'AI', '#eff6ff', '#2563eb', 'Konfigurasi Engine AI', 'Pilih Injected, API Key (Gemini/OpenAI/Groq), atau OAuth')}
        ${menuCard('mh-set-tpl', 'TTD', '#ecfdf5', '#059669', 'Template Laporan & TTD PNG', 'Pilih 3 template PDF/Word, instansi, dan unggah TTD')}
        ${menuCard('mh-set-loc', 'GPS', '#fff7ed', '#ea580c', 'Lokasi Presensi & Peta', 'Atur koordinat default via peta atau link Google Maps')}
        ${menuCard('mh-set-lic', 'KEY', '#f5f3ff', '#7c3aed', 'Detail Lisensi & Perangkat', 'Cek aktivasi perangkat dan reset lisensi')}
        <div class="mh-km-card">
          <div class="mh-inj-head">
            <strong>Notifikasi &amp; Izin Perangkat</strong>
            <span class="mh-inj-tag">Android</span>
          </div>
          <div class="mh-inj-row"><span>Pengingat Absen (17:00 WIB)</span><span class="mh-pill mh-pill-ok">Aktif</span></div>
          <div class="mh-inj-row"><span>Lokasi / GPS</span><span class="mh-pill ${perms.gps ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.gps ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-row"><span>Penyimpanan / Unduhan</span><span class="mh-pill ${perms.storage ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.storage ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-row"><span>Notifikasi</span><span class="mh-pill ${perms.notification ? 'mh-pill-ok' : 'mh-pill-warn'}">${perms.notification ? 'Diizinkan' : 'Belum'}</span></div>
          <div class="mh-inj-grid-2" style="margin-top:8px;">
            <button type="button" id="mh-mob-req-perms" class="mh-inj-btn">Minta Izin Akses</button>
            <button type="button" id="mh-mob-test-notif" class="mh-inj-btn mh-inj-btn-sec">Tes Notifikasi</button>
          </div>
        </div>
      `;
      target.appendChild(wrap);

      // Pindahkan tombol "Keluar dari akun" ke paling bawah agar rapih
      const logoutBtn = Array.from(document.querySelectorAll('button, a')).find(b =>
        !b.closest('.mh-route-block') && /keluar dari akun/i.test((b.textContent || '').trim())
      );
      if (logoutBtn) {
        const box = document.createElement('div');
        box.style.marginTop = '14px';
        box.style.display = 'flex';
        box.style.justifyContent = 'center';
        box.appendChild(logoutBtn);
        wrap.appendChild(box);
      }

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
      // Beranda Dashboard (Match mobile/index.html: 4 KPI Cards + Tabel Rekap Absensi & Kesiapan Ekspor)
      const bodyTxt = (document.body.innerText || '').toLowerCase();
      if (path.includes('login') || (!bodyTxt.includes('hari ini') && !bodyTxt.includes('periode'))) return;

      const store = await storageGet(['monevhub_history', 'monevhub_periods', 'monevhub_attendance_summary', 'monevhub_export_config']);
      const logs = Array.isArray(store.monevhub_history) ? store.monevhub_history : [];
      const periods = Array.isArray(store.monevhub_periods?.periods) ? store.monevhub_periods.periods : [];
      const sumMap = store.monevhub_attendance_summary || {};
      const expCfg = store.monevhub_export_config || {};

      let totH = 0, totS = 0, totI = 0, totA = 0;
      const sumVals = Object.values(sumMap);
      if (sumVals.length) {
        sumVals.forEach(s => { totH += s.hadir || 0; totS += s.sakit || 0; totI += s.izin || 0; totA += s.alpha || 0; });
      } else {
        logs.forEach(h => {
          const st = getLogStatus(h).toLowerCase();
          if (st.includes('sakit')) totS++;
          else if (st.includes('izin')) totI++;
          else if (st.includes('alpa') || st.includes('tidak')) totA++;
          else totH++;
        });
      }
      const totAll = totH + totS + totI + totA;
      const pctH = totAll ? Math.round((totH / totAll) * 100) : 0;
      const readyCount = logs.filter(h => getLogText(h).length >= 100).length;
      const tplLabel = expCfg.templateId === 'tpl2' ? 'Template 2' : (expCfg.templateId === 'tpl3' ? 'Template 3' : 'Template 1');
      const oriLabel = expCfg.orientation === 'portrait' ? 'Portrait' : 'Landscape';
      const ttdLabel = expCfg.showSignature !== false ? 'TTD Aktif' : 'TTD Nonaktif';

      const rowsHtml = periods.length
        ? periods.map((p, idx) => {
            const s = sumMap[p.id] || {};
            const pLogs = logs.filter(h => (h.tanggal || '') >= p.start && (h.tanggal || '') <= p.end);
            const pReady = pLogs.filter(h => getLogText(h).length >= 100).length;
            return `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${esc(p.name)}</strong><br><span style="font-size:9.5px;color:#64748b;">${esc(p.start)}–${esc(p.end)}</span></td>
                <td style="color:#059669;font-weight:700;">${s.hadir ?? pLogs.length}</td>
                <td>${s.sakit ?? 0}</td>
                <td>${s.izin ?? 0}</td>
                <td>${s.alpha ?? 0}</td>
                <td><span class="mh-pill mh-pill-ok">${pReady}</span></td>
                <td style="white-space:nowrap;">
                  <button type="button" class="mh-btn-xs mh-btn-xs-pri mh-home-exp">Ekspor</button>
                  <button type="button" class="mh-btn-xs mh-home-recap">Rekap</button>
                </td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:12px;">Belum ada data periode. Klik <strong>Sinkron</strong> untuk mengambil data kalender.</td></tr>`;

      wrap.innerHTML = `
        <div class="mh-kpi-grid">
          <div class="mh-kpi-box">
            <span class="mh-kpi-val" style="color:#059669;">${totH} hari</span>
            <span class="mh-kpi-lbl">Hadir / Masuk (${pctH}%)</span>
          </div>
          <div class="mh-kpi-box">
            <span class="mh-kpi-val" style="color:#d97706;">${totS + totI + totA} hari</span>
            <span class="mh-kpi-lbl">${totS} Sakit &bull; ${totI} Izin &bull; ${totA} Alpha</span>
          </div>
          <div class="mh-kpi-box">
            <span class="mh-kpi-val">${readyCount}</span>
            <span class="mh-kpi-lbl">Laporan Siap Ekspor</span>
          </div>
          <div class="mh-kpi-box">
            <span class="mh-kpi-val" style="font-size:14px;padding-top:3px;">${tplLabel}</span>
            <span class="mh-kpi-lbl">A4 ${oriLabel} &bull; ${ttdLabel}</span>
          </div>
        </div>
        <div class="mh-km-card">
          <div class="mh-inj-head">
            <strong>Rekap Absensi &amp; Kesiapan Ekspor</strong>
            <button type="button" id="mh-beranda-sync" class="mh-btn-xs">Sinkron</button>
          </div>
          <div class="mh-table-wrap">
            <table class="mh-table">
              <thead>
                <tr><th>No</th><th>Periode</th><th>H</th><th>S</th><th>I</th><th>A</th><th>Siap</th><th>Aksi</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;
      target.appendChild(wrap);
      document.getElementById('mh-beranda-sync')?.addEventListener('click', () => {
        window.location.href = '/riwayat?mh_sync=1';
      });
      wrap.querySelectorAll('.mh-home-exp').forEach(b => b.addEventListener('click', openHistoryExportModal));
      wrap.querySelectorAll('.mh-home-recap').forEach(b => b.addEventListener('click', openAiRecapModal));
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
