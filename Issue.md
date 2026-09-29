# Pengembangan Fitur Menu Lokasi

Dokumen ini berisi spesifikasi dan perencanaan untuk pengembangan fitur menu **Lokasi**. Silakan gunakan dokumen ini sebagai panduan implementasi, baik untuk pengembangan mandiri maupun jika didelegasikan ke AI assistant (model) lainnya.

## Deskripsi Fitur

Fitur ini memungkinkan pengguna untuk mendata dan mengelola lokasi baru dengan alur kerja (workflow) 2 tahap (step):
1. **Step 1: Informasi Dasar Lokasi** (Pengisian data tekstual).
2. **Step 2: Batas Lokasi (Peta)** (Pemetaan area secara visual).

Pengguna dapat menyimpan draf setelah Step 1 selesai atau langsung melanjutkan ke Step 2.

---

## Spesifikasi Kebutuhan (Requirements)

### Step 1 - Form Informasi Lokasi
Buatlah antarmuka formulir (form) untuk menampung inputan berikut, beserta skema database (tabel `lokasi`) yang sesuai:

*   **Kode Lokasi** *(Primary Key / Kunci Integrasi)* - Wajib diisi, tipe string/varchar, harus unik karena digunakan sebagai kunci integrasi dengan modul lain.
*   **Nama Lokasi** - String/Varchar.
*   **Alamat** - Text.
*   **Desa** - String/Varchar (bisa berupa dropdown terintegrasi dengan data master wilayah jika ada).
*   **Kecamatan** - String/Varchar (dropdown).
*   **Kabupaten** - String/Varchar (dropdown).
*   **Peruntukan** - String/Varchar (dropdown/text).
*   **Kondisi Lahan** - String/Text.
*   **Kondisi Pasar** - String/Text.
*   **Luas Target** - Numeric/Decimal (satuan m2 atau Ha, pastikan konsisten di UI).
*   **Luas Teridentifikasi** - Numeric/Decimal.
*   **Luas Deal** - Numeric/Decimal.
*   **Status** - Enum/Dropdown dengan pilihan nilai:
    *   `Survey`
    *   `Pembahasan`
    *   `Proses Pembahasan`
    *   `Selesai`
    *   `Ditolak`
    *   `Ditunda`
*   **Catatan** - Text area.
*   **Dibuat** (Created At) - Timestamp (Otomatis digenerate sistem saat insert).
*   **Terakhir Diubah** (Last Modified At/Updated At) - Timestamp (Otomatis diupdate sistem saat ada perubahan).

**Aksi (Action Buttons) di Step 1:**
*   `Simpan (Draft)`: Menyimpan data lokasi tanpa masuk ke halaman peta.
*   `Lanjut ke Step 2`: Menyimpan data lokasi dan membuka antarmuka peta untuk pemetaan batas.

---

### Step 2 - Batas Lokasi (Peta)
Halaman ini menampilkan peta interaktif yang terhubung dengan data Lokasi yang telah dibuat di Step 1.

Fitur dan Informasi yang harus ditampilkan dan dikelola:

*   **Pemetaan Area**: Fitur/alat gambar (polygon) pada peta untuk menandai batas lokasi. Simpan data koordinat geometrinya.
*   **Luas Induk**: (Informasi) Luas area utama dari lokasi berdasarkan pemetaan yang digambar.
*   **Total Luas Bidang**: (Informasi) Akumulasi total luas dari sub-bidang / persil di dalam lokasi (jika ada pembagian/pemecahan bidang).
*   **Sisa Luas**: (Kalkulasi) Hasil dari perhitungan: `Luas Induk` dikurangi `Total Luas Bidang`.
*   **Bidang Terpetakan**: (Informasi/Daftar) List data bidang-bidang apa saja yang sudah digambar dan terpetakan di dalam lokasi tersebut.

---

## Langkah Implementasi yang Disarankan

1.  **Database Migration & Model**:
    *   Buat skema tabel `lokasi` yang mengakomodasi seluruh field pada Step 1.
    *   Siapkan kolom bertipe spatial/geometry (atau text untuk menyimpan GeoJSON) untuk menyimpan data polygon pemetaan area.
2.  **API / Backend Service**:
    *   Buat endpoint CRUD untuk entitas `Lokasi`.
    *   Buat endpoint khusus untuk mengelola update koordinat/area pemetaan pada tahap Step 2.
3.  **Frontend - UI/UX (Step 1)**:
    *   Buat desain layout form yang responsif dan user-friendly. 
    *   Pastikan validasi untuk `Kode Lokasi` agar unik dan wajib diisi di sisi client dan server.
4.  **Frontend - Peta (Step 2)**:
    *   Integrasikan library peta (contoh: Leaflet.js, OpenLayers, atau Google Maps API).
    *   Implementasikan library *drawing* pada peta agar user bisa menggambar poligon batas lokasi.
    *   Hitung secara otomatis luas area polygon yang digambar menggunakan bantuan library geometri peta, lalu setelin nilainya ke `Luas Induk`.
    *   Implementasikan kalkulasi reaktif untuk `Sisa Luas`.
