import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  pembebasan,
  bidangTanah,
  tahapPembebasanValues,
  statusTransaksiValues,
  metodePembayaranValues,
  type Pembebasan,
  type NewPembebasan,
  type TahapPembebasan,
  type StatusTransaksi,
  type MetodePembayaran,
} from '../db/schema';

// In-memory fallback store
let nextPembebasanId = 5;
const inMemoryPembebasanStore: Map<number, Pembebasan> = new Map([
  [
    1,
    {
      id: 1,
      kodeTanah: 'BDT-2026-001',
      tanggalPembayaran: new Date('2026-02-10T10:00:00Z'),
      jumlahPembayaran: '1000000000.00',
      tahapPembayaran: 'Uang Muka',
      metodePembayaran: 'Transfer Bank',
      nomorReferensi: 'TRF-20260210-001',
      buktiPembayaran: 'https://storage.gade.id/bukti/bdt-001-dp.pdf',
      status: 'Lunas',
      catatan: 'Pembayaran DP tahap 1 via BNI Giro atas persetujuan PPK',
      createdAt: new Date('2026-02-10T10:15:00Z'),
      updatedAt: new Date('2026-02-10T10:15:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      kodeTanah: 'BDT-2026-001',
      tanggalPembayaran: new Date('2026-02-25T14:30:00Z'),
      jumlahPembayaran: '1500000000.00',
      tahapPembayaran: 'Termin 1',
      metodePembayaran: 'Transfer Bank',
      nomorReferensi: 'TRF-20260225-004',
      buktiPembayaran: 'https://storage.gade.id/bukti/bdt-001-termin1.pdf',
      status: 'Lunas',
      catatan: 'Pembayaran Termin 1 setelah verifikasi sertifikat & BPN selesai',
      createdAt: new Date('2026-02-25T14:45:00Z'),
      updatedAt: new Date('2026-02-25T14:45:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      kodeTanah: 'BDT-2026-001',
      tanggalPembayaran: new Date('2026-03-15T09:00:00Z'),
      jumlahPembayaran: '1700000000.00',
      tahapPembayaran: 'Pelunasan',
      metodePembayaran: 'Transfer Bank',
      nomorReferensi: 'TRF-20260315-009',
      buktiPembayaran: '',
      status: 'Pending',
      catatan: 'Menunggu penandatanganan akta pelepasan hak di hadapan Notaris/PPAT',
      createdAt: new Date('2026-03-01T11:00:00Z'),
      updatedAt: new Date('2026-03-01T11:00:00Z'),
    },
  ],
  [
    4,
    {
      id: 4,
      kodeTanah: 'BDT-2026-002',
      tanggalPembayaran: new Date('2026-02-28T11:00:00Z'),
      jumlahPembayaran: '500000000.00',
      tahapPembayaran: 'Uang Muka',
      metodePembayaran: 'Cek / Bilyet Giro',
      nomorReferensi: 'BG-MDR-99214',
      buktiPembayaran: 'https://storage.gade.id/bukti/bdt-002-bg.jpg',
      status: 'Dalam Proses',
      catatan: 'Titipan uang tanda jadi menunggu konfirmasi tanda tangan seluruh ahli waris',
      createdAt: new Date('2026-02-28T11:20:00Z'),
      updatedAt: new Date('2026-02-28T11:20:00Z'),
    },
  ],
]);

// Fallback lookup metadata for parcels
const fallbackBidangMetadata: Record<string, { nomorBidang: string; luas: string; hargaKesepakatan: string | null; kodeLokasi: string; pemilik: string }> = {
  'BDT-2026-001': {
    nomorBidang: '001/SKM/2026',
    luas: '3000.00',
    hargaKesepakatan: '4200000000.00',
    kodeLokasi: 'LOK-2026-001',
    pemilik: 'H. Mansur Syah',
  },
  'BDT-2026-002': {
    nomorBidang: '002/SKM/2026',
    luas: '2500.00',
    hargaKesepakatan: '3500000000.00',
    kodeLokasi: 'LOK-2026-001',
    pemilik: 'Ahli Waris Ibu Siti Aminah',
  },
};

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

function calculateTotals(items: Pembebasan[]) {
  let totalNominal = 0;
  let totalLunas = 0;
  let totalPending = 0;

  for (const item of items) {
    const val = parseFloat(item.jumlahPembayaran as string) || 0;
    totalNominal += val;
    if (item.status === 'Lunas') {
      totalLunas += val;
    } else if (item.status === 'Pending' || item.status === 'Dalam Proses') {
      totalPending += val;
    }
  }

  const ringkasanStatus = statusTransaksiValues.reduce((acc, curr) => {
    acc[curr] = items.filter((r) => r.status === curr).length;
    return acc;
  }, {} as Record<string, number>);

  const ringkasanTahap = tahapPembebasanValues.reduce((acc, curr) => {
    acc[curr] = items.filter((r) => r.tahapPembayaran === curr).length;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalNominal,
    totalLunas,
    totalPending,
    ringkasanStatus,
    ringkasanTahap,
  };
}

function augmentTransaction(item: Pembebasan) {
  const meta = fallbackBidangMetadata[item.kodeTanah] || {
    nomorBidang: item.kodeTanah,
    luas: '0',
    hargaKesepakatan: null,
    kodeLokasi: '-',
    pemilik: '-',
  };

  return {
    ...item,
    bidangId: item.kodeTanah,
    nomorBidang: meta.nomorBidang,
    luas: meta.luas,
    pemilik: meta.pemilik,
    kodeLokasi: meta.kodeLokasi,
  };
}

export const pembebasanRoutes = new Elysia({ prefix: '/api/pembebasan' })
  // 1. GET /api/pembebasan - List all payment transactions with filters and statistics
  .get(
    '/',
    async ({ query }) => {
      const search = query.search?.trim().toLowerCase();
      const kodeTanahFilter = (query.kodeTanah || query.bidangId)?.trim();
      const statusFilter = query.status?.trim();
      const tahapFilter = query.tahapPembayaran?.trim();
      const metodeFilter = query.metodePembayaran?.trim();

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          let rows = await db
            .select()
            .from(pembebasan)
            .orderBy(desc(pembebasan.tanggalPembayaran), desc(pembebasan.id));

          if (kodeTanahFilter && kodeTanahFilter !== 'Semua') {
            rows = rows.filter((r) => r.kodeTanah === kodeTanahFilter);
          }
          if (statusFilter && statusFilter !== 'Semua') {
            rows = rows.filter((r) => r.status === statusFilter);
          }
          if (tahapFilter && tahapFilter !== 'Semua') {
            rows = rows.filter((r) => r.tahapPembayaran === tahapFilter);
          }
          if (metodeFilter && metodeFilter !== 'Semua') {
            rows = rows.filter((r) => r.metodePembayaran === metodeFilter);
          }
          if (search) {
            rows = rows.filter(
              (r) =>
                (r.nomorReferensi && r.nomorReferensi.toLowerCase().includes(search)) ||
                (r.catatan && r.catatan.toLowerCase().includes(search)) ||
                (r.kodeTanah && r.kodeTanah.toLowerCase().includes(search)) ||
                (r.tahapPembayaran && r.tahapPembayaran.toLowerCase().includes(search)) ||
                (r.metodePembayaran && r.metodePembayaran.toLowerCase().includes(search)) ||
                (r.status && r.status.toLowerCase().includes(search))
            );
          }

          const stats = calculateTotals(rows);
          const data = rows.map(augmentTransaction);

          return {
            success: true,
            source: 'database',
            count: data.length,
            ...stats,
            data,
          };
        } catch (dbErr: any) {
          console.warn('[Pembebasan] DB list error, using memory fallback:', dbErr.message);
        }
      }

      let list = Array.from(inMemoryPembebasanStore.values()).sort(
        (a, b) => new Date(b.tanggalPembayaran).getTime() - new Date(a.tanggalPembayaran).getTime()
      );

      if (kodeTanahFilter && kodeTanahFilter !== 'Semua') {
        list = list.filter((r) => r.kodeTanah === kodeTanahFilter);
      }
      if (statusFilter && statusFilter !== 'Semua') {
        list = list.filter((r) => r.status === statusFilter);
      }
      if (tahapFilter && tahapFilter !== 'Semua') {
        list = list.filter((r) => r.tahapPembayaran === tahapFilter);
      }
      if (metodeFilter && metodeFilter !== 'Semua') {
        list = list.filter((r) => r.metodePembayaran === metodeFilter);
      }
      if (search) {
        list = list.filter(
          (r) =>
            (r.nomorReferensi && r.nomorReferensi.toLowerCase().includes(search)) ||
            (r.catatan && r.catatan.toLowerCase().includes(search)) ||
            (r.kodeTanah && r.kodeTanah.toLowerCase().includes(search)) ||
            (r.tahapPembayaran && r.tahapPembayaran.toLowerCase().includes(search)) ||
            (r.metodePembayaran && r.metodePembayaran.toLowerCase().includes(search)) ||
            (r.status && r.status.toLowerCase().includes(search))
        );
      }

      const stats = calculateTotals(list);
      const data = list.map(augmentTransaction);

      return {
        success: true,
        source: 'memory',
        count: data.length,
        ...stats,
        data,
      };
    },
    {
      query: t.Object({
        kodeTanah: t.Optional(t.String()),
        bidangId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        tahapPembayaran: t.Optional(t.String()),
        metodePembayaran: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pembebasan'],
        summary: 'Daftar riwayat transaksi pembayaran pembebasan tanah dengan filter dan ringkasan finansial',
      },
    }
  )

  // 2. GET /api/pembebasan/rekap - Kontrol utama rekap transaksi per bidang tanah
  .get(
    '/rekap',
    async () => {
      const isDbUp = await checkDbConnection();
      let allTransactions: Pembebasan[] = [];

      if (isDbUp) {
        try {
          allTransactions = await db.select().from(pembebasan);
        } catch {
          allTransactions = Array.from(inMemoryPembebasanStore.values());
        }
      } else {
        allTransactions = Array.from(inMemoryPembebasanStore.values());
      }

      // Group payments by parcel
      const knownParcels = Object.keys(fallbackBidangMetadata);
      // Collect any additional parcels from transactions
      for (const tx of allTransactions) {
        if (!knownParcels.includes(tx.kodeTanah)) {
          knownParcels.push(tx.kodeTanah);
        }
      }

      let grandTotalKesepakatan = 0;
      let grandTotalDibayar = 0;
      let grandTotalPending = 0;

      const rekapPerBidang = knownParcels.map((kodeTanah) => {
        const meta = fallbackBidangMetadata[kodeTanah] || {
          nomorBidang: kodeTanah,
          luas: '0',
          hargaKesepakatan: '0',
          kodeLokasi: '-',
          pemilik: '-',
        };

        const txList = allTransactions
          .filter((t) => t.kodeTanah === kodeTanah)
          .sort((a, b) => new Date(b.tanggalPembayaran).getTime() - new Date(a.tanggalPembayaran).getTime());

        const kesepakatan = parseFloat(meta.hargaKesepakatan || '0') || 0;
        let totalDibayar = 0;
        let totalPending = 0;

        for (const tx of txList) {
          const nominal = parseFloat(tx.jumlahPembayaran as string) || 0;
          if (tx.status === 'Lunas') {
            totalDibayar += nominal;
          } else if (tx.status === 'Pending' || tx.status === 'Dalam Proses') {
            totalPending += nominal;
          }
        }

        const sisaPembayaran = Math.max(0, kesepakatan - totalDibayar);
        const persentase = kesepakatan > 0 ? Math.min(100, (totalDibayar / kesepakatan) * 100) : 0;

        let statusPelunasan = 'Belum Ada Transaksi';
        if (kesepakatan > 0 && totalDibayar >= kesepakatan) {
          statusPelunasan = 'Lunas';
        } else if (totalDibayar > 0) {
          statusPelunasan = 'Sebagian (DP/Termin)';
        } else if (totalPending > 0) {
          statusPelunasan = 'Menunggu Proses';
        }

        grandTotalKesepakatan += kesepakatan;
        grandTotalDibayar += totalDibayar;
        grandTotalPending += totalPending;

        return {
          kodeTanah,
          bidangId: kodeTanah,
          nomorBidang: meta.nomorBidang,
          luas: meta.luas,
          pemilik: meta.pemilik,
          kodeLokasi: meta.kodeLokasi,
          hargaKesepakatan: kesepakatan,
          totalDibayar,
          totalPending,
          sisaPembayaran,
          persentase: Math.round(persentase * 100) / 100,
          statusPelunasan,
          jumlahTransaksi: txList.length,
          transaksiTerakhir: txList[0] || null,
        };
      });

      const grandTotalSisa = Math.max(0, grandTotalKesepakatan - grandTotalDibayar);
      const persentaseRealisasi =
        grandTotalKesepakatan > 0
          ? Math.round((grandTotalDibayar / grandTotalKesepakatan) * 10000) / 100
          : 0;

      return {
        success: true,
        summary: {
          totalBidangTerdata: rekapPerBidang.length,
          grandTotalKesepakatan,
          grandTotalDibayar,
          grandTotalPending,
          grandTotalSisa,
          persentaseRealisasi,
        },
        data: rekapPerBidang,
      };
    },
    {
      detail: {
        tags: ['Pembebasan'],
        summary: 'Rekap kontrol utama pembebasan tanah terintegrasi per bidang tanah',
      },
    }
  )

  // 3. GET /api/pembebasan/bidang/:bidangId - Rekap & riwayat transaksi per bidang tanah
  .get(
    '/bidang/:bidangId',
    async ({ params: { bidangId } }) => {
      const isDbUp = await checkDbConnection();
      let txList: Pembebasan[] = [];

      if (isDbUp) {
        try {
          txList = await db
            .select()
            .from(pembebasan)
            .where(eq(pembebasan.kodeTanah, bidangId))
            .orderBy(desc(pembebasan.tanggalPembayaran));
        } catch {
          txList = Array.from(inMemoryPembebasanStore.values()).filter((r) => r.kodeTanah === bidangId);
        }
      } else {
        txList = Array.from(inMemoryPembebasanStore.values()).filter((r) => r.kodeTanah === bidangId);
      }

      const meta = fallbackBidangMetadata[bidangId] || {
        nomorBidang: bidangId,
        luas: '0',
        hargaKesepakatan: '0',
        kodeLokasi: '-',
        pemilik: '-',
      };

      const kesepakatan = parseFloat(meta.hargaKesepakatan || '0') || 0;
      let totalDibayar = 0;
      let totalPending = 0;

      for (const tx of txList) {
        const val = parseFloat(tx.jumlahPembayaran as string) || 0;
        if (tx.status === 'Lunas') {
          totalDibayar += val;
        } else if (tx.status === 'Pending' || tx.status === 'Dalam Proses') {
          totalPending += val;
        }
      }

      const sisaPembayaran = Math.max(0, kesepakatan - totalDibayar);
      const persentase = kesepakatan > 0 ? Math.min(100, (totalDibayar / kesepakatan) * 100) : 0;

      let statusPelunasan = 'Belum Ada Transaksi';
      if (kesepakatan > 0 && totalDibayar >= kesepakatan) {
        statusPelunasan = 'Lunas';
      } else if (totalDibayar > 0) {
        statusPelunasan = 'Sebagian (DP/Termin)';
      } else if (totalPending > 0) {
        statusPelunasan = 'Menunggu Proses';
      }

      return {
        success: true,
        bidangId,
        kodeTanah: bidangId,
        metadata: meta,
        rekap: {
          hargaKesepakatan: kesepakatan,
          totalDibayar,
          totalPending,
          sisaPembayaran,
          persentase: Math.round(persentase * 100) / 100,
          statusPelunasan,
          count: txList.length,
        },
        transaksi: txList.map(augmentTransaction),
      };
    },
    {
      detail: {
        tags: ['Pembebasan'],
        summary: 'Rekapitulasi pembayaran dan riwayat transaksi untuk satu bidang tanah',
      },
    }
  )

  // 4. GET /api/pembebasan/by-bidang/:kodeTanah - Alias for parcel payment tracking
  .get(
    '/by-bidang/:kodeTanah',
    async ({ params: { kodeTanah } }) => {
      const isDbUp = await checkDbConnection();
      let txList: Pembebasan[] = [];

      if (isDbUp) {
        try {
          txList = await db
            .select()
            .from(pembebasan)
            .where(eq(pembebasan.kodeTanah, kodeTanah))
            .orderBy(desc(pembebasan.tanggalPembayaran));
        } catch {
          txList = Array.from(inMemoryPembebasanStore.values()).filter((r) => r.kodeTanah === kodeTanah);
        }
      } else {
        txList = Array.from(inMemoryPembebasanStore.values()).filter((r) => r.kodeTanah === kodeTanah);
      }

      const meta = fallbackBidangMetadata[kodeTanah] || {
        nomorBidang: kodeTanah,
        luas: '0',
        hargaKesepakatan: '0',
        kodeLokasi: '-',
        pemilik: '-',
      };

      const kesepakatan = parseFloat(meta.hargaKesepakatan || '0') || 0;
      let totalDibayar = 0;
      let totalPending = 0;

      for (const tx of txList) {
        const val = parseFloat(tx.jumlahPembayaran as string) || 0;
        if (tx.status === 'Lunas') {
          totalDibayar += val;
        } else if (tx.status === 'Pending' || tx.status === 'Dalam Proses') {
          totalPending += val;
        }
      }

      const sisaPembayaran = Math.max(0, kesepakatan - totalDibayar);
      const persentase = kesepakatan > 0 ? Math.min(100, (totalDibayar / kesepakatan) * 100) : 0;

      return {
        success: true,
        kodeTanah,
        bidangId: kodeTanah,
        metadata: meta,
        rekap: {
          hargaKesepakatan: kesepakatan,
          totalDibayar,
          totalPending,
          sisaPembayaran,
          persentase: Math.round(persentase * 100) / 100,
          count: txList.length,
        },
        transaksi: txList.map(augmentTransaction),
      };
    },
    {
      detail: {
        tags: ['Pembebasan'],
        summary: 'Mengambil riwayat transaksi pembayaran bidang tanah berdasarkan kode tanah',
      },
    }
  )

  // 5. GET /api/pembebasan/:id - Detail single payment record
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        set.status = 400;
        return { success: false, message: 'ID transaksi tidak valid' };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const row = await db.select().from(pembebasan).where(eq(pembebasan.id, numId)).limit(1);
          if (row.length > 0) {
            return {
              success: true,
              source: 'database',
              data: augmentTransaction(row[0]),
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pembebasan] DB get by id error, trying memory:', dbErr.message);
        }
      }

      const memoryItem = inMemoryPembebasanStore.get(numId);
      if (!memoryItem) {
        set.status = 404;
        return { success: false, message: `Transaksi pembebasan dengan ID #${numId} tidak ditemukan` };
      }

      return {
        success: true,
        source: 'memory',
        data: augmentTransaction(memoryItem),
      };
    },
    {
      detail: {
        tags: ['Pembebasan'],
        summary: 'Mengambil detail satu catatan transaksi pembayaran pembebasan',
      },
    }
  )

  // 6. POST /api/pembebasan - Create a new payment record
  .post(
    '/',
    async ({ body, set }) => {
      const kodeTanah = (body.kodeTanah || body.bidangId || (body as any).bidang_id)?.trim();
      const jumlahPembayaranRaw = body.jumlahPembayaran ?? (body as any).jumlah_pembayaran;
      const tanggalPembayaranRaw = body.tanggalPembayaran ?? (body as any).tanggal_pembayaran;
      const tahapPembayaran = body.tahapPembayaran ?? (body as any).tahap_pembayaran ?? 'Uang Muka';
      const metodePembayaran = body.metodePembayaran ?? (body as any).metode_pembayaran ?? 'Transfer Bank';
      const status = body.status ?? 'Pending';
      const nomorReferensi = body.nomorReferensi ?? (body as any).nomor_referensi;
      const buktiPembayaran = body.buktiPembayaran ?? (body as any).bukti_pembayaran;
      const catatan = body.catatan;

      if (!kodeTanah) {
        set.status = 400;
        return { success: false, message: 'Bidang Tanah (kodeTanah / bidangId) wajib diisi' };
      }

      if (jumlahPembayaranRaw === undefined || jumlahPembayaranRaw === null || jumlahPembayaranRaw === '') {
        set.status = 400;
        return { success: false, message: 'Jumlah pembayaran wajib diisi' };
      }

      const jumlahNum = parseFloat(String(jumlahPembayaranRaw));
      if (isNaN(jumlahNum) || jumlahNum <= 0) {
        set.status = 400;
        return { success: false, message: 'Jumlah pembayaran harus berupa angka positif' };
      }

      if (!tanggalPembayaranRaw) {
        set.status = 400;
        return { success: false, message: 'Tanggal pembayaran wajib diisi' };
      }

      const parsedDate = new Date(tanggalPembayaranRaw);
      if (isNaN(parsedDate.getTime())) {
        set.status = 400;
        return { success: false, message: 'Format tanggal pembayaran tidak valid' };
      }

      if (!tahapPembebasanValues.includes(tahapPembayaran as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Tahap pembayaran '${tahapPembayaran}' tidak valid. Pilihan: ${tahapPembebasanValues.join(', ')}`,
        };
      }

      if (!statusTransaksiValues.includes(status as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Status transaksi '${status}' tidak valid. Pilihan: ${statusTransaksiValues.join(', ')}`,
        };
      }

      if (!metodePembayaranValues.includes(metodePembayaran as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Metode pembayaran '${metodePembayaran}' tidak valid. Pilihan: ${metodePembayaranValues.join(', ')}`,
        };
      }

      const jumlahStr = jumlahNum.toFixed(2);
      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const insertPayload: NewPembebasan = {
            kodeTanah,
            tanggalPembayaran: parsedDate,
            jumlahPembayaran: jumlahStr,
            tahapPembayaran,
            metodePembayaran,
            nomorReferensi: nomorReferensi || null,
            buktiPembayaran: buktiPembayaran || null,
            status,
            catatan: catatan || null,
          };

          const [inserted] = await db.insert(pembebasan).values(insertPayload).returning();
          set.status = 201;
          return {
            success: true,
            source: 'database',
            message: 'Transaksi pembayaran pembebasan berhasil dicatat',
            data: augmentTransaction(inserted),
          };
        } catch (dbErr: any) {
          console.warn('[Pembebasan] DB insert error, falling back to memory:', dbErr.message);
        }
      }

      const newId = nextPembebasanId++;
      const memoryRecord: Pembebasan = {
        id: newId,
        kodeTanah,
        tanggalPembayaran: parsedDate,
        jumlahPembayaran: jumlahStr,
        tahapPembayaran,
        metodePembayaran,
        nomorReferensi: nomorReferensi || null,
        buktiPembayaran: buktiPembayaran || null,
        status,
        catatan: catatan || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryPembebasanStore.set(newId, memoryRecord);
      set.status = 201;
      return {
        success: true,
        source: 'memory',
        message: 'Transaksi pembayaran pembebasan berhasil dicatat (in-memory)',
        data: augmentTransaction(memoryRecord),
      };
    },
    {
      body: t.Object({
        kodeTanah: t.Optional(t.String()),
        bidangId: t.Optional(t.String()),
        bidang_id: t.Optional(t.String()),
        tanggalPembayaran: t.Optional(t.String()),
        tanggal_pembayaran: t.Optional(t.String()),
        jumlahPembayaran: t.Optional(t.Any()),
        jumlah_pembayaran: t.Optional(t.Any()),
        tahapPembayaran: t.Optional(t.String()),
        tahap_pembayaran: t.Optional(t.String()),
        metodePembayaran: t.Optional(t.String()),
        metode_pembayaran: t.Optional(t.String()),
        nomorReferensi: t.Optional(t.String()),
        nomor_referensi: t.Optional(t.String()),
        buktiPembayaran: t.Optional(t.String()),
        bukti_pembayaran: t.Optional(t.String()),
        status: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pembebasan'],
        summary: 'Menambahkan catatan transaksi pembayaran pembebasan tanah baru',
      },
    }
  )

  // 7. PUT /api/pembebasan/:id - Update transaction
  .put(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        set.status = 400;
        return { success: false, message: 'ID transaksi tidak valid' };
      }

      const kodeTanah = (body.kodeTanah || body.bidangId || (body as any).bidang_id)?.trim();
      const jumlahPembayaranRaw = body.jumlahPembayaran ?? (body as any).jumlah_pembayaran;
      const tanggalPembayaranRaw = body.tanggalPembayaran ?? (body as any).tanggal_pembayaran;
      const tahapPembayaran = body.tahapPembayaran ?? (body as any).tahap_pembayaran;
      const metodePembayaran = body.metodePembayaran ?? (body as any).metode_pembayaran;
      const status = body.status;
      const nomorReferensi = body.nomorReferensi ?? (body as any).nomor_referensi;
      const buktiPembayaran = body.buktiPembayaran ?? (body as any).bukti_pembayaran;
      const catatan = body.catatan;

      if (tahapPembayaran && !tahapPembebasanValues.includes(tahapPembayaran as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Tahap pembayaran '${tahapPembayaran}' tidak valid`,
        };
      }

      if (status && !statusTransaksiValues.includes(status as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Status transaksi '${status}' tidak valid`,
        };
      }

      if (metodePembayaran && !metodePembayaranValues.includes(metodePembayaran as any)) {
        set.status = 400;
        return {
          success: false,
          message: `Metode pembayaran '${metodePembayaran}' tidak valid`,
        };
      }

      let parsedDate: Date | undefined;
      if (tanggalPembayaranRaw) {
        parsedDate = new Date(tanggalPembayaranRaw);
        if (isNaN(parsedDate.getTime())) {
          set.status = 400;
          return { success: false, message: 'Format tanggal pembayaran tidak valid' };
        }
      }

      let jumlahStr: string | undefined;
      if (jumlahPembayaranRaw !== undefined && jumlahPembayaranRaw !== null) {
        const jumlahNum = parseFloat(String(jumlahPembayaranRaw));
        if (isNaN(jumlahNum) || jumlahNum <= 0) {
          set.status = 400;
          return { success: false, message: 'Jumlah pembayaran harus bernilai positif' };
        }
        jumlahStr = jumlahNum.toFixed(2);
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const updatePayload: Partial<NewPembebasan> = {
            updatedAt: new Date(),
          };
          if (kodeTanah) updatePayload.kodeTanah = kodeTanah;
          if (parsedDate) updatePayload.tanggalPembayaran = parsedDate;
          if (jumlahStr !== undefined) updatePayload.jumlahPembayaran = jumlahStr;
          if (tahapPembayaran) updatePayload.tahapPembayaran = tahapPembayaran;
          if (metodePembayaran) updatePayload.metodePembayaran = metodePembayaran;
          if (nomorReferensi !== undefined) updatePayload.nomorReferensi = nomorReferensi;
          if (buktiPembayaran !== undefined) updatePayload.buktiPembayaran = buktiPembayaran;
          if (status) updatePayload.status = status;
          if (catatan !== undefined) updatePayload.catatan = catatan;

          const [updated] = await db
            .update(pembebasan)
            .set(updatePayload)
            .where(eq(pembebasan.id, numId))
            .returning();

          if (updated) {
            return {
              success: true,
              source: 'database',
              message: 'Transaksi pembayaran berhasil diperbarui',
              data: augmentTransaction(updated),
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pembebasan] DB update error, checking memory:', dbErr.message);
        }
      }

      const existing = inMemoryPembebasanStore.get(numId);
      if (!existing) {
        set.status = 404;
        return { success: false, message: `Transaksi pembebasan dengan ID #${numId} tidak ditemukan` };
      }

      const updatedRecord: Pembebasan = {
        ...existing,
        kodeTanah: kodeTanah || existing.kodeTanah,
        tanggalPembayaran: parsedDate || existing.tanggalPembayaran,
        jumlahPembayaran: jumlahStr !== undefined ? jumlahStr : existing.jumlahPembayaran,
        tahapPembayaran: tahapPembayaran || existing.tahapPembayaran,
        metodePembayaran: metodePembayaran || existing.metodePembayaran,
        nomorReferensi: nomorReferensi !== undefined ? nomorReferensi : existing.nomorReferensi,
        buktiPembayaran: buktiPembayaran !== undefined ? buktiPembayaran : existing.buktiPembayaran,
        status: status || existing.status,
        catatan: catatan !== undefined ? catatan : existing.catatan,
        updatedAt: new Date(),
      };

      inMemoryPembebasanStore.set(numId, updatedRecord);
      return {
        success: true,
        source: 'memory',
        message: 'Transaksi pembayaran berhasil diperbarui (in-memory)',
        data: augmentTransaction(updatedRecord),
      };
    },
    {
      body: t.Object({
        kodeTanah: t.Optional(t.String()),
        bidangId: t.Optional(t.String()),
        bidang_id: t.Optional(t.String()),
        tanggalPembayaran: t.Optional(t.String()),
        tanggal_pembayaran: t.Optional(t.String()),
        jumlahPembayaran: t.Optional(t.Any()),
        jumlah_pembayaran: t.Optional(t.Any()),
        tahapPembayaran: t.Optional(t.String()),
        tahap_pembayaran: t.Optional(t.String()),
        metodePembayaran: t.Optional(t.String()),
        metode_pembayaran: t.Optional(t.String()),
        nomorReferensi: t.Optional(t.String()),
        nomor_referensi: t.Optional(t.String()),
        buktiPembayaran: t.Optional(t.String()),
        bukti_pembayaran: t.Optional(t.String()),
        status: t.Optional(t.String()),
        catatan: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Pembebasan'],
        summary: 'Memperbarui data catatan transaksi pembayaran pembebasan',
      },
    }
  )

  // 8. DELETE /api/pembebasan/:id - Delete transaction
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        set.status = 400;
        return { success: false, message: 'ID transaksi tidak valid' };
      }

      const isDbUp = await checkDbConnection();

      if (isDbUp) {
        try {
          const [deleted] = await db
            .delete(pembebasan)
            .where(eq(pembebasan.id, numId))
            .returning();

          if (deleted) {
            return {
              success: true,
              source: 'database',
              message: `Transaksi pembayaran #${numId} berhasil dihapus`,
              data: augmentTransaction(deleted),
            };
          }
        } catch (dbErr: any) {
          console.warn('[Pembebasan] DB delete error, checking memory:', dbErr.message);
        }
      }

      const existing = inMemoryPembebasanStore.get(numId);
      if (!existing) {
        set.status = 404;
        return { success: false, message: `Transaksi pembebasan dengan ID #${numId} tidak ditemukan` };
      }

      inMemoryPembebasanStore.delete(numId);
      return {
        success: true,
        source: 'memory',
        message: `Transaksi pembayaran #${numId} berhasil dihapus (in-memory)`,
        data: augmentTransaction(existing),
      };
    },
    {
      detail: {
        tags: ['Pembebasan'],
        summary: 'Menghapus catatan transaksi pembayaran pembebasan',
      },
    }
  );
