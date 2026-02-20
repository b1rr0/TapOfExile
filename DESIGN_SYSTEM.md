# Tap of Exile — Design System v2.0
## Dead Cells Visual Language

> Dark-navy abyss lit by crimson flame, golden torch-glow, and cyan moonlight.
> Every surface is dungeon-carved stone; every active element bleeds light into the void.
> **NO green.** The palette is: crimson, gold, cyan, purple — like the Dead Cells site itself.

---

## 1. Philosophy

Extracted directly from [dead-cells.com](https://dead-cells.com):

- **Abyss Navy** — backgrounds are deep dark-blue `#101524`, not grey, not pure black
- **Crimson is king** — primary brand accent `#A40239`, used for titles, CTA buttons, danger
- **Gold is readable** — body text and links use warm gold `#F9CF87`, not white
- **Cyan is navigation** — interactive/nav elements use ghostly cyan `#DFFFFE`
- **Purple is magic** — decorative accents, epic rarity, headers `#B9508D`
- **Decorative lines** — headings are flanked by gradient fade-out lines (crimson for h2, gold for h3)
- **No border-radius** on site (0px!) — everything is sharp, pixel-hard, carved
- **Raleway** body font, custom display fonts for headings
- **Tags/badges** use solid crimson `#A40239` bg with 4px radius

---

## 2. Color Tokens

### 2.1 Base Palette (from dead-cells.com + game screenshot)

```
BACKGROUNDS — Abyss Navy
  --ds-bg-void      #080b15     absolute black
  --ds-bg-base      #101524     main bg (from dead-cells.com body)
  --ds-bg-raised    #182038     raised surface — cards, panels
  --ds-bg-panel     #1e2845     elevated — modals, tooltips, sidebar
  --ds-bg-inset     #0c1020     recessed / inset areas

BORDERS — Dungeon Stone
  --ds-border-dim       rgba(255,255,255, 0.06)   barely visible
  --ds-border-mid       rgba(255,255,255, 0.12)   visible edge
  --ds-border-bright    rgba(255,255,255, 0.22)   highlighted
  --ds-border-gold      rgba(249,207,135, 0.35)   gold accent border
  --ds-border-crimson   rgba(164,  2, 57, 0.50)   crimson accent
  --ds-border-cyan      rgba(223,255,254, 0.30)   cyan accent

TEXT — Gold & Bone
  --ds-text-gold     #F9CF87     primary text (gold — Dead Cells main text)
  --ds-text-light    #f9e6c6     light gold — secondary text
  --ds-text-cream    #FFFDD3     cream — headings, bright emphasis
  --ds-text-muted    #888a92     stone grey — disabled, hints
  --ds-text-dead     #3a3d48     charcoal — inactive

CRIMSON — Primary Accent (brand, CTA, titles, danger)
  --ds-crimson          #A40239     brand crimson (exact from site)
  --ds-crimson-bright   #d1394e     hover/light crimson (from buttons)
  --ds-crimson-dark     #832154     deep bordeaux (button bottom-border)
  --ds-crimson-glow     rgba(164, 2, 57, 0.35)

GOLD — Secondary Accent (text, currency, rewards)
  --ds-gold-bright   #F9CF87     primary gold (site text color)
  --ds-gold-mid      #d4963a     aged gold — rare items
  --ds-gold-dim      #7a5520     tarnished
  --ds-gold-glow     rgba(249,207,135, 0.25)

CYAN — Interactive Accent (nav, links, ice, info)
  --ds-cyan          #DFFFFE     ghostly cyan (site nav color)
  --ds-cyan-mid      #4fc3f7     sapphire blue
  --ds-cyan-dim      #1a5a7a     deep ocean
  --ds-cyan-glow     rgba(223,255,254, 0.20)

PURPLE — Magic Accent (epic, spells, decorative)
  --ds-purple        #B9508D     rose-purple (site banner color)
  --ds-purple-bright #c878f8     amethyst
  --ds-purple-dim    #6a2a5a     deep purple
  --ds-purple-glow   rgba(185, 80,141, 0.25)

RED — Danger / HP (distinct from crimson brand)
  --ds-red-bright    #ff3333     fresh blood — critical
  --ds-red-mid       #cc2222     dark blood — HP bar
  --ds-red-dim       #7a1515     dried blood
  --ds-red-glow      rgba(220, 40, 40, 0.30)

DAMAGE ELEMENTS
  --ds-fire       #ff5a1f     molten orange
  --ds-ice        #60c8f0     frozen cyan
  --ds-lightning  #c8a0ff     purple arc
  --ds-physical   #a09080     grey steel
  --ds-pure       #e878f8     arcane pink
  --ds-poison     #b9508d     toxic purple (NOT green!)

RARITY TIERS
  --ds-rarity-common     #888a92     grey stone
  --ds-rarity-rare       #4fc3f7     sapphire
  --ds-rarity-epic       #c878f8     amethyst
  --ds-rarity-legendary  #F9CF87     gold (matches text)
  --ds-rarity-boss       #ff5a1f     boss orange
```

### 2.2 Semantic Aliases

```
--ds-color-hp        var(--ds-red-mid)
--ds-color-hp-low    var(--ds-red-bright)
--ds-color-xp        var(--ds-cyan-mid)      XP is CYAN now, not green
--ds-color-mana      var(--ds-purple-bright)
--ds-color-gold      var(--ds-gold-bright)
--ds-color-active    var(--ds-cyan)           active = cyan glow
--ds-color-inactive  var(--ds-text-dead)
--ds-color-danger    var(--ds-crimson)
--ds-color-positive  var(--ds-cyan-mid)       positive = blue
--ds-color-crit      #ff7700
```

---

## 3. Typography

Dead Cells site uses **custom display fonts** for titles and **Raleway** for body.
Our adaptation uses **Cinzel** (serif display) + **Raleway/Inter** (body).

```
FONT FAMILIES
  --ds-font-title   'Cinzel', 'Trajan Pro', serif
  --ds-font-body    'Raleway', 'Inter', system-ui, sans-serif
  --ds-font-mono    'JetBrains Mono', 'Courier New', monospace

SCALE
  --ds-text-xs    10px     tiny labels, cooldown timers
  --ds-text-sm    12px     stat labels, badges
  --ds-text-base  14px     body text
  --ds-text-md    16px     medium emphasis
  --ds-text-lg    20px     section titles
  --ds-text-xl    28px     page titles, boss names
  --ds-text-2xl   40px     loading screen, hero banners

WEIGHTS
  --ds-weight-normal  400
  --ds-weight-medium  500
  --ds-weight-bold    700
  --ds-weight-black   800

LETTER SPACING
  --ds-tracking-tight    -0.02em
  --ds-tracking-normal    0
  --ds-tracking-wide      0.05em
  --ds-tracking-widest    0.12em     ALL CAPS labels
```

### Typography Usage

| Use Case           | Font          | Size       | Weight | Color            | Tracking |
|--------------------|---------------|------------|--------|------------------|----------|
| Hero / Boss title  | `font-title`  | `text-2xl` | black  | `--ds-crimson`   | wide     |
| Page heading       | `font-title`  | `text-xl`  | bold   | `--ds-text-cream`| wide     |
| Section title      | `font-title`  | `text-lg`  | bold   | `--ds-text-cream`| normal   |
| Card title         | `font-title`  | `text-md`  | bold   | `--ds-text-gold` | normal   |
| Body text          | `font-body`   | `text-base`| normal | `--ds-text-gold` | tight    |
| Stat value         | `font-mono`   | `text-base`| bold   | `--ds-text-light`| normal   |
| Stat label / badge | `font-body`   | `text-sm`  | medium | `--ds-text-muted`| widest   |
| Cooldown / tiny    | `font-mono`   | `text-xs`  | bold   | `--ds-text-light`| normal   |

---

## 4. Spacing & Sizing

```
SPACING
  --ds-space-1    4px
  --ds-space-2    8px
  --ds-space-3    12px
  --ds-space-4    16px
  --ds-space-5    20px
  --ds-space-6    24px
  --ds-space-8    32px
  --ds-space-10   40px
  --ds-space-12   48px

BORDER RADIUS
  --ds-radius-none   0         Dead Cells default — SHARP edges
  --ds-radius-sm     3px       subtle soften (tags, badges, inputs)
  --ds-radius-md     6px       buttons, panels
  --ds-radius-lg     10px      modals, large cards
  --ds-radius-pill   999px     pill badges only

BORDER WIDTH
  --ds-border-1   1px
  --ds-border-2   2px
  --ds-border-3   3px          active/selected thick

LAYOUT
  --ds-game-width   480px      Telegram mini-app
  --ds-wiki-max    1280px      Wiki max-width
```

---

## 5. Shadows & Glow

Dead Cells: active elements emit colored light. Everything else is dark and flat.

```
SHADOWS (depth)
  --ds-shadow-sm     0 2px 8px  rgba(0,0,0, 0.60)
  --ds-shadow-md     0 4px 16px rgba(0,0,0, 0.75)       matches dead-cells.com
  --ds-shadow-lg     0 8px 32px rgba(0,0,0, 0.85)
  --ds-shadow-inset  inset 0 2px 8px rgba(0,0,0, 0.50)

GLOW (colored light emission)
  --ds-glow-crimson  0 0 12px rgba(164, 2, 57, 0.45), 0 0 24px rgba(164, 2, 57, 0.20)
  --ds-glow-gold     0 0 12px rgba(249,207,135, 0.40), 0 0 24px rgba(249,207,135, 0.18)
  --ds-glow-cyan     0 0 12px rgba(223,255,254, 0.35), 0 0 24px rgba(223,255,254, 0.15)
  --ds-glow-purple   0 0 12px rgba(185, 80,141, 0.35), 0 0 24px rgba(185, 80,141, 0.15)
  --ds-glow-red      0 0 12px rgba(220, 40, 40, 0.40), 0 0 24px rgba(220, 40, 40, 0.20)
  --ds-glow-blue     0 0 12px rgba( 79,195,247, 0.35), 0 0 24px rgba( 79,195,247, 0.15)

TEXT GLOW
  --ds-text-glow-crimson  0 0 8px rgba(164, 2, 57, 0.60)
  --ds-text-glow-gold     0 0 8px rgba(249,207,135, 0.50)
  --ds-text-glow-cyan     0 0 8px rgba(223,255,254, 0.50)
  --ds-text-glow-white    0 0 8px rgba(255,255,255, 0.40)
```

---

## 6. Decorative Elements

### Heading Lines (from dead-cells.com)

Dead Cells uses gradient fade-out lines before/after headings:

```css
/* h2 — Crimson horizontal lines */
.ds-heading-crimson::before,
.ds-heading-crimson::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(164,2,57,0), rgba(164,2,57,0.5));
}
.ds-heading-crimson::after {
  background: linear-gradient(to left, rgba(164,2,57,0), rgba(164,2,57,0.5));
}

/* h3 — Gold horizontal lines */
.ds-heading-gold::before,
.ds-heading-gold::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(249,207,135,0), rgba(249,207,135,0.4));
}
```

### Dividers

```css
/* Dashed stone divider (from patch notes list items) */
.ds-divider {
  border: none;
  border-top: 1px dashed #263151;
  margin: var(--ds-space-3) 0;
}

/* Solid crimson divider */
.ds-divider--crimson {
  border-top: 2px solid var(--ds-crimson);
}
```

### Blockquotes

```css
.ds-blockquote {
  border-left: 2px solid rgba(249,207,135, 0.4);
  padding-left: 12px;
  color: var(--ds-text-light);
  font-style: italic;
}
```

---

## 7. Animation & Transitions

Snappy and impactful. No floaty eases.

```
DURATIONS
  --ds-anim-instant   80ms      button press
  --ds-anim-fast     150ms      state transition
  --ds-anim-mid      300ms      panel open/close
  --ds-anim-slow     600ms      death, victory

EASING
  --ds-ease-sharp    cubic-bezier(0.25, 0, 0, 1)
  --ds-ease-punch    cubic-bezier(0.5, 0, 0.2, 1.4)
  --ds-ease-out      ease-out
```

### Motion Rules

| Interaction      | Duration | Easing     | Effect               |
|------------------|----------|------------|----------------------|
| Button press     | 80ms     | linear     | scale(0.92)          |
| Hover state      | 150ms    | ease-out   | border glow + shift  |
| Panel open       | 300ms    | ease-out   | slide + fade         |
| Scene transition | 300ms    | ease-out   | opacity fade         |
| HP bar change    | 200ms    | ease-out   | width transition     |
| XP bar fill      | 400ms    | ease-out   | smooth fill          |
| Death / Victory  | 600ms    | ease-out   | full overlay fade    |
| Damage flash     | 80ms+200ms| linear+out| flash in, decay out  |

---

## 8. Unified Components

### 8.1 Buttons

**Primary** = Crimson CTA (like dead-cells.com "WHERE TO BUY" button)
**Secondary** = Gold outline (navigation actions)
**Danger** = Red (destructive/death)
**Ghost** = Transparent with cyan text (links/nav)

```css
/* PRIMARY — Crimson CTA (matches dead-cells.com bigButton) */
.ds-btn-primary {
  background: linear-gradient(180deg, #d1394e 50%, #cd2f46 50%);
  border: none;
  border-bottom: 4px solid #832154;
  color: #fff;
  font-family: var(--ds-font-title);
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-black);
  letter-spacing: var(--ds-tracking-wide);
  text-transform: uppercase;
  padding: var(--ds-space-3) var(--ds-space-6);
  box-shadow: var(--ds-shadow-md);
  cursor: pointer;
  transition: all var(--ds-anim-fast);
}
.ds-btn-primary:hover {
  background: linear-gradient(180deg, #d64d60 50%, #d24459 50%);
}
.ds-btn-primary:active {
  transform: scale(0.94) translateY(2px);
  border-bottom-width: 2px;
  box-shadow: none;
}
.ds-btn-primary:disabled {
  background: var(--ds-bg-panel);
  border-color: var(--ds-border-dim);
  color: var(--ds-text-dead);
  box-shadow: none;
}

/* SECONDARY — Gold outline */
.ds-btn-secondary {
  background: transparent;
  border: 1px solid var(--ds-border-gold);
  color: var(--ds-gold-bright);
  font-family: var(--ds-font-body);
  font-size: var(--ds-text-base);
  font-weight: var(--ds-weight-medium);
  padding: var(--ds-space-3) var(--ds-space-5);
  transition: all var(--ds-anim-fast);
}
.ds-btn-secondary:hover {
  background: rgba(249,207,135, 0.08);
  border-color: var(--ds-gold-bright);
  box-shadow: var(--ds-glow-gold);
}
.ds-btn-secondary:active {
  transform: scale(0.94);
}

/* DANGER — Blood red */
.ds-btn-danger {
  background: rgba(180, 20, 20, 0.15);
  border: 1px solid var(--ds-red-bright);
  color: var(--ds-red-bright);
  padding: var(--ds-space-3) var(--ds-space-5);
  transition: all var(--ds-anim-fast);
}
.ds-btn-danger:hover {
  background: rgba(180, 20, 20, 0.30);
  box-shadow: var(--ds-glow-red);
}

/* GHOST — Cyan text (nav style) */
.ds-btn-ghost {
  background: transparent;
  border: none;
  color: var(--ds-cyan);
  font-size: var(--ds-text-base);
  cursor: pointer;
  transition: color var(--ds-anim-fast);
}
.ds-btn-ghost:hover {
  color: var(--ds-gold-bright);
  text-shadow: var(--ds-text-glow-gold);
}

/* ICON BUTTON — small square (back, close, menu) */
.ds-btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 21, 36, 0.85);
  border: 1px solid var(--ds-border-mid);
  color: var(--ds-text-gold);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--ds-anim-fast);
  -webkit-tap-highlight-color: transparent;
}
.ds-btn-icon:active {
  transform: scale(0.88);
  background: rgba(164, 2, 57, 0.20);
  border-color: var(--ds-border-crimson);
}
```

### 8.2 Close Button (unified X)

```css
/* Universal close button — top-right corner */
.ds-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(164, 2, 57, 0.15);
  border: 1px solid rgba(164, 2, 57, 0.40);
  color: #ff6b6b;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--ds-anim-fast);
}
.ds-close::before {
  content: '\2715';  /* Unicode X */
}
.ds-close:active {
  transform: scale(0.85);
  background: rgba(164, 2, 57, 0.35);
}
```

### 8.3 Back Button (unified arrow)

```css
/* Universal back button — top-left corner */
.ds-back {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 21, 36, 0.85);
  border: 1px solid var(--ds-border-mid);
  color: var(--ds-cyan);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--ds-anim-fast);
}
.ds-back::before {
  content: '\2190';  /* Unicode left arrow */
}
.ds-back:active {
  transform: scale(0.88);
  background: rgba(223, 255, 254, 0.10);
  border-color: var(--ds-border-cyan);
}
```

### 8.4 Cards / Panels

```css
/* BASE CARD */
.ds-card {
  background: var(--ds-bg-raised);
  border: 1px solid var(--ds-border-dim);
  padding: var(--ds-space-5);
  box-shadow: var(--ds-shadow-md);
  transition: border-color var(--ds-anim-fast), box-shadow var(--ds-anim-fast);
}
.ds-card:hover {
  border-color: var(--ds-border-gold);
  box-shadow: var(--ds-glow-gold);
}

/* CARD with rarity border */
.ds-card--legendary { border-color: var(--ds-border-gold); box-shadow: var(--ds-glow-gold); }
.ds-card--epic      { border-color: rgba(200,120,248, 0.35); box-shadow: var(--ds-glow-purple); }
.ds-card--danger    { border-color: var(--ds-border-crimson); box-shadow: var(--ds-glow-crimson); }

/* GAME PANEL (overlay, blur) */
.ds-panel {
  background: linear-gradient(180deg, var(--ds-bg-panel) 0%, var(--ds-bg-inset) 100%);
  border: 1px solid var(--ds-border-mid);
  box-shadow: var(--ds-shadow-lg);
  backdrop-filter: blur(8px);
}
```

### 8.5 Bars (HP, XP, Mana)

```css
/* BASE BAR */
.ds-bar {
  height: 10px;
  background: var(--ds-bg-inset);
  overflow: hidden;
  position: relative;
}
.ds-bar__fill {
  height: 100%;
  transition: width var(--ds-anim-mid) ease-out;
}

/* HP — red gradient */
.ds-bar--hp .ds-bar__fill {
  background: linear-gradient(90deg, var(--ds-red-dim), var(--ds-red-mid));
  box-shadow: inset 0 1px 0 rgba(255,100,100, 0.3);
}
.ds-bar--hp.is-low .ds-bar__fill {
  background: var(--ds-red-bright);
  box-shadow: var(--ds-glow-red);
  animation: ds-pulse 1s ease-in-out infinite;
}

/* XP — CYAN gradient (not green) */
.ds-bar--xp .ds-bar__fill {
  background: linear-gradient(90deg, var(--ds-cyan-dim), var(--ds-cyan-mid));
  box-shadow: inset 0 1px 0 rgba(79,195,247, 0.3);
}

/* MANA — purple */
.ds-bar--mana .ds-bar__fill {
  background: linear-gradient(90deg, var(--ds-purple-dim), var(--ds-purple-bright));
}

@keyframes ds-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}
```

### 8.6 Badges / Tags

Dead Cells site uses solid crimson badges (`background: #A40239; border-radius: 4px`).

```css
.ds-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: var(--ds-font-body);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--ds-tracking-widest);
}

/* Default (crimson, like "alpha branch" tags on site) */
.ds-badge--default  { background: #A40239; color: #fff; }
.ds-badge--gold     { background: rgba(249,207,135, 0.15); border: 1px solid rgba(249,207,135, 0.30); color: var(--ds-gold-bright); }
.ds-badge--cyan     { background: rgba(79,195,247, 0.12); border: 1px solid rgba(79,195,247, 0.30); color: var(--ds-cyan-mid); }
.ds-badge--purple   { background: rgba(185,80,141, 0.15); border: 1px solid rgba(185,80,141, 0.30); color: var(--ds-purple); }

/* Rarity */
.ds-badge--common    { background: rgba(136,138,146, 0.12); border: 1px solid rgba(136,138,146, 0.25); color: var(--ds-rarity-common); }
.ds-badge--rare      { background: rgba(79,195,247, 0.12); border: 1px solid rgba(79,195,247, 0.25); color: var(--ds-rarity-rare); }
.ds-badge--epic      { background: rgba(200,120,248, 0.12); border: 1px solid rgba(200,120,248, 0.25); color: var(--ds-rarity-epic); }
.ds-badge--legendary { background: rgba(249,207,135, 0.12); border: 1px solid rgba(249,207,135, 0.25); color: var(--ds-rarity-legendary); box-shadow: var(--ds-glow-gold); }
.ds-badge--boss      { background: rgba(255,90,31, 0.12); border: 1px solid rgba(255,90,31, 0.25); color: var(--ds-rarity-boss); }

/* Elements */
.ds-badge--fire      { background: rgba(255,90,31, 0.10); color: var(--ds-fire); }
.ds-badge--ice       { background: rgba(96,200,240, 0.10); color: var(--ds-ice); }
.ds-badge--lightning { background: rgba(200,160,255, 0.10); color: var(--ds-lightning); }
.ds-badge--physical  { background: rgba(160,144,128, 0.10); color: var(--ds-physical); }
.ds-badge--poison    { background: rgba(185,80,141, 0.10); color: var(--ds-purple); }
```

### 8.7 Action Slot (Game)

```css
.ds-action-slot {
  width: 56px;
  height: 56px;
  background: linear-gradient(180deg, var(--ds-bg-raised), var(--ds-bg-inset));
  border: 2px solid var(--ds-border-mid);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all var(--ds-anim-fast);
}

.ds-action-slot.is-ready {
  border-color: var(--ds-cyan-dim);
  box-shadow: var(--ds-glow-cyan);
}
.ds-action-slot.is-cooldown {
  opacity: 0.5;
  border-color: var(--ds-border-dim);
}
.ds-action-slot:active {
  transform: scale(0.88);
  border-color: var(--ds-cyan);
  box-shadow: 0 0 20px rgba(223,255,254, 0.45);
}
```

### 8.8 Tooltip

```css
.ds-tooltip {
  background: linear-gradient(180deg, var(--ds-bg-panel), var(--ds-bg-inset));
  border: 1px solid var(--ds-border-mid);
  padding: var(--ds-space-4);
  box-shadow: var(--ds-shadow-lg);
  max-width: 240px;
}
.ds-tooltip__name {
  font-family: var(--ds-font-title);
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-text-cream);
}
.ds-tooltip__type {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--ds-tracking-widest);
}
.ds-tooltip__stat-label { color: var(--ds-text-muted); }
.ds-tooltip__stat-value { color: var(--ds-text-gold); font-weight: bold; }
.ds-tooltip__stat-value.is-positive { color: var(--ds-cyan-mid); }
.ds-tooltip__stat-value.is-negative { color: var(--ds-red-bright); }
```

### 8.9 Tables (Wiki)

```css
.ds-table thead th {
  background: var(--ds-bg-inset);
  color: var(--ds-text-muted);
  font-size: var(--ds-text-xs);
  text-transform: uppercase;
  letter-spacing: var(--ds-tracking-widest);
  border-bottom: 1px solid var(--ds-border-mid);
}
.ds-table tbody td {
  border-bottom: 1px dashed #263151;  /* matches dead-cells.com divider */
  color: var(--ds-text-gold);
}
.ds-table tbody tr:hover td {
  background: rgba(249,207,135, 0.04);
}
```

---

## 9. Iconography

### Unified Icon System

All icons use the same styling rules across both frontends:

| Context        | Symbol | Color               | Size |
|----------------|--------|---------------------|------|
| Close / X      | `\2715` (✕) | `--ds-red-bright` | 16px |
| Back / Arrow   | `\2190` (←) | `--ds-cyan`       | 18px |
| HP / Health    | `\2665` (♥) | `--ds-red-mid`    | 16px |
| Death          | `\2620` (☠) | `--ds-crimson`    | 20px |
| XP / Progress  | `\2726` (✦) | `--ds-cyan-mid`   | 16px |
| Gold / Currency| `\25C6` (◆) | `--ds-gold-bright`| 16px |
| Skill / Power  | `\26A1` (⚡)| `--ds-purple-bright`| 18px|
| Equipment      | `\2694` (⚔) | `--ds-physical`   | 18px |
| Fire           | `\1F525` (flame)| `--ds-fire`    | 16px |
| Ice            | `\2744` (❄) | `--ds-ice`        | 16px |
| Boss           | `\1F441` (eye)| `--ds-rarity-boss`| 20px |
| Legendary      | `\2605` (★) | `--ds-gold-bright`| 16px |
| Check / OK     | `\2713` (✓) | `--ds-cyan-mid`   | 16px |
| Warning        | `\26A0` (⚠) | `--ds-gold-bright`| 18px |
| Info           | `\2139` (i) | `--ds-cyan`       | 16px |
| Settings / Gear| `\2699` (⚙) | `--ds-text-muted` | 18px |

---

## 10. State System

```
State       Visual Signal
──────────────────────────────────────────────────
Default     dim border, flat bg, gold text
Hover       gold border glow, subtle bg lighten
Active      scale(0.92), crimson flash, instant
Disabled    50% opacity, no glow, cursor:default
Focus       1px cyan ring offset (keyboard nav)
Loading     pulsing opacity 0.5 -> 1, 1.2s loop
Error       crimson border + crimson glow
Success     cyan border + cyan glow flash -> normal
Selected    gold border + gold glow, bg lighten
```

---

## 11. Implementation

### File Structure

```
TapOfExile/
  shared/
    design-tokens.css    -- single source of truth for all --ds-* vars
  bot/src/
    style.css            -- imports tokens, uses --ds-* + legacy aliases
  wiki/src/styles/
    global.css           -- imports tokens, uses --ds-* + legacy aliases
  DESIGN_SYSTEM.md       -- this file
```

### Legacy Token Mapping

```
BOT (--game-* -> --ds-*)
  --game-accent         -> --ds-crimson
  --game-accent2        -> --ds-text-cream
  --game-gold           -> --ds-gold-bright
  --game-bg             -> --ds-bg-base
  --game-bg2            -> --ds-bg-raised
  --game-bg3            -> --ds-bg-panel
  --game-text           -> --ds-text-gold
  --game-muted          -> --ds-text-muted
  --game-border         -> --ds-border-dim
  --game-border-active  -> --ds-border-gold
  --game-hp-fill        -> --ds-red-mid
  --game-green          -> --ds-cyan-mid  (green is now cyan!)

WIKI (--accent-* -> --ds-*)
  --accent-primary      -> --ds-crimson
  --accent-secondary    -> --ds-crimson-dark
  --accent-gold         -> --ds-gold-bright
  --bg-primary          -> --ds-bg-base
  --bg-card             -> --ds-bg-raised
  --text-primary        -> --ds-text-gold
```

---

## 12. Dead Cells Checklist

When building ANY UI element, verify:

- [ ] Background is **navy-dark** (#101524), not grey or pure black?
- [ ] Primary text is **warm gold** (#F9CF87), not cold white?
- [ ] CTA buttons use **crimson gradient** with bottom-border shadow?
- [ ] Navigation uses **cyan** text?
- [ ] Active states have **colored glow** not just color shift?
- [ ] HP is **red**, XP is **cyan**, mana is **purple**?
- [ ] Headings use **decorative gradient lines** (crimson or gold)?
- [ ] Badges use **solid crimson** background like dead-cells.com tags?
- [ ] Borders are minimal, sharp, no rounded corners by default?
- [ ] Transitions are **snappy** (under 200ms)?
- [ ] Does it feel like a **dark dungeon**, not a modern dashboard?
- [ ] Is there **NO GREEN** anywhere?

---

*Last updated: 2026-02-20 | Version 2.0 | Dead Cells Palette — Crimson / Gold / Cyan / Purple*
