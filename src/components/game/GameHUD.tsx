import { useEffect, useRef } from 'react';
import { useGameStore } from '../../game/store';
import { CombatState } from '../../game/core/types';

// ===== HAM Bar =====
function HAMBar({ label, current, max, color, barBg }: {
  label: string; current: number; max: number; color: string; barBg: string;
}) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs font-semibold" style={{ fontFamily: "'Spectral SC', serif" }}>
        <span style={{ color }}>{label}</span>
        <span className="text-[#a39882]">{current}/{max}</span>
      </div>
      <div className="h-3 rounded-sm overflow-hidden" style={{ background: barBg, border: `1px solid ${color}40` }}>
        <div className="h-full transition-all duration-300 rounded-sm" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
    </div>
  );
}

// ===== Player Frame =====
function PlayerFrame() {
  const ham = useGameStore(s => s.ham);
  const player = useGameStore(s => s.player);
  return (
    <div className="absolute top-4 left-4 w-64 p-3 rounded-lg" style={{
      background: 'linear-gradient(135deg, #171d28ee, #0f1419ee)',
      border: '1px solid #7a642040', boxShadow: '0 0 20px #d4af3710',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: '#d4af3730', border: '1px solid #d4af37', color: '#d4af37' }}>
          {player.level}
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif" }}>{player.name}</div>
          <div className="text-xs" style={{ color: '#a39882' }}>{player.species} {player.profession}</div>
        </div>
      </div>
      <HAMBar label="HEALTH" current={ham.health.current} max={ham.health.max} color="#d4af37" barBg="#1a1200" />
      <HAMBar label="ACTION" current={ham.action.current} max={ham.action.max} color="#4a9eff" barBg="#0a1a2a" />
      <HAMBar label="MIND" current={ham.mind.current} max={ham.mind.max} color="#b56aff" barBg="#1a0a2a" />
    </div>
  );
}

// ===== Target Frame =====
function TargetFrame() {
  const targetId = useGameStore(s => s.targetId);
  const enemies = useGameStore(s => s.enemies);
  const target = enemies.find(e => e.actorId === targetId);

  if (!target) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-60 p-3 rounded-lg" style={{
      background: 'linear-gradient(135deg, #281d17ee, #1a0f09ee)',
      border: '1px solid #a8643240', boxShadow: '0 0 15px #ff444420',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#ff444430', border: '1px solid #ff4444', color: '#ff4444' }}>
          {target.level}
        </div>
        <div className="text-sm font-bold" style={{ color: '#ff6666', fontFamily: "'Cinzel', serif" }}>
          {target.name}
        </div>
        {target.ham.isDead && <span className="text-xs text-red-500 ml-auto">DEAD</span>}
      </div>
      <HAMBar label="HP" current={target.ham.health.current} max={target.ham.health.max} color="#ef4444" barBg="#1a0808" />
      <HAMBar label="AP" current={target.ham.action.current} max={target.ham.action.max} color="#3b82f6" barBg="#08101a" />
      <HAMBar label="MP" current={target.ham.mind.current} max={target.ham.mind.max} color="#a855f7" barBg="#140820" />
    </div>
  );
}

// ===== Ability Hotbar =====
function AbilityHotbar() {
  const useAbility = useGameStore(s => s.useAbility);
  const combat = useGameStore(s => s.combat);

  const abilities = [
    { id: 'burstShot', key: '1', icon: '🔫', name: 'Burst Shot' },
    { id: 'headShot', key: '2', icon: '🎯', name: 'Head Shot' },
    { id: 'powerAttack', key: '3', icon: '⚔️', name: 'Power Attack' },
    { id: 'healDamage', key: '4', icon: '💚', name: 'Heal' },
    null, // slot 5 empty
    { id: 'item_food', key: '6', icon: '🍖', name: 'Food', disabled: true },
    { id: 'item_potion', key: '7', icon: '🧪', name: 'Potion', disabled: true },
    { id: 'item_relic', key: '8', icon: '🔮', name: 'Relic', disabled: true },
  ];

  // Keyboard shortcuts
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1">
      {abilities.map((a, i) => {
        if (!a) return (
          <div key={i} className="w-12 h-12 rounded border opacity-30" style={{ background: '#0f1419', borderColor: '#333' }} />
        );
        const cd = combat.getCooldownRemaining('player', a.id);
        const isDisabled = 'disabled' in a && a.disabled;

        return (
          <button key={a.id}
            onClick={() => !isDisabled && useAbility(a.id)}
            className="w-12 h-12 rounded relative flex flex-col items-center justify-center text-lg cursor-pointer hover:brightness-125 active:scale-95 transition-all"
            style={{
              background: isDisabled ? '#1a1a1a' : cd > 0 ? '#1a1a1aaa' : 'linear-gradient(135deg, #1c2333, #283040)',
              border: `1px solid ${isDisabled ? '#333' : cd > 0 ? '#555' : '#7a6420'}`,
              opacity: isDisabled ? 0.4 : 1,
            }}
            title={`${a.name} [${a.key}]`}
          >
            <span>{a.icon}</span>
            {cd > 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded" style={{ background: '#00000088' }}>
                <span className="text-xs font-bold text-white">{cd.toFixed(1)}</span>
              </div>
            )}
            <span className="absolute -bottom-0.5 right-0.5 text-[8px] font-bold" style={{ color: '#7a6420' }}>{a.key}</span>
          </button>
        );
      })}
    </div>
  );
}

// ===== Combat Log =====
function CombatLog() {
  const combatLog = useGameStore(s => s.combatLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [combatLog.length]);

  const colors: Record<string, string> = {
    damage: '#ef4444', heal: '#4ade80', miss: '#a39882', system: '#d4af37', death: '#ff6600',
  };

  return (
    <div className="absolute bottom-20 left-4 w-80 h-40 rounded-lg overflow-hidden" style={{
      background: '#0f1419cc', border: '1px solid #7a642020',
    }}>
      <div className="px-2 py-1 text-xs font-bold" style={{ color: '#d4af37', fontFamily: "'Cinzel', serif", borderBottom: '1px solid #7a642030' }}>
        Combat Log
      </div>
      <div ref={scrollRef} className="overflow-y-auto h-[calc(100%-24px)] px-2 py-1 space-y-0.5">
        {combatLog.map(entry => (
          <div key={entry.id} className="text-xs leading-tight" style={{ color: colors[entry.type] || '#ccc' }}>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Controls Help =====
function ControlsHelp() {
  return (
    <div className="absolute top-4 right-4 p-2 rounded-lg text-xs" style={{
      background: '#0f1419cc', border: '1px solid #7a642020', color: '#a39882',
    }}>
      <div className="font-bold mb-1" style={{ color: '#d4af37' }}>Controls</div>
      <div>W/A/S/D — Move</div>
      <div>Q/E — Strafe</div>
      <div>Tab — Cycle targets</div>
      <div>1-4 — Abilities</div>
      <div>Click enemy — Target</div>
      <div>R — Reset game</div>
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
