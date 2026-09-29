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

