CREATE TABLE "pihak" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_tanah" varchar(100) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"nik" varchar(50),
	"nomor_telp" varchar(50),
	"tipe_pihak" varchar(100) DEFAULT 'Pemegang Hak' NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pihak" ADD CONSTRAINT "pihak_kode_tanah_bidang_tanah_kode_tanah_fk" FOREIGN KEY ("kode_tanah") REFERENCES "public"."bidang_tanah"("kode_tanah") ON DELETE cascade ON UPDATE no action;