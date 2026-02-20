// Temporarily disable the assertion to see positions
import { SkillTreeBuilder, EMBLEM_RADIUS, NODE_RADIUS, CLASS_IDS } from './skill-tree';

const CX = 800, CY = 800;
const CLASS_ANGLE: Record<string, number> = { samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: (3 * Math.PI) / 2 };
const START_RADIUS = 210;
const R0 = START_RADIUS + EMBLEM_RADIUS;

// Just compute the raw angles/positions for samurai inner+trunk
const cls = 'samurai';
const base = CLASS_ANGLE[cls] - Math.PI / 2; // = -PI/2

console.log(`base angle: ${base.toFixed(3)} (${(base * 180 / Math.PI).toFixed(1)}°)`);

// Inner ring: 3 nodes at spread 0.30
for (let j = 0; j < 3; j++) {
  const a = base + (j - 1) * 0.30;
  const r = R0 + 104;
  const x = CX + Math.cos(a) * r;
  const y = CY + Math.sin(a) * r;
  console.log(`inner[${j}]: angle=${a.toFixed(3)} (${(a * 180/Math.PI).toFixed(1)}°) x=${x.toFixed(1)} y=${y.toFixed(1)}`);
}

// Trunk ring: 5 nodes at spread 0.16
for (let j = 0; j < 5; j++) {
  const a = base + (j - 2) * 0.16;
  const r = R0 + 192;
  const x = CX + Math.cos(a) * r;
  const y = CY + Math.sin(a) * r;
  const innerLink = Math.min(Math.floor(j * 3 / 5), 2);
  console.log(`trunk[${j}]: angle=${a.toFixed(3)} (${(a * 180/Math.PI).toFixed(1)}°) x=${x.toFixed(1)} y=${y.toFixed(1)} ← inner[${innerLink}]`);
}

// Check: does inner[0]→trunk[0] cross inner[1]→trunk[2]?
// inner[0] at angle base-0.30, inner[1] at angle base+0
// trunk[0] at angle base-0.32, trunk[2] at angle base+0
// So inner[0]→trunk[0] goes from (base-0.30, R0+104) to (base-0.32, R0+192) — almost radial
// And inner[1]→trunk[2] goes from (base+0, R0+104) to (base+0, R0+192) — perfectly radial
// These shouldn't cross! Unless jitter moves them...
