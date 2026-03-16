import { GameState, TetrominoCard, Enemy } from '../../types';

export interface GameEventContext {
  state: GameState;
  // Can be extended with more context (like what action caused this)
}

export interface DamageEvent {
  type: 'OnBeforeDamage';
  context: GameEventContext;
  card: TetrominoCard | null;
  clearedCount: number;
  combo: number;
  borderCount: number;
  stripeCount: number;
  deckLength: number;
  placedRow?: number;
  placedCol?: number;
  targetEnemy: Enemy | null;
  
  // Mutable modifiers that listeners can alter
  baseDamage: number;
  addend: number;
  multiplier: number;
}

// In the future, we can add OnCardPlayed, OnTurnEnd events.
export type BattleEvent = DamageEvent /* | OtherEvents */;

export type EventListener = (event: BattleEvent) => void;

export class EventBus {
  private listeners: EventListener[] = [];

  subscribe(listener: EventListener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: EventListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  dispatch(event: BattleEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// The generic effect interface
export interface Effect {
  id: string;
  attach(bus: EventBus): void;
  detach(bus: EventBus): void;
}
