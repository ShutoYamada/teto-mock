import { useMemo, useEffect, useRef } from 'react';
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
  const validNextNodes = state.currentNodeId
    ? state.dungeonMap.find((n: DungeonNode) => n.id === state.currentNodeId)?.nextNodes || []
    : mapByDepth[0]?.map((n: DungeonNode) => n.id) || [];

  // Scroll to bottom on load to show current progression
  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
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
      
      <div className="dungeon-map-container" ref={containerRef}>
        <div className="dungeon-map-visual">
          {/* Render depths from Boss (14) down to Start (0) */}
          {[...mapByDepth].reverse().map((depthNodes, revIndex) => {
            const depth = mapByDepth.length - 1 - revIndex;
            return (
              <div key={depth} className="dungeon-depth-row">
                <div className="depth-label">Depth {depth}</div>
                <div className="depth-nodes">
                  {depthNodes.map((node: DungeonNode) => {
                    const isSelectable = depth === targetDepth && validNextNodes.includes(node.id);
                    const isCleared = depth <= currentDepth;
                    const isCurrent = node.id === state.currentNodeId;
                    
                    let nodeClass = "dungeon-node";
                    if (isSelectable) nodeClass += " selectable";
                    if (isCleared) nodeClass += " cleared";
                    if (isCurrent) nodeClass += " current";
                    if (!isSelectable && !isCleared) nodeClass += " locked";
                    
                    return (
                      <div className="node-wrapper" key={node.id}>
                        <button 
                          className={nodeClass}
                          onClick={() => {
                            if (isSelectable) onEnterNode(node.id);
                          }}
                          disabled={!isSelectable}
                        >
                          {node.type === 'boss' ? `💀 ${BOSSES[state.stageBoss].name}` : getNodeEmoji(node.type)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
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
