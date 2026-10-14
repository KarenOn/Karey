# Auditoría técnica y funcional — Expediente del paciente

Fecha: 2026-09-21  
Alcance: inspección estática. No se modificó código de aplicación.

## 1. Mapa de archivos relevantes

| Área | Archivos |
|---|---|
| Detalle del paciente | `src/app/(app)/pets/[id]/page.tsx` |
| APIs de paciente | `src/app/api/pets/[id]/route.ts`, `src/app/api/pets/[id]/visits/route.ts`, `src/app/api/pets/[id]/vaccinations/route.ts` |
| Visita clínica | `src/app/api/visits/[visitId]/route.ts`, `src/lib/validators/visits.ts`, `src/components/shared/ClinicalVisitForm.tsx` |
| Adjuntos | `src/app/api/visits/[visitId]/attachments/route.ts`, `src/app/api/visits/[visitId]/attachments/[attachmentId]/route.ts`, alias `attatchments/` |
| Subida/almacenamiento | `src/components/shared/SignedFileUploader.tsx`, `src/components/shared/AttachmentUploadModal.tsx`, `src/components/shared/DocumentAttachment.tsx`, `src/app/api/uploads/sign/route.ts`, `src/app/api/uploads/object/route.ts`, `src/lib/storage.ts` |
| Persistencia | `prisma/schema.prisma`: `Pet`, `ClinicalVisit`, `MedicalAttachment`, `VaccinationRecord`, `Invoice`, `ClinicalReportJob` |
| Informes | `src/components/shared/ClinicalReportDialog.tsx`, `src/app/api/clinical-reports/route.ts`, `src/app/api/clinical-reports/pdf/route.ts`, `src/lib/clinical-report.ts`, `src/lib/clinical-report-jobs.ts` |
| Permisos | `src/lib/server-auth.ts`, `src/lib/permissions.ts`, `src/components/layout/current-user-context.tsx` |
| Reutilizables | `src/components/ui/tabs.tsx`, `button.tsx`, `badge.tsx`, `src/components/shared/{Modal,ModalDelete,DataTablePagination,LoadingSkeleton,StatusBadge,FormField,AppAlert}.tsx` |

## 2. Expediente actual y comparación funcional

Ruta principal: `/pets/[id]`, implementada como componente cliente. Carga paciente, catálogo de vacunas, veterinarios, visitas paginadas y vacunas paginadas.

| Elemento auditado | Estado | Evidencia / límite |
|---|---|---|
| Cabecera del paciente | EXISTE | Nombre, especie, raza, volver, editar. `page.tsx` |
| Tarjeta de información | EXISTE | Edad, peso, sexo, color, microchip, notas y propietario. |
| Alertas clínicas | EXISTE | Alergias, condiciones crónicas y advertencias; son texto persistido, no estado calculado. |
| Antecedentes y medicamentos actuales | EXISTE | Campos `Pet.clinicalHistory` y `Pet.currentMedications`. No hay historial estructurado de medicamentos. |
| Tab Historial clínico | EXISTE | Visitas, filtros por fecha, paginación, detalle, edición y adjuntos. |
| Tab Vacunas | EXISTE | Registro, fecha aplicada, próxima dosis, lote, notas, edición y paginación. |
| Estado de salud | PARCIAL | Hay datos clínicos permanentes y signos vitales por visita; no existe un campo/estado global calculado. |
| Próxima visita/control | EXISTE | `ClinicalVisit.nextReviewAt`; recordatorios clínicos en `src/lib/reminders.ts`. No hay tarjeta resumida dedicada en expediente. |
| Estado de vacunación | PARCIAL | Hay `nextDueAt` y recordatorios próximos/vencidos. No hay estado persistido global ni badge calculado en detalle. |
| Actividad reciente | PARCIAL | Visitas y vacunas ordenadas por fecha cubren parte del caso; no existe feed unificado. |
| Medicamentos actuales | EXISTE | Texto en `Pet`; sin dosis, fechas, estado, prescriptor ni histórico. |
| Medicamentos históricos | NO EXISTE | No hay modelo, API ni tab de medicamentos. |
| Recordatorios | PARCIAL | Motor y notificaciones existen; expediente no muestra lista propia por paciente. |
| Facturas del paciente | PARCIAL | `Invoice.petId` existe y el módulo de facturas existe; no hay consulta/API/tab dentro de expediente. |
| Documentos por visita | EXISTE | Subida, preview, URL de lectura/descarga y eliminación. |
| Documentos generales del paciente | NO EXISTE | `MedicalAttachment.visitId` es obligatorio; no hay relación directa con `Pet`. |
| Generación de informe clínico | EXISTE | Informe HTML/PDF con visitas, vacunas y adjuntos; permisos de historial clínico. |
| Formularios y modales | EXISTE | Editar paciente, nueva/edición de visita, vacuna, detalle de visita, subida y confirmación de borrado. |
| Tabs adicionales de referencia | NO EXISTE | La página solo expone `history` y `vaccines`; no asumir que tabs visuales adicionales tienen backend. |

## 3. Diagnóstico del flujo documental

Flujo actual:

`SignedFileUploader` selecciona archivo y obtiene URL firmada en `POST /api/uploads/sign` → PUT directo a S3 → `POST /api/visits/{visitId}/attachments` guarda metadata → GET de visitas serializa adjuntos → `resolveStoredFileUrl` crea URLs S3 firmadas → `DocumentAttachment` previsualiza/descarga → DELETE borra objeto S3 y registro.

- Modelo: `MedicalAttachment { clinicId, visitId, fileName, displayName, originalFilename, fileType, fileSizeBytes, url }`.
- Relación: clínica 1:N adjuntos; visita 1:N adjuntos; visita pertenece a paciente mediante `ClinicalVisit.petId`.
- Visita obligatoria: sí. Prisma exige `visitId Int`; APIs POST/GET/DELETE validan visita.
- Proveedor: S3 compatible, referencia interna `s3://...`.
- Rutas: `clinic/{clinicId}/visits/{visitId}/attachments/{uuid}-archivo`; cargas sin visita ya caen en `visits/pending`, pero no pueden persistirse como adjunto clínico.
- URLs: nunca se expone el objeto S3 permanente; lectura/descarga usa presigned GET de 15 minutos. Subida usa presigned PUT de 5 minutos.
- Permisos: `visits.attachDocuments` para firmar, crear, borrar; `visits.read` para consultar. `clinicId` se obtiene de membresía activa y cada visita se valida dentro de esa clínica.
- Eliminación: primero `deleteStoredFile(url)`, luego `medicalAttachment.delete`. Si falla S3, el registro permanece.
- Validación: `MedicalAttachmentCreateSchema` valida metadata y exige `storageRef` o `url`; no se observa verificación de que `storageRef` pertenezca a la clínica en POST de attachment, aunque el endpoint de borrado temporal sí usa `storageRefBelongsToClinic`.
- Código que asume `visitId`: Prisma/modelo, rutas bajo `/visits/{visitId}`, `handleCreateAttachment`, estado `attachModal.visitId`, uploader y `buildStorageKey`.

### Adaptación mínima y segura

1. Hacer `MedicalAttachment.visitId` nullable.
2. Añadir `petId Int` obligatorio para todo documento de paciente, con FK a `Pet`; conservar `clinicId`.
3. Mantener `visitId` opcional. Documentos actuales conservan `visitId` y no mueven ni duplican objetos S3.
4. Crear endpoints de paciente para listar/crear/eliminar documentos generales, reutilizando validator, uploader, serialización y autorización.
5. Para documentos generales usar clave nueva `clinic/{clinicId}/pets/{petId}/attachments`; no reutilizar `visits/pending` como almacenamiento permanente.
6. En cada escritura validar conjuntamente `clinicId`, `petId` y, cuando exista, `visitId` perteneciente al mismo paciente y clínica.
7. Mantener rutas de visita por compatibilidad. Actualizar tipos/serializadores para aceptar `visitId: null`.
8. Añadir migración con backfill de `petId` desde `ClinicalVisit.petId`; bloquear filas huérfanas antes de imponer `petId NOT NULL`.

## 4. Riesgos críticos

- **Integridad de tenant:** POST de adjunto acepta `storageRef` sin comprobar explícitamente que empiece por `clinic/{clinicId}/`; debe corregirse antes de ampliar el flujo.
- **Borrado no transaccional:** si S3 borra y Prisma falla, queda registro huérfano; si S3 falla, queda objeto y registro. Requiere estrategia idempotente/reintento.
- **Migración relacional:** hacer nullable `visitId` sin añadir `petId` deja documentos generales sin pertenencia segura.
- **Backfill:** todo adjunto existente debe derivar `petId` desde su visita; validar ausencia de visitas eliminadas antes de la migración.
- **Duplicación funcional:** crear otro uploader, modal o serializador rompería consistencia; reutilizar los componentes actuales.
- **Permisos UI/API:** la página muestra “Visita” y “Vacuna” sin ocultamiento uniforme por permiso; la API sí protege. Revisar antes del rediseño.
- **Datos no inventados:** salud, medicamentos históricos, actividad, recordatorios y facturas requieren datos/API existentes; no deben derivarse visualmente sin contrato backend.
- **Tipado:** `PetDTO`, `VisitDTO`, `VaccDTO` y `AttachmentDTO` son `any`; el rediseño puede ocultar incompatibilidades si no se tipan en una fase posterior.

## 5. Componentes reutilizables

- UI base: `src/components/ui/button.tsx`, `badge.tsx`, `tabs.tsx`, `input.tsx`, `label.tsx`.
- Contenedores y feedback: `Modal.tsx`, `ModalDelete.tsx`, `AppAlert.tsx`, `LoadingSkeleton.tsx`, `CenteredLoader.tsx`, `DataTableSkeleton.tsx`, `DataTablePagination.tsx`.
- Datos: `Datatable.tsx`, `SearchInput.tsx`, `DateFilter.tsx`, `StatusBadge.tsx`, `InfoRow.tsx`.
- Formularios: `FormField.tsx`, `ClinicalVisitForm.tsx`, `VaccinationForm.tsx`, `FormSkeleton.tsx`.
- Archivos: `SignedFileUploader.tsx`, `AttachmentUploadModal.tsx`, `DocumentAttachment.tsx`.
- Informes: `ClinicalReportDialog.tsx`.
- Fuentes: verificar configuración global existente antes de cambios; el expediente usa clases `app-heading` y tokens de la aplicación. Mantener Oswald para títulos e Inter para contenido si la configuración actual las define.

## 6. Plan mínimo por fases

1. **Contrato y migración:** añadir `petId`, nullable `visitId`, backfill y constraints; probar registros existentes.
2. **Backend documental:** endpoints de documentos por paciente, validación de pertenencia, `storageRef` por clínica, serialización y borrado idempotente.
3. **UI documental:** reutilizar uploader/modal/preview; agregar sección de documentos generales sin tocar documentos de visitas.
4. **Expediente:** conservar tabs actuales; añadir solo tabs con API real: facturas, documentos generales y recordatorios después de sus consultas específicas.
5. **Resumen clínico:** mostrar solo campos reales: alertas, última visita, próximo control y próxima vacuna; no calcular “estado de salud” sin regla de negocio.
6. **QA visual:** comparar desktop/móvil con las referencias, validar densidad, accesibilidad, estados vacíos y permisos.

## 7. Pruebas necesarias

- GET/PUT paciente respeta `clinicId` y permisos.
- Crear/editar visita valida paciente, clínica, cita/turno y permisos.
- Crear vacuna conserva `petId`, `visitId` opcional y permisos.
- Subida: MIME/tamaño/metadata, URL firmada expirada, storage ref de otra clínica rechazado.
- Documento general: `petId` válido, `visitId = null`, visita de otro paciente rechazada.
- Documento de visita existente: lectura, descarga y eliminación siguen funcionando sin mover S3.
- Borrado: objeto y registro; reintento seguro ante fallo parcial.
- Backfill de `petId`, constraints, rollback y datos huérfanos.
- Informe clínico mantiene visitas, vacunas y adjuntos existentes.
- Permisos por rol para leer/editar paciente, historial, vacunas, adjuntos, informes y facturas.
- UI: tabs, paginación, filtros, modales, preview, estados vacíos, teclado, focus-visible y responsive.
- Validación mínima posterior: lint, typecheck, tests y build; no se ejecutó cambio de código en esta auditoría.
