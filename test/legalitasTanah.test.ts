import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Legalitas Tanah', () => {
  let createdLegalitasId: number;
  const testKodeTanah = 'BDT-2026-001';

  it('1. GET /api/legalitas-tanah returns list of documents', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/legalitas-tanah')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.ringkasanStatus).toBeDefined();
  });

  it('2. POST /api/legalitas-tanah creates a new document record', async () => {
    const payload = {
      kodeTanah: testKodeTanah,
      jenisDokumen: 'AJB',
      status: 'Ada',
      nomorDokumen: 'AJB No. 45/PPAT-BGR/2020',
      tanggalDokumen: '2020-05-14',
      penerbit: 'PPAT Hendra Gunawan, S.H.',
      pihakId: 1,
      catatan: 'Dokumen asli Akta Jual Beli sudah disimpan di brankas legal.',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/legalitas-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeTanah).toBe(testKodeTanah);
    expect(body.data.jenisDokumen).toBe('AJB');
    expect(body.data.status).toBe('Ada');
    expect(body.data.nomorDokumen).toBe('AJB No. 45/PPAT-BGR/2020');
    expect(body.data.penerbit).toBe('PPAT Hendra Gunawan, S.H.');
    createdLegalitasId = body.data.id;
  });

  it('3. POST /api/legalitas-tanah with missing required fields returns 422 or 400', async () => {
    const invalidPayload = {
      kodeTanah: '',
      jenisDokumen: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/legalitas-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('4. POST /api/legalitas-tanah with invalid jenisDokumen returns 400 or 422', async () => {
    const invalidPayload = {
      kodeTanah: testKodeTanah,
      jenisDokumen: 'JenisDokumenPalsu',
      status: 'Ada',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/legalitas-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('5. POST /api/legalitas-tanah with invalid status returns 400 or 422', async () => {
    const invalidPayload = {
      kodeTanah: testKodeTanah,
      jenisDokumen: 'SHM',
      status: 'StatusNgawur',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/legalitas-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('6. GET /api/legalitas-tanah/:id retrieves single document detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/legalitas-tanah/${createdLegalitasId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdLegalitasId);
    expect(body.data.jenisDokumen).toBe('AJB');
  });

  it('7. GET /api/legalitas-tanah/by-bidang/:kodeTanah retrieves documents for parcel', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/legalitas-tanah/by-bidang/${testKodeTanah}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.kodeTanah).toBe(testKodeTanah);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((d: any) => d.id === createdLegalitasId)).toBe(true);
  });

  it('8. PUT /api/legalitas-tanah/:id updates document information', async () => {
    const updatePayload = {
      status: 'Proses',
      catatan: 'Dokumen sedang dipinjam notaris untuk validasi perpajakan.',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/legalitas-tanah/${createdLegalitasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('Proses');
    expect(body.data.catatan).toBe(updatePayload.catatan);
  });

  it('9. DELETE /api/legalitas-tanah/:id removes the document record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/legalitas-tanah/${createdLegalitasId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/legalitas-tanah/${createdLegalitasId}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
