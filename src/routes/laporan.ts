import { Elysia, t } from 'elysia';
import { eq, desc, sql } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../db';
import {
  lokasi,
  bidangTanah,
  pihak,
  survey,
  pembahasan,
  legalitasTanah,
  pembebasan,
  kkpr,
  projects,
  arsipLegal,
  bast,
  bastDetail,
} from '../db/schema';

// Connection checker
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
    console.warn('⚠️ [Laporan] Database tidak tersedia, beralih ke in-memory store.');
    dbAvailable = false;
    lastDbCheck = now;
    return false;
  }
}

// In-Memory Fallback Data
const fallbackLokasi = [
  {
    kodeLokasi: 'LOK-2026-001',
    namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
    alamat: 'Jl. Raya Pegadaian No. 45',
    desa: 'Sukamaju',
    kecamatan: 'Cilodong',
    kabupaten: 'Depok',
    peruntukan: 'Komersial & Pergudangan',
    luasTarget: '15000.00',
    luasTeridentifikasi: '14500.00',
    luasDeal: '12000.00',
    status: 'Proses Pembahasan',
    jumlahBidang: 4,
  },
  {
    kodeLokasi: 'LOK-2026-002',
    namaLokasi: 'Proyek Depo Logistik Margonda',
    alamat: 'Jl. Margonda Raya Km 4',
    desa: 'Kemiri Muka',
    kecamatan: 'Beji',
    kabupaten: 'Depok',
    peruntukan: 'Infrastruktur & Depo',
    luasTarget: '25000.00',
    luasTeridentifikasi: '22000.00',
    luasDeal: '18500.00',
    status: 'Survey',
    jumlahBidang: 6,
  },
];

const fallbackBidang = [
  {
    kodeTanah: 'BDG-2026-001',
    kodeLokasi: 'LOK-2026-001',
    namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
    nomorBidang: '001/SKM/2026',
    luas: '3000.00',
    jenisHak: 'SHM',
    nomorHak: 'SHM-4821',
    statusPembebasan: 'Deal',
    hargaPenawaran: '3000000000.00',
    hargaKesepakatan: '2750000000.00',
    namaPemilik: 'Budi Santoso',
    terbayar: '1500000000.00',
    sisaBayar: '1250000000.00',
  },
  {
    kodeTanah: 'BDG-2026-002',
    kodeLokasi: 'LOK-2026-001',
    namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
    nomorBidang: '002/SKM/2026',
    luas: '2500.00',
    jenisHak: 'AJB',
    nomorHak: 'AJB-9912',
    statusPembebasan: 'Teridentifikasi',
    hargaPenawaran: '2500000000.00',
    hargaKesepakatan: '2300000000.00',
    namaPemilik: 'Siti Aminah',
    terbayar: '0.00',
    sisaBayar: '2300000000.00',
  },
  {
    kodeTanah: 'BDG-2026-003',
    kodeLokasi: 'LOK-2026-002',
    namaLokasi: 'Proyek Depo Logistik Margonda',
    nomorBidang: '003/KMR/2026',
    luas: '5000.00',
    jenisHak: 'HGB',
    nomorHak: 'HGB-1120',
    statusPembebasan: 'Selesai',
    hargaPenawaran: '6000000000.00',
    hargaKesepakatan: '5500000000.00',
    namaPemilik: 'PT Megah Propertindo',
    terbayar: '5500000000.00',
    sisaBayar: '0.00',
  },
];

const fallbackPihak = [
  {
    id: 1,
    nama: 'Budi Santoso',
    nik: '3276011203850001',
    nomorTelp: '081234567890',
    tipePihak: 'Pemegang Hak',
    kodeTanah: 'BDG-2026-001',
    namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
  },
  {
    id: 2,
    nama: 'Siti Aminah',
    nik: '3276015509890002',
    nomorTelp: '081398765432',
    tipePihak: 'Ahli Waris',
    kodeTanah: 'BDG-2026-002',
    namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
  },
  {
    id: 3,
    nama: 'PT Megah Propertindo (Direktur Hendra Wijaya)',
    nik: '01.234.567.8-012.000',
    nomorTelp: '021-7890123',
    tipePihak: 'Pemegang Hak',
    kodeTanah: 'BDG-2026-003',
    namaLokasi: 'Proyek Depo Logistik Margonda',
  },
];

const fallbackSurvey = [
  {
    id: 1,
    targetSurvey: 'Lokasi',
    referensiId: 'LOK-2026-001',
    tanggalSurvey: '2026-01-15T09:00:00Z',
    picSurvey: 'Ir. Danang Prasetyo',
    hasilSurvey: 'Lahan datar bebas banjir, akses jalan aspal 8 meter siap dilalui kontainer.',
    koordinat: '-6.4150, 106.8285',
  },
  {
    id: 2,
    targetSurvey: 'Bidang',
    referensiId: 'BDG-2026-001',
    tanggalSurvey: '2026-01-22T10:30:00Z',
    picSurvey: 'Rian Hidayat, S.T.',
    hasilSurvey: 'Batas patok BPN terpasang jelas di 4 sudut, tidak ada sengketa dengan tetangga.',
    koordinat: '-6.4162, 106.8301',
  },
];

const fallbackLegalitas = [
  {
    id: 1,
    kodeTanah: 'BDG-2026-001',
    jenisDokumen: 'SHM',
    status: 'Ada',
    nomorDokumen: 'SHM No. 4821/Cilodong',
    tanggalDokumen: '2019-04-12T00:00:00Z',
    penerbit: 'Kantor Pertanahan Kota Depok',
    catatan: 'Asli disimpan dalam Bantek Legal 01',
  },
  {
    id: 2,
    kodeTanah: 'BDG-2026-002',
    jenisDokumen: 'AJB',
    status: 'Ada',
    nomorDokumen: 'AJB No. 77/2015',
    tanggalDokumen: '2015-08-20T00:00:00Z',
    penerbit: 'PPAT Notaris Denny Siregar, S.H.',
    catatan: 'Perlu konfirmasi status waris sebelum pembayaran tahap 2',
  },
];

const fallbackPembahasan = [
  {
    id: 1,
    target: 'Lokasi',
    referensiId: 'LOK-2026-001',
    tanggal: '2026-01-28T14:00:00Z',
    peserta: 'Tim Pengadaan, Legal Pegadaian, Notaris PPAT',
    keputusan: 'Layak',
    hasilPembahasan: 'Disepakati untuk melanjutkan pembebasan 4 bidang tahap 1 dengan pagu maksimal 10 M.',
  },
  {
    id: 2,
    target: 'Bidang',
    referensiId: 'BDG-2026-002',
    tanggal: '2026-02-05T10:00:00Z',
    peserta: 'Legal, Pemilik Ahli Waris',
    keputusan: 'Perlu Kajian',
    hasilPembahasan: 'Menunggu kelengkapan dokumen surat keterangan kematian dan akta kuasa waris.',
  },
];

const fallbackPemetaan = [
  {
    id: 1,
    kodeKkpr: 'KKPR-2026-001',
    namaKegiatan: 'Pembangunan Gudang Transit Gade Logistik',
    pemohon: 'PT Pegadaian (Persero)',
    nomorIzin: '503/KKPR/DPMPTSP/2026',
    kategori: 'Industri & Pergudangan',
    luasRencana: '15000.00',
    status: 'Disetujui',
  },
  {
    id: 2,
    kodeKkpr: 'KKPR-2026-002',
    namaKegiatan: 'Depo Margonda Sentral',
    pemohon: 'PT Pegadaian (Persero)',
    nomorIzin: '503/KKPR/DPMPTSP/2026-02',
    kategori: 'Infrastruktur & Utilitas',
    luasRencana: '25000.00',
    status: 'Ditinjau',
  },
];

const fallbackProjects = [
  {
    id: 1,
    kodeProject: 'PRJ-2026-001',
    namaProject: 'Pengembangan Sentra Bisnis & Depo Gade Depok',
    lokasi: 'Jl. Margonda Raya & Cilodong',
    desa: 'Sukamaju',
    kecamatan: 'Cilodong',
    kabupaten: 'Depok',
    status: 'Berjalan',
    keterangan: 'Pembebasan lahan target 4 hektar untuk optimalisasi aset perusahaan',
  },
  {
    id: 2,
    kodeProject: 'PRJ-2026-002',
    namaProject: 'Pembangunan Gudang Logistik Emas & Gadai Terpadu',
    lokasi: 'Kawasan Industri Sentul',
    desa: 'Babakan Madang',
    kecamatan: 'Babakan Madang',
    kabupaten: 'Bogor',
    status: 'Perencanaan',
    keterangan: 'Studi kelayakan dan penjajakan pemilik lahan',
  },
];

const fallbackArsip = [
  {
    id: 1,
    kodeArsip: 'ARS-2026-001',
    namaDokumen: 'Sertifikat Asli SHM 4821 Budi Santoso',
    kategori: 'Kepemilikan Tanah',
    jenisDokumen: 'SHM',
    nomorDokumen: 'SHM-4821',
    tipeRelasi: 'Bidang',
    lemari: 'Lemari A',
    rak: 'Rak 2',
    bantek: 'Bantek 01',
    folderMap: 'Map Merah 05',
    statusFisik: 'Tersedia',
  },
  {
    id: 2,
    kodeArsip: 'ARS-2026-002',
    namaDokumen: 'PPJB Akta Notaris Denny Siregar No. 12',
    kategori: 'Perjanjian & Akta',
    jenisDokumen: 'AJB',
    nomorDokumen: 'PPJB-12/2026',
    tipeRelasi: 'Bidang',
    lemari: 'Lemari A',
    rak: 'Rak 2',
    bantek: 'Bantek 01',
    folderMap: 'Map Biru 02',
    statusFisik: 'Dipinjam',
  },
];

const fallbackBast = [
  {
    id: 1,
    nomorBast: 'BAST/2026/01/001',
    tanggal: '2026-01-20T09:30:00Z',
    jenis: 'Peminjaman',
    pihakPenyerah: 'Budi Santoso (Admin Legal)',
    pihakPenerima: 'Notaris Denny Siregar, S.H., M.Kn.',
    jumlahDokumen: 2,
    keterangan: 'Peminjaman dokumen asli PPJB dan sertifikat untuk validasi.',
  },
  {
    id: 2,
    nomorBast: 'BAST/2026/02/002',
    tanggal: '2026-02-10T13:45:00Z',
    jenis: 'Pengembalian',
    pihakPenyerah: 'Notaris Denny Siregar, S.H., M.Kn.',
    pihakPenerima: 'Budi Santoso (Admin Legal)',
    jumlahDokumen: 1,
    keterangan: 'Pengembalian sertifikat setelah pengecekan di BPN selesai.',
  },
];

// Helper: Excel Workbook Generator
async function createExcelBuffer(
  reportTitle: string,
  columns: { header: string; key: string; width: number }[],
  rows: any[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aplikasi Gade Support';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan');

  // Title block
  worksheet.mergeCells('A1', String.fromCharCode(64 + Math.max(columns.length, 4)) + '1');
  const titleRow = worksheet.getCell('A1');
  titleRow.value = reportTitle.toUpperCase();
  titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' },
  };
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 36;

  // Subtitle info
  worksheet.mergeCells('A2', String.fromCharCode(64 + Math.max(columns.length, 4)) + '2');
  const subRow = worksheet.getCell('A2');
  subRow.value = `Dicetak pada: ${new Date().toLocaleString('id-ID')} | Sistem Aplikasi Gade Terpadu`;
  subRow.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  subRow.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Blank spacer

  // Columns & Header Row (Row 4)
  worksheet.columns = columns.map((c) => ({
    key: c.key,
    width: c.width,
  }));

  const headerRow = worksheet.getRow(4);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });
  headerRow.height = 26;

  // Add Data Rows
  rows.forEach((item, rIdx) => {
    const row = worksheet.addRow(item);
    row.height = 22;
    const isEven = rIdx % 2 === 0;
    columns.forEach((_, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle' };
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper: PDF Document Generator
function createPdfBuffer(
  reportTitle: string,
  columns: { header: string; width: number }[],
  rows: string[][],
  summaryText?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 36,
      size: 'A4',
      layout: columns.length > 5 ? 'landscape' : 'portrait',
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header Branding
    doc.rect(36, 36, doc.page.width - 72, 45).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold');
    doc.text('APLIKASI GADE - SISTEM PENGADAAN & MANAJEMEN LAHAN', 46, 46);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${reportTitle.toUpperCase()}`, 46, 64);

    doc.fillColor('#334155').fontSize(8);
    const dateStr = `Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`;
    doc.text(dateStr, doc.page.width - 220, 64, { align: 'right', width: 174 });

    let y = 95;

    if (summaryText) {
      doc.rect(36, y, doc.page.width - 72, 24).fill('#f1f5f9');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
      doc.text(summaryText, 44, y + 7);
      y += 32;
    }

    // Table Header
    const totalTableWidth = columns.reduce((a, b) => a + b.width, 0);
    const scale = (doc.page.width - 72) / totalTableWidth;

    let x = 36;
    doc.rect(36, y, doc.page.width - 72, 20).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

    columns.forEach((col) => {
      const colW = col.width * scale;
      doc.text(col.header, x + 4, y + 6, { width: colW - 8, align: 'left', lineBreak: false });
      x += colW;
    });

    y += 20;

    // Table Rows
    rows.forEach((row, rIdx) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        // redraw header
        x = 36;
        doc.rect(36, y, doc.page.width - 72, 20).fill('#2563eb');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        columns.forEach((col) => {
          const colW = col.width * scale;
          doc.text(col.header, x + 4, y + 6, { width: colW - 8, align: 'left', lineBreak: false });
          x += colW;
        });
        y += 20;
      }

      const isEven = rIdx % 2 === 0;
      doc.rect(36, y, doc.page.width - 72, 18).fill(isEven ? '#ffffff' : '#f8fafc');
      doc.rect(36, y, doc.page.width - 72, 18).strokeColor('#e2e8f0').stroke();

      x = 36;
      doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica');
      row.forEach((cellVal, cIdx) => {
        const colW = columns[cIdx].width * scale;
        doc.text(cellVal || '-', x + 4, y + 5, { width: colW - 8, align: 'left', lineBreak: false });
        x += colW;
      });

      y += 18;
    });

    // Signature Footer
    y += 25;
    if (y < doc.page.height - 90) {
      const signX = doc.page.width - 200;
      doc.fontSize(8).font('Helvetica').fillColor('#334155');
      doc.text('Mengetahui / Menyetujui,', signX, y, { align: 'center', width: 160 });
      doc.text('Kepala Bagian Pengadaan Lahan', signX, y + 12, { align: 'center', width: 160 });
      doc.text('( .................................................. )', signX, y + 55, {
        align: 'center',
        width: 160,
      });
    }

    doc.end();
  });
}

export const laporanRoutes = new Elysia({ prefix: '/api/laporan' })

  // 1. Dashboard Overview Stats
  .get('/dashboard-stats', async () => {
    const isDb = await checkDbConnection();
    if (isDb) {
      try {
        const [lokasiCount] = await db.select({ count: sql<number>`count(*)` }).from(lokasi);
        const [bidangCount] = await db.select({ count: sql<number>`count(*)` }).from(bidangTanah);
        const [pihakCount] = await db.select({ count: sql<number>`count(*)` }).from(pihak);
        const [surveyCount] = await db.select({ count: sql<number>`count(*)` }).from(survey);
        const [legalitasCount] = await db.select({ count: sql<number>`count(*)` }).from(legalitasTanah);
        const [pembahasanCount] = await db.select({ count: sql<number>`count(*)` }).from(pembahasan);
        const [pemetaanCount] = await db.select({ count: sql<number>`count(*)` }).from(kkpr);
        const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
        const [arsipCount] = await db.select({ count: sql<number>`count(*)` }).from(arsipLegal);
        const [bastCount] = await db.select({ count: sql<number>`count(*)` }).from(bast);

        const [pembebasanSum] = await db
          .select({
            totalBayar: sql<string>`coalesce(sum(${pembebasan.jumlahPembayaran}), 0)`,
          })
          .from(pembebasan)
          .where(eq(pembebasan.status, 'Lunas'));

        return {
          success: true,
          stats: {
            lokasi: Number(lokasiCount?.count || 0),
            bidang: Number(bidangCount?.count || 0),
            pihak: Number(pihakCount?.count || 0),
            survey: Number(surveyCount?.count || 0),
            legalitas: Number(legalitasCount?.count || 0),
            pembahasan: Number(pembahasanCount?.count || 0),
            pemetaan: Number(pemetaanCount?.count || 0),
            project: Number(projectCount?.count || 0),
            arsip: Number(arsipCount?.count || 0),
            bast: Number(bastCount?.count || 0),
            totalRealisasiDana: Number(pembebasanSum?.totalBayar || 0),
          },
        };
      } catch (err: any) {
        console.error('Error fetching dashboard stats from DB:', err.message);
      }
    }

    // In-Memory Fallback
    return {
      success: true,
      stats: {
        lokasi: fallbackLokasi.length,
        bidang: fallbackBidang.length,
        pihak: fallbackPihak.length,
        survey: fallbackSurvey.length,
        legalitas: fallbackLegalitas.length,
        pembahasan: fallbackPembahasan.length,
        pemetaan: fallbackPemetaan.length,
        project: fallbackProjects.length,
        arsip: fallbackArsip.length,
        bast: fallbackBast.length,
        totalRealisasiDana: 7000000000,
      },
    };
  })

  // 2. Laporan Progress Pembebasan (Wajib PDF & Excel)
  .get('/progress-pembebasan', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackBidang;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db
          .select({
            kodeTanah: bidangTanah.kodeTanah,
            kodeLokasi: bidangTanah.kodeLokasi,
            namaLokasi: lokasi.namaLokasi,
            nomorBidang: bidangTanah.nomorBidang,
            luas: bidangTanah.luas,
            jenisHak: bidangTanah.jenisHak,
            nomorHak: bidangTanah.nomorHak,
            statusPembebasan: bidangTanah.statusPembebasan,
            hargaPenawaran: bidangTanah.hargaPenawaran,
            hargaKesepakatan: bidangTanah.hargaKesepakatan,
          })
          .from(bidangTanah)
          .leftJoin(lokasi, eq(bidangTanah.kodeLokasi, lokasi.kodeLokasi));

        if (rows && rows.length > 0) {
          // get payments
          const allPayments = await db.select().from(pembebasan);
          data = rows.map((r) => {
            const payments = allPayments.filter((p) => p.kodeTanah === r.kodeTanah && p.status === 'Lunas');
            const totalPaid = payments.reduce((sum, p) => sum + Number(p.jumlahPembayaran || 0), 0);
            const dealPrice = Number(r.hargaKesepakatan || r.hargaPenawaran || 0);
            const remaining = Math.max(dealPrice - totalPaid, 0);

            return {
              kodeTanah: r.kodeTanah,
              kodeLokasi: r.kodeLokasi,
              namaLokasi: r.namaLokasi || '-',
              nomorBidang: r.nomorBidang || '-',
              luas: r.luas ? String(r.luas) : '0',
              jenisHak: r.jenisHak || '-',
              nomorHak: r.nomorHak || '-',
              statusPembebasan: r.statusPembebasan,
              hargaPenawaran: r.hargaPenawaran ? String(r.hargaPenawaran) : '0',
              hargaKesepakatan: r.hargaKesepakatan ? String(r.hargaKesepakatan) : '0',
              namaPemilik: '-',
              terbayar: String(totalPaid),
              sisaBayar: String(remaining),
            };
          });
        }
      } catch (err: any) {
        console.error('Error fetching progress pembebasan from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeTanah.toLowerCase().includes(search) ||
          d.namaLokasi.toLowerCase().includes(search) ||
          d.nomorBidang.toLowerCase().includes(search) ||
          d.statusPembebasan.toLowerCase().includes(search)
      );
    }

    const totalLuas = data.reduce((a, b) => a + Number(b.luas || 0), 0);
    const totalAnggaran = data.reduce((a, b) => a + Number(b.hargaKesepakatan || 0), 0);
    const totalTerbayar = data.reduce((a, b) => a + Number(b.terbayar || 0), 0);
    const totalSisa = data.reduce((a, b) => a + Number(b.sisaBayar || 0), 0);
    const persenBayar = totalAnggaran > 0 ? ((totalTerbayar / totalAnggaran) * 100).toFixed(1) : '0';

    if (format === 'excel') {
      const columns = [
        { header: 'Kode Bidang', key: 'kodeTanah', width: 18 },
        { header: 'Lokasi Pengadaan', key: 'namaLokasi', width: 28 },
        { header: 'No Bidang', key: 'nomorBidang', width: 16 },
        { header: 'Luas (m²)', key: 'luas', width: 14 },
        { header: 'Jenis Hak', key: 'jenisHak', width: 14 },
        { header: 'Nomor Sertifikat/Hak', key: 'nomorHak', width: 20 },
        { header: 'Status Pembebasan', key: 'statusPembebasan', width: 18 },
        { header: 'Pagu Kesepakatan (Rp)', key: 'hargaKesepakatan', width: 22 },
        { header: 'Realisasi Bayar (Rp)', key: 'terbayar', width: 22 },
        { header: 'Sisa Pembayaran (Rp)', key: 'sisaBayar', width: 22 },
      ];

      const buf = await createExcelBuffer('Laporan Progress Pembebasan Lahan', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Progress_Pembebasan.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode Bidang', width: 75 },
        { header: 'Lokasi', width: 110 },
        { header: 'No Bidang', width: 65 },
        { header: 'Luas (m²)', width: 50 },
        { header: 'Jenis Hak', width: 50 },
        { header: 'Status', width: 65 },
        { header: 'Kesepakatan (Rp)', width: 90 },
        { header: 'Realisasi (Rp)', width: 90 },
        { header: 'Sisa (Rp)', width: 85 },
      ];

      const rows = data.map((d) => [
        d.kodeTanah,
        d.namaLokasi,
        d.nomorBidang,
        Number(d.luas).toLocaleString('id-ID'),
        d.jenisHak,
        d.statusPembebasan,
        Number(d.hargaKesepakatan).toLocaleString('id-ID'),
        Number(d.terbayar).toLocaleString('id-ID'),
        Number(d.sisaBayar).toLocaleString('id-ID'),
      ]);

      const summaryText = `Ringkasan: Total Bidang = ${data.length} | Luas = ${totalLuas.toLocaleString('id-ID')} m² | Pagu = Rp ${totalAnggaran.toLocaleString('id-ID')} | Terbayar = Rp ${totalTerbayar.toLocaleString('id-ID')} (${persenBayar}%) | Sisa = Rp ${totalSisa.toLocaleString('id-ID')}`;

      const buf = await createPdfBuffer('Laporan Progress Pembebasan Lahan', columns, rows, summaryText);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Progress_Pembebasan.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return {
      success: true,
      summary: {
        totalBidang: data.length,
        totalLuas,
        totalAnggaran,
        totalTerbayar,
        totalSisa,
        persenBayar,
      },
      data,
    };
  })

  // 3. Laporan Rekapitulasi Lokasi
  .get('/rekap-lokasi', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackLokasi;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(lokasi);
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            kodeLokasi: r.kodeLokasi,
            namaLokasi: r.namaLokasi,
            alamat: r.alamat || '-',
            desa: r.desa || '-',
            kecamatan: r.kecamatan || '-',
            kabupaten: r.kabupaten || '-',
            peruntukan: r.peruntukan || '-',
            luasTarget: r.luasTarget ? String(r.luasTarget) : '0',
            luasTeridentifikasi: r.luasTeridentifikasi ? String(r.luasTeridentifikasi) : '0',
            luasDeal: r.luasDeal ? String(r.luasDeal) : '0',
            status: r.status,
            jumlahBidang: Array.isArray(r.bidangTerpetakan) ? r.bidangTerpetakan.length : 0,
          }));
        }
      } catch (err: any) {
        console.error('Error fetching rekap lokasi from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeLokasi.toLowerCase().includes(search) ||
          d.namaLokasi.toLowerCase().includes(search) ||
          d.kabupaten.toLowerCase().includes(search) ||
          d.status.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'Kode Lokasi', key: 'kodeLokasi', width: 16 },
        { header: 'Nama Lokasi', key: 'namaLokasi', width: 28 },
        { header: 'Desa / Kel', key: 'desa', width: 16 },
        { header: 'Kecamatan', key: 'kecamatan', width: 16 },
        { header: 'Kabupaten/Kota', key: 'kabupaten', width: 18 },
        { header: 'Peruntukan', key: 'peruntukan', width: 22 },
        { header: 'Luas Target (m²)', key: 'luasTarget', width: 16 },
        { header: 'Luas Deal (m²)', key: 'luasDeal', width: 16 },
        { header: 'Status', key: 'status', width: 18 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Lokasi', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Lokasi.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode Lokasi', width: 75 },
        { header: 'Nama Lokasi', width: 130 },
        { header: 'Wilayah (Kec/Kab)', width: 110 },
        { header: 'Peruntukan', width: 100 },
        { header: 'Target (m²)', width: 65 },
        { header: 'Deal (m²)', width: 65 },
        { header: 'Status', width: 85 },
      ];
      const rows = data.map((d) => [
        d.kodeLokasi,
        d.namaLokasi,
        `${d.kecamatan}, ${d.kabupaten}`,
        d.peruntukan,
        Number(d.luasTarget).toLocaleString('id-ID'),
        Number(d.luasDeal).toLocaleString('id-ID'),
        d.status,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Lokasi', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Lokasi.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 4. Laporan Rekapitulasi Bidang Tanah
  .get('/rekap-bidang', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackBidang;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db
          .select({
            kodeTanah: bidangTanah.kodeTanah,
            kodeLokasi: bidangTanah.kodeLokasi,
            namaLokasi: lokasi.namaLokasi,
            nomorBidang: bidangTanah.nomorBidang,
            luas: bidangTanah.luas,
            jenisHak: bidangTanah.jenisHak,
            nomorHak: bidangTanah.nomorHak,
            statusPembebasan: bidangTanah.statusPembebasan,
            hargaPenawaran: bidangTanah.hargaPenawaran,
            hargaKesepakatan: bidangTanah.hargaKesepakatan,
          })
          .from(bidangTanah)
          .leftJoin(lokasi, eq(bidangTanah.kodeLokasi, lokasi.kodeLokasi));

        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            kodeTanah: r.kodeTanah,
            kodeLokasi: r.kodeLokasi,
            namaLokasi: r.namaLokasi || '-',
            nomorBidang: r.nomorBidang || '-',
            luas: r.luas ? String(r.luas) : '0',
            jenisHak: r.jenisHak || '-',
            nomorHak: r.nomorHak || '-',
            statusPembebasan: r.statusPembebasan,
            hargaPenawaran: r.hargaPenawaran ? String(r.hargaPenawaran) : '0',
            hargaKesepakatan: r.hargaKesepakatan ? String(r.hargaKesepakatan) : '0',
            namaPemilik: '-',
            terbayar: '0',
            sisaBayar: '0',
          }));
        }
      } catch (err: any) {
        console.error('Error fetching rekap bidang from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeTanah.toLowerCase().includes(search) ||
          d.namaLokasi.toLowerCase().includes(search) ||
          d.nomorBidang.toLowerCase().includes(search) ||
          d.jenisHak.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'Kode Bidang', key: 'kodeTanah', width: 16 },
        { header: 'Nama Lokasi', key: 'namaLokasi', width: 28 },
        { header: 'No Bidang', key: 'nomorBidang', width: 16 },
        { header: 'Luas (m²)', key: 'luas', width: 14 },
        { header: 'Jenis Hak', key: 'jenisHak', width: 14 },
        { header: 'Nomor Hak', key: 'nomorHak', width: 18 },
        { header: 'Status Pembebasan', key: 'statusPembebasan', width: 18 },
        { header: 'Harga Kesepakatan (Rp)', key: 'hargaKesepakatan', width: 22 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Bidang Tanah', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Bidang.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode Bidang', width: 85 },
        { header: 'Lokasi', width: 130 },
        { header: 'No Bidang', width: 75 },
        { header: 'Luas (m²)', width: 60 },
        { header: 'Jenis Hak', width: 60 },
        { header: 'Nomor Hak', width: 75 },
        { header: 'Status', width: 75 },
        { header: 'Kesepakatan (Rp)', width: 95 },
      ];
      const rows = data.map((d) => [
        d.kodeTanah,
        d.namaLokasi,
        d.nomorBidang,
        Number(d.luas).toLocaleString('id-ID'),
        d.jenisHak,
        d.nomorHak,
        d.statusPembebasan,
        Number(d.hargaKesepakatan).toLocaleString('id-ID'),
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Bidang Tanah', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Bidang.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 5. Laporan Rekapitulasi Pihak/Pemilik
  .get('/rekap-pihak', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackPihak;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db
          .select({
            id: pihak.id,
            nama: pihak.nama,
            nik: pihak.nik,
            nomorTelp: pihak.nomorTelp,
            tipePihak: pihak.tipePihak,
            kodeTanah: pihak.kodeTanah,
            namaLokasi: lokasi.namaLokasi,
          })
          .from(pihak)
          .leftJoin(bidangTanah, eq(pihak.kodeTanah, bidangTanah.kodeTanah))
          .leftJoin(lokasi, eq(bidangTanah.kodeLokasi, lokasi.kodeLokasi));

        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            nama: r.nama,
            nik: r.nik || '-',
            nomorTelp: r.nomorTelp || '-',
            tipePihak: r.tipePihak,
            kodeTanah: r.kodeTanah,
            namaLokasi: r.namaLokasi || '-',
          }));
        }
      } catch (err: any) {
        console.error('Error fetching rekap pihak from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.nama.toLowerCase().includes(search) ||
          d.nik.toLowerCase().includes(search) ||
          d.kodeTanah.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Nama Pihak / Pemilik', key: 'nama', width: 28 },
        { header: 'NIK / NPWP', key: 'nik', width: 20 },
        { header: 'No Telepon', key: 'nomorTelp', width: 18 },
        { header: 'Tipe Pihak', key: 'tipePihak', width: 18 },
        { header: 'Kode Bidang Tanah', key: 'kodeTanah', width: 18 },
        { header: 'Lokasi Proyek', key: 'namaLokasi', width: 28 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Pihak / Pemilik Tanah', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Pihak.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Nama Pihak', width: 130 },
        { header: 'NIK / No Identitas', width: 110 },
        { header: 'No Telepon', width: 85 },
        { header: 'Tipe Pihak', width: 85 },
        { header: 'Kode Bidang', width: 85 },
        { header: 'Lokasi Proyek', width: 130 },
      ];
      const rows = data.map((d) => [
        d.nama,
        d.nik,
        d.nomorTelp,
        d.tipePihak,
        d.kodeTanah,
        d.namaLokasi,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Pihak / Pemilik Tanah', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Pihak.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 6. Laporan Rekapitulasi Survey
  .get('/rekap-survey', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackSurvey;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(survey).orderBy(desc(survey.createdAt));
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            targetSurvey: r.targetSurvey,
            referensiId: r.referensiId,
            tanggalSurvey: r.tanggalSurvey ? r.tanggalSurvey.toISOString() : '-',
            picSurvey: r.picSurvey || '-',
            hasilSurvey: r.hasilSurvey || '-',
            koordinat: r.koordinat || '-',
          }));
        }
      } catch (err: any) {
        console.error('Error fetching survey from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.referensiId.toLowerCase().includes(search) ||
          d.picSurvey.toLowerCase().includes(search) ||
          d.hasilSurvey.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Target Survey', key: 'targetSurvey', width: 14 },
        { header: 'Referensi ID (Lokasi/Bidang)', key: 'referensiId', width: 22 },
        { header: 'Tanggal Survey', key: 'tanggalSurvey', width: 20 },
        { header: 'PIC Petugas Survey', key: 'picSurvey', width: 22 },
        { header: 'Koordinat', key: 'koordinat', width: 18 },
        { header: 'Hasil & Kondisi Lapangan', key: 'hasilSurvey', width: 36 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Hasil Survey Lapangan', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Survey.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Target', width: 50 },
        { header: 'Referensi ID', width: 80 },
        { header: 'Tanggal', width: 75 },
        { header: 'Petugas / PIC', width: 95 },
        { header: 'Koordinat', width: 80 },
        { header: 'Hasil Catatan Survey', width: 200 },
      ];
      const rows = data.map((d) => [
        d.targetSurvey,
        d.referensiId,
        d.tanggalSurvey ? new Date(d.tanggalSurvey).toLocaleDateString('id-ID') : '-',
        d.picSurvey,
        d.koordinat,
        d.hasilSurvey,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Hasil Survey Lapangan', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Survey.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 7. Laporan Rekapitulasi Legalitas Tanah
  .get('/rekap-legalitas', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackLegalitas;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(legalitasTanah);
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            kodeTanah: r.kodeTanah,
            jenisDokumen: r.jenisDokumen,
            status: r.status,
            nomorDokumen: r.nomorDokumen || '-',
            tanggalDokumen: r.tanggalDokumen ? r.tanggalDokumen.toISOString() : '-',
            penerbit: r.penerbit || '-',
            catatan: r.catatan || '-',
          }));
        }
      } catch (err: any) {
        console.error('Error fetching legalitas from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeTanah.toLowerCase().includes(search) ||
          d.jenisDokumen.toLowerCase().includes(search) ||
          d.nomorDokumen.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Kode Bidang', key: 'kodeTanah', width: 16 },
        { header: 'Jenis Dokumen', key: 'jenisDokumen', width: 16 },
        { header: 'Status Keberadaan', key: 'status', width: 18 },
        { header: 'Nomor Dokumen', key: 'nomorDokumen', width: 24 },
        { header: 'Instansi Penerbit', key: 'penerbit', width: 24 },
        { header: 'Catatan Dokumen', key: 'catatan', width: 28 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Legalitas Dokumen Tanah', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Legalitas.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode Bidang', width: 85 },
        { header: 'Jenis Dokumen', width: 80 },
        { header: 'Status', width: 65 },
        { header: 'Nomor Dokumen', width: 110 },
        { header: 'Penerbit', width: 110 },
        { header: 'Keterangan', width: 130 },
      ];
      const rows = data.map((d) => [
        d.kodeTanah,
        d.jenisDokumen,
        d.status,
        d.nomorDokumen,
        d.penerbit,
        d.catatan,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Legalitas Dokumen Tanah', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Legalitas.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 8. Laporan Rekapitulasi Pembahasan
  .get('/rekap-pembahasan', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackPembahasan;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(pembahasan).orderBy(desc(pembahasan.createdAt));
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            target: r.target,
            referensiId: r.referensiId,
            tanggal: r.tanggal ? r.tanggal.toISOString() : '-',
            peserta: r.peserta || '-',
            keputusan: r.keputusan,
            hasilPembahasan: r.hasilPembahasan || '-',
          }));
        }
      } catch (err: any) {
        console.error('Error fetching pembahasan from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.referensiId.toLowerCase().includes(search) ||
          d.keputusan.toLowerCase().includes(search) ||
          d.hasilPembahasan.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Target', key: 'target', width: 12 },
        { header: 'Referensi ID', key: 'referensiId', width: 18 },
        { header: 'Tanggal Rapat', key: 'tanggal', width: 18 },
        { header: 'Peserta', key: 'peserta', width: 26 },
        { header: 'Keputusan', key: 'keputusan', width: 16 },
        { header: 'Kesimpulan & Notulensi', key: 'hasilPembahasan', width: 36 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Notulensi Pembahasan', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Pembahasan.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Target', width: 50 },
        { header: 'Referensi', width: 75 },
        { header: 'Tanggal', width: 70 },
        { header: 'Keputusan', width: 75 },
        { header: 'Peserta Rapat', width: 110 },
        { header: 'Hasil & Kesimpulan', width: 180 },
      ];
      const rows = data.map((d) => [
        d.target,
        d.referensiId,
        d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID') : '-',
        d.keputusan,
        d.peserta,
        d.hasilPembahasan,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Notulensi Pembahasan', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Pembahasan.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 9. Laporan Rekapitulasi Pemetaan (GIS & KKPR)
  .get('/rekap-pemetaan', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackPemetaan;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(kkpr);
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            kodeKkpr: r.kodeKkpr,
            namaKegiatan: r.namaKegiatan,
            pemohon: r.pemohon || '-',
            nomorIzin: r.nomorIzin || '-',
            kategori: r.kategori,
            luasRencana: r.luasRencana ? String(r.luasRencana) : '0',
            status: r.status,
          }));
        }
      } catch (err: any) {
        console.error('Error fetching pemetaan from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeKkpr.toLowerCase().includes(search) ||
          d.namaKegiatan.toLowerCase().includes(search) ||
          d.kategori.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Kode KKPR', key: 'kodeKkpr', width: 16 },
        { header: 'Nama Kegiatan / Pemanfaatan', key: 'namaKegiatan', width: 28 },
        { header: 'Pemohon', key: 'pemohon', width: 22 },
        { header: 'No Izin KKPR / OSS', key: 'nomorIzin', width: 22 },
        { header: 'Kategori Ruang', key: 'kategori', width: 20 },
        { header: 'Luas Rencana (m²)', key: 'luasRencana', width: 16 },
        { header: 'Status KKPR', key: 'status', width: 16 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Pemetaan & Izin KKPR', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Pemetaan.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode KKPR', width: 85 },
        { header: 'Nama Kegiatan', width: 140 },
        { header: 'Pemohon', width: 100 },
        { header: 'No Izin OSS', width: 100 },
        { header: 'Kategori', width: 90 },
        { header: 'Luas (m²)', width: 60 },
        { header: 'Status', width: 65 },
      ];
      const rows = data.map((d) => [
        d.kodeKkpr,
        d.namaKegiatan,
        d.pemohon,
        d.nomorIzin,
        d.kategori,
        Number(d.luasRencana).toLocaleString('id-ID'),
        d.status,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Pemetaan & Izin KKPR', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Pemetaan.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 10. Laporan Rekapitulasi Project
  .get('/rekap-project', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackProjects;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(projects);
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            kodeProject: r.kodeProject,
            namaProject: r.namaProject,
            lokasi: r.lokasi,
            desa: r.desa,
            kecamatan: r.kecamatan,
            kabupaten: r.kabupaten,
            status: r.status,
            keterangan: r.keterangan || '-',
          }));
        }
      } catch (err: any) {
        console.error('Error fetching project from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeProject.toLowerCase().includes(search) ||
          d.namaProject.toLowerCase().includes(search) ||
          d.kabupaten.toLowerCase().includes(search) ||
          d.status.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Kode Project', key: 'kodeProject', width: 16 },
        { header: 'Nama Project', key: 'namaProject', width: 28 },
        { header: 'Lokasi Area', key: 'lokasi', width: 24 },
        { header: 'Kecamatan', key: 'kecamatan', width: 16 },
        { header: 'Kabupaten/Kota', key: 'kabupaten', width: 18 },
        { header: 'Status Project', key: 'status', width: 16 },
        { header: 'Keterangan Sasaran', key: 'keterangan', width: 32 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Monitoring Project', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Project.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode Project', width: 85 },
        { header: 'Nama Project', width: 150 },
        { header: 'Wilayah (Kec/Kab)', width: 120 },
        { header: 'Status', width: 75 },
        { header: 'Keterangan Sasaran', width: 190 },
      ];
      const rows = data.map((d) => [
        d.kodeProject,
        d.namaProject,
        `${d.kecamatan}, ${d.kabupaten}`,
        d.status,
        d.keterangan,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Monitoring Project', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Project.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 11. Laporan Rekapitulasi Arsip Legal & Fisik
  .get('/rekap-arsip', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackArsip;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(arsipLegal);
        if (rows && rows.length > 0) {
          data = rows.map((r) => ({
            id: r.id,
            kodeArsip: r.kodeArsip,
            namaDokumen: r.namaDokumen,
            kategori: r.kategori,
            jenisDokumen: r.jenisDokumen,
            nomorDokumen: r.nomorDokumen,
            tipeRelasi: r.tipeRelasi,
            lemari: r.lemari || '-',
            rak: r.rak || '-',
            bantek: r.bantek || '-',
            folderMap: r.folderMap || '-',
            statusFisik: r.statusFisik,
          }));
        }
      } catch (err: any) {
        console.error('Error fetching arsip from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.kodeArsip.toLowerCase().includes(search) ||
          d.namaDokumen.toLowerCase().includes(search) ||
          d.nomorDokumen.toLowerCase().includes(search) ||
          d.statusFisik.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Kode Arsip', key: 'kodeArsip', width: 16 },
        { header: 'Nama Dokumen', key: 'namaDokumen', width: 28 },
        { header: 'Kategori', key: 'kategori', width: 18 },
        { header: 'Jenis', key: 'jenisDokumen', width: 14 },
        { header: 'Nomor Dokumen', key: 'nomorDokumen', width: 20 },
        { header: 'Lemari', key: 'lemari', width: 12 },
        { header: 'Rak', key: 'rak', width: 12 },
        { header: 'Bantek', key: 'bantek', width: 14 },
        { header: 'Folder/Map', key: 'folderMap', width: 14 },
        { header: 'Status Fisik', key: 'statusFisik', width: 16 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Arsip Legal & Fisik', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_Arsip.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Kode Arsip', width: 75 },
        { header: 'Nama Dokumen', width: 130 },
        { header: 'Kategori', width: 85 },
        { header: 'No Dokumen', width: 95 },
        { header: 'Lokasi Fisik (Rak/Bantek/Map)', width: 140 },
        { header: 'Status', width: 75 },
      ];
      const rows = data.map((d) => [
        d.kodeArsip,
        d.namaDokumen,
        d.kategori,
        d.nomorDokumen,
        `${d.lemari}, ${d.rak}, ${d.bantek}, ${d.folderMap}`,
        d.statusFisik,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Arsip Legal & Fisik', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_Arsip.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  })

  // 12. Laporan Rekapitulasi Serah Terima (BAST)
  .get('/rekap-bast', async ({ query, set }) => {
    const format = query.format || 'json';
    const search = query.search?.toLowerCase() || '';

    let data = fallbackBast;
    const isDb = await checkDbConnection();

    if (isDb) {
      try {
        const rows = await db.select().from(bast).orderBy(desc(bast.tanggal));
        if (rows && rows.length > 0) {
          const allDetails = await db.select().from(bastDetail);
          data = rows.map((r) => {
            const count = allDetails.filter((d) => d.idBast === r.id).length;
            return {
              id: r.id,
              nomorBast: r.nomorBast,
              tanggal: r.tanggal ? r.tanggal.toISOString() : '-',
              jenis: r.jenis,
              pihakPenyerah: r.pihakPenyerah,
              pihakPenerima: r.pihakPenerima,
              jumlahDokumen: count,
              keterangan: r.keterangan || '-',
            };
          });
        }
      } catch (err: any) {
        console.error('Error fetching bast from DB:', err.message);
      }
    }

    if (search) {
      data = data.filter(
        (d) =>
          d.nomorBast.toLowerCase().includes(search) ||
          d.pihakPenyerah.toLowerCase().includes(search) ||
          d.pihakPenerima.toLowerCase().includes(search) ||
          d.jenis.toLowerCase().includes(search)
      );
    }

    if (format === 'excel') {
      const columns = [
        { header: 'No', key: 'id', width: 8 },
        { header: 'Nomor BAST', key: 'nomorBast', width: 22 },
        { header: 'Tanggal', key: 'tanggal', width: 18 },
        { header: 'Jenis BAST', key: 'jenis', width: 16 },
        { header: 'Pihak Penyerah', key: 'pihakPenyerah', width: 26 },
        { header: 'Pihak Penerima', key: 'pihakPenerima', width: 26 },
        { header: 'Jumlah Dokumen', key: 'jumlahDokumen', width: 16 },
        { header: 'Keterangan', key: 'keterangan', width: 32 },
      ];
      const buf = await createExcelBuffer('Laporan Rekapitulasi Berita Acara Serah Terima (BAST)', columns, data);
      set.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      set.headers['Content-Disposition'] = 'attachment; filename="Laporan_Rekap_BAST.xlsx"';
      return new Response(buf, { headers: set.headers });
    }

    if (format === 'pdf') {
      const columns = [
        { header: 'Nomor BAST', width: 110 },
        { header: 'Tanggal', width: 75 },
        { header: 'Jenis', width: 70 },
        { header: 'Penyerah', width: 110 },
        { header: 'Penerima', width: 110 },
        { header: 'Jml Dokumen', width: 60 },
        { header: 'Keterangan', width: 130 },
      ];
      const rows = data.map((d) => [
        d.nomorBast,
        d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID') : '-',
        d.jenis,
        d.pihakPenyerah,
        d.pihakPenerima,
        String(d.jumlahDokumen),
        d.keterangan,
      ]);
      const buf = await createPdfBuffer('Laporan Rekapitulasi Berita Acara Serah Terima (BAST)', columns, rows);
      set.headers['Content-Type'] = 'application/pdf';
      set.headers['Content-Disposition'] = 'inline; filename="Laporan_Rekap_BAST.pdf"';
      return new Response(buf, { headers: set.headers });
    }

    return { success: true, count: data.length, data };
  });
