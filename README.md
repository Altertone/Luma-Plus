# Luma Plus

Companion Spicetify **extension** for [Luma Lyrics](https://github.com/Altertone/Luma-Lyrics). It adds optional power features without bloating the core overlay.

## Features
- **Per-track sync offset memory** — remembers your lyrics timing adjustment per track (namespaced: `luma-plus:track-offsets`). Tracks without a saved adjustment start at neutral sync instead of inheriting the previous track's offset.
- **Overlay keyboard shortcuts** (when Luma is open, not typing): `F` fullscreen, `V` vinyl toggle, `L` focus-lyrics mode, `[` / `]` offset ±0.05s, `0` reset offset.
- **Focus-lyrics mode** — hides the now-playing card to give lyrics full width (`L`).

## Install
1. Copy `luma-plus.js` to your Spicetify `Extensions` folder.
2. Enable & apply:
   ```bash
   spicetify config extensions luma-plus.js
   spicetify apply
   ```
3. Install/enable **Luma Lyrics** too (recommended). Luma Plus works best when Luma exposes `window.LumaLyrics` hooks; it falls back safely when hooks aren’t available.

## Compatibility
- Designed to be **fully compatible alongside Luma Lyrics** and independent themes (e.g. Luma Ambient).
- Uses its own storage keys (`luma-plus:*`) and does not patch Spicetify internals.
- Stored offsets are validated, clamped to ±5 seconds, and capped at the 400 most recently added tracks. Malformed local settings fall back safely.
- If a shortcut conflicts with your setup, you can disable shortcuts via:
  ```js
  LumaPlus.setConfig({ shortcuts: false })
  ```

## License
MIT.
