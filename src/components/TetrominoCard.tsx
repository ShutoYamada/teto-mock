import { CURSE_DEFS, CURSE_USE_COST } from '../curses';
import type { TetrominoCard as TetrominoCardType } from '../types';

interface TetrominoCardProps {
  card: TetrominoCardType;
  isSelected: boolean;
  onClick: () => void;
  canUseCurse?: boolean;
}

const PREVIEW_CELL_SIZE = 14;

export function TetrominoCard({ card, isSelected, onClick, canUseCurse = false }: TetrominoCardProps) {
  const rows = card.shape.length;
  const cols = card.shape[0].length;

  const effectText = card.curse && canUseCurse
    ? `お札：${CURSE_USE_COST}MPで使用し、捨て札に送る。${CURSE_DEFS[card.curse].description}`
    : card.effectText;

  return (
    <button
      className={`tetromino-card ${isSelected ? 'tetromino-card--selected' : ''}`}
      onClick={onClick}
      style={
        isSelected
          ? { borderColor: card.color, boxShadow: `0 0 20px ${card.glowColor}, 0 0 40px ${card.glowColor}` }
          : { borderColor: card.color + '55' }
      }
      title={card.curse ? `${CURSE_DEFS[card.curse].name}：${effectText}` : `テトリミノ ${card.type}`}
    >
      {!card.curse && <div className="card-stat-attack" title="基礎攻撃力">{card.attack}</div>}
      {(!card.curse || canUseCurse) && <div className="card-stat-cost" title="コスト">{card.curse ? CURSE_USE_COST : card.cost}</div>}
      
      <div className="card-tooltip">
        {effectText ? effectText : `基礎攻撃力：${card.attack}`}
      </div>

      <div className="card-type-label" style={{ color: card.color }}>
        {card.curse ? CURSE_DEFS[card.curse].name : card.type}
      </div>
      <div className="card-rarity-label" data-rarity={card.rarity}>
        {card.curse ? (canUseCurse ? '呪い・お札で使用' : '呪い・使用不可') : card.rarity.toUpperCase()}
      </div>
      {card.curse && <div className="curse-card-symbol" aria-hidden="true">呪</div>}
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
