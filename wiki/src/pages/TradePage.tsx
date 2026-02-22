import { useState } from 'react';

/* ── Mock market data ──────────────────────────────────────────── */

type ListingCategory = 'potion' | 'map_key' | 'boss_key';
type Quality = 'common' | 'rare' | 'epic' | 'legendary';

interface Listing {
  id: number;
  seller: string;
  item: string;
  category: ListingCategory;
  quality: Quality;
  tier?: number;
  qty: number;
  price: number;
  currency: string;
  timeAgo: string;
}

const MOCK_LISTINGS: Listing[] = [
  { id: 1,  seller: 'ShadowRonin',     item: 'Jug',            category: 'potion',   quality: 'legendary', qty: 1,  price: 2400, currency: 'gold', timeAgo: '2m'  },
  { id: 2,  seller: 'CrimsonBlade',     item: 'Wide Bottle',    category: 'potion',   quality: 'epic',      qty: 3,  price: 800,  currency: 'gold', timeAgo: '5m'  },
  { id: 3,  seller: 'FrostMage42',      item: 'Boss Key',       category: 'boss_key', quality: 'epic',      tier: 2, qty: 1,  price: 5200, currency: 'gold', timeAgo: '8m'  },
  { id: 4,  seller: 'DragonSlayer',     item: 'Map Key T8',     category: 'map_key',  quality: 'epic',      tier: 8, qty: 2,  price: 1600, currency: 'gold', timeAgo: '12m' },
  { id: 5,  seller: 'NightAssassin',    item: 'Tall Bottle',    category: 'potion',   quality: 'rare',      qty: 5,  price: 350,  currency: 'gold', timeAgo: '14m' },
  { id: 6,  seller: 'AzureKnight',      item: 'Map Key T10',    category: 'map_key',  quality: 'legendary', tier: 10, qty: 1, price: 4800, currency: 'gold', timeAgo: '18m' },
  { id: 7,  seller: 'GoldenArcher',     item: 'Boss Key',       category: 'boss_key', quality: 'legendary', tier: 3, qty: 1,  price: 12000, currency: 'gold', timeAgo: '22m' },
  { id: 8,  seller: 'VoidWalker',       item: 'Corked Flask',   category: 'potion',   quality: 'rare',      qty: 4,  price: 200,  currency: 'gold', timeAgo: '25m' },
  { id: 9,  seller: 'EmeraldHunter',    item: 'Map Key T5',     category: 'map_key',  quality: 'rare',      tier: 5, qty: 3,  price: 600,  currency: 'gold', timeAgo: '28m' },
  { id: 10, seller: 'PurpleNecro',      item: 'Small Vial',     category: 'potion',   quality: 'common',    qty: 10, price: 50,   currency: 'gold', timeAgo: '31m' },
  { id: 11, seller: 'CyanSamurai',      item: 'Map Key T3',     category: 'map_key',  quality: 'common',    tier: 3, qty: 5,  price: 150,  currency: 'gold', timeAgo: '35m' },
  { id: 12, seller: 'SilverPaladin',    item: 'Boss Key',       category: 'boss_key', quality: 'common',    tier: 1, qty: 2,  price: 1800, currency: 'gold', timeAgo: '41m' },
];

interface PriceEntry {
  item: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  volume24h: number;
  change: number;
}

const MOCK_PRICES: PriceEntry[] = [
  { item: 'Small Vial (Common)',       avgPrice: 45,    minPrice: 30,   maxPrice: 80,    volume24h: 342,  change: -2.1 },
  { item: 'Round Flask (Rare)',        avgPrice: 180,   minPrice: 120,  maxPrice: 250,   volume24h: 128,  change: 5.4  },
  { item: 'Corked Flask (Rare)',       avgPrice: 220,   minPrice: 150,  maxPrice: 320,   volume24h: 97,   change: -0.8 },
  { item: 'Tall Bottle (Epic)',        avgPrice: 650,   minPrice: 400,  maxPrice: 950,   volume24h: 54,   change: 12.3 },
  { item: 'Wide Bottle (Epic)',        avgPrice: 850,   minPrice: 600,  maxPrice: 1200,  volume24h: 31,   change: 8.7  },
  { item: 'Jug (Legendary)',           avgPrice: 2500,  minPrice: 1800, maxPrice: 3500,  volume24h: 8,    change: 15.2 },
  { item: 'Map Key T1-3',             avgPrice: 120,   minPrice: 50,   maxPrice: 200,   volume24h: 256,  change: -1.5 },
  { item: 'Map Key T4-6',             avgPrice: 500,   minPrice: 300,  maxPrice: 750,   volume24h: 143,  change: 3.2  },
  { item: 'Map Key T7-9',             avgPrice: 1800,  minPrice: 1200, maxPrice: 2500,  volume24h: 67,   change: 7.1  },
  { item: 'Map Key T10',              avgPrice: 4500,  minPrice: 3500, maxPrice: 6000,  volume24h: 12,   change: 22.0 },
  { item: 'Boss Key (Standard)',       avgPrice: 1900,  minPrice: 1400, maxPrice: 2500,  volume24h: 41,   change: -3.2 },
  { item: 'Boss Key (Empowered)',      avgPrice: 5500,  minPrice: 4000, maxPrice: 7500,  volume24h: 18,   change: 6.8  },
  { item: 'Boss Key (Mythic)',         avgPrice: 13000, minPrice: 9000, maxPrice: 18000, volume24h: 3,    change: 28.5 },
];

/* ── Helpers ────────────────────────────────────────────────────── */

const CATEGORY_ICONS: Record<ListingCategory, string> = {
  potion: '\uD83E\uDDEA',
  map_key: '\uD83D\uDDFA\uFE0F',
  boss_key: '\uD83D\uDC80',
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  potion: 'Potions',
  map_key: 'Map Keys',
  boss_key: 'Boss Keys',
};

const BOSS_KEY_TIER_NAME: Record<number, string> = {
  1: 'Standard',
  2: 'Empowered',
  3: 'Mythic',
};

function formatGold(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function itemDisplay(l: Listing) {
  if (l.category === 'boss_key') return `${l.item} (${BOSS_KEY_TIER_NAME[l.tier!] ?? l.tier})`;
  return l.item;
}

/* ── Tabs ───────────────────────────────────────────────────────── */

type Tab = 'market' | 'my_trades' | 'prices' | 'how';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'market',    label: 'Market',        icon: '\uD83D\uDCCA' },
  { key: 'my_trades', label: 'My Trades',     icon: '\uD83D\uDD04' },
  { key: 'prices',    label: 'Price Watch',   icon: '\uD83D\uDCB0' },
  { key: 'how',       label: 'How It Works',  icon: '\uD83D\uDCD6' },
];

/* ── Component ─────────────────────────────────────────────────── */

export default function TradePage() {
  const [tab, setTab] = useState<Tab>('market');
  const [catFilter, setCatFilter] = useState<ListingCategory | 'all'>('all');
  const [qualFilter, setQualFilter] = useState<Quality | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = MOCK_LISTINGS.filter((l) => {
    if (catFilter !== 'all' && l.category !== catFilter) return false;
    if (qualFilter !== 'all' && l.quality !== qualFilter) return false;
    if (search && !l.item.toLowerCase().includes(search.toLowerCase()) &&
        !l.seller.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-heading">
        <h1>Trade Market</h1>
        <p>Buy and sell potions, map keys, and boss keys with other players.</p>
      </div>

      {/* ── Live stats strip ───────────────────────────────── */}
      <div className="trade-stats-strip">
        <div className="trade-stat">
          <span className="trade-stat__label">Listings</span>
          <span className="trade-stat__value">1,247</span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">Trades Today</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-cyan)' }}>384</span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">Gold Volume</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-gold-bright)' }}>2.4M</span>
        </div>
        <div className="trade-stat">
          <span className="trade-stat__label">Online (5 min)</span>
          <span className="trade-stat__value" style={{ color: 'var(--ds-crimson-bright)' }}>89</span>
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
              placeholder="Search items or sellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="trade-filter-group">
              <label className="trade-filter-label">Category</label>
              <div className="trade-filter-chips">
                <button className={`trade-chip${catFilter === 'all' ? ' active' : ''}`} onClick={() => setCatFilter('all')}>All</button>
                {(Object.keys(CATEGORY_LABELS) as ListingCategory[]).map((c) => (
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
                {(['common','rare','epic','legendary'] as Quality[]).map((q) => (
                  <button key={q} className={`trade-chip trade-chip--${q}${qualFilter === q ? ' active' : ''}`} onClick={() => setQualFilter(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Listings table ─────────────────────────────────── */}
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table trade-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Item</th>
                  <th>Quality</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Seller</th>
                  <th style={{ width: 52 }}>Time</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No listings match your filters.</td></tr>
                )}
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{CATEGORY_ICONS[l.category]}</td>
                    <td>
                      <strong style={{ color: 'var(--text-heading)' }}>{itemDisplay(l)}</strong>
                      {l.tier && l.category === 'map_key' && (
                        <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tier {l.tier}</span>
                      )}
                    </td>
                    <td><span className={`badge badge-${l.quality}`}>{l.quality}</span></td>
                    <td style={{ color: 'var(--text-heading)' }}>{l.qty}</td>
                    <td style={{ color: 'var(--ds-gold-bright)', fontWeight: 700 }}>{formatGold(l.price)}</td>
                    <td style={{ color: 'var(--ds-cyan-mid)' }}>{l.seller}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{l.timeAgo}</td>
                    <td>
                      <button className="trade-buy-btn">Buy</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <button className="trade-sell-btn">
              + Create Listing
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
           TAB: My Trades
         ═══════════════════════════════════════════════════════ */}
      {tab === 'my_trades' && (
        <>
          <div className="info-box" style={{ marginBottom: '1.5rem' }}>
            <h4>Your Active Trades</h4>
            <p>Manage your buy and sell orders. Items are held in escrow until the trade completes.</p>
          </div>

          <h2 className="section-title">Selling (2)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Item</th>
                  <th>Quality</th>
                  <th>Qty</th>
                  <th>Asking Price</th>
                  <th>Listed</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83E\uDDEA'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Tall Bottle</strong></td>
                  <td><span className="badge badge-epic">epic</span></td>
                  <td>2</td>
                  <td style={{ color: 'var(--ds-gold-bright)', fontWeight: 700 }}>680</td>
                  <td style={{ color: 'var(--text-muted)' }}>3h ago</td>
                  <td><button className="trade-cancel-btn">Cancel</button></td>
                </tr>
                <tr>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{'\uD83D\uDDFA\uFE0F'}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Map Key T6</strong></td>
                  <td><span className="badge badge-rare">rare</span></td>
                  <td>1</td>
                  <td style={{ color: 'var(--ds-gold-bright)', fontWeight: 700 }}>550</td>
                  <td style={{ color: 'var(--text-muted)' }}>6h ago</td>
                  <td><button className="trade-cancel-btn">Cancel</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="section-title" style={{ marginTop: '2rem' }}>Trade History</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>With</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge" style={{ background: 'rgba(79,195,247,0.15)', color: 'var(--ds-cyan-mid)' }}>BUY</span></td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Boss Key (Empowered)</strong></td>
                  <td>1</td>
                  <td style={{ color: 'var(--ds-gold-bright)' }}>5,200</td>
                  <td style={{ color: 'var(--ds-cyan-mid)' }}>FrostMage42</td>
                  <td style={{ color: 'var(--text-muted)' }}>Yesterday</td>
                </tr>
                <tr>
                  <td><span className="badge" style={{ background: 'rgba(164,2,57,0.15)', color: 'var(--ds-crimson-bright)' }}>SELL</span></td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Small Vial</strong></td>
                  <td>8</td>
                  <td style={{ color: 'var(--ds-gold-bright)' }}>400</td>
                  <td style={{ color: 'var(--ds-cyan-mid)' }}>PurpleNecro</td>
                  <td style={{ color: 'var(--text-muted)' }}>2 days ago</td>
                </tr>
                <tr>
                  <td><span className="badge" style={{ background: 'rgba(79,195,247,0.15)', color: 'var(--ds-cyan-mid)' }}>BUY</span></td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>Map Key T7</strong></td>
                  <td>2</td>
                  <td style={{ color: 'var(--ds-gold-bright)' }}>2,800</td>
                  <td style={{ color: 'var(--ds-cyan-mid)' }}>CrimsonBlade</td>
                  <td style={{ color: 'var(--text-muted)' }}>3 days ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
           TAB: Price Watch
         ═══════════════════════════════════════════════════════ */}
      {tab === 'prices' && (
        <>
          <p className="section-subtitle">
            Average market prices over the last 24 hours. Use this to gauge fair value before buying or selling.
          </p>

          <h2 className="section-title">Potions</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Avg Price</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Volume (24h)</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PRICES.filter(p => !p.item.includes('Key')).map((p, i) => (
                  <tr key={i}>
                    <td><strong style={{ color: 'var(--text-heading)' }}>{p.item}</strong></td>
                    <td style={{ color: 'var(--ds-gold-bright)', fontWeight: 700 }}>{formatGold(p.avgPrice)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatGold(p.minPrice)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatGold(p.maxPrice)}</td>
                    <td>{p.volume24h}</td>
                    <td style={{ color: p.change >= 0 ? 'var(--ds-cyan-mid)' : 'var(--ds-crimson-bright)', fontWeight: 600 }}>
                      {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="section-title" style={{ marginTop: '2rem' }}>Map & Boss Keys</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Avg Price</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Volume (24h)</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PRICES.filter(p => p.item.includes('Key')).map((p, i) => (
                  <tr key={i}>
                    <td><strong style={{ color: 'var(--text-heading)' }}>{p.item}</strong></td>
                    <td style={{ color: 'var(--ds-gold-bright)', fontWeight: 700 }}>{formatGold(p.avgPrice)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatGold(p.minPrice)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatGold(p.maxPrice)}</td>
                    <td>{p.volume24h}</td>
                    <td style={{ color: p.change >= 0 ? 'var(--ds-cyan-mid)' : 'var(--ds-crimson-bright)', fontWeight: 600 }}>
                      {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="formula-box" style={{ marginTop: '1.5rem' }}>
            Fair Value Estimate = Avg over last 50 trades<br />
            Price Index updated every 15 minutes<br />
            Volume = total units traded in 24h window
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
                Filter the market by category, quality, and price range.
                Sort by newest, cheapest, or best value to find what you need.
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
                Found a good deal? Click "Buy" to purchase instantly.
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
                All trades are processed server-side. Items held in escrow prevent duplication.
                A 5% transaction fee is applied to the seller.
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
              </tbody>
            </table>
          </div>

          <div className="info-box" style={{ marginTop: '1.5rem' }}>
            <h4>Trade Rules</h4>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>Minimum account level: <strong>10</strong></li>
              <li>Transaction fee: <strong>5%</strong> of the sale price (paid by seller)</li>
              <li>Maximum active listings per player: <strong>20</strong></li>
              <li>Listings expire after <strong>48 hours</strong> if not sold</li>
              <li>Expired or cancelled items return to your bag automatically</li>
              <li>Equipped items must be unequipped before listing</li>
            </ul>
          </div>

          <div className="tbd-section" style={{ marginTop: '2rem' }}>
            <div className="tbd-icon">{'\u2694\uFE0F'}</div>
            <h3>Gear Trading &mdash; Coming Later</h3>
            <p>When the equipment system launches, armor, weapons, rings, and amulets will also become tradable on the market.</p>
          </div>
        </>
      )}
    </>
  );
}
