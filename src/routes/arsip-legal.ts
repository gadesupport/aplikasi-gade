import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  arsipLegal,
  tipeRelasiArsipValues,
  statusFisikArsipValues,
  type ArsipLegal,
  type NewArsipLegal,
  type TipeRelasiArsip,
  type StatusFisikArsip,
  projects,
  lokasi,
  bidangTanah,
} from '../db/schema';

// In-memory fallback store
let nextArsipId = 4;
export const inMemoryArsipStore: Map<number, ArsipLegal> = new Map([
  [
    1,
    {
      id: 1,
      kodeArsip: 'ARS-2026-001',
      namaDokumen: 'Sertifikat Hak Milik No. 0123/Tapos',
      kategori: 'Pertanahan',
      jenisDokumen: 'SHM',
      nomorDokumen: 'SHM-0123-TPS-2024',
      tanggalDokumen: new Date('2024-05-12T00:00:00Z'),
      tipeRelasi: 'Bidang',
      idRelasi: 'BDG-001',
      lemari: 'Lemari A',
      rak: 'Rak 02',
      bantek: 'Bantek Legalitas 1',
      folderMap: 'Map Merah 04',
      statusFisik: 'Tersedia',
      catatan: 'Asli sertifikat tersimpan aman dalam bantek anti api.',
      createdAt: new Date('2026-01-10T08:00:00Z'),
      updatedAt: new Date('2026-01-10T08:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeArsip: 'ARS-2026-002',
      namaDokumen: 'Perjanjian Pengikatan Jual Beli (PPJB) Tahap 1',
      kategori: 'Perikatan',
      jenisDokumen: 'AJB / PPJB',
      nomorDokumen: 'PPJB/LGL/2026/088',
      tanggalDokumen: new Date('2026-01-18T00:00:00Z'),
      tipeRelasi: 'Project',
      idRelasi: 'PRJ-2026-001',
      lemari: 'Lemari B',
      rak: 'Rak 01',
      bantek: 'Bantek Proyek 2026',
      folderMap: 'Folder Biru 02',
      statusFisik: 'Dipinjam',
      catatan: 'Dipinjam oleh Tim Notaris untuk proses balik nama & validasi pajak.',
      createdAt: new Date('2026-01-20T09:30:00Z'),
      updatedAt: new Date('2026-02-14T11:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeArsip: 'ARS-2026-003',
      namaDokumen: 'Surat Keputusan KKPR Industri Terpadu',
      kategori: 'Perizinan',
      jenisDokumen: 'SK KKPR',
      nomorDokumen: '503/KKPR-DPMPTSP/2026',
      tanggalDokumen: new Date('2026-02-05T00:00:00Z'),
      tipeRelasi: 'Lokasi',
      idRelasi: 'LOK-001',
      lemari: 'Lemari C',
      rak: 'Rak 03',
      bantek: 'Bantek Izin & Tata Ruang',
      folderMap: 'Folder Kuning 01',
      statusFisik: 'Diarsipkan',
      catatan: 'Salinan legalisir dan berkas asli tersimpan di arsip pusat.',
      createdAt: new Date('2026-02-06T14:15:00Z'),
      updatedAt: new Date('2026-02-06T14:15:00Z'),
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

function calculateArsipSummary(items: ArsipLegal[]) {
  const total = items.length;
  let tersedia = 0;
  let dipinjam = 0;
  let hilang = 0;
  let diarsipkan = 0;

  for (const item of items) {
    if (item.statusFisik === 'Tersedia') tersedia++;
    else if (item.statusFisik === 'Dipinjam') dipinjam++;
    else if (item.statusFisik === 'Hilang') hilang++;
    else if (item.statusFisik === 'Diarsipkan') diarsipkan++;
  }

  return {
    total,
    tersedia,
    dipinjam,
    hilang,
    diarsipkan,
  };
}

export const arsipLegalRoutes = new Elysia({ prefix: '/api/arsip-legal' })
  // 1. GET /api/arsip-legal/options/relations - Ambil opsi referensi relasi
  .get(
    '/options/relations',
    async () => {
      const isDbUp = await checkDbConnection();
      let projectList: Array<{ kode: string; nama: string }> = [];
      let lokasiList: Array<{ kode: string; nama: string }> = [];
      let bidangList: Array<{ kode: string; nama: string }> = [];

      if (isDbUp) {
        try {
          const prjs = await db.select({ kode: projects.kodeProject, nama: projects.namaProject }).from(projects);
          projectList = prjs.map((p) => ({ kode: p.kode, nama: `${p.kode} - ${p.nama}` }));

          const loks = await db.select({ kode: lokasi.kodeLokasi, nama: lokasi.namaLokasi }).from(lokasi);
          lokasiList = loks.map((l) => ({ kode: l.kode, nama: `${l.kode} - ${l.nama}` }));

          const bdgs = await db.select({ kode: bidangTanah.kodeTanah, nama: bidangTanah.nomorBidang }).from(bidangTanah);
          bidangList = bdgs.map((b) => ({ kode: b.kode, nama: `${b.kode} (Bidang ${b.nama})` }));
        } catch (err: any) {
          console.warn('[Arsip Legal] Error fetching relation options from DB:', err.message);
        }
      }

      // Default mock if empty
      if (projectList.length === 0) {
        projectList = [
          { kode: 'PRJ-2026-001', nama: 'PRJ-2026-001 - Kawasan Industri Terpadu' },
          { kode: 'PRJ-2026-002', nama: 'PRJ-2026-002 - Depo Logistik Sentosa' },
        ];
      }
      if (lokasiList.length === 0) {
        lokasiList = [
          { kode: 'LOK-001', nama: 'LOK-001 - Lokasi Kawasan Timur' },
          { kode: 'LOK-002', nama: 'LOK-002 - Lokasi Kawasan Barat' },
        ];
      }
      if (bidangList.length === 0) {
        bidangList = [
          { kode: 'BDG-001', nama: 'BDG-001 (Bidang 01)' },
          { kode: 'BDG-002', nama: 'BDG-002 (Bidang 02)' },
        ];
      }

      return {
        success: true,
        data: {
          project: projectList,
          lokasi: lokasiList,
          bidang: bidangList,
        },
      };
    },
    {
      detail: {
        tags: ['Arsip Legal'],
        summary: 'Ambil daftar referensi relasi (Project, Lokasi, Bidang) untuk form arsip',
      },
    }
  )

  // 2. GET /api/arsip-legal - List all arsip with filters and summary
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const statusFisikFilter = query.statusFisik?.trim();
      const tipeRelasiFilter = query.tipeRelasi?.trim();
      const kategoriFilter = query.kategori?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db.select().from(arsipLegal).orderBy(desc(arsipLegal.createdAt));

          if (statusFisikFilter && statusFisikFilter !== 'Semua') {
            rows = rows.filter((r) => r.statusFisik === statusFisikFilter);
          }
          if (tipeRelasiFilter && tipeRelasiFilter !== 'Semua') {
            rows = rows.filter((r) => r.tipeRelasi === tipeRelasiFilter);
          }
          if (kategoriFilter && kategoriFilter !== 'Semua') {
            rows = rows.filter((r) => r.kategori.toLowerCase() === kategoriFilter.toLowerCase());
          }

          if (search) {
            rows = rows.filter(
              (r) =>
                (r.kodeArsip && r.kodeArsip.toLowerCase().includes(search)) ||
                (r.namaDokumen && r.namaDokumen.toLowerCase().includes(search)) ||
                (r.kategori && r.kategori.toLowerCase().includes(search)) ||
                (r.jenisDokumen && r.jenisDokumen.toLowerCase().includes(search)) ||
                (r.nomorDokumen && r.nomorDokumen.toLowerCase().includes(search)) ||
                (r.tipeRelasi && r.tipeRelasi.toLowerCase().includes(search)) ||
                (r.idRelasi && r.idRelasi.toLowerCase().includes(search)) ||
                (r.lemari && r.lemari.toLowerCase().includes(search)) ||
                (r.rak && r.rak.toLowerCase().includes(search)) ||
                (r.bantek && r.bantek.toLowerCase().includes(search)) ||
                (r.folderMap && r.folderMap.toLowerCase().includes(search)) ||
                (r.catatan && r.catatan.toLowerCase().includes(search))
            );
          }

          return {
            success: true,
            source: 'database',
            count: rows.length,
            summary: calculateArsipSummary(rows),
            data: rows,
          };
        } catch (dbErr: any) {
          console.warn('[Arsip Legal] DB list error, using memory fallback:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryArsipStore.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (statusFisikFilter && statusFisikFilter !== 'Semua') {
        list = list.filter((r) => r.statusFisik === statusFisikFilter);
      }
      if (tipeRelasiFilter && tipeRelasiFilter !== 'Semua') {
        list = list.filter((r) => r.tipeRelasi === tipeRelasiFilter);
      }
      if (kategoriFilter && kategoriFilter !== 'Semua') {
        list = list.filter((r) => r.kategori.toLowerCase() === kategoriFilter.toLowerCase());
      }

      if (search) {
        list = list.filter(
          (r) =>
            (r.kodeArsip && r.kodeArsip.toLowerCase().includes(search)) ||
            (r.namaDokumen && r.namaDokumen.toLowerCase().includes(search)) ||
            (r.kategori && r.kategori.toLowerCase().includes(search)) ||
            (r.jenisDokumen && r.jenisDokumen.toLowerCase().includes(search)) ||
            (r.nomorDokumen && r.nomorDokumen.toLowerCase().includes(search)) ||
            (r.tipeRelasi && r.tipeRelasi.toLowerCase().includes(search)) ||
            (r.idRelasi && r.idRelasi.toLowerCase().includes(search)) ||
            (r.lemari && r.lemari.toLowerCase().includes(search)) ||
            (r.rak && r.rak.toLowerCase().includes(search)) ||
            (r.bantek && r.bantek.toLowerCase().includes(search)) ||
            (r.folderMap && r.folderMap.toLowerCase().includes(search)) ||
            (r.catatan && r.catatan.toLowerCase().includes(search))
        );
      }

      return {
        success: true,
        source: 'memory',
        count: list.length,
        summary: calculateArsipSummary(list),
        data: list,
      };
    },
    {
      detail: {
        tags: ['Arsip Legal'],
        summary: 'Daftar semua arsip legal dengan filter pencarian, status fisik, tipe relasi & rekap statistik',
      },
      query: t.Object({
        search: t.Optional(t.String()),
        statusFisik: t.Optional(t.String()),
        tipeRelasi: t.Optional(t.String()),
        kategori: t.Optional(t.String()),
      }),
    }
  )

  // 3. GET /api/arsip-legal/:id - Detail single arsip
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const isDbUp = await checkDbConnection();
      const numId = parseInt(id, 10);

      if (isDbUp) {
        try {
          let found = null;
          if (!isNaN(numId)) {
            const res = await db.select().from(arsipLegal).where(eq(arsipLegal.id, numId)).limit(1);
            if (res.length > 0) found = res[0];
          }
          if (!found) {
            const res = await db.select().from(arsipLegal).where(eq(arsipLegal.kodeArsip, id)).limit(1);
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
          console.warn('[Arsip Legal] DB get error, using memory:', dbErr.message);
        }
      }

      let memFound: ArsipLegal | undefined;
      if (!isNaN(numId)) {
        memFound = inMemoryArsipStore.get(numId);
      }
      if (!memFound) {
        memFound = Array.from(inMemoryArsipStore.values()).find(
          (a) => a.kodeArsip.toLowerCase() === id.toLowerCase()
        );
      }

      if (!memFound) {
        set.status = 404;
        return {
          success: false,
          message: `Arsip Legal dengan ID atau Kode '${id}' tidak ditemukan`,
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
        tags: ['Arsip Legal'],
        summary: 'Ambil detail arsip legal berdasarkan ID atau Kode Arsip',
      },
    }
  )

  // 4. POST /api/arsip-legal - Tambah arsip legal baru
  .post(
    '/',
    async ({ body, set }) => {
      const {
        kodeArsip,
        namaDokumen,
        kategori,
        jenisDokumen,
        nomorDokumen,
        tanggalDokumen,
        tipeRelasi = 'Umum',
        idRelasi,
        lemari,
        rak,
        bantek,
        folderMap,
        statusFisik = 'Tersedia',
        catatan,
      } = body as any;

      if (
        !kodeArsip?.trim() ||
        !namaDokumen?.trim() ||
        !kategori?.trim() ||
        !jenisDokumen?.trim() ||
        !nomorDokumen?.trim() ||
        !tanggalDokumen
      ) {
        set.status = 400;
        return {
          success: false,
          message: 'Field kodeArsip, namaDokumen, kategori, jenisDokumen, nomorDokumen, dan tanggalDokumen wajib diisi',
        };
      }

      if (!tipeRelasiArsipValues.includes(tipeRelasi as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Tipe Relasi tidak valid. Pilihan: ${tipeRelasiArsipValues.join(', ')}`,
        };
      }

      if (statusFisik && !statusFisikArsipValues.includes(statusFisik as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Status Fisik tidak valid. Pilihan: ${statusFisikArsipValues.join(', ')}`,
        };
      }

      const parsedDate = new Date(tanggalDokumen);
      if (isNaN(parsedDate.getTime())) {
        set.status = 400;
        return {
          success: false,
          message: 'Format tanggalDokumen tidak valid',
        };
      }

      const validStatusFisik = (statusFisik as StatusFisikArsip) || 'Tersedia';
      const validTipeRelasi = (tipeRelasi as TipeRelasiArsip) || 'Umum';

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const existing = await db
            .select()
            .from(arsipLegal)
            .where(eq(arsipLegal.kodeArsip, kodeArsip.trim()))
            .limit(1);

          if (existing.length > 0) {
            set.status = 409;
            return {
              success: false,
              message: `Kode Arsip '${kodeArsip}' sudah digunakan`,
            };
          }

          const insertData: NewArsipLegal = {
            kodeArsip: kodeArsip.trim(),
            namaDokumen: namaDokumen.trim(),
            kategori: kategori.trim(),
            jenisDokumen: jenisDokumen.trim(),
            nomorDokumen: nomorDokumen.trim(),
            tanggalDokumen: parsedDate,
            tipeRelasi: validTipeRelasi,
            idRelasi: idRelasi?.trim() || null,
            lemari: lemari?.trim() || null,
            rak: rak?.trim() || null,
            bantek: bantek?.trim() || null,
            folderMap: folderMap?.trim() || null,
            statusFisik: validStatusFisik,
            catatan: catatan?.trim() || null,
          };

          const inserted = await db.insert(arsipLegal).values(insertData).returning();

          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Arsip Legal berhasil ditambahkan',
            data: inserted[0],
          };
        } catch (dbErr: any) {
          console.warn('[Arsip Legal] DB insert error, using memory fallback:', dbErr.message);
        }
      }

      // Memory fallback uniqueness check
      const existingMem = Array.from(inMemoryArsipStore.values()).find(
        (a) => a.kodeArsip.toLowerCase() === kodeArsip.trim().toLowerCase()
      );

      if (existingMem) {
        set.status = 409;
        return {
          success: false,
          message: `Kode Arsip '${kodeArsip}' sudah digunakan`,
        };
      }

      const newId = nextArsipId++;
      const newRecord: ArsipLegal = {
        id: newId,
        kodeArsip: kodeArsip.trim(),
        namaDokumen: namaDokumen.trim(),
        kategori: kategori.trim(),
        jenisDokumen: jenisDokumen.trim(),
        nomorDokumen: nomorDokumen.trim(),
        tanggalDokumen: parsedDate,
        tipeRelasi: validTipeRelasi,
        idRelasi: idRelasi?.trim() || null,
        lemari: lemari?.trim() || null,
        rak: rak?.trim() || null,
        bantek: bantek?.trim() || null,
        folderMap: folderMap?.trim() || null,
        statusFisik: validStatusFisik,
        catatan: catatan?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryArsipStore.set(newId, newRecord);

      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Arsip Legal berhasil ditambahkan (In-Memory)',
        data: newRecord,
      };
    },
    {
      detail: {
        tags: ['Arsip Legal'],
        summary: 'Tambah dokumen arsip legal baru beserta data lokasi fisik',
      },
      body: t.Object({
        kodeArsip: t.String(),
        namaDokumen: t.String(),
        kategori: t.String(),
        jenisDokumen: t.String(),
        nomorDokumen: t.String(),
        tanggalDokumen: t.String(),
        tipeRelasi: t.Optional(t.String()),
        idRelasi: t.Optional(t.String()),
        lemari: t.Optional(t.String()),
        rak: t.Optional(t.String()),
        bantek: t.Optional(t.String()),
        folderMap: t.Optional(t.String()),
        statusFisik: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  // 5. PUT /api/arsip-legal/:id - Update data arsip legal
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numId = parseInt(id, 10);
      const {
        kodeArsip,
        namaDokumen,
        kategori,
        jenisDokumen,
        nomorDokumen,
        tanggalDokumen,
        tipeRelasi,
        idRelasi,
        lemari,
        rak,
        bantek,
        folderMap,
        statusFisik,
        catatan,
      } = body as any;

      if (tipeRelasi && !tipeRelasiArsipValues.includes(tipeRelasi as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Tipe Relasi tidak valid. Pilihan: ${tipeRelasiArsipValues.join(', ')}`,
        };
      }

      if (statusFisik && !statusFisikArsipValues.includes(statusFisik as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Status Fisik tidak valid. Pilihan: ${statusFisikArsipValues.join(', ')}`,
        };
      }

      let parsedDate: Date | undefined;
      if (tanggalDokumen) {
        parsedDate = new Date(tanggalDokumen);
        if (isNaN(parsedDate.getTime())) {
          set.status = 400;
          return {
            success: false,
            message: 'Format tanggalDokumen tidak valid',
          };
        }
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let current = null;
          if (!isNaN(numId)) {
            const res = await db.select().from(arsipLegal).where(eq(arsipLegal.id, numId)).limit(1);
            if (res.length > 0) current = res[0];
          }
          if (!current) {
            const res = await db.select().from(arsipLegal).where(eq(arsipLegal.kodeArsip, id)).limit(1);
            if (res.length > 0) current = res[0];
          }

          if (!current) {
            set.status = 404;
            return {
              success: false,
              message: `Arsip Legal dengan ID atau Kode '${id}' tidak ditemukan`,
            };
          }

          // Uniqueness check if kodeArsip changed
          if (kodeArsip && kodeArsip.trim() !== current.kodeArsip) {
            const conflict = await db
              .select()
              .from(arsipLegal)
              .where(eq(arsipLegal.kodeArsip, kodeArsip.trim()))
              .limit(1);
            if (conflict.length > 0 && conflict[0].id !== current.id) {
              set.status = 409;
              return {
                success: false,
                message: `Kode Arsip '${kodeArsip}' sudah digunakan`,
              };
            }
          }

          const updatePayload: Partial<NewArsipLegal> & { updatedAt: Date } = {
            updatedAt: new Date(),
          };

          if (kodeArsip) updatePayload.kodeArsip = kodeArsip.trim();
          if (namaDokumen) updatePayload.namaDokumen = namaDokumen.trim();
          if (kategori) updatePayload.kategori = kategori.trim();
          if (jenisDokumen) updatePayload.jenisDokumen = jenisDokumen.trim();
          if (nomorDokumen) updatePayload.nomorDokumen = nomorDokumen.trim();
          if (parsedDate) updatePayload.tanggalDokumen = parsedDate;
          if (tipeRelasi) updatePayload.tipeRelasi = tipeRelasi;
          if (idRelasi !== undefined) updatePayload.idRelasi = idRelasi?.trim() || null;
          if (lemari !== undefined) updatePayload.lemari = lemari?.trim() || null;
          if (rak !== undefined) updatePayload.rak = rak?.trim() || null;
          if (bantek !== undefined) updatePayload.bantek = bantek?.trim() || null;
          if (folderMap !== undefined) updatePayload.folderMap = folderMap?.trim() || null;
          if (statusFisik) updatePayload.statusFisik = statusFisik;
          if (catatan !== undefined) updatePayload.catatan = catatan?.trim() || null;

          const updated = await db
            .update(arsipLegal)
            .set(updatePayload)
            .where(eq(arsipLegal.id, current.id))
            .returning();

          return {
            success: true,
            source: 'database',
            message: 'Arsip Legal berhasil diperbarui',
            data: updated[0],
          };
        } catch (dbErr: any) {
          console.warn('[Arsip Legal] DB update error, using memory fallback:', dbErr.message);
        }
      }

      // Memory fallback
      let existingRecord: ArsipLegal | undefined;
      let targetKey: number | undefined;

      if (!isNaN(numId) && inMemoryArsipStore.has(numId)) {
        targetKey = numId;
        existingRecord = inMemoryArsipStore.get(numId);
      } else {
        for (const [k, a] of inMemoryArsipStore.entries()) {
          if (a.kodeArsip.toLowerCase() === id.toLowerCase()) {
            targetKey = k;
            existingRecord = a;
            break;
          }
        }
      }

      if (!existingRecord || targetKey === undefined) {
        set.status = 404;
        return {
          success: false,
          message: `Arsip Legal dengan ID atau Kode '${id}' tidak ditemukan`,
        };
      }

      if (kodeArsip && kodeArsip.trim().toLowerCase() !== existingRecord.kodeArsip.toLowerCase()) {
        const conflict = Array.from(inMemoryArsipStore.values()).find(
          (a) => a.id !== existingRecord!.id && a.kodeArsip.toLowerCase() === kodeArsip.trim().toLowerCase()
        );
        if (conflict) {
          set.status = 409;
          return {
            success: false,
            message: `Kode Arsip '${kodeArsip}' sudah digunakan oleh arsip lain`,
          };
        }
      }

      const updatedRecord: ArsipLegal = {
        ...existingRecord,
        kodeArsip: kodeArsip ? kodeArsip.trim() : existingRecord.kodeArsip,
        namaDokumen: namaDokumen ? namaDokumen.trim() : existingRecord.namaDokumen,
        kategori: kategori ? kategori.trim() : existingRecord.kategori,
        jenisDokumen: jenisDokumen ? jenisDokumen.trim() : existingRecord.jenisDokumen,
        nomorDokumen: nomorDokumen ? nomorDokumen.trim() : existingRecord.nomorDokumen,
        tanggalDokumen: parsedDate ? parsedDate : existingRecord.tanggalDokumen,
        tipeRelasi: tipeRelasi ? (tipeRelasi as TipeRelasiArsip) : existingRecord.tipeRelasi,
        idRelasi: idRelasi !== undefined ? (idRelasi?.trim() || null) : existingRecord.idRelasi,
        lemari: lemari !== undefined ? (lemari?.trim() || null) : existingRecord.lemari,
        rak: rak !== undefined ? (rak?.trim() || null) : existingRecord.rak,
        bantek: bantek !== undefined ? (bantek?.trim() || null) : existingRecord.bantek,
        folderMap: folderMap !== undefined ? (folderMap?.trim() || null) : existingRecord.folderMap,
        statusFisik: statusFisik ? (statusFisik as StatusFisikArsip) : existingRecord.statusFisik,
        catatan: catatan !== undefined ? (catatan?.trim() || null) : existingRecord.catatan,
        updatedAt: new Date(),
      };

      inMemoryArsipStore.set(targetKey, updatedRecord);

      return {
        success: true,
        source: 'memory',
        message: 'Arsip Legal berhasil diperbarui (In-Memory)',
        data: updatedRecord,
      };
    },
    {
      detail: {
        tags: ['Arsip Legal'],
        summary: 'Update data arsip legal berdasarkan ID atau Kode Arsip',
      },
      body: t.Object({
        kodeArsip: t.Optional(t.String()),
        namaDokumen: t.Optional(t.String()),
        kategori: t.Optional(t.String()),
        jenisDokumen: t.Optional(t.String()),
        nomorDokumen: t.Optional(t.String()),
        tanggalDokumen: t.Optional(t.String()),
        tipeRelasi: t.Optional(t.String()),
        idRelasi: t.Optional(t.String()),
        lemari: t.Optional(t.String()),
        rak: t.Optional(t.String()),
        bantek: t.Optional(t.String()),
        folderMap: t.Optional(t.String()),
        statusFisik: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  // 6. DELETE /api/arsip-legal/:id - Hapus data arsip legal
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numId = parseInt(id, 10);
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let current = null;
          if (!isNaN(numId)) {
            const res = await db.select().from(arsipLegal).where(eq(arsipLegal.id, numId)).limit(1);
            if (res.length > 0) current = res[0];
          }
          if (!current) {
            const res = await db.select().from(arsipLegal).where(eq(arsipLegal.kodeArsip, id)).limit(1);
            if (res.length > 0) current = res[0];
          }

          if (!current) {
            set.status = 404;
            return {
              success: false,
              message: `Arsip Legal dengan ID atau Kode '${id}' tidak ditemukan`,
            };
          }

          await db.delete(arsipLegal).where(eq(arsipLegal.id, current.id));

          return {
            success: true,
            source: 'database',
            message: `Arsip Legal '${current.namaDokumen}' (${current.kodeArsip}) berhasil dihapus`,
          };
        } catch (dbErr: any) {
          console.warn('[Arsip Legal] DB delete error, using memory fallback:', dbErr.message);
        }
      }

      // Memory fallback
      let targetKey: number | undefined;
      let foundRecord: ArsipLegal | undefined;

      if (!isNaN(numId) && inMemoryArsipStore.has(numId)) {
        targetKey = numId;
        foundRecord = inMemoryArsipStore.get(numId);
      } else {
        for (const [k, a] of inMemoryArsipStore.entries()) {
          if (a.kodeArsip.toLowerCase() === id.toLowerCase()) {
            targetKey = k;
            foundRecord = a;
            break;
          }
        }
      }

      if (!foundRecord || targetKey === undefined) {
        set.status = 404;
        return {
          success: false,
          message: `Arsip Legal dengan ID atau Kode '${id}' tidak ditemukan`,
        };
      }

      inMemoryArsipStore.delete(targetKey);

      return {
        success: true,
        source: 'memory',
        message: `Arsip Legal '${foundRecord.namaDokumen}' (${foundRecord.kodeArsip}) berhasil dihapus`,
      };
    },
    {
      detail: {
        tags: ['Arsip Legal'],
        summary: 'Hapus data arsip legal berdasarkan ID atau Kode Arsip',
      },
    }
  );
