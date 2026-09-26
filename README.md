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

## 🌐 Endpoint Dasar
- `GET /` - Status API & pesan selamat datang
- `GET /health` - Health check status
- `GET /api/users` - Contoh query list user via Drizzle
