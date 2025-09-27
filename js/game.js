// ===== game.js =====
// Draws the room, adds glow/hover, and wires click → puzzle openers.
// Glow logic:
// - Unsolved object: Royal Purple
// - Solved object: Bear Brown
// - Rug: stays Bear Brown until chair+plant+desk solved, then turns Purple until solved
// - Hover wins: Cream

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
}

// ---------- render ----------
function draw() {
  // draw bg
  const bg = OBJECTS[0];
  const bgImg = IMGS[bg.id];
  if (bgImg) ctx.drawImage(bgImg, bg.x, bg.y, bg.w, bg.h);

  // draw the rest with dynamic glow
  for (let i = 1; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    const img = IMGS[o.id];
    if (!img) continue;

    const hovered = (o.id === _hoverId);
    const color = glowForObject(o, hovered);
    drawObjectWithGlow(img, o.x, o.y, o.w, o.h, color);
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
function drawObjectWithGlow(img, x, y, w, h, glowColor) {
  // 1px edge
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // 2px halo
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 0.85;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // sprite
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
    if (pointInRect(x, y, o)) { o.onClick?.(); break; }
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
