import { useState, useEffect } from 'react';
import SpritePreview from './SpritePreview';
import { CLASS_DEFS } from '@shared/class-stats';
import { HERO_SKIN_MAP } from '@shared/sprite-registry';

const API_BASE = '/api';

const CLASS_ICONS: Record<string, string> = Object.fromEntries(
  Object.values(CLASS_DEFS).map(c => [c.id, c.icon])
);

const SLOT_LABELS: Record<string, string> = {
  'weapon-left': 'Left Hand',
  'weapon-right': 'Right Hand',
  head: 'Head',
  chest: 'Chest',
  gloves: 'Gloves',
  belt: 'Belt',
  boots: 'Boots',
  'accessory-1': 'Ring 1',
  'accessory-2': 'Ring 2',
  'accessory-3': 'Amulet',
  'consumable-1': 'Potion (Q)',
  'consumable-2': 'Potion (E)',
};

interface CharacterProfile {
  id: string;
  nickname: string;
  classId: string;
  skinId: string;
  level: number;
  xp: string;
  xpToNext: string;
  hp: number;
  maxHp: number;
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  armor?: number;
  blockChance?: number;
  cooldownReduction?: number;
  arcaneCritChance?: number;
  arcaneCritMultiplier?: number;
  specialValue: number;
  elementalDamage: Record<string, number>;
  resistance: Record<string, number>;
  dojoBestDamage: number;
  endgameUnlocked: boolean;
  completedBosses: string[];
  highestTierCompleted: number;
  totalMapsRun: number;
  allocatedNodes: number[];
  equipment: Record<string, {
    name: string;
    type: string;
    quality: string;
    icon: string | null;
    flaskType: string | null;
    healPercent: number | null;
    maxCharges: number | null;
    currentCharges: number | null;
  }>;
  leagueName: string;
  leagueType: string;
  telegramUsername: string | null;
}

interface Props {
  characterId: string;
  onClose: () => void;
}

export default function CharacterModal({ characterId, onClose }: Props) {
  const [data, setData] = useState<CharacterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/leaderboard/character/${characterId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d.character))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [characterId]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const equipSlots = data ? Object.entries(data.equipment) : [];
  const skin = data ? HERO_SKIN_MAP[data.skinId] : undefined;

  return (
    <div className="char-modal-overlay" onClick={handleOverlayClick}>
      <div className="char-modal">
        <button className="char-modal__close" onClick={onClose}>{'\u2715'}</button>

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {'\u23F3'} Loading character...
          </div>
        )}

        {error && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-fire)' }}>
            {'\u26A0\uFE0F'} {error}
          </div>
        )}

        {data && (
          <>
            {/* ── Hero banner header ── */}
            <div className="char-modal__hero-banner">
              <div className="char-modal__hero-sprite">
                {skin ? (
                  <SpritePreview basePath={skin.basePath} size={160} />
                ) : (
                  <span style={{ fontSize: '4rem' }}>{CLASS_ICONS[data.classId] || ''}</span>
                )}
              </div>
              <div className="char-modal__hero-info">
                <h2 className="char-modal__hero-name">{data.nickname}</h2>
                <div className="char-modal__hero-meta">
                  <span className="char-modal__hero-class">
                    {CLASS_ICONS[data.classId]} {data.classId.charAt(0).toUpperCase() + data.classId.slice(1)}
                  </span>
                  <span className="char-modal__hero-level">Lv. {data.level}</span>
                </div>
                <div className="char-modal__hero-league">
                  {data.leagueName}
                  {data.telegramUsername && <span> &bull; @{data.telegramUsername}</span>}
                </div>
              </div>
            </div>

            <div className="char-modal__body">
              {/* Stats */}
              <h3 style={{ color: 'var(--text-heading)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                {'\uD83D\uDCCA'} Stats
              </h3>
              <div className="char-modal__stats">
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">{'\u2764\uFE0F'} HP</div>
                  <div className="char-modal__stat-value">{data.hp} / {data.maxHp}</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">{'\u2694\uFE0F'} <span className="stat-bugei">Bugei</span> Damage</div>
                  <div className="char-modal__stat-value">{data.tapDamage}</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">{'\uD83D\uDCA5'} <span className="stat-bugei">Bugei</span> Crit Chance</div>
                  <div className="char-modal__stat-value">{pct(data.critChance)}</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">{'\u2716\uFE0F'} <span className="stat-bugei">Bugei</span> Crit Damage</div>
                  <div className="char-modal__stat-value">{(data.critMultiplier * 100).toFixed(0)}%</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">{'\uD83D\uDCA8'} Dodge</div>
                  <div className="char-modal__stat-value">{pct(data.dodgeChance)}</div>
                </div>
                {(data.armor ?? 0) > 0 && (
                  <div className="char-modal__stat">
                    <div className="char-modal__stat-label">{'\uD83D\uDEE1\uFE0F'} Armor</div>
                    <div className="char-modal__stat-value">{Math.floor(data.armor!)}</div>
                  </div>
                )}
                {(data.blockChance ?? 0) > 0 && (
                  <div className="char-modal__stat">
                    <div className="char-modal__stat-label">{'\uD83D\uDD30'} Block</div>
                    <div className="char-modal__stat-value">{pct(data.blockChance!)}</div>
                  </div>
                )}
                {(data.cooldownReduction ?? 0) > 0 && (
                  <div className="char-modal__stat">
                    <div className="char-modal__stat-label">{'\u23F1\uFE0F'} CDR</div>
                    <div className="char-modal__stat-value">{Math.round(data.cooldownReduction!)}%</div>
                  </div>
                )}
                {(data.arcaneCritChance ?? 0) > 0 && (
                  <>
                    <div className="char-modal__stat">
                      <div className="char-modal__stat-label">{'\uD83D\uDD2E'} <span className="stat-arcane">Arcane</span> Crit Chance</div>
                      <div className="char-modal__stat-value">{pct(data.arcaneCritChance!)}</div>
                    </div>
                    <div className="char-modal__stat">
                      <div className="char-modal__stat-label">{'\uD83D\uDD2E'} <span className="stat-arcane">Arcane</span> Crit Damage</div>
                      <div className="char-modal__stat-value">{(data.arcaneCritMultiplier! * 100).toFixed(0)}%</div>
                    </div>
                  </>
                )}
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">{'\uD83C\uDFC6'} Dojo Best</div>
                  <div className="char-modal__stat-value">{data.dojoBestDamage.toLocaleString()}</div>
                </div>
              </div>

              {/* Resistances */}
              {data.resistance && (
                <>
                  <h3 style={{ color: 'var(--text-heading)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                    {'\uD83D\uDEE1\uFE0F'} Resistances
                  </h3>
                  <div className="char-modal__stats">
                    {Object.entries(data.resistance).map(([el, val]) => (
                      <div className="char-modal__stat" key={el}>
                        <div className="char-modal__stat-label">{el}</div>
                        <div className="char-modal__stat-value">{val}%</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Progression */}
              <h3 style={{ color: 'var(--text-heading)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                {'\uD83D\uDDFA\uFE0F'} Progression
              </h3>
              <div className="char-modal__stats">
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">Endgame</div>
                  <div className="char-modal__stat-value">{data.endgameUnlocked ? 'Unlocked' : 'Locked'}</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">Highest Tier</div>
                  <div className="char-modal__stat-value">{data.highestTierCompleted}</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">Maps Run</div>
                  <div className="char-modal__stat-value">{data.totalMapsRun}</div>
                </div>
                <div className="char-modal__stat">
                  <div className="char-modal__stat-label">Skill Points</div>
                  <div className="char-modal__stat-value">{data.allocatedNodes.length}</div>
                </div>
              </div>

              {/* Equipment */}
              {equipSlots.length > 0 && (
                <>
                  <h3 style={{ color: 'var(--text-heading)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                    {'\uD83C\uDFBD'} Equipment
                  </h3>
                  <div className="char-modal__equipment">
                    {equipSlots.map(([slotId, item]) => (
                      <div className="char-modal__equip-slot" key={slotId}>
                        <div>
                          <div className="char-modal__equip-slot-name">
                            {SLOT_LABELS[slotId] || slotId}
                          </div>
                          <div className={`char-modal__equip-item-name quality-${item.quality}`}>
                            {item.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Asterism — opens in new tab */}
              <button
                className="char-modal__tree-btn"
                onClick={() => window.open(`/character/${characterId}/asterism`, '_blank')}
              >
                {'\u2734\uFE0F'} View Asterism
                {data.allocatedNodes.length > 0 && ` (${data.allocatedNodes.length} nodes)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
