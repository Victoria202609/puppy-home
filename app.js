const room = document.querySelector('#room');
const anchor = document.querySelector('#dog-anchor');
const caption = document.querySelector('#room-caption');
const emote = document.querySelector('#dog-emote');
const note = document.querySelector('#activity-note');
const stop = document.querySelector('#stop');
const welcome = document.querySelector('#welcome');
const goodbye = document.querySelector('#goodbye');
const soundButton = document.querySelector('#sound-toggle');
const cards = [...document.querySelectorAll('.action-card[data-action]')];
const actions = {
  roll: { caption: '滚来滚去。今天不讲道理，也可以。', note: '地板软软的，随你怎么滚。', emote: '～' },
  run: { caption: '没有终点，没有第一名。只是想跑，就跑。', note: '风呼呼的，脑袋可以空空的。', emote: '' },
  jump: { caption: '蹦起来！把那些「应该」，先抖掉一点点。', note: '这一小下，只是因为你想。', emote: '✦' },
  howl: { caption: '嗷呜——！不用组织语言，也有人听见。', note: '声音关着也没关系，你的嗷呜一样算数。', emote: '嗷呜～' },
  rest: { caption: '什么都不做，也是小狗很重要的事。', note: '没有倒计时。想趴多久，就趴多久。', emote: 'z z Z' }
};
let currentAction = '';
let soundEnabled = true;
const puppyAudio = new PuppySound();
const volumeSlider = document.querySelector('#sound-volume');
const volumeLabel = document.querySelector('#sound-volume-value');
let lastVolume = 85;

function silence() { puppyAudio.stop(); }
function playEffect(name, loop = false) {
  if (soundEnabled && !document.hidden) return puppyAudio.play(name, loop);
  return Promise.resolve(false);
}
function startSound() {
  silence();
  if (currentAction) playEffect(currentAction, true);
}
function updateSoundUI() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? '关闭声音' : '打开声音');
  soundButton.querySelector('use').setAttribute('href', soundEnabled ? '#sound' : '#mute');
  soundButton.querySelector('span').textContent = soundEnabled ? '声音已开' : '声音已关';
  volumeLabel.textContent = `${volumeSlider.value}%`;
  volumeSlider.setAttribute('aria-valuetext', `${volumeSlider.value}%`);
}

function setAction(action) {
  currentAction = action;
  room.dataset.action = action;
  room.dispatchEvent(new CustomEvent('puppy-action', { detail: { action } }));
  anchor.style.left = '50%';
  cards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.action === action)));
  stop.disabled = !action;
  caption.textContent = action ? actions[action].caption : '现在的你，只是一只没有待办事项的小狗。';
  note.textContent = action ? actions[action].note : '不想选也没关系，待着就很好。';
  emote.textContent = action ? actions[action].emote : '';
  startSound();
}

cards.forEach(card => card.addEventListener('click', () => {
  if (currentAction === card.dataset.action) {
    // A repeated tap is a new invitation to play, including on reduced-motion devices.
    const moving = room.querySelector('.dog-motion');
    moving.style.animation = 'none';
    void moving.offsetWidth;
    moving.style.animation = '';
  }
  setAction(card.dataset.action);
}));
stop.addEventListener('click', () => setAction(''));

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) silence();
  else {
    if (Number(volumeSlider.value) === 0) volumeSlider.value = String(lastVolume);
    puppyAudio.setVolume(Number(volumeSlider.value) / 100);
    if (currentAction && !goodbye.open) startSound();
    else if (!room.classList.contains('paper-playing')) playEffect('hello');
  }
  updateSoundUI();
});
volumeSlider.addEventListener('input', () => {
  const wasEnabled = soundEnabled;
  const value = Number(volumeSlider.value);
  soundEnabled = value > 0;
  if (value > 0) lastVolume = value;
  puppyAudio.setVolume(value / 100);
  if (!soundEnabled) silence();
  else if (!wasEnabled && currentAction && !goodbye.open) startSound();
  updateSoundUI();
});
updateSoundUI();

room.addEventListener('click', event => {
  if (event.target.closest('button, .sound-controls')) return;
  const bounds = room.getBoundingClientRect();
  if (event.clientY - bounds.top < bounds.height * .59) return;
  setAction('');
  const margin = 85;
  const x = Math.max(margin, Math.min(bounds.width - margin, event.clientX - bounds.left));
  anchor.style.left = `${x / bounds.width * 100}%`;
  room.dispatchEvent(new CustomEvent('puppy-walk', { detail: { fraction: x / bounds.width } }));
  caption.textContent = '这里的每一个角落，都欢迎你。';
  playEffect('walk');
});

function openWelcome() { setAction(''); welcome.showModal(); }
document.querySelector('#story-open').addEventListener('click', openWelcome);
document.querySelector('#enter').addEventListener('click', () => { welcome.close(); playEffect('hello'); });
welcome.addEventListener('close', () => {
  try { localStorage.setItem('puppy_home_visited', 'true'); } catch { /* The room works without storage. */ }
  document.querySelector('.action-card[data-action="roll"]').focus({ preventScroll: true });
});
document.querySelector('#leave').addEventListener('click', () => { setAction('rest'); silence(); goodbye.showModal(); });
document.querySelector('#return').addEventListener('click', () => { goodbye.close(); startSound(); });
goodbye.addEventListener('close', () => document.querySelector('.action-card[data-action="rest"]').focus({ preventScroll: true }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !welcome.open && !goodbye.open) setAction('');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) silence();
  else if (!welcome.open && !goodbye.open) startSound();
});
window.addEventListener('pagehide', silence);
try {
  if (localStorage.getItem('puppy_home_visited') !== 'true') openWelcome();
} catch { openWelcome(); }
