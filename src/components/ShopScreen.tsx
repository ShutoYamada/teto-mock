import React from 'react';
import { GameState, TetrominoCard, Artifact } from '../types';
import { getCardPrice } from '../tetrominos';
import { getArtifactPrice } from '../gameLogic';

interface ShopScreenProps {
  state: GameState;
  onBuyCard: (cardId: string) => void;
  onBuyArtifact: (artifactId: string) => void;
  onLeaveShop: () => void;
}

export function ShopScreen({ state, onBuyCard, onBuyArtifact, onLeaveShop }: ShopScreenProps) {
  return (
    <div className="shop-screen">
      <div className="shop-header">
        <h2 className="shop-title">ショップ</h2>
        <div className="shop-gold">所持ゴールド: {state.gold} G</div>
      </div>

      <div className="shop-content">
        <div className="shop-section">
          <h3>カード</h3>
          {state.shopCards.length === 0 ? (
            <p className="shop-empty">売り切れ</p>
          ) : (
            <div className="shop-cards deck-grid">
              {state.shopCards.map(card => {
                const price = getCardPrice(card);
                const canAfford = state.gold >= price;
                return (
                  <div key={card.id} className="shop-item card-item">
                    <div className="tetromino-card">
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
                    </div>
                    {card.effectText && <div className="card-effect-text">{card.effectText}</div>}
                    <button 
                      className="shop-buy-btn" 
                      disabled={!canAfford}
                      onClick={() => onBuyCard(card.id)}
                    >
                      {price} G
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shop-section">
          <h3>アーティファクト</h3>
          {state.shopArtifacts.length === 0 ? (
            <p className="shop-empty">売り切れ</p>
          ) : (
            <div className="shop-artifacts">
              {state.shopArtifacts.map(artifact => {
                const price = getArtifactPrice(artifact);
                const canAfford = state.gold >= price;
                return (
                  <div key={artifact.id} className="shop-item artifact-item">
                    <div className="artifact-info">
                      <span className="artifact-icon">
                        {artifact.id === 'brave_sword' ? '⚔️' : artifact.id === 'abacus' ? '🧮' : artifact.id === 'champion_glove' ? '🥊' : '💎'}
                      </span>
                      <div className="artifact-details">
                        <div className="artifact-name">{artifact.name} <span className={`rarity-tag ${artifact.rarity}`}>{artifact.rarity}</span></div>
                        <div className="artifact-desc">{artifact.description}</div>
                      </div>
                    </div>
                    <button 
                      className="shop-buy-btn" 
                      disabled={!canAfford}
                      onClick={() => onBuyArtifact(artifact.id)}
                    >
                      {price} G
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="shop-footer">
        <button className="shop-leave-btn" onClick={onLeaveShop}>立ち去る</button>
      </div>
    </div>
  );
}
