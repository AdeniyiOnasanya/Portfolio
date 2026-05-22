CREATE TABLE "draft" (
	"id" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
