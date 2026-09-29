import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Modul Laporan (Rekapitulasi & Ekspor PDF / Excel)', () => {
  it('1. GET /api/laporan/dashboard-stats returns aggregate metrics across modules', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/dashboard-stats'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
    expect(typeof body.stats.lokasi).toBe('number');
    expect(typeof body.stats.bidang).toBe('number');
    expect(typeof body.stats.pihak).toBe('number');
    expect(typeof body.stats.totalRealisasiDana).toBe('number');
  });

  it('2. GET /api/laporan/progress-pembebasan returns JSON progress with summary calculations', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/progress-pembebasan'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary).toBeDefined();
    expect(body.summary.totalBidang).toBeGreaterThan(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('3. GET /api/laporan/progress-pembebasan?format=excel returns valid Excel spreadsheet stream', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/progress-pembebasan?format=excel'));
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('openxmlformats-officedocument.spreadsheetml.sheet');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it('4. GET /api/laporan/progress-pembebasan?format=pdf returns valid PDF document stream', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/progress-pembebasan?format=pdf'));
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('application/pdf');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(500);
  });

  it('5. GET /api/laporan/rekap-lokasi returns location report list and supports excel/pdf', async () => {
    const resJson = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-lokasi'));
    expect(resJson.status).toBe(200);
    const body = await resJson.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const resPdf = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-lokasi?format=pdf'));
    expect(resPdf.status).toBe(200);
    expect(resPdf.headers.get('content-type')).toContain('application/pdf');
  });

  it('6. GET /api/laporan/rekap-bidang returns parcel reports', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-bidang'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('7. GET /api/laporan/rekap-pihak returns landowner parties', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-pihak'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('8. GET /api/laporan/rekap-survey returns survey report data', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-survey'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('9. GET /api/laporan/rekap-legalitas returns land legal document list', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-legalitas'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('10. GET /api/laporan/rekap-pembahasan returns land deliberation records', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-pembahasan'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('11. GET /api/laporan/rekap-pemetaan returns mapping & KKPR reports', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-pemetaan'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('12. GET /api/laporan/rekap-project returns project monitoring records', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-project'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('13. GET /api/laporan/rekap-arsip returns legal archive status and physical storage', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-arsip'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('14. GET /api/laporan/rekap-bast returns BAST handover records', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/laporan/rekap-bast'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
