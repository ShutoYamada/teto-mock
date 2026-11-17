import { getEventPool, resolveExplorationEvent, enhanceBasicCard } from './events/explorationEvents';
import { GameState, TetrominoCard, TetrominoType, Artifact, BoardState, Enemy, Status, BlockType } from './types';
import { buildDeck, generateRewardCards, generateShopCards, getCardPrice, BASIC_ENHANCEMENTS } from './tetrominos';
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
import { rollBoss, createBossEncounter, prepareBossTurn, bossDamageModifiers, onBossLines, endBossPlayerTurn, executeBossTurn } from './battle/bosses';
import { TETROMINO_DEFS } from './tetrominos';

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
  | { type: 'LEAVE_SHOP' }
  | { type: 'EVENT_ASSAULT_FIGHT' }
  | { type: 'EVENT_ASSAULT_FLEE' }
  | { type: 'EVENT_MERCHANT_STEAL' }
  | { type: 'EVENT_MERCHANT_RETURN' }
  | { type: 'EVENT_FAIRY_MIRROR_DUPLICATE'; cardId: string }
  | { type: 'EVENT_FAIRY_MIRROR_IGNORE' }
  | { type: 'EVENT_MYSTERY_DIVE' }
  | { type: 'EVENT_MYSTERY_THROW'; cardId: string }
  | { type: 'EVENT_MYSTERY_IGNORE' }
  | { type: 'EVENT_SUSPICIOUS_MAGIC_ENHANCE'; minoType: TetrominoType }
  | { type: 'EVENT_SUSPICIOUS_MAGIC_LEAVE' }
  | { type: 'EVENT_EXPLORE_RESOLVE'; cardId?: string; minoType?: TetrominoType }
  | { type: 'EVENT_LEAVE' }
  | { type: 'EVENT_CONTINUE' };

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
    stageBoss: rollBoss(1),
    bossBattle: null,
    encounterGold: 0,
    encounterHasElite: false,
    rewardGold: 0,
    dungeonMap: generateDungeonMap(),
    currentNodeId: null,
    currentEventId: null,
    eventResult: null,
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

function finishBattle(state: GameState): GameState {
  if (state.hp <= 0) return { ...state, hp: 0, screen: 'gameover', bossBattle: null };
  const won = state.bossBattle
    ? !state.enemies.some(e => e.bossRole !== 'minion' && e.hp > 0)
    : !state.enemies.some(e => e.hp > 0);
  if (!won) return state;
  const rewardGold = Math.floor(state.encounterGold * (state.artifacts.some(a => a.id === 'abacus') ? 1.1 : 1));
  return {
    ...state, screen: 'result', bossBattle: null, enemies: [], targetEnemyId: null,
    board: state.board.map(row => row.map(cell => cell?.blockType === 'spore' ? null : cell)),
    statuses: [],
    deck: [...state.deck, ...state.hand, ...state.discardPile, ...state.exilePile],
    hand: [], discardPile: [], exilePile: [], selectedCardId: null,
    gold: state.gold + rewardGold, rewardGold,
    rewardCards: generateRewardCards(state.artifacts.some(a => a.id === 'white_card') ? 4 : 3),
    rewardArtifact: state.encounterHasElite ? getRandomArtifactByRarity(state.stage, state.artifacts) : null,
  };
}

function drawNextHand(state: GameState): GameState {
  let deck = [...state.deck];
  let discardPile = [...state.discardPile, ...state.hand];
  const hand: TetrominoCard[] = [];
  const reduction = state.statuses.find(s => s.type === 'draw_down')?.value ?? 0;
  const count = Math.max(1, 5 - reduction - (state.artifacts.some(a => a.id === 'devil_statue') ? 1 : 0));
  for (let i = 0; i < count; i++) {
    if (!deck.length) { deck = [...discardPile].sort(() => Math.random() - .5); discardPile = []; }
    if (deck.length) hand.push(deck.shift()!);
  }
  const tick = (statuses: Status[]) => statuses.flatMap(s => {
    if (s.type === 'draw_down') return [];
    if (s.type === 'fallen' || s.type === 'taunt' || s.type === 'charging') return s.value > 1 ? [{ ...s, value: s.value - 1 }] : [];
    return [s];
  });
  let board = state.board;
  if (state.artifacts.some(a => a.id === 'rolling_stone')) {
    board = board.map(row => [...row]);
    const empty: [number, number][] = [];
    board.forEach((row, r) => row.forEach((c, col) => { if (!c) empty.push([r, col]); }));
    for (let i = 0; i < 2 && empty.length; i++) {
      const [r, c] = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
      board[r][c] = { type: 'I', blockType: 'hard' };
    }
  }
  const enemies = state.enemies.map(e => ({ ...e, statuses: tick(e.statuses) }));
  return { ...state, board, hand, deck, discardPile, enemies, statuses: tick(state.statuses), mp: state.maxMp, shield: 0, turn: 'player', combo: 0,
    targetEnemyId: enemies.some(e => e.id === state.targetEnemyId) ? state.targetEnemyId : enemies[0]?.id ?? null };
}

export function gameReducer(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case 'NEW_GAME':
      return initGame();

    case 'START_BATTLE': {
      if (state.screen !== 'dungeon') return state;
      const node = state.dungeonMap.find(n => n.id === command.nodeId);
      const reachable = state.currentNodeId ? state.dungeonMap.find(n => n.id === state.currentNodeId)?.nextNodes.includes(command.nodeId) : node?.depth === 0;
      if (!node || !reachable) return state;
      // Preserve knowledge of nodes revealed from both the old and new location.
      const visibleIds = new Set([node.id, ...node.nextNodes,
        ...(state.dungeonMap.find(n => n.id === state.currentNodeId)?.nextNodes ?? [])]);
      state = { ...state, dungeonMap: state.dungeonMap.map(n => visibleIds.has(n.id) ? { ...n, revealed: true } : n) };
      let deck = [...state.deck];
      // Small decks remain intact after permanent card removal.
      
      let baseHandSize = 7;
      if (state.artifacts.some(a => a.id === 'devil_statue')) {
        baseHandSize -= 1;
      }
      
      const hand = deck.splice(0, baseHandSize);
      
      const targetNode = state.dungeonMap.find(n => n.id === command.nodeId);

      if (targetNode?.type === 'rest') {
        return {
          ...state,
          screen: 'rest',
          currentNodeId: command.nodeId,
        };
      } else if (targetNode?.type === 'shop') {
        return {
          ...state,
          screen: 'shop',
          currentNodeId: command.nodeId,
          shopCards: generateShopCards(5),
          shopArtifacts: generateShopArtifacts(state.artifacts, 3),
        };
      } else if (targetNode?.type === 'event') {
        const isShop = Math.random() < 0.1;
        if (isShop) {
          return {
            ...state,
            screen: 'shop',
            currentNodeId: command.nodeId,
            shopCards: generateShopCards(5),
            shopArtifacts: generateShopArtifacts(state.artifacts, 3),
          };
        } else {
          const events = getEventPool(state.stage);
          const randomEvent = events[Math.floor(Math.random() * events.length)];
          return {
            ...state,
            screen: 'event',
            currentNodeId: command.nodeId,
            currentEventId: randomEvent,
            eventResult: null,
          };
        }
      }
      
      const bossEncounter = targetNode?.type === 'boss' ? createBossEncounter(state.stageBoss) : null;
      const enemies = bossEncounter?.enemies ?? getEnemyEncounter(state.stage, targetNode?.type === 'elite' ? 'elite' : 'normal');
      const targetEnemyId = enemies[0]?.id || null;
      
      let board = createEmptyBoard(state.boardSize);
      if (state.artifacts.some(a => a.id === 'mana_stone')) {
        board[0][0] = { type: 'I', blockType: 'mana' as BlockType };
        board[state.boardSize - 1][state.boardSize - 1] = { type: 'I', blockType: 'mana' as BlockType };
      }

      return prepareBossTurn({
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
        enemies,
        statuses: [],
        selectedCardId: null,
        bossBattle: bossEncounter?.bossBattle ?? null,
        encounterGold: enemies.reduce((sum, e) => sum + e.goldReward, 0),
        encounterHasElite: enemies.some(e => e.type === 'elite'),
        rewardGold: 0,
        targetEnemyId,
      });
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
      if (!selectedCard || state.screen !== 'battle' || state.turn !== 'player') return state;
      if (state.mp < selectedCard.cost) return state;
      if (!canPlaceCard(state.board, selectedCard, command.row, command.col)) return state;

      const boardAfterPlace = placeCard(state.board, selectedCard, command.row, command.col);
      const clearResult = clearLines(boardAfterPlace);
      const { newBoard, clearedCount, bombCount, manaCount, goldCount, borderCount, stripeCount, comboCount, bowCount, heartCount, gravityCount, hardBlockClearedCount } = clearResult;
      
      let combo = state.combo;
      const cleared = new Set<string>();
      if (clearedCount > 0) {
        let addedCombo = 1 + comboCount;
        if (comboCount > 0 && state.artifacts.some(a => a.id === 'champion_glove')) {
          addedCombo += 1;
        }
        combo += addedCombo;
        for (let r = 0; r < state.boardSize; r++) {
          for (let c = 0; c < state.boardSize; c++) {
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
        targetEnemy,
        bossDamageModifiers(state.bossBattle, clearResult.fullRows, clearResult.fullCols, borderCount, stripeCount)
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

      const totalDrawnCards = drawnCardsCount + (clearedCount > 0 && state.artifacts.some(a => a.id === 'piled_snow') ? clearedCount : 0);

      for (let i = 0; i < totalDrawnCards; i++) {
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          newDeck = [...newDiscardPile].sort(() => Math.random() - 0.5);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          newHand.push(newDeck.shift()!);
        }
      }
      
      let antigravityDamage = 0;
      if (gravityCount > 0 && state.artifacts.some(a => a.id === 'antigravity_machine')) {
        antigravityDamage = gravityCount * 5;
      }
      
      let acceleratorDamage = 0;
      if (drawnCardsCount > 0 && state.artifacts.some(a => a.id === 'accelerator')) {
        acceleratorDamage = drawnCardsCount * 3;
      }
      
      let hammerDamage = 0;
      if (hardBlockClearedCount > 0 && state.artifacts.some(a => a.id === 'hammer')) {
        hammerDamage = hardBlockClearedCount * 5;
      }

      let cupidBowDamage = 0;
      if (heartCount > 0 && state.artifacts.some(a => a.id === 'cupid_bow')) {
        cupidBowDamage = heartCount * 3;
      }

      const bombDamagePerCount = state.artifacts.some(a => a.id === 'gunpowder') ? 15 : 10;
      let newEnemies = state.enemies.map(e => {
        let enemyDamage = bombCount * bombDamagePerCount + antigravityDamage + acceleratorDamage + hammerDamage + cupidBowDamage;
        if (e.id === state.targetEnemyId || bowCount > 0) {
           enemyDamage += createDamagePipelineAndCalculate(state, selectedCard, clearedCount, combo, borderCount, stripeCount,
             command.row, command.col, e, bossDamageModifiers(state.bossBattle, clearResult.fullRows, clearResult.fullCols, borderCount, stripeCount));
        }
        
        let actualEnemyDamage = enemyDamage;
        const defense = e.statuses.find(s => s.type === 'defense');
        if (defense && enemyDamage > 0) {
          actualEnemyDamage = Math.max(0, actualEnemyDamage - defense.value);
        }

        const isFallen = e.statuses.some(s => s.type === 'fallen');
        if (isFallen || (state.bossBattle?.id === 'ancientCore' && state.bossBattle.fallenUntil >= state.bossBattle.turn)) {
          actualEnemyDamage = Math.floor(actualEnemyDamage * 1.5);
        }

        const newStatuses = enemyDamage > 0 ? e.statuses.filter(s => s.type !== 'defense') : e.statuses;

        return { 
          ...e, 
          hp: Math.max(0, e.hp - actualEnemyDamage),
          statuses: newStatuses
        };
      });

      let reflectDamage = 0;
      state.enemies.forEach(e => {
        if (e.id === state.targetEnemyId || bowCount > 0) {
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
      
      let placedState: GameState = {
        ...state, board: newBoard, hand: newHand, discardPile: newDiscardPile,
        deck: newDeck, selectedCardId: null, mp: newMp, shield: newShield, combo,
        enemies: newEnemies, targetEnemyId: newTargetId, score: newScore,
        clearedLines: newClearedLines, gold: state.gold + goldCount * 5,
        hp: Math.min(state.maxHp, Math.max(0, state.hp - reflectDamage + heartCount * 3)),
      };
      placedState = onBossLines(placedState, clearResult.fullRows, clearResult.fullCols);
      placedState = { ...placedState, enemies: placedState.enemies.filter(e => e.hp > 0) };
      const targetDamage = (targetEnemy?.hp ?? 0) - (placedState.enemies.find(e => e.id === targetEnemy?.id)?.hp ?? 0);
      if (command.damageResultCallback) command.damageResultCallback(Math.max(0, targetDamage), bombCount, cleared);
      return finishBattle(placedState);
    }

    case 'END_PLAYER_TURN': {
      if (state.screen !== 'battle' || state.turn !== 'player') return state;
      let poisonDamage = 0;
      const newStatuses = state.statuses.map(s => {
        if (s.type === 'poison') {
          poisonDamage += s.value;
          return { ...s, value: s.value - 1 };
        }
        return s;
      }).filter(s => s.type !== 'poison' || s.value > 0);

      let newHp = state.hp;
      let nextScreen: GameState['screen'] = state.screen;
      if (poisonDamage > 0) {
        newHp = Math.max(0, state.hp - poisonDamage);
        if (newHp === 0) {
          nextScreen = 'gameover';
        }
      }

      if (newHp === 0) return { ...state, hp: 0, screen: 'gameover', bossBattle: null };
      return endBossPlayerTurn({
        ...state, 
        turn: 'enemy', 
        selectedCardId: null,
        hp: newHp,
        statuses: newStatuses,
        screen: nextScreen
      });
    }

    case 'EXECUTE_ENEMY_TURN': {
      if (state.screen !== 'battle' || state.turn !== 'enemy') return state;
      if (state.bossBattle) {
        let next = executeBossTurn(state);
        if (next.screen === 'gameover') return next;
        next = finishBattle(next);
        if (next.screen === 'result') return next;
        return prepareBossTurn(drawNextHand(next));
      }
      let spikeDamage = 0;
      for (let r = 0; r < state.boardSize; r++) {
        for (let c = 0; c < state.boardSize; c++) {
          if (state.board[r][c]?.blockType === 'spike') {
            spikeDamage++;
          }
        }
      }

      const enemyDamage = state.enemies.reduce((acc, enemy) => {
        const damagePerHit = enemy.nextAttack;
        const count = enemy.intent.count || 1;
        return acc + (damagePerHit * count);
      }, 0);
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
      const drawDown = state.statuses.find(s => s.type === 'draw_down');
      if (drawDown) {
        targetDraw -= drawDown.value;
      }
      
      if (state.artifacts.some(a => a.id === 'devil_statue')) {
        targetDraw -= 1;
      }
      
      targetDraw = Math.max(1, targetDraw);

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
      let currentPlayerStatuses = state.statuses;
      processedEnemies.forEach((enemy, idx) => {
         const template = Object.values(ENEMY_TEMPLATES).find(t => t.name === enemy.name);
         const action = template?.actions.find(a => a.name === enemy.intent.actionName);
         if (action?.effect) {
            const result = action.effect(enemy, { ...state, board: currentBoard, gold: currentGold, enemies: processedEnemies, statuses: currentPlayerStatuses });
            if ('board' in result) {
               currentBoard = result.board as BoardState;
            }
            if ('gold' in result) {
              currentGold = result.gold as number;
            }
            if ('enemies' in result) {
              processedEnemies = result.enemies as Enemy[];
            }
            if ('statuses' in result && result.statuses !== undefined) {
              // Check if the result statuses belongs to player or enemy
              // Action effect can return Partial<Enemy> or Partial<GameState>
              // Here we assume if it specifies enemies it might be GameState, 
              // but status is ambiguous. 
              // For now, if the action is from Valkyrie's "一閃", it should be player.
              // A better way is to check the return type or context.
              // Let's assume for now that if it's from an action that intends to affect player, it will be handled.
              // Actually, looking at other enemies:
              // - dragon: adds to self.
              // - captain: adds to other pirates.
              // - mushroomMan: adds to self.
              // So most enemies use it for self.
              // To avoid breaking others, let's distinguish based on action name or just handle both.
              if (action.name === '一閃') {
                currentPlayerStatuses = result.statuses as Status[];
              } else {
                processedEnemies[idx] = { ...processedEnemies[idx], ...result as Partial<Enemy> };
              }
            } else {
              processedEnemies[idx] = { ...processedEnemies[idx], ...result as Partial<Enemy> };
            }
         }
      });

      const encounterGold = state.encounterGold + processedEnemies.filter(e => !state.enemies.some(old => old.id === e.id)).reduce((sum, e) => sum + e.goldReward, 0);
      processedEnemies = processedEnemies.filter(e => e.hp > 0);

      let nextScreen: GameState['screen'] = state.screen;
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

        const hadElite = state.encounterHasElite;
        if (hadElite) {
          rewardArtifact = getRandomArtifactByRarity(state.stage, state.artifacts);
        }

        let earnedGold = encounterGold;
        if (state.artifacts.some(a => a.id === 'abacus')) {
          earnedGold = Math.floor(earnedGold * 1.1);
        }
        finalGold += earnedGold;
      }

      processedEnemies = processedEnemies.map(e => decideNextAction(e));

      const updateStatuses = (statuses: Status[]) => {
        return statuses
          .map(s => (s.type === 'fallen' || s.type === 'taunt' || s.type === 'draw_down' || s.type === 'charging' ? { ...s, value: s.value - 1 } : s))
          .filter(s => s.value > 0 || (s.type !== 'fallen' && s.type !== 'taunt' && s.type !== 'draw_down' && s.type !== 'charging'));
      };

      const newPlayerStatuses = updateStatuses(currentPlayerStatuses);
      const newEnemiesWithUpdatedStatuses = processedEnemies.map(e => ({
        ...e,
        statuses: updateStatuses(e.statuses)
      }));

      if (state.artifacts.some(a => a.id === 'rolling_stone')) {
        const emptyCells: {r: number, c: number}[] = [];
        for (let r = 0; r < state.boardSize; r++) {
          for (let c = 0; c < state.boardSize; c++) {
            if (currentBoard[r][c] === null) emptyCells.push({r, c});
          }
        }
        
        for (let i = 0; i < 2 && emptyCells.length > 0; i++) {
          const idx = Math.floor(Math.random() * emptyCells.length);
          const cell = emptyCells[idx];
          emptyCells.splice(idx, 1);
          currentBoard = currentBoard.map(row => [...row]);
          currentBoard[cell.r][cell.c] = { type: 'I', blockType: 'hard' as BlockType };
        }
      }

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
        encounterGold,
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
        rewardGold: nextScreen === 'result' ? finalGold - currentGold : 0,
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
      const isBoss = state.dungeonMap.find(n => n.id === state.currentNodeId)?.type === 'boss';
      let boardSize = state.boardSize;
      let board = state.board;
      if (state.artifacts.some(a => a.id === 'figure_eight_charm') && state.boardSize === 7) {
        boardSize = 8;
        board = createEmptyBoard(8);
      }

      if (state.screen !== 'result' || !state.rewardCards.some(c => c.id === command.card.id)) return state;
      if (isBoss) {
        const stage = state.stage + 1;
        return {
          ...state, deck: [...state.deck, command.card], boardSize, board: createEmptyBoard(boardSize),
          screen: state.stage === 3 ? 'gameover' : 'dungeon',
          stage: state.stage === 3 ? 3 : stage,
          stageBoss: state.stage === 3 ? state.stageBoss : rollBoss(stage),
          dungeonMap: state.stage === 3 ? state.dungeonMap : generateDungeonMap(),
          currentNodeId: state.stage === 3 ? state.currentNodeId : null,
          bossBattle: null, rewardCards: [], statuses: [],
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

    case 'EVENT_ASSAULT_FIGHT': {
      const enemies = getEnemyEncounter(state.stage, 'normal');
      const targetEnemyId = enemies[0]?.id || null;
      
      let board = createEmptyBoard(state.boardSize);
      if (state.artifacts.some(a => a.id === 'mana_stone')) {
        board[0][0] = { type: 'I', blockType: 'mana' as BlockType };
        board[state.boardSize - 1][state.boardSize - 1] = { type: 'I', blockType: 'mana' as BlockType };
      }

      let deck = [...state.deck];
      // Small decks remain intact after permanent card removal.
      
      let baseHandSize = 7;
      if (state.artifacts.some(a => a.id === 'devil_statue')) {
        baseHandSize -= 1;
      }
      
      const hand = deck.splice(0, baseHandSize);

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
        enemies,
        targetEnemyId,
        currentEventId: null,
        bossBattle: null,
        statuses: [], selectedCardId: null,
        encounterGold: enemies.reduce((sum, e) => sum + e.goldReward, 0),
        encounterHasElite: enemies.some(e => e.type === 'elite'),
        rewardGold: 0,
      };
    }

    case 'EVENT_ASSAULT_FLEE': {
      return {
        ...state,
        screen: 'dungeon',
        gold: Math.max(0, state.gold - 50),
        currentEventId: null,
      };
    }

    case 'EVENT_MERCHANT_STEAL': {
      const customMinos: import('./types').CustomTetrominoType[] = [
         'Sword', 'Shield', 'Mana', 'Cross', 'SquareBomb', 'Draw', 'PainfulCapitalIncrease', 'GoldVein', 'OneTwo', 'Jab', 'Bow', 'Heart', 'BigHeart', 'Obsidian', 'Diamond', 'SilverBullet', 'Note', 'Cymbal', 'Flute', 'Guitar', 'GravityStone', 'FloatingStone', 'LeftRight', 'LookThatWay', 'Booster', 'RocketHead'
      ];
      const randomMinoType = customMinos[Math.floor(Math.random() * customMinos.length)];
      
      const tetroDef = TETROMINO_DEFS[randomMinoType];
      const newCard: TetrominoCard = {
        id: `card-event-${Math.random().toString(36).substr(2, 9)}`,
        type: randomMinoType,
        shape: tetroDef.shape,
        blockTypes: tetroDef.blockTypes,
        color: tetroDef.color,
        glowColor: tetroDef.glowColor,
        cost: tetroDef.cost,
        attack: tetroDef.attack,
        effectText: tetroDef.effectText,
        rarity: tetroDef.rarity,
      };

      return {
        ...state,
        screen: 'dungeon',
        deck: [...state.deck, newCard],
        currentEventId: null,
      };
    }

    case 'EVENT_MERCHANT_RETURN': {
      return {
        ...state,
        screen: 'dungeon',
        gold: state.gold + 50,
        currentEventId: null,
      };
    }

    case 'EVENT_FAIRY_MIRROR_DUPLICATE': {
      const cardToDuplicate = state.deck.find(c => c.id === command.cardId);
      if (!cardToDuplicate) return state;
      const newCard = { ...cardToDuplicate, id: `card-event-${Math.random().toString(36).substr(2, 9)}` };
      return {
        ...state,
        screen: 'dungeon',
        deck: [...state.deck, newCard],
        currentEventId: null,
      };
    }

    case 'EVENT_FAIRY_MIRROR_IGNORE': {
      return {
        ...state,
        screen: 'dungeon',
        currentEventId: null,
      };
    }

    case 'EVENT_EXPLORE_RESOLVE':
      return resolveExplorationEvent(state, command);

    case 'EVENT_LEAVE':
      if (state.screen !== 'event' || !state.currentEventId || state.eventResult) return state;
      return { ...state, screen: 'dungeon', currentEventId: null, eventResult: null };

    case 'EVENT_CONTINUE':
      if (state.screen !== 'event' || !state.eventResult) return state;
      return { ...state, screen: state.hp <= 0 ? 'gameover' : 'dungeon', currentEventId: null, eventResult: null };

    case 'EVENT_SUSPICIOUS_MAGIC_ENHANCE': {
      if (state.screen !== 'event' || state.currentEventId !== 'suspicious_magic') return state;
      const enhancedType = BASIC_ENHANCEMENTS[command.minoType];
      if (!enhancedType || !state.deck.some(card => card.type === command.minoType)) return state;
      return {
        ...state,
        deck: state.deck.map(card => card.type === command.minoType ? enhanceBasicCard(card) : card),
        screen: 'dungeon',
        currentEventId: null,
      };
    }

    case 'EVENT_SUSPICIOUS_MAGIC_LEAVE': {
      if (state.screen !== 'event' || state.currentEventId !== 'suspicious_magic') return state;
      return { ...state, screen: 'dungeon', currentEventId: null };
    }

    case 'EVENT_MYSTERY_DIVE': {
      if (state.screen !== 'event' || state.currentEventId !== 'mystery_change' || state.gold <= 0
        || !state.deck.some(card => BASIC_ENHANCEMENTS[card.type])) return state;
      const newDeck = state.deck.map(enhanceBasicCard);
      return {
        ...state,
        screen: 'dungeon',
        deck: newDeck,
        gold: 0,
        currentEventId: null,
      };
    }

    case 'EVENT_MYSTERY_THROW': {
      const cardIndex = state.deck.findIndex(c => c.id === command.cardId);
      if (cardIndex === -1) return state;
      
      const allTypes = Object.keys(TETROMINO_DEFS) as TetrominoType[];
      const rewardTypes = allTypes.filter(t => TETROMINO_DEFS[t].rarity !== 'default');
      const randomType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
      const def = TETROMINO_DEFS[randomType];
      
      const newCard: TetrominoCard = {
        id: `card-event-${Math.random().toString(36).substr(2, 9)}`,
        type: randomType,
        shape: def.shape,
        blockTypes: def.blockTypes,
        color: def.color,
        glowColor: def.glowColor,
        cost: def.cost,
        attack: def.attack,
        effectText: def.effectText,
        rarity: def.rarity,
      };
      
      const newDeck = [...state.deck];
      newDeck.splice(cardIndex, 1, newCard);
      
      return {
        ...state,
        screen: 'dungeon',
        deck: newDeck,
        currentEventId: null,
      };
    }

    case 'EVENT_MYSTERY_IGNORE': {
      return {
        ...state,
        screen: 'dungeon',
        currentEventId: null,
      };
    }

    default:
      return state;
  }
}
