-- AlterTable
ALTER TABLE "saved_searches" ADD COLUMN     "combo_count" INTEGER,
ADD COLUMN     "sentinel_pairs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tracking_fee" DOUBLE PRECISION,
ADD COLUMN     "tracking_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tracking_paid_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "search_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_search_id_idx" ON "payments"("search_id");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_created_at_idx" ON "saved_searches"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
