import { Character } from "./character.js";

/**
 * EnemyCharacter — enemy on the right side of the battlefield.
 *
 * Defaults:
 *  - Positioned at 62% of canvas width, -15px offset
 *  - Horizontally flipped (faces left)
 *  - Ground line at 85% of canvas height
 *
 * Provides high-level methods for the battle lifecycle:
 *  - spawn()  — entrance animation + run → idle
 *  - die()    — death sprite animation → fade out
 *  - hit()    — shake on damage
 *
 * To use a different enemy skin, pass any sprite config that has
 * at least `idle`, `run`, and `death` animations.
 *
 * @example
 *   import { getEnemySkin } from "../../data/sprite-registry.js";
 *   const skin = getEnemySkin("goblin_black");
 *   const enemy = new EnemyCharacter(skin);
 *   await enemy.load();
 *   enemy.spawn();
 */
export class EnemyCharacter extends Character {
  /**
   * @param {Object} skin — entry from ENEMY_SKINS registry
   *   { basePath, animations, defaultSize: { w, h } }
   * @param {Object} [overrides] — optional position/size overrides
   */
  constructor(skin, overrides = {}) {
    super({
      spriteConfig: { basePath: skin.basePath, animations: skin.animations },
      xRatio: overrides.xRatio ?? 0.62,
      xOffset: overrides.xOffset ?? -15,
      groundLine: overrides.groundLine ?? 0.85,
      w: overrides.w ?? skin.defaultSize.w,
      h: overrides.h ?? skin.defaultSize.h,
      flipX: overrides.flipX ?? true,
    });

    this.skinId = skin.id;
    this.skinName = skin.name;

    // Entrance defaults
    this._defaultEntranceOffset = overrides.entranceOffset ?? 400;
    this._defaultEntranceSpeed = overrides.entranceSpeed ?? 700;
  }

  /**
   * Spawn: reset state → slide in from right → run animation → idle.
   * Call this when a new monster appears.
   */
  spawn() {
    this.resetState();
    this.startEntrance(this._defaultEntranceOffset, this._defaultEntranceSpeed);
    this.play("run", {
      onComplete: () => this.play("idle"),
    });
  }

  /**
   * Die: play death sprite animation, then fade out.
   * @param {Function} [onGone] — called when the character is fully invisible
   */
  die(onGone) {
    this.play("death", {
      onComplete: () => {
        this.startDeath();
        if (onGone) {
          // Poll until fully invisible (alpha reaches 0)
          const check = () => {
            if (!this.visible) { onGone(); return; }
            setTimeout(check, 100);
          };
          check();
        }
      },
    });
  }

  /**
   * Hit: shake the character. Called on every damage tick.
   */
  hit() {
    this.shake(6);
  }
}
