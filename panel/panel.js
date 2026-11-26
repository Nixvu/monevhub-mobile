/**
 * MonevHub AI - Chrome Side Panel Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  const licBadge = document.getElementById('panel-lic-badge');
  const logCountEl = document.getElementById('panel-log-count');
  const lockCard = document.getElementById('panel-lock-card');
  const mainContent = document.getElementById('panel-main-content');
  const statusEl = document.getElementById('panel-status');

  const pPresensi = document.getElementById('p-presensi');
  const pActivity = document.getElementById('p-activity');
  const pHasObstacle = document.getElementById('p-has-obstacle');
  const pObstacleWrap = document.getElementById('p-obstacle-wrap');
  const pObstacle = document.getElementById('p-obstacle');
  const btnGenerate = document.getElementById('btn-p-generate');

  const resultCard = document.getElementById('p-result-card');
  const resUraian = document.getElementById('p-res-uraian');
  const resPembelajaran = document.getElementById('p-res-pembelajaran');
  const resKendala = document.getElementById('p-res-kendala');

  const pCycleMode = document.getElementById('p-cycle-mode');
  const pMonth = document.getElementById('p-month');

  // Set default month
  const now = new Date();
  const initDate = now.getDate() < 21 ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
  if (pMonth) {
    pMonth.value = `${initDate.getFullYear()}-${String(initDate.getMonth() + 1).padStart(2, '0')}`;
  }

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = isError ? 'panel-status error' : 'panel-status';
    statusEl.style.display = 'block';
  }

  async function refreshLogCount() {
    const store = await chrome.storage.local.get('monevhub_history');
    const logs = store.monevhub_history || [];
    if (logCountEl) logCountEl.textContent = `${logs.length} hari`;
  }

  async function checkLicense() {
    const res = await MonevHubLicense.verify(false);
    const ownerEl = document.getElementById('panel-lic-owner');
    const devEl = document.getElementById('panel-lic-device');
    const expEl = document.getElementById('panel-lic-exp');
    if (res.valid && res.data && res.data.active) {
      if (licBadge) {
        licBadge.className = 'panel-badge valid';
        licBadge.textContent = 'AKTIF';
      }
      if (ownerEl) ownerEl.textContent = res.data.owner || res.data.userName || 'Personal';
      if (devEl) devEl.textContent = res.data.deviceName || '-';
      if (expEl) expEl.textContent = res.data.expiredDate || 'Permanen';
      if (lockCard) lockCard.style.display = 'none';
      if (mainContent) mainContent.style.display = 'block';
    } else {
      if (licBadge) {
        licBadge.className = 'panel-badge invalid';
        licBadge.textContent = res.reason || 'BELUM AKTIF';
      }
      if (ownerEl) ownerEl.textContent = '-';
      if (devEl) devEl.textContent = '-';
      if (expEl) expEl.textContent = '-';
      if (lockCard) lockCard.style.display = 'block';
      if (mainContent) mainContent.style.display = 'none';
    }
  }

  await checkLicense();
  await refreshLogCount();

  // Tab switching
  document.querySelectorAll('.panel-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  document.getElementById('btn-panel-open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-panel-activate-page')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#view-license') });
  });

  function updatePanelPresensiUI() {
    const val = pPresensi ? pPresensi.value : 'Hadir';
    const actLabel = document.getElementById('p-activity-label');
    const actHint = document.getElementById('p-activity-hint');
    const obsGroup = document.getElementById('p-obstacle-group');

    if (val === 'Izin') {
      if (actLabel) actLabel.textContent = 'Alasan / Keterangan Izin';
      if (pActivity) pActivity.placeholder = 'Contoh: Mengurus keperluan administrasi keluarga / acara resmi kampus...';
      if (actHint) actHint.textContent = 'AI akan menyusun keterangan izin formal \u2265 100 karakter.';
      if (obsGroup) obsGroup.style.display = 'none';
      if (pHasObstacle) pHasObstacle.checked = false;
      if (pObstacleWrap) pObstacleWrap.style.display = 'none';
    } else if (val === 'Sakit') {
      if (actLabel) actLabel.textContent = 'Keterangan / Kondisi Sakit';
      if (pActivity) pActivity.placeholder = 'Contoh: Sedang mengalami demam dan butuh istirahat sesuai anjuran dokter...';
      if (actHint) actHint.textContent = 'AI akan menyusun keterangan sakit formal \u2265 100 karakter.';
      if (obsGroup) obsGroup.style.display = 'none';
      if (pHasObstacle) pHasObstacle.checked = false;
      if (pObstacleWrap) pObstacleWrap.style.display = 'none';
    } else {
      if (actLabel) actLabel.textContent = 'Poin Kegiatan Hari Ini';
      if (pActivity) pActivity.placeholder = 'Contoh:\n- Perbaikan printer unit layanan\n- Input data CKG';
      if (actHint) actHint.textContent = 'AI akan menyusun narasi formal \u2265 100 karakter.';
      if (obsGroup) obsGroup.style.display = 'block';
    }
  }

  pPresensi?.addEventListener('change', updatePanelPresensiUI);
  updatePanelPresensiUI();

  pHasObstacle?.addEventListener('change', () => {
    if (pObstacleWrap) pObstacleWrap.style.display = pHasObstacle.checked ? 'block' : 'none';
  });

  // Lokasi GPS & Default
  const pSendLoc = document.getElementById('p-send-loc');
  const pLocLat = document.getElementById('p-loc-lat');
  const pLocLng = document.getElementById('p-loc-lng');
  const pLocSaveDefault = document.getElementById('p-loc-save-default');
  const pLocFields = document.getElementById('p-loc-fields');

  function fetchCurrentGpsIntoPanel(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) setStatus('Browser tidak mendukung GPS.', true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (pLocLat) pLocLat.value = pos.coords.latitude.toFixed(6);
        if (pLocLng) pLocLng.value = pos.coords.longitude.toFixed(6);
        if (!silent) setStatus('Koordinat GPS saat ini berhasil diambil.');
      },
      (err) => {
        if (!silent) setStatus(`Gagal ambil GPS: ${err.message}`, true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function initPanelLocation() {
    const store = await chrome.storage.local.get('monevhub_location_config');
    const locCfg = store.monevhub_location_config || {};
    if (pSendLoc) pSendLoc.checked = locCfg.sendLocation !== false;
    if (pLocFields) pLocFields.style.display = (locCfg.sendLocation !== false) ? 'grid' : 'none';
    if (locCfg.defaultLat && locCfg.defaultLng) {
      if (pLocLat) pLocLat.value = locCfg.defaultLat;
      if (pLocLng) pLocLng.value = locCfg.defaultLng;
    } else if (locCfg.sendLocation !== false) {
      fetchCurrentGpsIntoPanel(true);
    }
  }

  pSendLoc?.addEventListener('change', () => {
    if (pLocFields) pLocFields.style.display = pSendLoc.checked ? 'grid' : 'none';
  });
  document.getElementById('btn-p-get-gps')?.addEventListener('click', () => fetchCurrentGpsIntoPanel(false));

  // Modal Peta Sidebar
  let panelMapPicker = null;
  const panelMapModal = document.getElementById('panel-map-modal');
  const pMapCoords = document.getElementById('p-map-coords');
  const pMapResults = document.getElementById('p-map-results');
  const pMapGmaps = document.getElementById('p-map-gmaps-url');

  document.getElementById('btn-p-open-map')?.addEventListener('click', () => {
    if (!panelMapModal || typeof MonevHubMap === 'undefined') return;
    panelMapModal.style.display = 'flex';
    const curLat = parseFloat(pLocLat?.value) || -6.200000;
    const curLng = parseFloat(pLocLng?.value) || 106.816666;
    if (pMapCoords) pMapCoords.textContent = `${curLat.toFixed(6)}, ${curLng.toFixed(6)}`;
    if (!panelMapPicker) {
      const canvas = document.getElementById('p-map-canvas');
      if (canvas) {
        panelMapPicker = new MonevHubMap.SlippyMapPicker(canvas, {
          lat: curLat,
          lng: curLng,
          zoom: 15,
          onChange: (la, lo) => {
            if (pMapCoords) pMapCoords.textContent = `${la.toFixed(6)}, ${lo.toFixed(6)}`;
          }
        });
      }
    } else {
      panelMapPicker.setCoords(curLat, curLng);
    }
  });
  document.getElementById('btn-p-map-close')?.addEventListener('click', () => {
    if (panelMapModal) panelMapModal.style.display = 'none';
  });
  document.getElementById('btn-p-map-zin')?.addEventListener('click', () => panelMapPicker?.zoomBy(1));
  document.getElementById('btn-p-map-zout')?.addEventListener('click', () => panelMapPicker?.zoomBy(-1));
  pMapGmaps?.addEventListener('input', () => {
    const parsed = MonevHubMap.parseGoogleMapsUrl(pMapGmaps.value);
    if (parsed && panelMapPicker) {
      panelMapPicker.setCoords(parsed.lat, parsed.lng, 16);
      setStatus('Koordinat dari link Google Maps berhasil dibaca.');
    }
  });
  document.getElementById('p-map-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-p-map-search')?.click();
    }
  });

  document.getElementById('btn-p-map-search')?.addEventListener('click', async () => {
    const q = (document.getElementById('p-map-search')?.value || '').trim();
    if (!q || !pMapResults) return;
    pMapResults.style.display = 'block';
    pMapResults.innerHTML = '<div style="padding:4px 6px;color:#64748b;">Mencari...</div>';
    try {
      const items = await MonevHubMap.searchPlaceNominatim(q);
      pMapResults.innerHTML = items.length
        ? items.map(it => `<div class="p-map-item" data-lat="${it.lat}" data-lon="${it.lon}" style="padding:4px 6px;border-bottom:1px solid #f1f5f9;cursor:pointer;">${it.display_name}</div>`).join('')
        : '<div style="padding:4px 6px;color:#b91c1c;">Tidak ditemukan.</div>';
    } catch (err) {
      pMapResults.innerHTML = `<div style="padding:4px 6px;color:#b91c1c;">${err.message}</div>`;
    }
  });
  pMapResults?.addEventListener('click', (e) => {
    const item = e.target.closest('.p-map-item');
    if (!item || !panelMapPicker) return;
    panelMapPicker.setCoords(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), 16);
    pMapResults.style.display = 'none';
  });
  document.getElementById('btn-p-map-save')?.addEventListener('click', async () => {
    if (!panelMapPicker) return;
    const latStr = panelMapPicker.lat.toFixed(6);
    const lngStr = panelMapPicker.lng.toFixed(6);
    if (pLocLat) pLocLat.value = latStr;
    if (pLocLng) pLocLng.value = lngStr;
    if (pLocSaveDefault?.checked) {
      await chrome.storage.local.set({
        monevhub_location_config: { sendLocation: Boolean(pSendLoc?.checked), defaultLat: latStr, defaultLng: lngStr }
      });
    }
    if (panelMapModal) panelMapModal.style.display = 'none';
    setStatus(`Lokasi dipilih: ${latStr}, ${lngStr}`);
  });

  await initPanelLocation();

  function updateCounters() {
    const updateOne = (el, pillId) => {
      const len = (el?.value || '').length;
      const pill = document.getElementById(pillId);
      if (!pill) return;
      pill.textContent = `${len} char`;
      pill.className = len >= 100 ? 'char-pill valid' : 'char-pill invalid';
    };
    updateOne(resUraian, 'p-char-uraian');
    updateOne(resPembelajaran, 'p-char-pembelajaran');
    updateOne(resKendala, 'p-char-kendala');
  }

  [resUraian, resPembelajaran, resKendala].forEach(el => {
    el?.addEventListener('input', updateCounters);
  });

  async function findMonevTab() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url && activeTab.url.includes('monev.maganghub.kemnaker.go.id')) {
      return activeTab;
    }
    const tabs = await chrome.tabs.query({ url: 'https://monev.maganghub.kemnaker.go.id/*' });
    return tabs && tabs[0] ? tabs[0] : null;
  }

  async function applyFormToTab() {
    const tab = await findMonevTab();
    if (!tab) {
      setStatus('Buka halaman web MonevHub terlebih dahulu.', true);
      return false;
    }
    const sendLocation = Boolean(pSendLoc?.checked);
    const lat = (pLocLat?.value || '').trim();
    const lng = (pLocLng?.value || '').trim();
    if (pLocSaveDefault?.checked && lat && lng) {
      await chrome.storage.local.set({
        monevhub_location_config: { sendLocation, defaultLat: lat, defaultLng: lng }
      });
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'FILL_FORM',
        data: {
          presensi: pPresensi.value,
          uraian: resUraian.value,
          pembelajaran: resPembelajaran.value,
          kendala: resKendala.value,
          sendLocation,
          lat,
          lng,
          autoCheck: true
        }
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          setStatus(res?.message || 'Gagal mengisi form. Pastikan modal laporan Monev terbuka.', true);
          resolve(false);
        } else {
          setStatus('Form laporan Monev berhasil diisi!');
          resolve(true);
        }
      });
    });
  }

  btnGenerate?.addEventListener('click', async () => {
    const act = (pActivity.value || '').trim();
    if (!act) {
      setStatus('Isi poin kegiatan hari ini terlebih dahulu.', true);
      return;
    }
    const hasObs = Boolean(pHasObstacle?.checked);
    const obsText = (pObstacle?.value || '').trim();
    if (hasObs && !obsText) {
      setStatus('Isi ringkasan kendala atau hapus centang kendala.', true);
      return;
    }

    btnGenerate.disabled = true;
    btnGenerate.querySelector('span').textContent = 'Memproses AI...';
    setStatus('Menghasilkan narasi formal Kemnaker...');

    try {
      const report = await MonevHubAI.generateDailyReport({
        rawKegiatan: act,
        hasKendala: hasObs,
        rawKendala: obsText,
        presensi: pPresensi.value
      });

      resUraian.value = report.uraian_aktivitas;
      resPembelajaran.value = report.pembelajaran;
      resKendala.value = report.kendala;
      updateCounters();
      if (resultCard) resultCard.style.display = 'block';

      const filled = await applyFormToTab();
      if (filled) {
        await chrome.runtime.sendMessage({
          action: 'SAVE_HISTORY',
          data: {
            tanggal: new Date().toISOString().slice(0, 10),
            presensi: pPresensi.value,
            uraian: report.uraian_aktivitas,
            pembelajaran: report.pembelajaran,
            kendala: report.kendala
          }
        });
        await refreshLogCount();
      }
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.querySelector('span').textContent = 'Generate & Terapkan ke Form';
    }
  });

  document.getElementById('btn-p-fill')?.addEventListener('click', applyFormToTab);

  document.getElementById('btn-p-copy')?.addEventListener('click', () => {
    const txt = `URAIAN AKTIVITAS:\n${resUraian.value}\n\nPEMBELAJARAN:\n${resPembelajaran.value}\n\nKENDALA:\n${resKendala.value}`;
    navigator.clipboard.writeText(txt).then(() => setStatus('Semua teks disalin ke clipboard.'));
  });

  let panelDetectedPeriods = [];

  async function loadPanelPeriods() {
    if (!pCycleMode) return;
    try {
      const store = await chrome.storage.local.get('monevhub_periods');
      const data = store.monevhub_periods;
      if (data && Array.isArray(data.periods) && data.periods.length > 0) {
        panelDetectedPeriods = data.periods;
        let html = '<optgroup label="Periode Terdeteksi">';
        data.periods.forEach(p => {
          html += `<option value="${p.id}">${p.label}</option>`;
        });
        html += '</optgroup><optgroup label="Mode Manual"><option value="period">Siklus Periode (Tgl 21 - 20)</option><option value="calendar">Bulan Kalender (Tgl 1 - 31)</option></optgroup>';
        pCycleMode.innerHTML = html;
        const activeId = data.activePeriodNum ? `P${data.activePeriodNum}` : data.periods[0].id;
        pCycleMode.value = pCycleMode.querySelector(`option[value="${activeId}"]`) ? activeId : data.periods[0].id;
        if (pMonth) pMonth.disabled = true;
      }
    } catch (e) {}
  }

  pCycleMode?.addEventListener('change', async () => {
    const val = pCycleMode.value;
    const matched = panelDetectedPeriods.find(p => p.id === val);
    if (matched) {
      if (pMonth && matched.start) {
        pMonth.value = matched.start.slice(0, 7);
        pMonth.disabled = true;
      }
      const tab = await findMonevTab();
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SWITCH_MONEV_PERIOD',
          periodNum: matched.num,
          periodId: matched.id
        }, () => { void chrome.runtime.lastError; });
      }
    } else {
      if (pMonth) pMonth.disabled = false;
    }
  });

  await loadPanelPeriods();

  function getRangeFromSelection() {
    const mode = pCycleMode?.value || 'period';
    const matched = panelDetectedPeriods.find(p => p.id === mode);
    if (matched) {
      return { startDate: matched.start, endDate: matched.end, label: matched.label };
    }
    const val = pMonth?.value || '';
    if (!/^\d{4}-\d{2}$/.test(val)) return { startDate: '', endDate: '', label: 'Periode Aktif' };
    const [yStr, mStr] = val.split('-');
    const yInt = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    if (mode === 'period') {
      const startDate = `${yStr}-${mStr}-21`;
      const nextM = (mNum % 12) + 1;
      const nextY = mNum === 12 ? yInt + 1 : yInt;
      const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-20`;
      return { startDate, endDate, label: `${startDate} s.d. ${endDate}` };
    }
    const lastDay = new Date(yInt, mNum, 0).getDate();
    return {
      startDate: `${yStr}-${mStr}-01`,
      endDate: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      label: `Bulan ${val}`
    };
  }

  document.getElementById('btn-p-extract-and-recap')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-p-extract-and-recap');
    const tab = await findMonevTab();
    if (!tab) {
      setStatus('Buka halaman Riwayat MagangHub Monev terlebih dahulu.', true);
      return;
    }
    const { startDate, endDate, label } = getRangeFromSelection();
    const matched = panelDetectedPeriods.find(p => p.id === pCycleMode?.value);

    btn.disabled = true;
    btn.querySelector('span').textContent = 'Mengekstrak & Menyusun...';
    setStatus(`Menarik data & menyusun rekap AI untuk ${label}...`);

    try {
      if (matched) {
        await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'SWITCH_MONEV_PERIOD',
            periodNum: matched.num,
            periodId: matched.id
          }, () => {
            void chrome.runtime.lastError;
            resolve();
          });
        });
      }

      const scrapeRes = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SCRAPE_RANGE',
          options: { startDate, endDate, skipHolidays: true, skipAbsent: true, skipEmpty: true, mode: 'range' }
        }, (res) => {
          if (chrome.runtime.lastError) resolve({ success: false, message: 'Tab Monev belum merespons.' });
          else resolve(res || { success: false });
        });
      });

      if (!scrapeRes.success) {
        throw new Error(scrapeRes.message || 'Ekstraksi laporan gagal.');
      }
      await refreshLogCount();

      const store = await chrome.storage.local.get('monevhub_history');
      const all = store.monevhub_history || [];
      const filtered = all.filter(h => (!startDate || h.tanggal >= startDate) && (!endDate || h.tanggal <= endDate));
      if (filtered.length === 0) {
        throw new Error(`Tidak ada log hadir pada ${label}.`);
      }

      const recap = await MonevHubAI.generateMonthlyRecap(filtered, label);
      document.getElementById('p-res-recap').value = recap;
      document.getElementById('p-recap-card').style.display = 'block';
      setStatus(`Ekstrak & Rekap ${label} selesai (${filtered.length} hari).`);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Ekstrak & Susun Rekap AI';
    }
  });

  document.getElementById('btn-p-open-history')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#view-history') });
  });

  document.getElementById('btn-p-copy-recap')?.addEventListener('click', () => {
    const val = document.getElementById('p-res-recap')?.value || '';
    if (val) navigator.clipboard.writeText(val).then(() => setStatus('Teks rekap disalin.'));
  });
});
