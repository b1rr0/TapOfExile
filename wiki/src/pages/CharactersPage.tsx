import { useState } from 'react';
import { CLASS_DEFS, statsAtLevel, specialAtLevel } from '@shared/class-stats';

const CLASSES = Object.values(CLASS_DEFS);

export default function CharactersPage() {
  const [selectedLevel, setSelectedLevel] = useState(1);

  return (
    <>
      <div className="page-heading">
        <h1>Character Classes</h1>
        <p>Choose your path. Each class has unique base stats, growth rates, and a special ability.</p>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Preview at Level:
        </label>
        <input
          type="range"
          min={1}
          max={60}
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(Number(e.target.value))}
          style={{ flex: 1, maxWidth: 300, accentColor: 'var(--accent-primary)' }}
        />
        <span style={{
          fontWeight: 700,
          color: 'var(--accent-gold)',
          fontSize: '1.1rem',
          minWidth: 30,
          textAlign: 'center',
        }}>
          {selectedLevel}
        </span>
      </div>

      <div className="card-grid cols-2">
        {CLASSES.map((c) => {
          const stats = statsAtLevel(c.id, selectedLevel);
          const sv = specialAtLevel(c.id, selectedLevel);
          const maxHp = statsAtLevel('warrior', 60).hp;
          return (
            <div key={c.id} className="card">
              <div className="card-header">
                <div className="card-icon">{c.icon}</div>
                <div>
                  <div className="card-title">{c.name}</div>
                  <div className="card-subtitle">Level {selectedLevel} stats</div>
                </div>
              </div>
              <div className="card-body" style={{ marginBottom: '1rem' }}>
                {c.description}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div className="stat-row">
                  <span className="stat-label">{'\u2764\uFE0F'} HP</span>
                  <div className="stat-bar-container">
                    <div className="stat-bar" style={{ width: `${(stats.hp / maxHp) * 100}%`, background: '#ef4444' }} />
                  </div>
                  <span className="stat-value">{stats.hp}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">{'\u2694\uFE0F'} Damage</span>
                  <div className="stat-bar-container">
                    <div className="stat-bar" style={{ width: `${(stats.tapDamage / 140) * 100}%`, background: '#f59e0b' }} />
                  </div>
                  <span className="stat-value">{stats.tapDamage}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">{'\uD83D\uDCA5'} Crit Chance</span>
                  <span className="stat-value">{(stats.critChance * 100).toFixed(1)}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">{'\u2716\uFE0F'} Crit Dmg</span>
                  <span className="stat-value">{(stats.critMultiplier * 100).toFixed(0)}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">{'\uD83D\uDCA8'} Dodge</span>
                  <span className="stat-value">{(stats.dodgeChance * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resistances</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {Object.entries(c.base.resistance).map(([elem, val]) => (
                  <span key={elem} className={`badge badge-${elem}`}>
                    {elem}: {val}
                  </span>
                ))}
              </div>

              <div className="info-box" style={{ margin: 0 }}>
                <h4>{c.special.icon} {c.special.name}</h4>
                <p>
                  {c.special.description}
                  <br />
                  <strong style={{ color: 'var(--accent-gold)' }}>
                    Level {selectedLevel}: {(sv * 100).toFixed(1)}%
                  </strong>
                </p>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Growth per level: HP +{c.growth.hp} | Dmg +{c.growth.tapDamage} | Crit +{(c.growth.critChance * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="section-title" style={{ marginTop: '2.5rem' }}>Class Comparison (Level 60)</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>HP</th>
              <th>Damage</th>
              <th>Crit %</th>
              <th>Crit Dmg</th>
              <th>Dodge %</th>
              <th>Special</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((c) => {
              const s60 = statsAtLevel(c.id, 60);
              const sv60 = specialAtLevel(c.id, 60);
              return (
                <tr key={c.id}>
                  <td><strong>{c.icon} {c.name}</strong></td>
                  <td>{s60.hp}</td>
                  <td>{s60.tapDamage}</td>
                  <td>{(s60.critChance * 100).toFixed(1)}%</td>
                  <td>{(s60.critMultiplier * 100).toFixed(0)}%</td>
                  <td>{(s60.dodgeChance * 100).toFixed(1)}%</td>
                  <td>{c.special.name}: {(sv60 * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
