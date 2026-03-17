-- AlterTable
ALTER TABLE "credit_transactions" ADD COLUMN "apple_transaction_id" TEXT,
ADD COLUMN "apple_product_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "credit_transactions_apple_transaction_id_key" ON "credit_transactions"("apple_transaction_id");
