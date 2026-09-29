CREATE TABLE "pembebasan" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_tanah" varchar(100) NOT NULL,
	"tanggal_pembayaran" timestamp NOT NULL,
	"jumlah_pembayaran" numeric(18, 2) NOT NULL,
	"tahap_pembayaran" varchar(100) DEFAULT 'Uang Muka' NOT NULL,
	"metode_pembayaran" varchar(100) DEFAULT 'Transfer Bank' NOT NULL,
	"nomor_referensi" varchar(150),
	"bukti_pembayaran" text,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pembebasan" ADD CONSTRAINT "pembebasan_kode_tanah_bidang_tanah_kode_tanah_fk" FOREIGN KEY ("kode_tanah") REFERENCES "public"."bidang_tanah"("kode_tanah") ON DELETE cascade ON UPDATE no action;