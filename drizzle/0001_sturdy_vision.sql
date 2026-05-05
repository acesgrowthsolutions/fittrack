CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"meal_date" date NOT NULL,
	"description" text NOT NULL,
	"total_calories" integer NOT NULL,
	"protein_g" numeric,
	"carbs_g" numeric,
	"fat_g" numeric,
	"food_items" jsonb NOT NULL,
	"image_url" text,
	"confidence" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meals_user_id_idx" ON "meals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meals_date_idx" ON "meals" USING btree ("meal_date");--> statement-breakpoint
CREATE INDEX "meals_user_date_idx" ON "meals" USING btree ("user_id","meal_date");