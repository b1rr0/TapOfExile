import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('damage');
  const { t: tc } = useTranslation('common');

  const ELEMENTS = [
    { name: tc('elements.physical'), icon: '\u2694\uFE0F', badge: 'physical', desc: t('physicalDesc') },
    { name: tc('elements.fire'), icon: '\uD83D\uDD25', badge: 'fire', desc: t('fireDesc') },
    { name: tc('elements.lightning'), icon: '\u26A1', badge: 'lightning', desc: t('lightningDesc') },
    { name: tc('elements.cold'), icon: '\u2744\uFE0F', badge: 'cold', desc: t('coldDesc') },
    { name: tc('elements.pure'), icon: '\u2728', badge: 'pure', desc: t('pureDesc') },
  ];

  return (
    <>
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <h2 className="section-title">{t('elemTitle')}</h2>
      <p className="section-subtitle">{t('elemSub')}</p>

      <div className="card-grid cols-3" style={{ marginBottom: '1.5rem' }}>
        {ELEMENTS.map((e) => (
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

      <h2 className="section-title">{t('calcTitle')}</h2>
      <div className="info-box">
        <p>{t('calcDesc')}</p>
      </div>

      <div className="info-box">
        <h4>{t('defaultProfile')}</h4>
        <p dangerouslySetInnerHTML={{ __html: t('defaultProfileDesc') }} />
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('scalingTitle')}</h2>
      <p className="section-subtitle">{t('scalingSub')}</p>

      <div className="info-box">
        <p>{t('scalingDesc')}</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t('scalingVariance')}
        </p>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('resistTitle')}</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDEE1\uFE0F'}</div>
            <div><div className="card-title">{t('playerResist')}</div></div>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
              <li>{t('playerResist1')}</li>
              <li>{t('playerResist2')}</li>
              <li dangerouslySetInnerHTML={{ __html: t('playerResist3', { cap: (B.RESISTANCE_CAP * 100).toFixed(0) }) }} />
              <li>{t('playerResist4')}</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDC79'}</div>
            <div><div className="card-title">{t('monsterResist')}</div></div>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
              <li>{t('monsterResist1')}</li>
              <li>{t('monsterResist2')}</li>
              <li>{t('monsterResist3', { cap: (B.RESISTANCE_CAP * 100).toFixed(0) })}</li>
              <li>{t('monsterResist4')}</li>
            </ul>
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('progressTitle')}</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\u2B50'}</div>
            <div><div className="card-title">{t('levelCap', { max: B.MAX_LEVEL })}</div></div>
          </div>
          <div className="card-body">
            <p>{t('levelCapDesc')}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83C\uDFAF'}</div>
            <div><div className="card-title">{t('critTitle')}</div></div>
          </div>
          <div className="card-body">
            <p dangerouslySetInnerHTML={{ __html: t('critDesc') }} />
          </div>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('activeTitle')}</h2>
      <p className="section-subtitle">{t('activeSub')}</p>

      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>{t('thSkill')}</th>
              <th>{t('thClass')}</th>
              <th>{t('thType')}</th>
              <th>{t('thCooldown')}</th>
              <th>{t('thElement')}</th>
            </tr>
          </thead>
          <tbody>
            {DISPLAY_SKILLS.map((s) => {
              const elem = primaryElement(s.elementalProfile);
              const classLabel = s.classRestriction
                ? s.classRestriction.charAt(0).toUpperCase() + s.classRestriction.slice(1)
                : tc('ui.all');
              return (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{classLabel}</td>
                  <td><span className={`badge badge-${s.skillType === 'damage' ? 'rare' : s.skillType === 'heal' ? 'common' : 'epic'}`}>{s.skillType}</span></td>
                  <td>{(s.cooldownMs / 1000).toFixed(0)}s</td>
                  <td>{elem !== '-' ? <span className={`badge badge-${elem}`}>{elem}</span> : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('timingTitle')}</h2>
      <div className="info-box">
        <p>{t('timingDesc')}</p>
      </div>
    </>
  );
}
