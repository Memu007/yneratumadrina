# Inera Sara

Moda rápida aplicada a juegos. Como una tienda de ropa que saca colección nueva cada semana, Inera Sara saca juegos chicos, baratos y rápidos de producir, pensados para llenar TikTok e Instagram de clips.

## Cómo jugar

Abrir `index.html` con doble clic en cualquier navegador (también en el celular). No hace falta instalar nada.

## Temporada 01

| Juego | Idea | Controles |
|---|---|---|
| **Limpiavidrios** | Un limpiavidrios colgado de un edificio tiene que limpiar las tres ventanas de cada piso antes de que se acabe el tiempo. Se abren ventanas y tiran basura (quita una vida), pasan pájaros y cagan (ensucian el vidrio, y si te toca, también quita vida). Cada piso es más sucio y más rápido. | Tocar una ventana para ir; mantener apretado para limpiar. En PC: flechas y barra espaciadora. |
| **El Viejo y su Casa Limpia** | Un viejo tiene que mantener a raya la casa, el pasto y la vereda. Todo se ensucia solo, pasan perros que dejan regalos, los vecinos le tiran basura y vienen los nietos. Pierde si cualquier cosa llega al rojo. El viejo camina lento: elegir a dónde ir es el juego. | Tocar una zona para ir; mantener apretado para trabajar. En PC: flechas y barra espaciadora. |

## Reglas de la fábrica

- **Un juego = una mecánica = un minuto.** Si no se entiende en 3 segundos de video, no va.
- **Formato vertical 9:16** (360×640), listo para grabar pantalla y subir.
- **Cero costo de producción:** HTML y JavaScript puros, sin dependencias, gráficos con emojis y formas simples.
- **Momentos "clip":** cada juego tiene que generar situaciones graciosas o frustrantes (te cagó la paloma justo al terminar) que funcionen como video.
- **Plantilla repetible:** cada juego nuevo copia la estructura de una carpeta de `juegos/`: `logica.js` (reglas, probadas) + `index.html` (dibujo y controles).

## Estructura

```text
index.html                    vidriera con los juegos
comun/lienzo.js               pantalla vertical, bucle y récord compartidos
juegos/<juego>/logica.js      reglas del juego, sin pantalla
juegos/<juego>/index.html     dibujo y controles
test/                         pruebas de las reglas
```

## Pruebas

```bash
npm test
```

## Decisiones pendientes

- **Nombre:** "Inera Sara" juega con una marca de ropa conocida; conviene revisar riesgo de marca antes de publicar.
- **Cobro de 1 dólar:** en tiendas de apps la comisión es 15–30 %, y en pagos web las comisiones fijas se comen ~30–35 % de un dólar. Hay que elegir canal (gratis con anuncios, pase de temporada, paquete de juegos, tiendas) antes de agregar pagos.
- **Publicación:** dónde hospedar los juegos (GitHub Pages es gratis) y cómo enlazarlos desde TikTok/Instagram.
