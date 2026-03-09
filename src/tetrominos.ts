import type { TetrominoCard, TetrominoType, BlockType, DefaultTetrominoType, CustomTetrominoType } from './types';

interface TetrominoDefinition {
  shape: boolean[][];
  blockTypes?: BlockType[][];
  color: string;
  glowColor: string;
  cost: number;
  attack: number;
  effectText?: string;
  rarity: 'default' | 'common' | 'uncommon' | 'rare' | 'legendary';
}
export const CUSTOM_TETROMINO_DEFS: Record<CustomTetrominoType, TetrominoDefinition> = {
  Sword: {
    shape: [
      [true, true, true, true],
    ],
    blockTypes: [
      ['sword', 'sword', 'sword', 'sword']
    ],
    color: '#FF4040',
    glowColor: 'rgba(255, 64, 64, 0.5)',
    cost: 1,
    attack: 2,
    effectText: "全マス剣ブロック(配置中、全基礎ダメ+1)",
    rarity: "uncommon",
  },
  Cross: { // Cross
    shape: [
      [false, true, false],
      [true,  true, true],
      [false, true, false],
    ],
    blockTypes: [
      ['normal', 'normal', 'normal'],
      ['normal', 'bomb',   'normal'],
      ['normal', 'normal', 'normal'],
    ],
    color: '#FF0055',
    glowColor: 'rgba(255, 0, 85, 0.5)',
    cost: 1,
    attack: 4,
    effectText: "中心が爆弾ブロック(周囲破壊&全体10ダメ)",
    rarity: "rare",
  },
  SquareBomb: {
    shape: [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ],
    blockTypes: [
      ['bomb', 'bomb', 'bomb'],
      ['bomb', 'bomb', 'bomb'],
      ['bomb', 'bomb', 'bomb'],
    ],
    color: '#FF4500',
    glowColor: 'rgba(255, 69, 0, 0.5)',
    cost: 4,
    attack: 3,
    effectText: "全マス爆弾ブロック",
    rarity: "legendary",
  },
  Mana: {
    shape: [
      [false, true, false],
      [true,  true, true]
    ],
    blockTypes: [
      ['normal', 'mana', 'normal'],
      ['normal', 'normal', 'normal']
    ],
    color: '#00FF7F',
    glowColor: 'rgba(0, 255, 127, 0.5)',
    cost: 2,
    attack: 0,
    effectText: "中心がマナブロック(消滅時MP+1)",
    rarity: "uncommon",
  },
  Shield: {
    shape: [
      [true, true],
      [true, true],
    ],
    blockTypes: [
      ['shield', 'shield'],
      ['shield', 'shield']
    ],
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.5)',
    cost: 1,
    attack: 0,
    effectText: "全マス盾ブロック(被ダメ-1)",
    rarity: "uncommon",
  },
  Draw: {
    shape: [
      [false, true, false],
      [false,  true, false]
    ],
    blockTypes: [
      ['normal', 'draw', 'normal'],
      ['normal', 'normal', 'normal']
    ],
    color: '#00FF7F',
    glowColor: 'rgba(0, 255, 127, 0.5)',
    cost: 2,
    attack: 0,
    effectText: "中心がドローブロック(配置時手札+1)",
    rarity: "common",
  },
  PainfulCapitalIncrease: {
    shape: [
      [true],
      [true],
      [true]
    ],
    blockTypes: [
      ['spike'],
      ['draw'],
      ['spike']
    ],
    color: '#FF6347',
    glowColor: 'rgba(255, 99, 71, 0.5)',
    cost: 1,
    attack: 1,
    effectText: "トゲ、ドロー、トゲ(配置時引くが毎Turn自傷)",
    rarity: "rare",
  },
  GoldVein: {
    shape: [
      [true],
      [true]
    ],
    blockTypes: [
      ['gold'],
      ['gold']
    ],
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.5)',
    cost: 1,
    attack: 2,
    effectText: "全マスゴールドブロック(消滅時Gold+5)",
    rarity: "uncommon",
  },
  OneTwo: {
    shape: [
      [false, true, true],
      [true,  true, false],
    ],
    blockTypes: [
      ['normal', 'normal', 'combo'],
      ['combo', 'normal', 'normal'],
    ],
    color: '#FF69B4',
    glowColor: 'rgba(255, 105, 180, 0.5)',
    cost: 1,
    attack: 4,
    effectText: "両端にコンボ加算ブロック(消滅時Combo+1)",
    rarity: "uncommon",
  },
}

export const DEFAULT_TETROMINO_DEFS: Record<DefaultTetrominoType, TetrominoDefinition> = {
  I: {
    shape: [
      [true, true, true, true],
    ],
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.5)',
    cost: 1,
    attack: 4,
    rarity: "default",
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
    rarity: "default",
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
    rarity: "default",
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
    rarity: "default",
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
    rarity: "default",
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
    rarity: "default",
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
    rarity: "default",
  },
};

export const TETROMINO_DEFS: Record<TetrominoType, TetrominoDefinition> = {
  ...DEFAULT_TETROMINO_DEFS,
  ...CUSTOM_TETROMINO_DEFS,
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
        blockTypes: def.blockTypes,
        color: def.color,
        glowColor: def.glowColor,
        cost: def.cost,
        attack: def.attack,
        effectText: def.effectText,
        rarity: def.rarity,
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

export function generateRewardCards(count: number = 3): TetrominoCard[] {
  const types: TetrominoType[] = ['Cross', 'SquareBomb', 'Mana', 'Shield', 'Draw', 'PainfulCapitalIncrease', 'GoldVein', 'OneTwo'];
  const rewards: TetrominoCard[] = [];
  
  // Pick X random cards for drafting
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const def = TETROMINO_DEFS[type];
    rewards.push({
      id: uid(),
      type,
      shape: def.shape,
      blockTypes: def.blockTypes,
      color: def.color,
      glowColor: def.glowColor,
      cost: def.cost,
      attack: def.attack,
      effectText: def.effectText,
      rarity: def.rarity,
    });
  }
  return rewards;
}
