import { Suspense, useState } from 'react';
import DemoScene from './game/scene/DemoScene';
import GameHUD from './components/game/GameHUD';
import { useGameStore } from './game/store';

function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: '#0a0e14' }}>
      <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Cinzel Decorative', serif", color: '#d4af37' }}>
        GRIM ARMADA
      </h1>
      <div className="text-sm" style={{ color: '#a39882', fontFamily: "'Spectral SC', serif" }}>
        Loading combat systems...
      </div>
      <div className="mt-4 w-48 h-1 rounded-full overflow-hidden" style={{ background: '#1a1200' }}>
        <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: '#d4af37' }} />
      </div>
    </div>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
      background: 'radial-gradient(ellipse at center, #1a1200 0%, #0a0e14 70%)',
    }}>
      <h1 className="text-6xl font-bold mb-2" style={{
        fontFamily: "'Cinzel Decorative', serif",
        background: 'linear-gradient(135deg, #d4af37, #e8cc66, #d4af37)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        textShadow: 'none', filter: 'drop-shadow(0 0 20px #d4af3744)',
      }}>
        GRIM ARMADA
      </h1>
      <p className="text-lg mb-1" style={{ color: '#a39882', fontFamily: "'Spectral SC', serif" }}>
        SWG-Inspired Tactical Combat
      </p>
      <p className="text-xs mb-8" style={{ color: '#7a6420' }}>
        A Grudge Studio Production
      </p>

      <button onClick={onStart}
        className="px-8 py-3 rounded-lg text-lg font-bold cursor-pointer transition-all hover:brightness-110 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #d4af37, #b8952e)',
          color: '#0f1419', fontFamily: "'Cinzel', serif",
          boxShadow: '0 0 30px #d4af3744, inset 0 1px 0 #e8cc66',
          border: '1px solid #e8cc66',
        }}>
        ENTER COMBAT DEMO
      </button>

      <div className="mt-12 text-center text-xs" style={{ color: '#555' }}>
        <div>W/A/S/D — Move · Q/E — Strafe · Tab — Target · 1-4 — Abilities</div>
        <div className="mt-1">Click enemies to target · R — Reset</div>
      </div>

      <div className="absolute bottom-4 text-xs" style={{ color: '#333' }}>
        Powered by Grudge Backend · grudgewarlords.com
      </div>
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const addLog = useGameStore(s => s.addLog);

  const handleStart = () => {
    setStarted(true);
    addLog('Welcome to GRIM ARMADA Combat Demo', 'system');
    addLog('Use Tab to select a target, then press 1-4 to use abilities', 'system');
  };

  if (!started) return <TitleScreen onStart={handleStart} />;

  return (
    <div className="relative w-full h-full">
      <Suspense fallback={<LoadingScreen />}>
        <DemoScene />
      </Suspense>
      <GameHUD />
    </div>
  );
}
