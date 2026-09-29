import { pgTable, serial, text, timestamp, varchar, numeric, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const statusLokasiValues = [
  'Survey',
  'Pembahasan',
  'Proses Pembahasan',
  'Selesai',
  'Ditolak',
  'Ditunda',
] as const;

export type StatusLokasi = (typeof statusLokasiValues)[number];

export interface BidangItem {
  id?: string;
  kodeBidang?: string;
  nomorBidang?: string;
  luas: number;
  geojson?: any;
  keterangan?: string;
}

export const lokasi = pgTable('lokasi', {
  // Step 1 - Informasi Lokasi
  kodeLokasi: varchar('kode_lokasi', { length: 100 }).primaryKey(),
  namaLokasi: varchar('nama_lokasi', { length: 255 }).notNull(),
  alamat: text('alamat'),
  desa: varchar('desa', { length: 100 }),
  kecamatan: varchar('kecamatan', { length: 100 }),
  kabupaten: varchar('kabupaten', { length: 100 }),
  peruntukan: varchar('peruntukan', { length: 150 }),
  kondisiLahan: text('kondisi_lahan'),
  kondisiPasar: text('kondisi_pasar'),
  luasTarget: numeric('luas_target', { precision: 14, scale: 2 }),
  luasTeridentifikasi: numeric('luas_teridentifikasi', { precision: 14, scale: 2 }),
  luasDeal: numeric('luas_deal', { precision: 14, scale: 2 }),
  status: varchar('status', { length: 50 }).notNull().default('Survey'),
  catatan: text('catatan'),

  // Step 2 - Batas Lokasi (Peta)
  geojson: jsonb('geojson'),
  luasInduk: numeric('luas_induk', { precision: 14, scale: 2 }),
  totalLuasBidang: numeric('total_luas_bidang', { precision: 14, scale: 2 }).default('0'),
  sisaLuas: numeric('sisa_luas', { precision: 14, scale: 2 }),
  bidangTerpetakan: jsonb('bidang_terpetakan').$type<BidangItem[]>(),

  // Audit timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Lokasi = typeof lokasi.$inferSelect;
export type NewLokasi = typeof lokasi.$inferInsert;

export const statusPembebasanValues = [
  'Teridentifikasi',
  'Deal',
  'Legal Check',
  'Negosiasi',
  'Transaksi',
  'Siap Transaksi',
  'Selesai',
  'Ditunda',
  'Ditolak',
] as const;

export type StatusPembebasan = (typeof statusPembebasanValues)[number];

export interface LegalitasCheckItem {
  id: string;
  namaDokumen: string;
  status: 'Ada' | 'Belum Ada' | 'Dalam Proses' | 'Tidak Diperlukan';
  catatan?: string;
}

export const bidangTanah = pgTable('bidang_tanah', {
  // Step 1 - Data Identitas & Finansial Bidang Tanah
  kodeTanah: varchar('kode_tanah', { length: 100 }).primaryKey(),
  kodeLokasi: varchar('kode_lokasi', { length: 100 })
    .notNull()
    .references(() => lokasi.kodeLokasi, { onDelete: 'cascade' }),
  nomorBidang: varchar('nomor_bidang', { length: 100 }),
  luas: numeric('luas', { precision: 14, scale: 2 }).notNull(),
  jenisHak: varchar('jenis_hak', { length: 100 }),
  nomorHak: varchar('nomor_hak', { length: 150 }),
  statusPembebasan: varchar('status_pembebasan', { length: 50 })
    .notNull()
    .default('Teridentifikasi'),
  hargaPenawaran: numeric('harga_penawaran', { precision: 18, scale: 2 }),
  hargaKesepakatan: numeric('harga_kesepakatan', { precision: 18, scale: 2 }),
  tanggalKesepakatan: timestamp('tanggal_kesepakatan'),
  catatan: text('catatan'),

  // Step 2 - Polygon Bidang (Peta) & Checklist Legalitas
  geojson: jsonb('geojson'),
  checklistLegalitas: jsonb('checklist_legalitas').$type<LegalitasCheckItem[]>(),

  // Audit Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type BidangTanah = typeof bidangTanah.$inferSelect;
export type NewBidangTanah = typeof bidangTanah.$inferInsert;

export const tipePihakValues = [
  'Pemegang Hak',
  'Ahli Waris',
  'Kuasa',
  'Penguasa',
  'Pihak Lain',
] as const;

export type TipePihak = (typeof tipePihakValues)[number];

export const pihak = pgTable('pihak', {
  id: serial('id').primaryKey(),
  kodeTanah: varchar('kode_tanah', { length: 100 })
    .notNull()
    .references(() => bidangTanah.kodeTanah, { onDelete: 'cascade' }),
  nama: varchar('nama', { length: 255 }).notNull(),
  nik: varchar('nik', { length: 50 }),
  nomorTelp: varchar('nomor_telp', { length: 50 }),
  tipePihak: varchar('tipe_pihak', { length: 100 })
    .notNull()
    .default('Pemegang Hak'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Pihak = typeof pihak.$inferSelect;
export type NewPihak = typeof pihak.$inferInsert;

export const survey = pgTable('survey', {
  id: serial('id').primaryKey(),
  targetSurvey: varchar('target_survey', { length: 50 }).notNull(), // 'Lokasi' | 'Bidang'
  referensiId: varchar('referensi_id', { length: 100 }).notNull(), // kodeLokasi or kodeTanah
  tanggalSurvey: timestamp('tanggal_survey'),
  picSurvey: varchar('pic_survey', { length: 255 }),
  hasilSurvey: text('hasil_survey'),
  koordinat: text('koordinat'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Survey = typeof survey.$inferSelect;
export type NewSurvey = typeof survey.$inferInsert;

export const keputusanPembahasanValues = [
  'Layak',
  'Perlu Kajian',
  'Tidak Layak',
] as const;

export type KeputusanPembahasan = (typeof keputusanPembahasanValues)[number];

export const pembahasan = pgTable('pembahasan', {
  id: serial('id').primaryKey(),
  target: varchar('target', { length: 50 }).notNull(), // 'Lokasi' | 'Bidang'
  referensiId: varchar('referensi_id', { length: 100 }).notNull(), // kodeLokasi or kodeTanah
  tanggal: timestamp('tanggal'),
  peserta: text('peserta'),
  hasilPembahasan: text('hasil_pembahasan'),
  keputusan: varchar('keputusan', { length: 50 })
    .notNull()
    .default('Perlu Kajian'), // 'Layak' | 'Perlu Kajian' | 'Tidak Layak'
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Pembahasan = typeof pembahasan.$inferSelect;
export type NewPembahasan = typeof pembahasan.$inferInsert;

export const jenisDokumenValues = [
  'Sertifikat',
  'SHM',
  'SHGB',
  'AJB',
  'KTP',
  'KK',
  'PBB',
  'SPPT',
  'Girik',
  'Letter C',
  'Surat Waris',
  'Akta Waris',
  'Surat Kuasa',
  'Dokumen Lainnya',
] as const;

export type JenisDokumen = (typeof jenisDokumenValues)[number];

export const statusDokumenValues = [
  'Ada',
  'Belum Ada',
  'Proses',
  'Tidak Relevan',
  'Perlu Verifikasi',
] as const;

export type StatusDokumen = (typeof statusDokumenValues)[number];

export const legalitasTanah = pgTable('legalitas_tanah', {
  id: serial('id').primaryKey(),
  kodeTanah: varchar('kode_tanah', { length: 100 })
    .notNull()
    .references(() => bidangTanah.kodeTanah, { onDelete: 'cascade' }),
  jenisDokumen: varchar('jenis_dokumen', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 })
    .notNull()
    .default('Belum Ada'), // 'Ada' | 'Belum Ada' | 'Proses' | 'Tidak Relevan' | 'Perlu Verifikasi'
  nomorDokumen: varchar('nomor_dokumen', { length: 255 }),
  tanggalDokumen: timestamp('tanggal_dokumen'),
  penerbit: varchar('penerbit', { length: 255 }),
  pihakId: integer('pihak_id').references(() => pihak.id, { onDelete: 'set null' }),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type LegalitasTanah = typeof legalitasTanah.$inferSelect;
export type NewLegalitasTanah = typeof legalitasTanah.$inferInsert;

export const tahapPembebasanValues = [
  'Uang Muka',
  'Termin 1',
  'Termin 2',
  'Termin 3',
  'Pelunasan',
  'Ganti Rugi Penuh',
  'Lainnya',
] as const;

export type TahapPembebasan = (typeof tahapPembebasanValues)[number];

export const statusTransaksiValues = [
  'Pending',
  'Lunas',
  'Dalam Proses',
  'Dibatalkan',
  'Gagal',
] as const;

export type StatusTransaksi = (typeof statusTransaksiValues)[number];

export const metodePembayaranValues = [
  'Transfer Bank',
  'Cek / Bilyet Giro',
  'Tunai',
  'Konsinyasi (Pengadilan)',
  'Lainnya',
] as const;

export type MetodePembayaran = (typeof metodePembayaranValues)[number];

export const pembebasan = pgTable('pembebasan', {
  id: serial('id').primaryKey(),
  kodeTanah: varchar('kode_tanah', { length: 100 })
    .notNull()
    .references(() => bidangTanah.kodeTanah, { onDelete: 'cascade' }),
  tanggalPembayaran: timestamp('tanggal_pembayaran').notNull(),
  jumlahPembayaran: numeric('jumlah_pembayaran', { precision: 18, scale: 2 }).notNull(),
  tahapPembayaran: varchar('tahap_pembayaran', { length: 100 })
    .notNull()
    .default('Uang Muka'), // 'Uang Muka' | 'Termin 1' | 'Termin 2' | 'Termin 3' | 'Pelunasan' | 'Ganti Rugi Penuh' | 'Lainnya'
  metodePembayaran: varchar('metode_pembayaran', { length: 100 })
    .notNull()
    .default('Transfer Bank'), // 'Transfer Bank' | 'Cek / Bilyet Giro' | 'Tunai' | 'Konsinyasi (Pengadilan)' | 'Lainnya'
  nomorReferensi: varchar('nomor_referensi', { length: 150 }),
  buktiPembayaran: text('bukti_pembayaran'),
  status: varchar('status', { length: 50 })
    .notNull()
    .default('Pending'), // 'Pending' | 'Lunas' | 'Dalam Proses' | 'Dibatalkan' | 'Gagal'
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Pembebasan = typeof pembebasan.$inferSelect;
export type NewPembebasan = typeof pembebasan.$inferInsert;

export const statusKkprValues = [
  'Draft',
  'Diajukan',
  'Ditinjau',
  'Disetujui',
  'Ditolak',
] as const;

export type StatusKkpr = (typeof statusKkprValues)[number];

export const kategoriKkprValues = [
  'Perumahan & Permukiman',
  'Komersial & Jasa',
  'Industri & Pergudangan',
  'Infrastruktur & Utilitas',
  'Pariwisata',
  'Pertanian & Perkebunan',
  'Lainnya',
] as const;

export type KategoriKkpr = (typeof kategoriKkprValues)[number];

export const kkpr = pgTable('kkpr', {
  id: serial('id').primaryKey(),
  kodeKkpr: varchar('kode_kkpr', { length: 100 }).notNull().unique(),
  namaKegiatan: varchar('nama_kegiatan', { length: 255 }).notNull(),
  pemohon: varchar('pemohon', { length: 255 }),
  nomorIzin: varchar('nomor_izin', { length: 150 }),
  kategori: varchar('kategori', { length: 100 }).notNull().default('Industri & Pergudangan'),
  luasRencana: numeric('luas_rencana', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 50 }).notNull().default('Draft'),
  geojson: jsonb('geojson'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Kkpr = typeof kkpr.$inferSelect;
export type NewKkpr = typeof kkpr.$inferInsert;



