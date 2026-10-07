# Medición de subagentes y consejero

Para decidir con números qué modelo y esfuerzo rinden. Una fila por subagente
en cada revisión.

- **Hallazgos:** cuántos devolvió.
- **Reproducidos:** cuántos se confirmaron con evidencia.
- **Nuevos:** cuántos no había visto nadie (ni las pruebas, ni la revisión propia).

## Subagentes

| Fecha | Qué se revisó | Modelo y esfuerzo | Hallazgos | Reproducidos | Nuevos |
|---|---|---|---|---|---|
| 2026-10-06 | Diseño de El Viejo (asesoría, no revisión) | Fable | 5 mejoras + balance | 5 | 5 |
| 2026-10-07 | El Viejo completo: cuelgues, récord, celular | Sonnet, esfuerzo por defecto | 7 (5 + 2 sospechas) | 7 | 7 |

## Consejero

| Fecha | Momento | Qué | Propuso | Adoptadas | Cambió el resultado | Equivocadas |
|---|---|---|---|---|---|---|
| 2026-10-07 | Antes de retocar la dificultad | Balance que oscilaba entre muy difícil y muy fácil | 4 (no tocar margen de frenado, bajar sobrante, prueba de rotación antes de ajustar, medir frenados del que rota) | 4 | Sí: cambió la palanca (sobrante y asimetría, no el margen) | 0 |
| 2026-10-07 | Antes de dar por cerrado el balance | Efectos de duplicar lo que ensucian los eventos | 3 (hojas fantasma, medir el arranque, cómo informarlo) | 3 | Sí: hojas fantasma reproducidas y arregladas; el arranque se midió y no hizo falta cambiarlo | 0 |
| 2026-10-07 | Ajuste trabado: bajar barras devolvía ventaja a rotar | Barras demasiado rápidas | 4 (umbral 0.6 era una suposición, palanca de frecuencia, suavizar la barra, D2 de eventos lejos del viejo como último recurso) | 3 (el D2 no hizo falta) | Sí: la frecuencia destrabó el ajuste | 0 |
| 2026-10-07 | Antes de informar | Cierre del ajuste de barras | 4 (verificar el suavizado, informar en segundos hasta llenarse, declarar cambios de la prueba, riesgos) | 4 | Sí: el suavizado se verificó (4.7 → 34.8 en 0.5 s) antes de prometerlo | 0 |
