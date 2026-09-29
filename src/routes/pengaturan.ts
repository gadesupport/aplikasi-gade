import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  users,
  roles,
  rolePermissions,
  type User,
  type Role,
  type RolePermission,
} from '../db/schema';
import { recordAuditLog } from './audit-log';

export const SYSTEM_MENUS = [
  { id: 'dashboard', name: 'Dashboard', category: 'Utama', icon: '🏠' },
  { id: 'lokasi', name: 'Menu Lokasi', category: 'Master Data', icon: '📍' },
  { id: 'bidang', name: 'Menu Bidang Tanah', category: 'Master Data', icon: '🏞️' },
  { id: 'pihak', name: 'Pihak / Pemilik', category: 'Master Data', icon: '👥' },
  { id: 'survey', name: 'Data Survey', category: 'Operasional', icon: '📋' },
  { id: 'pembahasan', name: 'Pembahasan', category: 'Operasional', icon: '🤝' },
  { id: 'legalitas', name: 'Legalitas Tanah', category: 'Legalitas', icon: '⚖️' },
  { id: 'pembebasan', name: 'Pembebasan & Transaksi', category: 'Keuangan', icon: '💰' },
  { id: 'pemetaan', name: 'Pemetaan GIS & KKPR', category: 'Spasial', icon: '🗺️' },
  { id: 'project', name: 'Project Lahan', category: 'Operasional', icon: '🏗️' },
  { id: 'arsip', name: 'Arsip Legal', category: 'Legalitas', icon: '📂' },
  { id: 'bast', name: 'BAST & Serah Terima', category: 'Legalitas', icon: '📑' },
  { id: 'laporan', name: 'Laporan & Rekapitulasi', category: 'Laporan', icon: '📊' },
  { id: 'dokumen', name: 'Generate Dokumen', category: 'Dokumen', icon: '📄' },
  { id: 'audit-log', name: 'Audit Log Aktivitas', category: 'Sistem', icon: '📜' },
  { id: 'pengaturan', name: 'Pengaturan & User', category: 'Sistem', icon: '⚙️' },
];

// Initial mock users
let nextUserId = 5;
export const inMemoryUsersStore: Map<number, User> = new Map([
  [
    1,
    {
      id: 1,
      name: 'Super Admin',
      email: 'admin@gade.id',
      password: 'pbkdf2:admin123:hashed',
      role: 'Super Admin',
      phone: '081234567890',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date('2026-01-01T08:00:00Z'),
      updatedAt: new Date('2026-01-01T08:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      name: 'Staff Legal Korporasi',
      email: 'legal@gade.id',
      password: 'pbkdf2:legal123:hashed',
      role: 'Staff Legal',
      phone: '081298765432',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date('2026-01-15T09:00:00Z'),
      updatedAt: new Date('2026-01-15T09:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      name: 'Budi Hartono (Surveyor)',
      email: 'surveyor@gade.id',
      password: 'pbkdf2:survey123:hashed',
      role: 'Surveyor',
      phone: '081311223344',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date('2026-02-01T10:00:00Z'),
      updatedAt: new Date('2026-02-01T10:00:00Z'),
    },
  ],
  [
    4,
    {
      id: 4,
      name: 'Dewi Kartika (Operator)',
      email: 'operator@gade.id',
      password: 'pbkdf2:operator123:hashed',
      role: 'Operator',
      phone: '081555667788',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date('2026-02-10T11:00:00Z'),
      updatedAt: new Date('2026-02-10T11:00:00Z'),
    },
  ],
]);

// Initial mock roles
let nextRoleId = 6;
export const inMemoryRolesStore: Map<number, Role> = new Map([
  [
    1,
    {
      id: 1,
      name: 'Super Admin',
      description: 'Akses penuh tanpa batas ke semua modul sistem dan konfigurasi',
      isSystem: true,
      createdAt: new Date('2026-01-01T08:00:00Z'),
      updatedAt: new Date('2026-01-01T08:00:00Z'),
    },
  ],
  [
    2,
    {
      id: 2,
      name: 'Staff Legal',
      description: 'Pengelolaan data legalitas tanah, arsip fisik, BAST, dan pembuatan dokumen pelepasan',
      isSystem: false,
      createdAt: new Date('2026-01-05T08:00:00Z'),
      updatedAt: new Date('2026-01-05T08:00:00Z'),
    },
  ],
  [
    3,
    {
      id: 3,
      name: 'Surveyor',
      description: 'Pencatatan data survey lapangan, koordinat fisik, dan pemetaan digitasi',
      isSystem: false,
      createdAt: new Date('2026-01-05T08:00:00Z'),
      updatedAt: new Date('2026-01-05T08:00:00Z'),
    },
  ],
  [
    4,
    {
      id: 4,
      name: 'Operator',
      description: 'Input data rutin lokasi, bidang tanah, serta verifikasi pembebasan',
      isSystem: false,
      createdAt: new Date('2026-01-05T08:00:00Z'),
      updatedAt: new Date('2026-01-05T08:00:00Z'),
    },
  ],
  [
    5,
    {
      id: 5,
      name: 'Viewer / Auditor',
      description: 'Akses hanya melihat data, memeriksa riwayat audit log, dan mencetak laporan',
      isSystem: false,
      createdAt: new Date('2026-01-05T08:00:00Z'),
      updatedAt: new Date('2026-01-05T08:00:00Z'),
    },
  ],
]);

// Initial mock permissions (roleId -> array of permissions)
let nextPermId = 100;
export const inMemoryPermissionsStore: Map<number, RolePermission[]> = new Map();

// Helper to seed permissions
function initSeedPermissions() {
  // Super Admin: all true
  const superAdminPerms: RolePermission[] = SYSTEM_MENUS.map((m) => ({
    id: nextPermId++,
    roleId: 1,
    menu: m.id,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z'),
  }));
  inMemoryPermissionsStore.set(1, superAdminPerms);

  // Staff Legal
  const staffLegalPerms: RolePermission[] = SYSTEM_MENUS.map((m) => {
    const isLegalFocus = ['legalitas', 'arsip', 'bast', 'dokumen', 'laporan', 'pihak', 'bidang'].includes(m.id);
    return {
      id: nextPermId++,
      roleId: 2,
      menu: m.id,
      canView: true,
      canCreate: isLegalFocus,
      canEdit: isLegalFocus,
      canDelete: ['arsip', 'bast', 'dokumen'].includes(m.id),
      createdAt: new Date('2026-01-05T08:00:00Z'),
      updatedAt: new Date('2026-01-05T08:00:00Z'),
    };
  });
  inMemoryPermissionsStore.set(2, staffLegalPerms);

  // Surveyor
  const surveyorPerms: RolePermission[] = SYSTEM_MENUS.map((m) => {
    const isSurveyFocus = ['survey', 'pemetaan', 'lokasi', 'bidang'].includes(m.id);
    return {
      id: nextPermId++,
      roleId: 3,
      menu: m.id,
      canView: !['pengaturan', 'audit-log'].includes(m.id),
      canCreate: isSurveyFocus,
      canEdit: isSurveyFocus,
      canDelete: false,
      createdAt: new Date('2026-01-05T08:00:00Z'),
      updatedAt: new Date('2026-01-05T08:00:00Z'),
    };
  });
  inMemoryPermissionsStore.set(3, surveyorPerms);

  // Operator
  const operatorPerms: RolePermission[] = SYSTEM_MENUS.map((m) => ({
    id: nextPermId++,
    roleId: 4,
    menu: m.id,
    canView: !['pengaturan', 'audit-log'].includes(m.id),
    canCreate: !['pengaturan', 'audit-log', 'laporan'].includes(m.id),
    canEdit: !['pengaturan', 'audit-log', 'laporan'].includes(m.id),
    canDelete: false,
    createdAt: new Date('2026-01-05T08:00:00Z'),
    updatedAt: new Date('2026-01-05T08:00:00Z'),
  }));
  inMemoryPermissionsStore.set(4, operatorPerms);

  // Viewer / Auditor
  const viewerPerms: RolePermission[] = SYSTEM_MENUS.map((m) => ({
    id: nextPermId++,
    roleId: 5,
    menu: m.id,
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    createdAt: new Date('2026-01-05T08:00:00Z'),
    updatedAt: new Date('2026-01-05T08:00:00Z'),
  }));
  inMemoryPermissionsStore.set(5, viewerPerms);
}

initSeedPermissions();

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

export const pengaturanRoutes = new Elysia({ prefix: '/api' })
  /**
   * Helper: GET /api/pengaturan/menus
   * Returns list of system registered menus and categories
   */
  .get('/pengaturan/menus', () => ({
    success: true,
    data: SYSTEM_MENUS,
  }))

  // ==========================================
  // 1. PROFIL SAYA (PROFILE ENDPOINTS)
  // ==========================================
  .get('/profile', async ({ set }) => {
    try {
      // Default to User ID 1 (Active Logged In Session)
      const user = inMemoryUsersStore.get(1);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'User profile tidak ditemukan' };
      }

      const { password, ...safeUser } = user;
      return {
        success: true,
        data: safeUser,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  .put(
    '/profile',
    async ({ body, set }) => {
      try {
        const user = inMemoryUsersStore.get(1);
        if (!user) {
          set.status = 404;
          return { success: false, message: 'User profile tidak ditemukan' };
        }

        if (body.name) user.name = body.name.trim();
        if (body.email) user.email = body.email.trim();
        if (body.phone !== undefined) user.phone = body.phone ? body.phone.trim() : null;
        if (body.avatar !== undefined) user.avatar = body.avatar;

        if (body.newPassword && body.newPassword.trim().length > 0) {
          if (body.newPassword.length < 6) {
            set.status = 400;
            return {
              success: false,
              message: 'Password baru minimal harus 6 karakter',
            };
          }
          user.password = `pbkdf2:${body.newPassword}:hashed`;
        }

        user.updatedAt = new Date();
        inMemoryUsersStore.set(1, user);

        await recordAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'UPDATE',
          menu: 'Pengaturan',
          description: `Pengguna memperbarui informasi profil akun (${user.email})`,
          entityId: String(user.id),
        });

        const { password, ...safeUser } = user;
        return {
          success: true,
          message: 'Profil berhasil diperbarui',
          data: safeUser,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
        currentPassword: t.Optional(t.String()),
        newPassword: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================
  // 2. MANAGEMENT USER (USER CRUD)
  // ==========================================
  .get(
    '/users',
    async ({ query, set }) => {
      try {
        const { search, role } = query;
        let userList = Array.from(inMemoryUsersStore.values()).map((u) => {
          const { password, ...safe } = u;
          return safe;
        });

        if (role && role.trim() !== '') {
          userList = userList.filter(
            (u) => u.role.toLowerCase() === role.trim().toLowerCase()
          );
        }

        if (search && search.trim() !== '') {
          const term = search.trim().toLowerCase();
          userList = userList.filter(
            (u) =>
              u.name.toLowerCase().includes(term) ||
              u.email.toLowerCase().includes(term) ||
              (u.phone && u.phone.toLowerCase().includes(term))
          );
        }

        return {
          success: true,
          total: userList.length,
          data: userList,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      query: t.Optional(
        t.Object({
          search: t.Optional(t.String()),
          role: t.Optional(t.String()),
        })
      ),
    }
  )

  .post(
    '/users',
    async ({ body, set }) => {
      try {
        if (!body.name || !body.email || !body.password) {
          set.status = 400;
          return {
            success: false,
            message: 'Nama, Email, dan Password wajib diisi',
          };
        }

        // Check email uniqueness
        const emailExists = Array.from(inMemoryUsersStore.values()).some(
          (u) => u.email.toLowerCase() === body.email.toLowerCase().trim()
        );

        if (emailExists) {
          set.status = 409;
          return {
            success: false,
            message: `Email '${body.email}' sudah terdaftar dalam sistem`,
          };
        }

        const newUser: User = {
          id: nextUserId++,
          name: body.name.trim(),
          email: body.email.toLowerCase().trim(),
          password: `pbkdf2:${body.password}:hashed`,
          role: body.role || 'Operator',
          phone: body.phone ? body.phone.trim() : null,
          avatar: body.avatar || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        inMemoryUsersStore.set(newUser.id, newUser);

        await recordAuditLog({
          userId: 1,
          userName: 'Super Admin',
          action: 'CREATE',
          menu: 'Pengaturan',
          description: `Menambahkan user baru: ${newUser.name} (${newUser.email}) role ${newUser.role}`,
          entityId: String(newUser.id),
        });

        const { password, ...safeUser } = newUser;
        return {
          success: true,
          message: 'User berhasil ditambahkan',
          data: safeUser,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        password: t.String(),
        role: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
      }),
    }
  )

  .get('/users/:id', async ({ params, set }) => {
    try {
      const id = parseInt(params.id, 10);
      const user = inMemoryUsersStore.get(id);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'User tidak ditemukan' };
      }

      const { password, ...safeUser } = user;
      return { success: true, data: safeUser };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  .put(
    '/users/:id',
    async ({ params, body, set }) => {
      try {
        const id = parseInt(params.id, 10);
        const user = inMemoryUsersStore.get(id);
        if (!user) {
          set.status = 404;
          return { success: false, message: 'User tidak ditemukan' };
        }

        if (body.email && body.email.toLowerCase().trim() !== user.email.toLowerCase()) {
          const emailExists = Array.from(inMemoryUsersStore.values()).some(
            (u) => u.id !== id && u.email.toLowerCase() === body.email?.toLowerCase().trim()
          );
          if (emailExists) {
            set.status = 409;
            return { success: false, message: 'Email sudah digunakan pengguna lain' };
          }
          user.email = body.email.toLowerCase().trim();
        }

        if (body.name) user.name = body.name.trim();
        if (body.role) user.role = body.role.trim();
        if (body.phone !== undefined) user.phone = body.phone ? body.phone.trim() : null;
        if (body.avatar !== undefined) user.avatar = body.avatar;

        if (body.password && body.password.trim().length > 0) {
          user.password = `pbkdf2:${body.password}:hashed`;
        }

        user.updatedAt = new Date();
        inMemoryUsersStore.set(id, user);

        await recordAuditLog({
          userId: 1,
          userName: 'Super Admin',
          action: 'UPDATE',
          menu: 'Pengaturan',
          description: `Memperbarui data user: ${user.name} (${user.email})`,
          entityId: String(id),
        });

        const { password, ...safeUser } = user;
        return {
          success: true,
          message: 'Data user berhasil diperbarui',
          data: safeUser,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
        password: t.Optional(t.String()),
        role: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
      }),
    }
  )

  .delete('/users/:id', async ({ params, set }) => {
    try {
      const id = parseInt(params.id, 10);
      if (id === 1) {
        set.status = 403;
        return {
          success: false,
          message: 'Akun Super Admin sistem utama tidak dapat dihapus',
        };
      }

      const user = inMemoryUsersStore.get(id);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'User tidak ditemukan' };
      }

      inMemoryUsersStore.delete(id);

      await recordAuditLog({
        userId: 1,
        userName: 'Super Admin',
        action: 'DELETE',
        menu: 'Pengaturan',
        description: `Menghapus user: ${user.name} (${user.email})`,
        entityId: String(id),
      });

      return {
        success: true,
        message: `User '${user.name}' berhasil dihapus`,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  // ==========================================
  // 3. MANAGEMENT AKSES ROLE & RBAC PERMISSIONS
  // ==========================================
  .get('/roles', async ({ set }) => {
    try {
      const roleList = Array.from(inMemoryRolesStore.values()).map((r) => {
        const perms = inMemoryPermissionsStore.get(r.id) || [];
        const userCount = Array.from(inMemoryUsersStore.values()).filter(
          (u) => u.role.toLowerCase() === r.name.toLowerCase()
        ).length;

        return {
          ...r,
          userCount,
          permissions: perms,
        };
      });

      return {
        success: true,
        data: roleList,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  .post(
    '/roles',
    async ({ body, set }) => {
      try {
        if (!body.name || body.name.trim() === '') {
          set.status = 400;
          return { success: false, message: 'Nama Role wajib diisi' };
        }

        const nameExists = Array.from(inMemoryRolesStore.values()).some(
          (r) => r.name.toLowerCase() === body.name.trim().toLowerCase()
        );

        if (nameExists) {
          set.status = 409;
          return { success: false, message: `Role '${body.name}' sudah ada` };
        }

        const newRole: Role = {
          id: nextRoleId++,
          name: body.name.trim(),
          description: body.description ? body.description.trim() : null,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        inMemoryRolesStore.set(newRole.id, newRole);

        // Initialize default permissions (all view true, others false)
        const newPerms: RolePermission[] = SYSTEM_MENUS.map((m) => ({
          id: nextPermId++,
          roleId: newRole.id,
          menu: m.id,
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        inMemoryPermissionsStore.set(newRole.id, newPerms);

        await recordAuditLog({
          userId: 1,
          userName: 'Super Admin',
          action: 'CREATE',
          menu: 'Pengaturan',
          description: `Menambahkan role baru: ${newRole.name}`,
          entityId: String(newRole.id),
        });

        return {
          success: true,
          message: 'Role baru berhasil ditambahkan',
          data: {
            ...newRole,
            userCount: 0,
            permissions: newPerms,
          },
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
      }),
    }
  )

  .get('/roles/:id', async ({ params, set }) => {
    try {
      const id = parseInt(params.id, 10);
      const role = inMemoryRolesStore.get(id);
      if (!role) {
        set.status = 404;
        return { success: false, message: 'Role tidak ditemukan' };
      }

      const permissions = inMemoryPermissionsStore.get(id) || [];
      return {
        success: true,
        data: {
          ...role,
          permissions,
        },
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  .put(
    '/roles/:id',
    async ({ params, body, set }) => {
      try {
        const id = parseInt(params.id, 10);
        const role = inMemoryRolesStore.get(id);
        if (!role) {
          set.status = 404;
          return { success: false, message: 'Role tidak ditemukan' };
        }

        if (body.name && body.name.trim().toLowerCase() !== role.name.toLowerCase()) {
          const nameExists = Array.from(inMemoryRolesStore.values()).some(
            (r) => r.id !== id && r.name.toLowerCase() === body.name?.trim().toLowerCase()
          );
          if (nameExists) {
            set.status = 409;
            return { success: false, message: 'Nama Role sudah digunakan' };
          }
          role.name = body.name.trim();
        }

        if (body.description !== undefined) {
          role.description = body.description ? body.description.trim() : null;
        }

        role.updatedAt = new Date();
        inMemoryRolesStore.set(id, role);

        await recordAuditLog({
          userId: 1,
          userName: 'Super Admin',
          action: 'UPDATE',
          menu: 'Pengaturan',
          description: `Memperbarui nama/deskripsi role: ${role.name}`,
          entityId: String(id),
        });

        return {
          success: true,
          message: 'Role berhasil diperbarui',
          data: role,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    }
  )

  .delete('/roles/:id', async ({ params, set }) => {
    try {
      const id = parseInt(params.id, 10);
      const role = inMemoryRolesStore.get(id);
      if (!role) {
        set.status = 404;
        return { success: false, message: 'Role tidak ditemukan' };
      }

      if (role.isSystem) {
        set.status = 403;
        return {
          success: false,
          message: `Role sistem '${role.name}' dilindungi dan tidak dapat dihapus`,
        };
      }

      inMemoryRolesStore.delete(id);
      inMemoryPermissionsStore.delete(id);

      await recordAuditLog({
        userId: 1,
        userName: 'Super Admin',
        action: 'DELETE',
        menu: 'Pengaturan',
        description: `Menghapus role: ${role.name}`,
        entityId: String(id),
      });

      return {
        success: true,
        message: `Role '${role.name}' berhasil dihapus`,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  .get('/roles/:id/permissions', async ({ params, set }) => {
    try {
      const id = parseInt(params.id, 10);
      const role = inMemoryRolesStore.get(id);
      if (!role) {
        set.status = 404;
        return { success: false, message: 'Role tidak ditemukan' };
      }

      const permissions = inMemoryPermissionsStore.get(id) || [];
      return {
        success: true,
        roleName: role.name,
        data: permissions,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, message: err.message };
    }
  })

  .put(
    '/roles/:id/permissions',
    async ({ params, body, set }) => {
      try {
        const id = parseInt(params.id, 10);
        const role = inMemoryRolesStore.get(id);
        if (!role) {
          set.status = 404;
          return { success: false, message: 'Role tidak ditemukan' };
        }

        const now = new Date();
        const updatedPerms: RolePermission[] = body.permissions.map((item) => ({
          id: nextPermId++,
          roleId: id,
          menu: item.menu,
          canView: Boolean(item.canView),
          canCreate: Boolean(item.canCreate),
          canEdit: Boolean(item.canEdit),
          canDelete: Boolean(item.canDelete),
          createdAt: now,
          updatedAt: now,
        }));

        inMemoryPermissionsStore.set(id, updatedPerms);

        await recordAuditLog({
          userId: 1,
          userName: 'Super Admin',
          action: 'UPDATE',
          menu: 'Pengaturan',
          description: `Memperbarui matriks hak akses permissions untuk role '${role.name}' (${updatedPerms.length} menu)`,
          entityId: String(id),
        });

        return {
          success: true,
          message: `Hak akses untuk role '${role.name}' berhasil disimpan`,
          data: updatedPerms,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        permissions: t.Array(
          t.Object({
            menu: t.String(),
            canView: t.Boolean(),
            canCreate: t.Boolean(),
            canEdit: t.Boolean(),
            canDelete: t.Boolean(),
          })
        ),
      }),
    }
  );
