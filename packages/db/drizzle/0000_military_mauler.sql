CREATE TYPE "public"."auth_challenge_channel" AS ENUM('EMAIL', 'SMS');--> statement-breakpoint
CREATE TYPE "public"."auth_challenge_purpose" AS ENUM('SIGN_UP', 'LOGIN', 'VERIFY_EMAIL', 'VERIFY_PHONE', 'PASSWORD_RESET', 'CHANGE_EMAIL', 'CHANGE_PHONE');--> statement-breakpoint
CREATE TYPE "public"."business_party_role" AS ENUM('CUSTOMER', 'SUPPLIER');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('GOOGLE', 'FACEBOOK', 'APPLE');--> statement-breakpoint
CREATE TYPE "public"."organization_member_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TABLE "user_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_normalized" varchar(320) NOT NULL,
	"verified_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"verified_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50),
	"username_normalized" varchar(50),
	"password_hash" text,
	"display_name" varchar(120),
	"avatar_url" text,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"purpose" "auth_challenge_purpose" NOT NULL,
	"channel" "auth_challenge_channel",
	"identifier" varchar(320),
	"secret_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"token_family_id" uuid NOT NULL,
	"replaced_by_session_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" varchar(100),
	"user_agent" text,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"provider_email" varchar(320),
	"provider_email_verified" boolean,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_member_role" DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(50),
	"legal_name" varchar(200),
	"tax_number" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_party_roles" (
	"party_id" uuid NOT NULL,
	"role" "business_party_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_party_roles_party_id_role_pk" PRIMARY KEY("party_id","role")
);
--> statement-breakpoint
CREATE TABLE "party_users" (
	"party_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(100),
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_users_party_id_user_id_pk" PRIMARY KEY("party_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_parties" ADD CONSTRAINT "business_parties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_party_roles" ADD CONSTRAINT "business_party_roles_party_id_business_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."business_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_users" ADD CONSTRAINT "party_users_party_id_business_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."business_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_users" ADD CONSTRAINT "party_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_emails_normalized_uq" ON "user_emails" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "user_emails_user_id_idx" ON "user_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_emails_verified_idx" ON "user_emails" USING btree ("verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_phones_phone_uq" ON "user_phones" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "user_phones_user_id_idx" ON "user_phones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_phones_verified_idx" ON "user_phones" USING btree ("verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_normalized_uq" ON "users" USING btree ("username_normalized");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_challenges_user_id_idx" ON "auth_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_challenges_identifier_idx" ON "auth_challenges" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "auth_challenges_expires_at_idx" ON "auth_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_challenges_purpose_idx" ON "auth_challenges" USING btree ("purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_uq" ON "auth_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_token_family_idx" ON "auth_sessions" USING btree ("token_family_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_revoked_at_idx" ON "auth_sessions" USING btree ("revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_provider_account_uq" ON "oauth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_members_role_idx" ON "organization_members" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uq" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "business_parties_organization_id_idx" ON "business_parties" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "business_parties_name_idx" ON "business_parties" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "business_parties_org_code_uq" ON "business_parties" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "party_users_user_id_idx" ON "party_users" USING btree ("user_id");