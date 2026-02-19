export default function TradePage() {
  return (
    <>
      <div className="page-heading">
        <h1>Trade</h1>
        <p>Player-to-player trading system for Tap of Exile.</p>
      </div>

      <div className="tbd-section">
        <div className="tbd-icon">{'\uD83D\uDCB0'}</div>
        <h3>Trading System &mdash; Coming Soon</h3>
        <p>
          The trade system is currently in development and will be available in a future update.
          It will mirror the trading functionality in the main Tap of Exile app,
          allowing players to exchange items, potions, map keys, and other resources.
        </p>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>Planned Features</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDD04'}</div>
            <div>
              <div className="card-title">Player-to-Player Trading</div>
            </div>
          </div>
          <div className="card-body">
            Direct item exchanges between players. Trade potions, map keys, boss keys, and future gear items with friends or other players.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDCCA'}</div>
            <div>
              <div className="card-title">Market Listings</div>
            </div>
          </div>
          <div className="card-body">
            Browse and search available trades from all players. Filter by item type, quality, tier, and price.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDCB0'}</div>
            <div>
              <div className="card-title">Price History</div>
            </div>
          </div>
          <div className="card-body">
            Track item value trends over time. See average prices for potions, map keys, and other tradable items.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-icon">{'\uD83D\uDD10'}</div>
            <div>
              <div className="card-title">Secure Trades</div>
            </div>
          </div>
          <div className="card-body">
            Server-verified trade system ensures fair exchanges. Both parties must confirm before items are transferred.
          </div>
        </div>
      </div>

      <div className="info-box" style={{ marginTop: '2rem' }}>
        <h4>Stay Updated</h4>
        <p>
          Join our community for the latest updates on the trading system:
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
          <a
            href="https://discord.gg/mgCNqp9q"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.4rem 0.8rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          >
            {'\uD83D\uDCAC'} Discord
          </a>
          <a
            href="https://t.me/Tap_Of_Exile_Bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.4rem 0.8rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          >
            {'\u2708\uFE0F'} Telegram Bot
          </a>
        </div>
      </div>
    </>
  );
}
