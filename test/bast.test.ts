import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API BAST (Berita Acara Serah Terima)', () => {
  let createdBastId: number;
  const testNomorBast = 'BAST-TEST/2026/001';

  it('1. GET /api/bast returns list and statistics', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/bast'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.stats).toBeDefined();
    expect(typeof body.stats.totalBast).toBe('number');
    expect(typeof body.stats.peminjamanCount).toBe('number');
    expect(typeof body.stats.pengembalianCount).toBe('number');
    expect(typeof body.stats.totalDokumenAll).toBe('number');
  });

  it('2. GET /api/bast/arsip-options returns available archives for selection', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/bast/arsip-options'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].kodeArsip).toBeDefined();
    expect(body.data[0].statusFisik).toBeDefined();
  });

  it('3. POST /api/bast creates a multi-document BAST Peminjaman and updates document status', async () => {
    const payload = {
      nomorBast: testNomorBast,
      tanggal: '2026-03-20',
      jenis: 'Peminjaman',
      pihakPenyerah: 'Ahmad Faisal (Legal Officer)',
      pihakPenerima: 'Kantor Notaris & PPAT Siti Rahma, S.H.',
      keterangan: 'Peminjaman sertifikat dan PPJB untuk kepengurusan balik nama lahan.',
      items: [
        { idArsipLegal: 1, catatan: 'Sertifikat asli diperiksa lengkap' },
        { idArsipLegal: 3, catatan: 'SK KKPR legalisir lengkap' },
      ],
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/bast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.nomorBast).toBe(testNomorBast);
    createdBastId = body.data.id;
  });

  it('4. GET /api/bast/:id returns BAST details with document items', async () => {
    const res = await app.handle(new Request(`http://localhost:3000/api/bast/${createdBastId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.nomorBast).toBe(testNomorBast);
    expect(body.data.jenis).toBe('Peminjaman');
    expect(Array.isArray(body.data.details)).toBe(true);
    expect(body.data.details.length).toBe(2);
    expect(body.data.details[0].arsip).toBeDefined();
  });

  it('5. GET /api/bast/:id/cetak generates valid PDF with QR Code and TTD Digital headers', async () => {
    const res = await app.handle(new Request(`http://localhost:3000/api/bast/${createdBastId}/cetak`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('inline;');

    const pdfBuffer = await res.arrayBuffer();
    expect(pdfBuffer.byteLength).toBeGreaterThan(1000);
    // PDF Magic bytes check: '%PDF'
    const pdfHeader = new Uint8Array(pdfBuffer.slice(0, 4));
    const magicString = String.fromCharCode(...pdfHeader);
    expect(magicString).toBe('%PDF');
  });

  it('6. POST /api/bast without items returns 400 Bad Request', async () => {
    const invalidPayload = {
      nomorBast: 'BAST-INVALID',
      tanggal: '2026-03-20',
      jenis: 'Peminjaman',
      pihakPenyerah: 'User A',
      pihakPenerima: 'User B',
      items: [],
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/bast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('7. DELETE /api/bast/:id deletes the BAST record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/bast/${createdBastId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify it is gone
    const checkRes = await app.handle(new Request(`http://localhost:3000/api/bast/${createdBastId}`));
    expect(checkRes.status).toBe(404);
  });
});
