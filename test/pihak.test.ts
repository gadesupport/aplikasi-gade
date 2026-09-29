import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Pihak/Pemilik (Integrasi Bidang Tanah)', () => {
  let createdPihakId: number;
  const testKodeTanah = 'BDT-2026-001';

  it('1. GET /api/pihak returns list of parties/owners', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/pihak'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. POST /api/pihak creates a new owner/party linked to bidang tanah', async () => {
    const payload = {
      kodeTanah: testKodeTanah,
      nama: 'Raden Mas Suryo Kusumo',
      nik: '3201011508880009',
      nomorTelp: '081288990011',
      tipePihak: 'Pemegang Hak',
      catatan: 'Pemilik tanah sah bersertifikat',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pihak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.nama).toBe(payload.nama);
    expect(body.data.kodeTanah).toBe(testKodeTanah);
    expect(body.data.tipePihak).toBe('Pemegang Hak');
    expect(body.data.nik).toBe(payload.nik);
    createdPihakId = body.data.id;
  });

  it('3. POST /api/pihak with missing required fields returns 400', async () => {
    const invalidPayload = {
      nama: '',
      kodeTanah: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pihak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('4. GET /api/pihak/:id retrieves single pihak detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pihak/${createdPihakId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPihakId);
    expect(body.data.nama).toBe('Raden Mas Suryo Kusumo');
  });

  it('5. GET /api/pihak/by-bidang/:kodeTanah retrieves parties grouped by parcel', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pihak/by-bidang/${testKodeTanah}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.kodeTanah).toBe(testKodeTanah);
    expect(body.totalPihak).toBeGreaterThan(0);
    expect(body.ringkasanTipe).toBeDefined();
    expect(body.ringkasanTipe['Pemegang Hak']).toBeGreaterThan(0);
  });

  it('6. PUT /api/pihak/:id updates owner/party information', async () => {
    const updatePayload = {
      tipePihak: 'Ahli Waris',
      nomorTelp: '081299998888',
      catatan: 'Status diperbarui menjadi ahli waris setelah mediasi',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/pihak/${createdPihakId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tipePihak).toBe('Ahli Waris');
    expect(body.data.nomorTelp).toBe('081299998888');
    expect(body.data.catatan).toBe(updatePayload.catatan);
  });

  it('7. DELETE /api/pihak/:id removes the party/owner record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pihak/${createdPihakId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/pihak/${createdPihakId}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
