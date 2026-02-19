import { useState } from 'react';
import { ENEMY_DEFS } from '@shared/enemies';
import { B, RARITY_DEFS } from '@shared/balance';

export default function EnemiesPage() {
  const [tab, setTab] = useState<'types' | 'rarities'>('types');

  return (
    <>
      <div className="page-heading">
        <h1>Enemies</h1>
        <p>{ENEMY_DEFS.length} monster types across 5 acts. Each has unique elemental properties, resistances, and 5 attack patterns.</p>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'types' ? 'active' : ''}`} onClick={() => setTab('types')}>
          Monster Types
        </button>
        <button className={`tab-btn ${tab === 'rarities' ? 'active' : ''}`} onClick={() => setTab('rarities')}>
          Rarity Tiers
        </button>
      </div>

      {tab === 'types' && (
        <div className="card-grid cols-2">
          {ENEMY_DEFS.map((m) => (
            <div key={m.name} className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background: `${m.bodyColor}22` }}>{m.icon}</div>
                <div>
                  <div className="card-title">{m.name}</div>
                  <div className="card-subtitle">First appears: Stage {m.minStage}</div>
                </div>
              </div>
              <div className="card-body" style={{ marginBottom: '0.75rem' }}>{m.description}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resistance</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {m.resistance.split(' + ').map((r) => (
                      <span key={r} className={`badge badge-${r.toLowerCase()}`} style={{ marginRight: '0.25rem' }}>{r}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Damage Type</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {m.element.split(' + ').map((e) => (
                      <span key={e} className={`badge badge-${e.toLowerCase()}`} style={{ marginRight: '0.25rem' }}>{e}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'rarities' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Rarity</th>
                  <th>HP Mult</th>
                  <th>Gold Mult</th>
                  <th>XP Mult</th>
                  <th>DMG Mult</th>
                  <th>Resist Bonus</th>
                </tr>
              </thead>
              <tbody>
                {RARITY_DEFS.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ color: r.color, fontWeight: 700 }}>{r.label}</span>
                    </td>
                    <td>{r.hpMul}x</td>
                    <td>{r.goldMul}x</td>
                    <td>{r.xpMul}x</td>
                    <td>{r.dmgMul}x</td>
                    <td>+{r.resistanceBonus}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="info-box" style={{ marginTop: '1.5rem' }}>
            <h4>Resistance Cap</h4>
            <p>Maximum resistance per element is capped at <strong style={{ color: 'var(--accent-gold)' }}>{(B.RESISTANCE_CAP * 100).toFixed(0)}%</strong>. Boss rarity gets +{(B.RARITY_RESISTANCE_BONUS.boss * 100).toFixed(0)}% bonus to all resistances on top of their base values.</p>
          </div>
        </>
      )}

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Enemy Attacks</h2>
      <p className="section-subtitle">
        Each monster type has 5 unique attack patterns with different elemental splits, speed multipliers, and weighted probabilities. Attacks deal damage every 1 second.
      </p>
      <div className="formula-box">
        Monster Damage = MONSTER_DMG_BASE({B.MONSTER_DMG_BASE}) * DMG_GROWTH({B.MONSTER_DMG_GROWTH})^(order-1) * RARITY_DMG_MUL * actMul * [1 +/- {(B.MONSTER_DMG_RANDOM * 100).toFixed(0)}%]
      </div>
    </>
  );
}
