import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Audit Log (Audit Trail & Logging Aktivitas Pengguna)', () => {
  let createdLogId: number;

  it('1. GET /api/audit-log returns paginated list of audit logs', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/audit-log'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThan(0);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].action).toBeDefined();
    expect(body.data[0].menu).toBeDefined();
    expect(body.data[0].description).toBeDefined();
  });

  it('2. GET /api/audit-log supports filtering by action', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/audit-log?action=CREATE'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.every((l: any) => l.action === 'CREATE')).toBe(true);
  });

  it('3. GET /api/audit-log supports filtering by menu/module', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/audit-log?menu=Lokasi'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.every((l: any) => l.menu.toLowerCase() === 'lokasi')).toBe(true);
  });

  it('4. GET /api/audit-log supports search term', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/audit-log?search=Kawasan'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.some((l: any) => l.description.includes('Kawasan'))).toBe(true);
  });

  it('5. GET /api/audit-log/stats returns summary metrics', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/audit-log/stats'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalLogs).toBeGreaterThan(0);
    expect(body.data.byAction).toBeDefined();
    expect(body.data.byMenu).toBeDefined();
  });

  it('6. POST /api/audit-log manually records a new audit event', async () => {
    const payload = {
      userId: 1,
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'UPDATE',
      menu: 'Pengaturan',
      description: 'Test manual log entry unit test',
      entityId: 'SET-999',
      metadata: { unitTest: true },
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.action).toBe('UPDATE');
    expect(body.data.menu).toBe('Pengaturan');
    createdLogId = body.data.id;
  });

  it('7. GET /api/audit-log/:id retrieves detail of the created log', async () => {
    const res = await app.handle(new Request(`http://localhost:3000/api/audit-log/${createdLogId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdLogId);
    expect(body.data.description).toBe('Test manual log entry unit test');
  });

  it('8. GET /api/audit-log/:id returns 404 for non-existent log', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/audit-log/999999'));
    expect(res.status).toBe(404);
  });
});
