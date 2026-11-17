import { useMemo, useEffect, useRef } from 'react';
import { isDungeonNodeRevealed } from '../gameLogic';
import { BOSSES } from '../battle/bosses';
import { GameState, DungeonNode } from '../types';

interface DungeonScreenProps {
  state: GameState;
  onEnterNode: (nodeId: string) => void;
  onOpenDeck: () => void;
}

export function DungeonScreen({ state, onEnterNode, onOpenDeck }: DungeonScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group nodes by depth
  const mapByDepth = useMemo(() => {
    const depths: DungeonNode[][] = [];
    state.dungeonMap.forEach(node => {
      if (!depths[node.depth]) depths[node.depth] = [];
      depths[node.depth].push(node);
    });
    return depths;
  }, [state.dungeonMap]);

  // Determine which depth player is currently looking at picking from
  // If currentNodeId is null, they start at depth 0
  const currentDepth = state.currentNodeId 
    ? state.dungeonMap.find(n => n.id === state.currentNodeId)?.depth ?? -1 
    : -1;
    
  const targetDepth = currentDepth + 1;
  const hasLantern = state.artifacts.some(a => a.id === 'lantern');
  const position = (node: DungeonNode) => ({
    x: node.x ?? 50,
    y: (mapByDepth.length - 1 - node.depth) * 112 + 55 + (node.y ?? 0),
  });
  const mapHeight = mapByDepth.length * 112;
  const nodeElements = useRef(new Map<string, HTMLDivElement>());
  const validNextNodes = state.currentNodeId
    ? state.dungeonMap.find((n: DungeonNode) => n.id === state.currentNodeId)?.nextNodes || []
    : mapByDepth[0]?.map((n: DungeonNode) => n.id) || [];

  // Scroll to bottom on load to show current progression
  useEffect(() => {
    if (containerRef.current) {
        const focusId = state.currentNodeId ?? state.dungeonMap.find(n => n.depth === 0)?.id;
        const focus = focusId ? nodeElements.current.get(focusId) : undefined;
        if (focus) containerRef.current.scrollTop = focus.offsetTop - containerRef.current.clientHeight * 0.65;
    }
  }, [state.currentNodeId, state.stage]);

  const getNodeEmoji = (type: string) => {
    switch(type) {
      case 'boss': return '💀 Boss';
      case 'elite': return '🔥 Elite';
      case 'event': return '❓ Event';
      case 'rest': return '⛺ Rest';
      case 'shop': return '💰 Shop';
      default: return '⚔️ Battle';
    }
  }

  return (
    <div className="dungeon-screen">
      <h2 className="dungeon-title">ステージ {state.stage} / 3 — ダンジョン探索</h2>
      <details className="boss-guide" open>
        <summary>💀 ボス：{BOSSES[state.stageBoss].name}</summary>
        <p>{BOSSES[state.stageBoss].summary}</p>
        <p>行動周期：{BOSSES[state.stageBoss].cycle.join(" → ")}</p>
      </details>
      
      <p className="dungeon-map-guide">光るステップが次の行き先 · 道に沿ってボスへ進む
        {state.dungeonMap.some(n => n.isDark) && <span>{hasLantern ? ' 🏮 ランタンで暗域を照らしています' : ' 🌑 暗域：直接進める位置まで近づくと種類が判明'}</span>}
      </p>
      <div className="dungeon-map-container" ref={containerRef}>
        <div className="dungeon-map-visual" style={{ height: mapHeight }}>
          <svg className="dungeon-paths" viewBox={`0 0 1000 ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
            {state.dungeonMap.flatMap(node => node.nextNodes.map(id => {
              const next = state.dungeonMap.find(n => n.id === id);
              if (!next) return null;
              const from = position(node), to = position(next);
              return <path key={`${node.id}-${id}`}
                className={`dungeon-path${node.id === state.currentNodeId ? ' available' : ''}`}
                d={`M ${from.x * 10} ${from.y} C ${from.x * 10} ${from.y - 55}, ${to.x * 10} ${to.y + 55}, ${to.x * 10} ${to.y}`} />;
            }))}
          </svg>
          {state.dungeonMap.map(node => {
            const isSelectable = node.depth === targetDepth && validNextNodes.includes(node.id);
            const isCurrent = node.id === state.currentNodeId;
            const revealed = isDungeonNodeRevealed(node, state.currentNodeId, state.dungeonMap, hasLantern);
            const pos = position(node);
            const label = !revealed ? '🌑 暗域' : node.type === 'boss' ? `💀 ${BOSSES[state.stageBoss].name}` : getNodeEmoji(node.type);
            return <div key={node.id} className="node-wrapper"
              ref={element => { if (element) nodeElements.current.set(node.id, element); else nodeElements.current.delete(node.id); }}
              style={{ left: `${pos.x}%`, top: pos.y }}>
              <button className={`dungeon-node${isSelectable ? ' selectable' : ''}${isCurrent ? ' current' : ''}${node.revealed && node.depth < currentDepth ? ' cleared' : ''}${!isSelectable && !isCurrent ? ' locked' : ''}${!revealed ? ' dark' : ''}`}
                disabled={!isSelectable} onClick={() => onEnterNode(node.id)}
                aria-label={`${node.depth + 1}歩目：${label}${isCurrent ? '（現在地）' : isSelectable ? '（選択可能）' : ''}`}>
                {label}
              </button>
              <span className="node-step">{isCurrent ? '現在地 · ' : ''}{node.depth + 1}歩目</span>
            </div>;
          })}
        </div>
      </div>
      
      <div className="dungeon-status">
        <p>HP: {state.hp} / {state.maxHp}</p>
        <p>Gold: {state.gold}</p>
        <button className="deck-view-btn" onClick={onOpenDeck}>🎴 デッキ確認</button>
      </div>
    </div>
  );
}
