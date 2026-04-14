// ===== Warcraft 3 Inspired Bottom HUD =====
// Three-panel layout: Minimap | Unit Info + Portrait | Command Grid
// Reference: D:\Games\Models\Warcraft 3 Inspired Strategy HUD.html

import { useRef, useEffect } from 'react';
import { useGameStore } from '../../game/store';
import { CombatState } from '../../game/core/types';

// ===== Design tokens =====
const HUD = {
  bg: '#121212',
  panelBg: '#1a1a22',
  panelBorder: '#333',
  gold: '#d4af37',
  goldDim: '#7a6420',
  red: '#cc2222',
  blue: '#4466ff',
  green: '#2ecc71',
  text: '#e0d8c8',
  muted: '#888',
  height: 180,
};

// ===== Minimap =====
function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPos = useGameStore(s => s.playerPosition);
  const enemies = useGameStore(s => s.enemies);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 2.2; // world units per pixel
    const centerX = w / 2;
    const centerY = h / 2;

    // Clear
    ctx.fillStyle = '#050808';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1a2222';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Map boundary circle
    ctx.strokeStyle = '#2a3333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(w, h) / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Draw enemies
    enemies.forEach(e => {
      const ex = centerX + (e.positionVec[0] - playerPos[0]) / scale;
      const ey = centerY + (e.positionVec[2] - playerPos[2]) / scale;
      if (ex < 0 || ex > w || ey < 0 || ey > h) return;

      ctx.fillStyle = e.ham.isDead ? '#444' : '#e74c3c';
      ctx.shadowColor = e.ham.isDead ? 'transparent' : '#e74c3c';
      ctx.shadowBlur = e.ham.isDead ? 0 : 4;
      ctx.fillRect(ex - 2, ey - 2, 4, 4);
      ctx.shadowBlur = 0;
    });

    // Draw player (center, always visible)
    ctx.fillStyle = '#3498db';
    ctx.shadowColor = '#3498db';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player direction indicator
    const rot = useGameStore.getState().playerRotation;
    const dirX = centerX - Math.sin(rot) * 8;
    const dirY = centerY - Math.cos(rot) * 8;
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(dirX, dirY);
    ctx.stroke();
  });

  return (
    <div style={{
      width: 160, height: '100%', display: 'flex', flexDirection: 'column',
      background: HUD.panelBg, border: `3px solid ${HUD.panelBorder}`,
      boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
    }}>
      <canvas
        ref={canvasRef}
        width={154}
        height={140}
        style={{ margin: '3px auto 0', display: 'block', imageRendering: 'pixelated' }}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '2px 4px',
        borderTop: `1px solid ${HUD.panelBorder}`,
      }}>
        <button style={minimapBtnStyle}>MAP</button>
        <button style={minimapBtnStyle}>LOG</button>
      </div>
    </div>
  );
}

const minimapBtnStyle: React.CSSProperties = {
  fontSize: 8, fontFamily: "'Press Start 2P', monospace",
  background: '#2a2a35', color: '#888', border: `1px solid ${HUD.panelBorder}`,
  padding: '2px 6px', cursor: 'pointer',
};

// ===== Unit Info Panel =====
function UnitInfo() {
  const targetId = useGameStore(s => s.targetId);
  const enemies = useGameStore(s => s.enemies);
  const player = useGameStore(s => s.player);
  const ham = useGameStore(s => s.ham);
  const target = enemies.find(e => e.actorId === targetId);

  // Show target if selected, otherwise show player
  const showTarget = !!target;
  const name = showTarget ? target!.name : player.name;
  const level = showTarget ? target!.level : player.level;
  const icon = showTarget ? '👹' : '🛡️';
  const hp = showTarget ? target!.ham.health : ham.health;
  const ap = showTarget ? target!.ham.action : ham.action;
  const isDead = showTarget ? target!.ham.isDead : false;
  const combatState = showTarget ? target!.combatState : (useGameStore.getState().playerActor.combatState);

  const hpPct = hp.max > 0 ? (hp.current / hp.max) * 100 : 0;
  const apPct = ap.max > 0 ? (ap.current / ap.max) * 100 : 0;

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 14,
      background: HUD.panelBg, border: `3px solid ${HUD.panelBorder}`,
      boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
    }}>
      {/* Portrait */}
      <div style={{
        width: 80, height: 80, background: '#222',
        border: `2px solid ${showTarget ? '#c96d63' : HUD.gold}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `inset 0 0 20px rgba(0,0,0,0.6), 0 0 8px ${showTarget ? '#c96d6322' : '#d4af3722'}`,
      }}>
        <span style={{ fontSize: 36 }}>{icon}</span>
      </div>

      {/* Stats */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: showTarget ? '#c96d63' : HUD.gold,
            fontFamily: "'Cinzel', serif",
          }}>
            {name}
          </span>
          <span style={{ fontSize: 9, color: HUD.muted }}>
            LVL {level} {isDead ? '• DEAD' : ''}
          </span>
        </div>

        {/* HP Bar */}
        <div style={{ width: '100%', height: 14, background: '#220808', border: '1px solid #000' }}>
          <div style={{
            width: `${hpPct}%`, height: '100%',
            background: hpPct > 50 ? '#22aa44' : hpPct > 25 ? '#cc8822' : HUD.red,
            transition: 'width 0.2s',
          }} />
        </div>
        <div style={{ fontSize: 8, color: HUD.muted, marginTop: -2 }}>
          HP: {hp.current} / {hp.max}
        </div>

        {/* AP Bar */}
        <div style={{ width: '80%', height: 8, background: '#080822', border: '1px solid #000' }}>
          <div style={{
            width: `${apPct}%`, height: '100%',
            background: HUD.blue, transition: 'width 0.2s',
          }} />
        </div>
        <div style={{ fontSize: 8, color: HUD.muted, marginTop: -2 }}>
          AP: {ap.current} / {ap.max}
        </div>

        {/* Combat state */}
        <div style={{ fontSize: 8, color: combatState === CombatState.Combat ? '#ff6644' : '#6bb78a', marginTop: 2 }}>
          {combatState === CombatState.Combat ? '⚔ COMBAT' : combatState === CombatState.Dead ? '💀 DEAD' : '🕊 PEACE'}
        </div>
      </div>

      {/* Inventory slots (WC3 style — 2x2 grid) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2,
        height: '100%', padding: '4px 0', alignContent: 'center',
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 32, height: 32,
            background: 'rgba(0,0,0,0.4)', border: `1px solid ${HUD.panelBorder}`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ===== Command Grid (4x3) =====
function CommandGrid() {
  const useAbility = useGameStore(s => s.useAbility);
  const combat = useGameStore(s => s.combat);
  const targetId = useGameStore(s => s.targetId);

  const commands = [
    // Row 1
    { key: '1', icon: '🔫', label: 'BURST', ability: 'burstShot', color: '' },
    { key: '2', icon: '🎯', label: 'SNIPE', ability: 'headShot', color: '' },
    { key: '3', icon: '⚔️', label: 'POWER', ability: 'powerAttack', color: '' },
    { key: '4', icon: '💚', label: 'HEAL', ability: 'healDamage', color: '' },
    // Row 2
    { key: 'F', icon: '🍖', label: 'FOOD', ability: '', color: '', disabled: true },
    { key: 'G', icon: '🧪', label: 'POTION', ability: '', color: '', disabled: true },
    { key: 'V', icon: '🛡️', label: 'BLOCK', ability: '', color: '#3498db', disabled: true },
    { key: 'Space', icon: '💨', label: 'DODGE', ability: '', color: '#9b59b6', disabled: true },
    // Row 3
    { key: 'B', icon: '🏗️', label: 'BUILD', ability: '', color: '#3498db', disabled: true },
    { key: 'T', icon: '🏹', label: 'TOWER', ability: '', color: '', disabled: true },
    { key: 'U', icon: '🔼', label: 'UPGRDE', ability: '', color: '#9b59b6', disabled: true },
    { key: 'R', icon: '🔄', label: 'RESET', ability: '__reset', color: '' },
  ];

  const handleClick = (cmd: typeof commands[0]) => {
    if (cmd.disabled) return;
    if (cmd.ability === '__reset') {
      useGameStore.getState().resetGame();
      return;
    }
    if (cmd.ability) {
      useAbility(cmd.ability);
    }
  };

  return (
    <div style={{
      width: 240, display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      gap: 3, padding: 5,
      background: HUD.panelBg, border: `3px solid ${HUD.panelBorder}`,
      boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
    }}>
      {commands.map((cmd, i) => {
        const cd = cmd.ability && cmd.ability !== '__reset' ? combat.getCooldownRemaining('player', cmd.ability) : 0;
        const isDisabled = cmd.disabled || false;
        const isOnCd = cd > 0;

        return (
          <button
            key={i}
            onClick={() => handleClick(cmd)}
            style={{
              background: isDisabled ? '#1a1a22' : isOnCd ? '#1a1a22' : '#2a2a35',
              border: `2px solid ${cmd.color || (isDisabled ? '#222' : '#444')}`,
              cursor: isDisabled ? 'default' : 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative', padding: 2,
              opacity: isDisabled ? 0.3 : 1,
              transition: 'all 0.1s',
            }}
            title={cmd.label}
            onMouseEnter={e => {
              if (!isDisabled) (e.currentTarget.style.borderColor = HUD.gold);
            }}
            onMouseLeave={e => {
              (e.currentTarget.style.borderColor = cmd.color || (isDisabled ? '#222' : '#444'));
            }}
          >
            {/* Hotkey label */}
            <span style={{
              position: 'absolute', top: 1, right: 3,
              fontSize: 7, color: HUD.muted, fontFamily: 'monospace',
            }}>{cmd.key}</span>

            {/* Icon */}
            <span style={{ fontSize: 14, marginBottom: 2 }}>{cmd.icon}</span>
            <span style={{ fontSize: 6, color: isDisabled ? '#444' : '#aaa' }}>{cmd.label}</span>

            {/* Cooldown overlay */}
            {isOnCd && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                  {cd.toFixed(1)}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ===== Main Bottom HUD =====
export default function BottomHUD() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, width: '100%',
      height: HUD.height, zIndex: 200,
      background: HUD.bg,
      borderTop: `4px solid ${HUD.panelBorder}`,
      display: 'flex', padding: 6, gap: 6,
      // Subtle crosshatch pattern (WC3 style)
      backgroundImage: `
        linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
        linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
      `,
      backgroundSize: '4px 4px',
      pointerEvents: 'auto',
    }}>
      <Minimap />
      <UnitInfo />
      <CommandGrid />
    </div>
  );
}
