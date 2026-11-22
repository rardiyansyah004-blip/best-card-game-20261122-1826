// Ember Court — the rules engine. One job: the state of a duel and the turns in it.
import { buildDeck, resonanceBonus } from './cards.js';
import { chooseAiPlays, computeIntent } from './ai.js';

export const MAX_LIFE = 20;
export const MAX_MANA = 10;
export const HAND_SIZE = 5;

// A tiny seeded RNG so screenshots and play-tests are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newDuel(seed) {
  const rng = mulberry32(seed);
  const deck = buildDeck(rng);
  const duel = {
    seed, rng,
    turn: 1,
    phase: 'title', // title | player | ai | win | loss
    you: { life: MAX_LIFE, shield: 0, mana: 1, maxMana: 1, hand: [], deck: deck.slice(0, 16), playedSuits: [] },
    ai: { life: MAX_LIFE, shield: 0, mana: 0, maxMana: 0, hand: [], deck: deck.slice(16), playedSuits: [] },
    intent: null,
    log: [],
    playedThisTurn: [], // most recent plays, shown face-up in the middle of the table
    lastPlay: 'The court awaits its first card.',
    stats: { cardsPlayed: 0, damageDealt: 0, turns: 0 },
  };
  return duel;
}

export function drawCard(duel, who) {
  const side = duel[who];
  if (!side.deck.length) return null;
  const card = side.deck.shift();
  side.hand.push(card);
  return card;
}

export function startDuel(duel) {
  duel.phase = 'player';
  for (let i = 0; i < HAND_SIZE; i++) {
    drawCard(duel, 'you');
    drawCard(duel, 'ai');
  }
  // Never open on a dead turn: each hand must hold a card its first mana pays for.
  for (const who of ['you', 'ai']) {
    const side = duel[who];
    const firstMana = who === 'you' ? 1 : 2;
    if (!side.hand.some((c) => c.cost <= firstMana)) {
      const cheap = side.deck.findIndex((c) => c.cost <= firstMana);
      if (cheap >= 0) {
        const [card] = side.deck.splice(cheap, 1);
        side.deck.push(side.hand[0]);
        side.hand[0] = card;
      }
    }
  }
  duel.you.mana = duel.you.maxMana = 1;
  duel.ai.turn = 1;
  duel.intent = computeIntent(duel.ai, duel.you.life);
  duel.log.push('The duel begins. You draw 5 cards.');
  duel.lastPlay = 'The duel begins — your move, Warden.';
  return duel;
}

function applyDamage(duel, target, amount) {
  const side = duel[target];
  let left = amount;
  if (side.shield > 0) {
    const blocked = Math.min(side.shield, left);
    side.shield -= blocked;
    left -= blocked;
  }
  side.life = Math.max(0, side.life - left);
  return { blocked: amount - left, dealt: left };
}

// Resolve one card played by `who` against the other side. Returns a log line.
export function playCard(duel, who, uid) {
  const side = duel[who];
  const foe = who === 'you' ? 'ai' : 'you';
  const idx = side.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return { ok: false, reason: 'card not in hand' };
  const card = side.hand[idx];
  if (card.cost > side.mana) return { ok: false, reason: 'not enough mana' };
  const bonus = resonanceBonus(side.playedSuits, card.suit);
  const power = card.power + bonus;
  side.mana -= card.cost;
  side.hand.splice(idx, 1);
  side.playedSuits.push(card.suit);
  duel.stats.cardsPlayed += 1;
  const whoName = who === 'you' ? 'You' : 'The Duchess';
  const foeName = foe === 'you' ? 'you' : 'the Duchess';
  let line = '';
  if (card.kind === 'strike' || card.kind === 'spark' || card.kind === 'drain') {
    const r = applyDamage(duel, foe, power);
    if (who === 'you') duel.stats.damageDealt += r.dealt;
    line = `${whoName} play ${card.name} (${power}) — ${r.dealt} damage to ${foeName}` +
      (r.blocked ? `, ${r.blocked} blocked by shield` : '') + '.';
    if (card.kind === 'spark') {
      const drawn = drawCard(duel, who);
      line += drawn ? ` Draw ${drawn.name}.` : ' Deck is empty.';
    }
    if (card.kind === 'drain') {
      side.life = Math.min(MAX_LIFE, side.life + power);
      line += ` Heal ${power} life.`;
    }
  } else if (card.kind === 'guard') {
    side.shield += power;
    line = `${whoName} play ${card.name} — gain ${power} shield.`;
  }
  if (bonus > 0) line += ` Resonance +${bonus}!`;
  duel.lastPlay = line;
  duel.log.push(line);
  duel.playedThisTurn.push({ who, name: card.name, suit: card.suit, power, cost: card.cost });
  if (duel.playedThisTurn.length > 4) duel.playedThisTurn.shift();
  if (duel.ai.life <= 0) duel.phase = 'win';
  else if (duel.you.life <= 0) duel.phase = 'loss';
  return { ok: true, line, card, power };
}

export function endPlayerTurn(duel) {
  if (duel.phase !== 'player') return false;
  duel.phase = 'ai';
  duel.stats.turns += 1;
  duel.log.push('You end your turn.');
  return true;
}

// Run the Duchess's whole turn, returning the lines she produced.
export function runAiTurn(duel) {
  const lines = [];
  duel.ai.turn = duel.turn;
  duel.ai.maxMana = Math.min(duel.turn + 1, MAX_MANA);
  duel.ai.mana = duel.ai.maxMana;
  duel.ai.playedSuits = [];
  drawCard(duel, 'ai');
  const plays = chooseAiPlays(duel.ai, duel.you.life, duel.rng);
  for (const card of plays) {
    const res = playCard(duel, 'ai', card.uid);
    if (res.ok) lines.push(res.line);
    if (duel.phase === 'loss') break;
  }
  if (duel.phase === 'ai') {
    duel.turn += 1;
    duel.phase = 'player';
    duel.you.playedSuits = [];
    duel.you.maxMana = Math.min(duel.turn, MAX_MANA);
    duel.you.mana = duel.you.maxMana;
    const drawn = drawCard(duel, 'you');
    duel.log.push(`Turn ${duel.turn}. You draw ${drawn ? drawn.name : 'nothing — deck empty'}.`);
    duel.ai.turn = duel.turn;
    duel.intent = computeIntent(duel.ai, duel.you.life);
  }
  return lines;
}
