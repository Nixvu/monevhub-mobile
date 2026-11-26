/**
 * GOOGLE APPS SCRIPT - DATABASE LISENSI MONEVHUB (PERSONAL & ANTI-DUPLIKASI)
 * Sistem Lisensi 1 Kunci = 1 Komputer / Laptop (Hardware-Bound)
 * Dilengkapi Logging Multi-Device & Deteksi Penjualan Ulang / Kloning
 *
 * STRUKTUR HEADER SHEET "LISENSI" (Baris 1):
 * A1: No
 * B1: License Key
 * C1: Nama Pengguna
 * D1: Nama Device
 * E1: HW Fingerprint
 * F1: Tgl Aktivasi
 * G1: Status (AKTIF / BLOKIR / SUSPEND_DUPLIKAT)
 * H1: Tgl Expired (YYYY-MM-DD, contoh: 2027-12-31)
 * I1: Limit Fiture (ALL)
 * J1: Terakhir Online
 * K1: Status Duplikasi (AMAN / TERDETEKSI_DUPLIKAT)
 *
 * STRUKTUR HEADER SHEET "LOG_AKSES" (Baris 1):
 * A1: Timestamp
 * B1: License Key
 * C1: Nama Pengguna
 * D1: Nama Device
 * E1: HW Fingerprint
 * F1: Tipe Event (AKTIVASI / VERIFIKASI / PERCOBAAN_DUPLIKAT)
 * G1: Status Respons (SUCCESS / BLOCKED)
 * H1: Keterangan
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const params = e.parameter || {};
    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {}
    }

    const action = (params.action || postData.action || 'verify').trim().toLowerCase();
    const key = (params.key || postData.key || '').trim().toUpperCase();
    const userName = (params.userName || postData.userName || '').trim();
    const deviceName = (params.deviceName || postData.deviceName || '').trim();
    const fingerprint = (params.fingerprint || postData.fingerprint || '').trim();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetLic = ss.getSheetByName('LISENSI');
    if (!sheetLic) {
      sheetLic = setupLicenseSheet(ss);
    }
    let sheetLogAkses = ss.getSheetByName('LOG_AKSES');
    if (!sheetLogAkses) {
      sheetLogAkses = setupLogAksesSheet(ss);
    }

    const nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

    // 1. ROUTE: AKTIVASI LISENSI
    if (action === 'activate') {
      if (!key || !fingerprint) {
        return jsonResponse({ success: false, message: 'Kunci lisensi dan identifier hardware wajib disertakan.' });
      }

      const rows = sheetLic.getDataRange().getValues();
      let foundRow = -1;
      let rowData = null;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).trim().toUpperCase() === key) {
          foundRow = i + 1;
          rowData = rows[i];
          break;
        }
      }

      if (foundRow === -1) {
        logAkses(sheetLogAkses, nowStr, key, userName, deviceName, fingerprint, 'AKTIVASI', 'BLOCKED', 'Kunci lisensi tidak ditemukan di server.');
        return jsonResponse({ success: false, message: 'Kunci lisensi tidak ditemukan di database server.' });
      }

      const currentUserName = rowData[2] || userName || 'Pengguna MonevHub';
      const status = String(rowData[6]).trim().toUpperCase();
      if (status !== 'AKTIF') {
        logAkses(sheetLogAkses, nowStr, key, currentUserName, deviceName, fingerprint, 'AKTIVASI', 'BLOCKED', `Status lisensi: ${status}`);
        return jsonResponse({
          success: false,
          message: status === 'SUSPEND_DUPLIKAT'
            ? 'Lisensi Anda terindikasi digunakan pada beberapa perangkat. Akses dibekukan. Silakan hubungi pembuat.'
            : `Status lisensi ini ${status}. Hubungi admin penyedia.`
        });
      }

      // Cek tanggal kadaluarsa
      const expDate = parseDate(rowData[7]);
      if (expDate && new Date() > expDate) {
        logAkses(sheetLogAkses, nowStr, key, currentUserName, deviceName, fingerprint, 'AKTIVASI', 'BLOCKED', 'Lisensi telah kedaluwarsa.');
        return jsonResponse({ success: false, message: 'Masa aktif lisensi ini telah berakhir.' });
      }

      const existingFp = String(rowData[4]).trim();

      // Kasus A: Kunci belum pernah diikat ke perangkat manapun
      if (!existingFp || existingFp === '-') {
        sheetLic.getRange(foundRow, 3).setValue(userName || rowData[2] || 'Pengguna');
        sheetLic.getRange(foundRow, 4).setValue(deviceName || 'Perangkat Utama');
        sheetLic.getRange(foundRow, 5).setValue(fingerprint);
        sheetLic.getRange(foundRow, 6).setValue(nowStr);
        sheetLic.getRange(foundRow, 10).setValue(nowStr);
        sheetLic.getRange(foundRow, 11).setValue('AMAN');

        logAkses(sheetLogAkses, nowStr, key, userName || rowData[2], deviceName, fingerprint, 'AKTIVASI_BARU', 'SUCCESS', 'Perangkat berhasil terikat.');

        return jsonResponse({
          success: true,
          message: 'Aktivasi perangkat berhasil! Lisensi aktif.',
          owner: userName || rowData[2] || 'Pengguna MonevHub',
          expiredDate: formatDateString(rowData[7]),
          features: rowData[8] || 'ALL'
        });
      }

      // Kasus B: Kunci sudah terikat pada hardware yang sama persis
      if (existingFp === fingerprint) {
        sheetLic.getRange(foundRow, 10).setValue(nowStr);
        logAkses(sheetLogAkses, nowStr, key, currentUserName, deviceName, fingerprint, 'RE_AKTIVASI', 'SUCCESS', 'Aktivasi ulang dari perangkat yang sama.');
        return jsonResponse({
          success: true,
          message: 'Perangkat sudah terverifikasi sebelumnya.',
          owner: currentUserName,
          expiredDate: formatDateString(rowData[7]),
          features: rowData[8] || 'ALL'
        });
      }

      // Kasus C: INDIKASI DUPLIKASI / CLONING / RESALE ILEGAL (HW Fingerprint berbeda)
      const duplikatCount = (Number(sheetLic.getRange(foundRow, 11).getValue().toString().match(/\d+/) || [0])[0]) + 1;
      const duplikatNotice = `TERDETEKSI (${duplikatCount}x Coba)`;
      sheetLic.getRange(foundRow, 11).setValue(duplikatNotice);

      // Jika mencoba lebih dari 3x dari device asing, otomatis kunci lisensi
      if (duplikatCount >= 3) {
        sheetLic.getRange(foundRow, 7).setValue('SUSPEND_DUPLIKAT');
      }

      logAkses(sheetLogAkses, nowStr, key, userName || currentUserName, deviceName, fingerprint, 'PERCOBAAN_DUPLIKAT', 'BLOCKED', `Mencoba aktivasi dari device berbeda. Terdaftar: ${existingFp}, Diminta: ${fingerprint}`);

      return jsonResponse({
        success: false,
        status: 'DUPLICATE_DETECTED',
        message: 'Lisensi Anda terindikasi digunakan duplikat pada perangkat lain / dijual ulang. Akses diblokir. Silakan hubungi pembuat untuk konfirmasi kepemilikan.'
      });
    }

    // 2. ROUTE: VERIFIKASI LISENSI
    if (action === 'verify') {
      if (!key || !fingerprint) {
        return jsonResponse({ success: false, status: 'INVALID', message: 'Parameter tidak lengkap.' });
      }

      const rows = sheetLic.getDataRange().getValues();
      let foundRow = -1;
      let rowData = null;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).trim().toUpperCase() === key) {
          foundRow = i + 1;
          rowData = rows[i];
          break;
        }
      }

      if (foundRow === -1) {
        return jsonResponse({ success: false, status: 'NOT_FOUND', message: 'Kunci tidak terdaftar.' });
      }

      const currentUserName = rowData[2] || 'Pengguna';
      const status = String(rowData[6]).trim().toUpperCase();
      const existingFp = String(rowData[4]).trim();

      if (status !== 'AKTIF') {
        return jsonResponse({
          success: false,
          status: status,
          message: status === 'SUSPEND_DUPLIKAT'
            ? 'Lisensi Anda terindikasi digunakan duplikat pada perangkat lain. Silakan hubungi pembuat.'
            : 'Lisensi telah dinonaktifkan/diblokir.'
        });
      }

      if (existingFp && existingFp !== '-' && existingFp !== fingerprint) {
        logAkses(sheetLogAkses, nowStr, key, currentUserName, deviceName, fingerprint, 'VERIFIKASI_ILLEGAL', 'BLOCKED', `Mismatch FP: Terdaftar ${existingFp} vs ${fingerprint}`);
        return jsonResponse({
          success: false,
          status: 'DUPLICATE_DETECTED',
          message: 'Lisensi Anda terindikasi digunakan pada perangkat lain. Silakan hubungi pembuat.'
        });
      }

      const expDate = parseDate(rowData[7]);
      if (expDate && new Date() > expDate) {
        return jsonResponse({ success: false, status: 'EXPIRED', message: 'Lisensi kedaluwarsa.' });
      }

      // Update waktu terakhir online
      sheetLic.getRange(foundRow, 10).setValue(nowStr);

      return jsonResponse({
        success: true,
        status: 'AKTIF',
        owner: currentUserName,
        expiredDate: formatDateString(rowData[7]),
        features: rowData[8] || 'ALL'
      });
    }

    // 3. ROUTE: LOG LAPORAN HARIAN
    if (action === 'log_activity') {
      let sheetLog = ss.getSheetByName('LOG_KEGIATAN');
      if (!sheetLog) {
        sheetLog = ss.insertSheet('LOG_KEGIATAN');
        sheetLog.appendRow(['Timestamp', 'License Key', 'Tanggal', 'Presensi', 'Uraian', 'Pembelajaran', 'Kendala']);
        sheetLog.getRange('1:1').setFontWeight('bold');
      }

      const log = postData.payload || {};
      sheetLog.appendRow([
        nowStr,
        key,
        log.tanggal || '',
        log.presensi || 'Hadir',
        log.uraian || '',
        log.pembelajaran || '',
        log.kendala || ''
      ]);

      return jsonResponse({ success: true, message: 'Log aktivitas tersimpan di Google Sheet.' });
    }

    // 4. ROUTE: INJECTED AI & TEST KONEKSI (MEMBACA API KEY DARI SHEET "AI_KEYS")
    if (action === 'ai_daily' || action === 'ai_recap' || action === 'test_ai') {
      const rows = sheetLic.getDataRange().getValues();
      let isValidLic = false;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).trim().toUpperCase() === key &&
            String(rows[i][4]).trim() === fingerprint &&
            String(rows[i][6]).trim().toUpperCase() === 'AKTIF') {
          isValidLic = true;
          break;
        }
      }

      if (!isValidLic) {
        return jsonResponse({
          success: false,
          message: 'Akses AI Sistem ditolak. Lisensi belum aktif atau tidak valid pada perangkat ini.'
        });
      }

      const aiKeyConfigs = getMasterAiKeysFromSheet(ss);
      if (aiKeyConfigs.length === 0) {
        return jsonResponse({
          success: false,
          message: 'Belum ada API Key berstatus AKTIF di sheet "AI_KEYS" (atau MASTER_AI_KEY di Script Properties).'
        });
      }

      if (action === 'test_ai') {
        const pingBody = {
          contents: [{ role: 'user', parts: [{ text: 'Balas tepat satu kata: OK' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 10 }
        };
        const pingRes = callGeminiWithKeyRotation(aiKeyConfigs, pingBody);
        if (pingRes.success) {
          return jsonResponse({
            success: true,
            model: pingRes.model,
            message: 'Koneksi Server AI Spreadsheet berhasil! Model aktif: ' + pingRes.model
          });
        }
        return jsonResponse({ success: false, message: 'Gagal tes AI Server: ' + pingRes.error });
      }

      if (action === 'ai_daily') {
        return executeServerAiDaily(aiKeyConfigs, postData.payload);
      } else {
        return executeServerAiRecap(aiKeyConfigs, postData.payload);
      }
    }

    return jsonResponse({ success: false, message: 'Aksi tidak dikenal.' });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Server Exception: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ambil daftar API Key aktif dari Sheet "AI_KEYS" (fallback ke Script Properties)
 */
function getMasterAiKeysFromSheet(ss) {
  let sheetAi = ss.getSheetByName('AI_KEYS');
  if (!sheetAi) {
    sheetAi = ss.insertSheet('AI_KEYS');
    const headers = ['No', 'Provider', 'API Key', 'Model', 'Status', 'Catatan'];
    sheetAi.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheetAi.getRange('1:1').setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    sheetAi.appendRow([1, 'gemini', 'TEMPEL_API_KEY_GEMINI_DISINI', 'gemini-2.5-flash', 'NONAKTIF', 'Ubah Status ke AKTIF setelah mengisi API Key']);
    sheetAi.setFrozenRows(1);
  }

  const rows = sheetAi.getDataRange().getValues();
  const list = [];
  for (var i = 1; i < rows.length; i++) {
    var apiKey = String(rows[i][2] || '').trim();
    var model = String(rows[i][3] || '').trim() || 'gemini-2.5-flash';
    var status = String(rows[i][4] || '').trim().toUpperCase();
    if (status === 'AKTIF' && apiKey && apiKey.indexOf('TEMPEL_') !== 0) {
      list.push({ apiKey: apiKey, model: model });
    }
  }

  if (list.length === 0) {
    const props = PropertiesService.getScriptProperties();
    const fallbackKey = (props.getProperty('MASTER_AI_KEY') || '').trim();
    if (fallbackKey) {
      list.push({ apiKey: fallbackKey, model: 'gemini-2.5-flash' });
    }
  }
  return list;
}

/**
 * Ambil daftar model Gemini aktif dari API jika model di sheet tidak tersedia
 */
function discoverActiveGeminiModels(apiKey) {
  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);
    var res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return [];
    var data = JSON.parse(res.getContentText() || '{}');
    var raw = data.models || [];
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var m = raw[i];
      var methods = m.supportedGenerationMethods || [];
      var id = String(m.name || '').replace(/^models\//, '');
      var low = id.toLowerCase();
      if (methods.indexOf('generateContent') !== -1 &&
          low.indexOf('gemini') !== -1 &&
          low.indexOf('embedding') === -1 &&
          low.indexOf('tts') === -1 &&
          low.indexOf('image') === -1 &&
          low.indexOf('audio') === -1) {
        out.push(id);
      }
    }
    // Prioritaskan model flash
    out.sort(function(a, b) {
      var af = a.indexOf('flash') !== -1 ? 0 : 1;
      var bf = b.indexOf('flash') !== -1 ? 0 : 1;
      return af !== bf ? af - bf : a.localeCompare(b);
    });
    return out;
  } catch (e) {
    return [];
  }
}

/**
 * Eksekusi Panggilan Google Gemini dengan Rotasi API Key & Model dari Sheet AI_KEYS
 */
function callGeminiWithKeyRotation(keyConfigs, body) {
  let lastError = '';

  for (var k = 0; k < keyConfigs.length; k++) {
    var cfg = keyConfigs[k];
    var uniqueModels = [];
    if (cfg.model) uniqueModels.push(cfg.model);

    var discovered = null;
    var tryModelList = function(list) {
      for (var i = 0; i < list.length; i++) {
        var modelName = list[i];
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + cfg.apiKey;
        try {
          var response = UrlFetchApp.fetch(url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(body),
            muteHttpExceptions: true
          });
          var code = response.getResponseCode();
          var contentText = response.getContentText();
          if (code === 200) {
            var resJson = JSON.parse(contentText);
            var text = resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content && resJson.candidates[0].content.parts[0].text;
            if (text) {
              return { success: true, text: text, model: modelName };
            }
          } else {
            lastError = 'HTTP ' + code + ': ' + contentText;
          }
        } catch (e) {
          lastError = e.toString();
        }
      }
      return null;
    };

    var hit = uniqueModels.length > 0 ? tryModelList(uniqueModels) : null;
    if (hit) return hit;

    // Jika model di sheet kosong atau gagal (misal 404/deprecated), auto-discover dari API
    discovered = discoverActiveGeminiModels(cfg.apiKey).filter(function(m) {
      return uniqueModels.indexOf(m) === -1;
    });
    if (discovered.length > 0) {
      hit = tryModelList(discovered.slice(0, 4));
      if (hit) return hit;
    }
  }

  return { success: false, error: lastError };
}

/**
 * Eksekusi Server-Side AI Laporan Harian (Gemini Flash Auto-Fallback)
 */
function executeServerAiDaily(keyConfigs, payload) {
  const p = payload || {};
  const rawKegiatan = p.rawKegiatan || 'Melaksanakan tugas dan instruksi kerja operasional harian.';
  const hasKendala = Boolean(p.hasKendala);
  const rawKendala = (p.rawKendala || '').trim();

  const systemInstruction = 'Anda adalah asisten AI profesional untuk peserta MagangHub Kemnaker. Ubah catatan kegiatan menjadi 3 field laporan resmi formal: uraian_aktivitas, pembelajaran, kendala. MASING-MASING WAJIB PANJANG MINIMAL 105 KARAKTER DALAM BAHASA INDONESIA FORMAL. Output format JSON murni: {\"uraian_aktivitas\":\"...\",\"pembelajaran\":\"...\",\"kendala\":\"...\"}';
  const userPrompt = 'Catatan Kegiatan: ' + rawKegiatan + '\nAda Kendala: ' + (hasKendala ? 'YA: ' + rawKendala : 'TIDAK (tulis lancar)');

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
  };

  const res = callGeminiWithKeyRotation(keyConfigs, body);
  if (!res.success) {
    return jsonResponse({ success: false, message: 'AI Server Error: ' + res.error });
  }

  try {
    let parsed = JSON.parse(res.text);
    return jsonResponse({ success: true, data: parsed, modelUsed: res.model });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Gagal membaca format JSON dari server AI.' });
  }
}

/**
 * Eksekusi Server-Side AI Rekapitulasi Bulanan
 */
function executeServerAiRecap(keyConfigs, payload) {
  const p = payload || {};
  const dailyLogs = p.dailyLogs || [];
  const bulanTahun = p.bulanTahun || 'Bulan Ini';

  let logText = '';
  for (var i = 0; i < dailyLogs.length; i++) {
    logText += '[Hari ' + (i + 1) + ' - ' + (dailyLogs[i].tanggal || '-') + ']\n' +
      '- Presensi: ' + (dailyLogs[i].presensi || 'Hadir') + '\n' +
      '- Uraian: ' + (dailyLogs[i].uraian || '-') + '\n' +
      '- Pembelajaran: ' + (dailyLogs[i].pembelajaran || '-') + '\n' +
      '- Kendala: ' + (dailyLogs[i].kendala || '-') + '\n\n';
  }

  const systemInstruction = 'Anda adalah asisten senior pembuat laporan evaluasi bulanan MagangHub Kemnaker. Analisis seluruh log aktivitas dan susun laporan rekapitulasi bulanan resmi berbobot evaluatif tinggi: 1. RINGKASAN EKSEKUTIF, 2. CAPAIAN UTAMA, 3. REKAPITULASI PEMBELAJARAN, 4. EVALUASI KENDALA & REKOMENDASI SOLUSI. Tulis dalam TEKS POLOS tanpa simbol Markdown (*, **, #, backtick).';
  const userPrompt = 'Berikut data kegiatan periode ' + bulanTahun + ':\n\n' + logText;

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.5 }
  };

  const res = callGeminiWithKeyRotation(keyConfigs, body);
  if (!res.success) {
    return jsonResponse({ success: false, message: 'AI Server Recap Error: ' + res.error });
  }

  return jsonResponse({ success: true, data: res.text, modelUsed: res.model });
}

/**
 * Catat log setiap percobaan login atau aktivasi
 */
function logAkses(sheetLogAkses, timestamp, key, userName, deviceName, fingerprint, eventType, responseStatus, note) {
  try {
    sheetLogAkses.appendRow([
      timestamp,
      key,
      userName || '-',
      deviceName || '-',
      fingerprint || '-',
      eventType,
      responseStatus,
      note || ''
    ]);
  } catch (e) {}
}

/**
 * Setup Header Sheet LISENSI
 */
function setupLicenseSheet(ss) {
  let sheet = ss.getSheetByName('LISENSI');
  if (!sheet) {
    sheet = ss.insertSheet('LISENSI', 0);
  }
  const headers = [
    'No', 'License Key', 'Nama Pengguna', 'Nama Device',
    'HW Fingerprint', 'Tgl Aktivasi', 'Status', 'Tgl Expired',
    'Limit Fiture', 'Terakhir Online', 'Indikasi Duplikat'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange('1:1').setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Setup Header Sheet LOG_AKSES
 */
function setupLogAksesSheet(ss) {
  let sheet = ss.getSheetByName('LOG_AKSES');
  if (!sheet) {
    sheet = ss.insertSheet('LOG_AKSES', 1);
  }
  const headers = [
    'Timestamp', 'License Key', 'Nama Pengguna', 'Nama Device',
    'HW Fingerprint', 'Tipe Event', 'Status Respons', 'Keterangan'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange('1:1').setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Menu otomatis di bar Google Spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ MonevHub Lisensi')
    .addItem('Generate 10 Kunci Lisensi Baru', 'generate10Keys')
    .addItem('Generate 50 Kunci Lisensi Baru', 'generate50Keys')
    .addItem('Reset Lisensi (Buka Kunci Perangkat)', 'resetSelectedKey')
    .addToUi();
}

function generate10Keys() {
  generateBatchKeys(10);
}

function generate50Keys() {
  generateBatchKeys(50);
}

function generateBatchKeys(count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LISENSI');
  if (!sheet) sheet = setupLicenseSheet(ss);

  const lastRow = sheet.getLastRow();
  const nextNo = lastRow > 1 ? Number(sheet.getRange(lastRow, 1).getValue()) + 1 : 1;

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const expStr = Utilities.formatDate(nextYear, 'Asia/Jakarta', 'yyyy-MM-dd');

  const rows = [];
  for (let i = 0; i < count; i++) {
    const k = generateRandomKey();
    rows.push([
      nextNo + i,
      k,
      'Pengguna Personal',
      '',
      '',
      '',
      'AKTIF',
      expStr,
      'ALL',
      '',
      'AMAN'
    ]);
  }

  sheet.getRange(lastRow + 1, 1, rows.length, 11).setValues(rows);
  SpreadsheetApp.getUi().alert(`Berhasil menambahkan ${count} kunci lisensi baru siap pakai!`);
}

function resetSelectedKey() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== 'LISENSI') {
    SpreadsheetApp.getUi().alert('Buka tab LISENSI dan pilih baris yang ingin direset.');
    return;
  }
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Pilih baris lisensi pengguna (bukan baris header).');
    return;
  }

  const key = sheet.getRange(row, 2).getValue();
  sheet.getRange(row, 4).setValue(''); // Kosongkan Device
  sheet.getRange(row, 5).setValue(''); // Kosongkan HW Fingerprint
  sheet.getRange(row, 6).setValue(''); // Kosongkan Tgl Aktivasi
  sheet.getRange(row, 7).setValue('AKTIF'); // Reset status AKTIF
  sheet.getRange(row, 11).setValue('AMAN'); // Reset status duplikasi

  SpreadsheetApp.getUi().alert(`Kunci ${key} berhasil direset! Pengguna dapat mengaktivasi ulang di perangkat baru.`);
}

function generateRandomKey() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const chunk = (len) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `MH-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateString(val) {
  if (!val) return '2099-12-31';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  return String(val).substring(0, 10);
}
