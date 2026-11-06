-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WineCategory" ADD VALUE 'VODKA';
ALTER TYPE "WineCategory" ADD VALUE 'DISTILLATE';
ALTER TYPE "WineCategory" ADD VALUE 'COGNAC';
ALTER TYPE "WineCategory" ADD VALUE 'WHISKY';
ALTER TYPE "WineCategory" ADD VALUE 'TEQUILA';
ALTER TYPE "WineCategory" ADD VALUE 'GIN';
ALTER TYPE "WineCategory" ADD VALUE 'LIQUEUR';
