# Auditoría técnica y funcional: cuatro capacidades de Karey Vet

Fecha: 2026-10-14  
Alcance: inspección estática del repositorio, esquema Prisma, rutas API, módulos de dominio y pruebas existentes.  
Cambios de producto: ninguno.

## 1. Resumen ejecutivo

Karey Vet es una aplicación Next.js 16 con React 19, TypeScript, Prisma 7 y PostgreSQL. Usa Better Auth, membresías por clínica y permisos por módulo. El aislamiento por `clinicId` está presente en el núcleo de la aplicación, pero no existe una API pública ni controles de integración externos.

| Capacidad | Estado general | Conclusión |
|---|---|---|
| Próxima cita disponible | PARCIAL | Existe duración, horario, asignación y rechazo de solapamientos al guardar. No existe motor que busque y devuelva alternativas reutilizables. |
| Resultados clínicos con validación humana | PARCIAL | Existe historial clínico, archivos, generación de informes y trabajos asíncronos. No existe flujo de resultado externo pendiente, revisión, rechazo, corrección ni aprobación clínica. |
| Inventario y reposición por demanda | PARCIAL | Existe stock, movimientos, ventas, lotes, vencimiento, costo y FEFO. No existen proveedores, órdenes de compra, recepciones, lead time, histórico de existencias ni cálculo de cobertura/agotamiento. |
| Seguridad de futuras integraciones API | PARCIAL | Hay autenticación de sesión, pertenencia a clínica, permisos, validación Zod y selección mínima en varias rutas internas. Faltan API keys, scopes externos, rate limiting, auditoría de accesos y límites de lote normalizados. |

No se asignan porcentajes. La evaluación se basa en requisitos individuales y evidencia directa; una base de datos o componente relacionado no cuenta como implementación completa.

## 2. Arquitectura encontrada

- UI y rutas: `src/app`, App Router de Next.js.
- API: Route Handlers bajo `src/app/api`.
- Dominio: `src/lib`, con helpers de citas, inventario, archivos, autenticación y permisos.
- Datos: Prisma/PostgreSQL; esquema en `prisma/schema.prisma`; migraciones PostgreSQL en `prisma/migrations`.
- Autenticación: Better Auth. `src/lib/server-auth.ts` deriva la clínica desde la sesión y la membresía activa.
- Autorización: permisos almacenados en roles y evaluados por `requireClinicPermission`/`requireClinicPermissions`.
- Almacenamiento: referencias de archivos y S3 mediante `src/lib/storage.ts`, con validación de pertenencia para archivos médicos.
- Asíncrono: `ClinicalReportJob` y `src/lib/clinical-report-jobs.ts` para informes clínicos; notificaciones en cola para recordatorios.
- Pruebas: 16 pruebas unitarias ejecutadas correctamente con el runner de `tsx`. No se encontraron pruebas de integración de endpoints ni pruebas end-to-end para estas cuatro capacidades.

## 3. Evidencia transversal

### Aislamiento y autorización

- `src/lib/server-auth.ts:11-17`: exige sesión autenticada.
- `src/lib/server-auth.ts:37-75`: obtiene membresía activa, rechaza usuario bloqueado o clínica inactiva, deriva `clinicId` desde la membresía y verifica permisos.
- `prisma/schema.prisma:425-443`: membresía única por `(clinicId, userId)` con rol e indicador de actividad.
- `prisma/schema.prisma:452-523`: clientes y pacientes incluyen `clinicId`; paciente también conserva `clientId`.
- `src/lib/permissions.ts:17-35,134-147`: catálogo de permisos y evaluación del ACL.

Esto evidencia una base sólida para uso interno autenticado. No prueba seguridad de una API pública, porque no se encontraron API keys, scopes de integración, rate limiting ni auditoría de acceso.

### Pruebas ejecutadas

Comando equivalente ejecutado directamente con Node/tsx, porque el wrapper local de `npm` falla al resolver `caveman.CMD`:

```text
TAP version 13
1..16
# tests 16
# pass 16
# fail 0
```

Las pruebas cubren FEFO, cálculos de facturación/caja, validación de adjuntos, recordatorios y estadísticas. No prueban los flujos completos auditados.

## 4. Capacidad 1: próxima cita disponible

### Arquitectura existente

- `prisma/schema.prisma:409-422`: horario semanal de clínica (`open`, `close`, `closed`).
- `prisma/schema.prisma:532-575`: cita con clínica, paciente, servicio, rango temporal, estado y veterinario opcional.
- `prisma/schema.prisma:634-656`: servicio con `durationMins`.
- `src/lib/appointment-helpers.ts:15-33`: calcula fin usando `endAt` o duración del servicio; usa 30 minutos por defecto.
- `src/lib/appointment-helpers.ts:140-172`: detecta disponibilidad de veterinario contra citas activas.
- `src/app/api/appointments/route.ts:91-142`: busca solapamientos durante creación; distingue veterinario asignado y cita sin veterinario.
- `src/app/api/appointments/route.ts:144-181`: valida horario de clínica.
- `src/app/api/appointments/route.ts:184-248`: valida pertenencia de paciente, cliente y veterinario a la clínica.
- `src/app/api/appointments/route.ts:351-376`: aplica validación de horario y solapamiento antes de crear.
- `src/app/api/appointments/[id]/route.ts:82-165,319-340`: repite lógica equivalente para edición/reprogramación.
- `src/app/(app)/appointments/page.tsx:201-212`: construye slots visuales de 30 minutos para la agenda.

### Matriz de requisitos

| Requisito | Estado | Evidencia y razón |
|---|---|---|
| Encontrar automáticamente primeros horarios | NO EXISTE | No hay endpoint, servicio ni función de búsqueda de slots. Solo se valida un horario ya elegido. |
| Considerar duración del servicio | PARCIAL | `appointment-helpers.ts:15-33` y `schema.prisma:640`; se usa al validar solapamientos, no para generar alternativas. |
| Considerar horarios laborales | PARCIAL | `appointments/route.ts:144-181` valida clínica abierta; no busca varios días/intervalos. |
| Considerar veterinarios disponibles | PARCIAL | Se valida veterinario asignado y solapamiento; no hay búsqueda de disponibilidad por conjunto de veterinarios. |
| Evitar conflictos por veterinario | PARCIAL | El backend rechaza solapamiento para el veterinario asignado; no se observa restricción única ni protección integral contra carreras concurrentes. |
| Buscar con veterinario específico | NO EXISTE | `vetId` filtra/lista y valida una cita; no existe búsqueda de slots para un veterinario. |
| Buscar con cualquier veterinario | NO EXISTE | No hay algoritmo que pruebe veterinarios elegibles y devuelva candidatos. |
| Mostrar 3 a 5 alternativas | NO EXISTE | No existe contrato ni UI de alternativas. |
| Revalidar disponibilidad en backend | PARCIAL | La creación y edición revalidan el horario y solapamiento; no existe flujo de propuesta de slot seguido de reserva atómica específica. |
| Reutilizar un motor desde agenda, creación y reprogramación | NO EXISTE | Hay helpers compartidos para fin/solapamiento, pero no motor de búsqueda. La creación y edición contienen validaciones locales parecidas. |

### Reutilizable

`getServiceDuration`, `getAppointmentEnd`, `rangesOverlap`, `isAppointmentActive` y `ClinicSchedule` son una base adecuada. Debe preservarse la validación server-side actual al crear o reprogramar.

### Brechas y riesgos

| Brecha | Evidencia | Impacto | Prioridad | Complejidad | Módulos probables | Criterio de aceptación |
|---|---|---|---|---|---|---|
| Falta motor de slots | No hay símbolo/endpoint de disponibilidad en `src/app`/`src/lib`. | Recepción calcula horarios manualmente; riesgo de inconsistencia. | P1 | L | `src/lib`, APIs de appointments, agenda | Dado servicio, fecha, duración y veterinario opcional, devuelve 3-5 slots ordenados y solo dentro de horario, sin conflictos. |
| Validaciones duplicadas | `appointments/route.ts` y `[id]/route.ts` contienen lógica paralela. | Correcciones futuras pueden divergir. | P1 | M | APIs de appointments, helper compartido | Creación y reprogramación usan la misma función de búsqueda/validación. |
| Carrera al reservar | Solapamiento se comprueba antes de escribir; no hay evidencia de bloqueo o restricción temporal. | Dos solicitudes concurrentes pueden aceptar el mismo slot. | P1 | L | API, transacción, migración PostgreSQL | Prueba concurrente demuestra que solo una reserva conflictiva tiene éxito. |

## 5. Capacidad 2: resultados clínicos con validación humana

### Arquitectura existente

- `prisma/schema.prisma:976-1017`: visita clínica con diagnóstico, tratamiento, notas, veterinario y vínculo con paciente/cliente/clínica.
- `prisma/schema.prisma:1019-1041`: adjunto médico con archivo original, tipo, tamaño, URL y visita opcional.
- `src/app/api/pets/[id]/attachments/route.ts:27-49`: valida paciente, visita, clínica y referencia de almacenamiento antes de crear adjunto.
- `tests/medical-attachments.test.ts:15-63`: prueba adjuntos generales, vínculo de visita, pertenencia de storage y orden seguro de eliminación.
- `prisma/schema.prisma:1141-1165`: `ClinicalReportJob` representa generación de informes internos, con estado, reintentos y `storageRef`.
- `src/app/api/clinical-reports/jobs/route.ts:19-64`: crea trabajos idempotentes para informes derivados del historial.
- `src/lib/clinical-report-jobs.ts:28-73`: procesa trabajos, recupera trabajos interrumpidos y genera notificaciones.
- `src/lib/permissions.ts:27-29,252-262`: permisos de lectura/creación/edición de visitas y adjuntos.

### Matriz de requisitos

| Requisito | Estado | Evidencia y razón |
|---|---|---|
| Recibir resultados externos | NO EXISTE | No hay endpoint de ingestión externa ni modelo de resultado de laboratorio. |
| Conservar archivos originales | PARCIAL | `MedicalAttachment` conserva nombre original, tipo, tamaño y URL; no define inmutabilidad, checksum, origen externo o retención. |
| Asociar clínica, paciente y visita | PARCIAL | `MedicalAttachment` guarda clínica, paciente y visita opcional; no existe entidad específica de resultado. |
| Mantener resultados pendientes de revisión | NO EXISTE | `PENDING` corresponde a trabajos de informes, no a resultados clínicos recibidos. |
| Confirmar o rechazar por veterinario autorizado | NO EXISTE | No hay estado de revisión, actor revisor, permiso específico ni endpoint de decisión clínica. |
| Impedir uso de no confirmados como diagnóstico definitivo | NO VERIFICADO | El diagnóstico vive directamente en `ClinicalVisit`; no existe vínculo de estado de revisión que permita probar esta regla. |
| Auditar revisiones y correcciones | NO EXISTE | No se encontró modelo de auditoría clínica ni historial de versiones. |
| Controlar incorporación al expediente | PARCIAL | Adjuntos se vinculan a paciente/visita; falta control de incorporación basado en revisión. |
| Registrar comunicaciones al propietario | PARCIAL | Existen notificaciones y destinatarios en el dominio general; no hay comunicación vinculada a revisión/resultados externos. |

### Reutilizable

`MedicalAttachment`, validadores de adjuntos, `storageRefBelongsToMedicalAttachment`, permisos de visitas, notificaciones y jobs idempotentes pueden soportar una futura implementación. `ClinicalReportJob` no debe reutilizarse como entidad de resultado clínico: representa un proceso de generación de PDF/informe.

### Brechas y riesgos

| Brecha | Evidencia | Impacto | Prioridad | Complejidad | Módulos probables | Criterio de aceptación |
|---|---|---|---|---|---|---|
| Falta entidad de resultado externo | Solo existen visita, adjunto y job de informe. | No hay trazabilidad de origen, estado o revisión. | P1 | L | Prisma, API clínica, permisos | Resultado recibido conserva payload/archivo original, origen, paciente, visita, clínica y estado de revisión. |
| Falta workflow de revisión | No hay estados ni actor revisor. | Resultado no validado puede confundirse con diagnóstico. | P0 | L | API, ACL, expediente | Solo veterinario autorizado puede confirmar/rechazar; UI y expediente distinguen estados. |
| Falta auditoría de cambios | No hay modelo/log de revisión clínica. | Imposible demostrar quién decidió o corrigió. | P1 | L | Prisma, servicio de auditoría | Cada recepción, revisión, rechazo y corrección registra actor, fecha, acción y valores relevantes. |
| Validación de relación incompleta para informe por cliente | `clinical-reports/jobs/route.ts:39-50` persiste `clientId`/`petIds`; la evidencia mostrada no valida pertenencia antes de crear el job. | Riesgo de referencias cruzadas si una entrada manipulada alcanza el endpoint. | P1 | M | API de reportes, consultas | El servidor rechaza cualquier cliente/paciente fuera de `clinicId` y prueba negativa lo demuestra. |

## 6. Capacidad 3: inventario y reposición basada en demanda

### Arquitectura existente

- `prisma/schema.prisma:665-705`: producto con costo, precio, stock actual, mínimo, vencimiento legacy y control de stock.
- `prisma/schema.prisma:707-755`: movimientos, lotes, cantidad, costo, referencias, usuario creador y fechas.
- `prisma/schema.prisma:940-967`: consumos clínicos (`EncounterItem`) por producto, paciente, visita/turno y cantidad.
- `src/app/api/stock-movements/route.ts:31-94`: lista movimientos por clínica con búsqueda, filtro y `take` máximo 300.
- `src/app/api/stock-movements/route.ts:96-184`: registra entradas, salidas, ajustes, compras y vencimientos en transacción.
- `src/lib/server/inventory-batches.ts:5-60`: asignación FEFO y decremento condicional para evitar stock negativo y carreras por lote/producto.
- `src/app/api/products/route.ts:32-55,74-139`: consulta productos/lotes y registra stock inicial/movimiento inicial.
- `src/app/api/invoices/route.ts:15-17,168-174,219+`: facturación calcula totales en servidor y usa FEFO para consumo de productos.
- `src/lib/in-app-notifications.ts:183`: alerta de stock bajo y productos próximos a vencer.

### Matriz de requisitos

| Requisito | Estado | Evidencia y razón |
|---|---|---|
| Movimientos de inventario | COMPLETO | Modelo, GET/POST, permisos, transacción y pruebas FEFO; cobertura end-to-end no verificada. |
| Consumo real por producto | PARCIAL | `EncounterItem` registra consumos; no hay prueba de que todos los consumos clínicos descuenten stock automáticamente. |
| Ventas | PARCIAL | Facturas incluyen productos y hay tipos `SALE`; integración completa entre cada venta y movimiento no queda probada. |
| Ajustes manuales | COMPLETO | `ADJUST`, validación distinta de cero y transacción con delta. |
| Pérdidas, descartes y vencimientos | PARCIAL | `EXPIRED` existe; no hay categorías separadas ni flujo específico de pérdida/descarte. |
| Lotes y expiración | COMPLETO | `ProductBatch`, fecha, cantidad, FEFO y UI de lote. |
| Costos de adquisición | PARCIAL | `Product.cost` y `ProductBatch.cost` existen; no hay proveedor/orden/recepción que establezca costo de compra. |
| Existencias históricas | PARCIAL | `StockMovement` conserva eventos; no hay snapshots, saldo histórico consultable ni reconstrucción probada. |
| Días sin stock | NO EXISTE | No hay campo, evento ni cálculo. |
| Proveedores | NO EXISTE | No hay modelo, ruta o UI. |
| Órdenes de compra | NO EXISTE | No hay modelo, ruta o UI. |
| Cantidades solicitadas y recibidas | NO EXISTE | No existe entidad de compra/recepción. |
| Plazos de entrega | NO EXISTE | No hay lead time ni fechas prometidas/reales. |
| Cobertura y fecha estimada de agotamiento | NO EXISTE | No existe cálculo de demanda/cobertura/agotamiento. |

### Reutilizable

`Product`, `ProductBatch`, `StockMovement`, `EncounterItem`, `consumeProductStockFEFO`, alertas de stock bajo y referencias de factura forman una base operativa. La transacción de movimientos y actualizaciones condicionales es el patrón correcto para preservar integridad inmediata.

### Brechas y riesgos

| Brecha | Evidencia | Impacto | Prioridad | Complejidad | Módulos probables | Criterio de aceptación |
|---|---|---|---|---|---|---|
| Falta compras/proveedores | No hay modelos relacionados en `schema.prisma` ni rutas. | No se puede planificar reposición real ni medir entrega. | P1 | L | Prisma, inventario, APIs | Orden registra proveedor, líneas solicitadas, recibidas, costo y fechas; recepción genera movimientos trazables. |
| Falta consumo unificado | `EncounterItem` y facturación existen, pero no se prueba un único camino de descuento. | Stock puede divergir de consumo/venta. | P1 | M | invoices, encounters, inventory | Cada consumo/venta produce exactamente un movimiento y es idempotente. |
| Falta historial de saldo y stock-out | Solo eventos de movimiento, sin snapshots o cálculo histórico. | Cobertura y días sin stock no son verificables. | P2 | L | Inventario, consultas/reportes | Dado un intervalo, sistema reconstruye saldo y días con saldo cero desde eventos deterministas. |
| Falta costo histórico consistente | Costo existe en producto/lote, no en cada movimiento. | Análisis de costo de demanda puede usar valor ambiguo. | P2 | M | schema, movimientos, reportes | Cada entrada/compra guarda costo de adquisición aplicable y reportes explican fuente. |

## 7. Capacidad 4: seguridad de futuras integraciones API

### Matriz de requisitos

| Requisito | Estado | Evidencia y razón |
|---|---|---|
| Aislamiento multitenant | PARCIAL | `clinicId` está en modelos y rutas internas; no hay prueba automatizada transversal de todas las rutas. |
| Derivar `clinicId` desde sesión/credencial | COMPLETO para sesión interna | `server-auth.ts:37-75` usa membresía activa, no un `clinicId` enviado por cliente. No aplica todavía a API key. |
| Autorización por clínica | PARCIAL | ACL y `requireClinicPermission` existen; cobertura uniforme de todas las rutas no está probada. |
| Validar pertenencia de pacientes | PARCIAL | Varias rutas usan `clinicId` + relación; `appointments/route.ts:184-240` es evidencia positiva. Debe auditarse endpoint por endpoint. |
| Consultas por identificadores explícitos | PARCIAL | Rutas validan IDs con Zod y selects limitados; algunas lecturas usan `take` sin paginación formal. |
| Paginación | PARCIAL | Hay topes `take` en inventario/facturas; no hay contrato consistente de cursor, total o siguiente página. |
| Límites de operaciones por lote | NO VERIFICADO | No se encontró política común para tamaño de arrays/batch requests. |
| Rate limiting | NO EXISTE | No se encontró middleware, helper, dependencia o almacenamiento de límites. |
| Exposición mínima de campos | PARCIAL | Muchas consultas usan `select`; algunos contratos internos incluyen correo/nombres y no existe contrato público versionado. |
| Auditoría de accesos | NO EXISTE | `Session` guarda IP/user-agent, pero no hay log de acceso por endpoint, clínica, actor y resultado. |
| Manejo seguro de errores | PARCIAL | Hay mensajes sanitizados en varios endpoints; no existe estándar transversal ni prueba de no filtración. |
| API keys con permisos específicos | NO EXISTE | No hay modelo, hash, scopes, revocación, expiración ni autenticación por clave. |

### Reutilizable

Better Auth, `requireClinicPermissions`, catálogo de permisos, validadores Zod, selects explícitos y filtros `clinicId` son reutilizables para una API futura. No deben exponerse directamente como API pública sin contrato, límites, observabilidad y pruebas de aislamiento.

### Brechas y riesgos

| Brecha | Evidencia | Impacto | Prioridad | Complejidad | Módulos probables | Criterio de aceptación |
|---|---|---|---|---|---|---|
| No existe superficie pública definida | Todas las rutas encontradas están bajo `src/app/api` y usan sesión/permisos; no hay API versionada ni documentación. | Integraciones podrían acoplarse a endpoints internos inseguros. | P0 | L | API, auth, documentación | Contrato versionado identifica autenticación, scopes, campos, errores, paginación y límites. |
| Sin API keys/scopes | No hay modelo ni middleware. | No se puede delegar acceso revocable y mínimo a terceros. | P1 | L | Prisma, auth, ACL | Clave se almacena hasheada, muestra secreto una vez, tiene scopes, clínica, expiración, revocación y última utilización. |
| Sin rate limiting | No hay implementación encontrada. | Riesgo de abuso, costos y agotamiento de recursos. | P1 | M | middleware, almacenamiento | Pruebas por clave/IP superan límite y reciben 429 con headers seguros. |
| Sin auditoría de acceso | No hay entidad/log. | Incumplimiento de trazabilidad y respuesta a incidentes. | P1 | M | auditoría, API | Cada llamada externa registra actor/clínica, ruta, método, resultado, timestamp y request ID sin datos sensibles. |
| Paginación inconsistente | `stock-movements/route.ts:36` limita `take`; `invoices/route.ts:86-107` limita filas sin cursor. | Integraciones no pueden recorrer datos de forma fiable. | P2 | M | contratos de listados | Todas las colecciones externas usan cursor/limit máximo y respuesta `nextCursor`. |
| Validación cruzada no demostrada | Los endpoints no comparten una prueba de aislamiento. | Riesgo de fuga por una ruta omitida. | P0 | L | tests de integración, APIs | Prueba parametrizada con dos clínicas demuestra que cada ID externo solo devuelve recursos propios. |

## 8. Dependencias entre funcionalidades

1. La disponibilidad de citas depende de `ClinicSchedule`, `Service.durationMins`, citas activas, veterinarios miembros y una reserva transaccional segura.
2. Resultados clínicos dependen de identidad clínica, paciente/visita válidos, storage y permisos de veterinario; no deben escribir directamente `ClinicalVisit.diagnosis` antes de aprobación.
3. Reposición depende de movimientos confiables, consumos/ventas idempotentes, costos históricos, proveedores, órdenes y recepciones.
4. Cualquier API pública depende primero de aislamiento probado y contratos mínimos; después puede reutilizar ACL, paginación y validadores internos.
5. Auditoría transversal sería útil para revisiones clínicas y futuras API keys, pero debe separar auditoría clínica de logs técnicos de acceso.

## 9. Pruebas existentes y faltantes

### Existentes

- FEFO y control de cantidad: `tests/inventory-integrity.test.ts:7-30`.
- Cálculos financieros y estadísticas: `tests/inventory-integrity.test.ts:32-43`, `tests/money-and-service-stats.test.ts:6-30`.
- Seguridad de referencias de archivos y vínculos de visita: `tests/medical-attachments.test.ts:15-63`.
- Recordatorios clínicos/vacunas: `tests/pet-reminders.test.ts`.

### Faltantes prioritarias

- Integración de creación/reprogramación con horarios, duración, veterinario, cliente y paciente.
- Búsqueda de 3-5 slots y prueba de veterinario específico/cualquiera.
- Concurrencia de dos reservas sobre el mismo veterinario y rango.
- Recepción, rechazo, confirmación, corrección y auditoría de resultado clínico.
- Prueba negativa de diagnóstico no confirmado.
- Integración factura/consumo/movimiento y reintento idempotente.
- Reconstrucción histórica de stock y casos de stock-out.
- Aislamiento parametrizado entre dos clínicas para cada endpoint de dominio.
- Paginación, límites de lote, rate limit, API key revocada/expirada y scopes insuficientes.
- Contratos de error que no filtren detalles internos.

## 10. Recomendaciones por prioridad

### P0

1. Establecer pruebas de aislamiento multitenant para las rutas existentes antes de abrir integraciones.
2. Definir el workflow de resultados clínicos con estados, autorización y auditoría antes de permitir que resultados externos alimenten el expediente.
3. No anunciar ni exponer API pública hasta contar con contrato versionado y controles de acceso verificables.

### P1

1. Extraer un motor de disponibilidad compartido por agenda, creación y reprogramación; reservar con protección contra concurrencia.
2. Implementar entidad y flujo de resultados externos, conservando archivo/payload original y decisión veterinaria.
3. Implementar proveedores, órdenes de compra y recepciones con movimientos trazables.
4. Añadir API keys hasheadas, scopes, revocación, expiración, rate limiting y auditoría de acceso.
5. Unificar paginación y límites de lote de las consultas destinadas a integración.

### P2/P3

1. Construir saldos históricos, días sin stock, demanda observada, cobertura y agotamiento determinista.
2. Añadir costo histórico por entrada y reportes de variación.
3. Separar tipos de pérdida/descarte y mejorar reportes operativos.
4. Formalizar documentación OpenAPI, versionado y pruebas contractuales.

## 11. Roadmap sugerido

### Fase 0: seguridad y contratos

Pruebas de aislamiento, inventario de rutas, contrato API versionado, política de errores, paginación y límites.

### Fase 1: disponibilidad de citas

Motor de slots, filtros por veterinario, alternativas ordenadas y reserva transaccional. Integrar agenda, alta y reprogramación.

### Fase 2: resultados clínicos

Modelo de resultado externo, almacenamiento original, estados de revisión, permisos de veterinario, auditoría y comunicación al propietario.

### Fase 3: compras e inventario histórico

Proveedores, órdenes, recepciones, costos históricos, consumo idempotente, saldo histórico y días sin stock.

### Fase 4: integraciones externas

API keys/scopes, rate limiting, logs de acceso, endpoints mínimos, documentación y pruebas contractuales.

### Fase 5: analítica operativa determinista

Cobertura, promedio de consumo observado y fecha estimada de agotamiento. Sin IA ni predicción especulativa.

## 12. Tabla final

| Funcionalidad | Estado general | Qué existe | Qué falta | Prioridad | Recomendación |
|---|---|---|---|---|---|
| Próxima cita disponible | PARCIAL | Duración, horarios, veterinario, solapamiento server-side y reprogramación validada | Motor de búsqueda, 3-5 alternativas, cualquier veterinario, reserva atómica compartida | P1 | Extraer motor de slots y probar concurrencia |
| Resultados clínicos con validación humana | PARCIAL | Visitas, diagnósticos, adjuntos, storage seguro, informes y jobs | Ingesta externa, estados de revisión, rechazo, auditoría, incorporación controlada y comunicación vinculada | P0 | Diseñar workflow clínico antes de integrar proveedores |
| Inventario y reposición por demanda | PARCIAL | Productos, stock, movimientos, ventas parciales, lotes, costos, vencimiento y FEFO | Proveedores, compras, recepciones, lead time, stock histórico, stock-out, cobertura y agotamiento | P1 | Completar trazabilidad de compras y consumo |
| Seguridad de futuras integraciones API | PARCIAL | Sesión, membresía, `clinicId`, ACL, Zod, selects y filtros internos | API pública, API keys, scopes, rate limit, auditoría, límites y pruebas de aislamiento | P0 | Asegurar base multitenant y contrato antes de publicar |

