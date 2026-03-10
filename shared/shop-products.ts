/**
 * Shop product catalog - Telegram Stars → Shards packages.
 * Shared between server and client.
 */

export interface ShopProduct {
  id: string;
  label: string;
  description: string;
  starsPrice: number;
  shardsReward: number;
}

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  {
    id: 'shards_100',
    label: '100 Shards',
    description: '100 Shards',
    starsPrice: 50,
    shardsReward: 100,
  },
  {
    id: 'shards_550',
    label: '550 Shards',
    description: '550 Shards (+10%)',
    starsPrice: 250,
    shardsReward: 550,
  },
  {
    id: 'shards_1200',
    label: '1200 Shards',
    description: '1200 Shards (+20%)',
    starsPrice: 500,
    shardsReward: 1200,
  },
];
