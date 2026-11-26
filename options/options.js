/**
 * MonevHub Independent Dashboard & Options Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.dash-view');

  // Sidebar status
  const sideLicStatus = document.getElementById('side-lic-status');
  const sideUserName = document.getElementById('side-user-name');

  // View 1 (Log Riwayat)
  const historyTableBody = document.getElementById('history-table-body');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnExportDocx = document.getElementById('btn-export-docx');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnExtractPeriodOpt = document.getElementById('btn-extract-period-opt');
  const quickExportTpl = document.getElementById('quick-export-template');
  const btnGotoExportTpl = document.getElementById('btn-goto-export-tpl');
  const filterMode = document.getElementById('filter-mode');
  const filterMonth = document.getElementById('filter-month');
  const filterYear = document.getElementById('filter-year');
  const filterStartDate = document.getElementById('filter-start-date');
  const filterEndDate = document.getElementById('filter-end-date');
  const filterSkipHolidays = document.getElementById('filter-skip-holidays');
  const filterSkipAbsent = document.getElementById('filter-skip-absent');
  const filterSkipEmpty = document.getElementById('filter-skip-empty');
  const historyFilterCount = document.getElementById('history-filter-count');

  // View 2 (Rekap Bulanan)
  const recapMode = document.getElementById('recap-mode');
  const recapPeriod = document.getElementById('recap-period');
  const btnDoRecap = document.getElementById('btn-do-recap');
  const recapResultWrapper = document.getElementById('recap-result-wrapper');
  const recapResultText = document.getElementById('recap-result-text');
  const btnCopyRecapOpt = document.getElementById('btn-copy-recap-opt');
  const btnDownloadRecapOpt = document.getElementById('btn-download-recap-opt');

  // View 3 (Konfigurasi AI - Trio Gateway)
  const optAiMode = document.getElementById('opt-ai-mode');
  const boxInjectedOpt = document.getElementById('box-injected-opt');
  const boxApikeyOpt = document.getElementById('box-apikey-opt');
  const boxOauthOpt = document.getElementById('box-oauth-opt');
  const optInjectedUrl = document.getElementById('opt-injected-url');
  const optApiGateway = document.getElementById('opt-api-gateway');
  const groupBaseUrl = document.getElementById('group-base-url');
  const optApiBaseUrl = document.getElementById('opt-api-base-url');
  const optApiKey = document.getElementById('opt-api-key');
  const optApiModel = document.getElementById('opt-api-model');
  const optOauthToken = document.getElementById('opt-oauth-token');
  const btnSaveAiOpt = document.getElementById('btn-save-ai-opt');
  const geminiModelSelect = document.getElementById('opt-gemini-model-select');
  const btnFetchGeminiModels = document.getElementById('btn-fetch-gemini-models');
  const btnGetGeminiKey = document.getElementById('btn-get-gemini-key');
  const btnPasteApiKey = document.getElementById('btn-paste-api-key');
  const geminiModelsStatus = document.getElementById('gemini-models-status');

  // View 4 (Tampilan & Widget)
  const optWidgetStatusBadge = document.getElementById('opt-widget-status-badge');
  const optToggleFloatingWidget = document.getElementById('opt-toggle-floating-widget');
  const optWidgetStatusDesc = document.getElementById('opt-widget-status-desc');
  const btnSaveDisplayOpt = document.getElementById('btn-save-display-opt');

  // View 5 (Lisensi)
  const licBannerBox = document.getElementById('lic-banner-box');
  const licMainStatus = document.getElementById('lic-main-status');
  const licMainMsg = document.getElementById('lic-main-msg');
  const optHwFp = document.getElementById('opt-hw-fp');
  const optLicOwner = document.getElementById('opt-lic-owner');
  const optLicDevice = document.getElementById('opt-lic-device');
  const optLicExp = document.getElementById('opt-lic-exp');
  const optInputKey = document.getElementById('opt-input-key');
  const optUserName = document.getElementById('opt-user-name');
  const optDeviceLabel = document.getElementById('opt-device-label');
  const btnActivateOpt = document.getElementById('btn-activate-opt');
  const btnVerifyOpt = document.getElementById('btn-verify-opt');

  // Set default month
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const recapStartDate = document.getElementById('recap-start-date');
  const recapEndDate = document.getElementById('recap-end-date');

  // Helper hitung rentang tanggal berdasarkan mode ('period' cut-off 21-20 vs 'calendar' 1-31)
  function computeRangeFromMonth(yearInt, monthStr, mode) {
    const mNum = parseInt(monthStr, 10);
    if (mode === 'period') {
      const start = `${yearInt}-${monthStr}-21`;
      const nextM = (mNum % 12) + 1;
      const nextY = mNum === 12 ? yearInt + 1 : yearInt;
      const end = `${nextY}-${String(nextM).padStart(2, '0')}-20`;
      return { start, end };
    }
    if (mode === 'calendar') {
      const lastDay = new Date(yearInt, mNum, 0).getDate();
      return {
        start: `${yearInt}-${monthStr}-01`,
        end: `${yearInt}-${monthStr}-${String(lastDay).padStart(2, '0')}`
      };
    }
    return { start: '', end: '' };
  }

  let detectedPeriods = [];

  // Inisialisasi Filter Mode, Bulan & Tanggal di View 1
  // Default: Siklus Periode berjalan (jika tgl < 21, periode dimulai bulan sebelumnya tgl 21)
  const initMonthDate = now.getDate() < 21
    ? new Date(yyyy, now.getMonth() - 1, 1)
    : new Date(yyyy, now.getMonth(), 1);
  if (filterYear) filterYear.value = String(initMonthDate.getFullYear());
  if (filterMonth) filterMonth.value = String(initMonthDate.getMonth() + 1).padStart(2, '0');

  function renderPeriodOptions(periodsData, preserveSelection = true) {
    if (!filterMode) return;
    const list = (periodsData && Array.isArray(periodsData.periods)) ? periodsData.periods : [];
    detectedPeriods = list;
    const prevVal = filterMode.value;

    let html = '';
    if (list.length > 0) {
      html += '<optgroup label="Periode Terdeteksi (MonevHub)">';
      list.forEach(p => {
        html += `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`;
      });
      html += '</optgroup>';
    }
    html += `
      <optgroup label="Rentang Tanggal">
        <option value="custom">Rentang Tanggal</option>
        <option value="all">Tampilkan Semua Data</option>
      </optgroup>
    `;
    filterMode.innerHTML = html;

    if (preserveSelection && prevVal && filterMode.querySelector(`option[value="${prevVal}"]`)) {
      filterMode.value = prevVal;
    } else if (list.length > 0) {
      const activeId = periodsData.activePeriodNum ? `P${periodsData.activePeriodNum}` : list[0].id;
      filterMode.value = filterMode.querySelector(`option[value="${activeId}"]`) ? activeId : list[0].id;
    } else {
      filterMode.value = 'custom';
    }
    syncDatesFromMonthYear();

    // Sinkronkan juga dropdown Rekap Bulanan dengan periode terdeteksi
    if (recapMode) {
      const prevRecap = recapMode.value;
      let rHtml = '';
      if (list.length > 0) {
        rHtml += '<optgroup label="Periode Terdeteksi (MonevHub)">';
        list.forEach(p => {
          rHtml += `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`;
        });
        rHtml += '</optgroup>';
      }
      rHtml += `
        <optgroup label="Rentang Tanggal">
          <option value="custom">Rentang Tanggal</option>
          <option value="all">Semua Data Tersimpan</option>
        </optgroup>
      `;
      recapMode.innerHTML = rHtml;
      if (preserveSelection && prevRecap && recapMode.querySelector(`option[value="${prevRecap}"]`)) {
        recapMode.value = prevRecap;
      } else if (list.length > 0) {
        const activeId = periodsData.activePeriodNum ? `P${periodsData.activePeriodNum}` : list[0].id;
        recapMode.value = recapMode.querySelector(`option[value="${activeId}"]`) ? activeId : list[0].id;
      } else {
        recapMode.value = 'custom';
      }
      if (typeof updateRecapPreview === 'function') updateRecapPreview();
    }
  }

  async function loadDetectedPeriods() {
    try {
      const store = await chrome.storage.local.get('monevhub_periods');
      if (store.monevhub_periods && Array.isArray(store.monevhub_periods.periods) && store.monevhub_periods.periods.length > 0) {
        renderPeriodOptions(store.monevhub_periods, false);
      }

      const tabs = await chrome.tabs.query({ url: 'https://monev.maganghub.kemnaker.go.id/*' });
      const targetTab = (tabs || []).find(t => (t.url || '').includes('/riwayat')) || (tabs && tabs[0]);
      if (targetTab) {
        chrome.tabs.sendMessage(targetTab.id, { action: 'GET_DETECTED_PERIODS' }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) return;
          if (Array.isArray(res.periods) && res.periods.length > 0) {
            renderPeriodOptions(res, detectedPeriods.length > 0);
            loadHistoryTable();
          }
        });
      }
    } catch (e) {}
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.monevhub_periods && changes.monevhub_periods.newValue) {
      renderPeriodOptions(changes.monevhub_periods.newValue, true);
      loadHistoryTable();
    }
    if (changes.monevhub_history || changes.monevhub_periods || changes.monevhub_attendance_summary || changes.monevhub_export_config) {
      renderDashboard();
      if (typeof updateRecapPreview === 'function') updateRecapPreview();
    }
  });

  document.getElementById('btn-sync-periods')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const tabs = await chrome.tabs.query({ url: 'https://monev.maganghub.kemnaker.go.id/*' });
    const targetTab = (tabs || []).find(t => (t.url || '').includes('/riwayat')) || (tabs && tabs[0]);
    if (!targetTab) {
      showToast('Buka halaman Riwayat MonevHub terlebih dahulu untuk sinkronisasi periode.', true);
      return;
    }
    const btn = document.getElementById('btn-sync-periods');
    btn.disabled = true;
    btn.textContent = 'Memindai...';
    showToast('Memindai semua periode aktif di akun MonevHub...');

    chrome.tabs.sendMessage(targetTab.id, { action: 'SCAN_ALL_PERIODS' }, (res) => {
      btn.disabled = false;
      btn.textContent = 'Sinkron Periode';
      if (chrome.runtime.lastError || !res || !res.success) {
        showToast(res?.message || 'Gagal memindai periode. Refresh halaman Riwayat Monev lalu coba lagi.', true);
        return;
      }
      renderPeriodOptions(res, false);
      loadHistoryTable();
      showToast(`Berhasil mendeteksi ${res.periods?.length || 0} periode dari MonevHub!`);
    });
  });

  function updateMonthYearDisabledState() {
    const mode = filterMode ? filterMode.value : 'period';
    const isAuto = mode === 'period' || mode === 'calendar';
    if (filterMonth) filterMonth.disabled = !isAuto;
    if (filterYear) filterYear.disabled = !isAuto;
  }

  function syncDatesFromMonthYear() {
    if (!filterStartDate || !filterEndDate) return;
    const mode = filterMode ? filterMode.value : 'custom';

    const matchedPeriod = detectedPeriods.find(p => p.id === mode);
    if (matchedPeriod) {
      filterStartDate.value = matchedPeriod.start || '';
      filterEndDate.value = matchedPeriod.end || '';
      return;
    }

    if (mode === 'all') {
      filterStartDate.value = '';
      filterEndDate.value = '';
      return;
    }
    if (mode === 'custom') return;
  }

  filterMode?.addEventListener('change', () => {
    syncDatesFromMonthYear();
    loadHistoryTable();
  });

  filterMonth?.addEventListener('change', () => {
    syncDatesFromMonthYear();
    loadHistoryTable();
  });

  filterYear?.addEventListener('change', () => {
    syncDatesFromMonthYear();
    loadHistoryTable();
  });

  const handleManualDateChange = () => {
    if (filterMode) {
      filterMode.value = 'custom';
      updateMonthYearDisabledState();
    }
    loadHistoryTable();
  };

  filterStartDate?.addEventListener('change', handleManualDateChange);
  filterEndDate?.addEventListener('change', handleManualDateChange);
  filterSkipHolidays?.addEventListener('change', loadHistoryTable);
  filterSkipAbsent?.addEventListener('change', loadHistoryTable);
  filterSkipEmpty?.addEventListener('change', loadHistoryTable);

  // Tab routing
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  function switchView(targetViewId) {
    // Kompatibilitas hash lama (#view-ai, #view-display, #view-license) -> view-settings
    const legacyMap = {
      'view-ai': { view: 'view-settings', card: 'card-settings-ai' },
      'view-display': { view: 'view-settings', card: 'card-settings-display' },
      'view-license': { view: 'view-dashboard', card: 'card-settings-license' }
    };
    const mapped = legacyMap[targetViewId];
    const finalViewId = mapped ? mapped.view : targetViewId;

    navItems.forEach(b => b.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-item[data-view="${finalViewId}"]`);
    const activeView = document.getElementById(finalViewId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeView) activeView.classList.add('active');

    if (mapped && mapped.card) {
      setTimeout(() => {
        document.getElementById(mapped.card)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }

  // Handle URL hash if provided (#view-license, etc)
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchView(hash);
  }

  const dashPeriodFilter = document.getElementById('dash-period-filter');

  // Inisialisasi data (dengan try-catch agar error init tidak memblokir listener tombol)
  syncDatesFromMonthYear();
  try {
    await loadDetectedPeriods();
    await loadLicenseInfo();
    await loadHistoryTable();
    await loadAiConfig();
    await loadDisplaySettings();
    await loadExportConfig();
    await renderDashboard();
    await updateRecapPreview();
  } catch (initErr) {
    console.error('[MonevHub Options] Init error:', initErr);
  }

  // ==========================================
  // VIEW 0: DASHBOARD RINGKASAN
  // ==========================================

  async function renderDashboard() {
    const store = await chrome.storage.local.get([
      'monevhub_history',
      'monevhub_periods',
      'monevhub_attendance_summary',
      'monevhub_export_config'
    ]);
    const history = store.monevhub_history || [];
    const periodsData = store.monevhub_periods || { periods: [] };
    const periods = Array.isArray(periodsData.periods) ? periodsData.periods : [];
    const summaryMap = store.monevhub_attendance_summary || {};
    const expCfg = store.monevhub_export_config || {};

    // Populate dropdown filter periode Dashboard
    if (dashPeriodFilter) {
      const prevVal = dashPeriodFilter.value || 'ALL';
      let optsHtml = '<option value="ALL">Semua Periode</option>';
      periods.forEach(p => {
        optsHtml += `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`;
      });
      dashPeriodFilter.innerHTML = optsHtml;
      dashPeriodFilter.value = dashPeriodFilter.querySelector(`option[value="${prevVal}"]`) ? prevVal : 'ALL';
    }

    const selectedScope = dashPeriodFilter ? dashPeriodFilter.value : 'ALL';
    const targetPeriods = selectedScope === 'ALL'
      ? periods
      : periods.filter(p => p.id === selectedScope);

    // Hitung statistik absensi dari summary kalender (fallback ke history jika summary belum ada)
    let hadir = 0, sakit = 0, izin = 0, alpha = 0, libur = 0;

    const getLogsForRange = (start, end) => history.filter(h => {
      const t = h.tanggal || '';
      if (!t) return false;
      return (!start || t >= start) && (!end || t <= end);
    });

    const isReadyReport = (item) => {
      if (!item || item.isHoliday) return false;
      const p = (item.presensi || 'Hadir').toLowerCase();
      if (!p.includes('hadir') || p.includes('tidak')) return false;
      return item.uraian && item.uraian !== '-' && item.uraian.length >= 100 &&
             item.pembelajaran && item.pembelajaran !== '-' && item.pembelajaran.length >= 100 &&
             item.kendala && item.kendala !== '-' && item.kendala.length >= 100;
    };

    const tbodyEl = document.getElementById('dash-period-tbody');
    if (periods.length === 0) {
      // Fallback jika belum pernah buka MonevHub sama sekali
      hadir = history.filter(l => (l.presensi || 'Hadir').toLowerCase().includes('hadir') && !(l.presensi || '').toLowerCase().includes('tidak')).length;
      sakit = history.filter(l => (l.presensi || '').toLowerCase().includes('sakit')).length;
      izin = history.filter(l => (l.presensi || '').toLowerCase().includes('izin')).length;
      alpha = history.filter(l => /tidak hadir|tanpa keterangan|alpha/i.test(l.presensi || '')).length;

      if (tbodyEl) {
        tbodyEl.innerHTML = history.length === 0
          ? '<tr><td colspan="9" class="empty-state">Belum ada data. Klik "Sinkron dari Monev" dengan tab Riwayat MonevHub terbuka.</td></tr>'
          : `<tr>
              <td style="text-align:center;color:#64748b;">1</td>
              <td style="font-weight:600;">Semua Log Lokal</td>
              <td style="text-align:center;">${hadir}</td>
              <td style="text-align:center;">${sakit}</td>
              <td style="text-align:center;">${izin}</td>
              <td style="text-align:center;">${alpha}</td>
              <td style="text-align:center;">-</td>
              <td style="text-align:center;font-weight:700;color:#0f766e;">${history.filter(isReadyReport).length}</td>
              <td style="text-align:center;white-space:nowrap;">
                <button type="button" class="btn btn-primary btn-table-action btn-period-export" data-period-id="ALL" ${history.filter(isReadyReport).length === 0 ? 'disabled style="opacity:0.45;cursor:not-allowed;"' : ''}>Ekspor</button>
                <button type="button" class="btn btn-secondary btn-table-action btn-period-recap" data-period-id="ALL">Rekap</button>
              </td>
            </tr>`;
      }
    } else {
      const rowsHtml = targetPeriods.map((p, idx) => {
        const s = summaryMap[p.id];
        const pLogs = getLogsForRange(p.start, p.end);
        const readyInPeriod = pLogs.filter(isReadyReport).length;

        const pHadir = s ? s.hadir : pLogs.filter(l => (l.presensi || 'Hadir').toLowerCase().includes('hadir') && !(l.presensi || '').toLowerCase().includes('tidak')).length;
        const pSakit = s ? s.sakit : pLogs.filter(l => (l.presensi || '').toLowerCase().includes('sakit')).length;
        const pIzin = s ? s.izin : pLogs.filter(l => (l.presensi || '').toLowerCase().includes('izin')).length;
        const pAlpha = s ? s.alpha : pLogs.filter(l => /tidak hadir|tanpa keterangan|alpha/i.test(l.presensi || '')).length;
        const pLibur = s ? s.libur : 0;

        hadir += pHadir;
        sakit += pSakit;
        izin += pIzin;
        alpha += pAlpha;
        libur += pLibur;

        return `
          <tr>
            <td style="text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
            <td style="font-weight: 600; color: #0f172a;">${escapeHtml(p.label)}</td>
            <td style="text-align: center; font-weight: 700; color: #0f766e;">${pHadir}</td>
            <td style="text-align: center;">${pSakit}</td>
            <td style="text-align: center;">${pIzin}</td>
            <td style="text-align: center; color: ${pAlpha > 0 ? '#b91c1c' : '#475569'};">${pAlpha}</td>
            <td style="text-align: center; color: #64748b;">${pLibur}</td>
            <td style="text-align: center;"><span class="user-badge valid">${readyInPeriod} siap</span></td>
            <td style="text-align: center; white-space: nowrap;">
              <button type="button" class="btn btn-primary btn-table-action btn-period-export" data-period-id="${escapeHtml(p.id)}" ${readyInPeriod === 0 ? 'disabled style="opacity:0.45;cursor:not-allowed;"' : ''}>Ekspor</button>
              <button type="button" class="btn btn-secondary btn-table-action btn-period-recap" data-period-id="${escapeHtml(p.id)}" ${pLogs.length === 0 ? 'disabled style="opacity:0.45;cursor:not-allowed;"' : ''}>Rekap</button>
            </td>
          </tr>
        `;
      }).join('');
      if (tbodyEl) {
        tbodyEl.innerHTML = rowsHtml || '<tr><td colspan="9" class="empty-state">Tidak ada data pada periode ini.</td></tr>';
      }
    }

    // Hitung Data Siap Ekspor pada cakupan terpilih
    let scopedLogs = history;
    if (selectedScope !== 'ALL' && targetPeriods[0]) {
      scopedLogs = getLogsForRange(targetPeriods[0].start, targetPeriods[0].end);
    }
    const validHadirLogs = scopedLogs.filter(l => {
      if (l.isHoliday) return false;
      const p = (l.presensi || 'Hadir').toLowerCase();
      return p.includes('hadir') && !p.includes('tidak') && l.uraian && l.uraian !== '-';
    });
    const readyCount = validHadirLogs.filter(isReadyReport).length;
    const shortCount = validHadirLogs.length - readyCount;

    const totalWorkDays = hadir + sakit + izin + alpha;
    const pct = totalWorkDays > 0 ? Math.round((hadir / totalWorkDays) * 100) : 0;
    const totalAbsen = sakit + izin + alpha;

    const elHadir = document.getElementById('dash-m-hadir');
    const elHadirPct = document.getElementById('dash-m-hadir-pct');
    const elAbsen = document.getElementById('dash-m-absen');
    const elAbsenSub = document.getElementById('dash-m-absen-sub');
    const elReady = document.getElementById('dash-m-ready');
    const elReadySub = document.getElementById('dash-m-ready-sub');
    const elTpl = document.getElementById('dash-m-tpl');
    const elTtd = document.getElementById('dash-m-ttd');

    if (elHadir) elHadir.textContent = `${hadir} hari`;
    if (elHadirPct) elHadirPct.textContent = `Masuk / Hadir (${pct}% kehadiran)`;
    if (elAbsen) elAbsen.textContent = `${totalAbsen} hari`;
    if (elAbsenSub) elAbsenSub.textContent = `${sakit} Sakit • ${izin} Izin • ${alpha} Alpha`;
    if (elReady) elReady.textContent = `${validHadirLogs.length} laporan`;
    if (elReadySub) {
      elReadySub.textContent = shortCount > 0
        ? `${readyCount} lengkap • ${shortCount} (< 100 char)`
        : 'Semua memenuhi syarat ≥ 100 char';
    }
    const tplId = expCfg.templateId || 'tpl1';
    const tplNames = { tpl1: 'Template 1: Standar', tpl2: 'Template 2: Logbook', tpl3: 'Template 3: Ringkas' };
    if (elTpl) elTpl.textContent = tplNames[tplId] || 'Template 1';
    if (elTtd) elTtd.textContent = expCfg.showSignature !== false ? 'Blok TTD: Aktif' : 'Blok TTD: Nonaktif';
  }

  async function getDashboardExportData() {
    const store = await chrome.storage.local.get(['monevhub_history', 'monevhub_periods']);
    const history = store.monevhub_history || [];
    const periods = (store.monevhub_periods && store.monevhub_periods.periods) || [];
    const scope = dashPeriodFilter ? dashPeriodFilter.value : 'ALL';
    let logs = history;
    let label = 'Semua_Periode';

    if (scope !== 'ALL') {
      const p = periods.find(x => x.id === scope);
      if (p) {
        logs = history.filter(h => (h.tanggal || '') >= p.start && (h.tanggal || '') <= p.end);
        label = `${p.start}_sd_${p.end}`;
      }
    }
    const cleanLogs = logs.filter(l => {
      if (l.isHoliday) return false;
      const p = (l.presensi || 'Hadir').toLowerCase();
      return p.includes('hadir') && !p.includes('tidak') && l.uraian && l.uraian !== '-';
    });
    return { logs: cleanLogs, label };
  }

  dashPeriodFilter?.addEventListener('change', renderDashboard);

  document.getElementById('btn-dash-sync')?.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ url: 'https://monev.maganghub.kemnaker.go.id/*' });
    const targetTab = (tabs || []).find(t => (t.url || '').includes('/riwayat')) || (tabs && tabs[0]);
    if (!targetTab) {
      showToast('Buka halaman Riwayat MonevHub terlebih dahulu.', true);
      return;
    }
    const btn = document.getElementById('btn-dash-sync');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Menyinkronkan...';
    showToast('Memindai absensi semua periode dari MonevHub...');

    chrome.tabs.sendMessage(targetTab.id, { action: 'SCAN_ALL_PERIODS' }, async (res) => {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Sinkron dari Monev';
      if (chrome.runtime.lastError || !res || !res.success) {
        showToast(res?.message || 'Gagal sinkron. Refresh tab Riwayat MonevHub lalu coba lagi.', true);
        return;
      }
      await renderDashboard();
      showToast(`Sinkron selesai! ${res.periods?.length || 0} periode terdata.`);
    });
  });

  document.getElementById('btn-dash-export-pdf')?.addEventListener('click', async () => {
    try {
      const { logs, label } = await getDashboardExportData();
      const ownerName = sideUserName ? sideUserName.textContent : 'Peserta MagangHub';
      await MonevHubExport.exportToPDF(logs, label, ownerName);
      showToast(`Berhasil ekspor ${logs.length} laporan ke PDF.`);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('btn-dash-export-docx')?.addEventListener('click', async () => {
    try {
      const { logs, label } = await getDashboardExportData();
      const ownerName = sideUserName ? sideUserName.textContent : 'Peserta MagangHub';
      await MonevHubExport.exportToDocx(logs, label, ownerName);
      showToast(`Berhasil ekspor ${logs.length} laporan ke Word (.docx).`);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('btn-dash-goto-history')?.addEventListener('click', () => {
    switchView('view-history');
  });

  document.getElementById('btn-dash-goto-tpl')?.addEventListener('click', () => {
    switchView('view-export-tpl');
  });

  // Modal Ekspor Periode dari Tabel Dashboard
  let activeExportModalPeriodId = 'ALL';
  const modalExportPeriod = document.getElementById('modal-export-period');
  const expModalPeriodLabel = document.getElementById('exp-modal-period-label');
  const expModalFormat = document.getElementById('exp-modal-format');
  const expModalTemplate = document.getElementById('exp-modal-template');
  const expModalIncludeRecap = document.getElementById('exp-modal-include-recap');
  const btnConfirmExportPeriod = document.getElementById('btn-confirm-export-period');

  function closeExportModal() {
    modalExportPeriod?.classList.remove('open');
  }
  document.getElementById('btn-close-export-modal')?.addEventListener('click', closeExportModal);
  document.getElementById('btn-cancel-export-modal')?.addEventListener('click', closeExportModal);

  document.getElementById('dash-period-tbody')?.addEventListener('click', async (e) => {
    const expBtn = e.target.closest('.btn-period-export');
    const recBtn = e.target.closest('.btn-period-recap');
    if (expBtn && !expBtn.disabled) {
      activeExportModalPeriodId = expBtn.dataset.periodId || 'ALL';
      const store = await chrome.storage.local.get(['monevhub_periods', 'monevhub_export_config']);
      const periods = store.monevhub_periods?.periods || [];
      const found = periods.find(p => p.id === activeExportModalPeriodId);
      if (expModalPeriodLabel) {
        expModalPeriodLabel.textContent = found ? `Cakupan: ${found.label}` : 'Cakupan: Semua Log Lokal';
      }
      if (expModalTemplate && store.monevhub_export_config?.templateId) {
        expModalTemplate.value = store.monevhub_export_config.templateId;
      }
      if (expModalIncludeRecap) expModalIncludeRecap.checked = false;
      modalExportPeriod?.classList.add('open');
      return;
    }

    if (recBtn && !recBtn.disabled) {
      const pid = recBtn.dataset.periodId || 'ALL';
      switchView('view-recap');
      if (recapMode) {
        recapMode.value = pid === 'ALL' ? 'all' : (recapMode.querySelector(`option[value="${pid}"]`) ? pid : 'all');
      }
      await updateRecapPreview();
      btnDoRecap?.click();
    }
  });

  btnConfirmExportPeriod?.addEventListener('click', async () => {
    let cleanLogs = [];
    let label = 'Semua_Periode';
    let recapTitle = 'Semua Periode';

    if (activeExportModalPeriodId === 'HISTORY_FILTERED') {
      cleanLogs = await getFilteredHistory();
      label = getActivePeriodLabel();
      recapTitle = label;
    } else {
      const store = await chrome.storage.local.get(['monevhub_history', 'monevhub_periods']);
      const history = store.monevhub_history || [];
      const periods = store.monevhub_periods?.periods || [];
      const found = periods.find(p => p.id === activeExportModalPeriodId);
      let logs = history;
      if (found) {
        logs = history.filter(h => (h.tanggal || '') >= found.start && (h.tanggal || '') <= found.end);
        label = `${found.start}_sd_${found.end}`;
        recapTitle = found.label;
      }
      cleanLogs = logs.filter(l => {
        if (l.isHoliday) return false;
        const p = (l.presensi || 'Hadir').toLowerCase();
        return p.includes('hadir') && !p.includes('tidak') && l.uraian && l.uraian !== '-';
      });
    }

    if (cleanLogs.length === 0) {
      showToast('Tidak ada laporan yang siap diekspor.', true);
      return;
    }

    const fmt = expModalFormat ? expModalFormat.value : 'pdf';
    const tplId = expModalTemplate ? expModalTemplate.value : null;
    const expModalOrientation = document.getElementById('exp-modal-orientation');
    const orientation = expModalOrientation ? expModalOrientation.value : null;
    const includeRecap = expModalIncludeRecap ? expModalIncludeRecap.checked : false;
    const ownerName = '';

    if (fmt === 'csv') {
      let csv = 'Tanggal,Presensi,Uraian Aktivitas,Pembelajaran,Kendala\n';
      cleanLogs.forEach(l => {
        const row = [
          `"${(l.tanggal || '').replace(/"/g, '""')}"`,
          `"${(l.presensi || '').replace(/"/g, '""')}"`,
          `"${(l.uraian || '').replace(/"/g, '""')}"`,
          `"${(l.pembelajaran || '').replace(/"/g, '""')}"`,
          `"${(l.kendala || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Log_MonevHub_${label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      closeExportModal();
      showToast(`Berhasil ekspor ${cleanLogs.length} laporan ke CSV.`);
      return;
    }

    btnConfirmExportPeriod.disabled = true;
    btnConfirmExportPeriod.querySelector('span').textContent = includeRecap ? 'Menyusun Rekap AI...' : 'Mengekspor...';

    try {
      let extraOptions = { orientation };
      if (includeRecap) {
        const recapText = await MonevHubAI.generateMonthlyRecap(cleanLogs, recapTitle);
        extraOptions.recapText = recapText;
      }
      if (fmt === 'docx') {
        await MonevHubExport.exportToDocx(cleanLogs, label, ownerName, tplId, extraOptions);
      } else {
        await MonevHubExport.exportToPDF(cleanLogs, label, ownerName, tplId, extraOptions);
      }
      closeExportModal();
      showToast(`Berhasil ekspor ${cleanLogs.length} laporan (${fmt.toUpperCase()}).`);
    } catch (err) {
      showToast(`Gagal ekspor: ${err.message || err}`, true);
    } finally {
      btnConfirmExportPeriod.disabled = false;
      btnConfirmExportPeriod.querySelector('span').textContent = 'Ekspor Sekarang';
    }
  });

  // Toolbar Log Riwayat: Toggle Filter, Modal Ekspor, Modal Hapus
  document.getElementById('btn-toggle-history-filter')?.addEventListener('click', () => {
    const panel = document.getElementById('history-filter-panel');
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = isHidden ? 'block' : 'none';
  });

  document.getElementById('btn-open-export-history-modal')?.addEventListener('click', async () => {
    activeExportModalPeriodId = 'HISTORY_FILTERED';
    const filtered = await getFilteredHistory();
    const store = await chrome.storage.local.get('monevhub_export_config');
    if (expModalPeriodLabel) {
      expModalPeriodLabel.textContent = `Cakupan: ${filtered.length} laporan terfilter (${getActivePeriodLabel()})`;
    }
    if (expModalTemplate && store.monevhub_export_config?.templateId) {
      expModalTemplate.value = store.monevhub_export_config.templateId;
    }
    const expModalOrientEl = document.getElementById('exp-modal-orientation');
    if (expModalOrientEl && store.monevhub_export_config?.orientation) {
      expModalOrientEl.value = store.monevhub_export_config.orientation;
    }
    if (expModalIncludeRecap) expModalIncludeRecap.checked = false;
    modalExportPeriod?.classList.add('open');
  });

  const modalDeleteHistory = document.getElementById('modal-delete-history');
  const deleteHistoryScope = document.getElementById('delete-history-scope');
  const closeDeleteModal = () => modalDeleteHistory?.classList.remove('open');
  document.getElementById('btn-close-delete-modal')?.addEventListener('click', closeDeleteModal);
  document.getElementById('btn-cancel-delete-modal')?.addEventListener('click', closeDeleteModal);

  document.getElementById('btn-open-delete-history-modal')?.addEventListener('click', async () => {
    if (deleteHistoryScope) {
      let opts = '<option value="all">Hapus Semua Periode (Seluruh Data Lokal)</option>';
      opts += '<option value="filtered">Hapus Data Sesuai Filter Aktif</option>';
      detectedPeriods.forEach(p => {
        opts += `<option value="${escapeHtml(p.id)}">Hapus ${escapeHtml(p.label)}</option>`;
      });
      deleteHistoryScope.innerHTML = opts;
    }
    modalDeleteHistory?.classList.add('open');
  });

  document.getElementById('btn-confirm-delete-history')?.addEventListener('click', async () => {
    const scope = deleteHistoryScope ? deleteHistoryScope.value : 'all';
    const store = await chrome.storage.local.get('monevhub_history');
    const all = store.monevhub_history || [];
    let next = [];

    if (scope === 'all') {
      next = [];
    } else if (scope === 'filtered') {
      const filtered = await getFilteredHistory();
      const removeDates = new Set(filtered.map(f => f.tanggal));
      next = all.filter(item => !removeDates.has(item.tanggal));
    } else {
      const period = detectedPeriods.find(p => p.id === scope);
      if (period) {
        next = all.filter(item => {
          const t = item.tanggal || '';
          return !(t >= period.start && t <= period.end);
        });
      } else {
        next = all;
      }
    }

    await chrome.storage.local.set({ monevhub_history: next });
    closeDeleteModal();
    await loadHistoryTable();
    await renderDashboard();
    showToast(`Berhasil menghapus data (${all.length - next.length} laporan dihapus).`);
  });

  // ==========================================
  // VIEW 1: LOG RIWAYAT
  // ==========================================
  async function getFilteredHistory() {
    const store = await chrome.storage.local.get('monevhub_history');
    const allLogs = store.monevhub_history || [];
    const start = filterStartDate ? filterStartDate.value : '';
    const end = filterEndDate ? filterEndDate.value : '';
    const skipHolidays = filterSkipHolidays ? filterSkipHolidays.checked : true;
    const skipAbsent = filterSkipAbsent ? filterSkipAbsent.checked : true;
    const skipEmpty = filterSkipEmpty ? filterSkipEmpty.checked : true;
    const searchEl = document.getElementById('history-search-input');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';

    return allLogs.filter(item => {
      const tgl = item.tanggal || '';
      if (start && tgl && tgl < start) return false;
      if (end && tgl && tgl > end) return false;

      if (q) {
        const hay = `${tgl} ${item.presensi || ''} ${item.uraian || ''} ${item.pembelajaran || ''} ${item.kendala || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const presLow = (item.presensi || '').toLowerCase();
      const statusLow = (item.statusApproval || '').toLowerCase();
      if (skipHolidays && (item.isHoliday || presLow.includes('libur') || statusLow.includes('libur'))) {
        return false;
      }
      if (skipAbsent && (
        presLow.includes('izin') ||
        presLow.includes('sakit') ||
        presLow.includes('tidak hadir') ||
        presLow.includes('tanpa keterangan') ||
        presLow.includes('alpha') ||
        statusLow.includes('ditolak')
      )) {
        return false;
      }
      if (skipEmpty && (!item.uraian || item.uraian === '-' || presLow.includes('belum diisi'))) {
        return false;
      }
      return true;
    });
  }

  function getActivePeriodLabel() {
    const start = filterStartDate ? filterStartDate.value : '';
    const end = filterEndDate ? filterEndDate.value : '';
    if (start && end) return `${start}_sd_${end}`;
    if (filterMonth && filterMonth.value !== 'ALL') {
      return `${filterYear?.value || yyyy}-${filterMonth.value}`;
    }
    return 'Semua_Periode';
  }

  async function loadHistoryTable() {
    const logs = await getFilteredHistory();
    if (historyFilterCount) {
      historyFilterCount.textContent = `Menampilkan ${logs.length} laporan`;
    }

    // Update 4-Column Metric Strip
    const mTotal = document.getElementById('metric-total-logs');
    const mHadir = document.getElementById('metric-hadir-count');
    const mChars = document.getElementById('metric-avg-chars');
    const mRange = document.getElementById('metric-active-range');

    if (mTotal) mTotal.textContent = String(logs.length);
    if (mHadir) {
      const hadirCount = logs.filter(l => (l.presensi || 'Hadir').toLowerCase().includes('hadir') && !(l.presensi || '').toLowerCase().includes('tidak')).length;
      mHadir.textContent = `${hadirCount} hari`;
    }
    if (mChars) {
      const validUraian = logs.filter(l => l.uraian && l.uraian !== '-');
      const avg = validUraian.length > 0
        ? Math.round(validUraian.reduce((sum, l) => sum + l.uraian.length, 0) / validUraian.length)
        : 0;
      mChars.textContent = `${avg} char`;
      mChars.style.color = avg >= 100 ? '#0f766e' : '';
    }
    if (mRange) {
      const s = filterStartDate ? filterStartDate.value : '';
      const e = filterEndDate ? filterEndDate.value : '';
      mRange.textContent = (s && e) ? `${s.slice(5)} s.d. ${e.slice(5)}` : 'Semua Data';
    }

    if (logs.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Tidak ada riwayat laporan sesuai filter tanggal/kehadiran.</td></tr>`;
      return;
    }

    const resolvePeriodShort = (tgl) => {
      if (!tgl || !Array.isArray(detectedPeriods)) return '-';
      const hit = detectedPeriods.find(p => tgl >= p.start && tgl <= p.end);
      return hit ? hit.label : '-';
    };

    historyTableBody.innerHTML = logs.map((l, idx) => {
      const pres = l.presensi || 'Hadir';
      const presLow = pres.toLowerCase();
      let badgeCls = 'valid';
      if (presLow.includes('sakit') || presLow.includes('izin')) badgeCls = 'warning';
      else if (presLow.includes('tidak') || presLow.includes('alpha')) badgeCls = 'invalid';

      const renderCol = (txt) => {
        const val = (txt && txt !== '-') ? txt : '';
        if (!val) return '<span style="color:#94a3b8;">-</span>';
        const len = val.length;
        const pillCls = len >= 100 ? 'ok' : 'warn';
        return `<div class="history-cell-text">${escapeHtml(val)}</div><span class="char-pill ${pillCls}">${len} char</span>`;
      };

      const pLabel = resolvePeriodShort(l.tanggal);

      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
          <td style="font-size: 11.5px; color: #334155; font-weight: 500;">${escapeHtml(pLabel)}</td>
          <td class="text-mono" style="white-space: nowrap; font-weight: 600;">${escapeHtml(l.tanggal || '-')}</td>
          <td><span class="user-badge ${badgeCls}">${escapeHtml(pres)}</span></td>
          <td>${renderCol(l.uraian)}</td>
          <td>${renderCol(l.pembelajaran)}</td>
          <td>${renderCol(l.kendala)}</td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('history-search-input')?.addEventListener('input', loadHistoryTable);

  btnGotoExportTpl?.addEventListener('click', () => {
    switchView('view-export-tpl');
  });

  quickExportTpl?.addEventListener('change', async () => {
    const cfg = await MonevHubExport.getConfig();
    cfg.templateId = quickExportTpl.value;
    await MonevHubExport.saveConfig(cfg);
    const radio = document.querySelector(`input[name="exp-template"][value="${cfg.templateId}"]`);
    if (radio) radio.checked = true;
    showToast(`Template ekspor diganti ke ${MonevHubExport.TEMPLATES[cfg.templateId]?.name || cfg.templateId}.`);
  });

  btnExportPdf?.addEventListener('click', async () => {
    try {
      const logs = await getFilteredHistory();
      const ownerName = sideUserName ? sideUserName.textContent : 'Peserta MagangHub';
      const tplId = quickExportTpl ? quickExportTpl.value : null;
      await MonevHubExport.exportToPDF(logs, getActivePeriodLabel(), ownerName, tplId);
      showToast(`Berhasil ekspor ${logs.length} laporan ke PDF.`);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  btnExportDocx?.addEventListener('click', async () => {
    try {
      const logs = await getFilteredHistory();
      const ownerName = sideUserName ? sideUserName.textContent : 'Peserta MagangHub';
      const tplId = quickExportTpl ? quickExportTpl.value : null;
      await MonevHubExport.exportToDocx(logs, getActivePeriodLabel(), ownerName, tplId);
      showToast(`Berhasil ekspor ${logs.length} laporan ke Word (.docx).`);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // ==========================================
  // VIEW 4B: TEMPLATE & TTD EKSPOR
  // ==========================================
  const ttdImageData = ['', '', ''];

  function updateTtdImagePreview(n, dataUrl) {
    ttdImageData[n - 1] = dataUrl || '';
    const preview = document.getElementById(`ttd${n}-img-preview`);
    const clearBtn = document.getElementById(`ttd${n}-img-clear`);
    if (preview) {
      if (dataUrl) {
        preview.src = dataUrl;
        preview.style.display = 'block';
      } else {
        preview.removeAttribute('src');
        preview.style.display = 'none';
      }
    }
    if (clearBtn) clearBtn.style.display = dataUrl ? 'inline-block' : 'none';
  }

  [1, 2, 3].forEach(n => {
    const fileInput = document.getElementById(`ttd${n}-img-file`);
    const clearBtn = document.getElementById(`ttd${n}-img-clear`);
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.includes('png')) {
        showToast('Gunakan gambar TTD berformat PNG.', true);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        updateTtdImagePreview(n, String(reader.result || ''));
        const chk = document.getElementById(`ttd${n}-use-img`);
        if (chk) chk.checked = true;
        showToast(`Gambar TTD Pihak ${n} siap digunakan.`);
      };
      reader.readAsDataURL(file);
    });
    clearBtn?.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      updateTtdImagePreview(n, '');
      const chk = document.getElementById(`ttd${n}-use-img`);
      if (chk) chk.checked = false;
    });
  });

  async function loadExportConfig() {
    if (typeof MonevHubExport === 'undefined') return;
    const cfg = await MonevHubExport.getConfig();
    if (quickExportTpl) quickExportTpl.value = cfg.templateId || 'tpl1';

    const radio = document.querySelector(`input[name="exp-template"][value="${cfg.templateId || 'tpl1'}"]`);
    if (radio) radio.checked = true;

    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v || '';
    };
    const setChk = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.checked = v !== false;
    };

    setVal('exp-peserta-nama', cfg.pesertaNama);
    setVal('exp-instansi', cfg.instansi);
    setVal('exp-unit', cfg.bagianUnit);
    setVal('exp-bulan-label', cfg.bulanLabel);
    setVal('exp-waktu-sk', cfg.waktuSeninKamis);
    setVal('exp-waktu-jumat', cfg.waktuJumat);
    setVal('exp-waktu-sabtu', cfg.waktuSabtu);
    setVal('exp-orientation', cfg.orientation || 'landscape');
    setChk('exp-show-signature', cfg.showSignature);
    setVal('exp-ttd-kota', cfg.ttdKota);
    setVal('exp-ttd-tanggal', cfg.ttdTanggal);

    (cfg.signatures || []).forEach((s, idx) => {
      const n = idx + 1;
      setChk(`ttd${n}-enabled`, s.enabled);
      setVal(`ttd${n}-alt`, s.altLabel);
      setVal(`ttd${n}-jabatan`, s.jabatan);
      setVal(`ttd${n}-nama`, s.nama);
      setVal(`ttd${n}-nip`, s.nip);
      const useImgEl = document.getElementById(`ttd${n}-use-img`);
      if (useImgEl) useImgEl.checked = Boolean(s.useImage);
      updateTtdImagePreview(n, s.imageDataUrl || '');
    });
  }

  document.getElementById('btn-save-export-tpl')?.addEventListener('click', async () => {
    const checkedRadio = document.querySelector('input[name="exp-template"]:checked');
    const getVal = (id) => (document.getElementById(id)?.value || '').trim();
    const getChk = (id) => Boolean(document.getElementById(id)?.checked);

    const cfg = {
      templateId: checkedRadio ? checkedRadio.value : 'tpl1',
      orientation: getVal('exp-orientation') || 'landscape',
      pesertaNama: getVal('exp-peserta-nama'),
      instansi: getVal('exp-instansi'),
      bagianUnit: getVal('exp-unit'),
      bulanLabel: getVal('exp-bulan-label'),
      waktuSeninKamis: getVal('exp-waktu-sk') || '07.15 – 14.15',
      waktuJumat: getVal('exp-waktu-jumat') || '07.15 – 13.00',
      waktuSabtu: getVal('exp-waktu-sabtu') || '07.15 – 12.30',
      showSignature: getChk('exp-show-signature'),
      ttdKota: getVal('exp-ttd-kota'),
      ttdTanggal: getVal('exp-ttd-tanggal'),
      signatures: [1, 2, 3].map(n => ({
        enabled: getChk(`ttd${n}-enabled`),
        altLabel: document.getElementById(`ttd${n}-alt`)?.value || '',
        jabatan: getVal(`ttd${n}-jabatan`),
        nama: getVal(`ttd${n}-nama`),
        nip: getVal(`ttd${n}-nip`),
        useImage: getChk(`ttd${n}-use-img`),
        imageDataUrl: ttdImageData[n - 1] || ''
      }))
    };

    await MonevHubExport.saveConfig(cfg);
    if (quickExportTpl) quickExportTpl.value = cfg.templateId;
    showToast('Pengaturan Template & Tanda Tangan berhasil disimpan.');
  });

  btnExportCsv?.addEventListener('click', async () => {
    const logs = await getFilteredHistory();

    if (logs.length === 0) {
      showToast('Tidak ada data riwayat untuk diekspor.');
      return;
    }

    let csv = 'Tanggal,Presensi,Uraian Aktivitas,Pembelajaran,Kendala\n';
    logs.forEach(l => {
      const row = [
        `"${(l.tanggal || '').replace(/"/g, '""')}"`,
        `"${(l.presensi || '').replace(/"/g, '""')}"`,
        `"${(l.uraian || '').replace(/"/g, '""')}"`,
        `"${(l.pembelajaran || '').replace(/"/g, '""')}"`,
        `"${(l.kendala || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Log_MonevHub_${getActivePeriodLabel()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File CSV berhasil diunduh.');
  });

  btnExtractPeriodOpt?.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ url: 'https://monev.maganghub.kemnaker.go.id/*' });
    const tab = tabs && tabs[0];
    if (!tab) {
      showToast('Buka halaman Riwayat MagangHub Monev terlebih dahulu di tab lain.', true);
      return;
    }

    const startDate = filterStartDate ? filterStartDate.value : '';
    const endDate = filterEndDate ? filterEndDate.value : '';
    const skipHolidays = filterSkipHolidays ? filterSkipHolidays.checked : true;
    const skipAbsent = filterSkipAbsent ? filterSkipAbsent.checked : true;
    const skipEmpty = filterSkipEmpty ? filterSkipEmpty.checked : true;

    btnExtractPeriodOpt.disabled = true;
    btnExtractPeriodOpt.textContent = 'Mengekstrak Laporan...';
    showToast('Memulai ekstraksi laporan sesuai rentang tanggal & filter...');

    chrome.tabs.sendMessage(tab.id, {
      action: 'SCRAPE_RANGE',
      options: {
        startDate,
        endDate,
        skipHolidays,
        skipAbsent,
        skipEmpty,
        mode: (startDate && endDate) ? 'range' : 'current_period'
      }
    }, async (res) => {
      btnExtractPeriodOpt.disabled = false;
      btnExtractPeriodOpt.innerHTML = `
        <svg class="lucide" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
          <path d="M8 16H3v5"/>
        </svg>
        <span>Ekstrak dari Monev</span>
      `;

      if (chrome.runtime.lastError) {
        showToast('Gagal menghubungi tab Monev. Refresh halaman Monev lalu coba lagi.', true);
        return;
      }

      if (res && res.success) {
        showToast(`Sukses mengekstrak ${res.count} laporan (${res.skippedCount || 0} hari dilewati)!`);
        await loadHistoryTable();
      } else {
        showToast(res ? res.message : 'Ekstraksi gagal atau tab belum merespons.', true);
      }
    });
  });

  btnClearHistory?.addEventListener('click', async () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh log riwayat laporan tersimpan?')) {
      await chrome.storage.local.set({ monevhub_history: [] });
      await loadHistoryTable();
      showToast('Seluruh riwayat lokal telah dibersihkan.');
    }
  });

  // ==========================================
  // VIEW 2: REKAP BULANAN
  // ==========================================
  async function getRecapTargetRangeAndLogs() {
    const mode = recapMode ? recapMode.value : 'custom';
    const detected = detectedPeriods.find(p => p.id === mode);
    let start = '', end = '', periodLabel = '';

    if (detected) {
      start = detected.start;
      end = detected.end;
      periodLabel = detected.label || `Periode ${start} s.d. ${end}`;
      if (recapStartDate) recapStartDate.value = start;
      if (recapEndDate) recapEndDate.value = end;
    } else if (mode === 'all') {
      start = '';
      end = '';
      periodLabel = 'Semua Data Tersimpan';
      if (recapStartDate) recapStartDate.value = '';
      if (recapEndDate) recapEndDate.value = '';
    } else {
      start = recapStartDate ? recapStartDate.value : '';
      end = recapEndDate ? recapEndDate.value : '';
      if (!start && !end) return { start: '', end: '', periodLabel: '', filtered: [], isDetected: false };
      periodLabel = `Rentang ${start || '...'} s.d. ${end || '...'}`;
    }

    const store = await chrome.storage.local.get('monevhub_history');
    const all = store.monevhub_history || [];
    const filtered = all.filter(h => {
      const t = h.tanggal || '';
      if (!t) return false;
      if (start && t < start) return false;
      if (end && t > end) return false;
      if (h.isHoliday) return false;
      const presLow = (h.presensi || 'Hadir').toLowerCase();
      if (presLow.includes('izin') || presLow.includes('sakit') || presLow.includes('tidak') || presLow.includes('alpha') || presLow.includes('libur')) return false;
      return Boolean(h.uraian && h.uraian !== '-');
    });

    return { start, end, periodLabel, filtered, isDetected: Boolean(detected) || mode === 'all' };
  }

  async function updateRecapPreview() {
    const infoBox = document.getElementById('recap-match-info');
    const errBox = document.getElementById('recap-error-box');
    if (errBox) errBox.style.display = 'none';

    const { start, end, periodLabel, filtered, isDetected } = await getRecapTargetRangeAndLogs();
    if (recapStartDate) {
      recapStartDate.disabled = isDetected;
      recapStartDate.style.opacity = isDetected ? '0.6' : '1';
    }
    if (recapEndDate) {
      recapEndDate.disabled = isDetected;
      recapEndDate.style.opacity = isDetected ? '0.6' : '1';
    }
    if (!infoBox) return;

    if (!periodLabel) {
      infoBox.style.display = 'none';
      return;
    }
    infoBox.style.display = 'block';
    const rangeTxt = (start || end) ? ` (${start || '...'} s.d. ${end || '...'})` : '';
    if (filtered.length > 0) {
      infoBox.style.background = '#ecfdf5';
      infoBox.style.borderColor = '#a7f3d0';
      infoBox.style.color = '#065f46';
      infoBox.textContent = `Siap dianalisis: ${filtered.length} log hadir ditemukan untuk ${periodLabel}${rangeTxt}.`;
    } else {
      infoBox.style.background = '#fffbeb';
      infoBox.style.borderColor = '#fde68a';
      infoBox.style.color = '#92400e';
      infoBox.textContent = `Belum ada log hadir lokal untuk ${periodLabel}${rangeTxt}. Buka Log Riwayat lalu klik "Ekstrak dari Monev" terlebih dahulu.`;
    }
  }

  recapMode?.addEventListener('change', updateRecapPreview);
  recapStartDate?.addEventListener('change', () => {
    if (recapMode) recapMode.value = 'custom';
    updateRecapPreview();
  });
  recapEndDate?.addEventListener('change', () => {
    if (recapMode) recapMode.value = 'custom';
    updateRecapPreview();
  });

  btnDoRecap.addEventListener('click', async () => {
    const errBox = document.getElementById('recap-error-box');
    if (errBox) errBox.style.display = 'none';

    const { periodLabel, filtered } = await getRecapTargetRangeAndLogs();
    if (!periodLabel) {
      showToast('Pilih periode atau bulan acuan terlebih dahulu.', true);
      return;
    }

    if (filtered.length === 0) {
      const msg = `Tidak ada data log hadir untuk ${periodLabel}. Ekstrak laporan dari menu Log Riwayat terlebih dahulu.`;
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = 'block';
      }
      showToast(msg, true);
      return;
    }

    btnDoRecap.disabled = true;
    btnDoRecap.querySelector('span').textContent = 'Menganalisis...';

    try {
      const recap = await MonevHubAI.generateMonthlyRecap(filtered, periodLabel);
      recapResultText.value = recap;
      recapResultWrapper.style.display = 'block';
      showToast(`Rekapitulasi ${periodLabel} berhasil dibuat (${filtered.length} hari terintegrasi).`);
    } catch (e) {
      const errMsg = e.message || String(e);
      if (errBox) {
        errBox.textContent = `Gagal menyusun rekapitulasi AI: ${errMsg}`;
        errBox.style.display = 'block';
      }
      showToast('Gagal menyusun rekap: ' + errMsg, true);
    } finally {
      btnDoRecap.disabled = false;
      btnDoRecap.querySelector('span').textContent = 'Susun Rekapitulasi';
    }
  });

  btnCopyRecapOpt.addEventListener('click', () => {
    navigator.clipboard.writeText(recapResultText.value).then(() => {
      showToast('Teks rekapitulasi disalin.');
    });
  });

  btnDownloadRecapOpt.addEventListener('click', () => {
    const blob = new Blob([recapResultText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileLabel = (recapMode && recapMode.value) ? recapMode.value : 'Rekap';
    a.download = `Rekapitulasi_Monev_${fileLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Dokumen rekapitulasi diunduh.');
  });

  // ==========================================
  // VIEW 3: KONFIGURASI AI (TRIO GATEWAY SYSTEM)
  // ==========================================
  optAiMode?.addEventListener('change', () => {
    const mode = optAiMode.value;
    if (boxInjectedOpt) boxInjectedOpt.style.display = mode === 'injected' ? 'block' : 'none';
    if (boxApikeyOpt) boxApikeyOpt.style.display = mode === 'api_key' ? 'block' : 'none';
    if (boxOauthOpt) boxOauthOpt.style.display = mode === 'oauth' ? 'block' : 'none';
  });

  function updateGeminiControlsVisibility() {
    const isGemini = (optApiGateway?.value || 'gemini') === 'gemini';
    if (geminiModelSelect) geminiModelSelect.style.display = 'block';
    if (btnFetchGeminiModels) btnFetchGeminiModels.style.display = 'inline-flex';
    if (btnGetGeminiKey) btnGetGeminiKey.style.display = isGemini ? 'inline-flex' : 'none';
    if (geminiModelsStatus) geminiModelsStatus.style.display = 'block';
  }

  async function fetchAndPopulateGeminiModels(silent = false) {
    const key = (optApiKey?.value || '').trim();
    const gw = optApiGateway?.value || 'gemini';
    const baseUrl = optApiBaseUrl?.value?.trim() || '';
    if (!key) {
      if (!silent) showToast('Masukkan API Key terlebih dahulu.', true);
      return;
    }
    if (btnFetchGeminiModels) {
      btnFetchGeminiModels.disabled = true;
      btnFetchGeminiModels.textContent = 'Memuat...';
    }
    if (geminiModelsStatus) {
      geminiModelsStatus.style.color = '#64748b';
      geminiModelsStatus.textContent = `Mengambil daftar model tersedia dari ${gw.toUpperCase()}...`;
    }

    try {
      const models = await MonevHubAI.fetchAvailableModels(gw, key, baseUrl);
      if (geminiModelSelect && models.length > 0) {
        const curModel = optApiModel?.value || '';
        geminiModelSelect.innerHTML = models
          .map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.id)}${m.displayName && m.displayName !== m.id ? ` (${escapeHtml(m.displayName)})` : ''}</option>`)
          .join('');
        if (curModel && geminiModelSelect.querySelector(`option[value="${curModel}"]`)) {
          geminiModelSelect.value = curModel;
        } else {
          geminiModelSelect.value = models[0].id;
          if (optApiModel) optApiModel.value = models[0].id;
        }
      }
      if (geminiModelsStatus) {
        geminiModelsStatus.textContent = `Ditemukan ${models.length} model tersedia siap pakai.`;
        geminiModelsStatus.style.color = '#0f766e';
      }
      if (!silent) showToast(`Berhasil memuat ${models.length} model tersedia!`);
    } catch (err) {
      if (geminiModelsStatus) {
        geminiModelsStatus.textContent = 'Gagal memuat model: ' + err.message;
        geminiModelsStatus.style.color = '#b91c1c';
      }
      if (!silent) showToast('Gagal memuat model: ' + err.message, true);
    } finally {
      if (btnFetchGeminiModels) {
        btnFetchGeminiModels.disabled = false;
        btnFetchGeminiModels.textContent = 'Muat Model Tersedia';
      }
    }
  }

  btnGetGeminiKey?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://aistudio.google.com/app/apikey' });
  });

  btnPasteApiKey?.addEventListener('click', async () => {
    try {
      const text = (await navigator.clipboard.readText() || '').trim();
      if (!text) {
        showToast('Clipboard kosong.', true);
        return;
      }
      if (optApiKey) optApiKey.value = text;
      showToast('API Key ditempel dari clipboard. Memuat model tersedia...');
      if (text.length >= 15) {
        await fetchAndPopulateGeminiModels(true);
      }
    } catch (e) {
      showToast('Izin clipboard ditolak browser. Tempel manual dengan Ctrl+V.', true);
    }
  });

  btnFetchGeminiModels?.addEventListener('click', () => fetchAndPopulateGeminiModels(false));

  geminiModelSelect?.addEventListener('change', () => {
    if (optApiModel && geminiModelSelect.value) {
      optApiModel.value = geminiModelSelect.value;
      optApiModel.dataset.autoFilled = 'false';
    }
  });

  let keyFetchTimer = null;
  optApiKey?.addEventListener('paste', () => {
    setTimeout(() => {
      const val = (optApiKey.value || '').trim();
      if (val.length >= 15) fetchAndPopulateGeminiModels(true);
    }, 50);
  });

  optApiKey?.addEventListener('input', () => {
    clearTimeout(keyFetchTimer);
    const val = (optApiKey.value || '').trim();
    if (val.length >= 20) {
      keyFetchTimer = setTimeout(() => fetchAndPopulateGeminiModels(true), 700);
    }
  });

  optApiGateway?.addEventListener('change', () => {
    const gw = optApiGateway.value;
    const info = MonevHubAI.DEFAULT_GATEWAYS[gw] || MonevHubAI.DEFAULT_GATEWAYS.custom;
    updateGeminiControlsVisibility();
    if (groupBaseUrl) {
      groupBaseUrl.style.display = gw === 'custom' ? 'block' : 'none';
    }
    if (optApiBaseUrl && gw !== 'custom') {
      optApiBaseUrl.value = info.baseUrl;
    }
    if (optApiModel && (!optApiModel.value || optApiModel.dataset.autoFilled === 'true')) {
      optApiModel.value = info.defaultModel;
      optApiModel.dataset.autoFilled = 'true';
    }
  });

  optApiModel?.addEventListener('input', () => {
    optApiModel.dataset.autoFilled = 'false';
  });

  async function loadAiConfig() {
    const cfg = await MonevHubAI.getConfig();
    let effectiveMode = cfg.mode || 'injected';
    if (effectiveMode === 'api_key' && !(cfg.apiKey || '').trim()) effectiveMode = 'injected';
    if (effectiveMode === 'oauth' && !(cfg.oauthToken || '').trim()) effectiveMode = 'injected';
    if (optAiMode) optAiMode.value = effectiveMode;
    if (optInjectedUrl) optInjectedUrl.value = cfg.gasWebhookUrl || '';
    if (optApiGateway) optApiGateway.value = cfg.gateway || 'gemini';
    if (optApiBaseUrl) optApiBaseUrl.value = cfg.baseUrl || '';
    if (optApiKey) optApiKey.value = cfg.apiKey || '';
    if (optApiModel) optApiModel.value = cfg.model || 'gemini-2.5-flash';
    if (geminiModelSelect && cfg.model && geminiModelSelect.querySelector(`option[value="${cfg.model}"]`)) {
      geminiModelSelect.value = cfg.model;
    }
    if (optOauthToken) optOauthToken.value = cfg.oauthToken || '';

    optAiMode?.dispatchEvent(new Event('change'));
    updateGeminiControlsVisibility();
    optApiGateway?.dispatchEvent(new Event('change'));
    if (cfg.apiKey && cfg.apiKey.length >= 15) {
      fetchAndPopulateGeminiModels(true);
    }
  }

  btnSaveAiOpt?.addEventListener('click', async () => {
    const mode = optAiMode ? optAiMode.value : 'injected';
    const apiKey = optApiKey ? optApiKey.value.trim() : '';
    if (mode === 'api_key' && apiKey.length >= 15) {
      await fetchAndPopulateGeminiModels(true);
    }
    const cfg = {
      mode,
      gasWebhookUrl: optInjectedUrl ? optInjectedUrl.value.trim() : '',
      gateway: optApiGateway ? optApiGateway.value : 'gemini',
      baseUrl: optApiBaseUrl ? optApiBaseUrl.value.trim() : '',
      apiKey,
      model: optApiModel ? optApiModel.value.trim() : 'gemini-2.5-flash',
      oauthToken: optOauthToken ? optOauthToken.value.trim() : ''
    };
    await MonevHubAI.saveConfig(cfg);
    showToast('Konfigurasi AI Trio Gateway berhasil disimpan.');
  });

  document.getElementById('btn-test-ai-conn')?.addEventListener('click', async () => {
    const btnTest = document.getElementById('btn-test-ai-conn');
    const resultBox = document.getElementById('ai-test-result');
    const cfg = {
      mode: optAiMode ? optAiMode.value : 'injected',
      gasWebhookUrl: optInjectedUrl ? optInjectedUrl.value.trim() : '',
      gateway: optApiGateway ? optApiGateway.value : 'gemini',
      baseUrl: optApiBaseUrl ? optApiBaseUrl.value.trim() : '',
      apiKey: optApiKey ? optApiKey.value.trim() : '',
      model: optApiModel ? optApiModel.value.trim() : 'gemini-2.5-flash',
      oauthToken: optOauthToken ? optOauthToken.value.trim() : ''
    };
    if (btnTest) {
      btnTest.disabled = true;
      btnTest.innerHTML = '<span>Menguji Koneksi...</span>';
    }
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.style.background = '#f8fafc';
      resultBox.style.border = '1px solid #cbd5e1';
      resultBox.style.color = '#334155';
      resultBox.textContent = 'Menghubungi endpoint AI...';
    }
    try {
      const res = await MonevHubAI.testConnection(cfg);
      if (resultBox) {
        resultBox.style.background = '#ecfdf5';
        resultBox.style.border = '1px solid #a7f3d0';
        resultBox.style.color = '#065f46';
        resultBox.textContent = `Terhubung: ${res.message || 'OK'}`;
      }
      showToast('Koneksi AI berhasil terhubung.');
    } catch (err) {
      if (resultBox) {
        resultBox.style.background = '#fef2f2';
        resultBox.style.border = '1px solid #fecaca';
        resultBox.style.color = '#991b1b';
        resultBox.textContent = `Gagal terhubung: ${err.message || err}`;
      }
      showToast(`Tes koneksi gagal: ${err.message || err}`, true);
    } finally {
      if (btnTest) {
        btnTest.disabled = false;
        btnTest.innerHTML = '<span>Tes Koneksi AI</span>';
      }
    }
  });

  // ==========================================
  // VIEW 4: TAMPILAN & WIDGET
  // ==========================================
  async function loadDisplaySettings() {
    const store = await chrome.storage.local.get(['monevhub_settings', 'monevhub_location_config']);
    const settings = store.monevhub_settings || { enableFloatingWidget: true };
    const enabled = settings.enableFloatingWidget !== false;
    if (optToggleFloatingWidget) optToggleFloatingWidget.checked = enabled;
    updateDisplayUIState(enabled);

    const loc = store.monevhub_location_config || {};
    const optLocEnabled = document.getElementById('opt-loc-enabled');
    const optLocLat = document.getElementById('opt-loc-lat');
    const optLocLng = document.getElementById('opt-loc-lng');
    if (optLocEnabled) optLocEnabled.checked = loc.sendLocation !== false;
    if (optLocLat) optLocLat.value = loc.defaultLat || '';
    if (optLocLng) optLocLng.value = loc.defaultLng || '';
  }

  document.getElementById('btn-opt-get-gps')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Browser tidak mendukung GPS.', true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latEl = document.getElementById('opt-loc-lat');
        const lngEl = document.getElementById('opt-loc-lng');
        if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
        if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
        showToast('Koordinat GPS saat ini berhasil diambil.');
      },
      (err) => showToast(`Gagal ambil GPS: ${err.message}`, true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  // Modal Peta Interaktif + Google Maps Parser (Pengaturan)
  let optMapPicker = null;
  const modalMapPicker = document.getElementById('modal-map-picker');
  const mapCoordsEl = document.getElementById('map-picked-coords');
  const mapSearchInput = document.getElementById('map-search-input');
  const mapSearchResults = document.getElementById('map-search-results');
  const mapGmapsInput = document.getElementById('map-gmaps-url');

  function openOptMapPicker() {
    if (!modalMapPicker || typeof MonevHubMap === 'undefined') return;
    modalMapPicker.classList.add('open');
    const curLat = parseFloat(document.getElementById('opt-loc-lat')?.value) || -6.200000;
    const curLng = parseFloat(document.getElementById('opt-loc-lng')?.value) || 106.816666;
    if (mapCoordsEl) mapCoordsEl.textContent = `${curLat.toFixed(6)}, ${curLng.toFixed(6)}`;
    if (!optMapPicker) {
      const canvas = document.getElementById('map-picker-canvas');
      if (canvas) {
        optMapPicker = new MonevHubMap.SlippyMapPicker(canvas, {
          lat: curLat,
          lng: curLng,
          zoom: 15,
          onChange: (la, lo) => {
            if (mapCoordsEl) mapCoordsEl.textContent = `${la.toFixed(6)}, ${lo.toFixed(6)}`;
          }
        });
      }
    } else {
      optMapPicker.setCoords(curLat, curLng);
    }
  }

  document.getElementById('btn-opt-open-map')?.addEventListener('click', openOptMapPicker);
  document.getElementById('btn-close-map-modal')?.addEventListener('click', () => modalMapPicker?.classList.remove('open'));
  document.getElementById('btn-cancel-map-modal')?.addEventListener('click', () => modalMapPicker?.classList.remove('open'));
  document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => optMapPicker?.zoomBy(1));
  document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => optMapPicker?.zoomBy(-1));
  document.getElementById('btn-open-gmaps-tab')?.addEventListener('click', () => {
    const la = optMapPicker ? optMapPicker.lat.toFixed(6) : '-6.200000';
    const lo = optMapPicker ? optMapPicker.lng.toFixed(6) : '106.816666';
    chrome.tabs.create({ url: `https://www.google.com/maps/@${la},${lo},17z` });
  });

  document.getElementById('btn-toggle-gmaps-iframe')?.addEventListener('click', () => {
    const canvas = document.getElementById('map-picker-canvas');
    const iframe = document.getElementById('map-gmaps-iframe');
    const zoomCtrls = document.getElementById('map-zoom-controls');
    const btn = document.getElementById('btn-toggle-gmaps-iframe');
    if (!canvas || !iframe) return;

    const showIframe = iframe.style.display === 'none';
    if (showIframe) {
      const la = optMapPicker ? optMapPicker.lat.toFixed(6) : '-6.200000';
      const lo = optMapPicker ? optMapPicker.lng.toFixed(6) : '106.816666';
      iframe.src = `https://maps.google.com/maps?q=${la},${lo}&z=16&output=embed`;
      iframe.style.display = 'block';
      canvas.style.display = 'none';
      if (zoomCtrls) zoomCtrls.style.display = 'none';
      if (btn) btn.textContent = 'Mode Pin Peta';
    } else {
      iframe.style.display = 'none';
      canvas.style.display = 'block';
      if (zoomCtrls) zoomCtrls.style.display = 'flex';
      if (btn) btn.textContent = 'Lihat di Maps';
    }
  });

  mapGmapsInput?.addEventListener('input', () => {
    const parsed = MonevHubMap.parseGoogleMapsUrl(mapGmapsInput.value);
    if (parsed && optMapPicker) {
      optMapPicker.setCoords(parsed.lat, parsed.lng, 16);
      showToast('Koordinat dari link Google Maps berhasil dibaca!');
    }
  });

  mapSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-map-search')?.click();
    }
  });

  document.getElementById('btn-map-search')?.addEventListener('click', async () => {
    const q = (mapSearchInput?.value || '').trim();
    if (!q || !mapSearchResults) return;
    mapSearchResults.style.display = 'block';
    mapSearchResults.innerHTML = '<div style="padding:6px 8px;color:#64748b;">Mencari lokasi...</div>';
    try {
      const items = await MonevHubMap.searchPlaceNominatim(q);
      if (!items.length) {
        mapSearchResults.innerHTML = '<div style="padding:6px 8px;color:#991b1b;">Lokasi tidak ditemukan.</div>';
        return;
      }
      mapSearchResults.innerHTML = items.map(it =>
        `<div class="map-res-item" data-lat="${it.lat}" data-lon="${it.lon}" style="padding:6px 8px;border-bottom:1px solid #f1f5f9;cursor:pointer;">${escapeHtml(it.display_name)}</div>`
      ).join('');
    } catch (err) {
      mapSearchResults.innerHTML = `<div style="padding:6px 8px;color:#991b1b;">${escapeHtml(err.message)}</div>`;
    }
  });

  mapSearchResults?.addEventListener('click', (e) => {
    const item = e.target.closest('.map-res-item');
    if (!item || !optMapPicker) return;
    optMapPicker.setCoords(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), 16);
    mapSearchResults.style.display = 'none';
  });

  document.getElementById('btn-map-save')?.addEventListener('click', async () => {
    if (!optMapPicker) return;
    const latStr = optMapPicker.lat.toFixed(6);
    const lngStr = optMapPicker.lng.toFixed(6);
    const latEl = document.getElementById('opt-loc-lat');
    const lngEl = document.getElementById('opt-loc-lng');
    if (latEl) latEl.value = latStr;
    if (lngEl) lngEl.value = lngStr;
    await chrome.storage.local.set({
      monevhub_location_config: {
        sendLocation: Boolean(document.getElementById('opt-loc-enabled')?.checked),
        defaultLat: latStr,
        defaultLng: lngStr
      }
    });
    modalMapPicker?.classList.remove('open');
    showToast(`Lokasi default disimpan: ${latStr}, ${lngStr}`);
  });

  if (window.location.hash === '#pick-location') {
    switchView('view-settings');
    setTimeout(openOptMapPicker, 200);
  }

  function updateDisplayUIState(enabled) {
    if (optWidgetStatusBadge) {
      optWidgetStatusBadge.className = enabled ? 'user-badge valid' : 'user-badge invalid';
      optWidgetStatusBadge.textContent = enabled ? 'AKTIF' : 'NONAKTIF';
    }
    if (optWidgetStatusDesc) {
      optWidgetStatusDesc.innerHTML = enabled
        ? 'Ketika diaktifkan, bubble melayang <strong>MonevHub</strong> akan tampil di halaman web MonevHub untuk mengisi laporan langsung di layar.'
        : 'Widget melayang <strong>dinonaktifkan</strong>. Gunakan <strong>Bilah Samping (Side Panel)</strong> di sisi kanan browser melalui ikon ekstensi.';
    }
  }

  optToggleFloatingWidget?.addEventListener('change', () => {
    updateDisplayUIState(optToggleFloatingWidget.checked);
  });

  btnSaveDisplayOpt?.addEventListener('click', async () => {
    const enabled = optToggleFloatingWidget ? optToggleFloatingWidget.checked : true;
    const store = await chrome.storage.local.get('monevhub_settings');
    const settings = store.monevhub_settings || {};
    settings.enableFloatingWidget = enabled;
    settings.displayMode = enabled ? 'floating' : 'sidepanel';

    const locCfg = {
      sendLocation: Boolean(document.getElementById('opt-loc-enabled')?.checked),
      defaultLat: (document.getElementById('opt-loc-lat')?.value || '').trim(),
      defaultLng: (document.getElementById('opt-loc-lng')?.value || '').trim()
    };

    await chrome.storage.local.set({
      monevhub_settings: settings,
      monevhub_location_config: locCfg
    });
    showToast('Pengaturan tampilan & lokasi default berhasil disimpan.');
  });

  // ==========================================
  // VIEW 5: LISENSI
  // ==========================================
  async function loadLicenseInfo(forceOnline = false) {
    try {
      const fp = await MonevHubLicense.getHardwareFingerprint();
      optHwFp.textContent = fp;

      const res = await MonevHubLicense.verify(forceOnline);
      const lic = res.data;

      if (res.valid && lic && lic.active) {
        if (licBannerBox) licBannerBox.style.display = 'none';
        const btnOpenLic = document.getElementById('btn-open-license-modal');
        if (btnOpenLic) btnOpenLic.querySelector('span').textContent = 'Ubah Lisensi';

        sideLicStatus.className = 'user-badge valid';
        sideLicStatus.textContent = 'AKTIF';
        sideUserName.textContent = lic.owner || lic.userName || 'Personal';

        optLicOwner.textContent = lic.owner || lic.userName || 'Personal';
        optLicDevice.textContent = lic.deviceName || '-';
        optLicExp.textContent = lic.expiredDate || 'Permanen';

        optInputKey.value = lic.key || '';
        optUserName.value = lic.userName || lic.owner || '';
        optDeviceLabel.value = lic.deviceName || MonevHubLicense.detectDeviceLabel();

        // Update License Expiry Meter
        const meterWrap = document.getElementById('opt-lic-meter-wrap');
        const meterFill = document.getElementById('opt-lic-meter-fill');
        const meterTxt = document.getElementById('opt-lic-meter-txt');
        if (meterWrap && meterFill && meterTxt) {
          meterWrap.style.display = 'block';
          if (lic.expiredDate && lic.expiredDate !== 'Permanen' && !lic.expiredDate.startsWith('2099')) {
            const expTime = new Date(lic.expiredDate + 'T23:59:59').getTime();
            const diffDays = Math.max(0, Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24)));
            const pct = Math.min(100, Math.max(5, Math.round((diffDays / 365) * 100)));
            meterFill.style.width = `${pct}%`;
            meterFill.style.background = diffDays <= 14 ? '#dc2626' : 'linear-gradient(90deg, #0f766e, #10b981)';
            meterTxt.textContent = diffDays > 0 ? `Sisa masa aktif: ${diffDays} hari (berakhir ${lic.expiredDate})` : 'Masa aktif telah berakhir';
          } else {
            meterFill.style.width = '100%';
            meterTxt.textContent = 'Lisensi aktif penuh (Permanen / Jangka Panjang)';
          }
        }
      } else {
        if (licBannerBox) {
          licBannerBox.style.display = 'flex';
          licBannerBox.className = 'lic-status-banner banner-danger';
        }
        licMainStatus.textContent = res.reason || 'BELUM AKTIF';
        licMainMsg.textContent = res.message || 'Lisensi belum diaktivasi pada perangkat ini.';
        const btnOpenLic = document.getElementById('btn-open-license-modal');
        if (btnOpenLic) btnOpenLic.querySelector('span').textContent = 'Aktivasi Lisensi';

        sideLicStatus.className = 'user-badge invalid';
        sideLicStatus.textContent = res.reason || 'NONAKTIF';
        sideUserName.textContent = 'Belum Terdaftar';

        optLicOwner.textContent = '-';
        optLicDevice.textContent = MonevHubLicense.detectDeviceLabel();
        optLicExp.textContent = '-';
        if (optDeviceLabel) optDeviceLabel.value = MonevHubLicense.detectDeviceLabel();

        const meterWrap = document.getElementById('opt-lic-meter-wrap');
        if (meterWrap) meterWrap.style.display = 'none';
      }
    } catch (e) {
      licBannerBox.className = 'lic-status-banner banner-danger';
      licMainStatus.textContent = 'ERROR';
      licMainMsg.textContent = 'Gagal memuat status lisensi: ' + e.message;
    }
  }

  // Modal Aktivasi / Ubah Lisensi
  const modalLicEdit = document.getElementById('modal-license-edit');
  document.getElementById('btn-open-license-modal')?.addEventListener('click', () => {
    modalLicEdit?.classList.add('open');
  });
  const closeLicModal = () => modalLicEdit?.classList.remove('open');
  document.getElementById('btn-close-license-modal')?.addEventListener('click', closeLicModal);
  document.getElementById('btn-cancel-license-modal')?.addEventListener('click', closeLicModal);

  btnActivateOpt.addEventListener('click', async () => {
    const key = optInputKey.value.trim();
    const userName = optUserName.value.trim();
    const devLabel = optDeviceLabel.value.trim();

    if (!key) {
      showToast('Masukkan kunci lisensi terlebih dahulu.', true);
      return;
    }

    btnActivateOpt.disabled = true;
    btnActivateOpt.querySelector('span').textContent = 'Memverifikasi...';

    try {
      const res = await MonevHubLicense.activate(key, devLabel, userName);
      if (res.success) {
        closeLicModal();
        showToast('Aktivasi berhasil! Silakan login ke MonevHub untuk sinkronisasi otomatis.');
        await loadLicenseInfo();
        const guideEl = document.getElementById('post-activation-guide');
        if (guideEl) guideEl.style.display = 'flex';
      } else {
        showToast('Aktivasi ditolak: ' + res.message, true);
        await loadLicenseInfo();
      }
    } catch (e) {
      showToast('Terjadi kesalahan aktivasi: ' + e.message, true);
    } finally {
      btnActivateOpt.disabled = false;
      btnActivateOpt.querySelector('span').textContent = 'Simpan & Aktivasi';
    }
  });

  document.getElementById('btn-open-monevhub-login')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://monev.maganghub.kemnaker.go.id/riwayat' });
  });

  btnVerifyOpt.addEventListener('click', async () => {
    showToast('Menyinkronkan status lisensi...');
    await loadLicenseInfo(true);
    showToast('Sinkronisasi selesai.');
  });

  document.getElementById('btn-copy-hw-fp')?.addEventListener('click', () => {
    const fpText = optHwFp ? optHwFp.textContent.trim() : '';
    if (!fpText || fpText === 'Memuat...') return;
    navigator.clipboard.writeText(fpText).then(() => {
      showToast('Hardware Identifier disalin ke clipboard.');
    });
  });

  function showToast(msg) {
    const toast = document.getElementById('dash-toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
