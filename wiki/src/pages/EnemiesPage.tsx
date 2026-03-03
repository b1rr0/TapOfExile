import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMY_DEFS } from '@shared/enemies';
import { B, RARITY_DEFS } from '@shared/balance';

export default function EnemiesPage() {
  const { t } = useTranslation('enemies');
  const [tab, setTab] = useState<'types' | 'rarities'>('types');

  return (
    <>
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle', { count: ENEMY_DEFS.length })}</p>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'types' ? 'active' : ''}`} onClick={() => setTab('types')}>
          {t('tabTypes')}
        </button>
        <button className={`tab-btn ${tab === 'rarities' ? 'active' : ''}`} onClick={() => setTab('rarities')}>
          {t('tabRarities')}
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
                  <div className="card-subtitle">{t('firstAppears', { stage: m.minStage })}</div>
                </div>
              </div>
              <div className="card-body" style={{ marginBottom: '0.75rem' }}>{m.description}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('resistance')}</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {m.resistance.split(' + ').map((r) => (
                      <span key={r} className={`badge badge-${r.toLowerCase()}`} style={{ marginRight: '0.25rem' }}>{r}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('damageType')}</span>
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
                  <th>{t('thRarity')}</th>
                  <th>{t('thHpMult')}</th>
                  <th>{t('thGoldMult')}</th>
                  <th>{t('thXpMult')}</th>
                  <th>{t('thDmgMult')}</th>
                  <th>{t('thResistBonus')}</th>
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
            <h4>{t('resistCapTitle')}</h4>
            <p dangerouslySetInnerHTML={{ __html: t('resistCapDesc', { cap: (B.RESISTANCE_CAP * 100).toFixed(0), bonus: (B.RARITY_RESISTANCE_BONUS.boss * 100).toFixed(0) }) }} />
          </div>
        </>
      )}

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('attacksTitle')}</h2>
      <p className="section-subtitle">{t('attacksSub')}</p>
      <div className="info-box">
        <p>{t('attacksDesc')}</p>
      </div>
    </>
  );
}
