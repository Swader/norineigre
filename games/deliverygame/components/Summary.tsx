import React from 'react';
import { ActiveDelivery, GamePhase } from '../types';

interface Props {
  deliveries: ActiveDelivery[];
  setPhase: (p: GamePhase) => void;
  nextDay: () => void;
}

export const Summary: React.FC<Props> = ({ deliveries, setPhase, nextDay }) => {
  const totalEarned = deliveries.reduce((acc, d) => d.status === 'completed' ? acc + d.currentReward : acc, 0);
  const completed = deliveries.filter(d => d.status === 'completed').length;
  
  return (
    <div className="absolute inset-0 bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-black/50 p-8 rounded-xl border border-gray-600 max-w-2xl w-full">
        <h2 className="text-4xl font-retro text-center mb-8 text-yellow-400">SHIFT COMPLETE</h2>
        
        <div className="space-y-4 mb-8">
           {deliveries.map(d => (
             <div key={d.id} className="flex justify-between items-center border-b border-gray-700 pb-2">
                <div>
                   <span className={d.status === 'completed' ? 'text-green-400' : 'text-red-500'}>
                      {d.status === 'completed' ? '✔ DELIVERED' : '✘ FAILED'}
                   </span>
                   <span className="ml-2 text-gray-400">{d.addressNumber} {d.addressStreet}</span>
                </div>
                <div className="font-mono">${d.currentReward}</div>
             </div>
           ))}
           <div className="flex justify-between items-center pt-4 text-xl font-bold">
              <span>TOTAL PROFIT</span>
              <span className="text-green-400">${totalEarned}</span>
           </div>
        </div>

        <button 
          onClick={() => { nextDay(); setPhase(GamePhase.GARAGE); }}
          className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-retro rounded"
        >
          NEXT DAY
        </button>
      </div>
    </div>
  );
};