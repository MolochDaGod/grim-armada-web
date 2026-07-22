import { Suspense, useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import DemoScene from './game/scene/DemoScene';
import GameHUD from './components/game/GameHUD';
import MainPanel from './components/game/MainPanel';
import BottomHUD from './components/game/BottomHUD';
import { Crosshair, HitMarker, DamageFlash } from './game/scene/VFX';
import { SceneTransitionOverlay } from './components/SceneTransitionOverlay';
import { useGameStore } from './game/store';
import { useSurvivalStore } from './game/survivalStore';
import { audioManager } from './game/audio/AudioManager';
import { getGrudgeClient, type GrudgeAuth } from './lib/grudge-sdk';
import { AccountRow } from './components/AccountRow';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { GrokCoderChat } from './components/ai/GrokCoderChat';

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
        className="text-sm"
        style={{ color: '#a39882', fontFamily: "'Spectral SC', serif" }}
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

function TitleScreen({
  onStart,
  auth,
  onSignIn,
}: {
  onStart: () => void;
  auth: GrudgeAuth | null;
  onSignIn: () => void;
}) {
  const isGuest = !auth || auth.username === 'Player' || auth.username?.startsWith('guest');
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #1a1200 0%, #0a0e14 70%)' }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
    >
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
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px #d4af3744)',
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
          color: '#0f1419',
          fontFamily: "'Cinzel', serif",
          boxShadow: '0 0 30px #d4af3744, inset 0 1px 0 #e8cc66',
          border: '1px solid #e8cc66',
        }}
      >
        ENTER COMBAT DEMO
      </motion.button>

      <AccountRow auth={auth} isGuest={isGuest} onSignIn={onSignIn} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-12 text-center text-xs"
        style={{ color: '#555' }}
      >
        <div>W/A/S/D — Move · Q/E — Strafe · Shift — Sprint · Tab — Target</div>
        <div className="mt-1">Click to look · 1-4 — Abilities · Esc — Release cursor</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-4 text-xs"
        style={{ color: '#555' }}
      >
        Powered by Grudge Backend · Railway + id.grudge-studio.com
      </motion.div>
    </motion.div>
  );
}

function TitlePage() {
  const [, setLocation] = useLocation();
  const [auth, setAuth] = useState<GrudgeAuth | null>(() => getGrudgeClient().getAuth());

  useEffect(() => {
    const client = getGrudgeClient();
    if (client.isAuthenticated()) {
      setAuth(client.getAuth());
      return;
    }
    client.loginAsGuest().then((a) => setAuth(a)).catch(() => {});
  }, []);

  const handleStart = () => {
    audioManager.init();
    audioManager.startAmbient();
    audioManager.playUIClick();
    setLocation('/play');
  };

  return (
    <TitleScreen
      onStart={handleStart}
      auth={auth}
      onSignIn={() => getGrudgeClient().redirectToLogin(`${window.location.origin}/auth/callback`)}
    />
  );
}

function PlayPage() {
  const addLog = useGameStore((s) => s.addLog);
  const initSurvival = useSurvivalStore((s) => s.initSurvivalSystems);
  const survivalTick = useSurvivalStore((s) => s.survivalTick);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    audioManager.init();
    audioManager.startAmbient();
    initSurvival();
    const client = getGrudgeClient();
    if (!client.isAuthenticated()) {
      client.loginAsGuest().catch(() => {});
    }
    if (!booted) {
      addLog('Welcome to GRUDA Wars - Survival Explorer', 'system');
      addLog('WASD move - Tab Combat/Harvest - I Inventory - P Character', 'system');
      addLog('E to harvest / portal · portals at biome borders', 'system');
      setBooted(true);
    }

    let rafId = 0;
    let lastTime = performance.now();
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      survivalTick(
        dt,
        useSurvivalStore.getState().nearbyNode
          ? useGameStore.getState().playerPosition
          : [0, 0, 0],
      );
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [addLog, booted, initSurvival, survivalTick]);

  return (
    <motion.div
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
      <SceneTransitionOverlay />
      {/* Bottom-right fleet coding agent (deploy / assets / DB) */}
      <GrokCoderChat />
    </motion.div>
  );
}

export default function App() {
  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/auth/callback" component={AuthCallbackPage} />
          <Route path="/play" component={PlayPage} />
          <Route path="/" component={TitlePage} />
          <Route>
            <TitlePage />
          </Route>
        </Switch>
      </AnimatePresence>
    </div>
  );
}
