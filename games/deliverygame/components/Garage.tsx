import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Mission, PlayerState, PRICES, StickerData } from '../types';
import { generateMissions } from '../services/geminiService';
import { Truck } from './GameCanvas';

interface Props {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  startDriving: (missions: Mission[]) => void;
}

const STICKER_PACK = ["📦", "🍕", "🚀", "💀", "🤡", "🦄", "👽", "💩", "🔥", "💣", "💎", "🚦"];
const STICKER_OFFSET = 0.01;
const STICKER_SCALE = 0.6;

export const Garage: React.FC<Props> = ({ playerState, setPlayerState, startDriving }) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'workshop'>('manifest');
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [selectedMissions, setSelectedMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  
  const truckRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const fetchMissions = async () => {
      setLoading(true);
      const missions = await generateMissions(playerState.day);
      setAvailableMissions(missions);
      setLoading(false);
    };
    fetchMissions();
  }, [playerState.day]);

  const toggleMission = (mission: Mission) => {
    if (selectedMissions.find(m => m.id === mission.id)) {
      setSelectedMissions(prev => prev.filter(m => m.id !== mission.id));
    } else {
      const currentLoad = selectedMissions.reduce((acc, m) => acc + m.weight, 0);
      if (currentLoad + mission.weight <= playerState.cargoCapacity) {
        setSelectedMissions(prev => [...prev, mission]);
      } else {
        alert("Not enough cargo space!");
      }
    }
  };

  const buyUpgrade = (type: 'speed' | 'capacity' | 'timer' | 'deco_bobble' | 'deco_sticker') => {
    let cost = 0;
    let update: Partial<PlayerState> = {};

    switch(type) {
      case 'speed': 
        cost = PRICES.UPGRADE_SPEED; 
        update = { speedMultiplier: playerState.speedMultiplier + 0.1 };
        break;
      case 'capacity':
        cost = PRICES.UPGRADE_CAPACITY;
        update = { cargoCapacity: playerState.cargoCapacity + 2 };
        break;
      case 'timer':
        cost = PRICES.UPGRADE_TIMER;
        update = { timeExtender: playerState.timeExtender + 10 };
        break;
      case 'deco_bobble':
        cost = PRICES.DECO_BOBBLE;
        if (!playerState.decorations.includes('bobblehead')) {
             update = { decorations: [...playerState.decorations, 'bobblehead'] };
        }
        break;
      case 'deco_sticker':
        // Now it just unlocks the sticker pack logic if we were locking it,
        // but for now, we'll just check if they have it to show UI
        cost = PRICES.DECO_STICKER;
        if (!playerState.decorations.includes('sticker')) {
            update = { decorations: [...playerState.decorations, 'sticker'] };
        }
        break;
    }

    if (playerState.money >= cost) {
      setPlayerState(prev => ({ ...prev, money: prev.money - cost, ...update }));
    }
  };

  const buyPaint = () => {
      const cost = PRICES.PAINT_JOB;
      if (playerState.money >= cost) {
          const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
          setPlayerState(prev => ({ 
              ...prev, 
              money: prev.money - cost,
              truckColor: randomColor
          }));
      }
  };

  const removeLastSticker = () => {
      setPlayerState(prev => ({
          ...prev,
          stickers: prev.stickers.slice(0, -1)
      }));
  };

  const clearStickers = () => {
      setPlayerState(prev => ({
          ...prev,
          stickers: []
      }));
  };

  const handleStickerPlace = ({ point, normal }: { point: THREE.Vector3; normal: THREE.Vector3 }) => {
      if (!selectedSticker || !truckRef.current) return;

      // Convert world intersection + normal into the truck's local space.
      const localPoint = truckRef.current.worldToLocal(point.clone());
      const truckWorldQuat = new THREE.Quaternion();
      truckRef.current.getWorldQuaternion(truckWorldQuat);
      const localNormal = normal.clone().normalize().applyQuaternion(truckWorldQuat.invert()).normalize();

      if (!Number.isFinite(localNormal.lengthSq()) || localNormal.lengthSq() < 1e-4) {
          localNormal.set(0, 0, 1);
      }

      const finalPos = localPoint.clone().add(localNormal.clone().multiplyScalar(STICKER_OFFSET));
      const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal);
      const spin = new THREE.Quaternion().setFromAxisAngle(localNormal, (Math.random() - 0.5) * 0.24);
      orientation.multiply(spin);
      const rotation = new THREE.Euler().setFromQuaternion(orientation);

      const newSticker: StickerData = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          emoji: selectedSticker,
          position: [finalPos.x, finalPos.y, finalPos.z],
          rotation: [rotation.x, rotation.y, rotation.z],
          scale: STICKER_SCALE
      };

      setPlayerState(prev => ({
          ...prev,
          stickers: [...prev.stickers, newSticker]
      }));
  };

  return (
    <div className={`w-full h-full flex flex-col md:flex-row bg-slate-800 ${selectedSticker ? 'cursor-crosshair' : 'cursor-auto'}`}>
      {/* LEFT PANEL - PREVIEW */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative bg-gradient-to-br from-gray-800 to-gray-900 border-r border-gray-700">
         <Canvas shadows camera={{ position: [9.0, 4.2, -10.0], fov: 45 }}>
             <ambientLight intensity={0.8} />
             <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
             <pointLight position={[-10, -10, -10]} intensity={0.5} />
             
             <Truck 
               ref={truckRef}
               decorations={playerState.decorations} 
               steeringVal={0}
               truckColor={playerState.truckColor}
               stickers={playerState.stickers}
               isPreview={true}
               stickerPlacementEnabled={Boolean(selectedSticker)}
               onStickerPlace={handleStickerPlace}
             />
             
             {/* Add Orbit Controls to allow looking around the truck */}
             <OrbitControls 
                enablePan={false} 
                enableRotate={!selectedSticker}
                enableZoom={!selectedSticker}
                minDistance={7} 
                maxDistance={22} 
                target={[0, 1.8, -0.6]} // Pull focus toward center to frame full truck
             />
         </Canvas>
         
         {/* Instructions Overlay */}
         <div className="absolute top-4 left-4 pointer-events-none">
             {selectedSticker ? (
                 <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold animate-pulse shadow-lg border-2 border-white">
                    CLICK TRUCK TO STAMP {selectedSticker}
                 </div>
             ) : (
                 <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                    DRAG TO ROTATE • SCROLL TO ZOOM
                 </div>
             )}
         </div>
         
         <div className="absolute bottom-4 left-4 bg-black/60 p-4 rounded-xl text-white font-mono text-sm">
            <div>FUNDS: <span className="text-green-400 text-xl">${playerState.money}</span></div>
            <div>CAPACITY: {selectedMissions.reduce((acc,m) => acc+m.weight, 0)} / {playerState.cargoCapacity}</div>
            <div>STICKERS: {playerState.stickers.length}</div>
         </div>
      </div>

      {/* RIGHT PANEL - UI */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto bg-slate-900 text-gray-200">
         <div className="flex border-b border-gray-700 sticky top-0 bg-slate-900 z-10">
            <button 
               onClick={() => setActiveTab('manifest')}
               className={`flex-1 py-4 font-retro text-sm ${activeTab === 'manifest' ? 'bg-yellow-500 text-black' : 'hover:bg-slate-800'}`}
            >
               MANIFEST
            </button>
            <button 
               onClick={() => setActiveTab('workshop')}
               className={`flex-1 py-4 font-retro text-sm ${activeTab === 'workshop' ? 'bg-blue-500 text-white' : 'hover:bg-slate-800'}`}
            >
               WORKSHOP
            </button>
         </div>

         <div className="p-6">
            {activeTab === 'manifest' ? (
                <div className="space-y-4">
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-yellow-500">AVAILABLE CONTRACTS</h2>
                      <div className="text-xs text-gray-500">DAY {playerState.day}</div>
                   </div>
                   
                   {loading ? (
                       <div className="text-center py-10 animate-pulse text-yellow-500">Scanning Local Network...</div>
                   ) : availableMissions.length === 0 ? (
                       <div className="text-center py-10 text-red-400">No contracts available. Try refreshing.</div>
                   ) : (
                       availableMissions.map(mission => {
                          const isSelected = selectedMissions.find(m => m.id === mission.id);
                          return (
                              <div 
                                key={mission.id}
                                onClick={() => toggleMission(mission)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all active:scale-95 ${isSelected ? 'bg-yellow-500/10 border-yellow-500' : 'bg-slate-800 border-slate-700 hover:border-gray-500'}`}
                              >
                                  <div className="flex justify-between items-start mb-2">
                                     <div className="font-bold text-white">{mission.addressNumber} {mission.addressStreet}</div>
                                     <div className="bg-green-900 text-green-300 px-2 py-0.5 rounded text-xs font-mono">${mission.baseReward}</div>
                                  </div>
                                  <div className="text-sm text-gray-400 mb-2">{mission.description}</div>
                                  <div className="flex gap-4 text-xs font-mono text-gray-500">
                                     <span>WEIGHT: {mission.weight}</span>
                                     <span>TIME: {mission.timeLimit}s</span>
                                  </div>
                              </div>
                          );
                       })
                   )}

                   <div className="h-4"></div>
                   <button 
                     onClick={() => startDriving(selectedMissions)}
                     disabled={selectedMissions.length === 0}
                     className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold font-retro rounded shadow-lg"
                   >
                      START ROUTE
                   </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* TRUCK UPGRADES */}
                    <section>
                       <h3 className="text-blue-400 font-bold mb-4 text-sm tracking-wider">PERFORMANCE</h3>
                       <div className="grid grid-cols-1 gap-3">
                           <button onClick={() => buyUpgrade('speed')} className="flex justify-between items-center p-3 bg-slate-800 rounded border border-slate-700 hover:border-blue-500 group">
                              <span>Engine Tune-Up <span className="text-xs text-gray-500 block">Speed +10%</span></span>
                              <span className="text-yellow-400 group-hover:scale-110 transition-transform">${PRICES.UPGRADE_SPEED}</span>
                           </button>
                           <button onClick={() => buyUpgrade('capacity')} className="flex justify-between items-center p-3 bg-slate-800 rounded border border-slate-700 hover:border-blue-500 group">
                              <span>Cargo Expander <span className="text-xs text-gray-500 block">Space +2</span></span>
                              <span className="text-yellow-400 group-hover:scale-110 transition-transform">${PRICES.UPGRADE_CAPACITY}</span>
                           </button>
                           <button onClick={() => buyUpgrade('timer')} className="flex justify-between items-center p-3 bg-slate-800 rounded border border-slate-700 hover:border-blue-500 group">
                              <span>GPS Upgrade <span className="text-xs text-gray-500 block">Time +10s</span></span>
                              <span className="text-yellow-400 group-hover:scale-110 transition-transform">${PRICES.UPGRADE_TIMER}</span>
                           </button>
                       </div>
                    </section>

                    {/* COSMETICS */}
                    <section>
                       <h3 className="text-pink-400 font-bold mb-4 text-sm tracking-wider">COSMETICS</h3>
                       <div className="grid grid-cols-2 gap-3 mb-4">
                           <button onClick={() => buyPaint()} className="p-3 bg-slate-800 rounded border border-slate-700 hover:border-pink-500">
                              <div className="text-sm">Repaint</div>
                              <div className="text-yellow-400 text-xs mt-1">${PRICES.PAINT_JOB}</div>
                           </button>
                           <button onClick={() => buyUpgrade('deco_bobble')} disabled={playerState.decorations.includes('bobblehead')} className="p-3 bg-slate-800 rounded border border-slate-700 hover:border-pink-500 disabled:opacity-50">
                              <div className="text-sm">Bobblehead</div>
                              <div className="text-yellow-400 text-xs mt-1">{playerState.decorations.includes('bobblehead') ? 'OWNED' : `$${PRICES.DECO_BOBBLE}`}</div>
                           </button>
                       </div>
                       
                       <div className="bg-slate-800 p-4 rounded border border-slate-700">
                          <div className="flex justify-between items-center mb-4">
                             <span className="text-sm font-bold">Sticker Pack</span>
                             {!playerState.decorations.includes('sticker') ? (
                                <button onClick={() => buyUpgrade('deco_sticker')} className="bg-yellow-500 text-black px-2 py-1 text-xs font-bold rounded hover:bg-yellow-400">
                                   UNLOCK ${PRICES.DECO_STICKER}
                                </button>
                             ) : (
                                <span className="text-green-400 text-xs font-bold">UNLOCKED</span>
                             )}
                          </div>
                          
                          {playerState.decorations.includes('sticker') ? (
                             <>
                                <div className="text-xs text-gray-300 mb-3">
                                   {selectedSticker ? `Selected: ${selectedSticker} (click truck to stamp, click sticker again to stop)` : 'Pick a sticker, then click the truck preview to place it.'}
                                </div>

                                <div className="grid grid-cols-5 gap-2 mb-3">
                                   {STICKER_PACK.map(sticker => (
                                      <button 
                                         key={sticker}
                                         onClick={() => setSelectedSticker(selectedSticker === sticker ? null : sticker)}
                                         className={`aspect-square flex items-center justify-center text-2xl rounded hover:bg-white/10 ${selectedSticker === sticker ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-black/30'}`}
                                      >
                                         {sticker}
                                      </button>
                                   ))}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                   <button
                                      onClick={removeLastSticker}
                                      disabled={playerState.stickers.length === 0}
                                      className="bg-slate-700 px-3 py-2 text-xs font-bold rounded border border-slate-500 hover:border-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                   >
                                      UNDO LAST
                                   </button>
                                   <button
                                      onClick={clearStickers}
                                      disabled={playerState.stickers.length === 0}
                                      className="bg-red-900/70 px-3 py-2 text-xs font-bold rounded border border-red-500/60 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
                                   >
                                      CLEAR ALL
                                   </button>
                                </div>
                             </>
                          ) : (
                             <div className="text-center text-xs text-gray-500 py-4 italic">
                                Purchase to customize your truck
                             </div>
                          )}
                       </div>
                    </section>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};
