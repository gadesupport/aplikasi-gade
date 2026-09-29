import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Project Lahan', () => {
  let createdProjectId: number;
  const testKodeProject = 'PRJ-TEST-099';

  it('1. GET /api/projects returns list and summary statistics', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/projects'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.total).toBe('number');
    expect(typeof body.summary.perencanaan).toBe('number');
  });

  it('2. POST /api/projects creates a new project record', async () => {
    const payload = {
      kodeProject: testKodeProject,
      namaProject: 'Proyek Kawasan Perkantoran Hijau Gade',
      lokasi: 'Zona Selatan',
      desa: 'Kalimulya',
      kecamatan: 'Cilodong',
      kabupaten: 'Depok',
      status: 'Perencanaan',
      keterangan: 'Rencana pembangunan eco-office dan sentra riset pengadaan lahan',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeProject).toBe(testKodeProject);
    expect(body.data.namaProject).toBe(payload.namaProject);
    expect(body.data.status).toBe('Perencanaan');
    createdProjectId = body.data.id;
  });

  it('3. POST /api/projects with missing required fields returns 400 or 422', async () => {
    const invalidPayload = {
      kodeProject: '',
      namaProject: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('4. POST /api/projects with duplicate kodeProject returns 409 conflict', async () => {
    const duplicatePayload = {
      kodeProject: testKodeProject,
      namaProject: 'Duplicate Project Name',
      lokasi: 'Zona Barat',
      desa: 'Sukamaju',
      kecamatan: 'Cilodong',
      kabupaten: 'Depok',
      status: 'Perencanaan',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('5. GET /api/projects/:id retrieves single project by ID', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/projects/${createdProjectId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdProjectId);
    expect(body.data.kodeProject).toBe(testKodeProject);
  });

  it('6. GET /api/projects/:id retrieves single project by kodeProject', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/projects/${testKodeProject}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeProject).toBe(testKodeProject);
  });

  it('7. GET /api/projects with search and status filter works', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/projects?search=Hijau&status=Perencanaan`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((p: any) => p.kodeProject === testKodeProject)).toBe(true);
  });

  it('8. PUT /api/projects/:id updates project information', async () => {
    const updatePayload = {
      namaProject: 'Proyek Kawasan Hijau Terpadu Gade Updated',
      status: 'Berjalan',
      keterangan: 'Perizinan KKPR disetujui, pelaksanaan pembebasan dimulai',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/projects/${createdProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.namaProject).toBe(updatePayload.namaProject);
    expect(body.data.status).toBe('Berjalan');
    expect(body.data.keterangan).toBe(updatePayload.keterangan);
  });

  it('9. PUT /api/projects/:id with invalid status returns 400', async () => {
    const invalidPayload = {
      status: 'StatusTidakValid',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/projects/${createdProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect(res.status).toBe(400);
  });

  it('10. DELETE /api/projects/:id removes the project record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/projects/${createdProjectId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/projects/${createdProjectId}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
