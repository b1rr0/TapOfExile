/**
 * Daily reward schedule — 30-day rotation.
 * After day 30, resets to day 1.
 */
export const DAILY_REWARD_TABLE = [
  { day: 1, type: 'gold', data: { amount: 100 } },
  { day: 2, type: 'gold', data: { amount: 200 } },
  { day: 3, type: 'map_key', data: { tier: 1 } },
  { day: 4, type: 'gold', data: { amount: 500 } },
  { day: 5, type: 'gold', data: { amount: 750 } },
  { day: 6, type: 'map_key', data: { tier: 2 } },
  { day: 7, type: 'map_key', data: { tier: 3 } },
  { day: 8, type: 'gold', data: { amount: 1000 } },
  { day: 9, type: 'gold', data: { amount: 1500 } },
  { day: 10, type: 'map_key', data: { tier: 4 } },
  { day: 11, type: 'gold', data: { amount: 2000 } },
  { day: 12, type: 'gold', data: { amount: 2500 } },
  { day: 13, type: 'map_key', data: { tier: 5 } },
  { day: 14, type: 'map_key', data: { tier: 6 } },
  { day: 15, type: 'gold', data: { amount: 5000 } },
  { day: 16, type: 'gold', data: { amount: 3000 } },
  { day: 17, type: 'gold', data: { amount: 4000 } },
  { day: 18, type: 'map_key', data: { tier: 7 } },
  { day: 19, type: 'gold', data: { amount: 5000 } },
  { day: 20, type: 'map_key', data: { tier: 8 } },
  { day: 21, type: 'boss_key', data: { tier: 1 } },
  { day: 22, type: 'gold', data: { amount: 7500 } },
  { day: 23, type: 'gold', data: { amount: 8000 } },
  { day: 24, type: 'map_key', data: { tier: 9 } },
  { day: 25, type: 'gold', data: { amount: 10000 } },
  { day: 26, type: 'map_key', data: { tier: 10 } },
  { day: 27, type: 'boss_key', data: { tier: 2 } },
  { day: 28, type: 'gold', data: { amount: 15000 } },
  { day: 29, type: 'gold', data: { amount: 20000 } },
  { day: 30, type: 'boss_key', data: { tier: 3 } },
];

/**
 * Future achievement definitions.
 */
export const ACHIEVEMENTS = [
  { id: 'FIRST_KILL', name: 'First Blood', description: 'Kill your first monster', reward: { type: 'gold', amount: 50 } },
  { id: 'ACT_1_COMPLETE', name: 'Act I Clear', description: 'Complete Act 1', reward: { type: 'gold', amount: 500 } },
  { id: 'ACT_2_COMPLETE', name: 'Act II Clear', description: 'Complete Act 2', reward: { type: 'gold', amount: 1000 } },
  { id: 'ACT_3_COMPLETE', name: 'Act III Clear', description: 'Complete Act 3', reward: { type: 'gold', amount: 2000 } },
  { id: 'ACT_4_COMPLETE', name: 'Act IV Clear', description: 'Complete Act 4', reward: { type: 'gold', amount: 4000 } },
  { id: 'ACT_5_COMPLETE', name: 'Act V Clear', description: 'Complete Act 5', reward: { type: 'gold', amount: 8000 } },
  { id: 'LEVEL_25', name: 'Rising Star', description: 'Reach level 25', reward: { type: 'gold', amount: 1000 } },
  { id: 'LEVEL_50', name: 'Veteran', description: 'Reach level 50', reward: { type: 'map_key', tier: 5 } },
  { id: 'LEVEL_100', name: 'Legend', description: 'Reach level 100', reward: { type: 'map_key', tier: 10 } },
  { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat all 8 endgame bosses', reward: { type: 'boss_key', tier: 3 } },
  { id: 'TIER_10_CLEAR', name: 'Apex Predator', description: 'Clear a Tier 10 map', reward: { type: 'gold', amount: 50000 } },
  { id: 'TAP_10K', name: 'Tap Master', description: '10,000 total taps', reward: { type: 'gold', amount: 2000 } },
  { id: 'GOLD_1M', name: 'Gold Hoarder', description: 'Earn 1,000,000 total gold', reward: { type: 'gold', amount: 10000 } },
];
