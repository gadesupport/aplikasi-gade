import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('API Survey Lapangan', () => {
  let createdSurveyId: number;
  const testRefId = 'LOK-2026-001';

  it('1. GET /api/survey returns list of surveys', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/survey'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. POST /api/survey creates a new survey record', async () => {
    const payload = {
      targetSurvey: 'Lokasi',
      referensiId: testRefId,
      tanggalSurvey: '2026-02-10',
      picSurvey: 'Budi Test',
      hasilSurvey: 'Sesuai Kriteria',
      koordinat: '-6.111, 106.222',
      catatan: 'Testing survey via unit test',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.targetSurvey).toBe('Lokasi');
    expect(body.data.referensiId).toBe(testRefId);
    expect(body.data.picSurvey).toBe('Budi Test');
    createdSurveyId = body.data.id;
  });

  it('3. POST /api/survey with missing required fields returns 422 or 400', async () => {
    const invalidPayload = {
      targetSurvey: '',
      referensiId: '',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      })
    );

    // Elysia returns 422 for schema validation failure, but custom error returns 400.
    expect([400, 422]).toContain(res.status);
  });

  it('4. POST /api/survey with invalid targetSurvey returns 400 or 422', async () => {
    const invalidTarget = {
      targetSurvey: 'Salah',
      referensiId: 'LOK-001',
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTarget),
      })
    );

    expect([400, 422]).toContain(res.status);
  });

  it('5. GET /api/survey/:id retrieves single survey detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/survey/${createdSurveyId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdSurveyId);
    expect(body.data.picSurvey).toBe('Budi Test');
  });

  it('6. PUT /api/survey/:id updates survey information', async () => {
    const updatePayload = {
      hasilSurvey: 'Butuh Penyesuaian',
      catatan: 'Update catatan via unit test',
    };

    const res = await app.handle(
      new Request(`http://localhost:3000/api/survey/${createdSurveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.hasilSurvey).toBe('Butuh Penyesuaian');
    expect(body.data.catatan).toBe(updatePayload.catatan);
  });

  it('7. DELETE /api/survey/:id removes the survey record', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/survey/${createdSurveyId}`, {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify deletion
    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/survey/${createdSurveyId}`)
    );
    expect(checkRes.status).toBe(404);
  });
});
