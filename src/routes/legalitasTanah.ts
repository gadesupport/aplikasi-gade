import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  legalitasTanah,
  type LegalitasTanah,
  type NewLegalitasTanah,
  jenisDokumenValues,
  type JenisDokumen,
  statusDokumenValues,
  type StatusDokumen,
} from '../db/schema';

// In-memory fallback store
let nextLegalitasId = 5;
const inMemoryLegalitasStore: Map<number, LegalitasTanah> = new Map([
  [
    1,
    {
      id: 1,
      kodeTanah: 'BDT-2026-001',
      jenisDokumen: 'SHM',
      status: 'Ada',
      nomorDokumen: 'SHM No. 10452/Sukamaju',
      tanggalDokumen: new Date('2015-08-17T00:00:00Z'),
      penerbit: 'Kantor Pertanahan Kab. Bogor',
      pihakId: 1,
      catatan: 'Asli sertifikat sudah diverifikasi legal tim proyek',
      createdAt: new Date('2026-01-20T10:00:00Z'),
      updatedAt: new Date('2026-01-20T10:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeTanah: 'BDT-2026-001',
      jenisDokumen: 'PBB',
      status: 'Ada',
      nomorDokumen: 'SPPT PBB No. 32.01.010.005.012-0045.0',
      tanggalDokumen: new Date('2025-01-10T00:00:00Z'),
      penerbit: 'Bapenda Kab. Bogor',
      pihakId: 1,
      catatan: 'Bukti lunas PBB tahun berjalan terlampir',
      createdAt: new Date('2026-01-21T09:00:00Z'),
      updatedAt: new Date('2026-01-21T09:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeTanah: 'BDT-2026-002',
      jenisDokumen: 'Girik',
      status: 'Proses',
      nomorDokumen: 'Girik C. No. 412 Persil 15',
      tanggalDokumen: new Date('1982-03-24T00:00:00Z'),
      penerbit: 'Kantor Desa Sukamaju',
      pihakId: 3,
      catatan: 'Sedang dalam proses konfirmasi ke Kantor Desa terkait riwayat tanah',
      createdAt: new Date('2026-01-25T11:00:00Z'),
      updatedAt: new Date('2026-01-25T11:00:00Z'),
    },
  ],
  [
    4,
    {
      id: 4,
      kodeTanah: 'BDT-2026-002',
      jenisDokumen: 'Surat Waris',
      status: 'Perlu Verifikasi',
      nomorDokumen: 'SW/2024/09/DS-SKM',
      tanggalDokumen: new Date('2024-09-12T00:00:00Z'),
      penerbit: 'Kepala Desa Sukamaju',
      pihakId: 3,
      catatan: 'Ada tandatangan ahli waris yang belum lengkap dilegalisir camat',
      createdAt: new Date('2026-01-26T14:30:00Z'),
      updatedAt: new Date('2026-01-26T14:30:00Z'),
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

export const legalitasTanahRoutes = new Elysia({ prefix: '/api/legalitas-tanah' })
  // 1. GET /api/legalitas-tanah - List legalitas dokumen with filters
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const kodeTanahFilter = query.kodeTanah?.trim();
      const jenisDokumenFilter = query.jenisDokumen?.trim();
      const statusFilter = query.status?.trim();
      const pihakIdFilter = query.pihakId ? parseInt(query.pihakId, 10) : undefined;

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db
            .select()
            .from(legalitasTanah)
            .orderBy(desc(legalitasTanah.createdAt));

          if (kodeTanahFilter && kodeTanahFilter !== 'Semua') {
            rows = rows.filter((r) => r.kodeTanah === kodeTanahFilter);
          }

          if (jenisDokumenFilter && jenisDokumenFilter !== 'Semua') {
            rows = rows.filter((r) => r.jenisDokumen === jenisDokumenFilter);
          }

          if (statusFilter && statusFilter !== 'Semua') {
            rows = rows.filter((r) => r.status === statusFilter);
          }

          if (pihakIdFilter !== undefined && !isNaN(pihakIdFilter)) {
            rows = rows.filter((r) => r.pihakId === pihakIdFilter);
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                (r.nomorDokumen && r.nomorDokumen.toLowerCase().includes(search)) ||
                (r.penerbit && r.penerbit.toLowerCase().includes(search)) ||
                (r.catatan && r.catatan.toLowerCase().includes(search)) ||
                (r.kodeTanah && r.kodeTanah.toLowerCase().includes(search)) ||
                (r.jenisDokumen && r.jenisDokumen.toLowerCase().includes(search)) ||
                (r.status && r.status.toLowerCase().includes(search))
            );
          }

          const ringkasanStatus = statusDokumenValues.reduce((acc, curr) => {
            acc[curr] = rows.filter((r) => r.status === curr).length;
            return acc;
          }, {} as Record<string, number>);

          return {
            success: true,
            source: 'database',
            count: rows.length,
            ringkasanStatus,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[LegalitasTanah] DB list error, using memory:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryLegalitasStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (kodeTanahFilter && kodeTanahFilter !== 'Semua') {
        list = list.filter((r) => r.kodeTanah === kodeTanahFilter);
      }

      if (jenisDokumenFilter && jenisDokumenFilter !== 'Semua') {
        list = list.filter((r) => r.jenisDokumen === jenisDokumenFilter);
      }

      if (statusFilter && statusFilter !== 'Semua') {
        list = list.filter((r) => r.status === statusFilter);
      }

      if (pihakIdFilter !== undefined && !isNaN(pihakIdFilter)) {
        list = list.filter((r) => r.pihakId === pihakIdFilter);
      }

      if (search) {
        list = list.filter(
          (r) =>
            (r.nomorDokumen && r.nomorDokumen.toLowerCase().includes(search)) ||
            (r.penerbit && r.penerbit.toLowerCase().includes(search)) ||
            (r.catatan && r.catatan.toLowerCase().includes(search)) ||
            (r.kodeTanah && r.kodeTanah.toLowerCase().includes(search)) ||
            (r.jenisDokumen && r.jenisDokumen.toLowerCase().includes(search)) ||
            (r.status && r.status.toLowerCase().includes(search))
        );
      }

      const ringkasanStatus = statusDokumenValues.reduce((acc, curr) => {
        acc[curr] = list.filter((r) => r.status === curr).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        source: 'memory',
        count: list.length,
        ringkasanStatus,
        data: list,
      };
    },
    {
      query: t.Object({
        kodeTanah: t.Optional(t.String()),
        jenisDokumen: t.Optional(t.String()),
        status: t.Optional(t.String()),
        pihakId: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Legalitas Tanah'],
        summary:
          'Daftar Dokumen Legalitas Tanah dengan filter kode bidang, jenis dokumen, status, pihak, dan pencarian',
      },
    }
  )

  // 2. GET /api/legalitas-tanah/by-bidang/:kodeTanah - Retrieve all legalitas for a parcel
  .get(
    '/by-bidang/:kodeTanah',
    async ({ params: { kodeTanah } }) => {
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const rows = await db
            .select()
            .from(legalitasTanah)
            .where(eq(legalitasTanah.kodeTanah, kodeTanah))
            .orderBy(desc(legalitasTanah.createdAt));

          const ringkasanStatus = statusDokumenValues.reduce((acc, curr) => {
            acc[curr] = rows.filter((r) => r.status === curr).length;
            return acc;
          }, {} as Record<string, number>);

          return {
            success: true,
            source: 'database',
            kodeTanah,
            count: rows.length,
            ringkasanStatus,
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[LegalitasTanah] DB by-bidang error, fallback to memory:', dbErr.message);
        }
      }

      const rows = Array.from(inMemoryLegalitasStore.values())
        .filter((r) => r.kodeTanah === kodeTanah)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const ringkasanStatus = statusDokumenValues.reduce((acc, curr) => {
        acc[curr] = rows.filter((r) => r.status === curr).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        source: 'memory',
        kodeTanah,
        count: rows.length,
        ringkasanStatus,
        data: rows,
      };
    },
    {
      params: t.Object({
        kodeTanah: t.String(),
      }),
      detail: {
        tags: ['Legalitas Tanah'],
        summary: 'Ambil daftar dokumen legalitas berdasarkan kode bidang tanah',
      },
    }
  )

  // 3. GET /api/legalitas-tanah/:id - Retrieve detail of single legalitas
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID legalitas harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const rows = await db
            .select()
            .from(legalitasTanah)
            .where(eq(legalitasTanah.id, numericId))
            .limit(1);

          if (rows.length > 0) {
            return {
              success: true,
              source: 'database',
              data: rows[0],
            };
          }
        } catch (dbErr: any) {
          console.warn('[LegalitasTanah] DB get error, fallback to memory:', dbErr.message);
        }
      }

      const item = inMemoryLegalitasStore.get(numericId);
      if (!item) {
        set.status = 404;
        return {
          success: false,
          message: `Dokumen legalitas dengan ID '${id}' tidak ditemukan`,
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
        tags: ['Legalitas Tanah'],
        summary: 'Ambil detail dokumen legalitas berdasarkan ID',
      },
    }
  )

  // 4. POST /api/legalitas-tanah - Tambah data legalitas dokumen baru
  .post(
    '/',
    async ({ body, set }) => {
      const {
        kodeTanah,
        jenisDokumen,
        status,
        nomorDokumen,
        tanggalDokumen,
        penerbit,
        pihakId,
        catatan,
      } = body;

      if (!kodeTanah || kodeTanah.trim().length === 0) {
        set.status = 400;
        return {
          success: false,
          message: 'Bidang tanah (kodeTanah) wajib dipilih',
        };
      }

      if (!jenisDokumen || !jenisDokumenValues.includes(jenisDokumen as JenisDokumen)) {
        set.status = 400;
        return {
          success: false,
          message: `Jenis dokumen tidak valid. Pilihan: ${jenisDokumenValues.join(', ')}`,
        };
      }

      const validStatus = status || 'Belum Ada';
      if (!statusDokumenValues.includes(validStatus as StatusDokumen)) {
        set.status = 400;
        return {
          success: false,
          message: `Status dokumen tidak valid. Pilihan: ${statusDokumenValues.join(', ')}`,
        };
      }

      const now = new Date();
      let parsedTanggal: Date | null = null;
      if (tanggalDokumen) {
        const dt = new Date(tanggalDokumen);
        if (!isNaN(dt.getTime())) {
          parsedTanggal = dt;
        }
      }

      let parsedPihakId: number | null = null;
      if (pihakId !== undefined && pihakId !== null && pihakId !== '') {
        const num = Number(pihakId);
        if (!isNaN(num) && num > 0) {
          parsedPihakId = num;
        }
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [inserted] = await db
            .insert(legalitasTanah)
            .values({
              kodeTanah: kodeTanah.trim(),
              jenisDokumen: jenisDokumen.trim(),
              status: validStatus,
              nomorDokumen: nomorDokumen ? nomorDokumen.trim() : null,
              tanggalDokumen: parsedTanggal,
              penerbit: penerbit ? penerbit.trim() : null,
              pihakId: parsedPihakId,
              catatan: catatan ? catatan.trim() : null,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Dokumen legalitas tanah berhasil ditambahkan',
            data: inserted,
          };
        } catch (dbErr: any) {
          console.warn('[LegalitasTanah] DB insert error, fallback to memory:', dbErr.message);
        }
      }

      const newId = nextLegalitasId++;
      const newRecord: LegalitasTanah = {
        id: newId,
        kodeTanah: kodeTanah.trim(),
        jenisDokumen: jenisDokumen.trim(),
        status: validStatus,
        nomorDokumen: nomorDokumen ? nomorDokumen.trim() : null,
        tanggalDokumen: parsedTanggal,
        penerbit: penerbit ? penerbit.trim() : null,
        pihakId: parsedPihakId,
        catatan: catatan ? catatan.trim() : null,
        createdAt: now,
        updatedAt: now,
      };

      inMemoryLegalitasStore.set(newId, newRecord);

      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Dokumen legalitas tanah berhasil ditambahkan (memory)',
        data: newRecord,
      };
    },
    {
      body: t.Object({
        kodeTanah: t.String({ minLength: 1 }),
        jenisDokumen: t.String({ minLength: 1 }),
        status: t.Optional(t.String()),
        nomorDokumen: t.Optional(t.String()),
        tanggalDokumen: t.Optional(t.String()),
        penerbit: t.Optional(t.String()),
        pihakId: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Legalitas Tanah'],
        summary: 'Tambah data Dokumen Legalitas Tanah baru yang terhubung ke Bidang Tanah dan Pihak',
      },
    }
  )

  // 5. PUT /api/legalitas-tanah/:id - Update data legalitas dokumen
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID legalitas harus berupa angka numerik valid',
        };
      }

      const {
        kodeTanah,
        jenisDokumen,
        status,
        nomorDokumen,
        tanggalDokumen,
        penerbit,
        pihakId,
        catatan,
      } = body;
      const now = new Date();

      if (
        jenisDokumen !== undefined &&
        !jenisDokumenValues.includes(jenisDokumen as JenisDokumen)
      ) {
        set.status = 400;
        return {
          success: false,
          message: `Jenis dokumen tidak valid. Pilihan: ${jenisDokumenValues.join(', ')}`,
        };
      }

      if (
        status !== undefined &&
        !statusDokumenValues.includes(status as StatusDokumen)
      ) {
        set.status = 400;
        return {
          success: false,
          message: `Status dokumen tidak valid. Pilihan: ${statusDokumenValues.join(', ')}`,
        };
      }

      let parsedTanggal: Date | null | undefined = undefined;
      if (tanggalDokumen !== undefined) {
        if (!tanggalDokumen) {
          parsedTanggal = null;
        } else {
          const dt = new Date(tanggalDokumen);
          parsedTanggal = isNaN(dt.getTime()) ? null : dt;
        }
      }

      let parsedPihakId: number | null | undefined = undefined;
      if (pihakId !== undefined) {
        if (pihakId === null || pihakId === '') {
          parsedPihakId = null;
        } else {
          const num = Number(pihakId);
          parsedPihakId = isNaN(num) || num <= 0 ? null : num;
        }
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const updatePayload: Partial<NewLegalitasTanah> = {
            updatedAt: now,
          };

          if (kodeTanah !== undefined) updatePayload.kodeTanah = kodeTanah.trim();
          if (jenisDokumen !== undefined) updatePayload.jenisDokumen = jenisDokumen.trim();
          if (status !== undefined) updatePayload.status = status;
          if (nomorDokumen !== undefined)
            updatePayload.nomorDokumen = nomorDokumen ? nomorDokumen.trim() : null;
          if (parsedTanggal !== undefined) updatePayload.tanggalDokumen = parsedTanggal;
          if (penerbit !== undefined)
            updatePayload.penerbit = penerbit ? penerbit.trim() : null;
          if (parsedPihakId !== undefined) updatePayload.pihakId = parsedPihakId;
          if (catatan !== undefined)
            updatePayload.catatan = catatan ? catatan.trim() : null;

          const [updated] = await db
            .update(legalitasTanah)
            .set(updatePayload)
            .where(eq(legalitasTanah.id, numericId))
            .returning();

          if (updated) {
            return {
              success: true,
              source: 'database',
              message: 'Data dokumen legalitas berhasil diperbarui',
              data: updated,
            };
          }
        } catch (dbErr: any) {
          console.warn('[LegalitasTanah] DB update error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemoryLegalitasStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Dokumen legalitas dengan ID '${id}' tidak ditemukan`,
        };
      }

      const updatedRecord: LegalitasTanah = {
        ...existing,
        kodeTanah: kodeTanah !== undefined ? kodeTanah.trim() : existing.kodeTanah,
        jenisDokumen: jenisDokumen !== undefined ? jenisDokumen.trim() : existing.jenisDokumen,
        status: status !== undefined ? status : existing.status,
        nomorDokumen:
          nomorDokumen !== undefined
            ? nomorDokumen
              ? nomorDokumen.trim()
              : null
            : existing.nomorDokumen,
        tanggalDokumen:
          parsedTanggal !== undefined ? parsedTanggal : existing.tanggalDokumen,
        penerbit:
          penerbit !== undefined ? (penerbit ? penerbit.trim() : null) : existing.penerbit,
        pihakId: parsedPihakId !== undefined ? parsedPihakId : existing.pihakId,
        catatan: catatan !== undefined ? (catatan ? catatan.trim() : null) : existing.catatan,
        updatedAt: now,
      };

      inMemoryLegalitasStore.set(numericId, updatedRecord);

      return {
        success: true,
        source: 'memory',
        message: 'Data dokumen legalitas berhasil diperbarui (memory)',
        data: updatedRecord,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        kodeTanah: t.Optional(t.String()),
        jenisDokumen: t.Optional(t.String()),
        status: t.Optional(t.String()),
        nomorDokumen: t.Optional(t.String()),
        tanggalDokumen: t.Optional(t.String()),
        penerbit: t.Optional(t.String()),
        pihakId: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Legalitas Tanah'],
        summary: 'Update data dokumen legalitas tanah',
      },
    }
  )

  // 6. DELETE /api/legalitas-tanah/:id - Hapus legalitas dokumen
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        set.status = 400;
        return {
          success: false,
          message: 'ID legalitas harus berupa angka numerik valid',
        };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [deleted] = await db
            .delete(legalitasTanah)
            .where(eq(legalitasTanah.id, numericId))
            .returning();

          if (deleted) {
            return {
              success: true,
              source: 'database',
              message: `Dokumen legalitas ID '${id}' berhasil dihapus`,
              data: deleted,
            };
          }
        } catch (dbErr: any) {
          console.warn('[LegalitasTanah] DB delete error, fallback to memory:', dbErr.message);
        }
      }

      const existing = inMemoryLegalitasStore.get(numericId);
      if (!existing) {
        set.status = 404;
        return {
          success: false,
          message: `Dokumen legalitas dengan ID '${id}' tidak ditemukan`,
        };
      }

      inMemoryLegalitasStore.delete(numericId);

      return {
        success: true,
        source: 'memory',
        message: `Dokumen legalitas ID '${id}' berhasil dihapus (memory)`,
        data: existing,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Legalitas Tanah'],
        summary: 'Hapus data dokumen legalitas tanah berdasarkan ID',
      },
    }
  );
