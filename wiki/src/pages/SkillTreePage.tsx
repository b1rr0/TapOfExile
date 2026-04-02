import { useTranslation } from 'react-i18next';
import SkillTreeRenderer from '../components/SkillTreeRenderer';

export default function SkillTreePage() {
  const { t } = useTranslation('skillTree');

  return (
    <>
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <h2 className="section-title">{t('interactiveTitle')}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {t('interactiveHint')}
      </p>
      <SkillTreeRenderer height="550px" interactive />

      <h2 className="section-title">{t('nodeTypesTitle')}</h2>
      <div className="card-grid cols-3">
        <div className="card" style={{ borderLeft: '3px solid var(--rarity-common)' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(158,158,158,0.1)' }}>{'\u26AA'}</div>
            <div>
              <div className="card-title">{t('minorTitle')}</div>
              <div className="card-subtitle">{t('minorSub')}</div>
            </div>
          </div>
          <div className="card-body">{t('minorDesc')}</div>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--rarity-rare)' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(79,195,247,0.1)' }}>{'\uD83D\uDD35'}</div>
            <div>
              <div className="card-title">{t('notableTitle')}</div>
              <div className="card-subtitle">{t('notableSub')}</div>
            </div>
          </div>
          <div className="card-body">{t('notableDesc')}</div>
        </div>

        <div className="card" style={{ borderLeft: '3px solid var(--rarity-epic)' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(255,215,64,0.1)' }}>{'\u2B50'}</div>
            <div>
              <div className="card-title">{t('keystoneTitle')}</div>
              <div className="card-subtitle">{t('keystoneSub')}</div>
            </div>
          </div>
          <div className="card-body">{t('keystoneDesc')}</div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('modifiersTitle')}</h2>
      <p className="section-subtitle">{t('modifiersSub')}</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>{t('thStat')}</th>
              <th>{t('thIcon')}</th>
              <th>{t('thModType')}</th>
              <th>{t('thDesc')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{t('dmgName')}</strong></td>
              <td>{'\u2694\uFE0F'}</td>
              <td><span className="badge badge-common">{t('modPercent')}</span></td>
              <td>{t('dmgDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('hpName')}</strong></td>
              <td>{'\u2764\uFE0F'}</td>
              <td><span className="badge badge-rare">{t('modFlatPercent')}</span></td>
              <td>{t('hpDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('critName')}</strong></td>
              <td>{'\uD83D\uDCA5'}</td>
              <td><span className="badge badge-common">{t('modPercent')}</span></td>
              <td>{t('critDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('critMultName')}</strong></td>
              <td>{'\u2716\uFE0F'}</td>
              <td><span className="badge badge-common">{t('modPercent')}</span></td>
              <td>{t('critMultDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('dodgeName')}</strong></td>
              <td>{'\uD83D\uDCA8'}</td>
              <td><span className="badge badge-common">{t('modPercent')}</span></td>
              <td>{t('dodgeDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('fireName')}</strong></td>
              <td>{'\uD83D\uDD25'}</td>
              <td><span className="badge badge-fire">{t('modElemental')}</span></td>
              <td>{t('fireDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('lightningName')}</strong></td>
              <td>{'\u26A1'}</td>
              <td><span className="badge badge-lightning">{t('modElemental')}</span></td>
              <td>{t('lightningDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('coldName')}</strong></td>
              <td>{'\u2744\uFE0F'}</td>
              <td><span className="badge badge-cold">{t('modElemental')}</span></td>
              <td>{t('coldDesc')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('mechanicsTitle')}</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDCB0'}</div>
            <div>
              <div className="card-title">{t('allocTitle')}</div>
            </div>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              <li>{t('alloc1')}</li>
              <li>{t('alloc2')}</li>
              <li>{t('alloc3')}</li>
              <li>{t('alloc4')}</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDD04'}</div>
            <div>
              <div className="card-title">{t('stackTitle')}</div>
            </div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('stackDesc')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
