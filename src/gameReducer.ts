import { GameState, TetrominoCard, Artifact, BoardState, Enemy, Status, BlockType } from './types';
import { buildDeck, generateRewardCards, generateShopCards, getCardPrice } from './tetrominos';
import {
  createEmptyBoard,
  canPlaceCard,
  placeCard,
  clearLines,
  generateDungeonMap,
  rotateShape,
  rotateBlockTypes,
  getEnemyEncounter,
  decideNextAction,
  ENEMY_TEMPLATES,
  BOARD_SIZE,
  createArtifact,
  getRandomArtifactByRarity,
  generateShopArtifacts,
  getArtifactPrice,
} from './gameLogic';
import { createDamagePipelineAndCalculate } from './battle/events/DamagePipeline';

export type GameCommand =
  | { type: 'START_BATTLE'; nodeId: string }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'PLACE_CARD'; row: number; col: number; damageResultCallback?: (damage: number, bombCount: number, cleared: Set<string>) => void }
  | { type: 'SET_TARGET_ENEMY'; enemyId: string }
  | { type: 'END_PLAYER_TURN' }
  | { type: 'EXECUTE_ENEMY_TURN'; targetEnemyStillTauntingId?: string }
  | { type: 'SELECT_ARTIFACT'; artifact: Artifact | null }
  | { type: 'SELECT_REWARD'; card: TetrominoCard }
  | { type: 'REST_HEAL' }
  | { type: 'REST_REMOVE_CARDS'; cardIds: string[] }
  | { type: 'REST_SKIP' }
  | { type: 'NEW_GAME' }
  | { type: 'ROTATE_CARD'; cardId: string }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'BUY_CARD'; cardId: string }
  | { type: 'BUY_ARTIFACT'; artifactId: string }
  | { type: 'LEAVE_SHOP' };

export function initGame(): GameState {
  const deck = buildDeck();
  return {
    screen: 'dungeon',
    board: createEmptyBoard(BOARD_SIZE),
    boardSize: BOARD_SIZE,
    deck,
    hand: [],
    discardPile: [],
    exilePile: [],
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
    shopCards: [],
    shopArtifacts: [],
    score: 0,
    clearedLines: 0,
    artifacts: [
      createArtifact('brave_sword'),
      createArtifact('abacus'),
      createArtifact('champion_glove'),
      createArtifact('mana_stone')
    ], // Initially give artifacts for testing
    rewardArtifact: null,
  };
}

export function gameReducer(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case 'NEW_GAME':
      return initGame();

    case 'START_BATTLE': {
      let deck = [...state.deck];
      if (deck.length < 7) deck = buildDeck();
      
      let baseHandSize = 7;
      if (state.artifacts.some(a => a.id === 'devil_statue')) {
        baseHandSize -= 1;
      }
      
      const hand = deck.splice(0, baseHandSize);
      
      const nodeParts = command.nodeId.split('-');
      const depth = parseInt(nodeParts[1], 10);
      const targetNode = state.dungeonMap.find(n => n.id === command.nodeId);

      if (targetNode?.type === 'rest') {
        return {
          ...state,
          screen: 'rest',
          currentNodeId: command.nodeId,
          stage: depth + 1,
        };
      } else if (targetNode?.type === 'shop') {
        return {
          ...state,
          screen: 'shop',
          currentNodeId: command.nodeId,
          stage: depth + 1,
          shopCards: generateShopCards(5),
          shopArtifacts: generateShopArtifacts(state.artifacts, 3),
        };
      }
      
      const enemies = getEnemyEncounter(depth + 1, depth === 14 ? 'boss' : (depth % 3 === 0 && depth > 0 ? 'elite' : 'normal'));
      const targetEnemyId = enemies[0]?.id || null;
      
      let board = createEmptyBoard();
      if (state.artifacts.some(a => a.id === 'mana_stone')) {
        board[0][0] = { type: 'I', blockType: 'mana' as BlockType };
        board[BOARD_SIZE - 1][BOARD_SIZE - 1] = { type: 'I', blockType: 'mana' as BlockType };
      }

      return {
        ...state,
        screen: 'battle',
        board,
        hand,
        deck,
        discardPile: [],
        exilePile: [],
        hp: state.hp,
        mp: state.maxMp,
        shield: 0,
        turn: 'player',
        combo: 0,
        currentNodeId: command.nodeId,
        stage: depth + 1,
        enemies,
        targetEnemyId,
      };
    }

    case 'SELECT_CARD': {
      const card = state.hand.find(c => c.id === command.cardId);
      if (card && state.mp < card.cost) {
        return state;
      }
      return {
        ...state,
        selectedCardId: state.selectedCardId === command.cardId ? null : command.cardId,
      };
    }

    case 'CANCEL_SELECTION': {
      return { ...state, selectedCardId: null };
    }

    case 'ROTATE_CARD': {
      const cardIndex = state.hand.findIndex(c => c.id === command.cardId);
      if (cardIndex === -1) return state;
      
      const newHand = [...state.hand];
      const oldCard = newHand[cardIndex];
      newHand[cardIndex] = {
        ...oldCard,
        shape: rotateShape(oldCard.shape),
        blockTypes: oldCard.blockTypes ? rotateBlockTypes(oldCard.blockTypes) : undefined,
      };
      
      return { ...state, hand: newHand };
    }

    case 'PLACE_CARD': {
      const selectedCard = state.hand.find(c => c.id === state.selectedCardId);
      if (!selectedCard || state.turn !== 'player') return state;
      if (state.mp < selectedCard.cost) return state;
      if (!canPlaceCard(state.board, selectedCard, command.row, command.col)) return state;

      const boardAfterPlace = placeCard(state.board, selectedCard, command.row, command.col);
      const clearResult = clearLines(boardAfterPlace);
      const { newBoard, clearedCount, bombCount, manaCount, goldCount, borderCount, stripeCount, comboCount, bowCount, heartCount } = clearResult;
      
      let combo = state.combo;
      const cleared = new Set<string>();
      if (clearedCount > 0) {
        let addedCombo = 1 + comboCount;
        if (comboCount > 0 && state.artifacts.some(a => a.id === 'champion_glove')) {
          addedCombo += 1;
        }
        combo += addedCombo;
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardAfterPlace[r][c] !== null && newBoard[r][c] === null) {
              cleared.add(`${r},${c}`);
            }
          }
        }
      } else {
        combo = 0; 
      }

      const targetEnemy = state.enemies.find(e => e.id === state.targetEnemyId);
      const damage = createDamagePipelineAndCalculate(
        state,
        selectedCard,
        clearedCount,
        combo,
        borderCount,
        stripeCount,
        command.row,
        command.col,
        targetEnemy
      );
      
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

      let newHand = state.hand.filter(c => c.id !== selectedCard.id);
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
      if (command.damageResultCallback && totalTargetDamage > 0) {
        command.damageResultCallback(totalTargetDamage, bombCount, cleared);
      }

      let newEnemies = state.enemies.map(e => {
        let enemyDamage = bombCount * 10;
        if (e.id === state.targetEnemyId || bowCount > 0) {
           enemyDamage += damage;
        }
        
        let actualEnemyDamage = enemyDamage;
        const defense = e.statuses.find(s => s.type === 'defense');
        if (defense) {
          actualEnemyDamage = Math.max(0, actualEnemyDamage - defense.value);
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

      let reflectDamage = 0;
      state.enemies.forEach(e => {
        if (e.id === state.targetEnemyId) {
          const reflect = e.statuses.find(s => s.type === 'reflect');
          if (reflect && damage > 0) {
            reflectDamage += reflect.value;
          }
        }
      });

      newEnemies = newEnemies.filter(e => e.hp > 0);
      const targetStillAlive = newEnemies.some(e => e.id === state.targetEnemyId);
      const newTargetId = targetStillAlive ? state.targetEnemyId : (newEnemies[0]?.id ?? null);
      
      let newMp = state.mp - selectedCard.cost + manaCount;
      if (newMp > state.maxMp) newMp = state.maxMp;
      
      const newScore = state.score + clearedCount * 100 + damage * 10 + bombCount * 100;
      const newClearedLines = state.clearedLines + clearedCount;
      
      let nextScreen = state.screen;
      let rewardCards: TetrominoCard[] = [];
      let rewardArtifact: Artifact | null = null;
      let earnedGold = goldCount * 5;

      if (newEnemies.length === 0) {
        nextScreen = 'result';
        let rewardCount = 3;
        if (state.artifacts.some(a => a.id === 'white_card')) {
          rewardCount += 1;
        }
        rewardCards = generateRewardCards(rewardCount);

        const hadElite = state.enemies.some(e => e.type === 'elite');
        if (hadElite) {
          rewardArtifact = getRandomArtifactByRarity(state.stage, state.artifacts);
        }

        const encounterGold = state.enemies.reduce((acc, e) => acc + e.goldReward, 0);
        earnedGold += encounterGold;

        if (state.artifacts.some(a => a.id === 'abacus')) {
          earnedGold = Math.floor(earnedGold * 1.1);
        }
      }

      return {
        ...state,
        screen: nextScreen,
        board: newBoard,
        hand: newEnemies.length === 0 ? [] : newHand,
        discardPile: newEnemies.length === 0 ? [] : newDiscardPile,
        exilePile: newEnemies.length === 0 ? [] : state.exilePile,
        deck: newEnemies.length === 0 ? [...state.deck, ...newHand, ...newDiscardPile, ...state.exilePile] : state.deck,
        selectedCardId: null,
        mp: newMp,
        shield: newShield,
        combo,
        enemies: newEnemies,
        targetEnemyId: newTargetId,
        score: newScore,
        clearedLines: newClearedLines,
        rewardCards,
        rewardArtifact,
        gold: state.gold + earnedGold,
        hp: Math.min(state.maxHp, Math.max(0, state.hp - reflectDamage + heartCount * 3)),
      };
    }

    case 'END_PLAYER_TURN': {
      return { ...state, turn: 'enemy', selectedCardId: null };
    }

    case 'EXECUTE_ENEMY_TURN': {
      let spikeDamage = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (state.board[r][c]?.blockType === 'spike') {
            spikeDamage++;
          }
        }
      }

      const enemyDamage = state.enemies.reduce((acc, enemy) => acc + enemy.nextAttack, 0);
      const totalDamage = spikeDamage + enemyDamage;
      
      let actualDamage = totalDamage;
      
      const isPlayerFallen = state.statuses.some(s => s.type === 'fallen');
      if (isPlayerFallen) {
        actualDamage = Math.floor(actualDamage * 1.5);
      }

      actualDamage = Math.max(0, actualDamage - state.shield);
      
      if (state.artifacts.some(a => a.id === 'brave_shield')) {
        actualDamage = Math.max(0, actualDamage - 1);
      }

      let newHp = state.hp - actualDamage;
      if (newHp <= 0) newHp = 0;
      
      if (newHp === 0) {
        return { ...state, hp: 0, screen: 'gameover' };
      }

      let newHand: TetrominoCard[] = [];
      let newDeck = [...state.deck];
      let newDiscardPile = [...state.discardPile, ...state.hand];

      let targetDraw = 5;
      if (state.artifacts.some(a => a.id === 'devil_statue')) {
        targetDraw -= 1;
      }

      for (let i = 0; i < targetDraw; i++) {
        if (newDeck.length === 0) {
          newDeck = [...newDiscardPile].sort(() => Math.random() - 0.5);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          newHand.push(newDeck.shift()!);
        }
      }

      const playerReflect = state.statuses.find(s => s.type === 'reflect');
      let processedEnemies = [...state.enemies];
      if (playerReflect && enemyDamage > 0) {
        processedEnemies = processedEnemies.map(e => ({
          ...e,
          hp: Math.max(0, e.hp - playerReflect.value)
        }));
      }

      let currentBoard = state.board;
      let currentGold = state.gold;
      processedEnemies.forEach((enemy, idx) => {
         const template = Object.values(ENEMY_TEMPLATES).find(t => t.name === enemy.name);
         const action = template?.actions.find(a => a.name === enemy.intent.actionName);
         if (action?.effect) {
            const result = action.effect(enemy, { ...state, board: currentBoard, gold: currentGold, enemies: processedEnemies });
            if ('board' in result) {
               currentBoard = result.board as BoardState;
            }
            if ('gold' in result) {
              currentGold = result.gold as number;
            }
            if ('enemies' in result) {
              processedEnemies = result.enemies as Enemy[];
            }
            processedEnemies[idx] = { ...processedEnemies[idx], ...result as Partial<Enemy> };
         }
      });

      processedEnemies = processedEnemies.filter(e => e.hp > 0);

      let nextScreen = state.screen;
      let rewardCards: TetrominoCard[] = [];
      let rewardArtifact: Artifact | null = null;
      let finalGold = currentGold;

      if (processedEnemies.length === 0 && newHp > 0) {
        nextScreen = 'result';
        let rewardCount = 3;
        if (state.artifacts.some(a => a.id === 'white_card')) {
          rewardCount += 1;
        }
        rewardCards = generateRewardCards(rewardCount);

        const hadElite = state.enemies.some(e => e.type === 'elite');
        if (hadElite) {
          rewardArtifact = getRandomArtifactByRarity(state.stage, state.artifacts);
        }

        const encounterGold = state.enemies.reduce((acc, e) => acc + e.goldReward, 0);
        let earnedGold = encounterGold;
        if (state.artifacts.some(a => a.id === 'abacus')) {
          earnedGold = Math.floor(earnedGold * 1.1);
        }
        finalGold += earnedGold;
      }

      processedEnemies = processedEnemies.map(e => decideNextAction(e));

      const updateStatuses = (statuses: Status[]) => {
        return statuses
          .map(s => (s.type === 'fallen' || s.type === 'taunt' ? { ...s, value: s.value - 1 } : s))
          .filter(s => s.value > 0 || (s.type !== 'fallen' && s.type !== 'taunt'));
      };

      const newPlayerStatuses = updateStatuses(state.statuses);
      const newEnemiesWithUpdatedStatuses = processedEnemies.map(e => ({
        ...e,
        statuses: updateStatuses(e.statuses)
      }));

      // Ensure target is valid (respect Taunt)
      let nextTargetEnemyId = state.targetEnemyId;
      const tauntingEnemy = newEnemiesWithUpdatedStatuses.find(e => e.statuses.some(s => s.type === 'taunt'));
      if (command.targetEnemyStillTauntingId) {
        nextTargetEnemyId = command.targetEnemyStillTauntingId;
      } else if (tauntingEnemy) {
        nextTargetEnemyId = tauntingEnemy.id;
      }

      return {
        ...state,
        screen: nextScreen,
        hp: newHp,
        mp: state.maxMp,
        board: currentBoard,
        gold: finalGold,
        shield: 0,
        turn: 'player',
        enemies: newEnemiesWithUpdatedStatuses,
        targetEnemyId: nextTargetEnemyId,
        statuses: newPlayerStatuses,
        hand: nextScreen === 'result' ? [] : newHand,
        deck: nextScreen === 'result' ? [...newDeck, ...newHand, ...newDiscardPile, ...state.exilePile] : newDeck,
        discardPile: nextScreen === 'result' ? [] : newDiscardPile,
        exilePile: nextScreen === 'result' ? [] : state.exilePile,
        combo: 0,
        rewardCards,
        rewardArtifact,
      };
    }

    case 'SET_TARGET_ENEMY': {
      const tauntingEnemy = state.enemies.find(e => e.statuses.some(s => s.type === 'taunt'));
      if (tauntingEnemy && !state.enemies.find(e => e.id === command.enemyId)?.statuses.some(s => s.type === 'taunt')) {
        return state;
      }
      return { ...state, targetEnemyId: command.enemyId };
    }

    case 'SELECT_ARTIFACT': {
      if (!command.artifact) return { ...state, rewardArtifact: null };
      return {
        ...state,
        artifacts: [...state.artifacts, command.artifact],
        rewardArtifact: null,
      };
    }

    case 'SELECT_REWARD': {
      const isBoss = state.currentNodeId?.split('-')[1] === '14';
      let boardSize = state.boardSize;
      let board = state.board;
      if (state.artifacts.some(a => a.id === 'figure_eight_charm') && state.boardSize === 7) {
        boardSize = 8;
        board = createEmptyBoard(8);
      }

      if (isBoss) {
        return {
           ...state,
           deck: [...state.deck, command.card],
           boardSize,
           board,
           screen: 'gameover',
           rewardCards: [],
        };
      }
      return {
        ...state,
        deck: [...state.deck, command.card],
        boardSize,
        board,
        screen: 'dungeon',
        rewardCards: [],
      };
    }

    case 'REST_HEAL': {
      const hasCoffee = state.artifacts.some(a => a.id === 'drip_coffee');
      const healAmount = Math.floor(state.maxHp * (hasCoffee ? 0.4 : 0.2));
      return {
        ...state,
        hp: Math.min(state.maxHp, state.hp + healAmount),
        screen: 'dungeon',
      };
    }

    case 'REST_REMOVE_CARDS': {
      const newDeck = state.deck.filter(c => !command.cardIds.includes(c.id));
      return {
        ...state,
        deck: newDeck,
        screen: 'dungeon',
      };
    }

    case 'REST_SKIP': {
      return {
        ...state,
        screen: 'dungeon',
      };
    }

    case 'BUY_CARD': {
      const cardIndex = state.shopCards.findIndex(c => c.id === command.cardId);
      if (cardIndex === -1) return state;
      const card = state.shopCards[cardIndex];
      const price = getCardPrice(card);
      if (state.gold < price) return state;
      
      const newShopCards = [...state.shopCards];
      newShopCards.splice(cardIndex, 1);
      
      return {
        ...state,
        gold: state.gold - price,
        deck: [...state.deck, card],
        shopCards: newShopCards,
      };
    }

    case 'BUY_ARTIFACT': {
      const artifactIndex = state.shopArtifacts.findIndex(a => a.id === command.artifactId);
      if (artifactIndex === -1) return state;
      const artifact = state.shopArtifacts[artifactIndex];
      const price = getArtifactPrice(artifact);
      if (state.gold < price) return state;
      
      const newShopArtifacts = [...state.shopArtifacts];
      newShopArtifacts.splice(artifactIndex, 1);
      
      return {
        ...state,
        gold: state.gold - price,
        artifacts: [...state.artifacts, artifact],
        shopArtifacts: newShopArtifacts,
      };
    }

    case 'LEAVE_SHOP': {
      return {
        ...state,
        screen: 'dungeon',
      };
    }

    default:
      return state;
  }
}
