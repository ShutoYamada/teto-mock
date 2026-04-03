import type { BoardState, TetrominoCard, CellValue, DungeonNode, DungeonNodeType, BlockType, Enemy, EnemyAction, GameState, Status, Artifact } from './types';
// GameState and EnemyStatus are used in type signatures.


export const BOARD_SIZE = 7;

export function createEmptyBoard(size: number = BOARD_SIZE): BoardState {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null as CellValue)
  );
}

export function canPlaceCard(
  board: BoardState,
  card: TetrominoCard,
  startRow: number,
  startCol: number
): boolean {
  for (let r = 0; r < card.shape.length; r++) {
    for (let c = 0; c < card.shape[r].length; c++) {
      if (!card.shape[r][c]) continue;
      const br = startRow + r;
      const bc = startCol + c;
      if (br < 0 || br >= board.length || bc < 0 || bc >= board[0].length) return false;
      if (board[br][bc] !== null) return false;
    }
  }
  return true;
}

export function placeCard(
  board: BoardState,
  card: TetrominoCard,
  startRow: number,
  startCol: number
): BoardState {
  const newBoard = board.map((row) => [...row]);
  for (let r = 0; r < card.shape.length; r++) {
    for (let c = 0; c < card.shape[r].length; c++) {
      if (!card.shape[r][c]) continue;
      
      const blockType = card.blockTypes ? card.blockTypes[r][c] : 'normal';
      
      newBoard[startRow + r][startCol + c] = {
        type: card.type,
        blockType
      };
    }
  }
  return newBoard;
}

export interface ClearResult {
  newBoard: BoardState;
  clearedCount: number;
  bombCount: number;
  manaCount: number;
  goldCount: number;
  borderCount: number;
  stripeCount: number;
  comboCount: number;
  bowCount: number;
  heartCount: number;
  gravityCount: number;
  hardBlockClearedCount: number;
}

export function clearLines(board: BoardState): ClearResult {
  const size = board.length;
  // Find fully-filled rows
  const fullRows = new Set<number>();
  for (let r = 0; r < size; r++) {
    if (board[r].every((cell) => cell !== null)) fullRows.add(r);
  }

  // Find fully-filled columns
  const fullCols = new Set<number>();
  for (let c = 0; c < size; c++) {
    if (board.every((row) => row[c] !== null)) fullCols.add(c);
  }

  const clearedCount = fullRows.size + fullCols.size;
  if (clearedCount === 0) {
    return { newBoard: board, clearedCount: 0, bombCount: 0, manaCount: 0, goldCount: 0, borderCount: 0, stripeCount: 0, comboCount: 0, bowCount: 0, heartCount: 0, gravityCount: 0, hardBlockClearedCount: 0 };
  }

  const cellsToClear = new Set<string>();
  
  // Tag line clear cells
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
       if (fullRows.has(r) || fullCols.has(c)) {
         cellsToClear.add(`${r},${c}`);
       }
    }
  }
  
  // Resolve Cascading Bombs
  let bombCount = 0;
  let manaCount = 0;
  let goldCount = 0;
  let borderCount = 0;
  let stripeCount = 0;
  let comboCount = 0;
  let bowCount = 0;
  let heartCount = 0;
  
  let newlyAddedBombs = true;
  while (newlyAddedBombs) {
    newlyAddedBombs = false;
    
    // We have to iterate a snapshot since we are modifying the set
    const currentCells = Array.from(cellsToClear);
    for (const pos of currentCells) {
      const [r, c] = pos.split(',').map(Number);
      const cellData = board[r][c];
      
      if (cellData && cellData.blockType === 'mana') {
        manaCount++; // This is safe to recalculate if we keep track of already counted manas, let's keep it simple by marking handled.
      }
      
      if (cellData && cellData.blockType === 'bomb') {
        // Tag surrounding 8 cells
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
              const neighborStr = `${nr},${nc}`;
              if (!cellsToClear.has(neighborStr)) {
                 cellsToClear.add(neighborStr);
                 newlyAddedBombs = true; // Loop again just in case this new cell is ALSO a bomb
              }
            }
          }
        }
      }
    }
  }

  // Recalculate full totals after cascades
  bombCount = 0;
  manaCount = 0;
  goldCount = 0;
  borderCount = 0;
  stripeCount = 0;
  comboCount = 0;
  bowCount = 0;
  heartCount = 0;
  let gravityCount = 0;
  
  interface GravityAction { r: number; c: number; type: BlockType }
  const gravityActions: GravityAction[] = [];
  
  cellsToClear.forEach((pos) => {
    const [r, c] = pos.split(',').map(Number);
    const cellData = board[r][c];
    if (cellData) {
      if (cellData.blockType === 'bomb') bombCount++;
      if (cellData.blockType === 'mana') manaCount++;
      if (cellData.blockType === 'gold') goldCount++;
      if (cellData.blockType === 'border' && fullRows.has(r)) borderCount++;
      if (cellData.blockType === 'stripe' && fullCols.has(c)) stripeCount++;
      if (cellData.blockType === 'combo') comboCount++;
      if (cellData.blockType === 'bow' && (fullRows.has(r) || fullCols.has(c))) bowCount++;
      if (cellData.blockType === 'heart') heartCount++;
      if (cellData.blockType.startsWith('gravity_')) {
        gravityCount++;
        gravityActions.push({ r, c, type: cellData.blockType });
      }
    }
  });

  let hardBlockClearedCount = 0;

  // Execute Clearing
  let newBoard = board.map((row, r) =>
    row.map((cell, c) => {
      if (cellsToClear.has(`${r},${c}`)) {
        if (cell?.blockType === 'hard') {
          hardBlockClearedCount++;
          return { ...cell, blockType: 'normal' as BlockType };
        }
        return null;
      }
      return cell;
    })
  );

  gravityActions.sort((a, b) => a.r - b.r || a.c - b.c);
  for (const action of gravityActions) {
    newBoard = applyGravity(newBoard, action.type);
  }

  return { newBoard, clearedCount, bombCount, manaCount, goldCount, borderCount, stripeCount, comboCount, bowCount, heartCount, gravityCount, hardBlockClearedCount };
}

function applyGravity(board: BoardState, type: BlockType): BoardState {
  const size = board.length;
  const newBoard = createEmptyBoard(size);
  
  if (type === 'gravity_down') {
    for (let c = 0; c < size; c++) {
      let writeR = size - 1;
      for (let r = size - 1; r >= 0; r--) {
        if (board[r][c] !== null) {
          newBoard[writeR][c] = board[r][c];
          writeR--;
        }
      }
    }
  } else if (type === 'gravity_up') {
    for (let c = 0; c < size; c++) {
      let writeR = 0;
      for (let r = 0; r < size; r++) {
        if (board[r][c] !== null) {
          newBoard[writeR][c] = board[r][c];
          writeR++;
        }
      }
    }
  } else if (type === 'gravity_left') {
    for (let r = 0; r < size; r++) {
      let writeC = 0;
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== null) {
          newBoard[r][writeC] = board[r][c];
          writeC++;
        }
      }
    }
  } else if (type === 'gravity_right') {
    for (let r = 0; r < size; r++) {
      let writeC = size - 1;
      for (let c = size - 1; c >= 0; c--) {
        if (board[r][c] !== null) {
          newBoard[r][writeC] = board[r][c];
          writeC--;
        }
      }
    }
  } else {
    return board;
  }
  
  return newBoard;
}

export function isGameOver(hand: TetrominoCard[], board: BoardState): boolean {
  if (hand.length === 0) return false;
  // Game over if no card in hand can be placed anywhere on the board
  const size = board.length;
  for (const card of hand) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (canPlaceCard(board, card, r, c)) return false;
      }
    }
  }
  return true;
}

// calculateDamage was removed and migrated to DamagePipeline.ts

export function generateEnemyIntent(stage: number): number {
  // Keeping this for generic use, but we'll use getNextEnemyAction for specific enemies
  const base = 5 * stage;
  const variance = Math.floor(Math.random() * (5 * stage));
  return base + variance;
}

export const ENEMY_TEMPLATES: Record<string, {
  name: string;
  type: 'normal' | 'elite' | 'boss';
  hpRange: [number, number];
  goldReward: number;
  actions: EnemyAction[];
}> = {
  slime: {
    name: 'スライム',
    type: 'normal',
    hpRange: [50, 55],
    goldReward: 30,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに5～10ダメージを与える',
        damageRange: [5, 10],
        weight: 95,
      },
      {
        name: '逃げる',
        description: '自分を盤面から消す',
        effect: (_enemy: Enemy) => ({ hp: 0 }),
        weight: 5,
      }
    ]
  },
  dragon: {
    name: 'ドラゴン',
    type: 'elite',
    hpRange: [80, 80],
    goldReward: 30,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに10～15ダメージを与える',
        damageRange: [10, 15],
        weight: 50,
      },
      {
        name: '怒る',
        description: '自身に憤怒(5)を発動する',
        effect: (enemy: Enemy) => {
          const statuses = [...enemy.statuses];
          const fury = statuses.find(s => s.type === 'fury');
          if (fury) fury.value += 5;
          else statuses.push({ type: 'fury', value: 5 });
          return { statuses };
        },
        weight: 50,
      }
    ]
  },
  goblin: {
    name: 'ゴブリン',
    type: 'normal',
    hpRange: [60, 60],
    goldReward: 25,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに6～11ダメージを与える',
        damageRange: [6, 11],
        weight: 50,
      },
      {
        name: 'ゴミを投げる',
        description: '5ダメージ + ゴミブロックを盤面に配置',
        damageRange: [5, 5],
        effect: (_enemy: Enemy, state: GameState) => {
          // Find empty cells
          const emptyCells: {r: number, c: number}[] = [];
          for (let r = 0; r < state.board.length; r++) {
            for (let c = 0; c < state.board[r].length; c++) {
              if (state.board[r][c] === null) {
                emptyCells.push({r, c});
              }
            }
          }
          
          if (emptyCells.length === 0) return {};
          
          const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
          const newBoard = state.board.map(row => [...row]);
          newBoard[target.r][target.c] = {
             type: 'I', // Filler type
             blockType: 'trash'
          };
          return { board: newBoard };
        },
        weight: 50,
      }
    ]
  },
  pirate: {
    name: '海賊',
    type: 'normal',
    hpRange: [65, 65],
    goldReward: 30,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに7～12ダメージを与える',
        damageRange: [7, 12],
        weight: 65,
      },
      {
        name: '盗む',
        description: '3ダメージを与え、プレイヤーの所持ゴールドを10G奪う',
        damageRange: [3, 3],
        effect: (_enemy: Enemy, state: GameState) => {
          return { gold: Math.max(0, state.gold - 10) };
        },
        weight: 35,
      }
    ]
  },
  captain: {
    name: 'キャプテン',
    type: 'elite',
    hpRange: [100, 100],
    goldReward: 100,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに10ダメージを与える',
        damageRange: [10, 10],
        weight: 65,
      },
      {
        name: '号令',
        description: '存在する海賊に憤怒(2)を付与する',
        effect: (_enemy: Enemy, state: GameState) => {
          const newEnemies = state.enemies.map(e => {
            if (e.name === '海賊') {
              const statuses = [...e.statuses];
              const fury = statuses.find(s => s.type === 'fury');
              if (fury) fury.value += 2;
              else statuses.push({ type: 'fury', value: 2 });
              return { ...e, statuses };
            }
            return e;
          });
          return { enemies: newEnemies };
        },
        weight: 35,
      }
    ]
  },
  mushroomMan: {
    name: 'キノコ人間',
    type: 'normal',
    hpRange: [45, 45],
    goldReward: 20,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに7～8ダメージを与える',
        damageRange: [7, 8],
        weight: 65,
      },
      {
        name: '狂乱の花粉',
        description: '3ダメージを与え、自身に挑発(2)を付与する',
        damageRange: [3, 3],
        effect: (enemy: Enemy) => {
          const statuses = [...enemy.statuses];
          const taunt = statuses.find(s => s.type === 'taunt');
          if (taunt) taunt.value += 2;
          else statuses.push({ type: 'taunt', value: 2 });
          return { statuses };
        },
        weight: 35,
      }
    ]
  },
  witch: {
    name: 'ウィッチ',
    type: 'normal',
    hpRange: [45, 45],
    goldReward: 20,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに7～8ダメージを与える',
        damageRange: [7, 8],
        weight: 65,
      },
      {
        name: '変化の魔術',
        description: '盤面の特殊ブロック(ゴミ以外)を無作為に1つゴミブロックに変える',
        effect: (_enemy: Enemy, state: GameState) => {
          const specialCells: {r: number, c: number}[] = [];
          for (let r = 0; r < state.board.length; r++) {
            for (let c = 0; c < state.board[r].length; c++) {
              const cell = state.board[r][c];
              if (cell && cell.blockType !== 'normal' && cell.blockType !== 'trash' && cell.blockType !== 'border') {
                specialCells.push({r, c});
              }
            }
          }
          
          if (specialCells.length === 0) return {};
          
          const target = specialCells[Math.floor(Math.random() * specialCells.length)];
          const newBoard = state.board.map(row => [...row]);
          const currentCell = state.board[target.r][target.c]!;
          newBoard[target.r][target.c] = {
             ...currentCell,
             blockType: 'trash'
          };
          return { board: newBoard };
        },
        weight: 35,
      }
    ]
  },
  blockEater: {
    name: 'ブロックイーター',
    type: 'boss',
    hpRange: [125, 125],
    goldReward: 100,
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに10～13ダメージを与える',
        damageRange: [10, 13],
        weight: 35,
      },
      {
        name: '雄たけび',
        description: '自身に憤怒(5)を付与する',
        effect: (enemy: Enemy) => {
          const statuses = [...enemy.statuses];
          const fury = statuses.find(s => s.type === 'fury');
          if (fury) fury.value += 5;
          else statuses.push({ type: 'fury', value: 5 });
          return { statuses };
        },
        weight: 35,
      },
      {
        name: '丸かじり',
        description: '18ダメージを与え、盤面のランダムな行、または列から1ラインを削除する',
        damageRange: [18, 18],
        effect: (_enemy: Enemy, state: GameState) => {
          const isRow = Math.random() > 0.5;
          const index = Math.floor(Math.random() * state.board.length);
          const newBoard = state.board.map((row, r) => 
            row.map((cell, c) => {
              if (isRow && r === index) return null;
              if (!isRow && c === index) return null;
              return cell;
            })
          );
          return { board: newBoard };
        },
        weight: 30,
      }
    ]
  },
  valkyrie: {
    name: 'ヴァルキリー',
    type: 'boss',
    hpRange: [150, 150],
    goldReward: 100,
    actions: [
      {
        name: '高速斬撃',
        description: 'プレイヤーに10ダメージを3回与える',
        damageRange: [10, 10],
        count: 3,
        weight: 35,
      },
      {
        name: '一閃',
        description: '10ダメージを与え、次のターン開始時にプレイヤーが引くカードが4枚になる',
        damageRange: [10, 10],
        effect: (_enemy, _state) => {
          const statuses = [..._state.statuses];
          const drawDown = statuses.find(s => s.type === 'draw_down');
          if (drawDown) drawDown.value += 1;
          else statuses.push({ type: 'draw_down', value: 1 });
          return { statuses };
        },
        weight: 35,
      },
      {
        name: '力を溜める',
        description: '自身に憤怒(3)を付与し、次のターンの行動が必ず高速斬撃になる',
        effect: (enemy) => {
          const statuses = [...enemy.statuses];
          const fury = statuses.find(s => s.type === 'fury');
          if (fury) fury.value += 3;
          else statuses.push({ type: 'fury', value: 3 });
          
          statuses.push({ type: 'charging', value: 1 });
          return { statuses };
        },
        weight: 30,
      }
    ]
  },
  slimeQueen: {
    name: 'スライムクイーン',
    type: 'elite',
    hpRange: [60, 60],
    goldReward: 100,
    actions: [
      {
        name: '分裂',
        description: 'スライム(HP 20)を出現させる',
        effect: (_enemy: Enemy, state: GameState) => {
          const slime: Enemy = {
            id: `enemy-slime-${Math.random().toString(36).substr(2, 9)}`,
            name: 'スライム',
            type: 'normal',
            hp: 20,
            maxHp: 20,
            goldReward: 30,
            nextAttack: 0,
            statuses: [],
            intent: { actionName: '待機', description: '様子をうかがっている' }
          };
          const nextSlime = decideNextAction(slime);
          return { enemies: [...state.enemies, nextSlime] };
        },
        weight: 70,
      },
      {
        name: '攻撃',
        description: 'プレイヤーに4ダメージを3回与える',
        damageRange: [4, 4],
        count: 3,
        weight: 30,
      }
    ]
  }
};

export function getRandomEnemy(stage: number, type: 'normal' | 'elite' | 'boss'): Enemy {
  let templates = Object.values(ENEMY_TEMPLATES).filter(t => t.type === type);
  
  // Filter by stage
  if (type === 'normal') {
    if (stage === 1 || stage === 2) {
      // Slime, Goblin, Pirate, MushroomMan, Witch
    } else {
      templates = templates.filter(t => t.name !== 'ゴブリン' && t.name !== '海賊' && t.name !== 'キノコ人間' && t.name !== 'ウィッチ');
    }
  }
  
  // Extra filter for Captain (usually spawned via special encounter)
  if (type === 'elite') {
    templates = templates.filter(t => t.name !== 'キャプテン');
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const hp = template.hpRange[0] + Math.floor(Math.random() * (template.hpRange[1] - template.hpRange[0] + 1));
  
  const enemy: Enemy = {
    id: `enemy-${Math.random().toString(36).substr(2, 9)}`,
    name: template.name,
    type: template.type,
    hp: hp,
    maxHp: hp,
    goldReward: template.goldReward,
    nextAttack: 0,
    statuses: [],
    intent: {
      actionName: '待機',
      description: '様子をうかがっている'
    }
  };
  
  return decideNextAction(enemy);
}

export function decideNextAction(enemy: Enemy): Enemy {
  const template = Object.values(ENEMY_TEMPLATES).find(t => t.name === enemy.name);
  if (!template) return enemy;
  
  let totalWeight = template.actions.reduce((acc, a) => acc + (a.weight || 0), 0);
  if (totalWeight === 0) totalWeight = 1;

  let action = template.actions[0];
  const charging = enemy.statuses.find(s => s.type === 'charging');
  
  if (charging) {
    const forced = template.actions.find(a => a.name === '高速斬撃');
    if (forced) action = forced;
  } else {
    let rand = Math.random() * totalWeight;
    for (const a of template.actions) {
      if (rand < (a.weight || 0)) {
        action = a;
        break;
      }
      rand -= (a.weight || 0);
    }
  }
  
  let damage = 0;
  if (action.damageRange) {
    damage = action.damageRange[0] + Math.floor(Math.random() * (action.damageRange[1] - action.damageRange[0] + 1));
  }
  
  // Apply Fury bonus to damage
  const fury = enemy.statuses.find((s: Status) => s.type === 'fury');
  if (fury && damage > 0) {
    damage += fury.value;
  }

  return {
    ...enemy,
    nextAttack: damage,
    intent: {
      actionName: action.name,
      damage: damage > 0 ? damage : undefined,
      count: action.count,
      description: action.description
    }
  };
}

export function rotateShape(shape: boolean[][]): boolean[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const newShape: boolean[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => false)
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newShape[c][rows - 1 - r] = shape[r][c];
    }
  }

  return newShape;
}

export function rotateBlockTypes(blockTypes: BlockType[][] | undefined): BlockType[][] | undefined {
  if (!blockTypes) return undefined;
  const rows = blockTypes.length;
  const cols = blockTypes[0].length;
  const newBlockTypes: BlockType[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 'normal' as BlockType)
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newBlockTypes[c][rows - 1 - r] = blockTypes[r][c];
    }
  }

  return newBlockTypes;
}

export function generateDungeonMap(): DungeonNode[] {
  const map: DungeonNode[] = [];
  const TOTAL_DEPTH = 15;
  const NODES_PER_DEPTH = 3;

  // Depth 0 (Start Nodes)
  for (let i = 0; i < NODES_PER_DEPTH; i++) {
    map.push({
      id: `node-0-${i}`,
      depth: 0,
      type: 'battle',
      nextNodes: [],
    });
  }

  // Depth 1 to 14
  for (let d = 1; d < TOTAL_DEPTH; d++) {
    const isBoss = d === TOTAL_DEPTH - 1;
    // Boss layer only needs 1 node
    const numNodes = isBoss ? 1 : NODES_PER_DEPTH;

    // Create nodes for current depth
    for (let i = 0; i < numNodes; i++) {
      let type: DungeonNodeType = 'battle';
      if (isBoss) type = 'boss';
      else if (d % 6 === 0) type = 'shop';
      else if (d % 4 === 0) type = 'event';
      else if (d % 3 === 0) type = 'elite';
      else if (d % 5 === 0) type = 'rest';

      map.push({
        id: `node-${d}-${i}`,
        depth: d,
        type,
        nextNodes: [],
      });
    }

    // Connect previous depth to current depth
    const prevNodes = map.filter(n => n.depth === d - 1);
    const currNodes = map.filter(n => n.depth === d);

    if (isBoss) {
      // Connect all previous nodes to the single boss node
      prevNodes.forEach(pn => pn.nextNodes.push(currNodes[0].id));
    } else {
      // Connect each prev node to 1-2 next nodes to create branching
      prevNodes.forEach((pn, i) => {
        // Guarantee at least straight path connection
        pn.nextNodes.push(currNodes[i].id);
        
        // Randomly connect to an adjacent node (criss-cross)
        if (Math.random() > 0.5) {
          const adjIndex = (i + 1) % NODES_PER_DEPTH;
          if (!pn.nextNodes.includes(currNodes[adjIndex].id)) {
            pn.nextNodes.push(currNodes[adjIndex].id);
          }
        }
      });
      
      // Ensure all current nodes are reachable
      currNodes.forEach(cn => {
        const isReachable = prevNodes.some(pn => pn.nextNodes.includes(cn.id));
        if (!isReachable) {
           const randomPrev = prevNodes[Math.floor(Math.random() * prevNodes.length)];
           randomPrev.nextNodes.push(cn.id);
        }
      });
    }
  }

  return map;
}

export function getEnemyEncounter(stage: number, type: 'normal' | 'elite' | 'boss'): Enemy[] {
  if (type === 'elite' && stage === 2) {
    // Special Boss-like elite for stage 2: Captain + 2 Pirates
    const captainTemplate = ENEMY_TEMPLATES.captain;
    const pirateTemplate = ENEMY_TEMPLATES.pirate;
    
    const captain: Enemy = {
      id: `enemy-captain-${Math.random().toString(36).substr(2, 9)}`,
      name: captainTemplate.name,
      type: captainTemplate.type,
      hp: captainTemplate.hpRange[0],
      maxHp: captainTemplate.hpRange[0],
      goldReward: captainTemplate.goldReward,
      nextAttack: 0,
      statuses: [],
      intent: { actionName: '待機', description: '様子をうかがっている' }
    };

    const pirates = [1, 2].map(i => ({
      id: `enemy-pirate-${i}-${Math.random().toString(36).substr(2, 9)}`,
      name: pirateTemplate.name,
      type: pirateTemplate.type,
      hp: pirateTemplate.hpRange[0],
      maxHp: pirateTemplate.hpRange[0],
      goldReward: pirateTemplate.goldReward,
      nextAttack: 0,
      statuses: [],
      intent: { actionName: '待機', description: '様子をうかがっている' }
    }));

    return [captain, ...pirates].map(e => decideNextAction(e));
  }

  // Default: single random enemy
  return [getRandomEnemy(stage, type)];
}

export const ARTIFACT_DEFS: Record<string, Omit<Artifact, 'id'>> = {
  brave_sword: {
    name: '勇者の剣',
    rarity: 'uncommon',
    description: 'すべてのミノカードの基礎攻撃力が1上昇する',
    effect: (state: GameState) => state, // Not used in calculation yet, handled directly in calculateDamage
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  abacus: {
    name: 'そろばん',
    rarity: 'common',
    description: '戦闘終了後に獲得するGoldが+10%される(小数点以下は切り捨て)',
    effect: (state: GameState) => state,
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  brave_shield: {
    name: '勇者の盾',
    rarity: 'uncommon',
    description: '被ダメージが-1される',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  white_card: {
    name: '白紙のカード',
    rarity: 'common',
    description: '戦闘勝利後の報酬選択時に選択可能なカードの候補が+1される',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  elite_killer: {
    name: 'エリートキラー',
    rarity: 'uncommon',
    description: 'エリートモンスターに対して与えるダメージが+1される',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  devil_statue: {
    name: '悪魔の像',
    rarity: 'uncommon',
    description: '戦闘開始時の手札枚数が-1され、すべてのミノカードの基礎攻撃力が+1される',
    isEliteDrop: false,
    isShopSale: false,
    isEventReward: false,
  },
  seven_card: {
    name: '7カード',
    rarity: 'rare',
    description: 'デッキのカード枚数7枚ごとにすべてのミノカードの基礎攻撃力が+1される',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  figure_eight_charm: {
    name: '8の字のお守り',
    rarity: 'rare',
    description: '盤面の縦横が1マスずつ増え、基礎攻撃力と行列攻撃力が+1される',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  champion_glove: {
    name: 'チャンピオンのグローブ',
    rarity: 'uncommon',
    description: 'コンボブロック消滅時のコンボ加算時にさらに+1する',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  drip_coffee: {
    name: 'ドリップコーヒー',
    rarity: 'common',
    description: '休憩所でHP回復を選択した場合の効果を「最大HPの40%の値(端数切捨て)を回復する」に変更する',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  scissors: {
    name: 'ハサミ',
    rarity: 'rare',
    description: '休憩所でカード削除を選択した場合の効果を「現在のデッキからプレイヤーが選択した2枚までのカードをゲーム中永続的に削除する」に変更する',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  mana_stone: {
    name: 'マナの原石',
    rarity: 'uncommon',
    description: '戦闘開始時の初期盤面の左上と右下に1つずつマナブロックを配置する',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  fortissimo: {
    name: 'フォルテッシモ',
    rarity: 'uncommon',
    description: '共鳴ブロックによるダメージ加算時の、共鳴ブロック1つあたりの加算ダメージをさらに+1する',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  antigravity_machine: {
    name: '半重力装置',
    rarity: 'uncommon',
    description: '重力ブロックの消滅時効果が発生する度に敵全体に5ダメージを与える',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  accelerator: {
    name: '加速器',
    rarity: 'uncommon',
    description: 'ドローブロックの効果発動時、敵全体に3ダメージ与える',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  hammer: {
    name: 'ハンマー',
    rarity: 'uncommon',
    description: 'ハードブロックが消去されノーマルブロックに置き換わる度に、敵全体に5ダメージ',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  rolling_stone: {
    name: 'ローリングストーン',
    rarity: 'rare',
    description: '自ターンの開始時ごとに、盤面上のランダムな空きマス2つにハードブロックを配置する',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  },
  katana: {
    name: '刀',
    rarity: 'common',
    description: '剣ブロックの効果が「配置している間中、全てのミノカードの配置時の基礎ダメージが2上昇する」に置き換わる',
    isEliteDrop: true,
    isShopSale: true,
    isEventReward: true,
  }
};

export function createArtifact(id: string): Artifact {
  const def = ARTIFACT_DEFS[id];
  if (!def) throw new Error(`Artifact definition for ${id} not found`);
  return {
    id,
    ...def
  };
}

export function getRandomArtifactByRarity(stage: number, playerArtifacts: Artifact[]): Artifact | null {
  const ownedIds = new Set(playerArtifacts.map(a => a.id));
  const pool = Object.entries(ARTIFACT_DEFS)
    .filter(([id, def]) => def.isEliteDrop && !ownedIds.has(id))
    .map(([id, def]) => ({ id, ...def }));

  if (pool.length === 0) return null;

  // Determine rarity based on stage
  const rand = Math.random() * 100;
  let targetRarity: 'common' | 'uncommon' | 'rare';

  if (stage === 1) {
    if (rand < 75) targetRarity = 'common';
    else if (rand < 95) targetRarity = 'uncommon';
    else targetRarity = 'rare';
  } else if (stage === 2) {
    if (rand < 65) targetRarity = 'common';
    else if (rand < 90) targetRarity = 'uncommon';
    else targetRarity = 'rare';
  } else {
    // Stage 3 and above
    if (rand < 50) targetRarity = 'common';
    else if (rand < 80) targetRarity = 'uncommon';
    else targetRarity = 'rare';
  }

  const rarityPool = pool.filter(a => a.rarity === targetRarity);
  if (rarityPool.length === 0) {
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
    return null;
  }

  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
}

export function getArtifactPrice(artifact: Artifact): number {
  switch (artifact.rarity) {
    case 'common': return 100;
    case 'uncommon': return 200;
    case 'rare': return 300;
    case 'boss': return 0;
    default: return 100;
  }
}

export function generateShopArtifacts(playerArtifacts: Artifact[], count: number = 3): Artifact[] {
  const ownedIds = new Set(playerArtifacts.map(a => a.id));
  const pool = Object.entries(ARTIFACT_DEFS)
    .filter(([id, def]) => def.isShopSale && !ownedIds.has(id))
    .map(([id, def]) => ({ id, ...def } as Artifact));

  // Shuffle and slice
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  return pool.slice(0, count);
}
