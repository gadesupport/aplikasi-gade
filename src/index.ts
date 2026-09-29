import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { db } from './db';
import { users } from './db/schema';
import { lokasiRoutes } from './routes/lokasi';
import { bidangTanahRoutes } from './routes/bidangTanah';
import { pihakRoutes } from './routes/pihak';
import { surveyRoutes } from './routes/survey';
import { pembahasanRoutes } from './routes/pembahasan';
import { legalitasTanahRoutes } from './routes/legalitasTanah';
import { pembebasanRoutes } from './routes/pembebasan';
import { pemetaanRoutes } from './routes/pemetaan';
import { projectRoutes } from './routes/project';
import { arsipLegalRoutes } from './routes/arsip-legal';
import { bastRoutes } from './routes/bast';

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Aplikasi Gade API Documentation',
          version: '1.0.0',
          description: 'API untuk Pengadaan dan Manajemen Lokasi, Bidang Tanah, Pihak, Survey, Pembahasan, Legalitas, Pembebasan, Pemetaan GIS, Project, Arsip Legal & BAST',
        },
        tags: [
          { name: 'Lokasi', description: 'Endpoints untuk Pengelolaan Lokasi & Pemetaan Area' },
          { name: 'Bidang Tanah', description: 'Endpoints untuk Manajemen Bidang Tanah, Polygon & Legalitas' },
          { name: 'Pihak/Pemilik', description: 'Endpoints untuk Pengelolaan Pihak/Pemilik Terintegrasi Bidang Tanah' },
          { name: 'Survey', description: 'Endpoints untuk Pencatatan & Riwayat Survey Lapangan' },
          { name: 'Pembahasan', description: 'Endpoints untuk Pengelolaan Notulensi & Keputusan Pembahasan Lahan' },
          { name: 'Legalitas Tanah', description: 'Endpoints untuk Pengelolaan Dokumen & Status Legalitas Bidang Tanah' },
          { name: 'Pembebasan', description: 'Endpoints untuk Rekap & Tracking Transaksi Pembayaran Pembebasan Lahan' },
          { name: 'Pemetaan', description: 'Endpoints untuk Modul Pemetaan GIS, Layer Batas, Digitasi & KKPR' },
          { name: 'Project', description: 'Endpoints untuk Pengelolaan Data & Monitoring Project Lahan' },
          { name: 'Arsip Legal', description: 'Endpoints untuk Pengelolaan Dokumen Legalitas & Lokasi Fisik Arsip' },
          { name: 'BAST', description: 'Endpoints untuk Berita Acara Serah Terima (Peminjaman, Pengembalian, Cetak PDF & QR Code)' },
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
    ui: {
      lokasi: '/lokasi.html',
      bidangTanah: '/bidang-tanah.html',
      pihak: '/pihak.html',
      survey: '/survey.html',
      pembahasan: '/pembahasan.html',
      legalitas: '/legalitas.html',
      pembebasan: '/pembebasan.html',
      pemetaan: '/pemetaan.html',
      project: '/project.html',
      arsipLegal: '/arsip-legal.html',
      bast: '/bast.html',
    },
    timestamp: new Date().toISOString(),
  }))
  .get('/health', () => ({
    status: 'healthy',
    uptime: process.uptime(),
  }))
  .use(lokasiRoutes)
  .use(bidangTanahRoutes)
  .use(pihakRoutes)
  .use(surveyRoutes)
  .use(pembahasanRoutes)
  .use(legalitasTanahRoutes)
  .use(pembebasanRoutes)
  .use(pemetaanRoutes)
  .use(projectRoutes)
  .use(arsipLegalRoutes)
  .use(bastRoutes)

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

