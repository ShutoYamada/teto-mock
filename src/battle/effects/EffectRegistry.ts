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
    
    // Enemy Status effects can also be checked here, but currently they 
    // hook onto specific enemy ID or evaluate context dynamically. 
    // To keep it clean, we can register "enemy_status_fallen" and attach it,
    // and let the listener check if the targetEnemy has this status.
    // Instead of attaching per enemy, we attach the global rule for Fallen.
    
    const fallenEffect = this.getEffect('enemy_status_fallen');
    if (fallenEffect) fallenEffect.attach(bus);
  }
}

export const globalEffectRegistry = new EffectRegistry();
