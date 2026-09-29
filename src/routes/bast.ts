import { Elysia, t } from 'elysia';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { db } from '../db';
import {
  bast,
  bastDetail,
  arsipLegal,
  jenisBastValues,
  type Bast,
  type NewBast,
  type BastDetail,
  type NewBastDetail,
  type JenisBast,
  type ArsipLegal,
} from '../db/schema';
import { inMemoryArsipStore } from './arsip-legal';

// In-Memory Fallback Store
export interface BastWithDetails extends Bast {
  details: (BastDetail & {
    arsip?: ArsipLegal | null;
  })[];
}

let nextBastId = 3;
let nextBastDetailId = 5;

export const inMemoryBastStore: Map<number, BastWithDetails> = new Map([
  [
    1,
    {
      id: 1,
      nomorBast: 'BAST/2026/01/001',
      tanggal: new Date('2026-01-20T09:30:00Z'),
      jenis: 'Peminjaman',
      pihakPenyerah: 'Budi Santoso (Admin Legal)',
      pihakPenerima: 'Notaris Denny Siregar, S.H., M.Kn.',
      keterangan: 'Peminjaman dokumen asli PPJB dan pendukung untuk proses balik nama & validasi pajak.',
      createdAt: new Date('2026-01-20T09:30:00Z'),
      updatedAt: new Date('2026-01-20T09:30:00Z'),
      details: [
        {
          id: 1,
          idBast: 1,
          idArsipLegal: 2,
          catatan: 'Dokumen asli PPJB diserahkan dalam map biru',
          arsip: inMemoryArsipStore.get(2) || null,
        },
      ],
    },
  ],
  [
    2,
    {
      id: 2,
      nomorBast: 'BAST/2026/02/002',
      tanggal: new Date('2026-02-10T13:45:00Z'),
      jenis: 'Pengembalian',
      pihakPenyerah: 'Notaris Denny Siregar, S.H., M.Kn.',
      pihakPenerima: 'Budi Santoso (Admin Legal)',
      keterangan: 'Pengembalian dokumen SHM setelah dilakukan pengecekan sertifikat di BPN.',
      createdAt: new Date('2026-02-10T13:45:00Z'),
      updatedAt: new Date('2026-02-10T13:45:00Z'),
      details: [
        {
          id: 2,
          idBast: 2,
          idArsipLegal: 1,
          catatan: 'Sertifikat asli telah kembali lengkap tanpa cacat fisik',
          arsip: inMemoryArsipStore.get(1) || null,
        },
      ],
    },
  ],
]);

let dbAvailable: boolean | null = null;
let lastDbCheck = 0;

async function checkDbConnection(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - lastDbCheck < 10000) {
    return dbAvailable;
  }

  try {
    const { client } = await import('../db');
    const ping = client.unsafe('SELECT 1');
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 2000)
    );
    await Promise.race([ping, timeout]);
    dbAvailable = true;
    lastDbCheck = now;
    return true;
  } catch (error) {
    console.warn('⚠️ [BAST] Database tidak tersedia, beralih ke in-memory store.');
    dbAvailable = false;
    lastDbCheck = now;
    return false;
  }
}

// Helper generate BAST PDF buffer
async function generateBastPdfBuffer(bastRecord: BastWithDetails): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `BAST-${bastRecord.nomorBast.replace(/[\/\\]/g, '_')}`,
          Author: 'Aplikasi Gade - Pengadaan Tanah',
          Subject: `Berita Acara Serah Terima Dokumen - ${bastRecord.jenis}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // QR Code Content
      const qrPayload = JSON.stringify({
        dokumen: 'BAST',
        nomor: bastRecord.nomorBast,
        tanggal: new Date(bastRecord.tanggal).toISOString().split('T')[0],
        jenis: bastRecord.jenis,
        penyerah: bastRecord.pihakPenyerah,
        penerima: bastRecord.pihakPenerima,
        totalDokumen: bastRecord.details.length,
        verifikasi: 'VALID_SISTEM_APLIKASI_GADE',
      });

      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 110,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      const primaryColor = bastRecord.jenis === 'Peminjaman' ? '#2563eb' : '#059669';

      // --- HEADER ---
      doc.rect(40, 40, doc.page.width - 80, 4).fill(primaryColor);
      doc.moveDown(0.8);

      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('APLIKASI GADE - MANAJEMEN TANAH & LEGALITAS', 40, 52, { align: 'center' });

      doc.fillColor('#64748b')
        .font('Helvetica')
        .fontSize(9)
        .text('Sistem Informasi Arsip & Pengadaan Tanah | Layanan Berita Acara Serah Terima', 40, 72, { align: 'center' });

      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, 88).lineTo(doc.page.width - 40, 88).stroke();
      doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(40, 91).lineTo(doc.page.width - 40, 91).stroke();

      // --- JUDUL DOKUMEN ---
      doc.moveDown(1.5);
      const titleY = 106;
      doc.fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('BERITA ACARA SERAH TERIMA BERKAS / DOKUMEN', 40, titleY, { align: 'center' });

      doc.fillColor('#334155')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Nomor: ${bastRecord.nomorBast}`, 40, titleY + 18, { align: 'center' });

      // Badge Jenis
      const badgeText = `KATEGORI TRANSAKSI: ${bastRecord.jenis.toUpperCase()}`;
      doc.font('Helvetica-Bold').fontSize(8);
      const badgeWidth = doc.widthOfString(badgeText) + 16;
      const badgeX = (doc.page.width - badgeWidth) / 2;
      doc.roundedRect(badgeX, titleY + 34, badgeWidth, 16, 4).fill(primaryColor);
      doc.fillColor('#ffffff').text(badgeText, badgeX, titleY + 38, { width: badgeWidth, align: 'center' });

      // --- PEMBUKA ---
      const contentStartY = titleY + 62;
      const formattedDate = new Date(bastRecord.tanggal).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.fillColor('#1e293b')
        .font('Helvetica')
        .fontSize(9.5)
        .text(
          `Pada hari ini, ${formattedDate}, telah dilaksanakan serah terima fisik dokumen/berkas legalitas pertanahan antara para pihak di bawah ini:`,
          40,
          contentStartY,
          { width: doc.page.width - 80, align: 'justify', lineGap: 3 }
        );

      // --- PIHAK PERTAMA & KEDUA BOX ---
      const pihakY = contentStartY + 32;
      const boxWidth = (doc.page.width - 95) / 2;

      // Pihak Penyerah Box
      doc.roundedRect(40, pihakY, boxWidth, 68, 6).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8.5).text('PIHAK I (YANG MENYERAHKAN):', 50, pihakY + 8);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(bastRecord.pihakPenyerah, 50, pihakY + 22, { width: boxWidth - 20 });
      doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Menyerahkan berkas fisik sesuai rincian daftar dokumen yang terlampir di bawah ini.', 50, pihakY + 38, { width: boxWidth - 20 });

      // Pihak Penerima Box
      const rightBoxX = 40 + boxWidth + 15;
      doc.roundedRect(rightBoxX, pihakY, boxWidth, 68, 6).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8.5).text('PIHAK II (YANG MENERIMA):', rightBoxX + 10, pihakY + 8);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(bastRecord.pihakPenerima, rightBoxX + 10, pihakY + 22, { width: boxWidth - 20 });
      doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Menerima dan memeriksa kelengkapan berkas fisik dalam keadaan baik dan lengkap.', rightBoxX + 10, pihakY + 38, { width: boxWidth - 20 });

      // --- TABEL RINCIAN DOKUMEN ---
      let tableY = pihakY + 82;
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('DAFTAR DOKUMEN YANG DISERAH-TERIMAKAN:', 40, tableY);

      tableY += 16;
      // Header Table
      doc.rect(40, tableY, doc.page.width - 80, 22).fill('#1e293b');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('NO', 45, tableY + 6, { width: 25, align: 'center' });
      doc.text('KODE ARSIP', 75, tableY + 6, { width: 75 });
      doc.text('NAMA DOKUMEN', 155, tableY + 6, { width: 145 });
      doc.text('JENIS / NOMOR', 305, tableY + 6, { width: 120 });
      doc.text('CATATAN / KONDISI', 430, tableY + 6, { width: 125 });

      tableY += 22;
      doc.font('Helvetica').fontSize(8);

      bastRecord.details.forEach((item, index) => {
        const arsip = item.arsip;
        const rowHeight = 24;

        // Striped background
        if (index % 2 === 1) {
          doc.rect(40, tableY, doc.page.width - 80, rowHeight).fill('#f8fafc');
        }

        // Border line bottom
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, tableY + rowHeight).lineTo(doc.page.width - 40, tableY + rowHeight).stroke();

        doc.fillColor('#334155');
        doc.text(String(index + 1), 45, tableY + 6, { width: 25, align: 'center' });
        doc.font('Helvetica-Bold').fillColor('#0f172a').text(arsip?.kodeArsip || `ARS-${item.idArsipLegal}`, 75, tableY + 6, { width: 75 });
        doc.font('Helvetica').fillColor('#1e293b').text(arsip?.namaDokumen || 'Dokumen Terkait', 155, tableY + 4, { width: 145, height: 18, ellipsis: true });

        const jenisNomor = `${arsip?.jenisDokumen || '-'} / ${arsip?.nomorDokumen || '-'}`;
        doc.text(jenisNomor, 305, tableY + 4, { width: 120, height: 18, ellipsis: true });

        doc.fillColor('#64748b').text(item.catatan || arsip?.catatan || 'Kondisi Baik & Lengkap', 430, tableY + 4, { width: 125, height: 18, ellipsis: true });

        tableY += rowHeight;
      });

      // Total Dokumen Summary Row
      doc.rect(40, tableY, doc.page.width - 80, 20).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a');
      doc.text(`Total Dokumen Diserahkan: ${bastRecord.details.length} Berkas`, 50, tableY + 5);
      tableY += 28;

      // --- KETERANGAN / KLAUSUL ---
      if (bastRecord.keterangan) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('Keterangan Tambahan:', 40, tableY);
        doc.font('Helvetica').fontSize(8).fillColor('#475569').text(bastRecord.keterangan, 40, tableY + 12, { width: doc.page.width - 80 });
        tableY += 28;
      }

      // Closing Statement
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(
        'Demikian Berita Acara Serah Terima (BAST) ini dibuat dengan sebenarnya dan ditandatangani untuk dapat dipergunakan sebagaimana mestinya.',
        40,
        tableY,
        { width: doc.page.width - 80 }
      );

      // --- TANDA TANGAN & QR CODE ---
      const ttdY = Math.max(tableY + 30, doc.page.height - 180);

      // Kolom Penyerah
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Pihak Yang Menyerahkan,', 50, ttdY, { width: 140, align: 'center' });
      doc.moveDown(3);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(bastRecord.pihakPenyerah, 50, ttdY + 55, { width: 140, align: 'center' });
      doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(50, ttdY + 68).lineTo(190, ttdY + 68).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Tanda Tangan & Nama Terang', 50, ttdY + 72, { width: 140, align: 'center' });

      // Kolom Tengah: QR CODE Validasi
      const qrX = (doc.page.width - 80) / 2;
      doc.image(qrBuffer, qrX, ttdY - 8, { width: 80, height: 80 });
      doc.font('Helvetica-Bold').fontSize(7).fillColor(primaryColor).text('TERVALIDASI SISTEM', qrX - 20, ttdY + 75, { width: 120, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748b').text('Scan QR untuk verifikasi BAST', qrX - 20, ttdY + 84, { width: 120, align: 'center' });

      // Kolom Penerima
      const penerimaX = doc.page.width - 190;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Pihak Yang Menerima,', penerimaX, ttdY, { width: 140, align: 'center' });
      doc.moveDown(3);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(bastRecord.pihakPenerima, penerimaX, ttdY + 55, { width: 140, align: 'center' });
      doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(penerimaX, ttdY + 68).lineTo(penerimaX + 140, ttdY + 68).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Tanda Tangan & Nama Terang', penerimaX, ttdY + 72, { width: 140, align: 'center' });

      // Footer
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
        `Dicetak otomatis oleh Aplikasi Gade pada: ${new Date().toLocaleString('id-ID')} | Ref: ${bastRecord.nomorBast}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Routes
export const bastRoutes = new Elysia({ prefix: '/api/bast' })
  // Helper options: daftar arsip legal untuk dipilih (dengan status fisik terkini)
  .get('/arsip-options', async () => {
    const isDb = await checkDbConnection();
    if (isDb) {
      try {
        const rows = await db
          .select({
            id: arsipLegal.id,
            kodeArsip: arsipLegal.kodeArsip,
            namaDokumen: arsipLegal.namaDokumen,
            kategori: arsipLegal.kategori,
            jenisDokumen: arsipLegal.jenisDokumen,
            nomorDokumen: arsipLegal.nomorDokumen,
            statusFisik: arsipLegal.statusFisik,
            lemari: arsipLegal.lemari,
            rak: arsipLegal.rak,
            bantek: arsipLegal.bantek,
            folderMap: arsipLegal.folderMap,
          })
          .from(arsipLegal)
          .orderBy(desc(arsipLegal.id));

        return { success: true, data: rows };
      } catch (err: any) {
        console.error('Error fetching arsip options from DB:', err.message);
      }
    }

    // In-memory fallback
    const list = Array.from(inMemoryArsipStore.values()).map((a) => ({
      id: a.id,
      kodeArsip: a.kodeArsip,
      namaDokumen: a.namaDokumen,
      kategori: a.kategori,
      jenisDokumen: a.jenisDokumen,
      nomorDokumen: a.nomorDokumen,
      statusFisik: a.statusFisik,
      lemari: a.lemari,
      rak: a.rak,
      bantek: a.bantek,
      folderMap: a.folderMap,
    }));
    return { success: true, data: list };
  })

  // List BAST dengan Search, Filter & Stats
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.toLowerCase().trim() || '';
      const jenisFilter = query.jenis;
      const isDb = await checkDbConnection();

      if (isDb) {
        try {
          const conditions: any[] = [];
          if (jenisFilter && (jenisFilter === 'Peminjaman' || jenisFilter === 'Pengembalian')) {
            conditions.push(eq(bast.jenis, jenisFilter));
          }

          const baseQuery = db.select().from(bast);
          let allBast = conditions.length > 0 ? await baseQuery.where(conditions[0]).orderBy(desc(bast.tanggal)) : await baseQuery.orderBy(desc(bast.tanggal));

          if (search) {
            allBast = allBast.filter(
              (b) =>
                b.nomorBast.toLowerCase().includes(search) ||
                b.pihakPenyerah.toLowerCase().includes(search) ||
                b.pihakPenerima.toLowerCase().includes(search) ||
                (b.keterangan && b.keterangan.toLowerCase().includes(search))
            );
          }

          // Fetch detail counts for each BAST
          const bastIds = allBast.map((b) => b.id);
          let detailRows: any[] = [];
          if (bastIds.length > 0) {
            detailRows = await db
              .select({
                id: bastDetail.id,
                idBast: bastDetail.idBast,
                idArsipLegal: bastDetail.idArsipLegal,
                catatan: bastDetail.catatan,
              })
              .from(bastDetail)
              .where(inArray(bastDetail.idBast, bastIds));
          }

          const detailsByBast = new Map<number, number>();
          detailRows.forEach((d) => {
            detailsByBast.set(d.idBast, (detailsByBast.get(d.idBast) || 0) + 1);
          });

          const dataWithCounts = allBast.map((b) => ({
            ...b,
            totalDokumen: detailsByBast.get(b.id) || 0,
          }));

          const peminjamanCount = dataWithCounts.filter((b) => b.jenis === 'Peminjaman').length;
          const pengembalianCount = dataWithCounts.filter((b) => b.jenis === 'Pengembalian').length;
          const totalDokumenAll = detailRows.length;

          return {
            success: true,
            data: dataWithCounts,
            total: dataWithCounts.length,
            stats: {
              totalBast: dataWithCounts.length,
              peminjamanCount,
              pengembalianCount,
              totalDokumenAll,
            },
          };
        } catch (err: any) {
          console.error('Error querying BAST from DB:', err.message);
        }
      }

      // In-Memory Store Fallback
      let list = Array.from(inMemoryBastStore.values()).sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      );

      if (jenisFilter && (jenisFilter === 'Peminjaman' || jenisFilter === 'Pengembalian')) {
        list = list.filter((b) => b.jenis === jenisFilter);
      }

      if (search) {
        list = list.filter(
          (b) =>
            b.nomorBast.toLowerCase().includes(search) ||
            b.pihakPenyerah.toLowerCase().includes(search) ||
            b.pihakPenerima.toLowerCase().includes(search) ||
            (b.keterangan && b.keterangan.toLowerCase().includes(search))
        );
      }

      const formatted = list.map((b) => ({
        id: b.id,
        nomorBast: b.nomorBast,
        tanggal: b.tanggal,
        jenis: b.jenis,
        pihakPenyerah: b.pihakPenyerah,
        pihakPenerima: b.pihakPenerima,
        keterangan: b.keterangan,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        totalDokumen: b.details.length,
      }));

      const peminjamanCount = formatted.filter((b) => b.jenis === 'Peminjaman').length;
      const pengembalianCount = formatted.filter((b) => b.jenis === 'Pengembalian').length;
      const totalDokumenAll = list.reduce((acc, curr) => acc + curr.details.length, 0);

      return {
        success: true,
        data: formatted,
        total: formatted.length,
        stats: {
          totalBast: formatted.length,
          peminjamanCount,
          pengembalianCount,
          totalDokumenAll,
        },
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        jenis: t.Optional(t.String()),
      }),
    }
  )

  // Get Detail BAST
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const numId = Number(id);
      if (isNaN(numId)) {
        set.status = 400;
        return { success: false, message: 'ID BAST tidak valid' };
      }

      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          const found = await db.select().from(bast).where(eq(bast.id, numId)).limit(1);
          if (!found || found.length === 0) {
            set.status = 404;
            return { success: false, message: 'Data BAST tidak ditemukan' };
          }

          const details = await db
            .select({
              id: bastDetail.id,
              idBast: bastDetail.idBast,
              idArsipLegal: bastDetail.idArsipLegal,
              catatan: bastDetail.catatan,
              kodeArsip: arsipLegal.kodeArsip,
              namaDokumen: arsipLegal.namaDokumen,
              kategori: arsipLegal.kategori,
              jenisDokumen: arsipLegal.jenisDokumen,
              nomorDokumen: arsipLegal.nomorDokumen,
              statusFisik: arsipLegal.statusFisik,
              lemari: arsipLegal.lemari,
              rak: arsipLegal.rak,
              bantek: arsipLegal.bantek,
              folderMap: arsipLegal.folderMap,
            })
            .from(bastDetail)
            .leftJoin(arsipLegal, eq(bastDetail.idArsipLegal, arsipLegal.id))
            .where(eq(bastDetail.idBast, numId));

          return {
            success: true,
            data: {
              ...found[0],
              details: details.map((d) => ({
                id: d.id,
                idBast: d.idBast,
                idArsipLegal: d.idArsipLegal,
                catatan: d.catatan,
                arsip: {
                  id: d.idArsipLegal,
                  kodeArsip: d.kodeArsip,
                  namaDokumen: d.namaDokumen,
                  kategori: d.kategori,
                  jenisDokumen: d.jenisDokumen,
                  nomorDokumen: d.nomorDokumen,
                  statusFisik: d.statusFisik,
                  lemari: d.lemari,
                  rak: d.rak,
                  bantek: d.bantek,
                  folderMap: d.folderMap,
                },
              })),
            },
          };
        } catch (err: any) {
          console.error('Error fetching BAST detail from DB:', err.message);
        }
      }

      // In-Memory Fallback
      const record = inMemoryBastStore.get(numId);
      if (!record) {
        set.status = 404;
        return { success: false, message: 'Data BAST tidak ditemukan' };
      }

      // Enrich arsip details if needed
      const enrichedDetails = record.details.map((d) => {
        const liveArsip = inMemoryArsipStore.get(d.idArsipLegal);
        return {
          ...d,
          arsip: liveArsip || d.arsip,
        };
      });

      return {
        success: true,
        data: {
          ...record,
          details: enrichedDetails,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Buat BAST Baru (Single atau Multi Dokumen)
  .post(
    '/',
    async ({ body, set }) => {
      const {
        nomorBast,
        tanggal,
        jenis,
        pihakPenyerah,
        pihakPenerima,
        keterangan,
        items,
      } = body;

      if (!items || items.length === 0) {
        set.status = 400;
        return { success: false, message: 'Minimal pilih 1 dokumen untuk membuat BAST' };
      }

      const bastDate = tanggal ? new Date(tanggal) : new Date();
      const generatedNomor =
        nomorBast && nomorBast.trim().length > 0
          ? nomorBast.trim()
          : `BAST/${bastDate.getFullYear()}/${String(bastDate.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(100 + Math.random() * 900))}`;

      const targetStatusFisik = jenis === 'Peminjaman' ? 'Dipinjam' : 'Tersedia';

      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          // Insert Header BAST
          const [newBast] = await db
            .insert(bast)
            .values({
              nomorBast: generatedNomor,
              tanggal: bastDate,
              jenis,
              pihakPenyerah,
              pihakPenerima,
              keterangan: keterangan || null,
            })
            .returning();

          // Insert Details
          const detailInserts = items.map((item) => ({
            idBast: newBast.id,
            idArsipLegal: item.idArsipLegal,
            catatan: item.catatan || null,
          }));

          await db.insert(bastDetail).values(detailInserts);

          // Update Status Fisik di arsip_legal
          const arsipIds = items.map((i) => i.idArsipLegal);
          if (arsipIds.length > 0) {
            await db
              .update(arsipLegal)
              .set({
                statusFisik: targetStatusFisik,
                updatedAt: new Date(),
              })
              .where(inArray(arsipLegal.id, arsipIds));
          }

          return {
            success: true,
            message: `Berhasil membuat BAST ${jenis} dengan ${items.length} dokumen`,
            data: { id: newBast.id, nomorBast: newBast.nomorBast },
          };
        } catch (err: any) {
          console.error('Error creating BAST in DB:', err.message);
        }
      }

      // In-Memory Fallback
      const newId = nextBastId++;
      const savedDetails: (BastDetail & { arsip?: ArsipLegal | null })[] = [];

      items.forEach((item) => {
        const detailId = nextBastDetailId++;
        const arsipObj = inMemoryArsipStore.get(item.idArsipLegal);
        if (arsipObj) {
          // Update status fisik di inMemoryArsipStore
          arsipObj.statusFisik = targetStatusFisik;
          arsipObj.updatedAt = new Date();
        }

        savedDetails.push({
          id: detailId,
          idBast: newId,
          idArsipLegal: item.idArsipLegal,
          catatan: item.catatan || null,
          arsip: arsipObj || null,
        });
      });

      const newRecord: BastWithDetails = {
        id: newId,
        nomorBast: generatedNomor,
        tanggal: bastDate,
        jenis,
        pihakPenyerah,
        pihakPenerima,
        keterangan: keterangan || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        details: savedDetails,
      };

      inMemoryBastStore.set(newId, newRecord);

      return {
        success: true,
        message: `Berhasil membuat BAST ${jenis} dengan ${items.length} dokumen`,
        data: { id: newRecord.id, nomorBast: newRecord.nomorBast },
      };
    },
    {
      body: t.Object({
        nomorBast: t.Optional(t.String()),
        tanggal: t.Optional(t.String()),
        jenis: t.Union([t.Literal('Peminjaman'), t.Literal('Pengembalian')]),
        pihakPenyerah: t.String({ minLength: 2 }),
        pihakPenerima: t.String({ minLength: 2 }),
        keterangan: t.Optional(t.String()),
        items: t.Array(
          t.Object({
            idArsipLegal: t.Number(),
            catatan: t.Optional(t.String()),
          })
        ),
      }),
    }
  )

  // Hapus BAST
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numId = Number(id);
      if (isNaN(numId)) {
        set.status = 400;
        return { success: false, message: 'ID BAST tidak valid' };
      }

      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          await db.delete(bast).where(eq(bast.id, numId));
          return { success: true, message: 'Data BAST berhasil dihapus' };
        } catch (err: any) {
          console.error('Error deleting BAST from DB:', err.message);
        }
      }

      // In-Memory Fallback
      if (!inMemoryBastStore.has(numId)) {
        set.status = 404;
        return { success: false, message: 'Data BAST tidak ditemukan' };
      }

      inMemoryBastStore.delete(numId);
      return { success: true, message: 'Data BAST berhasil dihapus' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Cetak Dokumen BAST (PDF dengan QR Code & TTD Digital)
  .get(
    '/:id/cetak',
    async ({ params: { id }, set }) => {
      const numId = Number(id);
      if (isNaN(numId)) {
        set.status = 400;
        return { success: false, message: 'ID BAST tidak valid' };
      }

      let bastRecord: BastWithDetails | null = null;
      const isDb = await checkDbConnection();

      if (isDb) {
        try {
          const found = await db.select().from(bast).where(eq(bast.id, numId)).limit(1);
          if (found && found.length > 0) {
            const rawDetails = await db
              .select({
                id: bastDetail.id,
                idBast: bastDetail.idBast,
                idArsipLegal: bastDetail.idArsipLegal,
                catatan: bastDetail.catatan,
                kodeArsip: arsipLegal.kodeArsip,
                namaDokumen: arsipLegal.namaDokumen,
                kategori: arsipLegal.kategori,
                jenisDokumen: arsipLegal.jenisDokumen,
                nomorDokumen: arsipLegal.nomorDokumen,
                statusFisik: arsipLegal.statusFisik,
              })
              .from(bastDetail)
              .leftJoin(arsipLegal, eq(bastDetail.idArsipLegal, arsipLegal.id))
              .where(eq(bastDetail.idBast, numId));

            bastRecord = {
              ...found[0],
              details: rawDetails.map((d) => ({
                id: d.id,
                idBast: d.idBast,
                idArsipLegal: d.idArsipLegal,
                catatan: d.catatan,
                arsip: {
                  id: d.idArsipLegal,
                  kodeArsip: d.kodeArsip || '',
                  namaDokumen: d.namaDokumen || '',
                  kategori: d.kategori || '',
                  jenisDokumen: d.jenisDokumen || '',
                  nomorDokumen: d.nomorDokumen || '',
                  tanggalDokumen: new Date(),
                  tipeRelasi: 'Umum',
                  idRelasi: null,
                  lemari: null,
                  rak: null,
                  bantek: null,
                  folderMap: null,
                  statusFisik: (d.statusFisik as any) || 'Tersedia',
                  catatan: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              })),
            };
          }
        } catch (err: any) {
          console.error('Error fetching BAST for PDF from DB:', err.message);
        }
      }

      if (!bastRecord) {
        const mem = inMemoryBastStore.get(numId);
        if (mem) {
          bastRecord = {
            ...mem,
            details: mem.details.map((d) => ({
              ...d,
              arsip: inMemoryArsipStore.get(d.idArsipLegal) || d.arsip,
            })),
          };
        }
      }

      if (!bastRecord) {
        set.status = 404;
        return { success: false, message: 'Data BAST tidak ditemukan untuk dicetak' };
      }

      try {
        const pdfBuffer = await generateBastPdfBuffer(bastRecord);
        const safeFilename = bastRecord.nomorBast.replace(/[\/\\:]/g, '_');

        set.headers['Content-Type'] = 'application/pdf';
        set.headers['Content-Disposition'] = `inline; filename="BAST-${safeFilename}.pdf"`;
        set.headers['Cache-Control'] = 'no-cache';

        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="BAST-${safeFilename}.pdf"`,
          },
        });
      } catch (pdfErr: any) {
        console.error('Error generating PDF:', pdfErr);
        set.status = 500;
        return { success: false, message: 'Gagal membuat file PDF BAST', error: pdfErr.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
