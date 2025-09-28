// ===== specialfx.js =====
// Fade-only transitions clipped to the #scene canvas.
// Sequence: title → fade→black → slow fade→room → fade→black → "where am I?"
//           → fade→room (final, stay open)

(function () {
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
    ctx = cvs.getContext('2d');

    const onResize = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
      const cssH = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      w = cssW; h = cssH;
      cvs.width  = Math.round(cssW * dpr);
      cvs.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateSceneRect();
    };
    window.addEventListener('resize', onResize, { passive:true });
    window.addEventListener('scroll',  onResize, { passive:true });
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

  // ---------- Easing ----------
  const ease = {
    quadIn:  t=>t*t,
    quadOut: t=>1-(1-t)*(1-t),
    quadInOut: t=> t<.5 ? 2*t*t : 1-((-2*t+2)**2)/2
  };

  // ---------- Draw fade ----------
  function drawFade(alpha) {
    clearCanvas();
    if (!ctx || alpha <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---------- Animate fade ----------
  function runFade({ from, to, dur=2000, easing='quadInOut' }) {
    return new Promise((resolve) => {
      ensureCanvas(); updateSceneRect();
      const ez = ease[easing] || ease.quadInOut;
      let t0 = performance.now();

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

  // ---------- “Where am I?” ----------
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
      Object.assign(line.style, {
        fontFamily: "'OrangeFogue', system-ui, sans-serif",
        color: '#F5E6C8',
        letterSpacing: '0.03em',
        lineHeight: '1.25',
        textAlign: 'center',
        width: '90vw',
        maxWidth: '1280px',
        fontSize: 'clamp(22px, 3.2vw, 48px)',
        opacity: '0',
        transform: 'translateY(6px)'
      });
      wrap.appendChild(line);

      wrap.style.transition = `opacity ${fadeInMs}ms ease-out`;
      line.style.transition = `opacity ${fadeInMs}ms ease-out, transform ${fadeInMs}ms ease-out`;

      requestAnimationFrame(() => {
        wrap.style.opacity = '1';
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        wrap.style.transition = `opacity ${fadeOutMs}ms ease-in`;
        line.style.transition = `opacity ${fadeOutMs}ms ease-in, transform ${fadeOutMs}ms ease-in`;
        wrap.style.opacity = '0';
        line.style.opacity = '0';
        line.style.transform = 'translateY(-6px)';
        setTimeout(() => { wrap.remove(); res(); }, fadeOutMs + 20);
      }, fadeInMs + holdMs);
    });
  }

  // ---------- Prologue sequence ----------
  const DUR_MS = 1000;  // normal fades
  const SLOW_OPEN_MS = 2000; // very slow first open

  FX.prologueSequence = async function () {
    ensureCanvas(); updateSceneRect();

    // Start closed → fade to black (instant, already black)
    await runFade({ from: 0, to: 1, dur: 0 });

    // Very slow first fade→room (eyes opening)
    await runFade({ from: 1, to: 0, dur: SLOW_OPEN_MS, easing: 'quadOut' });

    // One blink after
    await runFade({ from: 0, to: 1, dur: DUR_MS, easing: 'quadInOut' }); // fade→black
    await showWhereAmI({ fadeInMs: 1000, holdMs: 1000, fadeOutMs: 1000 });
    await runFade({ from: 1, to: 0, dur: DUR_MS, easing: 'quadInOut' }); // fade→room (final)

    clearCanvas();
  };

  // Immediately draw a solid black cover clipped to #scene (no animation)
FX.coverBlackNow = function () {
  ensureCanvas();
  updateSceneRect();
  // alpha 1 = full black over the room
  drawFade(1);
};

  window.SpecialFX = FX;
})();
