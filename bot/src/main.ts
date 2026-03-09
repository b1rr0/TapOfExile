import { EventBus } from "./game/events.js";
import { GameState, BannedError } from "./game/state.js";
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
import { ShopScene } from "./scenes/shop-scene.js";
import { MarketScene } from "./scenes/market-scene.js";
import { api } from "./api.js";

// Feature flags — re-exported from config to avoid circular imports
export { IS_TESTING } from "./config.js";
import { IS_TESTING } from "./config.js";

// Telegram Web App init
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();

  // Match Telegram chrome to game background — eliminates grey strips
  const BG = "#080b15";
  try { tg.setBackgroundColor(BG); } catch (_) {}
  try { tg.setHeaderColor(BG); } catch (_) {}
  try { tg.setBottomBarColor?.(BG); } catch (_) {}
} else if (IS_TESTING) {
  // Dev/test mode: inject mock Telegram.WebApp so QA can run the app outside Telegram.
  // The server accepts "test_user_id=999999999" only when NODE_ENV !== "production".
  (window as any).Telegram = {
    WebApp: {
      initData: 'test_user_id=999999999',
      initDataUnsafe: {
        user: { id: 999999999, first_name: 'TestUser', username: 'testuser', is_bot: false },
        auth_date: Math.floor(Date.now() / 1000),
      },
      ready: () => {},
      expand: () => {},
      close: () => {},
      disableVerticalSwipes: () => {},
      platform: 'unknown',
      version: '6.0',
      colorScheme: 'dark',
      themeParams: {},
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
    },
  };
  console.warn('[Main] Test mode: mock Telegram.WebApp injected (userId=999999999)');
}

// Core systems
const events = new EventBus();
const state = new GameState(events);

/* ── Channel subscription gate ──────────────────────── */

function showSubscriptionGate(onSubscribed: () => void): void {
  const loadingEl = document.getElementById("loading-screen") as HTMLElement;
  if (!loadingEl) return;

  loadingEl.classList.remove("hidden");
  loadingEl.innerHTML = `
    <div style="text-align: center; padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <div style="font-size: 40px; font-weight: 800; letter-spacing: 3px; color: var(--game-accent2);
        text-shadow: 0 0 20px rgba(200, 160, 255, 0.4);">Tap of Exile</div>
      <div style="font-size: 16px; color: var(--game-text); opacity: 0.6;">Samurai Idle</div>

      <div style="margin-top: 24px; font-size: 15px; color: var(--game-text); opacity: 0.85; line-height: 1.5;">
        Subscribe to our channel<br>to start playing
      </div>

      <a href="https://t.me/tap_of_exile" target="_blank"
         style="display: flex; align-items: center; justify-content: center; gap: 8px;
           width: 260px; padding: 14px 0; border-radius: 12px; font-size: 16px; font-weight: 700;
           color: #fff; background: linear-gradient(135deg, #229ED9, #1a7ab5); text-decoration: none;
           box-shadow: 0 4px 15px rgba(34,158,217,0.35);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.65-2.89 7.99-3.44 3.81-1.58 4.6-1.86 5.12-1.87.11 0 .37.03.53.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
        </svg>
        Tap of Exile Channel
      </a>

      <button id="check-sub-btn"
        style="width: 260px; padding: 14px 0; border-radius: 12px; font-size: 18px; font-weight: 800;
          color: #fff; background: linear-gradient(135deg, var(--game-accent), #7b2f9e); border: none;
          cursor: pointer; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(155,89,182,0.4);
          text-transform: uppercase;">
        Play
      </button>

      <div id="sub-error" style="color: #f66; font-size: 13px; min-height: 20px;"></div>
    </div>
  `;

  const checkBtn = document.getElementById("check-sub-btn") as HTMLButtonElement;
  const errorEl = document.getElementById("sub-error") as HTMLElement;

  checkBtn.addEventListener("click", async () => {
    checkBtn.disabled = true;
    checkBtn.textContent = "Checking...";
    errorEl.textContent = "";

    try {
      const { subscribed } = await api.auth.checkChannel();
      if (subscribed) {
        onSubscribed();
      } else {
        errorEl.textContent = "You are not subscribed yet. Please join the channel first!";
        checkBtn.disabled = false;
        checkBtn.textContent = "PLAY";
      }
    } catch {
      errorEl.textContent = "Could not verify. Try again.";
      checkBtn.disabled = false;
      checkBtn.textContent = "PLAY";
    }
  });
}

/* ── Ban screen ──────────────────────────────────────── */

function showBanScreen(bannedUntil: number, reason: string): void {
  const loadingEl = document.getElementById("loading-screen") as HTMLElement;
  const sceneEl = document.getElementById("scene-container") as HTMLElement;
  if (sceneEl) sceneEl.innerHTML = "";
  if (!loadingEl) return;

  loadingEl.classList.remove("hidden");

  const expiresDate = new Date(bannedUntil);
  const hoursLeft = Math.max(1, Math.ceil((bannedUntil - Date.now()) / 3_600_000));

  loadingEl.innerHTML = `
    <div class="ban-screen">
      <div class="ban-screen__icon">⛔</div>
      <h2 class="ban-screen__title">Account Suspended</h2>
      <p class="ban-screen__reason">Suspicious activity detected</p>
      <div class="ban-screen__timer">
        <span>Expires in ~${hoursLeft}h</span>
        <span class="ban-screen__date">${expiresDate.toLocaleString()}</span>
      </div>
      <p class="ban-screen__info">
        Your account has been temporarily suspended for violating game rules.
        Please try again after the ban expires.
      </p>
      <button class="ban-screen__btn" onclick="location.reload()">
        Check Again
      </button>
    </div>
  `;
}

/* ── Game startup ───────────────────────────────────── */

function startGame(): void {
  const loadingEl = document.getElementById("loading-screen") as HTMLElement;
  if (loadingEl) loadingEl.classList.add("hidden");

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
  sceneManager.register("storybook", StorybookScene);
  sceneManager.register("shop", ShopScene);
  sceneManager.register("market", MarketScene);

  if (!state.hasCharacters()) {
    sceneManager.switchTo("characterCreate");
  } else if (!state.data.activeCharacterId) {
    sceneManager.switchTo("characterSelect");
  } else {
    sceneManager.switchTo("hideout");
  }
}

// Async bootstrap
(async () => {
  try {
    // 1. Auth + load state from server
    await state.load();

    // 2. Check channel subscription
    try {
      const { subscribed } = await api.auth.checkChannel();
      if (subscribed) {
        startGame();
      } else {
        showSubscriptionGate(() => startGame());
      }
    } catch {
      // If check fails, show gate to be safe
      showSubscriptionGate(() => startGame());
    }
  } catch (err) {
    // Ban check — show full-screen ban instead of game
    if (err instanceof BannedError) {
      console.warn("[Main] Player is banned until", new Date(err.bannedUntil));
      showBanScreen(err.bannedUntil, err.banReason);
      return;
    }

    console.error("[Main] Failed to load game:", err);
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
