import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Modul Generate Dokumen (Template, Custom Fields & Cetak PDF)', () => {
  let createdFieldId: number;
  let createdTemplateId: number;

  it('1. GET /api/generate-dokumen/available-placeholders returns grouped placeholders', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/generate-dokumen/available-placeholders'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].category).toBeDefined();
    expect(Array.isArray(body.data[0].items)).toBe(true);
  });

  it('2. GET /api/generate-dokumen/reference-data returns auto-fill data for form mapping', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/generate-dokumen/reference-data'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.lokasi).toBeDefined();
    expect(body.data.bidang).toBeDefined();
    expect(body.data.projects).toBeDefined();
  });

  it('3. POST /api/generate-dokumen/fields creates a new custom field (Tambah Data)', async () => {
    const payload = {
      kodeField: 'custom_jabatan_camat',
      namaField: 'Jabatan Camat Setempat',
      tipeData: 'text',
      defaultValue: 'Camat Cilodong Kota Depok',
      keterangan: 'Untuk keperluan tanda tangan mengetahui di tingkat kecamatan',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/generate-dokumen/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.kodeField).toBe('custom_jabatan_camat');
    createdFieldId = body.data.id;
  });

  it('4. GET /api/generate-dokumen/fields lists all custom reference fields', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/generate-dokumen/fields'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((f: any) => f.kodeField === 'custom_jabatan_camat')).toBe(true);
  });

  it('5. POST /api/generate-dokumen/templates creates a custom template with 2-page book landscape layout', async () => {
    const payload = {
      kodeTemplate: 'TPL-TEST-BOOK-01',
      namaTemplate: 'Risalah Pengadaan Model Buku Uji Coba',
      kategori: 'Buku Risalah',
      ukuranKertas: 'A4',
      orientasi: 'Landscape',
      layoutMode: 'TwoPageBook',
      headerText: 'PT PEGADAIAN - DOKUMEN PENGADAAN BUKU DUA HALAMAN',
      isiTemplate: 'Halaman Kiri:\nKode Tanah: {{kodeTanah}}\nNama Pemilik: {{namaPemilik}}',
      isiTemplateHalaman2: 'Halaman Kanan:\nHarga: Rp {{hargaKesepakatan}}\nCamat: {{custom_jabatan_camat}}',
      footerText: 'Dicetak otomatis oleh Aplikasi Gade',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/generate-dokumen/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.kodeTemplate).toBe('TPL-TEST-BOOK-01');
    expect(body.data.layoutMode).toBe('TwoPageBook');
    createdTemplateId = body.data.id;
  });

  it('6. POST /api/generate-dokumen/preview compiles dynamic placeholders into text', async () => {
    const payload = {
      idTemplate: createdTemplateId,
      fieldValues: {
        kodeTanah: 'BDG-2026-001',
        namaPemilik: 'Budi Santoso',
        hargaKesepakatan: '2.750.000.000',
        custom_jabatan_camat: 'Drs. Supriyadi, M.Si.',
      },
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/generate-dokumen/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.compiledPage1).toContain('BDG-2026-001');
    expect(body.data.compiledPage1).toContain('Budi Santoso');
    expect(body.data.compiledPage2).toContain('2.750.000.000');
    expect(body.data.compiledPage2).toContain('Drs. Supriyadi, M.Si.');
  });

  it('7. POST /api/generate-dokumen/cetak generates valid PDF with TwoPageBook layout', async () => {
    const payload = {
      idTemplate: createdTemplateId,
      namaDokumen: 'Cetak_Buku_Risalah_Test',
      referensiTipe: 'Bidang',
      referensiId: 'BDG-2026-001',
      fieldValues: {
        kodeTanah: 'BDG-2026-001',
        namaPemilik: 'Budi Santoso',
        hargaKesepakatan: '2.750.000.000',
        custom_jabatan_camat: 'Drs. Supriyadi, M.Si.',
      },
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/generate-dokumen/cetak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it('8. POST /api/generate-dokumen/cetak generates valid single page Portrait PDF (SPPHT)', async () => {
    const payload = {
      idTemplate: 1, // Default SPPHT template
      namaDokumen: 'Surat_Pernyataan_Pelepasan_Budi_Santoso',
      fieldValues: {
        kodeTanah: 'BDG-2026-001',
        namaLokasi: 'Kawasan Gade Sentosa',
        desa: 'Sukamaju',
        kecamatan: 'Cilodong',
        kabupaten: 'Depok',
        namaPemilik: 'Budi Santoso',
        nikPemilik: '3276011203850001',
        luas: '3000',
        jenisHak: 'SHM',
        nomorHak: 'SHM-4821',
        hargaKesepakatan: '2.750.000.000',
      },
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/generate-dokumen/cetak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it('9. DELETE /api/generate-dokumen/templates/:id deletes created template', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/generate-dokumen/templates/${createdTemplateId}`, {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('10. DELETE /api/generate-dokumen/fields/:id deletes created field', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/generate-dokumen/fields/${createdFieldId}`, {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
