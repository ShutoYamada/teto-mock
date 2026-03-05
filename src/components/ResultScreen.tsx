import { GameState, TetrominoCard } from '../types';
import { TetrominoCard as CardComponent } from './TetrominoCard';

interface ResultScreenProps {
  state: GameState;
  onSelectCard: (card: TetrominoCard) => void;
}

export function ResultScreen({ state, onSelectCard }: ResultScreenProps) {
  return (
    <div className="result-screen">
      <h2 className="result-title">戦闘勝利！</h2>
      <p className="result-gold">獲得Gold: +{state.stage * 10}G</p>
      
      <h3 className="result-subtitle">カードを1枚デッキに加える</h3>
      <div className="reward-cards">
        {state.rewardCards.map((card) => (
          <div key={card.id} className="reward-card-wrap">
            <CardComponent
              card={card}
              isSelected={false}
              onClick={() => onSelectCard(card)}
            />
            <div className="reward-card-stats">
              Cost: {card.cost} | Atk: {card.attack}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
