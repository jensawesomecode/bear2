// ===== puzzle.js =====
// Text puzzles in an overlay card.
// P1 (Chair): 7 mini-expressions → map numbers to letters (A1Z26) → form the word.

(function () {
  // ---------- shared state ----------
  window.GameState = window.GameState || { answers: {}, sums: {}, solved: {} };

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
    color: '#fff',
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
    fontWeight: '500',
    background: '#F5E6C8' // the cream you like
  });

  const submit = document.createElement('button');
  submit.textContent = 'Submit'; // capitalized
  Object.assign(submit.style, {
    fontSize: 'clamp(16px, 3vw, 20px)',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,.25)',
    background: '#000',
    color: '#fff',
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
      onSolved: () => {
        window.GameState.solved['chair2'] = true;
        try { window.UI?.say?.('Chair solved'); } catch {}
      }
    });
  }

 function openPlant() {
  const lines =
    [
      '1) Canadian flag symbol',
      '2) The nut in an oak’s seed',
      '3) Evergreen with sharp needles (sometimes blue)',
      '4) A sailor’s fastening in rope',
      '5) Tree that loves marshy riverbanks',
      '6) The oak’s nut again',
    ].join('\n');

  openOverlay({
    titleText: 'Plant Puzzle (First Letters)',
    promptHTML:
      `Take the <b>first letter</b> of each answer to reveal the word.<br><br>` +
      `<pre style="text-align:left; display:inline-block; font-weight:500">${lines}</pre>`,
    // Cree hint in syllabics (reads “maskwa”)
    hintHTML: `ᒪᐢᑿ`,   // Cree syllabics
    correct: 'MASKWA',
    onSolved: () => {
      window.GameState.solved['plant2'] = true;
      try { window.UI?.say?.('Plant solved'); } catch {}
    }
  });
}


  function openDesk() {
  openOverlay({
    titleText: 'Desk Puzzle (Honey & Thief)',
    promptHTML:
      `A golden city of hexagons, the makers never sleep.<br>` +
      `But who braves the stings for sweetness they’ll keep?<br>` +
      `Name the hungry thief who loves this treasure.`,
    hintHTML: `Don’t name the makers — name the one who raids them.`,
    imgSrc: 'img/honeycomb.png', // 200×200, centered by overlay styles
    correct: 'BEAR',
    onSolved: () => {
      window.GameState.solved['desk2'] = true;
      try { window.UI?.say?.('Desk solved'); } catch {}
    }
  });
}


function openRug() {
  // ---- gate & logs ----
  const solvedMap = (window.GameState && window.GameState.solved) || {};
  const ready = ['chair2', 'plant2', 'desk2'].every(id => solvedMap[id]);
  console.log('[RUG] openRug() called. ready=', ready, 'solvedMap=', JSON.stringify(solvedMap));

  // Hard guard if you want: toast & bail when not ready
  // (Comment out this block if you want instructions visible before ready.)
  // if (!ready) {
  //   console.warn('[RUG] Not ready -> blocking overlay open.');
  //   window.UI?.say?.('Solve chair, plant, and desk first.');
  //   return;
  // }

  // ---- helpers ----
  function codeFromWord(word) {
    const sums = [...word.toUpperCase()].map(ch => {
      const n = ch.charCodeAt(0) - 64;
      return String(n).split('').reduce((a, d) => a + Number(d), 0);
    });
    const ops = ['+', '*', '-'];
    let out = sums[0];
    for (let i = 1; i < sums.length; i++) {
      const op = ops[(i - 1) % 3];
      if (op === '+') out += sums[i];
      else if (op === '*') out *= sums[i];
      else out -= sums[i];
    }
    console.debug('[RUG] codeFromWord', word, '-> sums=', sums, 'result=', out);
    return out;
  }

  // Targets (hidden from UI)
  const mVal = codeFromWord('MISTAHI');
  const kVal = codeFromWord('MASKWA');
  const bVal = codeFromWord('BEAR');
  const targetDash = `${mVal}-${kVal}-${bVal}`;
  const targetRaw  = `${mVal}${kVal}${bVal}`;
  console.log('[RUG] targets computed:', { mVal, kVal, bVal, targetDash, targetRaw });

  // ---- pages (≤9 lines) ----
  const page1 = `
ᒪᐢᑿ maskwa (Bear) once kept the pass-phrase in clear words.
But ᐑᓵᐦᑫᒑᕽ Wîsahkêcâhk, the trickster, laughed and changed the rules:

"Your words will turn to numbers. Each letter must be broken apart,
its marks added up. Then your hunters must follow the trail —
add, then multiply, then subtract — round and round again."

Now Bear’s secret is hidden. Only those who know both
the words and the number-trail can complete the circle.`;

  const page2 = `
<b>The circle of steps</b>
1) Inside each letter: take A1Z26 (A=1 … Z=26), then add its digits.
   e.g., 13 → 1+3 → 4
2) Outside, walk the trail in a repeating circle:
   <b>add</b>, then <b>multiply</b>, then <b>subtract</b>, then back to add…
3) Keep the order of the letters. Don’t skip, don’t shuffle.`;

  const page3 = `
<b>Example: SALMON</b>
S=19 → 1+9=10
A=1  → 1
L=12 → 1+2=3
M=13 → 1+3=4
O=15 → 1+5=6
N=14 → 1+4=5

Now follow the circle: +, ×, −, +, ×
10+1=11 → 11×3=33 → 33−4=29 → 29+6=35 → 35×5=<b>175</b>`;

  const page4 = `
<b>Your turn to complete the circle</b>
Use the same method on the three words you found:
MISTAHI — MASKWA — BEAR

Enter the three resulting numbers in order.
Dashes optional (e.g., <code>AA-BB-CC</code> or <code>AABBCC</code>).

${ready ? 'When your circle is complete, the rug will yield.' : '<i>Finish Chair, Plant, and Desk to complete the circle.</i>'}
`;

  // Build overlay via the shared builder (title/prompt/image/hint/input/submit exist now):contentReference[oaicite:0]{index=0}
  openOverlay({
    titleText: 'Rug Puzzle — ᒪᐢᑿ’s Circle',
    promptHTML: page1,
    hintHTML: `Inside: add digits of each letter’s A1Z26 value. Outside: cycle +, ×, − in order.`,
    correct: [targetDash.toUpperCase(), targetRaw.toUpperCase()],
    onSolved: () => {
      console.log('[RUG] onSolved() firing, marking rug2 solved.');
      window.GameState.solved['rug2'] = true;
      try { window.UI?.say?.('Rug unlocked'); } catch {}
    }
  });

  // ---- robust node targets inside the card ----
  const overlayEl = document.getElementById('puzzle-overlay');                 // wrapper:contentReference[oaicite:1]{index=1}
  const cardEl    = overlayEl?.firstElementChild;                               // inner card div
  const promptEl  = document.getElementById('puzzle-prompt');                   // prompt area:contentReference[oaicite:2]{index=2}
  const imageEl   = document.getElementById('puzzle-image');                    // image (hide for rug):contentReference[oaicite:3]{index=3}
  const inputEl   = overlayEl.querySelector('#puzzle-overlay input');           // input field:contentReference[oaicite:4]{index=4}
  const inputRowEl= inputEl?.parentElement;                                     // grid row (input+submit):contentReference[oaicite:5]{index=5}
  const feedbackEl= cardEl?.lastElementChild;                                   // feedback is last child in card:contentReference[oaicite:6]{index=6}

  // Submit button is inside inputRowEl; closeBtn is the absolute one on the card.
  const submitBtn = inputRowEl ? inputRowEl.querySelector('button') : null;

  console.log('[RUG] nodes:', {
    overlayEl: !!overlayEl, cardEl: !!cardEl, promptEl: !!promptEl,
    imageEl: !!imageEl, inputEl: !!inputEl, inputRowEl: !!inputRowEl,
    feedbackEl: !!feedbackEl, submitBtn: !!submitBtn
  });

  if (!overlayEl || !cardEl || !promptEl || !inputRowEl || !submitBtn || !feedbackEl) {
    console.error('[RUG] Missing required overlay nodes — aborting pagination.');
    return;
  }

  // Ensure no image on Rug
  if (imageEl) { imageEl.style.display = 'none'; imageEl.removeAttribute('src'); }

  // Clone a "Next" button styled exactly like Submit
  const nextBtn = submitBtn.cloneNode(true);
  nextBtn.id = 'puzzle-next';
  nextBtn.textContent = 'Next';
  nextBtn.onclick = null;
  inputRowEl.before(nextBtn);
  console.log('[RUG] Next button inserted before inputRow.');

  // Paging
  const pages = [page1, page2, page3, page4];
  let pageIdx = 0;

  function renderPage() {
    console.log('[RUG] renderPage()', { pageIdx });
    promptEl.innerHTML = pages[pageIdx];
    feedbackEl.textContent = '';
    feedbackEl.style.color = '#000';

    if (pageIdx < pages.length - 1) {
      // pages 1–3
      nextBtn.style.display = 'inline-block';
      inputRowEl.style.display = 'none';
    } else {
      // page 4
      nextBtn.style.display = 'none';
      inputRowEl.style.display = 'grid';
      if (inputEl) { inputEl.value = ''; inputEl.focus(); }
    }
  }

  nextBtn.onclick = () => {
    pageIdx++;
    console.debug('[RUG] Next clicked. New pageIdx=', pageIdx);
    renderPage();
  };

  // Intercept submit to add logs (base correctness still handled by openOverlay)
  const originalSubmit = submitBtn.onclick;
  submitBtn.onclick = (e) => {
    const v = (inputEl?.value || '').trim();
    console.debug('[RUG] Submit clicked. value(raw)=', v, 'value(UC)=', v.toUpperCase(), { ready });
    if (typeof originalSubmit === 'function') originalSubmit(e);
  };

  renderPage();
}


  // ---------- expose ----------
  window.Puzzles = window.Puzzles || {};
  window.Puzzles.chair2 = openChair;
  window.Puzzles.plant2 = openPlant;
  window.Puzzles.desk2  = openDesk;
  window.Puzzles.rug2   = openRug;
})();
