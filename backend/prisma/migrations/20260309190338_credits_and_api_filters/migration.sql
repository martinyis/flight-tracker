/*
  Warnings:

  - You are about to drop the column `tracking_fee` on the `saved_searches` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_paid` on the `saved_searches` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_paid_at` on the `saved_searches` table. All the data in the column will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_search_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- AlterTable
ALTER TABLE "saved_searches" DROP COLUMN "tracking_fee",
DROP COLUMN "tracking_paid",
DROP COLUMN "tracking_paid_at",
ADD COLUMN     "api_filters" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "search_credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tracking_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tracking_credits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credit_balance" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "payments";

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "search_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_type_idx" ON "credit_transactions"("user_id", "type");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "saved_searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
