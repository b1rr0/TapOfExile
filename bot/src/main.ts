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
import { SkillTreeScene } from "./scenes/skill-tree-scene.js";
import { DeathScene } from "./scenes/death-scene.js";
import { DojoScene } from "./scenes/dojo-scene.js";

// Feature flags (set VITE_IS_TESTING=true in .env to enable)
export const IS_TESTING: boolean = import.meta.env.VITE_IS_TESTING === "true";

// Telegram Web App init
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
}

// Core systems
const events = new EventBus();
const state = new GameState(events);

// Async bootstrap
(async () => {
  try {
    // 1. Auth + load state from server
    await state.load();

    // 2. Hide loading screen
    const loadingEl = document.getElementById("loading-screen") as HTMLElement;
    if (loadingEl) loadingEl.classList.add("hidden");

    // 4. Scene manager
    const sceneContainer = document.getElementById("scene-container") as HTMLElement;
    const sceneManager = new SceneManager(sceneContainer, { events, state, sceneManager: null as any });
    sceneManager.deps.sceneManager = sceneManager;

    sceneManager.register("characterCreate", CharacterCreateScene);
    sceneManager.register("characterSelect", CharacterSelectScene);
    sceneManager.register("combat", CombatScene);
    sceneManager.register("hideout", HideoutScene);
    sceneManager.register("map", MapScene);
    sceneManager.register("victory", VictoryScene);
    sceneManager.register("skinShop", SkinShopScene);
    sceneManager.register("mapDevice", MapDeviceScene);
    sceneManager.register("skillTree", SkillTreeScene);
    sceneManager.register("death", DeathScene);
    sceneManager.register("dojo", DojoScene);
    if (IS_TESTING) sceneManager.register("storybook", StorybookScene);

    // 5. Route to starting scene based on character state
    if (!state.hasCharacters()) {
      sceneManager.switchTo("characterCreate");
    } else if (!state.data.activeCharacterId) {
      sceneManager.switchTo("characterSelect");
    } else {
      sceneManager.switchTo("hideout");
    }
  } catch (err) {
    console.error("[Main] Failed to load game:", err);
    // Show error on loading screen
    const loadingEl = document.getElementById("loading-screen");
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div style="color: #f66; text-align: center; padding: 2rem;">
          <h2>Connection Error</h2>
          <p>Could not connect to game server.</p>
          <p style="font-size: 0.8rem; opacity: 0.7;">${(err as Error).message}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }
})();

// Prevent double-tap zoom
document.addEventListener("dblclick", (e: MouseEvent) => e.preventDefault());
