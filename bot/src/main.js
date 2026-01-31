import { EventBus } from "./game/events.js";
import { GameState } from "./game/state.js";
import { CombatManager } from "./game/combat.js";
import { UpgradeManager } from "./game/upgrades.js";
import { BattleScene } from "./ui/battle-scene.js";
import { Effects } from "./ui/effects.js";
import { HUD } from "./ui/hud.js";
import { UpgradePanel } from "./ui/upgrade-panel.js";
import { Screens } from "./ui/screens.js";
import { Inventory } from "./ui/inventory.js";
import { haptic } from "./utils/haptic.js";

// Telegram Web App init
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Core systems
const events = new EventBus();
const state = new GameState(events);
const combat = new CombatManager(state, events);
const upgradeManager = new UpgradeManager(state, events);

// UI systems
const screens = new Screens(events);
const hud = new HUD(document.getElementById("hud"), events);
const battleScene = new BattleScene(document.getElementById("battle-scene"), events);
const effects = new Effects(document.getElementById("battle-scene"), events);
const upgradePanel = new UpgradePanel(
  document.getElementById("upgrade-panel"),
  events,
  upgradeManager
);
const inventory = new Inventory(document.getElementById("app"), events);

// Load game
state.load();
upgradeManager.recalculateStats();

// Check offline progress
const offline = state.calculateOfflineProgress();
if (offline.offlineGold > 0) {
  screens.showOfflineReward(offline).then((gold) => {
    state.data.player.gold += gold;
    events.emit("goldChanged", { gold: state.data.player.gold });
    state.save();
  });
}

// Show game, hide loading
screens.showGame();

// Init first monster
combat.init();

// Tap handler
document.getElementById("tap-btn").addEventListener("click", () => {
  combat.handleTap();
  haptic("light");
});

// Passive DPS tick every second
setInterval(() => {
  combat.applyPassiveDamage();
}, 1000);

// Save on visibility change + beforeunload
document.addEventListener("visibilitychange", () => {
  if (document.hidden) state.save();
});
window.addEventListener("beforeunload", () => state.save());

// Prevent double-tap zoom
document.addEventListener("dblclick", (e) => e.preventDefault());
