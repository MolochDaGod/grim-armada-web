import { Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, Switch, useLocation } from 'wouter';
import DemoScene from './game/scene/DemoScene';
import GameHUD from './components/game/GameHUD';
import MainPanel from './components/game/MainPanel';
import BottomHUD from './components/game/BottomHUD';
import { Crosshair, HitMarker, DamageFlash } from './game/scene/VFX';
import { useGameStore } from './game/store';
import { useSurvivalStore } from './game/survivalStore';
import { audioManager } from './game/audio/AudioManager';
import { getGrudgeClient } from './lib/grudge-sdk';

function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: '#0a0e14' }}>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl font-bold mb-4"
        style={{ fontFamily: "'Cinzel Decorative', serif", color: '#d4af37' }}
      >
        GRIM ARMADA
      </motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm" style={{ color: '#a39882', fontFamily: "'Spectral SC', serif" }}
      >
        Loading combat systems...
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        className="mt-4 w-48 h-1 rounded-full overflow-hidden origin-left"
        style={{ background: '#d4af37' }}
      />
    </div>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #1a1200 0%, #0a0e14 70%)' }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              background: '#d4af3730',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100 - Math.random() * 200],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="text-6xl font-bold mb-2"
        style={{
          fontFamily: "'Cinzel Decorative', serif",
          background: 'linear-gradient(135deg, #d4af37, #e8cc66, #d4af37)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textShadow: 'none', filter: 'drop-shadow(0 0 20px #d4af3744)',
        }}
      >
        GRIM ARMADA
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-lg mb-1"
        style={{ color: '#a39882', fontFamily: "'Spectral SC', serif" }}
      >
        SWG-Inspired Tactical Combat
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-xs mb-8"
        style={{ color: '#7a6420' }}
      >
        A Grudge Studio Production
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 40px #d4af3766' }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-8 py-3 rounded-lg text-lg font-bold cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #d4af37, #b8952e)',
          color: '#0f1419', fontFamily: "'Cinzel', serif",
          boxShadow: '0 0 30px #d4af3744, inset 0 1px 0 #e8cc66',
          border: '1px solid #e8cc66',
        }}
      >
        ENTER COMBAT DEMO
      </motion.button>

      {/* Controls hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-12 text-center text-xs" style={{ color: '#555' }}
      >
        <div>WASD — Move · Shift — Sprint · Tab — Target · Click — Look</div>
        <div className="mt-1">1–4 Skills · Z/X/C Weapons · R Cycle · I Inventory · P Character</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-4 text-xs" style={{ color: '#555' }}
      >
        Powered by Grudge Backend · grudgewarlords.com
      </motion.div>
    </motion.div>
  );
}

function PlaySession({ autoStart = false }: { autoStart?: boolean }) {
  const [started, setStarted] = useState(autoStart);
  const addLog = useGameStore(s => s.addLog);
  const initSurvival = useSurvivalStore(s => s.initSurvivalSystems);
  const survivalTick = useSurvivalStore(s => s.survivalTick);

  // Init survival systems on game start
  useEffect(() => {
    if (!started) return;
    initSurvival();

    const client = getGrudgeClient();
    if (!client.isAuthenticated()) {
      client.loginAsGuest().catch(() => {});
    }

    let rafId: number;
    let lastTime = performance.now();
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      survivalTick(dt, useSurvivalStore.getState().nearbyNode ? useGameStore.getState().playerPosition : [0, 0, 0]);
    };
    rafId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafId);
  }, [started, initSurvival, survivalTick]);

  // /play deep-link: auto-enter combat after first gesture-safe init
  useEffect(() => {
    if (!autoStart || started) return;
    audioManager.init();
    audioManager.startAmbient();
    setStarted(true);
    addLog('Welcome to GRIM ARMADA — /play', 'system');
    addLog('WASD move · 1-4 skills · Z/X/C weapons · R cycle · Tab target · I bag · P panel', 'system');
  }, [autoStart, started, addLog]);

  const handleStart = () => {
    audioManager.init();
    audioManager.startAmbient();
    audioManager.playUIClick();

    setStarted(true);
    addLog('Welcome to GRIM ARMADA — Survival Explorer', 'system');
    addLog('WASD move · 1-4 skills · Z/X/C weapons · R cycle · Tab target', 'system');
    addLog('I Inventory · P Character · E harvest · Click canvas for look', 'system');
  };

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        {!started ? (
          <TitleScreen key="title" onStart={handleStart} />
        ) : (
          <motion.div
            key="game"
            className="relative w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Suspense fallback={<LoadingScreen />}>
              <DemoScene />
            </Suspense>
            <GameHUD />
            <MainPanel />
            <BottomHUD />
            <Crosshair />
            <HitMarker />
            <DamageFlash />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [loc] = useLocation();
  // /play and /play/* skip title screen for production UI deploy
  const isPlayRoute = loc === '/play' || loc.startsWith('/play/');

  return (
    <Switch>
      <Route path="/play">
        <PlaySession autoStart />
      </Route>
      <Route path="/play/:rest*">
        <PlaySession autoStart />
      </Route>
      <Route>
        <PlaySession autoStart={isPlayRoute} />
      </Route>
    </Switch>
  );
}
