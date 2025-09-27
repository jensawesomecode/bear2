// game.js (excerpt)
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');

window.Game = {
  _started: false,
  start() {
    if (this._started) return;
    this._started = true;
    // do your init here (load images if not yet, add input, start loops, etc.)
    init();
  }
};

// If you want the title to appear FIRST, do not call init() here automatically.
// The title.js will call Game.start() after dismiss.
