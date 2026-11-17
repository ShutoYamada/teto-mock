import type { GameEventId, GameState, TetrominoCard, TetrominoType } from '../types';
import { BASIC_ENHANCEMENTS, TETROMINO_DEFS } from '../tetrominos';

export const EXPLORATION_EVENTS = {
  healing_spring: { name: '癒やしの泉', stages: [1, 2, 3] },
  forgotten_library: { name: '忘却の書庫', stages: [1, 2, 3] },
  rusty_forge: { name: '錆びた鍛冶場', stages: [1, 2] },
  blood_pact: { name: '血の契約', stages: [2, 3] },
  whimsical_well: { name: '気まぐれな井戸', stages: [1, 2, 3] },
  unstable_circle: { name: '不安定な錬成陣', stages: [2, 3] },
} as const;

export function getEventPool(stage: number): GameEventId[] {
  const events: GameEventId[] = ['assault', 'merchant_drop', 'fairy_mirror', 'suspicious_magic'];
  if (stage === 1) events.push('mystery_change');
  for (const [id, def] of Object.entries(EXPLORATION_EVENTS)) {
    if ((def.stages as readonly number[]).includes(stage)) events.push(id as GameEventId);
  }
  return events;
}

export function enhanceBasicCard(card: TetrominoCard): TetrominoCard {
  const type = BASIC_ENHANCEMENTS[card.type];
  if (!type) return card;
  // A replacement takes the Enhanced definition, including resetting prior attack reductions.
  const def = TETROMINO_DEFS[type];
  return { ...card, type, shape: def.shape, blockTypes: def.blockTypes, color: def.color,
    glowColor: def.glowColor, cost: def.cost, attack: def.attack, effectText: def.effectText, rarity: def.rarity };
}

export function resolveExplorationEvent(state: GameState, choice: { cardId?: string; minoType?: TetrominoType }): GameState {
  if (state.screen !== 'event' || !state.currentEventId || state.eventResult || state.hp <= 0) return state;
  const event = EXPLORATION_EVENTS[state.currentEventId as keyof typeof EXPLORATION_EVENTS];
  if (!event || !(event.stages as readonly number[]).includes(state.stage)) return state;
  const finish = (changes: Partial<GameState>, message: string): GameState => ({ ...state, ...changes, eventResult: message });
  switch (state.currentEventId) {
    case 'healing_spring': {
      const hp = Math.min(state.maxHp, state.hp + Math.max(1, Math.floor(state.maxHp * .25)));
      return finish({ hp }, `泉の水でHPが${hp - state.hp}回復しました。HP：${hp} / ${state.maxHp}`);
    }
    case 'forgotten_library': {
      const card = state.deck.find(c => c.id === choice.cardId);
      if (!card || state.deck.length <= 1) return state;
      return finish({ deck: state.deck.filter(c => c.id !== card.id) }, `${card.type}を1枚デッキから削除しました。残り${state.deck.length - 1}枚。`);
    }
    case 'rusty_forge': {
      const card = state.deck.find(c => c.id === choice.cardId);
      if (!card || card.attack < 2) return state;
      return finish({ gold: state.gold + 80, deck: state.deck.map(c => c.id === card.id ? { ...c, attack: c.attack - 2 } : c) },
        `${card.type}の基礎攻撃力が${card.attack}から${card.attack - 2}に低下しました。80G獲得（所持${state.gold + 80}G）。`);
    }
    case 'blood_pact': {
      if (state.maxHp < 6) return state;
      const maxHp = state.maxHp - 5;
      return finish({ maxHp, hp: Math.min(state.hp, maxHp), maxMp: state.maxMp + 1, mp: Math.min(state.maxMp + 1, state.mp + 1) },
        `契約成立。最大HP：${state.maxHp} → ${maxHp}、最大MP：${state.maxMp} → ${state.maxMp + 1}。`);
    }
    case 'whimsical_well': {
      if (state.gold < 20) return state;
      const roll = Math.random();
      const gold = state.gold - 20;
      if (roll < .5) return finish({ gold: gold + 80 }, `20Gを投げ入れ、80Gを獲得しました。所持Gold：${gold + 80}G（差引+60G）。`);
      if (roll < .8) {
        const hp = Math.min(state.maxHp, state.hp + 15);
        return finish({ gold, hp }, `20Gを支払い、HPが${hp - state.hp}回復しました。HP：${hp} / ${state.maxHp}`);
      }
      const hp = Math.max(0, state.hp - 8);
      return finish({ gold, hp }, `20Gを支払い、HPを8失いました。HP：${hp} / ${state.maxHp}${hp === 0 ? '。力尽きてしまいました。' : ''}`);
    }
    case 'unstable_circle': {
      const type = choice.minoType;
      if (!type || !BASIC_ENHANCEMENTS[type]) return state;
      const cards = state.deck.filter(c => c.type === type);
      if (!cards.length) return state;
      const roll = Math.random();
      if (roll < .6) return finish({ deck: state.deck.map(c => c.type === type ? enhanceBasicCard(c) : c) },
        `錬成成功！ ${type} ${cards.length}枚を${BASIC_ENHANCEMENTS[type]}に強化しました。`);
      if (roll < .85) return finish({}, '錬成陣の光が消えました。カードは変化しませんでした。');
      return finish({ deck: state.deck.map(c => c.type === type ? { ...c, attack: Math.max(0, c.attack - 1) } : c) },
        `錬成失敗。${type} ${cards.length}枚の基礎攻撃力がそれぞれ1低下しました（最低0）。`);
    }
    default: return state;
  }
}
