import { ACTIVE_SKILLS } from '@shared/active-skills';
import { B } from '@shared/balance';
import type { ElementalDamage } from '@shared/types';

function primaryElement(profile: ElementalDamage): string {
  const entries = Object.entries(profile) as [string, number][];
  if (entries.length === 0) return '-';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

const DISPLAY_SKILLS = Object.values(ACTIVE_SKILLS)
  .filter(s => s.damageMultiplier >= 3 || s.id === 'heal')
  .sort((a, b) => b.damageMultiplier - a.damageMultiplier);

export default function DamagePage() {
  return (
    <>
      <div className="page-heading">
        <h1>Damage & Formulas</h1>
        <p>Complete breakdown of damage calculation, elemental system, resistances, and scaling formulas.</p>
      </div>

      <h2 className="section-title">Elemental Damage System</h2>
      <p className="section-subtitle">5 damage elements with distinct mechanics and resistance interactions.</p>

      <div className="card-grid cols-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { name: 'Physical', icon: '\u2694\uFE0F', badge: 'physical', desc: 'Default damage type. Reduced by armor (physical resistance).' },
          { name: 'Fire', icon: '\uD83D\uDD25', badge: 'fire', desc: 'Elemental fire damage. Reduced by fire resistance.' },
          { name: 'Lightning', icon: '\u26A1', badge: 'lightning', desc: 'Elemental lightning damage. Reduced by lightning resistance.' },
          { name: 'Cold', icon: '\u2744\uFE0F', badge: 'cold', desc: 'Elemental cold damage. Reduced by cold resistance.' },
          { name: 'Pure', icon: '\u2728', badge: 'pure', desc: 'Ignores ALL resistances. Cannot be mitigated.' },
        ].map((e) => (
          <div key={e.name} className="card">
            <div className="card-header">
              <div className="card-icon">{e.icon}</div>
              <div>
                <span className={`badge badge-${e.badge}`}>{e.name}</span>
              </div>
            </div>
            <div className="card-body">{e.desc}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Damage Calculation</h2>
      <div className="formula-box">
        For each element in damageProfile:<br />
        &nbsp;&nbsp;fraction  = damageProfile[element]<br />
        &nbsp;&nbsp;rawElem   = totalDamage * fraction<br />
        &nbsp;&nbsp;resist    = target.resistance[element]  (0 for pure)<br />
        &nbsp;&nbsp;effective = floor(rawElem * (1 - resist))<br />
        <br />
        total = sum(effective for all elements)<br />
        Minimum 1 damage if rawDamage &gt; 0
      </div>

      <div className="info-box">
        <h4>Default Damage Profile</h4>
        <p>All characters start with <code style={{ color: 'var(--accent-gold)' }}>{'{ physical: 1.0 }'}</code> &mdash; 100% physical damage. Elemental splits are added via the passive skill tree, not from class selection.</p>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Monster Stat Scaling</h2>
      <p className="section-subtitle">How monster stats scale with act, order, and rarity.</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>Formula</th>
              <th>Base</th>
              <th>Growth</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>HP</strong></td>
              <td><code>BASE * GROWTH^(order-1) * rarityMul * actMul * [1+/-rand]</code></td>
              <td>{B.MONSTER_HP_BASE}</td>
              <td>{B.MONSTER_HP_GROWTH}x</td>
              <td>+/-{(B.MONSTER_HP_RANDOM * 100).toFixed(0)}%</td>
            </tr>
            <tr>
              <td><strong>Gold</strong></td>
              <td><code>BASE * GROWTH^(order-1) * rarityMul * actMul</code></td>
              <td>{B.MONSTER_GOLD_BASE}</td>
              <td>{B.MONSTER_GOLD_GROWTH}x</td>
              <td>-</td>
            </tr>
            <tr>
              <td><strong>XP</strong></td>
              <td><code>BASE * GROWTH^(order-1) * rarityMul * actMul</code></td>
              <td>{B.MONSTER_XP_BASE}</td>
              <td>{B.MONSTER_XP_GROWTH}x</td>
              <td>-</td>
            </tr>
            <tr>
              <td><strong>Damage</strong></td>
              <td><code>BASE * GROWTH^(order-1) * rarityDmgMul * actMul * [1+/-rand]</code></td>
              <td>{B.MONSTER_DMG_BASE}</td>
              <td>{B.MONSTER_DMG_GROWTH}x</td>
              <td>+/-{(B.MONSTER_DMG_RANDOM * 100).toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="formula-box" style={{ marginTop: '1rem' }}>
        actMul = {B.ACT_SCALING_BASE} ^ (act - 1)<br />
        <br />
        Act 1: 1.0x | Act 2: 2.5x | Act 3: 6.25x | Act 4: 15.6x | Act 5: 39.1x
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Resistance System</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDEE1\uFE0F'}</div>
            <div><div className="card-title">Player Resistances</div></div>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
              <li>Base resistances come from class selection</li>
              <li>Additional resistance from skill tree nodes</li>
              <li>Cap: <strong style={{ color: 'var(--accent-gold)' }}>{(B.RESISTANCE_CAP * 100).toFixed(0)}%</strong> per element</li>
              <li>Damage reduction: <code>effective = raw * (1 - resist)</code></li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDC79'}</div>
            <div><div className="card-title">Monster Resistances</div></div>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
              <li>Base resistances per monster type</li>
              <li>Rarity bonus: Common +{(B.RARITY_RESISTANCE_BONUS.common * 100).toFixed(0)}%, Rare +{(B.RARITY_RESISTANCE_BONUS.rare * 100).toFixed(0)}%, Epic +{(B.RARITY_RESISTANCE_BONUS.epic * 100).toFixed(0)}%, Boss +{(B.RARITY_RESISTANCE_BONUS.boss * 100).toFixed(0)}%</li>
              <li>Same {(B.RESISTANCE_CAP * 100).toFixed(0)}% cap applies</li>
              <li>Pure damage bypasses all resistances</li>
            </ul>
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Player Progression</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Formula / Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Max Level</strong></td>
              <td style={{ color: 'var(--accent-gold)' }}>{B.MAX_LEVEL}</td>
              <td>Hard cap for all characters</td>
            </tr>
            <tr>
              <td><strong>XP to Next Level</strong></td>
              <td style={{ color: 'var(--accent-gold)' }}>XP_BASE * XP_GROWTH^(lvl-1)</td>
              <td>{B.XP_BASE} * {B.XP_GROWTH}^(level-1)</td>
            </tr>
            <tr>
              <td><strong>XP Level Scaling</strong></td>
              <td style={{ color: 'var(--accent-gold)' }}>XP / (1 + {B.XP_LEVEL_SCALING_A}*D&sup2;)</td>
              <td>D = |playerLevel - enemyLevel|. Penalty for fighting enemies far from your level.</td>
            </tr>
            <tr>
              <td><strong>Starting Crit Chance</strong></td>
              <td>5%</td>
              <td>All classes start at 5% crit</td>
            </tr>
            <tr>
              <td><strong>Starting Crit Multiplier</strong></td>
              <td>150%</td>
              <td>Critical hits deal 1.5x damage by default</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Active Skills</h2>
      <p className="section-subtitle">Powerful abilities with cooldowns that deal multiplied elemental damage.</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Cooldown</th>
              <th>Damage Mult</th>
              <th>Element</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_SKILLS.map((s) => {
              const elem = primaryElement(s.elementalProfile);
              return (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{(s.cooldownMs / 1000).toFixed(0)}s</td>
                  <td style={{ color: 'var(--accent-gold)' }}>{s.damageMultiplier > 0 ? `${s.damageMultiplier}x` : '-'}</td>
                  <td>{elem !== '-' ? <span className={`badge badge-${elem}`}>{elem}</span> : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Combat Timers</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr><th>Parameter</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Spawn Delay</td><td>{B.SPAWN_DELAY_MS.toLocaleString()}ms</td></tr>
            <tr><td>Enemy Attack Interval</td><td>{B.ENEMY_ATTACK_INTERVAL_MS.toLocaleString()}ms (1/sec)</td></tr>
            <tr><td>Max Pending Attacks (anti-AFK)</td><td>{B.MAX_PENDING_ATTACKS}</td></tr>
            <tr><td>Anti-Cheat Window</td><td>{B.ANTICHEAT_WINDOW_MS.toLocaleString()}ms</td></tr>
            <tr><td>Max Messages per Window</td><td>{B.ANTICHEAT_MSG_LIMIT}</td></tr>
            <tr><td>Ban Duration</td><td>{B.ANTICHEAT_BAN_DURATION_MS / 3_600_000} hours</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
