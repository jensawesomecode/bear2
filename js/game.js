// ===== game.js =====
// Draws the room, adds glow/hover, and wires click → puzzle openers.
// Glow logic:
// - Unsolved object: Royal Purple (now BIGGER)
// - Solved object: Bear Brown
// - Rug: stays Bear Brown until chair+plant+desk solved, then turns Purple until solved
// - Hover wins: Cream
// - EXTRA: Chair's purple glow pulses until it's clicked once.

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const ui = document.getElementById('ui');

// ---------- colors ----------
const GLOW_CREAM   = 'rgba(245,230,200,0.95)'; // on hover (#F5E6C8)
const BEAR_BROWN   = '#5C4033';
const ROYAL_PURPLE = 'rgba(91, 24, 194, 0.90)';

// ---------- asset paths ----------
const ASSETS = {
  bg:     'img/bg.png',
  rug2:   'img/rug2.png',
  plant2: 'img/plant2.png',
  chair2: 'img/chair2.png',
  desk2:  'img/desk2.png',
  couch2: 'img/couch2.png',
};

// ---------- layout (relative to 1280×720 bg) ----------
const OBJECTS = [
  { id: 'bg',     src: ASSETS.bg,     x: 0,   y: 0,   w: 1280, h: 720, clickable: false },

  // Rug: 400×175 at (400, 533)
  { id: 'rug2',   src: ASSETS.rug2,   x: 400, y: 533, w: 400,  h: 175, clickable: true,  onClick: () => Puzzles.rug2() },

  { id: 'plant2', src: ASSETS.plant2, x: 15,  y: 420, w: 177,  h: 300, clickable: true,  onClick: () => Puzzles.plant2() },
  { id: 'chair2', src: ASSETS.chair2, x: 129, y: 241, w: 212,  h: 300, clickable: true,  onClick: () => Puzzles.chair2() },
  { id: 'desk2',  src: ASSETS.desk2,  x: 992, y: 377, w: 280,  h: 283, clickable: true,  onClick: () => Puzzles.desk2() },
  { id: 'couch2', src: ASSETS.couch2, x: 443, y: 199, w: 393,  h: 300, clickable: true,  onClick: () => Puzzles.couch2?.() || UI.say('Couch (no puzzle yet)') },
];

// ---------- image cache ----------
const IMGS = {};
let _hoverId = null;
// track first-click to stop chair pulsing after it’s been clicked once
const _clickedOnce = Object.create(null);

// Make sure Game exists and Title/Story can call Game.start()
window.Game = window.Game || {};
window.Game._started = window.Game._started || false;
window.Game.start = function start() {
  if (this._started) return;
  this._started = true;
  init();
};

// ---------- init / preload ----------
async function init() {
  await Promise.all(
    OBJECTS.map(o => loadImage(o.src).then(img => { IMGS[o.id] = img; }))
  );

  // input
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', () => { _hoverId = null; canvas.style.cursor = 'default'; });

  // render
  requestAnimationFrame(draw);
  // keep pixels crisp on HiDPI while respecting CSS size
  resizeCanvasToDisplaySize();
  window.addEventListener('resize', resizeCanvasToDisplaySize);
  window.addEventListener('orientationchange', resizeCanvasToDisplaySize);

  // install scratch pad & wrap puzzles
  ScratchPad.install();
  
  ScratchPad.patchPuzzles();
}

// ---------- render ----------
function draw(nowMs) {
  // draw bg
  const bg = OBJECTS[0];
  const bgImg = IMGS[bg.id];
  if (bgImg) ctx.drawImage(bgImg, bg.x, bg.y, bg.w, bg.h);

  // draw the rest with dynamic glow (includes pulsing chair if needed)
  for (let i = 1; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    const img = IMGS[o.id];
    if (!img) continue;

    const hovered = (o.id === _hoverId);
    const color = glowForObject(o, hovered);

    // Pulse only if: it's the chair, it is currently in purple (unsolved) state, and hasn't been clicked yet
    let pulseScale = 1;
    if (o.id === 'chair2' && color === ROYAL_PURPLE && !_clickedOnce['chair2']) {
      const t = (performance.now() || nowMs || 0) * 0.001; // seconds
      const HZ = 1.1; // gentle pulse frequency
      // scale between ~0.9 and ~1.25
      pulseScale = 0.9 + 0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * HZ * t));
    }

    drawObjectWithGlow(img, o.x, o.y, o.w, o.h, color, { pulseScale });
  }

  requestAnimationFrame(draw);
}

// ---------- glow color per object ----------
function glowForObject(o, isHovered) {
  if (isHovered) return GLOW_CREAM;

  const solvedMap = (window.GameState && window.GameState.solved) || {};
  const isSolved = !!solvedMap[o.id];

  if (o.id === 'rug2') {
    const allOthersSolved = ['chair2', 'plant2', 'desk2'].every(id => solvedMap[id]);
    if (!allOthersSolved) return BEAR_BROWN;     // rug locked until others solved
    return isSolved ? BEAR_BROWN : ROYAL_PURPLE; // unlocked hint until rug solved
  }

  return isSolved ? BEAR_BROWN : ROYAL_PURPLE;
}

// ---------- draw helper: tight outline + soft halo ----------
// Now with larger purple glow; optional pulsing via pulseScale > 1
function drawObjectWithGlow(img, x, y, w, h, glowColor, { pulseScale = 1 } = {}) {
  // Baselines
  let edgeBlur = 4;
  let haloBlur = 6;
  let alphaEdge = 1.0;
  let alphaHalo = 0.85;

  // Make purple glows bigger (for ALL objects in purple state)
  if (glowColor === ROYAL_PURPLE) {
    edgeBlur = 10;
    haloBlur = 24;
    alphaHalo = 0.95;
  }

  // Apply pulsing (used for chair's purple state until first click)
  edgeBlur *= pulseScale;
  haloBlur *= pulseScale;

  // 1) tight edge
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = edgeBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = alphaEdge;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // 2) big soft halo
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = haloBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = alphaHalo;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // 3) sprite
  ctx.drawImage(img, x, y, w, h);
}

// ---------- input / hit test ----------
function onPointerMove(e) {
  const { x, y } = getPointerPos(e);
  let hitId = null;

  // front-to-back check for clickable objects
  for (let i = OBJECTS.length - 1; i >= 1; i--) {
    const o = OBJECTS[i];
    if (!o.clickable) continue;
    if (pointInRect(x, y, o)) { hitId = o.id; break; }
  }

  _hoverId = hitId;
  canvas.style.cursor = hitId ? 'pointer' : 'default';
}

function onPointerDown(e) {
  const { x, y } = getPointerPos(e);

  // front-to-back so topmost wins
  for (let i = OBJECTS.length - 1; i >= 1; i--) {
    const o = OBJECTS[i];
    if (!o.clickable) continue;
    if (pointInRect(x, y, o)) {
      // mark first-click to stop pulsing for that object
      _clickedOnce[o.id] = true;
      o.onClick?.();
      break;
    }
  }
}

function getPointerPos(e) {
  const { left, top, width, height } = canvas.getBoundingClientRect();
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  return {
    x: (e.clientX - left) * scaleX,
    y: (e.clientY - top)  * scaleY
  };
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// ---------- utils ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load ${src}: ${err?.message || err}`));
    img.src = src;
  });
}

// ---------- tiny UI toast ----------
const UI = {
  say(msg, ms = 1800) {
    if (!ui) return;
    ui.textContent = msg;
    clearTimeout(this._t);
    this._t = setTimeout(() => (ui.textContent = ''), ms);
  }
};
window.UI = UI;

// ---------- DPI-aware canvas sizing ----------
function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    // We draw using logical 1280x720 coordinates; scale to fit
    const scaleX = w / 1280;
    const scaleY = h / 720;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  }
}

/* =======================================================================
   SCRATCH PAD (for all puzzles)
   ======================================================================= */
const ScratchPad = (() => {
  const Z = 3000; // above puzzle overlays
  const LS_KEY_TEXT = 'scratchpad:text:v1';
  const LS_KEY_OPEN = 'scratchpad:open:v1';
  const LS_KEY_MIN  = 'scratchpad:min:v1';
  const LS_KEY_RECT = 'scratchpad:rect:v1';

  let root, header, ta, btnClose, btnClear, btnMin, btnResize, btnToggle;
  let dragging = false, dragOffX = 0, dragOffY = 0;
  let resizing = false, resizeStartX = 0, resizeStartY = 0, startW = 0, startH = 0;
  let patched = false;

  function install() {
    if (root) return;

    // --- container ---
    root = document.createElement('div');
    root.id = 'scratchpad';
    Object.assign(root.style, {
      position: 'fixed',
      right: '16px',
      top: '16px',
      width: '340px',
      height: '260px',
      display: 'none',
      zIndex: String(Z),
      background: '#F5E6C8',
      color: 'rgba(0,0,0,1)',
      border: '1px solid #5C4033',
      borderRadius: '10px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(2px)',
      overflow: 'hidden',
      userSelect: 'none'
    });

    // restore rect
    try {
      const r = JSON.parse(localStorage.getItem(LS_KEY_RECT) || 'null');
      if (r && typeof r === 'object') {
        if (r.top != null) root.style.top = r.top;
        if (r.right != null) root.style.right = r.right;
        if (r.width != null) root.style.width = r.width;
        if (r.height != null) root.style.height = r.height;
      }
    } catch {}

    // --- header ---
    header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      padding: '8px 10px',
      background: 'rgba(92,64,51,0.6)',
      cursor: 'move',
      font: '600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    });
    header.textContent = 'Your Notes';

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '6px' });

    btnClear = makeButton('Clear');
    btnMin   = makeButton('—');
    btnClose = makeButton('×');

    btnRow.append(btnClear, btnMin, btnClose);
    header.append(btnRow);

    // --- textarea ---
    ta = document.createElement('textarea');
    Object.assign(ta.style, {
      width: '100%',
      height: '100%',
      flex: '1 1 auto',
      resize: 'none',
      background: 'transparent',
      color: '#F5E6C8',
      border: 'none',
      outline: 'none',
      font: '13px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      padding: '10px'
    });
    ta.value = localStorage.getItem(LS_KEY_TEXT) || '';
    ta.addEventListener('input', () => {
      localStorage.setItem(LS_KEY_TEXT, ta.value);
    });

    // --- resizer ---
    btnResize = document.createElement('div');
    Object.assign(btnResize.style, {
      position: 'absolute',
      width: '16px',
      height: '16px',
      right: '0',
      bottom: '0',
      cursor: 'nwse-resize',
      background: 'linear-gradient(135deg, transparent 50%, rgba(245,230,200,.5) 50%)'
    });

    // --- toggle chip (always visible) ---
    btnToggle = document.createElement('button');
    btnToggle.ariaLabel = 'Toggle scratch pad';
    btnToggle.textContent = '✎';
    Object.assign(btnToggle.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: String(Z),
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      border: '1px solid #5C4033',
      background: 'rgba(0,0,0,0.85)',
      color: '#F5E6C8',
      cursor: 'pointer'
    });
    btnToggle.addEventListener('click', toggle);

    root.append(header, ta, btnResize);
    document.body.append(root, btnToggle);

 // always start hidden on game load; still remember minimized state
hide();
if (localStorage.getItem(LS_KEY_MIN) === '1') minimize(true);


    // drag
    header.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      root.setPointerCapture(e.pointerId);
      const r = root.getBoundingClientRect();
      dragOffX = e.clientX - r.right; // we store using right/top
      dragOffY = e.clientY - r.top;
    });
    header.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      root.style.right = `${Math.max(0, window.innerWidth - e.clientX + dragOffX)}px`;
      root.style.top   = `${Math.max(0, e.clientY - dragOffY)}px`;
      saveRect();
    });
    header.addEventListener('pointerup', (e) => { dragging = false; try { root.releasePointerCapture(e.pointerId); } catch {} });

    // resize
    btnResize.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      resizing = true;
      root.setPointerCapture(e.pointerId);
      const r = root.getBoundingClientRect();
      startW = r.width; startH = r.height;
      resizeStartX = e.clientX; resizeStartY = e.clientY;
    });
    btnResize.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      root.style.width  = `${Math.max(240, startW + dx)}px`;
      root.style.height = `${Math.max(160, startH + dy)}px`;
      saveRect();
    });
    btnResize.addEventListener('pointerup', (e) => { resizing = false; try { root.releasePointerCapture(e.pointerId); } catch {} });

    // buttons
    btnClose.addEventListener('click', hide);
    btnMin.addEventListener('click', () => minimize());
    btnClear.addEventListener('click', () => { ta.value = ''; localStorage.setItem(LS_KEY_TEXT, ''); });

    // expose helpers
    window.ScratchPad = ScratchPadAPI;
  }

  function makeButton(label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    Object.assign(b.style, {
      font: '600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      padding: '6px 8px',
      borderRadius: '6px',
      border: '1px solid #5C4033',
      background: 'rgba(0,0,0,0.65)',
      color: '#F5E6C8',
      cursor: 'pointer'
    });
    return b;
  }

  function saveRect() {
    const s = {
      top: root.style.top,
      right: root.style.right,
      width: root.style.width,
      height: root.style.height
    };
    localStorage.setItem(LS_KEY_RECT, JSON.stringify(s));
  }

  function show() {
    root.style.display = 'block';
    localStorage.setItem(LS_KEY_OPEN, '1');
    ta.focus();
  }
  function hide() {
    root.style.display = 'none';
    localStorage.setItem(LS_KEY_OPEN, '0');
  }
  function toggle() {
    if (!root) return;
    const open = root.style.display !== 'none';
    open ? hide() : show();
  }
  function minimize(force) {
    const isMin = (typeof force === 'boolean') ? force : ta.style.display !== 'none';
    if (isMin) {
      ta.style.display = 'none';
      root.style.height = '44px';
      localStorage.setItem(LS_KEY_MIN, '1');
    } else {
      ta.style.display = 'block';
      try {
        const r = JSON.parse(localStorage.getItem(LS_KEY_RECT) || '{}');
        root.style.height = r.height || '260px';
      } catch {
        root.style.height = '260px';
      }
      localStorage.setItem(LS_KEY_MIN, '0');
    }
  }

  function patchPuzzles() {
    if (patched) return;
    const target = window.Puzzles;
    if (!target) {
      // try again shortly; puzzle.js may load later
      setTimeout(patchPuzzles, 250);
      return;
    }
    Object.keys(target).forEach((k) => {
      const fn = target[k];
      if (typeof fn !== 'function') return;
      if (fn.__wrappedScratch) return;
      target[k] = function wrappedPuzzleOpener(...args) {
        try { show(); } catch {}
        return fn.apply(this, args);
      };
      target[k].__wrappedScratch = true;
    });
    patched = true;
  }

  const ScratchPadAPI = { install, patchPuzzles, show, hide, toggle };
  return ScratchPadAPI;
})();
