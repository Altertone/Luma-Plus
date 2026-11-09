// Luma Plus — companion for Luma Lyrics (Spicetify extension)
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  while (!globalThis.Spicetify?.Player || !document.body) await wait(300);
  if (globalThis.__lumaPlusLoaded) return;
  globalThis.__lumaPlusLoaded = true;

  const NS = "luma-plus";
  const OFFSET_KEY = `${NS}:track-offsets`;
  const CFG_KEY = `${NS}:config`;
  const MAX_OFFSETS = 400;

  const defaultConfig = { shortcuts: true, rememberOffsets: true };
  const loadJson = (k, d) => {
    try {
      return { ...d, ...JSON.parse(localStorage.getItem(k) || "{}") };
    } catch {
      return { ...d };
    }
  };
  const saveJson = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
  let config = loadJson(CFG_KEY, defaultConfig);
  let offsets = loadJson(OFFSET_KEY, {});

  const style = document.createElement("style");
  style.id = "luma-plus-style";
  style.textContent = `
    #luma-root.luma-plus-focus .layout{grid-template-columns:minmax(0,1fr)!important}
    #luma-root.luma-plus-focus .player{display:none!important}
    #luma-root.luma-plus-focus .lyrics{padding-inline:min(8vw,80px)!important}
    #luma-plus-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);opacity:0;z-index:1000001;pointer-events:none;padding:10px 14px;border-radius:999px;background:rgba(33,31,38,.92);color:#f3edf7;border:1px solid rgba(208,188,255,.25);font:600 13px/1.2 "Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(14px);transition:opacity .18s ease,transform .18s ease}
    #luma-plus-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  `;
  document.head.append(style);

  const toastEl = document.createElement("div");
  toastEl.id = "luma-plus-toast";
  document.body.append(toastEl);
  let toastTimer = 0;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
  };

  const getTrackUri = () => Spicetify.Player.data?.item?.uri || "";
  const getRoot = () => document.getElementById("luma-root");
  const isOverlayOpen = () => {
    const r = getRoot();
    return !!r && !r.hidden;
  };

  function applyOffset(ms) {
    const v = Math.max(-5000, Math.min(5000, Math.round(ms)));
    const api = globalThis.LumaLyrics;
    if (api && typeof api.setSyncOffset === "function") {
      api.setSyncOffset(v);
      return true;
    }
    window.dispatchEvent(new CustomEvent("luma:set-sync-offset", { detail: { ms: v } }));
    // Best-effort fallback: update settings storage; Luma may pick it up on next apply/open depending on version.
    try {
      const s = JSON.parse(localStorage.getItem("luma-settings") || "{}");
      s.syncOffset = v;
      localStorage.setItem("luma-settings", JSON.stringify(s));
    } catch {}
    return false;
  }

  function rememberOffsetForTrack(uri, ms) {
    if (!config.rememberOffsets || !uri) return;
    offsets[uri] = Math.max(-5000, Math.min(5000, Math.round(ms)));
    const keys = Object.keys(offsets);
    if (keys.length > MAX_OFFSETS) {
      for (const k of keys.slice(0, keys.length - MAX_OFFSETS)) delete offsets[k];
    }
    saveJson(OFFSET_KEY, offsets);
  }

  function restoreOffsetForTrack(uri) {
    if (!config.rememberOffsets || !uri) return;
    const ms = offsets[uri];
    if (typeof ms === "number") applyOffset(ms);
  }

  function nudgeOffset(delta) {
    const api = globalThis.LumaLyrics;
    let current = 0;
    if (api && typeof api.getState === "function") current = api.getState()?.syncOffset ?? 0;
    else {
      try {
        current = Number(JSON.parse(localStorage.getItem("luma-settings") || "{}").syncOffset || 0);
      } catch {}
    }
    const next = current + delta;
    applyOffset(next);
    rememberOffsetForTrack(getTrackUri(), next);
    toast(`Lyrics sync ${next > 0 ? "+" : ""}${(next / 1000).toFixed(2)}s`);
  }

  function toggleFocus() {
    const root = getRoot();
    if (!root) return toast("Open Luma Lyrics first");
    root.classList.toggle("luma-plus-focus");
    toast(root.classList.contains("luma-plus-focus") ? "Focus: lyrics" : "Focus: normal");
  }

  function toggleVinyl() {
    const api = globalThis.LumaLyrics;
    if (api && typeof api.toggleVinyl === "function") {
      api.toggleVinyl();
      toast("Vinyl toggled");
      return;
    }
    const btn = getRoot()?.querySelector('[data-action="toggle-vinyl"], .vinyl');
    if (btn) btn.click();
  }

  function isTypingTarget(t) {
    if (!t) return false;
    const tag = (t.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || t.isContentEditable;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (!config.shortcuts || !isOverlayOpen() || isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === "f" || k === "F") {
        e.preventDefault();
        getRoot()?.querySelector('[data-action="full"]')?.click();
      } else if (k === "v" || k === "V") {
        e.preventDefault();
        toggleVinyl();
      } else if (k === "l" || k === "L") {
        e.preventDefault();
        toggleFocus();
      } else if (k === "[" || k === "-" || k === "_") {
        e.preventDefault();
        nudgeOffset(-50);
      } else if (k === "]" || k === "+" || k === "=") {
        e.preventDefault();
        nudgeOffset(50);
      } else if (k === "0") {
        e.preventDefault();
        nudgeOffset(-(Number(JSON.parse(localStorage.getItem("luma-settings") || "{}").syncOffset || 0)));
        rememberOffsetForTrack(getTrackUri(), 0);
        toast("Lyrics sync reset");
      }
    },
    true,
  );

  let lastUri = "";
  const onTrack = () => {
    const uri = getTrackUri();
    if (!uri || uri === lastUri) return;
    lastUri = uri;
    restoreOffsetForTrack(uri);
    window.dispatchEvent(new CustomEvent("luma-plus:track", { detail: { uri } }));
  };
  Spicetify.Player.addEventListener("songchange", onTrack);
  window.addEventListener("luma:track", (e) => {
    const uri = e.detail?.uri || getTrackUri();
    if (uri && uri !== lastUri) {
      lastUri = uri;
      restoreOffsetForTrack(uri);
    }
  });
  window.addEventListener("luma:sync-offset-changed", (e) => {
    if (typeof e.detail?.ms === "number") rememberOffsetForTrack(getTrackUri(), e.detail.ms);
  });
  onTrack();

  globalThis.LumaPlus = {
    version: "1.0.0",
    getConfig: () => ({ ...config }),
    setConfig: (next) => {
      config = { ...config, ...next };
      saveJson(CFG_KEY, config);
    },
  };
  console.info("[Luma Plus] Loaded (companion for Luma Lyrics). Shortcuts in overlay: F fullscreen, V vinyl, L focus, [ ] offset ±0.05s, 0 reset offset.");
})();
