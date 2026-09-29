import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  pembahasan,
  type Pembahasan,
  type NewPembahasan,
  keputusanPembahasanValues,
  type KeputusanPembahasan,
} from '../db/schema';

// In-memory fallback store
let nextPembahasanId = 4;
const inMemoryPembahasanStore: Map<number, Pembahasan> = new Map([
  [
    1,
    {
      id: 1,
      target: 'Lokasi',
      referensiId: 'LOK-2026-001',
      tanggal: new Date('2026-01-12T10:00:00Z'),
      peserta: 'Tim Pengadaan, Notaris, Camat, Tokoh Masyarakat',
      hasilPembahasan:
        'Pembahasan awal mengenai batas lahan dan rencana trase jalur pengadaan. Warga sekitar menyambut baik dan siap musyawarah ganti untung.',
      keputusan: 'Layak',
      catatan: 'Dapat dilanjutkan ke tahap inventarisasi bidang tanah.',
      createdAt: new Date('2026-01-12T11:00:00Z'),
      updatedAt: new Date('2026-01-12T11:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      target: 'Bidang',
      referensiId: 'BDT-2026-001',
      tanggal: new Date('2026-01-18T13:30:00Z'),
      peserta: 'Tim Pengadaan, Budi Santoso (Kuasa), Sukirman (Pemilik)',
      hasilPembahasan:
        'Negosiasi penawaran harga tanah dan tanaman tumbuh. Pemilik meminta waktu 1 minggu untuk bermusyawarah dengan keluarga inti.',
      keputusan: 'Perlu Kajian',
      catatan: 'Perlu cek ulang kesesuaian NJOP tahun berjalan.',
      createdAt: new Date('2026-01-18T15:00:00Z'),
      updatedAt: new Date('2026-01-18T15:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      target: 'Bidang',
      referensiId: 'BDT-2026-002',
      tanggal: new Date('2026-01-20T10:00:00Z'),
      peserta: 'Tim Hukum, Tim Pengadaan, Notaris, Ahli Waris',
      hasilPembahasan:
        'Ditemukan perbedaan klaim batas dan sengketa waris internal pada dokumen alas hak yang diajukan.',
      keputusan: 'Tidak Layak',
      catatan:
        'Pembahasan ditunda sampai ada kesepakatan tertulis berkekuatan hukum antar seluruh ahli waris.',
      createdAt: new Date('2026-01-20T11:30:00Z'),
      updatedAt: new Date('2026-01-20T11:30:00Z'),
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

export const pembahasanRoutes = new Elysia({ prefix: '/api/pembahasan' })
  // 1. GET /api/pembahasan - List pembahasan with optional filters
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const targetFilter = query.target?.trim();
      const referensiFilter = query.referensiId?.trim();
      const keputusanFilter = query.keputusan?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db
            .select()
            .from(pembahasan)
            .orderBy(desc(pembahasan.createdAt));

          if (targetFilter && targetFilter !== 'Semua') {
            rows = rows.filter((r) => r.target === targetFilter);
          }

          if (referensiFilter && referensiFilter !== 'Semua') {
            rows = rows.filter((r) => r.referensiId === referensiFilter);
          }

          if (keputusanFilter && keputusanFilter !== 'Semua') {
            rows = rows.filter((r) => r.keputusan === keputusanFilter);
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                (r.peserta && r.peserta.toLowerCase().includes(search)) ||
                (r.hasilPembahasan &&
                  r.hasilPembahasan.toLowerCase().includes(search)) ||
                (r.catatan && r.catatan.toLowerCase().includes(search)) ||
                (r.referensiId && r.referensiId.toLowerCase().includes(search)) ||
                (r.keputusan && r.keputusan.toLowerCase().includes(search))
            );
          }

          return {
            success: true,
            source: 'database',
            count: rows.length,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[Pembahasan] DB list error, using memory:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryPembahasanStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (targetFilter && targetFilter !== 'Semua') {
        list = list.filter((r) => r.target === targetFilter);
      }

      if (referensiFilter && referensiFilter !== 'Semua') {
        list = list.filter((r) => r.referensiId === referensiFilter);
      }

      if (keputusanFilter && keputusanFilter !== 'Semua') {
        list = list.filter((r) => r.keputusan === keputusanFilter);
      }

      if (search) {
        list = list.filter(
          (r) =>
            (r.peserta && r.peserta.toLowerCase().includes(search)) ||
            (r.hasilPembahasan &&
              r.hasilPembahasan.toLowerCase().includes(search)) ||
            (r.catatan && r.catatan.toLowerCase().includes(search)) ||
            (r.referensiId && r.referensiId.toLowerCase().includes(search)) ||
            (r.keputusan && r.keputusan.toLowerCase().includes(search))
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
        target: t.Optional(t.String()),
        referensiId: t.Optional(t.String()),
        keputusan: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pembahasan'],
        summary:
          'Daftar Pembahasan/Rapat dengan filter target, referensi ID, keputusan, dan pencarian',
      },
    }
  )

  // 2. GET /api/pembahasan/:id - Retrieve detail of single pembahasan
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID pembahasan harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const rows = await db
            .select()
            .from(pembahasan)
            .where(eq(pembahasan.id, numericId))
            .limit(1);

          if (rows.length > 0) {
            return {
              success: true,
              source: 'database',
              data: rows[0],
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pembahasan] DB get error, fallback to memory:', dbErr.message);
        }
      }

      const item = inMemoryPembahasanStore.get(numericId);
      if (!item) {
        set.status = 404;
        return {
          success: false,
          message: `Pembahasan dengan ID '${id}' tidak ditemukan`,
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
        tags: ['Pembahasan'],
        summary: 'Ambil detail data pembahasan berdasarkan ID',
      },
    }
  )

  // 3. POST /api/pembahasan - Tambah data Pembahasan baru
  .post(
    '/',
    async ({ body, set }) => {
      const {
        target,
        referensiId,
        tanggal,
        peserta,
        hasilPembahasan,
        keputusan,
        catatan,
      } = body;

      if (!target || !['Lokasi', 'Bidang'].includes(target)) {
        set.status = 400;
        return {
          success: false,
          message: 'Target Pembahasan harus berupa Lokasi atau Bidang',
        };
      }

      if (!referensiId || referensiId.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Referensi ID (Kode Lokasi/Bidang) wajib diisi',
        };
      }

      const validKeputusan = keputusan || 'Perlu Kajian';
      if (
        !keputusanPembahasanValues.includes(
          validKeputusan as KeputusanPembahasan
        )
      ) {
        set.status = 400;
        return {
          success: false,
          message: `Keputusan tidak valid. Pilihan: ${keputusanPembahasanValues.join(', ')}`,
        };
      }

      const now = new Date();
      let parsedTanggal = tanggal ? new Date(tanggal) : now;
      if (isNaN(parsedTanggal.getTime())) {
        parsedTanggal = now;
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [inserted] = await db
            .insert(pembahasan)
            .values({
              target,
              referensiId: referensiId.trim(),
              tanggal: parsedTanggal,
              peserta: peserta ? peserta.trim() : null,
              hasilPembahasan: hasilPembahasan ? hasilPembahasan.trim() : null,
              keputusan: validKeputusan,
              catatan: catatan ? catatan.trim() : null,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Data pembahasan berhasil ditambahkan',
            data: inserted,
          };
        } catch (dbErr: any) {
          console.warn('[Pembahasan] DB insert error, fallback to memory:', dbErr.message);
        }
      }

      const newId = nextPembahasanId++;
      const newRecord: Pembahasan = {
        id: newId,
        target,
        referensiId: referensiId.trim(),
        tanggal: parsedTanggal,
        peserta: peserta ? peserta.trim() : null,
        hasilPembahasan: hasilPembahasan ? hasilPembahasan.trim() : null,
        keputusan: validKeputusan,
        catatan: catatan ? catatan.trim() : null,
        createdAt: now,
        updatedAt: now,
      };

      inMemoryPembahasanStore.set(newId, newRecord);

      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Data pembahasan berhasil ditambahkan (memory)',
        data: newRecord,
      };
    },
    {
      body: t.Object({
        target: t.String(),
        referensiId: t.String({ minLength: 1 }),
        tanggal: t.Optional(t.String()),
        peserta: t.Optional(t.String()),
        hasilPembahasan: t.Optional(t.String()),
        keputusan: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pembahasan'],
        summary:
          'Tambah data Pembahasan baru yang terhubung ke Lokasi atau Bidang Tanah',
      },
    }
  )

  // 4. PUT /api/pembahasan/:id - Update data Pembahasan
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID pembahasan harus berupa angka numerik valid',
        };
      }

      const {
        target,
        referensiId,
        tanggal,
        peserta,
        hasilPembahasan,
        keputusan,
        catatan,
      } = body;
      const now = new Date();

      if (target !== undefined && !['Lokasi', 'Bidang'].includes(target)) {
        set.status = 400;
        return {
          success: false,
          message: 'Target Pembahasan harus berupa Lokasi atau Bidang',
        };
      }

      if (
        keputusan !== undefined &&
        !keputusanPembahasanValues.includes(
          keputusan as KeputusanPembahasan
        )
      ) {
        set.status = 400;
        return {
          success: false,
          message: `Keputusan tidak valid. Pilihan: ${keputusanPembahasanValues.join(', ')}`,
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const updatePayload: Partial<NewPembahasan> = {
            updatedAt: now,
          };

          if (target !== undefined) updatePayload.target = target;
          if (referensiId !== undefined)
            updatePayload.referensiId = referensiId.trim();
          if (tanggal !== undefined) {
            const dt = new Date(tanggal);
            updatePayload.tanggal = isNaN(dt.getTime()) ? null : dt;
          }
          if (peserta !== undefined)
            updatePayload.peserta = peserta ? peserta.trim() : null;
          if (hasilPembahasan !== undefined)
            updatePayload.hasilPembahasan = hasilPembahasan
              ? hasilPembahasan.trim()
              : null;
          if (keputusan !== undefined) updatePayload.keputusan = keputusan;
          if (catatan !== undefined)
            updatePayload.catatan = catatan ? catatan.trim() : null;

          const [updated] = await db
            .update(pembahasan)
            .set(updatePayload)
            .where(eq(pembahasan.id, numericId))
            .returning();

          if (updated) {
            return {
              success: true,
              source: 'database',
              message: 'Data pembahasan berhasil diperbarui',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pembahasan] DB update error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemoryPembahasanStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Pembahasan dengan ID '${id}' tidak ditemukan`,
        };
      }

      let parsedTanggal = existing.tanggal;
      if (tanggal !== undefined) {
        const dt = new Date(tanggal);
        parsedTanggal = isNaN(dt.getTime()) ? null : dt;
      }

      const updatedRecord: Pembahasan = {
        ...existing,
        target: target !== undefined ? target : existing.target,
        referensiId:
          referensiId !== undefined
            ? referensiId.trim()
            : existing.referensiId,
        tanggal: parsedTanggal,
        peserta:
          peserta !== undefined
            ? peserta
              ? peserta.trim()
              : null
            : existing.peserta,
        hasilPembahasan:
          hasilPembahasan !== undefined
            ? hasilPembahasan
              ? hasilPembahasan.trim()
              : null
            : existing.hasilPembahasan,
        keputusan:
          keputusan !== undefined ? keputusan : existing.keputusan,
        catatan:
          catatan !== undefined
            ? catatan
              ? catatan.trim()
              : null
            : existing.catatan,
        updatedAt: now,
      };

      inMemoryPembahasanStore.set(numericId, updatedRecord);

      return {
        success: true,
        source: 'memory',
        message: 'Data pembahasan berhasil diperbarui (memory)',
        data: updatedRecord,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        target: t.Optional(t.String()),
        referensiId: t.Optional(t.String()),
        tanggal: t.Optional(t.String()),
        peserta: t.Optional(t.String()),
        hasilPembahasan: t.Optional(t.String()),
        keputusan: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pembahasan'],
        summary: 'Update data pembahasan',
      },
    }
  )

  // 5. DELETE /api/pembahasan/:id - Hapus pembahasan
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID pembahasan harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [deleted] = await db
            .delete(pembahasan)
            .where(eq(pembahasan.id, numericId))
            .returning();

          if (deleted) {
            return {
              success: true,
              source: 'database',
              message: `Pembahasan ID '${id}' berhasil dihapus`,
              data: deleted,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pembahasan] DB delete error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemoryPembahasanStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Pembahasan dengan ID '${id}' tidak ditemukan`,
        };
      }

      inMemoryPembahasanStore.delete(numericId);

      return {
        success: true,
        source: 'memory',
        message: `Pembahasan ID '${id}' berhasil dihapus (memory)`,
        data: existing,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Pembahasan'],
        summary: 'Hapus data pembahasan berdasarkan ID',
      },
    }
  );
