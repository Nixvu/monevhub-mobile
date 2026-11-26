/**
 * MonevHub Universal AI Engine - Trio Gateway Architecture
 * 
 * 3 Pilihan Fleksibel Integrasi AI:
 * 1. INJECTED (Injeksi Langsung dari Pembuat / Zero Config bagi Pengguna Akhir)
 * 2. API KEY (Universal Gateway: OpenAI, Gemini, DeepSeek, Groq, OpenRouter, Custom URL)
 * 3. OAUTH (Login / Token Akun AI Pribadi)
 * 
 * Standar Ketat Output Monev MagangHub Kemnaker:
 * - Minimal 100 Karakter per field (Uraian, Pembelajaran, Kendala)
 * - Gaya Bahasa Formal, Terstruktur, Korporat & Birokrasi
 * - Sintesis Rekapitulasi Bulanan Berbobot Evaluasi
 */
(function(global) {
  'use strict';

  const MonevHubAI = {
    // Model & Gateway Defaults
    DEFAULT_GATEWAYS: {
      gemini: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        defaultModel: 'gemini-2.5-flash',
        isOpenAICompatible: false
      },
      openai: {
        name: 'OpenAI (Official)',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        isOpenAICompatible: true
      },
      deepseek: {
        name: 'DeepSeek AI',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        isOpenAICompatible: true
      },
      groq: {
        name: 'Groq Cloud (Fast)',
        baseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.3-70b-versatile',
        isOpenAICompatible: true
      },
      custom: {
        name: 'Custom OpenAI Gateway',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct',
        isOpenAICompatible: true
      }
    },

    /**
     * Ambil Konfigurasi AI dari Storage
     */
    async getConfig() {
      const store = await chrome.storage.local.get('monevhub_ai_config');
      const cfg = store.monevhub_ai_config || {};
      return {
        mode: cfg.mode || 'injected', // 'injected' | 'api_key' | 'oauth'
        // Mode 1: Injected dari Pembuat
        gasWebhookUrl: cfg.gasWebhookUrl || '',
        // Mode 2: Universal API Key
        gateway: cfg.gateway || 'gemini',
        apiKey: cfg.apiKey || cfg.geminiApiKey || '',
        baseUrl: cfg.baseUrl || '',
        model: (cfg.model && cfg.model !== 'gemini-1.5-flash') ? cfg.model : 'gemini-2.5-flash',
        // Mode 3: OAuth
        oauthProvider: cfg.oauthProvider || 'google',
        oauthToken: cfg.oauthToken || ''
      };
    },

    /**
     * Simpan Konfigurasi AI
     */
    async saveConfig(cfg) {
      await chrome.storage.local.set({ monevhub_ai_config: cfg });
    },

    /**
     * Validasi Lisensi Aktif Sebelum Eksekusi AI
     */
    async verifyLicenseGate() {
      if (global.MonevHubLicense) {
        const lic = await global.MonevHubLicense.verify(false);
        if (!lic.valid) {
          throw new Error('Akses AI Dibatasi: Lisensi Anda belum aktif atau tidak valid pada perangkat ini.');
        }
      }
    },

    /**
     * Generate 3 Isian Laporan Harian (Uraian, Pembelajaran, Kendala >= 100 karakter)
     */
    async generateDailyReport(payload) {
      await this.verifyLicenseGate();
      const cfg = await this.getConfig();

      if (cfg.mode === 'injected') {
        return await this.callInjectedAI('ai_daily', payload);
      } else if (cfg.mode === 'oauth') {
        return await this.callOAuthAI('daily', payload, cfg);
      } else {
        // Mode Universal API Key
        return await this.callUniversalGateway('daily', payload, cfg);
      }
    },

    /**
     * Generate Rekapitulasi Bulanan Komprehensif
     */
    async generateMonthlyRecap(dailyLogs, bulanTahun = '') {
      await this.verifyLicenseGate();
      const cfg = await this.getConfig();

      let raw = '';
      if (cfg.mode === 'injected') {
        raw = await this.callInjectedAI('ai_recap', { dailyLogs, bulanTahun });
      } else if (cfg.mode === 'oauth') {
        raw = await this.callOAuthAI('recap', { dailyLogs, bulanTahun }, cfg);
      } else {
        // Mode Universal API Key
        raw = await this.callUniversalGateway('recap', { dailyLogs, bulanTahun }, cfg);
      }
      return this.cleanMarkdownToPlainText(raw);
    },

    cleanMarkdownToPlainText(text) {
      return String(text || '')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^\s*\*\s+/gm, '- ')
        .replace(/\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    },

    /**
     * =========================================================================
     * 1. MODE INJECTED: Panggilan Langsung ke Server / Webhook Pembuat (Zero Setup)
     * =========================================================================
     */
    async callInjectedAI(action, payload) {
      const store = await chrome.storage.local.get('monevhub_license');
      const lic = store.monevhub_license || {};
      const fp = global.MonevHubLicense ? await global.MonevHubLicense.getHardwareFingerprint() : '';

      const cfg = await this.getConfig();
      const endpoint = cfg.gasWebhookUrl || (global.MonevHubLicense && global.MonevHubLicense.DEFAULT_API_URL);

      if (!endpoint) {
        throw new Error('Endpoint Injeksi Pembuat belum terkonfigurasi di sistem.');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: action,
          key: lic.key || '',
          fingerprint: fp,
          payload: payload
        })
      });

      if (!res.ok) {
        throw new Error(`Server Pembuat Error: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal memproses via AI Injeksi Pembuat.');
      }

      if (action === 'ai_daily' && data.data) {
        return this.formatAndValidateDailyJson(data.data);
      }

      return data.data;
    },

    /**
     * Ambil daftar model Gemini gratis (generateContent) dari Google Gemini API
     */
    async fetchGeminiFreeModels(apiKey) {
      const cleanKey = (apiKey || '').trim();
      if (!cleanKey) {
        throw new Error('Masukkan API Key Gemini terlebih dahulu.');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Gagal memuat model (HTTP ${res.status})`);
      }

      const data = await res.json();
      const rawModels = Array.isArray(data.models) ? data.models : [];

      const excludedKeywords = [
        'embedding', 'aqa', 'imagen', 'veo', 'tts', 'audio',
        'robotics', 'computer-use', 'deep-research', 'ultra', 'image-generation', 'bison'
      ];

      const filtered = rawModels
        .filter(m => {
          const methods = m.supportedGenerationMethods || [];
          const id = (m.name || '').replace(/^models\//, '').toLowerCase();
          if (!methods.includes('generateContent')) return false;
          if (!id.includes('gemini')) return false;
          if (excludedKeywords.some(kw => id.includes(kw))) return false;
          return true;
        })
        .map(m => ({
          id: (m.name || '').replace(/^models\//, ''),
          displayName: m.displayName || (m.name || '').replace(/^models\//, '')
        }));

      filtered.sort((a, b) => {
        const aFlash = a.id.includes('flash') ? 0 : 1;
        const bFlash = b.id.includes('flash') ? 0 : 1;
        if (aFlash !== bFlash) return aFlash - bFlash;
        return a.id.localeCompare(b.id);
      });

      return filtered;
    },

    /**
     * Ambil daftar model tersedia untuk semua provider (Gemini & OpenAI-Compatible)
     */
    async fetchAvailableModels(gateway, apiKey, baseUrl = '') {
      const gw = gateway || 'gemini';
      if (gw === 'gemini') {
        return await this.fetchGeminiFreeModels(apiKey);
      }
      const cleanKey = (apiKey || '').trim();
      if (!cleanKey) {
        throw new Error('Masukkan API Key terlebih dahulu.');
      }
      const info = this.DEFAULT_GATEWAYS[gw] || this.DEFAULT_GATEWAYS.custom;
      const resolvedBase = (baseUrl || info.baseUrl || '').replace(/\/+$/, '');
      if (!resolvedBase) {
        throw new Error('Base URL gateway belum diisi.');
      }

      const res = await fetch(`${resolvedBase}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${cleanKey}` },
        cache: 'no-store'
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Gagal memuat model (HTTP ${res.status})`);
      }

      const data = await res.json();
      const raw = Array.isArray(data.data) ? data.data : (Array.isArray(data.models) ? data.models : []);
      const excluded = ['embedding', 'whisper', 'tts', 'dall-e', 'moderation', 'audio', 'realtime', 'image'];
      const list = raw
        .map(m => ({ id: m.id || m.name || '', displayName: m.id || m.name || '' }))
        .filter(m => m.id && !excluded.some(kw => m.id.toLowerCase().includes(kw)))
        .sort((a, b) => a.id.localeCompare(b.id));

      if (list.length === 0) {
        throw new Error('Tidak ada model chat yang dikembalikan oleh endpoint.');
      }
      return list;
    },

    /**
     * Tes koneksi AI (Injected Server Spreadsheet / API Key / OAuth)
     */
    async testConnection(overrideCfg = null) {
      const cfg = overrideCfg ? { ...(await this.getConfig()), ...overrideCfg } : await this.getConfig();

      if (cfg.mode === 'injected') {
        const store = await chrome.storage.local.get('monevhub_license');
        const lic = store.monevhub_license || {};
        const fp = global.MonevHubLicense ? await global.MonevHubLicense.getHardwareFingerprint() : '';
        const endpoint = (cfg.gasWebhookUrl && cfg.gasWebhookUrl.trim()) ||
          (global.MonevHubLicense && await global.MonevHubLicense.getEffectiveApiUrl());

        if (!endpoint) throw new Error('Endpoint Server Spreadsheet belum dikonfigurasi.');
        if (!lic.key) throw new Error('Aktivasi lisensi terlebih dahulu sebelum tes Server AI.');

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'test_ai', key: lic.key, fingerprint: fp })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} dari Server Spreadsheet.`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Server AI Spreadsheet gagal merespons.');
        return { success: true, message: data.message || `Terhubung ke Server AI (${data.model || 'Gemini'})` };
      }

      if (cfg.mode === 'oauth') {
        const token = (cfg.oauthToken || '').trim();
        if (!token) throw new Error('Token OAuth belum diisi.');
        const baseUrl = (cfg.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
        const model = cfg.model || 'gemini-1.5-flash';
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'OK' }], max_tokens: 5 })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
        return { success: true, message: `Token OAuth terhubung (${model}).` };
      }

      // Mode API Key
      const apiKey = (cfg.apiKey || '').trim();
      if (!apiKey) throw new Error('API Key belum diisi.');
      const gatewayKey = cfg.gateway || 'gemini';
      const gatewayInfo = this.DEFAULT_GATEWAYS[gatewayKey] || this.DEFAULT_GATEWAYS.custom;

      if (gatewayKey === 'gemini') {
        const model = cfg.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Balas satu kata: OK' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 8 }
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Gemini HTTP ${res.status}`);
        }
        return { success: true, message: `API Key Gemini valid & terhubung (${model})!` };
      } else {
        const baseUrl = (cfg.baseUrl || gatewayInfo.baseUrl).replace(/\/+$/, '');
        const model = cfg.model || gatewayInfo.defaultModel;
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply OK' }], max_tokens: 5 })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `${gatewayInfo.name} HTTP ${res.status}`);
        }
        return { success: true, message: `${gatewayInfo.name} terhubung (${model})!` };
      }
    },

    /**
     * =========================================================================
     * 2. MODE UNIVERSAL API KEY GATEWAY (OpenAI, Gemini, DeepSeek, Groq, Custom)
     * =========================================================================
     */
    async callUniversalGateway(type, payload, cfg) {
      const apiKey = (cfg.apiKey || '').trim();
      if (!apiKey) {
        throw new Error('API Key belum diisi. Masukkan API Key Anda pada tab Pengaturan.');
      }

      const gatewayKey = cfg.gateway || 'gemini';
      const gatewayInfo = this.DEFAULT_GATEWAYS[gatewayKey] || this.DEFAULT_GATEWAYS.custom;

      if (gatewayKey === 'gemini') {
        // Panggilan Native Google Gemini REST API
        if (type === 'daily') {
          return await this.callGeminiNativeDaily(apiKey, cfg.model || 'gemini-1.5-flash', payload);
        } else {
          return await this.callGeminiNativeRecap(apiKey, cfg.model || 'gemini-1.5-flash', payload);
        }
      } else {
        // Panggilan Universal OpenAI-Compatible API (OpenAI, DeepSeek, Groq, Custom)
        const baseUrl = (cfg.baseUrl || gatewayInfo.baseUrl).replace(/\/+$/, '');
        const model = cfg.model || gatewayInfo.defaultModel;

        if (type === 'daily') {
          return await this.callOpenAIDaily(baseUrl, apiKey, model, payload);
        } else {
          return await this.callOpenAIRecap(baseUrl, apiKey, model, payload);
        }
      }
    },

    /**
     * =========================================================================
     * 3. MODE OAUTH: Akun AI Pribadi / Bearer Session Token
     * =========================================================================
     */
    async callOAuthAI(type, payload, cfg) {
      const token = (cfg.oauthToken || '').trim();
      if (!token) {
        throw new Error('Token OAuth / Sesi Pribadi belum diisi. Hubungkan akun Anda di Pengaturan.');
      }

      // Gunakan Bearer Token ke OpenAI Compatible atau Google Vertex/Gemini
      const baseUrl = cfg.baseUrl || 'https://generativelanguage.googleapis.com';
      const model = cfg.model || 'gemini-2.5-flash';

      if (type === 'daily') {
        return await this.callOpenAIDaily(baseUrl, token, model, payload);
      } else {
        return await this.callOpenAIRecap(baseUrl, token, model, payload);
      }
    },

    /**
     * Universal OpenAI-Compatible Daily Generator
     */
    async callOpenAIDaily(baseUrl, apiKey, model, payload) {
      const promptData = this.buildDailyPrompts(payload);
      const url = `${baseUrl}/chat/completions`;

      const body = {
        model: model,
        messages: [
          { role: 'system', content: promptData.systemInstruction },
          { role: 'user', content: promptData.userPrompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`AI Gateway Error (${res.status}): ${errJson.error?.message || res.statusText}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI Gateway tidak mengembalikan konten respons.');
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Gagal memformat JSON dari respons AI.');
      }

      return this.formatAndValidateDailyJson(parsed);
    },

    /**
     * Universal OpenAI-Compatible Monthly Recap Generator
     */
    async callOpenAIRecap(baseUrl, apiKey, model, payload) {
      const promptData = this.buildRecapPrompts(payload.dailyLogs, payload.bulanTahun);
      const url = `${baseUrl}/chat/completions`;

      const body = {
        model: model,
        messages: [
          { role: 'system', content: promptData.systemInstruction },
          { role: 'user', content: promptData.userPrompt }
        ],
        temperature: 0.5
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`AI Gateway Error (${res.status}): ${errJson.error?.message || res.statusText}`);
      }

      const json = await res.json();
      return json.choices?.[0]?.message?.content || 'Gagal menghasilkan rekap bulanan.';
    },

    /**
     * Native Google Gemini REST API Daily dengan auto-fallback jika model 404
     */
    async callGeminiNativeDaily(apiKey, model, payload) {
      const promptData = this.buildDailyPrompts(payload);
      const targetModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: promptData.userPrompt }] }],
        systemInstruction: { parts: [{ text: promptData.systemInstruction }] },
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      };

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      // Auto-fallback jika model tertentu tidak ditemukan (HTTP 404)
      if (res.status === 404 && targetModel !== 'gemini-1.5-flash') {
        console.warn(`[MonevHub AI] Model ${targetModel} tidak ditemukan (404), beralih otomatis ke gemini-1.5-flash.`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        res = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Gemini Error (${res.status}): ${errJson.error?.message || res.statusText}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini tidak memberikan jawaban teks.');

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Gagal membaca struktur JSON.');
      }

      return this.formatAndValidateDailyJson(parsed);
    },

    /**
     * Native Google Gemini REST API Recap dengan auto-fallback jika model 404
     */
    async callGeminiNativeRecap(apiKey, model, payload) {
      const promptData = this.buildRecapPrompts(payload.dailyLogs, payload.bulanTahun);
      const targetModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: promptData.userPrompt }] }],
        systemInstruction: { parts: [{ text: promptData.systemInstruction }] },
        generationConfig: { temperature: 0.5 }
      };

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      // Auto-fallback jika model tertentu tidak ditemukan (HTTP 404)
      if (res.status === 404 && targetModel !== 'gemini-1.5-flash') {
        console.warn(`[MonevHub AI] Model ${targetModel} tidak ditemukan (404), beralih otomatis ke gemini-1.5-flash.`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        res = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Gemini Error (${res.status}): ${errJson.error?.message || res.statusText}`);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gagal menghasilkan rekapitulasi.';
    },

    /**
     * Konstruksi Prompt Laporan Harian MagangHub Kemnaker
     */
    buildDailyPrompts(payload) {
      const rawKegiatan = payload.rawKegiatan || 'Melaksanakan tugas dan instruksi kerja operasional harian.';
      const hasKendala = Boolean(payload.hasKendala);
      const rawKendala = (payload.rawKendala || '').trim();

      const systemInstruction = `Anda adalah asisten AI profesional untuk peserta program MagangHub Kementerian Ketenagakerjaan RI (Kemnaker).
Tugas Anda adalah mengubah poin kegiatan mentah menjadi 3 field laporan resmi formal yang profesional, runtut, dan terstruktur.

ATURAN FORMAL SISTEM MONEV KEMNAKER:
1. MASING-MASING FIELD DI BAWAH INI WAJIB MEMILIKI PANJANG MINIMAL 105 KARAKTER. JANGAN SAMPAI KURANG DARI 100 KARAKTER!
2. Gunakan Bahasa Indonesia baku, objektif, profesional, dan bernada positif serta bertanggung jawab.
3. KETENTUAN 3 FIELD WAJIB:
   - "uraian_aktivitas": Rincikan tahapan kegiatan kerja secara runtut (persiapan, eksekusi teknis/administrasi, dan hasil akhir). WAJIB minimal 110-250 karakter.
   - "pembelajaran": Uraikan wawasan, keahlian teknis (hard skill), alur kerja baru, atau soft skill yang didapatkan. WAJIB minimal 110-250 karakter.
   - "kendala":
     * Jika hasKendala=true: Jelaskan kendala yang dialami dengan bahasa santun, penyebab teknis, mitigasi yang dilakukan, dan hasil penyelesaiannya. WAJIB minimal 110-250 karakter.
     * Jika hasKendala=false: Tuliskan pernyataan formal bahwa seluruh kegiatan terlaksana secara tertib, koordinasi kerja efektif bersama pembimbing, serta tidak ditemui kendala teknis yang menghambat pencapaian target kerja. WAJIB minimal 110-250 karakter.

OUTPUT HARUS FORMAT JSON SAJA:
{
  "uraian_aktivitas": "...",
  "pembelajaran": "...",
  "kendala": "..."
}`;

      const userPrompt = `Catatan Kegiatan Mentah:
${rawKegiatan}

Status Kendala: ${hasKendala ? 'ADA KENDALA' : 'TIDAK ADA KENDALA'}
Catatan Kendala: ${hasKendala ? rawKendala : '(Nihil - susun pernyataan lancar tanpa kendala)'}

Instruksi: Hasilkan 3 narasi formal di atas dalam format JSON. Pastikan masing-masing field melebihi 105 karakter!`;

      return { systemInstruction, userPrompt };
    },

    /**
     * Konstruksi Prompt Rekapitulasi Bulanan
     */
    buildRecapPrompts(dailyLogs, bulanTahun) {
      const formattedLogs = (dailyLogs || []).map((l, i) => {
        return `[Hari ${i + 1} - ${l.tanggal || '-'}]
- Presensi: ${l.presensi || 'Hadir'} (${l.statusApproval || 'Tercatat'})
- Aktivitas: ${l.uraian || '-'}
- Pembelajaran: ${l.pembelajaran || '-'}
- Kendala: ${l.kendala || '-'}`;
      }).join('\n\n');

      const systemInstruction = `Anda adalah asisten senior pembuat laporan evaluasi magang MagangHub Kemnaker.
Tugas Anda adalah menganalisis seluruh data log aktivitas kegiatan harian magang selama satu bulan periode penuh dan menyusun dokumen laporan rekapitulasi bulanan resmi berbobot evaluatif tinggi.`;

      const userPrompt = `Berikut adalah data seluruh kegiatan magang untuk periode ${bulanTahun || 'bulan ini'}:

${formattedLogs || 'Tidak ada catatan harian.'}

Susunlah LAPORAN REKAPITULASI EVALUASI BULANAN dengan struktur rapi dalam TEKS POLOS (PLAIN TEXT, TANPA MARKDOWN):
1. RINGKASAN EKSEKUTIF & CAKUPAN AKTIVITAS: Sintesis komprehensif seluruh tugas dan proyek yang diselesaikan selama periode ini.
2. CAPAIAN UTAMA & OUTPUT KERJA: Poin-poin konkret hasil kerja yang berhasil diselesaikan secara nyata.
3. REKAPITULASI KOMPETENSI & PEMBELAJARAN: Keterampilan teknis (hard skills) dan soft skills baru yang berkembang selama periode magang.
4. EVALUASI KENDALA & REKOMENDASI PERBAIKAN: Analisis tantangan yang dihadapi serta solusi mitigasi untuk peningkatan performa di bulan berikutnya.

ATURAN FORMAT WAJIB:
- DILARANG menggunakan simbol Markdown seperti tanda bintang (* atau **), tanda pagar (# atau ##), atau backtick (\`).
- Gunakan huruf kapital untuk judul bagian, angka (1., 2.) untuk daftar utama, dan tanda strip (-) untuk sub-poin.
- Gunakan bahasa Indonesia formal, elegan, dan profesional.`;

      return { systemInstruction, userPrompt };
    },

    /**
     * Validasi Ketat Minimal 100 Karakter
     */
    formatAndValidateDailyJson(obj) {
      const result = {
        uraian_aktivitas: (obj.uraian_aktivitas || '').trim(),
        pembelajaran: (obj.pembelajaran || '').trim(),
        kendala: (obj.kendala || '').trim()
      };

      result.uraian_aktivitas = this.ensureMinLength(
        result.uraian_aktivitas,
        105,
        'Pelaksanaan kegiatan berjalan secara tertib dan terstruktur dengan koordinasi rutin pembimbing lapangan.'
      );

      result.pembelajaran = this.ensureMinLength(
        result.pembelajaran,
        105,
        'Meningkatkan kompetensi teknis, efisiensi alur kerja profesional, serta kedisiplinan dalam menyelesaikan target tugas.'
      );

      result.kendala = this.ensureMinLength(
        result.kendala,
        105,
        'Seluruh tahapan pekerjaan dapat diselesaikan tepat waktu tanpa adanya hambatan teknis yang signifikan.'
      );

      return result;
    },

    ensureMinLength(str, minLen, suffixFallback) {
      let text = (str || '').trim();
      if (text.length < minLen) {
        text += ' ' + suffixFallback;
      }
      return text;
    }
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonevHubAI;
  } else {
    global.MonevHubAI = MonevHubAI;
  }
})(typeof window !== 'undefined' ? window : this);
