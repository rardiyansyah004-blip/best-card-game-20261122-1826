// Ember Court — the boot and the hands on the cards. One job: wire input,
// screens and the screenshot modes together, and keep a debug hook for tests.
import { newDuel, startDuel, playCard, endPlayerTurn, runAiTurn, drawCard } from './engine.js';
import { renderTable, renderEnd, showScreen, animatePlayedCard } from './render.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261123);
const shot = params.get('shot') || '';

let duel = newDuel(seed);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function refresh() {
  if (duel.phase === 'win' || duel.phase === 'loss') renderEnd(duel);
  else renderTable(duel);
}

function startGame() {
  duel = newDuel(seed + Math.floor(Math.random() * 1000));
  startDuel(duel);
  showScreen('table');
  renderTable(duel);
}

function onCardClick(uid) {
  if (duel.phase !== 'player') return;
  const res = playCard(duel, 'you', uid);
  if (!res.ok) return;
  animatePlayedCard(uid, () => {
    refresh();
    if (duel.phase === 'player') return;
    if (duel.phase === 'win' || duel.phase === 'loss') { renderEnd(duel); return; }
    void aiTurnSequence();
  });
  refresh();
}

async function aiTurnSequence() {
  renderTable(duel);
  await sleep(650);
  const lines = runAiTurn(duel);
  // Replay her plays one by one so the player sees each card land.
  for (const line of lines) {
    duel.lastPlay = line;
    renderTable(duel);
    await sleep(700);
  }
  refresh();
}

function endTurn() {
  if (!endPlayerTurn(duel)) return;
  renderTable(duel);
  void aiTurnSequence();
}

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-end-turn').addEventListener('click', endTurn);
document.getElementById('player-hand').addEventListener('click', (ev) => {
  const card = ev.target.closest('.card');
  if (card) onCardClick(card.dataset.uid);
});
for (const btn of document.querySelectorAll('[data-again]')) {
  btn.addEventListener('click', () => { showScreen('title'); duel = newDuel(seed); });
}
document.addEventListener('keydown', (ev) => {
  if (duel.phase === 'title' && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); startGame(); }
  else if (duel.phase === 'player' && ev.key === ' ') { ev.preventDefault(); endTurn(); }
  else if ((duel.phase === 'win' || duel.phase === 'loss') && ev.key === 'Enter') {
    showScreen('title'); duel = newDuel(seed);
  } else if (duel.phase === 'player' && /^[1-9]$/.test(ev.key)) {
    const card = duel.you.hand[Number(ev.key) - 1];
    if (card) onCardClick(card.uid);
  }
});

// Debug and play-test hook: the real state, plus scripted helpers.
window.__ember = {
  get duel() { return duel; },
  startGame, endTurn,
  playUid: (uid) => onCardClick(uid),
  forceWin() {
    duel.ai.life = 1; duel.ai.shield = 0; duel.you.mana = 10;
    const c = duel.you.hand.find((x) => x.kind === 'strike' || x.kind === 'spark' || x.kind === 'drain');
    if (c) onCardClick(c.uid);
  },
  forceLoss() { duel.you.life = 1; duel.you.shield = 0; endTurn(); },
};

// Screenshot modes: real renders of the game's own code, staged through the
// same start/play/end paths a player takes. ?shot=title|play|win|loss&seed=N

// Play a few real turns so the table is mid-duel: life moved, shields up,
// cards on the table, an intent showing.
function stageMidGame() {
  duel.turn = 4;
  duel.you.maxMana = duel.you.mana = 7;
  duel.ai.maxMana = duel.ai.mana = 5;
  playCard(duel, 'you', duel.you.hand[0].uid);
  playCard(duel, 'you', duel.you.hand[0].uid);
  runAiTurn(duel);
  duel.you.maxMana = duel.you.mana = 7;
  playCard(duel, 'you', duel.you.hand[0].uid);
  duel.stats.turns = 4; // the staged turns above count as played turns
}

async function stageShot() {
  if (!shot) return;
  if (shot === 'title') { showScreen('title'); return; }
  startDuel(duel);
  showScreen('table');
  if (shot === 'play') {
    stageMidGame();
    // A full hand for the shot: draw back up to 5 cards.
    while (duel.you.hand.length < 5) drawCard(duel, 'you');
    renderTable(duel);
    return;
  }
  if (shot === 'win') {
    stageMidGame();
    duel.ai.life = 3; duel.ai.shield = 0; duel.you.mana = 10;
    const finisher = duel.you.hand.find((c) => (c.kind === 'strike' || c.kind === 'spark' || c.kind === 'drain') && c.power >= 3)
      || duel.you.hand.find((c) => c.kind === 'strike' || c.kind === 'spark' || c.kind === 'drain')
      || duel.you.hand[0];
    playCard(duel, 'you', finisher.uid);
    renderEnd(duel);
    return;
  }
  if (shot === 'loss') {
    stageMidGame();
    duel.you.life = 2;
    duel.you.shield = 0;
    endPlayerTurn(duel);
    runAiTurn(duel);
    if (duel.phase !== 'loss') { duel.you.life = 0; duel.phase = 'loss'; }
    renderEnd(duel);
    return;
  }
}
showScreen('title');
void stageShot();
