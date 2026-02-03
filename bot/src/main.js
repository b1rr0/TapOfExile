import { EventBus } from "./game/events.js";
import { GameState } from "./game/state.js";
import { SceneManager } from "./scenes/scene-manager.js";
import { CombatScene } from "./scenes/combat-scene.js";
import { HideoutScene } from "./scenes/hideout-scene.js";
import { MapScene } from "./scenes/map-scene.js";
import { VictoryScene } from "./scenes/victory-scene.js";
import { StorybookScene } from "./scenes/storybook-scene.js";
import { CharacterCreateScene } from "./scenes/character-create-scene.js";
import { CharacterSelectScene } from "./scenes/character-select-scene.js";
import { SkinShopScene } from "./scenes/skin-shop-scene.js";
import { MapDeviceScene } from "./scenes/map-device-scene.js";

// Feature flags (set VITE_IS_TESTING=true in .env to enable)
export const IS_TESTING = import.meta.env.VITE_IS_TESTING === "true";

// Telegram Web App init
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Core systems
const events = new EventBus();
const state = new GameState(events);

// Load game
state.load();

// Offline progress check (only if a character is active)
if (state.data.activeCharacterId) {
  const offline = state.calculateOfflineProgress();
  if (offline.offlineGold > 0) {
    const offlineEl = document.getElementById("offline-popup");
    const offlineGoldEl = document.getElementById("offline-gold");
    const claimBtn = document.getElementById("offline-claim");

    offlineGoldEl.textContent = String(offline.offlineGold);
    offlineEl.classList.remove("hidden");

    claimBtn.addEventListener(
      "click",
      () => {
        offlineEl.classList.add("hidden");
        state.data.player.gold += offline.offlineGold;
        events.emit("goldChanged", { gold: state.data.player.gold });
        state.save();
      },
      { once: true }
    );
  }
}

// Hide loading screen
document.getElementById("loading-screen").classList.add("hidden");

// Scene manager
const sceneContainer = document.getElementById("scene-container");
const sceneManager = new SceneManager(sceneContainer, { events, state, sceneManager: null });
sceneManager.deps.sceneManager = sceneManager;

sceneManager.register("characterCreate", CharacterCreateScene);
sceneManager.register("characterSelect", CharacterSelectScene);
sceneManager.register("combat", CombatScene);
sceneManager.register("hideout", HideoutScene);
sceneManager.register("map", MapScene);
sceneManager.register("victory", VictoryScene);
sceneManager.register("skinShop", SkinShopScene);
sceneManager.register("mapDevice", MapDeviceScene);
if (IS_TESTING) sceneManager.register("storybook", StorybookScene);

// Route to starting scene based on character state
if (!state.hasCharacters()) {
  sceneManager.switchTo("characterCreate");
} else if (!state.data.activeCharacterId) {
  sceneManager.switchTo("characterSelect");
} else {
  sceneManager.switchTo("hideout");
}

// Save on visibility change + beforeunload
document.addEventListener("visibilitychange", () => {
  if (document.hidden) state.save();
});
window.addEventListener("beforeunload", () => state.save());

// Prevent double-tap zoom
document.addEventListener("dblclick", (e) => e.preventDefault());
