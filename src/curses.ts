import type { BoardState, CurseType, GameState, LineTarget, CurseCard } from './types';

export const CURSE_DEFS: Record<CurseType, { name: string; description: string }> = {
  decay: { name: '減衰', description: 'ターン終了時：ゴミブロックをランダムに3つ配置する。' },
  frailty: { name: '虚弱', description: 'ターン終了時：弱点ブロックをランダムに3つ配置する（1つにつき被ダメージ+3）。' },
  depletion: { name: '枯渇', description: 'ターン終了時：次ターン開始時のMPを1減らす。' },
  sluggishness: { name: '鈍化', description: 'ターン終了時：次ターンの手札リフレッシュで引く枚数を1減らす。' },
  blockade: { name: '封鎖', description: 'ターン終了時：次ターン、ランダムな1行または1列へのミノ配置を封じる。' },
};

export const CURSE_USE_COST = 1;

export function createCurseCard(curse: CurseType): CurseCard {
  return { id: `curse-${crypto.randomUUID()}`, type: 'Curse', curse, shape: [[false]],
    color: '#c084fc', glowColor: 'rgba(192,132,252,.4)', cost: 0, attack: 0,
    rarity: 'default', effectText: `使用不可。${CURSE_DEFS[curse].description}` };
}

/** Entry point for event rewards/penalties; never alters the normal reward pool. */
export function addCurseToDeck(state: GameState, curse: CurseType): GameState {
  return { ...state, deck: [...state.deck, createCurseCard(curse)] };
}

export function weaknessBonus(board: BoardState): number {
  return board.flat().filter(cell => cell?.blockType === 'weakness').length * 3;
}

export function isSealed(lines: LineTarget[], row: number, col: number): boolean {
  return lines.some(line => (line.axis === 'row' ? row : col) === line.index);
}

export const emptyCurseEffects = () => ({ mpLoss: 0, drawLoss: 0, sealedLines: [] as LineTarget[] });

export function resolveHandCurses(state: GameState): GameState {
  const board = state.board.map(row => [...row]);
  const pending = emptyCurseEffects();
  for (const card of state.hand) {
    if (card.curse === 'decay' || card.curse === 'frailty') {
      const empty: { row: number; col: number }[] = [];
      board.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push({ row: r, col: c }); }));
      for (let i = 0; i < 3 && empty.length; i++) {
        const { row, col } = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
        board[row][col] = { type: 'I', blockType: card.curse === 'decay' ? 'trash' : 'weakness' };
      }
    }
    if (card.curse === 'depletion') pending.mpLoss++;
    if (card.curse === 'sluggishness') pending.drawLoss++;
    if (card.curse === 'blockade') pending.sealedLines.push({ axis: Math.random() < .5 ? 'row' : 'col', index: Math.floor(Math.random() * board.length) });
  }
  return { ...state, board, pendingCurseEffects: pending, sealedLines: [],
    hand: [], discardPile: [...state.discardPile, ...state.hand], selectedCardId: null };
}
