# pngtools

`pngtools` is a static, browser-only PNG utility. It cleans microscopic color noise from mostly-flat regions without applying a blur, rotates PNG files, parses useful PNG metadata, counts decoded RGBA colors, and removes edge-connected near-black backgrounds with a flood fill.

Images are decoded and processed locally in the browser. The application has no backend, does not upload files, and makes no runtime network requests.

## Features

- Tolerant neighborhood mode/cluster cleanup filter with live selected-region preview.
- Adjustable cleanup radius, color threshold, minimum agreement count, iteration count, and alpha behavior.
- Double-buffered full-image cleanup in a Web Worker so long operations do not block the interface.
- PNG rotations at 90°, 180°, and 270° clockwise.
- PNG chunk parsing for IHDR, tEXt, zTXt where the browser supports `DecompressionStream`, iTXt, pHYs, gAMA, sRGB, and tIME chunks.
- Unique decoded RGBA color count.
- Edge-connected near-black flood fill with an optional 0–5 pixel soft edge.
- PNG download for the currently selected result.

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

After the static files load, all PNG parsing, canvas decoding, filtering, rotation, flood-fill processing, preview rendering, and PNG encoding happen inside the browser. No service worker is needed: the site does not require any API or external asset at runtime. If you want the page itself to reopen without connectivity, save or host these static files locally or use a browser cache policy appropriate for your host.
