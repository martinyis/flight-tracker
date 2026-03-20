-- AlterTable
ALTER TABLE "saved_searches" ADD COLUMN     "airline_codes" JSONB NOT NULL DEFAULT '{}';
