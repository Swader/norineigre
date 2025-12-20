import React, { useState } from 'react';
import { GamePhase } from '../types';

interface Props {
  setPhase: (phase: GamePhase) => void;
}

export const StartScreen: React.FC<Props> = ({ setPhase }) => {
  return (
    <div className="absolute inset-0 bg-blue-900 flex flex-col items-center justify-center text-white z-50">
      <div className="text-center space-y-8 animate-fade-in">
        <h1 className="text-6xl md:text-8xl font-retro text-yellow-400 drop-shadow-lg transform -skew-x-6">
          GEMINI<br/>EXPRESS
        </h1>
        <p className="text-xl md:text-2xl text-blue-200">
          The packages won't deliver themselves.
        </p>
        
        <div className="p-8 bg-black/40 rounded-xl backdrop-blur-sm border-2 border-yellow-400/50 max-w-md mx-auto">
          <p className="mb-4">
            Drive the truck. Find the house. Don't be late.
          </p>
          <ul className="text-left text-sm space-y-2 mb-6 text-gray-300">
            <li>• WASD / Arrows to Drive</li>
            <li>• SPACE to Deliver (when stopped near house)</li>
            <li>• Deliver faster for more $$$</li>
          </ul>

          <button
            onClick={() => setPhase(GamePhase.GARAGE)}
            className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded shadow-[0_4px_0_rgb(180,100,0)] active:shadow-none active:translate-y-1 transition-all"
          >
            START SHIFT
          </button>
        </div>
      </div>
    </div>
  );
};