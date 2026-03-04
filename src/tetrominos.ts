import type { TetrominoCard, TetrominoType } from './types';

interface TetrominoDefinition {
  shape: boolean[][];
  color: string;
  glowColor: string;
}

export const TETROMINO_DEFS: Record<TetrominoType, TetrominoDefinition> = {
  I: {
    shape: [
      [true, true, true, true],
    ],
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.5)',
  },
  O: {
    shape: [
      [true, true],
      [true, true],
    ],
    color: '#FFE000',
    glowColor: 'rgba(255, 224, 0, 0.5)',
  },
  T: {
    shape: [
      [false, true, false],
      [true,  true, true],
    ],
    color: '#C855FF',
    glowColor: 'rgba(200, 85, 255, 0.5)',
  },
  S: {
    shape: [
      [false, true, true],
      [true,  true, false],
    ],
    color: '#00FF7F',
    glowColor: 'rgba(0, 255, 127, 0.5)',
  },
  Z: {
    shape: [
      [true,  true, false],
      [false, true, true],
    ],
    color: '#FF4040',
    glowColor: 'rgba(255, 64, 64, 0.5)',
  },
  J: {
    shape: [
      [true,  false, false],
      [true,  true,  true],
    ],
    color: '#4080FF',
    glowColor: 'rgba(64, 128, 255, 0.5)',
  },
  L: {
    shape: [
      [false, false, true],
      [true,  true,  true],
    ],
    color: '#FF8C00',
    glowColor: 'rgba(255, 140, 0, 0.5)',
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
