import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Pembahasan Lahan', () => {
  let createdPembahasanId: number;
  const testRefId = 'LOK-2026-001';

  it('1. GET /api/pembahasan returns list of discussions', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pembahasan')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. POST /api/pembahasan creates a new discussion record', async () => {
    const payload = {
      target: 'Lokasi',
      referensiId: testRefId,
      tanggal: '2026-02-12',
      peserta: 'Tim Pengadaan, Notaris, Camat',
      hasilPembahasan: 'Rapat koordinasi awal penetapan lokasi pembebasan lahan.',
      keputusan: 'Layak',
      catatan: 'Segera lanjut ke pendataan bidang tanah warga.',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembahasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.target).toBe('Lokasi');
    expect(body.data.referensiId).toBe(testRefId);
    expect(body.data.keputusan).toBe('Layak');
    expect(body.data.peserta).toBe('Tim Pengadaan, Notaris, Camat');
    createdPembahasanId = body.data.id;
  });

  it('3. POST /api/pembahasan with missing required fields returns 422 or 400', async () => {
    const invalidPayload = {
      target: '',
      referensiId: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembahasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('4. POST /api/pembahasan with invalid target returns 400 or 422', async () => {
    const invalidTarget = {
      target: 'InvalidTarget',
      referensiId: 'LOK-001',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembahasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTarget),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('5. POST /api/pembahasan with invalid keputusan returns 400 or 422', async () => {
    const invalidKeputusan = {
      target: 'Lokasi',
      referensiId: 'LOK-001',
      keputusan: 'StatusNgawur',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembahasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidKeputusan),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('6. GET /api/pembahasan/:id retrieves single discussion detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembahasan/${createdPembahasanId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPembahasanId);
    expect(body.data.keputusan).toBe('Layak');
  });

  it('7. PUT /api/pembahasan/:id updates discussion information', async () => {
    const updatePayload = {
      keputusan: 'Perlu Kajian',
      hasilPembahasan: 'Perlu evaluasi lanjutan terkait harga appraisal.',
      catatan: 'Diperbarui via unit test',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembahasan/${createdPembahasanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.keputusan).toBe('Perlu Kajian');
    expect(body.data.catatan).toBe(updatePayload.catatan);
  });

  it('8. DELETE /api/pembahasan/:id removes the discussion record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembahasan/${createdPembahasanId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/pembahasan/${createdPembahasanId}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
