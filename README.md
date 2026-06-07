# pngtools

`pngtools` is a static, browser-only PNG utility. It cleans microscopic color noise from mostly-flat regions without applying a blur, rotates PNG files, parses useful PNG metadata, counts decoded RGBA colors, and removes backgrounds near the most common edge color with a flood fill.

Images are decoded and processed locally in the browser. The application has no backend, does not upload files, and makes no runtime network requests. Try the hosted app at <https://zeroone3010.github.io/pngtools/>.

## Features

- Tolerant neighborhood mode/cluster cleanup filter with live selected-region preview.
- Adjustable cleanup radius, color threshold, minimum agreement count, iteration count, and alpha behavior.
- Double-buffered full-image cleanup in a Web Worker so long operations do not block the interface.
- Idempotent PNG rotation selection for reset, −90°, 90°, and 180° orientations.
- Ratio-preserving resize actions for 25%, 50%, and 200% output, with smooth photographic scaling or sharp pixel-perfect scaling.
- PNG chunk parsing for IHDR, tEXt, zTXt where the browser supports `DecompressionStream`, iTXt, pHYs, gAMA, sRGB, and tIME chunks.
- Non-interlaced PNG scanline filter visualization with per-filter row counts; Adam7 interlaced PNGs are detected but not visualized.
- Prominent transparency, palette-image, and indexed-color metadata, with full metadata and source palette colors available in nested expanders.
- Unique decoded RGBA color count.
- Automatic dominant-edge-color flood fill with an optional tolerance and 0–5 pixel soft edge.
- Browser-local palette/color reduction for the current result using popularity or median cut quantization, with optional Floyd–Steinberg dithering, only genuinely smaller target palettes, and indexed PNG downloads.
- Indexed-color source detection, side-by-side palette preview, and optional palette-based PNG downloads after edits, with a lossless truecolor fallback when a full palette cannot represent new transparency.
- Normalized transparent pixels whose stored RGBA value is always `(0, 0, 0, 0)`.
- PNG downloads derived from the uploaded filename, preserving the original name for an unchanged image.
- Installable Progressive Web App with an offline-cached application shell.

## Run locally

No dependency installation or build step is required. Serve the repository directory with any static HTTP server because the Web Worker cannot be loaded reliably from a `file://` URL.

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>.

## Build

The checked-in HTML, CSS, JavaScript, and worker files are the deployable output. There is no compilation step. To verify JavaScript syntax:

```bash
node --check app.js
node --check worker.js
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select the desired branch and the repository root (`/`), then save.
4. Open the Pages URL after GitHub finishes publishing.

All asset URLs are relative, so the site works at a project path such as `https://example.github.io/pngtools/` without a custom base-path configuration.

## Privacy and offline behavior

After the static files load, all PNG parsing, canvas decoding, filtering, rotation, flood-fill processing, palette/color reduction, preview rendering, and PNG encoding happen inside the browser. A service worker caches the static application files so the installed Progressive Web App can reopen without connectivity. The site does not require any API or external asset at runtime.

---
✨ Made with vibes ✨
