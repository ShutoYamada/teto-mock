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
  getRandomArtifactByRarity,
} from './gameLogic';
import type { GameState, TetrominoCard, Enemy, Status, Artifact, BoardState } from './types';

function initGame(): GameState {
  const deck = buildDeck();
  return {
    screen: 'dungeon',
    board: createEmptyBoard(BOARD_SIZE),
    boardSize: BOARD_SIZE,
    deck,
    hand: [],
    discardPile: [],
    selectedCardId: null,
    hp: 50,
    maxHp: 50,
    mp: 5,
    maxMp: 5,
    gold: 0,
    statuses: [],
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
    artifacts: [
      createArtifact('brave_sword'),
      createArtifact('abacus'),
      createArtifact('champion_glove')
    ], // Initially give artifacts for testing
    rewardArtifact: null,
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
      
      let baseHandSize = 7;
      if (prev.artifacts.some(a => a.id === 'devil_statue')) {
        baseHandSize -= 1;
      }
      
      const hand = deck.splice(0, baseHandSize);
      
      const nodeParts = nodeId.split('-');
      const depth = parseInt(nodeParts[1], 10);
      
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

      const { newBoard, clearedCount, bombCount, manaCount, goldCount, borderCount, stripeCount, comboCount } = clearLines(boardAfterPlace);
      
      let combo = state.combo;
      if (clearedCount > 0) {
        let addedCombo = 1 + comboCount;
        if (comboCount > 0 && state.artifacts.some((a: Artifact) => a.id === 'champion_glove')) {
          addedCombo += 1;
        }
        combo += addedCombo;
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

      const targetEnemy = state.enemies.find(e => e.id === state.targetEnemyId);
      const damage = calculateDamage(
        boardAfterPlace, 
        selectedCard, 
        clearedCount, 
        combo, 
        borderCount, 
        stripeCount, 
        state.artifacts,
        state.statuses,
        targetEnemy?.statuses || [],
        targetEnemy?.type,
        state.deck.length + state.hand.length + state.discardPile.length,
        row,
        col
      );
      
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
        let rewardCount = 3;
        if (state.artifacts.some((a: Artifact) => a.id === 'white_card')) {
          rewardCount += 1;
        }
        rewardCards = generateRewardCards(rewardCount);

        // Elite Reward
        const hadElite = state.enemies.some(e => e.type === 'elite');
        if (hadElite) {
          rewardArtifact = getRandomArtifactByRarity(state.stage, state.artifacts);
        }
      }

      // Calculate Gold Reward
      let earnedGold = goldCount * 5;
      if (newEnemies.length === 0) {
        // Battle victory bonus: Sum of goldReward from ALL enemies in this encounter
        // Note: state.enemies contains the initial enemies for the turn
        const encounterGold = state.enemies.reduce((acc, e) => acc + e.goldReward, 0);
        earnedGold += encounterGold;

        // Apply Abacus Artifact (+10% gold)
        if (state.artifacts.some(a => a.id === 'abacus')) {
          earnedGold = Math.floor(earnedGold * 1.1);
        }
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
        gold: state.gold + earnedGold,
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
        
        let actualDamage = totalDamage;
        
        // Handle Player Fallen Status (1.5x damage taken)
        const isPlayerFallen = prev.statuses.some(s => s.type === 'fallen');
        if (isPlayerFallen) {
          actualDamage = Math.floor(actualDamage * 1.5);
        }

        actualDamage = Math.max(0, actualDamage - prev.shield);
        
        // Brave Shield
        if (prev.artifacts.some(a => a.id === 'brave_shield')) {
          actualDamage = Math.max(0, actualDamage - 1);
        }

        let newHp = prev.hp - actualDamage;
        if (newHp <= 0) newHp = 0;
        
        if (newHp === 0) {
          return { ...prev, hp: 0, screen: 'gameover' };
        }

        // Replenish Hand (Target 5 draws)
        let newHand: TetrominoCard[] = [];
        let newDeck = [...prev.deck];
        let newDiscardPile = [...prev.discardPile, ...prev.hand]; // Move leftovers to discard

        // Draw cards
        let targetDraw = 5;
        if (prev.artifacts.some(a => a.id === 'devil_statue')) {
          targetDraw -= 1;
        }

        for (let i = 0; i < targetDraw; i++) {
          if (newDeck.length === 0) {
            // Shuffle discard pile into deck
            newDeck = [...newDiscardPile].sort(() => Math.random() - 0.5);
            newDiscardPile = [];
          }
          if (newDeck.length > 0) {
            newHand.push(newDeck.shift()!);
          }
        }

        // Handle Player Reflect Damage to all enemies
        const playerReflect = prev.statuses.find(s => s.type === 'reflect');
        let processedEnemies = [...prev.enemies];
        if (playerReflect && enemyDamage > 0) {
          processedEnemies = processedEnemies.map(e => ({
            ...e,
            hp: Math.max(0, e.hp - playerReflect.value)
          }));
        }

        // Process enemy effects
        let currentBoard = prev.board;
        processedEnemies.forEach((enemy, idx) => {
           const template = Object.values(ENEMY_TEMPLATES).find(t => t.name === enemy.name);
           const action = template?.actions.find(a => a.name === enemy.intent.actionName);
           if (action?.effect) {
              const result = action.effect(enemy, { ...prev, board: currentBoard });
              if ('board' in result) {
                 currentBoard = result.board as BoardState;
              }
              processedEnemies[idx] = { ...processedEnemies[idx], ...result as Partial<Enemy> };
           }
        });

        // Filter out enemies that fled or died from effects
        processedEnemies = processedEnemies.filter(e => e.hp > 0);

        // Decide NEXT intents
        processedEnemies = processedEnemies.map(e => decideNextAction(e));

        // Decrement status turns for both player and enemies
        const updateStatuses = (statuses: Status[]) => {
          return statuses
            .map(s => (s.type === 'fallen' ? { ...s, value: s.value - 1 } : s))
            .filter(s => s.value > 0 || s.type !== 'fallen');
        };

        const newPlayerStatuses = updateStatuses(prev.statuses);
        const newEnemiesWithUpdatedStatuses = processedEnemies.map(e => ({
          ...e,
          statuses: updateStatuses(e.statuses)
        }));

        return {
          ...prev,
          hp: newHp,
          mp: prev.maxMp, // Restore MP at start of player turn
          board: currentBoard,
          shield: 0, // Armor disappears at start of your turn
          turn: 'player',
          enemies: newEnemiesWithUpdatedStatuses,
          statuses: newPlayerStatuses,
          hand: newHand,
          deck: newDeck,
          discardPile: newDiscardPile,
          combo: 0 // Reset combo on turn end
        };
      });
    }, 1000); 
  }, []);

  const handleArtifactSelect = useCallback((artifact: Artifact | null) => {
    setState((prev: GameState) => {
      if (!artifact) return { ...prev, rewardArtifact: null };
      return {
        ...prev,
        artifacts: [...prev.artifacts, artifact],
        rewardArtifact: null,
      };
    });
  }, []);

  const handleRewardSelect = useCallback((card: TetrominoCard) => {
    setState((prev: GameState) => {
      const isBoss = prev.currentNodeId?.split('-')[1] === '14'; // depth 14 is boss
      
      // Note: We don't have artifact rewards yet in this mock, 
      // but let's assume we might get figure_eight_charm.
      // For now, I'll just check if artifacts changed or manually check current ones.
      
      let boardSize = prev.boardSize;
      let board = prev.board;
      if (prev.artifacts.some((a: Artifact) => a.id === 'figure_eight_charm') && prev.boardSize === 7) {
        boardSize = 8;
        board = createEmptyBoard(8); // This clears board but artifact expansion usually happens between nodes
      }

      if (isBoss) {
        // You beat the 15th node!
        return {
           ...prev,
           deck: [...prev.deck, card],
           boardSize,
           board,
           screen: 'gameover',
           rewardCards: [],
        };
      }
      return {
        ...prev,
        deck: [...prev.deck, card],
        boardSize,
        board,
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
        <ResultScreen 
          state={state} 
          onSelectCard={handleRewardSelect} 
          onSelectArtifact={handleArtifactSelect}
        />
      )}
    </div>
  );
}
