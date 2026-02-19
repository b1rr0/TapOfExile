import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: '&#9876;&#65039;', title: 'Characters', desc: '4 unique classes: Warrior, Samurai, Mage, Archer. Each with unique abilities, stat growth, and playstyles.', to: '/characters' },
  { icon: '&#128737;&#65039;', title: 'Equipment', desc: 'Potions with 6 flask types and 4 quality tiers. Gear system coming soon.', to: '/equipment' },
  { icon: '&#128121;', title: 'Enemies', desc: '8 monster types across 5 acts with elemental resistances, 4 rarity tiers, and unique attacks.', to: '/enemies' },
  { icon: '&#127942;', title: 'Champions', desc: 'Live leaderboards: Dojo damage rankings and top experienced fighters by league.', to: '/champions' },
  { icon: '&#127795;', title: 'Skill Tree', desc: '200+ passive nodes: minor, major, and keystone. Build your character your way.', to: '/skill-tree' },
  { icon: '&#128163;', title: 'Damage & Formulas', desc: 'Deep dive into elemental damage, resistances, crit multipliers, and scaling formulas.', to: '/damage' },
  { icon: '&#128214;', title: 'Main Plot', desc: '5 acts spanning Castle, Meadow, Fields, Snow Mountain, and The Depths.', to: '/plot' },
  { icon: '&#128506;&#65039;', title: 'Maps & Bosses', desc: '10 endgame tiers, 8 unique boss encounters, map key drops, and boss key system.', to: '/maps' },
  { icon: '&#128176;', title: 'Trade', desc: 'Player-to-player trading system. Coming soon in a future update.', to: '/trade' },
];

export default function HomePage() {
  return (
    <>
      <div className="hero-banner">
        <h1>Tap of Exile Wiki</h1>
        <p>
          The unofficial community guide for Tap of Exile &mdash; a Telegram Mini-App idle RPG.
          Explore characters, enemies, skill builds, maps, bosses, and game mechanics.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', position: 'relative' }}>
          <a
            href="https://t.me/Tap_Of_Exile_Bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--accent-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            &#9992;&#65039; Play on Telegram
          </a>
          <a
            href="https://discord.gg/mgCNqp9q"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            &#128172; Join Discord
          </a>
        </div>
      </div>

      <div className="card-grid cols-3">
        {FEATURES.map((f) => (
          <Link key={f.to} to={f.to} style={{ textDecoration: 'none' }}>
            <div className="card feature-card">
              <span className="feature-icon" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="info-box" style={{ marginTop: '2rem' }}>
        <h4>&#128679; Wiki Status</h4>
        <p>
          This wiki is currently populated with static game data. In a future update, it will auto-sync
          with the game database to always show the latest information, including live Dojo leaderboards
          and real-time player statistics.
        </p>
      </div>
    </>
  );
}
