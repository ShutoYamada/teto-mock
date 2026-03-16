import { GameState, TetrominoCard, Enemy } from '../../types';
import { EventBus, DamageEvent, GameEventContext } from './EventBus';
import { BOARD_SIZE } from '../../gameLogic';

import { globalEffectRegistry } from '../effects/EffectRegistry';
import { registerArtifactEffects } from '../effects/ArtifactEffects';
import { registerStatusEffects } from '../effects/StatusEffects';

// Ensure they are registered once
let registered = false;
function ensureEffectsRegistered() {
  if (!registered) {
    registerArtifactEffects();
    registerStatusEffects();
    registered = true;
  }
}

export function createDamagePipelineAndCalculate(
  state: GameState,
  card: TetrominoCard | null,
  clearedCount: number,
  combo: number,
  borderCount: number,
  stripeCount: number,
  placedRow?: number,
  placedCol?: number,
  targetEnemy?: Enemy | null
): number {
  ensureEffectsRegistered();
  const bus = new EventBus();

  // ----- Base Loop Effects -----

  // 1. Base Attack & Board Sword Buff
  bus.subscribe((event) => {
    if (event.type !== 'OnBeforeDamage') return;
    if (event.card) {
      event.baseDamage += event.card.attack;

      let swordBuff = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (event.context.state.board[r][c]?.blockType === 'sword') {
            swordBuff += 1;
          }
        }
      }
      event.addend += swordBuff;
    }
  });

  // 2. Trash Block Penalty
  bus.subscribe((event) => {
    if (event.type !== 'OnBeforeDamage') return;
    if (event.card && event.placedRow !== undefined && event.placedCol !== undefined) {
      let trashPenalty = 0;
      const size = event.context.state.board.length;
      const placedCells = new Set<string>();

      for (let r = 0; r < event.card.shape.length; r++) {
        for (let c = 0; c < event.card.shape[r].length; c++) {
          if (event.card.shape[r][c]) {
            placedCells.add(`${event.placedRow + r},${event.placedCol + c}`);
          }
        }
      }

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (event.context.state.board[r][c]?.blockType === 'trash') {
            const isAdjacent = [
              `${r - 1},${c}`, `${r + 1},${c}`, `${r},${c - 1}`, `${r},${c + 1}`
            ].some(pos => placedCells.has(pos));
            
            if (isAdjacent) {
              trashPenalty++;
            }
          }
        }
      }

      event.addend -= trashPenalty;
    }
  });

  // 3. Line Clear Base & Combos
  bus.subscribe((event) => {
    if (event.type !== 'OnBeforeDamage') return;
    if (event.clearedCount > 0) {
      event.baseDamage += event.clearedCount * 10;
      if (event.combo > 0) {
        event.addend += event.combo * 5;
      }
      event.addend += event.borderCount * 5;
      event.addend += event.stripeCount * 5;
    }
  });

  // 4. Attach Dynamic Effects from GameState
  globalEffectRegistry.applyActiveEffects(bus, state);

  // ----- Dispatch Event -----

  const context: GameEventContext = { state };
  const deckLength = state.deck.length + state.hand.length + state.discardPile.length;

  const event: DamageEvent = {
    type: 'OnBeforeDamage',
    context,
    card,
    clearedCount,
    combo,
    borderCount,
    stripeCount,
    deckLength,
    placedRow,
    placedCol,
    targetEnemy: targetEnemy || null,
    baseDamage: 0,
    addend: 0,
    multiplier: 1.0,
  };

  bus.dispatch(event);

  let finalDamage = event.baseDamage + event.addend;
  // Apply trash penalty floor rule (base damage can't be negative)
  if (finalDamage < 0) finalDamage = 0; 
  
  finalDamage = Math.floor(finalDamage * event.multiplier);

  return finalDamage;
}
