import { GameState } from '../types';

interface DungeonScreenProps {
  state: GameState;
  onEnterBattle: () => void;
}

export function DungeonScreen({ state, onEnterBattle }: DungeonScreenProps) {
  return (
    <div className="dungeon-screen">
      <h2 className="dungeon-title">ダンジョン - ステージ {state.stage}</h2>
      
      <div className="dungeon-map">
        <div className="dungeon-node start-node">スタート</div>
        <div className="dungeon-branch"></div>
        <button className="dungeon-node battle-node selectable" onClick={onEnterBattle}>
          戦闘イベント
        </button>
      </div>
      
      <div className="dungeon-status">
        <p>HP: {state.hp} / {state.maxHp}</p>
        <p>Gold: {state.gold}</p>
      </div>
    </div>
  );
}
