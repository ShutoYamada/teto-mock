import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, initGame } from '../src/gameReducer';
import { createCurseCard, addCurseToDeck, resolveHandCurses, weaknessBonus } from '../src/curses';
import { createArtifact, ARTIFACT_DEFS, getArtifactPrice, generateShopArtifacts, getRandomArtifactByRarity, createEmptyBoard, canPlaceCard, clearLines, placeCard } from '../src/gameLogic';
import { createBossEncounter, prepareBossTurn } from '../src/battle/bosses';
import { enhanceBasicCard } from '../src/events/explorationEvents';
import { generateRewardCards, generateShopCards } from '../src/tetrominos';
import type { GameState, CurseType, MinoCard, BoardState } from '../src/types';

const mino: MinoCard = { id: 'single', type: 'I', shape: [[true]], cost: 0, attack: 1, rarity: 'default', color: '#fff', glowColor: '#fff' };
function battle(boss = false): GameState {
  const initial = initGame();
  return { ...initial, ...(boss ? createBossEncounter('ironTurtle') : {}), screen: 'battle', artifacts: [],
    board: createEmptyBoard(), hp: 1000, maxHp: 1000, hand: [], deck: Array.from({ length: 20 }, (_, i) => ({ ...mino, id: `draw-${i}` })),
    enemies: boss ? createBossEncounter('ironTurtle').enemies : [{ id: 'dummy', name: 'test', type: 'normal', hp: 1000, maxHp: 1000, nextAttack: 0, intent: { actionName: 'wait', description: '' }, statuses: [], goldReward: 0 }] };
}
const end = (s: GameState) => gameReducer(s, { type: 'END_PLAYER_TURN' });
const advance = (s: GameState) => gameReducer(end(s), { type: 'EXECUTE_ENEMY_TURN' });

test('all curses are separate cards; unusable, unrotatable, no placement/upgrade/reward pollution', () => {
  for (const type of ['decay', 'frailty', 'depletion', 'sluggishness', 'blockade'] as CurseType[]) {
    const card = createCurseCard(type);
    const s = { ...battle(), hand: [card] };
    assert.equal(card.type, 'Curse');
    assert.equal(gameReducer(s, { type: 'SELECT_CARD', cardId: card.id }), s);
    assert.equal(gameReducer(s, { type: 'ROTATE_CARD', cardId: card.id }), s);
    assert.equal(canPlaceCard(s.board, card, 0, 0), false);
    assert.equal(placeCard(s.board, card, 0, 0), s.board);
    assert.equal(enhanceBasicCard(card), card);
    assert.equal(addCurseToDeck(s, type).deck.length, s.deck.length + 1);
  }
  assert.ok(generateRewardCards(100).every(c => !c.curse));
  assert.ok(generateShopCards(100).every(c => !c.curse));
});

test('decay and frailty place up to three distinct empty cells, without mutation or line clearing', () => {
  for (const type of ['decay', 'frailty'] as CurseType[]) {
    const s = { ...battle(), hand: [createCurseCard(type)] };
    const snapshot = JSON.stringify(s);
    const next = end(s);
    assert.equal(next.board.flat().filter(Boolean).length, 3);
    assert.equal(JSON.stringify(s), snapshot);
    assert.equal(next.hand.length, 0);
    assert.equal(next.discardPile[0].id, s.hand[0].id);
    const full: BoardState = s.board.map(row => row.map(() => ({ type: 'I' as const, blockType: 'normal' as const })));
    full[0][0] = null;
    const crowded = end({ ...s, board: full });
    assert.equal(crowded.board.flat().filter(Boolean).length, 49);
    assert.equal(end({ ...s, board: crowded.board }).board.flat().filter(Boolean).length, 49);
  }
});

test('MP and draw losses stack, floor at zero, apply once in regular and boss battles', () => {
  for (const boss of [false, true]) {
    const s = battle(boss);
    s.hand = [...Array.from({ length: 7 }, () => createCurseCard('depletion')), ...Array.from({ length: 7 }, () => createCurseCard('sluggishness'))];
    const next = advance(boss ? prepareBossTurn(s) : s);
    assert.equal(next.mp, 0);
    assert.equal(next.hand.length, 0);
    assert.equal(next.maxMp, s.maxMp);
    const after = advance(next);
    assert.equal(after.mp, s.maxMp);
    assert.equal(after.hand.length, 5);
  }
});

test('blockade remains stable through enemy turn, blocks occupied shape only, expires and can renew', () => {
  const s = { ...battle(), hand: [createCurseCard('blockade'), createCurseCard('blockade')] };
  const ended = end(s);
  const targets = ended.pendingCurseEffects.sealedLines;
  assert.equal(targets.length, 2);
  const next = gameReducer(ended, { type: 'EXECUTE_ENEMY_TURN' });
  assert.deepEqual(next.sealedLines, targets);
  const t = targets[0];
  const r = t.axis === 'row' ? t.index : 0, c = t.axis === 'col' ? t.index : 0;
  assert.equal(canPlaceCard(next.board, mino, r, c, next.sealedLines), false);
  const selected = { ...next, hand: [mino], selectedCardId: mino.id };
  assert.equal(gameReducer(selected, { type: 'PLACE_CARD', row: r, col: c }), selected);
  assert.equal(canPlaceCard(next.board, { ...mino, shape: [[false, true]] }, 0, 0, [{ axis: 'col', index: 0 }]), true);
  assert.deepEqual(advance({ ...next, hand: [] }).sealedLines, []);
  assert.equal(advance({ ...next, hand: [createCurseCard('blockade')] }).sealedLines.length, 1);
});

test('weakness increases each positive hit before multiplier/shield, including bosses; zero attacks stay zero', () => {
  for (const boss of [false, true]) {
    let s = battle(boss);
    s.board[0][0] = { type: 'I', blockType: 'weakness' };
    s.enemies[0].nextAttack = 2;
    s.enemies[0].intent.count = 3;
    s.statuses = [{ type: 'fallen', value: 2 }]; s.shield = 4;
    const next = advance(s);
    assert.equal(next.hp, s.hp - (7 * 3 - 4));
    s = battle(boss); s.board[0][0] = { type: 'I', blockType: 'weakness' }; s.enemies[0].nextAttack = 0;
    assert.equal(advance(s).hp, s.hp);
  }
});

test('weakness affects poison and disappears on line clear', () => {
  const s = battle();
  s.board[0][0] = { type: 'I', blockType: 'weakness' };
  s.statuses = [{ type: 'poison', value: 2 }];
  assert.equal(end(s).hp, s.hp - 5);
  assert.equal(weaknessBonus(s.board), 3);
  s.board[0] = s.board[0].map(() => ({ type: 'I', blockType: 'weakness' }));
  assert.equal(weaknessBonus(clearLines(s.board).newBoard), 0);
});

test('only hand curses trigger and reservations clear on victory/death', () => {
  const s = battle(); s.deck = [createCurseCard('decay')];
  assert.equal(resolveHandCurses(s).board.flat().filter(Boolean).length, 0);
  s.hand = [mino]; s.selectedCardId = mino.id; s.enemies[0].hp = 1; s.targetEnemyId = s.enemies[0].id;
  s.pendingCurseEffects = { mpLoss: 1, drawLoss: 1, sealedLines: [{ axis: 'row', index: 3 }] };
  s.sealedLines = [{ axis: 'row', index: 3 }];
  const won = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 });
  assert.equal(won.screen, 'result'); assert.equal(won.sealedLines.length, 0); assert.equal(won.pendingCurseEffects.mpLoss, 0);
  const dead = end({ ...s, hp: 1, statuses: [{ type: 'poison', value: 1 }], hand: [createCurseCard('depletion')] });
  assert.equal(dead.screen, 'gameover'); assert.equal(dead.pendingCurseEffects.mpLoss, 0);
});


test('one depletion/sluggishness reduces MP and hand by one, stacks with other draw modifiers', () => {
  for (const boss of [false, true]) {
    const s = battle(boss);
    s.hand = [createCurseCard('depletion'), createCurseCard('sluggishness')];
    const next = advance(s);
    assert.equal(next.mp, 4);
    assert.equal(next.hand.length, 4);
    const modified = advance({ ...s, statuses: [{ type: 'draw_down', value: 1 }], artifacts: [{ id: 'devil_statue', name: 'test', rarity: 'rare', description: '', isEliteDrop: false, isShopSale: false, isEventReward: false }] });
    assert.equal(modified.hand.length, 2);
  }
});

test('discarded curse reshuffles and triggers again only at the next end of turn', () => {
  const card = createCurseCard('decay');
  const s = { ...battle(), deck: [], hand: [card] };
  const next = advance(s);
  assert.equal(next.board.flat().filter(Boolean).length, 3);
  assert.equal(next.hand[0].id, card.id);
  assert.equal(end(next).board.flat().filter(Boolean).length, 6);
});

test('ofuda spends 1 MP to discard each curse without triggering its penalty', () => {
  for (const curse of ['decay', 'frailty', 'depletion', 'sluggishness', 'blockade'] as CurseType[]) {
    const card = createCurseCard(curse);
    const s = { ...battle(), hand: [card, mino], artifacts: [createArtifact('ofuda')], selectedCardId: mino.id };
    const snapshot = JSON.stringify(s);
    const used = gameReducer(s, { type: 'SELECT_CARD', cardId: card.id });
    assert.equal(used.mp, s.mp - 1);
    assert.deepEqual(used.hand, [mino]);
    assert.deepEqual(used.discardPile, [card]);
    assert.equal(used.selectedCardId, null);
    assert.equal(JSON.stringify(s), snapshot);
    const ended = end(used);
    assert.equal(ended.board.flat().filter(Boolean).length, 0);
    assert.equal(ended.pendingCurseEffects.mpLoss, 0);
    assert.equal(ended.pendingCurseEffects.drawLoss, 0);
    assert.equal(ended.pendingCurseEffects.sealedLines.length, 0);
    assert.equal(gameReducer(used, { type: 'SELECT_CARD', cardId: card.id }), used);
    for (const blocked of [{ ...s, mp: 0 }, { ...s, artifacts: [] }, { ...s, turn: 'enemy' as const }, { ...s, screen: 'dungeon' as const }]) {
      assert.equal(gameReducer(blocked, { type: 'SELECT_CARD', cardId: card.id }), blocked);
    }
  }
});

test('ofuda is shop-only, uses uncommon pricing, and owned copies are excluded', () => {
  const ofuda = createArtifact('ofuda');
  assert.equal(ofuda.isShopSale, true);
  assert.equal(ofuda.isEliteDrop, false);
  assert.equal(ofuda.isEventReward, false);
  assert.equal(getArtifactPrice(ofuda), 200);
  const others = Object.keys(ARTIFACT_DEFS).filter(id => id !== 'ofuda').map(createArtifact);
  assert.deepEqual(generateShopArtifacts(others).map(a => a.id), ['ofuda']);
  assert.deepEqual(generateShopArtifacts([...others, ofuda]), []);
  assert.equal(getRandomArtifactByRarity(1, others), null);
  const s = { ...battle(), screen: 'shop' as const, gold: 200, shopArtifacts: [ofuda] };
  const bought = gameReducer(s, { type: 'BUY_ARTIFACT', artifactId: 'ofuda' });
  assert.equal(bought.gold, 0);
  assert.equal(bought.artifacts[0].id, 'ofuda');
  assert.equal(bought.shopArtifacts.length, 0);
  assert.equal(gameReducer(bought, { type: 'BUY_ARTIFACT', artifactId: 'ofuda' }), bought);
});
