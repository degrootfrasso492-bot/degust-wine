-- Содержимое дескрипторов полностью заменяется списками «Вино» / «Крепкое»,
-- поэтому старые строки удаляются до перестройки таблиц.

DELETE FROM "note_descriptors";
DELETE FROM "wset_descriptors";

-- CreateEnum
CREATE TYPE "WineType" AS ENUM ('WINE', 'SPIRIT');

-- AlterTable: дескриптор больше не различает аромат/вкус, а относится к типу
-- алкоголя (вино / крепкое).
ALTER TABLE "wset_descriptors" DROP COLUMN "type";
ALTER TABLE "wset_descriptors" ADD COLUMN "wine_type" "WineType" NOT NULL;

-- AlterTable: аромат/вкус теперь фиксируется на уровне выбора пользователя.
ALTER TABLE "note_descriptors" ADD COLUMN "type" "DescriptorType" NOT NULL;

-- Индексы
DROP INDEX "note_descriptors_note_id_descriptor_id_key";

CREATE INDEX "wset_descriptors_wine_type_idx" ON "wset_descriptors"("wine_type");
CREATE UNIQUE INDEX "note_descriptors_note_id_descriptor_id_type_key" ON "note_descriptors"("note_id", "descriptor_id", "type");
