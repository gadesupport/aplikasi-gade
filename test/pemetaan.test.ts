import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Pemetaan (GIS Control, Layers, Digitasi & KKPR)', () => {
  let createdKkprId: number;

  it('1. GET /api/pemetaan/layers returns aggregated spatial layers', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/layers')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.layers).toBeDefined();
    expect(body.layers.induk).toBeDefined();
    expect(body.layers.bidang).toBeDefined();
    expect(body.layers.kkpr).toBeDefined();

    // Check layer structure
    expect(body.layers.bidang.type).toBe('FeatureCollection');
    expect(Array.isArray(body.layers.bidang.features)).toBe(true);
    expect(body.layers.bidang.rekapStatusBayar).toBeDefined();
    expect(body.summary.totalPolygons).toBeGreaterThanOrEqual(0);
  });

  it('2. GET /api/pemetaan/layers supports filtering by kodeLokasi', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/layers?kodeLokasi=LOK-2026-001')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    for (const f of body.layers.induk.features) {
      expect(f.properties.kodeLokasi).toBe('LOK-2026-001');
    }
  });

  it('3. GET /api/pemetaan/kkpr returns list of planning records', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/kkpr')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('4. POST /api/pemetaan/kkpr creates a new KKPR planning record', async () => {
    const payload = {
      kodeKkpr: 'KKPR-TEST-999',
      namaKegiatan: 'Pembangunan Pusat Distribusi Hijau Terpadu',
      pemohon: 'PT Mandiri Mitra Gade',
      nomorIzin: 'OSS-991283-KKPR',
      kategori: 'Industri & Pergudangan',
      luasRencana: 8500.5,
      status: 'Diajukan',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [106.828, -6.415],
            [106.832, -6.415],
            [106.832, -6.418],
            [106.828, -6.418],
            [106.828, -6.415],
          ],
        ],
      },
      catatan: 'Permohonan kesesuaian ruang sistem OSS tahap pertama',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/kkpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kodeKkpr).toBe('KKPR-TEST-999');
    expect(body.data.status).toBe('Diajukan');
    expect(parseFloat(body.data.luasRencana)).toBe(8500.5);
    createdKkprId = body.data.id;
  });

  it('5. POST /api/pemetaan/kkpr with missing required fields returns 400', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/kkpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pemohon: 'Hanya Pemohon' }),
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('6. GET /api/pemetaan/kkpr/:id retrieves single record detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pemetaan/kkpr/${createdKkprId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdKkprId);
  });

  it('7. PUT /api/pemetaan/kkpr/:id updates KKPR record', async () => {
    const updatePayload = {
      namaKegiatan: 'Pembangunan Pusat Distribusi Hijau Terpadu (Revisi Tahap II)',
      status: 'Disetujui',
      luasRencana: 9200.0,
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/pemetaan/kkpr/${createdKkprId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('Disetujui');
    expect(parseFloat(body.data.luasRencana)).toBe(9200.0);
  });

  it('8. PATCH /api/pemetaan/polygon updates polygon boundary directly from map editor', async () => {
    const newGeojson = {
      type: 'Polygon',
      coordinates: [
        [
          [106.829, -6.416],
          [106.833, -6.416],
          [106.833, -6.419],
          [106.829, -6.419],
          [106.829, -6.416],
        ],
      ],
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/polygon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'kkpr',
          id: createdKkprId,
          geojson: newGeojson,
          luas: 9500,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('9. POST /api/pemetaan/import parses GeoJSON and returns FeatureCollection', async () => {
    const testGeoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [106.83, -6.415],
                [106.835, -6.415],
                [106.835, -6.418],
                [106.83, -6.418],
                [106.83, -6.415],
              ],
            ],
          },
          properties: {
            name: 'Kavling Uji Coba Import 1',
            luas: 4500,
          },
        },
      ],
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'geojson',
          layerCategory: 'kkpr',
          content: testGeoJson,
          fileName: 'test_kavling.geojson',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.featureCount).toBe(1);
    expect(Array.isArray(body.importedRecords)).toBe(true);
  });

  it('10. POST /api/pemetaan/import parses KML polygon format', async () => {
    const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Batas Perencanaan Barat</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              106.830,-6.415,0 106.834,-6.415,0 106.834,-6.418,0 106.830,-6.418,0 106.830,-6.415,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'kml',
          layerCategory: 'bidang',
          content: sampleKml,
          fileName: 'sample_boundary.kml',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.featureCount).toBe(1);
  });

  it('11. GET /api/pemetaan/export?format=geojson returns GeoJSON download', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/export?layer=kkpr&format=geojson')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('FeatureCollection');
    expect(Array.isArray(body.features)).toBe(true);
  });

  it('12. GET /api/pemetaan/export?format=kml returns KML XML format', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/export?layer=kkpr&format=kml')
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.includes('<kml')).toBe(true);
    expect(text.includes('<Polygon>')).toBe(true);
  });

  it('13. GET /api/pemetaan/export?format=shp returns valid ESRI Shapefile ZIP bundle for OSS KKPR', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/pemetaan/export?layer=kkpr&format=shp')
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it('14. DELETE /api/pemetaan/kkpr/:id deletes planning record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/pemetaan/kkpr/${createdKkprId}`, {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deleted
    const verifyRes = await app.handle(
      new Request(`http://localhost:3000/api/pemetaan/kkpr/${createdKkprId}`)
    );
    expect(verifyRes.status).toBe(404);
  });
});
