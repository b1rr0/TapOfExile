# 08 — Combat Flow (полный цикл боя)

> Описание всей системы боя: клиент (bot), сервер (NestJS + Redis),
> WebSocket-ивенты, анимации, тайминги.

---

## Оглавление

1. [Архитектура](#1-архитектура)
2. [Подключение сокета](#2-подключение-сокета)
3. [Старт боя](#3-старт-боя)
4. [Loading Run → Combat Ready](#4-loading-run--combat-ready)
5. [Entrance (выход монстра)](#5-entrance-выход-монстра)
6. [Серверный Combat Loop](#6-серверный-combat-loop)
7. [Тап игрока (атака)](#7-тап-игрока-атака)
8. [Смерть монстра → Следующий монстр](#8-смерть-монстра--следующий-монстр)
9. [Завершение боя (Complete)](#9-завершение-боя-complete)
10. [Смерть игрока](#10-смерть-игрока)
11. [Побег (Flee)](#11-побег-flee)
12. [Disconnect / Reconnect](#12-disconnect--reconnect)
13. [Система атак монстра](#13-система-атак-монстра)
14. [Элементальный урон](#14-элементальный-урон)
15. [Анимации и рендер](#15-анимации-и-рендер)
16. [Socket Events — полный список](#16-socket-events--полный-список)
17. [Ключевые тайминги](#17-ключевые-тайминги)
18. [Redis-сессия (структура)](#18-redis-сессия-структура)
19. [Timeline диаграммы](#19-timeline-диаграммы)

---

## 1. Архитектура

```
┌──────────────┐  Socket.IO /combat   ┌──────────────────┐
│   Bot (Vite) │ ◄──────────────────► │  Server (NestJS) │
│              │                       │                  │
│ combat.ts    │                       │ combat.gateway   │
│ battle-scene │                       │ combat.service   │
│ characters/* │                       │ level-gen        │
│              │                       │ elemental-damage │
└──────────────┘                       └────────┬─────────┘
                                                │
                                       ┌────────▼─────────┐
                                       │   Redis (ioredis) │
                                       │  combat:session:* │
                                       │  TTL = 30 min     │
                                       └──────────────────┘
```

**Ключевой принцип**: сервер — авторитетен. Весь урон (и от игрока, и от монстра)
считается на сервере. Клиент — тонкий слой визуализации.

### Файлы

| Роль | Путь |
|------|------|
| Клиент: менеджер боя | `bot/src/game/combat.ts` |
| Клиент: сцена + спрайты | `bot/src/ui/battle-scene.ts` |
| Клиент: герой | `bot/src/ui/characters/hero-character.ts` |
| Клиент: враг | `bot/src/ui/characters/enemy-character.ts` |
| Клиент: базовый персонаж | `bot/src/ui/characters/character.ts` |
| Клиент: сокет-подключение | `bot/src/combat-socket.ts` |
| Сервер: gateway (WS) | `server/src/combat/combat.gateway.ts` |
| Сервер: сервис (логика) | `server/src/combat/combat.service.ts` |
| Сервер: элементальный урон | `server/src/combat/elemental-damage.ts` |
| Сервер: генерация монстров | `server/src/level-gen/level-gen.service.ts` |
| Shared: баланс | `shared/balance.ts` |
| Shared: атаки монстров | `shared/monster-attacks.ts` |
| Shared: стата классов | `shared/class-stats.ts` |

---

## 2. Подключение сокета

**Файл**: `bot/src/combat-socket.ts`

```
getSocket() → io(WS_URL/combat, { auth: { token: JWT }, transports: ["polling","websocket"] })
waitForConnection(socket, 8000ms) → Promise<void>
```

- Singleton-сокет — переиспользуется между боями
- `transports: ["polling", "websocket"]` + `upgrade: true`
- Реконнект: 5 попыток с 500ms задержкой
- Timeout подключения: 5000ms

**Сервер (auth)**: `combat.gateway.ts` → `handleConnection()`
- Извлекает JWT из `client.handshake.auth.token`
- Верифицирует: `payload.type === 'access'`
- Маппит: `socketId ↔ telegramId`
- Отключает при ошибке авторизации

---

## 3. Старт боя

### Клиент → Сервер

```
socket.emit("combat:start-location", {
  locationId, waves, order, act
})
```

или для карты:

```
socket.emit("combat:start-map", {
  mapKeyItemId, direction?
})
```

### Сервер (combat.service.ts → startLocation / startMapByDto)

1. Очистка стейл-сессии (`cleanupStaleSession`)
2. Валидация доступа к локации (prerequisite)
3. Генерация очереди монстров: `levelGen.buildMonsterQueue(waves, order, act)`
4. Создание Redis-сессии (см. [структура](#18-redis-сессия-структура))
5. `lastEnemyAttackTime = Date.now()`
6. `nextAttackIn = getFirstAttackDelay(queue[0])`
7. Сохранение в Redis (TTL = 1800с = 30 мин)

### Сервер → Клиент

```
socket.emit("combat:started", {
  sessionId,
  totalMonsters,
  currentMonster,    // первый монстр
  playerHp,
  playerMaxHp,
})
```

**Важно**: combat loop НЕ стартует здесь. Он стартует только после `combat:entrance-done`.

### Клиент (combat.ts → startLocation callback)

1. Сохраняет `_sessionId`, `_totalMonsters`, `_playerHp`
2. Эмитит `"playerHpChanged"` → UI обновляет полоску HP
3. Эмитит `"locationWaveProgress"` → `{ current: 0, total }`
4. Эмитит `"combatReady"` → battle-scene вызывает `stopLoadingRun()`
5. Вызывает `_setMonsterFromServer(result.currentMonster)` → эмитит `"monsterSpawned"`

---

## 4. Loading Run → Combat Ready

### Loading Run (до подключения к серверу)

**Файл**: `battle-scene.ts`

Пока WebSocket подключается и сервер создаёт сессию, герой бежит:

- `_loadingRunActive = true` (при создании BattleScene)
- Герой играет анимацию `"run"`
- Враг скрыт (`_visible = false`)
- Фон скроллится вперёд: 120 px/s
- Текст "Loading..." с анимированными точками
- Автостоп через 10 секунд

### Combat Ready

Когда приходит `"combat:started"`:
1. Эмитится `"combatReady"`
2. `stopLoadingRun()`:
   - `_loadingRunActive = false`
   - Герой → `play("idle")`
   - Враг → `resetState()`
   - Камера → `snapCamera(0)`

---

## 5. Entrance (выход монстра)

### Триггер

Ивент `"monsterSpawned"` → `_onMonsterSpawned()`:

1. Обновляет имя монстра + редкость
2. Обновляет HP-бар
3. Показывает monster-info
4. **Если спрайты загружены**: `enemy.spawn()` + `_startEntrance()`
5. **Если спрайтов нет**: сразу `emit("entranceDone")`

### Анимация входа

**Enemy (enemy-character.ts → spawn)**:
- Сброс позиции
- Начало слайда с правого края: offset=400px, speed=700 px/s
- Длительность слайда: `400 / 700 ≈ 571ms`
- Анимация: `"idle"` (играет пока едет)

**Hero (battle-scene.ts → _startEntrance)**:
- `hero.runEntrance()` → анимация `"run"`
- Камера панорамирует по прогрессу волны

**Длительность хореографии**: `_entranceDuration = 1.2с`

Вход завершается когда: `elapsed >= 1.2s` **И** камера перестала панорамировать.

### Отмена входа тапом

Если игрок тапает во время entrance:
1. `_entranceActive = false`
2. Камера снэпится к целевой позиции
3. Сразу эмитится `"entranceDone"`

### entranceDone → Сервер

```
Клиент: events.emit("entranceDone")
  → combat.ts: signalEntranceDone()
    → socket.emit("combat:entrance-done", { sessionId })
```

**Сервер (handleEntranceDone)**:
1. Проверяет `combatLoops.has(sessionId)` — если цикл уже бежит, игнорирует
2. Сбрасывает `session.lastEnemyAttackTime = Date.now()`
3. Стартует `startCombatLoop(sessionId, telegramId)`

**Это значит**: первая атака монстра произойдёт через `nextAttackIn` мс
после окончания entrance (обычно ~1000ms).

---

## 6. Серверный Combat Loop

**Файл**: `combat.gateway.ts → startCombatLoop()`

```
setInterval(async () => {
  result = combatService.processEnemyTick(sessionId)
  if (result.attacks.length > 0) → emit "combat:enemy-attack"
  if (result.playerDead) → stopLoop + emit "combat:player-died"
}, 200)  // 200ms тик = 5 тиков/сек
```

### processEnemyTick (combat.service.ts)

1. Загружает сессию из Redis
2. Загружает Character из PostgreSQL (для dodge/block/resistance)
3. Вызывает `processEnemyAttacks(session, char, Date.now())`
4. Сохраняет сессию обратно в Redis
5. Возвращает массив атак + текущее HP игрока

### processEnemyAttacks — система timeBank

```
elapsed = now - lastEnemyAttackTime
timeBank = elapsed

while (timeBank >= nextAttackIn && attackCount < MAX_PENDING_ATTACKS) {
  timeBank -= nextAttackIn

  1. Выбрать атаку из пула (pickRandomAttack по весам)
  2. Dodge check (Math.random() < char.dodgeChance)
  3. Block check (Warrior special: Math.random() < char.specialValue)
  4. Рассчитать урон (elemental system)
  5. Применить урон: session.playerCurrentHp -= damage
  6. Рассчитать nextAttackIn для следующей атаки
}

lastEnemyAttackTime = now - timeBank  // сохранить остаток
```

**MAX_PENDING_ATTACKS = 10** — анти-AFK кап (не больше 10 атак за один тик).

---

## 7. Тап игрока (атака)

### Клиент (combat.ts → handleTap)

Guard-условия:
- `_deathCooldown` — между смертью монстра и спавном нового
- `!monster` — нет текущего монстра
- `!_sessionId` — нет сессии
- `_tapping` — предыдущий тап ещё не обработан
- `!_socket` — нет подключения

```
socket.emit("combat:tap", { sessionId })
```

Fallback: `_tapping` сбрасывается через 2000ms если нет ответа.

### Сервер (handleTap → processTap)

1. **Rate limit**: min 50ms между тапами (MIN_TAP_INTERVAL_MS)
2. Загрузка Character из БД (server-authoritative)
3. **Крит**: `Math.random() < char.critChance` → `rawDamage *= critMultiplier`
4. **Элементальный урон**: `computeElementalDamage(rawDamage, damageProfile, monsterResistance)`
5. `monster.currentHp -= breakdown.total`
6. Если `currentHp <= 0`:
   - `killed = true`
   - Начисление gold в session (session.totalGoldEarned)
   - **XP начисляется сразу в Character** (level-scaling, level up inline)
   - `char.xp += scaledXp` → while loop level up → `charRepo.save(char)`
   - `currentIndex++`
   - `lastEnemyAttackTime = now` (сброс для нового монстра)
   - `nextAttackIn = getFirstAttackDelay(nextMonster)`
7. Сохранение сессии в Redis

### Сервер → Клиент

```
socket.emit("combat:tap-result", {
  damage, damageBreakdown, isCrit,
  monsterHp, monsterMaxHp,
  killed, isComplete,
  currentMonster,       // следующий монстр (если killed)
  monstersRemaining,
  playerHp, playerMaxHp, playerDead,
  // Per-kill XP (только при killed=true):
  xpGained,             // сколько XP получено за этого монстра
  leveledUp,            // true если произошёл level up
  level, xp, xpToNext,  // актуальные значения после начисления
})
```

### Gateway после tap-result

```
if (playerDead)     → stopCombatLoop + emit "combat:player-died"
if (killed && !isComplete) → stopCombatLoop  // ← пауза до entrance-done
```

### Клиент после tap-result

1. `_tapping = false`
2. `monster.currentHp = result.monsterHp`
3. Эмит `"damage"` → battle-scene: hero attack anim + enemy shake + HP bar update
4. Эмит `"playerHpChanged"` → UI обновляет HP игрока
5. Если `killed`:
   - Обновляет локальный char (level, xp, xpToNext) из ответа сервера
   - → `_onMonsterDeath(result)`

---

## 8. Смерть монстра → Следующий монстр

### Клиент (_onMonsterDeath)

```
1. _deathCooldown = true         // блокировка тапов
2. _monstersKilled++
3. emit "monsterDied"            // → battle-scene: enemy.die() + gold floater
4. emit "xpGained" { xp }       // → effects: фиолетовый "+N XP" floater
                                 // → combat-log: фиолетовая запись "✦ +N XP"
5. if (leveledUp):
     emit "levelUp" { level }    // → effects: "LEVEL N!" announce
                                 // → HUD: обновление Lv.N
6. emit "xpChanged" { xp, xpToNext }  // → HUD: обновление XP бара
7. emit "locationWaveProgress"

8. setTimeout(SPAWN_DELAY_MS) {  // 1200ms
     if (isComplete) {
       complete()                // завершить бой → gold + loot
     } else {
       _setMonsterFromServer()   // спавн нового
       _deathCooldown = false    // разблокировка тапов
     }
   }
```

### Анимация смерти врага

```
enemy.die():
  1. Играет анимацию "death"
  2. onComplete → startDeath():
     - _deathAlpha уменьшается: dt * 2.5 (≈ 400ms до полного исчезновения)
     - Когда alpha = 0 → _visible = false
```

### Сервер (на handleTap)

При `result.killed && !result.isComplete`:
- **stopCombatLoop(sessionId)** — цикл атак останавливается
- Ждёт `combat:entrance-done` от клиента

### Timeline смены монстра

```
T=0ms     Последний тап убивает монстра
          Сервер: stopCombatLoop()
          Клиент: emit "monsterDied" → анимация смерти

T=0-400ms Анимация смерти врага (death anim + fade)

T=1200ms  Клиент: _setMonsterFromServer() → emit "monsterSpawned"
          → _onMonsterSpawned() → enemy.spawn() + _startEntrance()
          _deathCooldown = false (можно тапать!)

T=1200ms+ Вход нового монстра (слайд: ~571ms, хореография: 1200ms)
          Игрок МОЖЕТ тапать по монстру во время входа

T=2400ms  Entrance завершается (1200ms хореография)
          emit "entranceDone" → сервер: startCombatLoop()
          lastEnemyAttackTime = Date.now()

T=3400ms  Первая атака нового монстра (≈1000ms после entrance)
```

**Итого**: ~2 секунды от смерти до начала атак нового монстра
(1200ms spawn delay + 1200ms entrance). Совпадает с требованием
«2 секунды после смерти прошлого».

---

## 9. Завершение боя (Complete)

### Клиент

```
socket.emit("combat:complete", { sessionId })
// ожидание "combat:completed" (timeout 10s)
```

### Сервер (completeSession)

1. `stopCombatLoop(sessionId)`
2. Проверка: все монстры убиты (`currentIndex >= monsterQueue.length`)
3. **Gold → `PlayerLeague.gold`** (per-league пул, начисляется ТОЛЬКО здесь)
4. **XP уже начислен per-kill** в `processTap()` — НЕ дублируется
5. **Meta stats** → Player (`totalGold, totalKills, totalTaps`)
6. **Location completion** → `char.completedLocations`
7. **Map drops** (для endgame maps): `lootService.rollMapDrops()`
8. **Audit record** → PostgreSQL (`CombatSession` entity, status='completed')
9. **Cleanup Redis**: удаление сессии

### Сервер → Клиент

```
socket.emit("combat:completed", {
  totalGold, totalXp,
  totalTaps, monstersKilled,
  level, xp, xpToNext, gold,
  mapDrops, locationId,
  dailyBonusRemaining,
})
```

---

## 10. Смерть игрока

### Триггер

Серверный combat loop обнаруживает `playerCurrentHp <= 0`:

```
gateway: stopCombatLoop() → combatService.playerDeath() → emit "combat:player-died"
```

Или tap-result с `playerDead = true`:

```
gateway: stopCombatLoop() → playerDeath() → emit "combat:player-died"
```

### playerDeath (combat.service.ts)

1. Сохраняет audit record: `status = 'died'`, `monstersKilled = currentIndex`
2. Удаляет Redis сессию
3. **Gold потерян** — не записан в БД (был только в Redis-сессии)
4. **Loot потерян** — дропы не ролятся
5. **XP сохранён** — уже начислен per-kill в `processTap()`
6. **XP Loss** — штраф опыта при смерти (lvl 40+, см. [02-rewards-after-map.md](./02-rewards-after-map.md))

### Клиент

```
_onPlayerDeath():
  _playerDead = true (guard от double-fire)
  emit "playerDied" → battle-scene: hero death animation
  _sessionId = null
```

---

## 11. Побег (Flee)

```
Клиент: socket.emit("combat:flee", { sessionId })
Сервер: stopCombatLoop() → fleeCombat() → удаление Redis → emit "combat:fled"
```

**Gold потерян, loot потерян. XP сохранён** (уже начислен per-kill).
**XP Loss НЕ применяется** — штраф только при смерти.

---

## 12. Disconnect / Reconnect

### Disconnect (gateway → handleDisconnect)

1. `stopCombatLoop(sessionId)` — пауза атак
2. Запуск grace timer: **30 000ms** (30 секунд)
3. Если timer истекает → `fleeCombat()` (бой потерян)

### Reconnect (gateway → handleReconnect)

1. Отмена grace timer
2. `session.lastEnemyAttackTime = Date.now()` — **прощение** пропущенных атак
3. `startCombatLoop()` — возобновление
4. Отправка текущего состояния клиенту:

```
socket.emit("combat:reconnected", {
  sessionId, currentMonster,
  playerHp, playerMaxHp,
  monstersRemaining, totalMonsters,
})
```

### Клиент (auto-reconnect)

```
socket.on("connect", () => {
  if (_sessionId) socket.emit("combat:reconnect", { sessionId })
})
```

Socket.IO автоматически пытается 5 раз с 500ms задержкой.

---

## 13. Система атак монстра

### Attack Pool

Каждый тип монстра имеет 5 атак (`shared/monster-attacks.ts`):

```typescript
interface MonsterAttack {
  name: string;           // "Slash", "Fire Breath"
  damage: ElementalDamage; // { physical: 0.8, fire: 0.2 }
  damageMul: number;       // 0.3 — 2.5 (множитель к scaledDamage)
  speed: number;           // 0.3 — 3.0 секунд (время подготовки)
  pauseAfter: number;      // 0.2 — 2.0 секунд (пауза после удара)
  weight: number;          // 5 — 40 (вес для random выбора)
}
```

### Выбор атаки (pickRandomAttack)

Взвешенный рандом:
```
totalWeight = sum(attack.weight)
roll = random() * totalWeight
перебор атак: roll -= weight → если roll <= 0, выбрана
```

### Расчёт nextAttackIn

```
nextAttackIn = (текущая_атака.pauseAfter + следующая_атака.speed) * 1000 мс
```

Пример: `pauseAfter=0.5s`, `nextSpeed=1.0s` → `nextAttackIn = 1500ms`

### Первая атака (getFirstAttackDelay)

```
avg = среднее(speed всех атак в пуле) * 1000
```

Fallback (нет атак в пуле): `ENEMY_ATTACK_INTERVAL_MS = 1000ms`

### Dodge / Block

- **Dodge**: `Math.random() < char.dodgeChance` → 0 урона, `nextAttackIn` уменьшен
- **Block** (Warrior special): `Math.random() < char.specialValue` → 0 урона

При dodge/block: `nextAttackIn = (pauseAfter + 0.3) * 1000` (быстрая повторная атака)

---

## 14. Элементальный урон

**Файл**: `server/src/combat/elemental-damage.ts`

### Элементы

| Элемент | Описание |
|---------|----------|
| physical | Базовый физический |
| fire | Огненный |
| lightning | Молния |
| cold | Холод/лёд |
| pure | Чистый (игнорирует сопротивления) |

### Формула

```
Для каждого элемента:
  rawElemDmg = rawDamage * fraction

  если pure:
    finalDmg = floor(rawElemDmg)
  иначе:
    finalDmg = floor(rawElemDmg * (1 - resistance * 0.01))

total = sum(все элементы)
Минимум 1 урона если rawDamage > 0
```

### Resistance cap

`RESISTANCE_CAP = 0.75` (75%) — ни один элемент не может быть сопротивлён больше 75%.

### Rarity бонус к сопротивлениям

| Редкость | Бонус ко всем сопротивлениям |
|----------|------------------------------|
| common | +0% |
| rare | +5% |
| epic | +10% |
| boss | +15% |

---

## 15. Анимации и рендер

### Render Loop (battle-scene.ts)

- **Тик**: `setTimeout` каждые **80ms** (~12.5 FPS)
- **Delta time**: `dt = (now - lastTime) / 1000`, cap 0.2s
- **Порядок отрисовки**: background → hero → enemy

### Анимации персонажей

| Анимация | Описание | Длительность |
|----------|----------|-------------|
| idle | Ожидание | loop |
| run | Бег (entrance) | loop |
| attack1 | Атака | one-shot → idle |
| death | Смерть | one-shot → fade |

### Эффекты

| Эффект | Описание | Тайминг |
|--------|----------|---------|
| Enemy slide-in | Вход справа | 400px / 700px/s ≈ 571ms |
| Enemy shake | При получении удара | decay: 80 px/s |
| Hero shake | При получении удара | shake(4) |
| Death fade | Прозрачность → 0 | dt * 2.5 ≈ 400ms |
| Entrance choreography | Hero run + camera pan | 1200ms |

### HP бар монстра

```
_updateHp(monster):
  pct = (currentHp / maxHp) * 100
  hpBarFill.style.width = pct%
  hpText = "currentHp / maxHp"
```

Стилизация по редкости: `hp-rarity-{common|rare|epic|boss}`

### HP бар игрока

```
_updatePlayerHp(hp, maxHp):
  #player-hp-fill.width = (hp/maxHp * 100)%
  #player-hp-text = "hp / maxHp"
```

---

## 16. Socket Events — полный список

### Клиент → Сервер

| Event | Data | Когда |
|-------|------|-------|
| `combat:start-location` | `{locationId, waves, order, act}` | Начало боя (локация) |
| `combat:start-map` | `{mapKeyItemId, direction?}` | Начало боя (карта) |
| `combat:tap` | `{sessionId}` | Тап по монстру |
| `combat:entrance-done` | `{sessionId}` | Вход монстра завершён |
| `combat:complete` | `{sessionId}` | Завершить и получить награды |
| `combat:flee` | `{sessionId}` | Побег без наград |
| `combat:reconnect` | `{sessionId}` | Восстановление сессии |

### Сервер → Клиент

| Event | Data | Когда |
|-------|------|-------|
| `combat:started` | `{sessionId, totalMonsters, currentMonster, playerHp, playerMaxHp}` | Бой создан |
| `combat:tap-result` | `{damage, isCrit, monsterHp, killed, isComplete, currentMonster, playerHp, xpGained, leveledUp, level, xp, xpToNext, ...}` | Результат тапа (xp per-kill) |
| `combat:enemy-attack` | `{attacks[], playerHp, playerMaxHp, playerDead}` | Атаки врага (каждые ~200ms тик) |
| `combat:player-died` | `{sessionId}` | Игрок умер |
| `combat:completed` | `{totalGold, totalXp, level, xp, xpToNext, gold, mapDrops, dailyBonusRemaining}` | Бой завершён, gold + loot |
| `combat:fled` | `{success}` | Побег подтверждён |
| `combat:reconnected` | `{sessionId, currentMonster, playerHp, ...}` | Сессия восстановлена |
| `combat:error` | `{message}` | Ошибка |

---

## 17. Ключевые тайминги

| Параметр | Значение | Файл |
|----------|----------|------|
| Socket connect timeout | 5000ms | combat-socket.ts |
| waitForConnection timeout | 8000ms | combat-socket.ts |
| Start location/map timeout | 10000ms | combat.ts |
| Complete session timeout | 10000ms | combat.ts |
| Flee timeout | 5000ms | combat.ts |
| **Server combat loop tick** | **200ms** | combat.gateway.ts |
| **ENEMY_ATTACK_INTERVAL_MS** (fallback) | **1000ms** | balance.ts |
| **SPAWN_DELAY_MS** | **1200ms** | balance.ts |
| **Entrance duration** | **1200ms** | battle-scene.ts |
| Enemy slide-in | ~571ms (400px / 700px/s) | enemy-character.ts |
| Death fade | ~400ms (alpha * 2.5/s) | character.ts |
| Render tick | 80ms (~12.5 FPS) | battle-scene.ts |
| Tap rate limit | 50ms min | combat.service.ts |
| Disconnect grace period | 30000ms | combat.gateway.ts |
| Socket reconnect delay | 500ms | combat-socket.ts |
| Redis session TTL | 1800s (30 min) | combat.service.ts |
| MAX_PENDING_ATTACKS | 10 | balance.ts |
| Loading run auto-stop | 10s | battle-scene.ts |
| Loading bg scroll speed | 120 px/s | battle-scene.ts |

---

## 18. Redis-сессия (структура)

**Key**: `combat:session:{uuid}`
**TTL**: 1800 секунд (30 минут)

```typescript
interface RedisCombatSession {
  id: string;                    // UUID v4
  playerId: string;              // telegramId
  characterId: string;           // Character entity ID
  leagueId: string;
  playerLeagueId: string;
  mode: 'location' | 'map' | 'boss_map';

  monsterQueue: ServerMonster[]; // полная очередь монстров
  currentIndex: number;          // индекс текущего монстра (0-based)

  totalGoldEarned: number;       // накопленное золото за бой
  totalXpEarned: number;         // накопленный XP за бой
  totalTaps: number;             // количество тапов
  lastTapTime: number;           // timestamp последнего тапа (rate limit)
  startedAt: number;             // timestamp начала боя

  locationId?: string;           // ID локации
  mapTier?: number;              // уровень карты (endgame)
  bossId?: string;               // ID босса
  direction?: string;            // направление карты

  playerLevel: number;           // уровень игрока при старте (для XP scaling)
  playerCurrentHp: number;       // текущее HP игрока
  playerMaxHp: number;           // максимальное HP игрока
  lastEnemyAttackTime: number;   // timestamp последней обработки атак
  nextAttackIn: number;          // ms до следующей атаки монстра
}
```

---

## 19. Timeline диаграммы

### Полный бой (2 монстра)

```
Клиент                              Сервер                    Redis
  │                                    │                         │
  ├─ emit "start-location" ──────────►│                         │
  │                                    ├─ buildMonsterQueue()   │
  │                                    ├─ create session ──────►│ SET
  │                                    │                         │
  │◄── "combat:started" ──────────────┤                         │
  │                                    │                         │
  ├─ stopLoadingRun()                  │                         │
  ├─ _setMonsterFromServer()           │                         │
  ├─ enemy.spawn() + _startEntrance()  │                         │
  │                                    │                         │
  │  ~~~ entrance animation (1.2s) ~~~ │                         │
  │  (игрок может тапать!)             │                         │
  │                                    │                         │
  ├─ emit "entrance-done" ───────────►│                         │
  │                                    ├─ lastEnemyAttackTime=now│
  │                                    ├─ startCombatLoop() ────│─► GET/SET
  │                                    │  (200ms interval)       │
  │                                    │                         │
  │  ~~~ бой: тапы + вражеские атаки ~~│                         │
  │                                    │                         │
  ├─ emit "tap" ─────────────────────►│                         │
  │                                    ├─ processTap()          │
  │◄── "tap-result" {killed:true} ────┤                         │
  │                                    ├─ stopCombatLoop() ◄────│
  │                                    │  (пауза!)              │
  ├─ emit "monsterDied"                │                         │
  │                                    │                         │
  │  ~~~ SPAWN_DELAY (1200ms) ~~~~~~~~ │                         │
  │                                    │                         │
  ├─ _setMonsterFromServer(next)       │                         │
  ├─ enemy.spawn() + _startEntrance()  │                         │
  │                                    │                         │
  │  ~~~ entrance animation (1.2s) ~~~ │                         │
  │                                    │                         │
  ├─ emit "entrance-done" ───────────►│                         │
  │                                    ├─ lastEnemyAttackTime=now│
  │                                    ├─ startCombatLoop() ────│─► GET/SET
  │                                    │                         │
  │  ~~~ бой: тапы + вражеские атаки ~~│                         │
  │                                    │                         │
  ├─ emit "tap" {killed, isComplete}──►│                         │
  │                                    ├─ XP → char (per-kill)   │
  │                                    ├─ charRepo.save()        │
  │◄── "tap-result" {xpGained,level}──┤                         │
  │                                    ├─ stopCombatLoop()       │
  ├─ "+N XP" floater (фиолетовый)     │                         │
  │                                    │                         │
  │  ~~~ SPAWN_DELAY (1200ms) ~~~~~~~~ │                         │
  │                                    │                         │
  ├─ emit "complete" ────────────────►│                         │
  │                                    ├─ award gold (only)      │
  │                                    ├─ save audit ───────────►│ DEL
  │◄── "combat:completed" ────────────┤                         │
  │                                    │                         │
```

### Disconnect / Reconnect

```
Клиент                              Сервер
  │                                    │
  X  (connection lost)                 │
  │                                    ├─ handleDisconnect()
  │                                    ├─ stopCombatLoop()
  │                                    ├─ start 30s grace timer
  │                                    │
  │  ~~~ до 30 секунд ~~~~~~~~~~~~~~~~ │
  │                                    │
  ├─ (reconnected) ──────────────────►│
  ├─ emit "reconnect" ──────────────►│
  │                                    ├─ cancel grace timer
  │                                    ├─ lastEnemyAttackTime = now (forgive)
  │                                    ├─ startCombatLoop()
  │◄── "combat:reconnected" ──────────┤
  │                                    │
```
