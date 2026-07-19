-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "app_user_username_key" ON "app_user"("username");
