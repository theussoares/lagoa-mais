ALTER TABLE "shops" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "demo_marked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "demo_marked_by" text;