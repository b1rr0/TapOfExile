# Дерево навыков (Skill Tree)

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `shared/skill-tree.ts` | Построение дерева (~256 нод), layout, SkillNode, SkillTreeBuilder |
| `shared/skill-tree-validation.ts` | Валидация аллокаций (BFS, бюджет очков) |
| `shared/skill-node-defs.ts` | NodeDef, StatModifier, пулы нод, CLASS_SKILLS |
| `server/src/skill-tree/skill-tree.service.ts` | BE: сохранение, валидация, сброс |
| `server/src/skill-tree/skill-tree.controller.ts` | REST эндпоинты |
| `bot/src/scenes/skill-tree-scene.ts` | FE: SVG рендер, pan/zoom, взаимодействие |
| `bot/src/data/skill-tree.ts` | FE re-export из shared + CLASS_IMG |

## Архитектура дерева

Круговой граф в стиле PoE2, ~256 нод. Layout детерминированный (seeded RNG, seed=42), кэшируется.

### Структура (слои изнутри наружу):

```
Центр (CX=800, CY=800)
  → 4 стартовые ноды на radius 210 (samurai/warrior/mage/archer)
  → Каждая внутри Emblem circle (r=100) с 16 class-specific скиллами
  → Inner ring (3 per class = 12)
  → Trunk ring (5 per class = 20)
  → Branch ring (5 per class = 20)
  → Fractal tendrils (5 roots per class, depth-2 branching)
  → Keystones на самых дальних точках (2 per class = 8)
  → Cross-class bridges (trunk[ci][4] → trunk[ci+1][0])
```

### Типы нод

| Тип | Форма | Размер | Описание |
|-----|-------|--------|----------|
| start | circle | 14 | Стартовая нода класса |
| minor | circle | 8 | Маленькие бонусы (+3-10%) |
| notable | hex | 12 | Средние бонусы (+10-35%), часто multi-stat |
| keystone | diamond | 16 | Мощные (+50-100%), часто с trade-off |
| classSkill | hex | 9 | Внутри Emblem, до 6 штук |

## Система очков

- **Outer points** = `level - 1` (minor, notable, keystone ноды)
- **Class skills** — отдельный лимит: `MAX_CLASS_SKILLS = 6`
- Start нода не расходует очки

## Пулы нод (skill-node-defs.ts)

### MINOR_POOL (16 нод, циклически)

+3-10% к одному стату: damage, critChance, critMulti, hp, goldFind, xpGain, dodge, fire/lightning/cold/pure dmg.

### NOTABLE_POOL (24 ноды, циклически)

+10-35% к одному или двум статам. Примеры:
- "Razor Edge" (+12% Damage)
- "Eagle Eye" (+15% Crit Chance)
- "Blood Frenzy" (+8% Dmg, +15% HP)
- "Precision" (+10% Crit, +10% Dmg)

### KEYSTONE_POOL (8 нод)

Мощные эффекты:
- **Berserker Rage**: +100% Dmg (2x Dmg at low HP)
- **Perfect Aim**: +100% Crit Damage (Crits deal 3x)
- **Undying Will**: +100% HP, -20% Dmg
- **Midas Touch**: +100% Gold Find (2x Gold)
- **Infernal Crown**: +60% Fire Dmg, +20% HP
- **Soul Eater**: +50% HP (Kills heal 5% HP)
- **Chaos Lord**: +50% All Damage
- **Eternal Student**: +200% XP (3x XP)

### CLASS_SKILLS (16 per class)

Уникальные для каждого класса:
- **Samurai**: Lightning + physical, crit-focused (Iaido, Bushido, Windcutter...)
- **Warrior**: Fire + physical, tanky (Shield Wall, Warcry, Heavy Strike...)
- **Mage**: Fire/lightning/cold, elemental diversity (Fireball, Frost Nova, Lightning Bolt...)
- **Archer**: Cold + physical, crit/dodge (Power Shot, Frost Arrow, Hawk Eye...)

## Stat Mapping (STAT_TO_PLAYER)

```
damage       → tapDamage
dps          → tapDamage
critChance   → critChance
critMulti    → critMultiplier
hp           → hp (maxHp)
goldFind     → goldFind
xpGain       → xpGain
dodge        → dodgeChance
fireDmg      → fireDmg
lightningDmg → lightningDmg
coldDmg      → coldDmg
pureDmg      → pureDmg
```

## Вычисление бонусов (computeAllocatedBonuses)

```typescript
// Для каждой allocated ноды суммирует модификаторы:
result = { percent: { tapDamage: 0.23, critChance: 0.15, ... }, flat: {} }
// Применение: finalStat = baseStat * (1 + bonuses.percent[key]) + bonuses.flat[key]
```

## Валидация (skill-tree-validation.ts)

**Используется и на FE (pre-validation) и на BE (authoritative).**

4 проверки:

1. **Start node allocated** — стартовая нода класса должна быть в массиве
2. **Valid IDs** — все ID целые числа в диапазоне [0, tree.nodes.length)
3. **BFS connectivity** — все ноды достижимы от стартовой через другие allocated ноды
4. **Points budget**:
   - outer nodes (не start и не classSkill) <= `level - 1`
   - classSkill nodes <= `MAX_CLASS_SKILLS (6)`

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/skill-tree?characterId` | Получить allocated ноды |
| POST | `/skill-tree/accept` | Сохранить аллокации (body: `{characterId, allocated: number[]}`) |
| POST | `/skill-tree/reset` | Сброс (body: `{characterId}`), стоимость: 100 gold * кол-во нод |

## FE Flow (skill-tree-scene.ts)

1. `mount()` → `buildSkillTree()` (из shared, cached)
2. Загружает `char.allocatedNodes` из стейта
3. Рендерит SVG: emblems → edges → nodes
4. Pan/zoom (pointer + pinch + wheel)
5. **Two-tap interaction**: 1й тап → tooltip, 2й тап → allocate/deallocate
6. Проверки при аллокации:
   - `isReachable(nodeId)` — есть allocated сосед
   - `getOuterUsedCount() < totalPoints` — есть свободные очки
   - `getClassSkillCount() < MAX_CLASS_SKILLS` — лимит класс-скиллов
7. Деаллокация только leaf нод (`isLeaf` проверяет BFS connectivity)
8. **Accept** → FE pre-validation (`validateAllocations`) → `api.skillTree.accept()`
9. **Reset** кнопка → confirm popup → очищает всё до startNode, 100 gold/node
