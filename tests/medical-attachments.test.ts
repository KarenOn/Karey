import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MedicalAttachmentCreateSchema } from "../src/lib/validators/attachments";
import { storageRefBelongsToMedicalAttachment } from "../src/lib/storage";

const baseAttachment = {
  fileName: "informe.pdf",
  originalFilename: "informe.pdf",
  fileType: "application/pdf",
  fileSizeBytes: 1024,
  storageRef: "s3://clinic/12/pets/7/attachments/informe.pdf",
};

test("acepta documento general sin visita", () => {
  const result = MedicalAttachmentCreateSchema.safeParse(baseAttachment);
  assert.equal(result.success, true);
});

test("acepta documento asociado a visita y rechaza visitId cero", () => {
  const associated = MedicalAttachmentCreateSchema.safeParse({ ...baseAttachment, visitId: 31 });
  const invalid = MedicalAttachmentCreateSchema.safeParse({ ...baseAttachment, visitId: 0 });

  assert.equal(associated.success, true);
  assert.equal(invalid.success, false);
});

test("rechaza storageRef fuera de clínica o contexto autorizado", () => {
  assert.equal(
    storageRefBelongsToMedicalAttachment(
      "s3://clinic/12/pets/7/attachments/file.pdf",
      { clinicId: 12, petId: 7 },
    ),
    true,
  );
  assert.equal(
    storageRefBelongsToMedicalAttachment(
      "s3://clinic/99/pets/7/attachments/file.pdf",
      { clinicId: 12, petId: 7 },
    ),
    false,
  );
  assert.equal(
    storageRefBelongsToMedicalAttachment(
      "s3://clinic/12/visits/31/attachments/file.pdf",
      { clinicId: 12, petId: 7, visitId: 32 },
    ),
    false,
  );
});

test("mantiene referencia BD si eliminación S3 falla", () => {
  for (const route of [
    "src/app/api/pets/[id]/attachments/[attachmentId]/route.ts",
    "src/app/api/visits/[visitId]/attachments/[attachmentId]/route.ts",
  ]) {
    const source = readFileSync(route, "utf8");
    const databaseDelete = source.indexOf("prisma.medicalAttachment.delete");
    const storageDelete = source.indexOf("deleteStoredFile(attachment.url)");

    assert.ok(databaseDelete >= 0, `${route}: falta eliminación BD`);
    assert.ok(storageDelete > databaseDelete, `${route}: S3 debe ejecutarse después de BD`);
  }
});
