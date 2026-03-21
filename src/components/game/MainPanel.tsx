// ===== Main Game Panel =====
// Unified UI controller: keybind toggles, tab nav, harvesting overlays,
// mode indicator, XP bar. Wires all panels into the HUD.

import { useEffect } from 'react';
import { useSurvivalStore } from '../../game/survivalStore';
import { RESOURCE_TYPES } from '../../game/crafting/ResourceQuality';
import { getLevelProgress, getXPToNextLevel } from '../../game/progression/XPSystem';
import InventoryPanel from './InventoryPanel';
import ProfessionPanel from './ProfessionPanel';
import { HarvestProgressBar, NearbyNodeIndicator, HarvestLootPopup, ModeIndicator } from './HarvestingUI';
import type { HeroAttributes } from '../../game/progression/XPSystem';

export default function MainPanel() {
  const gameMode = useSurvivalStore(s => s.gameMode);
  const activePanel = useSurvivalStore(s => s.activePanel);
  const togglePanel = useSurvivalStore(s => s.togglePanel);
  const toggleGameMode = useSurvivalStore(s => s.toggleGameMode);
  const inventory = useSurvivalStore(s => s.inventory);
  const itemDefs = useSurvivalStore(s => s.itemDefs);
  const professions = useSurvivalStore(s => s.professions);
  const heroProgression = useSurvivalStore(s => s.heroProgression);
  const harvestProgress = useSurvivalStore(s => s.harvestProgress);
  const nearbyNode = useSurvivalStore(s => s.nearbyNode);
  const lastHarvestResult = useSurvivalStore(s => s.lastHarvestResult);
  const startHarvestAction = useSurvivalStore(s => s.startHarvestAction);
  const cancelHarvest = useSurvivalStore(s => s.cancelHarvest);
  const equipFromSlot = useSurvivalStore(s => s.equipFromSlot);
  const unequipFromSlot = useSurvivalStore(s => s.unequipFromSlot);
  const sortBag = useSurvivalStore(s => s.sortBag);
  const spendAttribute = useSurvivalStore(s => s.spendAttribute);

  // Keybind handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Panel toggles (only when no panel is open, or closing current)
      if (key === 'i') { e.preventDefault(); togglePanel('inventory'); }
      if (key === 'p') { e.preventDefault(); togglePanel('professions'); }
      if (key === 'k') { e.preventDefault(); togglePanel('skillTree'); }
      if (key === 'c' && e.shiftKey) { e.preventDefault(); togglePanel('crafting'); }

      // Tab toggles game mode (only when no panel open)
      if (key === 'tab' && activePanel === 'none') {
        e.preventDefault();
        toggleGameMode();
      }

      // E to harvest (when in harvest mode and near a node)
      if (key === 'e' && gameMode === 'harvest' && activePanel === 'none') {
        e.preventDefault();
        if (harvestProgress) {
          cancelHarvest(); // cancel if already harvesting
        } else {
          startHarvestAction();
        }
      }

      // Escape closes any panel
      if (key === 'escape' && activePanel !== 'none') {
        e.preventDefault();
        togglePanel(activePanel);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activePanel, gameMode, harvestProgress, togglePanel, toggleGameMode, startHarvestAction, cancelHarvest]);

  // Get resource name for harvest UI
  const harvestResName = harvestProgress
    ? (RESOURCE_TYPES.find(r => r.id === harvestProgress.resourceTypeId)?.name ?? 'Resource')
    : '';

  const nearbyResType = nearbyNode
    ? RESOURCE_TYPES.find(r => r.id === nearbyNode.resourceTypeId)
    : null;

  const heroProgress = getLevelProgress(heroProgression.level, heroProgression.experience);

  return (
    <div className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto" style={{ zIndex: 40 }}>

      {/* Mode Indicator */}
      <ModeIndicator mode={gameMode} />

      {/* XP Bar (top bar, thin) */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#0f1419', zIndex: 45 }}>
        <div className="h-full" style={{
          width: `${heroProgress * 100}%`,
          background: 'linear-gradient(90deg, #d4af37, #e8cc66)',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Quick panel buttons (bottom-right) */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-1">
        {[
          { key: 'I', panel: 'inventory' as const, icon: '🎒', label: 'Inventory' },
          { key: 'P', panel: 'professions' as const, icon: '📊', label: 'Character' },
          { key: 'K', panel: 'skillTree' as const, icon: '🌳', label: 'Skills' },
          { key: 'Shift+C', panel: 'crafting' as const, icon: '🔨', label: 'Crafting' },
        ].map(btn => (
          <button
            key={btn.panel}
            onClick={() => togglePanel(btn.panel)}
            className="w-10 h-10 rounded flex items-center justify-center text-lg cursor-pointer hover:brightness-125 active:scale-95 relative"
            style={{
              background: activePanel === btn.panel
                ? 'linear-gradient(135deg, #d4af3740, #7a642040)'
                : 'linear-gradient(135deg, #1c2333cc, #283040cc)',
              border: `1px solid ${activePanel === btn.panel ? '#d4af37' : '#7a642040'}`,
            }}
            title={`${btn.label} [${btn.key}]`}
          >
            <span>{btn.icon}</span>
            <span className="absolute -bottom-0.5 right-0.5 text-[7px] font-bold" style={{ color: '#7a6420' }}>{btn.key}</span>
          </button>
        ))}
      </div>

      {/* Harvest Mode Overlays */}
      {gameMode === 'harvest' && !harvestProgress && nearbyNode && nearbyResType && (
        <NearbyNodeIndicator
          resourceName={nearbyResType.name}
          profession={nearbyResType.profession}
          tier={nearbyResType.tier}
        />
      )}

      {harvestProgress && (
        <HarvestProgressBar
          progress={harvestProgress.elapsed / harvestProgress.duration}
          resourceName={harvestResName}
          duration={harvestProgress.duration}
        />
      )}

      {lastHarvestResult && (
        <HarvestLootPopup
          resourceName={RESOURCE_TYPES.find(r => r.id === lastHarvestResult.resourceTypeId)?.name ?? 'Resource'}
          quantity={lastHarvestResult.quantity}
          quality={lastHarvestResult.quality as unknown as Record<string, number>}
          profXP={lastHarvestResult.professionXP}
          heroXP={lastHarvestResult.heroXP}
          visible={true}
        />
      )}

      {/* Panels */}
      {activePanel === 'inventory' && (
        <InventoryPanel
          inventory={inventory}
          itemDefs={itemDefs}
          onClose={() => togglePanel('inventory')}
          onEquipItem={equipFromSlot}
          onUnequipItem={unequipFromSlot}
          onSortInventory={sortBag}
        />
      )}

      {activePanel === 'professions' && (
        <ProfessionPanel
          professions={professions}
          heroProgression={heroProgression}
          onClose={() => togglePanel('professions')}
          onSpendAttribute={(attr) => spendAttribute(attr as keyof HeroAttributes)}
        />
      )}

      {/* Placeholder panels for skill tree and crafting */}
      {activePanel === 'skillTree' && (
        <PanelPlaceholder title="Skill Trees" hotkey="K" onClose={() => togglePanel('skillTree')} />
      )}

      {activePanel === 'crafting' && (
        <PanelPlaceholder title="Crafting" hotkey="Shift+C" onClose={() => togglePanel('crafting')} />
      )}
    </div>
  );
}

function PanelPlaceholder({ title, hotkey, onClose }: { title: string; hotkey: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#00000088', zIndex: 50 }}>
      <div className="w-96 p-6 rounded-lg text-center" style={{
        background: 'linear-gradient(135deg, #171d28, #0f1419)',
        border: '1px solid #7a642040',
      }}>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>{title}</h2>
        <p className="text-xs mb-4" style={{ color: '#a39882' }}>Coming soon — full SWG-style {title.toLowerCase()} system.</p>
        <button onClick={onClose} className="px-4 py-2 rounded text-sm cursor-pointer" style={{
          background: '#d4af3720', color: '#d4af37', border: '1px solid #7a642040',
        }}>
          Close [{hotkey}]
        </button>
      </div>
    </div>
  );
}
