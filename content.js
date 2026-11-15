(() => {
  if (window.__wvfs) return;
  window.__wvfs = true;

  const state = {
    target: null, // HTMLVideoElement | HTMLIFrameElement
    expanded: null,
    childIframe: null,
  };

  const MIN_W = 160;
  const MIN_H = 90;
  let rafPending = false;
  let btnHost = null;
  let btnEl = null;
  let btnAboveExpanded = false;

  function pickContainer(video) {
    // Prefer real player roots. On YouTube, climbing to #player breaks under popover
    // (wrapper goes 0×0); #movie_player fills correctly.
    const known = video.closest(
      '#movie_player, .html5-video-player, .video-js, .jwplayer, .plyr, [data-player]'
    );
    if (known && known !== video) return known;

    let el = video;
    const vr = video.getBoundingClientRect();
    if (!vr.width || !vr.height) return video;
    while (el.parentElement && el.parentElement !== document.body && el.parentElement !== document.documentElement) {
      const parent = el.parentElement;
      const pr = parent.getBoundingClientRect();
      // Skip collapsed wrappers (YouTube's .html5-video-container is often height 0).
      if (pr.width < 1 || pr.height < 1) {
        el = parent;
        continue;
      }
      if (pr.width > vr.width * 1.25 || pr.height > vr.height * 1.25) break;
      el = parent;
    }
    return el;
  }

  function bumpResize() {
    window.dispatchEvent(new Event('resize'));
  }

  function expand(el) {
    if (!el || state.expanded === el) return;
    if (state.expanded) collapseLocal();
    el.setAttribute('popover', 'manual');
    el.classList.add('wvfs-expanded');
    try {
      el.showPopover();
    } catch (_) {
      el.removeAttribute('popover');
      el.classList.remove('wvfs-expanded');
      return;
    }
    state.expanded = el;
    bumpResize();
    showButton(el);
  }

  function collapseLocal() {
    const el = state.expanded;
    if (!el) return;
    try {
      el.hidePopover();
    } catch (_) {}
    el.removeAttribute('popover');
    el.classList.remove('wvfs-expanded');
    state.expanded = null;
    state.childIframe = null;
    btnAboveExpanded = false;
    bumpResize();
    updateButtonIcon();
  }

  function largestVideo() {
    let best = null;
    let bestArea = 0;
    for (const v of document.querySelectorAll('video')) {
      const r = v.getBoundingClientRect();
      if (r.width < MIN_W || r.height < MIN_H) continue;
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  }

  function enterLocal(video) {
    expand(pickContainer(video));
    if (!state.expanded) return;
    if (window !== window.top) {
      window.parent.postMessage({ wvfs: 'enter' }, '*');
    }
  }

  function enterFromIframe(iframe) {
    try {
      iframe.contentWindow.postMessage({ wvfs: 'request-enter' }, '*');
    } catch (_) {}
    expand(iframe);
    if (state.expanded === iframe) state.childIframe = iframe;
  }

  function exitAll() {
    const child = state.childIframe;
    collapseLocal();
    if (window !== window.top) {
      window.parent.postMessage({ wvfs: 'exit-up' }, '*');
    }
    if (child?.contentWindow) {
      try {
        child.contentWindow.postMessage({ wvfs: 'exit-down' }, '*');
      } catch (_) {}
    }
  }

  function findIframeBySource(source) {
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        if (iframe.contentWindow === source) return iframe;
      } catch (_) {}
    }
    return null;
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !data.wvfs) return;

    if (data.wvfs === 'request-enter') {
      const v = largestVideo();
      if (v) enterLocal(v);
      return;
    }

    if (data.wvfs === 'enter') {
      const iframe = findIframeBySource(event.source);
      if (!iframe) return;
      expand(iframe);
      if (state.expanded !== iframe) return;
      state.childIframe = iframe;
      if (window !== window.top) {
        window.parent.postMessage({ wvfs: 'enter' }, '*');
      }
      return;
    }

    if (data.wvfs === 'exit-up') {
      collapseLocal();
      if (window !== window.top) {
        window.parent.postMessage({ wvfs: 'exit-up' }, '*');
      }
      return;
    }

    if (data.wvfs === 'exit-down') {
      const child = state.childIframe;
      collapseLocal();
      if (child?.contentWindow) {
        try {
          child.contentWindow.postMessage({ wvfs: 'exit-down' }, '*');
        } catch (_) {}
      }
    }
  });

  function ensureButton() {
    if (btnHost) return;
    btnHost = document.createElement('div');
    btnHost.id = 'wvfs-btn-host';
    // Popover top-layer so the exit control stays above an expanded player.
    btnHost.setAttribute('popover', 'manual');
    Object.assign(btnHost.style, {
      position: 'fixed',
      inset: 'auto',
      margin: '0',
      padding: '0',
      border: '0',
      background: 'transparent',
      width: '28px',
      height: '28px',
      overflow: 'visible',
    });
    const shadow = btnHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 6px;
          background: rgba(20, 20, 20, 0.8);
          color: #fff;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,.45);
        }
        button:hover { background: rgba(0,0,0,.92); }
        svg { width: 14px; height: 14px; display: block; }
      </style>
      <button type="button" title="Window fullscreen" aria-label="Window fullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path class="enter" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          <path class="exit" d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" style="display:none"/>
        </svg>
      </button>
    `;
    btnEl = shadow.querySelector('button');
    btnEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    btnEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.expanded) {
        exitAll();
        hideButton();
        return;
      }
      const t = state.target;
      if (!t) return;
      if (t.tagName === 'VIDEO') enterLocal(t);
      else if (t.tagName === 'IFRAME') enterFromIframe(t);
    });
    (document.documentElement || document.body).appendChild(btnHost);
  }

  function updateButtonIcon() {
    if (!btnEl) return;
    const enter = btnEl.querySelector('.enter');
    const exit = btnEl.querySelector('.exit');
    if (!enter || !exit) return;
    const on = !!state.expanded;
    enter.style.display = on ? 'none' : '';
    exit.style.display = on ? '' : 'none';
    btnEl.title = on ? 'Exit window fullscreen (Esc)' : 'Window fullscreen';
    btnEl.setAttribute('aria-label', btnEl.title);
  }

  function showButton(el) {
    ensureButton();
    const r = el.getBoundingClientRect();
    const top = Math.max(8, Math.min(window.innerHeight - 36, r.top + 8));
    const left = Math.max(8, Math.min(window.innerWidth - 36, r.right - 36));
    Object.assign(btnHost.style, {
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      bottom: 'auto',
    });
    updateButtonIcon();
    try {
      const open = btnHost.matches(':popover-open');
      if (!open) {
        btnHost.showPopover();
        btnAboveExpanded = !!state.expanded;
      } else if (state.expanded && !btnAboveExpanded) {
        // Restack above the expanded player in the top layer.
        btnHost.hidePopover();
        btnHost.showPopover();
        btnAboveExpanded = true;
      }
    } catch (_) {}
  }

  function hideButton() {
    if (!btnHost || state.expanded) return;
    try {
      btnHost.hidePopover();
    } catch (_) {}
    btnAboveExpanded = false;
  }

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    if (r.width < MIN_W || r.height < MIN_H) return null;
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
    return { el, area: r.width * r.height, r };
  }

  function hitTest(x, y) {
    let best = null;
    let bestArea = Infinity;
    for (const v of document.querySelectorAll('video')) {
      const hit = inViewport(v);
      if (!hit) continue;
      const { r, area } = hit;
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      if (area < bestArea) {
        bestArea = area;
        best = v;
      }
    }
    if (best) return best;

    for (const iframe of document.querySelectorAll('iframe')) {
      const hit = inViewport(iframe);
      if (!hit) continue;
      const { r } = hit;
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      return iframe;
    }
    return null;
  }

  // Prefer an explicit hover hit; otherwise pin to the largest in-view video, else iframe.
  // Pinning on iframes matters: once the pointer is inside a cross-origin frame, the parent
  // gets no pointer events — the overlay button in the parent must already be sitting on top.
  function pickAnchor(pointerX, pointerY) {
    if (pointerX != null && pointerY != null) {
      const hit = hitTest(pointerX, pointerY);
      if (hit) return hit;
    }
    let bestVideo = null;
    let bestVideoArea = 0;
    for (const v of document.querySelectorAll('video')) {
      const hit = inViewport(v);
      if (!hit) continue;
      if (hit.area > bestVideoArea) {
        bestVideoArea = hit.area;
        bestVideo = v;
      }
    }
    if (bestVideo) return bestVideo;

    let bestIframe = null;
    let bestIframeArea = 0;
    for (const iframe of document.querySelectorAll('iframe')) {
      const hit = inViewport(iframe);
      if (!hit) continue;
      if (hit.area > bestIframeArea) {
        bestIframeArea = hit.area;
        bestIframe = iframe;
      }
    }
    return bestIframe;
  }

  function refreshAnchor(pointerX, pointerY) {
    if (state.expanded) {
      showButton(state.expanded);
      return;
    }
    const t = pickAnchor(pointerX, pointerY);
    state.target = t;
    if (t) showButton(t);
    else hideButton();
  }

  function onPointerMove(e) {
    if (rafPending) return;
    const x = e.clientX;
    const y = e.clientY;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      refreshAnchor(x, y);
    });
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  window.addEventListener('scroll', () => refreshAnchor(), true);
  window.addEventListener('resize', () => refreshAnchor());

  function scan() {
    refreshAnchor();
  }

  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => refreshAnchor(), 1000);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!state.expanded && !state.childIframe) return;
    e.stopPropagation();
    exitAll();
    hideButton();
  }, true);
})();
