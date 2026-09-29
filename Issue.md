# Fitur Pembahasan (Manajemen Lahan)

Tugas ini berisi perintah dan perencanaan (blueprint) untuk implementasi menu **Pembahasan** pada sistem. Modul ini digunakan untuk mencatat dan mengelola aktivitas rapat, negosiasi, atau mediasi terkait pembebasan lahan, baik di tingkat lokasi awal (Lokasi Induk) maupun detail pada suatu bidang tanah (Bidang Tanah/Persil).

---

## Kebutuhan Input & Data (Formulir Pembahasan)

Antarmuka formulir dan database harus mampu menangani rincian inputan berikut:

1. **Target**: 
   - Jenis dropdown/pilihan: `Lokasi` atau `Bidang`.
   - Menentukan konteks pembahasan, apakah untuk lokasi secara luas atau spesifik pada satu bidang tanah.
2. **Lokasi/Referensi**: 
   - Terintegrasi (Foreign Key dinamis) dengan tabel `lokasi` (jika Target = Lokasi) atau tabel `bidang_tanah` (jika Target = Bidang).
   - Pada UI, dropdown ini harus memuat opsi sesuai pilihan "Target" sebelumnya.
3. **Tanggal**:
   - Tanggal pelaksanaan pembahasan/rapat.
4. **Peserta**:
   - Daftar peserta yang hadir (contoh: tim internal, pemilik lahan, notaris, dll). Dapat berupa teks (varchar/text).
5. **Hasil Pembahasan**:
   - Kolom teks (textarea) untuk mencatat notulensi, poin-poin kesepakatan, atau hal-hal yang dibicarakan.
6. **Keputusan**:
   - Dropdown opsi: *Layak*, *Perlu Kajian*, *Tidak Layak*.

---

## Rencana Implementasi Teknis

### 1. Database Schema (Drizzle ORM)
- Tambahkan tabel `pembahasan` pada `src/db/schema.ts`.
- Kolom yang diperlukan:
  - `id` (Serial/UUID, Primary Key)
  - `target` (Varchar: 'Lokasi' atau 'Bidang')
  - `referensi_id` (Varchar/Foreign Key dinamis yang menyimpan `kode_lokasi` atau `kode_tanah`)
  - `tanggal` (Date/Timestamp)
  - `peserta` (Text)
  - `hasil_pembahasan` (Text)
  - `keputusan` (Varchar: 'Layak', 'Perlu Kajian', 'Tidak Layak')
  - `created_at` & `updated_at` (Timestamp)
- Generate dan jalankan migrasi database (menggunakan Drizzle Kit).

### 2. REST API (ElysiaJS)
- Buat file routing `src/routes/pembahasan.ts` untuk melayani operasi CRUD:
  - `GET /api/pembahasan` - Mengambil data pembahasan (dengan kapabilitas filter berdasarkan target dan referensi ID, serta pencarian kata kunci).
  - `GET /api/pembahasan/:id` - Mengambil detail pembahasan.
  - `POST /api/pembahasan` - Menambah data pembahasan baru.
  - `PUT /api/pembahasan/:id` - Memperbarui data pembahasan.
  - `DELETE /api/pembahasan/:id` - Menghapus data pembahasan.
- Implementasikan *in-memory store fallback* (dengan koneksi timeout check) apabila database sedang bermasalah.

### 3. Antarmuka Web (UI)
- Buat halaman HTML baru `public/pembahasan.html` dengan desain (layout, font, CSS variable) yang konsisten dengan halaman sebelumnya.
- Sediakan navigasi lintas modul pada bagian header.
- Implementasikan UI form dinamis: Jika pengguna memilih "Target = Lokasi", dropdown referensi hanya akan meload opsi dari endpoint `/api/lokasi`. Jika "Target = Bidang", dropdown meload dari `/api/bidang-tanah`.
- Sediakan tabel riwayat pembahasan dengan tombol aksi Edit/Hapus, serta badge status untuk kolom *Keputusan*.

### 4. Testing Otomatis
- Buat file pengujian `test/pembahasan.test.ts`.
- Lakukan pengetesan terhadap endpoint CRUD untuk memastikan validasi payload (termasuk validasi opsi Keputusan), fallback in-memory, dan relasi dinamis berjalan baik.
