import type { SharedDeps } from "../types.js";

/**
 * SceneManager — scene router.
 *
 * Manages mount/unmount lifecycle of scenes.
 * Only one scene is active at a time.
 *
 * Usage:
 *   const sm = new SceneManager(containerEl);
 *   sm.register("combat", CombatScene);
 *   sm.switchTo("combat", { location });
 */

interface SceneInstance {
  mount(params?: Record<string, unknown>): void;
  unmount(): void;
}

type SceneConstructor = new (container: HTMLElement, deps: SharedDeps) => SceneInstance;

export class SceneManager {
  container: HTMLElement;
  deps: SharedDeps;
  _registry: Map<string, SceneConstructor>;
  _active: { name: string; instance: SceneInstance } | null;

  /**
   * @param container — #scene-container element
   * @param deps — shared dependencies passed to every scene constructor
   */
  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.deps = deps;

    this._registry = new Map();

    this._active = null;
  }

  /**
   * Register a scene class under a name.
   */
  register(name: string, SceneClass: SceneConstructor): void {
    this._registry.set(name, SceneClass);
  }

  /**
   * Switch to a registered scene.
   * Unmounts the current scene, creates + mounts the new one.
   */
  switchTo(name: string, params: Record<string, unknown> = {}): void {
    const SceneClass = this._registry.get(name);
    if (!SceneClass) {
      console.error(`[SceneManager] Scene not found: "${name}"`);
      return;
    }

    // Unmount current scene
    if (this._active) {
      this._active.instance.unmount();
      this._active = null;
    }

    // Clear container
    this.container.innerHTML = "";

    // Create and mount new scene
    const instance = new SceneClass(this.container, this.deps);
    instance.mount(params);
    this._active = { name, instance };

    console.log(`[SceneManager] switched to ${name}`);
  }

  /** name of the current active scene */
  get currentScene(): string | null {
    return this._active ? this._active.name : null;
  }

  /** instance of the current active scene */
  get currentInstance(): SceneInstance | null {
    return this._active ? this._active.instance : null;
  }
}
