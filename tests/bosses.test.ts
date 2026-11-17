import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, initGame } from '../src/gameReducer';
import { BOSSES, rollBoss, createBossEncounter, prepareBossTurn, refreshBossIntents, onBossLines } from '../src/battle/bosses';
import { clearLines, createEmptyBoard } from '../src/gameLogic';
import type { BossId, GameState, TetrominoCard } from '../src/types';

// Artifact definitions carry effect functions; copy mutable data while retaining function references.
function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return value.map(snapshot) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, snapshot(v)])) as T;
  return value;
}
const single: TetrominoCard = { id: 'test-card', type: 'I', shape: [[true]], color: '#fff', glowColor: '#fff', attack: 4, cost: 0, rarity: 'default' };
function encounter(id: BossId, size = 7): GameState {
  const initial = initGame();
  const battle = createBossEncounter(id);
  return prepareBossTurn({ ...initial, ...battle, artifacts: [], stage: BOSSES[id].stage, stageBoss: id,
    hp: 10000, maxHp: 10000, board: createEmptyBoard(size), boardSize: size,
    screen: 'battle', currentNodeId: 'node-14-0', targetEnemyId: battle.enemies[0].id,
    encounterGold: BOSSES[id].gold, hand: [single], deck: initial.deck, discardPile: [] });
}
function advance(s: GameState): GameState {
  const before = snapshot(s);
  const ended = gameReducer(s, { type: 'END_PLAYER_TURN' });
  const next = gameReducer(ended, { type: 'EXECUTE_ENEMY_TURN' });
  assert.deepEqual(s, before, 'turn processing must not mutate the previous state');
  return next;
}
function play(s: GameState, card = single, row = 0, col = 0): GameState {
  const ready = { ...s, hand: [card, ...s.hand.filter(c => c.id !== card.id)], selectedCardId: card.id };
  const before = snapshot(ready);
  const next = gameReducer(ready, { type: 'PLACE_CARD', row, col });
  assert.deepEqual(ready, before, 'placement must not mutate the previous state');
  return next;
}
function setTurn(s: GameState, turn: number): GameState {
  return prepareBossTurn({ ...s, bossBattle: { ...s.bossBattle!, turn } });
}

test('each stage has exactly three candidates; selection stays fixed along the map', () => {
  for (const stage of [1, 2, 3]) {
    const ids = Object.keys(BOSSES).filter(id => BOSSES[id as BossId].stage === stage);
    assert.equal(ids.length, 3);
    for (let n = 0; n < 100; n++) assert.ok(ids.includes(rollBoss(stage)));
  }
  let s = initGame();
  const selected = s.stageBoss;
  s = gameReducer(s, { type: 'START_BATTLE', nodeId: 'node-0-0' });
  assert.equal(s.stage, 1);
  assert.equal(s.stageBoss, selected);
  assert.equal(gameReducer(s, { type: 'START_BATTLE', nodeId: 'node-14-0' }), s);
});

test('all nine bosses follow their documented fixed cycles through two loops', () => {
  for (const id of Object.keys(BOSSES) as BossId[]) {
    let s = encounter(id);
    for (let turn = 0; turn < BOSSES[id].cycle.length * 2; turn++) {
      assert.equal(s.screen, 'battle', id);
      assert.equal(s.bossBattle?.turn, turn, id);
      const action = s.enemies[0].intent.actionName;
      assert.ok(BOSSES[id].cycle[turn % BOSSES[id].cycle.length].includes(action), `${id}: ${action}`);
      s = advance(s);
    }
  }
});

test('block eater keeps its predicted target and deletes without line rewards or gravity', () => {
  let s = setTurn(encounter('blockEater'), 2);
  const targets = structuredClone(s.bossBattle!.targets);
  s = refreshBossIntents(s);
  assert.deepEqual(s.bossBattle!.targets, targets);
  s.board = s.board.map(row => row.map(() => ({ type: 'I', blockType: 'mana' })));
  const after = advance(s);
  const t = targets[0];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    assert.equal(after.board[r][c] === null, (t.axis === 'row' ? r : c) === t.index);
  }
  assert.equal(after.clearedLines, 0);
  assert.equal(after.score, 0);
});

test('turtle halves only card base attack while line and independent bonuses stay intact', () => {
  let s = encounter('ironTurtle');
  s.statuses = [{ type: 'power', value: 3 }];
  let next = play(s);
  assert.equal(s.enemies[0].hp - next.enemies[0].hp, 5); // 4/2 + power3
  s = setTurn(s, 2);
  next = play(s);
  assert.equal(s.enemies[0].hp - next.enemies[0].hp, 7);
  s = encounter('ironTurtle');
  for (let c = 1; c < 7; c++) s.board[0][c] = { type: 'I', blockType: 'normal' };
  next = play(s);
  assert.equal(s.enemies[0].hp - next.enemies[0].hp, 17); // 2 + line10 + combo5
});

test('chief summons at most two children, new children wait, orders affect that turn', () => {
  let s = encounter('goblinChief');
  const hp = s.hp;
  s = advance(s);
  assert.equal(s.enemies.length, 3);
  assert.equal(hp - s.hp, 3); // only original child attacks
  assert.equal(s.enemies[1].nextAttack, 5); // next turn's order is included
  const before = s.hp;
  s = advance(s);
  assert.equal(before - s.hp, 16); // chief6 + children5x2
  assert.equal(s.enemies[1].statuses.find(x => x.type === 'fury')?.value, 2);
  s = advance(advance(s));
  assert.equal(s.enemies.length, 3);
});

test('chief victory ignores remaining children and rewards exactly once', () => {
  let s = encounter('goblinChief');
  s.enemies[0].hp = 1;
  s = play(s);
  assert.equal(s.screen, 'result');
  assert.equal(s.enemies.length, 0);
  assert.equal(s.gold, 100);
  assert.equal(s.rewardGold, 100);
  assert.equal(gameReducer(s, { type: 'EXECUTE_ENEMY_TURN' }).gold, 100);
});

test('valkyrie reduces the immediately following draw once and telegraphs all hits with fury', () => {
  let s = encounter('valkyrie');
  s = advance(s);
  assert.equal(s.hand.length, 4);
  assert.equal(s.statuses.some(x => x.type === 'draw_down'), false);
  s = advance(s);
  assert.equal(s.hand.length, 5);
  assert.equal(s.enemies[0].intent.count, 3);
  assert.equal(s.enemies[0].nextAttack, 8);
  const before = s.hp;
  s = advance(s);
  assert.equal(before - s.hp, 24);
});

test('magnetic golem multiplies row and column sources independently on a simultaneous clear', () => {
  let s = encounter('magneticGolem');
  for (let i = 1; i < 7; i++) { s.board[0][i] = { type: 'I', blockType: 'normal' }; s.board[i][0] = { type: 'I', blockType: 'normal' }; }
  const rows = play(s);
  assert.equal(s.enemies[0].hp - rows.enemies[0].hp, 39); // base4 + lines20 + matching10 + combo5
  s = setTurn(s, 1);
  assert.equal(s.enemies[0].hp - play(s).enemies[0].hp, 39);
  s = setTurn(s, 2);
  assert.equal(s.enemies[0].hp - play(s).enemies[0].hp, 29);
});

test('spore scatter can be blocked, matures after two player turns, poison starts later', () => {
  let s = encounter('sporeGardener');
  const blocked = s.bossBattle!.cells[0];
  s.board[blocked.row][blocked.col] = { type: 'I', blockType: 'normal' };
  s = advance(s);
  assert.equal(s.board.flat().filter(c => c?.blockType === 'spore').length, 2);
  s = advance(s);
  assert.equal(s.board.flat().filter(c => c?.sporeTurns === 1).length, 2);
  const before = s.hp;
  let ended = gameReducer(s, { type: 'END_PLAYER_TURN' });
  assert.equal(ended.hp, before); // newly matured poison does not tick yet
  assert.equal(ended.statuses.find(x => x.type === 'poison')?.value, 2);
  ended = gameReducer(ended, { type: 'EXECUTE_ENEMY_TURN' });
  const poisonedHp = ended.hp;
  ended = gameReducer(ended, { type: 'END_PLAYER_TURN' });
  assert.equal(poisonedHp - ended.hp, 2);
});

test('spores clear normally and retain their deadline through gravity moves', () => {
  let s = encounter('sporeGardener');
  for (let c = 1; c < 7; c++) s.board[0][c] = { type: 'I', blockType: 'spore', sporeTurns: 1 };
  s = play(s);
  assert.equal(s.board.flat().filter(c => c?.blockType === 'spore').length, 0);
  s = gameReducer(s, { type: 'END_PLAYER_TURN' });
  assert.equal(s.statuses.some(x => x.type === 'poison'), false);
  const board = createEmptyBoard();
  for (let c = 0; c < 7; c++) board[0][c] = { type: 'I', blockType: c === 0 ? 'gravity_down' : 'normal' };
  board[1][3] = { type: 'I', blockType: 'spore', sporeTurns: 1 };
  const result = clearLines(board);
  assert.equal(result.newBoard[6][3]?.sporeTurns, 1);
});

test('core counts actual lines over two turns, interrupts at four, fallen expires after next turn', () => {
  let s = setTurn(encounter('ancientCore'), 1);
  s = onBossLines(s, [0], [0]);
  assert.equal(s.bossBattle?.lines, 2);
  s = advance(s);
  assert.equal(s.enemies[0].nextAttack, 20);
  s = onBossLines(s, [1], [1]);
  assert.equal(s.bossBattle?.interrupted, true);
  assert.equal(s.enemies[0].nextAttack, 0);
  const before = s.enemies[0].hp;
  s = play(s);
  assert.equal(before - s.enemies[0].hp, 6);
  const hp = s.hp;
  s = advance(s);
  assert.equal(s.hp, hp);
  const during = s.enemies[0].hp;
  s = play(s, single, 0, 1);
  assert.equal(during - s.enemies[0].hp, 6);
  s = advance(s);
  const after = s.enemies[0].hp;
  s = play(s, single, 0, 2);
  assert.equal(after - s.enemies[0].hp, 4);
  assert.equal(s.bossBattle?.lines, 0);
});

test('core partial line count weakens its large attack without interrupting', () => {
  let s = setTurn(encounter('ancientCore'), 1);
  s = onBossLines(s, [0], []);
  s = advance(s);
  assert.equal(s.enemies[0].nextAttack, 28);
  const hp = s.hp;
  s = advance(s);
  assert.equal(hp - s.hp, 28);
});

test('twin dragon keeps both heads required; solo anger is applied once and reward includes both', () => {
  let s = encounter('twinDragon');
  s.enemies[0].hp = 1;
  s = play(s);
  assert.equal(s.screen, 'battle');
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].name, 'ウロコ');
  assert.equal(s.enemies[0].nextAttack, 16);
  s = refreshBossIntents(s);
  assert.equal(s.enemies[0].statuses.find(x => x.type === 'fury')?.value, 4);
  s = advance(s);
  assert.equal(s.enemies[0].statuses.find(x => x.type === 'defense')?.value, 8);
  s.enemies[0].hp = 1;
  s.enemies[0].statuses = [];
  s = play(s, single, 0, 1);
  assert.equal(s.screen, 'result');
  assert.equal(s.gold, 200);
});

test('twin dragon simultaneous area kill skips rage and stops all remaining effects', () => {
  let s = encounter('twinDragon');
  s.enemies = s.enemies.map(e => ({ ...e, hp: 1 }));
  s.board[0][1] = { type: 'I', blockType: 'bomb' };
  for (let c = 2; c < 7; c++) s.board[0][c] = { type: 'I', blockType: 'normal' };
  s = play(s);
  assert.equal(s.screen, 'result');
  assert.equal(s.gold, 200);
  assert.equal(s.bossBattle, null);
});

test('defense is retained when an enemy is not attacked and fallen is applied once per target', () => {
  let s = encounter('twinDragon');
  s.enemies[1].statuses = [{ type: 'defense', value: 12 }];
  s.enemies[0].statuses = [{ type: 'fallen', value: 1 }];
  const hp = s.enemies[0].hp;
  s = play(s);
  assert.equal(hp - s.enemies[0].hp, 6);
  assert.equal(s.enemies[1].statuses[0].value, 12);
});

test('architect resolves marks once, bypasses armor for its fixed bonus, and updates judgement', () => {
  let s = encounter('architect');
  const targets = s.bossBattle!.targets;
  s.enemies[0].statuses = [{ type: 'defense', value: 100 }];
  const row = targets.find(t => t.axis === 'row')!.index;
  const col = targets.find(t => t.axis === 'col')!.index;
  s = onBossLines(s, [row], []);
  assert.equal(s.enemies[0].hp, 290);
  assert.equal(s.enemies[0].statuses[0].value, 100);
  s = onBossLines(s, [row], []);
  assert.equal(s.enemies[0].hp, 290);
  s = advance(s);
  assert.equal(s.enemies[0].nextAttack, 18);
  s = onBossLines(s, [], [col]);
  assert.equal(s.enemies[0].hp, 280);
  assert.equal(s.enemies[0].nextAttack, 12);
  s = advance(s);
  assert.equal(s.bossBattle?.targets.length, 0);
});

test('boss victory precedes deadlines, restores each card exactly once, and clears temporary effects', () => {
  let s = encounter('sporeGardener');
  s.enemies[0].hp = 1;
  s.board[6][6] = { type: 'I', blockType: 'spore', sporeTurns: 1 };
  s.statuses = [{ type: 'poison', value: 4 }];
  const cards = [...s.deck, ...s.hand, ...s.discardPile, ...s.exilePile].map(c => c.id).sort();
  s = play(s);
  assert.equal(s.screen, 'result');
  assert.deepEqual(s.deck.map(c => c.id).sort(), cards);
  assert.deepEqual(s.statuses, []);
  assert.equal(s.board.flat().some(c => c?.blockType === 'spore'), false);
  const hp = s.hp;
  s = gameReducer(s, { type: 'END_PLAYER_TURN' });
  assert.equal(s.hp, hp);
});

test('reflection victory during enemy turn awards once and cancels unexecuted boss effects', () => {
  let s = setTurn(encounter('sporeGardener'), 0);
  s.enemies[0].hp = 1;
  s.statuses = [{ type: 'reflect', value: 5 }];
  s = advance(s);
  assert.equal(s.screen, 'result');
  assert.equal(s.gold, 150);
  assert.equal(s.board.flat().some(c => c?.blockType === 'spore'), false);
});

test('stage bosses advance to a fresh map and stage three ends the run after reward selection', () => {
  for (const stage of [1, 2, 3]) {
    const id = (Object.keys(BOSSES) as BossId[]).find(id => BOSSES[id].stage === stage)!;
    let s = encounter(id);
    s.enemies[0].hp = 1;
    s = play(s);
    const gold = s.gold;
    assert.equal(s.screen, 'result');
    const reward = s.rewardCards[0];
    const count = s.deck.length;
    s = gameReducer(s, { type: 'SELECT_REWARD', card: reward });
    assert.equal(s.stage, Math.min(3, stage + 1));
    assert.equal(s.screen, stage === 3 ? 'gameover' : 'dungeon');
    assert.equal(BOSSES[s.stageBoss].stage, s.stage);
    assert.equal(s.deck.length, count + 1);
    assert.equal(s.gold, gold);
    if (stage < 3) {
      assert.equal(s.currentNodeId, null);
      assert.equal(s.dungeonMap.filter(n => n.type === 'boss').length, 1);
      const again = gameReducer(s, { type: 'SELECT_REWARD', card: reward });
      assert.equal(again, s);
    }
  }
});

test('8x8 board markers and effects include the eighth row and column', () => {
  let s = encounter('architect', 8);
  s.bossBattle!.targets = [{ axis: 'row', index: 7 }, { axis: 'col', index: 7 }];
  for (let c = 0; c < 7; c++) s.board[7][c] = { type: 'I', blockType: 'normal' };
  for (let r = 0; r < 7; r++) s.board[r][7] = { type: 'I', blockType: 'normal' };
  s = play(s, single, 7, 7);
  assert.equal(s.clearedLines, 2);
  assert.equal(s.bossBattle!.targets.length, 0);
  assert.equal(s.enemies[0].hp, 251); // 4+20+5+20
});

test('a complete three-stage route preserves stage identity across every node and reaches the final result', () => {
  let s: GameState = { ...initGame(), hp: 10000, maxHp: 10000, artifacts: [] };
  const stages: number[] = [];
  for (let step = 0; step < 45; step++) {
    const stage = Math.floor(step / 15) + 1;
    assert.equal(s.stage, stage);
    const id = s.currentNodeId ? s.dungeonMap.find(n => n.id === s.currentNodeId)!.nextNodes[0] : 'node-0-0';
    s = gameReducer(s, { type: 'START_BATTLE', nodeId: id });
    assert.equal(s.stage, stage);
    if (s.screen === 'battle') {
      assert.equal(!!s.bossBattle, step % 15 === 14);
      let attacks = 0;
      while (s.screen === 'battle') {
        assert.ok(++attacks <= 5, 'fixture attack must resolve the encounter');
        const target = s.enemies[0];
        s = { ...s, targetEnemyId: target.id };
        s = play(s, { ...single, attack: 100000 }, 0, s.board[0].findIndex(c => c === null));
      }
      assert.equal(s.screen, 'result');
      if (s.rewardArtifact) s = gameReducer(s, { type: 'SELECT_ARTIFACT', artifact: null });
      s = gameReducer(s, { type: 'SELECT_REWARD', card: s.rewardCards[0] });
    } else if (s.screen === 'rest') s = gameReducer(s, { type: 'REST_SKIP' });
    else if (s.screen === 'shop') s = gameReducer(s, { type: 'LEAVE_SHOP' });
    else if (s.screen === 'event') s = gameReducer(s, { type: 'EVENT_ASSAULT_FLEE' });
    else assert.fail(`unexpected screen: ${s.screen}`);
    if (step % 15 === 14) stages.push(s.stage);
    assert.equal(s.screen, step === 44 ? 'gameover' : 'dungeon');
  }
  assert.deepEqual(stages, [2, 3, 3]);
  assert.ok(s.hp > 0);
});

test('elite rewards survive defeating the elite before its escorts', () => {
  let s = initGame();
  const parent = s.dungeonMap.find(n => n.depth === 2)!;
  const node = s.dungeonMap.find(n => n.depth === 3 && parent.nextNodes.includes(n.id))!;
  s = { ...s, stage: 2, currentNodeId: parent.id, artifacts: [] };
  s = gameReducer(s, { type: 'START_BATTLE', nodeId: node.id });
  assert.equal(s.enemies.length, 3);
  const expectedGold = s.enemies.reduce((sum, e) => sum + e.goldReward, 0);
  let attacks = 0;
  while (s.screen === 'battle') {
    assert.ok(++attacks <= 5, 'fixture attack must resolve the encounter');
    s = { ...s, targetEnemyId: s.enemies[0].id };
    s = play(s, { ...single, attack: 10000 }, 0, s.board[0].findIndex(c => c === null));
  }
  assert.ok(s.rewardArtifact);
  assert.equal(s.rewardGold, expectedGold);
});
