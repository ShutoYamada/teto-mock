import { useState, type Dispatch } from 'react';
import type { GameCommand } from '../gameReducer';
import type { GameState } from '../types';
import { EXPLORATION_EVENTS } from '../events/explorationEvents';
import { BASIC_ENHANCEMENTS } from '../tetrominos';
import { TetrominoCard } from './TetrominoCard';

export function ExplorationEvent({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameCommand> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const id = state.currentEventId as keyof typeof EXPLORATION_EVENTS;
  const isCircle = id === 'unstable_circle';
  const needsCard = isCircle || id === 'forgotten_library' || id === 'rusty_forge';
  const candidates = state.deck.filter((card, index, deck) => id === 'rusty_forge' ? card.attack >= 2
    : isCircle ? !card.curse && BASIC_ENHANCEMENTS[card.type] && deck.findIndex(c => !c.curse && c.type === card.type) === index : true);
  const selected = candidates.find(card => card.id === selectedId);
  let description = '', action = '', unavailable = '';
  switch (id) {
    case 'healing_spring':
      description = `澄んだ泉が湧いている。水を飲むと最大HPの25%（${Math.max(1, Math.floor(state.maxHp * .25))}HP）を無料で回復します。最大HPを超えて回復しません。`;
      action = '水を飲む';
      break;
    case 'forgotten_library':
      description = '忘れたい記憶を本に封じる書庫。選んだカード1枚を無料でデッキから削除します。最後の1枚は削除できません。';
      action = '選んだカードを削除する';
      if (state.deck.length <= 1) unavailable = '最後の1枚は削除できません。';
      break;
    case 'rusty_forge':
      description = '鍛冶師がミノの力を買い取ろうとしている。選んだカード1枚の基礎攻撃力を永続で2下げる代わりに80G獲得します。特殊ブロックの効果は変化しません。';
      action = '攻撃力を2下げて80G受け取る';
      if (!candidates.length) unavailable = '基礎攻撃力2以上のカードがありません。';
      break;
    case 'blood_pact':
      description = '血で描かれた契約書。最大HPを永続で5減らす代わりに最大MPを永続で1増やします。現在HPは新しい最大HPまでに制限され、現在MPも1回復します（新しい最大MPまで）。';
      action = '契約する（最大HP−5・最大MP＋1）';
      if (state.maxHp < 6) unavailable = '契約には最大HPが6以上必要です。';
      break;
    case 'whimsical_well':
      description = '底から不思議な音が響く。20Gを投げると、50%で80G獲得（差引+60G）、30%でHP15回復、20%でHP8喪失。回復は最大HPまで。HPが0になるとゲームオーバーです。';
      action = '20Gを投げ入れる';
      if (state.gold < 20) unavailable = '20G以上必要です。';
      break;
    case 'unstable_circle':
      description = '明滅する錬成陣。基礎ミノを1種類選ぶと、60%で同じ種類の全カードをEnhanced化、25%で変化なし、15%で同じ種類の全カードの基礎攻撃力が永続で1低下します（最低0）。Goldは不要です。';
      action = '選んだ種類を錬成する';
      if (!candidates.length) unavailable = '対象となる基礎ミノがありません。';
      break;
  }
  return (
    <div className="rest-screen">
      <div className="rest-panel magic-event-panel">
        <h2 className="rest-title">{EXPLORATION_EVENTS[id].name}</h2>
        <p>{description}</p>
        <p>HP：{state.hp} / {state.maxHp} ／ MP：{state.mp} / {state.maxMp} ／ Gold：{state.gold}G</p>
        {needsCard && <div className="magic-mino-grid" aria-label={isCircle ? '対象の基礎ミノの種類' : '対象のカード'}>
          {candidates.map(card => <div className="magic-mino-option" key={card.id}>
            <TetrominoCard card={card} isSelected={selectedId === card.id} onClick={() => setSelectedId(card.id)} />
            {isCircle && <span>{state.deck.filter(c => !c.curse && c.type === card.type).length}枚が対象</span>}
          </div>)}
        </div>}
        {selected && <p role="status">{isCircle && !selected.curse
          ? `${selected.type} ${state.deck.filter(c => c.type === selected.type).length}枚が対象。成功時は${BASIC_ENHANCEMENTS[selected.type]}になります。`
          : id === 'rusty_forge' ? `${selected.type}の基礎攻撃力：${selected.attack} → ${selected.attack - 2}`
          : `${selected.type}を1枚削除します。残り${state.deck.length - 1}枚。`}</p>}
        {id === 'blood_pact' && !unavailable && <p>最大HP：{state.maxHp} → {state.maxHp - 5} ／ 最大MP：{state.maxMp} → {state.maxMp + 1}</p>}
        {id === 'whimsical_well' && state.hp <= 8 && <p className="event-danger">失敗すると現在のHPでは力尽きます。</p>}
        {unavailable && <p role="status">{unavailable}</p>}
        <div className="rest-remove-actions">
          <button className="rest-action-btn confirm" disabled={!!unavailable || (needsCard && !selected)}
            onClick={() => dispatch({ type: 'EVENT_EXPLORE_RESOLVE', cardId: selected?.id, minoType: selected && !selected.curse ? selected.type : undefined })}>{action}</button>
          <button className="rest-action-btn cancel" onClick={() => dispatch({ type: 'EVENT_LEAVE' })}>立ち去る（何も失わない）</button>
        </div>
      </div>
    </div>
  );
}
