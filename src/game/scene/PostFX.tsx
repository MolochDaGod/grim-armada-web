import { EffectComposer, Bloom, Vignette, SSAO, ToneMapping, ChromaticAberration, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shakeState } from './BulletSystem';
import { useGameStore } from '../store';

/**
 * AAA-quality post-processing stack for TPS.
 * Order matters — effects are applied in sequence.
 * Now includes ADS depth-of-field and dynamic bloom scaling.
 */
export function PostFX() {
  const chromaticRef = useRef<any>(null);
  const dofRef = useRef<any>(null);
  const bloomRef = useRef<any>(null);

  useFrame(() => {
    const store = useGameStore.getState();

    // Chromatic aberration — spikes on damage shake
    if (chromaticRef.current) {
      const intensity = shakeState.intensity;
      const offset = Math.min(intensity * 0.005, 0.003);
      chromaticRef.current.offset.set(offset, offset);
    }

    // DOF — activate when aiming down sights for cinematic zoom
    if (dofRef.current) {
      const aiming = store.isAiming;
      // Smoothly lerp bokeh scale: 0 when not aiming, 3 when ADS
      const target = aiming ? 3.0 : 0.0;
      const current = dofRef.current.bokehScale;
      dofRef.current.bokehScale = current + (target - current) * 0.1;
    }

    // Bloom — slightly higher during weapon fire (camera shake = proxy)
    if (bloomRef.current) {
      const fireBoost = Math.min(shakeState.intensity * 1.5, 0.4);
      bloomRef.current.intensity = 0.6 + fireBoost;
    }
  });

  return (
    <EffectComposer multisampling={4} enableNormalPass>
      {/* SSAO — adds depth and grounding to the scene */}
      <SSAO
        samples={16}
        radius={0.12}
        intensity={18}
        luminanceInfluence={0.5}
        color={new THREE.Color('#000000')}
      />

      {/* Bloom — glowing lights, muzzle flashes, spell effects */}
      <Bloom
        ref={bloomRef}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.15}
        intensity={0.6}
        mipmapBlur
      />

      {/* Depth of Field — cinematic background blur when ADS */}
      <DepthOfField
        ref={dofRef}
        focusDistance={0.02}
        focalLength={0.06}
        bokehScale={0}
      />

      {/* Chromatic Aberration — subtle lens effect, increases on damage */}
      <ChromaticAberration
        ref={chromaticRef}
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0005, 0.0005)}
        radialModulation={true}
        modulationOffset={0.2}
      />

      {/* Tone Mapping — ACES filmic for cinematic look */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* Vignette — darkened edges for focus, tighter when aiming */}
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
