import { FLASK_DEFS, QUALITY_CHARGES, ROLLS_PER_COMBAT } from '@shared/potion-drops';
import { POTION_SPRITE_PATHS } from '@shared/sprite-registry';

const QUALITIES = Object.keys(QUALITY_CHARGES) as readonly string[];

export default function EquipmentPage() {
  return (
    <>
      <div className="page-heading">
        <h1>Equipment & Items</h1>
        <p>Potions, flasks, and consumables available in Tap of Exile. Gear system coming in future updates.</p>
      </div>

      <h2 className="section-title">Potions (Healing Flasks)</h2>
      <p className="section-subtitle">
        Potions are consumable items that heal a percentage of your max HP per sip.
        Each potion has a flask type (determines heal amount) and quality (determines max charges).
        Equip up to 2 potions in consumable slots.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>Flask Type</th>
              <th>Heal per Sip</th>
              <th>Drop Range</th>
            </tr>
          </thead>
          <tbody>
            {FLASK_DEFS.map((f) => (
              <tr key={f.type}>
                <td>
                  {POTION_SPRITE_PATHS[f.type] ? (
                    <img
                      src={`${POTION_SPRITE_PATHS[f.type]}/idle.png`}
                      alt={f.name}
                      style={{ width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : f.order}
                </td>
                <td><strong>{f.name}</strong></td>
                <td style={{ color: 'var(--accent-fire)' }}>{(f.healPercent * 100).toFixed(0)}% Max HP</td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {f.order <= 2 ? 'Acts 1-2' : f.order <= 4 ? 'Acts 2-4' : 'Acts 4-5, Maps'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Quality Tiers</h2>
      <p className="section-subtitle">
        Higher quality potions have more charges, making them more valuable. Quality determines how many
        times you can use a potion before it runs out.
      </p>

      <div className="card-grid cols-4">
        {QUALITIES.map((q) => (
          <div key={q} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{'\uD83E\uDDEA'}</div>
            <span className={`badge badge-${q}`} style={{ marginBottom: '0.5rem' }}>{q}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', margin: '0.5rem 0' }}>
              {QUALITY_CHARGES[q]} charges
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Loot Pool System</h2>
      <div className="info-box">
        <h4>How Drops Work</h4>
        <p>
          After each combat, {ROLLS_PER_COMBAT} independent rolls are made against the loot pool. Each roll
          has approximately a 50% chance to drop nothing. Items are weighted &mdash;
          common potions appear far more frequently than legendary ones.
        </p>
      </div>

      <div className="formula-box">
        Drop Chance = itemWeight / (totalItemWeights * 2)<br />
        "Nothing" weight = sum of all item weights (always ~50%)<br />
        Rolls per combat = {ROLLS_PER_COMBAT}<br />
        Expected drops per combat = ~{(ROLLS_PER_COMBAT * 0.5).toFixed(1)} items
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Map Keys</h2>
      <p className="section-subtitle">Map keys are special items that grant access to endgame maps and boss encounters.</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Key Type</th>
              <th>Quality by Tier</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{'\uD83D\uDDFA\uFE0F'} Regular Map Key</strong></td>
              <td>
                <span className="badge badge-common">T1-3 Common</span>{' '}
                <span className="badge badge-rare">T4-6 Rare</span>{' '}
                <span className="badge badge-epic">T7-9 Epic</span>{' '}
                <span className="badge badge-legendary">T10 Legendary</span>
              </td>
              <td>Drops from other maps (60% same tier, 20% tier up)</td>
            </tr>
            <tr>
              <td><strong>{'\uD83D\uDC80'} Boss Key</strong></td>
              <td>
                <span className="badge badge-common">Standard (Silver)</span>{' '}
                <span className="badge badge-epic">Empowered (Gold)</span>{' '}
                <span className="badge badge-boss">Mythic (Red)</span>
              </td>
              <td>5% drop from T5+ maps, 5% from boss maps</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="tbd-section" style={{ marginTop: '2rem' }}>
        <div className="tbd-icon">{'\u2694\uFE0F'}</div>
        <h3>Armor & Weapons Coming Soon</h3>
        <p>Full gear system with helmets, armor, weapons, rings, amulets, gloves, belts, and boots is planned for a future update.</p>
      </div>
    </>
  );
}
