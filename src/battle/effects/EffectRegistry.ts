import { EventBus } from '../events/EventBus';
import { GameState } from '../../types';

export interface GameEffect {
  id: string; // matches artifact.id or status.type
  attach(bus: EventBus): void;
}

export class EffectRegistry {
  private effects: Map<string, GameEffect> = new Map();

  register(effect: GameEffect) {
    this.effects.set(effect.id, effect);
  }

  getEffect(id: string): GameEffect | undefined {
    return this.effects.get(id);
  }

  applyActiveEffects(bus: EventBus, state: GameState) {
    // Apply Artifact Effects
    for (const artifact of state.artifacts) {
      const effect = this.getEffect(artifact.id);
      if (effect) {
        effect.attach(bus);
      }
    }

    // Apply Player Status Effects
    for (const status of state.statuses) {
      const effect = this.getEffect(`status_${status.type}`);
      if (effect) {
        effect.attach(bus);
      }
    }
  }
}

export const globalEffectRegistry = new EffectRegistry();
