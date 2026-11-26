/**
 * MonevHub Content Script - In-Page Automation & Floating Modal Assistant
 * Form Laporan Harian & Logbook Asisten (Vuetify / Vue 3)
 */
(function() {
  'use strict';

  console.log('[MonevHub] Content Script Loaded.');

  // Cek dan inisialisasi floating widget sesuai preferensi pengguna
  async function checkAndApplyFloatingWidget() {
    try {
      const store = await chrome.storage.local.get('monevhub_settings');
      const settings = store.monevhub_settings || {};
      const isEnabled = settings.enableFloatingWidget !== false;
      if (isEnabled) {
        initFloatingWidget();
      } else {
        removeFloatingWidget();
      }
    } catch (e) {
      initFloatingWidget();
    }
  }

  function removeFloatingWidget() {
    const el = document.getElementById('monevhub-float-widget');
    if (el) el.remove();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('load', checkAndApplyFloatingWidget);
  } else {
    checkAndApplyFloatingWidget();
  }

  // Listener storage agar perubahan toggle di pengaturan langsung sinkron seketika
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.monevhub_settings) {
      const newSettings = changes.monevhub_settings.newValue || {};
      if (newSettings.enableFloatingWidget !== false) {
        initFloatingWidget();
      } else {
        removeFloatingWidget();
      }
    }
  });

  // Observe mutasi DOM untuk mendeteksi terbukanya modal input laporan & period switcher Monev
  let lastSyncedPeriodRaw = '';
  let autoSyncTimer = null;
  let autoSyncTriggered = false;

  function scheduleAutoSyncRiwayat() {
    if (autoSyncTriggered || !window.location.href.includes('/riwayat')) return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(async () => {
      try {
        const store = await chrome.storage.local.get(['monevhub_last_autosync_ts', 'monevhub_history']);
        const lastTs = store.monevhub_last_autosync_ts || 0;
        const hasHistory = Array.isArray(store.monevhub_history) && store.monevhub_history.length > 0;
        if (hasHistory && (Date.now() - lastTs) < 3 * 60 * 1000) return;

        autoSyncTriggered = true;
        await chrome.storage.local.set({ monevhub_last_autosync_ts: Date.now() });
        await scanAllPeriodsLive().catch(() => {});
        await scrapeRange({
          mode: 'current_period',
          skipHolidays: false,
          skipAbsent: false,
          skipEmpty: false
        }).catch(() => {});
        console.log('[MonevHub] Auto-sync periode & riwayat selesai setelah login.');
      } catch (e) {}
    }, 1500);
  }

  const observer = new MutationObserver(() => {
    injectFieldBadges();
    const labelEl = document.querySelector('.ui-period-switcher__label');
    if (labelEl) {
      const raw = (labelEl.textContent || '').trim();
      if (raw && raw !== lastSyncedPeriodRaw) {
        lastSyncedPeriodRaw = raw;
        syncPeriodsFromActiveSwitcher().catch(() => {});
      }
      scheduleAutoSyncRiwayat();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  /**
   * Listener pesan runtime
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      sendResponse({ success: true, url: window.location.href });
      return true;
    }

    if (request.action === 'OPEN_INPAGE_MODAL') {
      openInpageModal();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'FILL_FORM') {
      fillMonevForm(request.data)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
    }

    if (request.action === 'SCRAPE_RIWAYAT') {
      const data = scrapeRiwayatData();
      sendResponse({ success: true, data: data });
      return true;
    }

    if (request.action === 'SCRAPE_CURRENT_PERIOD') {
      scrapeRange({
        mode: 'current_period',
        skipHolidays: true,
        skipAbsent: true,
        skipEmpty: true
      }).then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
    }

    if (request.action === 'SCRAPE_RANGE') {
      scrapeRange(request.options || {})
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
    }

    if (request.action === 'GET_DETECTED_PERIODS') {
      syncPeriodsFromActiveSwitcher()
        .then(data => sendResponse({ success: true, ...data }))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
    }

    if (request.action === 'SCAN_ALL_PERIODS') {
      scanAllPeriodsLive()
        .then(data => sendResponse({ success: true, ...data }))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
    }

    if (request.action === 'SWITCH_MONEV_PERIOD') {
      switchToTargetPeriod(request.periodNum)
        .then(ok => sendResponse({ success: ok }))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
    }

    if (request.action === 'CHECK_MODAL_STATE') {
      const textareas = getFormTextareas();
      sendResponse({
        isModalOpen: textareas.length >= 3,
        textareaCount: textareas.length
      });
      return true;
    }
  });

  /**
   * Inisialisasi widget melayang terisolasi (Draggable Bubble + Collapsible Mini-Panel)
   */
  let widgetJustDragged = false;

  function initFloatingWidget() {
    if (document.getElementById('monevhub-float-widget')) return;

    const iconUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL('icons/icon48.png') : '';
    const widget = document.createElement('div');
    widget.id = 'monevhub-float-widget';
    widget.innerHTML = `
      <button class="mh-bubble" id="mh-btn-open-popup" title="Buka Asisten MonevHub (Geser untuk pindah posisi)" style="padding:0;overflow:hidden;background:transparent;">
        ${iconUrl ? `<img src="${iconUrl}" alt="MonevHub" style="width:100%;height:100%;border-radius:14px;object-fit:cover;display:block;pointer-events:none;">` : 'M'}
      </button>

      <div class="mh-panel mh-hide" id="monevhub-inpage-panel">
        <div class="mh-modal-header" id="mh-panel-drag-handle" title="Geser panel">
          <div class="mh-header-brand">
            ${iconUrl ? `<img src="${iconUrl}" alt="MonevHub" style="width:28px;height:28px;border-radius:7px;object-fit:cover;flex-shrink:0;">` : ''}
            <div>
              <h3>Asisten MonevHub</h3>
              <span class="mh-header-sub">MonevHub AI</span>
            </div>
          </div>
          <div class="mh-header-actions">
            <button class="mh-modal-opt-btn" id="mh-btn-modal-settings" title="Buka Dashboard & Pengaturan">
              <svg class="lucide" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 7h-9"/>
                <path d="M14 17H5"/>
                <circle cx="17" cy="17" r="3"/>
                <circle cx="7" cy="7" r="3"/>
              </svg>
            </button>
            <button class="mh-modal-close" id="mh-btn-close-modal" title="Perkecil ke Bubble">
              <svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="mh-status-strip">
          <span class="mh-status-dot"></span>
          <span>Status: <strong>Siap Mengisi Laporan</strong></span>
        </div>

        <div class="mh-modal-body">
          <div class="mh-m-group">
            <label for="mh-m-presensi">Status Kehadiran</label>
            <select id="mh-m-presensi" class="mh-m-input">
              <option value="Hadir" selected>Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>
          </div>

          <div class="mh-m-group">
            <label id="mh-m-activity-label" for="mh-m-activity">Poin Kegiatan Hari Ini</label>
            <textarea id="mh-m-activity" class="mh-m-textarea" rows="3" placeholder="Contoh:&#10;- Perbaikan laptop pengguna&#10;- Setup kabel jaringan&#10;- Maintenance server"></textarea>
            <span id="mh-m-activity-hint" class="mh-m-hint">Tulis poin singkat. AI akan memperluas &ge; 100 karakter.</span>
          </div>

          <div id="mh-m-obstacle-group" class="mh-m-group">
            <label class="mh-m-checkbox-label">
              <input type="checkbox" id="mh-m-has-obstacle">
              <span>Mengalami kendala / hambatan hari ini</span>
            </label>
          </div>

          <div id="mh-m-obstacle-wrapper" class="mh-m-group" style="display: none;">
            <label for="mh-m-obstacle">Ringkasan Kendala</label>
            <textarea id="mh-m-obstacle" class="mh-m-textarea" rows="2" placeholder="Contoh: Gangguan jaringan internet kantor"></textarea>
            <span class="mh-m-hint">Kendala &amp; penanganan akan diuraikan formal &ge; 100 karakter.</span>
          </div>

          <div class="mh-m-group" style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 4px;">
              <label class="mh-m-checkbox-label" style="margin: 0; font-size: 11.5px; font-weight: 600;">
                <input type="checkbox" id="mh-m-send-loc" checked>
                <span>Kirim Lokasi</span>
              </label>
              <div style="display: flex; gap: 4px;">
                <button type="button" id="mh-btn-open-map" style="padding: 2px 7px; font-size: 10.5px; border: 1px solid #bfdbfe; border-radius: 4px; background: #eff6ff; color: #1d4ed8; cursor: pointer;">Set Peta</button>
                <button type="button" id="mh-btn-get-gps" style="padding: 2px 7px; font-size: 10.5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;">Get GPS</button>
              </div>
            </div>
            <div id="mh-m-loc-fields" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <input type="text" id="mh-m-loc-lat" class="mh-m-input" placeholder="Latitude" style="font-size: 11px; padding: 4px 6px;">
              <input type="text" id="mh-m-loc-lng" class="mh-m-input" placeholder="Longitude" style="font-size: 11px; padding: 4px 6px;">
            </div>
            <label class="mh-m-checkbox-label" style="margin-top: 5px; font-size: 10.5px; color: #475569;">
              <input type="checkbox" id="mh-m-loc-save-default" checked>
              <span>Simpan sebagai lokasi default</span>
            </label>
          </div>
        </div>

        <div class="mh-modal-footer">
          <button id="mh-btn-m-submit" class="mh-btn-m-primary">
            <svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
            <span>Generate &amp; Terapkan</span>
          </button>
          <div class="mh-footer-row">
            <button id="mh-btn-m-open-dash" class="mh-btn-m-secondary" title="Buka Dashboard & Riwayat">
              <svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" x2="18" y1="20" y2="10"/>
                <line x1="12" x2="12" y1="20" y2="4"/>
                <line x1="6" x2="6" y1="20" y2="14"/>
              </svg>
              <span>Dashboard</span>
            </button>
            <button id="mh-btn-m-recap" class="mh-btn-m-secondary" title="Ekstrak & Susun Rekap AI Periode Aktif">
              <span>Ekstrak &amp; Rekap</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    const bubbleBtn = widget.querySelector('#mh-btn-open-popup');
    const dragHeader = widget.querySelector('#mh-panel-drag-handle');

    setupDraggableWidget(widget, [bubbleBtn, dragHeader]);

    bubbleBtn.addEventListener('click', () => {
      if (widgetJustDragged) {
        widgetJustDragged = false;
        return;
      }
      openInpageModal();
    });

    widget.querySelector('#mh-btn-close-modal').addEventListener('click', closeInpageModal);
    widget.querySelector('#mh-btn-modal-settings').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
    });
    widget.querySelector('#mh-btn-m-open-dash').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
    });

    const checkObs = widget.querySelector('#mh-m-has-obstacle');
    const wrapObs = widget.querySelector('#mh-m-obstacle-wrapper');
    checkObs.addEventListener('change', () => {
      wrapObs.style.display = checkObs.checked ? 'block' : 'none';
    });

    // Dynamic Presensi UI
    const presSel = widget.querySelector('#mh-m-presensi');
    const actLabel = widget.querySelector('#mh-m-activity-label');
    const actArea = widget.querySelector('#mh-m-activity');
    const actHint = widget.querySelector('#mh-m-activity-hint');
    const obsGroup = widget.querySelector('#mh-m-obstacle-group');
    const updateWidgetPresensi = () => {
      const v = presSel.value;
      if (v === 'Izin') {
        if (actLabel) actLabel.textContent = 'Alasan / Keterangan Izin';
        if (actArea) actArea.placeholder = 'Contoh: Mengurus keperluan administrasi keluarga / acara resmi kampus...';
        if (actHint) actHint.textContent = 'AI akan menyusun keterangan izin formal >= 100 karakter.';
        if (obsGroup) obsGroup.style.display = 'none';
        checkObs.checked = false;
        wrapObs.style.display = 'none';
      } else if (v === 'Sakit') {
        if (actLabel) actLabel.textContent = 'Keterangan / Kondisi Sakit';
        if (actArea) actArea.placeholder = 'Contoh: Sedang mengalami demam dan butuh istirahat sesuai anjuran dokter...';
        if (actHint) actHint.textContent = 'AI akan menyusun keterangan sakit formal >= 100 karakter.';
        if (obsGroup) obsGroup.style.display = 'none';
        checkObs.checked = false;
        wrapObs.style.display = 'none';
      } else {
        if (actLabel) actLabel.textContent = 'Poin Kegiatan Hari Ini';
        if (actArea) actArea.placeholder = 'Contoh:\n- Perbaikan laptop pengguna\n- Setup kabel jaringan';
        if (actHint) actHint.textContent = 'Tulis poin singkat. AI akan memperluas >= 100 karakter.';
        if (obsGroup) obsGroup.style.display = 'block';
      }
    };
    presSel?.addEventListener('change', updateWidgetPresensi);
    updateWidgetPresensi();

    // Lokasi GPS & Default
    const sendLocChk = widget.querySelector('#mh-m-send-loc');
    const locFields = widget.querySelector('#mh-m-loc-fields');
    const latInput = widget.querySelector('#mh-m-loc-lat');
    const lngInput = widget.querySelector('#mh-m-loc-lng');
    const saveDefLocChk = widget.querySelector('#mh-m-loc-save-default');
    const fetchGps = (silent = false) => {
      if (!navigator.geolocation) {
        if (!silent) showToast('Browser tidak mendukung GPS.', true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
          if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
          if (!silent) showToast('Koordinat GPS saat ini berhasil diambil.');
        },
        (err) => {
          if (!silent) showToast(`Gagal ambil GPS: ${err.message}`, true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };
    chrome.storage.local.get('monevhub_location_config', (st) => {
      const lc = st.monevhub_location_config || {};
      if (sendLocChk) sendLocChk.checked = lc.sendLocation !== false;
      if (locFields) locFields.style.display = (lc.sendLocation !== false) ? 'grid' : 'none';
      if (lc.defaultLat && lc.defaultLng) {
        if (latInput) latInput.value = lc.defaultLat;
        if (lngInput) lngInput.value = lc.defaultLng;
      } else if (lc.sendLocation !== false) {
        fetchGps(true);
      }
    });
    sendLocChk?.addEventListener('change', () => {
      if (locFields) locFields.style.display = sendLocChk.checked ? 'grid' : 'none';
    });
    widget.querySelector('#mh-btn-get-gps')?.addEventListener('click', () => fetchGps(false));
    widget.querySelector('#mh-btn-open-map')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS', hash: '#pick-location' });
    });

    // Tombol Ekstrak & Rekap AI (Unified)
    widget.querySelector('#mh-btn-m-recap')?.addEventListener('click', async () => {
      const btnRecap = widget.querySelector('#mh-btn-m-recap');
      btnRecap.disabled = true;
      btnRecap.querySelector('span').textContent = 'Memproses...';
      try {
        const res = await scrapeRange({ mode: 'current_period', skipHolidays: true, skipAbsent: true, skipEmpty: true });
        if (!res.success) throw new Error(res.message || 'Gagal mengekstrak periode ini.');
        const cur = getCurrentPeriodRange();
        const label = cur ? (cur.periodName || `${cur.start} s.d. ${cur.end}`) : 'Periode Aktif';
        const store = await chrome.storage.local.get('monevhub_history');
        const all = store.monevhub_history || [];
        const logs = cur ? all.filter(h => h.tanggal >= cur.start && h.tanggal <= cur.end) : all;
        if (logs.length === 0) throw new Error('Belum ada log hadir untuk disusun rekap.');
        const recap = await window.MonevHubAI.generateMonthlyRecap(logs, label);
        await navigator.clipboard.writeText(recap).catch(() => {});
        showToast(`Ekstrak (${res.count}) & Rekap AI selesai! Hasil disalin ke clipboard.`);
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btnRecap.disabled = false;
        btnRecap.querySelector('span').textContent = 'Ekstrak & Rekap';
      }
    });

    widget.querySelector('#mh-btn-m-submit').addEventListener('click', async () => {
      const act = widget.querySelector('#mh-m-activity').value.trim();
      if (!act) {
        showToast('Tuliskan poin kegiatan terlebih dahulu.', true);
        return;
      }

      const hasObs = checkObs.checked;
      const obsText = widget.querySelector('#mh-m-obstacle').value.trim();
      if (hasObs && !obsText) {
        showToast('Tuliskan ringkasan kendala atau hapus centang kendala.', true);
        return;
      }

      const btnSubmit = widget.querySelector('#mh-btn-m-submit');
      btnSubmit.disabled = true;
      btnSubmit.querySelector('span').textContent = 'Memproses...';

      try {
        if (!window.MonevHubAI) {
          throw new Error('Modul AI MonevHub tidak ditemukan. Refresh halaman.');
        }

        const report = await window.MonevHubAI.generateDailyReport({
          rawKegiatan: act,
          hasKendala: hasObs,
          rawKendala: obsText,
          presensi: widget.querySelector('#mh-m-presensi').value
        });

        const sendLoc = Boolean(widget.querySelector('#mh-m-send-loc')?.checked);
        const lat = (widget.querySelector('#mh-m-loc-lat')?.value || '').trim();
        const lng = (widget.querySelector('#mh-m-loc-lng')?.value || '').trim();
        if (widget.querySelector('#mh-m-loc-save-default')?.checked && lat && lng) {
          chrome.storage.local.set({ monevhub_location_config: { sendLocation: sendLoc, defaultLat: lat, defaultLng: lng } });
        }

        const res = await fillMonevForm({
          presensi: widget.querySelector('#mh-m-presensi').value,
          uraian: report.uraian_aktivitas,
          pembelajaran: report.pembelajaran,
          kendala: report.kendala,
          sendLocation: sendLoc,
          lat,
          lng,
          autoCheck: true
        });

        if (res.success) {
          closeInpageModal();
          showToast('Form laporan Monev berhasil terisi!');
          chrome.runtime.sendMessage({
            action: 'SAVE_HISTORY',
            data: {
              tanggal: new Date().toISOString().slice(0, 10),
              presensi: widget.querySelector('#mh-m-presensi').value,
              uraian: report.uraian_aktivitas,
              pembelajaran: report.pembelajaran,
              kendala: report.kendala
            }
          });
        }
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.querySelector('span').textContent = 'Generate & Terapkan';
      }
    });
  }

  function setupDraggableWidget(widgetRoot, handles) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let activeHandle = null;

    handles.forEach(handle => {
      if (!handle) return;
      handle.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') && e.target.closest('button') !== handle) return;
        isDragging = true;
        widgetJustDragged = false;
        activeHandle = handle;
        const rect = widgetRoot.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        handle.classList.add('mh-dragging');
        handle.setPointerCapture(e.pointerId);
      });

      handle.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          widgetJustDragged = true;
        }
        const rect = widgetRoot.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        const nextLeft = Math.min(maxLeft, Math.max(8, startLeft + dx));
        const nextTop = Math.min(maxTop, Math.max(8, startTop + dy));
        widgetRoot.style.left = `${nextLeft}px`;
        widgetRoot.style.top = `${nextTop}px`;
        widgetRoot.style.right = 'auto';
        widgetRoot.style.bottom = 'auto';
      });

      const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        if (activeHandle) activeHandle.classList.remove('mh-dragging');
        activeHandle = null;
      };
      handle.addEventListener('pointerup', endDrag);
      handle.addEventListener('pointercancel', endDrag);
    });
  }

  /**
   * Expand Mini-Panel In-Page MonevHub
   */
  async function openInpageModal() {
    if (window.MonevHubLicense) {
      const lic = await window.MonevHubLicense.verify(false);
      if (!lic.valid) {
        showToast('Lisensi belum aktif. Buka ikon ekstensi di toolbar untuk aktivasi.', true);
        chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
        return;
      }
    }

    initFloatingWidget();
    const bubble = document.getElementById('mh-btn-open-popup');
    const panel = document.getElementById('monevhub-inpage-panel');
    if (bubble) bubble.classList.add('mh-hide');
    if (panel) {
      panel.classList.remove('mh-hide');
      const tx = panel.querySelector('#mh-m-activity');
      if (tx) tx.focus();
    }
  }

  function closeInpageModal() {
    const bubble = document.getElementById('mh-btn-open-popup');
    const panel = document.getElementById('monevhub-inpage-panel');
    if (panel) panel.classList.add('mh-hide');
    if (bubble) bubble.classList.remove('mh-hide');
  }

  /**
   * Cari 3 textarea di modal form Monev
   */
  function getFormTextareas() {
    const allTextareas = Array.from(document.querySelectorAll('textarea'));
    const visibleTextareas = allTextareas.filter(el => {
      // Kecualikan textarea milik MonevHub in-page modal
      if (el.closest('#monevhub-inpage-modal')) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });

    if (visibleTextareas.length >= 3) {
      return visibleTextareas.slice(0, 3);
    }

    const uraian = document.querySelector('textarea[placeholder*="uraian" i]');
    const pembelajaran = document.querySelector('textarea[placeholder*="ilmu" i], textarea[placeholder*="pembelajaran" i]');
    const kendala = document.querySelector('textarea[placeholder*="kendala" i], textarea[placeholder*="hambatan" i]');

    if (uraian && pembelajaran && kendala) {
      return [uraian, pembelajaran, kendala];
    }

    return visibleTextareas;
  }

  /**
   * Setter native agar Vue 3 / Vuetify mendeteksi perubahan state v-model
   */
  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Eksekusi pengisian form Monev otomatis
   */
  async function fillMonevForm(data) {
    const textareas = getFormTextareas();

    if (textareas.length < 3) {
      showToast('Form laporan Monev belum dibuka di layar. Klik tanggal di riwayat terlebih dahulu.', true);
      return {
        success: false,
        message: 'Modal isian tidak ditemukan. Buka modal laporan di riwayat terlebih dahulu.'
      };
    }

    try {
      selectPresensi(data.presensi || 'Hadir');
    } catch (e) {
      console.warn('[MonevHub] Presensi auto-select notice:', e);
    }

    if (data.sendLocation && data.lat && data.lng) {
      chrome.runtime.sendMessage({
        action: 'SET_GEOLOCATION_OVERRIDE',
        enabled: true,
        lat: data.lat,
        lng: data.lng
      }, () => { void chrome.runtime.lastError; });

      const inputs = Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])'));
      for (const inp of inputs) {
        if (inp.closest('#monevhub-float-widget')) continue;
        const hint = `${inp.name || ''} ${inp.id || ''} ${inp.placeholder || ''} ${inp.getAttribute('aria-label') || ''}`.toLowerCase();
        if (hint.includes('lat')) setNativeValue(inp, data.lat);
        else if (hint.includes('lon') || hint.includes('lng')) setNativeValue(inp, data.lng);
        else if (hint.includes('koordinat') || hint.includes('lokasi')) setNativeValue(inp, `${data.lat}, ${data.lng}`);
      }
    } else {
      chrome.runtime.sendMessage({
        action: 'SET_GEOLOCATION_OVERRIDE',
        enabled: false
      }, () => { void chrome.runtime.lastError; });
    }

    const [txUraian, txPembelajaran, txKendala] = textareas;

    if (data.uraian) {
      setNativeValue(txUraian, data.uraian);
    }

    if (data.pembelajaran) {
      setNativeValue(txPembelajaran, data.pembelajaran);
    }

    if (data.kendala) {
      setNativeValue(txKendala, data.kendala);
    }

    if (data.autoCheck !== false) {
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        checkbox.click();
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    updateCharacterBadges(textareas);
    showToast('Berhasil mengisi 3 field laporan! Masing-masing memenuhi syarat &ge; 100 karakter.');
    return { success: true, message: 'Form berhasil diisi.' };
  }

  function selectPresensi(targetPresensi = 'Hadir') {
    const combobox = document.querySelector('[role="combobox"], .v-select, .v-autocomplete');
    if (!combobox) return;

    const targetLow = String(targetPresensi || 'Hadir').trim().toLowerCase();
    if (combobox.textContent.trim().toLowerCase().includes(targetLow)) return;

    combobox.click();
    setTimeout(() => {
      const options = Array.from(document.querySelectorAll('.v-list-item, [role="option"]'));
      const matchedOpt = options.find(opt => opt.textContent.trim().toLowerCase() === targetLow) ||
        options.find(opt => opt.textContent.trim().toLowerCase().includes(targetLow));
      if (matchedOpt) {
        matchedOpt.click();
      }
    }, 150);
  }

  function injectFieldBadges() {
    const textareas = getFormTextareas();
    if (textareas.length < 3) return;

    textareas.forEach((tx) => {
      if (tx.dataset.mhBadgeAttached) return;
      tx.dataset.mhBadgeAttached = 'true';

      const badge = document.createElement('div');
      badge.className = 'mh-char-badge invalid';
      badge.textContent = `${tx.value.length} / 100 karakter (Kurang ${Math.max(0, 100 - tx.value.length)})`;

      tx.parentNode.appendChild(badge);

      const updateBadge = () => {
        const len = tx.value.length;
        if (len >= 100) {
          badge.className = 'mh-char-badge valid';
          badge.textContent = `${len} / 100 karakter (Memenuhi Syarat)`;
        } else {
          badge.className = 'mh-char-badge invalid';
          badge.textContent = `${len} / 100 karakter (Kurang ${100 - len})`;
        }
      };

      tx.addEventListener('input', updateBadge);
      updateBadge();
    });
  }

  function updateCharacterBadges(textareas) {
    textareas.forEach(tx => {
      tx.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  let isExtracting = false;
  let cancelExtractRequested = false;

  const BULAN_INDO_MAP = {
    januari: '01', jan: '01',
    februari: '02', feb: '02',
    maret: '03', mar: '03',
    april: '04', apr: '04',
    mei: '05',
    juni: '06', jun: '06',
    juli: '07', jul: '07',
    agustus: '08', agu: '08', agt: '08',
    september: '09', sep: '09',
    oktober: '10', okt: '10',
    november: '11', nov: '11',
    desember: '12', des: '12'
  };

  function parseIndoDateToISO(str) {
    if (!str) return '';
    const m = String(str).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (!m) return '';
    const day = m[1].padStart(2, '0');
    const month = BULAN_INDO_MAP[m[2].toLowerCase()];
    const year = m[3];
    if (!month) return '';
    return `${year}-${month}-${day}`;
  }

  function parseDayButtonAria(ariaLabel) {
    if (!ariaLabel) return { dateISO: '', statusText: '' };
    const parts = ariaLabel.split(',').map(s => s.trim());
    const dateISO = parseIndoDateToISO(parts[1] || ariaLabel);
    const statusText = parts.slice(2).join(', ');
    return { dateISO, statusText };
  }

  /**
   * Ekstraksi detail dari tanggal yang sedang terbuka aktif di halaman
   * Mendukung struktur <dl><dt><dd> resmi MonevHub serta fallback elemen standar
   */
  function extractActiveDayDetail() {
    // 1. Ambil tanggal dari heading detail atau parameter URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlDate = urlParams.get('date') || '';

    const detailHeadingEl = document.querySelector('.daily-report-detail__heading h2, .daily-report-detail__heading');
    let rawDateText = detailHeadingEl ? detailHeadingEl.textContent.trim() : '';

    if (!rawDateText) {
      const dateHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .text-h6, .text-subtitle-1'));
      const dateHeaderEl = dateHeaders.find(el => {
        const txt = el.textContent || '';
        return /\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\b/i.test(txt) && /\b\d{4}\b/.test(txt);
      });
      rawDateText = dateHeaderEl ? dateHeaderEl.textContent.trim() : (urlDate || '-');
    }

    const tanggal = parseIndoDateToISO(rawDateText) || urlDate || rawDateText;

    // 2. Ekstraksi pasangan <dt> dan <dd> di dalam <dl>
    const dlMap = {};
    const dts = Array.from(document.querySelectorAll('dl dt'));
    dts.forEach(dt => {
      const key = (dt.textContent || '').trim().toLowerCase();
      const dd = dt.nextElementSibling;
      if (dd && dd.tagName === 'DD') {
        dlMap[key] = (dd.innerText || dd.textContent || '').trim();
      }
    });

    // 3. Status Approval & Kehadiran
    let statusApproval = 'Belum Ada Status';
    const headingContainer = document.querySelector('.daily-report-detail__heading')?.parentElement;
    const chipScope = headingContainer || document;
    const chips = Array.from(chipScope.querySelectorAll('.v-chip .v-chip__content, .v-chip, .badge, [class*="chip"]'));
    const approvalChip = chips.find(b => {
      const t = (b.textContent || '').toLowerCase();
      return t.includes('disetujui') || t.includes('menunggu') || t.includes('ditolak') || t.includes('belum diisi') || t.includes('libur') || t.includes('tidak hadir');
    });
    if (approvalChip) {
      statusApproval = approvalChip.textContent.trim();
    }

    let presensi = dlMap['kehadiran'] || '';
    if (!presensi) {
      const stLow = statusApproval.toLowerCase();
      if (stLow.includes('belum diisi')) presensi = 'Belum Diisi';
      else if (stLow.includes('libur')) presensi = 'Hari Libur';
      else if (stLow.includes('izin')) presensi = 'Izin';
      else if (stLow.includes('sakit')) presensi = 'Sakit';
      else if (stLow.includes('tidak hadir')) presensi = 'Tidak Hadir';
      else presensi = 'Hadir';
    }

    const isHoliday = Boolean(dlMap['hari libur']) || statusApproval.toLowerCase().includes('libur');

    // 4. Fallback pencarian heading bila tidak memakai <dl>
    function findContentUnderHeading(headingKeywords) {
      const allEls = Array.from(document.querySelectorAll('div, p, h4, h5, h6, strong, b, label, span'));
      const headingEl = allEls.find(el => {
        const text = (el.textContent || '').trim().toLowerCase();
        return headingKeywords.some(kw => text === kw.toLowerCase() || (text.startsWith(kw.toLowerCase()) && text.length < 50));
      });
      if (!headingEl) return '';

      const parent = headingEl.parentElement;
      if (parent) {
        let next = headingEl.nextElementSibling;
        while (next && (next.tagName === 'DIV' || next.tagName === 'P' || next.tagName === 'SPAN')) {
          const content = next.innerText.trim();
          if (content && !headingKeywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()))) {
            return content;
          }
          next = next.nextElementSibling;
        }
        const parentText = parent.innerText.trim();
        const stripped = parentText.replace(headingEl.innerText, '').trim();
        if (stripped) return stripped;
      }
      return '';
    }

    const uraian = dlMap['uraian aktivitas'] || dlMap['uraian kegiatan'] || findContentUnderHeading(['Uraian Aktivitas', 'Uraian Kegiatan', 'Aktivitas yang Dikerjakan']);
    const pembelajaran = dlMap['pembelajaran yang diperoleh'] || dlMap['pembelajaran'] || findContentUnderHeading(['Pembelajaran yang Diperoleh', 'Pembelajaran', 'Ilmu yang Didapat']);
    const kendala = dlMap['kendala yang dialami'] || dlMap['kendala'] || findContentUnderHeading(['Kendala yang Dialami', 'Kendala', 'Hambatan']);
    const catatanMentor = dlMap['catatan mentor'] || dlMap['catatan pembimbing lapangan'] || dlMap['catatan pembimbing'] || findContentUnderHeading(['Catatan Mentor', 'Catatan Pembimbing Lapangan', 'Catatan Pembimbing']);

    return {
      tanggal: tanggal,
      rawDateText: rawDateText,
      presensi: presensi,
      statusApproval: statusApproval,
      isHoliday: isHoliday,
      uraian: uraian || '-',
      pembelajaran: pembelajaran || '-',
      kendala: kendala || '-',
      catatanMentor: catatanMentor || '-'
    };
  }

  /**
   * Ambil rentang tanggal periode aktif dari .ui-period-switcher__label
   */
  function getCurrentPeriodRange() {
    const labelEl = document.querySelector('.ui-period-switcher__label');
    if (!labelEl) return null;
    const rawFullText = labelEl.innerText || labelEl.textContent || '';
    const strongEl = labelEl.querySelector('strong');
    const periodName = strongEl ? strongEl.textContent.trim() : rawFullText.split('\n')[0].trim();
    // Hapus teks "Periode X" agar angkanya tidak menempel dengan tanggal (misal "Periode 321 Nov")
    const datePartText = strongEl ? rawFullText.replace(strongEl.textContent, ' ').trim() : rawFullText;

    // Format 1: "21 Sep 2026 - 20 Okt 2026"
    let matches = datePartText.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*[-–]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    if (matches) {
      return {
        start: parseIndoDateToISO(matches[1]),
        end: parseIndoDateToISO(matches[2]),
        periodName,
        rawText: rawFullText
      };
    }

    // Format 2: "21 Sep - 20 Okt 2026" (tahun hanya di akhir)
    matches = datePartText.match(/(\d{1,2}\s+[A-Za-z]+)\s*[-–]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    if (matches) {
      const endISO = parseIndoDateToISO(matches[2]);
      const endYear = endISO ? parseInt(endISO.slice(0, 4), 10) : new Date().getFullYear();
      const endMonth = endISO ? parseInt(endISO.slice(5, 7), 10) : 12;
      let startISO = parseIndoDateToISO(`${matches[1]} ${endYear}`);
      if (startISO && parseInt(startISO.slice(5, 7), 10) > endMonth) {
        startISO = parseIndoDateToISO(`${matches[1]} ${endYear - 1}`);
      }
      return { start: startISO, end: endISO, periodName, rawText: rawFullText };
    }

    return { start: '', end: '', periodName, rawText: rawFullText };
  }

  const BULAN_PENDEK_LIST = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function shiftIsoByMonths(isoDate, monthDelta) {
    const m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo + monthDelta, d);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function formatShortPeriodLabel(periodName, startISO, endISO) {
    const fmt = (iso, withYear) => {
      const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return iso;
      const mon = BULAN_PENDEK_LIST[parseInt(m[2], 10)] || m[2];
      return withYear ? `${parseInt(m[3], 10)} ${mon} ${m[1]}` : `${parseInt(m[3], 10)} ${mon}`;
    };
    const sameYear = startISO && endISO && startISO.slice(0, 4) === endISO.slice(0, 4);
    return `${periodName} (${fmt(startISO, !sameYear)} - ${fmt(endISO, true)})`;
  }

  /**
   * Auto-detect daftar periode dari switcher aktif (instan tanpa klik) & simpan ke storage
   */
  async function syncPeriodsFromActiveSwitcher() {
    const cur = getCurrentPeriodRange();
    if (!cur || !cur.start || !cur.end) {
      const store = await chrome.storage.local.get('monevhub_periods');
      return store.monevhub_periods || { periods: [], activePeriodNum: 1 };
    }

    const numMatch = (cur.periodName || '').match(/\d+/);
    const activeNum = numMatch ? parseInt(numMatch[0], 10) : 1;

    const nextBtn = document.querySelector('button[aria-label="Periode berikutnya"]');
    const isLastAvailable = Boolean(nextBtn && nextBtn.disabled);

    const store = await chrome.storage.local.get('monevhub_periods');
    const prevData = store.monevhub_periods || {};
    // Jika sudah pernah scan penuh, pertahankan jumlah periode bila tidak di akhir
    const maxPeriod = isLastAvailable
      ? activeNum
      : Math.max(activeNum, (prevData.periods && prevData.periods.length) ? prevData.periods.length : 6);

    const periods = [];
    for (let i = 1; i <= maxPeriod; i++) {
      const delta = i - activeNum;
      const start = shiftIsoByMonths(cur.start, delta);
      const end = shiftIsoByMonths(cur.end, delta);
      const name = `Periode ${i}`;
      periods.push({
        id: `P${i}`,
        num: i,
        name,
        start,
        end,
        label: formatShortPeriodLabel(name, start, end)
      });
    }

    const payload = { periods, activePeriodNum: activeNum, updatedAt: Date.now() };
    await chrome.storage.local.set({ monevhub_periods: payload });
    await collectCalendarAttendanceSummary(`P${activeNum}`, cur.periodName || `Periode ${activeNum}`, cur.start, cur.end);
    return payload;
  }

  /**
   * Kumpulkan statistik absensi kalender (Hadir, Sakit, Izin, Tidak Hadir, Libur, Belum Diisi)
   * langsung dari aria-label tombol kalender tanpa klik tambahan
   */
  async function collectCalendarAttendanceSummary(periodId, periodName, start, end) {
    try {
      const dayButtons = Array.from(document.querySelectorAll('button.calendar-day-button'))
        .filter(b => b.offsetParent !== null);
      if (dayButtons.length === 0) return;

      const summary = {
        id: periodId,
        name: periodName,
        start: start || '',
        end: end || '',
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        libur: 0,
        belumDiisi: 0,
        totalDays: dayButtons.length,
        updatedAt: Date.now()
      };

      dayButtons.forEach(btn => {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        const td = btn.closest('td');
        const isHolidayClass = td && (td.classList.contains('scheduled-off-day') || td.classList.contains('api-holiday'));

        if (isHolidayClass || aria.includes('libur')) {
          summary.libur++;
        } else if (aria.includes('sakit')) {
          summary.sakit++;
        } else if (aria.includes('izin')) {
          summary.izin++;
        } else if (aria.includes('tidak hadir') || aria.includes('tanpa keterangan') || aria.includes('alpha') || aria.includes('ditolak')) {
          summary.alpha++;
        } else if (aria.includes('hadir')) {
          summary.hadir++;
        } else if (aria.includes('belum diisi') || aria.includes('kosong') || btn.disabled) {
          summary.belumDiisi++;
        }
      });

      const store = await chrome.storage.local.get('monevhub_attendance_summary');
      const map = store.monevhub_attendance_summary || {};
      map[periodId] = summary;
      await chrome.storage.local.set({ monevhub_attendance_summary: map });
    } catch (e) {}
  }

  /**
   * Scan langsung semua periode di web Monev (mundur ke Periode 1 lalu maju sampai akhir)
   */
  async function scanAllPeriodsLive() {
    const labelEl = document.querySelector('.ui-period-switcher__label');
    if (!labelEl) {
      throw new Error('Buka halaman Riwayat MonevHub terlebih dahulu.');
    }

    let guard = 0;
    while (guard < 12) {
      const prevBtn = document.querySelector('button[aria-label="Periode sebelumnya"]');
      if (!prevBtn || prevBtn.disabled) break;
      await switchPeriod('prev');
      guard++;
    }

    const periods = [];
    guard = 0;
    while (guard < 12) {
      const cur = getCurrentPeriodRange();
      if (cur && cur.start && cur.end) {
        const numMatch = (cur.periodName || '').match(/\d+/);
        const num = numMatch ? parseInt(numMatch[0], 10) : (periods.length + 1);
        const name = cur.periodName || `Periode ${num}`;
        const id = `P${num}`;
        periods.push({
          id,
          num,
          name,
          start: cur.start,
          end: cur.end,
          label: formatShortPeriodLabel(name, cur.start, cur.end)
        });
        await collectCalendarAttendanceSummary(id, name, cur.start, cur.end);
      }
      const nextBtn = document.querySelector('button[aria-label="Periode berikutnya"]');
      if (!nextBtn || nextBtn.disabled) break;
      await switchPeriod('next');
      guard++;
    }

    const payload = { periods, activePeriodNum: periods.length, updatedAt: Date.now() };
    await chrome.storage.local.set({ monevhub_periods: payload });
    return payload;
  }

  /**
   * Pindah langsung ke nomor periode target (misal Periode 1)
   */
  async function switchToTargetPeriod(targetNum) {
    const num = parseInt(targetNum, 10);
    if (!num) return false;
    let guard = 0;
    while (guard < 12) {
      const cur = getCurrentPeriodRange();
      const m = (cur?.periodName || '').match(/\d+/);
      const curNum = m ? parseInt(m[0], 10) : null;
      if (!curNum || curNum === num) return curNum === num;
      const moved = await switchPeriod(curNum < num ? 'next' : 'prev');
      if (!moved) return false;
      guard++;
    }
    return false;
  }

  /**
   * Pindah periode kalender ('prev' | 'next') dan tunggu DOM kalender selesai diperbarui
   */
  async function switchPeriod(direction) {
    const ariaTarget = direction === 'prev' ? 'Periode sebelumnya' : 'Periode berikutnya';
    const btn = document.querySelector(`button[aria-label="${ariaTarget}"]`);
    if (!btn || btn.disabled) return false;

    const labelEl = document.querySelector('.ui-period-switcher__label');
    const prevLabelText = labelEl ? labelEl.textContent.trim() : '';
    const prevFirstAria = document.querySelector('button.calendar-day-button')?.getAttribute('aria-label') || '';

    // Klik tunggal agar handler Vue tidak terpanggil 2x
    btn.click();

    const start = Date.now();
    const maxWait = 5000;
    while (Date.now() - start < maxWait) {
      const busy = document.querySelector('[aria-busy="true"], .calendar-loading');
      const curLabelText = labelEl ? labelEl.textContent.trim() : '';
      const curFirstAria = document.querySelector('button.calendar-day-button')?.getAttribute('aria-label') || '';
      const hasUpdated = (curLabelText && curLabelText !== prevLabelText) || (curFirstAria && curFirstAria !== prevFirstAria);
      if (!busy && hasUpdated) {
        await new Promise(r => setTimeout(r, 250));
        return true;
      }
      await new Promise(r => setTimeout(r, 70));
    }
    await new Promise(r => setTimeout(r, 250));
    return true;
  }

  /**
   * Filter tombol kalender sebelum diklik berdasarkan rentang tanggal & status di aria-label
   */
  function shouldSkipDayButton(btn, dateISO, statusText, options) {
    if (btn.disabled) return { skip: true, reason: 'disabled' };
    if (options.startDate && dateISO && dateISO < options.startDate) return { skip: true, reason: 'out_of_range' };
    if (options.endDate && dateISO && dateISO > options.endDate) return { skip: true, reason: 'out_of_range' };

    const st = (statusText || '').toLowerCase();
    const td = btn.closest('td');
    const isHolidayClass = td && (td.classList.contains('scheduled-off-day') || td.classList.contains('api-holiday'));

    if (options.skipHolidays !== false && (isHolidayClass || st.includes('libur'))) {
      return { skip: true, reason: 'holiday' };
    }
    if (options.skipEmpty !== false && (st.includes('belum diisi') || st.includes('kosong'))) {
      return { skip: true, reason: 'empty' };
    }
    if (options.skipAbsent !== false && (
      st.includes('izin') ||
      st.includes('sakit') ||
      st.includes('tidak hadir') ||
      st.includes('tanpa keterangan') ||
      st.includes('ditolak') ||
      st.includes('alpha')
    )) {
      return { skip: true, reason: 'absent' };
    }
    return { skip: false };
  }

  /**
   * Menunggu update reaktif Vue & API detail selesai dirender (<dl> atau <form>)
   */
  async function waitForDayRender(btn, targetDateISO, prevDateText, prevUraian = '', maxWaitMs = 4500) {
    const start = Date.now();
    const intervalMs = 50;
    while (Date.now() - start < maxWaitMs) {
      const headingEl = document.querySelector('.daily-report-detail__heading h2, .daily-report-detail__heading');
      const headingText = headingEl ? headingEl.textContent.trim() : '';
      const headingISO = parseIndoDateToISO(headingText);
      const dts = document.querySelectorAll('dl dt');
      const hasContentRendered = dts.length > 0 || document.querySelector('form textarea') !== null;

      const matchedHeading = targetDateISO ? (headingISO === targetDateISO) : (headingText && headingText !== '-' && headingText !== prevDateText);

      if (matchedHeading && hasContentRendered) {
        // Pastikan isi <dd> bukan sisa tanggal sebelumnya saat transisi cepat
        const currentUraianDt = Array.from(dts).find(dt => (dt.textContent || '').trim().toLowerCase().includes('uraian'));
        const currentUraian = currentUraianDt?.nextElementSibling?.textContent?.trim() || '';
        if (prevUraian && prevUraian !== '-' && currentUraian === prevUraian && (Date.now() - start) < 800) {
          await new Promise(r => setTimeout(r, 80));
          continue;
        }
        await new Promise(r => setTimeout(r, 80));
        return true;
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    await new Promise(r => setTimeout(r, 150));
    return false;
  }

  /**
   * Crawl dan ekstrak seluruh laporan berdasarkan rentang tanggal & filter (mendukung multi-periode)
   */
  async function scrapeRange(options = {}) {
    if (isExtracting) return { success: false, message: 'Ekstraksi riwayat sedang berlangsung.' };
    isExtracting = true;
    cancelExtractRequested = false;

    const opts = {
      startDate: options.startDate || '',
      endDate: options.endDate || '',
      skipHolidays: options.skipHolidays !== false,
      skipAbsent: options.skipAbsent !== false,
      skipEmpty: options.skipEmpty !== false,
      mode: options.mode || 'range'
    };

    showExtractionHUD();

    try {
      const initialButtons = Array.from(document.querySelectorAll('button.calendar-day-button'))
        .filter(b => b.offsetParent !== null);

      if (initialButtons.length === 0) {
        throw new Error('Tidak ditemukan kalender riwayat pada halaman ini. Buka menu Riwayat terlebih dahulu.');
      }

      let currentPeriod = getCurrentPeriodRange();

      // Navigasi otomatis ke periode awal jika rentang tanggal diberikan
      if (opts.mode !== 'current_period' && opts.startDate && currentPeriod && currentPeriod.start) {
        let guard = 0;
        while (currentPeriod && currentPeriod.start > opts.startDate && guard < 12) {
          const moved = await switchPeriod('prev');
          if (!moved) break;
          currentPeriod = getCurrentPeriodRange();
          guard++;
        }
        guard = 0;
        while (currentPeriod && currentPeriod.end && currentPeriod.end < opts.startDate && guard < 12) {
          const moved = await switchPeriod('next');
          if (!moved) break;
          currentPeriod = getCurrentPeriodRange();
          guard++;
        }
      }

      const results = [];
      let skippedCount = 0;
      const visitedDates = new Set();
      let periodGuard = 0;

      while (periodGuard < 12) {
        periodGuard++;
        if (cancelExtractRequested) {
          showToast('Ekstraksi dibatalkan.');
          break;
        }

        currentPeriod = getCurrentPeriodRange();
        const periodName = currentPeriod ? currentPeriod.periodName : 'Periode Berjalan';
        const pNumMatch = (periodName || '').match(/\d+/);
        if (currentPeriod && pNumMatch) {
          await collectCalendarAttendanceSummary(`P${pNumMatch[0]}`, periodName, currentPeriod.start, currentPeriod.end);
        }
        const dayButtons = Array.from(document.querySelectorAll('button.calendar-day-button'))
          .filter(b => b.offsetParent !== null);

        // Kumpulkan kandidat tombol yang lolos filter pra-klik
        const candidates = [];
        for (const btn of dayButtons) {
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const parsed = parseDayButtonAria(ariaLabel);
          const check = shouldSkipDayButton(btn, parsed.dateISO, parsed.statusText, opts);
          if (check.skip) {
            if (check.reason !== 'out_of_range' && check.reason !== 'disabled') {
              skippedCount++;
            }
            continue;
          }
          if (parsed.dateISO && visitedDates.has(parsed.dateISO)) continue;
          candidates.push({ btn, ariaLabel, dateISO: parsed.dateISO, statusText: parsed.statusText });
        }

        for (let i = 0; i < candidates.length; i++) {
          if (cancelExtractRequested) {
            showToast('Ekstraksi dibatalkan.');
            break;
          }

          const { btn, ariaLabel, dateISO } = candidates[i];
          const dayNumber = btn.textContent.trim();
          updateExtractionHUD(i + 1, candidates.length, `${periodName}: ${ariaLabel || 'Tanggal ' + dayNumber}`);

          const prevSnapshot = extractActiveDayDetail();
          btn.scrollIntoView({ block: 'nearest' });
          btn.click();

          await waitForDayRender(btn, dateISO, prevSnapshot.rawDateText, prevSnapshot.uraian, 4500);

          let detail = extractActiveDayDetail();

          // Retry 1x jika heading belum berpindah ke dateISO atau konten masih tertinggal kosong padahal status Hadir
          const expectsReport = /hadir|izin|sakit/i.test(ariaLabel) && !/belum diisi/i.test(ariaLabel);
          if ((dateISO && detail.tanggal !== dateISO) || (expectsReport && (!detail.uraian || detail.uraian === '-'))) {
            btn.click();
            await waitForDayRender(btn, dateISO, prevSnapshot.rawDateText, prevSnapshot.uraian, 4500);
            detail = extractActiveDayDetail();
          }

          // Pengaman integritas: jangan pernah simpan jika heading tanggal aktual tidak cocok dengan tombol target
          if (dateISO && detail.tanggal && detail.tanggal !== dateISO) {
            skippedCount++;
            continue;
          }

          const finalDate = dateISO || detail.tanggal;

          // Filter ulang berdasar isi detail aktual
          const isAbsentDetail = /izin|sakit|tidak hadir|tanpa keterangan|alpha/i.test(detail.presensi || '');
          const isEmptyDetail = !detail.uraian || detail.uraian === '-';

          if ((opts.skipHolidays && detail.isHoliday) ||
              (opts.skipAbsent && isAbsentDetail) ||
              (opts.skipEmpty && isEmptyDetail)) {
            skippedCount++;
            continue;
          }

          if (finalDate) visitedDates.add(finalDate);
          results.push({
            ...detail,
            tanggal: finalDate,
            periodName: periodName,
            ariaLabel: ariaLabel
          });
        }

        if (opts.mode === 'current_period' || !opts.endDate || !currentPeriod || !currentPeriod.end) {
          break;
        }

        if (currentPeriod.end < opts.endDate && !cancelExtractRequested) {
          const moved = await switchPeriod('next');
          if (!moved) break;
        } else {
          break;
        }
      }

      // Simpan hasil ke chrome.storage.local (monevhub_history)
      const store = await chrome.storage.local.get('monevhub_history');
      const history = store.monevhub_history || [];

      results.forEach(newItem => {
        const idx = history.findIndex(h => h.tanggal === newItem.tanggal);
        if (idx >= 0) {
          history[idx] = newItem;
        } else {
          history.push(newItem);
        }
      });

      // Urutkan riwayat berdasarkan tanggal ascending
      history.sort((a, b) => ((a.tanggal || '') > (b.tanggal || '') ? 1 : -1));

      await chrome.storage.local.set({ monevhub_history: history });

      showToast(`Ekstraksi selesai! ${results.length} laporan berhasil disimpan (${skippedCount} hari libur/kosong/absen dilewati).`);
      return {
        success: true,
        count: results.length,
        skippedCount: skippedCount,
        data: results,
        periodName: currentPeriod ? currentPeriod.periodName : 'Periode'
      };
    } catch (err) {
      showToast('Gagal ekstraksi: ' + err.message, true);
      return { success: false, message: err.message };
    } finally {
      isExtracting = false;
      hideExtractionHUD();
    }
  }

  function showExtractionHUD() {
    let hud = document.getElementById('monevhub-extract-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'monevhub-extract-hud';
      hud.innerHTML = `
        <div class="mh-hud-card">
          <div class="mh-hud-header">
            <span class="mh-hud-title">
              <svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              MonevHub Riwayat Extractor
            </span>
            <button id="mh-btn-cancel-extract" title="Hentikan Ekstraksi">&times;</button>
          </div>
          <div class="mh-hud-body">
            <div id="mh-hud-msg" class="mh-hud-msg">Mempersiapkan pembacaan kalender...</div>
            <div class="mh-hud-bar"><div id="mh-hud-fill" class="mh-hud-fill" style="width: 0%;"></div></div>
            <div id="mh-hud-sub" class="mh-hud-sub">Memuat tanggal...</div>
          </div>
        </div>
      `;
      document.body.appendChild(hud);
      document.getElementById('mh-btn-cancel-extract').addEventListener('click', () => {
        cancelExtractRequested = true;
        document.getElementById('mh-hud-msg').textContent = 'Menghentikan proses...';
      });
    }
    hud.style.display = 'block';
  }

  function updateExtractionHUD(current, total, label) {
    const fill = document.getElementById('mh-hud-fill');
    const msg = document.getElementById('mh-hud-msg');
    const sub = document.getElementById('mh-hud-sub');
    const pct = Math.round((current / total) * 100);
    if (fill) fill.style.width = `${pct}%`;
    if (msg) msg.textContent = `Mengekstrak tanggal ${current} dari ${total} (${pct}%)...`;
    if (sub) sub.textContent = label || '-';
  }

  function hideExtractionHUD() {
    const hud = document.getElementById('monevhub-extract-hud');
    if (hud) hud.style.display = 'none';
  }

  function scrapeRiwayatData() {
    return extractActiveDayDetail();
  }

  function showToast(message, isError = false) {
    const existing = document.querySelector('.mh-toast');
    if (existing) existing.remove();

    const iconSvg = isError
      ? `<svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8"/><line x1="12" x2="12.01" y1="16"/></svg>`
      : `<svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const toast = document.createElement('div');
    toast.className = `mh-toast ${isError ? 'mh-error' : ''}`;
    toast.innerHTML = `
      <span class="mh-toast-icon">${iconSvg}</span>
      <span class="mh-toast-text">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

})();
