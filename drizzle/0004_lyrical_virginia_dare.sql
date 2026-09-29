CREATE TABLE "survey" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_survey" varchar(50) NOT NULL,
	"referensi_id" varchar(100) NOT NULL,
	"tanggal_survey" timestamp,
	"pic_survey" varchar(255),
	"hasil_survey" text,
	"koordinat" text,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
