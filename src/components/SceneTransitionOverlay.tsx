/**
 * Full-screen fade while biome portals transition (useSceneStore.transitioning).
 */

import { useSceneStore, SCENE_META } from '../game/scenes/useSceneStore';

export function SceneTransitionOverlay() {
  const transitioning = useSceneStore((s) => s.transitioning);
  const activeScene = useSceneStore((s) => s.activeScene);
  const meta = SCENE_META[activeScene];

  if (!transitioning) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at center, #0a0e14ee 0%, #000 100%)',
        transition: 'opacity 0.3s ease',
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div
          className="text-lg font-bold mb-1"
          style={{ fontFamily: "'Cinzel', serif", color: meta.color }}
        >
          {meta.name}
        </div>
        <div className="text-xs" style={{ color: '#a39882' }}>
          Transitioning…
        </div>
      </div>
    </div>
  );
}
