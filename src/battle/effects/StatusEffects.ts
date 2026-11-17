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

export function registerStatusEffects() {
  globalEffectRegistry.register(PlayerPowerStatusEffect);
  // Enemy damage reduction and fallen are resolved once per recipient in gameReducer.
}
