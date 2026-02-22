import { NavLink, Outlet } from 'react-router-dom';

const WIKI_LINKS = [
  { to: '/wiki', label: '&#127968; Overview', end: true },
  { to: '/wiki/characters', label: '&#9876;&#65039; Classes' },
  { to: '/wiki/enemies', label: '&#128121; Enemies' },
  { to: '/wiki/equipment', label: '&#129514; Equipment' },
  { to: '/wiki/skill-tree', label: '&#127795; Skill Tree' },
  { to: '/wiki/damage', label: '&#128163; Damage' },
  { to: '/wiki/plot', label: '&#128214; Plot' },
  { to: '/wiki/maps', label: '&#128506;&#65039; Maps' },
];

export default function WikiLayout() {
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
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          ))}
        </div>
      </div>
      <div className="wiki-content">
        <Outlet />
      </div>
    </div>
  );
}
