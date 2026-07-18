-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "RefType" AS ENUM ('OEM', 'COMPETITOR', 'SUPERSEDES', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('SALE', 'PURCHASE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "manufacturer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_category_id" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "sku_normalized" TEXT NOT NULL,
    "manufacturer_id" INTEGER NOT NULL,
    "manufacturer_part_number" TEXT NOT NULL,
    "mpn_normalized" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" INTEGER NOT NULL,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'piece',
    "mrp" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_cross_reference" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "ref_type" "RefType" NOT NULL,
    "ref_number" TEXT NOT NULL,
    "ref_number_normalized" TEXT NOT NULL,
    "ref_brand" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_cross_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_class" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_make" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_make_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_model" (
    "id" SERIAL NOT NULL,
    "vehicle_make_id" INTEGER NOT NULL,
    "vehicle_class_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_fitment" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "vehicle_class_id" INTEGER NOT NULL,
    "vehicle_make_id" INTEGER,
    "vehicle_model_id" INTEGER,
    "notes" TEXT,

    CONSTRAINT "part_fitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_part" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "supplier_part_number" TEXT,
    "supplier_part_number_normalized" TEXT,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "gstin" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "quantity_on_hand" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(10,3),
    "cost_price" DECIMAL(10,2),
    "selling_price" DECIMAL(10,2),
    "storage_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transaction" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_name_key" ON "manufacturer"("name");

-- CreateIndex
CREATE INDEX "category_parent_category_id_idx" ON "category"("parent_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_sku_key" ON "part"("sku");

-- CreateIndex
CREATE INDEX "part_sku_normalized_idx" ON "part"("sku_normalized");

-- CreateIndex
CREATE INDEX "part_mpn_normalized_idx" ON "part"("mpn_normalized");

-- CreateIndex
CREATE INDEX "part_category_id_idx" ON "part"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_manufacturer_id_manufacturer_part_number_key" ON "part"("manufacturer_id", "manufacturer_part_number");

-- CreateIndex
CREATE INDEX "part_cross_reference_ref_number_normalized_idx" ON "part_cross_reference"("ref_number_normalized");

-- CreateIndex
CREATE INDEX "part_cross_reference_part_id_idx" ON "part_cross_reference"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_class_name_key" ON "vehicle_class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_make_name_key" ON "vehicle_make"("name");

-- CreateIndex
CREATE INDEX "vehicle_model_vehicle_class_id_idx" ON "vehicle_model"("vehicle_class_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_model_vehicle_make_id_vehicle_class_id_name_key" ON "vehicle_model"("vehicle_make_id", "vehicle_class_id", "name");

-- CreateIndex
CREATE INDEX "part_fitment_vehicle_class_id_vehicle_make_id_vehicle_model_idx" ON "part_fitment"("vehicle_class_id", "vehicle_make_id", "vehicle_model_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_fitment_part_id_vehicle_class_id_vehicle_make_id_vehic_key" ON "part_fitment"("part_id", "vehicle_class_id", "vehicle_make_id", "vehicle_model_id");

-- CreateIndex
CREATE INDEX "supplier_part_supplier_part_number_normalized_idx" ON "supplier_part"("supplier_part_number_normalized");

-- CreateIndex
CREATE INDEX "supplier_part_part_id_idx" ON "supplier_part"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_part_supplier_id_part_id_key" ON "supplier_part"("supplier_id", "part_id");

-- CreateIndex
CREATE INDEX "app_user_shop_id_idx" ON "app_user"("shop_id");

-- CreateIndex
CREATE INDEX "inventory_item_part_id_idx" ON "inventory_item"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_shop_id_part_id_key" ON "inventory_item"("shop_id", "part_id");

-- CreateIndex
CREATE INDEX "stock_transaction_shop_id_part_id_created_at_idx" ON "stock_transaction"("shop_id", "part_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_transaction_shop_id_type_created_at_idx" ON "stock_transaction"("shop_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "stock_transaction_user_id_idx" ON "stock_transaction"("user_id");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_cross_reference" ADD CONSTRAINT "part_cross_reference_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_vehicle_make_id_fkey" FOREIGN KEY ("vehicle_make_id") REFERENCES "vehicle_make"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "vehicle_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitment" ADD CONSTRAINT "part_fitment_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitment" ADD CONSTRAINT "part_fitment_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "vehicle_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitment" ADD CONSTRAINT "part_fitment_vehicle_make_id_fkey" FOREIGN KEY ("vehicle_make_id") REFERENCES "vehicle_make"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitment" ADD CONSTRAINT "part_fitment_vehicle_model_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "vehicle_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_part" ADD CONSTRAINT "supplier_part_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_part" ADD CONSTRAINT "supplier_part_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transaction" ADD CONSTRAINT "stock_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes: dedup for the two broader fitment rungs
-- (Postgres treats NULLs as distinct inside the composite @@unique above)
CREATE UNIQUE INDEX "part_fitment_class_uq"
  ON "part_fitment" ("part_id", "vehicle_class_id")
  WHERE "vehicle_make_id" IS NULL AND "vehicle_model_id" IS NULL;

CREATE UNIQUE INDEX "part_fitment_make_uq"
  ON "part_fitment" ("part_id", "vehicle_class_id", "vehicle_make_id")
  WHERE "vehicle_make_id" IS NOT NULL AND "vehicle_model_id" IS NULL;

CREATE UNIQUE INDEX "part_fitment_model_uq"
  ON "part_fitment" ("part_id", "vehicle_class_id", "vehicle_model_id")
  WHERE "vehicle_model_id" IS NOT NULL;
