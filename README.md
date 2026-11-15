# In-Window Fullscreen

Brave/Chromium extension that expands videos to **fill the browser window**, without OS-level fullscreen.

Useful when you want a larger player but still need the tab bar, other monitors, or system UI.

## Features

- Works on normal `<video>` elements and cross-origin embeds (YouTube, stream hosts, etc.)
- Small control on the top-right of the player / embed
- Exit with the same control or **Escape**
- YouTube watch pages target `#movie_player` so the picture fills correctly

## Install (Developer Mode)

1. Open `brave://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder
4. On the extension card: **Details** → **Site access** → **On all sites** (needed for embeds)
5. Reload tabs that were already open

After updating the code: **Reload** the extension, then hard-reload the page.

## Use

1. Open a page with a video or embedded player
2. Click the small top-right button on the player
3. The video fills the browser window
4. Click the button again (exit icon) or press **Escape**

## Test pages

Manual suite (bare video, CSS `transform` wrapper, same-origin iframe, YouTube embed):

```bash
cd test && python -m http.server 8766
```

Open `http://localhost:8766/`

Automated check (loads the content script without installing the extension):

```bash
python -m http.server 8767
```

Open `http://localhost:8767/test/verify.html` — the title becomes `VERIFY OK` on success.

## Limitations

- Videos inside closed shadow roots are not detected
- Unusual players may expand only the bare `<video>` (custom chrome stays behind)
- Players that ignore `resize` may letterbox until they relayout

## License

MIT
