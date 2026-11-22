// Ember Court — the cards. One job: what every card is and how a deck is built.
export const SUITS = {
  ember: { name: 'Ember', color: '#e2482a', word: 'EMBER' },
  tide: { name: 'Tide', color: '#2a7de2', word: 'TIDE' },
  thorn: { name: 'Thorn', color: '#3da35d', word: 'THORN' },
  gale: { name: 'Gale', color: '#d99a16', word: 'GALE' },
};

// kind: 'strike' deals damage, 'guard' gains shield, 'spark' draws cards,
// 'drain' damages and heals you. power is the base number; text explains it.
export const CARD_DEFS = [
  { id: 'cinder-blade', name: 'Cinder Blade', suit: 'ember', cost: 2, power: 4, kind: 'strike',
    text: 'Deal 4 damage.' },
  { id: 'ember-imp', name: 'Ember Imp', suit: 'ember', cost: 1, power: 2, kind: 'strike',
    text: 'Deal 2 damage.' },
  { id: 'pyre-burst', name: 'Pyre Burst', suit: 'ember', cost: 4, power: 7, kind: 'strike',
    text: 'Deal 7 damage.' },
  { id: 'ash-fan', name: 'Ash Fan', suit: 'ember', cost: 3, power: 3, kind: 'drain',
    text: 'Deal 3 damage. Heal 3 life.' },
  { id: 'tide-ward', name: 'Tide Ward', suit: 'tide', cost: 2, power: 5, kind: 'guard',
    text: 'Gain 5 shield.' },
  { id: 'deep-current', name: 'Deep Current', suit: 'tide', cost: 3, power: 3, kind: 'spark',
    text: 'Deal 3 damage. Draw 1 card.' },
  { id: 'still-water', name: 'Still Water', suit: 'tide', cost: 1, power: 3, kind: 'guard',
    text: 'Gain 3 shield.' },
  { id: 'flood-call', name: 'Flood Call', suit: 'tide', cost: 4, power: 6, kind: 'strike',
    text: 'Deal 6 damage.' },
  { id: 'thorn-vine', name: 'Thorn Vine', suit: 'thorn', cost: 2, power: 3, kind: 'strike',
    text: 'Deal 3 damage.' },
  { id: 'briar-wall', name: 'Briar Wall', suit: 'thorn', cost: 3, power: 7, kind: 'guard',
    text: 'Gain 7 shield.' },
  { id: 'seed-burst', name: 'Seed Burst', suit: 'thorn', cost: 2, power: 2, kind: 'spark',
    text: 'Deal 2 damage. Draw 1 card.' },
  { id: 'root-drink', name: 'Root Drink', suit: 'thorn', cost: 3, power: 4, kind: 'drain',
    text: 'Deal 4 damage. Heal 4 life.' },
  { id: 'gale-gust', name: 'Gale Gust', suit: 'gale', cost: 1, power: 1, kind: 'spark',
    text: 'Deal 1 damage. Draw 1 card.' },
  { id: 'storm-feather', name: 'Storm Feather', suit: 'gale', cost: 2, power: 4, kind: 'strike',
    text: 'Deal 4 damage.' },
  { id: 'wind-wall', name: 'Wind Wall', suit: 'gale', cost: 2, power: 4, kind: 'guard',
    text: 'Gain 4 shield.' },
  { id: 'tempest', name: 'Tempest', suit: 'gale', cost: 5, power: 9, kind: 'strike',
    text: 'Deal 9 damage.' },
];

// Build a 32-card deck: two copies of each definition, shuffled with the given rng.
export function buildDeck(rng) {
  const cards = [];
  for (const def of CARD_DEFS) {
    cards.push({ ...def, uid: def.id + '-a' });
    cards.push({ ...def, uid: def.id + '-b' });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// Resonance: the second card of a suit played in one turn gains +2 power.
export function resonanceBonus(playedSuits, suit) {
  return playedSuits.includes(suit) ? 2 : 0;
}
