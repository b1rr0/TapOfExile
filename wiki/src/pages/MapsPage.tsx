import { useState } from 'react';
import { MAP_TIERS, BOSS_MAPS, BOSS_KEY_TIERS, DROP_SETTINGS } from '@shared/endgame-maps';

export default function MapsPage() {
  const [tab, setTab] = useState<'tiers' | 'bosses' | 'keys' | 'drops'>('tiers');

  return (
    <>
      <div className="page-heading">
        <h1>Maps & Boss Keys</h1>
        <p>Endgame content unlocked after completing all 5 acts. {MAP_TIERS.length} map tiers and {BOSS_MAPS.length} unique boss encounters.</p>
      </div>

      <div className="info-box" style={{ marginBottom: '1.5rem' }}>
        <h4>Endgame Unlock</h4>
        <p>
          Maps unlock after completing all main-chain locations (orders 1-8) in all 5 acts.
          Upon unlocking, you receive <strong style={{ color: 'var(--accent-gold)' }}>3 Tier 1 Map Keys</strong> to get started.
        </p>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'tiers' ? 'active' : ''}`} onClick={() => setTab('tiers')}>Map Tiers</button>
        <button className={`tab-btn ${tab === 'bosses' ? 'active' : ''}`} onClick={() => setTab('bosses')}>Boss Maps</button>
        <button className={`tab-btn ${tab === 'keys' ? 'active' : ''}`} onClick={() => setTab('keys')}>Boss Key Tiers</button>
        <button className={`tab-btn ${tab === 'drops' ? 'active' : ''}`} onClick={() => setTab('drops')}>Drop System</button>
      </div>

      {tab === 'tiers' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Quality</th>
                  <th>HP Mult</th>
                  <th>Gold Mult</th>
                  <th>XP Mult</th>
                  <th>Monster Lvl</th>
                </tr>
              </thead>
              <tbody>
                {MAP_TIERS.map((t) => (
                  <tr key={t.tier}>
                    <td><strong style={{ color: 'var(--accent-gold)' }}>{t.name}</strong></td>
                    <td>
                      <span className={`badge badge-${t.tier <= 3 ? 'common' : t.tier <= 6 ? 'rare' : t.tier <= 9 ? 'epic' : 'legendary'}`}>
                        {t.tier <= 3 ? 'Common' : t.tier <= 6 ? 'Rare' : t.tier <= 9 ? 'Epic' : 'Legendary'}
                      </span>
                    </td>
                    <td>{t.hpMul}x</td>
                    <td>{t.goldMul}x</td>
                    <td>{t.xpMul}x</td>
                    <td>{40 + Math.round(t.tier * 1.2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="formula-box" style={{ marginTop: '1rem' }}>
            Base = Act 5, Order 10 monster stats (highest story mode)<br />
            Map Monster HP = baseHP * tierHpMul<br />
            Monster Level = 40 + round(mapTier * 1.2)
          </div>
        </>
      )}

      {tab === 'bosses' && (
        <div className="card-grid cols-2">
          {BOSS_MAPS.map((b) => (
            <div key={b.id} className="card">
              <div className="card-header">
                <div className="card-icon">{b.icon}</div>
                <div>
                  <div className="card-title">{b.name}</div>
                  <div className="card-subtitle">Boss Type: {b.bossType}</div>
                </div>
              </div>
              <div className="card-body" style={{ marginBottom: '0.75rem' }}>{b.description}</div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
                <span><strong style={{ color: 'var(--accent-fire)' }}>HP:</strong> {b.hpMul}x</span>
                <span><strong style={{ color: 'var(--accent-gold)' }}>Gold:</strong> {b.goldMul}x</span>
                <span><strong style={{ color: 'var(--accent-primary)' }}>XP:</strong> {b.xpMul}x</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'keys' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Boss Key Tier</th>
                  <th>Name</th>
                  <th>Quality</th>
                  <th>HP Scale</th>
                  <th>Gold Scale</th>
                  <th>XP Scale</th>
                </tr>
              </thead>
              <tbody>
                {BOSS_KEY_TIERS.map((bk) => (
                  <tr key={bk.tier}>
                    <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{bk.tier}</td>
                    <td><strong>{bk.name}</strong></td>
                    <td><span className={`badge badge-${bk.tier === 1 ? 'common' : bk.tier === 2 ? 'epic' : 'boss'}`}>{bk.quality}</span></td>
                    <td>{bk.hpScale}x</td>
                    <td>{bk.goldScale}x</td>
                    <td>{bk.xpScale}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Boss Key Tier Selection</h3>
          <div className="formula-box">
            Map Tier 5-6 drops Boss Key Tier 1 (Standard)<br />
            Map Tier 7-8 drops Boss Key Tier 2 (Empowered)<br />
            Map Tier 9-10 drops Boss Key Tier 3 (Mythic)<br />
            Boss Maps always drop Boss Key Tier 3 (Mythic)
          </div>
        </>
      )}

      {tab === 'drops' && (
        <>
          <h3 className="section-title">Regular Map Drops</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Drop Type</th>
                  <th>Chance</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Same Tier Key</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.regular.sameTierChance * 100).toFixed(0)}%</td>
                  <td>Map key of the same tier you just completed</td>
                </tr>
                <tr>
                  <td><strong>Tier Up Key</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.regular.tierUpChance * 100).toFixed(0)}%</td>
                  <td>Map key one tier higher (if not at max)</td>
                </tr>
                <tr>
                  <td><strong>Boss Key</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.regular.bossKeyChance * 100).toFixed(0)}%</td>
                  <td>Only from Tier {DROP_SETTINGS.regular.bossKeyMinTier}+ maps</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Boss Map Drops</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Drop Type</th>
                  <th>Chance</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Guaranteed Key</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>100%</td>
                  <td>Random tier between {DROP_SETTINGS.boss.guaranteedTierMin}-{DROP_SETTINGS.boss.guaranteedTierMax}</td>
                </tr>
                <tr>
                  <td><strong>Bonus Key</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.boss.bonusKeyChance * 100).toFixed(0)}%</td>
                  <td>One tier above the guaranteed drop</td>
                </tr>
                <tr>
                  <td><strong>Boss Key</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.boss.bossKeyChance * 100).toFixed(0)}%</td>
                  <td>Always Mythic (Tier 3) quality</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
