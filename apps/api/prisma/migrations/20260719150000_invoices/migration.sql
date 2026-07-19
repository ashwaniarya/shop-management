-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "notes" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "stock_transaction_id" INTEGER NOT NULL,
    "part_sku" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequence" (
    "shop_id" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequence_pkey" PRIMARY KEY ("shop_id")
);

-- CreateIndex
CREATE INDEX "invoice_shop_id_created_at_idx" ON "invoice"("shop_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_shop_id_invoice_number_key" ON "invoice"("shop_id", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_stock_transaction_id_key" ON "invoice_line"("stock_transaction_id");

-- CreateIndex
CREATE INDEX "invoice_line_invoice_id_idx" ON "invoice_line"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_line_part_id_idx" ON "invoice_line"("part_id");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_stock_transaction_id_fkey" FOREIGN KEY ("stock_transaction_id") REFERENCES "stock_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequence" ADD CONSTRAINT "invoice_sequence_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

