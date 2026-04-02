import { Character } from "./character.js";
import type { SkinConfig } from "../../types.js";

/**
 * EnemyCharacter - enemy on the right side of the battlefield.
 *
 * Defaults:
 *  - Positioned at 62% of canvas width, -15px offset
 *  - Horizontally flipped (faces left)
 *  - Ground line at 85% of canvas height
 *
 * Provides high-level methods for the battle lifecycle:
 *  - spawn()  - entrance animation + run → idle
 *  - die()    - death sprite animation → fade out
 *  - hit()    - shake on damage
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

interface EnemyOverrides {
  xRatio?: number;
  xOffset?: number;
  groundLine?: number;
  w?: number;
  h?: number;
  flipX?: boolean;
  anchorOffsetY?: number;
  scale?: number;
  entranceOffset?: number;
  entranceSpeed?: number;
}

export class EnemyCharacter extends Character {
  skinId: string;
  skinName: string;

  _defaultEntranceOffset: number;
  _defaultEntranceSpeed: number;

  /**
   * @param skin - entry from ENEMY_SKINS registry
   * @param overrides - optional position/size overrides
   */
  constructor(skin: SkinConfig, overrides: EnemyOverrides = {}) {
    super({
      spriteConfig: { basePath: skin.basePath, animations: skin.animations },
      xRatio: overrides.xRatio ?? 0.82,
      xOffset: overrides.xOffset ?? 0,
      groundLine: overrides.groundLine ?? 0.90,
      w: overrides.w ?? skin.defaultSize.w,
      h: overrides.h ?? skin.defaultSize.h,
      flipX: overrides.flipX ?? true,
      anchorOffsetY: overrides.anchorOffsetY ?? skin.anchorOffsetY ?? 0,
      scale: overrides.scale ?? skin.scale ?? 1,
    });

    this.skinId = skin.id;
    this.skinName = skin.name;

    // Entrance defaults
    this._defaultEntranceOffset = overrides.entranceOffset ?? 400;
    this._defaultEntranceSpeed = overrides.entranceSpeed ?? 700;
  }

  /**
   * Spawn: reset state → slide in from right while idling.
   * The hero runs toward the enemy (orchestrated by BattleScene).
   */
  spawn(): void {
    this.resetState();
    this.startEntrance(this._defaultEntranceOffset, this._defaultEntranceSpeed);
    this.play("idle");
  }

  /**
   * Die: play death sprite animation, then fade out.
   * @param onGone - called when the character is fully invisible
   */
  die(onGone?: () => void): void {
    this.play("death", {
      onComplete: () => {
        this.startDeath();
        if (onGone) {
          // Poll until fully invisible (alpha reaches 0)
          const check = (): void => {
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
  hit(): void {
    this.shake(6);
  }
}
