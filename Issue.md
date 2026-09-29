# Perencanaan Fitur: Menu Pemetaan (GIS)

## Deskripsi Singkat
Modul Pemetaan berfungsi sebagai kontrol utama (dashboard spasial) untuk seluruh kegiatan pemetaan pada aplikasi. Modul ini menyediakan kemampuan Sistem Informasi Geografis (GIS) interaktif berbasis web untuk memvisualisasikan, membuat, mengedit, dan menganalisis data spasial (polygon/batas bidang lahan). Modul ini juga akan digunakan sebagai sarana digitasi perencanaan lahan (KKPR).

## Spesifikasi Teknis & Kebutuhan Fitur

### 1. Antarmuka Peta (Map Interface)
- **Tampilan Utama**: Harus mendukung mode **Fullscreen** dan kemampuan **Zoom** (in/out) yang mulus.
- **Base Map Switcher**: Menyediakan opsi pergantian jenis peta dasar (Base Map), misalnya: Street Map, Satellite/Imagery, Topography, Carto Positron.
- **Interaksi Popup**: Saat pengguna mengklik suatu polygon/bidang di peta, muncul **Popup Details** yang menampilkan informasi lengkap bidang tersebut (seperti informasi pemilik, luas, status, dll).

### 2. Manajemen Data Spasial (Import/Export)
- **Import Data**: Mendukung upload dan parsing format spasial standar:
  - GeoJSON
  - SHP (Shapefile) dalam format `.zip`
  - KML
  *(Sistem mengintegrasikan data yang di-import berdasarkan kategori yang relevan).*
- **Export Data**: Mendukung pengunduhan (download) data ke dalam format:
  - GeoJSON
  - KML
  - SHP (dibungkus `.zip`) khususnya untuk kebutuhan upload data OSS (seperti data KKPR).

### 3. Manajemen Layer (Visualisasi)
Peta harus dapat menampilkan beberapa layer sekaligus secara terorganisir:
- **Layer Induk**: Menampilkan batas lokasi induk (proyek utama).
- **Layer Batas Bidang**: Menampilkan batas bidang-bidang tanah kecil di dalam lokasi induk. Layer ini harus **dinamis**, misalnya warna bidang disesuaikan berdasarkan **Status Pembayaran** (Merah untuk belum dibayar, Kuning untuk parsial/bertahap, Hijau untuk lunas).
- **Layer KKPR (Kesesuaian Kegiatan Pemanfaatan Ruang)**: Layer khusus untuk perencanaan batas izin lahan kegiatan.

### 4. Fitur Digitasi & Editing (Mapping Tools)
Menyediakan *tools* GIS lengkap pada antarmuka peta:
- **Draw/Tambah Polygon**: Memungkinkan pengguna menggambar/mendigitasi polygon baru pada layer yang spesifik (khususnya untuk layer perencanaan KKPR).
- **Edit Polygon**: Mengubah bentuk/batas bidang (vertex editing) dari polygon yang sudah ada.
- **Delete Polygon**: Menghapus polygon yang tidak diperlukan atau salah buat.
- **Snapping**: Mendukung fitur *snapping* untuk mempermudah digitasi dan mencegah gap/overlap, yang meliputi:
  - **Endpoint Snap**: Kursor menempel ke ujung (node/vertex) terdekat.
  - **Nearest Snap**: Kursor menempel ke garis batas (edge) terdekat.
