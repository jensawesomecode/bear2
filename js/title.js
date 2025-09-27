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

  // timings (mirrors story.js vibe)
  const DISPLAY_MS = 2500;   // normal screen hold time
  const SUBTITLE_EXTRA = 500; // extra time for the last line
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

      // fade in
      lineEl.classList.remove('story-exit');
      void lineEl.offsetWidth;
      lineEl.classList.add('story-enter');
      await wait(FADE_IN_MS);

      // hold (last line holds longer)
      if (i === SCREENS.length - 1) {
        await wait(DISPLAY_MS + SUBTITLE_EXTRA);
      } else {
        await wait(DISPLAY_MS);
      }

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

    // Fade out the whole title overlay with your existing CSS
    title.classList.add('hide');
    await wait(500); // match fadeOut duration
    title.remove();

    // Handoff
    callGameStartSafely();
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
