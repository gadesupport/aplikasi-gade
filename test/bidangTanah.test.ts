import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Bidang Tanah (Step 1 & Step 2 Polygon & Legalitas)', () => {
  const testKode = `BDT-TEST-${Date.now()}`;
  const parentLokasiKode = 'LOK-2026-001';

  it('1. GET /api/bidang-tanah returns list of parcels', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/bidang-tanah'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. POST /api/bidang-tanah creates a new parcel record (Step 1)', async () => {
    const payload = {
      kodeTanah: testKode,
      kodeLokasi: parentLokasiKode,
      nomorBidang: '099/SKM/2026',
      luas: 4500,
      jenisHak: 'SHM',
      nomorHak: 'SHM No. 99881',
      statusPembebasan: 'Negosiasi',
      hargaPenawaran: 6000000000,
      hargaKesepakatan: 5750000000,
      tanggalKesepakatan: '2026-02-15',
      catatan: 'Testing parcel automated creation',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/bidang-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeTanah).toBe(testKode);
    expect(body.data.kodeLokasi).toBe(parentLokasiKode);
    expect(parseFloat(body.data.luas)).toBe(4500);
    expect(body.data.statusPembebasan).toBe('Negosiasi');
  });

  it('3. POST /api/bidang-tanah with duplicate kodeTanah returns 409', async () => {
    const duplicate = {
      kodeTanah: testKode,
      kodeLokasi: parentLokasiKode,
      luas: 2000,
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/bidang-tanah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicate),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('4. GET /api/bidang-tanah/:kodeTanah retrieves the parcel details', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/bidang-tanah/${testKode}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeTanah).toBe(testKode);
  });

  it('5. PUT /api/bidang-tanah/:kodeTanah updates parcel information', async () => {
    const updatePayload = {
      statusPembebasan: 'Deal',
      hargaKesepakatan: 5800000000,
      catatan: 'Harga deal disepakati kedua belah pihak',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/bidang-tanah/${testKode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.statusPembebasan).toBe('Deal');
    expect(parseFloat(body.data.hargaKesepakatan)).toBe(5800000000);
  });

  it('6. PATCH /api/bidang-tanah/:kodeTanah/polygon updates polygon and legalitas checklist (Step 2)', async () => {
    const patchPayload = {
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.830, -6.416],
            [106.832, -6.416],
            [106.832, -6.418],
            [106.830, -6.418],
            [106.830, -6.416],
          ],
        ],
      },
      checklistLegalitas: [
        { id: 'dok-1', namaDokumen: 'KTP Pemilik', status: 'Ada', catatan: 'Lengkap' },
        { id: 'dok-2', namaDokumen: 'Kartu Keluarga', status: 'Ada', catatan: 'Lengkap' },
        { id: 'dok-3', namaDokumen: 'Sertifikat Asli', status: 'Ada', catatan: 'SHM Valid BPN' },
      ],
      luas: 4500,
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/bidang-tanah/${testKode}/polygon`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.geojson).toBeDefined();
    expect(body.data.checklistLegalitas.length).toBe(3);
    expect(body.data.checklistLegalitas[2].status).toBe('Ada');
  });

  it('7. GET /api/bidang-tanah/rekap/:kodeLokasi returns calculated summary', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/bidang-tanah/rekap/${parentLokasiKode}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeLokasi).toBe(parentLokasiKode);
    expect(body.data.totalLuasBidang).toBeGreaterThan(0);
    expect(body.data.jumlahBidang).toBeGreaterThan(0);
  });

  it('8. DELETE /api/bidang-tanah/:kodeTanah removes the parcel', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/bidang-tanah/${testKode}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify 404
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/bidang-tanah/${testKode}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
