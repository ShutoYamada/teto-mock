import { useState, type Dispatch } from 'react';
import type { GameCommand } from '../gameReducer';
import type { GameState, TetrominoType, MinoCard } from '../types';
import { BASIC_ENHANCEMENTS, TETROMINO_DEFS } from '../tetrominos';
import { TetrominoCard } from './TetrominoCard';

export function SuspiciousMagicEvent({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameCommand> }) {
  const [selectedType, setSelectedType] = useState<TetrominoType | null>(null);
  const candidates = state.deck.filter((card): card is MinoCard => !card.curse).filter((card, index, deck) =>
    BASIC_ENHANCEMENTS[card.type] && deck.findIndex(other => other.type === card.type) === index);
  const selectedCard = candidates.find(card => card.type === selectedType);
  const enhancedType = selectedCard ? BASIC_ENHANCEMENTS[selectedCard.type] : undefined;
  const enhanced = enhancedType ? TETROMINO_DEFS[enhancedType] : undefined;
  const count = state.deck.filter(card => !card.curse && card.type === selectedType).length;

  return (
    <div className="rest-screen">
      <div className="rest-panel magic-event-panel">
        <h2 className="rest-title">怪しげな魔術</h2>
        <p>暗がりの魔術師が囁く。「ミノをひとつ選びなさい。力を授けよう」</p>
        <p>基礎ミノを1種類選ぶと、デッキ内の同じ種類のカードがすべてEnhancedに変わります。</p>
        <p>所持Gold：<strong>{state.gold}G</strong> ／ 支払い：<strong>無料</strong></p>
        {candidates.length === 0 ? <p role="status">強化できる基礎ミノがありません。</p> : (
          <div className="magic-mino-grid" aria-label="強化する基礎ミノの種類">
            {candidates.map(card => (
              <div key={card.type} className="magic-mino-option">
                <TetrominoCard card={card} isSelected={selectedType === card.type}
                  onClick={() => setSelectedType(card.type)} />
                <span>{state.deck.filter(other => !other.curse && other.type === card.type).length}枚 → {BASIC_ENHANCEMENTS[card.type]}</span>
              </div>
            ))}
          </div>
        )}
        {selectedCard && enhanced && enhancedType && (
          <div className="magic-event-preview" role="status">
            <p>{selectedType} {count}枚 → <strong>{enhancedType} {count}枚</strong></p>
            <p>強化後の基礎攻撃力：{enhanced.attack} ／ コスト：{enhanced.cost}</p>
            <p>Goldは消費しません。</p>
          </div>
        )}
        <div className="rest-remove-actions">
          <button className="rest-action-btn confirm" disabled={!selectedCard}
            onClick={() => { if (selectedCard) dispatch({ type: 'EVENT_SUSPICIOUS_MAGIC_ENHANCE', minoType: selectedCard.type }); }}>
            無料で強化する
          </button>
          <button className="rest-action-btn cancel" onClick={() => dispatch({ type: 'EVENT_SUSPICIOUS_MAGIC_LEAVE' })}>
            立ち去る（何も失わない）
          </button>
        </div>
      </div>
    </div>
  );
}
