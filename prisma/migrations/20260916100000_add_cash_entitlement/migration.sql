ALTER TABLE "clinic" ADD COLUMN "cashEntitled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "clinic"
SET "cashEntitled" = "cashEnabled";
