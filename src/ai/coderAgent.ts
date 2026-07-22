/**
 * Grok Coder agent — local tool loop + optional hub LLM.
 * Mirrors Character-Animator AiAssistant: always answer; tools first; hub when auth works.
 */

import { getGrudgeClient } from '../lib/grudge-sdk';
import { fleetMapMarkdown } from './fleetMap';
import { planTools, runTool, type ToolResult } from './fleetTools';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: { name: string; label: string; ok: boolean }[];
  source?: 'local' | 'hub' | 'hybrid';
}

const HELP = `**Grok Coder** — in-game fleet coding agent for Grim Armada.

**Slash commands**
- \`/help\` — this list
- \`/diag\` — full deploy + assets + DB + auth + AI hub
- \`/deploy\` — Vercel origin + SPA routes + GLB shell
- \`/assets\` — same-origin vs CDN probe + edit map
- \`/db\` — Railway game-data API
- \`/auth\` — Grudge ID session
- \`/scene\` — live player / biome state
- \`/map\` — production topology SSOT
- \`/edit\` — where to change assets/DB/deploy files

I run **local probes** (always). Hub LLM (\`ai.grudge-studio.com\` space/dev agents) is used when your Grudge JWT is accepted; otherwise you still get tool-grounded answers.`;

function synthesizeLocalReply(userText: string, tools: ToolResult[]): string {
  const t = userText.toLowerCase();
  if (t === '/help' || t === 'help') return HELP;

  const body = tools.map((x) => x.text).join('\n\n');
  const fails = tools.filter((x) => !x.ok);

  let lead = '## Grok Coder (local tools)\n';
  if (fails.length) {
    lead += `Found **${fails.length}** issue(s): ${fails.map((f) => f.label).join(', ')}.\n\n`;
  } else if (tools.length) {
    lead += 'Probes look healthy. Grounding for your question:\n\n';
  }

  let tail = '';
  if (t.includes('edit') || t.includes('organiz') || t.includes('database') || t.includes('asset')) {
    tail =
      '\n\n### Recommended production layout\n' +
      '1. **Frontend** Vercel `grim-armada-web` — GLBs in `public/models`\n' +
      '2. **Auth** id.grudge-studio.com via `/api/auth`\n' +
      '3. **DB** Railway Postgres via `/api/characters` + `/api/account`\n' +
      '4. **CDN** only after R2 seed under `grim-armada/` + `VITE_FORCE_ASSET_CDN`\n' +
      '5. **AI** this panel (local tools) + hub when JWT/API key valid\n';
  }

  if (!tools.length) return HELP;
  return lead + body + tail;
}

async function tryHubChat(
  message: string,
  toolContext: string,
): Promise<{ reply: string; role: string } | null> {
  const auth = getGrudgeClient().getAuth();
  const token = auth?.token || localStorage.getItem('grudge_auth_token');
  if (!token) return null;

  const body = {
    message: `${message}\n\n---\nTool context (already run):\n${toolContext.slice(0, 6000)}`,
    app: 'grim-armada',
    context: {
      game: 'grim-armada-web',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      fleet: fleetMapMarkdown(),
    },
  };

  // Prefer same-origin rewrite if configured, else direct hub
  const endpoints = [
    '/api/ai/v1/agents/space/chat',
    '/api/ai/v1/agents/dev/chat',
    'https://ai.grudge-studio.com/v1/agents/space/chat',
    'https://ai.grudge-studio.com/v1/agents/dev/chat',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) continue;
      const data = await res.json();
      const reply =
        data.reply ||
        data.message ||
        data.content ||
        data.text ||
        (typeof data.choices?.[0]?.message?.content === 'string'
          ? data.choices[0].message.content
          : null);
      if (typeof reply === 'string' && reply.trim()) {
        return { reply: reply.trim(), role: url.includes('dev') ? 'dev' : 'space' };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function runCoderTurn(userText: string): Promise<ChatMessage> {
  const text = userText.trim();
  if (!text) {
    return { role: 'assistant', content: HELP, source: 'local' };
  }

  const plan = planTools(text);
  const toolResults: ToolResult[] = [];
  for (const name of plan) {
    try {
      toolResults.push(await runTool(name));
    } catch (e) {
      toolResults.push({
        name,
        label: 'Tool error',
        ok: false,
        text: `${name} failed: ${e instanceof Error ? e.message : e}`,
      });
    }
  }

  const localReply = synthesizeLocalReply(text, toolResults);
  const chips = toolResults.map((t) => ({ name: t.name, label: t.label, ok: t.ok }));

  // Optional hub enrichment for open-ended questions
  const wantsHub =
    plan.length === 0 ||
    text.length > 40 ||
    /\b(why|how|fix|organiz|refactor|implement|design)\b/i.test(text);

  if (wantsHub && toolResults.length) {
    const hub = await tryHubChat(text, toolResults.map((t) => t.text).join('\n\n'));
    if (hub) {
      return {
        role: 'assistant',
        content: `## Hub agent (${hub.role})\n${hub.reply}\n\n---\n### Local tool log\n${toolResults.map((t) => `- ${t.ok ? '✓' : '✗'} ${t.label}`).join('\n')}`,
        tools: chips,
        source: 'hybrid',
      };
    }
  }

  return {
    role: 'assistant',
    content: localReply,
    tools: chips,
    source: 'local',
  };
}
