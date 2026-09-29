# Perencanaan Modul Arsip Legal

Issue ini berisi perencanaan dan spesifikasi untuk mengimplementasikan modul **Arsip Legal**. Modul ini bertujuan untuk mendata dan melacak penyimpanan dokumen fisik maupun digital, beserta relasinya dengan entitas lain dalam aplikasi.

Implementasikan fitur ini menggunakan stack yang sudah ada: Bun, ElysiaJS, Drizzle ORM, PostgreSQL, dan HTML/CSS/JS statis.

## 1. Skema Database (Drizzle ORM)

Tambahkan skema `arsipLegal` di `src/db/schema.ts`. Skema ini harus mencakup data utama arsip dan detail lokasi fisiknya.

**Tabel `arsip_legal`**
- `id` (serial / uuid, primary key)
- `kodeArsip` (varchar, unique, wajib)
- `namaDokumen` (varchar, wajib)
- `kategori` (varchar, wajib)
- `jenisDokumen` (varchar, wajib)
- `nomorDokumen` (varchar, wajib)
- `tanggalDokumen` (date, wajib)
- `tipeRelasi` (enum/varchar: 'Lokasi', 'Bidang', 'Project', 'Umum', wajib)
- `idRelasi` (integer/uuid, nullable - untuk menyimpan ID referensi dari entitas relasi jika ada)

**Data Lokasi Fisik (Bisa digabung dalam tabel `arsip_legal` atau dipisah ke tabel `lokasi_fisik_arsip`)**
Jika digabung dalam `arsip_legal`, tambahkan field berikut:
- `lemari` (varchar, nullable)
- `rak` (varchar, nullable)
- `bantek` (varchar, nullable)
- `folderMap` (varchar, nullable)
- `statusFisik` (enum/varchar: 'Tersedia', 'Dipinjam', 'Hilang', 'Diarsipkan', default: 'Tersedia')
- `catatan` (text, nullable)
- `createdAt` (timestamp, default now)
- `updatedAt` (timestamp, default now)

Jangan lupa mendefinisikan array konstan untuk enum seperti `TipeRelasiValues` dan `StatusFisikValues` untuk keperluan validasi.

## 2. API Backend (ElysiaJS)

Buat file route baru di `src/routes/arsip-legal.ts` dan daftarkan di `src/index.ts`.

**Endpoint yang dibutuhkan:**
1. `GET /api/arsip-legal` - Mengambil semua data arsip legal.
2. `GET /api/arsip-legal/:id` - Mengambil detail satu arsip legal.
3. `POST /api/arsip-legal` - Menambahkan arsip legal baru.
4. `PUT /api/arsip-legal/:id` - Memperbarui data arsip legal.
5. `DELETE /api/arsip-legal/:id` - Menghapus data arsip legal.

**Kebutuhan Khusus Backend:**
- **In-Memory Fallback:** Sesuai arsitektur sistem saat ini, implementasikan penyimpanan Map fallback jika koneksi database tidak tersedia (gunakan fungsi `checkDbConnection()`).
- **Validasi:** Gunakan `t.Object` dari Elysia (TypeBox) untuk memvalidasi body request pada endpoint POST dan PUT.
- **Relasi (Opsional):** Saat GET arsip, jika `tipeRelasi` bukan 'Umum' dan `idRelasi` terisi, idealnya API dapat memberikan info tambahan tentang relasi tersebut (misal: nama project jika `tipeRelasi` = 'Project').

## 3. Antarmuka Web (Frontend)

Buat antarmuka web di `public/arsip-legal.html`. Gunakan gaya UI modern yang selaras dengan halaman lainnya.

**Komponen UI Utama:**
1. **Header & Navigasi:** Sertakan navbar yang sama dengan halaman lain dan pastikan menu "Arsip Legal" aktif (highlighted). Jangan lupa memperbarui navbar di file `.html` lain untuk memasukkan link ke Arsip Legal.
2. **Statistik Ringkas (Cards):** Tampilkan metrik seperti Total Dokumen, Tersedia, Dipinjam, dsb.
3. **Tabel Data:** Tabel responsif untuk menampilkan daftar arsip dengan kolom: Kode, Nama Dokumen, Jenis, Tanggal, Tipe Relasi, Status Fisik, dan Aksi.
4. **Formulir (Modal):** Buat modal untuk Tambah dan Edit data. Karena inputnya cukup banyak, bagi form menjadi dua bagian/step menggunakan layout *Wizard* atau dua kolom:
   - **Bagian 1: Data Utama:** Kode Arsip, Nama Dokumen, Kategori, Jenis, Nomor, Tanggal, Tipe Relasi.
   - **Bagian 2: Lokasi Fisik:** Lemari, Rak, Bantek, Folder/Map, Status Fisik, Catatan.
5. **Modal Detail:** Menampilkan seluruh informasi arsip beserta lokasi fisiknya dalam layout yang rapi.
6. **Notifikasi:** Gunakan sistem toast/alert yang sudah ada untuk memberikan umpan balik aksi sukses/gagal.

## 4. Pengujian (Unit Tests)

Buat file test di `test/arsip-legal.test.ts` menggunakan Bun test runner.
Pastikan mencakup skenario berikut:
- Operasi CRUD dasar (Create, Read, Update, Delete).
- Validasi gagal untuk input yang wajib tetapi kosong.
- Validasi constraint (misal: nilai status fisik harus sesuai dengan enum).
- Pastikan in-memory fallback berfungsi dengan baik saat database dimatikan/di-mock.

## Langkah Pengerjaan

1. Definisikan skema database dan jalankan perintah generasi migrasi Drizzle.
2. Buat API endpoints beserta logika fallback memory-nya.
3. Buat UI Frontend dan pastikan terhubung dengan API.
4. Tulis dan jalankan unit tests.
5. Perbarui `README.md` untuk memasukkan deskripsi modul Arsip Legal.
6. Perbarui file HTML lainnya untuk menambahkan menu Arsip Legal di navigasi.

---
Silakan selesaikan issue ini dan buka Pull Request jika semua komponen sudah siap dan lolos pengujian.
