ALTER TABLE "medicalattachment"
  ADD COLUMN "petId" INTEGER;

UPDATE "medicalattachment" AS attachment
SET "petId" = visit."petId"
FROM "clinicalvisit" AS visit
WHERE attachment."visitId" = visit."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "medicalattachment" WHERE "petId" IS NULL) THEN
    RAISE EXCEPTION 'No se pudo completar petId: existen adjuntos sin visita o con visita inexistente';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "medicalattachment" AS attachment
    JOIN "pet" AS pet ON pet."id" = attachment."petId"
    WHERE pet."clinicId" <> attachment."clinicId"
  ) THEN
    RAISE EXCEPTION 'No se pudo completar petId: existen adjuntos con paciente de otra clínica';
  END IF;
END $$;

ALTER TABLE "medicalattachment"
  ALTER COLUMN "petId" SET NOT NULL;

ALTER TABLE "medicalattachment"
  ADD CONSTRAINT "medicalattachment_petId_fkey"
  FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medicalattachment"
  ALTER COLUMN "visitId" DROP NOT NULL;

CREATE INDEX "medicalattachment_petId_createdAt_idx"
  ON "medicalattachment"("petId", "createdAt");
