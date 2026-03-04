import { useState, useCallback, useEffect } from 'react';
import { Board } from './components/Board';
import { Hand } from './components/Hand';
import { buildDeck } from './tetrominos';
import {
  createEmptyBoard,
  canPlaceCard,
  placeCard,
  clearLines,
  isGameOver,
  BOARD_SIZE,
} from './gameLogic';
import type { GameState, TetrominoCard } from './types';

function initGame(): GameState {
  const deck = buildDeck();
  const hand = deck.slice(0, 7);
  const remaining = deck.slice(7);
  return {
    board: createEmptyBoard(),
    hand,
    deck: remaining,
    selectedCardId: null,
    score: 0,
    clearedLines: 0,
    gameOver: false,
  };
}

export default function App() {
  const [state, setState] = useState<GameState>(initGame);
  const [clearedCells, setClearedCells] = useState<Set<string>>(new Set());
  const [flashScore, setFlashScore] = useState(false);

  const selectedCard: TetrominoCard | null =
    state.hand.find((c) => c.id === state.selectedCardId) ?? null;

  const handleCardClick = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedCardId: prev.selectedCardId === id ? null : id,
    }));
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!selectedCard || state.gameOver) return;
      if (!canPlaceCard(state.board, selectedCard, row, col)) return;

      // Place card
      const boardAfterPlace = placeCard(state.board, selectedCard, row, col);

      // Detect which cells were placed (for animation trigger)
      const placed = new Set<string>();
      for (let r = 0; r < selectedCard.shape.length; r++) {
        for (let c = 0; c < selectedCard.shape[r].length; c++) {
          if (selectedCard.shape[r][c]) {
            placed.add(`${row + r},${col + c}`);
          }
        }
      }

      // Check for line clears
      const { newBoard, clearedCount } = clearLines(boardAfterPlace);

      // Collect cleared cells for animation
      if (clearedCount > 0) {
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
      }

      // Remove selected card from hand
      const newHand = state.hand.filter((c) => c.id !== selectedCard.id);

      // Replenish hand if possible and hand is empty
      let finalHand = newHand;
      let finalDeck = state.deck;
      if (newHand.length === 0 && state.deck.length >= 7) {
        finalHand = state.deck.slice(0, 7);
        finalDeck = state.deck.slice(7);
      }

      const newScore = state.score + clearedCount * 100 + 10;
      const newClearedLines = state.clearedLines + clearedCount;

      if (clearedCount > 0) {
        setFlashScore(true);
        setTimeout(() => setFlashScore(false), 600);
      }

      const gameOver = isGameOver(finalHand, newBoard);

      setState({
        board: newBoard,
        hand: finalHand,
        deck: finalDeck,
        selectedCardId: null,
        score: newScore,
        clearedLines: newClearedLines,
        gameOver,
      });
    },
    [selectedCard, state]
  );

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

  const deckRemaining = state.deck.length;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="title">テトモック</h1>
        <div className="stats">
          <div className={`stat-block ${flashScore ? 'stat-block--flash' : ''}`}>
            <span className="stat-label">スコア</span>
            <span className="stat-value">{state.score.toLocaleString()}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">消去</span>
            <span className="stat-value">{state.clearedLines}</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">デッキ</span>
            <span className="stat-value">{deckRemaining}</span>
          </div>
          <button className="new-game-btn" onClick={handleNewGame}>
            新ゲーム
          </button>
        </div>
      </header>

      {/* Game Over Overlay */}
      {state.gameOver && (
        <div className="gameover-overlay">
          <div className="gameover-panel">
            <h2 className="gameover-title">ゲームオーバー</h2>
            <p className="gameover-score">
              最終スコア: <strong>{state.score.toLocaleString()}</strong>
            </p>
            <p className="gameover-lines">
              消去ライン: <strong>{state.clearedLines}</strong>
            </p>
            <button className="new-game-btn new-game-btn--large" onClick={handleNewGame}>
              もう一度プレイ
            </button>
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="hint">
        {selectedCard
          ? `「${selectedCard.type}」を選択中 — 盤面をクリックして配置 (Escでキャンセル)`
          : '手札のカードをクリックして選択してください'}
      </div>

      {/* Board */}
      <main className="game-area">
        <Board
          board={state.board}
          selectedCard={selectedCard}
          onCellClick={handleCellClick}
          clearedCells={clearedCells}
        />
      </main>

      {/* Hand */}
      <footer className="footer">
        <Hand
          hand={state.hand}
          selectedCardId={state.selectedCardId}
          onCardClick={handleCardClick}
        />
      </footer>
    </div>
  );
}
