/**
 * Bottom-right Grok Coder dock — interactive fleet coding agent for Grim Armada.
 * Tools probe deploy / assets / Railway DB / auth without leaving /play.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runCoderTurn, type ChatMessage } from '../../ai/coderAgent';

const STORAGE_KEY = 'grim-armada.grok-coder.v1';

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export function GrokCoderChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch { /* */ }
  }, [messages]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || busy) return;
    setDraft('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const reply = await runCoderTurn(text);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Coder error: ${e instanceof Error ? e.message : String(e)}`,
          source: 'local',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const quick = [
    { label: 'Diag', cmd: '/diag' },
    { label: 'Deploy', cmd: '/deploy' },
    { label: 'Assets', cmd: '/assets' },
    { label: 'DB', cmd: '/db' },
    { label: 'Edit map', cmd: '/edit' },
  ];

  return (
    <div
      className="grok-coder"
      style={{
        position: 'fixed',
        right: 12,
        bottom: 196,
        zIndex: 400,
        pointerEvents: 'auto',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              height: 420,
              maxHeight: 'min(420px, calc(100vh - 220px))',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 10,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #3d3420',
              background: 'linear-gradient(180deg, #12141a 0%, #0a0c10 100%)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px #d4af3722',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: '1px solid #2a2418',
                background: 'linear-gradient(90deg, #1a160c, #12141a)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#d4af37', letterSpacing: 0.4 }}>
                    GROK CODER
                  </div>
                  <div style={{ fontSize: 9, color: '#7a6a4a' }}>fleet · deploy · assets · DB</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  title="Clear"
                  onClick={() => setMessages([])}
                  style={iconBtn}
                >
                  ⌫
                </button>
                <button type="button" title="Close" onClick={() => setOpen(false)} style={iconBtn}>
                  ✕
                </button>
              </div>
            </div>

            {/* Quick chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 8px', borderBottom: '1px solid #1e1a12' }}>
              {quick.map((q) => (
                <button
                  key={q.cmd}
                  type="button"
                  disabled={busy}
                  onClick={() => send(q.cmd)}
                  style={{
                    fontSize: 9,
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: '1px solid #3d3420',
                    background: '#1a160c',
                    color: '#d4af37',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Log */}
            <div
              ref={logRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 10,
                fontSize: 11,
                lineHeight: 1.45,
                color: '#c8b896',
              }}
            >
              {messages.length === 0 && (
                <div style={{ color: '#6a5a40', textAlign: 'center', marginTop: 40 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>⌘</div>
                  <p>Ask about deploy, assets, Railway DB, or type /diag</p>
                  <p style={{ fontSize: 10, marginTop: 6 }}>Local tools always run · hub LLM when JWT works</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '92%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      background: m.role === 'user' ? '#2a2210' : '#141820',
                      border: `1px solid ${m.role === 'user' ? '#5a4a20' : '#2a3038'}`,
                      color: m.role === 'user' ? '#f0e0b0' : '#c8d0d8',
                    }}
                  >
                    {m.content}
                  </div>
                  {m.tools && m.tools.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {m.tools.map((t, j) => (
                        <span
                          key={j}
                          style={{
                            fontSize: 8,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: t.ok ? '#14301a' : '#301818',
                            color: t.ok ? '#6bb78a' : '#c96d63',
                            border: `1px solid ${t.ok ? '#2a5a3a' : '#5a2a2a'}`,
                          }}
                        >
                          {t.ok ? '✓' : '✗'} {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.source && m.role === 'assistant' && (
                    <span style={{ fontSize: 8, color: '#555', marginTop: 2 }}>{m.source}</span>
                  )}
                </div>
              ))}
              {busy && (
                <div style={{ color: '#7a6420', fontSize: 10 }}>running tools…</div>
              )}
            </div>

            {/* Input */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: 8,
                borderTop: '1px solid #2a2418',
                background: '#0c0e12',
              }}
            >
              <textarea
                rows={2}
                value={draft}
                disabled={busy}
                placeholder="/diag · where is production DB? · why black scene?"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                style={{
                  flex: 1,
                  resize: 'none',
                  borderRadius: 8,
                  border: '1px solid #3d3420',
                  background: '#12141a',
                  color: '#e8dcc0',
                  fontSize: 11,
                  padding: '6px 8px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => void send()}
                style={{
                  alignSelf: 'flex-end',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #d4af37',
                  background: 'linear-gradient(135deg, #d4af37, #b8952e)',
                  color: '#0f1419',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: busy || !draft.trim() ? 'default' : 'pointer',
                  opacity: busy || !draft.trim() ? 0.5 : 1,
                }}
              >
                RUN
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        title="Grok Coder — fleet AI"
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 999,
          border: open ? '1px solid #d4af37' : '1px solid #3d3420',
          background: open
            ? 'linear-gradient(135deg, #d4af37, #b8952e)'
            : 'linear-gradient(180deg, #1a160c, #0e1014)',
          color: open ? '#0f1419' : '#d4af37',
          fontWeight: 700,
          fontSize: 11,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          float: 'right',
        }}
      >
        <span>⚡</span>
        {open ? 'CODER' : 'GROK CODER'}
      </motion.button>
    </div>
  );
}

const iconBtn: Record<string, string | number> = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: '1px solid #3d3420',
  background: 'transparent',
  color: '#a39882',
  cursor: 'pointer',
  fontSize: 12,
};
