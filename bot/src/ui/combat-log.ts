import { renderLogEntry, renderLogEntries, createLogPanelHTML } from "./combat-log-renderer.js";
import type { LogEntry } from "./combat-log-renderer.js";
import { ACTIVE_SKILLS } from "@shared/active-skills";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

export class CombatLog {
  private container: HTMLElement;
  private events: EventBus;
  /** All log entries - public so DeathScene can read them */
  entries: LogEntry[] = [];
  private panelEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private btnEl: HTMLElement | null = null;
  private isOpen = false;
  currentMonsterName = 'Monster';
  /** Absolute timestamp when combat started (Date.now()) */
  combatStartTime: number = Date.now();

  // Event handler refs for cleanup
  private _onDamage: ((data: any) => void) | null = null;
  private _onSkillHit: ((data: any) => void) | null = null;
  private _onEnemyAttack: ((data: any) => void) | null = null;
  private _onMonsterSpawned: ((data: any) => void) | null = null;
  private _onMonsterDied: ((data: any) => void) | null = null;
  private _onXpGained: ((data: any) => void) | null = null;
  private _onPlayerDied: (() => void) | null = null;

  constructor(container: HTMLElement, events: EventBus) {
    this.container = container;
    this.events = events;
    this.combatStartTime = Date.now();
    this._createUI();
    this._listen();
  }

  private _createUI(): void {
    // Toggle button
    this.btnEl = document.createElement("button");
    this.btnEl.className = "combat-log-btn";
    this.btnEl.textContent = "\uD83D\uDCDC";
    this.btnEl.title = "Combat Log";
    this.btnEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Panel (uses shared HTML template)
    const wrapper = document.createElement("div");
    wrapper.innerHTML = createLogPanelHTML("combat-log-panel", "combat-log-list", "combat-log-close-btn");
    this.panelEl = wrapper.firstElementChild as HTMLElement;

    this.listEl = this.panelEl.querySelector("#combat-log-list");

    const closeBtn = this.panelEl.querySelector("#combat-log-close-btn") as HTMLElement;
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close();
    });

    // Prevent clicks on the panel from triggering attack
    this.panelEl.addEventListener("click", (e) => e.stopPropagation());

    this.container.appendChild(this.btnEl);
    this.container.appendChild(this.panelEl);
  }

  private _listen(): void {
    // Player attacks monster
    this._onDamage = (data: any) => {
      const ts = Date.now();
      this.addEntry({
        type: 'player_attack',
        timestamp: ts,
        monsterName: this.currentMonsterName,
        damage: data.damage,
        breakdown: data.damageBreakdown || null,
        isCrit: data.isCrit,
      });
      // Passive procs from tap
      if (data.critExplosionDmg > 0) {
        this.addEntry({ type: 'passive_crit_explosion', timestamp: ts, monsterName: this.currentMonsterName, damage: data.critExplosionDmg });
      }
      if (data.multiStrikeDmg > 0) {
        this.addEntry({ type: 'passive_multi_strike', timestamp: ts, monsterName: this.currentMonsterName, damage: data.multiStrikeDmg });
      }
    };
    this.events.on("damage", this._onDamage);

    // Active skill hits
    this._onSkillHit = (data: any) => {
      const ts = Date.now();
      const skillDef = ACTIVE_SKILLS[data.skillId as keyof typeof ACTIVE_SKILLS];
      const skillName = skillDef?.name || data.skillId;

      if (data.skillType === 'heal') {
        this.addEntry({ type: 'skill_heal', timestamp: ts, skillName, healAmount: data.healAmount });
      } else if (data.skillType === 'buff' || data.skillType === 'debuff') {
        this.addEntry({ type: 'skill_buff', timestamp: ts, skillName });
      } else if (data.damage > 0) {
        this.addEntry({
          type: 'skill_hit',
          timestamp: ts,
          monsterName: this.currentMonsterName,
          skillName,
          damage: data.damage,
          breakdown: data.damageBreakdown || null,
          isCrit: data.isCrit,
        });
      }
    };
    this.events.on("skillHit", this._onSkillHit);

    // Enemy attacks player
    this._onEnemyAttack = (data: any) => {
      const ts = Date.now();
      if (data.dodged) {
        this.addEntry({
          type: 'dodge',
          timestamp: ts,
          monsterName: this.currentMonsterName,
          attackName: data.attackName,
        });
        if (data.dodgeCounterDmg > 0) {
          this.addEntry({ type: 'passive_dodge_counter', timestamp: ts, monsterName: this.currentMonsterName, damage: data.dodgeCounterDmg });
        }
      } else if (data.blocked) {
        this.addEntry({
          type: 'block',
          timestamp: ts,
          monsterName: this.currentMonsterName,
          attackName: data.attackName,
        });
        if (data.shieldBashDmg > 0) {
          this.addEntry({ type: 'passive_shield_bash', timestamp: ts, monsterName: this.currentMonsterName, damage: data.shieldBashDmg });
        }
      } else if (data.damage > 0) {
        this.addEntry({
          type: 'enemy_attack',
          timestamp: ts,
          monsterName: this.currentMonsterName,
          attackName: data.attackName,
          damage: data.damage,
          breakdown: data.breakdown || null,
        });
        if (data.thornsDmg > 0) {
          this.addEntry({ type: 'passive_thorns', timestamp: ts, monsterName: this.currentMonsterName, damage: data.thornsDmg });
        }
      }
    };
    this.events.on("enemyAttack", this._onEnemyAttack);

    // Monster spawned - track name
    this._onMonsterSpawned = (monster: any) => {
      this.currentMonsterName = monster.name || 'Monster';
    };
    this.events.on("monsterSpawned", this._onMonsterSpawned);

    // Monster died - add separator
    this._onMonsterDied = (data: any) => {
      this.addEntry({
        type: 'monster_died',
        timestamp: Date.now(),
        monsterName: data.monster?.name || this.currentMonsterName,
      });
    };
    this.events.on("monsterDied", this._onMonsterDied);

    // XP gained per kill
    this._onXpGained = (data: any) => {
      this.addEntry({
        type: 'xp_gained',
        timestamp: Date.now(),
        xpAmount: data.xp,
      });
    };
    this.events.on("xpGained", this._onXpGained);

    // Player died
    this._onPlayerDied = () => {
      this.addEntry({
        type: 'player_died',
        timestamp: Date.now(),
      });
    };
    this.events.on("playerDied", this._onPlayerDied);
  }

  private addEntry(entry: LogEntry): void {
    this.entries.push(entry);
    // Cap entries
    if (this.entries.length > 500) {
      this.entries.shift();
    }

    if (this.isOpen && this.listEl) {
      this.listEl.appendChild(renderLogEntry(entry, this.combatStartTime));
      this._scrollToBottom();
    }
  }

  private _scrollToBottom(): void {
    if (this.listEl) {
      this.listEl.scrollTop = this.listEl.scrollHeight;
    }
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (!this.panelEl || !this.listEl) return;
    this.isOpen = true;
    this.panelEl.classList.remove("combat-log-panel--hidden");

    // Render all entries
    this.listEl.innerHTML = '';
    renderLogEntries(this.listEl, this.entries, this.combatStartTime);
  }

  close(): void {
    if (!this.panelEl) return;
    this.isOpen = false;
    this.panelEl.classList.add("combat-log-panel--hidden");
  }

  destroy(): void {
    if (this._onDamage) this.events.off("damage", this._onDamage);
    if (this._onSkillHit) this.events.off("skillHit", this._onSkillHit);
    if (this._onEnemyAttack) this.events.off("enemyAttack", this._onEnemyAttack);
    if (this._onMonsterSpawned) this.events.off("monsterSpawned", this._onMonsterSpawned);
    if (this._onMonsterDied) this.events.off("monsterDied", this._onMonsterDied);
    if (this._onXpGained) this.events.off("xpGained", this._onXpGained);
    if (this._onPlayerDied) this.events.off("playerDied", this._onPlayerDied);
    if (this.btnEl) this.btnEl.remove();
    if (this.panelEl) this.panelEl.remove();
  }
}
