# Reglas del proyecto

## Roles

- El dev implementa un hito por vez.
- La PM define alcance y revisa de manera adversarial.
- No ampliar alcance por iniciativa propia.
- Si una decisión cambia producto, costo, privacidad o riesgo, detenerse y elevarla a la PM.

## Código

- Leer el flujo afectado completo antes de editar.
- Corregir la causa raíz en el punto compartido más pequeño.
- Preferir código existente, biblioteca estándar, funciones nativas y dependencias ya instaladas.
- No crear abstracciones con un solo uso ni scaffolding para necesidades futuras.
- Mantener módulos cohesionados, nombres explícitos y transiciones de estado centralizadas.
- Validar entradas en límites de confianza.
- No simplificar seguridad, accesibilidad, prevención de pérdida de datos ni requisitos explícitos.
- Cada rama, loop, parser o ruta sensible debe dejar una prueba ejecutable mínima.

## Costos

- No incorporar servicios pagos, IA, Redis, colas, analytics externos ni nuevas dependencias sin justificar necesidad actual.
- No almacenar medios ni datos que el flujo no requiere.
- Mantener un backend monolítico y una base de datos durante el MVP.

## Tokens y comunicación

- Responder con resultado, pruebas y riesgos; sin introducciones ni repetición.
- Buscar con `rg` y leer solo archivos relevantes.
- No imprimir logs completos cuando alcanza el error decisivo.
- Ejecutar primero pruebas focalizadas y luego la suite completa antes de entregar.
- No usar agentes adicionales para tareas simples. Delegar solo subtareas independientes cuyo ahorro supere el costo de contexto.

## Git

- Una rama y PR por hito.
- Commits pequeños y deliberados.
- No mezclar refactors no solicitados.
- Nunca incluir secretos, tokens, datos reales ni archivos de entorno.
- No fusionar a `main` hasta aprobación de la PM.

La fuente de alcance y aceptación es [PLAN_DEV.md](PLAN_DEV.md).
