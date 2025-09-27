// ===== puzzle.js =====
// Text puzzles in a cream overlay (black text).
// P1 (chair): 7 mini-expressions → map numbers to letters (A1Z26) → form the word.
// No spoilers shown in the UI.

(function () {
  // ---------- shared state for the final rug code ----------
  window.GameState = window.GameState || { answers: {}, sums: {} };

  // ---------- load fonts (primary + UCAS fallback) ----------
  (function injectFont() {
    const style = document.createElement('style');
    style.textContent = `
      /* Primary display font (Blumenbuch) */
      @font-face {
        font-family: 'Blumenbuch';
        src: url('fonts/BlumenbuchBeta-OO7P.ttf') format('truetype');
        font-display: swap;
      }

      /* Fallback for Cree Syllabics (UCAS + UCAS Extended) */
      @font-face {
        font-family: 'NotoSansUCAS';
        src: url('fonts/NotoSansCanadianAboriginal-VariableFont_wght.ttf') format('truetype');
        font-display: swap;
        font-style: normal;
        font-weight: 100 900; /* variable font axis range */
        unicode-range: U+1400-167F, U+18B0-18FF; /* UCAS + UCAS Extended */
      }

      /* Apply the chain inside the puzzle overlay */
      #puzzle-overlay {
        font-family: 'Blumenbuch', 'NotoSansUCAS',
                     system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      }
    `;
    document.head.appendChild(style);
  })();

  // ---------- overlay UI ----------
  const overlay = document.createElement('div');
  overlay.id = 'puzzle-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2000',
    display: 'none',
    background: '#F5E6C8', // cream
    color: '#000',          // black
    fontFamily: "Blumenbuch, NotoSansUCAS, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    padding: 'clamp(16px, 4vw, 48px)',
    boxSizing: 'border-box',
  });

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    maxWidth: 'min(900px, 92vw)',
    margin: '0 auto',
    display: 'grid',
    gap: '16px',
    alignContent: 'center',
    minHeight: '100%',
    textAlign: 'center',
  });

  const title = document.createElement('h2');
  title.id = 'puzzle-title';
  Object.assign(title.style, {
    margin: '0 0 4px',
    fontSize: 'clamp(22px, 3.4vw, 38px)',
    letterSpacing: '.02em',
  });

  const prompt = document.createElement('div');
  prompt.id = 'puzzle-prompt';
  Object.assign(prompt.style, {
    fontSize: 'clamp(16px, 2.4vw, 22px)',
    lineHeight: '1.35',
    whiteSpace: 'pre-wrap',
  });

  const image = document.createElement('img');
  image.id = 'puzzle-image';
  Object.assign(image.style, {
    display: 'none',
    margin: '8px auto 0',
    width: '200px',
    height: '200px',
    objectFit: 'contain',
    imageRendering: 'crisp-edges',
  });

  const hint = document.createElement('div');
  hint.id = 'puzzle-hint';
  Object.assign(hint.style, {
    fontSize: 'clamp(14px, 2vw, 18px)',
    opacity: '.8',
    marginTop: '4px',
  });

  const inputRow = document.createElement('div');
  Object.assign(inputRow.style, {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '10px',
    marginTop: '12px',
    alignItems: 'center',
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Type your answer…';
  Object.assign(input.style, {
    fontSize: 'clamp(16px, 2.2vw, 20px)',
    padding: '10px 12px',
    border: '1px solid rgba(0,0,0,.25)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: "Blumenbuch, NotoSansUCAS, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  });

  const submit = document.createElement('button');
  submit.textContent = 'Submit';
  Object.assign(submit.style, {
    fontSize: 'clamp(16px, 2.2vw, 20px)',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,.25)',
    background: '#000',
    color: '#F5E6C8',
    cursor: 'pointer',
    fontFamily: "Blumenbuch, NotoSansUCAS, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  });

  const feedback = document.createElement('div');
  Object.assign(feedback.style, {
    minHeight: '1.2em',
    fontSize: 'clamp(14px, 2vw, 18px)',
    color: '#000',
    marginTop: '4px',
  });

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
  });

  inputRow.appendChild(input);
  inputRow.appendChild(submit);
  wrap.appendChild(title);
  wrap.appendChild(prompt);
  wrap.appendChild(image);
  wrap.appendChild(hint);
  wrap.appendChild(inputRow);
  wrap.appendChild(feedback);
  overlay.appendChild(closeBtn);
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  // ---------- helpers ----------
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const norm = (s) => s.trim().toUpperCase();
  function a1z26Sum(str) {
    let sum = 0;
    for (const ch of norm(str)) {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) sum += (code - 64); // A=1..Z=26
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

    overlay.style.display = 'block';
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

  // ---------- CHAIR: Math → word via A1Z26 ----------
  // Solve each expression (1–7). Convert each result to a letter: A=1…Z=26.
  // Read the letters left→right to get the word.
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
      titleText: 'chair uzzle',
      promptHTML:
        `solve each, then convert numbers to letters (A=1 … Z=26).<br><br>` +
        `<pre style="text-align:left; display:inline-block">${lines}</pre>`,
      hintHTML: `Example: 1 → A, 2 → B, … 26 → Z`,
      correct: 'MISTAHI',
      onSolved: () => { try { window.UI?.say?.('Chair solved'); } catch {} }
    });
  }

  // ---------- PLANT: placeholder (no spoilers yet) ----------
  function openPlant() {
    openOverlay({
      titleText: 'Plant Puzzle',
      promptHTML: `Coming soon…`,
      hintHTML: '',
      correct: 'MASKWA',
      onSolved: () => { try { window.UI?.say?.('Plant solved'); } catch {} }
    });
  }

  // ---------- DESK: Honeycomb (placeholder image) ----------
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

  // ---------- RUG: Final code from sums ----------
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

  // ---------- expose openers (override stubs from game.js) ----------
  window.Puzzles = window.Puzzles || {};
  window.Puzzles.chair2 = openChair;   // chair → math-to-word
  window.Puzzles.plant2 = openPlant;   // plant → code (next)
  window.Puzzles.desk2  = openDesk;    // desk  → honeycomb (next)
  window.Puzzles.rug2   = openRug;     // rug   → final code
})();
