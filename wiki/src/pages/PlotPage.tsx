import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ActData {
  act: number;
  name: string;
  icon: string;
  theme: string;
  bossDesc: string;
  locations: { name: string; description: string; order: number }[];
  modifiers: { icon: string; name: string; description: string; type: string }[];
}

const ACTS: ActData[] = [
  {
    act: 1, name: 'The Castle', icon: '\uD83C\uDFF0', theme: 'Goblins, Bandits, Ninja',
    bossDesc: 'Shogun awaits atop his stolen throne',
    locations: [
      { name: 'Castle Gate', description: 'Massive stone gates loom ahead. Guards patrol the battlements.', order: 1 },
      { name: 'Outer Ward', description: 'The courtyard buzzes with soldiers. Steel clashes against steel.', order: 2 },
      { name: 'Dungeon Entrance', description: 'Iron bars and chains. Screams echo from below.', order: 3 },
      { name: 'Armory Hall', description: 'Weapons line the walls. Someone has been arming an army.', order: 4 },
      { name: 'Servants Quarters', description: 'Abandoned rooms. Overturned tables and signs of a struggle.', order: 5 },
      { name: 'Grand Hall', description: 'Towering pillars and faded banners. A throne sits empty.', order: 6 },
      { name: 'Tower Ascent', description: 'Spiral stairs wind upward. Each floor holds new dangers.', order: 7 },
      { name: "Shogun's Chamber", description: 'The final room. The Shogun awaits atop his stolen throne.', order: 8 },
      { name: 'Hidden Treasury', description: 'A secret vault behind the walls, guarded by elite sentries.', order: 9 },
      { name: 'Castle Dungeon', description: 'The deepest cells. Something ancient stirs in the darkness.', order: 10 },
    ],
    modifiers: [
      { icon: '\uD83D\uDEE1\uFE0F', name: 'Castle Walls', description: 'Stone walls reduce incoming ranged damage', type: 'buff' },
      { icon: '\u2694\uFE0F', name: 'Armory Access', description: 'Tap damage slightly increased', type: 'buff' },
      { icon: '\uD83D\uDD76\uFE0F', name: 'Dim Corridors', description: 'Enemy crit chance increased in dark rooms', type: 'debuff' },
    ],
  },
  {
    act: 2, name: 'Open Meadow', icon: '\uD83C\uDF3F', theme: 'Bandits, Wild Boar, Forest Spirit',
    bossDesc: 'Necromancer commands dark forces at the frontier',
    locations: [
      { name: 'Castle Outskirts', description: 'The castle fades behind you. Open meadows stretch ahead.', order: 1 },
      { name: 'Flower Fields', description: 'Beautiful yet treacherous. Enemies hide among tall grass.', order: 2 },
      { name: 'Old Mill', description: 'A ruined windmill creaks in the breeze. Bandits made it their den.', order: 3 },
      { name: 'Riverside Path', description: 'The stream runs red. Ambush territory.', order: 4 },
      { name: "Woodcutter's Camp", description: 'Abandoned tents and cold fires. The woodcutters fled in haste.', order: 5 },
      { name: 'Sacred Grove', description: 'Ancient trees tower above. Spirits guard this place.', order: 6 },
      { name: 'Bandit Hideout', description: 'A fortified camp in the meadow. Their leader awaits inside.', order: 7 },
      { name: "Meadow's End", description: 'The grass gives way to rocky ground. The frontier beckons.', order: 8 },
      { name: 'Hidden Glade', description: 'A secret clearing. Rare creatures dwell among the wildflowers.', order: 9 },
      { name: "Shepherd's Watch", description: 'An old watchtower overlooking the plains. Now a raider outpost.', order: 10 },
    ],
    modifiers: [
      { icon: '\uD83C\uDF3F', name: "Nature's Blessing", description: 'HP regeneration from fresh air', type: 'buff' },
      { icon: '\u2600\uFE0F', name: 'Open Sky', description: 'No ambush penalties -- enemies visible early', type: 'buff' },
      { icon: '\uD83D\uDC1B', name: 'Insect Swarm', description: 'Periodic minor poison damage over time', type: 'debuff' },
    ],
  },
  {
    act: 3, name: 'The Fields', icon: '\uD83C\uDF3E', theme: 'Ronin, Ninja, Wild Boar, Dark Knight',
    bossDesc: 'Shogun commands from his war tent',
    locations: [
      { name: 'Open Steppe', description: 'Endless plains under a wide sky. Nowhere to hide.', order: 1 },
      { name: 'Scorched Farmland', description: 'Burned crops and ruined barns. War has passed through here.', order: 2 },
      { name: 'Windswept Plateau', description: 'The wind never stops. It carries the sound of distant battles.', order: 3 },
      { name: 'Dry Riverbed', description: 'Cracked earth where water once flowed. Beasts lurk in the gullies.', order: 4 },
      { name: 'Nomad Encampment', description: 'Tents torn apart. The nomads did not leave willingly.', order: 5 },
      { name: 'Stone Ruins', description: 'Ancient pillars jut from the earth. A forgotten civilization.', order: 6 },
      { name: "Warlord's Camp", description: 'Battle standards fly. The warlord commands from his war tent.', order: 7 },
      { name: 'Mountain Gate', description: 'The fields end at towering cliffs. A narrow pass leads up.', order: 8 },
      { name: 'Hidden Oasis', description: 'A miraculous spring in the barren fields. Fiercely contested.', order: 9 },
      { name: 'Mercenary Outpost', description: 'Sell-swords for hire. Cross them and pay with your life.', order: 10 },
    ],
    modifiers: [
      { icon: '\uD83D\uDCA8', name: 'Tailwind', description: 'Movement speed buff -- faster attack rate', type: 'buff' },
      { icon: '\u2600\uFE0F', name: 'Scorching Heat', description: 'Passive DPS ticks deal bonus fire damage', type: 'buff' },
      { icon: '\uD83C\uDF2A\uFE0F', name: 'Dust Storm', description: 'Reduced visibility -- miss chance increased', type: 'debuff' },
      { icon: '\uD83E\uDEA8', name: 'Rocky Terrain', description: 'Dodge chance reduced on uneven ground', type: 'debuff' },
    ],
  },
  {
    act: 4, name: 'Snow Mountain', icon: '\u2744\uFE0F', theme: 'Forest Spirit (frost), Tengu, Night Born',
    bossDesc: 'Shogun commands from the summit fortress',
    locations: [
      { name: 'Frozen Trail', description: 'Snow blankets everything. Each step crunches underfoot.', order: 1 },
      { name: 'Ice Bridge', description: 'A precarious span of frozen water over a deep chasm.', order: 2 },
      { name: 'Blizzard Pass', description: 'Visibility drops to nothing. Enemies emerge from the whiteout.', order: 3 },
      { name: 'Avalanche Valley', description: 'Snow rumbles above. One wrong move triggers disaster.', order: 4 },
      { name: "Yeti's Domain", description: 'Massive footprints in the snow. Something enormous lives here.', order: 5 },
      { name: 'Frost Temple', description: 'An ice-encrusted shrine. Ancient power pulses within.', order: 6 },
      { name: "Dragon's Peak", description: 'The summit is scorched black. A dragon nests among the ice.', order: 7 },
      { name: 'Summit Fortress', description: 'A stronghold carved from the mountaintop. The final ascent.', order: 8 },
      { name: 'Crystal Cavern', description: 'Ice crystals glow with inner light. Rare treasures lie within.', order: 9 },
      { name: 'Frozen Shrine', description: 'A sacred place encased in eternal ice. Spirits guard it still.', order: 10 },
    ],
    modifiers: [
      { icon: '\u2744\uFE0F', name: 'Frost Armor', description: 'Cold hardens your resolve -- defense up', type: 'buff' },
      { icon: '\u2744\uFE0F', name: 'Frostbite', description: 'Extreme cold slows attack speed', type: 'debuff' },
      { icon: '\uD83C\uDF28\uFE0F', name: 'Blizzard', description: 'Periodic freeze chance on both sides', type: 'debuff' },
      { icon: '\u26F0\uFE0F', name: 'Thin Air', description: 'Stamina drains faster at high altitude', type: 'debuff' },
    ],
  },
  {
    act: 5, name: 'The Depths', icon: '\uD83D\uDD73\uFE0F', theme: 'Reaper, Night Born, Necromancer',
    bossDesc: 'Ancient evil awaits in the heart of the mountain',
    locations: [
      { name: 'Cave Mouth', description: 'Darkness swallows the light. The descent begins.', order: 1 },
      { name: 'Crystal Tunnels', description: 'Glowing crystals light the path. Their beauty is deceptive.', order: 2 },
      { name: 'Underground River', description: 'Black water rushes through the cavern. The current is deadly.', order: 3 },
      { name: 'Fungal Grotto', description: 'Giant mushrooms pulse with toxic spores. The air burns.', order: 4 },
      { name: 'Bone Chamber', description: 'The floor is covered in bones. Countless have perished here.', order: 5 },
      { name: 'Lava Vein', description: 'Magma flows through cracks in the stone. The heat is unbearable.', order: 6 },
      { name: 'Abyssal Rift', description: 'A chasm with no bottom. Whispers rise from the darkness.', order: 7 },
      { name: 'Heart of the Mountain', description: 'The deepest chamber. An ancient evil awaits its challenger.', order: 8 },
      { name: 'Hidden Grotto', description: 'A secret cavern filled with crystallized treasures.', order: 9 },
      { name: 'Poison Depths', description: 'Green mist seeps from the walls. Every breath is agony.', order: 10 },
    ],
    modifiers: [
      { icon: '\uD83D\uDD2E', name: 'Crystal Glow', description: 'Cave crystals boost crit multiplier', type: 'buff' },
      { icon: '\uD83D\uDD25', name: 'Lava Veins', description: 'Fire damage over time from magma fissures', type: 'debuff' },
      { icon: '\uD83E\uDDA7', name: 'Cave Darkness', description: 'Total darkness -- high miss chance', type: 'debuff' },
      { icon: '\u2620\uFE0F', name: 'Toxic Fumes', description: 'Poison stacks slowly drain HP', type: 'debuff' },
    ],
  },
];

export default function PlotPage() {
  const { t } = useTranslation('plot');
  const { t: tc } = useTranslation('common');
  const [selectedAct, setSelectedAct] = useState(0);
  const act = ACTS[selectedAct];

  return (
    <>
      <div className="page-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <div className="tab-bar">
        {ACTS.map((a, i) => (
          <button
            key={a.act}
            className={`tab-btn ${i === selectedAct ? 'active' : ''}`}
            onClick={() => setSelectedAct(i)}
          >
            {a.icon} {t('actLabel', { num: a.act, name: a.name })}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-icon" style={{ fontSize: '2.5rem' }}>{act.icon}</div>
          <div>
            <div className="card-title" style={{ fontSize: '1.4rem' }}>{t('actLabel', { num: act.act, name: act.name })}</div>
            <div className="card-subtitle">{act.theme}</div>
          </div>
        </div>
        <div className="card-body">
          <strong>{t('actBoss')}</strong> {act.bossDesc}
        </div>
      </div>

      <h3 className="section-title">{t('actModifiers')}</h3>
      <div className="card-grid cols-2" style={{ marginBottom: '1.5rem' }}>
        {act.modifiers.map((m) => (
          <div key={m.name} className="card" style={{
            borderLeft: `3px solid ${m.type === 'buff' ? '#22c55e' : '#ef4444'}`,
            padding: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <strong style={{ color: 'var(--text-heading)' }}>{m.name}</strong>
              <span className={`badge ${m.type === 'buff' ? 'badge-rare' : 'badge-boss'}`}>{tc(`ui.${m.type}`)}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>{m.description}</p>
          </div>
        ))}
      </div>

      <h3 className="section-title">{t('locations', { count: act.locations.length })}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>{t('thOrder')}</th>
              <th>{t('thLocation')}</th>
              <th>{t('thDescription')}</th>
              <th>{t('thType')}</th>
            </tr>
          </thead>
          <tbody>
            {act.locations.map((loc) => (
              <tr key={loc.order}>
                <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{loc.order}</td>
                <td><strong>{loc.name}</strong></td>
                <td style={{ maxWidth: '400px' }}>{loc.description}</td>
                <td>
                  {loc.order <= 8
                    ? <span className="badge badge-rare">{tc('ui.main')}</span>
                    : <span className="badge badge-common">{tc('ui.side')}</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: '2rem' }}>{t('progressionTitle')}</h2>
      <div className="card-grid cols-2">
        <div className="card">
          <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem' }}>{t('unlockPattern')}</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li>{t('unlock1')}</li>
            <li>{t('unlock2')}</li>
            <li>{t('unlock3')}</li>
            <li>{t('unlock4')}</li>
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem' }}>{t('actUnlock')}</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('actUnlockDesc')}
          </p>
        </div>
      </div>

      <div className="info-box" style={{ marginTop: '1.5rem' }}>
        <h4>{t('monsterLevels')}</h4>
        <p dangerouslySetInnerHTML={{ __html: t('monsterLevelsDesc') }} />
      </div>
    </>
  );
}
