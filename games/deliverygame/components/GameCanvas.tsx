import React, { useRef, useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ActiveDelivery, PlayerState, StickerData } from '../types';

interface Props {
  activeDeliveries: ActiveDelivery[];
  setActiveDeliveries: React.Dispatch<React.SetStateAction<ActiveDelivery[]>>;
  playerState: PlayerState;
  onComplete: (earned: number) => void;
  onFail: () => void;
}

// --- CONFIG ---
const CITY_SIZE = 10; // blocks
const BLOCK_SIZE = 80;
const HOUSE_OFFSET = 25;
const HOUSE_SIZE = 12; // Visual size

// Helper to generate static city data
const generateCityGrid = () => {
    const arr = [];
    for (let x = 0; x < CITY_SIZE; x++) {
      for (let z = 0; z < CITY_SIZE; z++) {
        const streetName = `ST ${x+1}`;
        // House 1 (Left of road)
        arr.push({
          id: `h-${x}-${z}-L`,
          number: (z * 2) + 1,
          street: streetName,
          position: new THREE.Vector3((x * BLOCK_SIZE) - HOUSE_OFFSET, 0, (z * BLOCK_SIZE)),
        });
        // House 2 (Right of road)
        arr.push({
          id: `h-${x}-${z}-R`,
          number: (z * 2) + 2,
          street: streetName,
          position: new THREE.Vector3((x * BLOCK_SIZE) + HOUSE_OFFSET, 0, (z * BLOCK_SIZE)),
        });
      }
    }
    return arr;
};

// Helper to get target position from ANY string
const getTargetPos = (d: ActiveDelivery) => {
    if (!d || !d.addressStreet) return null;
    
    // Hash the street name to a grid index (0 to CITY_SIZE-1)
    let hash = 0;
    for (let i = 0; i < d.addressStreet.length; i++) {
        hash = ((hash << 5) - hash) + d.addressStreet.charCodeAt(i);
        hash |= 0;
    }
    const streetIdx = Math.abs(hash) % CITY_SIZE;

    const isEven = d.addressNumber % 2 === 0;
    const zIdx = Math.min(Math.floor((d.addressNumber - 1) / 2), 9); 
    
    const targetX = isEven ? (streetIdx * BLOCK_SIZE) + HOUSE_OFFSET : (streetIdx * BLOCK_SIZE) - HOUSE_OFFSET;
    const targetZ = zIdx * BLOCK_SIZE;
    
    return new THREE.Vector3(targetX, 0, targetZ);
};

// --- COMPONENTS ---

const EmojiSticker = ({ emoji, position, rotation, scale }: { emoji: string, position: [number, number, number], rotation: [number, number, number], scale: number }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.font = '100px Arial'; // Standard sans-serif for emoji support
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 64, 70); // Slightly adjusted Y for centering
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [emoji]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[scale * 2.5, scale * 2.5]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        alphaTest={0.5} 
        side={THREE.DoubleSide} 
        polygonOffset 
        polygonOffsetFactor={-2} // Pulls pixels forward to avoid z-fighting
      />
    </mesh>
  );
};

const CompassOverlay = ({ truckRef, activeDelivery }: { truckRef: React.RefObject<THREE.Group>, activeDelivery?: ActiveDelivery }) => {
  const arrowRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!truckRef.current || !arrowRef.current) return;

    if (!activeDelivery) {
        if (arrowRef.current) arrowRef.current.style.opacity = '0.3';
        if (distRef.current) distRef.current.innerText = "NO SIGNAL";
        return;
    }
    
    const targetPos = getTargetPos(activeDelivery);
    if (!targetPos) {
        if (distRef.current) distRef.current.innerText = "ERR";
        return;
    }

    const truckPos = truckRef.current.position.clone();
    const toTarget = targetPos.clone().sub(truckPos);
    const dist = toTarget.length();
    
    if (distRef.current) distRef.current.innerText = `${Math.round(dist)}m`;
    arrowRef.current.style.opacity = '1';

    const targetAngle = Math.atan2(toTarget.x, toTarget.z);
    const truckRotation = truckRef.current.rotation.y;
    const relativeAngleRad = targetAngle - truckRotation;
    
    let deg = relativeAngleRad * (180 / Math.PI);
    deg -= 180;

    arrowRef.current.style.transform = `rotate(${-deg}deg)`;
  });

  return (
    <Html fullscreen style={{ pointerEvents: 'none', zIndex: 50 }}>
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="relative w-20 h-20 bg-slate-900/80 rounded-full border-2 border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
                    <div ref={arrowRef} className="transition-opacity duration-300 origin-center w-full h-full flex items-center justify-center">
                        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,1)]">
                            <polygon points="12 2 19 21 12 17 5 21 12 2" fill="currentColor" />
                        </svg>
                    </div>
                    <div className="absolute top-1 text-[8px] font-bold text-gray-500">N</div>
                </div>
                <div ref={distRef} className="mt-1 font-mono text-lg font-bold text-yellow-400 bg-black/90 px-2 rounded border border-yellow-600/50 shadow-lg">
                    --
                </div>
            </div>
        </div>
    </Html>
  );
}

export const Truck = React.forwardRef<THREE.Group, { 
    decorations: string[], 
    steeringVal: number, 
    activeDelivery?: ActiveDelivery,
    truckColor?: string,
    stickers?: StickerData[],
    isPreview?: boolean,
    onStickerPlace?: (point: THREE.Vector3, normal: THREE.Vector3) => void
}>(({ decorations, steeringVal, activeDelivery, truckColor = '#0044aa', stickers = [], isPreview = false, onStickerPlace }, ref) => {
  const wheelRef = useRef<THREE.Group>(null);
  const groupRef = ref as React.MutableRefObject<THREE.Group>;

  useLayoutEffect(() => {
    if (groupRef.current && !isPreview) {
      // SPAWN ON ROAD (Not Sky Drop)
      groupRef.current.position.set(0, 2.0, 0);
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, [isPreview]);

  useFrame((state, delta) => {
     // In preview mode, rotation is handled by OrbitControls now
     if (wheelRef.current) {
        wheelRef.current.rotation.z = -steeringVal * 2.0;
     }

     // ANTI-GRAVITY FAILSAFE
     if (groupRef.current && !isPreview && groupRef.current.position.y < 2.0) {
        groupRef.current.position.y = 2.0;
     }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isPreview && onStickerPlace) {
      e.stopPropagation();
      // Pass the intersection point and normal (world space) to parent
      if (e.face) {
        onStickerPlace(e.point, e.face.normal);
      }
    }
  };

  return (
    <group ref={ref}>
      {/* Cabin Light - Only in game */}
      {!isPreview && <pointLight position={[0, 2.5, -0.5]} intensity={1} distance={4} decay={2} color="#ffaa55" />}

      {/* --- CHASSIS --- */}
      {/* Run full length underneath */}
      <mesh position={[0, 1.0, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.5, 9.0]} /> 
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      
      {/* --- CABIN --- */}
      {/* Centered at Z=-2.0, Depth 2.5 -> Extents: -3.25 to -0.75 */}
      <group position={[0, 0, -2.0]}>
        {/* Main Cabin Block */}
        <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 3.5, 2.5]} />
            <meshStandardMaterial color={truckColor} roughness={0.4} />
        </mesh>
        {/* Hood */}
        <mesh position={[0, 1.25, -1.8]} rotation={[0.05, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.3, 2.0, 1.5]} />
            <meshStandardMaterial color={truckColor} roughness={0.4} />
        </mesh>
        {/* Interior Details */}
        <mesh position={[0, 2.5, 0.8]} rotation={[0, 0, 0]}>
             <boxGeometry args={[2.2, 2.0, 0.1]} />
             <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      {/* --- CARGO BOX --- */}
      {/* Centered at Z=1.75, Depth 5.0 -> Extents: -0.75 to 4.25 */}
      {/* Meets Cabin perfectly at Z=-0.75 */}
      <mesh 
        position={[0, 2.6, 1.75]} 
        castShadow 
        receiveShadow
        onPointerDown={handlePointerDown}
      >
         <boxGeometry args={[2.6, 4.0, 5.0]} />
         <meshStandardMaterial color="#BDB76B" roughness={0.9} />
      </mesh>
      
      {/* --- STICKERS --- */}
      {stickers.map(sticker => (
          <EmojiSticker 
            key={sticker.id}
            emoji={sticker.emoji}
            position={sticker.position as [number, number, number]}
            rotation={sticker.rotation as [number, number, number]}
            scale={sticker.scale}
          />
      ))}

      {/* Headlights */}
      <mesh position={[0.8, 1.0, -3.4]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-0.8, 1.0, -3.4]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
      </mesh>
      
      {/* Wheels */}
      <group position={[0, 0.5, 0]}>
        <mesh position={[1.3, 0, 2.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.6, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[-1.3, 0, 2.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.6, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[1.3, 0, -2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.6, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[-1.3, 0, -2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.6, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* --- INTERIOR / COCKPIT --- */}
      <group position={[0, 0, 0]}>
         {/* Steering Wheel */}
         <group ref={wheelRef} position={[-0.6, 1.8, -1.8]} rotation={[-0.4, 0, 0]}>
            <mesh>
               <torusGeometry args={[0.35, 0.05, 8, 16]} />
               <meshStandardMaterial color="#111" />
            </mesh>
         </group>

         {/* Bobblehead */}
         {decorations.includes('bobblehead') && (
            <group position={[-0.6, 1.95, -2.1]}>
               <mesh position={[0, 0.1, 0]}>
                 <sphereGeometry args={[0.08]} />
                 <meshStandardMaterial color="red" />
               </mesh>
               <mesh position={[0, 0, 0]}>
                 <cylinderGeometry args={[0.03, 0.05, 0.1]} />
                 <meshStandardMaterial color="white" />
               </mesh>
            </group>
         )}
      </group>

      {/* First Person Camera */}
      {!isPreview && (
        <>
            <PerspectiveCamera makeDefault position={[0, 2.8, -1.2]} rotation={[-0.05, 0, 0]} fov={85} near={0.1} />
            <CompassOverlay truckRef={groupRef} activeDelivery={activeDelivery} />
        </>
      )}
    </group>
  );
});

// A House Component
const House = ({ position, number, street, isTarget }: any) => {
  const isLeft = position[0] < 0; 
  return (
    <group position={position}>
      {/* The Building */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[HOUSE_SIZE, 8, HOUSE_SIZE]} />
        <meshStandardMaterial color={isTarget ? "#eec" : "#889"} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 8.5, 0]} rotation={[0, Math.PI/4, 0]}>
         <coneGeometry args={[10, 5, 4]} />
         <meshStandardMaterial color="#553333" />
      </mesh>
      
      {/* Door */}
      <mesh position={[0, 2, isLeft ? 6.1 : -6.1]} rotation={[0, isLeft ? 0 : Math.PI, 0]}>
         <planeGeometry args={[3, 4]} />
         <meshStandardMaterial color="#331100" />
      </mesh>
      
      {/* Address Text */}
      <group position={[0, 14, 0]}>
         <Html transform distanceFactor={60} sprite center zIndexRange={[1000, 0]}>
            <div className={`text-center font-retro p-2 rounded-lg select-none ${isTarget ? 'bg-yellow-500 text-black border-4 border-white animate-bounce shadow-xl' : 'bg-slate-800/80 text-white border border-slate-600'}`}>
               <div className="text-4xl font-bold">{number}</div>
               <div className="text-sm whitespace-nowrap px-2">{street}</div>
            </div>
         </Html>
      </group>
      
      {/* Delivery Zone Indicator */}
      {isTarget && (
        <mesh position={[0, 0.2, isLeft ? 10 : -10]} rotation={[-Math.PI/2, 0, 0]}>
           <ringGeometry args={[3, 5, 32]} />
           <meshBasicMaterial color="lime" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const City = ({ activeDeliveries, cityData }: any) => {
  return (
    <group>
      {/* Ground (Grass) */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[CITY_SIZE*BLOCK_SIZE/2, -0.1, CITY_SIZE*BLOCK_SIZE/2]} receiveShadow>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color="#3a5f0b" />
      </mesh>

      {/* Roads */}
      {Array.from({length: CITY_SIZE}).map((_, i) => (
         <React.Fragment key={i}>
            {/* Road Base */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[i * BLOCK_SIZE, 0.05, CITY_SIZE*BLOCK_SIZE/2]} receiveShadow>
               <planeGeometry args={[16, 4000]} />
               <meshStandardMaterial color="#333" roughness={0.8} />
            </mesh>
            {/* Markings */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[i * BLOCK_SIZE, 0.06, CITY_SIZE*BLOCK_SIZE/2]}>
               <planeGeometry args={[0.8, 4000]} />
               <meshStandardMaterial color="#eee" />
            </mesh>
         </React.Fragment>
      ))}

      {cityData.map((h: any) => {
        const isTarget = activeDeliveries.find((d: ActiveDelivery) => {
             const targetPos = getTargetPos(d);
             if (!targetPos) return false;
             const dx = Math.abs(targetPos.x - h.position.x);
             const dz = Math.abs(targetPos.z - h.position.z);
             return dx < 5 && dz < 5;
        });

        return (
          <House 
            key={h.id} 
            {...h} 
            isTarget={!!isTarget} 
          />
        );
      })}
    </group>
  );
};

const GameLoop = ({ activeDeliveries, setActiveDeliveries, playerState, onComplete, onFail }: Props) => {
  const truckRef = useRef<THREE.Group>(null);
  const [steeringVal, setSteeringVal] = useState(0);
  
  // Memoize city data for Collision Logic
  const cityData = useMemo(() => generateCityGrid(), []);

  // Controls state
  const keys = useRef<{ [key: string]: boolean }>({});
  const speed = useRef(0);
  const timeAccumulator = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!truckRef.current) return;

    // --- PHYSICS ---
    const ACCEL = 40 * playerState.speedMultiplier;
    const DRAG = 2.0;
    const TURN_SPEED = 2.5;
    const MAX_SPEED = 60 * playerState.speedMultiplier;

    // Input
    let throttle = 0;
    if (keys.current['KeyW'] || keys.current['ArrowUp']) throttle += 1;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) throttle -= 1;

    let turn = 0;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) turn += 1;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) turn -= 1;

    if (steeringVal !== turn) {
        setSteeringVal(turn); 
    }

    // Apply Acceleration
    speed.current += throttle * ACCEL * delta;
    
    // Clamp Speed
    if (speed.current > MAX_SPEED) speed.current = MAX_SPEED;
    if (speed.current < -MAX_SPEED/2) speed.current = -MAX_SPEED/2;

    // Apply Drag
    speed.current -= speed.current * DRAG * delta;
    if (Math.abs(speed.current) < 0.1 && throttle === 0) speed.current = 0;

    // Apply Turn
    if (Math.abs(speed.current) > 0.5) {
       const dir = speed.current > 0 ? 1 : -1;
       truckRef.current.rotation.y += turn * TURN_SPEED * delta * dir;
    }

    // PREDICT NEXT POSITION
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), truckRef.current.rotation.y);
    const displacement = forward.clone().multiplyScalar(speed.current * delta);
    const nextPos = truckRef.current.position.clone().add(displacement);

    // --- COLLISION DETECTION ---
    let collision = false;
    const TRUCK_RADIUS = 3.5;
    const HOUSE_RADIUS = 7.0; // Half of diag of 12x12 approx

    for (const h of cityData) {
        // Simple distance check first (optimization)
        const dist = nextPos.distanceTo(h.position);
        if (dist < (TRUCK_RADIUS + HOUSE_RADIUS)) {
            // Detailed Box check? 
            // House is 12x12 centered at h.position
            // Truck is approx 4x6
            // Overlap check
            const dx = Math.abs(nextPos.x - h.position.x);
            const dz = Math.abs(nextPos.z - h.position.z);
            const minSepX = (2.4/2) + (HOUSE_SIZE/2); // Truck Width/2 + House Width/2
            const minSepZ = (5/2) + (HOUSE_SIZE/2); // Truck Length/2 + House Len/2
            
            // Give a little buffer to avoid sticking
            if (dx < minSepX && dz < minSepZ) {
                collision = true;
                break;
            }
        }
    }

    if (collision) {
        // BOUNCE / STOP
        speed.current = -speed.current * 0.5; // Bounce back
    } else {
        // APPLY MOVEMENT
        truckRef.current.position.copy(nextPos);
    }

    // Bounds Collision (World Edge)
    const pos = truckRef.current.position;
    const LIMIT = 2000;
    if (pos.x < -LIMIT) pos.x = -LIMIT;
    if (pos.x > LIMIT) pos.x = LIMIT;
    if (pos.z < -LIMIT) pos.z = -LIMIT;
    if (pos.z > LIMIT) pos.z = LIMIT;

    // --- GAME LOGIC ---
    timeAccumulator.current += delta;
    if (timeAccumulator.current > 0.5) {
      timeAccumulator.current = 0;
      
      setActiveDeliveries(prev => {
          const now = Date.now();
          let changed = false;
          
          const updated = prev.map(d => {
              const elapsed = (now - d.startTime) / 1000;
              const totalTime = d.timeLimit + playerState.timeExtender;
              const remaining = totalTime - elapsed;
              
              if (d.status !== 'active') return d;

              if (remaining <= 0) {
                 changed = true;
                 return { ...d, currentReward: 0, status: 'failed' as const };
              }
              
              // Decay logic
              let reward = d.baseReward;
              if (remaining < 20) {
                 reward = Math.floor(Math.max(10, d.baseReward * (remaining / 20)));
              }
              
              if (reward !== d.currentReward) {
                  changed = true;
                  return { ...d, currentReward: reward };
              }
              return d;
          });

          return changed ? updated : prev;
      });
    }

    // Delivery Check
    if (keys.current['Space'] && Math.abs(speed.current) < 5) {
       const tPos = truckRef.current.position;
       
       activeDeliveries.forEach(d => {
         if (d.status !== 'active') return;

         const targetPos = getTargetPos(d);
         if (!targetPos) return;

         const dist = Math.sqrt(Math.pow(tPos.x - targetPos.x, 2) + Math.pow(tPos.z - targetPos.z, 2));
         
         if (dist < 30) {
             onComplete(d.currentReward);
             d.status = 'completed'; 
         }
       });
    }
  });

  const activeTarget = activeDeliveries.find(d => d.status === 'active');

  return (
    <>
      <City activeDeliveries={activeDeliveries} cityData={cityData} />
      <Truck 
        ref={truckRef} 
        decorations={playerState.decorations} 
        steeringVal={steeringVal}
        activeDelivery={activeTarget}
        truckColor={playerState.truckColor}
        stickers={playerState.stickers}
      />
    </>
  );
};

export const GameCanvas: React.FC<Props> = (props) => {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 75, near: 0.1, far: 3000 }}>
       {/* Daylight Background */}
       <color attach="background" args={['#87CEEB']} />
       
       {/* Ambient Light */}
       <ambientLight intensity={1.0} />
       
       {/* Sun */}
       <directionalLight position={[100, 200, 50]} intensity={2.0} castShadow shadow-mapSize={2048} />
       <mesh position={[100, 200, 50]}>
          <sphereGeometry args={[10]} />
          <meshBasicMaterial color="yellow" />
       </mesh>
       
       {/* Daylight Fog */}
       <fog attach="fog" args={['#87CEEB', 50, 900]} />
       
       <GameLoop {...props} />
    </Canvas>
  );
};