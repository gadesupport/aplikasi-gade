CREATE TABLE "bast" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_bast" varchar(100) NOT NULL,
	"tanggal" timestamp NOT NULL,
	"jenis" varchar(50) DEFAULT 'Peminjaman' NOT NULL,
	"pihak_penyerah" varchar(255) NOT NULL,
	"pihak_penerima" varchar(255) NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bast_nomor_bast_unique" UNIQUE("nomor_bast")
);
--> statement-breakpoint
CREATE TABLE "bast_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_bast" integer NOT NULL,
	"id_arsip_legal" integer NOT NULL,
	"catatan" text
);
--> statement-breakpoint
ALTER TABLE "bast_detail" ADD CONSTRAINT "bast_detail_id_bast_bast_id_fk" FOREIGN KEY ("id_bast") REFERENCES "public"."bast"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bast_detail" ADD CONSTRAINT "bast_detail_id_arsip_legal_arsip_legal_id_fk" FOREIGN KEY ("id_arsip_legal") REFERENCES "public"."arsip_legal"("id") ON DELETE cascade ON UPDATE no action;