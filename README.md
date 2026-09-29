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
- `GET /bidang-tanah.html` - Antarmuka Web interaktif Menu Bidang Tanah (Step 1 Finansial + Step 2 Peta Polygon & Checklist Legalitas)
- `GET /pihak.html` - Antarmuka Web interaktif Manajemen Pihak / Pemilik Lahan Terintegrasi
- `GET /survey.html` - Antarmuka Web interaktif Pencatatan & Riwayat Survey Lapangan
- `GET /pembahasan.html` - Antarmuka Web interaktif Notulensi & Keputusan Pembahasan Lahan
- `GET /legalitas.html` - Antarmuka Web interaktif Legalitas Tanah & Dokumen Alas Hak Terintegrasi
- `GET /swagger` - Dokumentasi API interaktif Swagger / OpenAPI
- `GET /health` - Health check status API

### Endpoint API Lokasi (`/api/lokasi`)
- `GET /api/lokasi` - Daftar lokasi (mendukung query `?search=` dan `?status=`)
- `GET /api/lokasi/:kodeLokasi` - Detail data lokasi berdasarkan Kode Lokasi
- `POST /api/lokasi` - Tambah lokasi baru (Step 1)
- `PUT /api/lokasi/:kodeLokasi` - Perbarui informasi lokasi (Step 1)
- `PATCH /api/lokasi/:kodeLokasi/batas` - Perbarui batas pemetaan polygon, luas induk, dan bidang terpetakan (Step 2)
- `DELETE /api/lokasi/:kodeLokasi` - Hapus data lokasi

### Endpoint API Bidang Tanah (`/api/bidang-tanah`)
- `GET /api/bidang-tanah` - Daftar bidang tanah (mendukung query `?kodeLokasi=`, `?status=`, dan `?search=`)
- `GET /api/bidang-tanah/:kodeTanah` - Detail data bidang tanah
- `GET /api/bidang-tanah/rekap/:kodeLokasi` - Ringkasan luas induk, total bidang, sisa luas, dan sebaran status
- `POST /api/bidang-tanah` - Tambah bidang tanah baru (Step 1)
- `PUT /api/bidang-tanah/:kodeTanah` - Perbarui informasi bidang tanah (Step 1)
- `PATCH /api/bidang-tanah/:kodeTanah/polygon` - Perbarui polygon batas bidang & checklist legalitas (Step 2)
- `DELETE /api/bidang-tanah/:kodeTanah` - Hapus data bidang tanah

### Endpoint API Pihak / Pemilik (`/api/pihak`)
- `GET /api/pihak` - Daftar seluruh pihak/pemilik (mendukung query `?kodeTanah=`, `?tipePihak=`, dan `?search=`)
- `GET /api/pihak/:id` - Detail pihak/pemilik berdasarkan ID
- `GET /api/pihak/by-bidang/:kodeTanah` - Daftar semua pihak yang berelasi dengan bidang tanah tertentu beserta rekap tipe
- `POST /api/pihak` - Tambah data pihak/pemilik baru
- `PUT /api/pihak/:id` - Perbarui informasi pihak/pemilik
- `DELETE /api/pihak/:id` - Hapus data pihak/pemilik

### Endpoint API Survey Lapangan (`/api/survey`)
- `GET /api/survey` - Daftar riwayat survey (mendukung query `?targetSurvey=`, `?referensiId=`, dan `?search=`)
- `GET /api/survey/:id` - Detail data survey
- `POST /api/survey` - Tambah data survey baru (Terintegrasi dengan Lokasi atau Bidang Tanah)
- `PUT /api/survey/:id` - Perbarui data riwayat survey
- `DELETE /api/survey/:id` - Hapus data riwayat survey

### Endpoint API Pembahasan Lahan (`/api/pembahasan`)
- `GET /api/pembahasan` - Daftar riwayat pembahasan & notulensi rapat (mendukung query `?target=`, `?referensiId=`, `?keputusan=`, dan `?search=`)
- `GET /api/pembahasan/:id` - Detail data pembahasan
- `POST /api/pembahasan` - Tambah data pembahasan baru (Terintegrasi dengan Lokasi atau Bidang Tanah, status Keputusan: Layak, Perlu Kajian, Tidak Layak)
- `PUT /api/pembahasan/:id` - Perbarui data pembahasan
- `DELETE /api/pembahasan/:id` - Hapus data riwayat pembahasan

### Endpoint API Legalitas Tanah (`/api/legalitas-tanah`)
- `GET /api/legalitas-tanah` - Daftar dokumen legalitas tanah (mendukung query `?kodeTanah=`, `?jenisDokumen=`, `?status=`, `?pihakId=`, dan `?search=`)
- `GET /api/legalitas-tanah/:id` - Detail dokumen legalitas berdasarkan ID
- `GET /api/legalitas-tanah/by-bidang/:kodeTanah` - Daftar semua dokumen legalitas pada bidang tanah tertentu
- `POST /api/legalitas-tanah` - Tambah dokumen legalitas baru (Terintegrasi ke Bidang Tanah dan Pihak Terkait)
- `PUT /api/legalitas-tanah/:id` - Perbarui informasi dokumen legalitas tanah
- `DELETE /api/legalitas-tanah/:id` - Hapus data dokumen legalitas



