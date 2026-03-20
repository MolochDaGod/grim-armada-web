import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';

// ===== Bullet Pool =====
interface Bullet {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const MAX_BULLETS = 64;
const BULLET_SPEED = 60;

class BulletPool {
  bullets: Bullet[] = [];
  constructor() {
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0, maxLife: 1.5,
        color: '#ffaa22', size: 0.05,
      });
    }
  }

  spawn(from: THREE.Vector3, to: THREE.Vector3, color = '#ffaa22', size = 0.05) {
    const bullet = this.bullets.find(b => !b.active);
    if (!bullet) return;
    bullet.active = true;
    bullet.position.copy(from);
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    bullet.velocity.copy(dir).multiplyScalar(BULLET_SPEED);
    bullet.life = 0;
    bullet.maxLife = from.distanceTo(to) / BULLET_SPEED + 0.1;
    bullet.color = color;
    bullet.size = size;
  }

  update(dt: number) {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.position.addScaledVector(b.velocity, dt);
      b.life += dt;
      if (b.life >= b.maxLife) b.active = false;
    }
  }
}

// Singleton pool
export const bulletPool = new BulletPool();

// ===== Muzzle Flash Pool =====
interface MuzzleFlash {
  active: boolean;
  position: THREE.Vector3;
  life: number;
  scale: number;
}

const MAX_FLASHES = 16;

class FlashPool {
  flashes: MuzzleFlash[] = [];
  constructor() {
    for (let i = 0; i < MAX_FLASHES; i++) {
      this.flashes.push({ active: false, position: new THREE.Vector3(), life: 0, scale: 1 });
    }
  }
  spawn(pos: THREE.Vector3, scale = 1) {
    const f = this.flashes.find(x => !x.active);
    if (!f) return;
    f.active = true;
    f.position.copy(pos);
    f.life = 0;
    f.scale = scale;
  }
  update(dt: number) {
    for (const f of this.flashes) {
      if (!f.active) continue;
      f.life += dt;
      if (f.life > 0.08) f.active = false;
    }
  }
}

export const flashPool = new FlashPool();

// ===== Impact Spark Pool =====
interface Spark {
  active: boolean;
  position: THREE.Vector3;
  life: number;
  particles: { pos: THREE.Vector3; vel: THREE.Vector3 }[];
}

const MAX_SPARKS = 16;
const PARTICLES_PER_SPARK = 6;

class SparkPool {
  sparks: Spark[] = [];
  constructor() {
    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks.push({
        active: false, position: new THREE.Vector3(), life: 0,
        particles: Array.from({ length: PARTICLES_PER_SPARK }, () => ({
          pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        })),
      });
    }
  }
  spawn(pos: THREE.Vector3) {
    const s = this.sparks.find(x => !x.active);
    if (!s) return;
    s.active = true;
    s.position.copy(pos);
    s.life = 0;
    for (const p of s.particles) {
      p.pos.copy(pos);
      p.vel.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8,
      );
    }
  }
  update(dt: number) {
    for (const s of this.sparks) {
      if (!s.active) continue;
      s.life += dt;
      if (s.life > 0.4) { s.active = false; continue; }
      for (const p of s.particles) {
        p.pos.addScaledVector(p.vel, dt);
        p.vel.y -= 20 * dt; // gravity
      }
    }
  }
}

export const sparkPool = new SparkPool();

// ===== Fire a shot from attacker to target (visual only) =====
export function fireShot(
  attackerPos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  color = '#ffaa22',
) {
  const from = new THREE.Vector3(attackerPos.x, attackerPos.y + 1.2, attackerPos.z);
  const to = new THREE.Vector3(targetPos.x, targetPos.y + 1.0, targetPos.z);

  // Slight random spread
  to.x += (Math.random() - 0.5) * 0.5;
  to.y += (Math.random() - 0.5) * 0.3;
  to.z += (Math.random() - 0.5) * 0.5;

  bulletPool.spawn(from, to, color);
  flashPool.spawn(from, 0.8 + Math.random() * 0.4);
  // Delayed impact spark
  const dist = from.distanceTo(to);
  setTimeout(() => sparkPool.spawn(to), (dist / BULLET_SPEED) * 1000);
}

// ===== React Component: renders all active bullets, flashes, sparks =====
export function BulletRenderer() {
  const bulletsRef = useRef<THREE.InstancedMesh>(null);
  const flashRef = useRef<THREE.InstancedMesh>(null);
  const sparkRef = useRef<THREE.InstancedMesh>(null);

  const bulletGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const bulletMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffaa22' }), []);
  const flashGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffff88', transparent: true }), []);
  const sparkGeo = useMemo(() => new THREE.SphereGeometry(1, 4, 4), []);
  const sparkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff8844', transparent: true }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    bulletPool.update(cdt);
    flashPool.update(cdt);
    sparkPool.update(cdt);

    // Update bullet instances
    if (bulletsRef.current) {
      let idx = 0;
      for (const b of bulletPool.bullets) {
        if (idx >= MAX_BULLETS) break;
        if (b.active) {
          dummy.position.copy(b.position);
          dummy.scale.setScalar(b.size);
        } else {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        bulletsRef.current.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
      bulletsRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update flash instances
    if (flashRef.current) {
      let idx = 0;
      for (const f of flashPool.flashes) {
        if (idx >= MAX_FLASHES) break;
        if (f.active) {
          dummy.position.copy(f.position);
          const s = f.scale * (1 - f.life / 0.08) * 0.3;
          dummy.scale.setScalar(s);
        } else {
          dummy.position.set(0, -100, 0);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        flashRef.current.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
      flashRef.current.instanceMatrix.needsUpdate = true;
      flashMat.opacity = 0.9;
    }

    // Update spark instances
    if (sparkRef.current) {
      let idx = 0;
      for (const s of sparkPool.sparks) {
        for (const p of s.particles) {
          if (idx >= MAX_SPARKS * PARTICLES_PER_SPARK) break;
          if (s.active) {
            dummy.position.copy(p.pos);
            dummy.scale.setScalar(0.03 * (1 - s.life / 0.4));
          } else {
            dummy.position.set(0, -100, 0);
            dummy.scale.setScalar(0);
          }
          dummy.updateMatrix();
          sparkRef.current.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
      sparkRef.current.instanceMatrix.needsUpdate = true;
      sparkMat.opacity = 0.8;
    }
  });

  return (
    <>
      <instancedMesh ref={bulletsRef} args={[bulletGeo, bulletMat, MAX_BULLETS]} frustumCulled={false} />
      <instancedMesh ref={flashRef} args={[flashGeo, flashMat, MAX_FLASHES]} frustumCulled={false} />
      <instancedMesh ref={sparkRef} args={[sparkGeo, sparkMat, MAX_SPARKS * PARTICLES_PER_SPARK]} frustumCulled={false} />
    </>
  );
}
