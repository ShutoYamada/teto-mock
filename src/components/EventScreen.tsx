import React, { useState } from 'react';
import { GameState, TetrominoCard } from '../types';
import { GameCommand } from '../gameReducer';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameCommand>;
}

export const EventScreen: React.FC<Props> = ({ state, dispatch }) => {
  const [fairyMirrorMode, setFairyMirrorMode] = useState<'menu' | 'select'>('menu');
  const [mysteryChangeMode, setMysteryChangeMode] = useState<'menu' | 'select'>('menu');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  if (state.currentEventId === 'fairy_mirror') {
    if (fairyMirrorMode === 'menu') {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-full">
          <h2 className="text-2xl font-bold mb-8">妖精の鏡</h2>
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
            <p className="text-xl mb-8">妖精の鏡を見つけた</p>
            
            <div className="flex flex-col gap-4 w-full">
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
                onClick={() => setFairyMirrorMode('select')}
              >
                覗き込む (カードを1枚複製)
              </button>
              
              <button
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-colors"
                onClick={() => dispatch({ type: 'EVENT_FAIRY_MIRROR_IGNORE' })}
              >
                無視する
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rest-screen">
        <div className="rest-panel">
          <h2 className="rest-title">妖精の鏡</h2>
          <div className="rest-remove-section" style={{ marginTop: '20px' }}>
            <h3 className="rest-subtitle">複製するカードを選択してください</h3>
            <div className="rest-card-grid deck-grid">
              {state.deck.map((card: TetrominoCard, idx: number) => {
                const isSelected = selectedCardId === card.id;
                return (
                  <div 
                    key={`${card.id}-${idx}`} 
                    className={`deck-card-item ${isSelected ? 'selected-for-removal' : ''}`}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div className="tetromino-card" style={{ 
                      cursor: 'pointer', 
                      borderColor: isSelected ? '#4444ff' : undefined,
                      boxShadow: isSelected ? '0 0 10px rgba(68, 68, 255, 0.8)' : undefined
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
                      {isSelected && <div className="remove-badge" style={{ backgroundColor: '#4444ff' }}>複製対象</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rest-remove-actions">
              <button 
                className="rest-action-btn confirm" 
                onClick={() => {
                  if (selectedCardId) {
                    dispatch({ type: 'EVENT_FAIRY_MIRROR_DUPLICATE', cardId: selectedCardId });
                  }
                }} 
                disabled={!selectedCardId}
              >
                決定
              </button>
              <button 
                className="rest-action-btn cancel" 
                onClick={() => { 
                  setFairyMirrorMode('menu'); 
                  setSelectedCardId(null); 
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.currentEventId === 'mystery_change') {
    if (mysteryChangeMode === 'menu') {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-full">
          <h2 className="text-2xl font-bold mb-8">変化の霧</h2>
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
            <p className="text-xl mb-8">変化の霧が立ち込める</p>
            
            <div className="flex flex-col gap-4 w-full">
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
                onClick={() => dispatch({ type: 'EVENT_MYSTERY_DIVE' })}
              >
                飛び込む (基礎カードを強化)
              </button>
              
              <button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors"
                onClick={() => setMysteryChangeMode('select')}
              >
                何かを投げ込む (ランダム変換)
              </button>
              
              <button
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-colors"
                onClick={() => dispatch({ type: 'EVENT_MYSTERY_IGNORE' })}
              >
                無視する
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rest-screen">
        <div className="rest-panel">
          <h2 className="rest-title">変化の霧</h2>
          <div className="rest-remove-section" style={{ marginTop: '20px' }}>
            <h3 className="rest-subtitle">変換するカードを選択してください</h3>
            <div className="rest-card-grid deck-grid">
              {state.deck.map((card: TetrominoCard, idx: number) => {
                const isSelected = selectedCardId === card.id;
                return (
                  <div 
                    key={`${card.id}-${idx}`} 
                    className={`deck-card-item ${isSelected ? 'selected-for-removal' : ''}`}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div className="tetromino-card" style={{ 
                      cursor: 'pointer', 
                      borderColor: isSelected ? '#aa44ff' : undefined,
                      boxShadow: isSelected ? '0 0 10px rgba(170, 68, 255, 0.8)' : undefined
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
                      {isSelected && <div className="remove-badge" style={{ backgroundColor: '#aa44ff' }}>変換対象</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rest-remove-actions">
              <button 
                className="rest-action-btn confirm" 
                onClick={() => {
                  if (selectedCardId) {
                    dispatch({ type: 'EVENT_MYSTERY_THROW', cardId: selectedCardId });
                  }
                }} 
                disabled={!selectedCardId}
              >
                決定
              </button>
              <button 
                className="rest-action-btn cancel" 
                onClick={() => { 
                  setMysteryChangeMode('menu'); 
                  setSelectedCardId(null); 
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.currentEventId === 'merchant_drop') {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-full">
        <h2 className="text-2xl font-bold mb-8">商人の落とし物</h2>
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <p className="text-xl mb-8">目の前を歩く行商人が、何やら落とし物をしたようだ</p>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded transition-colors"
              onClick={() => dispatch({ type: 'EVENT_MERCHANT_STEAL' })}
            >
              くすねる (ランダムなカスタムミノを獲得)
            </button>
            
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
              onClick={() => dispatch({ type: 'EVENT_MERCHANT_RETURN' })}
            >
              返却する (50Gを獲得)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.currentEventId !== 'assault') {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-full">
        <h2 className="text-2xl font-bold mb-4">イベント</h2>
        <p>未定義のイベントです</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-full">
      <h2 className="text-2xl font-bold mb-8">強襲</h2>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
        <p className="text-xl mb-8">突然モンスターに襲われた</p>
        
        <div className="flex flex-col gap-4 w-full">
          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors"
            onClick={() => dispatch({ type: 'EVENT_ASSAULT_FIGHT' })}
          >
            戦う
          </button>
          
          <button
            className={`w-full py-3 px-4 rounded font-bold transition-colors ${
              state.gold >= 50 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 text-gray-300'
            }`}
            onClick={() => dispatch({ type: 'EVENT_ASSAULT_FLEE' })}
            title={state.gold < 50 ? "50Gを失う" : undefined}
          >
            逃げる (50Gを失う)
          </button>
        </div>
      </div>
    </div>
  );
};
