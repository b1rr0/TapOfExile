import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, type Lang } from '../i18n/i18n';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation('common');

  const switchLang = (lng: Lang) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('toe-lang', lng);
  };

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
              {t('nav.home')}
            </NavLink>
            <NavLink to="/champions" onClick={() => setMenuOpen(false)}>
              &#127942; {t('nav.champions')}
            </NavLink>
            <NavLink to="/trade" onClick={() => setMenuOpen(false)}>
              &#128176; {t('nav.trade')}
            </NavLink>
            <NavLink
              to="/wiki"
              className={({ isActive }) =>
                isActive || window.location.pathname.startsWith('/wiki') ? 'active' : ''
              }
              onClick={() => setMenuOpen(false)}
            >
              &#128214; {t('nav.wiki')}
            </NavLink>
            <a
              href="https://t.me/Tap_Of_Exile_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-cta"
              onClick={() => setMenuOpen(false)}
            >
              &#9992;&#65039; {t('nav.play')}
            </a>
            <a
              href="https://discord.gg/mgCNqp9q"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-discord"
              onClick={() => setMenuOpen(false)}
            >
              &#128172; {t('nav.discord')}
            </a>
          </nav>

          {/* Language switcher */}
          <div className="lang-switcher">
            {SUPPORTED_LANGS.map((lng) => (
              <button
                key={lng}
                className={`lang-btn${i18n.language === lng ? ' active' : ''}`}
                onClick={() => switchLang(lng)}
              >
                {t(`lang.${lng}`)}
              </button>
            ))}
          </div>

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
            <a href="https://discord.gg/mgCNqp9q" target="_blank" rel="noopener noreferrer">{t('nav.discord')}</a>
            <a href="https://t.me/Tap_Of_Exile_Bot" target="_blank" rel="noopener noreferrer">{t('nav.telegramBot')}</a>
            <Link to="/wiki">{t('nav.wiki')}</Link>
            <Link to="/champions">{t('nav.champions')}</Link>
          </div>
          <p className="footer-copy">{t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
