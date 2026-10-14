CREATE TABLE "invoicecounter" (
  "clinicId" INTEGER NOT NULL,
  "counterDate" DATE NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "invoicecounter_pkey" PRIMARY KEY ("clinicId", "counterDate")
);

INSERT INTO "invoicecounter" ("clinicId", "counterDate", "value")
SELECT "clinicId", "issueDate"::date, MAX(substring("number" from '[0-9]+$')::integer)
FROM "invoice"
WHERE "number" LIKE 'FAC-%' AND "number" ~ '[0-9]+$'
GROUP BY "clinicId", "issueDate"::date;

CREATE INDEX "invoicecounter_counterDate_idx" ON "invoicecounter"("counterDate");
ALTER TABLE "invoicecounter"
  ADD CONSTRAINT "invoicecounter_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
