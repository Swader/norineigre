import React, { useEffect, useState } from 'react';
import { ActiveDelivery } from '../types';

interface Props {
  deliveries: ActiveDelivery[];
  money: number;
}

const Timer = ({ delivery }: { delivery: ActiveDelivery }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - delivery.startTime) / 1000;
      const total = delivery.timeLimit; 
      const remaining = Math.max(0, total - elapsed);
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(timer);
  }, [delivery]);

  const isLow = timeLeft < 20;
  
  return (
    <div className={`text-2xl font-mono font-bold px-3 py-1 rounded ${isLow ? 'bg-red-600 animate-pulse text-white' : 'bg-black/50 text-white'}`}>
       {timeLeft.toFixed(1)}s
    </div>
  );
}

export const HUD: React.FC<Props> = ({ deliveries, money }) => {
  const active = deliveries.filter(d => d.status === 'active');
  const activeTarget = active[0]; 

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-[100]">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="bg-slate-900/90 p-4 rounded-xl border-b-4 border-yellow-500 text-yellow-500 font-retro shadow-lg pointer-events-auto">
          <div className="text-xs text-gray-400 mb-1">EARNINGS</div>
          <div className="text-3xl tracking-widest">${money}</div>
        </div>

        {activeTarget ? (
          <div className="bg-slate-900/90 p-4 rounded-xl border-b-4 border-blue-500 text-white max-w-md text-right shadow-lg pointer-events-auto">
             <div className="flex justify-end items-center gap-4 mb-2">
                <Timer delivery={activeTarget} />
                <div className="flex items-center gap-2">
                    <span className="animate-pulse bg-red-500 w-2 h-2 rounded-full"></span>
                    <span className="text-xs text-blue-300 font-bold tracking-wider">PRIORITY</span>
                </div>
             </div>
             <div className="text-4xl font-bold font-retro text-white drop-shadow-md">
                {activeTarget.addressNumber} <span className="text-blue-400">{activeTarget.addressStreet}</span>
             </div>
             <div className="text-gray-300 mt-2 font-medium">{activeTarget.packageType} for {activeTarget.recipient}</div>
             <div className="mt-2 text-2xl font-mono text-yellow-400 bg-black/30 inline-block px-3 py-1 rounded">
               Reward: ${activeTarget.currentReward}
             </div>
          </div>
        ) : (
          <div className="bg-slate-900/90 p-6 rounded-xl text-green-400 font-retro border-2 border-green-500 animate-pulse pointer-events-auto">
             ALL DELIVERIES COMPLETE<br/>
             <span className="text-sm text-white font-sans">Wait for summary...</span>
          </div>
        )}
      </div>

      {/* Bottom Hints */}
      <div className="flex flex-col items-center gap-2 mb-4">
         <div className="bg-slate-900/80 text-white px-8 py-3 rounded-full backdrop-blur border border-white/20 shadow-xl flex gap-6 text-sm font-bold pointer-events-auto">
            <span>[W] ACCELERATE</span>
            <span>[S] BRAKE</span>
            <span>[SPACE] DELIVER</span>
         </div>
      </div>
    </div>
  );
};