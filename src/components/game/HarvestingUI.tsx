// ===== Harvesting UI =====
// Progress bar, nearby node indicator, and resource quality tooltip.

import { getQualityLabel, getQualityColor, QUALITY_ATTRIBUTE_NAMES, RESOURCE_TYPES, type QualityAttribute } from '../../game/crafting/ResourceQuality';

interface HarvestBarProps {
  progress: number; // 0-1
  resourceName: string;
  duration: number;
}

export function HarvestProgressBar({ progress, resourceName, duration }: HarvestBarProps) {
  const pct = Math.min(100, progress * 100);
  const remaining = Math.max(0, duration * (1 - progress));

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 p-3 rounded-lg" style={{
      background: 'linear-gradient(135deg, #171d28ee, #0f1419ee)',
      border: '1px solid #7a642040', boxShadow: '0 0 30px #00000080',
    }}>
      <div className="text-sm font-bold mb-1 text-center" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>
        Harvesting {resourceName}
      </div>
      <div className="h-4 rounded-sm overflow-hidden" style={{ background: '#1a1200', border: '1px solid #7a642040' }}>
        <div className="h-full transition-all duration-100 rounded-sm" style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #d4af37cc, #e8cc66)',
        }} />
      </div>
      <div className="text-xs text-center mt-1" style={{ color: '#a39882' }}>
        {remaining.toFixed(1)}s remaining
      </div>
    </div>
  );
}

interface NearbyNodeProps {
  resourceName: string;
  profession: string;
  tier: number;
}

export function NearbyNodeIndicator({ resourceName, profession, tier }: NearbyNodeProps) {
  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-center" style={{
      background: '#0f1419cc', border: '1px solid #7a642030',
    }}>
      <div className="text-sm font-bold" style={{ color: '#d4af37' }}>{resourceName}</div>
      <div className="text-xs" style={{ color: '#a39882' }}>T{tier} · {profession}</div>
      <div className="text-xs mt-1" style={{ color: '#7a6420' }}>Press E to harvest</div>
    </div>
  );
}

interface HarvestLootProps {
  resourceName: string;
  quantity: number;
  quality: Record<string, number>;
  profXP: number;
  heroXP: number;
  visible: boolean;
}

export function HarvestLootPopup({ resourceName, quantity, quality, profXP, heroXP, visible }: HarvestLootProps) {
  if (!visible) return null;

  const oq = quality['OQ'] ?? 300;
  const label = getQualityLabel(oq);
  const color = getQualityColor(oq);

  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg" style={{
      background: 'linear-gradient(135deg, #171d28ee, #0f1419ee)',
      border: `1px solid ${color}40`, boxShadow: `0 0 20px ${color}20`,
      animation: 'fadeInUp 0.3s ease-out',
    }}>
      <div className="text-sm font-bold text-center" style={{ color, fontFamily: "'Cinzel', serif" }}>
        +{quantity} {resourceName}
      </div>
      <div className="text-xs text-center mt-1" style={{ color }}>
        {label} Quality (OQ: {oq})
      </div>
      <div className="flex gap-3 mt-2 justify-center text-xs">
        <span style={{ color: '#d4af37' }}>+{profXP} Prof XP</span>
        <span style={{ color: '#4a9eff' }}>+{heroXP} Hero XP</span>
      </div>
    </div>
  );
}

interface ModeIndicatorProps {
  mode: 'combat' | 'harvest';
}

export function ModeIndicator({ mode }: ModeIndicatorProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs font-bold" style={{
      background: mode === 'combat' ? '#ff444430' : '#d4af3730',
      border: `1px solid ${mode === 'combat' ? '#ff4444' : '#d4af37'}40`,
      color: mode === 'combat' ? '#ff6666' : '#d4af37',
    }}>
      {mode === 'combat' ? '⚔️ COMBAT MODE' : '⛏️ HARVEST MODE'} [Tab to toggle]
    </div>
  );
}
