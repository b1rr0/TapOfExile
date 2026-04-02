import type { DamageBreakdown, DamageElement } from "@shared/types";
import { ELEMENT_COLORS } from "@shared/types";

const ELEMENT_LABELS: Record<DamageElement, string> = {
  physical: 'phys',
  fire: 'fire',
  lightning: 'ltn',
  cold: 'cold',
  pure: 'pure',
};

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface DamageData {
  damage: number;
  damageBreakdown?: DamageBreakdown;
  isCrit: boolean;
}

interface MonsterDiedData {
  gold: number;
}

interface XpGainedData {
  xp: number;
}

interface LevelUpData {
  level: number;
}

export class Effects {
  layer: HTMLElement;
  events: EventBus;
  _maxVisible: number;
  _boundListeners: Array<{ event: string; handler: (data: any) => void }>;

  constructor(container: HTMLElement, events: EventBus) {
    this.layer = container.querySelector("#effects-layer") || container;
    this.events = events;
    this._maxVisible = 6;
    this._boundListeners = [];
    this._listen();
  }

  /** Helper to register an event handler and track it for cleanup. */
  private _on(event: string, handler: (data: any) => void): void {
    this.events.on(event, handler);
    this._boundListeners.push({ event, handler });
  }

  _listen(): void {
    this._on("damage", (data: DamageData) => {
      if (data.damageBreakdown) {
        this.showElementalDamage(data.damageBreakdown, data.isCrit);
      } else {
        this.showDamageNumber(data.damage, data.isCrit);
      }
    });

    this._on("monsterDied", (data: MonsterDiedData) => {
      this.showGoldDrop(data.gold);
    });

    this._on("xpGained", (data: XpGainedData) => {
      this.showXpGain(data.xp);
    });

    this._on("levelUp", (data: LevelUpData) => {
      this.showAnnounce(`LEVEL ${data.level}!`);
    });

    this._on("potionUsed", (data: any) => {
      if (data.healAmount > 0) {
        this.showHeal(data.healAmount);
      }
    });

    this._on("skillHit", (data: any) => {
      if (data.skillType === "heal" && data.healAmount > 0) {
        this.showHeal(data.healAmount);
      } else if (data.skillType === "buff") {
        this.showPlayerStatus("BUFF", "#F9CF87");
      } else if (data.skillType === "debuff") {
        this.showPlayerStatus("DEBUFF", "#B9508D");
      } else if (data.damageBreakdown) {
        this.showElementalDamage(data.damageBreakdown, data.isCrit);
      } else if (data.damage > 0) {
        this.showDamageNumber(data.damage, data.isCrit);
      }
    });

    this._on("enemyAttack", (data: any) => {
      if (data.dodged) {
        this.showPlayerStatus("DODGE", "#88ccff");
      } else if (data.blocked) {
        this.showPlayerStatus("BLOCK", "#ffcc00");
      } else if (data.damage > 0) {
        this.showPlayerDamage(data.damage);
        // Show elemental damage breakdown near HP bar
        if (data.breakdown) {
          this.showHpBarDamage(data.breakdown, data.attackName);
        }
      }
    });
  }

  destroy(): void {
    for (const { event, handler } of this._boundListeners) {
      this.events.off(event, handler);
    }
    this._boundListeners = [];
  }

  showDamageNumber(amount: number, isCrit: boolean): void {
    // Limit visible floating texts
    const existing = this.layer.querySelectorAll(".float-damage");
    if (existing.length >= this._maxVisible) {
      existing[0].remove();
    }

    const el = document.createElement("div");
    el.className = `float-damage ${isCrit ? "crit" : ""}`;
    el.textContent = isCrit ? `-${amount}!` : `-${amount}`;
    el.style.left = `${55 + Math.random() * 30}%`;
    el.style.top = `${30 + Math.random() * 20}%`;
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showElementalDamage(breakdown: DamageBreakdown, isCrit: boolean): void {
    const elements: DamageElement[] = ['physical', 'fire', 'lightning', 'cold', 'pure'];
    let offsetIndex = 0;

    for (const elem of elements) {
      const amount = breakdown[elem];
      if (!amount || amount <= 0) continue;

      const existing = this.layer.querySelectorAll(".float-damage");
      if (existing.length >= this._maxVisible) {
        existing[0].remove();
      }

      const el = document.createElement("div");
      el.className = `float-damage float-damage--${elem} ${isCrit ? "crit" : ""}`;
      el.textContent = isCrit ? `-${amount}!` : `-${amount}`;
      el.style.color = ELEMENT_COLORS[elem];

      // Stagger horizontally so multiple elements don't overlap
      const baseLeft = 50 + offsetIndex * 12;
      el.style.left = `${baseLeft + Math.random() * 10}%`;
      el.style.top = `${28 + Math.random() * 15 + offsetIndex * 5}%`;
      el.style.animationDelay = `${offsetIndex * 0.05}s`;

      this.layer.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
      offsetIndex++;
    }
  }

  showHeal(amount: number): void {
    const el = document.createElement("div");
    el.className = "float-damage float-damage--heal";
    el.textContent = `+${amount}`;
    el.style.left = `${10 + Math.random() * 15}%`;
    el.style.top = `${35 + Math.random() * 10}%`;
    el.style.color = "#44ff44";
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showGoldDrop(amount: number): void {
    const el = document.createElement("div");
    el.className = "float-gold";
    el.textContent = `+${amount}g`;
    el.style.left = "65%";
    el.style.top = "60%";
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showXpGain(amount: number): void {
    const el = document.createElement("div");
    el.className = "float-xp";
    el.textContent = `+${amount} XP`;
    el.style.left = "65%";
    el.style.top = "52%";
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showAnnounce(text: string): void {
    const el = document.createElement("div");
    el.className = "announce";
    el.textContent = text;
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showPlayerDamage(amount: number): void {
    const existing = this.layer.querySelectorAll(".float-damage");
    if (existing.length >= this._maxVisible) {
      existing[0].remove();
    }

    const el = document.createElement("div");
    el.className = "float-damage float-damage--incoming";
    el.textContent = `-${amount}`;
    el.style.left = `${8 + Math.random() * 15}%`;
    el.style.top = `${42 + Math.random() * 18}%`;
    el.style.color = "#ff4444";
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showPlayerStatus(text: string, color: string): void {
    const el = document.createElement("div");
    el.className = "float-damage float-damage--status";
    el.textContent = text;
    el.style.left = `${10 + Math.random() * 10}%`;
    el.style.top = `${35 + Math.random() * 10}%`;
    el.style.color = color;
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  /**
   * Show elemental damage breakdown near the player HP bar.
   * Displays "-DMG type" chips that float up from the HP bar area.
   */
  showHpBarDamage(breakdown: DamageBreakdown, attackName?: string): void {
    const hpBar = document.querySelector(".action-bar__hp-bar") as HTMLElement | null;
    if (!hpBar) return;

    // Remove old hp-damage chips if too many
    const existing = hpBar.querySelectorAll(".hp-dmg-chip");
    if (existing.length >= 4) {
      existing[0].remove();
    }

    const elements: DamageElement[] = ['physical', 'fire', 'lightning', 'cold', 'pure'];
    const parts: string[] = [];

    for (const elem of elements) {
      const amount = breakdown[elem];
      if (!amount || amount <= 0) continue;
      parts.push(`<span style="color:${ELEMENT_COLORS[elem]}">-${amount} ${ELEMENT_LABELS[elem]}</span>`);
    }

    if (parts.length === 0) return;

    const chip = document.createElement("div");
    chip.className = "hp-dmg-chip";
    chip.innerHTML = parts.join(' ');
    if (attackName) {
      chip.innerHTML = `<span class="hp-dmg-chip__name">${attackName}</span> ` + chip.innerHTML;
    }
    hpBar.appendChild(chip);
    chip.addEventListener("animationend", () => chip.remove());
  }
}
