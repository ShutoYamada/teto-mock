import type { BoardState, TetrominoCard, CellValue } from './types';

export const BOARD_SIZE = 7;

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as CellValue)
  );
}

export function canPlaceCard(
  board: BoardState,
  card: TetrominoCard,
  startRow: number,
  startCol: number
): boolean {
  for (let r = 0; r < card.shape.length; r++) {
    for (let c = 0; c < card.shape[r].length; c++) {
      if (!card.shape[r][c]) continue;
      const br = startRow + r;
      const bc = startCol + c;
      if (br < 0 || br >= BOARD_SIZE || bc < 0 || bc >= BOARD_SIZE) return false;
      if (board[br][bc] !== null) return false;
    }
  }
  return true;
}

export function placeCard(
  board: BoardState,
  card: TetrominoCard,
  startRow: number,
  startCol: number
): BoardState {
  const newBoard = board.map((row) => [...row]);
  for (let r = 0; r < card.shape.length; r++) {
    for (let c = 0; c < card.shape[r].length; c++) {
      if (!card.shape[r][c]) continue;
      newBoard[startRow + r][startCol + c] = card.type;
    }
  }
  return newBoard;
}

export interface ClearResult {
  newBoard: BoardState;
  clearedCount: number;
}

export function clearLines(board: BoardState): ClearResult {
  // Find fully-filled rows
  const fullRows = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) fullRows.add(r);
  }

  // Find fully-filled columns
  const fullCols = new Set<number>();
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board.every((row) => row[c] !== null)) fullCols.add(c);
  }

  const clearedCount = fullRows.size + fullCols.size;
  if (clearedCount === 0) return { newBoard: board, clearedCount: 0 };

  // Clear cells that belong to full rows or columns
  const newBoard = board.map((row, r) =>
    row.map((cell, c) => {
      if (fullRows.has(r) || fullCols.has(c)) return null;
      return cell;
    })
  );

  return { newBoard, clearedCount };
}

export function isGameOver(hand: TetrominoCard[], board: BoardState): boolean {
  if (hand.length === 0) return false;
  // Game over if no card in hand can be placed anywhere on the board
  for (const card of hand) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (canPlaceCard(board, card, r, c)) return false;
      }
    }
  }
  return true;
}
