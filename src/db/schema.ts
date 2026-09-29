import { pgTable, serial, text, timestamp, varchar, numeric, jsonb } from 'drizzle-orm/pg-core';

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
