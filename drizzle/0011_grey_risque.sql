CREATE TABLE "dokumen_cetak_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_template" integer NOT NULL,
	"nama_dokumen" varchar(255) NOT NULL,
	"referensi_tipe" varchar(50) DEFAULT 'Umum' NOT NULL,
	"referensi_id" varchar(100),
	"field_values" jsonb,
	"printed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dokumen_custom_field" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_field" varchar(100) NOT NULL,
	"nama_field" varchar(255) NOT NULL,
	"tipe_data" varchar(50) DEFAULT 'text' NOT NULL,
	"default_value" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dokumen_custom_field_kode_field_unique" UNIQUE("kode_field")
);
--> statement-breakpoint
CREATE TABLE "dokumen_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_template" varchar(100) NOT NULL,
	"nama_template" varchar(255) NOT NULL,
	"kategori" varchar(100) DEFAULT 'Umum' NOT NULL,
	"ukuran_kertas" varchar(50) DEFAULT 'A4' NOT NULL,
	"orientasi" varchar(50) DEFAULT 'Portrait' NOT NULL,
	"layout_mode" varchar(50) DEFAULT 'Single' NOT NULL,
	"header_text" text,
	"isi_template" text NOT NULL,
	"isi_template_halaman_2" text,
	"footer_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dokumen_template_kode_template_unique" UNIQUE("kode_template")
);
--> statement-breakpoint
ALTER TABLE "dokumen_cetak_log" ADD CONSTRAINT "dokumen_cetak_log_id_template_dokumen_template_id_fk" FOREIGN KEY ("id_template") REFERENCES "public"."dokumen_template"("id") ON DELETE cascade ON UPDATE no action;