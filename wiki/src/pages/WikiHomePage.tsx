import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WIKI_SECTIONS = [
  { to: '/wiki/characters', icon: '⚔️', key: 'classes', tags: ['Stats', 'Abilities', 'Comparison'] },
  { to: '/wiki/enemies', icon: '👹', key: 'enemies', tags: ['Resistances', 'Rarity', 'Elements'] },
  { to: '/wiki/damage', icon: '💥', key: 'damage', tags: ['Elements', 'Resistances', 'Skills'] },
  { to: '/wiki/plot', icon: '📜', key: 'plot', tags: ['Acts', 'Locations', 'Lore'] },
  { to: '/wiki/maps', icon: '🗺️', key: 'maps', tags: ['Tiers', 'Bosses', 'Keys'] },
  { to: '/wiki/equipment', icon: '⚗️', key: 'equipment', tags: ['Flasks', 'Quality', 'Loot'] },
  { to: '/wiki/skill-tree', icon: '🌳', key: 'skillTree', tags: ['Nodes', 'Keystones', 'Builds'] },
];

export default function WikiHomePage() {
  const { t } = useTranslation('wiki');
  return (
    <div className="wiki-home">
      <div className="wiki-home-header">
        <h1>📖 {t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <div className="wiki-home-grid">
        {WIKI_SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="wiki-home-card" style={{ textDecoration: 'none' }}>
            <div className="wiki-home-card-icon">{s.icon}</div>
            <div className="wiki-home-card-body">
              <h3>{t(`${s.key}Title`)}</h3>
              <p>{t(`${s.key}Desc`)}</p>
              <div className="wiki-home-card-tags">
                {s.tags.map((tag) => (
                  <span key={tag} className="wiki-tag">{tag}</span>
                ))}
              </div>
            </div>
            <span className="wiki-home-card-arrow">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
