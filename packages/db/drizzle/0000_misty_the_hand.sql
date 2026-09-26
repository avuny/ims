CREATE TYPE "public"."auth_provider_type" AS ENUM('GOOGLE', 'FACEBOOK');--> statement-breakpoint
CREATE TYPE "public"."identifier_type" AS ENUM('EMAIL', 'PHONE', 'USERNAME');--> statement-breakpoint
CREATE TYPE "public"."otp_type" AS ENUM('SIGN_UP', 'LOGIN', 'FORGET_PASSWORD');--> statement-breakpoint
CREATE TABLE "user_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"identifier_type" "identifier_type" NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identifiers_identifier_normalized_chk" CHECK ("user_identifiers"."identifier" = lower(btrim("user_identifiers"."identifier")) AND "user_identifiers"."identifier" <> ''),
	CONSTRAINT "user_identifiers_verified_consistent_chk" CHECK ("user_identifiers"."is_verified" = ("user_identifiers"."verified_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "user_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier_id" uuid NOT NULL,
	"provider" "auth_provider_type" NOT NULL,
	"provider_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"contact_email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "otp_type" NOT NULL,
	"identifier" text NOT NULL,
	"otp_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otps_identifier_normalized_chk" CHECK ("otps"."identifier" = lower(btrim("otps"."identifier")) AND "otps"."identifier" <> ''),
	CONSTRAINT "otps_attempts_non_negative_chk" CHECK ("otps"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_agent" text,
	"ip_address" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_identifiers" ADD CONSTRAINT "user_identifiers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_providers" ADD CONSTRAINT "user_providers_identifier_id_user_identifiers_id_fk" FOREIGN KEY ("identifier_id") REFERENCES "public"."user_identifiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_identifiers_identifier_uidx" ON "user_identifiers" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "user_identifiers_user_id_type_idx" ON "user_identifiers" USING btree ("user_id","identifier_type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_providers_provider_provider_id_uidx" ON "user_providers" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "user_providers_identifier_id_idx" ON "user_providers" USING btree ("identifier_id");--> statement-breakpoint
CREATE INDEX "otps_identifier_type_created_at_idx" ON "otps" USING btree ("identifier","type","created_at");--> statement-breakpoint
CREATE INDEX "otps_expires_at_idx" ON "otps" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_hash_uidx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");