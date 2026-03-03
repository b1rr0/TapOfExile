import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CharacterModal from '../components/CharacterModal';
import { CLASS_DEFS } from '@shared/class-stats';
import { B } from '@shared/balance';

const API_BASE = '/api';

const CLASS_LIST = Object.values(CLASS_DEFS);
const CLASS_ICONS: Record<string, string> = Object.fromEntries(
  CLASS_LIST.map((c) => [c.id, c.icon])
);

interface LeagueInfo {
  id: string;
  name: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
}

interface DojoEntry {
  rank: number;
  characterId: string;
  nickname: string;
  classId: string;
  skinId: string;
  level: number;
  bestDamage: number;
  telegramUsername: string | null;
}

interface XpEntry {
  rank: number;
  characterId: string;
  nickname: string;
  classId: string;
  skinId: string;
  level: number;
  xp: string;
  telegramUsername: string | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatXp(xp: string | number): string {
  const num = typeof xp === 'string' ? parseInt(xp, 10) : xp;
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function RankCell({ rank }: { rank: number }) {
  const medals = ['', '🥇', '🥈', '🥉'];
  return (
    <td
      style={{
        fontWeight: 700,
        color:
          rank === 1 ? 'var(--accent-gold)' :
          rank === 2 ? '#c0c0c0' :
          rank === 3 ? '#cd7f32' : 'var(--text-secondary)',
        fontSize: rank <= 3 ? '1.1rem' : '0.88rem',
      }}
    >
      {rank <= 3 ? medals[rank] : rank}
    </td>
  );
}

function PlayerCell({ nickname, telegramUsername }: { nickname: string; telegramUsername: string | null }) {
  return (
    <td>
      <strong style={{ color: 'var(--text-heading)' }}>{nickname}</strong>
      {telegramUsername && (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
          @{telegramUsername}
        </span>
      )}
    </td>
  );
}

function ClassCell({ classId }: { classId: string }) {
  return (
    <td>
      <span style={{ marginRight: '0.35rem' }}>{CLASS_ICONS[classId] || ''}</span>
      {classId.charAt(0).toUpperCase() + classId.slice(1)}
    </td>
  );
}

function TableState({ loading, error, empty, t }: { loading: boolean; error: string | null; empty: boolean; t: (key: string) => string }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
        {t('common:ui.loading')}
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent-fire)' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
        {error}
      </div>
    );
  }
  if (empty) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        {t('common:ui.noRecords')}
      </div>
    );
  }
  return null;
}

function LeagueTabs({
  leagues,
  activeLeagueId,
  onChange,
}: {
  leagues: LeagueInfo[];
  activeLeagueId: string | null;
  onChange: (id: string) => void;
}) {
  if (leagues.length === 0) return null;
  return (
    <div className="tab-bar">
      {leagues.map((league) => (
        <button
          key={league.id}
          className={`tab-btn ${activeLeagueId === league.id ? 'active' : ''}`}
          onClick={() => onChange(league.id)}
        >
          {league.type === 'monthly' ? '🏆' : '🛡️'} {league.name}
        </button>
      ))}
    </div>
  );
}

/* ── Class filter bar ────────────────────────────────────── */
function ClassFilter({
  active,
  onChange,
  allLabel,
}: {
  active: string;
  onChange: (id: string) => void;
  allLabel: string;
}) {
  return (
    <div className="champ-class-filter">
      <button
        className={`class-filter-btn ${active === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
      >
        {allLabel}
      </button>
      {CLASS_LIST.map((cls) => (
        <button
          key={cls.id}
          className={`class-filter-btn ${active === cls.id ? 'active' : ''}`}
          onClick={() => onChange(cls.id)}
        >
          {cls.icon} {cls.name}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function ChampionsPage() {
  const { t } = useTranslation('champions');
  const { t: tc } = useTranslation('common');

  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [dojoLeagueId, setDojoLeagueId] = useState<string | null>(null);
  const [xpLeagueId, setXpLeagueId] = useState<string | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(true);

  const [dojoData, setDojoData] = useState<DojoEntry[]>([]);
  const [dojoLoading, setDojoLoading] = useState(false);
  const [dojoError, setDojoError] = useState<string | null>(null);
  const [dojoClassFilter, setDojoClassFilter] = useState<string>('all');

  const [xpData, setXpData] = useState<XpEntry[]>([]);
  const [xpLoading, setXpLoading] = useState(false);
  const [xpError, setXpError] = useState<string | null>(null);
  const [xpClassFilter, setXpClassFilter] = useState<string>('all');

  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  /* ── Fetch leagues ────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/leaderboard/leagues`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const list: LeagueInfo[] = data.leagues || [];
        setLeagues(list);
        const monthly = list.find((l) => l.type === 'monthly');
        const defaultId = monthly?.id || list[0]?.id || null;
        setDojoLeagueId(defaultId);
        setXpLeagueId(defaultId);
      })
      .catch(() => setLeagues([]))
      .finally(() => setLeaguesLoading(false));
  }, []);

  /* ── Fetch dojo ───────────────────────────── */
  useEffect(() => {
    if (leaguesLoading) return;
    setDojoLoading(true);
    setDojoError(null);
    const params = new URLSearchParams({ limit: '50' });
    if (dojoLeagueId) params.set('leagueId', dojoLeagueId);
    fetch(`${API_BASE}/leaderboard/dojo?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setDojoData(d.leaderboard || []))
      .catch((e) => setDojoError(t('failedToLoad', { error: e.message })))
      .finally(() => setDojoLoading(false));
  }, [dojoLeagueId, leaguesLoading, t]);

  /* ── Fetch XP ─────────────────────────────── */
  useEffect(() => {
    if (leaguesLoading) return;
    setXpLoading(true);
    setXpError(null);
    const params = new URLSearchParams({ limit: '50' });
    if (xpLeagueId) params.set('leagueId', xpLeagueId);
    fetch(`${API_BASE}/leaderboard/xp?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setXpData(d.leaderboard || []))
      .catch((e) => setXpError(t('failedToLoad', { error: e.message })))
      .finally(() => setXpLoading(false));
  }, [xpLeagueId, leaguesLoading, t]);

  /* ── Filtered data ────────────────────────── */
  const filteredDojo = dojoClassFilter === 'all'
    ? dojoData
    : dojoData.filter((e) => e.classId === dojoClassFilter);

  const filteredXp = xpClassFilter === 'all'
    ? xpData
    : xpData.filter((e) => e.classId === xpClassFilter);

  return (
    <>
      <div className="page-heading">
        <h1>🏆 {t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      {/* ════════════════════ DOJO ════════════════════ */}
      <h2 className="section-title">🏆 {t('dojoTitle')}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {t('dojoSub', { seconds: B.DOJO_ROUND_MS / 1000 })}
      </p>

      {leaguesLoading ? (
        <TableState loading error={null} empty={false} t={tc} />
      ) : (
        <>
          <LeagueTabs leagues={leagues} activeLeagueId={dojoLeagueId} onChange={setDojoLeagueId} />
          <ClassFilter active={dojoClassFilter} onChange={setDojoClassFilter} allLabel={tc('ui.all')} />
          <TableState loading={dojoLoading} error={dojoError} empty={!dojoLoading && !dojoError && filteredDojo.length === 0} t={tc} />
          {!dojoLoading && !dojoError && filteredDojo.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="wiki-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>{t('thPlayer')}</th>
                    <th>{t('thClass')}</th>
                    <th>{t('thLevel')}</th>
                    <th>{t('thBestDamage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDojo.map((e) => (
                    <tr key={e.characterId} onClick={() => setSelectedCharId(e.characterId)} style={{ cursor: 'pointer' }}>
                      <RankCell rank={e.rank} />
                      <PlayerCell nickname={e.nickname} telegramUsername={e.telegramUsername} />
                      <ClassCell classId={e.classId} />
                      <td style={{ color: 'var(--accent-primary)' }}>{e.level}</td>
                      <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{formatNumber(e.bestDamage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════ DOJO PARAMS ════════════════════ */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('dojoParamsTitle')}</h2>
      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>{tc('table.parameter')}</th>
              <th>{tc('table.value')}</th>
              <th>{tc('table.description')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{t('countdownDuration')}</strong></td>
              <td style={{ color: 'var(--accent-gold)' }}>{t('countdownValue', { seconds: B.DOJO_COUNTDOWN_MS / 1000 })}</td>
              <td>{t('countdownDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('roundDuration')}</strong></td>
              <td style={{ color: 'var(--accent-gold)' }}>{t('roundValue', { seconds: B.DOJO_ROUND_MS / 1000 })}</td>
              <td>{t('roundDesc')}</td>
            </tr>
            <tr>
              <td><strong>{t('scoring')}</strong></td>
              <td style={{ color: 'var(--accent-gold)' }}>{t('scoringValue')}</td>
              <td>{t('scoringDesc')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ════════════════════ XP LEADERBOARD ════════════════════ */}
      <h2 className="section-title" style={{ marginTop: '3rem' }}>⭐ {t('xpTitle')}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {t('xpSub')}
      </p>

      {leaguesLoading ? (
        <TableState loading error={null} empty={false} t={tc} />
      ) : (
        <>
          <LeagueTabs leagues={leagues} activeLeagueId={xpLeagueId} onChange={setXpLeagueId} />
          <ClassFilter active={xpClassFilter} onChange={setXpClassFilter} allLabel={tc('ui.all')} />
          <TableState loading={xpLoading} error={xpError} empty={!xpLoading && !xpError && filteredXp.length === 0} t={tc} />
          {!xpLoading && !xpError && filteredXp.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="wiki-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>{t('thPlayer')}</th>
                    <th>{t('thClass')}</th>
                    <th>{t('thLevel')}</th>
                    <th>{t('thTotalXP')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredXp.map((e) => (
                    <tr key={e.characterId} onClick={() => setSelectedCharId(e.characterId)} style={{ cursor: 'pointer' }}>
                      <RankCell rank={e.rank} />
                      <PlayerCell nickname={e.nickname} telegramUsername={e.telegramUsername} />
                      <ClassCell classId={e.classId} />
                      <td style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{e.level}</td>
                      <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{formatXp(e.xp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedCharId && (
        <CharacterModal
          characterId={selectedCharId}
          onClose={() => setSelectedCharId(null)}
        />
      )}
    </>
  );
}
