CREATE TABLE "kkpr" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_kkpr" varchar(100) NOT NULL,
	"nama_kegiatan" varchar(255) NOT NULL,
	"pemohon" varchar(255),
	"nomor_izin" varchar(150),
	"kategori" varchar(100) DEFAULT 'Industri & Pergudangan' NOT NULL,
	"luas_rencana" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"geojson" jsonb,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kkpr_kode_kkpr_unique" UNIQUE("kode_kkpr")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_project" varchar(100) NOT NULL,
	"nama_project" varchar(255) NOT NULL,
	"lokasi" varchar(255) NOT NULL,
	"desa" varchar(100) NOT NULL,
	"kecamatan" varchar(100) NOT NULL,
	"kabupaten" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'Perencanaan' NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_kode_project_unique" UNIQUE("kode_project")
);
