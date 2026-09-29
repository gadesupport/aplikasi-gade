# Rencana Implementasi Modul Laporan & Generate Dokumen

## 1. Modul Laporan

Modul ini berfungsi sebagai pusat agregasi untuk seluruh laporan dari berbagai modul aplikasi Gade Support.

### Daftar Laporan:
- **Laporan Progress Pembebasan** (Wajib export PDF & Excel)
- **Laporan Rekapitulasi Lokasi**
- **Laporan Rekapitulasi Bidang**
- **Laporan Rekapitulasi Pihak/Pemilik**
- **Laporan Rekapitulasi Survey**
- **Laporan Rekapitulasi Legalitas Tanah**
- **Laporan Rekapitulasi Pembahasan**
- **Laporan Rekapitulasi Pemetaan**
- **Laporan Rekapitulasi Project**
- **Laporan Rekapitulasi Arsip Legal**
- **Laporan Rekapitulasi Serah Terima (BAST)**

### Kriteria Penerimaan Laporan:
- Ada antarmuka sentral (Dashboard Laporan) untuk melihat semua jenis laporan.
- Terdapat fitur *filtering* data sesuai konteks masing-masing laporan (tanggal, status, dll).
- Tersedia fitur *Export to PDF* & *Export to Excel* (terutama untuk laporan krusial).
- Implementasi API wajib dilengkapi fungsi `checkDbConnection()` untuk mekanisme *fallback*.

---

## 2. Modul Generate Dokumen

Modul baru ini memberikan kapabilitas *mail-merge* (seperti MS Word) di dalam aplikasi. Admin dapat membuat *custom template* surat atau dokumen yang nantinya diisi dengan data dinamis (Lokasi, Bidang, Pemilik, dll) yang bersumber dari *database*.

### Sub-menu & Fitur Utama:
1. **Tambah Data (Custom Fields)**
   - Form untuk menambahkan tipe data/field referensi baru yang belum tersedia secara default di dalam *database* sistem.
   - Berguna untuk menyediakan variabel kustom yang bisa disisipkan ke dalam *template* dokumen.
2. **Template Dokumen**
   - Editor/GUI untuk merancang *custom document* secara visual.
   - **Konfigurasi Ukuran & Orientasi:** Mendukung opsi *Portrait* dan *Landscape*.
   - **Fitur Khusus Landscape (Book Spread):** Jika *Landscape* dipilih, *template* dapat dikustomisasi menjadi 2 halaman berdampingan (seperti layout buku).
   - Kapabilitas untuk menyisipkan *placeholder* variabel/field data (*database* atau *custom* data).
3. **Cetak Dokumen**
   - Halaman khusus bagi Admin untuk mencetak dokumen.
   - Admin memilih jenis *template* yang telah dibuat.
   - Menghubungkan variabel di *template* dengan baris data spesifik di *database*.
   - Output *Generate* & *Cetak PDF* secara langsung.

### Kriteria Penerimaan Generate Dokumen:
- Fitur *drag-and-drop* atau editor WYSIWYG untuk pembuatan *template*.
- Sistem parsing *template* (misal: mengganti placeholder `{{nama_pemilik}}` dengan data dari *database*).
- Pilihan orientasi cetak PDF (*Portrait* / *Landscape* dengan layout *Book*).

---
*Catatan: Pastikan desain responsif, optimasi query `JOIN` yang digunakan untuk pelaporan, serta perbarui menu navigasi (*navbar/sidebar*) di setiap halaman untuk memasukkan modul baru ini.*
