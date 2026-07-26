# Tu Madrina — Plan de ejecución

> Fecha: 26/7/2026. Asume 12 h/semana de trabajo del dueño (no programador, escribe código con asistentes de IA).
> Este documento es el plan operativo. La fuente de alcance funcional sigue siendo `PLAN_DEV.md`.

---

## 0. La fecha que ordena todo el plan

**El 1/10/2026 Meta empieza a cobrar todos los mensajes salientes**, incluidas las respuestas de texto libre dentro de la ventana de 24 h. Las tarifas nuevas se publican alrededor del **1/9/2026**.

Dos consecuencias directas:

1. La palanca de costo deja de ser *qué categoría de mensaje mandás* y pasa a ser **cuántos mensajes mandás**. Montar la conversación en la ventana abierta sigue siendo mejor (no requiere plantilla aprobada, no pasa por revisión de Meta), pero ya no es gratis.
2. **El piloto tiene que estar corriendo antes del 1/10.** Aprender con mensajería gratis o casi es una ventaja de una sola vez.

---

## 1. Decisiones cerradas (no se re-discuten)

**Producto**

1. La app nunca juzga la tarea. Solo la madrina decide.
2. El backend nunca recibe ni guarda multimedia. La prueba va del ahijado a la madrina por su chat privado.
3. El ahijado propone el goal; no existe hasta que la madrina lo ratifica con un toque. Una vez ratificado no se edita: se cancela, y la cancelación queda visible en el registro.
4. Recordatorios a ambos.
5. Plazo de decisión de la madrina = vencimiento de la próxima ocurrencia (o +24 h si el goal es único). Sin constantes arbitrarias.
6. Al tocar "Prueba enviada", el ahijado recibe **cuándo** esperar respuesta.
7. Resumen semanal (domingo) a ambos. Reemplaza los avisos individuales de no-aprobado y de vencido.
8. Sin castigo, sin plata en juego, sin rachas, sin gamificación. La recompensa es el mensaje de aprobación.
9. Lenguaje sin juicio en la UX ("Recibí la foto" / "Todavía no" / "Mandame otra"); los estados internos pueden seguir llamándose `not_approved`.
10. La madrina se compromete por ciclos finitos de 4 semanas, renovables. **La métrica principal del negocio es el % de madrinas que renueva.**
11. Tope de 1 re-pedido de prueba por ocurrencia, con plazo nuevo calculado por la misma función.
12. Cero IA en el producto: campos estructurados con botones/listas, texto libre guardado y mostrado tal cual (el que lo lee es un humano).

**Técnicas**

13. Node + TypeScript + Fastify, monolito. PostgreSQL. Un solo proceso. Sin Redis, sin colas, sin panel web, sin app.
14. WhatsApp Cloud API directo de Meta, sin BSP.
15. Máquina de estados explícita y centralizada. Webhooks idempotentes.

---

## 2. Trámites externos (día 1, antes de una línea de código)

| # | Trámite | Demora | ¿Bloquea el piloto? |
|---|---|---|---|
| B1 | Verificación de negocio (Meta Business → Security Center). Constancia de inscripción ARCA con CUIT + comprobante de domicilio. **El nombre legal debe coincidir exacto con el del Portfolio** | 2–10 días hábiles | **No.** Solo bloquea escalar arriba de 250 conversaciones iniciadas por el negocio / 24 h |
| B2 | SIM prepaga nueva (~US$5 + recarga) | 1 día | Sí, para el número productivo (semana 4) |
| B3 | Landing + política de privacidad + términos, con la marca "Tu Madrina" visible (GitHub Pages + dominio, ~US$12/año) | 2 h | Sí: Meta exige URL de privacidad y coteja que la marca exista |
| B4 | Tarjeta de crédito internacional en la cuenta de WhatsApp | 1 h | Sí, para cualquier envío pago |

**Qué NO sirve como número:** tu número personal si ya tiene WhatsApp; un número ya registrado en WhatsApp Business App; números virtuales/VoIP (fallan el OTP o quedan marcados); un número ya asignado a otra WABA. Tiene que poder recibir SMS o llamada.

**Sin demora, el mismo día:** Meta Business Portfolio · app de Meta tipo *Business* con producto WhatsApp · **número de prueba gratis** (hasta 5 destinatarios verificados con OTP; alcanza para todo el desarrollo y el dogfood, y no cuesta nada) · **token permanente vía System User** con `whatsapp_business_messaging` + `whatsapp_business_management` (nunca el token temporal de 24 h) · webhook con `verify_token` propio, suscripto a `messages`, `phone_number_quality_update`, `account_update`, `message_template_status_update` · display name (revisión de minutos a 48 h).

**Límites iniciales:** 250 conversaciones iniciadas por el negocio / 24 h. Con 10 parejas y 3 ocurrencias semanales necesitás ~9 proactivos por día: estás 27× abajo del techo. No es un problema hasta ~250 parejas.

**Plantillas:** 5, a aprobación en la semana 3 (no antes: cambian mientras diseñás). Aprobación típica de 5 min a 24 h.

---

## 3. Regla de onboarding que impone Meta (y que hay que respetar desde el día 1)

Meta exige consentimiento explícito recolectado **fuera de WhatsApp** antes del primer mensaje proactivo. Que alguien te pase un número **no es opt-in válido**.

**Regla general: tu número nunca manda el primer mensaje a nadie.** Todo participante nuevo entra tocando un link `wa.me/<numero>?text=...` que le reenvía la otra persona **por su chat personal**. Su mensaje entrante abre la ventana de 24 h y ahí el bot le contesta con un mensaje de sesión interactivo.

Aplica en las dos direcciones:
- El ahijado le manda el link a la madrina para que ratifique.
- La madrina le manda el link al ahijado cuando la relación arranca por ella.

Beneficio extra: elimina una plantilla de invitación del onboarding (justo la que Meta tiende a clasificar como *marketing* y a rechazar).

Rehacer esto después es rehacer el registro entero.

---

## 4. Stack

| Capa | Elección | Por qué | US$/mes |
|---|---|---|---|
| Runtime | Node 22 LTS + TypeScript 5 **strict** + Fastify 5 | `strict: true` es el único revisor siempre despierto sobre código escrito por IA | 0 |
| Hosting | **Railway Hobby** | Ya lo sabés operar. Proceso siempre prendido (el tick lo necesita), deploy desde `main`, rollback de un click. Descartado Render free: se duerme y perdés webhooks. Descartado Fly.io: CLI-first | 5–10 |
| Base | Postgres administrado de Railway, mismo proyecto | Un solo panel, `DATABASE_URL` inyectada. Descartado Supabase free: **se pausa a los 7 días de inactividad**, mortal para un bot que duerme entre recordatorios | 5–10 |
| Base de dev | Segundo Postgres en Railway | Evita instalar Docker en la laptop | 1–3 |
| Datos | **Prisma 6** | Migraciones de un comando; **Prisma Studio es tu panel de admin, gratis**; los asistentes de IA lo escriben con poco error | 0 |
| Scheduler | **`setInterval` de 60 s en el mismo proceso** (`tick()`), no `node-cron` | No hay expresión cron que sobreviva a zonas horarias por usuario. El tick barre `occurrences` con `due_at <= now()`. Idempotente y se recupera solo tras un reinicio | 0 |
| Validación | zod | Para parsear el payload anidado del webhook de Meta en un tipo propio, en un solo archivo | 0 |
| Fechas | **luxon** | `America/Argentina/Buenos_Aires` de verdad. No usar `Date` nativo | 0 |
| Logs | pino (viene con Fastify) | El log de negocio real es la tabla `events` | 0 |
| Errores | Sentry free | Te avisa por mail cuando el proceso explota. Sin esto un bug silencioso te come el piloto | 0 |
| Tests | vitest + `fastify.inject()` + **adaptador WhatsApp falso** + **reloj inyectable** | Lo más importante del stack: te deja probar 4 semanas de producto en 2 segundos, sin teléfonos | 0 |
| Túnel local | cloudflared quick tunnel | HTTPS público para probar webhooks desde la laptop, sin cuenta | 0 |
| CI | GitHub Actions: `tsc --noEmit` + `vitest run` | 20 líneas de YAML. Rojo = no se mergea | 0 |
| | | **Total** | **11–23** |

---

## 5. Arquitectura: las cuatro reglas que no se negocian

1. **Lógica de negocio pura.** `transition(occurrence, event, now) → { nextState, effects[] }` en `src/domain/`. Los `effects` son descripciones de mensajes, no envíos. El I/O (Meta, Postgres) vive solo en los bordes. Así el 90% del producto se testea sin teléfonos y sin base.
2. **Una sola puerta de salida.** `interface WhatsAppPort { send(msg) }`, con dos implementaciones (real y falsa) y el canal como dato de configuración por usuario. Es lo único que te salva el día que Meta te suba el precio o te baje el número — el plan B es push de PWA, costo marginal cero.
3. **Sesión vs plantilla se decide con `users.last_inbound_at`, y con nada más.** El toque de un botón (incluso de plantilla) abre la ventana de 24 h; los callbacks `delivered`/`read` **no** la abren. No mires los status callbacks para esto.
4. **Imposibilidad física de duplicar**, en cuatro capas de una línea cada una:
   - `UNIQUE (external_id)` en `events` → un webhook repetido no puede tener efecto (y respondés 200 igual).
   - **Índice único parcial** `ON events (occurrence_id, kind) WHERE direction='out'` → no se puede mandar dos veces el mismo mensaje de la misma ocurrencia, corran los procesos que corran. **Esta es la defensa que importa.**
   - `pg_try_advisory_lock(1)` al empezar cada `tick()`; si no lo obtiene, no hace nada (Railway solapa instancias en el deploy).
   - Claim atómico: `UPDATE occurrences SET reminder_sent_at = now() WHERE id = $1 AND reminder_sent_at IS NULL RETURNING id`.

**Archivos, en orden de escritura:**

```
prisma/schema.prisma          # 5 tablas + índices únicos
src/env.ts                    # zod sobre process.env; falla al arrancar si falta algo
src/domain/states.ts          # los 8 estados + transiciones legales
src/domain/machine.ts         # transition() pura  <-- el corazón
src/domain/deadlines.ts       # computeDecisionDeadline(), nextOccurrence() (luxon)
src/domain/messages.ts        # los 8 mensajes como funciones puras
src/wa/client.ts              # interface WhatsAppPort
src/wa/cloud.ts               # implementación real (fetch a graph.facebook.com)
src/wa/fake.ts                # implementación de test
src/wa/verify.ts              # X-Hub-Signature-256 con APP_SECRET
src/http/webhook.ts           # GET handshake + POST: persistir crudo, procesar, 200 SIEMPRE
src/http/admin.ts             # GET /admin/state?token= y POST /admin/pair
src/scheduler/tick.ts         # advisory lock + barrido + claim atómico
tests/scenarios.test.ts       # los 8 escenarios dorados
```

**Modelo de datos:** `users` (teléfono, **timezone**, consentimiento, baja) · `relationships` (madrina, ahijado, estado, `cycle_ends_at`) · `goals` (`description_raw`, `proof_hint_raw`, recurrencia, estado) · `occurrences` (`due_at`, `decision_deadline_at`, `reproof_count`, estado) · `events` (`external_id` único, dirección, tipo, auditoría mínima). Sin medios, sin cuerpos completos de mensajes, sin datos sensibles en logs.

---

## 6. Los 8 mensajes

Restricciones de WhatsApp que condicionan el texto: **máximo 3 botones**, título de botón **≤20 caracteres**, cuerpo ≤1024. En plantillas el cuerpo no puede empezar ni terminar con variable ni tener dos variables pegadas. **La descripción del goal se limita a 120 caracteres** para que entre en una plantilla sin rechazo.

Ejemplo usado: ahijado Julián, madrina Ana, goal «Limpiar la cocina 2 veces por semana, antes de las 20», prueba «Me manda una foto de la mesada».

### M1 — Ratificación → madrina · **sesión**

> Hola Ana. Soy el bot de Tu Madrina. Julián te eligió a vos para que le confirmes que hizo algo, y me pidió que te escriba.
>
> Se propuso esto: «Limpiar la cocina 2 veces por semana, antes de las 20».
> Y así te lo va a mostrar: «Me manda una foto de la mesada».
>
> Ojo con esto: **las fotos te llegan a tu chat con Julián, nunca por acá. Yo no las veo ni las guardo, y no opino sobre si está bien hecho. Eso lo decidís vos.**
>
> Tu parte son 2 avisos por semana y un toque en cada uno. Nada más, durante 4 semanas. Cuando se cumplan, te pregunto si querés seguir.
>
> ¿Te lo tomo como compromiso?

`[Sí, dale]` `[Cambiarlo]` `[No puedo]`

El encuadre del ciclo finito va **antes** del sí, no en la letra chica. "Cambiarlo" cancela la propuesta con motivo registrado; durante el piloto lo resolvés a mano.

### M2 — Ana aceptó → ahijado · **sesión** (o plantilla puerta M-P)

> Ana te dijo que sí.
>
> Queda así: «Limpiar la cocina 2 veces por semana, antes de las 20». Lunes y jueves.
>
> El lunes a las 18 te escribo yo. Vos le mandás la foto a Ana **por tu chat con ella** y volvés acá a tocar el botón. Eso es todo.
>
> Una cosa: esto ya no se edita. Si no va más, se cancela y queda anotado que se canceló.

`[Entendido]` — el botón no hace nada funcional, pero el toque es un entrante que refresca su ventana.

### M3 — Recordatorio → ahijado · **plantilla utility** (`recordatorio_prueba`) · proactivo 1 de 2

> Hoy toca: **{{1}}**. Tenés hasta las {{2}}.
> Mandale la prueba a {{3}} por tu chat con ella, y volvé acá a tocar el botón.

`[Prueba enviada]`

### M4 — Confirmación con plazo → ahijado · **sesión**

> Listo. Le avisé a Ana.
>
> Te contesta antes de **mañana a las 20**. Si te pide otra foto, te aviso por acá.

Sin botones. El "mañana a las 20" se **calcula**: vencimiento de la próxima ocurrencia, o +24 h si el goal es único.

### M5 — Prueba pendiente → madrina · **plantilla utility** (`prueba_pendiente`) · proactivo 2 de 2

> {{1}} dice que ya hizo «{{2}}» y que te mandó la prueba.
> Mirá tu chat con él y decime qué ves. Si lo tenés por hecho, tocá «Recibí la foto».
> Si no me contestás antes del {{3}}, la doy por cerrada sin respuesta.

`[Recibí la foto]` `[Mandame otra]` `[Todavía no]`

**Cuando ella toca un botón no se le contesta nada.** Su propio toque aparece en el chat como mensaje suyo: ese es el acuse. Ahorra ~12 mensajes facturables por pareja por mes (~25% de la factura).

### M6 — La aprobación → ahijado · **sesión** (o plantilla puerta) · **el mensaje más importante del producto**

> Ana vio la foto y me dijo que está.
>
> No te lo digo yo, que soy un programa. Te lo dice ella, que se tomó el trabajo de mirar.
>
> La cocina, jueves 30 de julio. Dos de dos esta semana.

Único mensaje sin botón y sin nada que hacer. No dice "Estado: aprobada", no da puntos: nombra a la persona que lo vio. Si esto no genera nada en el ahijado, el producto no existe.

### M7 — Mandame otra → ahijado · **sesión** (o plantilla puerta)

> Ana te pide otra foto: con esa no le alcanzó.
>
> Mandásela y volvé a tocar el botón. Tenés hasta **mañana a las 20**.
>
> Es la única vez que te la puede volver a pedir por esta.

`[Prueba enviada]` · `reproof_count` máximo 1; un segundo "Mandame otra" se ignora y la ocurrencia sigue con su plazo original.

**"Todavía no" no genera ningún mensaje al ahijado.** La ocurrencia va a `not_approved` y aparece el domingo en M8. Silencio en vez de un push de rechazo: coherente con "sin castigo", y gratis.

### M8 — Resumen del domingo → ambos · **plantilla utility** (`resumen_semanal`)

Al ahijado: *"Resumen de la semana (27/7 al 2/8): 2 de 3. La cocina viene 3 semanas sin cerrar. Mañana arranca otra."*

A la madrina: *"Resumen de la semana (27/7 al 2/8): Julián cerró 2 de 3. Una quedó sin respuesta tuya. Te quedan 2 semanas de las 4."*

**Variante de semana 4, plantilla aparte** (`renovacion_ciclo`, porque los botones de una plantilla son fijos), solo a la madrina:

> Se terminaron las 4 semanas ({{1}}). Julián cerró {{2}}.
> ¿Seguís otras 4?

`[Sí, otras 4]` `[Pará por ahora]` — este mensaje produce la métrica principal del negocio.

### M-P — Plantilla puerta · **plantilla utility** (`aviso_respuesta`)

Solo cuando la ventana del ahijado está cerrada:

> {{1}} te respondió sobre «{{2}}».
> Tocá abajo y te lo cuento.

`[Ver qué dijo]` — el toque abre la ventana y recién ahí sale M2 / M6 / M7 completo, en texto libre. Cuesta 1 mensaje extra en el camino raro, pero mantiene la carga emocional de M6 fuera de una plantilla con variables. **Instrumentar `pct_fuera_de_ventana` desde el hito 1: si pasa 25%, hay que mover los horarios.**

**Plantillas a aprobar: 5** — `recordatorio_prueba`, `prueba_pendiente`, `resumen_semanal`, `renovacion_ciclo`, `aviso_respuesta`. Todas Utility, redactadas como avisos de servicio sobre un acuerdo que el usuario configuró, **nunca como arenga motivacional** (eso las manda a Marketing, que cuesta un orden de magnitud más). Si `renovacion_ciclo` cae en Marketing, mandala solo dentro de la ventana de la madrina.

---

## 7. Hitos y criterios de aceptación

| Hito | Contenido | Criterio verificable sin leer código |
|---|---|---|
| **0** — Conexión | Fastify en Railway, webhook verificado, firma validada, `events` con `external_id` único, echo con botones | Mandás "hola" al **número de prueba** y recibís 3 botones. Tocás uno → **una** fila en `events` (Prisma Studio). Reenviás el mismo POST con curl → no se crea otra fila. **HTTP 200 en <5 s siempre, incluso si el procesamiento falla** |
| **0.5** — Armazón de test | `WhatsAppPort` + `fake.ts` + reloj inyectable + 1 escenario | `pnpm test` corre en <5 s e imprime la lista exacta de mensajes que el bot habría mandado, en orden |
| **1** — Goal único | `pending_acceptance → active → proof_reported → approved`. M1, M2, M4, M6. Pareja creada con `POST /admin/pair` | Dos celulares: la madrina toca el `wa.me`, recibe M1, toca "Sí, dale"; el ahijado recibe M2, toca "Prueba enviada", recibe M4; la madrina recibe M5 y toca "Recibí la foto"; el ahijado recibe M6. **Cero bytes de multimedia en la base y cero llamadas al endpoint `/media` de Meta** |
| **2a** — Plazos y finales | `computeDecisionDeadline()`, tope de re-prueba, `expired`, `not_approved`, `cancelled`, timezone por usuario | **Test de reloj falso que corre 4 semanas en 2 segundos** con los 8 escenarios dorados: feliz; una re-prueba → aprobada; segunda re-prueba → rechazada; silencio de la madrina → `expired`; el ahijado nunca reporta → `expired`; "No puedo" → `cancelled` visible en el registro; webhook duplicado → sin efecto; ventana cerrada → usa M-P. **Los 8 verdes** |
| **2b** — Recurrencia y proactivos reales | Ocurrencias semanales, ciclo de 4 semanas, resumen del domingo, 5 plantillas aprobadas, número productivo, cutover | Un celular que no escribió en 24 h recibe el recordatorio a la hora esperada. `GET /admin/state` muestra `cycle_ends_at` correcto. En Insights de Meta el gasto del día = **exactamente 2 proactivos por ocurrencia** |
| **3** — Dogfood | Vos como ahijado + 2 parejas amigas, 1 semana | **7 días corridos sin tocar la base ni reiniciar el proceso a mano.** Si intervenís una vez, se reinicia el contador |
| **4** — Piloto | 10 parejas, 1 ciclo de 4 semanas | Ver §10 |

---

## 8. Validación a mano, en paralelo al código (semanas 1 y 2)

No consume horas de desarrollo: son ~20 minutos por día. Y **el piloto sale de acá**: las mismas parejas migran al bot en la semana 6, así que esto es reclutamiento y validación a la vez.

**5 parejas, madrina = conviviente** (compañero de piso o pareja). Es la única madrina de CAC cero **con interés propio**: la cocina sucia le molesta a ella. Eso sustituye a la plata que sacamos del medio y es lo único que hace creíble el "Todavía no". La mamá aprueba todo; el amigo aprueba para no hacer lío.

- **D1** — Escribís los 8 textos definitivos (son los que después subís como plantillas) y armás la planilla: par, goal, días, log de eventos con timestamp.
- **D2** — 20 min por **madrina** (no por ahijado). Tres preguntas: quién es tu ahijado, qué tarea, y "si esto costara $X, quién lo paga". La pregunta de precio va ahora, antes de que reciba valor, para que no esté anclada.
- **D3** — La madrina tiene que lograr que su ahijado acepte. **Si más del 30% no lo logra, la hipótesis del anuncio a la madrina se cayó el día 3 y salió $0.**
- **D4–D14** — Operás a mano: recordatorio 2 h antes, registrás el "prueba enviada", pingueás a la madrina, registrás veredicto y hora. **Cada vez que una madrina no contesta en 6 h, la llamás y anotás la razón textual.** Ese cuaderno vale más que el código.
- **D7 y D14** — Link de MercadoPago real. La intención declarada no cuenta.
- **D11** — Apagón a propósito en 2 parejas. Si nadie pregunta, no hay valor percibido.

**Honestidad sobre este ejercicio:** la madrina le contesta al fundador que le escribió personalmente por educación, y a un bot no. Los resultados buenos no validan nada; los malos archivan. Es un test de descarte.

**En paralelo, 10 llamadas de 15 min** a coaches de TDAH, terapistas ocupacionales y nutricionistas. Es la conversación que decide si existe un negocio (§11) y no requiere una línea de código.

---

## 9. Costos

**Mes 1** (desarrollo + dogfood con el número de prueba, que es gratis): Railway 5–10 · Postgres de dev 1–3 · dominio 1 · Sentry 0 · mensajería **0** · SIM 3 (+5 único) = **US$10–17/mes**.

**A 100 parejas.** Por ocurrencia salen 4 mensajes (M3 plantilla, M4 sesión, M5 plantilla, M6 sesión). Con 3 ocurrencias semanales + 2 resúmenes el domingo = 14/semana ≈ **60/mes por pareja** = 6.000 mensajes/mes.

| Tarifa por mensaje (Argentina, **a confirmar en el rate card del 1/9/2026**) | Mensajería | Infra | Total | Por pareja |
|---|---|---|---|---|
| ~US$0,005 | 30 | 20 | **50** | **US$0,50** |
| ~US$0,014 | 84 | 20 | **104** | **US$1,04** |
| ~US$0,03 | 180 | 20 | **200** | **US$2,00** |

**El objetivo de ~US$1/pareja/mes se cumple solo si la tarifa queda en o abajo de ~US$0,016.** El rango publicado por país va de ~US$0,0008 a ~US$0,055, y Argentina pasó a facturarse en ARS el 1/4/2026: confirmalo el 1/9, no antes. Sumá ~21% de IVA y percepciones sobre el gasto en USD con tarjeta local.

**Palancas si la tarifa sale más alta**, en orden de menor daño:
1. Resumen del domingo solo a la madrina (−7%).
2. Default de 2 ocurrencias semanales en vez de 3 (−27%).
3. Fusionar M4 dentro de M3 (−20%, rompe la decisión 6: última opción).
4. **M6 no se toca nunca. Es el producto.**

---

## 10. Criterios de muerte

| # | Corte | Umbral | Fecha |
|---|---|---|---|
| M1 | Reclutamiento | Menos de **10 parejas** con las dos partes aceptando, después de 3 semanas pidiendo a mano | 6/9/2026 |
| M2 | Ratificación | Menos del **60%** de las madrinas invitadas toca "Sí, dale" en 48 h | continuo |
| M3 | La madrina sostiene | Más del **50%** de las ocurrencias reportadas termina en `expired` por silencio de la madrina | semanal |
| M4 | **Renovación (la métrica principal)** | Menos de **4 de 10** madrinas tocan "Sí, otras 4" | ~5/10/2026 |
| M5 | Costo | Arriba de **US$3/pareja/mes** con el rate card de octubre, sin palanca que lo baje sin romper el producto | 1/10/2026 |
| M6 | Fecha | Si el **1/10/2026** llegás sin 10 parejas corriendo, se archiva aunque el código esté lindo | 1/10/2026 |

Zona intermedia en M4: 4–6 de 10 → un ciclo más con **un** cambio grande, no cinco chicos. 7 o más → seguí e invertí en el wizard.

**No es criterio de muerte que los ahijados cumplan poco.** Un ahijado que cierra 1 de 3 y cuya madrina renueva es un producto que funciona: la hipótesis es sobre la madrina.

**Regla dura de largo plazo:** si a los 6 meses no hay al menos 5 profesionales pagando, se archiva sin discusión.

---

## 11. Qué se corta

1. **El wizard interactivo de creación de goal.** Es lo más caro del producto y lo menos informativo. Reemplazo: el ahijado te propone el goal a vos por tu WhatsApp personal y lo cargás con `POST /admin/pair` (un curl con JSON). La decisión 3 se respeta íntegra: él propone, la madrina ratifica con un toque, que es el paso que valida la hipótesis. **Ahorro ~10 h**, y encima escuchás cómo la gente describe sus goals de verdad antes de diseñar el wizard.
2. **Panel web** → Prisma Studio + `GET /admin/state?token=`.
3. **Editar un goal** → solo cancelar (decisión 3).
4. **Multimedia, de cualquier tipo, para siempre.** Si el ahijado le manda una foto al bot: se descarta sin descargar y se responde *"Esa foto va a Ana, no a mí. Yo no las veo."*
5. **Renovación automática del ciclo.** El botón escribe un evento y vos creás el ciclo siguiente a mano. Automatizar una renovación antes de saber si alguien renueva es escribir código para un caso que quizá no ocurre.
6. **Avisos individuales de no-aprobado y de vencido** → al resumen del domingo (decisión 7).
7. Multi-ahijado por madrina, multi-goal por relación, pausas, cambio de madrina, i18n, login, pagos dentro del producto, rachas, puntos.
8. **Reintentos sofisticados.** Error de Meta → se anota en `events`, el tick reintenta 3 veces cada 60 s y abandona. Sin backoff exponencial, sin dead letter queue.

---

## 12. Riesgos

**R1 — El mensaje de aprobación (M6) cae fuera de la ventana de 24 h.** Es el mensaje más importante y es el único cuyo timing no controlás: depende de cuándo decide la madrina. Mitigación: la plantilla puerta M-P + instrumentar `pct_fuera_de_ventana` desde el hito 1. Si pasa 25% en el dogfood, acercás M3 al vencimiento y disparás M5 inmediatamente para comprimir la ventana de decisión.

**R2 — Calidad del número y rechazo de plantillas.** Tu patrón de tráfico es exactamente el que Meta castiga: proactivos frecuentes a gente que a veces no contesta, sobre algo que no hizo. Arriba de ~2–3% de bloqueos caés a amarillo/rojo, te congelan el tier y te pueden pausar plantillas en medio del piloto. Mitigación: (a) nada proactivo a quien no ratificó explícitamente; (b) webhooks de calidad y de estado de plantilla guardados en `events` con alerta de Sentry, para enterarte en minutos y no en días; (c) **tope duro de 2 recordatorios sin respuesta y paras**, más "Pará por ahora" que corta todo lo proactivo en el acto; (d) cero envíos a una pareja con 0 respuestas en 7 días; (e) mantener el número de prueba vivo como plan B de desarrollo. **Nota incómoda: el tope que Meta te obliga a poner limita justamente la insistencia que vendés.**

**R3 — Duplicados y horas mal calculadas.** Los tres producen el mismo síntoma vergonzoso (el mismo recordatorio dos veces): Railway solapa instancias en el deploy, Meta reintenta webhooks, y "antes de las 20" con `Date` nativo en un contenedor en UTC dispara a las 17. Mitigación: las cuatro capas de §5.4, todos los `due_at` en `timestamptz` UTC calculados con luxon desde `users.timezone`, y un test dorado con un usuario en Buenos Aires y otro en Madrid que verifica que las horas límite son distintas en UTC.

**R4 — Un solo número es un solo punto de falla de la empresa.** Dos números desde el día 1 (test y producción) y nunca probás en producción.

**R5 — El canal.** Si Meta rechaza el flujo o el costo se vuelve inviable, el plan B es **PWA con push**: costo marginal cero, botones nativos, funciona bien en Android; en iOS exige "agregar a pantalla de inicio" y ahí perdés gente. La razón para no arrancar ahí es la fricción de instalación, no el costo. **Arriba de ~200 parejas el push deja de ser plan B y pasa a ser el canal principal.** Plan B intermedio subvalorado: mail para la madrina (su veredicto no es urgente al minuto) y WhatsApp para el ahijado, que baja la factura casi a la mitad.

---

## 13. Cronograma

| Semana | Fechas | h | Entregable | En paralelo |
|---|---|---|---|---|
| **S0** | lun 27/7 | 4 | B1–B4 + Portfolio + app + número de prueba + token de system user + proyecto Railway | — |
| **S1** | 27/7–2/8 | 12 | **Hito 0** + **Hito 0.5** | Arranca la validación a mano (§8) y el reclutamiento |
| **S2** | 3/8–9/8 | 12 | **Hito 1** (goal único, sin wizard) | Cierre de la validación a mano · 10 llamadas a profesionales |
| **S3** | 10/8–16/8 | 12 | **Hito 2a** (los 8 escenarios verdes) | **Las 5 plantillas a aprobación** |
| **S4** | 17/8–23/8 | 12 | **Hito 2b** (recurrencia, ciclo, resumen, número productivo, cutover) | B1 ya resuelta |
| **S5** | 24/8–30/8 | 12 | **Hito 3** dogfood: 7 días sin intervención | — |
| **S6** | 31/8–6/9 | 10 | Arreglos + alta de las 10 parejas | **Rate card del 1/9 → corte M5** |
| **S7–S10** | 7/9–4/10 | 6/sem | **Hito 4**: el ciclo de 4 semanas corriendo | 1 llamada de 15 min por madrina en la semana 2 del ciclo |
| **Decisión** | ~5/10 | 4 | Cortes M4 y M5 → seguir / un ciclo más / archivar | — |

---

## 14. La versión que puede facturar

El piloto valida la mecánica. El negocio, si aparece, está en el **profesional que cobra por la adherencia de un tercero**: coach de TDAH, terapista ocupacional, nutricionista con 15 pacientes. Ahí el árbitro está pago (no se aburre), su juicio profesional está en juego (el "Todavía no" es real), el CAC es una conversación de venta cada 15–30 ahijados y el churn se mide en trimestres. Mismo código, mismo ciclo de 4 semanas, misma regla de cero multimedia.

Consecuencia de diseño a tener presente aunque hoy esté cortada: **ese comprador va a pedir una vista de varios ahijados a la vez.** No la construyas todavía, pero no cierres el modelo de datos como si la relación madrina-ahijado fuera siempre 1 a 1.

Por eso las 10 llamadas a profesionales van en la semana 2, no después del piloto.
