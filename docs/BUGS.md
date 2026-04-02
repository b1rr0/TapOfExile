# Bugs & Tasks — Tap of Exile

> QA-tester (`qa-tester`) should test each item after the fix is applied.

---

## BUG-0: App doesn't work outside Telegram — add test user mock

**Priority:** Critical (blocker for QA)
**Type:** Bug / Dev tooling
**Description:**
The app requires Telegram WebApp environment to launch (e.g. `window.Telegram.WebApp`). Outside of Telegram the app fails to initialize. Create a mock/bypass for a specific test user so QA can launch the app in a regular browser.

**Requirements:**
- Add a dev/test mode that detects when the app is NOT running inside Telegram
- Create a mock `Telegram.WebApp` object with a hardcoded test user (e.g. `testUserId: 999999999`)
- The mock should only activate in development mode or for a specific test user ID
- Regular users must NOT be able to bypass Telegram auth
- The mock should provide: `initData`, `initDataUnsafe.user`, `ready()`, `expand()`, `close()`, and other used WebApp methods

**QA Test:**
- Open the app in a regular browser (not Telegram) → app should launch with the test user
- Verify that all features work the same as inside Telegram
- Verify that the mock is NOT available in production builds

---

## BUG-1: Stats and skill tree don't update without reconnecting

**Priority:** High
**Type:** Bug
**Description:**
When upgrading character stats or skill tree nodes, changes are not reflected in the app until the user reconnects. The client should refresh data automatically after each character update (stat upgrade, tree node unlock).

**Expected behavior:**
After each character update (stats, tree) the client automatically receives and displays current data without requiring a reconnect.

**QA Test:**
- Open the app, upgrade a stat → verify the value updates immediately
- Unlock a tree node → verify the effect applies immediately
- No reconnect should be required

---

## BUG-2: Increase cooldown for all spells by 4x

**Priority:** Medium
**Type:** Balance
**Description:**
All spells have too short cooldowns. Multiply the CD of every spell by 4.

**QA Test:**
- Record CD of each spell before and after the change
- Verify CD is exactly 4x the original value
- Verify the cooldown timer displays correctly in combat

---

## BUG-3: Adjust skill tree color theme

**Priority:** Low
**Type:** UI
**Description:**
The skill tree color theme on production differs from the test server. The test server version looks correct — align production colors to match.

**QA Test:**
- Visually compare the tree on test vs production after the fix
- Verify node colors, connections, and background are correct

---

## BUG-4: Implement large skill tree

**Priority:** High
**Type:** Feature / Game Design
**Description:**
Read all MD files about balance and mechanics, then implement the full large skill tree.

### Node power rules:

| Node tier | Regular tree (power) | Class shapes 419-422 (power) |
|-----------|---------------------|------------------------------|
| Common    | 1                   | 2                            |
| Medium    | 2                   | 4                            |
| Strong    | 5                   | 8                            |

> "Power" is an abstract X value for balance purposes.

### Node theme rules:

- **All stats within a single shape** must relate to the same sub-type (skill area):
  - If the shape is about damage → all nodes are damage-related
  - If about crit → all nodes are crit-related (crit chance, crit damage)
  - If about magic amplification → all nodes are magic amplification
- **Forbidden** in one shape: crit chance + magic damage
- **Allowed** in one shape: crit chance + crit damage
- Stats don't need to be exact copies, but must not stray far from the shape's theme

### Class affinity:

- The closer a node is to a class, the more its type must match that class
- **Shapes 421, 422, 419, 420** — the most important class shapes, contain core class rules

**QA Test:**
- Verify all nodes follow the theme rules
- Verify node power matches the table above
- Verify class shapes (419-422) have enhanced values
- Verify nodes near a class are thematically appropriate for that class
- Verify no forbidden stat combinations exist within a single shape

---

## BUG-5: Tree stats don't apply in combat / small tree skills missing in Dojo

**Priority:** High
**Type:** Bug
**Description:**
Two related bugs:
1. Skill tree stats must apply in combat — stats from unlocked tree nodes should work
2. Skills from the small tree are not displayed in the Dojo

**Expected behavior:**
- Stats from unlocked tree nodes apply in both combat and Dojo
- Skills from the small tree are visible and functional in Dojo

**QA Test:**
- Unlock a tree node, enter combat → verify the stat is applied
- Unlock a tree node, enter Dojo → verify the stat is applied
- Verify small tree skills appear in Dojo
- Compare displayed character stats with expected values (tree + base)

---

## BUG-6: 5 items can drop after battle instead of max 4

**Priority:** High
**Type:** Bug
**Description:**
After a battle, 5 items can sometimes drop even though the system only has 4 rolls. Maximum should be 4 items.

### Loot rules:
- 4 rolls after battle
- Each roll: 50% chance for an item (from the loot table) and 50% chance for nothing
- Maximum items = 4

**QA Test:**
- Run 50+ battles, record the number of dropped items each time
- Verify that no more than 4 items ever drop
- Verify each roll produces either 1 item or nothing
- Review the code logic: exactly 4 rolls, each with 50/50 chance
