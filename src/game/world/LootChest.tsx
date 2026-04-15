/**
 * LootChest — interactive loot container.
 * E key to open when nearby. Lid animation + gold coin burst VFX.
 * Ported from Motion LootChest.tsx.
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';

interface GoldCoin {
  id: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

let coinId = 0;

interface LootChestProps {
  position: [number, number, number];
  goldAmount?: number;
  /** Optional loot table drops (item ids) */
  drops?: string[];
}

export function LootChest({ position, goldAmount = 25 }: LootChestProps) {
  const [opened, setOpened] = useState(false);
  const [lidAngle, setLidAngle] = useState(0);
  const [coins, setCoins] = useState<GoldCoin[]>([]);
  const [nearby, setNearby] = useState(false);
  const groupRef = useRef<THREE.Group>(null!);
  const addGold = useGameStore(s => s.addGold);
  const addLog = useGameStore(s => s.addLog);
  const playerPosition = useGameStore(s => s.playerPosition);

  // E key to open
  useEffect(() => {
    if (opened) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearby && !opened) {
        setOpened(true);
        addGold(goldAmount);
        addLog(`Opened chest — +${goldAmount} gold!`, 'system');

        // Spawn coin particles
        const newCoins: GoldCoin[] = [];
        const count = Math.min(goldAmount, 12);
        for (let i = 0; i < count; i++) {
          newCoins.push({
            id: ++coinId,
            pos: new THREE.Vector3(
              position[0] + (Math.random() - 0.5) * 0.6,
              position[1] + 0.8,
              position[2] + (Math.random() - 0.5) * 0.6,
            ),
            vel: new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              3 + Math.random() * 2,
              (Math.random() - 0.5) * 2,
            ),
            age: 0,
            maxAge: 0.8 + Math.random() * 0.4,
          });
        }
        setCoins(newCoins);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearby, opened, goldAmount, position, addGold, addLog]);

  useFrame((_, dt) => {
    // Lid animation
    if (opened && lidAngle < Math.PI * 0.6) {
      setLidAngle(a => Math.min(a + dt * 4, Math.PI * 0.6));
    }

    // Proximity check
    const dx = playerPosition[0] - position[0];
    const dz = playerPosition[2] - position[2];
    setNearby(Math.sqrt(dx * dx + dz * dz) < 3);

    // Coin physics
    if (coins.length > 0) {
      setCoins(prev =>
        prev
          .map(c => {
            const newAge = c.age + dt;
            const newPos = c.pos.clone();
            if (newAge < c.maxAge * 0.5) {
              newPos.add(c.vel.clone().multiplyScalar(dt));
              c.vel.y -= 9.8 * dt;
            } else {
              const target = new THREE.Vector3(position[0], position[1] + 2, position[2]);
              const dir = target.sub(newPos).normalize();
              newPos.add(dir.multiplyScalar(dt * 8));
            }
            return { ...c, pos: newPos, age: newAge };
          })
          .filter(c => c.age < c.maxAge),
      );
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Chest body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.5, 0.5]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Metal trim */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.84, 0.04, 0.54]} />
        <meshStandardMaterial color="#DAA520" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Lid (pivots at back edge) */}
      <group position={[0, 0.25, -0.25]} rotation-x={-lidAngle}>
        <mesh position={[0, 0.15, 0.25]} castShadow>
          <boxGeometry args={[0.8, 0.3, 0.5]} />
          <meshStandardMaterial color="#A0522D" roughness={0.7} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.3, 0.25]}>
          <boxGeometry args={[0.84, 0.04, 0.54]} />
          <meshStandardMaterial color="#DAA520" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* Lock / clasp */}
      {!opened && (
        <mesh position={[0, 0.25, 0.26]}>
          <boxGeometry args={[0.1, 0.12, 0.02]} />
          <meshStandardMaterial color="#DAA520" metalness={0.95} roughness={0.2} emissive="#DAA520" emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Gold glow when opened */}
      {opened && (
        <pointLight position={[0, 0.5, 0]} color="#FFD700" intensity={3} distance={4} />
      )}

      {/* Floating gold coins */}
      {coins.map(c => {
        const t = c.age / c.maxAge;
        const scale = t > 0.5 ? 1 - (t - 0.5) * 2 : 1;
        return (
          <mesh key={c.id} position={c.pos.toArray()} scale={scale}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 8]} />
            <meshStandardMaterial
              color="#FFD700" emissive="#FFD700" emissiveIntensity={1.5}
              metalness={0.95} roughness={0.1}
            />
          </mesh>
        );
      })}

      {/* Interact prompt — visible when nearby and not opened */}
      {nearby && !opened && (
        <mesh position={[0, 1.2, 0]}>
          <planeGeometry args={[0.6, 0.18]} />
          <meshBasicMaterial color="#000" transparent opacity={0.6} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
