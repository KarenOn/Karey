# Auditoría profunda de Agenda y Citas

Fecha: 2026-10-14  
Alcance: código de agenda, APIs de citas, esquema Prisma, permisos, componentes de Agenda/Hoy y pruebas disponibles.  
Cambios de producto: ninguno.

## 1. Conclusión ejecutiva

El sistema puede validar una cita concreta, pero no posee un motor de disponibilidad reutilizable.

Estado actual: **PARCIAL**.

Existe una base útil:

- `Appointment` conserva rango temporal, servicio, estado, clínica y veterinario.
- `Service.durationMins` permite duración configurable.
- `ClinicSchedule` define horario semanal por clínica.
- Backend valida clínica, relaciones, horario y solapamientos al crear y reprogramar.
- Agenda calcula slots y disponibilidad de veterinarios en cliente.

No existe actualmente:

- Servicio/API de “próximo espacio”.
- Búsqueda multi-día.
- Búsqueda entre todos los veterinarios.
- Ventana máxima de búsqueda.
- Modelo de descansos, bloqueos, vacaciones o feriados.
- Reserva atómica contra solapamientos.
- Fuente única: la misma regla está duplicada entre UI y Route Handlers.

Respuesta directa: **no conviene agregar el botón reutilizando solo el frontend actual**. Primero debe centralizarse la evaluación de disponibilidad en un módulo server-side compartido. La creación y reprogramación deben consumir ese mismo módulo. Después, el buscador puede usarlo sin duplicar reglas.

## 2. Diagrama textual de arquitectura actual

```text
Sesión Better Auth
  -> requireClinicPermission(permission)
  -> membresía activa + clinicId derivado del servidor
  -> permisos del rol

Agenda /app/(app)/appointments/page.tsx
  -> GET /api/appointments
  -> GET /api/appointments/meta
  -> reglas locales de horario, duración y solapamiento
  -> POST /api/appointments
  -> PUT /api/appointments/[id]
  -> PATCH /api/appointments/[id]/assign
  -> PATCH /api/appointments/[id]/status

API de creación
  -> AppointmentCreateSchema
  -> valida paciente/cliente/veterinario dentro de clinicId
  -> obtiene Service dentro de clinicId
  -> calcula endAt desde duración
  -> valida ClinicSchedule
  -> busca citas solapadas en la misma clínica
  -> prisma.appointment.create

API de reprogramación
  -> AppointmentUpdateSchema
  -> carga cita por id + clinicId
  -> recalcula rango si cambia servicio/inicio
  -> valida ClinicSchedule
  -> busca solapamientos excluyendo la propia cita
  -> prisma.appointment.update

Base de datos
  Clinic 1---N ClinicSchedule
  Clinic 1---N Service
  Clinic 1---N Appointment N---1 User (vet opcional)
  Appointment N---1 Client/Pet/Service
```

## 3. A. Disponibilidad actual

### 3.1 Almacenamiento y relaciones

`prisma/schema.prisma:532-575` define `Appointment` con:

- `clinicId`, `clientId`, `petId`.
- `serviceId` nullable.
- `startAt`, `endAt` nullable.
- `status`.
- `vetId` nullable.
- relación opcional a visita y factura.

`prisma/schema.prisma:634-656` define `Service.durationMins` nullable, por clínica y con filtro de activo.

`prisma/schema.prisma:409-422` define `ClinicSchedule` con un horario por `(clinicId, day)`, `open`, `close` y `closed`.

`prisma/schema.prisma:425-443` asigna veterinarios mediante `ClinicMember`, `userId`, rol y `isActive`. No existe una entidad de horario por veterinario.

### 3.2 Duración

Hay dos reglas relacionadas:

- `src/lib/appointment-helpers.ts:15-33`: `getAppointmentEnd` usa `endAt`; si falta, usa `service.durationMins`; si falta duración, usa 30 minutos.
- `src/app/api/appointments/route.ts:349-358`: creación obtiene el servicio activo de la clínica y siempre calcula `effectiveEndAt` desde `startAt` + duración del servicio.
- `src/app/api/appointments/[id]/route.ts:304-310`: reprogramación recalcula el fin cuando cambia servicio/inicio; si no recalcula, conserva fin existente o usa 30 minutos.
- `src/app/(app)/appointments/page.tsx:1208-1211`: UI calcula fin desde la duración; permite hora final manual cuando el formulario la contiene.

El backend de creación sobrescribe el `endAt` enviado con la duración del servicio. Eso protege esa ruta. La reprogramación tiene más combinaciones y permite conservar o aceptar `endAt` cuando no se activa la derivación por servicio/inicio; requiere pruebas de contrato para evitar duraciones inconsistentes.

### 3.3 Horarios laborales y excepciones

Existe horario semanal por clínica:

- `src/app/api/appointments/meta/route.ts:34-38`: carga horarios de la clínica.
- `src/app/api/appointments/route.ts:144-181`: rechaza clínica cerrada o rango fuera de `open`/`close`.
- `src/app/(app)/appointments/page.tsx:751-763`: construye timeline según el horario seleccionado.

No se encontró implementación de:

- horarios individuales por veterinario;
- descansos dentro de la jornada;
- días libres o vacaciones de veterinario;
- feriados/excepciones de clínica;
- bloqueos temporales de agenda;
- recursos físicos requeridos por servicio.

La ausencia de estos modelos significa que “disponible” solo puede significar “dentro del horario semanal de la clínica y sin cita conflictiva”.

### 3.4 Estados que ocupan disponibilidad

`src/lib/appointment-helpers.ts:140-143` considera activa toda cita excepto `CANCELLED` y `NO_SHOW`.

Por tanto, en la lógica compartida actual bloquean disponibilidad:

- `SCHEDULED`;
- `CONFIRMED`;
- `IN_PROGRESS`;
- `COMPLETED`;
- cualquier estado legado no igual a `CANCELLED`/`NO_SHOW`.

El enum de base de datos `prisma/schema.prisma:37-44` contiene `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` y `NO_SHOW`; no contiene `WAITING`, aunque helpers y UI lo contemplan como estado legado.

`src/app/api/appointments/[id]/status/route.ts:34-72` usa actualización condicional por estado para cambios concurrentes de estado y limita `NO_SHOW` hasta cinco minutos después de inicio. La transición de estado es relativamente protegida; la ocupación temporal no tiene la misma protección atómica.

### 3.5 Conflictos al crear

`src/app/api/appointments/route.ts:318-404` realiza este flujo:

1. Obtiene `clinicId` desde sesión.
2. Valida payload con `AppointmentCreateSchema`.
3. Rechaza inicio pasado.
4. Valida paciente, cliente y veterinario con `clinicId`.
5. Valida servicio activo con `clinicId`.
6. Calcula fin desde servicio.
7. Valida horario semanal de clínica.
8. Busca citas candidatas en `clinicId`.
9. Excluye `CANCELLED` y `NO_SHOW` vía `isAppointmentActive`.
10. Compara veterinario y rango con `rangesOverlap`.
11. Inserta la cita.

La restricción de veterinario es específica:

- con `vetId`, solo bloquea citas del mismo veterinario;
- sin `vetId`, solo bloquea otras citas sin veterinario;
- una cita sin asignar no bloquea a veterinarios ya asignados.

Esto permite varias citas del mismo veterinario si no se solapan. También permite citas simultáneas de veterinarios distintos.

### 3.6 Conflictos al reprogramar

`src/app/api/appointments/[id]/route.ts:82-148,200-348` repite una variante de la lógica:

- carga la cita por `id` y `clinicId`;
- rechaza cambios incompatibles con estado terminal o `IN_PROGRESS`;
- valida nuevas relaciones;
- recalcula o conserva rango;
- valida horario semanal;
- busca solapamiento en `clinicId`, excluyendo `id` actual;
- actualiza.

La regla funcional existe, pero está duplicada. La creación usa helpers importados; el Route Handler de `[id]` mantiene sus propias funciones `addMinutes`, `getWeekdayKey`, `combineDateAndTime`, `findOverlappingAppointment` y `validateAppointmentSchedule`.

### 3.7 Límite por clínica

La mayoría de rutas relevantes filtra explícitamente por `clinicId`:

- creación: `src/app/api/appointments/route.ts:338-365`;
- lectura: `src/app/api/appointments/route.ts:278-310`;
- asignación: `src/app/api/appointments/[id]/assign/route.ts:22-26,73-95`;
- estado: `src/app/api/appointments/[id]/status/route.ts:29-55`;
- reprogramación: `src/app/api/appointments/[id]/route.ts:200+`.

La protección contra una cita de otra clínica es **COMPLETA en los puntos inspeccionados**, pero no existe una prueba parametrizada que cubra todas las rutas de citas. La seguridad depende de que cada consulta futura conserve el filtro.

## 4. Matriz de requisitos

| Requisito | Estado | Evidencia |
|---|---|---|
| Citas almacenan inicio, fin, estado, clínica y veterinario | COMPLETO | `schema.prisma:532-575`. |
| Veterinario pertenece a membresía activa de clínica | COMPLETO | `appointments/route.ts:221-240`; `assign/route.ts:81-85`. |
| Servicio tiene duración configurable | COMPLETO | `schema.prisma:634-656`; `meta/route.ts:39-43`. |
| Fin derivado de duración en creación | COMPLETO | `appointments/route.ts:349-358`. |
| Fin derivado consistentemente en toda reprogramación | PARCIAL | `appointments/[id]/route.ts:304-310` conserva/acepta fin en ciertas combinaciones. |
| Horario laboral semanal por clínica | COMPLETO | `ClinicSchedule`; validación backend `route.ts:144-181`. |
| Horario por veterinario | NO EXISTE | No hay modelo ni consulta encontrada. |
| Descansos intra-jornada | NO EXISTE | No hay intervalos de pausa. |
| Días libres/vacaciones | NO EXISTE | No hay disponibilidad individual. |
| Feriados/excepciones | NO EXISTE | No hay calendario de excepciones. |
| Bloqueos temporales | NO EXISTE | No hay entidad de bloqueo. |
| Estados cancelada/no-show liberan espacio | COMPLETO | `isAppointmentActive:140-143`; consultas de asignación excluyen ambos estados. |
| Estados completada/en progreso ocupan espacio | PARCIAL | Helper los bloquea, aunque `COMPLETED` futuro sería una situación de datos anómala. |
| Conflicto al crear | PARCIAL | Validación server-side existe, pero lectura y escritura no son atómicas. |
| Conflicto al reprogramar | PARCIAL | Validación server-side existe, duplicada y no atómica. |
| Conflictos limitados por clínica | COMPLETO en rutas inspeccionadas | Consultas usan `clinicId` derivado. Falta prueba transversal. |
| Múltiples citas del mismo veterinario sin solapamiento | COMPLETO | `rangesOverlap` solo rechaza intervalos superpuestos. |
| Motor de próximo espacio | NO EXISTE | No hay endpoint, servicio ni contrato de alternativas. |
| Recorrido multi-día | NO EXISTE | UI solo construye slots del día elegido; backend valida un rango recibido. |
| Búsqueda cualquier veterinario | NO EXISTE | `assign` lista veterinarios libres para una cita existente, no busca slots. |
| Ventana máxima de búsqueda | NO EXISTE | No hay parámetro ni límite de días para disponibilidad. |
| Zona horaria correcta en validación | NO VERIFICADO / RIESGO | UI usa zona de clínica en partes; backend usa `Date.getDay` y `setHours` del runtime. |

## 5. Fuente de verdad identificada

No existe una única fuente de verdad completa.

### Fuente de datos

- `Appointment`, `Service`, `ClinicSchedule`, `ClinicMember` y `Clinic.timezone` son la fuente persistida.

### Fuente de reglas backend

- Duración/solapamiento: `src/lib/appointment-helpers.ts` más copias locales en Route Handlers.
- Horario: funciones locales en `src/app/api/appointments/route.ts` y `[id]/route.ts`.
- Asignación: lógica específica en `src/app/api/appointments/[id]/assign/route.ts`.

### Fuente de reglas frontend

`src/app/(app)/appointments/page.tsx` reimplementa horario, duración y conflictos en:

- `:201-212`: slots de 30 minutos;
- `:787-802`: opciones de veterinario “disponible”;
- `:869-887`: slots ocupados;
- `:1185-1302`: validaciones antes de enviar.

La UI sirve como ayuda de UX, no como autoridad. El backend vuelve a validar, pero las reglas pueden divergir.

## 6. Búsqueda del próximo espacio

### Estado de capacidades

| Capacidad requerida | Estado | Hallazgo |
|---|---|---|
| Recibir `clinicId` autenticado | PARCIAL | Patrón existe en `server-auth.ts:37-75`; no existe servicio de disponibilidad. |
| Recibir duración | PARCIAL | Servicio aporta duración; no existe entrada explícita de duración para búsqueda. |
| Veterinario opcional | NO EXISTE | No hay contrato de búsqueda. |
| Consultar horario laboral | PARCIAL | Horario está disponible y se valida para un día. |
| Excluir intervalos ocupados | PARCIAL | Helpers y Route Handlers detectan solapamientos de una cita concreta. |
| Recorrer varios días | NO EXISTE | No existe algoritmo. |
| Alternativas cronológicas | NO EXISTE | No hay respuesta de slots. |
| Buscar entre veterinarios elegibles | NO EXISTE | `assign` trabaja sobre una cita ya creada. |
| Evitar pasado | PARCIAL | Creación y UI rechazan pasado; falta regla de búsqueda. |
| Respetar zona horaria | NO VERIFICADO | Hay soporte parcial, pero validación server-side mezcla zona local del runtime con zona clínica. |
| Ventana máxima | NO EXISTE | Sin límite de búsqueda. |

No es posible construir el buscador solo componiendo funciones actuales. Se pueden reutilizar `rangesOverlap`, `getAppointmentEnd`, `getServiceDuration`, `isAppointmentActive` y `ClinicSchedule`, pero falta una capa que los coordine y normalice tiempo.

## 7. C. Concurrencia y seguridad

### Escenario 1: dos empleados reservan mismo veterinario/hora

**Riesgo: ALTO.** En `POST /api/appointments`, ambas solicitudes pueden:

1. leer la misma ausencia de conflicto;
2. pasar `validateAppointmentSchedule`;
3. ejecutar `findOverlappingAppointment` sin bloqueo;
4. insertar dos citas.

No hay transacción que abarque lectura de conflicto e inserción. No hay exclusión PostgreSQL ni constraint temporal equivalente.

### Escenario 2: sugerencia ocupada antes de confirmar

El futuro buscador no debe confiar en su resultado. La confirmación debe llamar al mismo comando de creación/reprogramación y recibir `409` si el espacio cambió. Hoy la creación vuelve a comprobar, pero la comprobación no es atómica.

### Escenario 3: cambia duración durante reprogramación

Backend obtiene servicio actual de la clínica y calcula fin cuando corresponde. La UI también calcula fin. Riesgo: reglas de derivación distintas cuando se envía `endAt` manual o solo cambia un campo. Requiere matriz de pruebas para combinaciones `serviceId`, `startAt`, `endAt` y cita legacy.

### Escenario 4: reservar en otra clínica

**Protección observada: buena.** `clinicId` no se toma del body; se deriva de sesión/membresía. Paciente, cliente, servicio y veterinario se buscan con esa clínica.

### Escenario 5: solicitud manipulada

**Protección observada: parcial/adecuada para rutas inspeccionadas.** Zod valida tipos y rangos básicos; backend revalida relaciones, estado, horario y conflictos. El riesgo residual es cualquier futura ruta que copie la UI sin repetir estas validaciones.

### Escenario 6: mismo paciente, veterinarios distintos

El sistema permite citas superpuestas del mismo paciente si los veterinarios son distintos, porque el conflicto se define por `vetId`, no por `petId`. Esto es correcto solo si negocio permite consultas concurrentes del mismo paciente. No existe regla clínica que lo impida.

### Escenario 7: cruce de día o cambio horario

**Riesgo: MEDIO/ALTO.** `Clinic.timezone` existe (`schema.prisma:343`), y la UI usa helpers de fecha de clínica en varias vistas. Sin embargo:

- `src/app/api/appointments/route.ts:71-88` usa `Date.getDay()` y `setHours()` sin pasar zona clínica;
- `src/app/api/appointments/[id]/route.ts` repite la misma estrategia;
- `src/lib/appointment-helpers.ts:192-194` combina fecha/hora con `date-fns.parse`, dependiente de zona local del proceso;
- la UI combina fecha/hora local y luego serializa con `toISOString`.

La conversión puede asignar el día laboral equivocado cuando servidor, navegador y clínica usan zonas distintas. También puede fallar cerca de medianoche o cambios DST, aunque la zona por defecto `America/Santo_Domingo` no usa DST actualmente.

### Atomicidad final

**No es atómica para crear ni reprogramar.** La validación final es server-side, pero no está protegida contra race condition entre lectura y escritura.

`assign` sí usa transacción y `updateMany` condicional para impedir que dos usuarios reclamen la misma cita (`assign/route.ts:72-107`). Eso protege la toma de una cita, no dos citas distintas asignadas simultáneamente al mismo veterinario.

## 8. D. UX actual

### Creación

- `src/app/(app)/appointments/page.tsx:1009-1054` abre creación desde día/slot.
- `:1185-1329` valida cliente implícito desde paciente, servicio, rango, horario y conflictos locales.
- `:1890-1985` muestra campos de paciente, servicio, fecha, hora inicial/final, estado y veterinario.
- Hora final queda derivada cuando hay servicio (`:1957-1959`).
- Estado de guardado usa `saving`; errores llegan a alerta (`:1304-1329`).

### Reprogramación

- `:1114-1161` envía `PUT /api/appointments/[id]`.
- `:2058-2116` presenta fecha, hora inicial y hora final opcional.
- La reprogramación existente no ofrece búsqueda de alternativa.

### Agenda y selectores

- `:662-704` carga citas/metadatos y refresca cada 30 segundos.
- `:695-699` escucha `karey:appointments-invalidated`.
- `:787-802` filtra veterinarios disponibles en cliente, solo para el rango actual.
- `:869-887` marca slots ocupados por veterinario y estados activos.
- `:1670-1700` muestra “Agendar cita”, “Horario pasado” u “Horario ocupado”.

### Hoy

- `src/app/(app)/today/page.tsx:14-30` carga citas del día en zona de clínica y excluye canceladas/no-show.
- `src/app/(app)/today/TodayWorkspace.tsx:632-663` inicia atención con estado de carga y error.
- `:700-713` completa una cita y actualiza el estado local.

Hoy no es punto adecuado para buscar próximo espacio: es centro operativo de atención del día, no editor principal de agenda. Puede enlazar a Agenda con contexto si el producto lo requiere.

### Actualización y caché

La Agenda actualiza después de mutaciones mediante `refreshAll(false)` y evento local; además refresca cada 30 segundos. Esto no es garantía de disponibilidad entre usuarios. Para el nuevo flujo, el resultado debe considerarse solo una sugerencia y la confirmación debe revalidar server-side.

## 9. Lugar recomendado para el botón

Ubicación primaria: modal de creación de cita en Agenda, cerca de fecha, hora y veterinario, después de seleccionar paciente y servicio.

Ubicación secundaria: modal de reprogramación, reutilizando el mismo panel de alternativas.

Flujo UX recomendado:

1. Usuario selecciona paciente y servicio.
2. Usuario elige veterinario específico o “Cualquier veterinario disponible”.
3. Usuario define fecha mínima opcional.
4. “Buscar próximo espacio” solicita alternativas al servidor.
5. UI muestra 3-5 filas cronológicas con fecha, hora y veterinario.
6. Usuario selecciona una alternativa; UI rellena campos.
7. Usuario confirma creación/reprogramación.
8. Backend vuelve a validar y reserva; si cambió, devuelve `409` y la UI ofrece buscar nuevamente.

No ubicarlo como acción principal en Hoy ni basarlo en `occupiedSlots` del cliente.

## 10. Contrato sugerido para servicio compartido

Nombre conceptual: `appointmentAvailability` o `findNextAppointmentSlots` dentro de `src/lib/server`.

### Entrada

```ts
type FindNextSlotsInput = {
  clinicId: number;              // siempre derivado del contexto server-side
  serviceId: number;             // fuente de duración, validado en clinicId
  preferredStart: Date;          // instante absoluto
  preferredVetId?: string | null;
  limit?: number;                // acotado por servidor, por ejemplo 3-5
  horizonDays?: number;          // acotado por servidor
  ignoreAppointmentId?: number;  // solo reprogramación
};
```

### Salida

```ts
type AppointmentSlot = {
  startAt: string;               // ISO absoluto
  endAt: string;                 // ISO absoluto
  vetId: string;
  vetName: string;
  clinicTimezone: string;
};
```

### Invariantes

- Nunca acepta `clinicId` del navegador como autoridad.
- Servicio y veterinario pertenecen a la clínica activa.
- Duración procede del servicio, no del precio ni de una duración libre enviada por UI.
- Slot inicia después de `now` en zona de clínica.
- Slot completo queda dentro del horario laboral del día.
- Excluye `CANCELLED` y `NO_SHOW`; trata estados activos según una constante central.
- Excluye la propia cita al reprogramar.
- Devuelve orden cronológico estable.
- Impone límite máximo de días y resultados.
- Usa una librería/estrategia única para convertir fecha civil + hora de clínica a instante.
- La reserva final vuelve a evaluar todas las invariantes dentro de una operación protegida contra concurrencia.

El endpoint podría ser `GET /api/appointments/availability` para sugerencias. La reserva debe seguir usando el comando de creación/reprogramación; no debe aceptar un slot como garantía.

## 11. Recomendación arquitectónica

### Orden correcto

1. Centralizar tipos y estados ocupantes.
2. Centralizar duración efectiva y conversión de horario de clínica.
3. Centralizar lectura de calendario laboral y evaluación de intervalo.
4. Hacer que creación y reprogramación llamen al mismo validador server-side.
5. Añadir endpoint de sugerencias multi-día usando el mismo servicio.
6. Añadir protección de reserva concurrente.
7. Conectar UI de creación y reprogramación.

### Decisión

**Necesita centralización previa.** No requiere una reescritura completa de Agenda, pero sí una refactorización acotada de la lógica de disponibilidad antes de agregar el buscador. Agregar el botón directamente a la UI duplicaría las reglas ya duplicadas y produciría resultados distintos entre sugerencia, creación y reprogramación.

### Protección de concurrencia recomendada

La alternativa robusta es una transacción server-side con una estrategia PostgreSQL que impida intervalos solapados por `(clinicId, vetId)` para estados ocupantes. Puede ser una exclusión por rango temporal si el esquema y migraciones lo soportan, o un bloqueo/advisory lock por clínica-veterinario dentro de la transacción. El buscador no debe declarar reservado un resultado hasta que la operación de escritura confirme.

## 12. Casos de prueba

### Reglas unitarias

1. Duración configurada de 15/30/60 minutos.
2. Servicio sin duración usa política explícita de 30 minutos.
3. Intervalos contiguos no solapan: `[10:00,10:30)` y `[10:30,11:00)`.
4. Intervalos parcialmente solapados sí chocan.
5. `CANCELLED` y `NO_SHOW` no bloquean.
6. `SCHEDULED`, `CONFIRMED` e `IN_PROGRESS` bloquean.
7. Cita de veterinario A no bloquea veterinario B.
8. Cita sin asignar solo bloquea otra sin asignar bajo regla actual.
9. Una misma cita se excluye al reprogramar.

### Disponibilidad

10. Slot no inicia en pasado.
11. Slot completo no cruza cierre.
12. Día cerrado no produce slots.
13. Busca días consecutivos hasta `horizonDays`.
14. Devuelve máximo `limit` resultados.
15. “Cualquier veterinario” devuelve veterinarios elegibles ordenados de forma estable.
16. Veterinario específico no recibe slots de otro veterinario.
17. Horario de una clínica no se usa para otra.
18. Cambio de servicio actualiza duración.
19. Feriado/bloqueo, cuando exista el modelo, elimina slots.

### Seguridad y concurrencia

20. `clinicId` del body se ignora o rechaza.
21. Paciente, cliente, servicio y veterinario de otra clínica reciben error.
22. Dos reservas iguales: exactamente una tiene éxito.
23. Sugerencia seguida de reserva ocupada devuelve `409` limpio.
24. Dos citas distintas no pueden ocupar simultáneamente el mismo veterinario/rango.
25. Cambio de estado concurrente no reactiva una cita cancelada.
26. Reprogramación concurrente no crea solapamiento.

### Zona horaria

27. Fecha civil de clínica distinta de zona del servidor conserva día correcto.
28. Fecha civil de clínica distinta de zona del navegador conserva hora correcta.
29. Slot cercano a medianoche no cambia de día.
30. Rango que cruza UTC se compara por instantes absolutos y horario civil de clínica.

### UX

31. Botón bloquea durante búsqueda y evita solicitudes duplicadas.
32. Error `409` ofrece actualizar alternativas.
33. Seleccionar alternativa rellena fecha, hora y veterinario.
34. Reprogramación conserva `ignoreAppointmentId`.
35. Éxito actualiza Agenda y Hoy sin depender solo del intervalo de 30 segundos.

No se encontraron pruebas de citas en `tests`; estas pruebas son faltantes, no evidencia de comportamiento existente.

## 13. Plan incremental sin cambiar alcance funcional

### Fase 1: consolidación

- Crear módulo server-side de reglas.
- Mover allí duración, estados ocupantes, solapamiento, horario y pertenencia.
- Hacer que POST y PUT lo consuman.
- Mantener UI actual como validación de experiencia, nunca como autoridad.

### Fase 2: tiempo y datos

- Resolver fecha/hora civil usando `Clinic.timezone` de forma uniforme.
- Añadir pruebas unitarias de zona horaria.
- Definir explícitamente política de cita sin veterinario.
- Definir si `COMPLETED` futuro bloquea o se corrige como dato inválido.

### Fase 3: concurrencia

- Elegir exclusión temporal o lock transaccional.
- Añadir pruebas concurrentes de creación, reprogramación y asignación.
- Mantener `409` como respuesta de conflicto recuperable.

### Fase 4: buscador

- Exponer servicio/endpoint de sugerencias.
- Limitar horizonte y cantidad.
- Buscar slots por veterinario específico o conjunto elegible.
- Reutilizar el validador durante la confirmación.

### Fase 5: UX

- Agregar panel reutilizable en creación y reprogramación.
- Refrescar estado después de éxito/conflicto.
- Instrumentar tiempos y errores de búsqueda.

## 14. Resumen final

| Área | Estado | Decisión |
|---|---|---|
| Persistencia de citas | COMPLETO | Reutilizar modelos actuales. |
| Duración de servicio | COMPLETO | Centralizar uso server-side. |
| Horario semanal de clínica | COMPLETO | Reutilizar, corregir zona temporal. |
| Disponibilidad por veterinario | PARCIAL | Reutilizar solapamiento; falta servicio común. |
| Excepciones laborales | NO EXISTE | No asumirlas en el buscador hasta modelarlas. |
| Conflicto al crear/reprogramar | PARCIAL | Validación existe; falta atomicidad. |
| Aislamiento por clínica | COMPLETO en rutas auditadas | Añadir pruebas transversales. |
| Motor próximo espacio | NO EXISTE | Construir después de centralizar. |
| UX de Agenda | PARCIAL | Crear/reprogramar existen; no hay sugerencias. |
| Lugar del botón | NO EXISTE | Agregar en modal de Agenda y reprogramación, después de servicio. |

