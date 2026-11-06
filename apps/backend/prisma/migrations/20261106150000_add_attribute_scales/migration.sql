-- CreateTable
CREATE TABLE "attribute_scales" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label_ru" TEXT NOT NULL,
    "min_val" INTEGER NOT NULL DEFAULT 0,
    "max_val" INTEGER NOT NULL DEFAULT 5,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_presets" (
    "id" TEXT NOT NULL,
    "category" "WineCategory" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "attribute_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_preset_scales" (
    "id" TEXT NOT NULL,
    "preset_id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attribute_preset_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attribute_sets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,

    CONSTRAINT "event_attribute_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attribute_set_scales" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_attribute_set_scales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_scales_slug_key" ON "attribute_scales"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_presets_category_key" ON "attribute_presets"("category");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_preset_scales_preset_id_scale_id_key" ON "attribute_preset_scales"("preset_id", "scale_id");

-- CreateIndex
CREATE INDEX "attribute_preset_scales_scale_id_idx" ON "attribute_preset_scales"("scale_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attribute_sets_event_id_key" ON "event_attribute_sets"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attribute_set_scales_set_id_scale_id_key" ON "event_attribute_set_scales"("set_id", "scale_id");

-- CreateIndex
CREATE INDEX "event_attribute_set_scales_scale_id_idx" ON "event_attribute_set_scales"("scale_id");

-- AddForeignKey
ALTER TABLE "event_attribute_sets" ADD CONSTRAINT "event_attribute_sets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "tasting_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_preset_scales" ADD CONSTRAINT "attribute_preset_scales_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "attribute_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_preset_scales" ADD CONSTRAINT "attribute_preset_scales_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "attribute_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attribute_set_scales" ADD CONSTRAINT "event_attribute_set_scales_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "event_attribute_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attribute_set_scales" ADD CONSTRAINT "event_attribute_set_scales_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "attribute_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Reference data: базовая библиотека шкал и пресеты по типу вина.
-- ID фиксированы (равны slug/категории) для детерминированной ссылки.
-- ============================================================
INSERT INTO "attribute_scales" ("id", "slug", "label_ru", "min_val", "max_val", "sort_order", "created_at", "updated_at") VALUES
  ('sweetness', 'sweetness', 'Сладость', 0, 5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acidity', 'acidity', 'Кислотность', 0, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tannin', 'tannin', 'Танины', 0, 5, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('body', 'body', 'Тело', 0, 5, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('alcohol', 'alcohol', 'Алкоголь', 0, 5, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('complexity', 'complexity', 'Сложность', 0, 5, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "attribute_presets" ("id", "category", "name") VALUES
  ('preset_RED', 'RED', 'Красное вино'),
  ('preset_WHITE', 'WHITE', 'Белое вино'),
  ('preset_ROSE', 'ROSE', 'Розовое вино'),
  ('preset_SPARKLING', 'SPARKLING', 'Игристое вино'),
  ('preset_FORTIFIED', 'FORTIFIED', 'Креплёное вино'),
  ('preset_SWEET', 'SWEET', 'Сладкое вино');

INSERT INTO "attribute_preset_scales" ("id", "preset_id", "scale_id", "sort_order") VALUES
  ('ps_RED_sweetness', 'preset_RED', 'sweetness', 0),
  ('ps_RED_acidity', 'preset_RED', 'acidity', 1),
  ('ps_RED_tannin', 'preset_RED', 'tannin', 2),
  ('ps_RED_body', 'preset_RED', 'body', 3),
  ('ps_RED_alcohol', 'preset_RED', 'alcohol', 4),
  ('ps_RED_complexity', 'preset_RED', 'complexity', 5),
  ('ps_WHITE_sweetness', 'preset_WHITE', 'sweetness', 0),
  ('ps_WHITE_acidity', 'preset_WHITE', 'acidity', 1),
  ('ps_WHITE_body', 'preset_WHITE', 'body', 2),
  ('ps_WHITE_alcohol', 'preset_WHITE', 'alcohol', 3),
  ('ps_WHITE_complexity', 'preset_WHITE', 'complexity', 4),
  ('ps_ROSE_sweetness', 'preset_ROSE', 'sweetness', 0),
  ('ps_ROSE_acidity', 'preset_ROSE', 'acidity', 1),
  ('ps_ROSE_body', 'preset_ROSE', 'body', 2),
  ('ps_ROSE_alcohol', 'preset_ROSE', 'alcohol', 3),
  ('ps_ROSE_complexity', 'preset_ROSE', 'complexity', 4),
  ('ps_SPARKLING_sweetness', 'preset_SPARKLING', 'sweetness', 0),
  ('ps_SPARKLING_acidity', 'preset_SPARKLING', 'acidity', 1),
  ('ps_SPARKLING_body', 'preset_SPARKLING', 'body', 2),
  ('ps_SPARKLING_alcohol', 'preset_SPARKLING', 'alcohol', 3),
  ('ps_SPARKLING_complexity', 'preset_SPARKLING', 'complexity', 4),
  ('ps_FORTIFIED_sweetness', 'preset_FORTIFIED', 'sweetness', 0),
  ('ps_FORTIFIED_acidity', 'preset_FORTIFIED', 'acidity', 1),
  ('ps_FORTIFIED_body', 'preset_FORTIFIED', 'body', 2),
  ('ps_FORTIFIED_alcohol', 'preset_FORTIFIED', 'alcohol', 3),
  ('ps_FORTIFIED_complexity', 'preset_FORTIFIED', 'complexity', 4),
  ('ps_SWEET_sweetness', 'preset_SWEET', 'sweetness', 0),
  ('ps_SWEET_acidity', 'preset_SWEET', 'acidity', 1),
  ('ps_SWEET_body', 'preset_SWEET', 'body', 2),
  ('ps_SWEET_alcohol', 'preset_SWEET', 'alcohol', 3),
  ('ps_SWEET_complexity', 'preset_SWEET', 'complexity', 4);

-- ============================================================
-- Backfill: переносим старые per-wine шкалы в событийные наборы.
-- Старые имена равны slug (sweetness/acidity/tannin/body/alcohol),
-- поэтому mapпинг 1:1 на созданную выше библиотеку шкал.
-- ============================================================
INSERT INTO "event_attribute_sets" ("id", "event_id")
SELECT 'set_' || w."event_id", w."event_id"
FROM "wines" w
JOIN "wine_attribute_configs" c ON c."wine_id" = w."id"
GROUP BY w."event_id";

INSERT INTO "event_attribute_set_scales" ("id", "set_id", "scale_id", "sort_order")
SELECT
  'setscale_' || w."event_id" || '_' || c."name",
  'set_' || w."event_id",
  c."name",
  CASE c."name"
    WHEN 'sweetness' THEN 0
    WHEN 'acidity' THEN 1
    WHEN 'tannin' THEN 2
    WHEN 'body' THEN 3
    WHEN 'alcohol' THEN 4
    WHEN 'complexity' THEN 5
    ELSE 99
  END
FROM "wines" w
JOIN "wine_attribute_configs" c ON c."wine_id" = w."id"
GROUP BY w."event_id", c."name";

-- DropTable
DROP TABLE "wine_attribute_configs";
