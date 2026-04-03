import React from 'react';
import { GameState, GameCommand } from '../types';

interface Props {
  state: GameState;
  dispatch: React.Dispatch<GameCommand>;
}

export const EventScreen: React.FC<Props> = ({ state, dispatch }) => {
  if (state.currentEventId === 'merchant_drop') {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-full">
        <h2 className="text-2xl font-bold mb-8">商人の落とし物</h2>
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <p className="text-xl mb-8">目の前を歩く行商人が、何やら落とし物をしたようだ</p>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded transition-colors"
              onClick={() => dispatch({ type: 'EVENT_MERCHANT_STEAL' })}
            >
              くすねる (ランダムなカスタムミノを獲得)
            </button>
            
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
              onClick={() => dispatch({ type: 'EVENT_MERCHANT_RETURN' })}
            >
              返却する (50Gを獲得)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.currentEventId !== 'assault') {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-full">
        <h2 className="text-2xl font-bold mb-4">イベント</h2>
        <p>未定義のイベントです</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-full">
      <h2 className="text-2xl font-bold mb-8">強襲</h2>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
        <p className="text-xl mb-8">突然モンスターに襲われた</p>
        
        <div className="flex flex-col gap-4 w-full">
          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors"
            onClick={() => dispatch({ type: 'EVENT_ASSAULT_FIGHT' })}
          >
            戦う
          </button>
          
          <button
            className={`w-full py-3 px-4 rounded font-bold transition-colors ${
              state.gold >= 50 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-600 text-gray-300'
            }`}
            onClick={() => dispatch({ type: 'EVENT_ASSAULT_FLEE' })}
            title={state.gold < 50 ? "50Gを失う" : undefined}
          >
            逃げる (50Gを失う)
          </button>
        </div>
      </div>
    </div>
  );
};
