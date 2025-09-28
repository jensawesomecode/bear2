// ===== wall.js =====
// - Waits for 'blink:done' (fallback: 'fx:done') or window.__blinkCompleted.
// - After that, shows 35 lines (array order) and plays audio 1.mp3..35.mp3
//   across exactly 7 minutes. Initial silence equals the between-clip gap.
// - Text matches story size/spacing; color/outline matches title.
// - Text wraps at 650px, positioned 30px below #scene top, centered.
// - Loops fire.mp3 quietly under narration (if present) and ducks it by 50% during clips.
// - Console logs only (no on-screen debug).

(function () {
  'use strict';

  // ----- Lines in order (index 0→1.mp3 ... 34→35.mp3) -----
  const WALL_LINES = [
    "How’d I get here?",
    "I’m so cozy.",
    "Who lives here?",
    "Why’d they paint their walls that shade of salmon?",
    "Where are my boots?",
    "Why am I so hot?",
    "The fire is really hot.",
    "It’s like a sauna in here.",
    "I need to open a window.",
    "You have to be kidding me — the window is password protected?",
    "Bring the heat!",
    "I’m not hot, you're hot!",
    "Burning up like a mixtape.",
    "Too hot to handle.",
    "I’m roasting alive in here.",
    "This isn’t cozy, it’s cremation.",
    "Who needs hell when you’ve got this cabin?",
    "This must be what marshmallows feel like.",
    "The wallpaper is starting to sweat.",
    "Maybe I’m the honeycomb.",
    "Every crackle of the fire sounds like claws on the door.",
    "The Rug is Alive. It wants company.",
    "The fire isn’t hungry. It’s patient.",
    "The fire crackles in Morse code: RUN.",
    "I swear the rug just exhaled smoke.",
    "Every shadow has claws.",
    "The rug twitches when I look away.",
    "Who’s hunting who — the man, the fire, or the bear?",
    "Something under the rug keeps whispering, “let me out.” I told it no.",
    "You don’t remember lighting the fire, do you? That’s fine. It remembers you.",
    "The couch whispers: come play with us, forever.",
    "Every knock at the door is me, coming back wrong.",
    "The fire keeps asking me to feed it fingers. I told it I’m saving yours.",
    "Don’t mind the buzzing. The bees are in my teeth again.",
    "The window isn’t password protected. It’s just… watching."
  ];

  // Audio mapping 1..35
  const SEQ = Array.from({ length: WALL_LINES.length }, (_, i) => i + 1);

  // Durations (ms)
  const KNOWN_DUR_MS = { 33: 7000, 30: 6000, 29: 6000, 34: 5000, 35: 5000, 31: 5000 };
  const DEFAULT_DUR_MS = 3000;
  const durFor = (n) => (n in KNOWN_DUR_MS ? KNOWN_DUR_MS[n] : DEFAULT_DUR_MS);

  // Schedule target
  const TOTAL_MS = 7 * 60 * 1000; // 7 minutes

  // Visual timings (inline transitions)
  const FADE_IN_MS  = 600;
  const FADE_OUT_MS = 500;

  // Fire loop
  const FIRE_SRC = 'sound/fire.mp3';
  const FIRE_VOL_BASE = 1.0;
  const FIRE_VOL_DUCK = 0.5; // 50% during numbered clips

  // Layering
  const Z_UNDER_PUZZLES = 1400;

  // Helpers
  const log = (...a) => console.log('[wall]', ...a);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function mkAudio(src, { loop = false, vol = 1.0 } = {}) {
    const el = new Audio();
    el.src = src;
    el.loop = loop;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.volume = vol;
    try { el.load(); } catch {}
    return el;
  }

  // Build host AFTER blink so we never overlap title
  let host, line, positionHostBound;
  function buildHost() {
    host = document.createElement('div');
    Object.assign(host.style, {
      position: 'fixed',
      top: '0px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '650px',
      maxWidth: '650px',
      zIndex: String(Z_UNDER_PUZZLES),
      pointerEvents: 'none',
      textAlign: 'center'
    });

    line = document.createElement('div');
    Object.assign(line.style, {
      fontFamily: "'OrangeFogue', system-ui, sans-serif", // story font
      letterSpacing: '0.03em',
      lineHeight: '1.25',
      fontSize: 'clamp(22px, 3.2vw, 48px)',               // story size
      margin: '0 auto',
      color: '#5C4033',                                   // title color
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      hyphens: 'auto',
      // outline (title-like)
      textShadow:
        '-2px 0 rgba(0,0,0,.5), 2px 0 rgba(0,0,0,.5), 0 -2px rgba(0,0,0,.5), 0 2px rgba(0,0,0,.5),' +
        '-2px -2px rgba(0,0,0,.5), 2px -2px rgba(0,0,0,.5), -2px 2px rgba(0,0,0,.5), 2px 2px rgba(0,0,0,.5)',
      opacity: '0',
      transform: 'translateY(6px)',
      transition: `opacity ${FADE_IN_MS}ms ease-out, transform ${FADE_IN_MS}ms ease-out`
    });
    if ('webkitTextStroke' in line.style) {
      line.style.webkitTextStroke = '2px rgba(0,0,0,.5)';
      line.style.textShadow = 'none';
    }

    host.appendChild(line);
    document.body.appendChild(host);

    const positionHost = () => {
      const sc = document.getElementById('scene');
      if (sc) {
        const r = sc.getBoundingClientRect();
        host.style.top = `${Math.round(r.top + 30)}px`;
        host.style.left = `${Math.round(r.left + r.width / 2)}px`;
      } else {
        host.style.top = `30px`; // fallback
        host.style.left = `50%`;
      }
    };
    positionHost();
    positionHostBound = positionHost;
    window.addEventListener('resize', positionHostBound);
    window.addEventListener('scroll', positionHostBound, { passive: true });
  }

  function fadeIn(el) {
    el.style.transition = `opacity ${FADE_IN_MS}ms ease-out, transform ${FADE_IN_MS}ms ease-out`;
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }
  function fadeOut(el) {
    el.style.transition = `opacity ${FADE_OUT_MS}ms ease-in, transform ${FADE_OUT_MS}ms ease-in`;
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
  }

  // Main
  let armed = false;
  let fireEl = null;
  const clips = []; // { n, el, dur }

  function preload() {
    for (const n of SEQ) {
      clips.push({ n, el: mkAudio(`sound/${n}.mp3`), dur: durFor(n) });
    }
    fireEl = mkAudio(FIRE_SRC, { loop: true, vol: FIRE_VOL_BASE });
  }

  async function ensureFire() {
    if (!fireEl) return;
    try {
      const p = fireEl.play();
      if (p && typeof p.then === 'function') await p;
      log('fire loop playing');
    } catch (e) {
      log('fire loop play failed (ok to ignore):', e?.name || e);
      fireEl = null;
    }
  }
  const duck = (down) => { if (fireEl) try { fireEl.volume = down ? FIRE_VOL_DUCK : FIRE_VOL_BASE; } catch {} };

  async function runWall() {
    if (armed) return; armed = true;

    buildHost();
    preload();

    // schedule math
    const N = clips.length;
    const sumDur = clips.reduce((a, c) => a + c.dur, 0);
    const totalGap = Math.max(0, TOTAL_MS - sumDur);
    const gapBase = Math.floor(totalGap / N);
    const gapExtraCount = totalGap % N; // first gapExtraCount gaps get +1ms
    log('schedule:', { N, sumDur, totalGap, gapBase, gapExtraCount });

    await ensureFire();

    // initial silence
    const firstGap = gapBase + (0 < gapExtraCount ? 1 : 0);
    log('initial gap ms =', firstGap);
    await wait(firstGap);

    for (let i = 0; i < N; i++) {
      const c = clips[i];
      const txt = WALL_LINES[i] || '';

      // show text
      line.textContent = txt;
      fadeIn(line);
      await wait(FADE_IN_MS);

      // play clip
      try {
        c.el.currentTime = 0;
        const p = c.el.play();
        if (p && typeof p.then === 'function') await p;
        log(`clip ${c.n} started (dur ${c.dur}ms)`);
      } catch (e) {
        log(`clip ${c.n} play failed:`, e?.name || e);
      }

      // duck fire during clip
      duck(true);
      await wait(c.dur);
      duck(false);

      // fade out text
      fadeOut(line);
      await wait(FADE_OUT_MS);

      // gap before next (no trailing)
      if (i < N - 1) {
        const extra = (i + 1) < gapExtraCount ? 1 : 0;
        const gap = gapBase + extra;
        log(`gap after ${c.n} = ${gap}ms`);
        await wait(gap);
      }
    }

    log('wall: complete (7 min schedule done)');
    window.dispatchEvent(new CustomEvent('wall:done'));
  }

  // Arm strictly on blink completion. Fallback to fx:done for older builds.
  function arm() {
    if (window.__blinkCompleted) {
      log('detected __blinkCompleted → start now');
      runWall();
      return;
    }
    const onBlink = () => { window.removeEventListener('blink:done', onBlink); runWall(); };
    const onFx = () => { window.removeEventListener('fx:done', onFx); runWall(); };
    window.addEventListener('blink:done', onBlink, { once: true });
    window.addEventListener('fx:done', onFx, { once: true });

    // sanity watchdog in case events never fire (will still do nothing visible)
    setTimeout(() => {
      if (!armed && window.__blinkCompleted) runWall();
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
})();
