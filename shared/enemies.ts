/**
 * Monster type definitions - shared between wiki, bot, and server.
 *
 * Each monster type has display metadata (icon, colors, description)
 * and gameplay data (element, resistances, min stage).
 */

export interface MonsterTypeDef {
  /** Monster type key (matches keys in MONSTER_ATTACKS). */
  name: string;
  icon: string;
  /** Minimum stage/order where this monster first appears. */
  minStage: number;
  /** CSS body color for FE rendering. */
  bodyColor: string;
  /** Human-readable resistance summary (e.g. "Physical + Lightning"). */
  resistance: string;
  /** Human-readable element summary (e.g. "Fire"). */
  element: string;
  description: string;
}

export const ENEMY_DEFS: readonly MonsterTypeDef[] = [
  { name: 'Bandit',        icon: '\uD83D\uDDE1\uFE0F', minStage: 1,  bodyColor: '#8b6914', resistance: 'Physical',             element: 'Physical',                description: 'Common human fighters found throughout all acts.' },
  { name: 'Wild Boar',     icon: '\uD83D\uDC17',       minStage: 1,  bodyColor: '#6b3a2a', resistance: 'Physical',             element: 'Physical',                description: 'Fierce beasts that charge with brute force.' },
  { name: 'Forest Spirit', icon: '\uD83C\uDF3F',       minStage: 3,  bodyColor: '#2e7d32', resistance: 'Cold',                 element: 'Cold + Pure',             description: 'Mystical nature spirits with cold and pure damage.' },
  { name: 'Ronin',         icon: '\u2694\uFE0F',       minStage: 5,  bodyColor: '#4a4a6a', resistance: 'Physical + Lightning', element: 'Physical + Lightning',    description: 'Masterless warriors with lightning-fast blade techniques.' },
  { name: 'Oni',           icon: '\uD83D\uDC79',       minStage: 8,  bodyColor: '#c41e3a', resistance: 'Fire',                 element: 'Fire',                    description: 'Demonic beings wreathed in hellfire.' },
  { name: 'Tengu',         icon: '\uD83E\uDDA5',       minStage: 12, bodyColor: '#1a237e', resistance: 'Lightning + Cold',     element: 'Lightning',               description: 'Wind spirits with devastating lightning attacks.' },
  { name: 'Dragon',        icon: '\uD83D\uDC09',       minStage: 15, bodyColor: '#4a0072', resistance: 'Multi-element',        element: 'Fire + Pure',             description: 'Ancient dragons with multi-elemental resistances and devastating attacks.' },
  { name: 'Shogun',        icon: '\uD83D\uDC51',       minStage: 20, bodyColor: '#b8860b', resistance: 'All elements',         element: 'Phys + Lightning + Pure', description: 'Supreme warlords with resistance to all elements.' },
];
