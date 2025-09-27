// Handles showing the title and dismissing it to start the game.
// Call Game.start() (from game.js) when the title goes away.

(function () {
  const title = document.getElementById('title-screen');

  // Dismiss on click or key press
  function dismiss() {
    if (!title || title.classList.contains('hide')) return;
    title.classList.add('hide');
    setTimeout(() => {
      title.remove();
      // If your game.js exposes a start hook, call it:
      if (window.Game && typeof window.Game.start === 'function') {
        window.Game.start();
      }
    }, 450); // matches fadeOut duration
  }

  title?.addEventListener('click', dismiss);
  window.addEventListener('keydown', dismiss, { once: true });
})();
