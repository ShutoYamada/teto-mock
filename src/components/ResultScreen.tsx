import { GameState, TetrominoCard, Artifact } from '../types';
import { TetrominoCard as CardComponent } from './TetrominoCard';

interface ResultScreenProps {
  state: GameState;
  onSelectCard: (card: TetrominoCard) => void;
  onSelectArtifact: (artifact: Artifact | null) => void;
}

export function ResultScreen({ state, onSelectCard, onSelectArtifact }: ResultScreenProps) {
  return (
    <div className="result-screen">
      <h2 className="result-title">戦闘勝利！</h2>
      <p className="result-gold">獲得Gold: +{state.stage * 10}G</p>
      
      {state.rewardArtifact && (
        <div className="artifact-reward-section">
          <h3 className="result-subtitle">アーティファクトを獲得！</h3>
          <div className="artifact-reward-card">
            <div className="artifact-reward-info">
              <span className="artifact-rarity-tag" data-rarity={state.rewardArtifact.rarity}>
                {state.rewardArtifact.rarity.toUpperCase()}
              </span>
              <h4 className="artifact-reward-name">{state.rewardArtifact.name}</h4>
              <p className="artifact-reward-description">{state.rewardArtifact.description}</p>
            </div>
            <div className="artifact-reward-actions">
              <button 
                className="artifact-action-btn pick-up"
                onClick={() => onSelectArtifact(state.rewardArtifact)}
              >
                獲得する
              </button>
              <button 
                className="artifact-action-btn leave"
                onClick={() => onSelectArtifact(null)}
              >
                残していく
              </button>
            </div>
          </div>
        </div>
      )}

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
