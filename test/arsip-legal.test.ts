import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Arsip Legal', () => {
  let createdArsipId: number;
  const testKodeArsip = 'ARS-TEST-999';

  it('1. GET /api/arsip-legal returns list and summary statistics', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/arsip-legal'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.total).toBe('number');
    expect(typeof body.summary.tersedia).toBe('number');
    expect(typeof body.summary.dipinjam).toBe('number');
  });

  it('2. GET /api/arsip-legal/options/relations returns relation options', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/arsip-legal/options/relations'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data.project)).toBe(true);
    expect(Array.isArray(body.data.lokasi)).toBe(true);
    expect(Array.isArray(body.data.bidang)).toBe(true);
  });

  it('3. POST /api/arsip-legal creates a new archive record with physical storage', async () => {
    const payload = {
      kodeArsip: testKodeArsip,
      namaDokumen: 'Akta Jual Beli Tanah Blok Melati',
      kategori: 'Perikatan',
      jenisDokumen: 'AJB',
      nomorDokumen: 'AJB-12/2026/NOTARIS',
      tanggalDokumen: '2026-03-15',
      tipeRelasi: 'Bidang',
      idRelasi: 'BDG-001',
      lemari: 'Lemari Besi 01',
      rak: 'Rak B3',
      bantek: 'Bantek AJB 2026',
      folderMap: 'Folder Merah 10',
      statusFisik: 'Tersedia',
      catatan: 'Dokumen asli telah ditandatangani PPAT dan para pihak',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/arsip-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeArsip).toBe(testKodeArsip);
    expect(body.data.namaDokumen).toBe(payload.namaDokumen);
    expect(body.data.lemari).toBe(payload.lemari);
    expect(body.data.rak).toBe(payload.rak);
    expect(body.data.statusFisik).toBe('Tersedia');
    createdArsipId = body.data.id;
  });

  it('4. POST /api/arsip-legal with missing required fields returns 400 or 422', async () => {
    const invalidPayload = {
      kodeArsip: '',
      namaDokumen: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/arsip-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('5. POST /api/arsip-legal with duplicate kodeArsip returns 409 conflict', async () => {
    const duplicatePayload = {
      kodeArsip: testKodeArsip,
      namaDokumen: 'Duplikat Dokumen',
      kategori: 'Perizinan',
      jenisDokumen: 'SK',
      nomorDokumen: 'SK-DUP-01',
      tanggalDokumen: '2026-01-01',
      tipeRelasi: 'Umum',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/arsip-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('6. POST /api/arsip-legal with invalid statusFisik returns 400', async () => {
    const invalidStatusPayload = {
      kodeArsip: 'ARS-INVALID-01',
      namaDokumen: 'Invalid Status Test',
      kategori: 'Umum',
      jenisDokumen: 'Surat',
      nomorDokumen: 'SRT-01',
      tanggalDokumen: '2026-01-01',
      tipeRelasi: 'Umum',
      statusFisik: 'StatusNgawur',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/arsip-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidStatusPayload),
      })
    );

    expect(res.status).toBe(400);
  });

  it('7. GET /api/arsip-legal/:id retrieves single archive by ID', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal/${createdArsipId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdArsipId);
    expect(body.data.kodeArsip).toBe(testKodeArsip);
  });

  it('8. GET /api/arsip-legal/:id retrieves single archive by kodeArsip', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal/${testKodeArsip}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeArsip).toBe(testKodeArsip);
  });

  it('9. GET /api/arsip-legal with search and statusFisik filter works', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal?search=Melati&statusFisik=Tersedia`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((a: any) => a.kodeArsip === testKodeArsip)).toBe(true);
  });

  it('10. PUT /api/arsip-legal/:id updates archive and physical storage', async () => {
    const updatePayload = {
      namaDokumen: 'Akta Jual Beli Tanah Blok Melati (Perubahan)',
      statusFisik: 'Dipinjam',
      lemari: 'Lemari Arsip Utama',
      rak: 'Rak A1',
      catatan: 'Sedang dipinjam tim legal untuk pemeriksaan audit',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal/${createdArsipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.namaDokumen).toBe(updatePayload.namaDokumen);
    expect(body.data.statusFisik).toBe('Dipinjam');
    expect(body.data.lemari).toBe(updatePayload.lemari);
    expect(body.data.rak).toBe(updatePayload.rak);
    expect(body.data.catatan).toBe(updatePayload.catatan);
  });

  it('11. PUT /api/arsip-legal/:id with invalid statusFisik returns 400', async () => {
    const invalidPayload = {
      statusFisik: 'StatusTidakValid',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal/${createdArsipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect(res.status).toBe(400);
  });

  it('12. DELETE /api/arsip-legal/:id removes the archive record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal/${createdArsipId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/arsip-legal/${createdArsipId}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
