import { useTranslation } from 'react-i18next';
import { FLASK_DEFS, QUALITY_CHARGES, ROLLS_PER_COMBAT } from '@shared/potion-drops';
import { POTION_SPRITE_PATHS } from '@shared/sprite-registry';
import {
  STAT_DEFS, SLOT_DEFS, SUBTYPES, EQUIPMENT_RARITIES,
  TIER_ILVL_RANGES, TIER_NAMES, SLOT_STAT_POOLS,
  STAT_RANGES, BASE_WEAPON_DAMAGE, BASE_DEFENSES,
  type EquipmentSlotId, type StatId,
} from '@shared/equipment-defs';

const QUALITIES = Object.keys(QUALITY_CHARGES) as readonly string[];

const SLOT_ORDER: EquipmentSlotId[] = [
  'one_hand', 'two_hand', 'helmet', 'amulet', 'armor', 'ring', 'gloves', 'belt', 'boots',
];

const SLOT_ICONS: Record<EquipmentSlotId, string> = {
  one_hand: '\u2694\uFE0F', two_hand: '\uD83D\uDDE1\uFE0F', helmet: '\u26D1\uFE0F',
  amulet: '\uD83D\uDCFF', armor: '\uD83E\uDEE7', ring: '\uD83D\uDC8D',
  gloves: '\uD83E\uDDE4', belt: '\uD83E\uDE96', boots: '\uD83E\uDD7E',
};

const CAT_ICONS: Record<string, string> = {
  offensive: '\u2694\uFE0F', defensive: '\uD83D\uDEE1\uFE0F', utility: '\u2699\uFE0F',
};

function TierRangeCells({ ranges }: { ranges?: [number, number][] }) {
  return (
    <>
      {TIER_NAMES.map((tn, i) => (
        <td key={tn} style={{ fontFamily: 'monospace', color: 'var(--text-heading)' }}>
          {ranges?.[i] ? `${ranges[i][0]}–${ranges[i][1]}` : '—'}
        </td>
      ))}
    </>
  );
}

export default function EquipmentPage() {
  const { t } = useTranslation('equipment');
  const rarityEntries = Object.entries(EQUIPMENT_RARITIES) as [string, typeof EQUIPMENT_RARITIES[keyof typeof EQUIPMENT_RARITIES]][];
  const statEntries = Object.entries(STAT_DEFS) as [StatId, typeof STAT_DEFS[StatId]][];
  const categories = ['offensive', 'defensive', 'utility'] as const;

  return (
    <>
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      {/* ═══ POTIONS ═══ */}
      <h2 className="section-title">{t('potionsTitle')}</h2>
      <p className="section-subtitle">{t('potionsDesc')}</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>{t('thFlaskType')}</th>
              <th>{t('thHealPerSip')}</th>
              <th>{t('thDropRange')}</th>
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
                  {f.order <= 2 ? t('acts12') : f.order <= 4 ? t('acts24') : t('acts45maps')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('qualityTitle')}</h2>
      <p className="section-subtitle">{t('qualityDesc')}</p>

      <div className="card-grid cols-4">
        {QUALITIES.map((q) => (
          <div key={q} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{'\uD83E\uDDEA'}</div>
            <span className={`badge badge-${q}`} style={{ marginBottom: '0.5rem' }}>{q}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', margin: '0.5rem 0' }}>
              {t('charges', { count: QUALITY_CHARGES[q] })}
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('lootTitle')}</h2>
      <div className="info-box">
        <h4>{t('howDropsWork')}</h4>
        <p>{t('lootDesc', { rolls: ROLLS_PER_COMBAT })}</p>
      </div>

      <div className="info-box">
        <p dangerouslySetInnerHTML={{ __html: t('lootAvgDesc', { min: (ROLLS_PER_COMBAT * 0.5).toFixed(0), max: ROLLS_PER_COMBAT }) }} />
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('mapKeysTitle')}</h2>
      <p className="section-subtitle">{t('mapKeysSub')}</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>{t('thKeyType')}</th>
              <th>{t('thQualityByTier')}</th>
              <th>{t('thSource')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{'\uD83D\uDDFA\uFE0F'} {t('regularMapKey')}</strong></td>
              <td>
                <span className="badge badge-common">T1-3 Common</span>{' '}
                <span className="badge badge-rare">T4-6 Rare</span>{' '}
                <span className="badge badge-epic">T7-9 Epic</span>{' '}
                <span className="badge badge-legendary">T10 Legendary</span>
              </td>
              <td>{t('regularMapKeySource')}</td>
            </tr>
            <tr>
              <td><strong>{'\uD83D\uDC80'} {t('bossKey')}</strong></td>
              <td>
                <span className="badge badge-common">Standard (Silver)</span>{' '}
                <span className="badge badge-epic">Empowered (Gold)</span>{' '}
                <span className="badge badge-boss">Mythic (Red)</span>
              </td>
              <td>{t('bossKeySource')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ GEAR SYSTEM ═══ */}
      <h2 className="section-title" style={{ marginTop: '3rem' }}>{'\u2694\uFE0F'} {t('gearTitle')}</h2>
      <p className="section-subtitle">{t('gearDesc')}</p>

      {/* ── Rarities ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('raritiesTitle')}</h3>
      <div className="card-grid cols-4">
        {rarityEntries.map(([id, r]) => (
          <div key={id} className="card" style={{ textAlign: 'center', borderColor: r.color }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: r.color, marginBottom: '0.25rem' }}>
              {r.label}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('statsLabel', { range: r.statCount[0] + (r.statCount[1] !== r.statCount[0] ? `–${r.statCount[1]}` : '') })}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('dropWeight', { weight: r.dropWeight })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tier System ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('tierSystemTitle')}</h3>
      <p className="section-subtitle">{t('tierSystemDesc')}</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr><th>{t('tierSystemTitle')}</th><th>{t('thItemLevelRange')}</th><th>{t('thRequiredLevel')}</th></tr>
          </thead>
          <tbody>
            {TIER_NAMES.map((tn, i) => {
              const [lo, hi] = TIER_ILVL_RANGES[i];
              return (
                <tr key={tn}>
                  <td><strong>{tn}</strong></td>
                  <td>{lo}–{hi}</td>
                  <td>{Math.floor(lo * 0.75)}–{Math.floor(hi * 0.75)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Equipment Slots ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('slotsTitle')}</h3>
      <div className="card-grid cols-3">
        {SLOT_ORDER.map((slotId) => {
          const s = SLOT_DEFS[slotId];
          const pool = SLOT_STAT_POOLS[slotId] || [];
          const subtypeCount = SUBTYPES.filter((st) => st.slot === slotId).length;
          return (
            <div key={slotId} className="card">
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                {SLOT_ICONS[slotId]} <strong style={{ fontSize: '0.95rem' }}>{s.name}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {s.description}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {t('subtypesCount', { count: subtypeCount, pool: pool.length })}
              </div>
              <div>
                {pool.map((statId) => (
                  <span key={statId} className={`badge badge-${STAT_DEFS[statId]?.category === 'offensive' ? 'rare' : STAT_DEFS[statId]?.category === 'utility' ? 'epic' : 'common'}`}
                    style={{ fontSize: '0.65rem', marginRight: 3, marginBottom: 3 }}>
                    {STAT_DEFS[statId]?.name || statId}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── All Subtypes ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('allSubtypes', { count: SUBTYPES.length })}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>{t('thSubtype')}</th><th>{t('slotsTitle')}</th><th>{t('tierSystemDesc')}</th>
              <th>{t('thImplicitStat')}</th>
              {TIER_NAMES.map((tierName) => <th key={tierName}>{tierName}</th>)}
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastSlot = '';
              return SUBTYPES.map((st) => {
                const slotName = SLOT_DEFS[st.slot]?.name || st.slot;
                const header = st.slot !== lastSlot;
                lastSlot = st.slot;
                return (
                  <tr key={st.code}>
                    {header && (
                      <td colSpan={4 + TIER_NAMES.length}
                        style={{ background: 'var(--bg-card)', color: 'var(--accent-fire)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {SLOT_ICONS[st.slot]} {slotName}
                      </td>
                    )}
                    {!header && (
                      <>
                        <td><strong>{st.name}</strong></td>
                        <td><span className="badge badge-common" style={{ fontSize: '0.7rem' }}>{slotName}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{st.description}</td>
                        <td style={{ color: 'var(--accent-fire)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          {st.implicit ? STAT_DEFS[st.implicit.stat]?.name || st.implicit.stat : '—'}
                        </td>
                        <TierRangeCells ranges={st.implicit?.tierRanges} />
                      </>
                    )}
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* ── Stat Reference ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('statRefTitle', { count: statEntries.length })}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr><th>{t('thStat')}</th><th>{t('thUnit')}</th><th>{t('tierSystemDesc')}</th><th>{t('thAvailableIn')}</th></tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <>
                <tr key={`cat-${cat}`}>
                  <td colSpan={4} style={{ background: 'var(--bg-card)', color: 'var(--accent-fire)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {CAT_ICONS[cat]} {cat}
                  </td>
                </tr>
                {statEntries.filter(([, sd]) => sd.category === cat).map(([statId, sd]) => {
                  const slots = Object.entries(SLOT_STAT_POOLS)
                    .filter(([, pool]) => pool.includes(statId))
                    .map(([slotId]) => SLOT_DEFS[slotId as EquipmentSlotId]?.name || slotId);
                  return (
                    <tr key={statId}>
                      <td style={{ color: 'var(--text-heading)' }}>{sd.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{sd.unit}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sd.description}</td>
                      <td>
                        {slots.map((s) => (
                          <span key={s} className="badge badge-common" style={{ fontSize: '0.65rem', marginRight: 2, marginBottom: 2 }}>{s}</span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Base Weapon Damage ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('baseWeaponDmg')}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr><th>Weapon</th>{TIER_NAMES.map((tierName) => <th key={tierName}>{tierName}</th>)}</tr>
          </thead>
          <tbody>
            {(Object.entries(BASE_WEAPON_DAMAGE) as [string, [number, number][]][]).map(([slot, ranges]) => (
              <tr key={slot}>
                <td><strong>{SLOT_DEFS[slot as EquipmentSlotId]?.name || slot}</strong></td>
                <TierRangeCells ranges={ranges} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Base Defenses ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('baseDefenses')}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr><th>Slot</th><th>Type</th>{TIER_NAMES.map((tierName) => <th key={tierName}>{tierName}</th>)}</tr>
          </thead>
          <tbody>
            {Object.entries(BASE_DEFENSES).map(([slot, defs]) => {
              const defTypes = Object.entries(defs) as [string, [number, number][]][];
              return defTypes.map(([defType, ranges], idx) => (
                <tr key={`${slot}-${defType}`}>
                  {idx === 0 && (
                    <td rowSpan={defTypes.length} style={{ fontWeight: 700, verticalAlign: 'middle' }}>
                      {SLOT_DEFS[slot as EquipmentSlotId]?.name || slot}
                    </td>
                  )}
                  <td>{defType.charAt(0).toUpperCase() + defType.slice(1)}</td>
                  <TierRangeCells ranges={ranges} />
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* ── Stat Ranges by Slot ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('statRangesBySlot')}</h3>
      <p className="section-subtitle">{t('statRangesDesc')}</p>
      {SLOT_ORDER.map((slotId) => {
        const slotName = SLOT_DEFS[slotId]?.name || slotId;
        const ranges = STAT_RANGES[slotId];
        if (!ranges) return null;
        const statIds = Object.keys(ranges) as StatId[];
        return (
          <details key={slotId} style={{ marginBottom: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-card)' }}>
            <summary style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 700, color: 'var(--text-heading)' }}>
              {SLOT_ICONS[slotId]} {slotName} ({statIds.length} stats)
            </summary>
            <div style={{ padding: '0.75rem 1rem', overflowX: 'auto' }}>
              <table className="wiki-table">
                <thead>
                  <tr><th>{t('thStat')}</th>{TIER_NAMES.map((tierName) => <th key={tierName}>{tierName}</th>)}</tr>
                </thead>
                <tbody>
                  {statIds.map((statId) => (
                    <tr key={statId}>
                      <td style={{ color: 'var(--text-heading)' }}>{STAT_DEFS[statId]?.name || statId}</td>
                      <TierRangeCells ranges={ranges[statId]} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}

      {/* ── Equipment Effects ── */}
      <h3 className="section-title" style={{ marginTop: '2rem' }}>{t('howStatsWork')}</h3>
      <div className="card-grid cols-2">
        <div className="card">
          <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem' }}>{'\u2694\uFE0F'} {t('offenseTitle')}</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>{t('offense1')}</li>
            <li>{t('offense2')}</li>
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem' }}>{'\uD83D\uDEE1\uFE0F'} {t('defenseTitle')}</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>{t('defense1')}</li>
            <li dangerouslySetInnerHTML={{ __html: t('defense2') }} />
            <li>{t('defense3')}</li>
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem' }}>{'\u2764\uFE0F'} {t('survivTitle')}</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>{t('surviv1')}</li>
            <li>{t('surviv2')}</li>
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem' }}>{'\u2699\uFE0F'} {t('utilityTitle')}</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>{t('utility1')}</li>
            <li>{t('utility2')}</li>
          </ul>
        </div>
      </div>
    </>
  );
}
