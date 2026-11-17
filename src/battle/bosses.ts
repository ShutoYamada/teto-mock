import { weaknessBonus, emptyCurseEffects } from '../curses';
import type { BossId, BossBattle, Enemy, GameState, LineTarget, Status } from '../types';

export const BOSSES: Record<BossId, { name: string; stage: number; hp: number; gold: number; summary: string; cycle: string[] }> = {
  blockEater: { name: 'ブロックイーター', stage: 1, hp: 125, gold: 100, summary: '予告した行・列を丸かじり。食べられる前にラインを完成させよう。', cycle: ['通常攻撃', '雄たけび', '丸かじり'] },
  ironTurtle: { name: '鉄甲ガメ', stage: 1, hp: 140, gold: 100, summary: '甲羅中は配置の基礎攻撃50%。ライン消去は等倍。', cycle: ['甲羅にこもる', '甲羅にこもる', '首を伸ばす'] },
  goblinChief: { name: 'ゴブリン親分', stage: 1, hp: 110, gold: 100, summary: '最大2体の子分を召喚し、号令で強化。本体撃破で勝利。', cycle: ['子分を呼ぶ', '号令', '親分の一撃'] },
  valkyrie: { name: 'ヴァルキリー', stage: 2, hp: 180, gold: 150, summary: '一閃でドロー減少、溜めの後は強力な3連撃。', cycle: ['一閃', '力を溜める', '高速斬撃'] },
  magneticGolem: { name: '磁力ゴーレム', stage: 2, hp: 200, gold: 150, summary: '横の構えは行、縦の構えは列の消去ダメージ2倍。', cycle: ['横の構え', '縦の構え', '磁力放出'] },
  sporeGardener: { name: '胞子の庭主', stage: 2, hp: 190, gold: 150, summary: '胞子は2ターンで成熟して毒になる。ラインの材料にして消そう。', cycle: ['胞子散布', '根の鞭', '胞子散布', '刈り取り'] },
  ancientCore: { name: '古代炉心', stage: 3, hp: 280, gold: 200, summary: '充填中の2ターンで4ライン消すと大技が不発となり転倒。', cycle: ['放熱', '充填', '臨界放出'] },
  twinDragon: { name: '双頭竜・アギトとウロコ', stage: 3, hp: 320, gold: 200, summary: '攻撃役と防御役。片方撃破で残る頭に憤怒(4)、行動も強化。両方撃破で勝利。', cycle: ['噛みつき / 守護鱗', '火炎 / 尾撃'] },
  architect: { name: '迷宮の設計者', stage: 3, hp: 300, gold: 200, summary: '刻印された行・列を2ターン以内に消すと各10追加ダメージ。残すと裁定が強化。', cycle: ['設計開始', '裁定', '書き直し'] },
};

export function rollBoss(stage: number): BossId {
  const ids = (Object.keys(BOSSES) as BossId[]).filter(id => BOSSES[id].stage === stage);
  return ids[Math.floor(Math.random() * ids.length)];
}

export function addStatus(statuses: Status[], type: Status['type'], value: number): Status[] {
  const old = statuses.find(s => s.type === type);
  return [...statuses.filter(s => s.type !== type), { type, value: (old?.value ?? 0) + value }];
}

function body(id: string, name: string, hp: number, gold: number, role: Enemy['bossRole'] = 'body'): Enemy {
  return { id, name, hp, maxHp: hp, goldReward: gold, bossRole: role, type: role === 'minion' ? 'normal' : 'boss', statuses: [], nextAttack: 0, intent: { actionName: '', description: '' } };
}
function minion(index: number): Enemy {
  return body(`minion-${index}`, 'ゴブリンの子分', 18, 0, 'minion');
}
export function createBossEncounter(id: BossId): { enemies: Enemy[]; bossBattle: BossBattle } {
  const def = BOSSES[id];
  const enemies = id === 'twinDragon'
    ? [body('boss-jaw', 'アギト', 150, 100, 'jaw'), body('boss-scale', 'ウロコ', 170, 100, 'scale')]
    : [body('boss-body', def.name, def.hp, def.gold)];
  if (id === 'goblinChief') enemies.push(minion(0));
  return { enemies, bossBattle: { id, turn: 0, lines: 0, interrupted: false, fallenUntil: -1, targets: [], cells: [] } };
}
export function bossStep(b: BossBattle): number { return b.turn % BOSSES[b.id].cycle.length; }
const randomIndex = (size: number) => Math.floor(Math.random() * size);

// Called exactly once when a new intent is prepared; refreshBossIntents never rolls targets.
export function prepareBossTurn(state: GameState): GameState {
  if (!state.bossBattle) return state;
  const b = { ...state.bossBattle, targets: [...state.bossBattle.targets], cells: [] as BossBattle['cells'] };
  const step = bossStep(b);
  if (b.id === 'blockEater') b.targets = step === 2 ? [{ axis: Math.random() < .5 ? 'row' : 'col', index: randomIndex(state.board.length) }] : [];
  if (b.id === 'architect') {
    if (step === 0) b.targets = [{ axis: 'row', index: randomIndex(state.board.length) }, { axis: 'col', index: randomIndex(state.board.length) }];
    if (step === 2) b.targets = [];
  }
  if (b.id === 'ancientCore' && step === 1) { b.lines = 0; b.interrupted = false; }
  if (b.id === 'sporeGardener' && step % 2 === 0) {
    const empty: BossBattle['cells'] = [];
    state.board.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push({ row: r, col: c }); }));
    while (b.cells.length < 3 && empty.length) b.cells.push(empty.splice(randomIndex(empty.length), 1)[0]);
  }
  return refreshBossIntents({ ...state, bossBattle: b });
}
function intent(enemy: Enemy, name: string, base: number, description: string, count = 1): Enemy {
  const fury = enemy.statuses.find(s => s.type === 'fury')?.value ?? 0;
  const damage = base > 0 ? base + fury : 0;
  return { ...enemy, nextAttack: damage, intent: { actionName: name, damage, count, description } };
}
export function refreshBossIntents(state: GameState): GameState {
  const b = state.bossBattle;
  if (!b) return state;
  const step = bossStep(b);
  const living = state.enemies.filter(e => e.hp > 0);
  const solo = b.id === 'twinDragon' && living.length === 1;
  const enemies = living.map(original => {
    let e = original;
    if (solo && !e.enraged) e = { ...e, enraged: true, statuses: addStatus(e.statuses, 'fury', 4) };
    if (e.bossRole === 'minion') {
      const bonus = step === 1 ? 2 : 0;
      const result = intent(e, '子分の攻撃', 3 + bonus, step === 1 ? '本体の号令による憤怒(2)を含む' : '毎ターン攻撃');
      return e.summoned ? intent(e, '行動待ち', 0, '召喚されたターンは攻撃しない') : result;
    }
    const action = BOSSES[b.id].cycle[step];
    switch (b.id) {
      case 'blockEater': return intent(e, action, [10, 0, 14][step], step === 1 ? '自身に憤怒(3)' : step === 2 ? `${lineLabel(b.targets[0])}を削除（消去効果なし）` : '通常攻撃');
      case 'ironTurtle': return intent(e, action, step === 2 ? 12 : 6, step === 2 ? '甲羅解除：すべて等倍。次は甲羅' : '甲羅有効：配置の基礎攻撃50%、ライン等倍');
      case 'goblinChief': return intent(e, action, [0, 6, 12][step], step === 0 ? `子分を最大2体まで補充（現在${living.length - 1}体）` : step === 1 ? '子分全員に憤怒(2)。同ターンの攻撃から強化' : '本体撃破で勝利');
      case 'valkyrie': return intent(e, action, [10, 0, 6][step], step === 0 ? '次の通常ドローを1枚減らす' : step === 1 ? '憤怒(2)を付与。次は高速斬撃3回' : '溜めの後の3連撃', step === 2 ? 3 : 1);
      case 'magneticGolem': return intent(e, action, step === 2 ? 16 : 10, ['行の消去ダメージ2倍。次は縦の構え', '列の消去ダメージ2倍。次は磁力放出', 'すべて等倍。次は横の構え'][step]);
      case 'sporeGardener': return intent(e, action, [6, 12, 6, 16][step], step % 2 === 0 ? `予告マス最大${b.cells.length}か所に胞子。埋めれば散布を阻止` : '胞子は成熟前に消去しよう');
      case 'ancientCore': return intent(e, action, step === 0 ? 12 : step === 1 || b.interrupted ? 0 : Math.max(0, 36 - b.lines * 8), step === 0 ? '次は充填' : `消去${b.lines}/4ライン・残り${step === 1 ? 2 : 1}ターン・臨界放出${b.interrupted ? 0 : Math.max(0, 36 - b.lines * 8)}ダメージ。${b.interrupted ? '停止済み・臨界放出は不発' : `あと${Math.max(0, 4 - b.lines)}ラインで停止`}${b.fallenUntil >= b.turn ? ' / 転倒：被ダメージ1.5倍' : ''}`);
      case 'twinDragon':
        if (solo) return intent(e, e.bossRole === 'jaw' ? '暴走火炎' : '孤竜の突進', e.bossRole === 'jaw' ? 6 : 12, e.bossRole === 'jaw' ? '片頭撃破：憤怒(4)、3連撃' : '片頭撃破：憤怒(4)、攻撃後に防御(8)', e.bossRole === 'jaw' ? 3 : 1);
        if (e.bossRole === 'jaw') return intent(e, step === 0 ? '噛みつき' : '火炎', step === 0 ? 12 : 6, '相方撃破後は憤怒(4)・暴走火炎3回', step === 0 ? 1 : 2);
        return intent(e, step === 0 ? '守護鱗' : '尾撃', step === 0 ? 0 : 8, step === 0 ? '生存中の両頭に防御(12)。撃破後は突進と防御(8)' : '相方撃破後は憤怒(4)・突進と防御(8)');
      case 'architect': return intent(e, action, [8, 12 + b.targets.length * 6, 14][step], step < 2 ? `未解除${b.targets.length}本・残り${step === 0 ? 2 : 1}ターン。対象ライン消去で各10追加ダメージ` : '次のターンに新しい刻印');
    }
  });
  return { ...state, enemies };
}
export function lineLabel(t?: LineTarget): string { return t ? `${t.axis === 'row' ? '行' : '列'}${t.index + 1}` : ''; }

export function bossDamageModifiers(b: BossBattle | null, rows: number[], cols: number[], border: number, stripe: number) {
  return {
    placementMultiplier: b?.id === 'ironTurtle' && bossStep(b) < 2 ? .5 : 1,
    lineBonus: b?.id === 'magneticGolem' ? bossStep(b) === 0 ? rows.length * 10 + border * 5 : bossStep(b) === 1 ? cols.length * 10 + stripe * 5 : 0 : 0,
  };
}

export function onBossLines(state: GameState, rows: number[], cols: number[]): GameState {
  if (!state.bossBattle) return state;
  const b = { ...state.bossBattle };
  let enemies = state.enemies;
  if (b.id === 'ancientCore' && bossStep(b) !== 0) {
    b.lines += rows.length + cols.length;
    if (b.lines >= 4 && !b.interrupted) { b.interrupted = true; b.fallenUntil = b.turn + 1; }
  }
  if (b.id === 'architect') {
    const remaining = b.targets.filter(t => !(t.axis === 'row' ? rows : cols).includes(t.index));
    const extra = (b.targets.length - remaining.length) * 10;
    b.targets = remaining;
    enemies = enemies.map(e => ({ ...e, hp: Math.max(0, e.hp - extra) }));
  }
  return refreshBossIntents({ ...state, bossBattle: b, enemies });
}

// Poison already on the player ticks first, so new poison starts on the following turn.
export function endBossPlayerTurn(state: GameState): GameState {
  if (!state.bossBattle) return state;
  let poison = 0;
  const board = state.board.map(row => row.map(cell => {
    if (cell?.blockType !== 'spore') return cell;
    const turns = (cell.sporeTurns ?? 2) - 1;
    if (turns <= 0) { poison++; return null; }
    return { ...cell, sporeTurns: turns };
  }));
  return { ...state, board, statuses: poison ? addStatus(state.statuses, 'poison', poison) : state.statuses };
}

export function executeBossTurn(state: GameState): GameState {
  const b = state.bossBattle!;
  const step = bossStep(b);
  let next: GameState = { ...state, board: state.board.map(row => [...row]), enemies: state.enemies.map(e => ({ ...e, statuses: e.statuses.map(s => ({ ...s })) })), statuses: state.statuses.map(s => ({ ...s })) };
  let shield = state.shield + (state.artifacts.some(a => a.id === 'brave_shield') ? 1 : 0);
  const fallen = state.statuses.some(s => s.type === 'fallen');
  const reflect = state.statuses.find(s => s.type === 'reflect')?.value ?? 0;
  function hit(damage: number, enemyId?: string) {
    const increased = damage > 0 ? damage + weaknessBonus(next.board) : 0;
    const amount = fallen ? Math.floor(increased * 1.5) : increased;
    const absorbed = Math.min(shield, amount); shield -= absorbed;
    next.hp = Math.max(0, next.hp - (amount - absorbed));
    if (enemyId && reflect && amount > absorbed) next.enemies = next.enemies.map(e => e.id === enemyId ? { ...e, hp: Math.max(0, e.hp - reflect) } : e);
  }
  const spikes = next.board.flat().filter(c => c?.blockType === 'spike').length;
  if (spikes) hit(spikes);
  for (const original of state.enemies) {
    const enemy = next.enemies.find(e => e.id === original.id);
    if (!enemy || enemy.hp <= 0 || next.hp <= 0) continue;
    for (let i = 0; i < (enemy.intent.count ?? 1) && next.hp > 0 && next.enemies.some(e => e.id === enemy.id && e.hp > 0); i++) hit(enemy.nextAttack, enemy.id);
    if (b.id === 'twinDragon') next = refreshBossIntents(next);
    // Reflection can end the encounter before remaining effects/actors resolve.
    if (next.hp <= 0 || !next.enemies.some(e => e.bossRole !== 'minion' && e.hp > 0)) break;
    const setEnemyStatus = (id: string, type: Status['type'], value: number) => {
      next.enemies = next.enemies.map(e => e.id === id && e.hp > 0 ? { ...e, statuses: addStatus(e.statuses, type, value) } : e);
    };
    if (enemy.bossRole === 'minion' || !next.enemies.some(e => e.id === enemy.id && e.hp > 0)) continue;
    if (b.id === 'blockEater') {
      if (step === 1) setEnemyStatus(enemy.id, 'fury', 3);
      if (step === 2) for (const t of b.targets) next.board = next.board.map((row, r) => row.map((cell, c) => (t.axis === 'row' ? r : c) === t.index ? null : cell));
    }
    if (b.id === 'goblinChief') {
      if (step === 0) {
        const existing = next.enemies.filter(e => e.bossRole === 'minion' && e.hp > 0).length;
        for (let i = existing; i < 2; i++) next.enemies.push({ ...minion(b.turn * 2 + i + 1), summoned: true });
      }
      if (step === 1) for (const child of next.enemies.filter(e => e.bossRole === 'minion')) setEnemyStatus(child.id, 'fury', 2);
    }
    if (b.id === 'valkyrie') {
      if (step === 0) next.statuses = addStatus(next.statuses, 'draw_down', 1);
      if (step === 1) setEnemyStatus(enemy.id, 'fury', 2);
    }
    if (b.id === 'sporeGardener' && step % 2 === 0) for (const cell of b.cells) {
      if (!next.board[cell.row][cell.col]) next.board[cell.row][cell.col] = { type: 'I', blockType: 'spore', sporeTurns: 2 };
    }
    if (b.id === 'twinDragon' && enemy.bossRole === 'scale') {
      if (enemy.enraged) setEnemyStatus(enemy.id, 'defense', 8);
      else if (step === 0) for (const head of next.enemies) setEnemyStatus(head.id, 'defense', 12);
    }
  }
  next.enemies = next.enemies.filter(e => e.hp > 0).map(e => ({ ...e, summoned: false }));
  if (!next.enemies.some(e => e.bossRole !== 'minion')) next.enemies = [];
  if (next.hp <= 0) return { ...next, screen: 'gameover', bossBattle: null, sealedLines: [], pendingCurseEffects: emptyCurseEffects() };
  next.bossBattle = { ...b, turn: b.turn + 1 };
  return next;
}

export function bossCellMarkers(state: GameState): Record<string, string> {
  const markers: Record<string, string> = {};
  const b = state.bossBattle;
  if (!b) return markers;
  for (const t of b.targets) for (let i = 0; i < state.board.length; i++) {
    const key = t.axis === 'row' ? `${t.index},${i}` : `${i},${t.index}`;
    markers[key] = (markers[key] ?? '') + (b.id === 'architect' ? '刻' : '噛');
  }
  for (const c of b.cells) markers[`${c.row},${c.col}`] = '胞';
  return markers;
}
