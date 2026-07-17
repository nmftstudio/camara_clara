# cámara clara — NMFT STUDIO

Instrumento óptico digital: cámara en vivo con superposición de imagen o texto,
opacidad ajustable, y captura de foto. Dedicado a Marianela, de parte de Martín.

## Cómo usarla

Los navegadores solo dan acceso a la cámara desde `https://` o desde `localhost`,
así que no alcanza con abrir `index.html` haciendo doble clic. Elegí una opción:

### Opción A — en la computadora (rápido, para probar)
1. Abrí una terminal en esta carpeta.
2. Corré uno de estos comandos (usá el que tengas instalado):
   - `python3 -m http.server 8000`
   - `npx serve .`
3. Abrí `http://localhost:8000` en el navegador.

### Opción B — en el celular (recomendado, para uso real)
Subí la carpeta a cualquier hosting estático gratuito y abrí la URL `https://...`
resultante desde el celular:
- **Netlify Drop**: arrastrá la carpeta a app.netlify.com/drop
- **Vercel**, **GitHub Pages**, o similar

Una vez con la URL https, podés "Agregar a pantalla de inicio" desde el navegador
del celular para que se abra como una app.

## Uso dentro de la app

1. Pantalla de dedicatoria → botón **"Abrir el visor"** → el navegador pide
   permiso de cámara.
2. Elegí modo **Imagen** (subís una foto) o **Texto** (escribís algo).
3. Ajustá la opacidad con el control deslizante.
4. Arrastrá con un dedo para mover la superposición; pellizcá con dos dedos
   para escalar y rotar.
5. Botón central (círculo) para capturar: descarga una foto combinando la
   cámara y la superposición tal como se ve en pantalla.
6. El ícono ⊙ arriba a la derecha vuelve a mostrar la dedicatoria.
7. El ícono de cámara (abajo a la derecha) cambia entre cámara trasera y frontal.

## Archivos

- `index.html` — estructura
- `style.css` — sistema de diseño (fondo oscuro, verde lima, dorado)
- `app.js` — lógica de cámara, gestos y captura
- `manifest.json` — permite instalar como app (PWA)
