import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = '/api';

/* ── Types ──────────────────────────────────────────────────────── */

type ItemType = 'potion' | 'map_key' | 'boss_key' | 'equipment';
type Quality = 'common' | 'rare' | 'epic' | 'legendary';
type SortKey = 'price_asc' | 'price_desc' | 'newest' | 'quality';

interface TradeListing {
  id: string;
  sellerName: string | null;
  itemName: string;
  itemType: ItemType;
  itemQuality: Quality;
  itemLevel: number | null;
  itemTier: number | null;
  itemIcon: string | null;
  itemSubtype: string | null;
  itemSnapshot: Record<string, unknown>;
  price: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface BrowseResponse {
  listings: TradeListing[];
  total: number;
}

interface StatsResponse {
  activeListings: number;
  soldLast24h: number;
  volumeLast24h: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const CATEGORY_ICONS: Record<ItemType, string> = {
  potion: '\uD83E\uDDEA',
  map_key: '\uD83D\uDDFA\uFE0F',
  boss_key: '\uD83D\uDC80',
  equipment: '\u2694\uFE0F',
};

function formatGold(n: number | string) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/* ── Tabs ───────────────────────────────────────────────────────── */

type Tab = 'market' | 'prices' | 'how';

const PAGE_SIZE = 20;

/* ── Component ─────────────────────────────────────────────────── */

export default function TradePage() {
  const { t } = useTranslation('trade');
  const { t: tc } = useTranslation('common');
  const [tab, setTab] = useState<Tab>('market');

  /* Filters */
  const [catFilter, setCatFilter] = useState<ItemType | 'all'>('all');
  const [qualFilter, setQualFilter] = useState<Quality | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(0);

  /* Data */
  const [listings, setListings] = useState<TradeListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Stats */
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const CATEGORY_LABELS: Record<ItemType, string> = {
    potion: t('catPotions'),
    map_key: t('catMapKeys'),
    boss_key: t('catBossKeys'),
    equipment: t('catEquipment'),
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'market', label: t('tabMarket'), icon: '\uD83D\uDCCA' },
    { key: 'prices', label: t('tabPrices'), icon: '\uD83D\uDCB0' },
    { key: 'how', label: t('tabHow'), icon: '\uD83D\uDCD6' },
  ];

  /* ── Fetch stats ─────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/trade/stats`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to load stats')))
      .then((data: StatsResponse) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  /* ── Fetch listings ──────────────────────────────── */
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (catFilter !== 'all') params.set('itemType', catFilter);
    if (qualFilter !== 'all') params.set('quality', qualFilter);
    if (search.trim()) params.set('search', search.trim());
    params.set('sort', sort);
    params.set('offset', String(page * PAGE_SIZE));
    params.set('limit', String(PAGE_SIZE));

    const qs = params.toString();
    try {
      const res = await fetch(`${API_BASE}/trade/browse${qs ? '?' + qs : ''}`);
      if (!res.ok) throw new Error('Failed to load listings');
      const data: BrowseResponse = await res.json();
      setListings(data.listings);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [catFilter, qualFilter, search, sort, page]);

  useEffect(() => {
    if (tab === 'market') fetchListings();
  }, [tab, fetchListings]);

  /* Reset page on filter change */
  useEffect(() => { setPage(0); }, [catFilter, qualFilter, search, sort]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      {/* ── Live stats strip ───────────────────────────────── */}
      <div className="trade-stats-strip">
        <div className="trade-stat">
          <span className="trade-stat__label">{t('statListings')}</span>
          <span className="trade-stat__value">
            {stats ? formatGold(stats.activeListings) : '—'}
          </span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">{t('statTrades')}</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-cyan)' }}>
            {stats ? formatGold(stats.soldLast24h) : '—'}
          </span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">{t('statVolume')}</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-gold-bright)' }}>
            {stats ? formatGold(stats.volumeLast24h) : '—'}
          </span>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="tab-bar">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            className={`tab-btn${tab === tabItem.key ? ' active' : ''}`}
            onClick={() => setTab(tabItem.key)}
          >
            {tabItem.icon} {tabItem.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Market Listings ═══ */}
      {tab === 'market' && (
        <>
          {/* ── Filters ───────────────────────────────────────── */}
          <div className="trade-filters">
            <input
              className="trade-search"
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="trade-filter-group">
              <label className="trade-filter-label">{t('filterCategory')}</label>
              <select
                className="trade-select"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value as ItemType | 'all')}
              >
                <option value="all">{tc('ui.all')}</option>
                {(Object.keys(CATEGORY_LABELS) as ItemType[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="trade-filter-group">
              <label className="trade-filter-label">{t('filterQuality')}</label>
              <select
                className="trade-select"
                value={qualFilter}
                onChange={(e) => setQualFilter(e.target.value as Quality | 'all')}
              >
                <option value="all">{tc('ui.all')}</option>
                {(['common', 'rare', 'epic', 'legendary'] as Quality[]).map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="trade-filter-group">
              <label className="trade-filter-label">{t('filterSort')}</label>
              <select
                className="trade-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {([
                  ['newest', t('sortNewest')],
                  ['price_asc', t('sortPriceAsc')],
                  ['price_desc', t('sortPriceDesc')],
                  ['quality', t('sortQuality')],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Loading / Error ─────────────────────────────────── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              {t('loadingListings')}
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ds-crimson-bright)' }}>
              {error}
            </div>
          )}

          {/* ── Listings table ─────────────────────────────────── */}
          {!loading && !error && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="wiki-table trade-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}></th>
                      <th>{t('thItem')}</th>
                      <th>{t('thQuality')}</th>
                      <th>{t('thPrice')}</th>
                      <th>{t('thSeller')}</th>
                      <th style={{ width: 60 }}>{t('thListed')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          {t('noListings')}
                        </td>
                      </tr>
                    )}
                    {listings.map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>
                          {CATEGORY_ICONS[l.itemType] ?? '\uD83D\uDCE6'}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-heading)' }}>{l.itemName}</strong>
                          {l.itemTier != null && (
                            <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              T{l.itemTier}
                            </span>
                          )}
                          {l.itemSubtype && (
                            <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {l.itemSubtype}
                            </span>
                          )}
                        </td>
                        <td><span className={`badge badge-${l.itemQuality}`}>{l.itemQuality}</span></td>
                        <td style={{ color: 'var(--ds-gold-bright)', fontWeight: 700 }}>
                          {formatGold(l.price)}
                        </td>
                        <td style={{ color: 'var(--ds-cyan-mid)' }}>
                          {l.sellerName ?? t('unknown')}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {timeAgo(l.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ──────────────────────────────────── */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '1.5rem 0' }}>
                  <button
                    className="trade-chip"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    {tc('ui.prev')}
                  </button>
                  <span style={{ padding: '0.4rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {tc('ui.page', { current: page + 1, total: totalPages, count: total })}
                  </span>
                  <button
                    className="trade-chip"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {tc('ui.next')}
                  </button>
                </div>
              )}

              <div className="info-box" style={{ textAlign: 'center', marginTop: '1rem' }}>
                {t('buyHint')}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ TAB: Price Watch ═══ */}
      {tab === 'prices' && (
        <>
          <p className="section-subtitle">{t('priceWatchSub')}</p>
          <div className="info-box" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <h4>{t('priceWatchTitle')}</h4>
            <p style={{ color: 'var(--text-muted)' }}>{t('priceWatchSoon')}</p>
          </div>
        </>
      )}

      {/* ═══ TAB: How It Works ═══ */}
      {tab === 'how' && (
        <>
          <h2 className="section-title">{t('tradingSystem')}</h2>
          <p className="section-subtitle">{t('tradingSystemSub')}</p>

          <div className="card-grid cols-2">
            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83D\uDCE4'}</div>
                <div><div className="card-title">{t('step1Title')}</div></div>
              </div>
              <div className="card-body">{t('step1Desc')}</div>
            </div>
            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83D\uDD0D'}</div>
                <div><div className="card-title">{t('step2Title')}</div></div>
              </div>
              <div className="card-body">{t('step2Desc')}</div>
            </div>
            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83E\uDD1D'}</div>
                <div><div className="card-title">{t('step3Title')}</div></div>
              </div>
              <div className="card-body">{t('step3Desc')}</div>
            </div>
            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83D\uDD10'}</div>
                <div><div className="card-title">{t('step4Title')}</div></div>
              </div>
              <div className="card-body">{t('step4Desc')}</div>
            </div>
          </div>

          <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('tradableTitle')}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>{t('thCategory')}</th>
                  <th>{t('thItems')}</th>
                  <th>{t('thQualities')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83E\uDDEA'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>{t('catPotions')}</strong></td>
                  <td>{t('potionItems')}</td>
                  <td>
                    <span className="badge badge-common">common</span>{' '}
                    <span className="badge badge-rare">rare</span>{' '}
                    <span className="badge badge-epic">epic</span>{' '}
                    <span className="badge badge-legendary">legendary</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83D\uDDFA\uFE0F'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>{t('catMapKeys')}</strong></td>
                  <td>{t('mapKeyItems')}</td>
                  <td>
                    <span className="badge badge-common">T1-3</span>{' '}
                    <span className="badge badge-rare">T4-6</span>{' '}
                    <span className="badge badge-epic">T7-9</span>{' '}
                    <span className="badge badge-legendary">T10</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83D\uDC80'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>{t('catBossKeys')}</strong></td>
                  <td>{t('bossKeyItems')}</td>
                  <td>
                    <span className="badge badge-common">Standard</span>{' '}
                    <span className="badge badge-epic">Empowered</span>{' '}
                    <span className="badge badge-boss">Mythic</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\u2694\uFE0F'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>{t('catEquipment')}</strong></td>
                  <td>{t('equipmentItems')}</td>
                  <td>
                    <span className="badge badge-common">common</span>{' '}
                    <span className="badge badge-rare">rare</span>{' '}
                    <span className="badge badge-epic">epic</span>{' '}
                    <span className="badge badge-legendary">legendary</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="info-box" style={{ marginTop: '1.5rem' }}>
            <h4>{t('rulesTitle')}</h4>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li dangerouslySetInnerHTML={{ __html: t('rule1') }} />
              <li dangerouslySetInnerHTML={{ __html: t('rule2') }} />
              <li dangerouslySetInnerHTML={{ __html: t('rule3') }} />
              <li dangerouslySetInnerHTML={{ __html: t('rule4') }} />
              <li>{t('rule5')}</li>
              <li>{t('rule6')}</li>
              <li>{t('rule7')}</li>
            </ul>
          </div>

          <div className="info-box" style={{ marginTop: '1.5rem' }}>
            <h4>{t('commissionTitle')}</h4>
            <p dangerouslySetInnerHTML={{ __html: t('commissionDesc') }} />
          </div>
        </>
      )}
    </>
  );
}
