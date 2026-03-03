import { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import BattleMockup from '../components/BattleMockup';

const API_BASE = '/api';

/* ── Types ──────────────────────────────────────────────── */
interface LeagueOnline {
  id: string;
  name: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  online: number;
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { t } = useTranslation('home');

  /* Online data */
  const [leagues, setLeagues] = useState<LeagueOnline[]>([]);
  const [totalOnline, setTotalOnline] = useState<number | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(true);

  /* ── Fetch online counts ─────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/leaderboard/online`)
      .then((r) => r.json())
      .then((data) => {
        setLeagues(data.leagues || []);
        setTotalOnline(data.totalOnline ?? 0);
      })
      .catch(() => {
        setTotalOnline(0);
      })
      .finally(() => setOnlineLoading(false));
  }, []);

  /* ── Translated data arrays ─────────────────────────── */
  const HOW_TO_PLAY = [
    { step: '01', icon: '📱', title: t('step01Title'), desc: t('step01Desc') },
    { step: '02', icon: '⚔️', title: t('step02Title'), desc: t('step02Desc') },
    { step: '03', icon: '🗡️', title: t('step03Title'), desc: t('step03Desc') },
  ];

  const LEAGUE_INFO: Record<string, { title: string; desc: string; features: string[] }> = {
    standard: {
      title: t('standardTitle'),
      desc: t('standardDesc'),
      features: [t('standardFeature1'), t('standardFeature2'), t('standardFeature3')],
    },
    monthly: {
      title: t('monthlyTitle'),
      desc: t('monthlyDesc'),
      features: [t('monthlyFeature1'), t('monthlyFeature2'), t('monthlyFeature3')],
    },
  };

  const GAME_FEATURES = [
    { icon: '🗡️', title: t('feat1Title'), desc: t('feat1Desc') },
    { icon: '🌍', title: t('feat2Title'), desc: t('feat2Desc') },
    { icon: '🗺️', title: t('feat3Title'), desc: t('feat3Desc') },
    { icon: '🌳', title: t('feat4Title'), desc: t('feat4Desc') },
    { icon: '⚗️', title: t('feat5Title'), desc: t('feat5Desc') },
    { icon: '🏆', title: t('feat6Title'), desc: t('feat6Desc') },
  ];

  function formatLeagueEnd(endsAt: string | null): string {
    if (!endsAt) return t('permanent');
    const d = new Date(endsAt);
    return t('endsAt', { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="landing-page">

      {/* ════════════ HERO ════════════ */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">{t('badge')}</div>
          <h1 className="landing-hero-title">
            ⚔️ {t('title')}
          </h1>
          <p className="landing-hero-sub">
            {t('subtitle')}
          </p>

          <div className="landing-hero-actions">
            <a
              href="https://t.me/Tap_Of_Exile_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta"
            >
              🎮 {t('playBtn')}
            </a>
            <a
              href="https://discord.gg/mgCNqp9q"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              💬 {t('discordBtn')}
            </a>
          </div>

          {/* Live online count */}
          <div className="landing-online-pill">
            <span className="online-dot" />
            {onlineLoading ? (
              <span>{t('checking')}</span>
            ) : (
              <span>
                <Trans i18nKey="playersOnline" ns="home" values={{ count: formatNumber(totalOnline ?? 0) }}>
                  <strong>{'{{count}}'}</strong> players online right now
                </Trans>
              </span>
            )}
          </div>
        </div>

        {/* Animated background decoration */}
        <div className="landing-hero-deco" aria-hidden>
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
      </section>

      {/* ════════════ HOW TO PLAY ════════════ */}
      <section className="landing-section landing-section--dark">
        <div className="landing-section-header">
          <h2>🎮 {t('howToPlay')}</h2>
          <p>{t('howToPlaySub')}</p>
        </div>

        <div className="landing-steps">
          {HOW_TO_PLAY.map((s) => (
            <div key={s.step} className="step-card">
              <div className="step-number">{s.step}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ LEAGUES ════════════ */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2>🛡️ {t('chooseLeague')}</h2>
          <p>{t('chooseLeagueSub')}</p>
        </div>

        <div className="landing-leagues-grid">
          {onlineLoading ? (
            <div className="landing-loading">{t('loadingLeagues')}</div>
          ) : leagues.length === 0 ? (
            <>
              {Object.entries(LEAGUE_INFO).map(([type, info]) => (
                <div key={type} className={`league-card league-card--${type}`}>
                  <div className="league-card-header">
                    <span className="league-badge">{type === 'monthly' ? '🏆' : '🛡️'}</span>
                    <h3>{info.title}</h3>
                    <span className="league-status league-status--offline">{t('offline')}</span>
                  </div>
                  <p className="league-desc">{info.desc}</p>
                  <ul className="league-features">
                    {info.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            leagues.map((league) => {
              const info = LEAGUE_INFO[league.type] || {
                title: league.name,
                desc: t('activeLeague'),
                features: [],
              };
              const isMonthly = league.type === 'monthly';
              return (
                <div key={league.id} className={`league-card league-card--${league.type}`}>
                  <div className="league-card-header">
                    <span className="league-badge">{isMonthly ? '🏆' : '🛡️'}</span>
                    <h3>{league.name}</h3>
                    <div className="league-online">
                      <span className="online-dot" />
                      <span>{t('online', { count: league.online })}</span>
                    </div>
                  </div>
                  <p className="league-end-date">{formatLeagueEnd(league.endsAt)}</p>
                  <p className="league-desc">{info.desc}</p>
                  <ul className="league-features">
                    {info.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ════════════ GAME FEATURES ════════════ */}
      <section className="landing-section landing-section--dark">
        <div className="landing-section-header">
          <h2>🗡️ {t('whatAwaits')}</h2>
          <p>{t('whatAwaitsSub')}</p>
        </div>
        <div className="landing-features-grid">
          {GAME_FEATURES.map((f) => (
            <div key={f.title} className="feature-pill">
              <span className="feature-pill-icon">{f.icon}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ BATTLE MOCKUP ════════════ */}
      <section className="landing-section">
        <BattleMockup />
      </section>

      {/* ════════════ COMMUNITY ════════════ */}
      <section className="landing-section landing-section--dark">
        <div className="landing-community">
          <h2>🌐 {t('community')}</h2>
          <p>{t('communitySub')}</p>
          <div className="community-links">
            <a
              href="https://t.me/Tap_Of_Exile_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="community-btn community-btn--telegram"
            >
              ✈️ {t('telegramBtn')}
            </a>
            <a
              href="https://discord.gg/mgCNqp9q"
              target="_blank"
              rel="noopener noreferrer"
              className="community-btn community-btn--discord"
            >
              💬 {t('discordServerBtn')}
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
