-- AlterTable
ALTER TABLE "saved_searches" ADD COLUMN     "next_check_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "saved_searches_active_next_check_at_idx" ON "saved_searches"("active", "next_check_at");
