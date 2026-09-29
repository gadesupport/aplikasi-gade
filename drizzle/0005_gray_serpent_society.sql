CREATE TABLE "pembahasan" (
	"id" serial PRIMARY KEY NOT NULL,
	"target" varchar(50) NOT NULL,
	"referensi_id" varchar(100) NOT NULL,
	"tanggal" timestamp,
	"peserta" text,
	"hasil_pembahasan" text,
	"keputusan" varchar(50) DEFAULT 'Perlu Kajian' NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
