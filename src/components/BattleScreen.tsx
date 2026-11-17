import { weaknessBonus } from '../curses';
import { GameState, TetrominoCard } from '../types';
import { BOSSES, bossStep, bossCellMarkers, lineLabel } from '../battle/bosses';
import { Board } from './Board';
import { Hand } from './Hand';

interface BattleScreenProps {
  state: GameState;
  selectedCard: TetrominoCard | null;
  onCellClick: (row: number, col: number) => void;
  onCardClick: (id: string) => void;
  onRotateCard: (id: string) => void;
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
  onRotateCard,
  onTurnEnd,
  onOpenPile,
  onTargetClick,
  clearedCells,
  flashDamage,
  damageAmount,
}: BattleScreenProps & { onTargetClick: (enemyId: string) => void }) {
  return (
    <div className="battle-screen">
      {state.bossBattle && (
        <section className="boss-guide" aria-live="polite">
          <strong>ステージ {state.stage} — {BOSSES[state.bossBattle.id].name}</strong>
          <p>{BOSSES[state.bossBattle.id].summary}</p>
          <p>行動周期：{BOSSES[state.bossBattle.id].cycle.map((name, i) => i === bossStep(state.bossBattle!) ? `【${name}】` : name).join(' → ')}</p>
          {state.bossBattle.targets.length > 0 && <p>盤面予告：{state.bossBattle.targets.map(lineLabel).join('・')}（{state.bossBattle.id === 'architect' ? `裁定まで${bossStep(state.bossBattle) === 0 ? 2 : 1}ターン` : 'この敵ターンに削除'}）</p>}
          {state.bossBattle.id === 'ancientCore' && state.bossBattle.fallenUntil >= state.bossBattle.turn && <p>転倒中：受けるダメージ1.5倍（残り{state.bossBattle.fallenUntil - state.bossBattle.turn + 1}プレイヤーターン）</p>}
          {state.bossBattle.id === 'sporeGardener' && <p>「胞」は散布予告。「菌2 / 菌1」は成熟までの残りターン。</p>}
        </section>
      )}
      {/* HUD - Player and Enemy Stats */}
      <div className="battle-hud">
        <div className="player-stats">
          <div className="stat-row">HP: {state.hp} / {state.maxHp}</div>
          {weaknessBonus(state.board) > 0 && <div className="stat-row">弱点：被ダメージ +{weaknessBonus(state.board)}</div>}
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
                {s.type === 'power' ? '💪' : s.type === 'reflect' ? '🪞' : s.type === 'fallen' ? '🥴' : s.type === 'draw_down' ? '🎴↓' : s.type === 'poison' ? '🧪' : '✨'}{s.value}
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

        <div className="enemies-container" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                  {enemy.intent.actionName} {enemy.intent.damage ? `(${enemy.intent.damage}${enemy.intent.count && enemy.intent.count > 1 ? `x${enemy.intent.count}` : ''}ダメ)` : ''}
                </div>
                <div className="stat-row description" style={{ fontSize: '0.7rem', color: '#ccc' }}>
                  {enemy.intent.description}
                </div>
                <div className="enemy-statuses" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {enemy.statuses.map((s, idx) => (
                    <div key={idx} className="status-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>
                      {s.type === 'fury' ? '🔥' : s.type === 'defense' ? '🛡️' : s.type === 'reflect' ? '🪞' : s.type === 'fallen' ? '🥴' : s.type === 'taunt' ? '📢' : s.type === 'charging' ? '⚡' : '✨'}{s.value}
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

      {state.sealedLines.length > 0 && <p className="hint">封鎖中：{state.sealedLines.map(lineLabel).join('・')}（このターン終了まで）</p>}
      {state.turn === 'enemy' && <p className="hint" aria-live="polite">次ターン：MP −{state.pendingCurseEffects.mpLoss} / ドロー −{state.pendingCurseEffects.drawLoss}{state.pendingCurseEffects.sealedLines.length > 0 ? ` / 封鎖 ${state.pendingCurseEffects.sealedLines.map(lineLabel).join('・')}` : ''}</p>}
      {/* Main Game Area */}
      <main className="game-area">
        <Board
          board={state.board}
          sealedLines={state.sealedLines}
          selectedCard={state.turn === 'player' ? selectedCard : null}
          onCellClick={(r, c) => {
            if (state.turn === 'player') onCellClick(r, c);
          }}
          clearedCells={clearedCells}
          markers={bossCellMarkers(state)}
        />
      </main>

      <footer className="footer">
        <Hand
          hand={state.hand}
          hasOfuda={state.artifacts.some(a => a.id === 'ofuda')}
          selectedCardId={state.selectedCardId}
          onCardClick={(id) => {
             if (state.turn === 'player') onCardClick(id);
          }}
          onRotate={(id) => {
             if (state.turn === 'player') onRotateCard(id);
          }}
        />
      </footer>
    </div>
  );
}
