// ===== title.js =====
(function () {
  const title = document.getElementById('title-screen');
  if (!title) return;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function callGameStartSafely(tries = 0) {
    if (window.Game && typeof window.Game.start === 'function') {
      window.Game.start();
    } else if (tries < 200) {              // retry up to ~10s (200 * 50ms)
      setTimeout(() => callGameStartSafely(tries + 1), 50);
    } else {
      console.warn('[title.js] Game.start() not found after waiting.');
    }
  }

  async function runSequence() {
    // Ensure two-step mode, start at step-1
    title.classList.add('two-step');
    if (!title.classList.contains('step-1') && !title.classList.contains('step-2')) {
      title.classList.add('step-1');
    }

    // Step 1: “Jen’s Awesome Games presents”
    await wait(2000);

    // Step 2: “Escape the Cabin …” (shows .title-cta)
    title.classList.remove('step-1');
    title.classList.add('step-2');
    await wait(2500);

    // Fade out and remove
    title.classList.add('hide');
    await wait(500); // match fadeOut in CSS
    title.remove();

    // Hand off to game (robust)
    callGameStartSafely();
  }

  function startWhenStoryDone() {
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
