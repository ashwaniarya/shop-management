-- CreateTable
CREATE TABLE "user_identity" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_identity_user_id_idx" ON "user_identity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_provider_provider_user_id_key" ON "user_identity"("provider", "provider_user_id");

-- AlterTable
-- Deliberately separate from app_user.email, which any OWNER can set to an arbitrary
-- string through the shop-users endpoints. Only a provider-verified OAuth sign-in writes
-- this column, so it is the only address safe to link an incoming identity on.
ALTER TABLE "app_user" ADD COLUMN "verified_email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "app_user_verified_email_key" ON "app_user"("verified_email");

-- AddForeignKey
ALTER TABLE "user_identity" ADD CONSTRAINT "user_identity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
