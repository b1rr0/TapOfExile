import SkillTreeRenderer from '../components/SkillTreeRenderer';

export default function SkillTreePage() {
  return (
    <>
      <div className="page-heading">
        <h1>Passive Skill Tree</h1>
        <p>200+ allocatable nodes to customize your character's stats and elemental damage profile.</p>
      </div>

      <h2 className="section-title">Interactive Tree</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Pan with drag, zoom with scroll/pinch. Click a node to allocate it. Start by clicking a class emblem start node.
      </p>
      <SkillTreeRenderer height="550px" interactive />

      <h2 className="section-title">Node Types</h2>
      <div className="card-grid cols-3">
        <div className="card" style={{ borderLeft: '3px solid var(--rarity-common)' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(158,158,158,0.1)' }}>{'\u26AA'}</div>
            <div>
              <div className="card-title">Minor Nodes</div>
              <div className="card-subtitle">Small stat bonuses</div>
            </div>
          </div>
          <div className="card-body">
            Small percentage bonuses to individual stats. These form the backbone of your build,
            providing incremental improvements like +5% Damage, +3% Crit Chance, or +20 flat HP.
          </div>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--rarity-rare)' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(79,195,247,0.1)' }}>{'\uD83D\uDD35'}</div>
            <div>
              <div className="card-title">Notable Nodes</div>
              <div className="card-subtitle">Significant stat bonuses</div>
            </div>
          </div>
          <div className="card-body">
            Larger stat bonuses and often multi-stat nodes. Notable nodes provide meaningful
            power spikes, such as +12% Damage + 3% Crit, or significant flat HP gains.
          </div>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--rarity-epic)' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(255,215,64,0.1)' }}>{'\u2B50'}</div>
            <div>
              <div className="card-title">Keystone Nodes</div>
              <div className="card-subtitle">Build-defining abilities</div>
            </div>
          </div>
          <div className="card-body">
            Powerful build-defining nodes that fundamentally change how your character plays.
            These include elemental damage conversions, massive stat boosts, and unique mechanics.
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Stat Modifiers</h2>
      <p className="section-subtitle">
        Each node carries one or more stat modifiers. Modifiers can be percentage-based or flat additions.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>Icon</th>
              <th>Modifier Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Damage</strong></td>
              <td>{'\u2694\uFE0F'}</td>
              <td><span className="badge badge-common">Percent</span></td>
              <td>Increases tap damage by percentage</td>
            </tr>
            <tr>
              <td><strong>HP</strong></td>
              <td>{'\u2764\uFE0F'}</td>
              <td><span className="badge badge-rare">Flat + Percent</span></td>
              <td>Adds flat HP or increases max HP by percentage</td>
            </tr>
            <tr>
              <td><strong>Crit Chance</strong></td>
              <td>{'\uD83D\uDCA5'}</td>
              <td><span className="badge badge-common">Percent</span></td>
              <td>Increases critical hit probability</td>
            </tr>
            <tr>
              <td><strong>Crit Multiplier</strong></td>
              <td>{'\u2716\uFE0F'}</td>
              <td><span className="badge badge-common">Percent</span></td>
              <td>Increases critical hit damage multiplier</td>
            </tr>
            <tr>
              <td><strong>Dodge Chance</strong></td>
              <td>{'\uD83D\uDCA8'}</td>
              <td><span className="badge badge-common">Percent</span></td>
              <td>Chance to completely avoid incoming hits</td>
            </tr>
            <tr>
              <td><strong>Fire Damage</strong></td>
              <td>{'\uD83D\uDD25'}</td>
              <td><span className="badge badge-fire">Elemental</span></td>
              <td>Converts portion of damage to fire element</td>
            </tr>
            <tr>
              <td><strong>Lightning Damage</strong></td>
              <td>{'\u26A1'}</td>
              <td><span className="badge badge-lightning">Elemental</span></td>
              <td>Converts portion of damage to lightning element</td>
            </tr>
            <tr>
              <td><strong>Cold Damage</strong></td>
              <td>{'\u2744\uFE0F'}</td>
              <td><span className="badge badge-cold">Elemental</span></td>
              <td>Converts portion of damage to cold element</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Skill Tree Mechanics</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDCB0'}</div>
            <div>
              <div className="card-title">Allocation &amp; Reset</div>
            </div>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              <li>Allocate points as you level up (1 point per level)</li>
              <li>Nodes must be connected to an already allocated node</li>
              <li>Max 6 class-specific skill nodes per character</li>
              <li>Full reset available at any time (costs 100 gold per node)</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDD04'}</div>
            <div>
              <div className="card-title">Bonus Computation</div>
            </div>
          </div>
          <div className="card-body">
            <div className="formula-box" style={{ margin: '0.5rem 0' }}>
              finalStat = baseStat * (1 + totalPercentBonus) + totalFlatBonus
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Percentage bonuses from all allocated nodes are summed first,
              then applied multiplicatively to the base stat. Flat bonuses are added after.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
