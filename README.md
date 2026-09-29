# Aplikasi Gade - Backend API

Backend service dibangun menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **PostgreSQL**.

## 🚀 Fitur & Komponen Utama
- **Runtime**: [Bun](https://bun.com)
- **Web Framework**: [ElysiaJS](https://elysiajs.com)
- **Database & ORM**: PostgreSQL dengan [Drizzle ORM](https://orm.drizzle.team)
- **Migration Tooling**: Drizzle Kit

## 📂 Struktur Direktori
```
├── drizzle/              # Folder migrasi SQL yang di-generate oleh Drizzle Kit
├── src/
│   ├── db/
│   │   ├── index.ts      # Koneksi database PostgreSQL & instance Drizzle
│   │   └── schema.ts     # Definisi schema tabel database (users, dll)
│   └── index.ts          # Server utama ElysiaJS & endpoint routes
├── test/
│   └── index.test.ts     # Automated tests dengan Bun test
├── .env.example          # Template environment variable
├── drizzle.config.ts     # Konfigurasi Drizzle Kit
├── package.json
└── tsconfig.json
```

## 🛠️ Persiapan Lingkungan (Setup)

1. **Install dependensi**:
   ```bash
   bun install
   ```

2. **Setup Environment**:
   Salin `.env.example` ke `.env` lalu sesuaikan kredensial PostgreSQL Anda:
   ```bash
   cp .env.example .env
   ```

## 📜 Perintah yang Tersedia (Scripts)

- **Menjalankan mode development** (auto-reload):
  ```bash
  bun run dev
  ```
- **Menjalankan production**:
  ```bash
  bun run start
  ```
- **Menjalankan unit test**:
  ```bash
  bun test
  ```
- **Generate migrasi database**:
  ```bash
  bun run db:generate
  ```
- **Migrasi database**:
  ```bash
  bun run db:migrate
  ```
- **Push schema langsung ke database**:
  ```bash
  bun run db:push
  ```
- **Buka Drizzle Studio**:
  ```bash
  bun run db:studio
  ```

## 🌐 Endpoint & Antarmuka Tersedia

### Antarmuka Web & Dokumentasi
- `GET /` & `GET /lokasi.html` - Antarmuka Web interaktif Menu Lokasi (Step 1 Formulir + Step 2 Peta Leaflet Polygon)
- `GET /swagger` - Dokumentasi API interaktif Swagger / OpenAPI
- `GET /health` - Health check status API

### Endpoint API Lokasi (`/api/lokasi`)
- `GET /api/lokasi` - Daftar lokasi (mendukung query `?search=` dan `?status=`)
- `GET /api/lokasi/:kodeLokasi` - Detail data lokasi berdasarkan Kode Lokasi
- `POST /api/lokasi` - Tambah lokasi baru (Step 1)
- `PUT /api/lokasi/:kodeLokasi` - Perbarui informasi lokasi (Step 1)
- `PATCH /api/lokasi/:kodeLokasi/batas` - Perbarui batas pemetaan polygon, luas induk, dan bidang terpetakan (Step 2)
- `DELETE /api/lokasi/:kodeLokasi` - Hapus data lokasi

