/**
 * AccountRow — title-screen row that shows the current Grudge ID auth state.
 * If signed in (non-guest), displays the username. Otherwise offers a
 * "Sign in with Grudge ID" button that bounces through id.grudge-studio.com.
 */

import { motion } from 'framer-motion';
import type { GrudgeAuth } from '../lib/grudge-sdk';

interface AccountRowProps {
  auth: GrudgeAuth | null;
  isGuest: boolean;
  onSignIn: () => void;
}

export function AccountRow({ auth, isGuest, onSignIn }: AccountRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="mt-4 flex items-center gap-3 text-xs"
      style={{ fontFamily: "'Spectral SC', serif" }}
    >
      {auth && !isGuest ? (
        <span style={{ color: '#a39882' }}>
          Signed in as <strong style={{ color: '#d4af37' }}>{auth.username}</strong>
        </span>
      ) : (
        <>
          <span style={{ color: '#7a6420' }}>
            {auth ? 'Playing as guest' : 'Not signed in'}
          </span>
          <button
            onClick={onSignIn}
            className="px-3 py-1 rounded cursor-pointer"
            style={{
              background: 'transparent',
              color: '#d4af37',
              border: '1px solid #d4af3766',
              fontFamily: "'Cinzel', serif",
            }}
          >
            Sign in with Grudge ID
          </button>
        </>
      )}
    </motion.div>
  );
}
