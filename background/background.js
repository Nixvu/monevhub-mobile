/**
 * MonevHub Background Service Worker (Manifest V3)
 * Mengelola lisensi background check, default storage, dan pesan antar script
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[MonevHub] Extension Installed/Updated:', details.reason);

  // Inisialisasi storage awal jika belum ada
  const store = await chrome.storage.local.get(['monevhub_ai_config', 'monevhub_license', 'monevhub_history']);

  if (!store.monevhub_ai_config) {
    await chrome.storage.local.set({
      monevhub_ai_config: {
        provider: 'gemini_direct',
        geminiApiKey: '',
        model: 'gemini-1.5-flash',
        gasWebhookUrl: ''
      }
    });
  }

  if (!store.monevhub_history) {
    await chrome.storage.local.set({
      monevhub_history: []
    });
  }
});

// Listener pesan dari content script / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_OPTIONS') {
    if (message.hash) {
      chrome.tabs.create({ url: chrome.runtime.getURL(`options/options.html${message.hash}`) });
    } else {
      chrome.runtime.openOptionsPage();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'SAVE_HISTORY') {
    handleSaveHistory(message.data).then(res => sendResponse(res));
    return true; // Asinkron
  }

  if (message.action === 'GET_HISTORY') {
    chrome.storage.local.get('monevhub_history').then(store => {
      sendResponse({ success: true, history: store.monevhub_history || [] });
    });
    return true;
  }

  if (message.action === 'SET_GEOLOCATION_OVERRIDE') {
    const tabId = message.tabId || (sender && sender.tab && sender.tab.id);
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID tidak ditemukan.' });
      return true;
    }
    const lat = parseFloat(message.lat);
    const lng = parseFloat(message.lng);
    const enabled = Boolean(message.enabled) && !Number.isNaN(lat) && !Number.isNaN(lng);

    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (inLat, inLng, isEnabled) => {
        window.__mhGeoOverride = { enabled: isEnabled, lat: inLat, lng: inLng };
        if (!navigator.geolocation) return;
        if (!navigator.geolocation.__mhPatched) {
          const origGet = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
          const origWatch = navigator.geolocation.watchPosition.bind(navigator.geolocation);
          const makePos = (la, lo) => ({
            coords: {
              latitude: la,
              longitude: lo,
              accuracy: 15,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
          navigator.geolocation.getCurrentPosition = function(success, error, opts) {
            const ov = window.__mhGeoOverride;
            if (ov && ov.enabled && typeof success === 'function') {
              setTimeout(() => success(makePos(ov.lat, ov.lng)), 10);
              return;
            }
            return origGet(success, error, opts);
          };
          navigator.geolocation.watchPosition = function(success, error, opts) {
            const ov = window.__mhGeoOverride;
            if (ov && ov.enabled && typeof success === 'function') {
              const id = setTimeout(() => success(makePos(ov.lat, ov.lng)), 10);
              return id;
            }
            return origWatch(success, error, opts);
          };
          navigator.geolocation.__mhPatched = true;
        }
      },
      args: [lat, lng, enabled]
    }).then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleSaveHistory(item) {
  try {
    const store = await chrome.storage.local.get('monevhub_history');
    const history = store.monevhub_history || [];

    // Cek apakah tanggal ini sudah ada di log, jika sudah ada timpa
    const existingIndex = history.findIndex(h => h.tanggal === item.tanggal);
    if (existingIndex >= 0) {
      history[existingIndex] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      history.unshift({ ...item, createdAt: new Date().toISOString() });
    }

    // Simpan maksimal 120 riwayat terakhir
    if (history.length > 120) {
      history.splice(120);
    }

    await chrome.storage.local.set({ monevhub_history: history });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
