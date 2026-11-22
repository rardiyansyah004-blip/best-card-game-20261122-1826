// Ember Court — the table's face. One job: turn duel state into DOM, with
// the slide, flip and snap of real cards.
import { SUITS } from './cards.js';
import { MAX_LIFE } from './engine.js';

const $ = (id) => document.getElementById(id);
const els = {};
for (const id of ['screen-title', 'screen-table', 'screen-win', 'screen-loss',
  'opp-life', 'opp-life-fill', 'opp-mana', 'opp-shield', 'opp-shield-row',
  'you-life', 'you-life-fill', 'you-mana', 'you-shield', 'you-shield-row',
  'opp-hand', 'player-hand', 'intent-text', 'last-play', 'log', 'turn-banner',
  'btn-end-turn', 'deck-count', 'turn-count', 'win-stats', 'loss-stats', 'status',
  'played-row']) {
  els[id] = $(id);
}

export function showScreen(name) {
  for (const key of ['screen-title', 'screen-table', 'screen-win', 'screen-loss']) {
    els[key].classList.toggle('hidden', key !== `screen-${name}`);
  }
}

function manaPips(el, mana, max) {
  el.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const pip = document.createElement('span');
    pip.className = 'mana-pip' + (i < mana ? ' full' : '');
    el.appendChild(pip);
  }
}

function cardElement(card, duel, playable) {
  const suit = SUITS[card.suit];
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}`;
  el.dataset.uid = card.uid;
  const affordable = card.cost <= duel.you.mana;
  if (!affordable) el.classList.add('unaffordable');
  if (duel.you.playedSuits.includes(card.suit)) el.classList.add('resonant');
  el.innerHTML =
    `<span class="cost">${card.cost}</span>` +
    `<span class="power">${card.power}</span>` +
    `<span class="suit-glyph" aria-hidden="true"></span>` +
    `<span class="card-name">${card.name}</span>` +
    `<span class="card-text">${card.text}</span>` +
    `<span class="suit-word">${suit.word}</span>`;
  el.title = `${card.name} — ${card.text} (cost ${card.cost})`;
  return el;
}

function cardBackElement() {
  const el = document.createElement('div');
  el.className = 'card-back';
  el.textContent = '◆';
  return el;
}

export function renderTable(duel) {
  // Life, mana, shield.
  els['opp-life'].textContent = duel.ai.life;
  els['opp-life-fill'].style.width = `${(duel.ai.life / MAX_LIFE) * 100}%`;
  els['you-life'].textContent = duel.you.life;
  els['you-life-fill'].style.width = `${(duel.you.life / MAX_LIFE) * 100}%`;
  manaPips(els['opp-mana'], duel.ai.mana, duel.ai.maxMana);
  manaPips(els['you-mana'], duel.you.mana, duel.you.maxMana);
  els['opp-shield'].textContent = duel.ai.shield;
  els['you-shield'].textContent = duel.you.shield;
  els['opp-shield-row'].style.visibility = duel.ai.shield > 0 ? 'visible' : 'hidden';
  els['you-shield-row'].style.visibility = duel.you.shield > 0 ? 'visible' : 'hidden';

  // Opponent hand: face-down backs, so her choices stay hidden until played.
  els['opp-hand'].innerHTML = '';
  for (const _card of duel.ai.hand) els['opp-hand'].appendChild(cardBackElement());

  // Player hand.
  els['player-hand'].innerHTML = '';
  duel.you.hand.forEach((card, i) => {
    const el = cardElement(card, duel, true);
    el.style.animationDelay = `${i * 60}ms`;
    el.classList.add('dealt');
    els['player-hand'].appendChild(el);
  });

  // Intent, last play, log, turn.
  els['intent-text'].textContent = duel.intent ? duel.intent.text : 'The Duchess is thinking…';
  els['played-row'].innerHTML = '';
  for (const play of duel.playedThisTurn) {
    const mini = document.createElement('div');
    mini.className = `mini-play-card suit-${play.suit}`;
    mini.innerHTML = `<span class="cost">${play.cost}</span>` +
      `<span class="power">${play.power}</span>` +
      `<span class="suit-glyph" aria-hidden="true"></span>` +
      `<span class="card-name">${play.name}</span>` +
      `<span class="played-by">${play.who === 'you' ? 'You' : 'Duchess'}</span>`;
    els['played-row'].appendChild(mini);
  }
  els['last-play'].textContent = duel.lastPlay;
  els['log'].innerHTML = duel.log.slice(-3).map((l) => `<div>${l}</div>`).join('');
  els['deck-count'].textContent = duel.you.deck.length;
  els['turn-count'].textContent = duel.turn;
  const banner = els['turn-banner'];
  if (duel.phase === 'player') {
    banner.textContent = `Your turn — ${duel.you.mana} mana`;
    banner.classList.remove('ai');
    els['btn-end-turn'].disabled = false;
  } else if (duel.phase === 'ai') {
    banner.textContent = 'The Duchess plays…';
    banner.classList.add('ai');
    els['btn-end-turn'].disabled = true;
  }
  els.status.textContent = `Your life ${duel.you.life}, Duchess life ${duel.ai.life}, turn ${duel.turn}.`;
}

export function renderEnd(duel) {
  const stats = `Turns played: ${duel.stats.turns} · Cards played: ${duel.stats.cardsPlayed} · Damage dealt: ${duel.stats.damageDealt} · Final life — you ${duel.you.life}, Duchess ${duel.ai.life}`;
  if (duel.phase === 'win') {
    els['win-stats'].textContent = stats;
    showScreen('win');
  } else {
    els['loss-stats'].textContent = stats;
    showScreen('loss');
  }
}

// Animate a played card sliding up and fading before the table re-renders.
export function animatePlayedCard(uid, done) {
  const el = document.querySelector(`.card[data-uid="${uid}"]`);
  if (!el) { done(); return; }
  el.classList.add('playing');
  setTimeout(done, 320);
}
