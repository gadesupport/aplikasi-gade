import { Elysia, t } from 'elysia';
import { eq, desc, sql } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import { db } from '../db';
import {
  dokumenCustomField,
  dokumenTemplate,
  dokumenCetakLog,
  lokasi,
  bidangTanah,
  pihak,
  projects,
  type DokumenCustomField,
  type DokumenTemplate,
  type DokumenCetakLog,
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
    console.warn('⚠️ [Generate Dokumen] Database tidak tersedia, beralih ke in-memory store.');
    dbAvailable = false;
    lastDbCheck = now;
    return false;
  }
}

// In-Memory Fallback Stores
export const inMemoryCustomFields: Map<number, DokumenCustomField> = new Map([
  [
    1,
    {
      id: 1,
      kodeField: 'custom_nomor_sk',
      namaField: 'Nomor SK Penetapan Lokasi',
      tipeData: 'text',
      defaultValue: '593/Kep.102-DPMPTSP/2026',
      keterangan: 'Nomor surat keputusan bupati/wali kota tentang penlok',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeField: 'custom_nama_kades',
      namaField: 'Nama Kepala Desa / Lurah',
      tipeData: 'text',
      defaultValue: 'Drs. H. Mulyadi Kartasasmita',
      keterangan: 'Kepala desa setempat untuk mengetahui surat',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeField: 'custom_nip_kades',
      namaField: 'NIP Kepala Desa / Lurah',
      tipeData: 'text',
      defaultValue: '19740512 199903 1 004',
      keterangan: 'Nomor Induk Pegawai kepala desa/lurah',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    4,
    {
      id: 4,
      kodeField: 'custom_penilai_appraisal',
      namaField: 'Nama KJPP / Penilai Publik',
      tipeData: 'text',
      defaultValue: 'KJPP Doli Siregar & Rekan',
      keterangan: 'Kantor Jasa Penilai Publik yang ditunjuk',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

export const inMemoryTemplates: Map<number, DokumenTemplate> = new Map([
  [
    1,
    {
      id: 1,
      kodeTemplate: 'TPL-SPPHT-01',
      namaTemplate: 'Surat Pernyataan Pelepasan Hak Atas Tanah (SPPHT)',
      kategori: 'Surat Pernyataan',
      ukuranKertas: 'A4',
      orientasi: 'Portrait',
      layoutMode: 'Single',
      headerText: 'PEMERINTAH KABUPATEN / KOTA\nKANTOR PERTANAHAN & TIM PENGADAAN LAHAN\n=============================================================',
      isiTemplate: `SURAT PERNYATAAN PELEPASAN HAK ATAS TANAH
Nomor: {{nomorSurat}}

Yang bertanda tangan di bawah ini:
Nama Lengkap      : {{namaPemilik}}
Nomor Induk (NIK) : {{nikPemilik}}
Nomor Telepon/HP  : {{nomorTelpPemilik}}
Bertindak Sebagai : {{tipePihak}}

Dengan ini menyatakan dengan sebenarnya dan tanpa paksaan dari pihak manapun, bahwa saya melepaskan hak atas sebidang tanah dengan rincian sebagai berikut:

- Kode Bidang Tanah  : {{kodeTanah}}
- Lokasi Pengadaan   : {{namaLokasi}}
- Desa / Kelurahan   : {{desa}}
- Kecamatan          : {{kecamatan}}
- Kabupaten / Kota   : {{kabupaten}}
- Luas Tanah         : {{luas}} m²
- Status Hak / Bukti : {{jenisHak}} No. {{nomorHak}}
- Nilai Ganti Kerugian Disepakati : Rp {{hargaKesepakatan}}

Tanah tersebut di atas dilepaskan kepada PT PEGADAIAN (PERSERO) untuk keperluan {{peruntukan}} sesuai dengan SK Penetapan Lokasi No. {{custom_nomor_sk}}.

Demikian Surat Pernyataan Pelepasan Hak ini saya buat dengan penuh kesadaran dan tanggung jawab, untuk dapat dipergunakan sebagaimana mestinya.`,
      isiTemplateHalaman2: null,
      footerText: 'Dibuat di {{kabupaten}}, pada tanggal {{tanggalHariIni}}\nMengetahui,\nKepala Desa / Lurah: {{custom_nama_kades}} (NIP: {{custom_nip_kades}})',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeTemplate: 'TPL-BA-KESEPAKATAN',
      namaTemplate: 'Berita Acara Kesepakatan Ganti Kerugian Lahan',
      kategori: 'Berita Acara',
      ukuranKertas: 'A4',
      orientasi: 'Portrait',
      layoutMode: 'Single',
      headerText: 'BERITA ACARA MUSYAWARAH GANTI KERUGIAN\nPROYEK PENGADAAN LAHAN TERPADU',
      isiTemplate: `BERITA ACARA KESEPAKATAN BENTUK DAN BESARNYA GANTI KERUGIAN
Nomor: BA/{{nomorBidang}}/{{tahun}}

Pada hari ini, tanggal {{tanggalHariIni}}, telah dilaksanakan musyawarah penetapan bentuk dan besaran ganti kerugian untuk pengadaan tanah bagi kepentingan umum pada proyek: {{namaProject}}.

Rincian Objek dan Pihak yang Berhak:
1. Nama Pemilik / Yang Berhak : {{namaPemilik}} (NIK: {{nikPemilik}})
2. Objek Tanah                : Bidang No. {{nomorBidang}} (Kode: {{kodeTanah}})
3. Luas Tanah Terkena         : {{luas}} m²
4. Bukti Kepemilikan          : {{jenisHak}} Nomor {{nomorHak}}
5. Letak Tanah                : {{alamat}}, Desa {{desa}}, Kec. {{kecamatan}}, Kab. {{kabupaten}}

Berdasarkan hasil penilaian dari {{custom_penilai_appraisal}}, disepakati bentuk ganti kerugian berupa UANG TUNAI / TRANSFER BANK sebesar:
Rp {{hargaKesepakatan}} (Dua Miliar Tujuh Ratus Lima Puluh Juta Rupiah).

Kedua belah pihak telah menyetujui besaran ganti kerugian di atas dan tidak akan menuntut ganti kerugian dalam bentuk apapun di kemudian hari.`,
      isiTemplateHalaman2: null,
      footerText: 'Pihak Yang Berhak: {{namaPemilik}} | Tim Pengadaan: PT Pegadaian (Persero)',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeTemplate: 'TPL-BUKU-RISALAH',
      namaTemplate: 'Buku Risalah & Verifikasi Pengadaan Lahan (Format Buku 2 Halaman)',
      kategori: 'Buku Risalah',
      ukuranKertas: 'A4',
      orientasi: 'Landscape',
      layoutMode: 'TwoPageBook',
      headerText: 'BUKU RISALAH & PEMERIKSAAN FISIK BIDANG TANAH - GADE LAND MANAGEMENT',
      isiTemplate: `[ HALAMAN KIRI - IDENTITAS & LEGALITAS ]

A. INFORMASI PROYEK & LOKASI
- Nama Proyek      : {{namaProject}}
- Lokasi           : {{namaLokasi}}
- Alamat           : {{alamat}}
- Desa / Kelurahan : {{desa}}
- Kecamatan        : {{kecamatan}}
- Kabupaten / Kota : {{kabupaten}}
- Peruntukan       : {{peruntukan}}

B. IDENTITAS PIHAK YANG BERHAK
- Nama Pemilik     : {{namaPemilik}}
- Nomor NIK        : {{nikPemilik}}
- Kontak / Telepon : {{nomorTelpPemilik}}
- Kedudukan        : {{tipePihak}}

C. DATA FISIK DAN YURIDIS BIDANG
- Nomor Bidang     : {{nomorBidang}}
- Kode Tanah       : {{kodeTanah}}
- Luas Tanah       : {{luas}} m²
- Status Hak Tanah : {{jenisHak}} (No. {{nomorHak}})
- SK Penlok        : {{custom_nomor_sk}}`,
      isiTemplateHalaman2: `[ HALAMAN KANAN - KEUANGAN & PENGESAHAN ]

D. ASPEK KEUANGAN & PEMBEBASAN
- Harga Penawaran Awal : Rp {{hargaPenawaran}}
- Harga Kesepakatan    : Rp {{hargaKesepakatan}}
- Status Pembebasan    : {{statusPembebasan}}
- Lembaga Penilai      : {{custom_penilai_appraisal}}

E. CATATAN & REKOMENDASI PETUGAS
Bidang tanah ini telah melalui tahap inventarisasi fisik, verifikasi alas hak pada Kantor Pertanahan setempat, dan musyawarah ganti kerugian. Dokumen dinyatakan LENGKAP & VALID untuk diproses ke tahap pembayaran dan penerbitan sertifikat atas nama perusahaan.

F. PENGESAHAN BERSAMA (KEDUA BELAH PIHAK)

Pihak Yang Berhak,              Tim Pengadaan Lahan,


( {{namaPemilik}} )              ( Petugas Legal Pengadaan )

Mengetahui / Mengesahkan:
Kepala Desa / Lurah {{desa}}

( {{custom_nama_kades}} )
NIP: {{custom_nip_kades}}`,
      footerText: 'Buku Risalah Pengadaan Tanah | Dicetak Tanggal {{tanggalHariIni}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

let nextCustomFieldId = 5;
let nextTemplateId = 4;
let nextLogId = 1;

export const inMemoryCetakLogs: Map<number, DokumenCetakLog> = new Map();

// Helper: Replace Template Placeholders
function compileTemplateString(templateText: string, values: Record<string, string>): string {
  if (!templateText) return '';
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_, key) => {
    return values[key] !== undefined ? values[key] : `{{${key}}}`;
  });
}

// Paper Size Dimensions in Points (72 points = 1 inch)
const paperSizes: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Legal: [612.0, 1008.0],
  F4: [612.0, 936.0],
  Letter: [612.0, 792.0],
};

// Helper: Generate PDF for Generated Document
function generateDocumentPdf(
  template: DokumenTemplate,
  compiledPage1: string,
  compiledPage2: string,
  meta: {
    namaDokumen: string;
    tanggalCetak: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const isLandscape = template.orientasi === 'Landscape';
    const isTwoPageBook = isLandscape && template.layoutMode === 'TwoPageBook';
    const sizeConfig = paperSizes[template.ukuranKertas] || paperSizes.A4;

    const doc = new PDFDocument({
      size: template.ukuranKertas === 'F4' ? [612, 936] : template.ukuranKertas,
      layout: isLandscape ? 'landscape' : 'portrait',
      margin: 36,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    if (isTwoPageBook) {
      // ==========================================
      // TWO-PAGE BOOK SPREAD (LANDSCAPE)
      // ==========================================
      const margin = 36;
      const midX = pageWidth / 2;
      const colWidth = midX - margin - 15;

      // Outer Book Frame / Border
      doc.rect(margin - 8, margin - 8, pageWidth - (margin - 8) * 2, pageHeight - (margin - 8) * 2)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      // Center Book Spine / Gutter lines
      doc.save();
      doc.rect(midX - 10, margin - 8, 20, pageHeight - (margin - 8) * 2)
        .fillColor('#f8fafc')
        .fill();
      doc.moveTo(midX, margin - 8).lineTo(midX, pageHeight - margin + 8).strokeColor('#94a3b8').dash(3, { space: 2 }).stroke();
      doc.restore();

      // Top Book Title Banner
      if (template.headerText) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e40af');
        doc.text(template.headerText.split('\n')[0] || '', margin, margin - 2, {
          width: pageWidth - margin * 2,
          align: 'center',
        });
      }

      const contentTop = margin + 20;
      const contentHeight = pageHeight - margin * 2 - 45;

      // Left Page (Halaman Kiri)
      doc.rect(margin, contentTop - 4, colWidth, 16).fill('#eff6ff');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1d4ed8');
      doc.text('HALAMAN KIRI [ 1 ]', margin + 6, contentTop);

      doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a');
      doc.text(compiledPage1, margin, contentTop + 22, {
        width: colWidth,
        height: contentHeight,
        align: 'left',
        lineGap: 3,
      });

      // Right Page (Halaman Kanan)
      const rightX = midX + 15;
      doc.rect(rightX, contentTop - 4, colWidth, 16).fill('#eff6ff');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1d4ed8');
      doc.text('HALAMAN KANAN [ 2 ]', rightX + 6, contentTop);

      doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a');
      doc.text(compiledPage2 || compiledPage1, rightX, contentTop + 22, {
        width: colWidth,
        height: contentHeight,
        align: 'left',
        lineGap: 3,
      });

      // Bottom Footers
      const footerY = pageHeight - margin - 10;
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
      doc.text(
        template.footerText ? template.footerText.split('\n')[0] : 'Sistem Pengadaan Lahan Terpadu - Gade Support',
        margin,
        footerY,
        { width: colWidth, align: 'left' }
      );
      doc.text(`Dicetak: ${meta.tanggalCetak} | Halaman 1 & 2`, rightX, footerY, {
        width: colWidth,
        align: 'right',
      });
    } else {
      // ==========================================
      // SINGLE PAGE / STANDARD DOCUMENT LAYOUT
      // ==========================================
      const margin = 40;
      let y = margin;

      // Header Block
      if (template.headerText) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a');
        doc.text(template.headerText, margin, y, {
          width: pageWidth - margin * 2,
          align: 'center',
          lineGap: 2,
        });
        y = doc.y + 15;
        doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#1e3a8a').lineWidth(1.5).stroke();
        y += 18;
      }

      // Content Body
      doc.fontSize(9.5).font('Helvetica').fillColor('#1e293b');
      doc.text(compiledPage1, margin, y, {
        width: pageWidth - margin * 2,
        lineGap: 4,
      });

      // Footer
      const footerY = pageHeight - margin - 20;
      if (template.footerText) {
        doc.fontSize(8).font('Helvetica').fillColor('#475569');
        doc.text(template.footerText, margin, footerY, {
          width: pageWidth - margin * 2,
          align: 'center',
        });
      }
    }

    doc.end();
  });
}

export const generateDokumenRoutes = new Elysia({ prefix: '/api/generate-dokumen' })

  // 1. Dapatkan Semua Placeholder Variabel Sistem & Custom
  .get('/available-placeholders', async () => {
    let customList: { kodeField: string; namaField: string; defaultValue?: string | null }[] = [];

    const isDb = await checkDbConnection();
    if (isDb) {
      try {
        const rows = await db.select().from(dokumenCustomField);
        customList = rows.map((r) => ({
          kodeField: r.kodeField,
          namaField: r.namaField,
          defaultValue: r.defaultValue,
        }));
      } catch (err: any) {
        console.error('Error fetching custom fields from DB:', err.message);
      }
    }

    if (customList.length === 0) {
      customList = Array.from(inMemoryCustomFields.values()).map((r) => ({
        kodeField: r.kodeField,
        namaField: r.namaField,
        defaultValue: r.defaultValue,
      }));
    }

    const systemPlaceholders = [
      {
        category: 'Lokasi Pengadaan',
        items: [
          { key: 'kodeLokasi', label: 'Kode Lokasi (cth: LOK-2026-001)' },
          { key: 'namaLokasi', label: 'Nama Lokasi' },
          { key: 'alamat', label: 'Alamat Lokasi' },
          { key: 'desa', label: 'Desa / Kelurahan' },
          { key: 'kecamatan', label: 'Kecamatan' },
          { key: 'kabupaten', label: 'Kabupaten / Kota' },
          { key: 'peruntukan', label: 'Peruntukan Lahan' },
          { key: 'luasTarget', label: 'Luas Target (m²)' },
          { key: 'luasDeal', label: 'Luas Deal (m²)' },
        ],
      },
      {
        category: 'Bidang Tanah',
        items: [
          { key: 'kodeTanah', label: 'Kode Bidang (cth: BDG-2026-001)' },
          { key: 'nomorBidang', label: 'Nomor Bidang Tanah' },
          { key: 'luas', label: 'Luas Bidang (m²)' },
          { key: 'jenisHak', label: 'Jenis Hak (SHM / HGB / Girik / AJB)' },
          { key: 'nomorHak', label: 'Nomor Sertifikat / Hak' },
          { key: 'statusPembebasan', label: 'Status Pembebasan' },
          { key: 'hargaPenawaran', label: 'Harga Penawaran Awal' },
          { key: 'hargaKesepakatan', label: 'Harga Kesepakatan Final' },
        ],
      },
      {
        category: 'Pihak / Pemilik Tanah',
        items: [
          { key: 'namaPemilik', label: 'Nama Lengkap Pemilik / Pihak' },
          { key: 'nikPemilik', label: 'NIK / Nomor Identitas Pemilik' },
          { key: 'nomorTelpPemilik', label: 'No. Telepon / HP' },
          { key: 'tipePihak', label: 'Tipe Pihak (Pemegang Hak / Ahli Waris)' },
        ],
      },
      {
        category: 'Project Lahan',
        items: [
          { key: 'kodeProject', label: 'Kode Project' },
          { key: 'namaProject', label: 'Nama Project' },
          { key: 'lokasiProject', label: 'Lokasi Project' },
        ],
      },
      {
        category: 'Sistem & Tanggal',
        items: [
          { key: 'tanggalHariIni', label: 'Tanggal Hari Ini (Format Indonesia)' },
          { key: 'tahun', label: 'Tahun Berjalan' },
          { key: 'bulan', label: 'Bulan Berjalan' },
          { key: 'nomorSurat', label: 'Nomor Surat / Dokumen Otomatis' },
        ],
      },
      {
        category: 'Custom Fields (Dapat Ditambahkan Manual)',
        items: customList.map((c) => ({
          key: c.kodeField,
          label: `${c.namaField} (${c.defaultValue || '-'})`,
        })),
      },
    ];

    return {
      success: true,
      data: systemPlaceholders,
    };
  })

  // 2. Reference Data untuk Auto-Fill Saat Cetak (Lokasi, Bidang, Pemilik, Project)
  .get('/reference-data', async () => {
    let lokasiList: any[] = [];
    let bidangList: any[] = [];
    let projectList: any[] = [];

    const isDb = await checkDbConnection();
    if (isDb) {
      try {
        const dbLokasi = await db.select().from(lokasi);
        lokasiList = dbLokasi.map((l) => ({
          kodeLokasi: l.kodeLokasi,
          namaLokasi: l.namaLokasi,
          alamat: l.alamat || '',
          desa: l.desa || '',
          kecamatan: l.kecamatan || '',
          kabupaten: l.kabupaten || '',
          peruntukan: l.peruntukan || '',
          luasTarget: l.luasTarget ? String(l.luasTarget) : '0',
          luasDeal: l.luasDeal ? String(l.luasDeal) : '0',
        }));

        const dbBidang = await db
          .select({
            kodeTanah: bidangTanah.kodeTanah,
            kodeLokasi: bidangTanah.kodeLokasi,
            nomorBidang: bidangTanah.nomorBidang,
            luas: bidangTanah.luas,
            jenisHak: bidangTanah.jenisHak,
            nomorHak: bidangTanah.nomorHak,
            statusPembebasan: bidangTanah.statusPembebasan,
            hargaPenawaran: bidangTanah.hargaPenawaran,
            hargaKesepakatan: bidangTanah.hargaKesepakatan,
            namaLokasi: lokasi.namaLokasi,
            alamat: lokasi.alamat,
            desa: lokasi.desa,
            kecamatan: lokasi.kecamatan,
            kabupaten: lokasi.kabupaten,
            peruntukan: lokasi.peruntukan,
          })
          .from(bidangTanah)
          .leftJoin(lokasi, eq(bidangTanah.kodeLokasi, lokasi.kodeLokasi));

        const dbPihak = await db.select().from(pihak);

        bidangList = dbBidang.map((b) => {
          const owner = dbPihak.find((p) => p.kodeTanah === b.kodeTanah);
          return {
            kodeTanah: b.kodeTanah,
            kodeLokasi: b.kodeLokasi,
            namaLokasi: b.namaLokasi || '',
            alamat: b.alamat || '',
            desa: b.desa || '',
            kecamatan: b.kecamatan || '',
            kabupaten: b.kabupaten || '',
            peruntukan: b.peruntukan || '',
            nomorBidang: b.nomorBidang || '',
            luas: b.luas ? String(b.luas) : '0',
            jenisHak: b.jenisHak || '',
            nomorHak: b.nomorHak || '',
            statusPembebasan: b.statusPembebasan,
            hargaPenawaran: b.hargaPenawaran ? String(b.hargaPenawaran) : '0',
            hargaKesepakatan: b.hargaKesepakatan ? String(b.hargaKesepakatan) : '0',
            namaPemilik: owner ? owner.nama : 'Bapak Pemilik Lahan',
            nikPemilik: owner?.nik || '3276000000000000',
            nomorTelpPemilik: owner?.nomorTelp || '081200000000',
            tipePihak: owner?.tipePihak || 'Pemegang Hak',
          };
        });

        const dbProj = await db.select().from(projects);
        projectList = dbProj.map((p) => ({
          kodeProject: p.kodeProject,
          namaProject: p.namaProject,
          lokasiProject: p.lokasi,
        }));
      } catch (err: any) {
        console.error('Error fetching reference data from DB:', err.message);
      }
    }

    if (lokasiList.length === 0) {
      lokasiList = [
        {
          kodeLokasi: 'LOK-2026-001',
          namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
          alamat: 'Jl. Raya Pegadaian No. 45',
          desa: 'Sukamaju',
          kecamatan: 'Cilodong',
          kabupaten: 'Depok',
          peruntukan: 'Komersial & Pergudangan',
          luasTarget: '15000',
          luasDeal: '12000',
        },
      ];
      bidangList = [
        {
          kodeTanah: 'BDG-2026-001',
          kodeLokasi: 'LOK-2026-001',
          namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
          alamat: 'Jl. Raya Pegadaian No. 45',
          desa: 'Sukamaju',
          kecamatan: 'Cilodong',
          kabupaten: 'Depok',
          peruntukan: 'Komersial & Pergudangan',
          nomorBidang: '001/SKM/2026',
          luas: '3000',
          jenisHak: 'SHM',
          nomorHak: 'SHM-4821',
          statusPembebasan: 'Deal',
          hargaPenawaran: '3000000000',
          hargaKesepakatan: '2750000000',
          namaPemilik: 'Budi Santoso',
          nikPemilik: '3276011203850001',
          nomorTelpPemilik: '081234567890',
          tipePihak: 'Pemegang Hak',
        },
      ];
      projectList = [
        {
          kodeProject: 'PRJ-2026-001',
          namaProject: 'Pengembangan Sentra Bisnis & Depo Gade Depok',
          lokasiProject: 'Jl. Margonda Raya & Cilodong',
        },
      ];
    }

    return {
      success: true,
      data: {
        lokasi: lokasiList,
        bidang: bidangList,
        projects: projectList,
      },
    };
  })

  // 3. Sub-menu: Custom Fields CRUD (Tambah Data Baru Sebagai Referensi)
  .get('/fields', async () => {
    const isDb = await checkDbConnection();
    if (isDb) {
      try {
        const rows = await db.select().from(dokumenCustomField).orderBy(desc(dokumenCustomField.createdAt));
        return { success: true, data: rows };
      } catch (err: any) {
        console.error('Error fetching custom fields from DB:', err.message);
      }
    }
    return { success: true, data: Array.from(inMemoryCustomFields.values()) };
  })

  .post(
    '/fields',
    async ({ body, set }) => {
      const { kodeField, namaField, tipeData, defaultValue, keterangan } = body;
      const cleanKode = kodeField.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          const [created] = await db
            .insert(dokumenCustomField)
            .values({
              kodeField: cleanKode,
              namaField: namaField.trim(),
              tipeData: tipeData || 'text',
              defaultValue: defaultValue || null,
              keterangan: keterangan || null,
            })
            .returning();
          return { success: true, message: 'Custom field berhasil ditambahkan', data: created };
        } catch (err: any) {
          console.error('Error creating custom field in DB:', err.message);
          set.status = 400;
          return { success: false, message: 'Gagal menambahkan field: kode field mungkin sudah terdaftar' };
        }
      }

      const newId = nextCustomFieldId++;
      const item: DokumenCustomField = {
        id: newId,
        kodeField: cleanKode,
        namaField: namaField.trim(),
        tipeData: tipeData || 'text',
        defaultValue: defaultValue || null,
        keterangan: keterangan || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryCustomFields.set(newId, item);
      return { success: true, message: 'Custom field berhasil ditambahkan', data: item };
    },
    {
      body: t.Object({
        kodeField: t.String(),
        namaField: t.String(),
        tipeData: t.Optional(t.String()),
        defaultValue: t.Optional(t.String()),
        keterangan: t.Optional(t.String()),
      }),
    }
  )

  .delete(
    '/fields/:id',
    async ({ params: { id }, set }) => {
      const numId = Number(id);
      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          await db.delete(dokumenCustomField).where(eq(dokumenCustomField.id, numId));
          return { success: true, message: 'Custom field berhasil dihapus' };
        } catch (err: any) {
          console.error('Error deleting custom field from DB:', err.message);
        }
      }

      if (!inMemoryCustomFields.has(numId)) {
        set.status = 404;
        return { success: false, message: 'Custom field tidak ditemukan' };
      }
      inMemoryCustomFields.delete(numId);
      return { success: true, message: 'Custom field berhasil dihapus' };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // 4. Sub-menu: Template Dokumen CRUD
  .get('/templates', async () => {
    const isDb = await checkDbConnection();
    if (isDb) {
      try {
        const rows = await db.select().from(dokumenTemplate).orderBy(desc(dokumenTemplate.createdAt));
        return { success: true, data: rows };
      } catch (err: any) {
        console.error('Error fetching templates from DB:', err.message);
      }
    }
    return { success: true, data: Array.from(inMemoryTemplates.values()) };
  })

  .get(
    '/templates/:id',
    async ({ params: { id }, set }) => {
      const numId = Number(id);
      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          const [found] = await db.select().from(dokumenTemplate).where(eq(dokumenTemplate.id, numId)).limit(1);
          if (found) return { success: true, data: found };
        } catch (err: any) {
          console.error('Error fetching template from DB:', err.message);
        }
      }

      const item = inMemoryTemplates.get(numId);
      if (!item) {
        set.status = 404;
        return { success: false, message: 'Template tidak ditemukan' };
      }
      return { success: true, data: item };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  .post(
    '/templates',
    async ({ body, set }) => {
      const {
        kodeTemplate,
        namaTemplate,
        kategori,
        ukuranKertas,
        orientasi,
        layoutMode,
        headerText,
        isiTemplate,
        isiTemplateHalaman2,
        footerText,
      } = body;

      const cleanKode = kodeTemplate.trim();
      const isDb = await checkDbConnection();

      if (isDb) {
        try {
          const [created] = await db
            .insert(dokumenTemplate)
            .values({
              kodeTemplate: cleanKode,
              namaTemplate: namaTemplate.trim(),
              kategori: kategori || 'Umum',
              ukuranKertas: ukuranKertas || 'A4',
              orientasi: orientasi || 'Portrait',
              layoutMode: layoutMode || 'Single',
              headerText: headerText || null,
              isiTemplate: isiTemplate || '',
              isiTemplateHalaman2: isiTemplateHalaman2 || null,
              footerText: footerText || null,
            })
            .returning();
          return { success: true, message: 'Template dokumen berhasil disimpan', data: created };
        } catch (err: any) {
          console.error('Error creating template in DB:', err.message);
          set.status = 400;
          return { success: false, message: 'Gagal membuat template: kode template sudah digunakan' };
        }
      }

      const newId = nextTemplateId++;
      const item: DokumenTemplate = {
        id: newId,
        kodeTemplate: cleanKode,
        namaTemplate: namaTemplate.trim(),
        kategori: kategori || 'Umum',
        ukuranKertas: ukuranKertas || 'A4',
        orientasi: orientasi || 'Portrait',
        layoutMode: layoutMode || 'Single',
        headerText: headerText || null,
        isiTemplate: isiTemplate || '',
        isiTemplateHalaman2: isiTemplateHalaman2 || null,
        footerText: footerText || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryTemplates.set(newId, item);
      return { success: true, message: 'Template dokumen berhasil disimpan', data: item };
    },
    {
      body: t.Object({
        kodeTemplate: t.String(),
        namaTemplate: t.String(),
        kategori: t.Optional(t.String()),
        ukuranKertas: t.Optional(t.String()),
        orientasi: t.Optional(t.String()),
        layoutMode: t.Optional(t.String()),
        headerText: t.Optional(t.String()),
        isiTemplate: t.String(),
        isiTemplateHalaman2: t.Optional(t.String()),
        footerText: t.Optional(t.String()),
      }),
    }
  )

  .put(
    '/templates/:id',
    async ({ params: { id }, body, set }) => {
      const numId = Number(id);
      const isDb = await checkDbConnection();

      if (isDb) {
        try {
          const [updated] = await db
            .update(dokumenTemplate)
            .set({
              ...body,
              updatedAt: new Date(),
            })
            .where(eq(dokumenTemplate.id, numId))
            .returning();
          return { success: true, message: 'Template dokumen berhasil diperbarui', data: updated };
        } catch (err: any) {
          console.error('Error updating template in DB:', err.message);
        }
      }

      const existing = inMemoryTemplates.get(numId);
      if (!existing) {
        set.status = 404;
        return { success: false, message: 'Template tidak ditemukan' };
      }

      const updated: DokumenTemplate = {
        ...existing,
        ...body,
        updatedAt: new Date(),
      };
      inMemoryTemplates.set(numId, updated);
      return { success: true, message: 'Template dokumen berhasil diperbarui', data: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        namaTemplate: t.Optional(t.String()),
        kategori: t.Optional(t.String()),
        ukuranKertas: t.Optional(t.String()),
        orientasi: t.Optional(t.String()),
        layoutMode: t.Optional(t.String()),
        headerText: t.Optional(t.String()),
        isiTemplate: t.Optional(t.String()),
        isiTemplateHalaman2: t.Optional(t.String()),
        footerText: t.Optional(t.String()),
      }),
    }
  )

  .delete(
    '/templates/:id',
    async ({ params: { id }, set }) => {
      const numId = Number(id);
      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          await db.delete(dokumenTemplate).where(eq(dokumenTemplate.id, numId));
          return { success: true, message: 'Template berhasil dihapus' };
        } catch (err: any) {
          console.error('Error deleting template from DB:', err.message);
        }
      }

      if (!inMemoryTemplates.has(numId)) {
        set.status = 404;
        return { success: false, message: 'Template tidak ditemukan' };
      }
      inMemoryTemplates.delete(numId);
      return { success: true, message: 'Template berhasil dihapus' };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // 5. Live Compile & Preview Sebelum Cetak
  .post(
    '/preview',
    async ({ body, set }) => {
      const { idTemplate, fieldValues } = body;
      let template: DokumenTemplate | undefined;

      const isDb = await checkDbConnection();
      if (isDb) {
        try {
          const [found] = await db.select().from(dokumenTemplate).where(eq(dokumenTemplate.id, idTemplate)).limit(1);
          template = found;
        } catch (err: any) {
          console.error('Error fetching template for preview from DB:', err.message);
        }
      }

      if (!template) {
        template = inMemoryTemplates.get(idTemplate);
      }

      if (!template) {
        set.status = 404;
        return { success: false, message: 'Template tidak ditemukan' };
      }

      const values = {
        tanggalHariIni: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        tahun: String(new Date().getFullYear()),
        bulan: String(new Date().getMonth() + 1).padStart(2, '0'),
        nomorSurat: `DOC/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        ...(fieldValues || {}),
      };

      const compiledHeader = compileTemplateString(template.headerText || '', values);
      const compiledPage1 = compileTemplateString(template.isiTemplate, values);
      const compiledPage2 = compileTemplateString(template.isiTemplateHalaman2 || '', values);
      const compiledFooter = compileTemplateString(template.footerText || '', values);

      return {
        success: true,
        data: {
          templateInfo: {
            id: template.id,
            kodeTemplate: template.kodeTemplate,
            namaTemplate: template.namaTemplate,
            ukuranKertas: template.ukuranKertas,
            orientasi: template.orientasi,
            layoutMode: template.layoutMode,
          },
          compiledHeader,
          compiledPage1,
          compiledPage2,
          compiledFooter,
        },
      };
    },
    {
      body: t.Object({
        idTemplate: t.Number(),
        fieldValues: t.Record(t.String(), t.Any()),
      }),
    }
  )

  // 6. Sub-menu: Cetak Dokumen PDF (Mendukung Landscape 2-Halaman Buku & Portrait)
  .post(
    '/cetak',
    async ({ body, set }) => {
      const { idTemplate, namaDokumen, referensiTipe, referensiId, fieldValues } = body;

      let template: DokumenTemplate | undefined;
      const isDb = await checkDbConnection();

      if (isDb) {
        try {
          const [found] = await db.select().from(dokumenTemplate).where(eq(dokumenTemplate.id, idTemplate)).limit(1);
          template = found;
        } catch (err: any) {
          console.error('Error fetching template for print from DB:', err.message);
        }
      }

      if (!template) {
        template = inMemoryTemplates.get(idTemplate);
      }

      if (!template) {
        set.status = 404;
        return { success: false, message: 'Template tidak ditemukan' };
      }

      const values: Record<string, string> = {
        tanggalHariIni: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        tahun: String(new Date().getFullYear()),
        bulan: String(new Date().getMonth() + 1).padStart(2, '0'),
        nomorSurat: `DOC/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        ...(fieldValues || {}),
      };

      const compiledPage1 = compileTemplateString(template.isiTemplate, values);
      const compiledPage2 = compileTemplateString(template.isiTemplateHalaman2 || '', values);

      const docTitle = namaDokumen || template.namaTemplate;

      try {
        const pdfBuf = await generateDocumentPdf(template, compiledPage1, compiledPage2, {
          namaDokumen: docTitle,
          tanggalCetak: values.tanggalHariIni,
        });

        // Log printing action
        if (isDb) {
          try {
            await db.insert(dokumenCetakLog).values({
              idTemplate: template.id,
              namaDokumen: docTitle,
              referensiTipe: referensiTipe || 'Umum',
              referensiId: referensiId || null,
              fieldValues,
            });
          } catch (err) {
            // non-fatal
          }
        } else {
          const newLogId = nextLogId++;
          inMemoryCetakLogs.set(newLogId, {
            id: newLogId,
            idTemplate: template.id,
            namaDokumen: docTitle,
            referensiTipe: referensiTipe || 'Umum',
            referensiId: referensiId || null,
            fieldValues,
            printedAt: new Date(),
          });
        }

        const safeFilename = docTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
        set.headers['Content-Type'] = 'application/pdf';
        set.headers['Content-Disposition'] = `inline; filename="${safeFilename}.pdf"`;
        set.headers['Cache-Control'] = 'no-cache';

        return new Response(pdfBuf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${safeFilename}.pdf"`,
          },
        });
      } catch (pdfErr: any) {
        console.error('Error generating PDF document:', pdfErr);
        set.status = 500;
        return { success: false, message: 'Gagal membuat file PDF dokumen', error: pdfErr.message };
      }
    },
    {
      body: t.Object({
        idTemplate: t.Number(),
        namaDokumen: t.Optional(t.String()),
        referensiTipe: t.Optional(t.String()),
        referensiId: t.Optional(t.String()),
        fieldValues: t.Record(t.String(), t.Any()),
      }),
    }
  );
