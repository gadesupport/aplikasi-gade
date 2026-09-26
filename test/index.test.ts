import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '../src/db';

describe('Aplikasi Gade API', () => {
  it('GET / returns 200 and status ok', async () => {
    // Import dynamically or test app
    const { default: appModule } = await import('../src/index');
    
    const response = await fetch('http://localhost:3000/');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.message).toBe('Welcome to Aplikasi Gade API');
  });

  it('GET /health returns healthy', async () => {
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});
