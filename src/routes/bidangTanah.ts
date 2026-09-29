import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  bidangTanah,
  lokasi,
  statusPembebasanValues,
  type BidangTanah,
  type NewBidangTanah,
  type LegalitasCheckItem,
} from '../db/schema';

export const defaultChecklistLegalitas: LegalitasCheckItem[] = [
  { id: 'dok-1', namaDokumen: 'KTP Pemilik / Ahli Waris', status: 'Ada', catatan: 'Terverifikasi' },
  { id: 'dok-2', namaDokumen: 'Kartu Keluarga (KK)', status: 'Ada', catatan: 'Sesuai KTP' },
  { id: 'dok-3', namaDokumen: 'Sertifikat / Girik Asli', status: 'Dalam Proses', catatan: 'Pengecekan BPN' },
  { id: 'dok-4', namaDokumen: 'SPPT & Bukti Lunas PBB Terakhir', status: 'Ada', catatan: 'Lunas tahun berjalan' },
  { id: 'dok-5', namaDokumen: 'Surat Keterangan Riwayat Tanah', status: 'Belum Ada', catatan: 'Dari Kelurahan/Desa' },
  { id: 'dok-6', namaDokumen: 'Surat Keterangan Bebas Sengketa', status: 'Belum Ada', catatan: 'Dari Kelurahan/Desa' },
  { id: 'dok-7', namaDokumen: 'Surat Kuasa / Waris (Jika Ada)', status: 'Tidak Diperlukan', catatan: '-' },
];

// In-memory fallback store
const inMemoryBidangStore: Map<string, BidangTanah> = new Map([
  [
    'BDT-2026-001',
    {
      kodeTanah: 'BDT-2026-001',
      kodeLokasi: 'LOK-2026-001',
      nomorBidang: '001/SKM/2026',
      luas: '3000.00',
      jenisHak: 'SHM',
      nomorHak: 'SHM No. 10452/Sukamaju',
      statusPembebasan: 'Deal',
      hargaPenawaran: '4500000000.00',
      hargaKesepakatan: '4200000000.00',
      tanggalKesepakatan: new Date('2026-02-01'),
      catatan: 'Pemilik Bapak H. Mansur, telah sepakat harga dan siap legal check',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.8290, -6.4155],
            [106.8310, -6.4155],
            [106.8310, -6.4170],
            [106.8290, -6.4170],
            [106.8290, -6.4155],
          ],
        ],
      },
      checklistLegalitas: defaultChecklistLegalitas,
      createdAt: new Date('2026-01-20T10:00:00Z'),
      updatedAt: new Date('2026-02-05T15:30:00Z'),
    },
  ],
  [
    'BDT-2026-002',
    {
      kodeTanah: 'BDT-2026-002',
      kodeLokasi: 'LOK-2026-001',
      nomorBidang: '002/SKM/2026',
      luas: '2500.00',
      jenisHak: 'Girik',
      nomorHak: 'C No. 892 Persil 14',
      statusPembebasan: 'Negosiasi',
      hargaPenawaran: '3750000000.00',
      hargaKesepakatan: null,
      tanggalKesepakatan: null,
      catatan: 'Masih dalam proses negosiasi harga dengan ahli waris',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.8312, -6.4155],
            [106.8322, -6.4155],
            [106.8322, -6.4175],
            [106.8312, -6.4175],
            [106.8312, -6.4155],
          ],
        ],
      },
      checklistLegalitas: defaultChecklistLegalitas.map((c) => ({ ...c, status: 'Dalam Proses' })),
      createdAt: new Date('2026-01-22T11:00:00Z'),
      updatedAt: new Date('2026-02-02T13:00:00Z'),
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
      setTimeout(() => reject(new Error('DB Timeout')), 150)
    );
    await Promise.race([ping, timeout]);
    dbAvailable = true;
    lastDbCheck = now;
    return true;
  } catch {
    dbAvailable = false;
    lastDbCheck = now;
    return false;
  }
}


export const bidangTanahRoutes = new Elysia({ prefix: '/api/bidang-tanah' })
  // 1. GET /api/bidang-tanah - List with filter by kodeLokasi, status, search
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const statusFilter = query.status?.trim();
      const lokasiFilter = query.kodeLokasi?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db.select().from(bidangTanah).orderBy(desc(bidangTanah.createdAt));

          if (lokasiFilter && lokasiFilter !== 'Semua') {
            rows = rows.filter((r) => r.kodeLokasi === lokasiFilter);
          }

          if (statusFilter && statusFilter !== 'Semua') {
            rows = rows.filter((r) => r.statusPembebasan === statusFilter);
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                r.kodeTanah.toLowerCase().includes(search) ||
                (r.nomorBidang && r.nomorBidang.toLowerCase().includes(search)) ||
                (r.nomorHak && r.nomorHak.toLowerCase().includes(search)) ||
                (r.catatan && r.catatan.toLowerCase().includes(search))
            );
          }

          return {
            success: true,
            source: 'database',
            count: rows.length,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[BidangTanah] DB list error, using memory:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryBidangStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (lokasiFilter && lokasiFilter !== 'Semua') {
        list = list.filter((r) => r.kodeLokasi === lokasiFilter);
      }

      if (statusFilter && statusFilter !== 'Semua') {
        list = list.filter((r) => r.statusPembebasan === statusFilter);
      }

      if (search) {
        list = list.filter(
          (r) =>
            r.kodeTanah.toLowerCase().includes(search) ||
            (r.nomorBidang && r.nomorBidang.toLowerCase().includes(search)) ||
            (r.nomorHak && r.nomorHak.toLowerCase().includes(search)) ||
            (r.catatan && r.catatan.toLowerCase().includes(search))
        );
      }

      return {
        success: true,
        source: 'memory',
        count: list.length,
        data: list,
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        status: t.Optional(t.String()),
        kodeLokasi: t.Optional(t.String()),
      }),
    }
  )

  // 2. GET /api/bidang-tanah/rekap/:kodeLokasi - Ringkasan Luas & Status Bidang untuk Lokasi Induk
  .get(
    '/rekap/:kodeLokasi',
    async ({ params: { kodeLokasi } }) => {
      const isDbUp = await checkDbConnection();
      let parentLokasi: any = null;
      let bidangRows: BidangTanah[] = [];

      if (isDbUp) {
        try {
          const [foundLok] = await db
            .select()
            .from(lokasi)
            .where(eq(lokasi.kodeLokasi, kodeLokasi))
            .limit(1);
          parentLokasi = foundLok;

          bidangRows = await db
            .select()
            .from(bidangTanah)
            .where(eq(bidangTanah.kodeLokasi, kodeLokasi));
        } catch (err: any) {
          console.warn('[BidangTanah] DB rekap error:', err.message);
        }
      }

      if (!parentLokasi) {
        bidangRows = Array.from(inMemoryBidangStore.values()).filter(
          (b) => b.kodeLokasi === kodeLokasi
        );
      }

      const totalLuasBidang = bidangRows.reduce(
        (acc, b) => acc + (parseFloat(String(b.luas)) || 0),
        0
      );
      const luasInduk = parentLokasi?.luasInduk ? parseFloat(String(parentLokasi.luasInduk)) : 0;
      const sisaLuas = Math.max(0, luasInduk - totalLuasBidang);
      const bidangTerpetakan = bidangRows.filter((b) => b.geojson != null);

      const statusCounts: Record<string, number> = {};
      for (const b of bidangRows) {
        statusCounts[b.statusPembebasan] = (statusCounts[b.statusPembebasan] || 0) + 1;
      }

      const totalNilaiKesepakatan = bidangRows.reduce(
        (acc, b) => acc + (parseFloat(String(b.hargaKesepakatan)) || 0),
        0
      );

      return {
        success: true,
        data: {
          kodeLokasi,
          namaLokasi: parentLokasi?.namaLokasi || kodeLokasi,
          luasInduk,
          totalLuasBidang,
          sisaLuas,
          jumlahBidang: bidangRows.length,
          bidangTerpetakanCount: bidangTerpetakan.length,
          statusCounts,
          totalNilaiKesepakatan,
        },
      };
    },
    {
      params: t.Object({
        kodeLokasi: t.String(),
      }),
    }
  )

  // 3. GET /api/bidang-tanah/:kodeTanah - Detail bidang tanah
  .get(
    '/:kodeTanah',
    async ({ params: { kodeTanah }, set }) => {
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [row] = await db
            .select()
            .from(bidangTanah)
            .where(eq(bidangTanah.kodeTanah, kodeTanah))
            .limit(1);

          if (row) {
            return { success: true, data: row };
          }
        } catch (err: any) {
          console.warn('[BidangTanah] DB get single error:', err.message);
        }
      }

      const found = inMemoryBidangStore.get(kodeTanah);
      if (!found) {
        set.status = 404;
        return {
          success: false,
          message: `Bidang tanah dengan Kode Tanah '${kodeTanah}' tidak ditemukan.`,
        };
      }

      return { success: true, data: found };
    },
    {
      params: t.Object({
        kodeTanah: t.String(),
      }),
    }
  )

  // 4. POST /api/bidang-tanah - Create new Bidang Tanah (Step 1)
  .post(
    '/',
    async ({ body, set }) => {
      const kode = body.kodeTanah.trim();
      const lokId = body.kodeLokasi.trim();

      if (!kode) {
        set.status = 400;
        return { success: false, message: 'Kode Tanah wajib diisi.' };
      }
      if (!lokId) {
        set.status = 400;
        return { success: false, message: 'Lokasi Induk wajib dipilih.' };
      }

      const isDbUp = await checkDbConnection();

      // Check unique
      if (isDbUp) {
        try {
          const [existing] = await db
            .select()
            .from(bidangTanah)
            .where(eq(bidangTanah.kodeTanah, kode))
            .limit(1);

          if (existing) {
            set.status = 409;
            return {
              success: false,
              message: `Kode Tanah '${kode}' sudah terdaftar. Kode Tanah harus unik.`,
            };
          }
        } catch (err: any) {
          console.warn('[BidangTanah] Check unique DB error:', err.message);
        }
      } else if (inMemoryBidangStore.has(kode)) {
        set.status = 409;
        return {
          success: false,
          message: `Kode Tanah '${kode}' sudah terdaftar. Kode Tanah harus unik.`,
        };
      }

      const now = new Date();
      const newRecord: BidangTanah = {
        kodeTanah: kode,
        kodeLokasi: lokId,
        nomorBidang: body.nomorBidang?.trim() ?? null,
        luas: String(body.luas),
        jenisHak: body.jenisHak?.trim() ?? null,
        nomorHak: body.nomorHak?.trim() ?? null,
        statusPembebasan: body.statusPembebasan ?? 'Teridentifikasi',
        hargaPenawaran: body.hargaPenawaran ? String(body.hargaPenawaran) : null,
        hargaKesepakatan: body.hargaKesepakatan ? String(body.hargaKesepakatan) : null,
        tanggalKesepakatan: body.tanggalKesepakatan ? new Date(body.tanggalKesepakatan) : null,
        catatan: body.catatan ?? null,
        geojson: null,
        checklistLegalitas: defaultChecklistLegalitas,
        createdAt: now,
        updatedAt: now,
      };

      if (isDbUp) {
        try {
          const [inserted] = await db.insert(bidangTanah).values(newRecord).returning();
          inMemoryBidangStore.set(kode, inserted);
          set.status = 201;
          return {
            success: true,
            message: 'Data bidang tanah berhasil disimpan.',
            data: inserted,
          };
        } catch (dbErr: any) {
          console.warn('[BidangTanah] Insert DB error:', dbErr.message);
        }
      }

      inMemoryBidangStore.set(kode, newRecord);
      set.status = 201;
      return {
        success: true,
        message: 'Data bidang tanah berhasil disimpan.',
        data: newRecord,
      };
    },
    {
      body: t.Object({
        kodeTanah: t.String({ minLength: 1 }),
        kodeLokasi: t.String({ minLength: 1 }),
        nomorBidang: t.Optional(t.String()),
        luas: t.Union([t.Number({ minimum: 0.01 }), t.String()]),
        jenisHak: t.Optional(t.String()),
        nomorHak: t.Optional(t.String()),
        statusPembebasan: t.Optional(
          t.Union([
            t.Literal('Teridentifikasi'),
            t.Literal('Deal'),
            t.Literal('Legal Check'),
            t.Literal('Negosiasi'),
            t.Literal('Transaksi'),
            t.Literal('Siap Transaksi'),
            t.Literal('Selesai'),
            t.Literal('Ditunda'),
            t.Literal('Ditolak'),
          ])
        ),
        hargaPenawaran: t.Optional(t.Union([t.Number(), t.String()])),
        hargaKesepakatan: t.Optional(t.Union([t.Number(), t.String()])),
        tanggalKesepakatan: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  // 5. PUT /api/bidang-tanah/:kodeTanah - Update Step 1 Form
  .put(
    '/:kodeTanah',
    async ({ params: { kodeTanah }, body, set }) => {
      const now = new Date();
      const isDbUp = await checkDbConnection();

      const updateData: Partial<NewBidangTanah> = {
        ...(body.kodeLokasi !== undefined && { kodeLokasi: body.kodeLokasi.trim() }),
        ...(body.nomorBidang !== undefined && { nomorBidang: body.nomorBidang.trim() }),
        ...(body.luas !== undefined && { luas: String(body.luas) }),
        ...(body.jenisHak !== undefined && { jenisHak: body.jenisHak }),
        ...(body.nomorHak !== undefined && { nomorHak: body.nomorHak }),
        ...(body.statusPembebasan !== undefined && { statusPembebasan: body.statusPembebasan }),
        ...(body.hargaPenawaran !== undefined && {
          hargaPenawaran: body.hargaPenawaran ? String(body.hargaPenawaran) : null,
        }),
        ...(body.hargaKesepakatan !== undefined && {
          hargaKesepakatan: body.hargaKesepakatan ? String(body.hargaKesepakatan) : null,
        }),
        ...(body.tanggalKesepakatan !== undefined && {
          tanggalKesepakatan: body.tanggalKesepakatan ? new Date(body.tanggalKesepakatan) : null,
        }),
        ...(body.catatan !== undefined && { catatan: body.catatan }),
        updatedAt: now,
      };

      if (isDbUp) {
        try {
          const [updated] = await db
            .update(bidangTanah)
            .set(updateData)
            .where(eq(bidangTanah.kodeTanah, kodeTanah))
            .returning();

          if (updated) {
            inMemoryBidangStore.set(kodeTanah, updated);
            return {
              success: true,
              message: 'Data bidang tanah berhasil diperbarui.',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[BidangTanah] Update DB error:', dbErr.message);
        }
      }

      const existing = inMemoryBidangStore.get(kodeTanah);
      if (!existing) {
        set.status = 404;
        return { success: false, message: `Bidang tanah '${kodeTanah}' tidak ditemukan.` };
      }

      const updated = {
        ...existing,
        ...updateData,
        updatedAt: now,
      } as BidangTanah;

      inMemoryBidangStore.set(kodeTanah, updated);
      return {
        success: true,
        message: 'Data bidang tanah berhasil diperbarui.',
        data: updated,
      };
    },
    {
      params: t.Object({
        kodeTanah: t.String(),
      }),
      body: t.Object({
        kodeLokasi: t.Optional(t.String()),
        nomorBidang: t.Optional(t.String()),
        luas: t.Optional(t.Union([t.Number(), t.String()])),
        jenisHak: t.Optional(t.String()),
        nomorHak: t.Optional(t.String()),
        statusPembebasan: t.Optional(
          t.Union([
            t.Literal('Teridentifikasi'),
            t.Literal('Deal'),
            t.Literal('Legal Check'),
            t.Literal('Negosiasi'),
            t.Literal('Transaksi'),
            t.Literal('Siap Transaksi'),
            t.Literal('Selesai'),
            t.Literal('Ditunda'),
            t.Literal('Ditolak'),
          ])
        ),
        hargaPenawaran: t.Optional(t.Union([t.Number(), t.String()])),
        hargaKesepakatan: t.Optional(t.Union([t.Number(), t.String()])),
        tanggalKesepakatan: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  // 6. PATCH /api/bidang-tanah/:kodeTanah/polygon - Update Step 2: Polygon Map & Checklist Legalitas
  .patch(
    '/:kodeTanah/polygon',
    async ({ params: { kodeTanah }, body, set }) => {
      const now = new Date();
      const isDbUp = await checkDbConnection();

      const updateData: Partial<NewBidangTanah> = {
        ...(body.geojson !== undefined && { geojson: body.geojson }),
        ...(body.luas !== undefined && { luas: String(body.luas) }),
        ...(body.checklistLegalitas !== undefined && {
          checklistLegalitas: body.checklistLegalitas,
        }),
        updatedAt: now,
      };

      if (isDbUp) {
        try {
          const [updated] = await db
            .update(bidangTanah)
            .set(updateData)
            .where(eq(bidangTanah.kodeTanah, kodeTanah))
            .returning();

          if (updated) {
            inMemoryBidangStore.set(kodeTanah, updated);
            return {
              success: true,
              message: 'Polygon bidang dan checklist legalitas berhasil disimpan.',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[BidangTanah] Update polygon DB error:', dbErr.message);
        }
      }

      const existing = inMemoryBidangStore.get(kodeTanah);
      if (!existing) {
        set.status = 404;
        return { success: false, message: `Bidang tanah '${kodeTanah}' tidak ditemukan.` };
      }

      const updated = {
        ...existing,
        ...updateData,
        updatedAt: now,
      } as BidangTanah;

      inMemoryBidangStore.set(kodeTanah, updated);
      return {
        success: true,
        message: 'Polygon bidang dan checklist legalitas berhasil disimpan.',
        data: updated,
      };
    },
    {
      params: t.Object({
        kodeTanah: t.String(),
      }),
      body: t.Object({
        geojson: t.Optional(t.Any()),
        luas: t.Optional(t.Union([t.Number(), t.String()])),
        checklistLegalitas: t.Optional(t.Array(t.Any())),
      }),
    }
  )

  // 7. DELETE /api/bidang-tanah/:kodeTanah - Delete bidang tanah
  .delete(
    '/:kodeTanah',
    async ({ params: { kodeTanah }, set }) => {
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          await db.delete(bidangTanah).where(eq(bidangTanah.kodeTanah, kodeTanah));
        } catch (err: any) {
          console.warn('[BidangTanah] Delete DB error:', err.message);
        }
      }

      const existed = inMemoryBidangStore.delete(kodeTanah);
      if (!existed && !isDbUp) {
        set.status = 404;
        return { success: false, message: `Bidang tanah '${kodeTanah}' tidak ditemukan.` };
      }

      return {
        success: true,
        message: `Bidang tanah '${kodeTanah}' berhasil dihapus.`,
      };
    },
    {
      params: t.Object({
        kodeTanah: t.String(),
      }),
    }
  );
