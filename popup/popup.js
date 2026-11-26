/**
 * MonevHub AI - Ultra-Compact Popup Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  const viewUnactivated = document.getElementById('view-unactivated');
  const viewActivated = document.getElementById('view-activated');
  const statusEl = document.getElementById('popup-status');

  const gateHwFp = document.getElementById('gate-hw-fp');
  const gateInputKey = document.getElementById('gate-input-key');
  const gateUserName = document.getElementById('gate-user-name');
  const gateDeviceName = document.getElementById('gate-device-name');
  const btnGateActivate = document.getElementById('btn-gate-activate');

  const licOwner = document.getElementById('lic-owner');
  const licDevice = document.getElementById('lic-device');
  const licExpired = document.getElementById('lic-expired');
  const licHwFp = document.getElementById('lic-hw-fp');

  const btnModeFloating = document.getElementById('btn-mode-floating');
  const btnModeSidepanel = document.getElementById('btn-mode-sidepanel');
  const logCountEl = document.getElementById('popup-log-count');
  const aiModeEl = document.getElementById('popup-ai-mode');

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = isError ? 'popup-status error' : 'popup-status';
    statusEl.style.display = 'block';
  }

  async function refreshUI() {
    const fp = await MonevHubLicense.getHardwareFingerprint();
    if (gateHwFp) gateHwFp.textContent = fp;
    if (licHwFp) licHwFp.textContent = fp;
    if (gateDeviceName) gateDeviceName.value = MonevHubLicense.detectDeviceLabel();

    const res = await MonevHubLicense.verify(false);
    if (res.valid && res.data && res.data.active) {
      if (viewUnactivated) viewUnactivated.style.display = 'none';
      if (viewActivated) viewActivated.style.display = 'block';
      if (licOwner) licOwner.textContent = res.data.owner || res.data.userName || 'Personal';
      if (licDevice) licDevice.textContent = res.data.deviceName || 'PC-User';
      if (licExpired) licExpired.textContent = res.data.expiredDate || 'Permanen';
    } else {
      if (viewUnactivated) viewUnactivated.style.display = 'block';
      if (viewActivated) viewActivated.style.display = 'none';
    }

    const store = await chrome.storage.local.get(['monevhub_settings', 'monevhub_history', 'monevhub_ai_config']);
    const settings = store.monevhub_settings || {};
    const isSidePanel = settings.displayMode === 'sidepanel' || settings.enableFloatingWidget === false;
    updateModePills(isSidePanel ? 'sidepanel' : 'floating');

    const logs = store.monevhub_history || [];
    if (logCountEl) logCountEl.textContent = `${logs.length} laporan tersimpan`;

    const aiCfg = store.monevhub_ai_config || {};
    const modeLabel = aiCfg.mode === 'api_key' ? 'API Key' : (aiCfg.mode === 'oauth' ? 'OAuth' : 'Injected');
    if (aiModeEl) aiModeEl.textContent = `AI: ${modeLabel}`;
  }

  function updateModePills(mode) {
    if (mode === 'sidepanel') {
      btnModeFloating?.classList.remove('active');
      btnModeSidepanel?.classList.add('active');
    } else {
      btnModeFloating?.classList.add('active');
      btnModeSidepanel?.classList.remove('active');
    }
  }

  async function setDisplayMode(mode) {
    const store = await chrome.storage.local.get('monevhub_settings');
    const settings = store.monevhub_settings || {};
    settings.displayMode = mode;
    settings.enableFloatingWidget = mode === 'floating';
    await chrome.storage.local.set({ monevhub_settings: settings });
    updateModePills(mode);
    setStatus(mode === 'sidepanel' ? 'Mode Bilah Samping aktif. Widget melayang disembunyikan.' : 'Mode Widget Melayang aktif di web Monev.');
  }

  await refreshUI();

  btnModeFloating?.addEventListener('click', () => setDisplayMode('floating'));
  btnModeSidepanel?.addEventListener('click', () => setDisplayMode('sidepanel'));

  // Copy HW Fingerprint
  document.getElementById('btn-copy-fp')?.addEventListener('click', () => {
    const fp = licHwFp?.textContent.trim();
    if (fp) navigator.clipboard.writeText(fp).then(() => setStatus('Hardware ID disalin.'));
  });
  document.getElementById('btn-gate-copy-fp')?.addEventListener('click', () => {
    const fp = gateHwFp?.textContent.trim();
    if (fp) navigator.clipboard.writeText(fp).then(() => setStatus('Hardware ID disalin.'));
  });

  // Activation Gate
  btnGateActivate?.addEventListener('click', async () => {
    const key = (gateInputKey?.value || '').trim();
    if (!key) {
      setStatus('Masukkan kode lisensi terlebih dahulu.', true);
      gateInputKey?.focus();
      return;
    }

    btnGateActivate.disabled = true;
    btnGateActivate.querySelector('span').textContent = 'Memverifikasi...';

    try {
      const res = await MonevHubLicense.activate(key, gateDeviceName?.value || '', gateUserName?.value || '');
      if (res.success) {
        setStatus('Aktivasi berhasil!');
        await refreshUI();
      } else {
        setStatus(res.message || 'Aktivasi ditolak.', true);
      }
    } catch (e) {
      setStatus('Gagal terhubung ke server lisensi.', true);
    } finally {
      btnGateActivate.disabled = false;
      btnGateActivate.querySelector('span').textContent = 'Aktifkan Perangkat';
    }
  });

  // Open Side Panel
  document.getElementById('btn-open-sidepanel')?.addEventListener('click', async () => {
    try {
      const win = await chrome.windows.getCurrent();
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: win.id });
        window.close();
      } else {
        setStatus('Browser tidak mendukung Side Panel API.', true);
      }
    } catch (e) {
      setStatus('Gagal membuka Side Panel: ' + e.message, true);
    }
  });

  // Open In-Page Floating Form on MonevHub Tab
  document.getElementById('btn-open-inpage')?.addEventListener('click', async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let targetTab = activeTab && activeTab.url && activeTab.url.includes('monev.maganghub.kemnaker.go.id') ? activeTab : null;
    if (!targetTab) {
      const tabs = await chrome.tabs.query({ url: 'https://monev.maganghub.kemnaker.go.id/*' });
      targetTab = tabs && tabs[0] ? tabs[0] : null;
    }
    if (!targetTab) {
      setStatus('Buka halaman web MonevHub terlebih dahulu.', true);
      return;
    }
    chrome.tabs.sendMessage(targetTab.id, { action: 'OPEN_INPAGE_MODAL' }, () => {
      if (chrome.runtime.lastError) {
        setStatus('Refresh halaman MonevHub terlebih dahulu.', true);
        return;
      }
      window.close();
    });
  });

  // Open Full Dashboard & Options
  document.getElementById('btn-open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
