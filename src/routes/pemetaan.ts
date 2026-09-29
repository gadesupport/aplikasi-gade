import { Elysia, t } from 'elysia';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  kkpr,
  bidangTanah,
  lokasi,
  pembebasan,
  pihak,
  statusKkprValues,
  kategoriKkprValues,
  type Kkpr,
  type NewKkpr,
  type StatusKkpr,
  type KategoriKkpr,
} from '../db/schema';
import {
  createShapefileZip,
  exportToKML,
  parseKMLToGeoJSON,
  parseShapefileZip,
  type GeoJsonFeatureCollection,
  type GeoJsonFeature,
} from '../utils/shapefile';

// In-memory fallback for KKPR
let nextKkprId = 3;
const inMemoryKkprStore: Map<number, Kkpr> = new Map([
  [
    1,
    {
      id: 1,
      kodeKkpr: 'KKPR-2026-001',
      namaKegiatan: 'Rencana Perluasan Kawasan Logistik & Pergudangan Gade',
      pemohon: 'PT Gade Graha Logistik',
      nomorIzin: 'OSS-KKPR-91203912019',
      kategori: 'Industri & Pergudangan',
      luasRencana: '12500.00',
      status: 'Disetujui',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.8290, -6.4145],
            [106.8340, -6.4145],
            [106.8340, -6.4175],
            [106.8290, -6.4175],
            [106.8290, -6.4145],
          ],
        ],
      },
      catatan: 'Telah disetujui tata ruang OSS RBA dan sinkron dengan RTRW Kab. Bogor',
      createdAt: new Date('2026-02-15T09:00:00Z'),
      updatedAt: new Date('2026-02-15T09:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeKkpr: 'KKPR-2026-002',
      namaKegiatan: 'Perencanaan Fasilitas Infrastruktur Koridor Akses Masuk',
      pemohon: 'Dinas Bina Marga & Mitra',
      nomorIzin: 'OSS-KKPR-91203912022',
      kategori: 'Infrastruktur & Utilitas',
      luasRencana: '4800.00',
      status: 'Ditinjau',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.8275, -6.4178],
            [106.8315, -6.4178],
            [106.8315, -6.4190],
            [106.8275, -6.4190],
            [106.8275, -6.4178],
          ],
        ],
      },
      catatan: 'Dokumen telaah teknis sedang diverifikasi di Dinas PUPR',
      createdAt: new Date('2026-03-01T10:00:00Z'),
      updatedAt: new Date('2026-03-01T10:00:00Z'),
    },
  ],
]);

// Helper to check DB connectivity with caching and quick timeout
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


// Fallback lookup metadata for parcels
const fallbackParcels: Record<string, any> = {
  'BDT-2026-001': {
    kodeTanah: 'BDT-2026-001',
    kodeLokasi: 'LOK-2026-001',
    nomorBidang: '001/SKM/2026',
    luas: '3000.00',
    jenisHak: 'SHM',
    statusPembebasan: 'Selesai',
    hargaKesepakatan: '4200000000.00',
    totalBayar: 2500000000.00,
    statusBayar: 'Parsial',
    pemilik: 'H. Mansur Syah',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [106.8295, -6.4150],
          [106.8315, -6.4150],
          [106.8315, -6.4168],
          [106.8295, -6.4168],
          [106.8295, -6.4150],
        ],
      ],
    },
  },
  'BDT-2026-002': {
    kodeTanah: 'BDT-2026-002',
    kodeLokasi: 'LOK-2026-001',
    nomorBidang: '002/SKM/2026',
    luas: '1500.00',
    jenisHak: 'AJB',
    statusPembebasan: 'Deal',
    hargaKesepakatan: '1800000000.00',
    totalBayar: 0,
    statusBayar: 'Belum Bayar',
    pemilik: 'Siti Rohmah & Ahli Waris',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [106.8318, -6.4150],
          [106.8335, -6.4150],
          [106.8335, -6.4165],
          [106.8318, -6.4165],
          [106.8318, -6.4150],
        ],
      ],
    },
  },
  'BDT-2026-003': {
    kodeTanah: 'BDT-2026-003',
    kodeLokasi: 'LOK-2026-001',
    nomorBidang: '003/SKM/2026',
    luas: '2200.00',
    jenisHak: 'Girik',
    statusPembebasan: 'Selesai',
    hargaKesepakatan: '2200000000.00',
    totalBayar: 2200000000.00,
    statusBayar: 'Lunas',
    pemilik: 'Bambang Soedjarwo',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [106.8295, -6.4170],
          [106.8325, -6.4170],
          [106.8325, -6.4185],
          [106.8295, -6.4185],
          [106.8295, -6.4170],
        ],
      ],
    },
  },
};

const fallbackLocations: Record<string, any> = {
  'LOK-2026-001': {
    kodeLokasi: 'LOK-2026-001',
    namaLokasi: 'Kawasan Pengembangan Pergudangan Terpadu Cibinong',
    desa: 'Sukahati',
    kecamatan: 'Cibinong',
    kabupaten: 'Bogor',
    luasTarget: '50000.00',
    luasInduk: '50000.00',
    totalLuasBidang: '6700.00',
    sisaLuas: '43300.00',
    status: 'Proses Pembahasan',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [106.8270, -6.4135],
          [106.8355, -6.4135],
          [106.8355, -6.4195],
          [106.8270, -6.4195],
          [106.8270, -6.4135],
        ],
      ],
    },
  },
};

export const pemetaanRoutes = new Elysia({ prefix: '/api/pemetaan' })
  /**
   * 1. GET /api/pemetaan/layers
   * Retrieves all spatial layers (Induk, Bidang Tanah with payment status, and KKPR)
   */
  .get('/layers', async ({ query }) => {
    const isDbConnected = await checkDbConnection();
    const kodeLokasiFilter = query?.kodeLokasi;

    let indukList: any[] = [];
    let bidangList: any[] = [];
    let kkprList: any[] = [];

    if (isDbConnected) {
      try {
        // 1. Fetch Induk (Lokasi)
        indukList = await db.select().from(lokasi);

        // 2. Fetch Bidang Tanah
        bidangList = await db.select().from(bidangTanah);

        // Fetch Pembebasan payments to calculate payment status per bidang
        const payments = await db.select().from(pembebasan);
        const owners = await db.select().from(pihak);

        const paymentSummaryMap = new Map<string, number>();
        for (const p of payments) {
          if (p.status === 'Lunas') {
            const current = paymentSummaryMap.get(p.kodeTanah) || 0;
            paymentSummaryMap.set(p.kodeTanah, current + parseFloat(p.jumlahPembayaran || '0'));
          }
        }

        const ownersMap = new Map<string, string>();
        for (const o of owners) {
          if (!ownersMap.has(o.kodeTanah)) {
            ownersMap.set(o.kodeTanah, o.nama);
          }
        }

        // Enrich Bidang with payment status
        bidangList = bidangList.map(b => {
          const totalBayar = paymentSummaryMap.get(b.kodeTanah) || 0;
          const hargaDeal = parseFloat(b.hargaKesepakatan || '0');
          let statusBayar: 'Lunas' | 'Parsial' | 'Belum Bayar' | 'Belum Deal' = 'Belum Deal';

          if (hargaDeal > 0) {
            if (totalBayar >= hargaDeal) {
              statusBayar = 'Lunas';
            } else if (totalBayar > 0) {
              statusBayar = 'Parsial';
            } else {
              statusBayar = 'Belum Bayar';
            }
          } else if (totalBayar > 0) {
            statusBayar = 'Parsial';
          }

          return {
            ...b,
            totalBayar,
            statusBayar,
            pemilik: ownersMap.get(b.kodeTanah) || 'Belum Terdata',
          };
        });

        // 3. Fetch KKPR
        kkprList = await db.select().from(kkpr).orderBy(desc(kkpr.createdAt));
      } catch (e) {
        console.warn('DB fetch in /layers failed, falling back to in-memory store:', e);
        indukList = Object.values(fallbackLocations);
        bidangList = Object.values(fallbackParcels);
        kkprList = Array.from(inMemoryKkprStore.values());
      }
    } else {
      indukList = Object.values(fallbackLocations);
      bidangList = Object.values(fallbackParcels);
      kkprList = Array.from(inMemoryKkprStore.values());
    }

    if (kodeLokasiFilter && kodeLokasiFilter !== 'Semua') {
      indukList = indukList.filter(l => l.kodeLokasi === kodeLokasiFilter);
      bidangList = bidangList.filter(b => b.kodeLokasi === kodeLokasiFilter);
    }

    // Build GeoJSON FeatureCollections for each layer
    const indukFeatures: GeoJsonFeature[] = indukList
      .filter(l => l.geojson && l.geojson.coordinates)
      .map(l => ({
        type: 'Feature',
        geometry: l.geojson,
        properties: {
          layerType: 'induk',
          kodeLokasi: l.kodeLokasi,
          namaLokasi: l.namaLokasi,
          desa: l.desa,
          kecamatan: l.kecamatan,
          kabupaten: l.kabupaten,
          luasInduk: l.luasInduk || l.luasTarget,
          totalLuasBidang: l.totalLuasBidang,
          sisaLuas: l.sisaLuas,
          status: l.status,
          fillColor: '#10b981',
          strokeColor: '#059669',
        },
      }));

    const bidangFeatures: GeoJsonFeature[] = bidangList
      .filter(b => b.geojson && b.geojson.coordinates)
      .map(b => {
        let statusColor = '#ef4444'; // Belum Bayar (Merah)
        if (b.statusBayar === 'Lunas') statusColor = '#10b981'; // Lunas (Hijau)
        else if (b.statusBayar === 'Parsial') statusColor = '#f59e0b'; // Parsial (Kuning/Oranye)
        else if (b.statusBayar === 'Belum Deal') statusColor = '#64748b'; // Belum Deal (Abu-abu)

        return {
          type: 'Feature',
          geometry: b.geojson,
          properties: {
            layerType: 'bidang',
            kodeTanah: b.kodeTanah,
            kodeLokasi: b.kodeLokasi,
            nomorBidang: b.nomorBidang,
            luas: b.luas,
            jenisHak: b.jenisHak,
            statusPembebasan: b.statusPembebasan,
            hargaKesepakatan: b.hargaKesepakatan,
            totalBayar: b.totalBayar,
            statusBayar: b.statusBayar,
            pemilik: b.pemilik,
            catatan: b.catatan,
            fillColor: statusColor,
            strokeColor: statusColor,
          },
        };
      });

    const kkprFeatures: GeoJsonFeature[] = kkprList
      .filter(k => k.geojson && k.geojson.coordinates)
      .map(k => ({
        type: 'Feature',
        geometry: k.geojson,
        properties: {
          layerType: 'kkpr',
          id: k.id,
          kodeKkpr: k.kodeKkpr,
          namaKegiatan: k.namaKegiatan,
          pemohon: k.pemohon,
          nomorIzin: k.nomorIzin,
          kategori: k.kategori,
          luasRencana: k.luasRencana,
          status: k.status,
          catatan: k.catatan,
          fillColor: '#8b5cf6', // Ungu / Violet untuk KKPR
          strokeColor: '#6d28d9',
        },
      }));

    return {
      success: true,
      timestamp: new Date().toISOString(),
      layers: {
        induk: {
          type: 'FeatureCollection',
          features: indukFeatures,
          total: indukFeatures.length,
        },
        bidang: {
          type: 'FeatureCollection',
          features: bidangFeatures,
          total: bidangFeatures.length,
          rekapStatusBayar: {
            lunas: bidangFeatures.filter(f => f.properties?.statusBayar === 'Lunas').length,
            parsial: bidangFeatures.filter(f => f.properties?.statusBayar === 'Parsial').length,
            belumBayar: bidangFeatures.filter(f => f.properties?.statusBayar === 'Belum Bayar').length,
            belumDeal: bidangFeatures.filter(f => f.properties?.statusBayar === 'Belum Deal').length,
          },
        },
        kkpr: {
          type: 'FeatureCollection',
          features: kkprFeatures,
          total: kkprFeatures.length,
        },
      },
      summary: {
        totalPolygons: indukFeatures.length + bidangFeatures.length + kkprFeatures.length,
        totalInduk: indukFeatures.length,
        totalBidang: bidangFeatures.length,
        totalKkpr: kkprFeatures.length,
      },
    };
  })

  /**
   * 2. KKPR CRUD Endpoints
   */
  .get('/kkpr', async ({ query }) => {
    const isDbConnected = await checkDbConnection();
    let records: Kkpr[] = [];

    if (isDbConnected) {
      try {
        records = await db.select().from(kkpr).orderBy(desc(kkpr.createdAt));
      } catch {
        records = Array.from(inMemoryKkprStore.values());
      }
    } else {
      records = Array.from(inMemoryKkprStore.values());
    }

    if (query?.search) {
      const q = String(query.search).toLowerCase();
      records = records.filter(
        r =>
          r.kodeKkpr.toLowerCase().includes(q) ||
          r.namaKegiatan.toLowerCase().includes(q) ||
          (r.pemohon && r.pemohon.toLowerCase().includes(q)) ||
          (r.nomorIzin && r.nomorIzin.toLowerCase().includes(q))
      );
    }

    if (query?.status && query.status !== 'Semua') {
      records = records.filter(r => r.status === query.status);
    }

    if (query?.kategori && query.kategori !== 'Semua') {
      records = records.filter(r => r.kategori === query.kategori);
    }

    return {
      success: true,
      data: records,
      total: records.length,
    };
  })

  .post(
    '/kkpr',
    async ({ body, set }) => {
      const isDbConnected = await checkDbConnection();
      const now = new Date();

      if (!body.kodeKkpr || !body.namaKegiatan) {
        set.status = 400;
        return { success: false, message: 'kodeKkpr dan namaKegiatan wajib diisi' };
      }

      const newRecord: Kkpr = {
        id: nextKkprId++,
        kodeKkpr: body.kodeKkpr,
        namaKegiatan: body.namaKegiatan,
        pemohon: body.pemohon || null,
        nomorIzin: body.nomorIzin || null,
        kategori: body.kategori || 'Industri & Pergudangan',
        luasRencana: body.luasRencana ? String(body.luasRencana) : '0',
        status: body.status || 'Draft',
        geojson: body.geojson || null,
        catatan: body.catatan || null,
        createdAt: now,
        updatedAt: now,
      };

      if (isDbConnected) {
        try {
          const inserted = await db.insert(kkpr).values(newRecord).returning();
          set.status = 201;
          return { success: true, data: inserted[0], message: 'Data KKPR berhasil ditambahkan' };
        } catch (err: any) {
          console.warn('DB insert failed, falling back to in-memory store:', err);
          inMemoryKkprStore.set(newRecord.id, newRecord);
          set.status = 201;
          return { success: true, data: newRecord, message: 'Data KKPR disimpan (in-memory mode)' };
        }
      } else {
        inMemoryKkprStore.set(newRecord.id, newRecord);
        set.status = 201;
        return { success: true, data: newRecord, message: 'Data KKPR disimpan (in-memory mode)' };
      }
    },
    {
      body: t.Object({
        kodeKkpr: t.String(),
        namaKegiatan: t.String(),
        pemohon: t.Optional(t.String()),
        nomorIzin: t.Optional(t.String()),
        kategori: t.Optional(t.String()),
        luasRencana: t.Optional(t.Any()),
        status: t.Optional(t.String()),
        geojson: t.Optional(t.Any()),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  .get('/kkpr/:id', async ({ params, set }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      set.status = 400;
      return { success: false, message: 'ID KKPR tidak valid' };
    }

    const isDbConnected = await checkDbConnection();
    if (isDbConnected) {
      try {
        const rows = await db.select().from(kkpr).where(eq(kkpr.id, id));
        if (rows.length > 0) {
          return { success: true, data: rows[0] };
        }
      } catch (e) {
        console.warn('DB error, using fallback:', e);
      }
    }

    const item = inMemoryKkprStore.get(id);
    if (!item) {
      set.status = 404;
      return { success: false, message: 'Data KKPR tidak ditemukan' };
    }
    return { success: true, data: item };
  })

  .put(
    '/kkpr/:id',
    async ({ params, body, set }) => {
      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { success: false, message: 'ID KKPR tidak valid' };
      }

      const isDbConnected = await checkDbConnection();
      const now = new Date();

      if (isDbConnected) {
        try {
          const updated = await db
            .update(kkpr)
            .set({
              ...(body.kodeKkpr && { kodeKkpr: body.kodeKkpr }),
              ...(body.namaKegiatan && { namaKegiatan: body.namaKegiatan }),
              ...(body.pemohon !== undefined && { pemohon: body.pemohon }),
              ...(body.nomorIzin !== undefined && { nomorIzin: body.nomorIzin }),
              ...(body.kategori && { kategori: body.kategori as any }),
              ...(body.luasRencana !== undefined && { luasRencana: String(body.luasRencana) }),
              ...(body.status && { status: body.status as any }),
              ...(body.geojson !== undefined && { geojson: body.geojson }),
              ...(body.catatan !== undefined && { catatan: body.catatan }),
              updatedAt: now,
            })
            .where(eq(kkpr.id, id))
            .returning();

          if (updated.length > 0) {
            return { success: true, data: updated[0], message: 'Data KKPR berhasil diperbarui' };
          }
        } catch (e) {
          console.warn('DB update failed, using in-memory fallback:', e);
        }
      }

      const existing = inMemoryKkprStore.get(id);
      if (!existing) {
        set.status = 404;
        return { success: false, message: 'Data KKPR tidak ditemukan' };
      }

      const updatedRecord: Kkpr = {
        ...existing,
        ...(body.kodeKkpr && { kodeKkpr: body.kodeKkpr }),
        ...(body.namaKegiatan && { namaKegiatan: body.namaKegiatan }),
        ...(body.pemohon !== undefined && { pemohon: body.pemohon }),
        ...(body.nomorIzin !== undefined && { nomorIzin: body.nomorIzin }),
        ...(body.kategori && { kategori: body.kategori as any }),
        ...(body.luasRencana !== undefined && { luasRencana: String(body.luasRencana) }),
        ...(body.status && { status: body.status as any }),
        ...(body.geojson !== undefined && { geojson: body.geojson }),
        ...(body.catatan !== undefined && { catatan: body.catatan }),
        updatedAt: now,
      };

      inMemoryKkprStore.set(id, updatedRecord);
      return { success: true, data: updatedRecord, message: 'Data KKPR berhasil diperbarui' };
    },
    {
      body: t.Object({
        kodeKkpr: t.Optional(t.String()),
        namaKegiatan: t.Optional(t.String()),
        pemohon: t.Optional(t.String()),
        nomorIzin: t.Optional(t.String()),
        kategori: t.Optional(t.String()),
        luasRencana: t.Optional(t.Any()),
        status: t.Optional(t.String()),
        geojson: t.Optional(t.Any()),
        catatan: t.Optional(t.String()),
      }),
    }
  )

  .delete('/kkpr/:id', async ({ params, set }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      set.status = 400;
      return { success: false, message: 'ID KKPR tidak valid' };
    }

    const isDbConnected = await checkDbConnection();
    if (isDbConnected) {
      try {
        await db.delete(kkpr).where(eq(kkpr.id, id));
        return { success: true, message: 'Data KKPR berhasil dihapus' };
      } catch (e) {
        console.warn('DB delete failed, using in-memory store:', e);
      }
    }

    if (!inMemoryKkprStore.has(id)) {
      set.status = 404;
      return { success: false, message: 'Data KKPR tidak ditemukan' };
    }
    inMemoryKkprStore.delete(id);
    return { success: true, message: 'Data KKPR berhasil dihapus' };
  })

  /**
   * 3. PATCH /api/pemetaan/polygon
   * Updates polygon boundary of a target layer entity (bidang, lokasi, or kkpr) directly from GIS editor
   */
  .patch(
    '/polygon',
    async ({ body, set }) => {
      const { target, id, geojson, luas } = body;
      const isDbConnected = await checkDbConnection();

      if (!target || !id) {
        set.status = 400;
        return { success: false, message: 'target (bidang|lokasi|kkpr) dan id wajib diisi' };
      }

      if (target === 'bidang') {
        if (isDbConnected) {
          try {
            await db
              .update(bidangTanah)
              .set({
                geojson,
                ...(luas ? { luas: String(luas) } : {}),
                updatedAt: new Date(),
              })
              .where(eq(bidangTanah.kodeTanah, String(id)));
          } catch (e) {
            console.warn('DB update polygon bidang failed:', e);
          }
        }
        if (fallbackParcels[String(id)]) {
          fallbackParcels[String(id)].geojson = geojson;
          if (luas) fallbackParcels[String(id)].luas = String(luas);
        }
        return { success: true, message: `Batas polygon bidang '${id}' berhasil diperbarui` };
      }

      if (target === 'lokasi') {
        if (isDbConnected) {
          try {
            await db
              .update(lokasi)
              .set({
                geojson,
                ...(luas ? { luasInduk: String(luas) } : {}),
                updatedAt: new Date(),
              })
              .where(eq(lokasi.kodeLokasi, String(id)));
          } catch (e) {
            console.warn('DB update polygon lokasi failed:', e);
          }
        }
        if (fallbackLocations[String(id)]) {
          fallbackLocations[String(id)].geojson = geojson;
          if (luas) fallbackLocations[String(id)].luasInduk = String(luas);
        }
        return { success: true, message: `Batas polygon lokasi induk '${id}' berhasil diperbarui` };
      }

      if (target === 'kkpr') {
        const numId = parseInt(String(id), 10);
        if (isDbConnected && !isNaN(numId)) {
          try {
            await db
              .update(kkpr)
              .set({
                geojson,
                ...(luas ? { luasRencana: String(luas) } : {}),
                updatedAt: new Date(),
              })
              .where(eq(kkpr.id, numId));
          } catch (e) {
            console.warn('DB update polygon kkpr failed:', e);
          }
        }
        if (inMemoryKkprStore.has(numId)) {
          const item = inMemoryKkprStore.get(numId)!;
          item.geojson = geojson;
          if (luas) item.luasRencana = String(luas);
          item.updatedAt = new Date();
        }
        return { success: true, message: `Polygon perencanaan KKPR berhasil diperbarui` };
      }

      set.status = 400;
      return { success: false, message: 'Target layer tidak valid (harus: bidang, lokasi, atau kkpr)' };
    },
    {
      body: t.Object({
        target: t.String(),
        id: t.Any(),
        geojson: t.Any(),
        luas: t.Optional(t.Any()),
      }),
    }
  )

  /**
   * 4. POST /api/pemetaan/import
   * Imports GeoJSON, KML string, or Shapefile ZIP into specified layer category
   */
  .post(
    '/import',
    async ({ body, set }) => {
      const { format, layerCategory, content, fileName } = body;

      if (!content) {
        set.status = 400;
        return { success: false, message: 'Konten file yang diunggah tidak boleh kosong' };
      }

      let parsedGeoJson: GeoJsonFeatureCollection;

      try {
        if (format === 'kml') {
          parsedGeoJson = parseKMLToGeoJSON(content);
        } else if (format === 'shp') {
          const zipBuffer = Buffer.from(content, 'base64');
          parsedGeoJson = await parseShapefileZip(zipBuffer);
        } else {
          // Default: GeoJSON format
          parsedGeoJson = typeof content === 'string' ? JSON.parse(content) : content;
          if (parsedGeoJson.type === 'Feature') {
            parsedGeoJson = {
              type: 'FeatureCollection',
              features: [parsedGeoJson as any],
            };
          }
        }
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: `Gagal membaca format data: ${err.message}` };
      }

      const features = parsedGeoJson.features || [];
      if (features.length === 0) {
        set.status = 400;
        return { success: false, message: 'Tidak ada objek polygon valid yang ditemukan dalam file' };
      }

      // If user selected KKPR layer, auto-create KKPR record for the features
      const importedRecords: any[] = [];
      if (layerCategory === 'kkpr') {
        for (let i = 0; i < features.length; i++) {
          const f = features[i];
          const code = `KKPR-IMP-${Date.now().toString().slice(-4)}-${i + 1}`;
          const newK: Kkpr = {
            id: nextKkprId++,
            kodeKkpr: code,
            namaKegiatan: f.properties?.name || f.properties?.kegiatan || `Import KKPR (${fileName || 'File'}) #${i + 1}`,
            pemohon: f.properties?.pemohon || 'Pemohon Hasil Import',
            nomorIzin: f.properties?.nomorIzin || 'OSS-IMPORT-' + code,
            kategori: 'Industri & Pergudangan',
            luasRencana: f.properties?.luas ? String(f.properties.luas) : '0',
            status: 'Draft',
            geojson: f.geometry,
            catatan: `Diimport dari ${fileName || format.toUpperCase()} pada ${new Date().toLocaleString('id-ID')}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          inMemoryKkprStore.set(newK.id, newK);
          importedRecords.push(newK);
        }
      }

      return {
        success: true,
        message: `Berhasil mengimport ${features.length} polygon spasial`,
        format,
        layerCategory: layerCategory || 'bidang',
        featureCount: features.length,
        data: parsedGeoJson,
        importedRecords,
      };
    },
    {
      body: t.Object({
        format: t.String(), // 'geojson' | 'kml' | 'shp'
        layerCategory: t.Optional(t.String()), // 'kkpr' | 'bidang' | 'induk'
        content: t.Any(),
        fileName: t.Optional(t.String()),
      }),
    }
  )

  /**
   * 5. GET /api/pemetaan/export
   * Exports specified layer into GeoJSON, KML, or ESRI Shapefile (.zip for OSS KKPR)
   */
  .get('/export', async ({ query, set }) => {
    const layer = query?.layer || 'kkpr'; // 'kkpr' | 'bidang' | 'induk' | 'all'
    const format = query?.format || 'shp'; // 'shp' | 'geojson' | 'kml'
    const id = query?.id;

    // Gather features based on layer query
    let features: GeoJsonFeature[] = [];
    const isDbConnected = await checkDbConnection();

    if (layer === 'kkpr' || layer === 'all') {
      let kkprItems: Kkpr[] = [];
      if (isDbConnected) {
        try {
          kkprItems = await db.select().from(kkpr);
        } catch {
          kkprItems = Array.from(inMemoryKkprStore.values());
        }
      } else {
        kkprItems = Array.from(inMemoryKkprStore.values());
      }

      if (id) {
        const numId = parseInt(String(id), 10);
        kkprItems = kkprItems.filter(k => k.id === numId || k.kodeKkpr === String(id));
      }

      for (const k of kkprItems) {
        if (k.geojson && k.geojson.coordinates) {
          features.push({
            type: 'Feature',
            geometry: k.geojson,
            properties: {
              kodeKkpr: k.kodeKkpr,
              namaKegiatan: k.namaKegiatan,
              pemohon: k.pemohon,
              nomorIzin: k.nomorIzin,
              kategori: k.kategori,
              luasRencana: k.luasRencana,
              status: k.status,
            },
          });
        }
      }
    }

    if (layer === 'bidang' || layer === 'all') {
      let bItems: any[] = [];
      if (isDbConnected) {
        try {
          bItems = await db.select().from(bidangTanah);
        } catch {
          bItems = Object.values(fallbackParcels);
        }
      } else {
        bItems = Object.values(fallbackParcels);
      }

      if (id) {
        bItems = bItems.filter(b => b.kodeTanah === String(id));
      }

      for (const b of bItems) {
        if (b.geojson && b.geojson.coordinates) {
          features.push({
            type: 'Feature',
            geometry: b.geojson,
            properties: {
              kodeTanah: b.kodeTanah,
              kodeLokasi: b.kodeLokasi,
              nomorBidang: b.nomorBidang,
              luas: b.luas,
              statusPembebasan: b.statusPembebasan,
            },
          });
        }
      }
    }

    if (layer === 'induk' || layer === 'all') {
      let lItems: any[] = [];
      if (isDbConnected) {
        try {
          lItems = await db.select().from(lokasi);
        } catch {
          lItems = Object.values(fallbackLocations);
        }
      } else {
        lItems = Object.values(fallbackLocations);
      }

      for (const l of lItems) {
        if (l.geojson && l.geojson.coordinates) {
          features.push({
            type: 'Feature',
            geometry: l.geojson,
            properties: {
              kodeLokasi: l.kodeLokasi,
              namaLokasi: l.namaLokasi,
              luasInduk: l.luasInduk,
            },
          });
        }
      }
    }

    const featureCollection: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    const timeStamp = new Date().toISOString().slice(0, 10);
    const fileName = `export_${layer}_${timeStamp}`;

    if (format === 'geojson') {
      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] = `attachment; filename="${fileName}.geojson"`;
      return featureCollection;
    }

    if (format === 'kml') {
      const kmlData = exportToKML(featureCollection, `Ekspor Layer ${layer.toUpperCase()} - Aplikasi Gade`);
      set.headers['Content-Type'] = 'application/vnd.google-earth.kml+xml';
      set.headers['Content-Disposition'] = `attachment; filename="${fileName}.kml"`;
      return kmlData;
    }

    // Default: SHP packaged in ZIP
    const zipBuffer = await createShapefileZip(featureCollection, fileName);
    set.headers['Content-Type'] = 'application/zip';
    set.headers['Content-Disposition'] = `attachment; filename="${fileName}.zip"`;
    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}.zip"`,
      },
    });
  });
