export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoCard {
  id: string;
  type: TetrominoType;
  shape: boolean[][];
  color: string;
  glowColor: string;
}

// Each cell is null (empty) or a tetromino type
export type CellValue = TetrominoType | null;

export type BoardState = CellValue[][];

export interface GameState {
  board: BoardState;
  hand: TetrominoCard[];
  deck: TetrominoCard[];
  selectedCardId: string | null;
  score: number;
  clearedLines: number;
  gameOver: boolean;
}
