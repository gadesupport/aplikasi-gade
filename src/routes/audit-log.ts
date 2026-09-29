import { Elysia, t } from 'elysia';
import { eq, desc, and, gte, lte, ilike, or } from 'drizzle-orm';
import { db } from '../db';
import {
  auditLogs,
  actionAuditLogValues,
  type AuditLog,
  type NewAuditLog,
  type ActionAuditLog,
} from '../db/schema';

// In-memory fallback store
let nextAuditLogId = 11;
export const inMemoryAuditLogsStore: Map<number, AuditLog> = new Map([
  [
    1,
    {
      id: 1,
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'LOGIN',
      menu: 'Autentikasi',
      description: 'Pengguna berhasil masuk ke sistem Aplikasi Gade',
      entityId: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { loginType: 'Standard' },
      createdAt: new Date('2026-02-28T08:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'CREATE',
      menu: 'Lokasi',
      description: 'Menambahkan lokasi baru: Kawasan Industri Terpadu Cisoka (LOK-001)',
      entityId: 'LOK-001',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { kodeLokasi: 'LOK-001', luasTarget: 50000 },
      createdAt: new Date('2026-02-28T08:15:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'UPDATE',
      menu: 'Lokasi',
      description: 'Memperbarui batas polygon lokasi LOK-001 pada Step 2 Peta',
      entityId: 'LOK-001',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { luasInduk: 50000, bidangTerpetakanCount: 2 },
      createdAt: new Date('2026-02-28T08:45:00Z'),
    },
  ],
  [
    4,
    {
      id: 4,
      userId: 2,
      userName: 'Staff Legal',
      userRole: 'Staff Legal',
      action: 'CREATE',
      menu: 'Bidang Tanah',
      description: 'Mendaftarkan bidang tanah baru BDG-001 di LOK-001',
      entityId: 'BDG-001',
      ipAddress: '192.168.1.15',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { nomorBidang: '001', luas: 1250, jenisHak: 'SHM' },
      createdAt: new Date('2026-03-01T09:20:00Z'),
    },
  ],
  [
    5,
    {
      id: 5,
      userId: 2,
      userName: 'Staff Legal',
      userRole: 'Staff Legal',
      action: 'CREATE',
      menu: 'Legalitas Tanah',
      description: 'Mengunggah dan mencatat sertifikat SHM No. 0123/Tapos untuk BDG-001',
      entityId: 'BDG-001',
      ipAddress: '192.168.1.15',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { jenisDokumen: 'SHM', status: 'Ada' },
      createdAt: new Date('2026-03-01T10:05:00Z'),
    },
  ],
  [
    6,
    {
      id: 6,
      userId: 3,
      userName: 'Surveyor Lapangan',
      userRole: 'Surveyor',
      action: 'CREATE',
      menu: 'Survey',
      description: 'Menyimpan hasil survey lapangan fisik batas tanah BDG-001',
      entityId: 'SRV-001',
      ipAddress: '192.168.1.28',
      userAgent: 'Mozilla/5.0 (Mobile; Android 14)',
      metadata: { target: 'Bidang', pic: 'Budi Hartono' },
      createdAt: new Date('2026-03-02T13:40:00Z'),
    },
  ],
  [
    7,
    {
      id: 7,
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'EXPORT',
      menu: 'Pemetaan',
      description: 'Mengekspor layer batas izin lahan OSS KKPR ke paket format SHP ZIP',
      entityId: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { format: 'shp-zip', layers: ['kkpr', 'bidang'] },
      createdAt: new Date('2026-03-03T11:10:00Z'),
    },
  ],
  [
    8,
    {
      id: 8,
      userId: 2,
      userName: 'Staff Legal',
      userRole: 'Staff Legal',
      action: 'CETAK',
      menu: 'BAST',
      description: 'Mencetak Berita Acara Serah Terima (BAST-2026-0001) dengan QR Code verifikasi',
      entityId: 'BAST-2026-0001',
      ipAddress: '192.168.1.15',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { tipe: 'Peminjaman', totalBerkas: 2 },
      createdAt: new Date('2026-03-04T14:25:00Z'),
    },
  ],
  [
    9,
    {
      id: 9,
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'EXPORT',
      menu: 'Laporan',
      description: 'Mengunduh Laporan Progress Pembebasan Tanah format Excel (.xlsx)',
      entityId: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { tipeLaporan: 'pembebasan', format: 'excel' },
      createdAt: new Date('2026-03-05T09:00:00Z'),
    },
  ],
  [
    10,
    {
      id: 10,
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'CETAK',
      menu: 'Generate Dokumen',
      description: 'Generate dan cetak dokumen custom "Surat Pelepasan Hak Adat" dengan Two-Page Book Spread',
      entityId: 'TPL-SPH-01',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { template: 'Surat Pelepasan Hak', layout: 'TwoPageBook' },
      createdAt: new Date('2026-03-06T15:30:00Z'),
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

/**
 * Helper terpusat untuk merekam Audit Log baik via database maupun in-memory fallback
 */
export async function recordAuditLog(entry: {
  userId?: number | null;
  userName?: string;
  userRole?: string;
  action: string;
  menu: string;
  description: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
}): Promise<AuditLog> {
  const isConnected = await checkDbConnection();
  const now = new Date();

  const newLog: NewAuditLog = {
    userId: entry.userId ?? 1,
    userName: entry.userName || 'Super Admin',
    userRole: entry.userRole || 'Super Admin',
    action: entry.action.toUpperCase(),
    menu: entry.menu,
    description: entry.description,
    entityId: entry.entityId || null,
    ipAddress: entry.ipAddress || '127.0.0.1',
    userAgent: entry.userAgent || 'App Browser',
    metadata: entry.metadata || null,
    createdAt: now,
  };

  if (isConnected) {
    try {
      const [inserted] = await db.insert(auditLogs).values(newLog).returning();
      return inserted;
    } catch {
      // fallback to memory
    }
  }

  const inMemoryLog: AuditLog = {
    id: nextAuditLogId++,
    userId: newLog.userId ?? null,
    userName: newLog.userName ?? 'Super Admin',
    userRole: newLog.userRole ?? 'Super Admin',
    action: newLog.action,
    menu: newLog.menu,
    description: newLog.description,
    entityId: newLog.entityId ?? null,
    ipAddress: newLog.ipAddress ?? null,
    userAgent: newLog.userAgent ?? null,
    metadata: newLog.metadata ?? null,
    createdAt: now,
  };

  inMemoryAuditLogsStore.set(inMemoryLog.id, inMemoryLog);
  return inMemoryLog;
}

export const auditLogRoutes = new Elysia({ prefix: '/api/audit-log' })
  /**
   * GET /api/audit-log
   * List logs with filtering, search, and pagination
   */
  .get(
    '/',
    async ({ query, set }) => {
      try {
        const {
          search,
          action,
          menu,
          startDate,
          endDate,
          limit = '50',
          offset = '0',
        } = query;

        const limitNum = Math.max(1, parseInt(limit, 10) || 50);
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        const isConnected = await checkDbConnection();

        if (isConnected) {
          try {
            const conditions: any[] = [];

            if (action && action.trim() !== '') {
              conditions.push(eq(auditLogs.action, action.trim().toUpperCase()));
            }

            if (menu && menu.trim() !== '') {
              conditions.push(eq(auditLogs.menu, menu.trim()));
            }

            if (startDate && startDate.trim() !== '') {
              conditions.push(gte(auditLogs.createdAt, new Date(startDate.trim())));
            }

            if (endDate && endDate.trim() !== '') {
              const end = new Date(endDate.trim());
              end.setHours(23, 59, 59, 999);
              conditions.push(lte(auditLogs.createdAt, end));
            }

            if (search && search.trim() !== '') {
              const term = `%${search.trim()}%`;
              conditions.push(
                or(
                  ilike(auditLogs.description, term),
                  ilike(auditLogs.userName, term),
                  ilike(auditLogs.entityId, term),
                  ilike(auditLogs.menu, term)
                )
              );
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            const allFiltered = await db
              .select()
              .from(auditLogs)
              .where(whereClause)
              .orderBy(desc(auditLogs.createdAt));

            const total = allFiltered.length;
            const paginated = allFiltered.slice(offsetNum, offsetNum + limitNum);

            return {
              success: true,
              total,
              limit: limitNum,
              offset: offsetNum,
              data: paginated,
            };
          } catch {
            // fallback below
          }
        }

        // In-memory fallback
        let logs = Array.from(inMemoryAuditLogsStore.values()).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        if (action && action.trim() !== '') {
          const act = action.trim().toUpperCase();
          logs = logs.filter((l) => l.action.toUpperCase() === act);
        }

        if (menu && menu.trim() !== '') {
          const m = menu.trim().toLowerCase();
          logs = logs.filter((l) => l.menu.toLowerCase() === m);
        }

        if (startDate && startDate.trim() !== '') {
          const start = new Date(startDate.trim()).getTime();
          logs = logs.filter((l) => l.createdAt.getTime() >= start);
        }

        if (endDate && endDate.trim() !== '') {
          const end = new Date(endDate.trim());
          end.setHours(23, 59, 59, 999);
          logs = logs.filter((l) => l.createdAt.getTime() <= end.getTime());
        }

        if (search && search.trim() !== '') {
          const term = search.trim().toLowerCase();
          logs = logs.filter(
            (l) =>
              l.description.toLowerCase().includes(term) ||
              (l.userName && l.userName.toLowerCase().includes(term)) ||
              (l.entityId && l.entityId.toLowerCase().includes(term)) ||
              l.menu.toLowerCase().includes(term)
          );
        }

        const total = logs.length;
        const paginated = logs.slice(offsetNum, offsetNum + limitNum);

        return {
          success: true,
          total,
          limit: limitNum,
          offset: offsetNum,
          data: paginated,
        };
      } catch (err: any) {
        set.status = 500;
        return {
          success: false,
          message: 'Gagal mengambil data audit log',
          error: err.message,
        };
      }
    },
    {
      query: t.Optional(
        t.Object({
          search: t.Optional(t.String()),
          action: t.Optional(t.String()),
          menu: t.Optional(t.String()),
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        })
      ),
    }
  )

  /**
   * GET /api/audit-log/stats
   * Summary metrics for dashboard & analytics
   */
  .get('/stats', async ({ set }) => {
    try {
      const logs = Array.from(inMemoryAuditLogsStore.values());
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      let todayCount = 0;
      const actionCounts: Record<string, number> = {};
      const menuCounts: Record<string, number> = {};

      for (const log of logs) {
        if (log.createdAt.getTime() >= startOfToday) {
          todayCount++;
        }
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        menuCounts[log.menu] = (menuCounts[log.menu] || 0) + 1;
      }

      return {
        success: true,
        data: {
          totalLogs: logs.length,
          todayLogs: todayCount,
          byAction: actionCounts,
          byMenu: menuCounts,
        },
      };
    } catch (err: any) {
      set.status = 500;
      return {
        success: false,
        message: 'Gagal mengambil statistik audit log',
        error: err.message,
      };
    }
  })

  /**
   * POST /api/audit-log
   * Record a new log entry manually
   */
  .post(
    '/',
    async ({ body, set, headers }) => {
      try {
        const ip =
          headers['x-forwarded-for'] ||
          headers['x-real-ip'] ||
          '127.0.0.1';
        const userAgent = headers['user-agent'] || 'Browser Client';

        const created = await recordAuditLog({
          userId: body.userId ?? 1,
          userName: body.userName || 'Super Admin',
          userRole: body.userRole || 'Super Admin',
          action: body.action,
          menu: body.menu,
          description: body.description,
          entityId: body.entityId,
          ipAddress: ip as string,
          userAgent: userAgent as string,
          metadata: body.metadata,
        });

        return {
          success: true,
          message: 'Audit log berhasil direkam',
          data: created,
        };
      } catch (err: any) {
        set.status = 500;
        return {
          success: false,
          message: 'Gagal mencatat audit log',
          error: err.message,
        };
      }
    },
    {
      body: t.Object({
        userId: t.Optional(t.Number()),
        userName: t.Optional(t.String()),
        userRole: t.Optional(t.String()),
        action: t.String(),
        menu: t.String(),
        description: t.String(),
        entityId: t.Optional(t.String()),
        metadata: t.Optional(t.Any()),
      }),
    }
  )

  /**
   * GET /api/audit-log/:id
   * Detail of single log entry
   */
  .get('/:id', async ({ params, set }) => {
    try {
      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { success: false, message: 'ID Audit Log tidak valid' };
      }

      const log = inMemoryAuditLogsStore.get(id);
      if (!log) {
        set.status = 404;
        return { success: false, message: 'Data audit log tidak ditemukan' };
      }

      return {
        success: true,
        data: log,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  });
