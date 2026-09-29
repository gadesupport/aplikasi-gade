# Fitur Legalitas Tanah (Manajemen Lahan)

Tugas ini berisi perintah dan perencanaan (blueprint) untuk implementasi menu **Legalitas Tanah** pada sistem. Modul ini digunakan untuk mencatat, memonitor, dan mengelola dokumen legalitas yang terkait dengan suatu bidang tanah, serta menghubungkan dokumen tersebut dengan pihak/pemilik terkait.

---

## Kebutuhan Input & Data (Formulir Legalitas Tanah)

Antarmuka formulir dan database harus mampu menangani rincian inputan berikut:

1. **Bidang Tanah**: 
   - Dropdown untuk memilih Bidang Tanah (Foreign Key ke tabel `bidang_tanah`).
   - Digunakan untuk mengidentifikasi dokumen ini milik bidang tanah yang mana.
2. **Jenis Dokumen**: 
   - Dropdown opsi jenis dokumen. Pilihan yang tersedia:
     *Sertifikat, SHM, SHGB, AJB, KTP, KK, PBB, SPPT, Girik, Letter C, Surat Waris, Akta Waris, Surat Kuasa, Dokumen Lainnya*.
3. **Status**:
   - Dropdown status dokumen saat ini. Pilihan yang tersedia:
     *Ada, Belum Ada, Proses, Tidak Relevan, Perlu Verifikasi*.
4. **Nomor Dokumen**:
   - Kolom teks (varchar) untuk mencatat nomor seri atau identitas dokumen (jika ada).
5. **Tanggal Dokumen**:
   - Tanggal penerbitan atau pengesahan dokumen.
6. **Penerbit**:
   - Kolom teks (varchar) untuk mencatat instansi atau pejabat yang menerbitkan (misal: BPN, Kelurahan, Notaris, dll).
7. **Pihak Terkait**:
   - Dropdown untuk mengkoneksikan dokumen dengan individu terkait (Foreign Key ke tabel `pihak`).
   - Pada UI, disarankan agar opsi Pihak yang muncul adalah pihak-pihak yang sudah terelasi dengan Bidang Tanah yang dipilih pada poin 1.
8. **Catatan**:
   - Kolom teks (textarea) untuk keterangan tambahan, kondisi fisik dokumen, atau hal lainnya.

---

## Rencana Implementasi Teknis

### 1. Database Schema (Drizzle ORM)
- Tambahkan tabel `legalitas_tanah` pada `src/db/schema.ts`.
- Kolom yang diperlukan:
  - `id` (Serial/UUID, Primary Key)
  - `kode_tanah` (Varchar, Foreign Key ke `bidang_tanah.kode_tanah`, on delete cascade)
  - `jenis_dokumen` (Varchar)
  - `status` (Varchar: 'Ada', 'Belum Ada', 'Proses', 'Tidak Relevan', 'Perlu Verifikasi')
  - `nomor_dokumen` (Varchar, nullable)
  - `tanggal_dokumen` (Date/Timestamp, nullable)
  - `penerbit` (Varchar, nullable)
  - `pihak_id` (Integer, Foreign Key ke `pihak.id`, nullable/on delete set null)
  - `catatan` (Text, nullable)
  - `created_at` & `updated_at` (Timestamp)
- Generate dan jalankan migrasi database (menggunakan Drizzle Kit).

### 2. REST API (ElysiaJS)
- Buat file routing `src/routes/legalitasTanah.ts` untuk melayani operasi CRUD:
  - `GET /api/legalitas-tanah` - Mengambil data legalitas (dengan filter berdasarkan `kodeTanah`, `status`, `jenisDokumen`, dan pencarian).
  - `GET /api/legalitas-tanah/:id` - Mengambil detail legalitas.
  - `POST /api/legalitas-tanah` - Menambah data legalitas baru.
  - `PUT /api/legalitas-tanah/:id` - Memperbarui data legalitas.
  - `DELETE /api/legalitas-tanah/:id` - Menghapus data legalitas.
- Implementasikan *in-memory store fallback* (dengan pengecekan koneksi timeout) seperti pada modul-modul sebelumnya.
- Daftarkan route baru ini pada `src/index.ts`.

### 3. Antarmuka Web (UI)
- Buat halaman HTML baru `public/legalitas.html` dengan desain (layout, font, komponen) yang konsisten dengan halaman sebelumnya (tema disarankan menggunakan warna khusus agar mudah dibedakan, misal kombinasi warna *Slate/Teal* atau sesuai harmoni aplikasi).
- Sediakan navigasi lintas modul pada bagian header, dan tambahkan tautan Legalitas Tanah ini di file-file `.html` lainnya (Lokasi, Bidang, Pihak, Survey, Pembahasan).
- Implementasikan UI form dinamis:
  - Ketika dropdown "Bidang Tanah" dipilih, dropdown "Pihak Terkait" harus secara dinamis (via AJAX) mengambil data dari endpoint `/api/pihak/by-bidang/:kodeTanah` agar relevan.
- Sediakan tabel riwayat dan daftar dokumen legalitas dengan tombol aksi Edit/Hapus, serta badge warna-warni untuk kolom *Status* (misal: Hijau untuk "Ada", Kuning untuk "Proses", Merah untuk "Belum Ada", dll).

### 4. Testing Otomatis
- Buat file pengujian `test/legalitasTanah.test.ts`.
- Lakukan pengetesan terhadap endpoint CRUD untuk memastikan relasi dengan `bidang_tanah` dan `pihak` berjalan lancar, form validasi bekerja, dan fallback in-memory teruji dengan baik.
