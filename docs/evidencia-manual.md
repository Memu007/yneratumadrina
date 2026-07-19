# Evidencia de prueba manual — Hito 0

## Plan de prueba manual con Meta y dos teléfonos

### Precondiciones

- Cuenta de Meta for Developers con WhatsApp Business Cloud API configurada
- App Secret, token de acceso permanente y phone_number_id obtenidos
- Plantilla `goal_sintetico` (categoría `utility`, idioma `es_AR`) creada y **APPROVED** en Meta Business Manager
- Dos teléfonos reales: madrina (A) y ahijado (B)
- `.env` completado con credenciales reales

### Pasos

1. **Configurar credenciales Meta**
   - Copiar `.env.example` a `.env`
   - Completar: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `ADMIN_TOKEN`, `TEST_PHONE_MADRINA`, `TEST_PHONE_AHIJADO`
   - Verificar que `validarConfig()` no lance error: `npm run dev`

2. **Confirmar plantilla APPROVED**
   - En Meta Business Manager → WhatsApp Manager → Plantillas
   - Verificar que `goal_sintetico` tenga estado **APPROVED**
   - Si está en revisión o rechazada, no se puede enviar fuera de ventana

3. **Exponer webhook con ngrok**
   - `ngrok http 3000`
   - Configurar URL `https://<ngrok>.ngrok.io/webhook` en Meta for Developers → Webhooks
   - Verificar challenge: `GET /webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=test`

4. **Madrina A envía `goal`**
   - Desde el teléfono de la madrina, enviar mensaje `goal` al número de WhatsApp Business
   - El webhook recibe el mensaje, valida firma HMAC, procesa con idempotencia
   - El bot envía plantilla `goal_sintetico` al ahijado (B)
   - El bot envía texto "Goal enviado al ahijado." a la madrina (A)

5. **Ahijado B recibe plantilla**
   - Verificar en el teléfono del ahijado: mensaje con plantilla `goal_sintetico`
   - Contenido esperado: "Tienes un nuevo goal: Sacar la basura. Plazo: hoy 20:00."

6. **Verificar idempotencia**
   - Reenviar el mismo webhook (simular reintento de Meta)
   - Verificar que no se envía una segunda plantilla al ahijado

7. **Guardar evidencia redactada**
   - Anotar timestamps, números de teléfono, message IDs devueltos por la API
   - Registrar logs del servidor (firma validada, evento procesado/confirmado)
   - Documentar cualquier error o comportamiento inesperado

### Resultado esperado

| Paso | Resultado |
|---|---|
| validarConfig | Sin error |
| Webhook GET (challenge) | HTTP 200, devuelve challenge |
| Webhook POST (firma válida) | HTTP 200, EVENT_RECEIVED |
| Madrina envía goal | Template al ahijado + texto a la madrina |
| Ahijado recibe | Plantilla `goal_sintetico` con goal sintético |
| Reintento de Meta | HTTP 200, sin duplicación (idempotencia) |
| Confirmación falla | Evento confirmado, no se duplica goal en reintento |

### Estado

- [ ] Prueba manual ejecutada
- [ ] Evidencia adjuntada

> **Nota**: La prueba automatizada de integración HTTP local (7 tests con mock server y fetch real) cubre el flujo completo madrina → ahijado, idempotencia, confirmación fallida con reintento, y validación de firma. La prueba manual con Meta valida la conectividad real con la API de WhatsApp Cloud.
