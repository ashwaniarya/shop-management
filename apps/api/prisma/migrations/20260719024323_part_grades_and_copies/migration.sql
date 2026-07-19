-- AlterTable
ALTER TABLE "part" ADD COLUMN     "copy_of_part_id" INTEGER,
ADD COLUMN     "grade_id" INTEGER;

-- CreateTable
CREATE TABLE "part_grade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_grade_name_key" ON "part_grade"("name");

-- CreateIndex
CREATE INDEX "part_grade_id_idx" ON "part"("grade_id");

-- CreateIndex
CREATE INDEX "part_copy_of_part_id_idx" ON "part"("copy_of_part_id");

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "part_grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_copy_of_part_id_fkey" FOREIGN KEY ("copy_of_part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A part can never be a copy of itself: belt-and-braces under the service-layer
-- flat-family validation (which direct writes, e.g. seed, bypass).
ALTER TABLE "part"
  ADD CONSTRAINT "part_copy_of_not_self"
  CHECK ("copy_of_part_id" IS NULL OR "copy_of_part_id" <> "id");
