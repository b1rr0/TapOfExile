/**
 * Shared combat-log rendering utilities.
 *
 * Used by:
 *  - CombatLog (in-battle live log)
 *  - DeathScene (post-mortem replay)
 *  - VictoryScene (post-victory replay)
 */
import type { DamageBreakdown, DamageElement } from "@shared/types";
import { ELEMENT_COLORS } from "@shared/types";

/* ── Public types ─────────────────────────────────────── */

export interface LogEntry {
  type: 'player_attack' | 'enemy_attack' | 'dodge' | 'block' | 'monster_died' | 'player_died';
  timestamp: number;
  monsterName?: string;
  attackName?: string;
  damage?: number;
  breakdown?: DamageBreakdown | null;
  isCrit?: boolean;
}

/* ── Helpers ──────────────────────────────────────────── */

const ELEMENT_LABELS: Record<DamageElement, string> = {
  physical: 'phys',
  fire: 'fire',
  lightning: 'ltn',
  cold: 'cold',
  pure: 'pure',
};

/** Format elapsed ms since combat start as mm:ss.cc */
export function formatCombatTime(elapsedMs: number): string {
  const totalSec = Math.max(0, elapsedMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const cs = Math.floor((totalSec * 100) % 100);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function formatBreakdown(breakdown: DamageBreakdown | null | undefined): string {
  if (!breakdown) return '';
  const elements: DamageElement[] = ['physical', 'fire', 'lightning', 'cold', 'pure'];
  const parts: string[] = [];
  for (const elem of elements) {
    const amount = breakdown[elem];
    if (!amount || amount <= 0) continue;
    parts.push(`<span style="color:${ELEMENT_COLORS[elem]}">${amount} ${ELEMENT_LABELS[elem]}</span>`);
  }
  return parts.join(' + ');
}

/* ── Single entry rendering ───────────────────────────── */

/**
 * Create a DOM element for a single log entry.
 * @param entry — the log entry
 * @param startTime — absolute ms timestamp of combat start (for time display)
 */
export function renderLogEntry(entry: LogEntry, startTime: number): HTMLDivElement {
  const el = document.createElement("div");
  const t = `<span class="log-time">${formatCombatTime(entry.timestamp - startTime)}</span>`;

  switch (entry.type) {
    case 'player_attack': {
      el.className = "combat-log-entry combat-log-entry--player";
      const bd = formatBreakdown(entry.breakdown);
      const crit = entry.isCrit ? ' <span class="combat-log-crit">CRIT!</span>' : '';
      el.innerHTML = `${t} <span class="log-who">You</span> \u2192 <span class="log-target">${entry.monsterName}</span>: ${bd} <span class="log-total">(${entry.damage})</span>${crit}`;
      break;
    }
    case 'enemy_attack': {
      el.className = "combat-log-entry combat-log-entry--enemy";
      const bd = formatBreakdown(entry.breakdown);
      const atk = entry.attackName ? `<span class="log-atk-name">[${entry.attackName}]</span> ` : '';
      el.innerHTML = `${t} <span class="log-who">${entry.monsterName}</span> ${atk}\u2192 <span class="log-target">You</span>: ${bd} <span class="log-total">(${entry.damage})</span>`;
      break;
    }
    case 'dodge': {
      el.className = "combat-log-entry combat-log-entry--dodge";
      const atk = entry.attackName ? `[${entry.attackName}] ` : '';
      el.innerHTML = `${t} <span class="log-who">${entry.monsterName}</span> ${atk}\u2192 <span class="log-dodge">DODGE</span>`;
      break;
    }
    case 'block': {
      el.className = "combat-log-entry combat-log-entry--block";
      const atk = entry.attackName ? `[${entry.attackName}] ` : '';
      el.innerHTML = `${t} <span class="log-who">${entry.monsterName}</span> ${atk}\u2192 <span class="log-block">BLOCK</span>`;
      break;
    }
    case 'monster_died': {
      el.className = "combat-log-entry combat-log-entry--separator";
      el.innerHTML = `<div class="combat-log-divider"></div>${t} <span class="log-death">\u2620 ${entry.monsterName} defeated</span><div class="combat-log-divider"></div>`;
      break;
    }
    case 'player_died': {
      el.className = "combat-log-entry combat-log-entry--player-death";
      el.innerHTML = `<div class="combat-log-divider combat-log-divider--red"></div>${t} <span class="log-player-death">\uD83D\uDC80 You died</span><div class="combat-log-divider combat-log-divider--red"></div>`;
      break;
    }
  }

  return el;
}

/* ── Batch rendering (for static replay) ──────────────── */

/**
 * Render all entries into a container (used by death/victory scenes).
 */
export function renderLogEntries(container: HTMLElement, entries: LogEntry[], startTime: number): void {
  for (const entry of entries) {
    container.appendChild(renderLogEntry(entry, startTime));
  }
  container.scrollTop = container.scrollHeight;
}

/* ── Fullscreen panel HTML ────────────────────────────── */

/**
 * Create the fullscreen log panel markup.
 * Uses shared class `.combat-log-panel` for consistent styling everywhere.
 * @param panelId — unique id for the panel element
 * @param listId — unique id for the list element
 * @param closeId — unique id for the close button
 */
export function createLogPanelHTML(panelId: string, listId: string, closeId: string): string {
  return `
    <div class="combat-log-panel combat-log-panel--hidden" id="${panelId}">
      <div class="combat-log-header">
        <span class="combat-log-title">Combat Log</span>
        <button class="combat-log-close" id="${closeId}">\u2715</button>
      </div>
      <div class="combat-log-list" id="${listId}"></div>
    </div>
  `;
}
