import React, { useState } from 'react';
import type { GameState, TetrominoCard } from '../types';

interface RestScreenProps {
  state: GameState;
  onHeal: () => void;
  onRemoveCards: (cardIds: string[]) => void;
  onSkip: () => void;
}

export function RestScreen({ state, onHeal, onRemoveCards, onSkip }: RestScreenProps) {
  const [mode, setMode] = useState<'menu' | 'remove'>('menu');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const hasCoffee = state.artifacts.some(a => a.id === 'drip_coffee');
  const hasScissors = state.artifacts.some(a => a.id === 'scissors');

  const healAmount = Math.floor(state.maxHp * (hasCoffee ? 0.4 : 0.2));
  const maxRemovable = hasScissors ? 2 : 1;

  const handleCardClick = (id: string) => {
    setSelectedCardIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      if (prev.length < maxRemovable) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const confirmRemove = () => {
    onRemoveCards(selectedCardIds);
  };

  return (
    <div className="rest-screen">
      <div className="rest-panel">
        <h2 className="rest-title">休憩所</h2>
        <div className="rest-status">
          <span className="hp-label">HP:</span>
          <span className="hp-value">{state.hp} / {state.maxHp}</span>
        </div>
        
        {mode === 'menu' && (
          <div className="rest-options">
            <button className="rest-btn" onClick={onHeal} disabled={state.hp >= state.maxHp}>
              <h3>❤ HP回復</h3>
              <p>最大HPの{hasCoffee ? '40%' : '20%'} ({healAmount}) を回復する</p>
            </button>
            <button className="rest-btn" onClick={() => setMode('remove')}>
              <h3>🗑 カード削除</h3>
              <p>現在のデッキからカードを{hasScissors ? '最大2枚' : '1枚'}選んでデッキから永続的に削除する</p>
            </button>
            <button className="rest-btn rest-btn-skip" onClick={onSkip}>
              立ち去る
            </button>
          </div>
        )}

        {mode === 'remove' && (
          <div className="rest-remove-section">
            <h3 className="rest-subtitle">削除するカードを選択してください ({selectedCardIds.length}/{maxRemovable})</h3>
            <div className="rest-card-grid deck-grid">
              {state.deck.map((card: TetrominoCard, idx: number) => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div 
                    key={`${card.id}-${idx}`} 
                    className={`deck-card-item ${isSelected ? 'selected-for-removal' : ''}`}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <div className="tetromino-card" style={{ 
                      cursor: 'pointer', 
                      borderColor: isSelected ? '#ff4444' : undefined,
                      boxShadow: isSelected ? '0 0 10px rgba(255, 68, 68, 0.8)' : undefined
                    }}>
                      <div className="card-stat-attack">{card.attack}</div>
                      <div className="card-stat-cost">{card.cost}</div>
                      <div className="card-type-label">{card.type}</div>
                      <div className="card-rarity-label" data-rarity={card.rarity}>{card.rarity}</div>
                      <div className="card-preview" style={{
                        display: 'grid',
                        gridTemplateRows: `repeat(${card.shape.length}, 1fr)`,
                        gridTemplateColumns: `repeat(${card.shape[0].length}, 1fr)`,
                        gap: '2px'
                      }}>
                        {card.shape.map((row: boolean[], r: number) => row.map((cell: boolean, c: number) => (
                          <div key={`${r}-${c}`} className="preview-cell" style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: cell ? card.color : 'transparent',
                            boxShadow: cell ? `0 0 5px ${card.glowColor}` : 'none'
                          }} />
                        )))}
                      </div>
                      {isSelected && <div className="remove-badge">削除</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rest-remove-actions">
              <button className="rest-action-btn confirm" onClick={confirmRemove} disabled={selectedCardIds.length === 0}>
                決定
              </button>
              <button className="rest-action-btn cancel" onClick={() => { setMode('menu'); setSelectedCardIds([]); }}>
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
