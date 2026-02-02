import { Character } from "./character.js";

/**
 * HeroCharacter — player-controlled character on the left side.
 *
 * Defaults:
 *  - Positioned at left edge (x = 0)
 *  - No horizontal flip
 *  - Ground line at 85% of canvas height
 *
 * To use a different hero skin, pass any sprite config that has
 * at least `idle` and `attack1` animations.
 *
 * @example
 *   import { getHeroSkin } from "../../data/sprite-registry.js";
 *   const skin = getHeroSkin("samurai_1");
 *   const hero = new HeroCharacter(skin);
 *   await hero.load();
 *   hero.play("idle");
 */
export class HeroCharacter extends Character {
  /**
   * @param {Object} skin — entry from HERO_SKINS registry
   *   { basePath, animations, defaultSize: { w, h } }
   * @param {Object} [overrides] — optional position/size overrides
   */
  constructor(skin, overrides = {}) {
    super({
      spriteConfig: { basePath: skin.basePath, animations: skin.animations },
      xRatio: overrides.xRatio ?? 0.18,
      groundLine: overrides.groundLine ?? 0.90,
      w: overrides.w ?? skin.defaultSize.w,
      h: overrides.h ?? skin.defaultSize.h,
      flipX: overrides.flipX ?? false,
      anchorOffsetY: overrides.anchorOffsetY ?? skin.anchorOffsetY ?? 0,
      scale: overrides.scale ?? skin.scale ?? 1,
    });

    this.skinId = skin.id;
    this.skinName = skin.name;
  }

  /**
   * Play attack animation, then return to idle.
   * The attack animation name defaults to "attack1" but can be overridden.
   */
  attack(animName = "attack1") {
    this.play(animName, {
      onComplete: () => this.play("idle"),
    });
  }
}
