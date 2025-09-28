// ===== specialfx.js =====
// Contracts:
// - Waits for 'title:done' → cover black → Game.start() → prologue/blink → 'fx:done' + 'blink:done'.
// - Waits for 'game:win' → crossfade to win.png (1s), hold full image 1s → show win text + Next → Credits.
// - On win: hide room scene, hide scratchpad (pad + toggle), hide restart button.
//
// Nothing else here runs until the right event arrives.

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
      line.style.fontFamily   = "'OrangeFogue', system-ui, sans-serif";
      line.style.color        = '#F5E6C8';
      line.style.letterSpacing= '0.03em';
      line.style.lineHeight   = '1.25';
      line.style.fontSize     = 'clamp(22px, 3.2vw, 48px)';
      line.style.margin       = '0 auto';
      line.style.width        = '90%';
      line.style.opacity      = '0';
      line.style.transform    = 'translateY(6px)';
      wrap.appendChild(line);

      requestAnimationFrame(() => {
        wrap.style.transition = `opacity ${fadeInMs}ms ease-out`;
        line.style.transition = `opacity ${fadeInMs}ms ease-out, transform ${fadeInMs}ms ease-out`;
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

  // ---------- Prologue (blink) ----------
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

  // ---------- Title handoff ----------
  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function onTitleDone() {
    try { FX.coverBlackNow(); } catch (_) {}
    await nextPaint(); await nextPaint();

    try {
      if (window.Game && typeof window.Game.start === 'function') {
        window.Game.start();
      }
    } catch (e) { console.warn('[specialfx] Game.start error:', e); }

    await nextPaint(); await nextPaint();

    try { await FX.prologueSequence(); } catch (e) { console.warn('[specialfx] prologue error:', e); }

    window.dispatchEvent(new CustomEvent('fx:done'));
    window.__blinkCompleted = true;
    window.dispatchEvent(new CustomEvent('blink:done'));
  }

  window.addEventListener('title:done', onTitleDone, { once: true });

  // ======================================================================
  // WIN SEQUENCE
  // ======================================================================

  // Default copy
  function getWinCopy() {
    const winBodyHTML = [
      'A slab of winter air knifes through the room.',
      'It stings your eyes and seizes your lungs.',
      'For one bright, painful second you feel awake.',
      'The fire hisses in protest.',
      'Outside is vast and cold; inside is bright and burning.',
      'You wonder whether you escaped the cabin, or carried it with you.'
    ].map(s => `<p>${s}</p>`).join('');

    const creditsHTML = `
      <p>Hi, I’m Jen. I made Escape the Hunter’s Cabin in forty-eight hours for a game jam.</p>
      <p>This was my first solo game jam. I painted all the art with real watercolours, made all the sounds, thought up the puzzles, and put it all together, all solo.</p>
      <p>While it’s currently a one level game, it would be easy enough to expand it to endless procedurally generated levels with themes. There is potential to expand this into a full Cree language and culture learning game; however, that would require the assistance of a Cree knowledge keeper.</p>
      <p>I am grateful to all of the Indigenous people I have met along my reconciliation journey. I acknowledge that we all have roles to play in meaningful reconciliation.</p>
      <p>For more information on local Indigenous culture, language, and history, visit <a href="https://wanuskewin.com" target="_blank" rel="noopener">wanuskewin.com</a>.</p>
    `;
    return {
      winTitle: 'you wrench the window open',
      winBodyHTML,
      creditsHTML
    };
  }

  // Build win overlay that shows win.png *at the room area* (5% larger),
  // crossfades in 1s, holds 1s, then reveals text + Next→Credits.
  FX.runWinSequence = async function runWinSequence() {
    const copy = getWinCopy();

    // Hide gameplay UI at win start (scene still laid out so we can read its rect)
    const scene = document.getElementById('scene');
    const ui    = document.getElementById('ui');
    const sp    = document.getElementById('scratchpad');
    const spTog = document.querySelector('button[aria-label="Toggle scratch pad"]');
    const restartBtn = document.getElementById('restart-btn');
    try { if (scene) scene.style.visibility = 'hidden'; } catch {}
    try { if (ui)    ui.style.visibility    = 'hidden'; } catch {}
    try { if (sp)    sp.style.display       = 'none';    } catch {}
    try { if (spTog) spTog.style.display    = 'none';    } catch {}
    try { if (restartBtn) restartBtn.style.display = 'none'; } catch {}

    // wrapper covers viewport; we place a "panel" over the #scene rect for the image
    const wrap = document.createElement('div');
    wrap.id = 'win-screen';
    Object.assign(wrap.style, {
      position: 'fixed',
      inset: '0',
      zIndex: String(Z_TEXT + 20),
      opacity: '0',
      transition: 'opacity 1000ms ease',
      pointerEvents: 'auto',
      display: 'grid',
      gridTemplateRows: '1fr auto',
      alignItems: 'stretch',
      justifyItems: 'center'
    });

    // panel matches #scene rect and paints win.png at 105% (slightly larger to cover gaps)
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      background: "url('img/win.png') center center / 105% 105% no-repeat #000",
      pointerEvents: 'none'
    });

    // ===== Text panel + host =====
    // A soft, subtle panel that helps text pop without crushing the art
    const textPanel = document.createElement('div');
    Object.assign(textPanel.style, {
      alignSelf: 'start',
      width: 'min(900px, 92vw)',
      marginTop: '10vh',
      borderRadius: '14px',
      padding: '16px 20px',
      // warm soot / glass over fire art
      background: 'linear-gradient(180deg, rgba(178, 183, 255, 0.7), rgba(178, 183, 255, 0.7))',
      border: '1px solid rgba(66, 106, 250, 0.25)',
      boxShadow: '0 12px 36px rgba(255, 255, 255, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(2px) saturate(0.9)',
      WebkitBackdropFilter: 'blur(2px) saturate(0.9)',
      pointerEvents: 'none' // panel shouldn’t eat clicks
    });

    const textHost = document.createElement('div');
    Object.assign(textHost.style, {
      textAlign: 'center',
      pointerEvents: 'none'
    });

    textPanel.appendChild(textHost);

    // keep panel aligned with scene
    function syncPanelToScene() {
      updateSceneRect();
      panel.style.left   = `${Math.round(sx)}px`;
      panel.style.top    = `${Math.round(sy)}px`;
      panel.style.width  = `${Math.round(sw)}px`;
      panel.style.height = `${Math.round(sh)}px`;
    }
    syncPanelToScene();
    window.addEventListener('resize', syncPanelToScene);
    window.addEventListener('scroll',  syncPanelToScene, { passive: true });

    document.body.appendChild(panel);
    document.body.appendChild(wrap);

    // Crossfade wrap (reveals panel) in 1s
    void wrap.offsetWidth;
    wrap.style.opacity = '1';
    await new Promise(r => setTimeout(r, 1000));

    // Hold full image (no text) for 1s
    await new Promise(r => setTimeout(r, 1000));

    // ===== Build Win Text =====
    const styleTextBlock = (el, sizeClamp) => {
      el.style.fontFamily   = "'OrangeFogue', system-ui, sans-serif"; // wall font
      el.style.letterSpacing= '0.03em';
      el.style.lineHeight   = '1.35';
      el.style.color        = '#5C4033'; // Bear Brown
      el.style.fontSize     = sizeClamp;
      if ('webkitTextStroke' in el.style) {
        el.style.webkitTextStroke = '2px rgba(0,0,0,0.6)';
      } else {
        el.style.textShadow =
          '-2px 0 rgba(0,0,0,.6), 2px 0 rgba(0,0,0,.6), 0 -2px rgba(0,0,0,.6), 0 2px rgba(0,0,0,.6),' +
          '-2px -2px rgba(0,0,0,.6), 2px -2px rgba(0,0,0,.6), -2px 2px rgba(0,0,0,.6), 2px 2px rgba(0,0,0,.6)';
      }
      // subtle white glow just outside stroke to lift from art
      el.style.textShadow += ', 0 0 2px rgba(255,255,255,.5)';
    };

    const winTitle = document.createElement('div');
    winTitle.textContent = copy.winTitle || 'you wrench the window open';
    styleTextBlock(winTitle, 'clamp(28px, 4vw, 48px)');

    const winBody = document.createElement('div');
    winBody.innerHTML = copy.winBodyHTML || '';
    styleTextBlock(winBody, 'clamp(30px, 3.2vw, 30px)'); // body text +5px
    Array.from(winBody.querySelectorAll('p')).forEach(p => {
      p.style.margin = '1.05em 0 0 0'; // generous spacing
    });

    textHost.append(winTitle, winBody);
    wrap.appendChild(textPanel);

    // ===== Next button → Credits =====
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      alignSelf: 'end',
      width: 'min(900px, 92vw)',
      margin: '0 0 6vh 0',
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'auto'
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = 'Next';
    Object.assign(nextBtn.style, {
      fontFamily: "'OrangeFogue', system-ui, sans-serif",
      fontSize: 'clamp(16px, 2.2vw, 16px)', // fixed 16px
      letterSpacing: '0.02em',
      padding: '12px 18px',
      borderRadius: '12px',
      border: '1px solid #31221bff',
      background: '#5C4033',  // Bear Brown
      color: '#F5E6C8',       // Cream
      cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(0,0,0,0.35)'
    });
    nextBtn.onmouseenter = () => { nextBtn.style.filter = 'brightness(1.08)'; };
    nextBtn.onmouseleave = () => { nextBtn.style.filter = 'none'; };

    btnRow.appendChild(nextBtn);
    wrap.appendChild(btnRow);

    // --- Credits builder ---
    function showCredits() {
      // clear win text
      textHost.innerHTML = '';

      // Title — puzzle font, mid-weight, black, outline + faint white glow
      const title = document.createElement('div');
      title.textContent = 'credits';
      title.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      title.style.fontWeight = '700';
      title.style.letterSpacing = '0.02em';
      title.style.lineHeight = '1.25';
      title.style.color = '#000000ff';
      title.style.fontSize = 'clamp(48px, 4vw, 48px)';


      // Body — puzzle font, EXACT 10px, glow just outside outline
      const body = document.createElement('div');
      body.innerHTML = (getWinCopy().creditsHTML || '').trim();
      body.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      body.style.fontWeight = '700';
      body.style.letterSpacing = '0.02em';
      body.style.lineHeight = '1.35';
      body.style.color = '#000000ff';
      body.style.fontSize = '23px'; // fixed 10px (no bump)
      body.style.marginTop = '0.8em';


      // ensure nested content also renders mid-weight + exact 10px
      Array.from(body.querySelectorAll('p')).forEach(p => {
        p.style.margin = '0.9em 0 0 0';
        p.style.fontWeight = '400';
        p.style.fontSize = '23px';

      });
      Array.from(body.querySelectorAll('a')).forEach(a => {
        a.style.color = '#ff5100ff';
        a.style.textDecoration = 'underline';
        a.style.textDecorationThickness = '2px';
        a.style.fontWeight = '400';
        a.style.fontSize = '23px';

      });

      textHost.append(title, body);

      // Re-use the same subtle panel (already added as textPanel)
      // Just keep it; we only switched the content inside textHost.

      // Turn "Next" into "Restart"
      nextBtn.textContent = 'Restart';
      nextBtn.onclick = () => {
        try { localStorage.setItem('scratchpad:open:v1','0'); } catch {}
        try { window.location.reload(); }
        catch { window.location.href = window.location.href; }
      };
    }

    // IMPORTANT: only assign once here; do not overwrite later
    nextBtn.onclick = showCredits;
  };

  async function onGameWin() {
    try {
      await FX.runWinSequence();
    } catch (e) {
      console.warn('[specialfx] win sequence error:', e);
    }
  }

  // Arm listener for Win (only once)
  window.addEventListener('game:win', onGameWin, { once: true });

  // Export
  window.SpecialFX = FX;
})();
