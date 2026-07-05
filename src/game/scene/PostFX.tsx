import { EffectComposer, Bloom, Vignette, SSAO, ToneMapping, ChromaticAberration, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

// Hoist THREE objects — R3F 9 prop diffing must not recreate these each render.
const SSAO_COLOR = new THREE.Color('#000000');
const CHROMATIC_OFFSET = new THREE.Vector2(0.0005, 0.0005);

/**
 * Post-processing stack for TPS.
 * Effect refs are intentionally avoided — R3F 9 + React 19 JSON.stringify
 * prop diffing crashes on postprocessing's circular Resolution graph.
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={4} enableNormalPass>
      <SSAO
        samples={16}
        radius={0.12}
        intensity={18}
        luminanceInfluence={0.5}
        color={SSAO_COLOR}
      />

      <Bloom
        luminanceThreshold={0.35}
        luminanceSmoothing={0.15}
        intensity={0.6}
        mipmapBlur
      />

      <DepthOfField
        focusDistance={0.02}
        focalLength={0.06}
        bokehScale={0}
      />

      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={CHROMATIC_OFFSET}
        radialModulation={true}
        modulationOffset={0.2}
      />

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}