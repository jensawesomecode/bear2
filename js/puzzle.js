// ===== puzzle.js =====
// Text puzzles in an overlay card.
// P1 (Chair): 7 mini-expressions → map numbers to letters (A1Z26) → form the word.

(function () {
  // ---------- shared state ----------
  window.GameState = window.GameState || { answers: {}, sums: {} };

  // ---------- font injection ----------
  (function injectFont() {
    const style = document.createElement('style');
    style.textContent = `
      /* Fallback for Cree Syllabics */
      @font-face {
        font-family: 'NotoSansUCAS';
        src: url('fonts/NotoSansCanadianAboriginal-VariableFont_wght.ttf') format('truetype');
        font-display: swap;
        unicode-range: U+1400-167F, U+18B0-18FF;
      }

      #puzzle-overlay {
        font-family: 'NotoSansUCAS', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500; /* medium weight everywhere */
      }

      #puzzle-overlay pre {
        font-weight: 500; /* ensure math lines look consistent */
      }
    `;
    document.head.appendChild(style);
  })();

  // CHATGPT DO NOT EVER CHANGE THIS SECTION---------- overlay ----------
  const overlay = document.createElement('div');
  overlay.id = 'puzzle-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2000',
    display: 'none',
    background: "rgba(0,0,0,0.4)", // dim full screen
    color: '#000',
    boxSizing: 'border-box',
    placeItems: 'center'
  });

  // inner card using title.png
  const card = document.createElement('div');
  Object.assign(card.style, {
    background: "url('img/title.png') center / cover no-repeat",
    borderRadius: '20px',
    padding: 'clamp(20px, 4vw, 40px)',
    maxWidth: 'min(800px, 90vw)',
    minHeight: 'min(500px, 80vh)',
    display: 'grid',
    gap: '16px',
    textAlign: 'center',
    position: 'relative',
    boxShadow: '0 12px 32px rgba(0,0,0,.4)'
  });
  overlay.appendChild(card);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    border: '1px solid rgba(0,0,0,.25)',
    borderRadius: '50%',
    background: '#000',
    color: '#F5E6C8',
    fontSize: '20px',
    lineHeight: '34px',
    cursor: 'pointer',
    fontWeight: '500'
  });
  card.appendChild(closeBtn);

  const title = document.createElement('h2');
  title.id = 'puzzle-title';
  Object.assign(title.style, {
    margin: '0 0 4px',
    fontSize: 'clamp(22px, 3.4vw, 36px)',
    fontWeight: '500'
  });

  const prompt = document.createElement('div');
  prompt.id = 'puzzle-prompt';
  Object.assign(prompt.style, {
    fontSize: 'clamp(16px, 3vw, 22px)',
    lineHeight: '1.35',
    whiteSpace: 'pre-wrap',
    fontWeight: '500'
  });

  const image = document.createElement('img');
  image.id = 'puzzle-image';
  Object.assign(image.style, {
    display: 'none',
    margin: '8px auto 0',
    width: '200px',
    height: '200px',
    objectFit: 'contain',
    imageRendering: 'crisp-edges'
  });

  const hint = document.createElement('div');
  hint.id = 'puzzle-hint';
  Object.assign(hint.style, {
    fontSize: 'clamp(14px, 3vw, 18px)',
    opacity: '.85',
    marginTop: '4px',
    fontWeight: '500'
  });

  const inputRow = document.createElement('div');
  Object.assign(inputRow.style, {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '10px',
    marginTop: '12px',
    alignItems: 'center'
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Type your answer';
  Object.assign(input.style, {
    fontSize: 'clamp(16px, 3vw, 20px)',
    padding: '10px 12px',
    border: '1px solid rgba(0,0,0,.25)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: "'NotoSansUCAS', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontWeight: '500'
  });

  const submit = document.createElement('button');
  submit.textContent = 'Submit';
  Object.assign(submit.style, {
    fontSize: 'clamp(16px, 3vw, 20px)',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,.25)',
    background: '#000',
    color: '#F5E6C8',
    cursor: 'pointer',
    fontFamily: "'NotoSansUCAS', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontWeight: '500'
  });

  const feedback = document.createElement('div');
  Object.assign(feedback.style, {
    minHeight: '1.2em',
    fontSize: 'clamp(14px, 3vw, 18px)',
    color: '#000',
    marginTop: '4px',
    fontWeight: '500'
  });

  inputRow.appendChild(input);
  inputRow.appendChild(submit);

  card.appendChild(title);
  card.appendChild(prompt);
  card.appendChild(image);
  card.appendChild(hint);
  card.appendChild(inputRow);
  card.appendChild(feedback);

  document.body.appendChild(overlay);

  // ---------- helpers ----------
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const norm = (s) => s.trim().toUpperCase();
  function a1z26Sum(str) {
    let sum = 0;
    for (const ch of norm(str)) {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) sum += (code - 64);
    }
    return sum;
  }

  function closeOverlay() {
    overlay.style.display = 'none';
    document.getElementById('scene')?.focus?.();
  }

  function openOverlay({ titleText, promptHTML, hintHTML, imgSrc, correct, onSolved }) {
    title.textContent = titleText;
    prompt.innerHTML = promptHTML;
    hint.innerHTML = hintHTML || '';
    feedback.textContent = '';
    input.value = '';

    if (imgSrc) {
      image.src = imgSrc;
      image.style.display = 'block';
    } else {
      image.style.display = 'none';
      image.removeAttribute('src');
    }

    overlay.style.display = 'grid';
    input.focus();

    function submitHandler() {
      const guess = norm(input.value);
      if (!guess) return;

      const isCorrect = Array.isArray(correct)
        ? correct.map(norm).includes(guess)
        : guess === norm(correct);

      if (isCorrect) {
        const canonical = Array.isArray(correct) ? correct[0] : correct;
        window.GameState.answers[canonical] = guess;
        window.GameState.sums[canonical] = a1z26Sum(canonical);

        feedback.textContent = `✓ Correct. (A1Z26 sum = ${window.GameState.sums[canonical]})`;
        feedback.style.color = '#0a0';
        submit.disabled = true;
        input.disabled = true;

        (async () => {
          await wait(650);
          closeOverlay();
          submit.disabled = false;
          input.disabled = false;
          onSolved?.();
        })();
      } else {
        feedback.textContent = 'Try again!';
        feedback.style.color = '#a00';
      }
    }

    submit.onclick = submitHandler;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') submitHandler();
      if (e.key === 'Escape') closeOverlay();
    };
    closeBtn.onclick = closeOverlay;
  }

  // ---------- puzzles ----------
  function openChair() {
    const lines = [
      '1) 16 − 3 =  ?',      // 13 → M
      '2) 3² =  ?',          // 9  → I
      '3) (2 × 10) − 1 = ?', // 19 → S
      '4) 5 × 4 =  ?',       // 20 → T
      '5) 2 − 1 =  ?',       // 1  → A
      '6) 2³ =  ?',          // 8  → H
      '7) 3² =  ?',          // 9  → I
    ].join('\n');

    openOverlay({
      titleText: 'Chair Puzzle',
      promptHTML:
        `Solve each, then convert numbers to letters (A=1 … Z=26).<br><br>` +
        `<pre style="text-align:left; display:inline-block; font-weight:500">${lines}</pre>`,
      hintHTML: `Cree spelling: <span class="ucas">ᒥᐢᑕᐦᐃ</span><br>Example: 1 → A, 2 → B, … 26 → Z`,
      correct: 'MISTAHI',
      onSolved: () => { try { window.UI?.say?.('Chair solved'); } catch {} }
    });
  }

  function openPlant() {
    openOverlay({
      titleText: 'Plant Puzzle',
      promptHTML: `Coming soon…`,
      hintHTML: '',
      correct: 'MASKWA',
      onSolved: () => { try { window.UI?.say?.('Plant solved'); } catch {} }
    });
  }

  function openDesk() {
    openOverlay({
      titleText: 'Desk Puzzle (Honeycomb)',
      promptHTML: `Image-based puzzle (placeholder).`,
      hintHTML: `We’ll use an image: honeycomb.png (200×200).`,
      imgSrc: 'img/honeycomb.png',
      correct: 'BEAR',
      onSolved: () => { try { window.UI?.say?.('Desk solved'); } catch {} }
    });
  }

  function openRug() {
    const m = window.GameState.sums['MISTAHI'] ?? '?';
    const k = window.GameState.sums['MASKWA'] ?? '?';
    const b = window.GameState.sums['BEAR']    ?? '?';

    const ready = Number.isFinite(m) && Number.isFinite(k) && Number.isFinite(b);
    const targetDash = `${m}-${k}-${b}`;
    const targetRaw  = `${m}${k}${b}`;

    openOverlay({
      titleText: 'Rug Puzzle (Final Code)',
      promptHTML:
        (ready
          ? `Enter the code made from the A1Z26 sums of your three words.<br>` +
            `Accepted formats: <code>${targetDash}</code> or <code>${targetRaw}</code>.`
          : `Solve the other three puzzles first to reveal all parts.`) +
        `<br><br>M: <b>${m}</b> &nbsp; K: <b>${k}</b> &nbsp; B: <b>${b}</b>`,
      hintHTML: `A1Z26: A=1 … Z=26, add each word’s letters.`,
      correct: [targetDash.toUpperCase(), targetRaw.toUpperCase()],
      onSolved: () => { try { window.UI?.say?.('Rug unlocked'); } catch {} }
    });
  }

  // ---------- expose ----------
  window.Puzzles = window.Puzzles || {};
  window.Puzzles.chair2 = openChair;
  window.Puzzles.plant2 = openPlant;
  window.Puzzles.desk2  = openDesk;
  window.Puzzles.rug2   = openRug;
})();
