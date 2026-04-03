import type { TetrominoCard, TetrominoType, BlockType, DefaultTetrominoType, CustomTetrominoType } from './types';

interface TetrominoDefinition {
  shape: boolean[][];
  blockTypes?: BlockType[][];
  color: string;
  glowColor: string;
  cost: number;
  attack: number;
  effectText?: string;
  rarity: 'default' | 'common' | 'uncommon' | 'rare';
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "rare",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
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
    rarity: "common",
  },
  Jab: {
    shape: [
      [true],
      [true],
    ],
    blockTypes: [
      ['combo'],
      ['combo'],
    ],
    color: '#FFB6C1',
    glowColor: 'rgba(255, 182, 193, 0.5)',
    cost: 0,
    attack: 1,
    effectText: "全マスコンボ加算ブロック(消滅時Combo+1)",
    rarity: "common",
  },
  Bow: {
    shape: [
      [true],
      [true],
      [true],
    ],
    blockTypes: [
      ['bow'],
      ['bow'],
      ['bow'],
    ],
    color: '#ADFF2F',
    glowColor: 'rgba(173, 255, 47, 0.5)',
    cost: 2,
    attack: 4,
    effectText: "全マス弓ブロック(このブロックを含む行列消滅時のダメージが敵全体に及ぶ)",
    rarity: "common",
  },
  Heart: {
    shape: [
      [true, false, true],
      [false, true, false],
    ],
    blockTypes: [
      ['heart', 'normal', 'heart'],
      ['normal', 'heart', 'normal'],
    ],
    color: '#FF69B4',
    glowColor: 'rgba(255, 105, 180, 0.5)',
    cost: 1,
    attack: 2,
    effectText: "全マスハートブロック(消滅時HPを3回復する)",
    rarity: "common",
  },
  BigHeart: {
    shape: [
      [true, false, true],
      [true, true, true],
      [false, true, false],
    ],
    blockTypes: [
      ['heart', 'normal', 'heart'],
      ['heart', 'heart', 'heart'],
      ['normal', 'heart', 'normal'],
    ],
    color: '#FF1493',
    glowColor: 'rgba(255, 20, 147, 0.5)',
    cost: 2,
    attack: 4,
    effectText: "全マスハートブロック(消滅時HPを3回復する)",
    rarity: "uncommon",
  },
  Obsidian: {
    shape: [
      [true, true],
      [true, true],
    ],
    blockTypes: [
      ['hard', 'hard'],
      ['hard', 'hard'],
    ],
    color: '#303030',
    glowColor: 'rgba(48, 48, 48, 0.5)',
    cost: 1,
    attack: 5,
    effectText: "全マスハードブロック(消滅時、通常ブロックに変化)",
    rarity: "uncommon",
  },
  Diamond: {
    shape: [
      [false, true, false],
      [true,  true, true],
      [false, true, false],
    ],
    blockTypes: [
      ['gold', 'gold', 'gold'],
      ['gold', 'hard', 'gold'],
      ['gold', 'gold', 'gold'],
    ],
    color: '#E0FFFF',
    glowColor: 'rgba(224, 255, 255, 0.5)',
    cost: 1,
    attack: 6,
    effectText: "中心がハード、周囲がゴールド(消滅時Gold+5)",
    rarity: "rare",
  },
  SilverBullet: {
    shape: [
      [true],
      [true],
    ],
    blockTypes: [
      ['resonance'],
      ['gold'],
    ],
    color: '#C0C0C0',
    glowColor: 'rgba(192, 192, 192, 0.5)',
    cost: 1,
    attack: 5,
    effectText: "共鳴1、ゴールド1",
    rarity: "rare",
  },
  Note: {
    shape: [
      [true],
    ],
    blockTypes: [
      ['resonance'],
    ],
    color: '#FF69B4',
    glowColor: 'rgba(255, 105, 180, 0.5)',
    cost: 0,
    attack: 0,
    effectText: "共鳴ブロック(配置済み共鳴数×(1+強化)ダメ加算)",
    rarity: "common",
  },
  Cymbal: {
    shape: [
      [true, true],
      [true, true],
    ],
    blockTypes: [
      ['resonance', 'resonance'],
      ['resonance', 'resonance'],
    ],
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.5)',
    cost: 2,
    attack: 4,
    effectText: "全マス共鳴ブロック",
    rarity: "uncommon",
  },
  Flute: {
    shape: [
      [true],
      [true],
      [true],
    ],
    blockTypes: [
      ['resonance'],
      ['normal'],
      ['resonance'],
    ],
    color: '#F0F8FF',
    glowColor: 'rgba(240, 248, 255, 0.5)',
    cost: 1,
    attack: 2,
    effectText: "上下が共鳴ブロック",
    rarity: "common",
  },
  Guitar: {
    shape: [
      [false, false, true],
      [true,  true,  true],
    ],
    blockTypes: [
      ['normal', 'normal', 'resonance'],
      ['resonance', 'resonance', 'resonance'],
    ],
    color: '#FF8C00',
    glowColor: 'rgba(255, 140, 0, 0.5)',
    cost: 3,
    attack: 18,
    effectText: "すべて共鳴ブロックで構成される",
    rarity: "rare",
  },
  GravityStone: {
    shape: [
      [true],
    ],
    blockTypes: [
      ['gravity_down'],
    ],
    color: '#A9A9A9',
    glowColor: 'rgba(169, 169, 169, 0.5)',
    cost: 1,
    attack: 3,
    effectText: "重力ブロック(下)で構成される(消滅時ブロック落下)",
    rarity: "uncommon",
  },
  FloatingStone: {
    shape: [
      [true],
    ],
    blockTypes: [
      ['gravity_up'],
    ],
    color: '#87CEEB',
    glowColor: 'rgba(135, 206, 235, 0.5)',
    cost: 1,
    attack: 3,
    effectText: "重力ブロック(上)で構成される(消滅時ブロック上昇)",
    rarity: "uncommon",
  },
  LeftRight: {
    shape: [
      [true, false],
      [false, true],
    ],
    blockTypes: [
      ['gravity_left', 'normal'],
      ['normal', 'gravity_right'],
    ],
    color: '#BA55D3',
    glowColor: 'rgba(186, 85, 211, 0.5)',
    cost: 1,
    attack: 3,
    effectText: "重力ブロック(左)と重力ブロック(右)で構成される",
    rarity: "uncommon",
  },
  LookThatWay: {
    shape: [
      [false, true, false],
      [true,  false, true],
      [false, true, false],
    ],
    blockTypes: [
      ['normal', 'gravity_up', 'normal'],
      ['gravity_left', 'normal', 'gravity_right'],
      ['normal', 'gravity_down', 'normal'],
    ],
    color: '#FF1493',
    glowColor: 'rgba(255, 20, 147, 0.5)',
    cost: 2,
    attack: 11,
    effectText: "上下左右の重力ブロックで構成される",
    rarity: "rare",
  },
  Booster: {
    shape: [
      [true],
      [true],
      [true],
    ],
    blockTypes: [
      ['normal'],
      ['draw'],
      ['normal'],
    ],
    color: '#FF4500',
    glowColor: 'rgba(255, 69, 0, 0.5)',
    cost: 2,
    attack: 4,
    effectText: "中心1マスにドローブロックを持つ",
    rarity: "uncommon",
  },
  RocketHead: {
    shape: [
      [false, true, false],
      [true,  true, true],
    ],
    blockTypes: [
      ['normal', 'draw', 'normal'],
      ['draw',  'draw', 'draw'],
    ],
    color: '#FF0000',
    glowColor: 'rgba(255, 0, 0, 0.5)',
    cost: 3,
    attack: 15,
    effectText: "全てのマスがドローブロックで構成される",
    rarity: "rare",
  },
  EnhancedI: {
    shape: [
      [true, true, true, true],
    ],
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.5)',
    cost: 1,
    attack: 8,
    rarity: "uncommon",
  },
  EnhancedO: {
    shape: [
      [true, true],
      [true, true],
    ],
    color: '#FFE000',
    glowColor: 'rgba(255, 224, 0, 0.5)',
    cost: 1,
    attack: 8,
    rarity: "uncommon",
  },
  EnhancedT: {
    shape: [
      [false, true, false],
      [true,  true, true]
    ],
    color: '#C855FF',
    glowColor: 'rgba(200, 85, 255, 0.5)',
    cost: 1,
    attack: 8,
    rarity: "uncommon",
  },
  EnhancedS: {
    shape: [
      [false, true, true],
      [true,  true, false],
    ],
    color: '#00FF7F',
    glowColor: 'rgba(0, 255, 127, 0.5)',
    cost: 1,
    attack: 8,
    rarity: "uncommon",
  },
  EnhancedZ: {
    shape: [
      [true,  true, false],
      [false, true, true],
    ],
    color: '#FF4040',
    glowColor: 'rgba(255, 64, 64, 0.5)',
    cost: 1,
    attack: 8,
    rarity: "uncommon",
  },
  EnhancedJ: {
    shape: [
      [true,  false, false],
      [true,  true,  true],
    ],
    color: '#4080FF',
    glowColor: 'rgba(64, 128, 255, 0.5)',
    cost: 1,
    attack: 8,
    rarity: "uncommon",
  },
  EnhancedL: {
    shape: [
      [false, false, true],
      [true,  true,  true],
    ],
    color: '#FF8C00',
    glowColor: 'rgba(255, 140, 0, 0.5)',
    cost: 1,
    attack: 8,
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
  const types: TetrominoType[] = ['Cross', 'SquareBomb', 'Mana', 'Shield', 'Draw', 'PainfulCapitalIncrease', 'GoldVein', 'OneTwo', 'Jab', 'Bow', 'Heart', 'BigHeart', 'Obsidian', 'Diamond', 'SilverBullet', 'Note', 'Cymbal', 'Flute', 'Guitar', 'GravityStone', 'FloatingStone', 'LeftRight', 'LookThatWay', 'Booster', 'RocketHead'];
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

export function getCardPrice(card: TetrominoCard): number {
  switch (card.rarity) {
    case 'common': return 50;
    case 'uncommon': return 125;
    case 'rare': return 250;
    default: return 50;
  }
}

export function generateShopCards(count: number = 5): TetrominoCard[] {
  const types: TetrominoType[] = ['Cross', 'SquareBomb', 'Mana', 'Shield', 'Draw', 'PainfulCapitalIncrease', 'GoldVein', 'OneTwo', 'Jab', 'Bow', 'Heart', 'BigHeart', 'Obsidian', 'Diamond', 'SilverBullet', 'Note', 'Cymbal', 'Flute', 'Guitar', 'GravityStone', 'FloatingStone', 'LeftRight', 'LookThatWay', 'Booster', 'RocketHead'];
  const shopCards: TetrominoCard[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const def = TETROMINO_DEFS[type];
    shopCards.push({
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
  return shopCards;
}
