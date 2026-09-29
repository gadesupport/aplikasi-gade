import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { db } from './db';
import { users } from './db/schema';
import { lokasiRoutes } from './routes/lokasi';

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Aplikasi Gade API Documentation',
          version: '1.0.0',
          description: 'API untuk Pengadaan dan Manajemen Lokasi & Bidang Tanah',
        },
        tags: [
          { name: 'Lokasi', description: 'Endpoints untuk Pengelolaan Lokasi & Pemetaan Area' },
          { name: 'Users', description: 'Endpoints untuk Manajemen User' },
        ],
      },
    })
  )
  .use(staticPlugin({ assets: 'public', prefix: '' }))
  .decorate('db', db)
  .get('/', () => ({
    status: 'ok',
    message: 'Welcome to Aplikasi Gade API',
    docs: '/swagger',
    ui: '/lokasi.html',
    timestamp: new Date().toISOString(),
  }))
  .get('/health', () => ({
    status: 'healthy',
    uptime: process.uptime(),
  }))
  .use(lokasiRoutes)
  .group('/api', (app) =>
    app.get('/users', async ({ db }) => {
      try {
        const allUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
          })
          .from(users);
        return { success: true, data: allUsers };
      } catch (error: any) {
        return {
          success: false,
          message: 'Database query failed or not connected yet',
          error: error.message,
        };
      }
    })
  )
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
export default app;

