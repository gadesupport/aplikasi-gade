CREATE TABLE "bidang_tanah" (
	"kode_tanah" varchar(100) PRIMARY KEY NOT NULL,
	"kode_lokasi" varchar(100) NOT NULL,
	"nomor_bidang" varchar(100),
	"luas" numeric(14, 2) NOT NULL,
	"jenis_hak" varchar(100),
	"nomor_hak" varchar(150),
	"status_pembebasan" varchar(50) DEFAULT 'Teridentifikasi' NOT NULL,
	"harga_penawaran" numeric(18, 2),
	"harga_kesepakatan" numeric(18, 2),
	"tanggal_kesepakatan" timestamp,
	"catatan" text,
	"geojson" jsonb,
	"checklist_legalitas" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bidang_tanah" ADD CONSTRAINT "bidang_tanah_kode_lokasi_lokasi_kode_lokasi_fk" FOREIGN KEY ("kode_lokasi") REFERENCES "public"."lokasi"("kode_lokasi") ON DELETE cascade ON UPDATE no action;