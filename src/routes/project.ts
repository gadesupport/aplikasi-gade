import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  projects,
  statusProjectValues,
  type Project,
  type NewProject,
  type StatusProject,
} from '../db/schema';

// In-memory fallback store
let nextProjectId = 4;
const inMemoryProjectStore: Map<number, Project> = new Map([
  [
    1,
    {
      id: 1,
      kodeProject: 'PRJ-2026-001',
      namaProject: 'Pengembangan Kawasan Industri Terpadu Gade',
      lokasi: 'Kawasan Timur',
      desa: 'Sukamaju',
      kecamatan: 'Cilodong',
      kabupaten: 'Depok',
      status: 'Berjalan',
      keterangan: 'Proyek pengadaan dan pembebasan lahan industri terpadu tahap 1 seluas 15 hektar.',
      createdAt: new Date('2026-01-10T08:00:00Z'),
      updatedAt: new Date('2026-02-15T10:30:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeProject: 'PRJ-2026-002',
      namaProject: 'Pembangunan Depo & Fasilitas Logistik Sentosa',
      lokasi: 'Kawasan Barat',
      desa: 'Tapos',
      kecamatan: 'Tapos',
      kabupaten: 'Depok',
      status: 'Perencanaan',
      keterangan: 'Studi kelayakan dan koordinasi dengan perizinan tata ruang KKPR.',
      createdAt: new Date('2026-02-01T09:00:00Z'),
      updatedAt: new Date('2026-02-20T11:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeProject: 'PRJ-2026-003',
      namaProject: 'Sentra Pergudangan Modern Margonda',
      lokasi: 'Kawasan Utara',
      desa: 'Pondok Cina',
      kecamatan: 'Beji',
      kabupaten: 'Depok',
      status: 'Selesai',
      keterangan: 'Seluruh pembebasan dan sertifikasi lahan telah rampung 100%.',
      createdAt: new Date('2025-11-15T14:00:00Z'),
      updatedAt: new Date('2026-01-20T16:45:00Z'),
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

function calculateProjectSummary(items: Project[]) {
  const total = items.length;
  let perencanaan = 0;
  let berjalan = 0;
  let selesai = 0;
  let dibatalkan = 0;

  for (const item of items) {
    if (item.status === 'Perencanaan') perencanaan++;
    else if (item.status === 'Berjalan') berjalan++;
    else if (item.status === 'Selesai') selesai++;
    else if (item.status === 'Dibatalkan') dibatalkan++;
  }

  return {
    total,
    perencanaan,
    berjalan,
    selesai,
    dibatalkan,
  };
}

export const projectRoutes = new Elysia({ prefix: '/api/projects' })
  // 1. GET /api/projects - List all projects with search & status filter
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const statusFilter = query.status?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db.select().from(projects).orderBy(desc(projects.createdAt));

          if (statusFilter && statusFilter !== 'Semua') {
            rows = rows.filter((r) => r.status === statusFilter);
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                (r.kodeProject && r.kodeProject.toLowerCase().includes(search)) ||
                (r.namaProject && r.namaProject.toLowerCase().includes(search)) ||
                (r.lokasi && r.lokasi.toLowerCase().includes(search)) ||
                (r.desa && r.desa.toLowerCase().includes(search)) ||
                (r.kecamatan && r.kecamatan.toLowerCase().includes(search)) ||
                (r.kabupaten && r.kabupaten.toLowerCase().includes(search)) ||
                (r.keterangan && r.keterangan.toLowerCase().includes(search))
            );
          }

          return {
            success: true,
            source: 'database',
            count: rows.length,
            summary: calculateProjectSummary(rows),
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[Project] DB list error, using memory:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryProjectStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (statusFilter && statusFilter !== 'Semua') {
        list = list.filter((r) => r.status === statusFilter);
      }

      if (search) {
        list = list.filter(
          (r) =>
            (r.kodeProject && r.kodeProject.toLowerCase().includes(search)) ||
            (r.namaProject && r.namaProject.toLowerCase().includes(search)) ||
            (r.lokasi && r.lokasi.toLowerCase().includes(search)) ||
            (r.desa && r.desa.toLowerCase().includes(search)) ||
            (r.kecamatan && r.kecamatan.toLowerCase().includes(search)) ||
            (r.kabupaten && r.kabupaten.toLowerCase().includes(search)) ||
            (r.keterangan && r.keterangan.toLowerCase().includes(search))
        );
      }

      return {
        success: true,
        source: 'memory',
        count: list.length,
        summary: calculateProjectSummary(list),
        data: list,
      };
    },
    {
      detail: {
        tags: ['Project'],
        summary: 'Daftar semua project dengan filter status, pencarian, dan rekap statistik',
      },
      query: t.Object({
        search: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // 2. GET /api/projects/:id - Ambil detail single project
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const isDbUp = await checkDbConnection();
      const numId = parseInt(id, 10);

      if (isDbUp) {
        try {
          let found = null;
          if (!isNaN(numId)) {
            const res = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
            if (res.length > 0) found = res[0];
          }
          if (!found) {
            const res = await db.select().from(projects).where(eq(projects.kodeProject, id)).limit(1);
            if (res.length > 0) found = res[0];
          }

          if (found) {
            return {
              success: true,
              source: 'database',
              data: found,
            };
          }
        } catch (dbErr: any) {
          console.warn('[Project] DB get error, using memory:', dbErr.message);
        }
      }

      let memFound: Project | undefined;
      if (!isNaN(numId)) {
        memFound = inMemoryProjectStore.get(numId);
      }
      if (!memFound) {
        memFound = Array.from(inMemoryProjectStore.values()).find(
          (p) => p.kodeProject.toLowerCase() === id.toLowerCase()
        );
      }

      if (!memFound) {
        set.status = 404;
        return {
          success: false,
          message: `Project dengan ID atau Kode '${id}' tidak ditemukan`,
        };
      }

      return {
        success: true,
        source: 'memory',
        data: memFound,
      };
    },
    {
      detail: {
        tags: ['Project'],
        summary: 'Ambil detail project berdasarkan ID atau Kode Project',
      },
    }
  )

  // 3. POST /api/projects - Tambah project baru
  .post(
    '/',
    async ({ body, set }) => {
      const {
        kodeProject,
        namaProject,
        lokasi,
        desa,
        kecamatan,
        kabupaten,
        status = 'Perencanaan',
        keterangan,
      } = body as any;

      if (!kodeProject || !namaProject || !lokasi || !desa || !kecamatan || !kabupaten) {
        set.status = 400;
        return {
          success: false,
          message: 'Field kodeProject, namaProject, lokasi, desa, kecamatan, dan kabupaten wajib diisi',
        };
      }

      const validStatus = statusProjectValues.includes(status as any) ? status : 'Perencanaan';

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          // Cek keunikan kodeProject di DB
          const existing = await db
            .select()
            .from(projects)
            .where(eq(projects.kodeProject, kodeProject.trim()))
            .limit(1);

          if (existing.length > 0) {
            set.status = 409;
            return {
              success: false,
              message: `Kode Project '${kodeProject}' sudah digunakan`,
            };
          }

          const insertData: NewProject = {
            kodeProject: kodeProject.trim(),
            namaProject: namaProject.trim(),
            lokasi: lokasi.trim(),
            desa: desa.trim(),
            kecamatan: kecamatan.trim(),
            kabupaten: kabupaten.trim(),
            status: validStatus,
            keterangan: keterangan?.trim() || null,
          };

          const inserted = await db.insert(projects).values(insertData).returning();

          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Project berhasil ditambahkan',
            data: inserted[0],
          };
        } catch (dbErr: any) {
          console.warn('[Project] DB insert error, using memory fallback:', dbErr.message);
        }
      }

      // Memory fallback check uniqueness
      const existingMem = Array.from(inMemoryProjectStore.values()).find(
        (p) => p.kodeProject.toLowerCase() === kodeProject.trim().toLowerCase()
      );

      if (existingMem) {
        set.status = 409;
        return {
          success: false,
          message: `Kode Project '${kodeProject}' sudah digunakan`,
        };
      }

      const newId = nextProjectId++;
      const newRecord: Project = {
        id: newId,
        kodeProject: kodeProject.trim(),
        namaProject: namaProject.trim(),
        lokasi: lokasi.trim(),
        desa: desa.trim(),
        kecamatan: kecamatan.trim(),
        kabupaten: kabupaten.trim(),
        status: validStatus as StatusProject,
        keterangan: keterangan?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryProjectStore.set(newId, newRecord);

      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Project berhasil ditambahkan (In-Memory)',
        data: newRecord,
      };
    },
    {
      detail: {
        tags: ['Project'],
        summary: 'Tambah data project baru',
      },
      body: t.Object({
        kodeProject: t.String(),
        namaProject: t.String(),
        lokasi: t.String(),
        desa: t.String(),
        kecamatan: t.String(),
        kabupaten: t.String(),
        status: t.Optional(t.String()),
        keterangan: t.Optional(t.String()),
      }),
    }
  )

  // 4. PUT /api/projects/:id - Update data project
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numId = parseInt(id, 10);
      const {
        kodeProject,
        namaProject,
        lokasi,
        desa,
        kecamatan,
        kabupaten,
        status,
        keterangan,
      } = body as any;

      if (status && !statusProjectValues.includes(status as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Status tidak valid. Pilihan status yang tersedia: ${statusProjectValues.join(', ')}`,
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let current = null;
          if (!isNaN(numId)) {
            const res = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
            if (res.length > 0) current = res[0];
          }
          if (!current) {
            const res = await db.select().from(projects).where(eq(projects.kodeProject, id)).limit(1);
            if (res.length > 0) current = res[0];
          }

          if (!current) {
            set.status = 404;
            return {
              success: false,
              message: `Project dengan ID atau Kode '${id}' tidak ditemukan`,
            };
          }

          // Jika kodeProject diubah, pastikan tidak duplikat
          if (kodeProject && kodeProject.trim() !== current.kodeProject) {
            const conflict = await db
              .select()
              .from(projects)
              .where(eq(projects.kodeProject, kodeProject.trim()))
              .limit(1);
            if (conflict.length > 0 && conflict[0].id !== current.id) {
              set.status = 409;
              return {
                success: false,
                message: `Kode Project '${kodeProject}' sudah digunakan oleh project lain`,
              };
            }
          }

          const updatePayload: Partial<NewProject> & { updatedAt: Date } = {
            updatedAt: new Date(),
          };

          if (kodeProject) updatePayload.kodeProject = kodeProject.trim();
          if (namaProject) updatePayload.namaProject = namaProject.trim();
          if (lokasi) updatePayload.lokasi = lokasi.trim();
          if (desa) updatePayload.desa = desa.trim();
          if (kecamatan) updatePayload.kecamatan = kecamatan.trim();
          if (kabupaten) updatePayload.kabupaten = kabupaten.trim();
          if (status) updatePayload.status = status;
          if (keterangan !== undefined) updatePayload.keterangan = keterangan?.trim() || null;

          const updated = await db
            .update(projects)
            .set(updatePayload)
            .where(eq(projects.id, current.id))
            .returning();

          return {
            success: true,
            source: 'database',
            message: 'Project berhasil diperbarui',
            data: updated[0],
          };
        } catch (dbErr: any) {
          console.warn('[Project] DB update error, using memory fallback:', dbErr.message);
        }
      }

      // Memory fallback
      let existingRecord: Project | undefined;
      let targetKey: number | undefined;

      if (!isNaN(numId) && inMemoryProjectStore.has(numId)) {
        targetKey = numId;
        existingRecord = inMemoryProjectStore.get(numId);
      } else {
        for (const [k, p] of inMemoryProjectStore.entries()) {
          if (p.kodeProject.toLowerCase() === id.toLowerCase()) {
            targetKey = k;
            existingRecord = p;
            break;
          }
        }
      }

      if (!existingRecord || targetKey === undefined) {
        set.status = 404;
        return {
          success: false,
          message: `Project dengan ID atau Kode '${id}' tidak ditemukan`,
        };
      }

      if (kodeProject && kodeProject.trim().toLowerCase() !== existingRecord.kodeProject.toLowerCase()) {
        const conflict = Array.from(inMemoryProjectStore.values()).find(
          (p) => p.id !== existingRecord!.id && p.kodeProject.toLowerCase() === kodeProject.trim().toLowerCase()
        );
        if (conflict) {
          set.status = 409;
          return {
            success: false,
            message: `Kode Project '${kodeProject}' sudah digunakan oleh project lain`,
          };
        }
      }

      const updatedRecord: Project = {
        ...existingRecord,
        kodeProject: kodeProject ? kodeProject.trim() : existingRecord.kodeProject,
        namaProject: namaProject ? namaProject.trim() : existingRecord.namaProject,
        lokasi: lokasi ? lokasi.trim() : existingRecord.lokasi,
        desa: desa ? desa.trim() : existingRecord.desa,
        kecamatan: kecamatan ? kecamatan.trim() : existingRecord.kecamatan,
        kabupaten: kabupaten ? kabupaten.trim() : existingRecord.kabupaten,
        status: status ? (status as StatusProject) : existingRecord.status,
        keterangan: keterangan !== undefined ? (keterangan?.trim() || null) : existingRecord.keterangan,
        updatedAt: new Date(),
      };

      inMemoryProjectStore.set(targetKey, updatedRecord);

      return {
        success: true,
        source: 'memory',
        message: 'Project berhasil diperbarui (In-Memory)',
        data: updatedRecord,
      };
    },
    {
      detail: {
        tags: ['Project'],
        summary: 'Update data project berdasarkan ID atau Kode Project',
      },
      body: t.Object({
        kodeProject: t.Optional(t.String()),
        namaProject: t.Optional(t.String()),
        lokasi: t.Optional(t.String()),
        desa: t.Optional(t.String()),
        kecamatan: t.Optional(t.String()),
        kabupaten: t.Optional(t.String()),
        status: t.Optional(t.String()),
        keterangan: t.Optional(t.String()),
      }),
    }
  )

  // 5. DELETE /api/projects/:id - Hapus data project
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numId = parseInt(id, 10);
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let current = null;
          if (!isNaN(numId)) {
            const res = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
            if (res.length > 0) current = res[0];
          }
          if (!current) {
            const res = await db.select().from(projects).where(eq(projects.kodeProject, id)).limit(1);
            if (res.length > 0) current = res[0];
          }

          if (!current) {
            set.status = 404;
            return {
              success: false,
              message: `Project dengan ID atau Kode '${id}' tidak ditemukan`,
            };
          }

          await db.delete(projects).where(eq(projects.id, current.id));

          return {
            success: true,
            source: 'database',
            message: `Project '${current.namaProject}' (${current.kodeProject}) berhasil dihapus`,
          };
        } catch (dbErr: any) {
          console.warn('[Project] DB delete error, using memory fallback:', dbErr.message);
        }
      }

      // Memory fallback
      let targetKey: number | undefined;
      let foundRecord: Project | undefined;

      if (!isNaN(numId) && inMemoryProjectStore.has(numId)) {
        targetKey = numId;
        foundRecord = inMemoryProjectStore.get(numId);
      } else {
        for (const [k, p] of inMemoryProjectStore.entries()) {
          if (p.kodeProject.toLowerCase() === id.toLowerCase()) {
            targetKey = k;
            foundRecord = p;
            break;
          }
        }
      }

      if (!foundRecord || targetKey === undefined) {
        set.status = 404;
        return {
          success: false,
          message: `Project dengan ID atau Kode '${id}' tidak ditemukan`,
        };
      }

      inMemoryProjectStore.delete(targetKey);

      return {
        success: true,
        source: 'memory',
        message: `Project '${foundRecord.namaProject}' (${foundRecord.kodeProject}) berhasil dihapus`,
      };
    },
    {
      detail: {
        tags: ['Project'],
        summary: 'Hapus data project berdasarkan ID atau Kode Project',
      },
    }
  );
