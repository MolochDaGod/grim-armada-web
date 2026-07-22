/**
 * /auth/callback — fleet SSO return path.
 * Consumes hash/query tokens from id.grudge-studio.com, then routes home.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getGrudgeClient } from '../lib/grudge-sdk';

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState('Completing sign-in…');

  useEffect(() => {
    const client = getGrudgeClient();
    // Constructor already consumes hash; also accept query tokens (fleet variants)
    try {
      const params = new URLSearchParams(window.location.search);
      const token =
        params.get('token') ||
        params.get('grudge_token') ||
        params.get('sso_token');
      if (token && !client.isAuthenticated()) {
        const auth = {
          token,
          grudgeId: params.get('grudgeId') || params.get('userId') || '',
          userId: params.get('userId') || params.get('grudgeId') || '',
          username: params.get('name') || params.get('username') || 'Player',
        };
        localStorage.setItem('grudge_auth_token', auth.token);
        localStorage.setItem('grudge_auth', JSON.stringify(auth));
        localStorage.setItem(
          'grudge_current_user',
          JSON.stringify({ userId: auth.userId, username: auth.username }),
        );
      }
    } catch {
      /* ignore */
    }

    if (client.isAuthenticated() || localStorage.getItem('grudge_auth_token')) {
      setStatus('Signed in — returning…');
    } else {
      setStatus('No session found — continuing as guest…');
    }

    const t = window.setTimeout(() => {
      // Clean URL then go to title; user can ENTER COMBAT
      history.replaceState(null, '', '/');
      setLocation('/');
    }, 400);
    return () => clearTimeout(t);
  }, [setLocation]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ background: '#0a0e14' }}
    >
      <h1
        className="text-2xl font-bold mb-3"
        style={{ fontFamily: "'Cinzel Decorative', serif", color: '#d4af37' }}
      >
        GRIM ARMADA
      </h1>
      <p className="text-sm" style={{ color: '#a39882' }}>
        {status}
      </p>
    </div>
  );
}
