-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "WineCategory" AS ENUM ('RED', 'WHITE', 'ROSE', 'SPARKLING', 'FORTIFIED', 'SWEET');

-- CreateEnum
CREATE TYPE "DescriptorType" AS ENUM ('AROMA', 'FLAVOUR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "vk_id" TEXT,
    "yandex_id" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "name" TEXT,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasting_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_blind" BOOLEAN NOT NULL DEFAULT false,
    "qr_slug" TEXT NOT NULL,
    "access_pin" TEXT,
    "cover_url" TEXT,
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasting_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wines" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "blind_label" TEXT,
    "category" "WineCategory" NOT NULL,
    "abv" DOUBLE PRECISION,
    "composition" TEXT,
    "producer" TEXT,
    "country" TEXT,
    "region" TEXT,
    "aging" TEXT,
    "methods" TEXT,
    "description" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wine_attribute_configs" (
    "id" TEXT NOT NULL,
    "wine_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_val" INTEGER NOT NULL DEFAULT 0,
    "max_val" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "wine_attribute_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wset_descriptors" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "category" TEXT NOT NULL,
    "label_ru" TEXT NOT NULL,
    "label_en" TEXT,
    "type" "DescriptorType" NOT NULL,
    "level" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wset_descriptors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasting_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wine_id" TEXT NOT NULL,
    "is_liked" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasting_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_score_values" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "attribute_name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "note_score_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_descriptors" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "descriptor_id" TEXT NOT NULL,

    CONSTRAINT "note_descriptors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_vk_id_key" ON "users"("vk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_yandex_id_key" ON "users"("yandex_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasting_events_qr_slug_key" ON "tasting_events"("qr_slug");

-- CreateIndex
CREATE INDEX "tasting_events_creator_id_idx" ON "tasting_events"("creator_id");

-- CreateIndex
CREATE INDEX "wines_event_id_idx" ON "wines"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "wines_event_id_order_index_key" ON "wines"("event_id", "order_index");

-- CreateIndex
CREATE INDEX "wine_attribute_configs_wine_id_idx" ON "wine_attribute_configs"("wine_id");

-- CreateIndex
CREATE UNIQUE INDEX "wine_attribute_configs_wine_id_name_key" ON "wine_attribute_configs"("wine_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "wset_descriptors_slug_key" ON "wset_descriptors"("slug");

-- CreateIndex
CREATE INDEX "wset_descriptors_parent_id_type_idx" ON "wset_descriptors"("parent_id", "type");

-- CreateIndex
CREATE INDEX "wset_descriptors_parent_id_idx" ON "wset_descriptors"("parent_id");

-- CreateIndex
CREATE INDEX "tasting_notes_user_id_idx" ON "tasting_notes"("user_id");

-- CreateIndex
CREATE INDEX "tasting_notes_wine_id_idx" ON "tasting_notes"("wine_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasting_notes_user_id_wine_id_key" ON "tasting_notes"("user_id", "wine_id");

-- CreateIndex
CREATE INDEX "note_score_values_note_id_attribute_name_idx" ON "note_score_values"("note_id", "attribute_name");

-- CreateIndex
CREATE INDEX "note_score_values_note_id_idx" ON "note_score_values"("note_id");

-- CreateIndex
CREATE UNIQUE INDEX "note_score_values_note_id_attribute_name_key" ON "note_score_values"("note_id", "attribute_name");

-- CreateIndex
CREATE INDEX "note_descriptors_note_id_idx" ON "note_descriptors"("note_id");

-- CreateIndex
CREATE INDEX "note_descriptors_descriptor_id_idx" ON "note_descriptors"("descriptor_id");

-- CreateIndex
CREATE UNIQUE INDEX "note_descriptors_note_id_descriptor_id_key" ON "note_descriptors"("note_id", "descriptor_id");

-- AddForeignKey
ALTER TABLE "tasting_events" ADD CONSTRAINT "tasting_events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wines" ADD CONSTRAINT "wines_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "tasting_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wine_attribute_configs" ADD CONSTRAINT "wine_attribute_configs_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wset_descriptors" ADD CONSTRAINT "wset_descriptors_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "wset_descriptors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_notes" ADD CONSTRAINT "tasting_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_notes" ADD CONSTRAINT "tasting_notes_wine_id_fkey" FOREIGN KEY ("wine_id") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_score_values" ADD CONSTRAINT "note_score_values_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "tasting_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_descriptors" ADD CONSTRAINT "note_descriptors_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "tasting_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_descriptors" ADD CONSTRAINT "note_descriptors_descriptor_id_fkey" FOREIGN KEY ("descriptor_id") REFERENCES "wset_descriptors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
