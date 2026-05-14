CREATE TYPE "public"."health_integration_status" AS ENUM('active', 'disconnected');--> statement-breakpoint
CREATE TABLE "health_integration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_user_id" text NOT NULL,
	"source" text,
	"status" "health_integration_status" DEFAULT 'active' NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_integration" ADD CONSTRAINT "health_integration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "health_integration_user_provider_idx" ON "health_integration" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "health_integration_external_idx" ON "health_integration" USING btree ("provider","external_user_id");