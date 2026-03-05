-- AlterTable
ALTER TABLE "saved_searches" ADD COLUMN     "price_history" JSONB NOT NULL DEFAULT '[]';
