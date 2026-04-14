import { EffectComposer, Bloom, Vignette, SSAO, ToneMapping, ChromaticAberration, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shakeState } from './BulletSystem';

/**
 * AAA-quality post-processing stack for TPS.
 * Order matters — effects are applied in sequence.
 */
export function PostFX() {
  const chromaticRef = useRef<any>(null);

  // Dynamically increase chromatic aberration when taking damage
  useFrame(() => {
    if (chromaticRef.current) {
      const intensity = shakeState.intensity;
      const offset = Math.min(intensity * 0.005, 0.003);
      chromaticRef.current.offset.set(offset, offset);
    }
  });

  return (
    <EffectComposer multisampling={4}>
      {/* SSAO — adds depth and grounding to the scene */}
      <SSAO
        samples={16}
        radius={0.12}
        intensity={18}
        luminanceInfluence={0.5}
        color={new THREE.Color('#000000')}
      />

      {/* Bloom — glowing lights, muzzle flashes, UI elements */}
      <Bloom
        luminanceThreshold={0.4}
        luminanceSmoothing={0.15}
        intensity={0.6}
        mipmapBlur
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

      {/* Vignette — darkened edges for focus */}
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
