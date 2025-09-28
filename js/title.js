// ===== title.js =====
// Contract: does NOTHING until it receives 'story:done'. Then plays title,
// removes the overlay, and dispatches 'title:done'. Does not start the game.

(function () {
  'use strict';

  const title = document.getElementById('title-screen');
  if (!title) return;

  // Timings
  const DISPLAY_MS = 2500;     // screens 1 & 3
  const TITLE_EXTRA_MS = 1000; // extra for main title
  const FIRST_FADE_IN_MS = 1000; // longer fade-in ONLY for the first title screen
  const FADE_IN_MS = 600;
  const FADE_OUT_MS = 500;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Ensure an inner container we control
  const inner = title.querySelector('.title-inner') || (() => {
    const d = document.createElement('div');
    d.className = 'title-inner';
    title.appendChild(d);
    return d;
  })();

  // Reusable element using story.css animations
  inner.innerHTML = '';
  const lineEl = document.createElement('div');
  lineEl.className = 'title-copy';
  lineEl.style.textAlign = 'center';
  lineEl.style.width = '80%';
  inner.appendChild(lineEl);

  // Title screens
const SCREENS = [
  `<div style="font-size: clamp(50px, 6vw, 50px); font-weight: 400;">
     Jen’s Awesome Games Presents
   </div>`,
  `<div style="display:grid;gap:.3em;place-items:center;">
     <div lang="cr" style="
       font-family: 'Noto Sans Canadian Aboriginal','Euphemia UCAS', system-ui, sans-serif;
       font-size: clamp(64px, 10.5vw, 96px);
       font-weight: 600;
       line-height: 1.1;
       letter-spacing: 0.01em;
       text-align:center;
     ">
       ᓀᐦᐃᔭᐤ ᐊᓂᓯᓇᐦᐃᑫᐃᐧᐣ
     </div>
     <div style="font-size: clamp(80px, 12vw, 80px); font-weight: 600; line-height: 1.2; text-align:center;">
       Escape the Hunter’s Cabin
     </div>
   </div>`,
  `<div style="font-size: clamp(50px, 6vw, 50px); font-weight: 300; font-style: italic;">
     It’s getting hot in here…
   </div>`
];


async function playScreens() {
  for (let i = 0; i < SCREENS.length; i++) {
    lineEl.innerHTML = SCREENS[i];

    // fade in
    // ⬇️ give the first screen a longer fade-in via inline transition override
    if (i === 0) {
      lineEl.style.transition = `opacity ${FIRST_FADE_IN_MS}ms ease-out, transform ${FIRST_FADE_IN_MS}ms ease-out`;
    } else {
      lineEl.style.transition = ''; // default (CSS/class timing)
    }
    lineEl.classList.remove('story-exit');
    void lineEl.offsetWidth;
    lineEl.classList.add('story-enter');
    await wait(i === 0 ? FIRST_FADE_IN_MS : FADE_IN_MS);

    // hold (screen 2 a bit longer)
    const extra = (i === 1) ? TITLE_EXTRA_MS : 0;
    await wait(DISPLAY_MS + extra);

    // fade out (use default timing)
    lineEl.style.transition = '';
    lineEl.classList.remove('story-enter');
    void lineEl.offsetWidth;
    lineEl.classList.add('story-exit');
    await wait(FADE_OUT_MS);
  }
}


  async function runTitle() {
    try { await playScreens(); } catch (e) { /* ignore */ }

    // remove the title overlay
    title.classList.add('hide');
    await wait(500);
    try { title.remove(); } catch (_) {}

    // signal strictly by event (no game start here)
    window.dispatchEvent(new CustomEvent('title:done'));
  }

  // Strict gating: do nothing until 'story:done'
  function arm() {
    // If story already completed before this script loaded, start immediately.
    if (window.__storyCompleted) {
      runTitle();
      return;
    }
    window.addEventListener('story:done', runTitle, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
})();
