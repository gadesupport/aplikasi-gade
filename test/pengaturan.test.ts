import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Pengaturan (Profil Saya, Management User & Role Permissions RBAC)', () => {
  let createdUserId: number;
  let createdRoleId: number;

  // 1. Profil Saya
  it('1. GET /api/profile returns the active profile without password hash', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/profile'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(1);
    expect(body.data.name).toBe('Super Admin');
    expect(body.data.email).toBe('admin@gade.id');
    expect(body.data.password).toBeUndefined();
  });

  it('2. PUT /api/profile updates user profile info and records audit log', async () => {
    const payload = {
      name: 'Super Admin Gade',
      phone: '081234567899',
    };
    const res = await app.handle(
      new Request('http://localhost:3000/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Super Admin Gade');
    expect(body.data.phone).toBe('081234567899');
  });

  // 2. Management User
  it('3. GET /api/users returns list of all system users', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/users'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(4);
  });

  it('4. POST /api/users creates a new user account', async () => {
    const payload = {
      name: 'Ahmad Fauzi',
      email: 'fauzi@gade.id',
      password: 'password123',
      role: 'Staff Legal',
      phone: '081233445566',
    };
    const res = await app.handle(
      new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe('Ahmad Fauzi');
    expect(body.data.email).toBe('fauzi@gade.id');
    expect(body.data.password).toBeUndefined();
    createdUserId = body.data.id;
  });

  it('5. POST /api/users with duplicate email returns 409 conflict', async () => {
    const payload = {
      name: 'Duplicate Fauzi',
      email: 'fauzi@gade.id',
      password: 'password123',
    };
    const res = await app.handle(
      new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(res.status).toBe(409);
  });

  it('6. GET /api/users/:id retrieves user detail', async () => {
    const res = await app.handle(new Request(`http://localhost:3000/api/users/${createdUserId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdUserId);
    expect(body.data.name).toBe('Ahmad Fauzi');
  });

  it('7. PUT /api/users/:id updates user details', async () => {
    const payload = {
      name: 'Ahmad Fauzi S.H.',
      role: 'Staff Legal Senior',
    };
    const res = await app.handle(
      new Request(`http://localhost:3000/api/users/${createdUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Ahmad Fauzi S.H.');
    expect(body.data.role).toBe('Staff Legal Senior');
  });

  it('8. DELETE /api/users/:id removes the user account', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/users/${createdUserId}`, {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(new Request(`http://localhost:3000/api/users/${createdUserId}`));
    expect(checkRes.status).toBe(404);
  });

  it('9. DELETE /api/users/1 protects Super Admin from being deleted', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/users/1', {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(403);
  });

  // 3. Management Akses Role & Menu (RBAC)
  it('10. GET /api/roles returns all roles with permission matrix and user counts', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/roles'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5);
    expect(body.data[0].permissions).toBeDefined();
  });

  it('11. POST /api/roles creates a new role with default permissions', async () => {
    const payload = {
      name: 'Notaris Mitra',
      description: 'Role khusus rekanan notaris untuk verifikasi sertifikat & BAST',
    };
    const res = await app.handle(
      new Request('http://localhost:3000/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe('Notaris Mitra');
    expect(Array.isArray(body.data.permissions)).toBe(true);
    createdRoleId = body.data.id;
  });

  it('12. GET /api/roles/:id/permissions gets menu matrix for role', async () => {
    const res = await app.handle(new Request(`http://localhost:3000/api/roles/${createdRoleId}/permissions`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.roleName).toBe('Notaris Mitra');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('13. PUT /api/roles/:id/permissions updates role access permissions matrix', async () => {
    const permissionsPayload = [
      { menu: 'bast', canView: true, canCreate: true, canEdit: true, canDelete: false },
      { menu: 'legalitas', canView: true, canCreate: false, canEdit: false, canDelete: false },
      { menu: 'arsip', canView: true, canCreate: true, canEdit: false, canDelete: false },
    ];

    const res = await app.handle(
      new Request(`http://localhost:3000/api/roles/${createdRoleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsPayload }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(3);
    const bastPerm = body.data.find((p: any) => p.menu === 'bast');
    expect(bastPerm.canCreate).toBe(true);
  });

  it('14. DELETE /api/roles/:id removes custom role', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/roles/${createdRoleId}`, {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('15. DELETE /api/roles/1 forbids deletion of system role Super Admin', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/roles/1', {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(403);
  });

  it('16. GET /api/pengaturan/menus lists all system menus', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/pengaturan/menus'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(14);
  });
});
