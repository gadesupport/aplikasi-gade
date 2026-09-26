import { Elysia } from 'elysia';
import { db } from './db';
import { users } from './db/schema';

const app = new Elysia()
  .decorate('db', db)
  .get('/', () => ({
    status: 'ok',
    message: 'Welcome to Aplikasi Gade API',
    timestamp: new Date().toISOString(),
  }))
  .get('/health', () => ({
    status: 'healthy',
    uptime: process.uptime(),
  }))
  .group('/api', (app) =>
    app.get('/users', async ({ db }) => {
      try {
        const allUsers = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        }).from(users);
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
