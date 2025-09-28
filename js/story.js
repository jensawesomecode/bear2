// ===== story.js =====
// Auto-advancing 4-line story splash on black background.
// Shows each line, fades between, then removes itself and dispatches 'story:done'.
// If #title-screen exists, Title will start on that event; otherwise we fall back to Game.start().
//
// Also shows an audio permission prompt BEFORE the story:
// - Background uses img/title.png
// - Font matches wall text
// - Buttons: Bear Brown with Cream text
(function () {
  'use strict';

  // ---------- Timings ----------
  const DISPLAY_MS = 3000;     // time each line remains fully visible (not counting fades)
  const FADE_IN_MS = 600;
  const FADE_OUT_MS = 500;
  const FINAL_FADE_OUT_MS = 1000; // ONLY the last line uses a longer fade-out

  // Audio timing (half-second before/after each clip)
  const PRE_SILENCE_MS  = 500;
  const POST_SILENCE_MS = 500;

  // ---------- Story lines (keep exactly 4) ----------
  const LINES = [
    "i'm so cold and lost",
    "i never should've raced the snowstorm",
    "this is too much",
    "maybe if i lay down in the snow and rest..."
  ];

  // Corresponding audio files + durations (ms)
  const CLIPS = [
    { src: 'sound/story1.mp3', dur: 4000 },
    { src: 'sound/story2.mp3', dur: 2000 },
    { src: 'sound/story3.mp3', dur: 1000 },
    { src: 'sound/story4.mp3', dur: 3000 },
  ];

  // ---------- Build Story Host ----------
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

  // ---------- Utility ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function mkAudio(src) {
    const a = new Audio();
    a.src = src;
    a.preload = 'auto';
    a.crossOrigin = 'anonymous';
    try { a.load(); } catch {}
    return a;
  }

  // ---------- Audio Gate (styled) ----------
  async function askForAudio() {
    return new Promise((resolve) => {
      const gate = document.createElement('div');
      gate.id = 'audio-gate';
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      gate.setAttribute('aria-label', 'Enable audio?');

      // full-viewport overlay with title.png bg
      Object.assign(gate.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147482000',
        display: 'grid',
        placeItems: 'center',
        background: "url('img/title.png') center/cover no-repeat, #000",
      });

      // card-like container to keep text readable on top of image
      const card = document.createElement('div');
      Object.assign(card.style, {
        display: 'grid',
        gap: '14px',
        padding: '28px 24px',
        borderRadius: '16px',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(92,64,51,0.6)',        // Bear Brown tint
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        maxWidth: 'min(680px, 92vw)',
        textAlign: 'center',
        backdropFilter: 'blur(2px)',
      });

      // heading
      const h = document.createElement('div');
      h.textContent = 'Enable Audio?';
      Object.assign(h.style, {
        fontFamily: "'OrangeFogue', system-ui, sans-serif", // same as wall text
        letterSpacing: '0.03em',
        lineHeight: '1.2',
        fontSize: 'clamp(26px, 3.4vw, 40px)',
        color: '#F5E6C8', // cream
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      });

      // subtext
      const p = document.createElement('div');
      p.textContent = 'Turn on narration and effects. You can still play without sound.';
      Object.assign(p.style, {
        fontFamily: "'OrangeFogue', system-ui, sans-serif",
        letterSpacing: '0.02em',
        lineHeight: '1.25',
        fontSize: 'clamp(16px, 2vw, 20px)',
        color: '#F5E6C8',
        opacity: '0.9'
      });

      // buttons row
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'grid',
        gridAutoFlow: 'column',
        gap: '12px',
        justifyContent: 'center'
      });

      function makeBtn(label) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        Object.assign(b.style, {
          fontFamily: "'OrangeFogue', system-ui, sans-serif",
          fontSize: 'clamp(16px, 2vw, 18px)',
          lineHeight: '1',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #5C4033', // Bear Brown
          background: '#5C4033',       // Bear Brown
          color: '#F5E6C8',            // Cream
          cursor: 'pointer',
          boxShadow: '0 3px 12px rgba(0,0,0,0.5)',
        });
        b.onmouseenter = () => { b.style.filter = 'brightness(1.08)'; };
        b.onmouseleave = () => { b.style.filter = 'none'; };
        b.onfocus = () => { b.style.outline = '2px solid rgba(245,230,200,0.7)'; };
        b.onblur  = () => { b.style.outline = 'none'; };
        return b;
      }

      const yes = makeBtn('Turn On Audio');
      const no  = makeBtn('Play Without Audio');

      yes.addEventListener('click', () => {
        cleanup(true);
      });
      no.addEventListener('click', () => {
        cleanup(false);
      });

      // keyboard help: Enter = yes, Esc = no
      const onKey = (e) => {
        if (e.key === 'Enter') { cleanup(true); }
        if (e.key === 'Escape') { cleanup(false); }
      };

      function cleanup(allowed) {
        window.removeEventListener('keydown', onKey);
        gate.remove();
        resolve(allowed);
      }

      row.append(yes, no);
      card.append(h, p, row);
      gate.append(card);
      document.body.appendChild(gate);
      window.addEventListener('keydown', onKey);
      // initial focus to the "yes" button for quick Enter flow
      yes.focus();
    });
  }

  // ---------- Run story ----------
  async function runStory(allowAudio) {
    // Preload audio elements (if allowed)
    const audios = CLIPS.map(c => allowAudio ? mkAudio(c.src) : null);

    for (let i = 0; i < LINES.length; i++) {
      // set text
      lineEl.textContent = LINES[i];

      // fade in
      lineEl.classList.remove('story-exit');
      void lineEl.offsetWidth; // reflow to restart animation
      lineEl.classList.add('story-enter');
      await wait(FADE_IN_MS);

      // hold on screen (base display time)
      await wait(DISPLAY_MS);

      // silence in
      await wait(PRE_SILENCE_MS);

      // play audio (if allowed)
      if (allowAudio && audios[i]) {
        try {
          const p = audios[i].play();
          if (p && typeof p.then === 'function') await p;
        } catch (_) { /* ignore autoplay/permission issues */ }
        // wait the clip duration even if it failed to play
        await wait(CLIPS[i].dur);
      } else {
        // no audio: just wait the same amount of time to keep pacing
        await wait(CLIPS[i].dur);
      }

      // silence out
      await wait(POST_SILENCE_MS);

      // fade out (longer only on the last line)
      lineEl.classList.remove('story-enter');
      void lineEl.offsetWidth;
      lineEl.classList.add('story-exit');
      await wait(i === LINES.length - 1 ? FINAL_FADE_OUT_MS : FADE_OUT_MS);
    }

    // Done: remove overlay
    host.remove();

    // Tell Title to begin
    window.dispatchEvent(new CustomEvent('story:done'));

    // Fallback: if no Title is present, start game (won't run if Title is listening as designed)
    if (!document.getElementById('title-screen')) {
      if (window.Game && typeof window.Game.start === 'function') {
        window.Game.start();
      }
    }
  }

  // ---------- Boot ----------
  (async function start() {
    const allow = await askForAudio();
    await runStory(allow);
  })();
})();
