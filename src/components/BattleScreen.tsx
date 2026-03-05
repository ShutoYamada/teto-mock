import { GameState, TetrominoCard } from '../types';
import { Board } from './Board';
import { Hand } from './Hand';

interface BattleScreenProps {
  state: GameState;
  selectedCard: TetrominoCard | null;
  onCellClick: (row: number, col: number) => void;
  onCardClick: (id: string) => void;
  onTurnEnd: () => void;
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
  clearedCells,
  flashDamage,
  damageAmount,
}: BattleScreenProps) {
  return (
    <div className="battle-screen">
      {/* HUD - Player and Enemy Stats */}
      <div className="battle-hud">
        <div className="player-stats">
          <div className="stat-row">HP: {state.hp} / {state.maxHp}</div>
          <div className="stat-row">MP: {state.mp} / {state.maxMp}</div>
        </div>
        
        <div className="turn-indicator">
          <div className="turn-label">{state.turn === 'player' ? 'プレイヤーターン' : '敵ターン'}</div>
          {state.turn === 'player' && (
            <button className="turn-end-btn" onClick={onTurnEnd}>
              ターン終了
            </button>
          )}
        </div>

        <div className={`enemy-stats ${flashDamage ? 'flash-damage' : ''}`}>
          <div className="stat-row title">敵</div>
          <div className="stat-row">HP: {state.enemyHp} / {state.enemyMaxHp}</div>
          <div className="stat-row intent">予告: 攻撃 {state.enemyNextAttack}</div>
          {flashDamage && <div className="damage-popup">-{damageAmount}</div>}
        </div>
      </div>

      <div className="hint">
        {state.turn === 'enemy' 
          ? '敵の攻撃！'
          : selectedCard
            ? `「${selectedCard.type}」を選択中 (Cost: ${selectedCard.cost}) — 盤面をクリックして配置 (Escでキャンセル)`
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
