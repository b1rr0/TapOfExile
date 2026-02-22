import { useState, useEffect } from 'react';
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

function formatLeagueEnd(endsAt: string | null): string {
  if (!endsAt) return 'Permanent';
  const d = new Date(endsAt);
  return `Ends ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/* ── HOW TO PLAY steps ───────────────────────────────────── */
const HOW_TO_PLAY = [
  {
    step: '01',
    icon: '📱',
    title: 'Open Telegram',
    desc: 'Find @Tap_Of_Exile_Bot in Telegram and press Start. No download needed — runs right in Telegram.',
  },
  {
    step: '02',
    icon: '⚔️',
    title: 'Pick Your Class',
    desc: 'Choose from Warrior, Samurai, Mage, or Archer — each with unique abilities, resistances, and playstyle.',
  },
  {
    step: '03',
    icon: '🗡️',
    title: 'Fight & Grow',
    desc: 'Tap to deal damage, collect loot, allocate passive nodes, and conquer 5 acts and 10 endgame map tiers.',
  },
];

/* ── LEAGUE INFO cards ───────────────────────────────────── */
const LEAGUE_INFO: Record<string, { title: string; desc: string; features: string[] }> = {
  standard: {
    title: 'Standard League',
    desc: 'The permanent league. Progress never resets — grow your character indefinitely and explore all content at your own pace.',
    features: ['No time pressure', 'Permanent character progress', 'Open to all players anytime'],
  },
  monthly: {
    title: 'Monthly League',
    desc: 'A competitive fresh-start league that resets each month. Climb the leaderboard and fight for seasonal rewards.',
    features: ['Monthly fresh start', 'Seasonal leaderboard prizes', 'Competitive environment'],
  },
};

/* ── GAME FEATURES preview ───────────────────────────────── */
const GAME_FEATURES = [
  { icon: '🗡️', title: '4 Unique Classes', desc: 'Warrior, Samurai, Mage, Archer — each with distinct stats, abilities, and skill tree paths.' },
  { icon: '🌍', title: '5 Acts, 50 Locations', desc: 'From the Castle to The Depths. Fight through 50 unique locations with escalating challenges.' },
  { icon: '🗺️', title: 'Endgame Maps', desc: '10-tier map system with 8 unique boss encounters. Three levels of boss keys for ultimate challenge.' },
  { icon: '🌳', title: '200+ Passive Nodes', desc: 'Build your character exactly how you want with a massive passive skill tree.' },
  { icon: '⚗️', title: 'Loot System', desc: '6 flask types, 4 quality tiers. Every kill has a chance to drop something useful.' },
  { icon: '🏆', title: 'Live Leaderboards', desc: 'Compete in Dojo damage challenges and XP rankings. Rise to become a Champion.' },
];

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function LandingPage() {
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

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="landing-page">

      {/* ════════════ HERO ════════════ */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">Telegram Mini-App RPG</div>
          <h1 className="landing-hero-title">
            ⚔️ Tap of Exile
          </h1>
          <p className="landing-hero-sub">
            Idle tactical RPG. Choose your class, build your skill tree,<br />
            battle through 5 acts and conquer the endgame.
          </p>

          <div className="landing-hero-actions">
            <a
              href="https://t.me/Tap_Of_Exile_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta"
            >
              🎮 Play on Telegram
            </a>
            <a
              href="https://discord.gg/mgCNqp9q"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              💬 Join Discord
            </a>
          </div>

          {/* Live online count */}
          <div className="landing-online-pill">
            <span className="online-dot" />
            {onlineLoading ? (
              <span>Checking…</span>
            ) : (
              <span>
                <strong>{formatNumber(totalOnline ?? 0)}</strong> players online right now
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
          <h2>🎮 How to Play</h2>
          <p>Get started in three simple steps — no download, no install.</p>
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
          <h2>🛡️ Choose Your League</h2>
          <p>Two leagues, two experiences. Pick your battlefield.</p>
        </div>

        <div className="landing-leagues-grid">
          {onlineLoading ? (
            <div className="landing-loading">Loading leagues…</div>
          ) : leagues.length === 0 ? (
            /* Fallback static cards when server is offline */
            <>
              {Object.entries(LEAGUE_INFO).map(([type, info]) => (
                <div key={type} className={`league-card league-card--${type}`}>
                  <div className="league-card-header">
                    <span className="league-badge">{type === 'monthly' ? '🏆' : '🛡️'}</span>
                    <h3>{info.title}</h3>
                    <span className="league-status league-status--offline">Offline</span>
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
                desc: 'Active league.',
                features: [],
              };
              const isMonthly = league.type === 'monthly';
              return (
                <div
                  key={league.id}
                  className={`league-card league-card--${league.type}`}
                >
                  <div className="league-card-header">
                    <span className="league-badge">{isMonthly ? '🏆' : '🛡️'}</span>
                    <h3>{league.name}</h3>
                    <div className="league-online">
                      <span className="online-dot" />
                      <span>{league.online} online</span>
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
          <h2>🗡️ What Awaits You</h2>
          <p>Dozens of hours of content, deep mechanics, endless builds.</p>
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
          <h2>🌐 Join the Community</h2>
          <p>Chat with other players, share builds, report bugs, and stay up to date.</p>
          <div className="community-links">
            <a
              href="https://t.me/Tap_Of_Exile_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="community-btn community-btn--telegram"
            >
              ✈️ Telegram Bot
            </a>
            <a
              href="https://discord.gg/mgCNqp9q"
              target="_blank"
              rel="noopener noreferrer"
              className="community-btn community-btn--discord"
            >
              💬 Discord Server
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
