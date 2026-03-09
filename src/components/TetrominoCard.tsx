import React from 'react';
import type { TetrominoCard as TetrominoCardType } from '../types';

interface TetrominoCardProps {
  card: TetrominoCardType;
  isSelected: boolean;
  onClick: () => void;
}

const PREVIEW_CELL_SIZE = 14;

export function TetrominoCard({ card, isSelected, onClick }: TetrominoCardProps) {
  const rows = card.shape.length;
  const cols = card.shape[0].length;

  return (
    <button
      className={`tetromino-card ${isSelected ? 'tetromino-card--selected' : ''}`}
      onClick={onClick}
      style={
        isSelected
          ? { borderColor: card.color, boxShadow: `0 0 20px ${card.glowColor}, 0 0 40px ${card.glowColor}` }
          : { borderColor: card.color + '55' }
      }
      title={`テトリミノ ${card.type}`}
    >
      <div className="card-stat-attack" title="基礎攻撃力">{card.attack}</div>
      <div className="card-stat-cost" title="コスト">{card.cost}</div>
      
      <div className="card-tooltip">
        {card.effectText ? card.effectText : `基礎攻撃力：${card.attack}`}
      </div>

      <div className="card-type-label" style={{ color: card.color }}>
        {card.type}
      </div>
      <div className="card-rarity-label" data-rarity={card.rarity}>
        {card.rarity.toUpperCase()}
      </div>
      <div
        className="card-preview"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${PREVIEW_CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${PREVIEW_CELL_SIZE}px)`,
          gap: '2px',
        }}
      >
        {card.shape.map((row, r) =>
          row.map((filled, c) => {
            const bType = card.blockTypes ? card.blockTypes[r][c] : 'normal';
            const icon = bType === 'bomb' ? '💣' :
                         bType === 'sword' ? '🗡️' :
                         bType === 'shield' ? '🛡️' :
                         bType === 'draw' ? '💳' :
                         bType === 'spike' ? '🌵' :
                         bType === 'mana' ? '💧' : null;
            return (
              <div
                key={`${r}-${c}`}
                className="preview-cell"
                style={
                  filled
                    ? {
                        backgroundColor: card.color,
                        boxShadow: `0 0 6px ${card.glowColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                      }
                    : { backgroundColor: 'transparent' }
                }
              >
                 {filled && icon}
              </div>
            );
          })
        )}
      </div>
    </button>
  );
}
