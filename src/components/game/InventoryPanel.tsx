// ===== Inventory Panel =====
// 8x6 grid + equipment paper doll + item tooltips with quality stats.

import { useState } from 'react';
import { INVENTORY_COLS, INVENTORY_ROWS, type InventoryState, type ItemDef, type ItemInstance, RARITY_COLORS, type Rarity, EQUIP_SLOTS, type EquipSlot } from '../../game/inventory/InventorySystem';
import { getQualityLabel, getQualityColor, QUALITY_ATTRIBUTE_NAMES, QualityAttribute } from '../../game/crafting/ResourceQuality';

interface InventoryPanelProps {
  inventory: InventoryState;
  itemDefs: Map<string, ItemDef>;
  onClose: () => void;
  onMoveItem?: (from: number, to: number) => void;
  onEquipItem?: (slotIdx: number) => void;
  onUnequipItem?: (slot: EquipSlot) => void;
  onSortInventory?: () => void;
}

export default function InventoryPanel({ inventory, itemDefs, onClose, onMoveItem, onEquipItem, onUnequipItem, onSortInventory }: InventoryPanelProps) {
  const [hoveredItem, setHoveredItem] = useState<ItemInstance | null>(null);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#00000088', zIndex: 50 }}>
      <div className="w-[700px] max-h-[85vh] overflow-auto rounded-lg" style={{
        background: 'linear-gradient(135deg, #171d28, #0f1419)',
        border: '1px solid #7a642040', boxShadow: '0 0 40px #00000080',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #7a642030' }}>
          <h2 className="text-lg font-bold" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>Inventory</h2>
          <div className="flex gap-2">
            <button onClick={onSortInventory} className="px-2 py-1 rounded text-xs cursor-pointer" style={{ background: '#d4af3720', color: '#d4af37', border: '1px solid #7a642040' }}>
              Sort
            </button>
            <button onClick={onClose} className="px-2 py-1 rounded text-xs cursor-pointer" style={{ background: '#ff444420', color: '#ff6666', border: '1px solid #ff444440' }}>
              Close [I]
            </button>
          </div>
        </div>

        <div className="flex p-4 gap-4">
          {/* Grid */}
          <div>
            <div className="text-xs mb-1" style={{ color: '#a39882' }}>Backpack ({inventory.slots.filter(s => s.item).length}/{INVENTORY_COLS * INVENTORY_ROWS})</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${INVENTORY_COLS}, 40px)` }}>
              {inventory.slots.map((slot, i) => {
                const item = slot.item;
                const def = item ? itemDefs.get(item.defId) : null;
                const rarityColor = def ? RARITY_COLORS[def.rarity as Rarity] ?? '#555' : '#333';

                return (
                  <div key={i}
                    className="w-10 h-10 rounded flex items-center justify-center text-lg relative cursor-pointer hover:brightness-125"
                    style={{
                      background: item ? '#1c233380' : '#0f141980',
                      border: `1px solid ${item ? rarityColor + '60' : '#333'}`,
                    }}
                    onMouseEnter={() => item && setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onDoubleClick={() => item && def?.equipSlot && onEquipItem?.(i)}
                  >
                    {def && <span>{def.icon}</span>}
                    {item && item.quantity > 1 && (
                      <span className="absolute bottom-0 right-0.5 text-[9px] font-bold" style={{ color: '#ccc' }}>
                        {item.quantity}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Gold */}
            <div className="mt-2 text-xs" style={{ color: '#d4af37' }}>
              Gold: {inventory.gold}
            </div>
          </div>

          {/* Equipment + Tooltip */}
          <div className="flex-1">
            <div className="text-xs mb-1" style={{ color: '#a39882' }}>Equipment</div>
            <div className="grid grid-cols-2 gap-1">
              {EQUIP_SLOTS.map(slot => {
                const equipped = inventory.equipment[slot];
                const def = equipped ? itemDefs.get(equipped.defId) : null;

                return (
                  <div key={slot}
                    className="h-9 rounded flex items-center gap-1 px-2 cursor-pointer"
                    style={{
                      background: equipped ? '#1c233380' : '#0f141960',
                      border: `1px solid ${equipped ? '#7a642040' : '#222'}`,
                    }}
                    onDoubleClick={() => equipped && onUnequipItem?.(slot)}
                    onMouseEnter={() => equipped && setHoveredItem(equipped)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {def ? (
                      <>
                        <span className="text-sm">{def.icon}</span>
                        <span className="text-[10px] truncate" style={{ color: '#ccc' }}>{equipped?.customName ?? def.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px]" style={{ color: '#555' }}>{slot}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tooltip */}
            {hoveredItem && <ItemTooltip item={hoveredItem} itemDefs={itemDefs} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemTooltip({ item, itemDefs }: { item: ItemInstance; itemDefs: Map<string, ItemDef> }) {
  const def = itemDefs.get(item.defId);
  if (!def) return null;

  const rarityColor = RARITY_COLORS[def.rarity as Rarity] ?? '#ccc';

  return (
    <div className="mt-3 p-2 rounded" style={{ background: '#0a0e1499', border: `1px solid ${rarityColor}40` }}>
      <div className="text-sm font-bold" style={{ color: rarityColor, fontFamily: "'Cinzel', serif" }}>
        {item.customName ?? def.name}
      </div>
      <div className="text-[10px]" style={{ color: '#a39882' }}>{def.rarity} · T{def.tier} · {def.category}</div>
      <div className="text-[10px] mt-1" style={{ color: '#888' }}>{def.description}</div>

      {/* Computed stats (crafted items) */}
      {item.computedStats && Object.keys(item.computedStats).length > 0 && (
        <div className="mt-1 space-y-0.5">
          {Object.entries(item.computedStats).map(([stat, val]) => (
            <div key={stat} className="text-[10px] flex justify-between">
              <span style={{ color: '#a39882' }}>{stat}</span>
              <span style={{ color: '#4ade80' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resource quality */}
      {item.quality && (
        <div className="mt-1">
          <div className="text-[10px] font-bold" style={{ color: getQualityColor(item.quality[QualityAttribute.OQ]) }}>
            {getQualityLabel(item.quality[QualityAttribute.OQ])} Quality
          </div>
          <div className="grid grid-cols-2 gap-x-2 mt-0.5">
            {Object.entries(item.quality).map(([attr, val]) => (
              <div key={attr} className="text-[9px] flex justify-between">
                <span style={{ color: '#888' }}>{QUALITY_ATTRIBUTE_NAMES[attr as QualityAttribute] ?? attr}</span>
                <span style={{ color: getQualityColor(val as number) }}>{val as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.craftedBy && <div className="text-[9px] mt-1" style={{ color: '#7a6420' }}>Crafted by {item.craftedBy}</div>}
      {item.durability != null && <div className="text-[9px]" style={{ color: '#888' }}>Durability: {item.durability}/{item.maxDurability}</div>}
    </div>
  );
}
