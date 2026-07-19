# Plan de desarrollo — MVP

Este documento es el handoff operativo para desarrollo. Implementar por hitos y abrir una PR por hito. La PM revisa alcance, seguridad, simplicidad y criterios de aceptación antes de fusionar.

## 1. Objetivo

Entregar una versión `0.1` que complete una misión real entre dos teléfonos mediante WhatsApp, sin almacenar la prueba y sin intervención manual del equipo.

## 2. Decisiones cerradas

- Backend monolítico en Node.js con TypeScript y Fastify.
- PostgreSQL; Supabase es válido como proveedor.
- Integración oficial con WhatsApp Cloud API.
- Un único proceso programado para recordatorios durante el MVP.
- Sin Redis, colas externas, microservicios, IA, audio, panel ni pagos.
- La prueba viaja directamente del ahijado a la madrina. El backend no recibe ni guarda archivos.
- Los secretos viven únicamente en variables de entorno.
- Ningún servicio pago se incorpora sin aprobación previa.

## 3. Flujo funcional obligatorio

1. La madrina inicia el bot y acepta términos básicos.
2. Invita al ahijado mediante un vínculo de un solo uso.
3. El ahijado acepta el vínculo y los mensajes.
4. La madrina crea un goal mediante pasos simples:
   - qué debe hacer;
   - fecha y hora límite;
   - qué prueba debe enviar directamente.
5. El ahijado recibe y acepta el goal.
6. El bot envía el recordatorio correspondiente.
7. El ahijado toca `Prueba enviada` después de enviarla por su chat privado.
8. La madrina recibe `Aprobar`, `No aprobar` y `Pedir otra prueba`.
9. Ambos reciben el estado final.
10. Si vence sin reporte, el sistema marca `Vencida` y avisa.

## 4. Estados

Usar una máquina de estados explícita. No repartir reglas de transición por handlers.

```text
pending_acceptance
active
proof_reported
needs_more_proof
approved
not_approved
expired
cancelled
```

Transiciones inválidas deben rechazarse sin modificar datos. Webhooks repetidos no pueden duplicar vínculos, goals, avisos ni decisiones.

## 5. Modelo de datos mínimo

- `users`: teléfono, idioma, consentimiento y fecha de baja.
- `relationships`: madrina, ahijado, estado y fechas.
- `goals`: vínculo, descripción, indicación de prueba, recurrencia y estado.
- `occurrences`: vencimiento, estado, reporte y decisión.
- `events`: identificador externo único y auditoría mínima.

No guardar medios, cuerpos completos de mensajes ni información sensible en logs. Agregar índices solo para claves, búsquedas reales y control de idempotencia.

## 6. Roadmap técnico

### Hito 0 — Conexión real

Construir:

- proyecto TypeScript mínimo;
- endpoint de salud;
- verificación del webhook;
- recepción idempotente de mensajes;
- envío de un mensaje de prueba dentro y fuera de la ventana de servicio;
- una plantilla `utility` aprobada con un goal sintético;
- documentación del flujo permitido por las políticas vigentes de Meta;
- configuración mediante `.env.example`.

Criterio de aceptación: dos teléfonos de prueba pueden interactuar con el número de WhatsApp, recibir el goal sintético y el backend procesa cada evento una sola vez. No continuar si Meta impide este intercambio; primero se redefine el flujo.

### Hito 1 — Goal único de punta a punta

Construir:

- consentimiento e invitación de un solo uso;
- vínculo madrina-ahijado;
- creación guiada de un goal único;
- aceptación del ahijado;
- `Prueba enviada`;
- decisión de la madrina;
- estado final para ambos.

Criterio de aceptación: una pareja nueva completa el recorrido sin intervención del equipo y sin que el backend reciba la foto.

### Hito 2 — Plazos y recurrencia

Construir:

- recordatorio antes del vencimiento;
- vencimiento automático;
- goals semanales en días seleccionados;
- generación idempotente de ocurrencias;
- cancelación y pausa.

Criterio de aceptación: funciona una rutina como `lunes, miércoles y viernes antes de las 20` sin avisos duplicados.

### Hito 3 — Preparación del piloto

Construir:

- comandos de ayuda, baja y eliminación de datos;
- reintentos limitados ante errores de Meta;
- métricas internas sin herramientas externas;
- historial breve por relación;
- mensajes comprensibles ante estados inválidos;
- documentación de despliegue y recuperación.

Criterio de aceptación: 10–20 parejas pueden usarlo cuatro semanas sin soporte técnico diario.

## 7. Pruebas obligatorias

- Transiciones válidas e inválidas de la máquina de estados.
- Idempotencia de webhooks y recordatorios.
- Consentimiento de ambas personas antes de enviar mensajes.
- Expiración de invitaciones.
- Goal aprobado, no aprobado, prueba adicional, vencido y cancelado.
- Fallo temporal de WhatsApp sin pérdida ni duplicación.
- Eliminación de los datos de una relación.

Primero ejecutar pruebas del área modificada; antes de cada PR, ejecutar la suite completa.

## 8. Seguridad y privacidad

- Validar la firma o mecanismo oficial de autenticidad de webhooks.
- Nunca registrar tokens, teléfonos completos, texto sensible o medios.
- Usar consultas parametrizadas y validación de entrada.
- Ambos participantes deben poder detener mensajes.
- El sistema no ofrece supervisión médica ni atención de emergencias.
- El goal puede ser texto libre, pero el producto no debe interpretar ni validar medicación.
- No asumir que Meta permite redistribuir contenido entre usuarios: el Hito 0 debe demostrar el flujo exacto con consentimiento y plantillas aprobadas.

## 9. Métricas del piloto

- Invitaciones aceptadas.
- Parejas activas por semana.
- Goals creados y ocurrencias generadas.
- Pruebas reportadas.
- Ocurrencias aprobadas.
- Tiempo entre reporte y decisión.
- Retención semanal de la pareja.

Métrica principal: ocurrencias aprobadas por pareja activa por semana.

## 10. Protocolo de entrega del dev

Cada hito debe llegar en una rama y PR separada con:

- qué criterio de aceptación cubre;
- archivos modificados;
- pruebas ejecutadas y resultado;
- decisión técnica no obvia;
- riesgo o deuda concreta, si existe.

No incluir recorridos de archivos, logs extensos, explicaciones genéricas ni trabajo futuro especulativo.

## 11. Checklist adversarial de la PM

Antes de aprobar una PR, verificar:

- ¿Cumple el flujo sin agregar otra interfaz?
- ¿Existe una solución más pequeña usando código ya presente?
- ¿Agregó una dependencia, tabla o abstracción sin necesidad actual?
- ¿Puede repetir eventos o enviar mensajes duplicados?
- ¿Guarda contenido o datos que no necesita?
- ¿Una transición inválida deja el estado inconsistente?
- ¿Las pruebas demuestran el criterio de aceptación?
- ¿Aumenta costos operativos o de WhatsApp sin aprobación?

## 12. Orden de inicio

El dev comienza únicamente por el Hito 0. No modelar recurrencias, pagos, paneles ni funcionalidades posteriores hasta probar el intercambio real entre dos teléfonos.
