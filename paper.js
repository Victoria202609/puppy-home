(() => {
  const dialog = document.querySelector('#paper-dialog');
  const form = document.querySelector('#paper-form');
  const input = document.querySelector('#worry-text');
  const submit = document.querySelector('#paper-submit');
  const count = document.querySelector('#paper-count');
  const entry = document.querySelector('#paper-open');
  const stage = document.querySelector('#paper-stage');
  const paperWindow = document.querySelector('.paper-window');
  const sheet = document.querySelector('#paper-sheet');
  const ball = document.querySelector('#paper-ball');
  const pop = document.querySelector('#paper-pop');
  const result = document.querySelector('#paper-result');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = false;
  let frame = 0;
  let startTime = 0;
  let foot = null;
  let launch = null;
  let kicked = false;

  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const v = clamp(value); return v * v * (3 - 2 * v); };
  function updateInput() {
    count.textContent = `${input.value.length} / 1000`;
    submit.disabled = !input.value.trim();
  }
  function resetPaper() {
    playing = false;
    cancelAnimationFrame(frame);
    stage.hidden = true;
    result.hidden = true;
    room.classList.remove('paper-playing', 'paper-kicking', 'paper-finished');
    room.dispatchEvent(new CustomEvent('puppy-paper-pose', { detail: { progress: null } }));
  }
  // Any ordinary action, including Stop or leaving, interrupts this interaction.
  room.addEventListener('puppy-action', resetPaper);
  room.addEventListener('puppy-paper-foot', event => { foot = event.detail; });

  function openPaper() {
    setAction('');
    room.dispatchEvent(new CustomEvent('puppy-walk', { detail: { fraction: .5 } }));
    input.value = '';
    updateInput();
    dialog.showModal();
    input.focus({ preventScroll: true });
  }
  entry.addEventListener('click', openPaper);
  document.querySelector('#paper-again').addEventListener('click', openPaper);
  document.querySelector('#paper-done').addEventListener('click', () => {
    setAction('');
    entry.focus({ preventScroll: true });
  });
  document.querySelector('#paper-close').addEventListener('click', () => dialog.close());
  document.querySelector('#paper-later').addEventListener('click', () => dialog.close());
  input.addEventListener('input', updateInput);
  dialog.addEventListener('close', () => {
    input.value = '';
    updateInput();
    if (!playing) entry.focus({ preventScroll: true });
  });

  function windowBounds() {
    const bounds = room.getBoundingClientRect();
    if (bounds.width < 600) return { x: 21, y: 72, width: 104, height: 125 };
    const original = room.querySelector('.window').getBoundingClientRect();
    const width = original.width * .83;
    return { x: original.x - bounds.x + original.width * .085, y: original.y - bounds.y + 4, width, height: original.height * .94 };
  }

  function kickSound() { playEffect('kick'); }

  function finish() {
    playing = false;
    setAction('');
    room.classList.add('paper-finished');
    result.hidden = false;
    playEffect('done');
    caption.textContent = '这一团，已经飞远啦。';
    note.textContent = '不必马上释怀，先让自己歇一小会儿。';
    document.querySelector('#paper-again').focus({ preventScroll: true });
  }

  function draw(now) {
    if (!playing) return;
    const duration = reduced.matches ? 1300 : 4800;
    const p = clamp((now - startTime) / duration);
    const width = room.clientWidth;
    const height = room.clientHeight;
    const windowRect = windowBounds();
    Object.assign(paperWindow.style, { left: `${windowRect.x}px`, top: `${windowRect.y}px`, width: `${windowRect.width}px`, height: `${windowRect.height}px` });
    room.dispatchEvent(new CustomEvent('puppy-paper-pose', { detail: { progress: reduced.matches ? null : p } }));
    room.classList.toggle('paper-kicking', p > .43 && p < .65);

    const start = { x: width * .5 - 34, y: height * .76 };
    const crumple = ease((p - .08) / .18);
    sheet.style.left = `${start.x - 50}px`;
    sheet.style.top = `${start.y - 143}px`;
    sheet.style.transform = reduced.matches ? 'none' : `translateY(${crumple * 80}px) rotate(${-5 + crumple * 55}deg) scale(${1 - crumple * .84},${1 - crumple * .8})`;
    sheet.style.opacity = String(1 - ease((p - .2) / .065));
    let position = start;
    if (p > .44 && p < .52 && foot) {
      const blend = ease((p - .44) / .08);
      position = { x: start.x + (foot.x - start.x) * blend, y: start.y + (foot.y - start.y) * blend };
    }
    if (p >= .52) {
      if (!kicked) {
        kicked = true;
        launch = foot ? { ...foot } : start;
        kickSound();
        caption.textContent = '咻——！这一团，飞远一点吧。';
      }
      const flight = ease((p - .52) / .34);
      const target = { x: windowRect.x + windowRect.width * .63, y: windowRect.y + windowRect.height * .38 };
      position = { x: launch.x + (target.x - launch.x) * flight, y: launch.y + (target.y - launch.y) * flight - Math.sin(flight * Math.PI) * height * .14 };
      ball.style.transform = reduced.matches ? 'scale(.7)' : `rotate(${flight * 720}deg) scale(${1 - flight * .97})`;
      ball.style.opacity = String(1 - ease((flight - .9) / .1));
    } else {
      ball.style.transform = `rotate(${crumple * 40}deg) scale(${ease((p - .21) / .06)})`;
      ball.style.opacity = '1';
    }
    if (reduced.matches) position = start;
    ball.style.left = `${position.x - 17}px`;
    ball.style.top = `${position.y - 17}px`;
    pop.style.left = `${width * .5 + 40}px`;
    pop.style.top = `${height * .49}px`;
    pop.style.opacity = String(p >= .52 && p < .8 ? Math.sin((p - .52) / .28 * Math.PI) : 0);
    paperWindow.querySelector('#paper-distant-trail').style.opacity = String(p >= .66 && p < .92 ? .8 : 0);
    if (p >= 1) finish();
    else frame = requestAnimationFrame(draw);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value.trim() || playing) return;
    // The text is never copied into an animation, storage, analytics or a request.
    input.value = '';
    updateInput();
    setAction('');
    playing = true;
    kicked = false;
    foot = launch = null;
    dialog.close();
    room.classList.add('paper-playing');
    stage.hidden = false;
    playEffect('crumple');
    stop.disabled = false;
    caption.textContent = '揉成一小团，小金毛准备好啦。';
    note.textContent = '这一次，让纸团替你飞远一点。';
    room.scrollIntoView({ behavior: 'instant', block: 'center' });
    stop.focus({ preventScroll: true });
    startTime = performance.now();
    frame = requestAnimationFrame(draw);
  });
  window.addEventListener('pagehide', () => { input.value = ''; resetPaper(); });
})();
