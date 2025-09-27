// ===== game.js (fit layout + glow + hover) =====

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const ui = document.getElementById('ui');

// Logical design resolution
const BASE_W = 1280;
const BASE_H = 720;

// Glow colors
const GLOW_BLACK = 'rgba(0,0,0,0.50)';       // 50% black
const GLOW_CREAM = 'rgba(245,230,200,0.95)'; // cream on hover (#F5E6C8)

// Asset paths
const ASSETS = {
  bg:     'img/bg.png',
  rug2:   'img/rug2.png',
  plant2: 'img/plant2.png',
  chair2: 'img/chair2.png',
  desk2:  'img/desk2.png',
  couch2: 'img/couch2.png',
};

// Layout (relative to 1280×720)
const OBJECTS = [
  { id: 'bg',     src: ASSETS.bg,     x: 0,   y: 0,   w: BASE_W, h: BASE_H, clickable: false },

  // Rug: 400×175 at (400, 533)
  { id: 'rug2',   src: ASSETS.rug2,   x: 400, y: 533, w: 400,  h: 175, clickable: true, onClick: () => Puzzles.rug2() },

  { id: 'plant2', src: ASSETS.plant2, x: 15,  y: 420, w: 177,  h: 300, clickable: true, onClick: () => Puzzles.plant2() },
  { id: 'chair2', src: ASSETS.chair2, x: 129, y: 241, w: 212,  h: 300, clickable: true, onClick: () => Puzzles.chair2() },
  { id: 'desk2',  src: ASSETS.desk2,  x: 992, y: 377, w: 280,  h: 283, clickable: true, onClick: () => Puzzles.desk2() },
  { id: 'couch2', src: ASSETS.couch2, x: 443, y: 199, w: 393,  h: 300, clickable: true, onClick: () => Puzzles.couch2() },
];

// State
const IMGS = {};
let _hoverId = null;

// Expose Game.start as before
window.Game = window.Game || {};
window.Game._started = window.Game._started || false;
window.Game.start = function () {
  if (this._started) return;
  this._started = true;
  init();
};

// ===== init / preload =====
async function init() {
  await Promise.all(OBJECTS.map(o => loadImage(o.src).then(img => { IMGS[o.id] = img; })));

  // input
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', () => { _hoverId = null; canvas.style.cursor = 'default'; });
  canvas.addEventListener('pointerdown', onPointerDown);

  // fit the canvas to viewport (letterbox)
  layoutCanvasFit();
  window.addEventListener('resize', layoutCanvasFit);
  window.addEventListener('orientationchange', layoutCanvasFit);

  requestAnimationFrame(draw);
}

// ===== FIT layout (no cropping; shows whole 1280×720) =====
function layoutCanvasFit() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // scale so the entire base fits within viewport
  const scale = Math.min(vw / BASE_W, vh / BASE_H);

  // CSS display size
  const cssW = Math.floor(BASE_W * scale);
  const cssH = Math.floor(BASE_H * scale);
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';

  // Backing pixel size for HiDPI
  const dpr = window.devicePixelRatio || 1;
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }

  // Map 1280×720 logical coords to scaled canvas
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

// ===== render =====
function draw() {
  // bg (no glow)
  const bg = OBJECTS[0];
  const bgImg = IMGS[bg.id];
  if (bgImg) ctx.drawImage(bgImg, bg.x, bg.y, bg.w, bg.h);

  // foreground with glow
  for (let i = 1; i < OBJECTS.length; i++) {
    const o = OBJECTS[i];
    const img = IMGS[o.id];
    if (!img) continue;
    const hovered = o.id === _hoverId;
    drawObjectWithGlow(img, o.x, o.y, o.w, o.h, hovered ? GLOW_CREAM : GLOW_BLACK);
  }

  requestAnimationFrame(draw);
}

// Tight outline + soft halo
function drawObjectWithGlow(img, x, y, w, h, glowColor) {
  // 1px edge
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // 2px halo
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 0.85;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();

  // sprite
  ctx.drawImage(img, x, y, w, h);
}

// ===== input / hit test =====
function onPointerMove(e) {
  const { x, y } = getPointerPosInBase(e);
  let hitId = null;
  for (let i = OBJECTS.length - 1; i >= 1; i--) {
    const o = OBJECTS[i];
    if (!o.clickable) continue;
    if (pointInRect(x, y, o)) { hitId = o.id; break; }
  }
  _hoverId = hitId;
  canvas.style.cursor = hitId ? 'pointer' : 'default';
}

function onPointerDown(e) {
  const { x, y } = getPointerPosInBase(e);
  for (let i = OBJECTS.length - 1; i >= 1; i--) {
    const o = OBJECTS[i];
    if (!o.clickable) continue;
    if (pointInRect(x, y, o)) { o.onClick?.(); break; }
  }
}

// Convert pointer from CSS pixels to base 1280×720 coords
function getPointerPosInBase(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / BASE_W; // because cssWidth = BASE_W * scale
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top)  / scale,
  };
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// ===== utils =====
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load ${src}: ${err?.message || err}`));
    img.src = src;
  });
}

// ===== tiny UI toast =====
const UI = {
  say(msg, ms = 1800) {
    ui.textContent = msg;
    clearTimeout(this._t);
    this._t = setTimeout(() => (ui.textContent = ''), ms);
  }
};

// ===== puzzle stubs =====
window.Puzzles = {
  rug2()   { UI.say('Rug puzzle (stub)'); },
  plant2() { UI.say('Plant puzzle (stub)'); },
  chair2() { UI.say('Chair puzzle (stub)'); },
  desk2()  { UI.say('Desk puzzle (stub)'); },
  couch2() { UI.say('Couch puzzle (stub)'); },
};
