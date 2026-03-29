import { useEffect, useRef } from 'react';
import { useGameStore } from '../../game/store';
import { CombatState } from '../../game/core/types';

// ===== Grudge Design Tokens (from grudge-guide.html) =====
const GD = {
  bg: '#0d0b09', bgElev: '#18130f', panel: '#1f1813', panelSoft: '#271e18',
  line: '#4a3929', lineSoft: '#2e241b',
  text: '#f3e6d2', muted: '#b49d81', soft: '#88725a',
  gold: '#d6ac57', goldStrong: '#f0c978',
  ember: '#b64f2d', green: '#6bb78a', blue: '#6d95c6', red: '#c96d63',
};

// ===== Resource Bar (grudge-guide style — rounded fill, darker track) =====
function ResourceBar({ label, current, max, fillClass }: {
  label: string; current: number; max: number; fillClass: string;
}) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-2" style={{ fontSize: 12, color: GD.muted }}>
        <span>{label}</span>
        <strong style={{ color: GD.text, fontWeight: 700 }}>{current} / {max}</strong>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: '#100d0a', border: `1px solid ${GD.lineSoft}`, overflow: 'hidden' }}>
        <div className={fillClass} style={{ height: '100%', borderRadius: 999, width: `${pct}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

// ===== Player Frame (grudge-guide hero card style) =====
function PlayerFrame() {
  const ham = useGameStore(s => s.ham);
  const player = useGameStore(s => s.player);
  return (
    <div className="absolute top-6 left-4 w-72" style={{
      borderRadius: 18, padding: 16,
      background: 'radial-gradient(circle at 50% 0%, rgba(214,172,87,0.10), transparent 45%), linear-gradient(180deg, #241c16, #17120f)',
      border: `1px solid ${GD.line}`,
      boxShadow: '0 18px 40px rgba(0,0,0,0.38)',
    }}>
      {/* Hero head */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: GD.text, fontFamily: "'Cinzel', serif" }}>{player.name}</div>
          <div style={{ fontSize: 13, color: GD.muted, marginTop: 2 }}>Lv.{player.level} {player.species} {player.profession}</div>
        </div>
        <div style={{
          padding: '5px 8px', borderRadius: 999,
          background: 'rgba(214,172,87,0.09)', border: '1px solid rgba(214,172,87,0.18)',
          fontSize: 11, color: GD.goldStrong,
        }}>{player.faction}</div>
      </div>
      {/* Resource bars */}
      <div className="grid gap-2.5">
        <ResourceBar label="Health" current={ham.health.current} max={ham.health.max} fillClass="bg-health-fill" />
        <ResourceBar label="Action" current={ham.action.current} max={ham.action.max} fillClass="bg-focus-fill" />
        <ResourceBar label="Mind" current={ham.mind.current} max={ham.mind.max} fillClass="bg-stamina-fill" />
      </div>
    </div>
  );
}

// ===== Target Frame (grudge-guide style) =====
function TargetFrame() {
  const targetId = useGameStore(s => s.targetId);
  const enemies = useGameStore(s => s.enemies);
  const target = enemies.find(e => e.actorId === targetId);
  if (!target) return null;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-64" style={{
      borderRadius: 18, padding: 14,
      background: 'linear-gradient(180deg, #281d17ee, #1a0f09ee)',
      border: '1px solid rgba(201,109,99,0.18)',
      boxShadow: '0 14px 30px rgba(0,0,0,0.3)',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: 'linear-gradient(145deg, #51371b, #231912)',
          border: '1px solid rgba(201,109,99,0.34)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel', serif", fontSize: 13, color: GD.red,
        }}>{target.level}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: GD.red, fontFamily: "'Cinzel', serif" }}>{target.name}</div>
        </div>
        {target.ham.isDead && <span style={{ fontSize: 11, color: GD.red, textTransform: 'uppercase', letterSpacing: 1 }}>DEAD</span>}
      </div>
      <div className="grid gap-2">
        <ResourceBar label="HP" current={target.ham.health.current} max={target.ham.health.max} fillClass="bg-health-fill" />
        <ResourceBar label="AP" current={target.ham.action.current} max={target.ham.action.max} fillClass="bg-focus-fill" />
        <ResourceBar label="MP" current={target.ham.mind.current} max={target.ham.mind.max} fillClass="bg-mind-fill" />
      </div>
    </div>
  );
}

// ===== Quickbar Hotbar (grudge-guide quickbar-slot style) =====
function AbilityHotbar() {
  const useAbility = useGameStore(s => s.useAbility);
  const combat = useGameStore(s => s.combat);

  const abilities = [
    { id: 'burstShot', key: '1', icon: '🔫', name: 'Burst Shot', desc: 'Quick ranged burst' },
    { id: 'headShot', key: '2', icon: '🎯', name: 'Head Shot', desc: 'Precision mind damage' },
    { id: 'powerAttack', key: '3', icon: '⚔️', name: 'Power Attack', desc: 'Heavy melee strike' },
    { id: 'healDamage', key: '4', icon: '💚', name: 'Heal', desc: 'Restore health' },
    null,
    { id: 'item_food', key: '6', icon: '🍖', name: 'Food', desc: 'Consumable', disabled: true },
    { id: 'item_potion', key: '7', icon: '🧪', name: 'Potion', desc: 'Consumable', disabled: true },
    { id: 'item_relic', key: '8', icon: '🔮', name: 'Relic', desc: 'On-use relic', disabled: true },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < abilities.length) {
        const a = abilities[idx];
        if (a && !('disabled' in a && a.disabled)) useAbility(a.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex gap-1.5" style={{ bottom: 196 }}>
      {abilities.map((a, i) => {
        if (!a) return (
          <div key={i} style={{
            width: 52, height: 52, borderRadius: 14,
            background: GD.panelSoft, border: `1px solid ${GD.lineSoft}`, opacity: 0.25,
          }} />
        );
        const cd = combat.getCooldownRemaining('player', a.id);
        const isDisabled = 'disabled' in a && a.disabled;
        const isReady = cd <= 0 && !isDisabled;

        return (
          <button key={a.id}
            onClick={() => !isDisabled && useAbility(a.id)}
            className="relative flex flex-col items-center justify-center cursor-pointer hover:brightness-125 active:scale-95"
            style={{
              width: 52, height: 52, borderRadius: 14,
              background: isReady
                ? `linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))`
                : GD.panelSoft,
              border: `1px solid ${isReady ? 'rgba(214,172,87,0.24)' : GD.lineSoft}`,
              opacity: isDisabled ? 0.35 : 1,
              transition: '0.16s ease',
            }}
            title={`${a.name} [${a.key}]`}
          >
            <span className="text-lg">{a.icon}</span>
            {cd > 0 && (
              <div className="absolute inset-0 flex items-center justify-center" style={{
                borderRadius: 14, background: 'rgba(0,0,0,0.7)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: GD.text, fontFamily: 'JetBrains Mono, monospace' }}>
                  {cd.toFixed(1)}
                </span>
              </div>
            )}
            <span className="absolute -bottom-0.5 right-1" style={{ fontSize: 9, fontWeight: 700, color: GD.soft }}>{a.key}</span>
          </button>
        );
      })}
    </div>
  );
}

// ===== Combat Log (grudge-guide feed-item style) =====
function CombatLog() {
  const combatLog = useGameStore(s => s.combatLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [combatLog.length]);

  const colors: Record<string, string> = {
    damage: GD.red, heal: GD.green, miss: GD.soft, system: GD.gold, death: GD.ember,
  };

  return (
    <div className="absolute left-4 w-80 h-40 overflow-hidden" style={{
      bottom: 200,
      borderRadius: 18,
      background: 'linear-gradient(180deg, rgba(33,25,20,0.92), rgba(21,17,14,0.95))',
      border: `1px solid rgba(214,172,87,0.12)`,
      boxShadow: '0 14px 30px rgba(0,0,0,0.2)',
    }}>
      <div style={{
        padding: '8px 12px', fontSize: 12, fontFamily: "'Cinzel', serif",
        letterSpacing: 1.4, textTransform: 'uppercase' as const,
        color: GD.gold, borderBottom: `1px solid rgba(214,172,87,0.12)`,
      }}>Combat Log</div>
      <div ref={scrollRef} className="overflow-y-auto h-[calc(100%-32px)] px-3 py-1.5 space-y-1">
        {combatLog.map(entry => (
          <div key={entry.id} style={{ fontSize: 12, lineHeight: 1.35, color: colors[entry.type] || GD.muted }}>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Controls Help (grudge-guide shortcut chips) =====
function ControlsHelp() {
  const chips = ['W/S Fwd/Back', 'A/D Turn', 'Q/E Strafe', 'Tab Target/Mode', '1-4 Skills', 'I Bag', 'P Stats'];
  return (
    <div className="absolute top-6 right-4 flex flex-wrap gap-1.5 max-w-48 justify-end">
      {chips.map(c => (
        <span key={c} style={{
          padding: '4px 8px', borderRadius: 999,
          border: `1px solid ${GD.line}`,
          background: 'rgba(255,255,255,0.03)',
          fontSize: 11, color: GD.muted, whiteSpace: 'nowrap',
        }}>{c}</span>
      ))}
    </div>
  );
}

// ===== Main HUD =====
export default function GameHUD() {
  return (
    <div className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto">
      <PlayerFrame />
      <TargetFrame />
      <AbilityHotbar />
      <CombatLog />
      <ControlsHelp />
      <InputController />
    </div>
  );
}

// ===== Input Controller — Fortnite-style camera-relative movement =====
function InputController() {
  const keysRef = useRef(new Set<string>());
  const storeRef = useRef(useGameStore.getState());

  // Keep storeRef always fresh without re-renders
  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => { storeRef.current = s; });
    return unsub;
  }, []);

  // Key listeners — mounted exactly once
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (e.key === 'Tab') {
        e.preventDefault();
        const s = storeRef.current;
        const alive = s.enemies.filter(en => !en.ham.isDead);
        if (alive.length === 0) return;
        const idx = alive.findIndex(en => en.actorId === s.targetId);
        s.setTarget(alive[(idx + 1) % alive.length].actorId);
      }

      if (key === 'r') storeRef.current.resetGame();
      // Escape exits pointer lock
      if (key === 'escape') document.exitPointerLock();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // Movement tick — camera-relative: W moves forward away from camera
  useEffect(() => {
    let lastTime = performance.now();
    let rafId: number;

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const keys = keysRef.current;
      if (keys.size === 0) return;

      const s = storeRef.current;
      const isSprinting = keys.has('shift');
      const baseSpeed = isSprinting ? 14 : 8;
      const speed = baseSpeed * dt;
      const turnSpeed = 2.5 * dt;

      // Camera yaw defines "forward" — W moves away from camera
      const camYaw = s.cameraYaw;
      const fwdX = -Math.sin(camYaw);
      const fwdZ = -Math.cos(camYaw);
      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);

      let dx = 0, dz = 0;
      let isMoving = false;

      // W/S — forward/backward relative to camera
      if (keys.has('w')) { dx += fwdX * speed; dz += fwdZ * speed; isMoving = true; }
      if (keys.has('s')) { dx -= fwdX * speed; dz -= fwdZ * speed; isMoving = true; }

      // A/D — turn character (camera follows behind)
      if (keys.has('a')) s.rotatePlayer(turnSpeed);
      if (keys.has('d')) s.rotatePlayer(-turnSpeed);

      // Q/E — strafe relative to camera
      if (keys.has('q')) { dx -= rightX * speed; dz -= rightZ * speed; isMoving = true; }
      if (keys.has('e')) { dx += rightX * speed; dz += rightZ * speed; isMoving = true; }

      if (dx !== 0 || dz !== 0) {
        s.movePlayer(dx, dz);

        // Smoothly rotate character to face movement direction
        if (isMoving) {
          const targetAngle = Math.atan2(-dx, -dz);
          let current = s.playerRotation;
          let diff = targetAngle - current;
          // Normalize to [-PI, PI]
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          const rotLerp = Math.min(1, 10 * dt);
          const newRot = current + diff * rotLerp;
          // Set absolute rotation (bypass rotatePlayer's additive behavior)
          useGameStore.setState({ playerRotation: newRot });
        }
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return null;
}
