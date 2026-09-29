CREATE TABLE "legalitas_tanah" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_tanah" varchar(100) NOT NULL,
	"jenis_dokumen" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'Belum Ada' NOT NULL,
	"nomor_dokumen" varchar(255),
	"tanggal_dokumen" timestamp,
	"penerbit" varchar(255),
	"pihak_id" integer,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legalitas_tanah" ADD CONSTRAINT "legalitas_tanah_kode_tanah_bidang_tanah_kode_tanah_fk" FOREIGN KEY ("kode_tanah") REFERENCES "public"."bidang_tanah"("kode_tanah") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legalitas_tanah" ADD CONSTRAINT "legalitas_tanah_pihak_id_pihak_id_fk" FOREIGN KEY ("pihak_id") REFERENCES "public"."pihak"("id") ON DELETE set null ON UPDATE no action;