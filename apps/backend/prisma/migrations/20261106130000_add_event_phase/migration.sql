-- AlterTable
ALTER TABLE "tasting_events" ADD COLUMN "is_manually_open" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow';
