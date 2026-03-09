import React, { useState, useCallback, useEffect } from 'react';
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
  generateDungeonMap,
  rotateShape,
  rotateBlockTypes,
  getRandomEnemy,
  decideNextAction,
  ENEMY_TEMPLATES,
  BOARD_SIZE,
  createArtifact,
} from './gameLogic';
import type { GameState, TetrominoCard, Enemy } from './types';

function initGame(): GameState {
  const deck = buildDeck();
  return {
    screen: 'dungeon',
    board: createEmptyBoard(),
    deck,
    hand: [],
    discardPile: [],
    selectedCardId: null,
    hp: 50,
    maxHp: 50,
    mp: 5,
    maxMp: 5,
    gold: 0,
    shield: 0,
    turn: 'player',
    combo: 0,
    enemies: [],
    targetEnemyId: null,
    stage: 1,
    dungeonMap: generateDungeonMap(),
    currentNodeId: null,
    rewardCards: [],
    score: 0,
    clearedLines: 0,
    artifacts: [createArtifact('brave_sword')], // Initially give Brave Sword for testing
  };
}

export default function App() {
  const [state, setState] = useState<GameState>(initGame);
  const [clearedCells, setClearedCells] = useState<Set<string>>(new Set());
  const [flashDamage, setFlashDamage] = useState(false);
  const [recentDamage, setRecentDamage] = useState(0);

  const selectedCard: TetrominoCard | null =
    state.hand.find((c: TetrominoCard) => c.id === state.selectedCardId) ?? null;

  const startBattle = useCallback((nodeId: string) => {
    setState((prev: GameState) => {
      // Draw initial hand
      let deck = [...prev.deck];
      if (deck.length < 7) deck = buildDeck();
      
      const hand = deck.splice(0, 7);
      
      const nodeParts = nodeId.split('-');
      const depth = parseInt(nodeParts[1], 10);
      
      const eHp = 40 + depth * 20; // Keep if needed for fallback, but getRandomEnemy uses its own ranges

      return {
        ...prev,
        screen: 'battle',
        board: createEmptyBoard(),
        hand,
        deck,
        discardPile: [],
        hp: prev.hp,
        mp: prev.maxMp, // Fully restore MP at battle start
        shield: 0,
        turn: 'player',
        combo: 0,
        currentNodeId: nodeId,
        stage: depth + 1,
        enemies: [
          getRandomEnemy(depth + 1, depth === 14 ? 'boss' : (depth % 3 === 0 && depth > 0 ? 'elite' : 'normal'))
        ],
        targetEnemyId: null, // Will be set by the getRandomEnemy result if we wanted, but let's just pick first
      };
    });
    setState(prev => ({ ...prev, targetEnemyId: prev.enemies[0]?.id || null }));
  }, []);

  const handleCardClick = useCallback((id: string) => {
    setState((prev: GameState) => {
      // Can only select if we have enough MP
      const card = prev.hand.find((c: TetrominoCard) => c.id === id);
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

      const { newBoard, clearedCount, bombCount, manaCount, goldCount, borderCount, stripeCount } = clearLines(boardAfterPlace);
      
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

      const damage = calculateDamage(boardAfterPlace, selectedCard, clearedCount, combo, borderCount, stripeCount, state.artifacts);
      
      // Calculate Shield granted by this card
      let addedShields = 0;
      if (selectedCard.blockTypes) {
         for (let r = 0; r < selectedCard.blockTypes.length; r++) {
            for (let c = 0; c < selectedCard.blockTypes[r].length; c++) {
               if (selectedCard.blockTypes[r][c] === 'shield' && selectedCard.shape[r][c]) {
                   addedShields++;
               }
            }
         }
      }
      
      const newShield = state.shield + addedShields;

      // Handle Draw Blocks
      let drawnCardsCount = 0;
      if (selectedCard.blockTypes) {
        for (let r = 0; r < selectedCard.blockTypes.length; r++) {
          for (let c = 0; c < selectedCard.blockTypes[r].length; c++) {
            if (selectedCard.blockTypes[r][c] === 'draw' && selectedCard.shape[r][c]) {
              drawnCardsCount++;
            }
          }
        }
      }

      let newHand = state.hand.filter((c: TetrominoCard) => c.id !== selectedCard.id);
      let newDeck = [...state.deck];
      let newDiscardPile = [...state.discardPile, selectedCard];

      for (let i = 0; i < drawnCardsCount; i++) {
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          newDeck = [...newDiscardPile].sort(() => Math.random() - 0.5);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          newHand.push(newDeck.shift()!);
        }
      }
      const totalTargetDamage = damage + bombCount * 10;
      if (totalTargetDamage > 0) {
        setRecentDamage(totalTargetDamage);
        setFlashDamage(true);
        setTimeout(() => setFlashDamage(false), 500);
      }

      let newEnemies = state.enemies.map((e: Enemy) => {
        let enemyDamage = bombCount * 10;
        if (e.id === state.targetEnemyId) {
           enemyDamage += damage;
        }
        
        // Handle Enemy Statuses
        let actualEnemyDamage = enemyDamage;
        const defense = e.statuses.find(s => s.type === 'defense');
        if (defense) {
          actualEnemyDamage = Math.max(0, actualEnemyDamage - defense.value);
          // Remove defense status after it's used
        }

        const isFallen = e.statuses.some(s => s.type === 'fallen');
        if (isFallen) {
          actualEnemyDamage = Math.floor(actualEnemyDamage * 1.5);
        }

        const newStatuses = e.statuses.filter(s => s.type !== 'defense');

        return { 
          ...e, 
          hp: Math.max(0, e.hp - actualEnemyDamage),
          statuses: newStatuses
        };
      });

      // Handle Reflect Damage
      let reflectDamage = 0;
      state.enemies.forEach(e => {
        if (e.id === state.targetEnemyId) {
          const reflect = e.statuses.find(s => s.type === 'reflect');
          if (reflect && damage > 0) {
            reflectDamage += reflect.value;
          }
        }
      });

      // Filter out dead enemies
      newEnemies = newEnemies.filter((e: Enemy) => e.hp > 0);
      
      const targetStillAlive = newEnemies.some((e: Enemy) => e.id === state.targetEnemyId);
      const newTargetId = targetStillAlive ? state.targetEnemyId : (newEnemies[0]?.id ?? null);
      
      let newMp = state.mp - selectedCard.cost + manaCount;
      if (newMp > state.maxMp) newMp = state.maxMp;
      
      const newScore = state.score + clearedCount * 100 + damage * 10 + bombCount * 100;
      const newClearedLines = state.clearedLines + clearedCount;
      
      let nextScreen = state.screen;
      let rewardCards: TetrominoCard[] = [];
      
      if (newEnemies.length === 0) {
        // Victory!
        nextScreen = 'result';
        rewardCards = generateRewardCards();
      }

      setState({
        ...state,
        screen: nextScreen,
        board: newBoard,
        hand: newHand,
        discardPile: newDiscardPile,
        selectedCardId: null,
        mp: newMp,
        shield: newShield,
        combo,
        enemies: newEnemies,
        targetEnemyId: newTargetId,
        score: newScore,
        clearedLines: newClearedLines,
        rewardCards,
        gold: newEnemies.length === 0 ? state.gold + state.stage * 10 + goldCount * 5 : state.gold + goldCount * 5,
        hp: Math.max(0, state.hp - reflectDamage),
      });
    },
    [selectedCard, state]
  );

  const handleTurnEnd = useCallback(() => {
    // Enemy Turn
    setState((prev: GameState) => ({ ...prev, turn: 'enemy', selectedCardId: null }));
    
    setTimeout(() => {
      setState((prev: GameState) => {
        // Handle Spike blocks (self-damage)
        let spikeDamage = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (prev.board[r][c]?.blockType === 'spike') {
              spikeDamage++;
            }
          }
        }

        const enemyDamage = prev.enemies.reduce((acc: number, enemy: Enemy) => acc + enemy.nextAttack, 0);
        const totalDamage = spikeDamage + enemyDamage;
        
        let actualDamage = totalDamage - prev.shield;
        if (actualDamage < 0) actualDamage = 0;
        
        let newHp = prev.hp - actualDamage;
        if (newHp <= 0) newHp = 0;
        
        if (newHp === 0) {
          return { ...prev, hp: 0, screen: 'gameover' };
        }

        // Replenish Hand (Target 5 draws)
        let newHand = [];
        let newDeck = [...prev.deck];
        let newDiscardPile = [...prev.discardPile, ...prev.hand]; // Move leftovers to discard

        // Draw 5 cards
        for (let i = 0; i < 5; i++) {
          if (newDeck.length === 0) {
            // Shuffle discard pile into deck
            newDeck = [...newDiscardPile].sort(() => Math.random() - 0.5);
            newDiscardPile = [];
          }
          if (newDeck.length > 0) {
            newHand.push(newDeck.shift()!);
          }
        }

        // Update enemy intents and process effects
        // Execute enemy effects for the turn that JUST ended (the turn they just took)
        // Actually, the intent describes what they DID. So we should have executed effects
        // Or process them now. Let's process the effects of the enemies BEFORE we decide new intents.
        
        // Wait, the flow is:
        // 1. Current Enemy Intent is executed (Damage + Effect)
        // 2. Decide NEW Intent for the next turn.

        // So let's re-organized handleTurnEnd:
        let processedEnemies = [...prev.enemies];

        processedEnemies.forEach(enemy => {
           const template = (Object.values(ENEMY_TEMPLATES) as any[]).find(t => t.name === enemy.name);
           // We should store which ACTION was selected in the enemy object or template lookup.
           // For now, let's just look at the action name in the intent.
           const action = template?.actions.find((a: any) => a.name === enemy.intent.actionName);
           if (action?.effect) {
              const result = action.effect(enemy, prev);
              // Simple merge for enemy updates
              const enemyIdx = processedEnemies.findIndex(e => e.id === enemy.id);
              processedEnemies[enemyIdx] = { ...processedEnemies[enemyIdx], ...result as Partial<Enemy> };
              // Simple merge for state updates (e.g. if we add player damage effect)
              // stateMod = { ...stateMod, ...result as Partial<GameState> };
           }
        });

        // Filter out enemies that fled or died from effects
        processedEnemies = processedEnemies.filter(e => e.hp > 0);

        // Decide NEXT intents
        processedEnemies = processedEnemies.map(e => decideNextAction(e));

        return {
          ...prev,
          hp: newHp,
          mp: prev.maxMp, // Restore MP at start of player turn
          shield: 0, // Armor disappears at start of your turn
          turn: 'player',
          enemies: processedEnemies,
          hand: newHand,
          deck: newDeck,
          discardPile: newDiscardPile,
          combo: 0 // Reset combo on turn end
        };
      });
    }, 1000); 
  }, []);

  const handleRewardSelect = useCallback((card: TetrominoCard) => {
    setState((prev: GameState) => {
      const isBoss = prev.currentNodeId?.split('-')[1] === '14'; // depth 14 is boss
      
      if (isBoss) {
        // You beat the 15th node!
        return {
           ...prev,
           deck: [...prev.deck, card],
           screen: 'gameover',
           rewardCards: [],
        };
      }
      return {
        ...prev,
        deck: [...prev.deck, card],
        screen: 'dungeon',
        rewardCards: [],
      };
    });
  }, []);

  const handleNewGame = useCallback(() => {
    setClearedCells(new Set());
    setState(initGame());
  }, []);

  // Deselect on Escape, Rotate on R or Up Arrow
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState((prev: GameState) => ({ ...prev, selectedCardId: null }));
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowUp') {
        setState((prev: GameState) => {
          if (!prev.selectedCardId) return prev;
          const cardIndex = prev.hand.findIndex((c: TetrominoCard) => c.id === prev.selectedCardId);
          if (cardIndex === -1) return prev;
          
          const newHand = [...prev.hand];
          const oldCard = newHand[cardIndex];
          newHand[cardIndex] = {
            ...oldCard,
            shape: rotateShape(oldCard.shape),
            blockTypes: oldCard.blockTypes ? rotateBlockTypes(oldCard.blockTypes) : undefined,
          };
          
          return { ...prev, hand: newHand };
        });
      }
    };
    
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent standard right-click menu
      setState((prev: GameState) => {
        if (!prev.selectedCardId) return prev;
        const cardIndex = prev.hand.findIndex((c: TetrominoCard) => c.id === prev.selectedCardId);
        if (cardIndex === -1) return prev;
        
        const newHand = [...prev.hand];
        const oldCard = newHand[cardIndex];
        newHand[cardIndex] = {
          ...oldCard,
          shape: rotateShape(oldCard.shape),
          blockTypes: oldCard.blockTypes ? rotateBlockTypes(oldCard.blockTypes) : undefined,
        };
        
        return { ...prev, hand: newHand };
      });
    };
    
    window.addEventListener('keydown', onKey);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('contextmenu', onContextMenu);
    };
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
          <div className="stat-block">
            <span className="stat-label">アーティファクト</span>
            <div className="artifact-list">
              {state.artifacts.map(a => (
                <span key={a.id} className="artifact-icon" title={a.description}>⚔️</span>
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
        <DungeonScreen state={state} onEnterNode={startBattle} />
      )}

      {state.screen === 'battle' && (
        <BattleScreen
          state={state}
          selectedCard={selectedCard}
          onCellClick={handleCellClick}
          onCardClick={handleCardClick}
          onTurnEnd={handleTurnEnd}
          onTargetClick={(id) => setState(prev => ({ ...prev, targetEnemyId: id }))}
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
