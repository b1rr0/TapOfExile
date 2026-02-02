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
export class SceneManager {
  /**
   * @param {HTMLElement} container — #scene-container element
   * @param {Object} deps — shared dependencies passed to every scene constructor
   */
  constructor(container, deps = {}) {
    this.container = container;
    this.deps = deps;

    /** @type {Map<string, new(container, deps) => Scene>} */
    this._registry = new Map();

    /** @type {{ name: string, instance: Object } | null} */
    this._active = null;
  }

  /**
   * Register a scene class under a name.
   * @param {string} name
   * @param {Function} SceneClass — must implement mount(params) and unmount()
   */
  register(name, SceneClass) {
    this._registry.set(name, SceneClass);
  }

  /**
   * Switch to a registered scene.
   * Unmounts the current scene, creates + mounts the new one.
   * @param {string} name
   * @param {Object} [params] — passed to scene.mount()
   */
  switchTo(name, params = {}) {
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

  /** @returns {string|null} name of the current active scene */
  get currentScene() {
    return this._active ? this._active.name : null;
  }

  /** @returns {Object|null} instance of the current active scene */
  get currentInstance() {
    return this._active ? this._active.instance : null;
  }
}
