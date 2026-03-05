import type { BoardState, TetrominoCard, CellValue, DungeonNode, DungeonNodeType, BlockType } from './types';

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
    return { newBoard: board, clearedCount: 0, bombCount: 0, manaCount: 0 };
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
  cellsToClear.forEach((pos) => {
    const [r, c] = pos.split(',').map(Number);
    const cellData = board[r][c];
    if (cellData) {
      if (cellData.blockType === 'bomb') bombCount++;
      if (cellData.blockType === 'mana') manaCount++;
    }
  });

  // Execute Clearing
  const newBoard = board.map((row, r) =>
    row.map((cell, c) => {
      if (cellsToClear.has(`${r},${c}`)) return null;
      return cell;
    })
  );

  return { newBoard, clearedCount, bombCount, manaCount };
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
  combo: number
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
  }
  if (clearedCount > 0) {
    // Base line clear damage
    damage += clearedCount * 10;
    // Combo multiplier
    if (combo > 0) {
      damage += combo * 5;
    }
  }
  return damage;
}

export function generateEnemyIntent(stage: number): number {
  // Simple formula: Stage 1 = 5-10, Stage 2 = 10-20, etc.
  const base = 5 * stage;
  const variance = Math.floor(Math.random() * (5 * stage));
  return base + variance;
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
