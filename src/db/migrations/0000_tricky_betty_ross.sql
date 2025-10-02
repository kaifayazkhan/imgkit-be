CREATE TABLE "transformed_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"original_image_id" integer NOT NULL,
	"mime_type" varchar(100),
	"size_in_bytes" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(100),
	"size_in_bytes" varchar(100),
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "transformed_image" ADD CONSTRAINT "transformed_image_original_image_id_user_image_id_fk" FOREIGN KEY ("original_image_id") REFERENCES "public"."user_image"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_image" ADD CONSTRAINT "user_image_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE cascade ON UPDATE no action;