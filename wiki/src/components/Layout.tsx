import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="header-logo" onClick={() => setMenuOpen(false)}>
            <span className="logo-icon">&#9876;&#65039;</span>
            <span>Tap of Exile</span>
          </NavLink>

          <nav className="header-nav" data-open={menuOpen}>
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/champions" onClick={() => setMenuOpen(false)}>
              &#127942; Champions
            </NavLink>
            <NavLink to="/trade" onClick={() => setMenuOpen(false)}>
              &#128176; Trade
            </NavLink>
            <NavLink
              to="/wiki"
              className={({ isActive }) =>
                isActive || window.location.pathname.startsWith('/wiki') ? 'active' : ''
              }
              onClick={() => setMenuOpen(false)}
            >
              &#128214; Wiki
            </NavLink>
            <a
              href="https://t.me/Tap_Of_Exile_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-cta"
              onClick={() => setMenuOpen(false)}
            >
              &#9992;&#65039; Play
            </a>
            <a
              href="https://discord.gg/mgCNqp9q"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-discord"
              onClick={() => setMenuOpen(false)}
            >
              &#128172; Discord
            </a>
          </nav>

          <button
            className="header-burger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <Link to="/" className="footer-logo">
            <span>&#9876;&#65039;</span> Tap of Exile
          </Link>
          <div className="footer-links">
            <a href="https://discord.gg/mgCNqp9q" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://t.me/Tap_Of_Exile_Bot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            <Link to="/wiki">Wiki</Link>
            <Link to="/champions">Champions</Link>
          </div>
          <p className="footer-copy">&copy; EKNM, underground since 201X</p>
        </div>
      </footer>
    </div>
  );
}
