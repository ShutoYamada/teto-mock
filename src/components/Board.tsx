import React, { useState, useCallback, useRef } from 'react';
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
  const touchTimer = useRef<number | null>(null);
  const lastTouchCell = useRef<{ row: number; col: number } | null>(null);

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

  const handleTouchStart = (r: number, c: number) => {
    if (!selectedCard) return;
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    touchTimer.current = window.setTimeout(() => {
      setHoverCell({ row: r, col: c });
      lastTouchCell.current = { row: r, col: c };
      touchTimer.current = null;
    }, 250); // 250ms for a snappy long press
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!selectedCard) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellElement = element?.closest('.board-cell');
    if (cellElement) {
      const rowStr = cellElement.getAttribute('data-row');
      const colStr = cellElement.getAttribute('data-col');
      if (rowStr !== null && colStr !== null) {
        const row = parseInt(rowStr);
        const col = parseInt(colStr);
        if (lastTouchCell.current?.row !== row || lastTouchCell.current?.col !== col) {
          setHoverCell({ row, col });
          lastTouchCell.current = { row, col };
        }
      }
    }
  }, [selectedCard]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current) {
      window.clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
    setHoverCell(null);
    lastTouchCell.current = null;
  }, []);

  const previewCells = getPreviewCells();
  const invalidCells = isInvalidDrop() ? getInvalidPreviewCells() : new Set<string>();

  return (
    <div className="board-wrapper">
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${board.length}, 1fr)` }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
                                      bType === 'combo' ? '➕' :
                                      bType === 'heart' ? '❤️' :
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
                              blockType === 'trash' ? '🗑️' :
                              blockType === 'combo' ? '➕' :
                              blockType === 'heart' ? '❤️' :
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
                data-row={r}
                data-col={c}
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
                onTouchStart={() => handleTouchStart(r, c)}
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
