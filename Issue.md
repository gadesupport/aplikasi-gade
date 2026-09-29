# Fitur Survey (Manajemen Lahan)

Tugas ini berisi perintah dan perencanaan (blueprint) untuk implementasi menu **Survey** pada sistem. Modul ini digunakan untuk mencatat dan mengelola kegiatan survei lapangan, baik survei tingkat lokasi awal (Lokasi Induk) maupun survei detail pada suatu bidang tanah (Bidang Tanah/Persil).

---

## Kebutuhan Input & Data (Formulir Survey)

Antarmuka formulir dan database harus mampu menangani rincian inputan berikut:

1. **Target Survey**: 
   - Jenis dropdown/pilihan: `Lokasi` atau `Bidang`.
   - Menentukan konteks survei, apakah untuk lokasi secara luas atau spesifik pada satu bidang tanah.
2. **Lokasi/Koneksi**: 
   - Terintegrasi (Foreign Key dinamis) dengan tabel `lokasi` (jika Target = Lokasi) atau tabel `bidang_tanah` (jika Target = Bidang).
   - Pada UI, dropdown ini harus memuat opsi sesuai pilihan "Target Survey" sebelumnya.
3. **Tanggal Survey**:
   - Tanggal pelaksanaan survei di lapangan.
4. **PIC Survey**:
   - Nama petugas atau tim yang bertanggung jawab melakukan survei.
5. **Hasil Survey**:
   - Teks atau dropdown evaluasi (misal: *Sesuai Kriteria*, *Butuh Penyesuaian*, *Tidak Layak*).
6. **Koordinat Lokasi**:
   - Format Latitude dan Longitude tempat survei dilakukan. 
   - *Opsional tapi direkomendasikan*: Sediakan tombol/fitur *Get Current Location* di UI untuk mendapatkan koordinat GPS secara otomatis.
7. **Catatan**:
   - Kolom teks (textarea) untuk mendeskripsikan kondisi rill lapangan, akses jalan, potensi kendala, dll.

---

## Rencana Implementasi Teknis

### 1. Database Schema (Drizzle ORM)
- Tambahkan tabel `survey` pada `src/db/schema.ts`.
- Kolom yang diperlukan:
  - `id` (Serial/UUID, Primary Key)
  - `target_survey` (Varchar: 'Lokasi' atau 'Bidang')
  - `referensi_id` (Varchar/Foreign Key dinamis yang menyimpan `kode_lokasi` atau `kode_tanah`)
  - `tanggal_survey` (Date/Timestamp)
  - `pic_survey` (Varchar)
  - `hasil_survey` (Varchar/Text)
  - `koordinat` (Varchar/JSON untuk Lat/Lng)
  - `catatan` (Text)
  - `created_at` & `updated_at` (Timestamp)
- Generate dan jalankan migrasi database (menggunakan Drizzle Kit).

### 2. REST API (ElysiaJS)
- Buat file routing `src/routes/survey.ts` untuk melayani operasi CRUD:
  - `GET /api/survey` - Mengambil data survei (dengan kapabilitas filter berdasarkan target dan referensi ID).
  - `GET /api/survey/:id` - Mengambil detail survei.
  - `POST /api/survey` - Menambah data survei baru.
  - `PUT /api/survey/:id` - Memperbarui data survei.
  - `DELETE /api/survey/:id` - Menghapus survei.
- Seperti pada modul sebelumnya, implementasikan *in-memory store fallback* (dengan koneksi timeout check) apabila database sedang bermasalah.

### 3. Antarmuka Web (UI)
- Buat halaman HTML baru `public/survey.html` dengan desain (layout, font, CSS variable) yang selaras dengan `lokasi.html` dan `bidang-tanah.html`.
- Sediakan navigasi lintas modul pada bagian header (Dashboard, Lokasi, Bidang, Pihak, Survey).
- Implementasikan UI form dinamis: Jika pengguna memilih "Target Survey = Lokasi", dropdown referensi hanya akan meload opsi dari endpoint `/api/lokasi`. Jika "Target Survey = Bidang", dropdown meload dari `/api/bidang-tanah`.
- Sediakan tabel atau daftar riwayat survei dengan tombol aksi Edit/Hapus.

### 4. Testing Otomatis
- Buat file pengujian `test/survey.test.ts`.
- Lakukan pengetesan terhadap endpoint CRUD untuk memastikan validasi payload, fallback in-memory, dan relasi dinamis berjalan baik.
