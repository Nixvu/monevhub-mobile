/**
 * MonevHub AI Humanizer Module
 * Diadaptasi dari skill GitHub `blader/humanizer` (berbasis Wikipedia "Signs of AI writing")
 * Menghilangkan pola bahasa robotik/AI agar laporan harian & rekapitulasi terbaca alami seperti tulisan manusia.
 */
(function (global) {
  'use strict';

  const PROMPT_RULES_ID = `ATURAN HUMANIZER (WAJIB DIPATUHI AGAR TULISAN ALAMI SEPERTI MANUSIA):
1. DILARANG memakai klise AI dan frasa bertele-tele: hindari kata/frasa seperti "selain itu, penting untuk dicatat", "mendalami", "menyelami", "lanskap yang terus berkembang", "krusial", "menggarisbawahi pentingnya", "berperan penting dalam", "secara keseluruhan dapat disimpulkan", atau "bukan hanya X, melainkan juga Y".
2. Gunakan kata kerja aktif dan konkret sesuai pekerjaan nyata di lapangan (contoh: "menyusun", "memeriksa", "memperbaiki", "menginput", "berdiskusi dengan"), bukan frasa abstrak yang berlebihan.
3. Variasikan panjang dan ritme kalimat secara natural; hindari pola daftar tiga serangkai yang kaku atau berulang.
4. DILARANG menggunakan tanda pisah panjang (em-dash "—") atau format berlebihan; gunakan tanda baca standar (koma, titik, atau tanda hubung biasa jika perlu).
5. Tulis lugas, jujur, dan spesifik layaknya catatan kerja manusia yang rapi dan profesional.`;

  const AI_FILLER_PREFIXES = [
    /^secara keseluruhan,?\s*(dapat disimpulkan bahwa\s*)?/i,
    /^penting untuk dicatat bahwa\s*/i,
    /^perlu diketahui bahwa\s*/i,
    /^selain itu,?\s*penting untuk diperhatikan bahwa\s*/i,
    /^dalam era yang terus berkembang ini,?\s*/i
  ];

  function cleanText(text) {
    let out = String(text || '');
    if (!out.trim()) return '';

    // Ganti em-dash / en-dash berlebih dengan koma atau spasi-strip alami
    out = out.replace(/\s*—\s*/g, ', ');
    out = out.replace(/\s*–\s*/g, ' - ');

    // Hapus pembuka klise AI jika muncul di awal kalimat/paragraf
    out = out
      .split('\n')
      .map(line => {
        let l = line.trim();
        for (const rx of AI_FILLER_PREFIXES) {
          l = l.replace(rx, '');
        }
        if (l.length > 0) {
          l = l.charAt(0).toUpperCase() + l.slice(1);
        }
        return l;
      })
      .join('\n');

    // Rapikan spasi ganda
    out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return out;
  }

  const MonevHubHumanizer = {
    SOURCE: 'blader/humanizer (Wikipedia Signs of AI Writing)',
    PROMPT_RULES_ID,
    cleanText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonevHubHumanizer;
  } else {
    global.MonevHubHumanizer = MonevHubHumanizer;
  }
})(typeof window !== 'undefined' ? window : this);
