import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Pembebasan (Tracking Transaksi Pembayaran Tanah)', () => {
  let createdPaymentId: number;
  const testKodeTanah = 'BDT-2026-001';

  it('1. GET /api/pembebasan returns list and financial summary', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.totalNominal).toBe('number');
    expect(typeof body.totalLunas).toBe('number');
    expect(typeof body.totalPending).toBe('number');
    expect(body.ringkasanStatus).toBeDefined();
    expect(body.ringkasanTahap).toBeDefined();
  });

  it('2. POST /api/pembebasan creates a new payment record', async () => {
    const payload = {
      kodeTanah: testKodeTanah,
      tanggalPembayaran: '2026-03-20',
      jumlahPembayaran: 500000000,
      tahapPembayaran: 'Termin 2',
      metodePembayaran: 'Transfer Bank',
      nomorReferensi: 'TRF-TEST-999',
      status: 'Lunas',
      catatan: 'Pembayaran termin kedua uji coba sistem',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeTanah).toBe(testKodeTanah);
    expect(body.data.tahapPembayaran).toBe('Termin 2');
    expect(body.data.status).toBe('Lunas');
    expect(body.data.nomorReferensi).toBe('TRF-TEST-999');
    expect(parseFloat(body.data.jumlahPembayaran)).toBe(500000000);
    createdPaymentId = body.data.id;
  });

  it('3. POST /api/pembebasan supports bidang_id alias and numeric amounts', async () => {
    const payload = {
      bidang_id: 'BDT-2026-002',
      tanggal_pembayaran: '2026-03-22',
      jumlah_pembayaran: '250000000.00',
      tahap_pembayaran: 'Termin 1',
      metode_pembayaran: 'Tunai',
      status: 'Pending',
      catatan: 'Uji alias bidang_id',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeTanah).toBe('BDT-2026-002');
    expect(body.data.bidangId).toBe('BDT-2026-002');
  });

  it('4. POST /api/pembebasan with missing required fields returns 400', async () => {
    const invalidPayload = {
      kodeTanah: '',
      jumlahPembayaran: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('5. POST /api/pembebasan with invalid/negative amount returns 400', async () => {
    const invalidPayload = {
      kodeTanah: testKodeTanah,
      tanggalPembayaran: '2026-03-20',
      jumlahPembayaran: -100000,
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('6. POST /api/pembebasan with invalid status returns 400', async () => {
    const invalidPayload = {
      kodeTanah: testKodeTanah,
      tanggalPembayaran: '2026-03-20',
      jumlahPembayaran: 100000,
      status: 'StatusPalsu',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('7. POST /api/pembebasan with invalid tahapPembayaran returns 400', async () => {
    const invalidPayload = {
      kodeTanah: testKodeTanah,
      tanggalPembayaran: '2026-03-20',
      jumlahPembayaran: 100000,
      tahapPembayaran: 'TahapKhayalan',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('8. GET /api/pembebasan/:id retrieves single payment detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembebasan/${createdPaymentId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPaymentId);
    expect(body.data.kodeTanah).toBe(testKodeTanah);
  });

  it('9. GET /api/pembebasan/bidang/:bidangId retrieves tracking for a specific parcel', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembebasan/bidang/${testKodeTanah}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bidangId).toBe(testKodeTanah);
    expect(body.rekap).toBeDefined();
    expect(typeof body.rekap.hargaKesepakatan).toBe('number');
    expect(typeof body.rekap.totalDibayar).toBe('number');
    expect(typeof body.rekap.sisaPembayaran).toBe('number');
    expect(Array.isArray(body.transaksi)).toBe(true);
  });

  it('10. GET /api/pembebasan/rekap returns master control summary of all parcels', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pembebasan/rekap')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary).toBeDefined();
    expect(body.summary.grandTotalKesepakatan).toBeGreaterThan(0);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('11. PUT /api/pembebasan/:id updates transaction record', async () => {
    const updatePayload = {
      status: 'Lunas',
      catatan: 'Status diperbarui menjadi Lunas setelah kliring berhasil',
      nomorReferensi: 'TRF-TEST-UPDATED-001',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembebasan/${createdPaymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('Lunas');
    expect(body.data.nomorReferensi).toBe('TRF-TEST-UPDATED-001');
  });

  it('12. DELETE /api/pembebasan/:id removes the transaction record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pembebasan/${createdPaymentId}`, {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify it is gone
    const verifyRes = await app.handle(
      new Request(`http://localhost:3000/api/pembebasan/${createdPaymentId}`)
    );
    expect(verifyRes.status).toBe(404);
  });
});
