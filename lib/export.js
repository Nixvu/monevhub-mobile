/**
 * MonevHub Export Engine - Multi-Template PDF (jsPDF + AutoTable) & Word (.docx)
 * Mendukung 3 Template Laporan Resmi & Blok Tanda Tangan (TTD) Kustom
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'monevhub_export_config';

  const TEMPLATES = {
    tpl1: {
      id: 'tpl1',
      name: 'Template 1 — Standar MonevHub Kemnaker',
      desc: 'Kolom: (No, Tanggal, Kehadiran, Uraian Aktivitas, Pembelajaran yang Diperoleh, Kendala yang Dialami) + Blok TTD'
    },
    tpl2: {
      id: 'tpl2',
      name: 'Template 2 — Logbook Kegiatan Magang (Format Instansi)',
      desc: 'Identitas (Nama, Instansi, Bagian/Unit, Bulan) + Kolom: (No, Hari/Tanggal, Waktu, Uraian Kegiatan, Output/Hasil) + Blok TTD'
    },
    tpl3: {
      id: 'tpl3',
      name: 'Template 3 — Laporan Ringkas Kinerja & Kendala',
      desc: 'Identitas (Nama, Instansi, Bagian/Unit, Bulan) + Kolom: (No, Hari/Tanggal, Kehadiran, Uraian Kegiatan, Kendala & Catatan) + Blok TTD'
    }
  };

  const DEFAULT_CONFIG = {
    templateId: 'tpl1',
    orientation: 'landscape',
    pesertaNama: '',
    instansi: '',
    bagianUnit: '',
    bulanLabel: '',
    waktuSeninKamis: '07.15 – 14.15',
    waktuJumat: '07.15 – 13.00',
    waktuSabtu: '07.15 – 12.30',
    showSignature: true,
    ttdKota: '',
    ttdTanggal: '',
    signatures: [
      {
        enabled: true,
        altLabel: 'Mengetahui,\nPimpinan Instansi',
        jabatan: 'Kepala Instansi / Pimpinan',
        nama: '',
        nip: '',
        useImage: false,
        imageDataUrl: ''
      },
      {
        enabled: true,
        altLabel: 'Pembimbing Lapangan / Mentor',
        jabatan: 'Mentor MagangHub',
        nama: '',
        nip: '',
        useImage: false,
        imageDataUrl: ''
      },
      {
        enabled: true,
        altLabel: 'Peserta Magang',
        jabatan: 'Peserta Program MagangHub',
        nama: '',
        nip: '',
        useImage: false,
        imageDataUrl: ''
      }
    ]
  };

  const HARI_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN_INDO_PENDEK = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_INDO_PANJANG = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const MonevHubExport = {
    TEMPLATES,
    DEFAULT_CONFIG,

    async getConfig() {
      try {
        const store = await chrome.storage.local.get(STORAGE_KEY);
        const saved = store[STORAGE_KEY] || {};
        return {
          ...DEFAULT_CONFIG,
          ...saved,
          signatures: Array.isArray(saved.signatures) && saved.signatures.length === 3
            ? saved.signatures.map((s, idx) => ({ ...DEFAULT_CONFIG.signatures[idx], ...s }))
            : DEFAULT_CONFIG.signatures.map(s => ({ ...s }))
        };
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      }
    },

    async saveConfig(cfg) {
      await chrome.storage.local.set({ [STORAGE_KEY]: cfg });
    },

    formatDateShort(dateStr) {
      if (!dateStr) return '-';
      const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return dateStr;
      const idx = parseInt(m[2], 10);
      return `${m[3]} ${BULAN_INDO_PENDEK[idx] || m[2]} ${m[1]}`;
    },

    formatDateFullWithDay(dateStr) {
      if (!dateStr) return '-';
      const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return dateStr;
      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      const dayName = HARI_INDO[d.getDay()] || '';
      const monthName = BULAN_INDO_PANJANG[parseInt(m[2], 10)] || m[2];
      return `${dayName}, ${parseInt(m[3], 10)} ${monthName} ${m[1]}`;
    },

    getWorkHoursForDate(dateStr, cfg) {
      const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return cfg.waktuSeninKamis || '07.15 – 14.15';
      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      const day = d.getDay();
      if (day === 5) return cfg.waktuJumat || '07.15 – 13.00';
      if (day === 6) return cfg.waktuSabtu || '07.15 – 12.30';
      return cfg.waktuSeninKamis || '07.15 – 14.15';
    },

    formatPeriodReadable(periodLabel) {
      if (!periodLabel) return '-';
      const m = String(periodLabel).match(/^(\d{4}-\d{2}-\d{2})_sd_(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        return `${this.formatDateShort(m[1])} – ${this.formatDateShort(m[2])}`;
      }
      return String(periodLabel).replace(/_/g, ' ');
    },

    /**
     * Bangun struktur judul, metadata, header tabel, dan baris data sesuai template terpilih
     */
    buildTemplateData(logs, periodLabel, ownerName, cfg) {
      const tplId = cfg.templateId || 'tpl1';
      const effectiveNama = (cfg.pesertaNama && cfg.pesertaNama.trim()) || '-';
      const effectiveInstansi = (cfg.instansi && cfg.instansi.trim()) || '-';
      const effectiveUnit = (cfg.bagianUnit && cfg.bagianUnit.trim()) || '-';
      const effectiveBulan = (cfg.bulanLabel && cfg.bulanLabel.trim()) || this.formatPeriodReadable(periodLabel);

      if (tplId === 'tpl2') {
        return {
          title: 'LOGBOOK KEGIATAN MAGANG',
          metaLines: [
            { label: 'Nama', value: effectiveNama },
            { label: 'Instansi', value: effectiveInstansi },
            { label: 'Bagian/Unit', value: effectiveUnit },
            { label: 'Bulan', value: effectiveBulan }
          ],
          headers: ['No', 'Hari/Tanggal', 'Waktu', 'Uraian Kegiatan', 'Output/Hasil'],
          colWidthsPct: [5, 19, 13, 35, 28],
          colWidthsMm: [11, 44, 30, 102, 82],
          colAligns: ['center', 'left', 'center', 'left', 'left'],
          rows: logs.map((item, idx) => [
            `${idx + 1}.`,
            this.formatDateFullWithDay(item.tanggal || item.rawDateText),
            this.getWorkHoursForDate(item.tanggal, cfg),
            item.uraian || '-',
            item.pembelajaran || '-'
          ])
        };
      }

      if (tplId === 'tpl3') {
        return {
          title: 'LAPORAN RINGKAS KINERJA & EVALUASI KENDALA MAGANG',
          metaLines: [
            { label: 'Nama', value: effectiveNama },
            { label: 'Instansi', value: effectiveInstansi },
            { label: 'Bagian/Unit', value: effectiveUnit },
            { label: 'Periode', value: effectiveBulan }
          ],
          headers: ['No', 'Hari/Tanggal', 'Kehadiran', 'Uraian Kegiatan', 'Kendala & Catatan'],
          colWidthsPct: [5, 19, 10, 38, 28],
          colWidthsMm: [11, 44, 24, 110, 80],
          colAligns: ['center', 'left', 'center', 'left', 'left'],
          rows: logs.map((item, idx) => [
            `${idx + 1}.`,
            this.formatDateFullWithDay(item.tanggal || item.rawDateText),
            item.presensi || 'Hadir',
            item.uraian || '-',
            item.kendala || '-'
          ])
        };
      }

      // Default: Template 1 (Standar MonevHub Kemnaker)
      return {
        title: 'LAPORAN KEGIATAN HARIAN MAGANGHUB KEMNAKER',
        metaLines: [
          { label: 'Peserta', value: effectiveNama },
          { label: 'Periode', value: `${effectiveBulan}  |  Total Laporan: ${logs.length} hari` }
        ],
        headers: ['No', 'Tanggal', 'Kehadiran', 'Uraian Aktivitas', 'Pembelajaran yang Diperoleh', 'Kendala yang Dialami'],
        colWidthsPct: [4, 11, 9, 28, 25, 23],
        colWidthsMm: [10, 26, 22, 82, 70, 59],
        colAligns: ['center', 'center', 'center', 'left', 'left', 'left'],
        rows: logs.map((item, idx) => [
          String(idx + 1),
          this.formatDateShort(item.tanggal || item.rawDateText),
          item.presensi || 'Hadir',
          item.uraian || '-',
          item.pembelajaran || '-',
          item.kendala || '-'
        ])
      };
    },

    getActiveSignatures(cfg) {
      if (!cfg.showSignature) return [];
      const list = (cfg.signatures || []).filter(s => s.enabled !== false);
      return list.map((s, idx) => {
        const isLast = idx === list.length - 1;
        const nama = (s.nama && s.nama.trim())
          ? s.nama.trim()
          : (isLast && cfg.pesertaNama && cfg.pesertaNama.trim() ? cfg.pesertaNama.trim() : '..............................');
        return {
          altLabel: s.altLabel || '',
          jabatan: s.jabatan || '',
          nama: nama,
          nip: (s.nip || '').trim(),
          useImage: Boolean(s.useImage && s.imageDataUrl),
          imageDataUrl: s.imageDataUrl || ''
        };
      });
    },

    dataUrlToUint8Array(dataUrl) {
      try {
        const base64 = String(dataUrl || '').split(',')[1] || '';
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      } catch (e) {
        return null;
      }
    },

    getSignatureDateText(cfg) {
      const kota = (cfg.ttdKota && cfg.ttdKota.trim()) ? cfg.ttdKota.trim() : '';
      const tgl = (cfg.ttdTanggal && cfg.ttdTanggal.trim())
        ? cfg.ttdTanggal.trim()
        : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      return kota ? `${kota}, ${tgl}` : tgl;
    },

    /**
     * Ekspor array riwayat laporan ke PDF menggunakan jsPDF + autoTable
     */
    async exportToPDF(logs, periodLabel = 'Semua Periode', ownerName = 'Peserta MagangHub', overrideTplId = null, extraOptions = {}) {
      if (!logs || logs.length === 0) {
        throw new Error('Tidak ada data riwayat untuk diekspor ke PDF.');
      }

      if (!global.jspdf || !global.jspdf.jsPDF) {
        throw new Error('Library jsPDF belum dimuat. Muat ulang halaman Dashboard.');
      }

      const cfg = await this.getConfig();
      if (overrideTplId) cfg.templateId = overrideTplId;
      const orient = (extraOptions.orientation || cfg.orientation || 'landscape') === 'portrait' ? 'portrait' : 'landscape';
      const tplData = this.buildTemplateData(logs, periodLabel, ownerName, cfg);

      const { jsPDF } = global.jspdf;
      const doc = new jsPDF({
        orientation: orient,
        unit: 'mm',
        format: 'a4'
      });

      const pageW = doc.internal.pageSize.getWidth();
      const marginX = 14;
      const usableW = pageW - marginX * 2;
      const widthScale = usableW / 269;

      // Header Dokumen
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(orient === 'portrait' ? 12 : 13.5);
      doc.setTextColor(30, 58, 138);
      doc.text(tplData.title, marginX, 15);

      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      let curY = 22;
      tplData.metaLines.forEach((m) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${m.label}`, marginX, curY);
        doc.setFont('helvetica', 'normal');
        doc.text(`: ${m.value}`, marginX + 26, curY);
        curY += 5;
      });

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dicetak : ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageW - marginX, curY - 5, { align: 'right' });

      // Garis pembatas header
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(marginX, curY - 1, pageW - marginX, curY - 1);

      const columnStyles = {};
      tplData.colWidthsMm.forEach((w, idx) => {
        columnStyles[idx] = {
          cellWidth: Math.round(w * widthScale * 10) / 10,
          halign: tplData.colAligns[idx] || 'left',
          fontStyle: idx === 1 ? 'bold' : 'normal'
        };
      });

      doc.autoTable({
        startY: curY + 3,
        head: [tplData.headers],
        body: tplData.rows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle'
        },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [30, 41, 59],
          overflow: 'linebreak',
          valign: 'top',
          lineColor: [203, 213, 225],
          lineWidth: 0.2
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles,
        margin: { top: 14, left: 14, right: 14, bottom: 14 }
      });

      let afterTableY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : curY + 20) + 5;

      // Lampiran Rekapitulasi Bulanan (jika dipilih)
      if (extraOptions && extraOptions.recapText && String(extraOptions.recapText).trim()) {
        const pageH = doc.internal.pageSize.getHeight();
        if (afterTableY + 28 > pageH - 14) {
          doc.addPage();
          afterTableY = 16;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text('REKAPITULASI BULANAN', marginX, afterTableY);
        afterTableY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(String(extraOptions.recapText).trim(), usableW);
        for (const line of lines) {
          if (afterTableY > pageH - 14) {
            doc.addPage();
            afterTableY = 16;
          }
          doc.text(line, marginX, afterTableY);
          afterTableY += 4.5;
        }
        afterTableY += 4;
      }

      // Blok Tanda Tangan (TTD) — padatkan jika masih cukup ruang di halaman yang sama
      const sigs = this.getActiveSignatures(cfg);
      if (sigs.length > 0) {
        const pageH = doc.internal.pageSize.getHeight();
        const bottomLimit = pageH - 11;
        const remaining = bottomLimit - afterTableY;
        let sigY = afterTableY + 2;
        let sigGap = 24;

        if (remaining < 29) {
          doc.addPage();
          sigY = 18;
        } else if (remaining < 42) {
          sigGap = Math.max(15, Math.floor(remaining - 16));
        }

        const colW = usableW / sigs.length;
        const dateLine = this.getSignatureDateText(cfg);

        // Tanggal di atas kolom paling kanan
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const lastCenterX = marginX + colW * (sigs.length - 0.5);
        doc.text(dateLine, lastCenterX, sigY, { align: 'center' });
        sigY += 4.5;

        sigs.forEach((s, idx) => {
          const cx = marginX + colW * (idx + 0.5);
          let y = sigY;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const altLines = String(s.altLabel || '').split('\n');
          altLines.forEach(line => {
            if (line.trim()) {
              doc.text(line.trim(), cx, y, { align: 'center' });
              y += 4;
            }
          });

          if (s.jabatan) {
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(s.jabatan, cx, y, { align: 'center' });
          }

          // Gambar TTD PNG opsional
          if (s.useImage && s.imageDataUrl) {
            try {
              const imgH = Math.min(12, Math.max(8, sigGap - 11));
              doc.addImage(s.imageDataUrl, 'PNG', cx - 13, sigY + 9, 26, imgH);
            } catch (imgErr) {}
          }

          // Ruang TTD
          const nameY = sigY + sigGap;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(s.nama, cx, nameY, { align: 'center' });

          // Garis bawah nama
          const nameWidth = doc.getTextWidth(s.nama);
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.25);
          doc.line(cx - nameWidth / 2, nameY + 1, cx + nameWidth / 2, nameY + 1);

          if (s.nip) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(`NIP/NIK. ${s.nip}`, cx, nameY + 5.2, { align: 'center' });
          }
        });
      }

      // Footer nomor halaman di seluruh halaman
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Halaman ${p} dari ${totalPages}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 7,
          { align: 'center' }
        );
      }

      const safeLabel = String(periodLabel).replace(/[^a-zA-Z0-9_-]+/g, '_');
      doc.save(`Laporan_MonevHub_${cfg.templateId}_${safeLabel}.pdf`);
      return true;
    },

    /**
     * Ekspor array riwayat laporan ke Microsoft Word (.docx) menggunakan library docx
     */
    async exportToDocx(logs, periodLabel = 'Semua Periode', ownerName = 'Peserta MagangHub', overrideTplId = null, extraOptions = {}) {
      if (!logs || logs.length === 0) {
        throw new Error('Tidak ada data riwayat untuk diekspor ke Word (.docx).');
      }

      if (!global.docx) {
        throw new Error('Library docx belum dimuat. Muat ulang halaman Dashboard.');
      }

      const cfg = await this.getConfig();
      if (overrideTplId) cfg.templateId = overrideTplId;
      const orient = (extraOptions.orientation || cfg.orientation || 'landscape') === 'portrait' ? 'portrait' : 'landscape';
      const tplData = this.buildTemplateData(logs, periodLabel, ownerName, cfg);

      const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableRow,
        TableCell,
        TextRun,
        ImageRun,
        WidthType,
        AlignmentType,
        BorderStyle,
        PageOrientation,
        ShadingType,
        VerticalAlign
      } = global.docx;

      const cellBorders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
      };

      const noBorders = {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
      };

      const makeHeaderCell = (text, widthPct) => new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A', type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })
            ]
          })
        ]
      });

      const makeBodyCell = (text, widthPct, align = AlignmentType.LEFT, isBold = false, bgHex = null) => {
        const lines = String(text || '-').split(/\r?\n/);
        const cellOpts = {
          width: { size: widthPct, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: lines.map(line => new Paragraph({
            alignment: align,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: line, bold: isBold, color: '1E293B', size: 18, font: 'Calibri' })
            ]
          }))
        };
        if (bgHex) {
          cellOpts.shading = { fill: bgHex, type: ShadingType.CLEAR };
        }
        return new TableCell(cellOpts);
      };

      const headerRow = new TableRow({
        tableHeader: true,
        children: tplData.headers.map((h, i) => makeHeaderCell(h, tplData.colWidthsPct[i]))
      });

      const alignMap = {
        center: AlignmentType.CENTER,
        left: AlignmentType.LEFT,
        right: AlignmentType.RIGHT
      };

      const dataRows = tplData.rows.map((rowVals, idx) => {
        const bg = idx % 2 === 1 ? 'F8FAFC' : null;
        return new TableRow({
          children: rowVals.map((val, colIdx) =>
            makeBodyCell(
              val,
              tplData.colWidthsPct[colIdx],
              alignMap[tplData.colAligns[colIdx]] || AlignmentType.LEFT,
              colIdx === 1,
              bg
            )
          )
        });
      });

      const mainTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows]
      });

      const children = [
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: tplData.title,
              bold: true,
              size: 28,
              color: '1E3A8A',
              font: 'Calibri'
            })
          ]
        })
      ];

      tplData.metaLines.forEach((m, idx) => {
        children.push(
          new Paragraph({
            spacing: { after: idx === tplData.metaLines.length - 1 ? 180 : 40 },
            children: [
              new TextRun({ text: `${m.label}: `, bold: true, size: 20, font: 'Calibri', color: '334155' }),
              new TextRun({ text: m.value, size: 20, font: 'Calibri', color: '334155' })
            ]
          })
        );
      });

      children.push(mainTable);

      // Lampiran Rekapitulasi Bulanan (jika dipilih)
      if (extraOptions && extraOptions.recapText && String(extraOptions.recapText).trim()) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({ text: 'REKAPITULASI BULANAN', bold: true, size: 24, color: '1E3A8A', font: 'Calibri' })
            ]
          })
        );
        String(extraOptions.recapText).trim().split(/\r?\n/).forEach(line => {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: line || ' ', size: 20, font: 'Calibri', color: '1E293B' })]
            })
          );
        });
      }

      // Blok Tanda Tangan (TTD) Borderless Table
      const sigs = this.getActiveSignatures(cfg, ownerName);
      if (sigs.length > 0) {
        const dateLine = this.getSignatureDateText(cfg);
        const colPct = Math.floor(100 / sigs.length);

        children.push(new Paragraph({ spacing: { before: 160, after: 20 }, children: [] }));

        const sigCells = sigs.map((s, idx) => {
          const isLast = idx === sigs.length - 1;
          const cellParagraphs = [];

          // Tanggal di baris atas kolom kanan
          cellParagraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: isLast ? dateLine : ' ', size: 19, font: 'Calibri', color: '1E293B' })
            ]
          }));

          // Alt Label (bisa multi-baris)
          String(s.altLabel || '').split('\n').forEach(line => {
            if (line.trim()) {
              cellParagraphs.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [new TextRun({ text: line.trim(), size: 19, font: 'Calibri', color: '1E293B' })]
              }));
            }
          });

          if (s.jabatan) {
            cellParagraphs.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: (s.useImage && s.imageDataUrl) ? 60 : 480 },
              children: [new TextRun({ text: s.jabatan, size: 18, font: 'Calibri', color: '475569' })]
            }));
          } else {
            cellParagraphs.push(new Paragraph({ spacing: { after: (s.useImage && s.imageDataUrl) ? 60 : 480 }, children: [] }));
          }

          if (s.useImage && s.imageDataUrl && ImageRun) {
            const imgBytes = this.dataUrlToUint8Array(s.imageDataUrl);
            if (imgBytes) {
              cellParagraphs.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new ImageRun({
                    data: imgBytes,
                    transformation: { width: 105, height: 46 }
                  })
                ]
              }));
            }
          }

          // Nama dengan underline
          cellParagraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [
              new TextRun({ text: s.nama, bold: true, underline: {}, size: 20, font: 'Calibri', color: '0F172A' })
            ]
          }));

          if (s.nip) {
            cellParagraphs.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `NIP/NIK. ${s.nip}`, size: 18, font: 'Calibri', color: '475569' })]
            }));
          }

          return new TableCell({
            width: { size: colPct, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: cellParagraphs
          });
        });

        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: sigCells })]
        }));
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation: orient === 'portrait' ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
                  width: orient === 'portrait' ? 11906 : 16838,
                  height: orient === 'portrait' ? 16838 : 11906
                },
                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720
                }
              }
            },
            children
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeLabel = String(periodLabel).replace(/[^a-zA-Z0-9_-]+/g, '_');
      a.href = url;
      a.download = `Laporan_MonevHub_${cfg.templateId}_${safeLabel}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonevHubExport;
  } else {
    global.MonevHubExport = MonevHubExport;
  }
})(typeof window !== 'undefined' ? window : this);
