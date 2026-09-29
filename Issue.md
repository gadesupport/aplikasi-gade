# Pengembangan Fitur Menu Bidang Tanah

Dokumen ini berisi spesifikasi kebutuhan dan perencanaan teknis untuk pengembangan fitur menu **Bidang Tanah**. Dokumen ini dirancang sebagai instruksi kerja (blueprint) yang jelas dan komprehensif, siap diimplementasikan oleh programmer atau AI model.

---

## 1. Deskripsi Fitur

Fitur ini digunakan untuk mengelola data bidang-bidang tanah (persil) yang berada di bawah suatu **Lokasi Induk** dengan alur kerja (workflow) 2 tahap:
1. **Step 1: Data Identitas & Legalitas Bidang Tanah** (Formulir pengisian data tekstual, status pembebasan, dan finansial).
2. **Step 2: Pembuatan Polygon Bidang (Peta)** (Pemetaan visual poligon bidang di dalam lokasi induk, pengecekan checklist legalitas, dan monitoring rekapitulasi luas).

Pengguna dapat memilih untuk **Simpan (Draft)** pada Step 1 atau langsung klik **Lanjut ke Step 2** untuk proses pemetaan polygon di peta.

---

## 2. Spesifikasi Kebutuhan Input & Data

### Step 1 - Form Informasi Bidang Tanah
Siapkan formulir antarmuka pengguna (UI) dan skema database (tabel `bidang_tanah`) dengan atribut-atribut berikut:

*   **Lokasi Induk** *(Foreign Key / Integrasi)*:
    *   Terhubung ke tabel `lokasi` (menggunakan `kode_lokasi` sebagai relasi).
    *   Pada antarmuka UI berupa dropdown/pilihan pencarian data lokasi induk yang sudah terdaftar.
*   **Kode Tanah** *(Primary Key / Kunci Unik Bidang)*:
    *   String/Varchar unik (contoh: `BDT-2026-001`).
    *   Wajib diisi, berfungsi sebagai kunci integrasi dengan modul Legalitas, Pihak/Pemilik, dan Pembayaran.
*   **Nomor Bidang**:
    *   String/Varchar (contoh: `01`, `02/SKM/2026`, atau nomor urut persil).
*   **Luas**:
    *   Numeric/Decimal (m²). Wajib diisi (> 0).
*   **Jenis Hak**:
    *   Pilihan dropdown (contoh: `SHM`, `SHGB`, `Hak Pakai`, `Girik`, `Letter C`, `AJB`, `Lainnya`).
*   **Nomor Hak**:
    *   String/Varchar (nomor sertifikat hak milik atau nomor warkat/dokumen).
*   **Status Pembebasan**:
    *   Dropdown status dengan pilihan nilai:
        *   `Teridentifikasi`
        *   `Deal`
        *   `Legal Check`
        *   `Negosiasi`
        *   `Transaksi`
        *   `Siap Transaksi`
        *   `Selesai`
        *   `Ditunda`
        *   `Ditolak`
*   **Harga Penawaran**:
    *   Numeric/Currency (Rupiah). Harga yang ditawarkan oleh pihak penjual/pemilik.
*   **Harga Kesepakatan**:
    *   Numeric/Currency (Rupiah). Nilai akhir kesepakatan harga jual beli.
*   **Tanggal Kesepakatan**:
    *   Date/Calendar input. Tanggal dicapainya kesepakatan harga.
*   **Catatan**:
    *   Text area untuk catatan negosiasi, informasi pemilik, atau kondisi khusus lahan.
*   **Dibuat (Created At) & Terakhir Diubah (Updated At)**:
    *   Timestamp otomatis dari sistem.

**Aksi Navigasi Form Step 1:**
*   `Simpan (Draft)`: Menyimpan data bidang tanah ke database tanpa harus membuka peta.
*   `Lanjut ke Step 2 (Peta)`: Menyimpan data Step 1 dan langsung mengarahkan user ke halaman pembuatan polygon bidang di peta.

---

### Step 2 - Pembuatan Polygon Bidang (Peta)
Halaman interaktif yang menampilkan peta spasial bidang tanah yang diplot di dalam area lokasi induk:

*   **Peta & Pembuatan Polygon Bidang**:
    *   Menampilkan layer batas lokasi induk sebagai acuan area kerja.
    *   Alat gambar poligon untuk memetakan batas bidang tanah yang sedang diproses.
    *   Simpan data koordinat geometris bidang (GeoJSON).
*   **Checklist Legalitas**:
    *   Daftar verifikasi kelengkapan dokumen pendukung tanah (misal: KTP Pemilik, Kartu Keluarga, Asli Sertifikat/Girik, PBB Terakhir, Surat Bebas Sengketa, dll).
*   **Widget Rekapitulasi Luas Area (Monitoring)**:
    *   **Luas Induk**: Luas total area dari lokasi induk terkait.
    *   **Total Luas Bidang**: Akumulasi total luas dari seluruh bidang yang telah terdata/terpetakan pada lokasi induk tersebut.
    *   **Sisa Luas**: Kalkulasi otomatis: `Luas Induk - Total Luas Bidang`.
    *   **Bidang Terpetakan**: Daftar bidang-bidang yang sudah memiliki polygon spasial di lokasi induk tersebut.

---

## 3. Rencana Langkah Implementasi Teknis

1.  **Database Migration (Drizzle ORM & PostgreSQL)**:
    *   Buat tabel `bidang_tanah` dengan foreign key `kode_lokasi` yang berelasi ke `lokasi.kode_lokasi`.
    *   Sediakan kolom `geojson` atau tipe geometry spatial untuk menyimpan polygon bidang.
    *   Sediakan kolom untuk menyimpan status checklist legalitas (JSON/Array).
    *   Jalankan `bun run db:generate` untuk menghasilkan file migrasi Drizzle.
2.  **Backend REST API (ElysiaJS)**:
    *   Endpoint CRUD untuk bidang tanah (`/api/bidang-tanah`):
        *   `GET /api/bidang-tanah` (dengan filter lokasi induk, status pembebasan, dan pencarian).
        *   `GET /api/bidang-tanah/:kodeTanah`
        *   `POST /api/bidang-tanah` (validasi keunikan kode tanah dan validitas lokasi induk).
        *   `PUT /api/bidang-tanah/:kodeTanah`
        *   `PATCH /api/bidang-tanah/:kodeTanah/polygon` (menyimpan geometri polygon & update checklist legalitas).
        *   `DELETE /api/bidang-tanah/:kodeTanah`
3.  **Frontend & Integrasi Peta (Leaflet.js)**:
    *   Sediakan form input dinamis pada Step 1 dengan integrasi dropdown data master lokasi.
    *   Pada Step 2, tampilkan layer batas lokasi induk dan layer polygon bidang tanah dengan pewarnaan berdasarkan status pembebasan.
    *   Perhitungan reaktif untuk ringkasan luas (Luas Induk, Total Luas Bidang, dan Sisa Luas).
4.  **Testing**:
    *   Buat pengujian otomatis (automated unit/integration test) menggunakan Bun test untuk memastikan seluruh fungsionalitas dan validasi berjalan dengan baik.

---
*Catatan: Pastikan penggunaan kode tanah selalu konsisten sebagai kunci integrasi dengan modul-modul lainnya (Legalitas, Pemilik, dan Pembayaran).*
