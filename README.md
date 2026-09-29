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
- `GET /pembebasan.html` - Antarmuka Web interaktif Kontrol Utama Rekap & Tracking Pembayaran Pembebasan Tanah
- `GET /pemetaan.html` - **Antarmuka Web Kontrol Utama Pemetaan GIS**: Visualisasi spasial multi-layer (Induk, Batas Bidang, KKPR), Base Map Switcher, Snapping Presisi (Endpoint & Nearest), Digitasi Polygon, Interaksi Popup Detail Bidang saat Diklik, Import (GeoJSON, SHP ZIP, KML), serta Export Shapefile ZIP untuk upload OSS RBA
- `GET /project.html` - **Antarmuka Web Manajemen Project**: Kontrol dan monitoring project lahan, rekap status (Perencanaan, Berjalan, Selesai, Dibatalkan), pencarian wilayah, dan form pengelolaan project
- `GET /arsip-legal.html` - **Antarmuka Web Arsip Legal**: Katalog dokumen legalitas dan pelacakan lokasi penyimpanan fisik (Lemari, Rak, Bantek, Map/Folder) dengan wizard 2-step form dan filter status fisik
- `GET /bast.html` - **Antarmuka Web BAST (Berita Acara Serah Terima)**: Rekapitulasi serah terima peminjaman & pengembalian berkas dokumen fisik, multi-dokumen selector, validasi QR Code & TTD Digital, serta cetak langsung ke format PDF resmi
- `GET /swagger` - Dokumentasi API interaktif Swagger / OpenAPI
- `GET /health` - Health check status API

### Endpoint API BAST & Cetak Dokumen (`/api/bast`)
- `GET /api/bast` - Daftar rekapitulasi BAST (mendukung pencarian `?search=`, filter kategori `?jenis=`, dan statistik ringkasan total, peminjaman, pengembalian, berkas fisik)
- `GET /api/bast/arsip-options` - Daftar dokumen arsip legal beserta status fisik terkini untuk pemilihan multi-dokumen
- `GET /api/bast/:id` - Detail lengkap BAST beserta daftar item dokumen yang diserah-terimakan
- `POST /api/bast` - Buat Berita Acara Serah Terima baru (mendukung single atau multi dokumen, otomatis memperbarui status fisik dokumen pada modul Arsip Legal)
- `DELETE /api/bast/:id` - Hapus catatan BAST
- `GET /api/bast/:id/cetak` - **Cetak BAST Format PDF**: Menghasilkan dokumen resmi PDF secara on-the-fly dengan tata letak kop surat, nomor registrasi, pihak penyerah & penerima, tabel rincian dokumen, kolom tanda tangan, serta **QR Code Tervalidasi Sistem** untuk verifikasi digital keaslian dokumen


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

### Endpoint API Pembebasan & Transaksi Pembayaran (`/api/pembebasan`)
- `GET /api/pembebasan` - Daftar mutasi seluruh transaksi pembayaran (mendukung query `?kodeTanah=`, `?status=`, `?tahapPembayaran=`, `?metodePembayaran=`, dan `?search=`) disertai ringkasan finansial (`totalNominal`, `totalLunas`, `totalPending`)
- `GET /api/pembebasan/rekap` - **Kontrol Utama Rekap Pembebasan**: Ringkasan agregat per bidang tanah (harga kesepakatan, realisasi terbayar, sisa kewajiban, persentase pelunasan, status)
- `GET /api/pembebasan/bidang/:bidangId` - Rekapitulasi pembayaran khusus satu bidang tanah beserta riwayat mutasinya
- `GET /api/pembebasan/:id` - Detail satu transaksi pembayaran
- `POST /api/pembebasan` - Tambah catatan transaksi pembayaran baru (Mendukung alias `bidang_id`, nominal uang, tahap pembayaran, status, metode, bukti transfer)
- `PUT /api/pembebasan/:id` - Perbarui catatan transaksi pembayaran
- `DELETE /api/pembebasan/:id` - Hapus catatan transaksi pembayaran

### Endpoint API Pemetaan GIS & KKPR (`/api/pemetaan`)
- `GET /api/pemetaan/layers` - **Agregasi Multi-Layer Spasial**: Mengambil GeoJSON FeatureCollection untuk seluruh layer (Induk, Batas Bidang diperkaya status pembayaran finansial & pemilik, serta KKPR) (mendukung filter `?kodeLokasi=`)
- `GET /api/pemetaan/kkpr` - Daftar seluruh rencana permohonan KKPR (mendukung query `?search=`, `?status=`, dan `?kategori=`)
- `GET /api/pemetaan/kkpr/:id` - Detail data perencanaan KKPR berdasarkan ID
- `POST /api/pemetaan/kkpr` - Tambah perencanaan KKPR baru lengkap dengan atribut OSS dan polygon spasial
- `PUT /api/pemetaan/kkpr/:id` - Perbarui informasi dan status izin KKPR
- `DELETE /api/pemetaan/kkpr/:id` - Hapus data perencanaan KKPR
- `PATCH /api/pemetaan/polygon` - Simpan atau perbarui langsung polygon batas hasil digitasi peta untuk target `bidang`, `lokasi`, atau `kkpr`
- `POST /api/pemetaan/import` - Import data spasial berformat GeoJSON, KML, atau Shapefile (ZIP) dan langsung diklasifikasikan ke layer target
- `GET /api/pemetaan/export` - Export data spasial (mendukung format `?format=shp` (ESRI Shapefile dikemas .ZIP untuk upload OSS), `?format=geojson`, dan `?format=kml` untuk Google Earth)

### Endpoint API Project Lahan (`/api/projects`)
- `GET /api/projects` - Daftar semua project lahan (mendukung pencarian `?search=`, filter `?status=`, dan ringkasan statistik `summary`)
- `GET /api/projects/:id` - Detail project berdasarkan ID numerik atau Kode Project
- `POST /api/projects` - Tambah data project baru (validasi kode, nama, lokasi, desa, kecamatan, kabupaten, status, keterangan)
- `PUT /api/projects/:id` - Perbarui informasi project
- `DELETE /api/projects/:id` - Hapus data project

### Endpoint API Arsip Legal (`/api/arsip-legal`)
- `GET /api/arsip-legal` - Daftar dokumen arsip legal (mendukung filter `?search=`, `?statusFisik=`, `?tipeRelasi=`, dan `?kategori=`) disertai ringkasan statistik status penyimpanan fisik
- `GET /api/arsip-legal/options/relations` - Referensi daftar entitas berelasi (Project, Lokasi, Bidang Tanah) untuk kemudahan integrasi
- `GET /api/arsip-legal/:id` - Detail satu dokumen arsip berdasarkan ID numerik atau Kode Arsip
- `POST /api/arsip-legal` - Tambah dokumen arsip baru (Step 1 data utama dokumen & Step 2 lokasi penyimpanan fisik: lemari, rak, bantek, map, status fisik, catatan)
- `PUT /api/arsip-legal/:id` - Perbarui informasi dokumen arsip atau lokasi fisik penyimpanan
- `DELETE /api/arsip-legal/:id` - Hapus data dokumen arsip

### Endpoint API BAST Berita Acara Serah Terima (`/api/bast`)
- `GET /api/bast` - Daftar transaksi BAST peminjaman & pengembalian berkas disertai ringkasan statistik
- `GET /api/bast/arsip-options` - Pilihan dokumen arsip legal yang tersedia untuk diserahterimakan
- `GET /api/bast/:id` - Detail BAST lengkap dengan daftar dokumen fisik yang dipinjam/dikembalikan
- `POST /api/bast` - Buat BAST baru (mendukung multi-dokumen dalam 1 cetakan BAST dan otomatis memperbarui status fisik dokumen di arsip legal)
- `GET /api/bast/:id/cetak` - Cetak file Berita Acara Serah Terima resmi format PDF dilengkapi Digital Signature & QR Code verifikasi keaslian

### Endpoint API Modul Laporan & Rekapitulasi (`/api/laporan`)
- `GET /api/laporan/dashboard-stats` - Ringkasan metrik statistik agregat dari seluruh modul (Lokasi, Bidang, Pihak, Survey, Legalitas, Pembahasan, Pemetaan, Project, Arsip, BAST, Realisasi Finansial)
- `GET /api/laporan/progress-pembebasan` - **Laporan Progress Pembebasan Tanah**: Rekapitulasi target vs realisasi luas bidang, pagu kesepakatan, realisasi pembayaran, dan sisa kewajiban (Mendukung export format: `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-lokasi` - Laporan rekapitulasi data lokasi pengadaan (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-bidang` - Laporan rekapitulasi bidang tanah & status kepemilikan (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-pihak` - Laporan rekapitulasi pihak / pemilik tanah (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-survey` - Laporan rekapitulasi hasil survey lapangan (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-legalitas` - Laporan rekapitulasi status kelengkapan dokumen legalitas (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-pembahasan` - Laporan rekapitulasi notulensi & keputusan musyawarah (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-pemetaan` - Laporan rekapitulasi perencanaan kesesuaian ruang KKPR / OSS (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-project` - Laporan rekapitulasi monitoring project lahan (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-arsip` - Laporan rekapitulasi arsip legal dan lokasi penyimpanan fisik lemari/rak/bantek/map (Mendukung `?format=pdf` dan `?format=excel`)
- `GET /api/laporan/rekap-bast` - Laporan rekapitulasi serah terima berkas (BAST) peminjaman & pengembalian (Mendukung `?format=pdf` dan `?format=excel`)

### Endpoint API Generate Dokumen & Mail Merge (`/api/generate-dokumen`)
- `GET /api/generate-dokumen/available-placeholders` - Daftar seluruh variabel placeholder dinamis dari sistem (Lokasi, Bidang, Pemilik, Project, Tanggal, Custom Fields)
- `GET /api/generate-dokumen/reference-data` - Pengambilan data entitas database untuk fungsi auto-fill otomatis saat pengisian surat
- `GET /api/generate-dokumen/fields` - Daftar seluruh custom field tambahan
- `POST /api/generate-dokumen/fields` - Tambah data field kustom baru (menyimpan variabel kustom seperti Nama Lurah, No SK, Penilai, dll)
- `DELETE /api/generate-dokumen/fields/:id` - Hapus data custom field
- `GET /api/generate-dokumen/templates` - Daftar template dokumen custom
- `GET /api/generate-dokumen/templates/:id` - Detail satu template dokumen
- `POST /api/generate-dokumen/templates` - Buat template surat baru (Mendukung ukuran kertas A4, Legal, F4, Letter; orientasi Portrait / Landscape; dan **Layout Mode 2 Halaman Buku (Two-Page Book Spread)**)
- `PUT /api/generate-dokumen/templates/:id` - Perbarui template dokumen
- `DELETE /api/generate-dokumen/templates/:id` - Hapus template dokumen
- `POST /api/generate-dokumen/preview` - Live compilation pratinjau teks sebelum dicetak
- `POST /api/generate-dokumen/cetak` - **Cetak PDF Dokumen**: Menghasilkan dokumen cetak resmi PDF sesuai orientasi, ukuran kertas, dan tata letak 2 halaman buku berdampingan dengan pembagi lipatan buku, nomor halaman buku, dan catatan kaki.

### Endpoint API Modul Audit Log (`/api/audit-log`)
- `GET /api/audit-log` - Mengambil daftar riwayat jejak audit log aktivitas (Mendukung filter `search`, `action`, `menu`, `startDate`, `endDate`, serta paginasi `limit` dan `offset`)
- `GET /api/audit-log/stats` - Statistik agregat aktivitas sistem (total log, aktivitas hari ini, rincian per jenis aksi dan per modul)
- `POST /api/audit-log` - Merekam aktivitas baru ke dalam log audit (otomatis mencatat IP address, user agent, dan metadata JSON)
- `GET /api/audit-log/:id` - Mengambil detail lengkap entri log audit

### Endpoint API Modul Pengaturan & Profil (`/api`)
- `GET /api/profile` - Mengambil informasi profil akun yang sedang login (aman tanpa mengekspos hash password)
- `PUT /api/profile` - Memperbarui nama, email, no telepon, foto avatar, dan ganti password akun aktif
- `GET /api/users` - Mengambil daftar seluruh pengguna sistem (didukung pencarian teks dan filter berdasarkan role)
- `POST /api/users` - Mendaftarkan akun pengguna baru dengan enkripsi password
- `GET /api/users/:id` - Mengambil detail akun pengguna berdasarkan ID
- `PUT /api/users/:id` - Memperbarui informasi akun pengguna (nama, email, role, telepon, avatar, password)
- `DELETE /api/users/:id` - Menghapus akun pengguna (dilindungi proteksi akun Super Admin utama)
- `GET /api/roles` - Mengambil daftar role pengguna beserta jumlah pengguna dan matriks hak akses
- `POST /api/roles` - Menambahkan custom role baru ke dalam sistem
- `GET /api/roles/:id` - Detail data role pengguna
- `PUT /api/roles/:id` - Memperbarui nama dan deskripsi role
- `DELETE /api/roles/:id` - Menghapus custom role (role sistem bawaan dilindungi)
- `GET /api/roles/:id/permissions` - Mengambil daftar hak akses menu (Lihat, Tambah, Ubah, Hapus) untuk role tertentu
- `PUT /api/roles/:id/permissions` - Memperbarui matriks hak akses permissions role secara batch
- `GET /api/pengaturan/menus` - Mengambil daftar seluruh modul & menu resmi sistem yang terdaftar
