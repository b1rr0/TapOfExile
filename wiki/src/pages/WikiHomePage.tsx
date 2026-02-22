import { Link } from 'react-router-dom';

const WIKI_SECTIONS = [
  {
    to: '/wiki/characters',
    icon: '⚔️',
    title: 'Classes & Characters',
    desc: '4 unique classes — Warrior, Samurai, Mage, Archer. Compare stats at every level, resistances, special abilities, and class-specific passive paths.',
    tags: ['Stats', 'Abilities', 'Comparison'],
  },
  {
    to: '/wiki/enemies',
    icon: '👹',
    title: 'Enemies & Monsters',
    desc: '8 monster types across 5 acts with elemental resistances. 4 rarity tiers (Common, Rare, Epic, Boss) with HP/Gold/XP multipliers.',
    tags: ['Resistances', 'Rarity', 'Elements'],
  },
  {
    to: '/wiki/damage',
    icon: '💥',
    title: 'Damage & Formulas',
    desc: 'Elemental damage system (Physical, Fire, Lightning, Cold, Pure). Resistance caps, crit multipliers, active skill damage, and scaling math.',
    tags: ['Formulas', 'Elements', 'Scaling'],
  },
  {
    to: '/wiki/plot',
    icon: '📜',
    title: 'Plot & Acts',
    desc: '5 acts with 10 locations each. Castle → Meadow → Fields → Snow Mountain → The Depths. Each act with buffs, debuffs, and lore.',
    tags: ['Acts', 'Locations', 'Lore'],
  },
  {
    to: '/wiki/maps',
    icon: '🗺️',
    title: 'Endgame Maps',
    desc: '10 map tiers (1x–25x HP), 8 unique boss encounters, 3 boss key tiers (Standard / Empowered / Mythic), and the drop system explained.',
    tags: ['Tiers', 'Bosses', 'Keys'],
  },
  {
    to: '/wiki/equipment',
    icon: '⚗️',
    title: 'Equipment & Flasks',
    desc: '6 flask types from Small Vial to Jug. 4 quality tiers (Common 2 charges → Legendary 5 charges). Loot pool and drop probability system.',
    tags: ['Flasks', 'Quality', 'Loot'],
  },
  {
    to: '/wiki/skill-tree',
    icon: '🌳',
    title: 'Passive Skill Tree',
    desc: '200+ passive nodes: minor bonuses, notable skills, and powerful keystones. Each class starts at a unique position on the massive tree.',
    tags: ['Nodes', 'Keystones', 'Builds'],
  },
];

export default function WikiHomePage() {
  return (
    <div className="wiki-home">
      <div className="wiki-home-header">
        <h1>📖 Tap of Exile — Wiki</h1>
        <p>
          Complete reference for all game mechanics, formulas, enemies, and content.
          Choose a category below to get started.
        </p>
      </div>

      <div className="wiki-home-grid">
        {WIKI_SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="wiki-home-card" style={{ textDecoration: 'none' }}>
            <div className="wiki-home-card-icon">{s.icon}</div>
            <div className="wiki-home-card-body">
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="wiki-home-card-tags">
                {s.tags.map((t) => (
                  <span key={t} className="wiki-tag">{t}</span>
                ))}
              </div>
            </div>
            <span className="wiki-home-card-arrow">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
