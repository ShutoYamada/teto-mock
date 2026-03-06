import { useState, useCallback } from 'react';
import type { TetrominoCard } from '../types';
import { BOARD_SIZE, canPlaceCard } from '../gameLogic';
import type { BoardState } from '../types';
import { TETROMINO_DEFS } from '../tetrominos';

interface BoardProps {
  board: BoardState;
  selectedCard: TetrominoCard | null;
  onCellClick: (row: number, col: number) => void;
  clearedCells: Set<string>;
}

export function Board({ board, selectedCard, onCellClick, clearedCells }: BoardProps) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  const getPreviewCells = useCallback((): Set<string> => {
    if (!selectedCard || !hoverCell) return new Set();
    const cells = new Set<string>();
    if (!canPlaceCard(board, selectedCard, hoverCell.row, hoverCell.col)) return cells;
    for (let r = 0; r < selectedCard.shape.length; r++) {
      for (let c = 0; c < selectedCard.shape[r].length; c++) {
        if (selectedCard.shape[r][c]) {
          cells.add(`${hoverCell.row + r},${hoverCell.col + c}`);
        }
      }
    }
    return cells;
  }, [selectedCard, hoverCell, board]);

  const isInvalidDrop = useCallback((): boolean => {
    if (!selectedCard || !hoverCell) return false;
    return !canPlaceCard(board, selectedCard, hoverCell.row, hoverCell.col);
  }, [selectedCard, hoverCell, board]);

  const getInvalidPreviewCells = useCallback((): Set<string> => {
    if (!selectedCard || !hoverCell) return new Set();
    const cells = new Set<string>();
    if (canPlaceCard(board, selectedCard, hoverCell.row, hoverCell.col)) return cells;
    // Show what the card would cover (clamped to board)
    for (let r = 0; r < selectedCard.shape.length; r++) {
      for (let c = 0; c < selectedCard.shape[r].length; c++) {
        if (!selectedCard.shape[r][c]) continue;
        const br = hoverCell.row + r;
        const bc = hoverCell.col + c;
        if (br >= 0 && br < BOARD_SIZE && bc >= 0 && bc < BOARD_SIZE) {
          cells.add(`${br},${bc}`);
        }
      }
    }
    return cells;
  }, [selectedCard, hoverCell, board]);

  const previewCells = getPreviewCells();
  const invalidCells = isInvalidDrop() ? getInvalidPreviewCells() : new Set<string>();

  return (
    <div className="board-wrapper">
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isPreview = previewCells.has(key);
            const isInvalid = invalidCells.has(key);
            const isCleared = clearedCells.has(key);
            
            const cellType = cell ? cell.type : null;
            const blockType = cell ? cell.blockType : null;
            const color = cellType ? TETROMINO_DEFS[cellType].color : null;
            const glow = cellType ? TETROMINO_DEFS[cellType].glowColor : null;
            
            let previewBlockIcon: string | null = null;
            if (isPreview && selectedCard && hoverCell) {
               const rr = r - hoverCell.row;
               const rc = c - hoverCell.col;
               if (rr >= 0 && rr < selectedCard.shape.length && rc >= 0 && rc < selectedCard.shape[rr].length) {
                  const bType = selectedCard.blockTypes ? selectedCard.blockTypes[rr][rc] : 'normal';
                  previewBlockIcon = bType === 'bomb' ? '💣' :
                                     bType === 'sword' ? '🗡️' :
                                     bType === 'shield' ? '🛡️' :
                                     bType === 'mana' ? '💧' : null;
               }
            }
            
            const blockIcon = blockType === 'bomb' ? '💣' :
                              blockType === 'sword' ? '🗡️' :
                              blockType === 'shield' ? '🛡️' :
                              blockType === 'draw' ? '💳' :
                              blockType === 'spike' ? '🌵' :
                              blockType === 'gold' ? '💰' :
                              blockType === 'border' ? '➖' :
                              blockType === 'stripe' ? '｜' :
                              blockType === 'mana' ? '💧' : previewBlockIcon;

            let cellClass = 'board-cell';
            if (isPreview) cellClass += ' board-cell--preview';
            if (isInvalid) cellClass += ' board-cell--invalid';
            if (isCleared) cellClass += ' board-cell--cleared';
            if (selectedCard) cellClass += ' board-cell--selectable';

            return (
              <div
                key={key}
                className={cellClass}
                style={
                  cellType && !isCleared
                    ? {
                        backgroundColor: color!,
                        boxShadow: `inset 0 0 8px rgba(255,255,255,0.3), 0 0 12px ${glow}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                      }
                    : isPreview && selectedCard
                    ? {
                        backgroundColor: selectedCard.color + '88',
                        boxShadow: `0 0 10px ${selectedCard.glowColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                      }
                    : undefined
                }
                onClick={() => onCellClick(r, c)}
                onMouseEnter={() => setHoverCell({ row: r, col: c })}
                onMouseLeave={() => setHoverCell(null)}
              >
                  {blockIcon}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
