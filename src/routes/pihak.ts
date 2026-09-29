import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  pihak,
  bidangTanah,
  tipePihakValues,
  type Pihak,
  type NewPihak,
} from '../db/schema';

// In-memory fallback store
let nextPihakId = 5;
const inMemoryPihakStore: Map<number, Pihak> = new Map([
  [
    1,
    {
      id: 1,
      kodeTanah: 'BDT-2026-001',
      nama: 'H. Mansur bin H. Sulaeman',
      nik: '3201011205700001',
      nomorTelp: '081234567890',
      tipePihak: 'Pemegang Hak',
      catatan: 'Pemilik utama yang namanya tercantum dalam SHM No. 10452/Sukamaju',
      createdAt: new Date('2026-01-20T10:30:00Z'),
      updatedAt: new Date('2026-02-01T09:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeTanah: 'BDT-2026-001',
      nama: 'Hj. Siti Aminah',
      nik: '3201015508720002',
      nomorTelp: '081298765432',
      tipePihak: 'Pemegang Hak',
      catatan: 'Istri sah pemilik utama (persetujuan suami/istri)',
      createdAt: new Date('2026-01-20T10:35:00Z'),
      updatedAt: new Date('2026-02-01T09:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeTanah: 'BDT-2026-002',
      nama: 'Ahmad Fauzi',
      nik: '3201012304950003',
      nomorTelp: '085712345678',
      tipePihak: 'Ahli Waris',
      catatan: 'Anak sulung almarhum pemilik girik',
      createdAt: new Date('2026-01-22T11:30:00Z'),
      updatedAt: new Date('2026-02-02T13:15:00Z'),
    },
  ],
  [
    4,
    {
      id: 4,
      kodeTanah: 'BDT-2026-002',
      nama: 'Bambang Sugiarto, S.H.',
      nik: '3271020101850005',
      nomorTelp: '081311223344',
      tipePihak: 'Kuasa',
      catatan: 'Penerima kuasa pengurusan administrasi pembebasan',
      createdAt: new Date('2026-01-25T14:00:00Z'),
      updatedAt: new Date('2026-02-02T13:20:00Z'),
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

export const pihakRoutes = new Elysia({ prefix: '/api/pihak' })
  // 1. GET /api/pihak - List pihak with optional filters (kodeTanah, tipePihak, search)
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const tipeFilter = query.tipePihak?.trim();
      const kodeTanahFilter = query.kodeTanah?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db.select().from(pihak).orderBy(desc(pihak.createdAt));

          if (kodeTanahFilter && kodeTanahFilter !== 'Semua') {
            rows = rows.filter((r) => r.kodeTanah === kodeTanahFilter);
          }

          if (tipeFilter && tipeFilter !== 'Semua') {
            rows = rows.filter((r) => r.tipePihak === tipeFilter);
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                r.nama.toLowerCase().includes(search) ||
                (r.nik && r.nik.toLowerCase().includes(search)) ||
                (r.nomorTelp && r.nomorTelp.toLowerCase().includes(search)) ||
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
          console.warn('[Pihak] DB list error, using memory:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryPihakStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (kodeTanahFilter && kodeTanahFilter !== 'Semua') {
        list = list.filter((r) => r.kodeTanah === kodeTanahFilter);
      }

      if (tipeFilter && tipeFilter !== 'Semua') {
        list = list.filter((r) => r.tipePihak === tipeFilter);
      }

      if (search) {
        list = list.filter(
          (r) =>
            r.nama.toLowerCase().includes(search) ||
            (r.nik && r.nik.toLowerCase().includes(search)) ||
            (r.nomorTelp && r.nomorTelp.toLowerCase().includes(search)) ||
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
        kodeTanah: t.Optional(t.String()),
        tipePihak: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pihak/Pemilik'],
        summary: 'Daftar Pihak/Pemilik dengan filter kode bidang tanah, tipe pihak, dan pencarian kata kunci',
      },
    }
  )

  // 2. GET /api/pihak/by-bidang/:kodeTanah - Get all pihak for a specific parcel
  .get(
    '/by-bidang/:kodeTanah',
    async ({ params: { kodeTanah }, set }) => {
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const rows = await db
            .select()
            .from(pihak)
            .where(eq(pihak.kodeTanah, kodeTanah))
            .orderBy(desc(pihak.createdAt));

          const ringkasanTipe = tipePihakValues.reduce((acc, curr) => {
            acc[curr] = rows.filter((r) => r.tipePihak === curr).length;
            return acc;
          }, {} as Record<string, number>);

          return {
            success: true,
            source: 'database',
            kodeTanah,
            totalPihak: rows.length,
            ringkasanTipe,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[Pihak] DB by-bidang error, fallback to memory:', dbErr.message);
        }
      }

      const rows = Array.from(inMemoryPihakStore.values())
        .filter((p) => p.kodeTanah === kodeTanah)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const ringkasanTipe = tipePihakValues.reduce((acc, curr) => {
        acc[curr] = rows.filter((r) => r.tipePihak === curr).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        source: 'memory',
        kodeTanah,
        totalPihak: rows.length,
        ringkasanTipe,
        data: rows,
      };
    },
    {
      params: t.Object({
        kodeTanah: t.String(),
      }),
      detail: {
        tags: ['Pihak/Pemilik'],
        summary: 'Daftar semua pihak/pemilik berdasarkan kode bidang tanah',
      },
    }
  )

  // 3. GET /api/pihak/:id - Retrieve detail of single pihak
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID pihak harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const rows = await db
            .select()
            .from(pihak)
            .where(eq(pihak.id, numericId))
            .limit(1);

          if (rows.length > 0) {
            return {
              success: true,
              source: 'database',
              data: rows[0],
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pihak] DB get error, fallback to memory:', dbErr.message);
        }
      }

      const item = inMemoryPihakStore.get(numericId);
      if (!item) {
        set.status = 404;
        return {
          success: false,
          message: `Pihak dengan ID '${id}' tidak ditemukan`,
        };
      }

      return {
        success: true,
        source: 'memory',
        data: item,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Pihak/Pemilik'],
        summary: 'Ambil detail pihak/pemilik berdasarkan ID',
      },
    }
  )

  // 4. POST /api/pihak - Tambah Pihak/Pemilik baru
  .post(
    '/',
    async ({ body, set }) => {
      const { kodeTanah, nama, nik, nomorTelp, tipePihak, catatan } = body;

      if (!nama || nama.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Nama pihak/pemilik wajib diisi',
        };
      }

      if (!kodeTanah || kodeTanah.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Kode bidang tanah wajib diisi sebagai relasi',
        };
      }

      const now = new Date();
      const validatedTipePihak = tipePihakValues.includes(tipePihak as any)
        ? tipePihak
        : 'Pemegang Hak';

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [inserted] = await db
            .insert(pihak)
            .values({
              kodeTanah: kodeTanah.trim(),
              nama: nama.trim(),
              nik: nik ? nik.trim() : null,
              nomorTelp: nomorTelp ? nomorTelp.trim() : null,
              tipePihak: validatedTipePihak,
              catatan: catatan ? catatan.trim() : null,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Pihak/pemilik berhasil ditambahkan',
            data: inserted,
          };
        } catch (dbErr: any) {
          console.warn('[Pihak] DB insert error, fallback to memory:', dbErr.message);
        }
      }

      const newId = nextPihakId++;
      const newRecord: Pihak = {
        id: newId,
        kodeTanah: kodeTanah.trim(),
        nama: nama.trim(),
        nik: nik ? nik.trim() : null,
        nomorTelp: nomorTelp ? nomorTelp.trim() : null,
        tipePihak: validatedTipePihak,
        catatan: catatan ? catatan.trim() : null,
        createdAt: now,
        updatedAt: now,
      };

      inMemoryPihakStore.set(newId, newRecord);

      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Pihak/pemilik berhasil ditambahkan (memory)',
        data: newRecord,
      };
    },
    {
      body: t.Object({
        kodeTanah: t.String(),
        nama: t.String({ minLength: 1 }),
        nik: t.Optional(t.String()),
        nomorTelp: t.Optional(t.String()),
        tipePihak: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pihak/Pemilik'],
        summary: 'Tambah data Pihak/Pemilik baru yang terhubung ke Bidang Tanah',
      },
    }
  )

  // 5. PUT /api/pihak/:id - Update data Pihak/Pemilik
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID pihak harus berupa angka numerik valid',
        };
      }

      const { kodeTanah, nama, nik, nomorTelp, tipePihak, catatan } = body;
      const now = new Date();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const updatePayload: Partial<NewPihak> = {
            updatedAt: now,
          };

          if (kodeTanah !== undefined) updatePayload.kodeTanah = kodeTanah.trim();
          if (nama !== undefined) updatePayload.nama = nama.trim();
          if (nik !== undefined) updatePayload.nik = nik ? nik.trim() : null;
          if (nomorTelp !== undefined) updatePayload.nomorTelp = nomorTelp ? nomorTelp.trim() : null;
          if (tipePihak !== undefined) {
            updatePayload.tipePihak = tipePihakValues.includes(tipePihak as any)
              ? tipePihak
              : 'Pemegang Hak';
          }
          if (catatan !== undefined) updatePayload.catatan = catatan ? catatan.trim() : null;

          const [updated] = await db
            .update(pihak)
            .set(updatePayload)
            .where(eq(pihak.id, numericId))
            .returning();

          if (updated) {
            return {
              success: true,
              source: 'database',
              message: 'Data pihak/pemilik berhasil diperbarui',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pihak] DB update error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemoryPihakStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Pihak dengan ID '${id}' tidak ditemukan`,
        };
      }

      const updatedRecord: Pihak = {
        ...existing,
        kodeTanah: kodeTanah !== undefined ? kodeTanah.trim() : existing.kodeTanah,
        nama: nama !== undefined ? nama.trim() : existing.nama,
        nik: nik !== undefined ? (nik ? nik.trim() : null) : existing.nik,
        nomorTelp: nomorTelp !== undefined ? (nomorTelp ? nomorTelp.trim() : null) : existing.nomorTelp,
        tipePihak:
          tipePihak !== undefined
            ? tipePihakValues.includes(tipePihak as any)
              ? tipePihak
              : existing.tipePihak
            : existing.tipePihak,
        catatan: catatan !== undefined ? (catatan ? catatan.trim() : null) : existing.catatan,
        updatedAt: now,
      };

      inMemoryPihakStore.set(numericId, updatedRecord);

      return {
        success: true,
        source: 'memory',
        message: 'Data pihak/pemilik berhasil diperbarui (memory)',
        data: updatedRecord,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        kodeTanah: t.Optional(t.String()),
        nama: t.Optional(t.String()),
        nik: t.Optional(t.String()),
        nomorTelp: t.Optional(t.String()),
        tipePihak: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pihak/Pemilik'],
        summary: 'Update data pihak/pemilik',
      },
    }
  )

  // 6. DELETE /api/pihak/:id - Hapus pihak/pemilik
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID pihak harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [deleted] = await db
            .delete(pihak)
            .where(eq(pihak.id, numericId))
            .returning();

          if (deleted) {
            return {
              success: true,
              source: 'database',
              message: `Pihak ID '${id}' berhasil dihapus`,
              data: deleted,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pihak] DB delete error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemoryPihakStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Pihak dengan ID '${id}' tidak ditemukan`,
        };
      }

      inMemoryPihakStore.delete(numericId);

      return {
        success: true,
        source: 'memory',
        message: `Pihak ID '${id}' berhasil dihapus (memory)`,
        data: existing,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Pihak/Pemilik'],
        summary: 'Hapus data pihak/pemilik berdasarkan ID',
      },
    }
  );
