// ===== story.js =====
// Auto-advancing 4-line story splash on black background.
// Shows each line for 3 seconds (not clickable). Then removes itself.
// If #title-screen exists, it leaves it alone; else calls Game.start() if available.

(function () {
  const DISPLAY_MS = 3000; // time each line remains fully visible
  const FADE_IN_MS = 600;
  const FADE_OUT_MS = 500;

  // <<< EDIT THESE LINES >>>
  const LINES = [
    "i am so cold and lost",
    "i never should have raced this snowstorm.",
    "this is too much.",
    "maybe if i lay down in the snow and rest..."
  ];
  // ^ Replace with your actual story text. Keep exactly 4 items as requested.

  // Build DOM
  const host = document.createElement('div');
  host.id = 'story-screen';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-live', 'polite');

  const inner = document.createElement('div');
  inner.className = 'story-inner';

  const lineEl = document.createElement('div');
  lineEl.className = 'story-line';
  inner.appendChild(lineEl);
  host.appendChild(inner);
  document.body.appendChild(host);

  // Sequence helper
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  (async function run() {
    for (let i = 0; i < LINES.length; i++) {
      // set text
      lineEl.textContent = LINES[i];

      // fade in
      lineEl.classList.remove('story-exit');
      void lineEl.offsetWidth; // reflow to restart animation
      lineEl.classList.add('story-enter');
      await wait(FADE_IN_MS);

      // hold on screen
      await wait(DISPLAY_MS);

      // fade out (except maybe last—still fade for consistency)
      lineEl.classList.remove('story-enter');
      void lineEl.offsetWidth;
      lineEl.classList.add('story-exit');
      await wait(FADE_OUT_MS);
    }

    // Done: remove overlay
    host.remove();

    // Hand off: if a title overlay exists, do nothing (it’s visible underneath).
    // Otherwise start the game if available.
    if (!document.getElementById('title-screen')) {
      if (window.Game && typeof window.Game.start === 'function') {
        window.Game.start();
      }
    }
  })();
})();
