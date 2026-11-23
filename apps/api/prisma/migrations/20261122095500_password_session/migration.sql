ALTER TABLE "app_user" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "app_user" ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "app_user" ADD COLUMN "locked_until" TIMESTAMP(3);
ALTER TABLE "app_user" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Existing hashes are PINs. Those users must set a password before they get a session.
UPDATE "app_user" SET "must_change_password" = true WHERE "password_hash" IS NOT NULL;
