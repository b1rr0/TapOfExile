import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WIKI_LINKS = [
  { to: '/wiki', icon: '🏠', key: 'overview', end: true },
  { to: '/wiki/characters', icon: '⚔️', key: 'classes' },
  { to: '/wiki/enemies', icon: '👹', key: 'enemies' },
  { to: '/wiki/equipment', icon: '🧪', key: 'equipment' },
  { to: '/wiki/skill-tree', icon: '🌳', key: 'skillTree' },
  { to: '/wiki/damage', icon: '💥', key: 'damage' },
  { to: '/wiki/plot', icon: '📖', key: 'plot' },
  { to: '/wiki/maps', icon: '🗺️', key: 'maps' },
];

export default function WikiLayout() {
  const { t } = useTranslation('common');
  return (
    <div className="wiki-section">
      <div className="wiki-subnav">
        <div className="wiki-subnav-inner">
          {WIKI_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {link.icon} {t(`wikiNav.${link.key}`)}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="wiki-content">
        <Outlet />
      </div>
    </div>
  );
}
