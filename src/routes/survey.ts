import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  survey,
  type Survey,
  type NewSurvey,
} from '../db/schema';

// In-memory fallback store
let nextSurveyId = 4;
const inMemorySurveyStore: Map<number, Survey> = new Map([
  [
    1,
    {
      id: 1,
      targetSurvey: 'Lokasi',
      referensiId: 'LOK-2026-001',
      tanggalSurvey: new Date('2026-01-10T08:00:00Z'),
      picSurvey: 'Budi Santoso',
      hasilSurvey: 'Sesuai Kriteria',
      koordinat: '-6.415, 106.829',
      catatan: 'Lokasi sangat strategis dekat dengan akses jalan utama.',
      createdAt: new Date('2026-01-11T10:00:00Z'),
      updatedAt: new Date('2026-01-11T10:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      targetSurvey: 'Bidang',
      referensiId: 'BDT-2026-001',
      tanggalSurvey: new Date('2026-01-15T09:30:00Z'),
      picSurvey: 'Tim Surveyor A',
      hasilSurvey: 'Sesuai Kriteria',
      koordinat: '-6.4155, 106.830',
      catatan: 'Batas-batas tanah sudah jelas sesuai dengan patok BPN.',
      createdAt: new Date('2026-01-16T11:00:00Z'),
      updatedAt: new Date('2026-01-16T11:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      targetSurvey: 'Bidang',
      referensiId: 'BDT-2026-002',
      tanggalSurvey: new Date('2026-01-16T14:00:00Z'),
      picSurvey: 'Tim Surveyor B',
      hasilSurvey: 'Butuh Penyesuaian',
      koordinat: '-6.4165, 106.8315',
      catatan: 'Terdapat sedikit perbedaan luas antara fisik dan girik, perlu pengukuran ulang.',
      createdAt: new Date('2026-01-17T09:00:00Z'),
      updatedAt: new Date('2026-01-17T09:00:00Z'),
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

export const surveyRoutes = new Elysia({ prefix: '/api/survey' })
  // 1. GET /api/survey - List survey with optional filters
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const targetFilter = query.targetSurvey?.trim();
      const referensiFilter = query.referensiId?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db.select().from(survey).orderBy(desc(survey.createdAt));

          if (targetFilter && targetFilter !== 'Semua') {
            rows = rows.filter((r) => r.targetSurvey === targetFilter);
          }

          if (referensiFilter && referensiFilter !== 'Semua') {
            rows = rows.filter((r) => r.referensiId === referensiFilter);
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                (r.picSurvey && r.picSurvey.toLowerCase().includes(search)) ||
                (r.hasilSurvey && r.hasilSurvey.toLowerCase().includes(search)) ||
                (r.catatan && r.catatan.toLowerCase().includes(search)) ||
                (r.referensiId && r.referensiId.toLowerCase().includes(search))
            );
          }

          return {
            success: true,
            source: 'database',
            count: rows.length,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[Survey] DB list error, using memory:', dbErr.message);
        }
      }

      let list = Array.from(inMemorySurveyStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (targetFilter && targetFilter !== 'Semua') {
        list = list.filter((r) => r.targetSurvey === targetFilter);
      }

      if (referensiFilter && referensiFilter !== 'Semua') {
        list = list.filter((r) => r.referensiId === referensiFilter);
      }

      if (search) {
        list = list.filter(
          (r) =>
            (r.picSurvey && r.picSurvey.toLowerCase().includes(search)) ||
            (r.hasilSurvey && r.hasilSurvey.toLowerCase().includes(search)) ||
            (r.catatan && r.catatan.toLowerCase().includes(search)) ||
            (r.referensiId && r.referensiId.toLowerCase().includes(search))
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
        targetSurvey: t.Optional(t.String()),
        referensiId: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Survey'],
        summary: 'Daftar Survey dengan filter target (Lokasi/Bidang), referensi, dan pencarian',
      },
    }
  )

  // 2. GET /api/survey/:id - Retrieve detail of single survey
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID survey harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const rows = await db
            .select()
            .from(survey)
            .where(eq(survey.id, numericId))
            .limit(1);

          if (rows.length > 0) {
            return {
              success: true,
              source: 'database',
              data: rows[0],
            };
          }
        } catch (dbErr: any) {
          console.warn('[Survey] DB get error, fallback to memory:', dbErr.message);
        }
      }

      const item = inMemorySurveyStore.get(numericId);
      if (!item) {
        set.status = 404;
        return {
          success: false,
          message: `Survey dengan ID '${id}' tidak ditemukan`,
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
        tags: ['Survey'],
        summary: 'Ambil detail survey berdasarkan ID',
      },
    }
  )

  // 3. POST /api/survey - Tambah Survey baru
  .post(
    '/',
    async ({ body, set }) => {
      const {
        targetSurvey,
        referensiId,
        tanggalSurvey,
        picSurvey,
        hasilSurvey,
        koordinat,
        catatan,
      } = body;

      if (!targetSurvey || !['Lokasi', 'Bidang'].includes(targetSurvey)) {
        set.status = 400;
        return {
          success: false,
          message: 'Target Survey harus berupa Lokasi atau Bidang',
        };
      }

      if (!referensiId || referensiId.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Referensi ID (Kode Lokasi/Bidang) wajib diisi',
        };
      }

      const now = new Date();
      let parsedTanggal = tanggalSurvey ? new Date(tanggalSurvey) : now;
      if (isNaN(parsedTanggal.getTime())) {
        parsedTanggal = now;
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [inserted] = await db
            .insert(survey)
            .values({
              targetSurvey,
              referensiId: referensiId.trim(),
              tanggalSurvey: parsedTanggal,
              picSurvey: picSurvey ? picSurvey.trim() : null,
              hasilSurvey: hasilSurvey ? hasilSurvey.trim() : null,
              koordinat: koordinat ? koordinat.trim() : null,
              catatan: catatan ? catatan.trim() : null,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Data survey berhasil ditambahkan',
            data: inserted,
          };
        } catch (dbErr: any) {
          console.warn('[Survey] DB insert error, fallback to memory:', dbErr.message);
        }
      }

      const newId = nextSurveyId++;
      const newRecord: Survey = {
        id: newId,
        targetSurvey,
        referensiId: referensiId.trim(),
        tanggalSurvey: parsedTanggal,
        picSurvey: picSurvey ? picSurvey.trim() : null,
        hasilSurvey: hasilSurvey ? hasilSurvey.trim() : null,
        koordinat: koordinat ? koordinat.trim() : null,
        catatan: catatan ? catatan.trim() : null,
        createdAt: now,
        updatedAt: now,
      };

      inMemorySurveyStore.set(newId, newRecord);

      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Data survey berhasil ditambahkan (memory)',
        data: newRecord,
      };
    },
    {
      body: t.Object({
        targetSurvey: t.String(),
        referensiId: t.String({ minLength: 1 }),
        tanggalSurvey: t.Optional(t.String()),
        picSurvey: t.Optional(t.String()),
        hasilSurvey: t.Optional(t.String()),
        koordinat: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Survey'],
        summary: 'Tambah data Survey baru yang terhubung ke Lokasi atau Bidang Tanah',
      },
    }
  )

  // 4. PUT /api/survey/:id - Update data Survey
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID survey harus berupa angka numerik valid',
        };
      }

      const {
        targetSurvey,
        referensiId,
        tanggalSurvey,
        picSurvey,
        hasilSurvey,
        koordinat,
        catatan,
      } = body;
      const now = new Date();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const updatePayload: Partial<NewSurvey> = {
            updatedAt: now,
          };

          if (targetSurvey !== undefined) {
             if (!['Lokasi', 'Bidang'].includes(targetSurvey)) {
                 set.status = 400;
                 return { success: false, message: 'Target Survey tidak valid' };
             }
             updatePayload.targetSurvey = targetSurvey;
          }
          if (referensiId !== undefined) updatePayload.referensiId = referensiId.trim();
          if (tanggalSurvey !== undefined) {
              const dt = new Date(tanggalSurvey);
              updatePayload.tanggalSurvey = isNaN(dt.getTime()) ? null : dt;
          }
          if (picSurvey !== undefined) updatePayload.picSurvey = picSurvey ? picSurvey.trim() : null;
          if (hasilSurvey !== undefined) updatePayload.hasilSurvey = hasilSurvey ? hasilSurvey.trim() : null;
          if (koordinat !== undefined) updatePayload.koordinat = koordinat ? koordinat.trim() : null;
          if (catatan !== undefined) updatePayload.catatan = catatan ? catatan.trim() : null;

          const [updated] = await db
            .update(survey)
            .set(updatePayload)
            .where(eq(survey.id, numericId))
            .returning();

          if (updated) {
            return {
              success: true,
              source: 'database',
              message: 'Data survey berhasil diperbarui',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Survey] DB update error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemorySurveyStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Survey dengan ID '${id}' tidak ditemukan`,
        };
      }

      let parsedTanggal = existing.tanggalSurvey;
      if (tanggalSurvey !== undefined) {
          const dt = new Date(tanggalSurvey);
          parsedTanggal = isNaN(dt.getTime()) ? null : dt;
      }

      const updatedRecord: Survey = {
        ...existing,
        targetSurvey: targetSurvey !== undefined ? targetSurvey : existing.targetSurvey,
        referensiId: referensiId !== undefined ? referensiId.trim() : existing.referensiId,
        tanggalSurvey: parsedTanggal,
        picSurvey: picSurvey !== undefined ? (picSurvey ? picSurvey.trim() : null) : existing.picSurvey,
        hasilSurvey: hasilSurvey !== undefined ? (hasilSurvey ? hasilSurvey.trim() : null) : existing.hasilSurvey,
        koordinat: koordinat !== undefined ? (koordinat ? koordinat.trim() : null) : existing.koordinat,
        catatan: catatan !== undefined ? (catatan ? catatan.trim() : null) : existing.catatan,
        updatedAt: now,
      };

      inMemorySurveyStore.set(numericId, updatedRecord);

      return {
        success: true,
        source: 'memory',
        message: 'Data survey berhasil diperbarui (memory)',
        data: updatedRecord,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        targetSurvey: t.Optional(t.String()),
        referensiId: t.Optional(t.String()),
        tanggalSurvey: t.Optional(t.String()),
        picSurvey: t.Optional(t.String()),
        hasilSurvey: t.Optional(t.String()),
        koordinat: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Survey'],
        summary: 'Update data survey',
      },
    }
  )

  // 5. DELETE /api/survey/:id - Hapus survey
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID survey harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [deleted] = await db
            .delete(survey)
            .where(eq(survey.id, numericId))
            .returning();

          if (deleted) {
            return {
              success: true,
              source: 'database',
              message: `Survey ID '${id}' berhasil dihapus`,
              data: deleted,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Survey] DB delete error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemorySurveyStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Survey dengan ID '${id}' tidak ditemukan`,
        };
      }

      inMemorySurveyStore.delete(numericId);

      return {
        success: true,
        source: 'memory',
        message: `Survey ID '${id}' berhasil dihapus (memory)`,
        data: existing,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Survey'],
        summary: 'Hapus data survey berdasarkan ID',
      },
    }
  );
