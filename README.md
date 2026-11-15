# Window Fullscreen

Brave/Chromium MV3 extension that adds a button over videos to expand them to the browser window — not OS fullscreen.

Works on same-page `<video>` elements and cross-origin iframe embeds (YouTube, stream hosts, etc.) by running in every frame and expanding the iframe chain via `postMessage`.

## Install

1. Open `brave://extensions`
2. Enable Developer mode
3. Load unpacked → select this folder
4. On the extension card, set **Site access** to **On all sites** (required for embeds)
5. Reload any tab you already had open

After pulling changes: click **Reload** on the extension card, then reload the page.

## Use

Hover a video or an embedded player iframe. A small button appears at the top-right — click it to expand to the browser window. Click the same button again (exit icon) or press Escape to leave.

## Test page

```bash
cd test && python -m http.server 8766
```

Open `http://localhost:8766/` — covers a bare video, a `transform` wrapper, a same-origin iframe, and a YouTube embed.

Automated self-check (no extension load): from the extension root, `python -m http.server 8767` then open `http://localhost:8767/test/verify.html` — title becomes `VERIFY OK` on success.

## Limitations

- Videos inside closed shadow roots are not detected.
- Unusual players may expand only the bare `<video>` (site controls stay behind).
- Players that ignore `resize` may letterbox until they relayout.
