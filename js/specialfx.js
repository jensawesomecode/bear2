// ===== specialfx.js =====
// Contract: does NOTHING until it receives 'title:done'.
// On 'title:done': cover black → start the game → play the blink/prologue.
// When done, dispatch 'blink:done' (and 'fx:done' for backwards compat).

(function () {
  'use strict';

  const FX = {};
  const Z_CANVAS = 2147483000;
  const Z_TEXT   = Z_CANVAS + 1;

  // ---------- Fullscreen FX canvas ----------
  let cvs, ctx, w=0, h=0, dpr=1;
  function ensureCanvas() {
    if (cvs && ctx) return;
    cvs = document.createElement('canvas');
    Object.assign(cvs.style, {
      position: 'fixed',
      left: '0', top: '0',
      width: '100vw', height: '100vh',
      zIndex: String(Z_CANVAS),
      pointerEvents: 'none',
      mixBlendMode: 'normal'
    });
    document.body.appendChild(cvs);
    ctx = cvs.getContext('2d', { alpha: true });
    onResize();
  }

  function clearCanvas(){ if(ctx) ctx.clearRect(0,0,w,h); }

  // ---------- Track #scene rect ----------
  let sx=0, sy=0, sw=0, sh=0;
  function updateSceneRect() {
    const sc = document.getElementById('scene');
    if (sc) {
      const r = sc.getBoundingClientRect();
      sx=r.left; sy=r.top; sw=r.width; sh=r.height;
    } else {
      sx=0; sy=0; sw=w; sh=h;
    }
  }

  function onResize() {
    ensureCanvas();
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
    const cssH = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    w = cssW; h = cssH;
    cvs.width  = Math.round(cssW * dpr);
    cvs.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateSceneRect();
  }
  window.addEventListener('resize', onResize, { passive:true });
  window.addEventListener('scroll',  onResize, { passive:true });

  // ---------- Easing ----------
  const ease = {
    linear: t => t,
    quadInOut: t => (t<.5 ? 2*t*t : -1+(4-2*t)*t)
  };

  // ---------- Fade drawer clipped to #scene ----------
  function drawFade(alpha) {
    clearCanvas();
    updateSceneRect();
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
  }

  function runFade({ from=0, to=1, dur=1000, easing='linear' }={}) {
    const ez = ease[easing] || ease.linear;
    return new Promise((resolve) => {
      const t0 = performance.now();
      function step(now) {
        const t = Math.min(1, dur ? (now - t0) / dur : 1);
        const v = from + (to - from) * ez(t);
        drawFade(v);
        if (t >= 1) { resolve(); return; }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // ---------- “Where am I?” (match story.css .story-line) ----------
  function showWhereAmI({ fadeInMs=1000, holdMs=1000, fadeOutMs=1000 }={}) {
    return new Promise((res) => {
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        position: 'fixed',
        left: '0', top: '0',
        width: '100vw', height: '100vh',
        zIndex: String(Z_TEXT),
        display: 'grid',
        placeItems: 'center',
        background: '#000',
        opacity: '0',
        pointerEvents: 'none'
      });
      document.body.appendChild(wrap);

      const line = document.createElement('div');
      line.textContent = 'where am i?';
      // Mirror story.css → font, color, spacing, size
      line.style.fontFamily   = "'OrangeFogue', system-ui, sans-serif"; // same as #story-screen .story-line
      line.style.color        = '#F5E6C8';                              // cream
      line.style.letterSpacing= '0.03em';
      line.style.lineHeight   = '1.25';
      line.style.fontSize     = 'clamp(22px, 3.2vw, 48px)';
      line.style.margin       = '0 auto';
      line.style.width        = '90%';
      // Local fade (we keep our own timing; no story-enter/exit classes)
      line.style.opacity      = '0';
      line.style.transform    = 'translateY(6px)';
      wrap.appendChild(line);

      // fade in
      requestAnimationFrame(() => {
        wrap.style.transition = `opacity ${fadeInMs}ms ease-out`;
        line.style.transition = `opacity ${fadeInMs}ms ease-out, transform ${fadeInMs}ms ease-out`;
        wrap.style.opacity = '1';
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        // fade out
        wrap.style.transition = `opacity ${fadeOutMs}ms ease-in`;
        line.style.transition = `opacity ${fadeOutMs}ms ease-in, transform ${fadeOutMs}ms ease-in`;
        wrap.style.opacity = '0';
        line.style.opacity = '0';
        line.style.transform = 'translateY(-6px)';
        setTimeout(() => { wrap.remove(); res(); }, fadeOutMs + 20);
      }, fadeInMs + holdMs);
    });
  }

  // ---------- Prologue (blink) sequence ----------
  const DUR_MS = 1000;
  const SLOW_OPEN_MS = 2000;

  FX.prologueSequence = async function () {
    ensureCanvas(); onResize();

    // fade from black to the room (slow first open)
    await runFade({ from: 1, to: 0, dur: SLOW_OPEN_MS, easing: 'quadInOut' });

    // blink to black then open again
    await runFade({ from: 0, to: 1, dur: DUR_MS, easing: 'quadInOut' }); // room→black
    await runFade({ from: 1, to: 0, dur: DUR_MS, easing: 'quadInOut' }); // black→room

    // another blink + "where am I?"
    await runFade({ from: 0, to: 1, dur: DUR_MS, easing: 'quadInOut' }); // room→black
    await showWhereAmI({ fadeInMs: 1000, holdMs: 1000, fadeOutMs: 1000 });
    await runFade({ from: 1, to: 0, dur: DUR_MS, easing: 'quadInOut' }); // black→room (final)

    clearCanvas();
  };

  // Immediately draw a solid black cover clipped to #scene (no animation)
  FX.coverBlackNow = function () {
    ensureCanvas(); onResize();
    drawFade(1);
  };

  // ---------- Event gating: wait for 'title:done' ----------
  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function onTitleDone() {
    // 1) cover the scene black immediately (no flash)
    try { FX.coverBlackNow(); } catch (_) {}

    // 2) give the browser two paints
    await nextPaint(); await nextPaint();

    // 3) start the game under cover
    try {
      if (window.Game && typeof window.Game.start === 'function') {
        window.Game.start();
      }
    } catch (e) {
      console.warn('[specialfx] Game.start error:', e);
    }

    // 4) let the scene render a couple frames before animating
    await nextPaint(); await nextPaint();

    // 5) run the prologue/blink sequence
    try { await FX.prologueSequence(); } catch (e) { console.warn('[specialfx] prologue error:', e); }

    // 6) finished — announce blink completion (and legacy fx:done)
    window.__blinkCompleted = true;
    window.dispatchEvent(new CustomEvent('blink:done'));
    window.dispatchEvent(new CustomEvent('fx:done'));
  }

  // Arm listener immediately; do nothing until event arrives
  window.addEventListener('title:done', onTitleDone, { once: true });

  // Export
  window.SpecialFX = FX;
})();
