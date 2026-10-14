# QA final — Expediente del paciente

Fecha: 2026-09-21  
Alcance: expediente rediseñado y documentos generales/asociados a visitas.

## 1. Escenarios

| Escenario | Resultado | Evidencia / motivo |
|---|---|---|
| Navegación entre Resumen, Historial Clínico, Vacunas y Documentos | REVISIÓN ESTÁTICA | Tabs y contenidos presentes en `src/app/(app)/pets/[id]/page.tsx`. Sin sesión para interacción manual. |
| Cabecera e información del paciente | REVISIÓN ESTÁTICA | Datos clínicos, alertas e información general renderizados desde `pet`. |
| Historial, visitas y adjuntos | REVISIÓN ESTÁTICA | `loadVisits` consulta visitas con adjuntos; `refreshVisits` se pasa a `PatientDocumentsTab`. |
| Registro y edición de vacunas | REVISIÓN ESTÁTICA | Rutas y formularios existentes conservados; no ejecutado en navegador. |
| Informe clínico | REVISIÓN ESTÁTICA | `src/lib/clinical-report.ts` incluye adjuntos únicamente dentro de `visits`; documentos generales no se incluyen. |
| 1. Mascota sin visitas: documento general | NO PROBADO | Requiere sesión, S3 y datos de prueba. |
| 2. Mascota con visitas: documento general | NO PROBADO | Requiere sesión, S3 y datos de prueba. |
| 3. Adjuntar desde visita | NO PROBADO | Requiere sesión, S3 y datos de prueba. |
| 4. Asociar a visita existente | NO PROBADO | Requiere sesión, S3 y datos de prueba. |
| 5. Consultar documentos históricos | REVISIÓN ESTÁTICA | `GET /api/pets/[id]/attachments` consulta por `clinicId` y `petId`. |
| 6. Cambiar tabla/explorador | REVISIÓN ESTÁTICA | `PatientDocumentsTab` comparte `documents`, filtros, búsqueda y ordenamiento. |
| 7. Buscar, filtrar y paginar | REVISIÓN ESTÁTICA | Lógica local en `PatientDocumentsTab`; no interacción manual. |
| 8. Previsualizar PDF/imágenes | REVISIÓN ESTÁTICA | Usa `iframe` para PDF e `img` para imágenes; no se validaron URLs reales. |
| 9. Descargar | REVISIÓN ESTÁTICA | Usa URL firmada `downloadUrl`; no descarga manual ejecutada. |
| 10. Eliminar documento general | NO PROBADO | Requiere sesión y almacenamiento configurado. |
| 11. Eliminar documento de visita | NO PROBADO | Requiere sesión y almacenamiento configurado. |
| 12. Actualización sin recarga | REVISIÓN ESTÁTICA | Subida/eliminación actualizan estado documental y llaman `refreshVisits`. |
| No duplicación y eliminación en todos los puntos | REVISIÓN ESTÁTICA | Existe un único `MedicalAttachment`; no se ejecutó flujo completo. |
| Aislamiento entre clínicas | REVISIÓN ESTÁTICA | Rutas filtran `clinicId`; pertenencia de mascota/visita se valida. |
| Permisos de lectura, subida y eliminación | REVISIÓN ESTÁTICA | Usa `visits.read` y `visits.attachDocuments`. |
| `storageRef` de otra clínica | REVISIÓN ESTÁTICA | `storageRefBelongsToMedicalAttachment` valida prefijo de clínica y contexto. |
| Visita de otra mascota | REVISIÓN ESTÁTICA | POST de paciente exige `clinicId`, `petId` y `visitId` coherentes. |
| Tipo y tamaño de archivo | REVISIÓN ESTÁTICA | Frontend limita tipo/tamaño; schema limita tamaño a 100 MB. |
| URLs firmadas | REVISIÓN ESTÁTICA | `serializeAttachment` genera URLs de lectura mediante S3 presignado. |
| Fallos parciales S3/BD | REVISIÓN ESTÁTICA | Eliminación borra BD antes de S3; puede dejar objeto huérfano, no referencia rota. |
| Responsive y teclado | REVISIÓN ESTÁTICA | Hay clases responsive y dropzone con teclado; sin capturas ni prueba manual. |

## 2. Errores encontrados y corregidos

- Corregido error TypeScript introducido en el resumen: callback de adjuntos sin tipo implícito.
- Eliminados imports no usados de `PatientDocumentsTab`.
- Agregadas pruebas focalizadas en `tests/medical-attachments.test.ts`.

El error reportado previamente (`visitId` igual a `0`) tiene corrección visible en `optionalPositiveId` y en `SignedFileUploader`: valores nulos/vacíos no se envían como `visitId`.

## 3. Pruebas ejecutadas

- `cmd /d /c npm test`: PASS, 14/14. Incluye 4 pruebas focalizadas de adjuntos; no son E2E.
- `cmd /d /c npx tsc --noEmit`: PASS.
- `cmd /d /c npx prisma validate`: PASS.
- `cmd /d /c npx eslint [archivos del expediente y pruebas]`: FAIL por 10 errores `any` preexistentes en `page.tsx`; cambios nuevos no agregan errores lint. Quedan 7 warnings.
- `cmd /d /c npm run lint`: FAIL global por deuda técnica previa: 40 errores y 74 warnings.
- `cmd /d /c npx prisma migrate deploy`: FAIL durante conexión al PostgreSQL remoto; Prisma identifica Neon, pero el motor devuelve `Schema engine error` sin detalle. No se aplicó migración.
- `cmd /d /c npm run build`: FAIL porque ejecuta `prisma migrate deploy` antes de Next.js.
- `cmd /d /c npx next build --webpack`: PASS, compilación aislada completa, incluyendo TypeScript, 72 páginas estáticas y optimización de rutas. Requiere ejecución fuera del sandbox por `EACCES` leyendo `C:\Users\karen`.
- Navegador: NO PROBADO. Navegador local sin sesión autenticada y sin credenciales disponibles.
- S3/API E2E: NO PROBADO. No hay entorno de pruebas aislado disponible; no se usaron datos reales.

## 4. Riesgos pendientes

1. Falta prueba E2E autenticada para subida, asociación, preview, descarga, eliminación y actualización cruzada entre tabs.
2. Eliminación no comparte transacción con S3. La estrategia actual borra BD primero: conserva consistencia visible y, si S3 falla, puede dejar objeto huérfano. Limpieza automática idempotente requeriría un proceso operativo posterior; no se agregó worker, cola ni servicio nuevo.
3. `npm run lint` falla por deuda técnica global y 10 errores `any` previos en `page.tsx`.
4. Build completo queda bloqueado en `prisma migrate deploy` por conectividad/configuración de PostgreSQL remoto; compilación Next aislada sí pasa.
5. No se validaron visualmente referencias desktop, tablet y móvil mediante capturas.

## 5. Funcionalidades aún inexistentes o fuera de alcance

- Medicamentos estructurados con historial independiente.
- Recordatorios directos del paciente.
- Facturación integrada dentro del expediente.
- Carpetas físicas, movimiento de archivos o jerarquías editables.
- Compartir documentos mediante mecanismo seguro.
