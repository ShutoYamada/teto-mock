import type { BoardState, TetrominoCard, CellValue, DungeonNode, DungeonNodeType, BlockType, Enemy, EnemyAction, GameState, EnemyStatus, Artifact } from './types';
// GameState and EnemyStatus are used in type signatures.


export const BOARD_SIZE = 7;

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as CellValue)
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
      if (br < 0 || br >= BOARD_SIZE || bc < 0 || bc >= BOARD_SIZE) return false;
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
}

export function clearLines(board: BoardState): ClearResult {
  // Find fully-filled rows
  const fullRows = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) fullRows.add(r);
  }

  // Find fully-filled columns
  const fullCols = new Set<number>();
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board.every((row) => row[c] !== null)) fullCols.add(c);
  }

  const clearedCount = fullRows.size + fullCols.size;
  if (clearedCount === 0) {
    return { newBoard: board, clearedCount: 0, bombCount: 0, manaCount: 0, goldCount: 0, borderCount: 0, stripeCount: 0 };
  }

  const cellsToClear = new Set<string>();
  
  // Tag line clear cells
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
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
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
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
  cellsToClear.forEach((pos) => {
    const [r, c] = pos.split(',').map(Number);
    const cellData = board[r][c];
    if (cellData) {
      if (cellData.blockType === 'bomb') bombCount++;
      if (cellData.blockType === 'mana') manaCount++;
      if (cellData.blockType === 'gold') goldCount++;
      if (cellData.blockType === 'border' && fullRows.has(r)) borderCount++;
      if (cellData.blockType === 'stripe' && fullCols.has(c)) stripeCount++;
    }
  });

  // Execute Clearing
  const newBoard = board.map((row, r) =>
    row.map((cell, c) => {
      if (cellsToClear.has(`${r},${c}`)) return null;
      return cell;
    })
  );

  return { newBoard, clearedCount, bombCount, manaCount, goldCount, borderCount, stripeCount };
}

export function isGameOver(hand: TetrominoCard[], board: BoardState): boolean {
  if (hand.length === 0) return false;
  // Game over if no card in hand can be placed anywhere on the board
  for (const card of hand) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (canPlaceCard(board, card, r, c)) return false;
      }
    }
  }
  return true;
}

export function calculateDamage(
  board: BoardState,
  card: TetrominoCard | null,
  clearedCount: number,
  combo: number,
  borderCount: number = 0,
  stripeCount: number = 0,
  artifacts: Artifact[] = []
): number {
  let damage = 0;
  if (card) {
    damage += card.attack;
    
    // Check for Sword Buffs on the board
    let swordBuff = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c]?.blockType === 'sword') {
           swordBuff += 1;
        }
      }
    }
    damage += swordBuff;

    // Artifact Effects
    if (artifacts.some(a => a.id === 'brave_sword')) {
      damage += 1;
    }
  }
  if (clearedCount > 0) {
    // Base line clear damage
    damage += clearedCount * 10;
    // Combo multiplier
    if (combo > 0) {
      damage += combo * 5;
    }
    // Border/Stripe bonuses
    damage += borderCount * 5;
    damage += stripeCount * 5;
  }
  return damage;
}

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
  actions: EnemyAction[];
}> = {
  slime: {
    name: 'スライム',
    type: 'normal',
    hpRange: [50, 55],
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに5～10ダメージを与える',
        damageRange: [5, 10],
      },
      {
        name: '逃げる',
        description: '自分を盤面から消す',
        effect: (_enemy: Enemy) => ({ hp: 0 }),
      }
    ]
  },
  dragon: {
    name: 'ドラゴン',
    type: 'elite',
    hpRange: [80, 80],
    actions: [
      {
        name: '通常攻撃',
        description: 'プレイヤーに10～15ダメージを与える',
        damageRange: [10, 15],
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
        }
      }
    ]
  }
};

export function getRandomEnemy(_stage: number, type: 'normal' | 'elite' | 'boss'): Enemy {
  const templates = Object.values(ENEMY_TEMPLATES).filter(t => t.type === type);
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const hp = template.hpRange[0] + Math.floor(Math.random() * (template.hpRange[1] - template.hpRange[0] + 1));
  
  const enemy: Enemy = {
    id: `enemy-${Math.random().toString(36).substr(2, 9)}`,
    name: template.name,
    type: template.type,
    hp: hp,
    maxHp: hp,
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
  
  let action: EnemyAction;
  const rand = Math.random() * 100;
  
  if (enemy.name === 'スライム') {
    action = rand < 95 ? template.actions[0] : template.actions[1];
  } else if (enemy.name === 'ドラゴン') {
    action = rand < 50 ? template.actions[0] : template.actions[1];
  } else {
    action = template.actions[0];
  }
  
  let damage = 0;
  if (action.damageRange) {
    damage = action.damageRange[0] + Math.floor(Math.random() * (action.damageRange[1] - action.damageRange[0] + 1));
  }
  
  // Apply Fury bonus to damage
  const fury = enemy.statuses.find((s: EnemyStatus) => s.type === 'fury');
  if (fury && damage > 0) {
    damage += fury.value;
  }

  return {
    ...enemy,
    nextAttack: damage,
    intent: {
      actionName: action.name,
      damage: damage > 0 ? damage : undefined,
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

export const ARTIFACT_DEFS: Record<string, Omit<Artifact, 'id'>> = {
  brave_sword: {
    name: '勇者の剣',
    rarity: 'uncommon',
    description: 'すべてのミノカードの基礎攻撃力が1上昇する',
    effect: (state: GameState) => state, // Not used in calculation yet, handled directly in calculateDamage
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
