import React, { useState, useEffect } from 'react';
import { ActiveDelivery, GamePhase, Mission, PlayerState } from './types';
import { StartScreen } from './components/StartScreen';
import { Garage } from './components/Garage';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Summary } from './components/Summary';

const App = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [playerState, setPlayerState] = useState<PlayerState>({
    money: 200, // Starter cash
    cargoCapacity: 5,
    speedMultiplier: 1.0,
    timeExtender: 0,
    decorations: [],
    day: 1,
    truckColor: '#0044aa', // Classic Blue
    stickers: []
  });
  
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);

  const startDriving = (missions: Mission[]) => {
    // Convert missions to active deliveries with start times
    const deliveries: ActiveDelivery[] = missions.map(m => ({
      ...m,
      startTime: Date.now(),
      currentReward: m.baseReward,
      status: 'active'
    }));
    setActiveDeliveries(deliveries);
    setPhase(GamePhase.DRIVING);
  };

  const handleDeliveryComplete = (earnedAmount: number) => {
    // Play sound?
    setPlayerState(prev => ({ ...prev, money: prev.money + earnedAmount }));
    
    // Check if all done
    setActiveDeliveries(prev => {
        // We update the specific one to completed in GameCanvas logic, 
        // but here we check if we should end the game loop
        const completedCount = prev.filter(d => d.status === 'completed').length + 1; // +1 because current one is finishing
        if (completedCount >= prev.length) {
            setTimeout(() => setPhase(GamePhase.SUMMARY), 1000);
        }
        return prev;
    });
  };

  const handleNextDay = () => {
    setPlayerState(prev => ({ ...prev, day: prev.day + 1 }));
  };

  // Check for game over (all failed or completed) periodically if needed,
  // but mostly handled in GameCanvas loop or handleDeliveryComplete
  useEffect(() => {
    if (phase === GamePhase.DRIVING) {
        const active = activeDeliveries.filter(d => d.status === 'active');
        if (active.length === 0 && activeDeliveries.length > 0) {
             // All processed
             const timer = setTimeout(() => setPhase(GamePhase.SUMMARY), 1500);
             return () => clearTimeout(timer);
        }
    }
  }, [activeDeliveries, phase]);

  return (
    <div className="w-full h-screen relative bg-gray-900 overflow-hidden">
      {phase === GamePhase.MENU && (
        <StartScreen setPhase={setPhase} />
      )}

      {phase === GamePhase.GARAGE && (
        <Garage 
          playerState={playerState} 
          setPlayerState={setPlayerState} 
          startDriving={startDriving} 
        />
      )}

      {phase === GamePhase.DRIVING && (
        <>
          <GameCanvas 
            activeDeliveries={activeDeliveries} 
            setActiveDeliveries={setActiveDeliveries} 
            playerState={playerState}
            onComplete={handleDeliveryComplete}
            onFail={() => {}} 
          />
          <HUD deliveries={activeDeliveries} money={playerState.money} />
        </>
      )}

      {phase === GamePhase.SUMMARY && (
        <Summary 
          deliveries={activeDeliveries} 
          setPhase={setPhase} 
          nextDay={handleNextDay}
        />
      )}
    </div>
  );
};

export default App;