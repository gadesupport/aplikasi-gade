import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Lokasi (Step 1 & Step 2 Peta)', () => {
  const testKode = `LOK-TEST-${Date.now()}`;

  it('1. GET /api/lokasi returns list of locations', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/lokasi'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. POST /api/lokasi (Step 1) creates a new location record', async () => {
    const newLocation = {
      kodeLokasi: testKode,
      namaLokasi: 'Kawasan Bisnis Gade Cemerlang',
      alamat: 'Jl. Margonda Raya No. 120',
      desa: 'Kemiri Muka',
      kecamatan: 'Beji',
      kabupaten: 'Depok',
      peruntukan: 'Komersial & Ritel',
      kondisiLahan: 'Lahan datar siap bangun',
      kondisiPasar: 'Strategis di pusat kota',
      luasTarget: 20000,
      luasTeridentifikasi: 18000,
      luasDeal: 15000,
      status: 'Survey',
      catatan: 'Testing automated creation',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/lokasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeLokasi).toBe(testKode);
    expect(body.data.namaLokasi).toBe('Kawasan Bisnis Gade Cemerlang');
    expect(body.data.status).toBe('Survey');
  });

  it('3. POST /api/lokasi with duplicate kodeLokasi returns 409 conflict', async () => {
    const duplicateLocation = {
      kodeLokasi: testKode,
      namaLokasi: 'Duplikasi Lokasi',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/lokasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateLocation),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('4. GET /api/lokasi/:kodeLokasi retrieves the created location', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/lokasi/${testKode}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeLokasi).toBe(testKode);
  });

  it('5. PUT /api/lokasi/:kodeLokasi updates Step 1 information', async () => {
    const updatePayload = {
      namaLokasi: 'Kawasan Bisnis Gade Cemerlang (Updated)',
      status: 'Proses Pembahasan',
      luasDeal: 17500,
      catatan: 'Tahap negosiasi harga deal selesai',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/lokasi/${testKode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.namaLokasi).toBe('Kawasan Bisnis Gade Cemerlang (Updated)');
    expect(body.data.status).toBe('Proses Pembahasan');
  });

  it('6. PATCH /api/lokasi/:kodeLokasi/batas (Step 2) updates map boundaries and areas', async () => {
    const batasPayload = {
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.82, -6.41],
            [106.83, -6.41],
            [106.83, -6.42],
            [106.82, -6.42],
            [106.82, -6.41],
          ],
        ],
      },
      luasInduk: 20000,
      totalLuasBidang: 8000,
      sisaLuas: 12000,
      bidangTerpetakan: [
        {
          id: 'b-1',
          kodeBidang: 'BDG-01',
          nomorBidang: '001/2026',
          luas: 5000,
          keterangan: 'Bidang Kavling A',
        },
        {
          id: 'b-2',
          kodeBidang: 'BDG-02',
          nomorBidang: '002/2026',
          luas: 3000,
          keterangan: 'Bidang Kavling B',
        },
      ],
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/lokasi/${testKode}/batas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batasPayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(parseFloat(body.data.luasInduk)).toBe(20000);
    expect(parseFloat(body.data.totalLuasBidang)).toBe(8000);
    expect(parseFloat(body.data.sisaLuas)).toBe(12000);
    expect(body.data.bidangTerpetakan.length).toBe(2);
  });

  it('7. DELETE /api/lokasi/:kodeLokasi removes the location', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/lokasi/${testKode}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify it is gone
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/lokasi/${testKode}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
