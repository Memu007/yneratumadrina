# Tu Madrina

Tu Madrina es un servicio de accountability por WhatsApp. Una persona de confianza establece un goal, el ahijado lo acepta y envía la prueba directamente a esa persona. La madrina decide si se cumplió; el bot comunica avisos y registra el estado.

## Regla central

La aplicación nunca decide si una tarea está bien hecha. Solo la madrina puede marcar una ocurrencia como `Aprobada`, `No aprobada` o `Pedir otra prueba`.

## Flujo base

1. La madrina vincula a un ahijado con consentimiento de ambos.
2. Crea un goal breve: tarea, plazo e indicación de prueba.
3. El ahijado acepta.
4. El bot recuerda el plazo.
5. El ahijado manda la prueba directamente a la madrina y toca `Prueba enviada`.
6. El bot pide la decisión de la madrina.
7. El sistema registra el resultado.

## MVP

- WhatsApp como única interfaz.
- Goals únicos y luego recurrentes.
- Vínculo madrina-ahijado.
- Recordatorios y vencimientos.
- Aprobación humana con botones.
- Historial mínimo.
- Consentimiento, baja y eliminación de datos.

## Fuera del MVP

- Aplicación móvil o panel web.
- Inteligencia artificial y audio.
- Reenvío o almacenamiento de fotos y videos.
- Pagos, gamificación, rankings y coaching automático.
- Funciones médicas, diagnósticos o validación de medicación.

El plan de implementación está en [PLAN_DEV.md](PLAN_DEV.md).

