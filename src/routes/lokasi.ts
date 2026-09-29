import { Elysia, t } from 'elysia';
import { eq, ilike, or, desc } from 'drizzle-orm';
import { db } from '../db';
import { lokasi, statusLokasiValues, type Lokasi, type NewLokasi, type BidangItem } from '../db/schema';

// In-memory fallback repository when live PostgreSQL instance is not yet running
const inMemoryStore: Map<string, Lokasi> = new Map([
  [
    'LOK-2026-001',
    {
      kodeLokasi: 'LOK-2026-001',
      namaLokasi: 'Kawasan Pengembangan Gade Sentosa',
      alamat: 'Jl. Raya Pegadaian No. 45',
      desa: 'Sukamaju',
      kecamatan: 'Cilodong',
      kabupaten: 'Depok',
      peruntukan: 'Komersial & Pergudangan',
      kondisiLahan: 'Sebagian tanah darat, siap bangun, kontur relatif datar',
      kondisiPasar: 'Permintaan tinggi untuk logistik dan retail',
      luasTarget: '15000.00',
      luasTeridentifikasi: '14500.00',
      luasDeal: '12000.00',
      status: 'Proses Pembahasan',
      catatan: 'Prioritas pembebasan lahan tahap 1',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.8285, -6.4150],
            [106.8325, -6.4150],
            [106.8325, -6.4185],
            [106.8285, -6.4185],
            [106.8285, -6.4150],
          ],
        ],
      },
      luasInduk: '15200.00',
      totalLuasBidang: '5500.00',
      sisaLuas: '9700.00',
      bidangTerpetakan: [
        {
          id: 'bidang-1',
          kodeBidang: 'BDG-001',
          nomorBidang: '001/SKM/2026',
          luas: 3000,
          keterangan: 'Bidang milik Bapak H. Mansur (SHM)',
        },
        {
          id: 'bidang-2',
          kodeBidang: 'BDG-002',
          nomorBidang: '002/SKM/2026',
          luas: 2500,
          keterangan: 'Bidang tanah darat girik',
        },
      ],
      createdAt: new Date('2026-01-15T08:30:00Z'),
      updatedAt: new Date('2026-02-10T14:20:00Z'),
    },
  ],
]);

async function checkDbConnection(): Promise<boolean> {
  try {
    // Quick test query to see if Postgres is up
    const { client } = await import('../db');
    await client.unsafe('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export const lokasiRoutes = new Elysia({ prefix: '/api/lokasi' })
  // 1. GET /api/lokasi - List all lokasi with optional filter and search
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const statusFilter = query.status?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db.select().from(lokasi).orderBy(desc(lokasi.createdAt));

          if (search) {
            rows = rows.filter(
              (r) =>
                r.kodeLokasi.toLowerCase().includes(search) ||
                r.namaLokasi.toLowerCase().includes(search) ||
                (r.alamat && r.alamat.toLowerCase().includes(search)) ||
                (r.kabupaten && r.kabupaten.toLowerCase().includes(search))
            );
          }

          if (statusFilter && statusFilter !== 'Semua') {
            rows = rows.filter((r) => r.status === statusFilter);
          }

          return {
            success: true,
            source: 'database',
            count: rows.length,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[Lokasi] DB query error, falling back to memory store:', dbErr.message);
        }
      }

      // Memory store fallback
      let list = Array.from(inMemoryStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (search) {
        list = list.filter(
          (r) =>
            r.kodeLokasi.toLowerCase().includes(search) ||
            r.namaLokasi.toLowerCase().includes(search) ||
            (r.alamat && r.alamat.toLowerCase().includes(search)) ||
            (r.kabupaten && r.kabupaten.toLowerCase().includes(search))
        );
      }

      if (statusFilter && statusFilter !== 'Semua') {
        list = list.filter((r) => r.status === statusFilter);
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
      }),
    }
  )

  // 2. GET /api/lokasi/:kodeLokasi - Get single lokasi by kode_lokasi
  .get(
    '/:kodeLokasi',
    async ({ params: { kodeLokasi }, set }) => {
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [row] = await db
            .select()
            .from(lokasi)
            .where(eq(lokasi.kodeLokasi, kodeLokasi))
            .limit(1);

          if (row) {
            return { success: true, data: row };
          }
        } catch (err: any) {
          console.warn('[Lokasi] DB get single error:', err.message);
        }
      }

      const found = inMemoryStore.get(kodeLokasi);
      if (!found) {
        set.status = 404;
        return {
          success: false,
          message: `Lokasi dengan Kode Lokasi '${kodeLokasi}' tidak ditemukan.`,
        };
      }

      return { success: true, data: found };
    },
    {
      params: t.Object({
        kodeLokasi: t.String(),
      }),
    }
  )

  // 3. POST /api/lokasi - Create new lokasi (Step 1)
  .post(
    '/',
    async ({ body, set }) => {
      const kode = body.kodeLokasi.trim();
      if (!kode) {
        set.status = 400;
        return { success: false, message: 'Kode Lokasi wajib diisi.' };
      }

      // Check uniqueness
      const isDbUp = await checkDbConnection();
      if (isDbUp) {
        try {
          const [existing] = await db
            .select()
            .from(lokasi)
            .where(eq(lokasi.kodeLokasi, kode))
            .limit(1);

          if (existing) {
            set.status = 409;
            return {
              success: false,
              message: `Kode Lokasi '${kode}' sudah terdaftar. Kode Lokasi harus unik sebagai kunci integrasi.`,
            };
          }
        } catch (err: any) {
          console.warn('[Lokasi] DB uniqueness check error:', err.message);
        }
      } else if (inMemoryStore.has(kode)) {
        set.status = 409;
        return {
          success: false,
          message: `Kode Lokasi '${kode}' sudah terdaftar. Kode Lokasi harus unik sebagai kunci integrasi.`,
        };
      }

      const now = new Date();
      const newRecord: Lokasi = {
        kodeLokasi: kode,
        namaLokasi: body.namaLokasi.trim(),
        alamat: body.alamat ?? null,
        desa: body.desa ?? null,
        kecamatan: body.kecamatan ?? null,
        kabupaten: body.kabupaten ?? null,
        peruntukan: body.peruntukan ?? null,
        kondisiLahan: body.kondisiLahan ?? null,
        kondisiPasar: body.kondisiPasar ?? null,
        luasTarget: body.luasTarget ? String(body.luasTarget) : null,
        luasTeridentifikasi: body.luasTeridentifikasi ? String(body.luasTeridentifikasi) : null,
        luasDeal: body.luasDeal ? String(body.luasDeal) : null,
        status: body.status ?? 'Survey',
        catatan: body.catatan ?? null,
        geojson: null,
        luasInduk: null,
        totalLuasBidang: '0',
        sisaLuas: null,
        bidangTerpetakan: [],
        createdAt: now,
        updatedAt: now,
      };

      if (isDbUp) {
        try {
          const [inserted] = await db.insert(lokasi).values(newRecord).returning();
          inMemoryStore.set(kode, inserted);
          set.status = 201;
          return {
            success: true,
            message: 'Data lokasi berhasil disimpan.',
            data: inserted,
          };
        } catch (dbErr: any) {
          console.warn('[Lokasi] Insert failed on DB, saving in memory:', dbErr.message);
        }
      }

      inMemoryStore.set(kode, newRecord);
      set.status = 201;
      return {
        success: true,
        message: 'Data lokasi berhasil disimpan.',
        data: newRecord,
      };
    },
    {
      body: t.Object({
        kodeLokasi: t.String({ minLength: 1 }),
        namaLokasi: t.String({ minLength: 1 }),
        alamat: t.Optional(t.String()),
        desa: t.Optional(t.String()),
        kecamatan: t.Optional(t.String()),
        kabupaten: t.Optional(t.String()),
        peruntukan: t.Optional(t.String()),
        kondisiLahan: t.Optional(t.String()),
        kondisiPasar: t.Optional(t.String()),
        luasTarget: t.Optional(t.Union([t.Number(), t.String()])),
        luasTeridentifikasi: t.Optional(t.Union([t.Number(), t.String()])),
        luasDeal: t.Optional(t.Union([t.Number(), t.String()])),
        status: t.Optional(
          t.Union([
            t.Literal('Survey'),
            t.Literal('Pembahasan'),
            t.Literal('Proses Pembahasan'),
            t.Literal('Selesai'),
            t.Literal('Ditolak'),
            t.Literal('Ditunda'),
          ])
        ),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  // 4. PUT /api/lokasi/:kodeLokasi - Update lokasi info (Step 1)
  .put(
    '/:kodeLokasi',
    async ({ params: { kodeLokasi }, body, set }) => {
      const now = new Date();
      const isDbUp = await checkDbConnection();

      const updateData: Partial<NewLokasi> = {
        ...(body.namaLokasi !== undefined && { namaLokasi: body.namaLokasi.trim() }),
        ...(body.alamat !== undefined && { alamat: body.alamat }),
        ...(body.desa !== undefined && { desa: body.desa }),
        ...(body.kecamatan !== undefined && { kecamatan: body.kecamatan }),
        ...(body.kabupaten !== undefined && { kabupaten: body.kabupaten }),
        ...(body.peruntukan !== undefined && { peruntukan: body.peruntukan }),
        ...(body.kondisiLahan !== undefined && { kondisiLahan: body.kondisiLahan }),
        ...(body.kondisiPasar !== undefined && { kondisiPasar: body.kondisiPasar }),
        ...(body.luasTarget !== undefined && {
          luasTarget: body.luasTarget ? String(body.luasTarget) : null,
        }),
        ...(body.luasTeridentifikasi !== undefined && {
          luasTeridentifikasi: body.luasTeridentifikasi ? String(body.luasTeridentifikasi) : null,
        }),
        ...(body.luasDeal !== undefined && {
          luasDeal: body.luasDeal ? String(body.luasDeal) : null,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.catatan !== undefined && { catatan: body.catatan }),
        updatedAt: now,
      };

      if (isDbUp) {
        try {
          const [updated] = await db
            .update(lokasi)
            .set(updateData)
            .where(eq(lokasi.kodeLokasi, kodeLokasi))
            .returning();

          if (updated) {
            inMemoryStore.set(kodeLokasi, updated);
            return {
              success: true,
              message: 'Data informasi lokasi berhasil diperbarui.',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Lokasi] Update DB error:', dbErr.message);
        }
      }

      const existing = inMemoryStore.get(kodeLokasi);
      if (!existing) {
        set.status = 404;
        return { success: false, message: `Lokasi '${kodeLokasi}' tidak ditemukan.` };
      }

      const updated = {
        ...existing,
        ...updateData,
        updatedAt: now,
      } as Lokasi;

      inMemoryStore.set(kodeLokasi, updated);
      return {
        success: true,
        message: 'Data informasi lokasi berhasil diperbarui.',
        data: updated,
      };
    },
    {
      params: t.Object({
        kodeLokasi: t.String(),
      }),
      body: t.Object({
        namaLokasi: t.Optional(t.String()),
        alamat: t.Optional(t.String()),
        desa: t.Optional(t.String()),
        kecamatan: t.Optional(t.String()),
        kabupaten: t.Optional(t.String()),
        peruntukan: t.Optional(t.String()),
        kondisiLahan: t.Optional(t.String()),
        kondisiPasar: t.Optional(t.String()),
        luasTarget: t.Optional(t.Union([t.Number(), t.String()])),
        luasTeridentifikasi: t.Optional(t.Union([t.Number(), t.String()])),
        luasDeal: t.Optional(t.Union([t.Number(), t.String()])),
        status: t.Optional(
          t.Union([
            t.Literal('Survey'),
            t.Literal('Pembahasan'),
            t.Literal('Proses Pembahasan'),
            t.Literal('Selesai'),
            t.Literal('Ditolak'),
            t.Literal('Ditunda'),
          ])
        ),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  // 5. PATCH /api/lokasi/:kodeLokasi/batas - Update Step 2: Batas Lokasi (Peta)
  .patch(
    '/:kodeLokasi/batas',
    async ({ params: { kodeLokasi }, body, set }) => {
      const now = new Date();
      const isDbUp = await checkDbConnection();

      // Calculate or validate sisa luas: luasInduk - totalLuasBidang
      const luasIndukNum = body.luasInduk != null ? parseFloat(String(body.luasInduk)) : 0;
      const totalLuasBidangNum =
        body.totalLuasBidang != null ? parseFloat(String(body.totalLuasBidang)) : 0;
      const calculatedSisa =
        body.sisaLuas != null
          ? String(body.sisaLuas)
          : String(Math.max(0, luasIndukNum - totalLuasBidangNum));

      const updateData: Partial<NewLokasi> = {
        ...(body.geojson !== undefined && { geojson: body.geojson }),
        ...(body.luasInduk !== undefined && {
          luasInduk: body.luasInduk ? String(body.luasInduk) : null,
        }),
        ...(body.totalLuasBidang !== undefined && {
          totalLuasBidang: String(body.totalLuasBidang),
        }),
        sisaLuas: calculatedSisa,
        ...(body.bidangTerpetakan !== undefined && {
          bidangTerpetakan: body.bidangTerpetakan,
        }),
        updatedAt: now,
      };

      if (isDbUp) {
        try {
          const [updated] = await db
            .update(lokasi)
            .set(updateData)
            .where(eq(lokasi.kodeLokasi, kodeLokasi))
            .returning();

          if (updated) {
            inMemoryStore.set(kodeLokasi, updated);
            return {
              success: true,
              message: 'Batas lokasi dan pemetaan peta berhasil disimpan.',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Lokasi] Update batas DB error:', dbErr.message);
        }
      }

      const existing = inMemoryStore.get(kodeLokasi);
      if (!existing) {
        set.status = 404;
        return { success: false, message: `Lokasi '${kodeLokasi}' tidak ditemukan.` };
      }

      const updated = {
        ...existing,
        ...updateData,
        updatedAt: now,
      } as Lokasi;

      inMemoryStore.set(kodeLokasi, updated);
      return {
        success: true,
        message: 'Batas lokasi dan pemetaan peta berhasil disimpan.',
        data: updated,
      };
    },
    {
      params: t.Object({
        kodeLokasi: t.String(),
      }),
      body: t.Object({
        geojson: t.Optional(t.Any()),
        luasInduk: t.Optional(t.Union([t.Number(), t.String()])),
        totalLuasBidang: t.Optional(t.Union([t.Number(), t.String()])),
        sisaLuas: t.Optional(t.Union([t.Number(), t.String()])),
        bidangTerpetakan: t.Optional(t.Array(t.Any())),
      }),
    }
  )

  // 6. DELETE /api/lokasi/:kodeLokasi - Delete lokasi
  .delete(
    '/:kodeLokasi',
    async ({ params: { kodeLokasi }, set }) => {
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          await db.delete(lokasi).where(eq(lokasi.kodeLokasi, kodeLokasi));
        } catch (err: any) {
          console.warn('[Lokasi] Delete DB error:', err.message);
        }
      }

      const existed = inMemoryStore.delete(kodeLokasi);
      if (!existed && !isDbUp) {
        set.status = 404;
        return { success: false, message: `Lokasi '${kodeLokasi}' tidak ditemukan.` };
      }

      return {
        success: true,
        message: `Lokasi '${kodeLokasi}' berhasil dihapus.`,
      };
    },
    {
      params: t.Object({
        kodeLokasi: t.String(),
      }),
    }
  );
