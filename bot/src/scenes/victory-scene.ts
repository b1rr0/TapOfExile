import { formatNumber } from "../utils/format.js";
import { TOTAL_ACTS } from "../data/locations.js";
import { formatCombatTime, renderLogEntries, createLogPanelHTML } from "../ui/combat-log-renderer.js";
import type { LogEntry } from "../ui/combat-log-renderer.js";
import type { SharedDeps, BagItem } from "../types.js";

/**
 * VictoryScene - shown after completing a location or endgame map.
 *
 * Displays:
 *  - "Victory!" title + location name
 *  - Gold and XP rewards
 *  - Act completion banner (when applicable)
 *  - Loot drops (map keys for endgame, placeholder for future location drops)
 *  - Two action buttons: Battle Log + Hideout
 *  - Fullscreen combat log panel
 */
export class VictoryScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;
  }

  /**
   * @param params.locationName
   * @param params.rewards - { gold, xp }
   * @param params.actComplete - act number if the act was just completed
   * @param params.isMapVictory - true if this was an endgame map
   * @param params.mapDrops - array of dropped map key items
   * @param params.logEntries - LogEntry[] from CombatLog
   * @param params.combatStartTime - absolute ms timestamp
   */
  mount(params: Record<string, any> = {}): void {
    const {
      locationName = "Unknown",
      rewards = { gold: 0, xp: 0 },
      actComplete = null,
      isMapVictory = false,
      mapDrops = [],
      logEntries = [] as LogEntry[],
      combatStartTime = Date.now(),
    } = params;

    // Act completion banner
    let actBanner = "";
    if (actComplete) {
      const subtitle: string = actComplete < TOTAL_ACTS
        ? `Act ${actComplete + 1} Unlocked`
        : "All Acts Complete!";
      actBanner = `
        <div class="victory-act-complete">
          <div class="victory-act-complete__title">Act ${actComplete} Complete!</div>
          <div class="victory-act-complete__subtitle">${subtitle}</div>
        </div>
      `;
    }

    // Loot drops section
    let dropsHtml = "";
    if (mapDrops.length > 0) {
      const dropItems = mapDrops.map((d: any) => {
        let iconHtml = `<span class="victory-drop__icon">${d.icon ?? ''}</span>`;
        // Render potion sprite if flaskType is available
        if (d.type === 'potion' && d.flaskType) {
          const charges = Math.min(d.maxCharges ?? 2, 5);
          iconHtml = `<img class="victory-drop__icon" src="/assets/equipments/consumables/${d.flaskType}s/red_${charges}.png" style="width:32px;height:32px;image-rendering:pixelated">`;
        } else if (d.type === 'equipment' && d.icon) {
          iconHtml = `<img class="victory-drop__icon" src="${d.icon}" style="width:32px;height:32px;image-rendering:pixelated">`;
        }
        const levelBadge = d.level ? `<span class="victory-drop__level">iLvl ${d.level}</span>` : '';
        return `<div class="victory-drop victory-drop--${d.quality}">
          ${iconHtml}
          <span class="victory-drop__name">${d.name}</span>
          ${levelBadge}
        </div>`;
      }).join("");
      dropsHtml = `
        <div class="victory-drops">
          <div class="victory-drops__title">Loot</div>
          <div class="victory-drops__list">${dropItems}</div>
        </div>
      `;
    } else if (isMapVictory) {
      dropsHtml = `
        <div class="victory-drops">
          <div class="victory-drops__title">Loot</div>
          <div class="victory-drops__empty">No items dropped</div>
        </div>
      `;
    } else {
      // Future: location drops placeholder
      dropsHtml = `
        <div class="victory-drops">
          <div class="victory-drops__title">Loot</div>
          <div class="victory-drops__empty">No items dropped</div>
        </div>
      `;
    }

    // Combat duration
    const combatDuration = Date.now() - (combatStartTime as number);
    const timeStr = formatCombatTime(combatDuration);

    this.container.innerHTML = `
      <div class="victory">
        <div class="victory-content">
          ${actBanner}
          <div class="victory-title">Victory!</div>
          <div class="victory-location">${locationName}</div>
          <div class="victory-time">${timeStr}</div>

          <div class="victory-rewards">
            <div class="victory-reward">
              <span class="victory-reward__icon">&#x1FA99;</span>
              <span class="victory-reward__value">+${formatNumber(rewards.gold)}</span>
              <span class="victory-reward__label">Gold</span>
            </div>
            <div class="victory-reward">
              <span class="victory-reward__icon">&#x2B50;</span>
              <span class="victory-reward__value">+${rewards.xp}</span>
              <span class="victory-reward__label">XP</span>
            </div>
          </div>

          ${dropsHtml}

          <div class="victory-actions">
            <button class="victory-btn victory-btn--log" id="victory-log-btn">&#x1F4DC; Battle Log</button>
            <button class="victory-btn victory-btn--hideout" id="victory-continue">Hideout</button>
          </div>
        </div>

        ${createLogPanelHTML("victory-log-panel", "victory-log-list", "victory-log-close")}
      </div>
    `;

    // ── Buttons ──
    (this.container.querySelector("#victory-continue") as HTMLButtonElement)
      .addEventListener("click", () => this.sceneManager.switchTo("hideout"));

    const logPanel = this.container.querySelector("#victory-log-panel") as HTMLElement;
    const logList = this.container.querySelector("#victory-log-list") as HTMLElement;

    // Prevent clicks on the panel from triggering anything underneath
    logPanel.addEventListener("click", (e) => e.stopPropagation());

    (this.container.querySelector("#victory-log-btn") as HTMLElement)
      .addEventListener("click", () => {
        logPanel.classList.toggle("combat-log-panel--hidden");
        if (!logPanel.classList.contains("combat-log-panel--hidden") && logList.children.length === 0) {
          renderLogEntries(logList, logEntries as LogEntry[], combatStartTime as number);
        }
      });

    (this.container.querySelector("#victory-log-close") as HTMLElement)
      .addEventListener("click", () => logPanel.classList.add("combat-log-panel--hidden"));
  }

  unmount(): void {
    this.container.innerHTML = "";
  }
}
