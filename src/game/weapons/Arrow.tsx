/**
 * Arrow — physics-based arrow projectile with gravity arc and trail ribbon.
 * Ported from Motion Arrow.tsx.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Trail config ────────────────────────────────────────────────────────────
const TRAIL_POINTS = 20;
const TRAIL_HW = 0.015;

export interface ArrowData {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  gravity: number;
  lifetime: number;
  trailColor: string;
}

interface ArrowProps {
  data: ArrowData;
  onExpire: (id: string) => void;
}

function buildTrailGeo(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(TRAIL_POINTS * 2 * 3);
  const alphas = new Float32Array(TRAIL_POINTS * 2);
  const indices: number[] = [];
  for (let i = 0; i < TRAIL_POINTS - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geo.setIndex(indices);
  return geo;
}

export function Arrow({ data, onExpire }: ArrowProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Mesh>(null!);
  const age = useRef(0);
  const vel = useRef(data.direction.clone().normalize().multiplyScalar(data.speed));
  const history = useRef<THREE.Vector3[]>([]);
  const stuck = useRef(false);

  const trailGeo = useMemo(() => buildTrailGeo(), []);
  const trailMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * 0.55);
      }
    `,
    uniforms: { uColor: { value: new THREE.Color(data.trailColor) } },
  }), [data.trailColor]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    age.current += delta;
    if (age.current >= data.lifetime) { onExpire(data.id); return; }
    if (stuck.current) return;

    // ── Gravity arc ─────────────────────────────────────────────────────
    vel.current.y -= data.gravity * delta;
    const dp = vel.current.clone().multiplyScalar(delta);
    data.position.add(dp);
    groupRef.current.position.copy(data.position);

    // ── Orient arrow along velocity ─────────────────────────────────────
    const dir = vel.current.clone().normalize();
    groupRef.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1), dir,
    );

    // ── Stick into ground ───────────────────────────────────────────────
    if (data.position.y <= 0.05) {
      data.position.y = 0.05;
      stuck.current = true;
    }

    // ── Trail ───────────────────────────────────────────────────────────
    history.current.unshift(data.position.clone());
    if (history.current.length > TRAIL_POINTS) history.current.length = TRAIL_POINTS;

    if (trailRef.current && history.current.length >= 2) {
      const posAttr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
      const alphaAttr = trailGeo.getAttribute('alpha') as THREE.BufferAttribute;
      const camPos = state.camera.position;
      for (let i = 0; i < TRAIL_POINTS; i++) {
        const p = history.current[Math.min(i, history.current.length - 1)];
        const toC = new THREE.Vector3().subVectors(camPos, p).normalize();
        const rgt = new THREE.Vector3().crossVectors(dir, toC).normalize();
        const w = TRAIL_HW * (1 - i / TRAIL_POINTS);
        const idx = i * 2;
        posAttr.setXYZ(idx, p.x + rgt.x * w, p.y + rgt.y * w, p.z + rgt.z * w);
        posAttr.setXYZ(idx + 1, p.x - rgt.x * w, p.y - rgt.y * w, p.z - rgt.z * w);
        const a = 1 - i / TRAIL_POINTS;
        alphaAttr.setX(idx, a);
        alphaAttr.setX(idx + 1, a);
      }
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <group ref={groupRef} position={data.position.toArray()}>
        {/* Arrow shaft */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.8, 6]} />
          <meshStandardMaterial color="#8b6f47" roughness={0.7} />
        </mesh>
        {/* Arrow head */}
        <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.03, 0.1, 4]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Fletching */}
        <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.035, 0.12, 3]} />
          <meshStandardMaterial color="#cc4444" roughness={0.9} />
        </mesh>
      </group>

      {/* Trail ribbon */}
      <mesh ref={trailRef} geometry={trailGeo} material={trailMat} frustumCulled={false} />
    </group>
  );
}
