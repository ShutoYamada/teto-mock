import type { TetrominoCard as TetrominoCardType } from '../types';
import { TetrominoCard } from './TetrominoCard';

interface HandProps {
  hand: TetrominoCardType[];
  selectedCardId: string | null;
  onCardClick: (id: string) => void;
  onRotate: (id: string) => void;
}

export function Hand({ hand, selectedCardId, onCardClick, onRotate }: HandProps) {
  return (
    <div className="hand">
      <div className="hand-label">手札</div>
      <div className="hand-cards">
        {hand.map((card) => {
          const isSelected = card.id === selectedCardId;
          return (
            <div key={card.id} className="hand-card-container">
              <TetrominoCard
                card={card}
                isSelected={isSelected}
                onClick={() => onCardClick(card.id)}
              />
              {isSelected && (
                <button
                  className="rotate-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRotate(card.id);
                  }}
                  title="回転する"
                >
                  🔄 回転
                </button>
              )}
            </div>
          );
        })}
        {hand.length === 0 && (
          <div className="hand-empty">手札がありません</div>
        )}
      </div>
    </div>
  );
}
