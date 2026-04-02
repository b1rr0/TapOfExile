import { haptic } from "../utils/haptic.js";
import {
  ACTIVE_SKILLS,
  type ActiveSkillId,
  getSkillScalingType,
  computeEffectiveSkillLevel,
  computeSkillLevelGrowth,
} from "@shared/active-skills.js";
import type { ProjectileLayer } from "./projectile-layer.js";

// ── Types ────────────────────────────────────────────────

export interface ActionBarCharData {
  level: number;
  xp: number;
  xpToNext: number;
  maxHp: number;
  hp: number;
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  weaponSpellLevel: number;
  arcaneSpellLevel: number;
  versatileSpellLevel: number;
  resistance?: { physical?: number; fire?: number; lightning?: number; cold?: number };
}

export interface PotionSlotOptions {
  container: HTMLElement;
  equipment: Record<string, any>;
  onUsePotion: ((slot: "consumable-1" | "consumable-2") => void) | null;
  events: { on(e: string, cb: (data: any) => void): void; off(e: string, cb: (data: any) => void): void } | null;
}

export interface KeyboardCallbacks {
  onTap: () => void;
  onAbility?: (index: number) => void;
  onPotion?: (slot: 0 | 1) => void;
}

// ── renderActionBarHTML ──────────────────────────────────

export function renderActionBarHTML(c: ActionBarCharData): string {
  const res = c.resistance || {};
  const xpPct = c.xpToNext > 0 ? (c.xp / c.xpToNext * 100) : 0;
  const maxHp = c.maxHp || c.hp || 100;

  return `
    <div class="action-bar">
      <div class="action-bar__xp-row">
        <span id="level-display" class="action-bar__level">Lv.${c.level}</span>
        <div class="xp-bar action-bar__xp" id="xp-bar">
          <div class="xp-bar__fill" id="xp-bar-fill" style="width:${xpPct}%"></div>
          <div class="xp-bar__text" id="xp-bar-text">${c.xp} / ${c.xpToNext}</div>
        </div>
      </div>
      <div class="action-bar__abilities">
        <button class="action-slot action-slot--ability action-slot--empty" id="ability-0" data-slot="0">
          <span class="action-slot__key">1</span>
          <div class="action-slot__cooldown"></div>
        </button>
        <button class="action-slot action-slot--ability action-slot--empty" id="ability-1" data-slot="1">
          <span class="action-slot__key">2</span>
          <div class="action-slot__cooldown"></div>
        </button>
        <button class="action-slot action-slot--ability action-slot--empty" id="ability-2" data-slot="2">
          <span class="action-slot__key">3</span>
          <div class="action-slot__cooldown"></div>
        </button>
        <button class="action-slot action-slot--ability action-slot--empty" id="ability-3" data-slot="3">
          <span class="action-slot__key">4</span>
          <div class="action-slot__cooldown"></div>
        </button>
      </div>
      <div class="action-bar__bottom">
        <div class="action-bar__stats">
          <div class="action-bar__hp-bar">
            <div class="action-bar__hp-fill" id="player-hp-fill" style="width:100%"></div>
            <span class="action-bar__hp-text" id="player-hp-text">${maxHp} / ${maxHp}</span>
          </div>
          <div class="action-bar__defense">
            <div class="action-bar__stat">
              <span class="action-bar__stat-icon">\uD83D\uDEE1\uFE0F</span>
              <span class="action-bar__stat-value" id="player-armor">${res.physical || 0}</span>
            </div>
            <div class="action-bar__stat action-bar__stat--dodge">
              <span class="action-bar__stat-icon">\uD83D\uDCA8</span>
              <span class="action-bar__stat-value" id="player-dodge">${Math.round((c.dodgeChance || 0) * 100)}%</span>
            </div>
            <div class="action-bar__stat action-bar__stat--fire">
              <span class="action-bar__stat-icon">\uD83D\uDD25</span>
              <span class="action-bar__stat-value" id="player-fire-res">${res.fire || 0}%</span>
            </div>
            <div class="action-bar__stat action-bar__stat--lightning">
              <span class="action-bar__stat-icon">\u26A1</span>
              <span class="action-bar__stat-value" id="player-lightning-res">${res.lightning || 0}%</span>
            </div>
            <div class="action-bar__stat action-bar__stat--cold">
              <span class="action-bar__stat-icon">\u2744\uFE0F</span>
              <span class="action-bar__stat-value" id="player-cold-res">${res.cold || 0}%</span>
            </div>
          </div>
        </div>
        <div class="action-bar__potions">
          <button class="action-slot action-slot--potion" id="potion-0" data-potion="0">
            <span class="action-slot__key">Q</span>
            <span class="action-slot__count"></span>
            <div class="action-slot__cooldown"></div>
          </button>
          <button class="action-slot action-slot--potion" id="potion-1" data-potion="1">
            <span class="action-slot__key">E</span>
            <span class="action-slot__count"></span>
            <div class="action-slot__cooldown"></div>
          </button>
        </div>
      </div>
    </div>`;
}

// ── initPotionSlots ──────────────────────────────────────

function setupPotionBtn(
  btn: HTMLButtonElement | null,
  potionData: any,
  slot: "consumable-1" | "consumable-2",
  onUsePotion: ((slot: "consumable-1" | "consumable-2") => void) | null,
): void {
  if (!btn) return;

  if (!potionData || !potionData.flaskType) {
    btn.classList.add("action-slot--empty");
    return;
  }

  const charges = potionData.currentCharges || 0;
  const maxCharges = potionData.maxCharges || 0;
  const flaskType = potionData.flaskType;

  btn.dataset.flaskType = flaskType;

  const img = document.createElement("img");
  img.src = `/assets/equipments/consumables/${flaskType}s/red_${Math.min(Math.max(charges, 1), 5)}.png`;
  img.className = "potion-sprite";
  img.style.width = "24px";
  img.style.height = "24px";
  img.style.imageRendering = "pixelated";
  btn.prepend(img);

  const countEl = btn.querySelector(".action-slot__count") as HTMLElement | null;
  if (countEl && charges > 0) {
    countEl.textContent = `${charges}/${maxCharges}`;
  }

  if (charges <= 0) {
    btn.classList.add("action-slot--empty");
    return;
  }

  if (onUsePotion) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onUsePotion(slot);
    });
  }
}

export function initPotionSlots(opts: PotionSlotOptions): () => void {
  const { container, equipment, onUsePotion, events } = opts;

  const pot0 = container.querySelector("#potion-0") as HTMLButtonElement | null;
  const pot1 = container.querySelector("#potion-1") as HTMLButtonElement | null;

  setupPotionBtn(pot0, equipment["consumable-1"], "consumable-1", onUsePotion);
  setupPotionBtn(pot1, equipment["consumable-2"], "consumable-2", onUsePotion);

  let onPotionUsed: ((data: any) => void) | null = null;

  if (events) {
    onPotionUsed = (data: any) => {
      const btn = data.slot === "consumable-1" ? pot0 : pot1;
      if (!btn) return;

      const countEl = btn.querySelector(".action-slot__count") as HTMLElement | null;
      if (countEl) {
        countEl.textContent = data.remainingCharges > 0
          ? `${data.remainingCharges}/${data.maxCharges}`
          : "";
      }

      const img = btn.querySelector(".potion-sprite") as HTMLImageElement | null;
      if (img && data.remainingCharges > 0) {
        const flaskType = btn.dataset.flaskType || "";
        img.src = `/assets/equipments/consumables/${flaskType}s/red_${data.remainingCharges}.png`;
      } else if (img && data.remainingCharges <= 0) {
        btn.classList.add("action-slot--empty");
        img.style.opacity = "0.3";
      }
    };
    events.on("potionUsed", onPotionUsed);
  }

  return () => {
    if (events && onPotionUsed) {
      events.off("potionUsed", onPotionUsed);
    }
  };
}

// ── initAbilitySlots ─────────────────────────────────────

export interface AbilitySlotOptions {
  container: HTMLElement;
  /** Up to 4 equipped skill IDs (null = empty slot) */
  equippedSkills: (string | null)[];
  /** ProjectileLayer - used for icon extraction (first frame) and preloading sprites */
  projectileLayer: ProjectileLayer;
  /** Called when player taps an ability button */
  onCastSkill: (skillId: string) => void;
  /** EventBus for listening to skillHit cooldown data */
  events: { on(e: string, cb: (data: any) => void): void; off(e: string, cb: (data: any) => void): void };
  /** Character data for tooltip calculations */
  charData?: ActionBarCharData;
}

/**
 * Populate the 4 ability slots with equipped skill icons,
 * wire click handlers, and manage cooldown overlays.
 * Returns a cleanup function.
 */
export async function initAbilitySlots(opts: AbilitySlotOptions): Promise<() => void> {
  const { container, equippedSkills, projectileLayer, onCastSkill, events, charData } = opts;

  // Track cooldown timers for cleanup
  const cooldownTimers: ReturnType<typeof setInterval>[] = [];
  const skillSlotMap = new Map<string, HTMLButtonElement>();
  const longPressTimers: ReturnType<typeof setTimeout>[] = [];

  // Tooltip element (reused)
  let tooltip: HTMLElement | null = null;
  function dismissTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  function showSkillTooltip(btn: HTMLElement, def: typeof ACTIVE_SKILLS[ActiveSkillId]) {
    dismissTooltip();
    if (!charData) return;

    const sType = getSkillScalingType(def);
    const sEffLv = computeEffectiveSkillLevel(
      charData.level, sType,
      charData.weaponSpellLevel || 0, charData.arcaneSpellLevel || 0, charData.versatileSpellLevel || 0,
    );
    const sGrowth = computeSkillLevelGrowth(sEffLv);
    const typeIcon = sType === 'arcane' ? '🔮' : '⚔️';
    const typeName = sType === 'arcane' ? 'Arcane' : 'Bugei';
    const cdSec = (def.cooldownMs / 1000).toFixed(1);

    let dmgLine = '';
    if (def.skillType === 'damage') {
      const critMult = charData.critMultiplier || 1.5;
      const critChance = charData.critChance || 0;
      const expectedMult = (1 - critChance) + critChance * critMult;
      let raw: number;
      if (sType === 'arcane') {
        raw = Math.floor(def.spellBase! * sGrowth);
      } else {
        // tapDamage from char already includes tree bonuses (tapHit + % damage)
        raw = Math.floor((charData.tapDamage || 1) * def.damageMultiplier * sGrowth);
      }
      const expected = Math.floor(raw * expectedMult);
      dmgLine = `<div class="skill-tooltip__row">Damage: <b>${expected.toLocaleString()}</b></div>`;
    } else if (def.skillType === 'heal') {
      dmgLine = `<div class="skill-tooltip__row">Heal: <b>${Math.round((def.healPercent || 0) * 100)}% HP</b></div>`;
    } else if (def.effect) {
      const val = def.effect.value < 1 ? `${Math.round(def.effect.value * 100)}%` : String(Math.round(def.effect.value));
      dmgLine = `<div class="skill-tooltip__row">${def.skillType === 'buff' ? '+' : '-'}${val} ${def.effect.stat} (${(def.effect.durationMs / 1000).toFixed(0)}s)</div>`;
    }

    const descLine = def.description || '';

    tooltip = document.createElement('div');
    tooltip.className = 'skill-tooltip';
    tooltip.innerHTML = `
      <div class="skill-tooltip__name">${def.name}</div>
      <div class="skill-tooltip__type">${typeIcon} ${typeName} Spell &middot; Lv.${sEffLv}</div>
      ${descLine ? `<div class="skill-tooltip__desc">${descLine}</div>` : ''}
      ${dmgLine}
      <div class="skill-tooltip__row">Cooldown: ${cdSec}s</div>
    `;

    // Position above the button
    const rect = btn.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    document.body.appendChild(tooltip);
  }

  // Load sprites + populate buttons
  for (let i = 0; i < 4; i++) {
    const skillId = equippedSkills[i];
    const btn = container.querySelector(`#ability-${i}`) as HTMLButtonElement | null;
    if (!btn) continue;

    if (!skillId) {
      btn.classList.add("action-slot--empty");
      continue;
    }

    const def = ACTIVE_SKILLS[skillId as ActiveSkillId];
    if (!def) {
      btn.classList.add("action-slot--empty");
      continue;
    }

    // Load sprite into projectile layer
    const jsonUrl = `/assets/${def.spritePath}`;
    await projectileLayer.load(skillId, jsonUrl);

    // Extract first frame as icon
    const iconCanvas = projectileLayer.getIcon(skillId, 56);
    if (iconCanvas) {
      iconCanvas.className = "ability-icon";
      btn.prepend(iconCanvas);
      btn.classList.remove("action-slot--empty");
    }

    btn.title = `${def.name} (${(def.cooldownMs / 1000).toFixed(1)}s)`;
    skillSlotMap.set(skillId, btn);

    // Click handler
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.classList.contains("action-slot--on-cd")) return;
      onCastSkill(skillId);
      haptic("light");
    });

    // Long-press tooltip (500ms hold)
    let lpTimer: ReturnType<typeof setTimeout> | null = null;
    let lpShown = false;
    btn.addEventListener("pointerdown", (e) => {
      lpShown = false;
      lpTimer = setTimeout(() => {
        lpShown = true;
        showSkillTooltip(btn, def);
      }, 500);
      longPressTimers.push(lpTimer);
    });
    const cancelLp = () => {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      if (lpShown) { dismissTooltip(); lpShown = false; }
    };
    btn.addEventListener("pointerup", cancelLp);
    btn.addEventListener("pointerleave", cancelLp);
    btn.addEventListener("pointercancel", cancelLp);
  }

  // Listen for skill result → start cooldown overlay
  const onSkillHit = (data: any) => {
    if (!data.cooldownUntil || !data.skillId) return;
    const btn = skillSlotMap.get(data.skillId);
    if (!btn) return;

    const def = ACTIVE_SKILLS[data.skillId as ActiveSkillId];
    if (!def) return;

    const cdOverlay = btn.querySelector(".action-slot__cooldown") as HTMLElement | null;
    if (!cdOverlay) return;

    const now = Date.now();
    const totalMs = def.cooldownMs;
    const endsAt = data.cooldownUntil;

    btn.classList.add("action-slot--on-cd");
    cdOverlay.style.height = "100%";

    const tick = setInterval(() => {
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        btn.classList.remove("action-slot--on-cd");
        cdOverlay.style.height = "0%";
        return;
      }
      const pct = (remaining / totalMs) * 100;
      cdOverlay.style.height = `${pct}%`;
    }, 50);

    cooldownTimers.push(tick);
  };

  events.on("skillHit", onSkillHit);

  // Immediately put skill on cooldown when cast (before server response)
  // to prevent spamming while waiting for server confirmation
  const onSkillCast = (data: any) => {
    if (!data.skillId) return;
    const btn = skillSlotMap.get(data.skillId);
    if (!btn) return;
    // Only set CD if not already on CD
    if (btn.classList.contains("action-slot--on-cd")) return;

    const def = ACTIVE_SKILLS[data.skillId as ActiveSkillId];
    if (!def) return;

    const cdOverlay = btn.querySelector(".action-slot__cooldown") as HTMLElement | null;
    if (!cdOverlay) return;

    btn.classList.add("action-slot--on-cd");
    cdOverlay.style.height = "100%";

    // Start a preliminary countdown using the skill's base cooldown.
    // This will be overwritten when the server responds with skillHit.
    const totalMs = def.cooldownMs;
    const endsAt = Date.now() + totalMs;

    const tick = setInterval(() => {
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        btn.classList.remove("action-slot--on-cd");
        cdOverlay.style.height = "0%";
        return;
      }
      const pct = (remaining / totalMs) * 100;
      cdOverlay.style.height = `${pct}%`;
    }, 50);

    cooldownTimers.push(tick);
  };
  events.on("skillCast", onSkillCast);

  return () => {
    events.off("skillHit", onSkillHit);
    events.off("skillCast", onSkillCast);
    for (const t of cooldownTimers) clearInterval(t);
    for (const t of longPressTimers) clearTimeout(t);
    dismissTooltip();
  };
}

// ── initKeyboardHandler ──────────────────────────────────

export function initKeyboardHandler(
  container: HTMLElement,
  callbacks: KeyboardCallbacks,
): () => void {
  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const code = e.code;

    if (code === "Space") {
      e.preventDefault();
      callbacks.onTap();
      return;
    }

    if (callbacks.onAbility) {
      if (code === "Digit1" || code === "Digit2" || code === "Digit3" || code === "Digit4") {
        const idx = parseInt(code.charAt(5)) - 1;
        const btn = container.querySelector(`#ability-${idx}`) as HTMLButtonElement | null;
        if (btn && !btn.classList.contains("action-slot--empty")) {
          callbacks.onAbility(idx);
        }
        return;
      }
    }

    if (callbacks.onPotion) {
      if (code === "KeyQ") {
        const btn = container.querySelector("#potion-0") as HTMLButtonElement | null;
        if (btn && !btn.classList.contains("action-slot--empty")) {
          callbacks.onPotion(0);
        }
        return;
      }
      if (code === "KeyE") {
        const btn = container.querySelector("#potion-1") as HTMLButtonElement | null;
        if (btn && !btn.classList.contains("action-slot--empty")) {
          callbacks.onPotion(1);
        }
        return;
      }
    }
  };

  document.addEventListener("keydown", handler);

  return () => {
    document.removeEventListener("keydown", handler);
  };
}
