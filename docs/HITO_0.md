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

### Pasos para configurar Meta

1. Crear una app en [Meta for Developers](https://developers.facebook.com/).
2. Añadir WhatsApp Business Cloud API.
3. Obtener:
   - `WHATSAPP_TOKEN` (token de acceso permanente)
   - `WHATSAPP_PHONE_NUMBER_ID` (ID del número de teléfono)
   - `WHATSAPP_BUSINESS_ACCOUNT_ID` (ID de la cuenta de WhatsApp Business)
4. Configurar el webhook:
   - URL: `https://tu-dominio.com/webhook`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Campos suscritos: `messages`
5. Crear y aprobar la plantilla `goal_sintetico` con categoría `utility`.
6. Copiar `.env.example` a `.env` y completar los valores.

### Prueba real entre dos teléfonos

1. Exponer el servidor con ngrok: `ngrok http 3000`
2. Configurar la URL del webhook en Meta con la URL de ngrok.
3. Teléfono A envía cualquier mensaje al número de WhatsApp Business.
4. El bot responde dentro de la ventana de servicio (texto libre).
5. Teléfono A envía `goal` y recibe el goal sintético vía plantilla.
6. Para probar fuera de ventana: esperar 24h o usar el endpoint `/test/plantilla`.
7. Verificar que un webhook repetido no duplica el procesamiento (idempotencia).

### Endpoints de prueba

| Endpoint | Método | Descripción |
|---|---|---|
| `/health` | GET | Estado del servidor |
| `/webhook` | GET | Verificación del webhook de Meta |
| `/webhook` | POST | Recepción de webhooks de Meta |
| `/test/texto` | POST | Envía texto dentro de ventana |
| `/test/plantilla` | POST | Envía plantilla fuera de ventana |
| `/test/goal` | POST | Envía goal sintético con plantilla |

### Limitaciones reales de Meta

- **Ventana de 24h**: fuera de ella, los mensajes libres se rechazan con error 401.
  Solo plantillas aprobadas pueden enviarse fuera de ventana.
- **Aprobación de plantillas**: Meta revisa cada plantilla antes de aprobarla.
  El proceso puede tardar horas o días. Sin aprobación, no se puede enviar.
- **Categoría `utility`**: Meta puede rechazar plantillas que considere de marketing
  disfrazadas de utility. El goal sintético debe ser claramente transaccional.
- **Reintentos de webhook**: Meta reenvía webhooks no confirmados (HTTP no 200).
  La idempotencia es obligatoria para evitar duplicación.
- **Cuota de mensajes**: el plan gratuito tiene un límite de conversaciones mensuales.
  Cada conversación iniciada por plantilla consume una cuota.
- **Número de prueba**: Meta proporciona números de prueba para desarrollo,
  pero solo pueden enviar mensajes a números preconfigurados.
