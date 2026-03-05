import { useState, useCallback, useEffect } from 'react';
import { DungeonScreen } from './components/DungeonScreen';
import { BattleScreen } from './components/BattleScreen';
import { ResultScreen } from './components/ResultScreen';
import { buildDeck, generateRewardCards } from './tetrominos';
import {
  createEmptyBoard,
  canPlaceCard,
  placeCard,
  clearLines,
  calculateDamage,
  generateEnemyIntent,
  BOARD_SIZE,
} from './gameLogic';
import type { GameState, TetrominoCard } from './types';

function initGame(): GameState {
  const deck = buildDeck();
  return {
    screen: 'dungeon',
    board: createEmptyBoard(),
    deck,
    hand: [],
    selectedCardId: null,
    hp: 50,
    maxHp: 50,
    mp: 5,
    maxMp: 5,
    gold: 0,
    turn: 'player',
    combo: 0,
    enemyHp: 100,
    enemyMaxHp: 100,
    enemyNextAttack: 0,
    stage: 1,
    rewardCards: [],
    score: 0,
    clearedLines: 0,
  };
}

export default function App() {
  const [state, setState] = useState<GameState>(initGame);
  const [clearedCells, setClearedCells] = useState<Set<string>>(new Set());
  const [flashDamage, setFlashDamage] = useState(false);
  const [recentDamage, setRecentDamage] = useState(0);

  const selectedCard: TetrominoCard | null =
    state.hand.find((c) => c.id === state.selectedCardId) ?? null;

  const startBattle = useCallback(() => {
    setState((prev) => {
      // Draw initial hand
      let deck = [...prev.deck];
      if (deck.length < 7) deck = buildDeck();
      
      const hand = deck.splice(0, 7);
      const eHp = 40 + prev.stage * 20;

      return {
        ...prev,
        screen: 'battle',
        board: createEmptyBoard(),
        hand,
        deck,
        hp: prev.hp,
        mp: prev.maxMp, // Fully restore MP at battle start
        turn: 'player',
        combo: 0,
        enemyHp: eHp,
        enemyMaxHp: eHp,
        enemyNextAttack: generateEnemyIntent(prev.stage),
      };
    });
  }, []);

  const handleCardClick = useCallback((id: string) => {
    setState((prev) => {
      // Can only select if we have enough MP
      const card = prev.hand.find(c => c.id === id);
      if (card && prev.mp < card.cost) {
        return prev; // Not enough MP
      }
      return {
        ...prev,
        selectedCardId: prev.selectedCardId === id ? null : id,
      };
    });
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!selectedCard || state.turn !== 'player') return;
      if (state.mp < selectedCard.cost) return; // double check
      if (!canPlaceCard(state.board, selectedCard, row, col)) return;

      const boardAfterPlace = placeCard(state.board, selectedCard, row, col);

      const { newBoard, clearedCount } = clearLines(boardAfterPlace);
      
      let combo = state.combo;
      if (clearedCount > 0) {
        combo += 1;
        const cleared = new Set<string>();
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardAfterPlace[r][c] !== null && newBoard[r][c] === null) {
              cleared.add(`${r},${c}`);
            }
          }
        }
        setClearedCells(cleared);
        setTimeout(() => setClearedCells(new Set()), 500);
      } else {
        combo = 0; 
      }

      const damage = calculateDamage(selectedCard, clearedCount, combo);
      
      if (damage > 0) {
        setRecentDamage(damage);
        setFlashDamage(true);
        setTimeout(() => setFlashDamage(false), 500);
      }

      let newEnemyHp = state.enemyHp - damage;
      if (newEnemyHp <= 0) newEnemyHp = 0;

      const newHand = state.hand.filter((c) => c.id !== selectedCard.id);
      let newDeck = state.deck;
      
      const newMp = state.mp - selectedCard.cost;
      const newScore = state.score + clearedCount * 100 + damage * 10;
      const newClearedLines = state.clearedLines + clearedCount;
      
      let nextScreen = state.screen;
      let rewardCards: TetrominoCard[] = [];
      
      if (newEnemyHp === 0) {
        // Victory!
        nextScreen = 'result';
        rewardCards = generateRewardCards();
      }

      setState({
        ...state,
        screen: nextScreen,
        board: newBoard,
        hand: newHand,
        deck: newDeck,
        selectedCardId: null,
        mp: newMp,
        combo,
        enemyHp: newEnemyHp,
        score: newScore,
        clearedLines: newClearedLines,
        rewardCards,
        gold: newEnemyHp === 0 ? state.gold + state.stage * 10 : state.gold,
      });
    },
    [selectedCard, state]
  );

  const handleTurnEnd = useCallback(() => {
    // Enemy Turn
    setState((prev) => ({ ...prev, turn: 'enemy', selectedCardId: null }));
    
    setTimeout(() => {
      setState((prev) => {
        let newHp = prev.hp - prev.enemyNextAttack;
        if (newHp <= 0) newHp = 0;
        
        if (newHp === 0) {
          return { ...prev, hp: 0, screen: 'gameover' };
        }

        // Replenish Hand if empty
        let hand = prev.hand;
        let deck = prev.deck;
        if (hand.length === 0) {
          if (deck.length < 7) {
            deck = buildDeck(); // simple reshuffle
          }
          hand = deck.splice(0, 7);
        }

        return {
          ...prev,
          hp: newHp,
          mp: prev.maxMp, // Restore MP at start of player turn
          turn: 'player',
          enemyNextAttack: generateEnemyIntent(prev.stage),
          hand,
          deck,
          combo: 0 // Reset combo on turn end
        };
      });
    }, 1000); // 1 second delay for enemy attack animation
  }, []);

  const handleRewardSelect = useCallback((card: TetrominoCard) => {
    setState((prev) => ({
      ...prev,
      deck: [...prev.deck, card],
      screen: 'dungeon',
      stage: prev.stage + 1, // Advance to next node (simplified for mock)
      rewardCards: [],
    }));
  }, []);

  const handleNewGame = useCallback(() => {
    setClearedCells(new Set());
    setState(initGame());
  }, []);

  // Deselect on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState((prev) => ({ ...prev, selectedCardId: null }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">テトモック (Rogue-like)</h1>
        <div className="stats">
          <div className="stat-block">
            <span className="stat-label">スコア</span>
            <span className="stat-value">{state.score.toLocaleString()}</span>
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
            <h2 className="gameover-title">ゲームオーバー</h2>
            <p className="gameover-score">到達ステージ: <strong>{state.stage}</strong></p>
            <p className="gameover-score">最終スコア: <strong>{state.score.toLocaleString()}</strong></p>
            <button className="new-game-btn new-game-btn--large" onClick={handleNewGame}>
              最初からやり直す
            </button>
          </div>
        </div>
      )}

      {state.screen === 'dungeon' && (
        <DungeonScreen state={state} onEnterBattle={startBattle} />
      )}

      {state.screen === 'battle' && (
        <BattleScreen
          state={state}
          selectedCard={selectedCard}
          onCellClick={handleCellClick}
          onCardClick={handleCardClick}
          onTurnEnd={handleTurnEnd}
          clearedCells={clearedCells}
          flashDamage={flashDamage}
          damageAmount={recentDamage}
        />
      )}

      {state.screen === 'result' && (
        <ResultScreen state={state} onSelectCard={handleRewardSelect} />
      )}
    </div>
  );
}
