import { GameEffect, globalEffectRegistry } from './EffectRegistry';
import { EventBus } from '../events/EventBus';
import { Status } from '../../types';

export const PlayerPowerStatusEffect: GameEffect = {
  id: 'status_power',
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage' && event.card) {
        const power = event.context.state.statuses.find((s: Status) => s.type === 'power');
        if (power) {
          event.addend += power.value;
        }
      }
    });
  }
};

export const EnemyFallenStatusEffect: GameEffect = {
  id: 'enemy_status_fallen', // A generic rule that checks target enemy's statuses
  attach(bus: EventBus) {
    bus.subscribe((event) => {
      if (event.type === 'OnBeforeDamage' && event.targetEnemy) {
        const fallen = event.targetEnemy.statuses.find((s: Status) => s.type === 'fallen');
        if (fallen) {
          event.multiplier *= 1.5;
        }
      }
    });
  }
};

export function registerStatusEffects() {
  globalEffectRegistry.register(PlayerPowerStatusEffect);
  globalEffectRegistry.register(EnemyFallenStatusEffect);
}
