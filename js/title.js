// ===== title.js =====
(function () {
  const title = document.getElementById('title-screen');
  if (!title) return;

  // --- ensure Cree syllabics font is available on the title too ---
  (function injectCreeFont() {
    const id = 'title-noto-ucas';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @font-face {
        font-family: 'NotoSansUCAS';
        src: url('fonts/NotoSansCanadianAboriginal-VariableFont_wght.ttf') format('truetype');
        font-display: swap;
        unicode-range: U+1400-167F, U+18B0-18FF;
      }
    `;
    document.head.appendChild(style);
  })();

  // timings
  const DISPLAY_MS = 2500;     // common hold for lines 1 & 3
  const TITLE_EXTRA_MS = 1000; // extra hold time for line 2 (title)
  const FADE_IN_MS = 600;
  const FADE_OUT_MS = 500;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Safely call Game.start() after title
  function callGameStartSafely(tries = 0) {
    if (window.Game && typeof window.Game.start === 'function') {
      window.Game.start();
    } else if (tries < 200) {
      setTimeout(() => callGameStartSafely(tries + 1), 50);
    } else {
      console.warn('[title.js] Game.start() not found after waiting.');
    }
  }

  // Build a clean inner container; we’ll manage our own fading line
  const inner = title.querySelector('.title-inner') || (() => {
    const d = document.createElement('div');
    d.className = 'title-inner';
    title.appendChild(d);
    return d;
  })();

  // Wipe whatever HTML was in there (we’ll render dynamically)
  inner.innerHTML = '';

  // One reusable line host
  const lineEl = document.createElement('div');
  lineEl.className = 'title-copy';
  lineEl.style.textAlign = 'center';
  lineEl.style.width = '80%';
  inner.appendChild(lineEl);

  // three “screens” worth of content (HTML allowed)
  const SCREENS = [
    // Screen 1 — small intro
    `
      <div style="font-size: clamp(50px, 6vw, 50px); font-weight: 400;">
        Jen’s Awesome Games Presents
      </div>
    `,
    // Screen 2 — big main title + Cree line (same size/weight)
    `
      <div style="font-size: clamp(80px, 12vw, 80px); font-weight: 500; line-height: 1.7;">
        Escape the Hunter’s Cabin
      </div>
      <div style="
        font-size: clamp(80px, 12vw, 80px);
        font-weight: 500;
        line-height: 1.7;
        margin-top: .15em;
        font-family: 'NotoSansUCAS', system-ui, sans-serif;">
        ᐋᐧᑕᐢᑲᐧᐦᑲᓂᕽ ᐃᐢᑭᐦᑕᐧᐦᐊᐠ
      </div>
    `,
    // Screen 3 — small subtitle / vibe line
    `
      <div style="font-size: clamp(50px, 6vw, 50px); font-weight: 300; font-style: italic;">
        It’s getting hot in here…
      </div>
    `,
  ];

  async function playScreens() {
    for (let i = 0; i < SCREENS.length; i++) {
      lineEl.innerHTML = SCREENS[i];

      // fade in (reuse story.css classes)
      lineEl.classList.remove('story-exit');
      void lineEl.offsetWidth; // reflow
      lineEl.classList.add('story-enter');
      await wait(FADE_IN_MS);

      // hold: line 2 gets extra time, lines 1 & 3 use common display time
      const extra = (i === 1) ? TITLE_EXTRA_MS : 0;
      await wait(DISPLAY_MS + extra);

      // fade out
      lineEl.classList.remove('story-enter');
      void lineEl.offsetWidth;
      lineEl.classList.add('story-exit');
      await wait(FADE_OUT_MS);
    }
  }

    async function runSequence() {
    try {
      await playScreens();
    } catch (e) {
      console.warn('[title.js] playScreens error:', e);
    }

    // Fade out the title overlay…
    title.classList.add('hide');
    await wait(500);
    title.remove();

    // Helper: wait two paints
    function nextPaint() {
      return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
    }

    // 1) Put a black cover over the scene immediately (so nothing flashes)
    try {
      if (window.SpecialFX && typeof window.SpecialFX.coverBlackNow === 'function') {
        window.SpecialFX.coverBlackNow();
      }
    } catch (e) {
      console.warn('[title.js] coverBlackNow error:', e);
    }

    // Hold black for 2 frames
    await nextPaint();
    await nextPaint();

    // 2) Start the game so #scene actually draws under the black
    callGameStartSafely();

    // Let the scene render for 2 frames while still covered
    await nextPaint();
    await nextPaint();

    // 3) Now run the fade-only prologue on top of the already-drawn room
    try {
      if (window.SpecialFX && typeof window.SpecialFX.prologueSequence === 'function') {
        await window.SpecialFX.prologueSequence();
      }
    } catch (e) {
      console.warn('[title.js] prologueSequence error:', e);
    }
  }

  function startWhenStoryDone() {
    // Wait until #story-screen is removed
    const story = document.getElementById('story-screen');
    if (!story) {
      runSequence();
      return;
    }
    const obs = new MutationObserver(() => {
      if (!document.getElementById('story-screen')) {
        obs.disconnect();
        runSequence();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWhenStoryDone, { once: true });
  } else {
    startWhenStoryDone();
  }
})();
