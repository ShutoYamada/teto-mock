import type { TetrominoCard, TetrominoType } from './types';

interface TetrominoDefinition {
  shape: boolean[][];
  color: string;
  glowColor: string;
  cost: number;
  attack: number;
}

export const TETROMINO_DEFS: Record<TetrominoType, TetrominoDefinition> = {
  I: {
    shape: [
      [true, true, true, true],
    ],
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.5)',
    cost: 1,
    attack: 4,
  },
  O: {
    shape: [
      [true, true],
      [true, true],
    ],
    color: '#FFE000',
    glowColor: 'rgba(255, 224, 0, 0.5)',
    cost: 1,
    attack: 4,
  },
  T: {
    shape: [
      [false, true, false],
      [true,  true, true]
    ],
    color: '#C855FF',
    glowColor: 'rgba(200, 85, 255, 0.5)',
    cost: 1,
    attack: 4,
  },
  S: {
    shape: [
      [false, true, true],
      [true,  true, false],
    ],
    color: '#00FF7F',
    glowColor: 'rgba(0, 255, 127, 0.5)',
    cost: 1,
    attack: 4,
  },
  Z: {
    shape: [
      [true,  true, false],
      [false, true, true],
    ],
    color: '#FF4040',
    glowColor: 'rgba(255, 64, 64, 0.5)',
    cost: 1,
    attack: 4,
  },
  J: {
    shape: [
      [true,  false, false],
      [true,  true,  true],
    ],
    color: '#4080FF',
    glowColor: 'rgba(64, 128, 255, 0.5)',
    cost: 1,
    attack: 4,
  },
  L: {
    shape: [
      [false, false, true],
      [true,  true,  true],
    ],
    color: '#FF8C00',
    glowColor: 'rgba(255, 140, 0, 0.5)',
    cost: 1,
    attack: 4,
  },
};

let _uidCounter = 0;
function uid() {
  return `card-${++_uidCounter}`;
}

export function buildDeck(): TetrominoCard[] {
  const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  // 14-card deck: each type appears twice
  const deck: TetrominoCard[] = [];
  for (let i = 0; i < 2; i++) {
    for (const type of types) {
      const def = TETROMINO_DEFS[type];
      deck.push({
        id: uid(),
        type,
        shape: def.shape,
        color: def.color,
        glowColor: def.glowColor,
        cost: def.cost,
        attack: def.attack,
      });
    }
  }
  return shuffle(deck);
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRewardCards(): TetrominoCard[] {
  const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const rewards: TetrominoCard[] = [];
  
  // Pick 3 random cards for drafting
  for (let i = 0; i < 3; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const def = TETROMINO_DEFS[type];
    rewards.push({
      id: uid(),
      type,
      shape: def.shape,
      color: def.color,
      glowColor: def.glowColor,
      cost: def.cost,
      attack: def.attack,
    });
  }
  return rewards;
}
