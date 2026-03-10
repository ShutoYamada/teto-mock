import React from 'react';
import { GameState, TetrominoCard } from '../types';
import { Board } from './Board';
import { Hand } from './Hand';

interface BattleScreenProps {
  state: GameState;
  selectedCard: TetrominoCard | null;
  onCellClick: (row: number, col: number) => void;
  onCardClick: (id: string) => void;
  onTurnEnd: () => void;
  onOpenPile: (type: 'deck' | 'discard' | 'exile') => void;
  clearedCells: Set<string>;
  flashDamage: boolean;
  damageAmount: number;
}

export function BattleScreen({
  state,
  selectedCard,
  onCellClick,
  onCardClick,
  onTurnEnd,
  onOpenPile,
  onTargetClick,
  clearedCells,
  flashDamage,
  damageAmount,
}: BattleScreenProps & { onTargetClick: (enemyId: string) => void }) {
  return (
    <div className="battle-screen">
      {/* HUD - Player and Enemy Stats */}
      <div className="battle-hud">
        <div className="player-stats">
          <div className="stat-row">HP: {state.hp} / {state.maxHp}</div>
          <div className="stat-row">MP: {state.mp} / {state.maxMp}</div>
          <div className="stat-row" style={{ color: '#FFD700', fontWeight: 'bold' }}>💰 Gold: {state.gold}</div>
          {state.shield > 0 && (
             <div className="stat-row" style={{ color: '#FFE000', fontWeight: 'bold' }}>
               🛡️ シールド: {state.shield}
             </div>
          )}
            <div className="stat-row" style={{ fontSize: '0.8rem', marginTop: '4px', color: '#aaa' }}>
            <span className="pile-link" onClick={() => onOpenPile('deck')}>山札: {state.deck.length}</span> | 
            <span className="pile-link" onClick={() => onOpenPile('discard')}> 捨て札: {state.discardPile.length}</span> | 
            <span className="pile-link" onClick={() => onOpenPile('exile')}> 除外: {state.exilePile.length}</span>
          </div>
          <div className="player-statuses" style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {state.statuses.map((s, idx) => (
              <div key={idx} className="status-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,224,0,0.2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,224,0,0.4)' }}>
                {s.type === 'power' ? '💪' : s.type === 'reflect' ? '🪞' : s.type === 'fallen' ? '🥴' : '✨'}{s.value}
              </div>
            ))}
          </div>
        </div>
        
        <div className="turn-indicator">
          <div className="turn-label">{state.turn === 'player' ? 'プレイヤーターン' : '敵ターン'}</div>
          {state.turn === 'player' && (
            <button className="turn-end-btn" onClick={onTurnEnd}>
              ターン終了
            </button>
          )}
        </div>

        <div className="enemies-container" style={{ display: 'flex', gap: '12px' }}>
          {state.enemies.map(enemy => {
            const isTarget = state.targetEnemyId === enemy.id;
            const isFlashing = flashDamage && isTarget;
            return (
              <div 
                key={enemy.id}
                className={`enemy-stats ${isFlashing ? 'flash-damage' : ''} ${isTarget ? 'is-target' : ''}`}
                onClick={() => onTargetClick(enemy.id)}
                style={{
                  cursor: 'pointer',
                  border: isTarget ? '2px solid #ff4040' : '2px solid transparent',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  background: isTarget ? 'rgba(255, 64, 64, 0.1)' : 'transparent',
                }}
              >
                <div className="stat-row title">{enemy.name}</div>
                <div className="stat-row">HP: {enemy.hp} / {enemy.maxHp}</div>
                <div className="stat-row intent" style={{ color: '#ffcc00' }}>
                  {enemy.intent.actionName} {enemy.intent.damage ? `(${enemy.intent.damage}ダメ)` : ''}
                </div>
                <div className="stat-row description" style={{ fontSize: '0.7rem', color: '#ccc' }}>
                  {enemy.intent.description}
                </div>
                <div className="enemy-statuses" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {enemy.statuses.map((s, idx) => (
                    <div key={idx} className="status-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>
                      {s.type === 'fury' ? '🔥' : s.type === 'defense' ? '🛡️' : s.type === 'reflect' ? '🪞' : s.type === 'fallen' ? '🥴' : '✨'}{s.value}
                    </div>
                  ))}
                </div>
                {isFlashing && <div className="damage-popup">-{damageAmount}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hint">
        {state.turn === 'enemy' 
          ? '敵の攻撃！'
          : selectedCard
            ? `「${selectedCard.type}」を選択中 (Cost: ${selectedCard.cost}) — Rキー/右クリックで回転 (Escでキャンセル)`
            : '手札のカードを選んでMPを消費して配置してください'}
      </div>

      {/* Main Game Area */}
      <main className="game-area">
        <Board
          board={state.board}
          selectedCard={state.turn === 'player' ? selectedCard : null}
          onCellClick={(r, c) => {
            if (state.turn === 'player') onCellClick(r, c);
          }}
          clearedCells={clearedCells}
        />
      </main>

      <footer className="footer">
        <Hand
          hand={state.hand}
          selectedCardId={state.selectedCardId}
          onCardClick={(id) => {
             if (state.turn === 'player') onCardClick(id);
          }}
        />
      </footer>
    </div>
  );
}
