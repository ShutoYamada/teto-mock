export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoCard {
  id: string;
  type: TetrominoType;
  shape: boolean[][];
  color: string;
  glowColor: string;
  cost: number;
  attack: number;
  effectText?: string;
}

// Each cell is null (empty) or a tetromino type
export type CellValue = TetrominoType | null;

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
