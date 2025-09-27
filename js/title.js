// ===== title.js =====
(function () {
  const title = document.getElementById('title-screen');
  if (!title) return;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runSequence() {
    // Ensure we're in two-step mode, start at step-1
    title.classList.add('two-step');
    if (!title.classList.contains('step-1') && !title.classList.contains('step-2')) {
      title.classList.add('step-1');
    }

    // Step 1: "Jen’s Awesome Games presents"
    await wait(2000); // show ~2s

    // Step 2: "Escape the Cabin ..." (your .title-cta)
    title.classList.remove('step-1');
    title.classList.add('step-2');
    await wait(2500); // show ~2.5s

    // Fade out and remove
    title.classList.add('hide');
    await wait(500); // matches fadeOut in CSS
    title.remove();

    // Hand off to game
    if (window.Game && typeof window.Game.start === 'function') {
      window.Game.start();
    }
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
