// Ember Court — the Ashen Duchess. One job: what the opponent does, and the
// intent she announces so the player can read her and counter her.
import { resonanceBonus } from './cards.js';

// Pick the cards the Duchess plays on her turn, in order. She spends her mana
// on the best value she can afford, shields when hurt, and strikes when ahead.
export function chooseAiPlays(ai, playerLife, rng) {
  const plays = [];
  let mana = ai.mana;
  const suitsPlayed = [];
  const hand = [...ai.hand];
  // Score each card: damage is worth more when the player is low, shield when she is low.
  const score = (card) => {
    let s = card.power;
    if (card.kind === 'strike') s += playerLife <= 6 ? 4 : 0;
    if (card.kind === 'guard') s += ai.life <= 8 ? 5 : 0;
    if (card.kind === 'spark') s += 1;
    if (card.kind === 'drain') s += ai.life <= 10 ? 2 : 0;
    s += resonanceBonus(suitsPlayed, card.suit);
    return s / card.cost;
  };
  while (true) {
    const affordable = hand.filter((c) => c.cost <= mana);
    if (!affordable.length) break;
    affordable.sort((a, b) => score(b) - score(a));
    const pick = affordable[0];
    // She sometimes holds a big card for next turn instead of spending everything.
    if (pick.cost >= 4 && mana - pick.cost < 2 && rng() < 0.3) break;
    plays.push(pick);
    hand.splice(hand.indexOf(pick), 1);
    mana -= pick.cost;
    suitsPlayed.push(pick.suit);
  }
  return plays;
}

// The intent she shows at the start of the player's turn: a readable promise
// of what her next turn will hold, computed from her hand and mana.
export function computeIntent(ai, playerLife) {
  const nextMana = Math.min(ai.turn + 1, 10);
  const affordable = ai.hand.filter((c) => c.cost <= nextMana);
  if (!affordable.length) return { key: 'wait', text: 'The Duchess will hold her cards and wait.' };
  const strikes = affordable.filter((c) => c.kind === 'strike' || c.kind === 'drain');
  const guards = affordable.filter((c) => c.kind === 'guard');
  const sparks = affordable.filter((c) => c.kind === 'spark');
  const bigStrike = strikes.reduce((m, c) => Math.max(m, c.power), 0);
  if (ai.life <= 8 && guards.length) {
    return { key: 'shield', text: 'The Duchess will raise her shield — strike now, or outlast her.' };
  }
  if (playerLife <= 7 && strikes.length) {
    return { key: 'attack', text: `The Duchess plans a heavy blow (${bigStrike} damage) — shield up or finish her first!` };
  }
  if (strikes.length && bigStrike >= 4) {
    return { key: 'attack', text: 'The Duchess plans to attack — her embers are gathering.' };
  }
  if (sparks.length) {
    return { key: 'draw', text: 'The Duchess will draw deep — she is hunting for a bigger card.' };
  }
  if (guards.length) {
    return { key: 'shield', text: 'The Duchess will shield herself — a slow, patient turn.' };
  }
  return { key: 'attack', text: 'The Duchess plans to attack — her embers are gathering.' };
}
