# Implementasi Menu Project

**Deskripsi Tugas**
Buatkan implementasi untuk menu "Project" yang berfungsi untuk mengelola data project di Aplikasi Gade. Fitur ini meliputi pembuatan tabel pada database, pembuatan API backend (CRUD), dan pembuatan tampilan frontend.

**Spesifikasi Kolom / Inputan Data Project:**
1. Kode Project (String/Varchar, Unique, Required)
2. Nama Project (String/Varchar, Required)
3. Lokasi (String/Varchar, Required)
4. Desa (String/Varchar, Required)
5. Kecamatan (String/Varchar, Required)
6. Kabupaten (String/Varchar, Required)
7. Status (Enum/String: 'Perencanaan', 'Berjalan', 'Selesai', 'Dibatalkan', Default: 'Perencanaan')
8. Keterangan (Text, Optional)

**Langkah-langkah Implementasi:**

### 1. Update Skema Database (`src/db/schema.ts`)
- Tambahkan tabel `projects` menggunakan Drizzle ORM dengan spesifikasi kolom di atas.
- Jangan lupa tambahkan tipe inferensi untuk Select dan Insert.
- Export skema `projects`.

### 2. Buat Route API (`src/routes/project.ts`)
- Buat file route baru menggunakan ElysiaJS.
- Implementasikan endpoint berikut:
  - `GET /api/projects`: Mengambil semua data project.
  - `GET /api/projects/:id`: Mengambil data project berdasarkan ID.
  - `POST /api/projects`: Menambahkan data project baru (lakukan validasi input).
  - `PUT /api/projects/:id`: Mengubah data project (beserta status, dll).
  - `DELETE /api/projects/:id`: Menghapus data project.
- Implementasikan in-memory array fallback (menggunakan list sementara di memori) jika database utama tidak dapat terhubung, mengikuti pola file route lainnya.

### 3. Registrasi Route (`src/index.ts`)
- Import dan daftarkan `projectRoutes` ke dalam instance Elysia utama di `src/index.ts`.

### 4. Buat Tampilan Frontend (`public/project.html`)
- Buat file HTML baru untuk halaman Manajemen Project.
- Implementasikan tabel untuk menampilkan data project.
- Buat form / modal untuk menambahkan dan mengedit data project dengan field-field yang diminta (termasuk dropdown status).
- Pastikan tampilan rapi, menggunakan CSS Vanilla atau styling bawaan yang sudah ada.
- Perbarui navigasi utama (Navbar/Sidebar) di dalam `project.html` dan juga file `.html` lainnya (`index.html`, `pembebasan.html`, `pemetaan.html`, dll) agar memiliki link yang mengarah ke `project.html`.

### 5. Testing (`test/project.test.ts`)
- Buat file test menggunakan Bun Test.
- Pastikan semua endpoint CRUD (Create, Read, Update, Delete) teruji.
- Pastikan tes berjalan dengan lancar ketika dijalankan menggunakan `bun test`.
