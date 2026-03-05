export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoCard {
  id: string;
  type: TetrominoType;
  shape: boolean[][];
  color: string;
  glowColor: string;
  cost: number;
  attack: number;
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
  
  // Progression
  stage: number;
  
  // Result state
  rewardCards: TetrominoCard[];
  
  score: number;
  clearedLines: number;
}
