import { GameEffect, globalEffectRegistry } from './EffectRegistry';
import { EventBus } from '../events/EventBus';

export const BraveSwordEffect: GameEffect = {
  id: 'brave_sword',
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage' && event.card) {
        event.addend += 1;
      }
    });
  }
};

export const DevilStatueEffect: GameEffect = {
  id: 'devil_statue',
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage' && event.card) {
        event.addend += 1;
      }
    });
  }
};

export const FigureEightCharmEffect: GameEffect = {
  id: 'figure_eight_charm',
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage') {
        if (event.card) event.addend += 1;
        if (event.clearedCount > 0) {
          event.addend += (event.borderCount + event.stripeCount);
        }
      }
    });
  }
};

export const EliteKillerEffect: GameEffect = {
  id: 'elite_killer',
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage' && event.card && event.targetEnemy?.type === 'elite') {
        event.addend += 1;
      }
    });
  }
};

export const SevenCardEffect: GameEffect = {
  id: 'seven_card',
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage' && event.card) {
        event.addend += Math.floor(event.deckLength / 7);
      }
    });
  }
};

// Register them all
export function registerArtifactEffects() {
  globalEffectRegistry.register(BraveSwordEffect);
  globalEffectRegistry.register(DevilStatueEffect);
  globalEffectRegistry.register(FigureEightCharmEffect);
  globalEffectRegistry.register(EliteKillerEffect);
  globalEffectRegistry.register(SevenCardEffect);
}
