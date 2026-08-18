# Estado actual de la app

Fecha de corte de este documento: 18 de agosto de 2026.

Este documento describe lo que la aplicación hace hoy según el código actual del proyecto, qué partes están operativas, qué partes siguen incompletas o inconsistentes y cuál parece ser la intención real del producto.

## 1. Qué es esta app

La app es un sistema de gestión para clínicas veterinarias. Combina operación clínica, atención al cliente, agenda, facturación, inventario, personal y recordatorios en una sola plataforma.

En el código aparecen dos nombres de producto:

- `KiskeyaVet`: nombre del repositorio/proyecto.
- `Karey Vet`: nombre visible en varias pantallas, `metadata`, login y enlaces públicos.

Eso sugiere que el producto sigue en una etapa de ajuste de branding.

## 2. A quién va dirigida

Está dirigida principalmente a:

- clínicas veterinarias pequeñas o medianas,
- dueños/administradores de clínica,
- recepcionistas,
- veterinarios,
- personal operativo que necesita trabajar agenda, pacientes, caja e inventario desde el mismo sistema.

La app también contempla, de forma parcial o futura, interacción externa con clientes finales:

- confirmación de citas por enlace,
- recordatorios por correo/WhatsApp,
- una intención de dar acceso al cliente a la app, pero eso todavía no está terminado.

## 3. Concepto del producto

La idea central es que cada clínica tenga su propio espacio aislado dentro del sistema y que todo gire alrededor de su operación diaria:

- pacientes y dueños,
- citas programadas,
- turnos del día sin cita,
- historial clínico,
- vacunas,
- productos y stock,
- servicios,
- facturas y pagos,
- empleados y permisos,
- recordatorios automáticos.

La aplicación ya tiene una base multiclínica real: casi todos los datos del dominio están ligados a `clinicId`.

## 4. Estado general real hoy

Hoy la app está bastante avanzada como producto interno/operativo. No es un prototipo vacío: ya tiene flujo de autenticación, shell principal, módulos de negocio, APIs, roles, persistencia, cron de recordatorios, carga de archivos, impresión y modo PWA/offline básico.

Al mismo tiempo, todavía no se ve como un producto 100% cerrado. Hay señales claras de transición, refactor y features a medio terminar:

- código comentado grande en varias pantallas,
- rutas duplicadas o con typo,
- branding mezclado,
- partes del modelo antiguo conviviendo con el nuevo,
- pantallas completas funcionales junto a otras más mínimas,
- varias intenciones futuras todavía no cerradas.

## 5. Stack técnico y arquitectura actual

La app usa actualmente:

- `Next.js` con App Router.
- `React`.
- `Prisma`.
- `Better Auth`.
- PWA con `service worker`.
- almacenamiento de archivos mediante referencias tipo `s3://` y URLs firmadas.

### Base de datos hoy

Hoy la conexión activa no está en MySQL. El estado actual del código indica que la app está corriendo con PostgreSQL:

- [`prisma/schema.prisma`](C:/Users/karen/Documents/PROGRAMACION%20KAREN/kiskeyavet/prisma/schema.prisma) define `provider = "postgresql"`.
- [`src/lib/prisma.ts`](C:/Users/karen/Documents/PROGRAMACION%20KAREN/kiskeyavet/src/lib/prisma.ts) usa `PrismaPg` con `DATABASE_URL`.
- [`src/lib/auth.ts`](C:/Users/karen/Documents/PROGRAMACION%20KAREN/kiskeyavet/src/lib/auth.ts) configura `better-auth` con `provider: "postgresql"`.

También se ve una migración/arrastre desde MySQL:

- existe `prisma/migrations_mysql/`,
- existe la migración nueva `prisma/migrations/...initial_postgresql`,
- hay comentarios viejos y lógica heredada que muestran una transición de etapa.

Conclusión técnica honesta: la app hoy está orientada a PostgreSQL, no a MySQL, aunque todavía conserva rastros importantes de la etapa anterior.

## 6. Cómo entra un usuario y cómo se organiza el acceso

### Inicio general

La raíz `/` hace redirección automática:

- si el usuario es super admin global, va a `/admin/clinics`,
- si es usuario autenticado normal, va a `/today`,
- si no está autenticado, va a `/login`.

### Autenticación

La app tiene:

- login con email/contraseña,
- login con Google,
- registro,
- verificación de email,
- cambio de contraseña desde perfil,
- aceptación de invitación para empleados.

### Lo que falta o está flojo en auth

- el botón “¿Olvidaste tu contraseña?” existe visualmente, pero no tiene flujo funcional real implementado;
- la pantalla de aceptar invitación funciona, pero se ve más básica y menos terminada que el resto;
- la verificación de correo está bien integrada, pero no parece bloquear el uso completo de la app.

### Multiclínica y permisos

La app sí maneja membresías por clínica:

- `User` puede pertenecer a una clínica por medio de `ClinicMember`,
- cada miembro tiene un `Role`,
- los permisos se guardan como JSON por clínica,
- el shell lateral filtra módulos según `currentUser.access.modules`.

Roles base visibles en el código:

- `owner`,
- `admin`,
- `vet`,
- `reception`.

### Super admin

Existe un panel global para administrar clínicas:

- crear clínica,
- crear owner inicial,
- activar/desactivar clínica,
- cambiar plan,
- cambiar estado de suscripción,
- seguir fechas de pago de forma manual.

Eso indica que el SaaS aún tiene una operación interna/manual importante y no un billing completamente automatizado.

## 7. Flujo de onboarding de clínica

Si la clínica no tiene configuración mínima, aparece un modal obligatorio de onboarding.

La app exige como mínimo:

- nombre de la clínica,
- responsable/owner,
- al menos una vía de contacto.

Mientras falte eso:

- el usuario no entra libremente al resto,
- puede completar el setup,
- o cerrar sesión.

Cuando la clínica queda lista, la app intenta enviar un correo de bienvenida.

## 8. Módulos y páginas que sí existen hoy

## 8.1 Dashboard

Existe un dashboard ejecutivo con:

- métricas generales,
- próximas citas,
- recordatorios de vacunas,
- alertas de bajo stock,
- facturas recientes,
- acciones rápidas.

Se ve bastante funcional y ya conectado al negocio real.

## 8.2 Today / Operación del día

`/today` es uno de los centros más importantes de la app.

Reúne:

- citas del día,
- turnos sin cita,
- pacientes en espera,
- pacientes en atención,
- pacientes atendidos.

Permite:

- crear turnos rápidos,
- mover estados,
- iniciar atención,
- mandar al flujo de factura,
- regresar desde facturación mostrando confirmación.

Esto deja claro que la app no está pensada solo como agenda, sino como tablero operativo diario.

## 8.3 Turnos del día sin cita

Existe además un módulo separado `/today-turns` para gestionar turnos walk-in.

Hace cosas útiles:

- crear turnos por mascota existente o walk-in,
- moverlos entre estados,
- marcarlos como listos,
- notificar al dueño,
- eliminarlos.

Pero hay una señal importante: el enlace del sidebar está comentado. O sea:

- el módulo existe,
- funciona bastante,
- pero hoy no parece ser parte activa principal de la navegación.

Probablemente quedó reemplazado en parte por `/today`, o sigue en transición.

## 8.4 Clientes

El módulo de clientes permite:

- listar,
- crear,
- editar,
- eliminar,
- ver detalle,
- navegar a mascotas, citas e historial comercial del cliente.

La vista de detalle ya muestra:

- información del dueño,
- mascotas asociadas,
- citas recientes,
- facturas recientes,
- total gastado calculado.

Pendiente explícito en código:

- hay un comentario que indica intención de que el cliente pueda tener acceso a la app, pero esa parte no está terminada.

## 8.5 Mascotas / pacientes

El módulo de mascotas permite:

- CRUD de pacientes,
- ver detalle del paciente,
- ver historial clínico,
- registrar visitas,
- registrar vacunas,
- subir adjuntos médicos,
- consultar esquema de vacunación.

Esta parte ya representa un módulo clínico real, no solo administrativo.

### Huecos o señales de incompletitud en pacientes

- algunos tipos siguen con `any`,
- existen campos médicos esperados en tipos auxiliares que no están realmente respaldados por el esquema actual,
- en ciertos flujos hay alertas de éxito ubicadas de forma riesgosa y podrían dispararse incluso si hubo error.

## 8.6 Citas

El módulo de citas está bastante completo.

Incluye:

- agenda,
- vista calendario,
- vista lista,
- crear/editar/eliminar,
- tipos de cita,
- asignación de veterinario,
- validaciones de horario,
- validaciones de solapamiento,
- estado de recordatorios.

Además, hay un flujo público para confirmar citas mediante token:

- ruta pública `/confirm-appointment`,
- API de confirmación,
- soporte para recordatorios con confirmación pendiente.

## 8.7 Inventario

Inventario ya tiene dos capas:

- catálogo de productos,
- movimientos de stock.

Permite:

- crear/editar productos,
- manejar SKU,
- precio/costo,
- control de stock,
- mínimo de stock,
- movimientos manuales,
- alertas de bajo inventario.

Esto ya encaja con la facturación y la operación clínica.

## 8.8 Servicios

Existe un catálogo de servicios con:

- categorías,
- precios,
- activación/desactivación,
- edición completa.

Se usa luego en facturación y en parte de la operación diaria.

## 8.9 Facturación

Es uno de los módulos más desarrollados.

Tiene:

- listado de facturas,
- nueva factura tipo POS,
- detalle de factura,
- impresión,
- PDF,
- pagos,
- anulación,
- integración con citas,
- integración con turnos del día.

La pantalla de nueva factura soporta:

- cliente y mascota,
- servicios,
- productos,
- búsqueda por SKU/código,
- descuento,
- ITBIS,
- pago inmediato,
- método y referencia,
- regreso automático a `/today`.

### Hallazgos relevantes de madurez

- la creación de factura está bien aterrizada;
- hay mucho código comentado viejo en la página de nueva factura, señal de refactor aún no limpiado;
- la impresión tiene varias variantes, incluyendo ticket y A4.

## 8.10 Empleados, roles e invitaciones

Este módulo permite:

- ver miembros,
- invitar empleados,
- activar/desactivar miembros,
- cambiar roles,
- crear/editar roles,
- administrar permisos.

Las invitaciones incluyen:

- enlace,
- flujo de aceptación,
- asociación posterior del usuario con la clínica.

Esto confirma que la app ya tiene una base sólida de control interno por permisos.

## 8.11 Perfil del usuario

El usuario puede:

- ver y editar su perfil,
- subir avatar,
- cambiar teléfono, cargo y bio,
- cambiar contraseña,
- revocar otras sesiones.

El avatar usa almacenamiento privado con limpieza de archivos temporales cuando corresponde.

## 8.12 Perfil de clínica

La clínica puede configurar:

- nombre,
- slogan,
- owner,
- correo,
- teléfonos,
- dirección,
- web,
- redes sociales,
- datos fiscales,
- datos bancarios,
- horarios,
- notas y términos de factura,
- logo.

Esta pantalla es funcional y está conectada con permisos (`clinic.read` y `clinic.update`).

## 8.13 Admin de clínicas

El panel de super admin permite:

- ver todas las clínicas,
- ver responsable principal,
- activar/desactivar,
- editar datos administrativos,
- crear clínica nueva con owner inicial,
- entregar credenciales del owner recién creado.

Esto sugiere que el despliegue operativo todavía depende de administración interna del proveedor del sistema.

## 8.14 PWA y offline

La app ya registra `service worker` y tiene:

- `manifest`,
- registro automático,
- actualización forzada del SW,
- página `/offline`.

El modo offline existe, pero hoy parece básico:

- muestra pantalla de falta de conexión,
- avisa que algunas pantallas podrían seguir disponibles desde caché,
- no se ve una estrategia avanzada de sincronización offline bidireccional.

## 9. Qué hace por debajo aunque no siempre se vea en pantalla

## 9.1 Recordatorios y notificaciones

La app tiene un sistema de recordatorios de citas y seguimiento:

- cola/log de notificaciones,
- destinatarios,
- estados,
- cron,
- canal por email/WhatsApp/in-app/SMS a nivel de modelo.

Según el `README`, existe un proceso en `/api/notifications/process` y un cron en Vercel cada 15 minutos.

## 9.2 Archivos médicos y medios

Se pueden subir archivos, especialmente en contexto clínico:

- fotos/adjuntos para visitas,
- logo de clínica,
- avatar de usuario.

La app:

- firma cargas,
- resuelve URLs firmadas para lectura,
- elimina archivos reemplazados en ciertos casos.

## 9.3 Seguridad por clínica

Prácticamente toda la operación principal depende del contexto de clínica:

- clientes,
- mascotas,
- citas,
- turnos,
- productos,
- servicios,
- facturas,
- vacunas,
- visitas,
- roles,
- empleados.

Eso está bien alineado con un modelo SaaS por tenant.

## 10. Qué todavía falta o está a medio hacer

Esta es la parte más importante si quieres una visión honesta del estado actual.

### Funcionalidades claramente incompletas

- recuperación de contraseña desde login no está implementada de verdad;
- acceso del cliente final a la plataforma sigue siendo una intención, no una funcionalidad terminada;
- el módulo separado de `today-turns` existe pero no está expuesto en la navegación principal;
- la experiencia de aceptar invitación se siente menos terminada que el resto;
- el offline existe, pero no se ve como modo offline completo de trabajo.

### Inconsistencias técnicas o de producto

- branding mezclado entre `KiskeyaVet` y `Karey Vet`;
- mezcla de localizaciones/currency en distintas partes (`USD`, `DOP`, formatos `es-DO` y `es-BO`);
- restos grandes de código comentado en páginas importantes;
- existencia de rutas duplicadas con typo como `attatchments`;
- tipos y helpers con campos clínicos que ya no coinciden del todo con el esquema actual.

### Riesgos funcionales visibles en el código

- algunos flujos muestran alertas o mensajes con manejo mejorable;
- hay piezas de facturación y stock que merecen revisión fina para evitar desalineaciones cuando cambian pagos o movimientos;
- el modelo `PushSubscription` está restringido con `@@unique([clinicId])`, lo que hoy sugiere una sola suscripción push por clínica, no por usuario/dispositivo;
- `TodayTurn` no está ligado directamente a una factura en el esquema, así que parte de la trazabilidad entre atención rápida y cobro depende del flujo, no de una FK explícita.

## 11. Qué intención de producto se puede inferir

Por el código, la intención no parece ser un simple CRUD veterinario.

La dirección del producto apunta a:

- un SaaS multiclínica,
- con operación diaria muy centrada en recepción + consulta + caja,
- con recordatorios automáticos,
- con clínica configurando su identidad y facturación,
- con permisos por rol,
- y con expansión futura hacia experiencia más completa del cliente final.

También se nota intención de producto comercial real:

- panel super admin,
- estados de suscripción,
- plan,
- control manual de activación,
- owner inicial por clínica.

## 12. Resumen ejecutivo honesto

Si hubiera que resumir el estado actual en una frase:

La app ya funciona como sistema operativo interno para una clínica veterinaria, especialmente en agenda, pacientes, facturación, inventario y personal, pero todavía no está completamente pulida ni cerrada como producto final.

Lo más maduro hoy:

- autenticación y shell principal,
- multiclínica básica,
- citas,
- operación del día,
- clientes y mascotas,
- historial clínico básico,
- facturación,
- inventario,
- empleados y permisos,
- perfil de clínica.

Lo menos cerrado hoy:

- experiencia del cliente final,
- recuperación de contraseña,
- limpieza de legado técnico,
- consistencia global de branding/moneda/localización,
- cierre de algunos módulos paralelos o heredados.

## 13. Conclusión

Hoy la app ya resuelve buena parte del trabajo cotidiano de una veterinaria. No está “vacía” ni “solo maquetada”: hay dominio, reglas, permisos, APIs, datos y flujos reales.

Pero sigue siendo una app en evolución. Está en una fase donde ya sirve para operar, mientras todavía arrastra decisiones viejas, refactors incompletos y varias piezas que necesitan consolidarse para quedar como producto plenamente terminado.
