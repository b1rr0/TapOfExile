import { NavLink, Outlet } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/characters', label: 'Characters' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/enemies', label: 'Enemies' },
  { to: '/champions', label: 'Champions' },
  { to: '/skill-tree', label: 'Skill Tree' },
  { to: '/damage', label: 'Damage & Formulas' },
  { to: '/plot', label: 'Plot' },
  { to: '/maps', label: 'Maps' },
  { to: '/trade', label: 'Trade' },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="header-logo">
            <span className="logo-icon">&#9876;&#65039;</span>
            <span>Tap of Exile Wiki</span>
          </NavLink>

          <nav className="header-nav">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-links">
          <a href="https://discord.gg/mgCNqp9q" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://t.me/Tap_Of_Exile_Bot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
        </div>
        <p>&copy; EKNM, underground since 201X</p>
      </footer>
    </div>
  );
}
