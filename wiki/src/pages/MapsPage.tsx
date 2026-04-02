import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAP_TIERS, BOSS_MAPS, BOSS_KEY_TIERS, DROP_SETTINGS } from '@shared/endgame-maps';

export default function MapsPage() {
  const { t } = useTranslation('maps');
  const [tab, setTab] = useState<'tiers' | 'bosses' | 'keys' | 'drops'>('tiers');

  return (
    <>
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle', { tiers: MAP_TIERS.length, bosses: BOSS_MAPS.length })}</p>
      </div>

      <div className="info-box" style={{ marginBottom: '1.5rem' }}>
        <h4>{t('unlockTitle')}</h4>
        <p dangerouslySetInnerHTML={{ __html: t('unlockDesc') }} />
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'tiers' ? 'active' : ''}`} onClick={() => setTab('tiers')}>{t('tabTiers')}</button>
        <button className={`tab-btn ${tab === 'bosses' ? 'active' : ''}`} onClick={() => setTab('bosses')}>{t('tabBosses')}</button>
        <button className={`tab-btn ${tab === 'keys' ? 'active' : ''}`} onClick={() => setTab('keys')}>{t('tabKeys')}</button>
        <button className={`tab-btn ${tab === 'drops' ? 'active' : ''}`} onClick={() => setTab('drops')}>{t('tabDrops')}</button>
      </div>

      {tab === 'tiers' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>{t('thTier')}</th>
                  <th>{t('thQuality')}</th>
                  <th>{t('thHpMult')}</th>
                  <th>{t('thGoldMult')}</th>
                  <th>{t('thXpMult')}</th>
                  <th>{t('thMonsterLvl')}</th>
                </tr>
              </thead>
              <tbody>
                {MAP_TIERS.map((tier) => (
                  <tr key={tier.tier}>
                    <td><strong style={{ color: 'var(--accent-gold)' }}>{tier.name}</strong></td>
                    <td>
                      <span className={`badge badge-${tier.tier <= 3 ? 'common' : tier.tier <= 6 ? 'rare' : tier.tier <= 9 ? 'epic' : 'legendary'}`}>
                        {tier.tier <= 3 ? 'Common' : tier.tier <= 6 ? 'Rare' : tier.tier <= 9 ? 'Epic' : 'Legendary'}
                      </span>
                    </td>
                    <td>{tier.hpMul}x</td>
                    <td>{tier.goldMul}x</td>
                    <td>{tier.xpMul}x</td>
                    <td>{40 + Math.round(tier.tier * 1.2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="info-box" style={{ marginTop: '1rem' }}>
            <p>{t('tiersNote')}</p>
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
                  <div className="card-subtitle">{t('bossType', { type: b.bossType })}</div>
                </div>
              </div>
              <div className="card-body" style={{ marginBottom: '0.75rem' }}>{b.description}</div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
                <span><strong style={{ color: 'var(--accent-fire)' }}>{t('hp')}</strong> {b.hpMul}x</span>
                <span><strong style={{ color: 'var(--accent-gold)' }}>{t('gold')}</strong> {b.goldMul}x</span>
                <span><strong style={{ color: 'var(--accent-primary)' }}>{t('xp')}</strong> {b.xpMul}x</span>
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
                  <th>{t('thBossKeyTier')}</th>
                  <th>{t('thName')}</th>
                  <th>{t('thQuality')}</th>
                  <th>{t('thHpScale')}</th>
                  <th>{t('thGoldScale')}</th>
                  <th>{t('thXpScale')}</th>
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

          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>{t('keySelectionTitle')}</h3>
          <div className="info-box">
            <p>{t('keySelectionDesc')}</p>
          </div>
        </>
      )}

      {tab === 'drops' && (
        <>
          <h3 className="section-title">{t('regularDrops')}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>{t('thDropType')}</th>
                  <th>{t('thChance')}</th>
                  <th>{t('thDetails')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{t('sameTierKey')}</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.regular.sameTierChance * 100).toFixed(0)}%</td>
                  <td>{t('sameTierDetail')}</td>
                </tr>
                <tr>
                  <td><strong>{t('tierUpKey')}</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.regular.tierUpChance * 100).toFixed(0)}%</td>
                  <td>{t('tierUpDetail')}</td>
                </tr>
                <tr>
                  <td><strong>{t('bossKey')}</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.regular.bossKeyChance * 100).toFixed(0)}%</td>
                  <td>{t('bossKeyDetail', { tier: DROP_SETTINGS.regular.bossKeyMinTier })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>{t('bossDrops')}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>{t('thDropType')}</th>
                  <th>{t('thChance')}</th>
                  <th>{t('thDetails')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{t('guaranteedKey')}</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>100%</td>
                  <td>{t('guaranteedDetail', { min: DROP_SETTINGS.boss.guaranteedTierMin, max: DROP_SETTINGS.boss.guaranteedTierMax })}</td>
                </tr>
                <tr>
                  <td><strong>{t('bonusKey')}</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.boss.bonusKeyChance * 100).toFixed(0)}%</td>
                  <td>{t('bonusDetail')}</td>
                </tr>
                <tr>
                  <td><strong>{t('bossKeyAlways')}</strong></td>
                  <td style={{ color: 'var(--accent-gold)' }}>{(DROP_SETTINGS.boss.bossKeyChance * 100).toFixed(0)}%</td>
                  <td>{t('bossKeyAlwaysDetail')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
