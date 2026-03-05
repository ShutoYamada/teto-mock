export type TetrominoType = DefaultTetrominoType | CustomTetrominoType; 
export type DefaultTetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type CustomTetrominoType = 'Sword' | 'Shield' | 'Mana' | 'Cross' | 'SquareBomb' | 'Draw' | 'PainfulCapitalIncrease';

export type BlockType = 'normal' | 'bomb' | 'sword' | 'shield' | 'mana' | 'draw' | 'spike';

export interface TetrominoCard {
  id: string;
  type: TetrominoType;
  shape: boolean[][];
  blockTypes?: BlockType[][]; // Optional defining what block each mapped true space in shape has
  color: string;
  glowColor: string;
  cost: number;
  attack: number;
  effectText?: string;
  rarity: 'default' | 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface CellData {
  type: TetrominoType;
  blockType: BlockType;
}

// Each cell is null (empty) or carries tetromino and block data
export type CellValue = CellData | null;

export type BoardState = CellValue[][];

export type ScreenState = 'dungeon' | 'battle' | 'result' | 'gameover';
export type TurnState = 'player' | 'enemy';

export interface Enemy {
  id: string;
  hp: number;
  maxHp: number;
  nextAttack: number;
}

export type DungeonNodeType = 'battle' | 'boss' | 'event' | 'elite' | 'rest';

export interface DungeonNode {
  id: string;
  depth: number;
  type: DungeonNodeType;
  nextNodes: string[]; // IDs of nodes this node connects to
}

export interface GameState {
  screen: ScreenState;
  board: BoardState;
  
  // Deck & Hand
  deck: TetrominoCard[];
  hand: TetrominoCard[];
  discardPile: TetrominoCard[];
  selectedCardId: string | null;
  
  // Player Stats
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  shield: number; // Applied armor preventing damage
  
  // Battle state
  turn: TurnState;
  combo: number;
  
  // Enemy Stats
  enemies: Enemy[];
  targetEnemyId: string | null;
  
  // Progression & Map
  stage: number;
  dungeonMap: DungeonNode[];
  currentNodeId: string | null; // null means at the start (depth 0), ready to pick a depth 1 node
  
  // Result state
  rewardCards: TetrominoCard[];
  
  score: number;
  clearedLines: number;
}
