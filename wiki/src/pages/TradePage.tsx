import { useState, useEffect, useCallback } from 'react';

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

const CATEGORY_LABELS: Record<ItemType, string> = {
  potion: 'Potions',
  map_key: 'Map Keys',
  boss_key: 'Boss Keys',
  equipment: 'Equipment',
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

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'market', label: 'Market',       icon: '\uD83D\uDCCA' },
  { key: 'prices', label: 'Price Watch',  icon: '\uD83D\uDCB0' },
  { key: 'how',    label: 'How It Works', icon: '\uD83D\uDCD6' },
];

const PAGE_SIZE = 20;

/* ── Component ─────────────────────────────────────────────────── */

export default function TradePage() {
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
        <h1>Trade Market</h1>
        <p>Browse potions, map keys, boss keys, and equipment listed by other players.</p>
      </div>

      {/* ── Live stats strip ───────────────────────────────── */}
      <div className="trade-stats-strip">
        <div className="trade-stat">
          <span className="trade-stat__label">Listings</span>
          <span className="trade-stat__value">
            {stats ? formatGold(stats.activeListings) : '—'}
          </span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">Trades (24h)</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-cyan)' }}>
            {stats ? formatGold(stats.soldLast24h) : '—'}
          </span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">Gold Volume</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-gold-bright)' }}>
            {stats ? formatGold(stats.volumeLast24h) : '—'}
          </span>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
           TAB: Market Listings
         ═══════════════════════════════════════════════════════ */}
      {tab === 'market' && (
        <>
          {/* ── Filters ───────────────────────────────────────── */}
          <div className="trade-filters">
            <input
              className="trade-search"
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="trade-filter-group">
              <label className="trade-filter-label">Category</label>
              <div className="trade-filter-chips">
                <button className={`trade-chip${catFilter === 'all' ? ' active' : ''}`} onClick={() => setCatFilter('all')}>All</button>
                {(Object.keys(CATEGORY_LABELS) as ItemType[]).map((c) => (
                  <button key={c} className={`trade-chip${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>
                    {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="trade-filter-group">
              <label className="trade-filter-label">Quality</label>
              <div className="trade-filter-chips">
                <button className={`trade-chip${qualFilter === 'all' ? ' active' : ''}`} onClick={() => setQualFilter('all')}>All</button>
                {(['common', 'rare', 'epic', 'legendary'] as Quality[]).map((q) => (
                  <button key={q} className={`trade-chip trade-chip--${q}${qualFilter === q ? ' active' : ''}`} onClick={() => setQualFilter(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="trade-filter-group">
              <label className="trade-filter-label">Sort</label>
              <div className="trade-filter-chips">
                {([
                  ['newest',     'Newest'],
                  ['price_asc',  'Price \u2191'],
                  ['price_desc', 'Price \u2193'],
                  ['quality',    'Quality'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} className={`trade-chip${sort === key ? ' active' : ''}`} onClick={() => setSort(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Loading / Error ─────────────────────────────────── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading listings...
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
                      <th>Item</th>
                      <th>Quality</th>
                      <th>Price</th>
                      <th>Seller</th>
                      <th style={{ width: 60 }}>Listed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No listings match your filters.
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
                          {l.sellerName ?? 'Unknown'}
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
                    &laquo; Prev
                  </button>
                  <span style={{ padding: '0.4rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Page {page + 1} of {totalPages} ({total} listings)
                  </span>
                  <button
                    className="trade-chip"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next &raquo;
                  </button>
                </div>
              )}

              <div className="info-box" style={{ textAlign: 'center', marginTop: '1rem' }}>
                To buy or sell items, open the Trade panel in the game&apos;s Hideout.
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
           TAB: Price Watch (placeholder — needs price aggregation API)
         ═══════════════════════════════════════════════════════ */}
      {tab === 'prices' && (
        <>
          <p className="section-subtitle">
            Average market prices over the last 24 hours. Use this to gauge fair value before buying or selling.
          </p>

          <div className="info-box" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <h4>Price Watch</h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Price history and aggregations are coming soon.
              For now, browse the Market tab to see current listing prices.
            </p>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
           TAB: How It Works
         ═══════════════════════════════════════════════════════ */}
      {tab === 'how' && (
        <>
          <h2 className="section-title">Trading System</h2>
          <p className="section-subtitle">
            The Tap of Exile marketplace lets players exchange items for gold in a secure, server-verified environment.
          </p>

          <div className="card-grid cols-2">
            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83D\uDCE4'}</div>
                <div>
                  <div className="card-title">1. Create a Listing</div>
                </div>
              </div>
              <div className="card-body">
                Select an item from your bag, set your asking price in gold, and publish.
                The item is moved to escrow and cannot be used while listed.
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83D\uDD0D'}</div>
                <div>
                  <div className="card-title">2. Browse & Search</div>
                </div>
              </div>
              <div className="card-body">
                Filter the market by category, quality, subtype, and price.
                Sort by newest, cheapest, or quality to find what you need.
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83E\uDD1D'}</div>
                <div>
                  <div className="card-title">3. Buy Instantly</div>
                </div>
              </div>
              <div className="card-body">
                Found a good deal? Click &ldquo;Buy&rdquo; in the game to purchase instantly.
                Gold is deducted and the item is delivered to your bag immediately.
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">{'\uD83D\uDD10'}</div>
                <div>
                  <div className="card-title">4. Secure & Verified</div>
                </div>
              </div>
              <div className="card-body">
                All trades are processed server-side with serializable transactions.
                Items are held in escrow preventing duplication or double-spend.
              </div>
            </div>
          </div>

          <h2 className="section-title" style={{ marginTop: '2rem' }}>Tradable Items</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Category</th>
                  <th>Items</th>
                  <th>Qualities</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83E\uDDEA'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Potions</strong></td>
                  <td>Small Vial, Round Flask, Corked Flask, Tall Bottle, Wide Bottle, Jug</td>
                  <td>
                    <span className="badge badge-common">common</span>{' '}
                    <span className="badge badge-rare">rare</span>{' '}
                    <span className="badge badge-epic">epic</span>{' '}
                    <span className="badge badge-legendary">legendary</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83D\uDDFA\uFE0F'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Map Keys</strong></td>
                  <td>Tier 1 through Tier 10</td>
                  <td>
                    <span className="badge badge-common">T1-3</span>{' '}
                    <span className="badge badge-rare">T4-6</span>{' '}
                    <span className="badge badge-epic">T7-9</span>{' '}
                    <span className="badge badge-legendary">T10</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83D\uDC80'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Boss Keys</strong></td>
                  <td>Standard, Empowered, Mythic</td>
                  <td>
                    <span className="badge badge-common">Standard</span>{' '}
                    <span className="badge badge-epic">Empowered</span>{' '}
                    <span className="badge badge-boss">Mythic</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\u2694\uFE0F'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Equipment</strong></td>
                  <td>Helmets, Armor, Boots, Gloves, Weapons, Rings, Amulets, Belts</td>
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
            <h4>Trade Rules</h4>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>Minimum character level: <strong>10</strong></li>
              <li>Commission: <strong>10%</strong> on both sides &mdash; buyer pays asking price + 10%, seller receives asking price &minus; 10%</li>
              <li>Maximum active listings per player: <strong>20</strong></li>
              <li>Listings expire after <strong>48 hours</strong> if not sold</li>
              <li>Expired or cancelled items return to your bag automatically</li>
              <li>Equipped items must be unequipped before listing</li>
              <li>Trades are scoped per league &mdash; you can only buy/sell within your active league</li>
            </ul>
          </div>

          <div className="formula-box" style={{ marginTop: '1.5rem' }}>
            <strong>Commission formula:</strong><br />
            Buyer pays = Price &times; 1.10 (price + 10%)<br />
            Seller receives = Price &times; 0.90 (price &minus; 10%)<br />
            Total gold sink = 20% of listed price
          </div>
        </>
      )}
    </>
  );
}
