import React, { useState, useCallback, useEffect, useReducer } from 'react';
import { DungeonScreen } from './components/DungeonScreen';
import { BattleScreen } from './components/BattleScreen';
import { ResultScreen } from './components/ResultScreen';
import { RestScreen } from './components/RestScreen';
import { ShopScreen } from './components/ShopScreen';
import type { TetrominoCard, Artifact } from './types';
import { gameReducer, initGame } from './gameReducer';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initGame);
  const [clearedCells, setClearedCells] = useState<Set<string>>(new Set());
  const [flashDamage, setFlashDamage] = useState(false);
  const [recentDamage, setRecentDamage] = useState(0);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [modalType, setModalType] = useState<'deck' | 'discard' | 'exile' | null>(null);

  const selectedCard: TetrominoCard | null =
    state.hand.find((c: TetrominoCard) => c.id === state.selectedCardId) ?? null;

  const startBattle = useCallback((nodeId: string) => {
    dispatch({ type: 'START_BATTLE', nodeId });
  }, []);

  const handleCardClick = useCallback((id: string) => {
    dispatch({ type: 'SELECT_CARD', cardId: id });
  }, []);

  const handleRotateCard = useCallback((id: string) => {
    dispatch({ type: 'ROTATE_CARD', cardId: id });
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      dispatch({
        type: 'PLACE_CARD',
        row,
        col,
        damageResultCallback: (damage, bombCount, cleared) => {
          if (cleared.size > 0) {
             setClearedCells(cleared);
             setTimeout(() => setClearedCells(new Set()), 500);
          }
          if (damage > 0) {
             setRecentDamage(damage);
             setFlashDamage(true);
             setTimeout(() => setFlashDamage(false), 500);
          }
        }
      });
    },
    []
  );

  const handleTurnEnd = useCallback(() => {
    dispatch({ type: 'END_PLAYER_TURN' });
    setTimeout(() => {
       dispatch({ type: 'EXECUTE_ENEMY_TURN' });
    }, 1000);
  }, []);

  const handleArtifactSelect = useCallback((artifact: Artifact | null) => {
    dispatch({ type: 'SELECT_ARTIFACT', artifact });
  }, []);

  const handleRewardSelect = useCallback((card: TetrominoCard) => {
    dispatch({ type: 'SELECT_REWARD', card });
  }, []);

  const handleRestHeal = useCallback(() => {
    dispatch({ type: 'REST_HEAL' });
  }, []);

  const handleRestRemoveCards = useCallback((cardIds: string[]) => {
    dispatch({ type: 'REST_REMOVE_CARDS', cardIds });
  }, []);

  const handleRestSkip = useCallback(() => {
    dispatch({ type: 'REST_SKIP' });
  }, []);

  const handleBuyCard = useCallback((cardId: string) => {
    dispatch({ type: 'BUY_CARD', cardId });
  }, []);

  const handleBuyArtifact = useCallback((artifactId: string) => {
    dispatch({ type: 'BUY_ARTIFACT', artifactId });
  }, []);

  const handleLeaveShop = useCallback(() => {
    dispatch({ type: 'LEAVE_SHOP' });
  }, []);

  const handleNewGame = useCallback(() => {
    setClearedCells(new Set());
    dispatch({ type: 'NEW_GAME' });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'CANCEL_SELECTION' });
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowUp') {
        if (state.selectedCardId) {
          dispatch({ type: 'ROTATE_CARD', cardId: state.selectedCardId });
        }
      }
    };
    
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (state.selectedCardId) {
        dispatch({ type: 'ROTATE_CARD', cardId: state.selectedCardId });
      }
    };
    
    window.addEventListener('keydown', onKey);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [state.selectedCardId]);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">テトモック (Rogue-like)</h1>
        <div className="stats">
          <div className="stat-block">
            <span className="stat-label">スコア</span>
            <span className="stat-value">{state.score.toLocaleString()}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">アーティファクト</span>
            <div className="artifact-list">
              {state.artifacts.map(a => (
                <span key={a.id} className="artifact-icon" title={`${a.name}: ${a.description}`}>
                  {a.id === 'brave_sword' ? '⚔️' : a.id === 'abacus' ? '🧮' : a.id === 'champion_glove' ? '🥊' : '💎'}
                </span>
              ))}
            </div>
          </div>
          {state.screen !== 'gameover' && (
             <button className="new-game-btn" onClick={handleNewGame} style={{marginLeft: 'auto'}}>
               リセット
             </button>
          )}
        </div>
      </header>

      {state.screen === 'gameover' && (
        <div className="gameover-overlay">
          <div className="gameover-panel">
            <h2 className="gameover-title">
              {state.hp > 0 ? "ダンジョン踏破！" : "ゲームオーバー"}
            </h2>
            <p className="gameover-score">到達深度: <strong>{state.stage}</strong></p>
            <p className="gameover-score">最終スコア: <strong>{state.score.toLocaleString()}</strong></p>
            <button className="new-game-btn new-game-btn--large" onClick={handleNewGame}>
              最初からやり直す
            </button>
          </div>
        </div>
      )}

      {state.screen === 'dungeon' && (
        <DungeonScreen state={state} onEnterNode={startBattle} onOpenDeck={() => { setModalType('deck'); setShowDeckModal(true); }} />
      )}

      {state.screen === 'battle' && (
        <BattleScreen
          state={state}
          selectedCard={selectedCard}
          onCellClick={handleCellClick}
          onCardClick={handleCardClick}
          onRotateCard={handleRotateCard}
          onTurnEnd={handleTurnEnd}
          onOpenPile={(type) => { setModalType(type); setShowDeckModal(true); }}
          onTargetClick={(id) => dispatch({ type: 'SET_TARGET_ENEMY', enemyId: id })}
          clearedCells={clearedCells}
          flashDamage={flashDamage}
          damageAmount={recentDamage}
        />
      )}

      {state.screen === 'result' && (
        <ResultScreen 
          state={state} 
          onSelectCard={handleRewardSelect} 
          onSelectArtifact={handleArtifactSelect}
        />
      )}

      {state.screen === 'rest' && (
        <RestScreen
          state={state}
          onHeal={handleRestHeal}
          onRemoveCards={handleRestRemoveCards}
          onSkip={handleRestSkip}
        />
      )}

      {state.screen === 'shop' && (
        <ShopScreen
          state={state}
          onBuyCard={handleBuyCard}
          onBuyArtifact={handleBuyArtifact}
          onLeaveShop={handleLeaveShop}
        />
      )}

      {showDeckModal && (
        <div className="modal-overlay" onClick={() => { setShowDeckModal(false); setModalType(null); }}>
          <div className="modal-panel" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalType === 'deck' ? '山札一覧' : modalType === 'discard' ? '捨て札一覧' : '除外札一覧'} 
                ({(modalType === 'deck' ? state.deck : modalType === 'discard' ? state.discardPile : state.exilePile).length}枚)
              </h2>
              <button className="modal-close" onClick={() => { setShowDeckModal(false); setModalType(null); }}>×</button>
            </div>
            <div className="modal-content deck-grid">
              {(modalType === 'deck' ? state.deck : modalType === 'discard' ? state.discardPile : state.exilePile).map((card: TetrominoCard, idx: number) => (
                <div key={`${card.id}-${idx}`} className="deck-card-item">
                  <div className="tetromino-card" style={{ cursor: 'default' }}>
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
