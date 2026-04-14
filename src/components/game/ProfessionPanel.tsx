// ===== Profession Panel =====
// Shows all 10 professions with level, XP bar, and milestones.

import {
  type ProfessionState, ALL_PROFESSION_DEFS,
  getProfessionLevelProgress, getXPToNextProfLevel, getCurrentMilestone,
  type ProfessionName,
} from '../../game/professions/ProfessionManager';
import { getLevelProgress, getXPToNextLevel, type HeroProgression, getAvailableAttributePoints } from '../../game/progression/XPSystem';

interface ProfessionPanelProps {
  professions: ProfessionState[];
  heroProgression: HeroProgression;
  onClose: () => void;
  onSpendAttribute?: (attr: string) => void;
}

export default function ProfessionPanel({ professions, heroProgression, onClose, onSpendAttribute }: ProfessionPanelProps) {
  const availablePoints = getAvailableAttributePoints(heroProgression);
  const heroProgress = getLevelProgress(heroProgression.level, heroProgression.experience);
  const heroXPNeeded = getXPToNextLevel(heroProgression.level, heroProgression.experience);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#00000088', zIndex: 50 }}>
      <div className="w-[600px] max-h-[85vh] overflow-auto rounded-lg" style={{
        background: 'linear-gradient(135deg, #171d28, #0f1419)',
        border: '1px solid #7a642040', boxShadow: '0 0 40px #00000080',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #7a642030' }}>
          <h2 className="text-lg font-bold" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>Character</h2>
          <button onClick={onClose} className="px-2 py-1 rounded text-xs cursor-pointer" style={{ background: '#ff444420', color: '#ff6666', border: '1px solid #ff444440' }}>
            Close [P]
          </button>
        </div>

        <div className="p-4">
          {/* Hero Level */}
          <div className="mb-4 p-3 rounded" style={{ background: '#1c233340', border: '1px solid #d4af3720' }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>Hero Level {heroProgression.level}</span>
              <span className="text-xs" style={{ color: '#a39882' }}>{heroXPNeeded > 0 ? `${heroXPNeeded} XP to next` : 'MAX LEVEL'}</span>
            </div>
            <div className="h-2 rounded-sm overflow-hidden" style={{ background: '#1a1200', border: '1px solid #d4af3720' }}>
              <div className="h-full rounded-sm" style={{ width: `${heroProgress * 100}%`, background: 'linear-gradient(90deg, #d4af37cc, #e8cc66)' }} />
            </div>

            {/* Attributes */}
            {availablePoints > 0 && (
              <div className="mt-2 text-xs" style={{ color: '#d4af37' }}>
                {availablePoints} attribute points available
              </div>
            )}
            <div className="grid grid-cols-3 gap-1 mt-2">
              {Object.entries(heroProgression.attributes).map(([attr, val]) => (
                <div key={attr} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: '#0f141960' }}>
                  <span className="text-[10px] capitalize" style={{ color: '#a39882' }}>{attr}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold" style={{ color: '#ccc' }}>{val}</span>
                    {availablePoints > 0 && (
                      <button onClick={() => onSpendAttribute?.(attr)} className="w-4 h-4 rounded text-[9px] cursor-pointer" style={{ background: '#d4af3730', color: '#d4af37' }}>+</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gathering Professions */}
          <div className="text-xs font-bold mb-1" style={{ color: '#d4af37' }}>Gathering</div>
          <div className="space-y-1 mb-3">
            {professions.filter(p => {
              const def = ALL_PROFESSION_DEFS.find(d => d.name === p.profession);
              return def?.type === 'gathering';
            }).map(prof => <ProfessionRow key={prof.profession} prof={prof} />)}
          </div>

          {/* Crafting Professions */}
          <div className="text-xs font-bold mb-1" style={{ color: '#d4af37' }}>Crafting</div>
          <div className="space-y-1">
            {professions.filter(p => {
              const def = ALL_PROFESSION_DEFS.find(d => d.name === p.profession);
              return def?.type === 'crafting';
            }).map(prof => <ProfessionRow key={prof.profession} prof={prof} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfessionRow({ prof }: { prof: ProfessionState }) {
  const def = ALL_PROFESSION_DEFS.find(d => d.name === prof.profession);
  const progress = getProfessionLevelProgress(prof.level, prof.experience);
  const milestone = getCurrentMilestone(prof.profession as ProfessionName, prof.level);
  const xpNeeded = getXPToNextProfLevel(prof.level, prof.experience);

  return (
    <div className="flex items-center gap-2 p-2 rounded" style={{ background: '#1c233330' }}>
      <span className="text-lg">{def?.icon ?? '?'}</span>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold" style={{ color: '#ccc' }}>{prof.profession}</span>
          <span className="text-[10px]" style={{ color: '#a39882' }}>Lv.{prof.level} — {milestone.name}</span>
        </div>
        <div className="h-1.5 rounded-sm overflow-hidden mt-0.5" style={{ background: '#0f141960' }}>
          <div className="h-full rounded-sm" style={{
            width: `${progress * 100}%`,
            background: def?.type === 'gathering' ? '#10B981' : '#3B82F6',
          }} />
        </div>
        <div className="text-[9px] mt-0.5" style={{ color: '#666' }}>
          {xpNeeded > 0 ? `${xpNeeded} XP to Lv.${prof.level + 1}` : 'MAX'}
        </div>
      </div>
    </div>
  );
}
