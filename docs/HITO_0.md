# Hito 0 — Conexión real con WhatsApp

## Flujo permitido por las políticas vigentes de Meta

### Ventana de servicio de 24 horas

Meta permite enviar mensajes **libres** (texto, botones, etc.) dentro de los 24 horas
siguientes a la última respuesta del usuario. Fuera de esa ventana, solo se pueden
enviar **plantillas pre-aprobadas** (marketing, utility o authentication).

### Plantilla `utility`

Las plantillas `utility` son para mensajes relacionados con una transacción o cuenta
del usuario. Para este hito se usa una plantilla con categoría `utility` que entrega
un goal sintético. La plantilla debe crearse y aprobarse en Meta Business Manager
antes de poder enviarla.

**Estructura de la plantilla `goal_sintetico`:**

- Nombre: `goal_sintetico`
- Categoría: `utility`
- Idioma: `es_AR`
- Cuerpo: `Tienes un nuevo goal: {{1}}. Plazo: {{2}}.`

### Graph API v25.0

Se usa la versión `v25.0` de la Graph API de Meta, la versión estable publicada
en octubre de 2024. La URL base es `https://graph.facebook.com/v25.0`.

### Modelo de cobro por mensaje

A partir de 2024, Meta cobra **por mensaje individual** en lugar de por conversación.
Cada mensaje enviado (texto o plantilla) tiene un costo según la categoría:

- **Mensajes de servicio** (dentro de ventana 24h): gratuitos si el usuario inició.
- **Mensajes con plantilla utility**: costo por mensaje según el país del destinatario.
- **Mensajes con plantilla marketing**: costo mayor que utility.

Los precios exactos varían por país y se consultan en:
`https://developers.facebook.com/docs/whatsapp/pricing`

### Pasos para configurar Meta

1. Crear una app en [Meta for Developers](https://developers.facebook.com/).
2. Añadir WhatsApp Business Cloud API.
3. Obtener:
   - `WHATSAPP_TOKEN` (token de acceso permanente)
   - `WHATSAPP_PHONE_NUMBER_ID` (ID del número de teléfono)
   - `WHATSAPP_BUSINESS_ACCOUNT_ID` (ID de la cuenta de WhatsApp Business)
   - `WHATSAPP_APP_SECRET` (App Secret para validar firma del webhook)
4. Configurar el webhook:
   - URL: `https://tu-dominio.com/webhook`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Campos suscritos: `messages`
5. Crear y aprobar la plantilla `goal_sintetico` con categoría `utility`.
6. Copiar `.env.example` a `.env` y completar los valores.

### Integración HTTP local (madrina → ahijado)

1. Exponer el servidor con ngrok: `ngrok http 3000`
2. Configurar la URL del webhook en Meta con la URL de ngrok.
3. **Madrina** (`TEST_PHONE_MADRINA`) envía cualquier mensaje al número de WhatsApp Business.
4. El bot responde a la madrina dentro de la ventana de servicio (texto libre).
5. **Madrina** envía `goal` → el bot envía el goal sintético al **ahijado** (`TEST_PHONE_AHIJADO`)
   vía plantilla utility y confirma a la madrina con un texto.
6. Para probar fuera de ventana: esperar 24h o usar el endpoint `/test/plantilla`
   (requiere `Authorization: Bearer <ADMIN_TOKEN>`, solo teléfonos permitidos).
7. Verificar que un webhook repetido no duplica el procesamiento (idempotencia).
8. Si la confirmación a la madrina falla pero el goal se envió, el evento se confirma
   para evitar duplicar el goal en el reintento de Meta.

### Endpoints

| Endpoint | Método | Descripción | Auth |
|---|---|---|---|
| `/health` | GET | Estado del servidor | No |
| `/webhook` | GET | Verificación del webhook de Meta | No |
| `/webhook` | POST | Recepción de webhooks de Meta (valida firma HMAC) | Firma HMAC |
| `/test/texto` | POST | Envía texto dentro de ventana | Bearer token |
| `/test/plantilla` | POST | Envía plantilla fuera de ventana | Bearer token |
| `/test/goal` | POST | Envía goal sintético con plantilla | Bearer token |

### Limitaciones reales de Meta

- **Ventana de 24h**: fuera de ella, los mensajes libres se rechazan con error 401.
  Solo plantillas aprobadas pueden enviarse fuera de ventana.
- **Aprobación de plantillas**: Meta revisa cada plantilla antes de aprobarla.
  El proceso puede tardar horas o días. Sin aprobación, no se puede enviar.
- **Categoría `utility`**: Meta puede rechazar plantillas que considere de marketing
  disfrazadas de utility. El goal sintético debe ser claramente transaccional.
- **Reintentos de webhook**: Meta reenvía webhooks no confirmados (HTTP no 200).
  La idempotencia es obligatoria para evitar duplicación.
- **Cobro por mensaje**: cada mensaje enviado tiene un costo individual según el país.
  No hay cuota mensual gratuita; el crédito inicial de prueba se agota.
- **Número de prueba**: Meta proporciona números de prueba para desarrollo,
  pero solo pueden enviar mensajes a números preconfigurados.
