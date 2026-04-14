import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ===== Bullet with elongated trail =====
interface Bullet {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  trailLen: number;
  color: THREE.Color;
}

const MAX_BULLETS = 128;
const BULLET_SPEED = 80;

class BulletPool {
  bullets: Bullet[] = [];
  constructor() {
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({
        active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
        life: 0, maxLife: 2, trailLen: 0.4, color: new THREE.Color('#ffaa22'),
      });
    }
  }
  spawn(from: THREE.Vector3, to: THREE.Vector3, color = '#ffaa22') {
    const b = this.bullets.find(x => !x.active);
    if (!b) return;
    b.active = true;
    b.position.copy(from);
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    dir.x += (Math.random() - 0.5) * 0.02;
    dir.y += (Math.random() - 0.5) * 0.015;
    dir.z += (Math.random() - 0.5) * 0.02;
    dir.normalize();
    b.velocity.copy(dir).multiplyScalar(BULLET_SPEED);
    b.life = 0;
    b.maxLife = from.distanceTo(to) / BULLET_SPEED + 0.05;
    b.trailLen = 0.3 + Math.random() * 0.2;
    b.color.set(color);
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

export const bulletPool = new BulletPool();

// ===== Muzzle flash =====
interface Flash { active: boolean; position: THREE.Vector3; life: number; intensity: number; color: THREE.Color; }
const MAX_FLASHES = 24;

class FlashPool {
  flashes: Flash[] = [];
  constructor() {
    for (let i = 0; i < MAX_FLASHES; i++)
      this.flashes.push({ active: false, position: new THREE.Vector3(), life: 0, intensity: 1, color: new THREE.Color('#ffff88') });
  }
  spawn(pos: THREE.Vector3, intensity = 1, color = '#ffff88') {
    const f = this.flashes.find(x => !x.active);
    if (!f) return;
    f.active = true; f.position.copy(pos); f.life = 0; f.intensity = intensity; f.color.set(color);
  }
  update(dt: number) { for (const f of this.flashes) { if (!f.active) continue; f.life += dt; if (f.life > 0.1) f.active = false; } }
}

export const flashPool = new FlashPool();

// ===== Impact particles: sparks + smoke =====
interface Particle { pos: THREE.Vector3; vel: THREE.Vector3; life: number; type: 'spark' | 'smoke'; size: number; }
const MAX_PARTICLES = 256;

class ParticlePool {
  particles: Particle[] = [];
  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++)
      this.particles.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, type: 'spark', size: 0.02 });
  }
  spawnImpact(pos: THREE.Vector3) {
    for (let i = 0; i < 8; i++) {
      const p = this.particles.find(x => x.life <= 0);
      if (!p) break;
      p.pos.copy(pos); p.vel.set((Math.random() - 0.5) * 10, Math.random() * 8 + 3, (Math.random() - 0.5) * 10);
      p.life = 0.3 + Math.random() * 0.2; p.type = 'spark'; p.size = 0.015 + Math.random() * 0.02;
    }
    for (let i = 0; i < 4; i++) {
      const p = this.particles.find(x => x.life <= 0);
      if (!p) break;
      p.pos.copy(pos); p.vel.set((Math.random() - 0.5) * 2, Math.random() * 3 + 1, (Math.random() - 0.5) * 2);
      p.life = 0.5 + Math.random() * 0.3; p.type = 'smoke'; p.size = 0.08 + Math.random() * 0.1;
    }
  }
  spawnCasing(pos: THREE.Vector3) {
    const p = this.particles.find(x => x.life <= 0);
    if (!p) return;
    p.pos.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, 0));
    p.vel.set(2 + Math.random() * 2, 3 + Math.random() * 2, (Math.random() - 0.5) * 2);
    p.life = 0.8; p.type = 'spark'; p.size = 0.01;
  }
  update(dt: number) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt; p.pos.addScaledVector(p.vel, dt);
      if (p.type === 'spark') { p.vel.y -= 25 * dt; }
      else { p.vel.y -= 2 * dt; p.vel.multiplyScalar(1 - 3 * dt); p.size += dt * 0.15; }
    }
  }
}

export const particlePool = new ParticlePool();

// ===== Screen shake =====
export const shakeState = { intensity: 0, decay: 8 };
export function triggerScreenShake(intensity = 0.15) { shakeState.intensity = Math.max(shakeState.intensity, intensity); }

// ===== Hit marker state =====
export const hitMarkerState = { active: false, timer: 0, crit: false };
export function triggerHitMarker(crit = false) { hitMarkerState.active = true; hitMarkerState.timer = 0.2; hitMarkerState.crit = crit; }

// ===== Damage number pool =====
export interface DamageNumber { active: boolean; x: number; y: number; z: number; value: number; life: number; crit: boolean; heal: boolean; }
const MAX_DMG_NUMS = 16;
export const damageNumbers: DamageNumber[] = Array.from({ length: MAX_DMG_NUMS }, () => ({
  active: false, x: 0, y: 0, z: 0, value: 0, life: 0, crit: false, heal: false,
}));
export function spawnDamageNumber(pos: { x: number; y: number; z: number }, value: number, crit = false, heal = false) {
  const d = damageNumbers.find(x => !x.active);
  if (!d) return;
  d.active = true; d.x = pos.x + (Math.random() - 0.5) * 0.5; d.y = pos.y + 2.5; d.z = pos.z + (Math.random() - 0.5) * 0.5;
  d.value = Math.abs(value); d.life = 1.2; d.crit = crit; d.heal = heal;
}

// ===== Fire a shot =====
export function fireShot(
  attackerPos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  color = '#ffaa22',
) {
  const from = new THREE.Vector3(attackerPos.x, attackerPos.y + 1.2, attackerPos.z);
  const to = new THREE.Vector3(targetPos.x, targetPos.y + 1.0, targetPos.z);
  bulletPool.spawn(from, to, color);
  flashPool.spawn(from, 1.5 + Math.random() * 0.5, color === '#ffaa22' ? '#ffff88' : '#ff8866');
  particlePool.spawnCasing(from);
  const dist = from.distanceTo(to);
  setTimeout(() => particlePool.spawnImpact(to), (dist / BULLET_SPEED) * 1000);
}

// ===== Renderer =====
export function BulletRenderer() {
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const sparkRef = useRef<THREE.InstancedMesh>(null);
  const smokeRef = useRef<THREE.InstancedMesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashSphereRef = useRef<THREE.InstancedMesh>(null);

  const trailGeo = useMemo(() => new THREE.CylinderGeometry(0.015, 0.005, 1, 4), []);
  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffcc44', transparent: true, opacity: 0.9 }), []);
  const sparkGeo = useMemo(() => new THREE.SphereGeometry(1, 4, 4), []);
  const sparkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffaa44', transparent: true }), []);
  const smokeGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const smokeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#555544', transparent: true, roughness: 1 }), []);
  const flashGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffff88', transparent: true }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const _dir = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    bulletPool.update(cdt);
    flashPool.update(cdt);
    particlePool.update(cdt);
    if (shakeState.intensity > 0) shakeState.intensity = Math.max(0, shakeState.intensity - shakeState.decay * cdt);
    if (hitMarkerState.timer > 0) { hitMarkerState.timer -= cdt; if (hitMarkerState.timer <= 0) hitMarkerState.active = false; }
    for (const d of damageNumbers) { if (!d.active) continue; d.life -= cdt; d.y += 1.5 * cdt; if (d.life <= 0) d.active = false; }

    // Bullet trails
    if (trailRef.current) {
      let idx = 0;
      for (const b of bulletPool.bullets) {
        if (idx >= MAX_BULLETS) break;
        if (b.active) {
          _dir.copy(b.velocity).normalize();
          _quat.setFromUnitVectors(_up, _dir);
          dummy.position.copy(b.position);
          dummy.quaternion.copy(_quat);
          dummy.scale.set(1, b.trailLen * 3, 1);
        } else { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0); }
        dummy.updateMatrix();
        trailRef.current.setMatrixAt(idx++, dummy.matrix);
      }
      trailRef.current.instanceMatrix.needsUpdate = true;
    }

    // Flash spheres
    if (flashSphereRef.current) {
      let idx = 0;
      for (const f of flashPool.flashes) {
        if (idx >= MAX_FLASHES) break;
        if (f.active) {
          dummy.position.copy(f.position);
          dummy.scale.setScalar(f.intensity * (1 - f.life / 0.1) * 0.25);
        } else { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0); }
        dummy.updateMatrix();
        flashSphereRef.current.setMatrixAt(idx++, dummy.matrix);
      }
      flashSphereRef.current.instanceMatrix.needsUpdate = true;
      flashMat.opacity = 0.85;
    }

    // Flash point light
    if (flashLightRef.current) {
      const af = flashPool.flashes.find(f => f.active);
      if (af) { flashLightRef.current.position.copy(af.position); flashLightRef.current.intensity = af.intensity * (1 - af.life / 0.1) * 4; flashLightRef.current.color.copy(af.color); }
      else flashLightRef.current.intensity = 0;
    }

    // Sparks
    if (sparkRef.current) {
      let idx = 0;
      for (const p of particlePool.particles) {
        if (idx >= MAX_PARTICLES) break;
        if (p.life > 0 && p.type === 'spark') {
          dummy.position.copy(p.pos); dummy.scale.setScalar(p.size * Math.min(p.life * 5, 1));
        } else { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0); }
        dummy.updateMatrix(); sparkRef.current.setMatrixAt(idx++, dummy.matrix);
      }
      while (idx < MAX_PARTICLES) { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); sparkRef.current.setMatrixAt(idx++, dummy.matrix); }
      sparkRef.current.instanceMatrix.needsUpdate = true;
    }

    // Smoke
    if (smokeRef.current) {
      let idx = 0;
      for (const p of particlePool.particles) {
        if (idx >= 64) break;
        if (p.life > 0 && p.type === 'smoke') {
          dummy.position.copy(p.pos); dummy.scale.setScalar(p.size);
        } else { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0); }
        dummy.updateMatrix(); smokeRef.current.setMatrixAt(idx++, dummy.matrix);
      }
      while (idx < 64) { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); smokeRef.current.setMatrixAt(idx++, dummy.matrix); }
      smokeRef.current.instanceMatrix.needsUpdate = true;
      smokeMat.opacity = 0.3;
    }
  });

  return (
    <>
      <instancedMesh ref={trailRef} args={[trailGeo, trailMat, MAX_BULLETS]} frustumCulled={false} />
      <instancedMesh ref={flashSphereRef} args={[flashGeo, flashMat, MAX_FLASHES]} frustumCulled={false} />
      <instancedMesh ref={sparkRef} args={[sparkGeo, sparkMat, MAX_PARTICLES]} frustumCulled={false} />
      <instancedMesh ref={smokeRef} args={[smokeGeo, smokeMat, 64]} frustumCulled={false} />
      <pointLight ref={flashLightRef} intensity={0} distance={15} decay={2} />
    </>
  );
}
