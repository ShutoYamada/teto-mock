import type { TetrominoCard as TetrominoCardType } from '../types';
import { TetrominoCard } from './TetrominoCard';

interface HandProps {
  hand: TetrominoCardType[];
  selectedCardId: string | null;
  onCardClick: (id: string) => void;
}

export function Hand({ hand, selectedCardId, onCardClick }: HandProps) {
  return (
    <div className="hand">
      <div className="hand-label">手札</div>
      <div className="hand-cards">
        {hand.map((card) => (
          <TetrominoCard
            key={card.id}
            card={card}
            isSelected={card.id === selectedCardId}
            onClick={() => onCardClick(card.id)}
          />
        ))}
        {hand.length === 0 && (
          <div className="hand-empty">手札がありません</div>
        )}
      </div>
    </div>
  );
}
