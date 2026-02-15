/**
 * One-time migration script: bag_items + Character.equipment JSONB → items + equipment_slots
 *
 * Run AFTER starting the server with the new entities (synchronize:true creates the tables).
 * Usage: npx ts-node -r tsconfig-paths/register scripts/migrate-items.ts
 *
 * What it does:
 * 1. Copies all rows from `bag_items` → `items` with status='bag'
 * 2. Reads Character.equipment JSONB → creates Item rows (status='equipped') + EquipmentSlot rows
 * 3. After verification, you can DROP TABLE bag_items and ALTER TABLE characters DROP COLUMN equipment
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'tap_of_exile',
  password: process.env.DB_PASSWORD || 'tap_of_exile_dev',
  database: process.env.DB_NAME || 'tap_of_exile',
  logging: true,
});

async function migrate() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  console.log('=== Starting item migration ===');

  // Check if old tables exist
  const bagTableExists = await qr.hasTable('bag_items');
  const itemsTableExists = await qr.hasTable('items');
  const equipSlotsTableExists = await qr.hasTable('equipment_slots');

  if (!itemsTableExists) {
    console.error('ERROR: "items" table does not exist. Start the server first so TypeORM creates it.');
    process.exit(1);
  }
  if (!equipSlotsTableExists) {
    console.error('ERROR: "equipment_slots" table does not exist. Start the server first so TypeORM creates it.');
    process.exit(1);
  }

  await qr.startTransaction();

  try {
    // ── Step 1: Migrate bag_items → items ──────────────────

    if (bagTableExists) {
      const bagItems: any[] = await qr.query('SELECT * FROM bag_items');
      console.log(`Found ${bagItems.length} bag_items to migrate`);

      for (const bi of bagItems) {
        // Check if already migrated
        const existing = await qr.query('SELECT id FROM items WHERE id = $1', [bi.id]);
        if (existing.length > 0) {
          console.log(`  Skipping ${bi.id} (already exists in items)`);
          continue;
        }

        await qr.query(
          `INSERT INTO items (id, "playerLeagueId", name, type, quality, status, level, icon, "acquiredAt",
            tier, "locationId", "locationAct", "bossId", "bossKeyTier",
            "flaskType", "maxCharges", "currentCharges", "healPercent", properties)
          VALUES ($1, $2, $3, $4, $5, 'bag', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, '{}')`,
          [
            bi.id,
            bi.playerLeagueId,
            bi.name,
            bi.type,
            bi.quality,
            bi.level,
            bi.icon,
            bi.acquiredAt,
            bi.tier,
            bi.locationId,
            bi.locationAct,
            bi.bossId,
            bi.bossKeyTier,
            bi.flaskType,
            bi.maxCharges,
            bi.currentCharges,
            bi.healPercent,
          ],
        );
      }
      console.log(`Migrated ${bagItems.length} bag items → items table`);
    } else {
      console.log('No bag_items table found, skipping step 1');
    }

    // ── Step 2: Migrate Character.equipment JSONB → items + equipment_slots ──

    // Check if characters table still has the equipment column
    const hasEquipmentCol = await qr.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'characters' AND column_name = 'equipment'`,
    );

    if (hasEquipmentCol.length > 0) {
      const characters: any[] = await qr.query(
        `SELECT id, "playerLeagueId", equipment FROM characters WHERE equipment != '{}'::jsonb AND equipment IS NOT NULL`,
      );
      console.log(`Found ${characters.length} characters with equipment data`);

      let totalSlots = 0;
      for (const char of characters) {
        const equipment = char.equipment || {};

        for (const [slotId, data] of Object.entries(equipment)) {
          if (!data || typeof data !== 'object') continue;
          const d = data as any;
          if (!d.flaskType) continue; // Only potions for now

          // Generate item ID
          const itemId = d.bagItemId || `migrated_${slotId}_${char.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

          // Check if this item already exists (e.g., from bag_items migration)
          const existing = await qr.query('SELECT id, status FROM items WHERE id = $1', [itemId]);

          if (existing.length > 0) {
            // Item exists from bag migration — update status to 'equipped' and sync charges
            await qr.query(
              `UPDATE items SET status = 'equipped', "currentCharges" = $1 WHERE id = $2`,
              [d.currentCharges, itemId],
            );
          } else {
            // Create new item (was inline in equipment JSONB, no bag entry)
            await qr.query(
              `INSERT INTO items (id, "playerLeagueId", name, type, quality, status, icon, "acquiredAt",
                "flaskType", "maxCharges", "currentCharges", "healPercent", properties)
              VALUES ($1, $2, $3, 'potion', $4, 'equipped', 'potion', $5, $6, $7, $8, $9, '{}')`,
              [
                itemId,
                char.playerLeagueId,
                d.name || d.flaskType,
                d.quality || 'common',
                String(Date.now()),
                d.flaskType,
                d.maxCharges,
                d.currentCharges,
                d.healPercent,
              ],
            );
          }

          // Create equipment slot (skip if already exists)
          const existingSlot = await qr.query(
            `SELECT id FROM equipment_slots WHERE "characterId" = $1 AND "slotId" = $2`,
            [char.id, slotId],
          );
          if (existingSlot.length === 0) {
            await qr.query(
              `INSERT INTO equipment_slots (id, "characterId", "slotId", "itemId")
              VALUES (gen_random_uuid(), $1, $2, $3)`,
              [char.id, slotId, itemId],
            );
            totalSlots++;
          }
        }
      }
      console.log(`Created ${totalSlots} equipment slot rows`);
    } else {
      console.log('No equipment column found on characters, skipping step 2');
    }

    await qr.commitTransaction();
    console.log('=== Migration complete ===');

    // Print summary
    const itemCount = await qr.query('SELECT count(*) as c FROM items');
    const slotCount = await qr.query('SELECT count(*) as c FROM equipment_slots');
    console.log(`Items table: ${itemCount[0].c} rows`);
    console.log(`Equipment slots table: ${slotCount[0].c} rows`);

    console.log('\nNext steps:');
    console.log('1. Verify data is correct');
    console.log('2. ALTER TABLE characters DROP COLUMN IF EXISTS equipment;');
    console.log('3. DROP TABLE IF EXISTS bag_items;');
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('Migration failed, rolled back:', error);
    throw error;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
