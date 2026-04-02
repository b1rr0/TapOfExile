import { buildSkillTree, getClassStartNode, hexPath, diamondPath, getNodeShape, EMBLEM_RADIUS, NODE_RADIUS, getMaxClassSkills } from "../data/skill-tree.js";
import { validateAllocations } from "@shared/skill-tree-validation";
import { ACTIVE_SKILLS, getSkillScalingType, computeEffectiveSkillLevel, computeSkillLevelGrowth } from "@shared/active-skills";
import type { ActiveSkillDef } from "@shared/active-skills";
import { CLASS_DEFS } from "@shared/class-stats";
import { api } from "../api.js";
import { ProjectileLayer } from "../ui/projectile-layer.js";
import type { SharedDeps, SkillTreeResult, NodeType } from "../types.js";
import type { SkillNode } from "@shared/skill-tree";

/* ── Stats that affect DPS (used for skill impact preview) ── */
const DPS_RELEVANT_STATS = new Set([
  "damage", "tapHit", "critChance", "critMulti",
  "fireDmg", "coldDmg", "lightningDmg", "pureDmg",
  "weaponSpellLevel", "arcaneSpellLevel", "versatileSpellLevel",
  "cooldownReduction",
  "arcaneCritChance", "arcaneCritMulti",
]);

/* ── Weapon stat → equipped subtypes (mirrors server WPN_STAT_TO_SUBTYPES) ── */
const WPN_STAT_SUBTYPES: Record<string, string[]> = {
  swordDmg: ['oh_sword','th_sword'], swordAmp: ['oh_sword','th_sword'],
  axeDmg: ['oh_axe','th_axe'],       axeAmp: ['oh_axe','th_axe'],
  daggerDmg: ['oh_dagger'],          daggerAmp: ['oh_dagger'],
  wandDmg: ['oh_wand'],              wandAmp: ['oh_wand'],
  maceDmg: ['oh_mace','th_mace'],    maceAmp: ['oh_mace','th_mace'],
  bowDmg: ['th_bow'],                bowAmp: ['th_bow'],
  staffDmg: ['th_staff'],            staffAmp: ['th_staff'],
};

const WPN_STAT_NAMES: Record<string, string> = {
  swordDmg: 'Sword', swordAmp: 'Sword', axeDmg: 'Axe', axeAmp: 'Axe',
  daggerDmg: 'Dagger', daggerAmp: 'Dagger', wandDmg: 'Wand', wandAmp: 'Wand',
  maceDmg: 'Mace', maceAmp: 'Mace', bowDmg: 'Bow', bowAmp: 'Bow',
  staffDmg: 'Staff', staffAmp: 'Staff',
};

/* ── Module-level tree cache (built once, shared across all mounts) ── */

let _cachedTree: SkillTreeResult | null = null;
function getTree(): SkillTreeResult {
  if (!_cachedTree) _cachedTree = buildSkillTree();
  return _cachedTree;
}

/* ── Touch distance helper (module-level, no need to be a class method) ── */

function touchDist(t: TouchList): number {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * SkillTreeScene - circular passive skill tree (PoE2-style).
 *
 * Renders an SVG graph with pan + pinch-zoom.
 * Each class has an emblem circle with a class image and 16 class-specific
 * skill nodes inside (max 6 selectable). Outside branches use normal points.
 */
export class SkillTreeScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  _svg: SVGSVGElement | null;
  _graphG: SVGGElement | null;
  _tree: SkillTreeResult | null;

  _vx: number;
  _vy: number;
  _scale: number;
  _dragging: boolean;
  _lastPointer: { x: number; y: number } | null;
  _pinchDist: number | null;

  _allocated: Set<number>;
  _startNodeId: number;
  _classId: string;

  _tooltip: HTMLElement | null;
  _pointsEl: HTMLElement | null;
  _classPtsEl: HTMLElement | null;
  _acceptBtn: HTMLButtonElement | null;
  _selectedNode: SkillNode | null;   // node currently showing tooltip (tap-to-inspect)
  _projLayer: ProjectileLayer;
  _iconCache: Map<string, HTMLCanvasElement>;

  _onPointerDown: ((e: PointerEvent) => void) | null;
  _onPointerMove: ((e: PointerEvent) => void) | null;
  _onPointerUp: (() => void) | null;
  _onWheel: ((e: WheelEvent) => void) | null;
  _onTouchStart: ((e: TouchEvent) => void) | null;
  _onTouchMove: ((e: TouchEvent) => void) | null;
  _onTouchEnd: (() => void) | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._svg = null;
    this._graphG = null;
    this._tree = null;

    this._vx = 0;
    this._vy = 0;
    this._scale = 1;
    this._dragging = false;
    this._lastPointer = null;
    this._pinchDist = null;

    this._allocated = new Set();
    this._startNodeId = 0;
    this._classId = "samurai";

    this._tooltip = null;
    this._pointsEl = null;
    this._classPtsEl = null;
    this._acceptBtn = null;
    this._selectedNode = null;
    this._projLayer = new ProjectileLayer();
    this._iconCache = new Map();

    this._onPointerDown = null;
    this._onPointerMove = null;
    this._onPointerUp = null;
    this._onWheel = null;
    this._onTouchStart = null;
    this._onTouchMove = null;
    this._onTouchEnd = null;
  }

  mount(): void {
    const char = this.state.getActiveCharacter();
    this._classId = char ? char.classId : "samurai";

    this._tree = getTree();
    this._startNodeId = getClassStartNode(this._classId);
    this._loadAllocated(char);
    this._allocated.add(this._startNodeId);

    const totalPoints = this._getTotalPoints();
    const usedPoints = this._allocated.size - 1;
    const classUsed = this._getClassSkillCount();

    this.container.innerHTML = `
      <div class="skill-tree">
        <div class="skill-tree__topbar">
          <div class="skill-tree__pts-wrap">
            <span class="skill-tree__points" id="st-points">${totalPoints - usedPoints} pts</span>
            <span class="skill-tree__class-pts" id="st-class-pts">${classUsed}/${this._getMaxClassSkills()} class</span>
          </div>
          <span class="skill-tree__title">Passive Tree</span>
          <button class="scene-close-btn" id="st-back">&times;</button>
        </div>
        <div class="skill-tree__actions-row">
          <button class="skill-tree__accept-btn" id="st-accept">&#x2714; Accept</button>
          <button class="skill-tree__reset-btn" id="st-reset">Reset</button>
        </div>
        <div class="skill-tree__viewport" id="st-viewport">
          <svg id="st-svg" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div class="skill-tree__tooltip hidden" id="st-tooltip"></div>
        <div class="skill-tree__controls">
          <button class="skill-tree__zoom-btn" id="st-zoom-in">+</button>
          <button class="skill-tree__zoom-btn" id="st-zoom-out">&minus;</button>
        </div>
      </div>
    `;

    this._svg = this.container.querySelector("#st-svg") as SVGSVGElement;
    this._tooltip = this.container.querySelector("#st-tooltip");
    this._pointsEl = this.container.querySelector("#st-points");
    this._classPtsEl = this.container.querySelector("#st-class-pts");
    this._acceptBtn = this.container.querySelector("#st-accept") as HTMLButtonElement;

    this._svg.setAttribute("width", "100%");
    this._svg.setAttribute("height", "100%");

    // Defs for clip paths
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this._tree.emblems.forEach((em, i) => {
      const clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clip.setAttribute("id", `emblem-clip-${i}`);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(em.cx));
      circle.setAttribute("cy", String(em.cy));
      circle.setAttribute("r", String(em.r - 3));
      clip.appendChild(circle);
      defs.appendChild(clip);
    });
    this._svg.appendChild(defs);

    this._graphG = document.createElementNS("http://www.w3.org/2000/svg", "g") as SVGGElement;
    this._graphG.setAttribute("id", "st-graph");
    this._svg.appendChild(this._graphG);

    const startNode = this._tree.nodes[this._startNodeId];
    const vp = this.container.querySelector("#st-viewport") as HTMLElement;
    const rect = vp.getBoundingClientRect();
    this._scale = 0.30;
    this._vx = rect.width / 2 - startNode.x * this._scale;
    this._vy = rect.height / 2 - startNode.y * this._scale;

    this._renderEmblems();
    this._renderEdges();
    this._renderNodes();
    this._applyTransform();
    this._wireEvents();

    (this.container.querySelector("#st-back") as HTMLButtonElement).addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });
    (this.container.querySelector("#st-zoom-in") as HTMLButtonElement).addEventListener("click", () => this._zoomAt(1.3, null));
    (this.container.querySelector("#st-zoom-out") as HTMLButtonElement).addEventListener("click", () => this._zoomAt(0.7, null));
    this._acceptBtn!.addEventListener("click", () => this._onAccept());
    (this.container.querySelector("#st-reset") as HTMLButtonElement).addEventListener("click", () => {
      this._allocated.clear();
      this._allocated.add(this._startNodeId);
      this._updateAllNodes();
      this._updatePoints();
    });
  }

  /* -- Emblem circles ------------------------------------- */

  _renderEmblems(): void {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < this._tree!.emblems.length; i++) {
      const em = this._tree!.emblems[i];

      // Background fill circle (dark)
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      bg.setAttribute("cx", String(em.cx));
      bg.setAttribute("cy", String(em.cy));
      bg.setAttribute("r", String(em.r));
      bg.classList.add("st-emblem__bg");
      frag.appendChild(bg);

      // Class image (clipped to circle - image is large so circle is inscribed in it)
      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      const imgSize = em.r * 2.6;
      img.setAttribute("href", `/assets/${em.img}`);
      img.setAttribute("x", String(em.cx - imgSize / 2));
      img.setAttribute("y", String(em.cy - imgSize / 2));
      img.setAttribute("width", String(imgSize));
      img.setAttribute("height", String(imgSize));
      img.setAttribute("clip-path", `url(#emblem-clip-${i})`);
      img.setAttribute("opacity", "0.55");
      img.setAttribute("preserveAspectRatio", "xMidYMid slice");
      frag.appendChild(img);

      // Outline ring
      const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ring.setAttribute("cx", String(em.cx));
      ring.setAttribute("cy", String(em.cy));
      ring.setAttribute("r", String(em.r));
      ring.classList.add("st-emblem__ring");
      if (em.classId === this._classId) ring.classList.add("st-emblem__ring--own");
      frag.appendChild(ring);

      // Class name label
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", String(em.cx));
      txt.setAttribute("y", String(em.cy + em.r + 22));
      txt.setAttribute("text-anchor", "middle");
      txt.classList.add("st-emblem__label");
      txt.textContent = em.classId[0].toUpperCase() + em.classId.slice(1);
      frag.appendChild(txt);
    }
    this._graphG!.appendChild(frag);
  }

  /* -- Edges ---------------------------------------------- */

  _renderEdges(): void {
    const frag = document.createDocumentFragment();
    for (const [aId, bId] of this._tree!.edges) {
      const a = this._tree!.nodes[aId];
      const b = this._tree!.nodes[bId];
      const isClass = a.type === "classSkill" || b.type === "classSkill";

      // Class edges: black outline line underneath
      if (isClass) {
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "line");
        bg.setAttribute("x1", String(a.x)); bg.setAttribute("y1", String(a.y));
        bg.setAttribute("x2", String(b.x)); bg.setAttribute("y2", String(b.y));
        bg.classList.add("st-edge", "st-edge--class-outline");
        frag.appendChild(bg);
      }

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(a.x));
      line.setAttribute("y1", String(a.y));
      line.setAttribute("x2", String(b.x));
      line.setAttribute("y2", String(b.y));
      line.setAttribute("data-edge", `${aId}-${bId}`);
      line.classList.add("st-edge");
      if (isClass) line.classList.add("st-edge--class");
      const feKey = `${Math.min(aId, bId)}-${Math.max(aId, bId)}`;
      if (this._tree!.figureEdgeSet.has(feKey)) line.classList.add("st-edge--figure");
      if (this._allocated.has(aId) && this._allocated.has(bId)) line.classList.add("st-edge--active");
      frag.appendChild(line);
    }
    this._graphG!.appendChild(frag);
  }

  /* -- Nodes ---------------------------------------------- */

  _renderNodes(): void {
    const frag = document.createDocumentFragment();
    for (const node of this._tree!.nodes) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-node-id", String(node.id));
      g.classList.add("st-node");
      g.classList.add(`st-node--${node.type}`);
      if (node.type === "classSkill" && (node as any).connector) {
        g.classList.add("st-node--classConnector");
      }

      if (this._allocated.has(node.id)) {
        g.classList.add("st-node--allocated");
      } else if (this._isReachable(node.id)) {
        g.classList.add("st-node--reachable");
      }

      const isConnector = node.type === "classSkill" && (node as any).connector;
      const r = isConnector ? 5 : (NODE_RADIUS[node.type] || 8);
      const shape = getNodeShape(node.type, isConnector);

      if (shape === "circle") {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", String(node.x)); c.setAttribute("cy", String(node.y)); c.setAttribute("r", String(r));
        g.appendChild(c);
      } else if (shape === "hex") {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", hexPath(node.x, node.y, r));
        g.appendChild(p);
      } else {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", diamondPath(node.x, node.y, r));
        g.appendChild(p);
      }

      // Node ID numbers removed for production display

      g.addEventListener("click", (e: MouseEvent) => { e.stopPropagation(); this._onNodeTap(node); });
      frag.appendChild(g);
    }
    this._graphG!.appendChild(frag);
  }

  _updateAllNodes(): void {
    for (const g of this._graphG!.querySelectorAll(".st-node")) {
      const id = parseInt((g as HTMLElement).dataset.nodeId!);
      g.classList.remove("st-node--allocated", "st-node--reachable");
      if (this._allocated.has(id)) g.classList.add("st-node--allocated");
      else if (this._isReachable(id)) g.classList.add("st-node--reachable");
    }
    for (const line of this._graphG!.querySelectorAll(".st-edge[data-edge]")) {
      const [a, b] = (line as SVGLineElement).dataset.edge!.split("-").map(Number);
      line.classList.toggle("st-edge--active", this._allocated.has(a) && this._allocated.has(b));
    }
  }

  /* -- Interaction ---------------------------------------- */

  /**
   * Mobile-friendly two-tap flow:
   *   1st tap -> show tooltip (inspect node)
   *   2nd tap on same node -> allocate / deallocate
   *   Tap on different node -> switch tooltip to new node
   *   Tap on empty space -> hide tooltip (handled in _wireEvents)
   */
  _onNodeTap(node: SkillNode): void {
    // If this node is already inspected -> perform action
    if (this._selectedNode && this._selectedNode.id === node.id) {
      this._onNodeAction(node);
      this._selectedNode = null;
      this._hideTooltip();
      return;
    }

    // First tap or different node -> show tooltip
    this._selectedNode = node;
    this._showTooltip(node);
  }

  /** Allocate or deallocate the node (runs on second tap). */
  _onNodeAction(node: SkillNode): void {
    if (this._allocated.has(node.id)) {
      if (node.id !== this._startNodeId && this._isLeaf(node.id)) {
        this._allocated.delete(node.id);
        this._updateAllNodes();
        this._updatePoints();
      }
      return;
    }

    // Class/active skill cap check
    const isClassNode = node.type === "classSkill" || node.type === "activeSkill";
    if (isClassNode && this._getClassSkillCount() >= this._getMaxClassSkills()) return;

    // Active skill budget: 0 by default, scales with level, 8 by level 45
    if (node.type === "activeSkill") {
      const playerLevel = this.state.data.player?.level || 1;
      const maxActiveSkills = Math.min(8, Math.floor(playerLevel * 8 / 45));
      let activeSkillsAllocated = 0;
      for (const id of this._allocated) {
        if (this._tree!.nodes[id]?.type === "activeSkill") activeSkillsAllocated++;
      }
      if (activeSkillsAllocated >= maxActiveSkills) return;
    }

    const totalPoints = this._getTotalPoints();
    const usedOuter = this._getOuterUsedCount();
    // Class/active skills don't consume normal points (limited by class budget + level gates)
    if (!isClassNode && usedOuter >= totalPoints) return;
    if (!this._isReachable(node.id)) return;

    this._allocated.add(node.id);
    this._updateAllNodes();
    this._updatePoints();
  }

  /** Dismiss tooltip when tapping empty space. */
  _onEmptyTap(): void {
    if (this._selectedNode) {
      this._selectedNode = null;
      this._hideTooltip();
    }
  }

  _isReachable(nodeId: number): boolean {
    const node: SkillNode = this._tree!.nodes[nodeId];
    return node.connections.some((cId: number) => this._allocated.has(cId));
  }

  _isLeaf(nodeId: number): boolean {
    const node: SkillNode = this._tree!.nodes[nodeId];
    const an = node.connections.filter((cId: number) => this._allocated.has(cId));
    if (an.length <= 1) return true;
    const tmp = new Set(this._allocated);
    tmp.delete(nodeId);
    const vis = new Set<number>();
    const q: number[] = [this._startNodeId];
    vis.add(this._startNodeId);
    while (q.length > 0) {
      const c = q.shift()!;
      for (const nid of this._tree!.nodes[c].connections) {
        if (!vis.has(nid) && tmp.has(nid)) { vis.add(nid); q.push(nid); }
      }
    }
    return vis.size === tmp.size;
  }

  _getTotalPoints(): number {
    const p = this.state.data.player;
    return p ? Math.max(0, p.level - 1) : 0;
  }

  _getMaxClassSkills(): number {
    const p = this.state.data.player;
    return getMaxClassSkills(p?.level || 1);
  }

  _getClassSkillCount(): number {
    let c = 0;
    for (const id of this._allocated) {
      const t = this._tree!.nodes[id]?.type;
      if (t === "classSkill" || t === "activeSkill") c++;
    }
    return c;
  }

  _getOuterUsedCount(): number {
    // All allocated except start, classSkills, and activeSkills
    let c = 0;
    for (const id of this._allocated) {
      const n = this._tree!.nodes[id];
      if (n && n.type !== "start" && n.type !== "classSkill" && n.type !== "activeSkill") c++;
    }
    return c;
  }

  _updatePoints(): void {
    const total = this._getTotalPoints();
    const usedOuter = this._getOuterUsedCount();
    const classUsed = this._getClassSkillCount();
    if (this._pointsEl) this._pointsEl.textContent = `${total - usedOuter} pts`;
    if (this._classPtsEl) this._classPtsEl.textContent = `${classUsed}/${this._getMaxClassSkills()} class`;
  }

  /* -- Tooltip -------------------------------------------- */

  _showTooltip(node: SkillNode): void {
    if (!this._tooltip) return;
    let html = "";

    // Active skill nodes - rich preview card with icon
    const skillId = node.def?.activeSkillId;
    if (node.type === "activeSkill" && skillId) {
      const skill = ACTIVE_SKILLS[skillId as keyof typeof ACTIVE_SKILLS] as ActiveSkillDef | undefined;
      if (skill) {
        // Icon placeholder + header row
        html += `<div class="st-tip__preview">`;
        html += `<div class="st-tip__icon-slot" id="st-tip-icon"></div>`;
        html += `<div class="st-tip__preview-info">`;
        html += `<div class="st-tip__name">${skill.name}</div>`;
        // Scaling type + level
        const sType = getSkillScalingType(skill);
        const typeIcon = sType === 'arcane' ? '🔮' : '⚔️';
        const typeName = sType === 'arcane' ? 'Arcane' : 'Bugei';
        const activeChar = this.state.getActiveCharacter?.() || this.state.data?.player;
        const wpnLv = (activeChar as any)?.weaponSpellLevel || 0;
        const arcLv = (activeChar as any)?.arcaneSpellLevel || 0;
        const verLv = (activeChar as any)?.versatileSpellLevel || 0;
        const charLevel = activeChar?.level || 1;
        const sEffLv = computeEffectiveSkillLevel(charLevel, sType, wpnLv, arcLv, verLv);
        const sGrowth = computeSkillLevelGrowth(sEffLv);

        html += `<div class="st-tip__type" style="color:#DFFFFE">${typeIcon} ${typeName} Lv.${sEffLv}</div>`;
        if (skill.description) {
          html += `<div class="st-tip__desc" style="color:#ccc;font-size:11px;margin-top:2px;font-style:italic">${skill.description}</div>`;
        }
        html += `</div></div>`;

        // Stats grid
        html += `<div class="st-tip__stats-grid">`;
        if (skill.skillType === "damage") {
          // Show expected damage
          const baseDmg = activeChar?.tapDamage || 1;
          let rawDmg: number;
          if (sType === 'arcane') {
            rawDmg = Math.floor(skill.spellBase! * sGrowth);
          } else {
            rawDmg = Math.floor(baseDmg * skill.damageMultiplier * sGrowth);
          }
          const dmgLabel = sType === 'arcane' ? 'Arcane Damage' : 'Bugei Damage';
          html += `<div class="st-tip__stat-pair"><span class="st-tip__stat-label">${dmgLabel}</span><span class="st-tip__stat-value">${rawDmg.toLocaleString()}</span></div>`;
        } else if (skill.skillType === "heal") {
          html += `<div class="st-tip__stat-pair"><span class="st-tip__stat-label">Heal</span><span class="st-tip__stat-value">${Math.round((skill.healPercent || 0) * 100)}% HP</span></div>`;
        }
        html += `<div class="st-tip__stat-pair"><span class="st-tip__stat-label">Cooldown</span><span class="st-tip__stat-value">${(skill.cooldownMs / 1000).toFixed(1)}s</span></div>`;

        // Elemental profile
        const elems = Object.entries(skill.elementalProfile).filter(([, v]) => v > 0);
        if (elems.length > 0) {
          const elemStr = elems.map(([el, v]) => `${el} ${Math.round(v * 100)}%`).join(", ");
          html += `<div class="st-tip__stat-pair"><span class="st-tip__stat-label">Element</span><span class="st-tip__stat-value">${elemStr}</span></div>`;
        }
        html += `</div>`;

        // Effect description
        if (skill.effect) {
          const eff = skill.effect;
          const dur = (eff.durationMs / 1000).toFixed(0);
          const sign = eff.target === "enemy" ? "-" : "+";
          const valStr = eff.value < 1 ? `${Math.round(eff.value * 100)}%` : String(eff.value);
          html += `<div class="st-tip__effect">${sign}${valStr} ${eff.stat} for ${dur}s (${eff.target})</div>`;
        }

        // Level requirement + status hint
        const playerLevel = this.state.data.player?.level || 1;
        const maxActiveSkills = Math.min(8, Math.floor(playerLevel * 8 / 45));
        let activeAllocated = 0;
        for (const id of this._allocated) {
          if (this._tree!.nodes[id]?.type === "activeSkill") activeAllocated++;
        }

        if (this._allocated.has(node.id)) {
          html += `<div class="st-tip__hint">tap to remove</div>`;
        } else if (activeAllocated >= maxActiveSkills) {
          const nextLevel = Math.ceil((activeAllocated + 1) * 45 / 8);
          html += `<div class="st-tip__hint" style="color:#A40239">requires level ${nextLevel}</div>`;
        } else {
          html += `<div class="st-tip__hint">tap to unlock</div>`;
        }

        this._tooltip.innerHTML = html;
        this._tooltip.classList.remove("hidden");

        // Async load icon into the slot
        this._loadTooltipIcon(skillId, skill);
        return;
      }
    }

    // Regular nodes
    if (node.name) html += `<div class="st-tip__name">${node.name}</div>`;
    html += `<div class="st-tip__label">${node.label}</div>`;
    if (node.type === "classSkill") html += `<div class="st-tip__type">class skill</div>`;
    else if (node.type !== "start") html += `<div class="st-tip__type">${node.type}</div>`;

    // Weapon match indicator
    html += this._buildWeaponMatch(node);

    // Life on Hit indicator
    html += this._buildLifeOnHit(node);

    // DPS impact preview for damage-relevant nodes
    html += this._buildDpsImpact(node);

    // Defense impact preview for defensive nodes (block, thorns, armor, hp)
    html += this._buildDefenseImpact(node);

    // Status hint
    if (this._allocated.has(node.id)) {
      html += `<div class="st-tip__hint">tap to remove</div>`;
    } else if (node.type !== "start") {
      html += `<div class="st-tip__hint">tap to allocate</div>`;
    }

    this._tooltip.innerHTML = html;
    this._tooltip.classList.remove("hidden");
  }

  /** Load skill icon asynchronously and inject into tooltip */
  async _loadTooltipIcon(skillId: string, skill: ActiveSkillDef): Promise<void> {
    const slot = this._tooltip?.querySelector("#st-tip-icon");
    if (!slot) return;

    // Check cache first
    if (this._iconCache.has(skillId)) {
      const cached = this._iconCache.get(skillId)!;
      const clone = document.createElement("canvas");
      clone.width = cached.width;
      clone.height = cached.height;
      clone.className = "st-tip__icon-canvas";
      clone.getContext("2d")!.drawImage(cached, 0, 0);
      slot.appendChild(clone);
      return;
    }

    // Load sprite and extract icon
    const jsonUrl = `/assets/${skill.spritePath}`;
    try {
      await this._projLayer.load(skillId, jsonUrl);
      const iconCanvas = this._projLayer.getIcon(skillId, 48);
      if (iconCanvas) {
        iconCanvas.className = "st-tip__icon-canvas";
        this._iconCache.set(skillId, iconCanvas);
        // Verify tooltip is still showing this skill
        if (slot.isConnected) {
          const clone = document.createElement("canvas");
          clone.width = iconCanvas.width;
          clone.height = iconCanvas.height;
          clone.className = "st-tip__icon-canvas";
          clone.getContext("2d")!.drawImage(iconCanvas, 0, 0);
          slot.appendChild(clone);
        }
      }
    } catch {
      // Icon load failed silently
    }
  }

  /** Build DPS impact preview for equipped damage skills when node has damage-relevant mods. */
  _buildDpsImpact(node: SkillNode): string {
    if (this._allocated.has(node.id)) return "";

    const mods = node.mods || [];

    // Check if any mod is DPS-relevant (including weapon-type stats when weapon matches)
    const char = this.state.getActiveCharacter();
    if (!char) return "";

    // Get equipped weapon subtypes
    const equipment = (char.inventory?.equipment || {}) as Record<string, any>;
    const equippedSubs: string[] = [];
    for (const slotId of ['weapon-left', 'weapon-right']) {
      const g = equipment[slotId];
      if (g?.properties?.subtype) equippedSubs.push(g.properties.subtype);
    }

    const relevant = mods.filter(m => {
      if (DPS_RELEVANT_STATS.has(m.stat)) return true;
      // Weapon dmg/amp stats are DPS-relevant only if weapon matches
      const subs = WPN_STAT_SUBTYPES[m.stat];
      if (subs && equippedSubs.some(s => subs.includes(s))) return true;
      return false;
    });
    if (relevant.length === 0) return "";

    const equipped = ((char.equippedSkills || []) as (string | null)[])
      .filter((id: string | null): id is string => id != null)
      .map((id: string) => ACTIVE_SKILLS[id as keyof typeof ACTIVE_SKILLS])
      .filter((s: ActiveSkillDef | undefined): s is ActiveSkillDef => s != null && s.skillType === "damage");
    if (equipped.length === 0) return "";

    const tapDamage = char.tapDamage || 1;
    const critChance = char.critChance || 0.05;
    const critMultiplier = char.critMultiplier || 1.5;
    const arcaneCritChance = char.arcaneCritChance || 0;
    const arcaneCritMult = char.arcaneCritMultiplier || 1.5;
    const charLevel = char.level || 1;
    const wpnLv = (char as any)?.weaponSpellLevel || 0;
    const arcLv = (char as any)?.arcaneSpellLevel || 0;
    const verLv = (char as any)?.versatileSpellLevel || 0;
    const currentCdr = (char.cooldownReduction || 0) / 100; // 0..1

    const classDef = CLASS_DEFS[char.classId];
    const baseTapDmg = classDef
      ? classDef.base.tapDamage + classDef.growth.tapDamage * (charLevel - 1)
      : tapDamage;

    // Accumulate deltas from all relevant mods
    let dTap = 0, dTapFlat = 0, dCrit = 0, dCritMul = 0;
    let dArcaneCrit = 0, dArcaneCritMul = 0;
    let dFirePct = 0, dColdPct = 0, dLightPct = 0, dPurePct = 0;
    let dWpn = 0, dArc = 0, dVer = 0;
    let nodeCdr = 0; // CDR from this node (fraction, e.g. 0.15 = 15%)
    // Weapon-type damage multiplier (swordDmg etc. = % damage bonus when weapon matches)
    let weaponDmgMult = 0;
    // Weapon amp (swordAmp etc. = multiply weapon equipment stats)
    let weaponAmpMult = 0;
    for (const m of relevant) {
      switch (m.stat) {
        case "damage":                dTap += baseTapDmg * m.value; break;
        case "tapHit":                dTapFlat += m.value; break;
        case "critChance":            dCrit += m.value; break;
        case "critMulti":             dCritMul += m.value; break;
        case "arcaneCritChance":      dArcaneCrit += m.value; break;
        case "arcaneCritMulti":       dArcaneCritMul += m.value; break;
        case "cooldownReduction":     nodeCdr += m.value; break;
        case "fireDmg":               dFirePct += m.value; break;
        case "coldDmg":               dColdPct += m.value; break;
        case "lightningDmg":          dLightPct += m.value; break;
        case "pureDmg":               dPurePct += m.value; break;
        case "weaponSpellLevel":      dWpn += m.value; break;
        case "arcaneSpellLevel":      dArc += m.value; break;
        case "versatileSpellLevel":   dVer += m.value; break;
        default:
          // Weapon-type stats
          if (m.stat.endsWith("Dmg") && WPN_STAT_SUBTYPES[m.stat]) {
            weaponDmgMult += m.value;
          } else if (m.stat.endsWith("Amp") && WPN_STAT_SUBTYPES[m.stat]) {
            weaponAmpMult += m.value;
          }
          break;
      }
    }

    let rows = "";
    for (const skill of equipped) {
      const sType = getSkillScalingType(skill);
      const curEff = computeEffectiveSkillLevel(charLevel, sType, wpnLv, arcLv, verLv);
      const newEff = computeEffectiveSkillLevel(charLevel, sType, wpnLv + dWpn, arcLv + dArc, verLv + dVer);
      const curG = computeSkillLevelGrowth(curEff);
      const newG = computeSkillLevelGrowth(newEff);

      let curRaw: number, newRaw: number;
      if (sType === "arcane") {
        curRaw = skill.spellBase! * curG;
        newRaw = skill.spellBase! * newG;
      } else {
        curRaw = tapDamage * skill.damageMultiplier * curG;
        newRaw = (tapDamage + dTap) * skill.damageMultiplier * newG;
      }
      // Weapon dmg multiplier (e.g. swordDmg +6% → damage * 1.06)
      if (weaponDmgMult > 0) {
        newRaw *= (1 + weaponDmgMult);
      }
      // Weapon amp: amplifies weapon equipment stats → approximated as flat damage bonus
      if (weaponAmpMult > 0) {
        // Sum weapon base damage from equipped weapons
        let wpnBaseDmg = 0;
        for (const slotId of ['weapon-left', 'weapon-right']) {
          const g = equipment[slotId];
          if (g?.properties?.baseDamage) wpnBaseDmg += g.properties.baseDamage;
        }
        newRaw += wpnBaseDmg * weaponAmpMult * skill.damageMultiplier * newG;
      }
      // Apply elemental % bonuses only to the matching fire/cold/lightning portion of skill damage
      const ep = skill.elementalProfile;
      newRaw += newRaw * ((ep.fire || 0) * dFirePct + (ep.cold || 0) * dColdPct + (ep.lightning || 0) * dLightPct + (ep.pure || 0) * dPurePct);

      // Arcane skills use arcane crits, weapon skills use regular crits
      let curExp: number, newExp: number;
      if (sType === "arcane") {
        curExp = curRaw * (1 + arcaneCritChance * (arcaneCritMult - 1));
        newExp = newRaw * (1 + (arcaneCritChance + dArcaneCrit) * ((arcaneCritMult + dArcaneCritMul) - 1));
      } else {
        curExp = curRaw * (1 + critChance * (critMultiplier - 1));
        newExp = newRaw * (1 + (critChance + dCrit) * ((critMultiplier + dCritMul) - 1));
      }
      // CDR: current effective cooldown uses char CDR; new cooldown adds this node multiplicatively
      const baseCdSec = skill.cooldownMs / 1000;
      const curCdSec = baseCdSec * (1 - currentCdr);
      const newCdSec = nodeCdr > 0
        ? baseCdSec * (1 - currentCdr) * (1 - nodeCdr)
        : curCdSec;
      const curDps = curExp / curCdSec;
      const newDps = newExp / newCdSec;
      const pct = curDps > 0 ? (newDps - curDps) / curDps * 100 : 0;

      if (Math.abs(pct) < 0.1) continue;

      const sign = pct > 0 ? "+" : "";
      const col = pct > 0 ? "#DFFFFE" : "#A40239";
      rows += `<div class="st-tip__dps-row">`
        + `<span class="st-tip__dps-name">${skill.name}</span>`
        + `<span class="st-tip__dps-vals">`
        + `${Math.floor(curDps)} → <span style="color:${col}">${Math.floor(newDps)}</span>`
        + ` <span style="color:${col};font-size:10px">${sign}${pct.toFixed(1)}%</span>`
        + `</span></div>`;
    }
    // Tap damage preview (Hit)
    let tapRow = "";
    const totalTapDelta = dTap + dTapFlat;
    if (totalTapDelta !== 0) {
      const newTap = tapDamage + totalTapDelta;
      // Apply weapon dmg mult if present
      const finalNewTap = weaponDmgMult > 0 ? Math.floor(newTap * (1 + weaponDmgMult)) : Math.floor(newTap);
      const tapPct = tapDamage > 0 ? (finalNewTap - tapDamage) / tapDamage * 100 : 0;
      const tapSign = tapPct > 0 ? "+" : "";
      const tapCol = tapPct > 0 ? "#DFFFFE" : "#A40239";
      tapRow = `<div class="st-tip__dps-row">`
        + `<span class="st-tip__dps-name">Hit (tap)</span>`
        + `<span class="st-tip__dps-vals">`
        + `${Math.floor(tapDamage)} → <span style="color:${tapCol}">${finalNewTap}</span>`
        + ` <span style="color:${tapCol};font-size:10px">${tapSign}${tapPct.toFixed(1)}%</span>`
        + `</span></div>`;
    }

    if (!tapRow && !rows) return "";

    return `<div class="st-tip__dps-impact">`
      + `<div class="st-tip__dps-header">Impact</div>${tapRow}${rows}</div>`;
  }

  /** Weapon match badge: shows whether equipped weapon matches this node's weapon bonus. */
  _buildWeaponMatch(node: SkillNode): string {
    const mods = node.mods || [];
    // Find first weapon-related mod
    let wpnStat = "";
    for (const m of mods) {
      if (WPN_STAT_SUBTYPES[m.stat]) { wpnStat = m.stat; break; }
    }
    if (!wpnStat) return "";

    const wpnName = WPN_STAT_NAMES[wpnStat] || wpnStat;
    const neededSubs = WPN_STAT_SUBTYPES[wpnStat];

    // Get equipped weapon subtypes from character inventory
    const char = this.state.getActiveCharacter();
    const equipment = (char?.inventory?.equipment || {}) as Record<string, any>;
    const equippedSubs: string[] = [];
    for (const slotId of ['weapon-left', 'weapon-right']) {
      const g = equipment[slotId];
      if (g?.properties?.subtype) equippedSubs.push(g.properties.subtype);
    }

    const matches = equippedSubs.some(sub => neededSubs.includes(sub));

    if (matches) {
      return `<div class="st-tip__wpn-match st-tip__wpn-match--yes">⚔ ${wpnName} equipped</div>`;
    } else if (equippedSubs.length > 0) {
      return `<div class="st-tip__wpn-match st-tip__wpn-match--no">✗ No ${wpnName} equipped</div>`;
    } else {
      return `<div class="st-tip__wpn-match st-tip__wpn-match--no">— No weapon equipped</div>`;
    }
  }

  /** Life on Hit indicator for nodes that grant lifeOnHit (% multiplier). */
  _buildLifeOnHit(node: SkillNode): string {
    const mods = node.mods || [];
    let totalPct = 0;
    for (const m of mods) {
      if (m.stat === "lifeOnHit") totalPct += m.value;
    }
    if (totalPct <= 0) return "";

    const char = this.state.getActiveCharacter();
    const curHit = (char as any)?.lifeOnHit || 0;
    const newHit = Math.floor(curHit * (1 + totalPct));

    return `<div class="st-tip__loh">`
      + `<span class="st-tip__loh-icon">❤</span>`
      + `<span class="st-tip__loh-label">Life on Hit</span>`
      + `<span class="st-tip__loh-val">${curHit} → ${newHit}</span>`
      + `</div>`;
  }

  /** Defense impact preview for nodes with defensive stats (block, thorns, armor, HP). */
  _buildDefenseImpact(node: SkillNode): string {
    if (this._allocated.has(node.id)) return "";

    const mods = node.mods || [];
    const char = this.state.getActiveCharacter();
    if (!char) return "";

    // Base HP from class stats (tree % scales base, not total)
    const classDef = CLASS_DEFS[char.classId];
    const baseHp = classDef
      ? classDef.base.hp + classDef.growth.hp * ((char.level || 1) - 1)
      : char.maxHp || 0;

    const rows: string[] = [];
    for (const m of mods) {
      let label = "", icon = "", color = "", formatted = "";

      switch (m.stat) {
        case "blockChance": {
          const cur = char.blockChance || 0;
          icon = "🛡"; label = "Block"; color = "#F9CF87";
          formatted = `${Math.round(cur * 100)}% → ${Math.round((cur + m.value) * 100)}%`;
          break;
        }
        case "thorns": {
          icon = "⚡"; label = "Thorns"; color = "#B9508D";
          formatted = `+${Math.round(m.value * 100)}% reflect`;
          break;
        }
        case "armor": {
          const cur = char.armor || 0;
          const delta = Math.floor(cur * m.value);
          icon = "🔰"; label = "Armor"; color = "#F9CF87";
          formatted = `${cur} → ${cur + delta}`;
          break;
        }
        case "hp": {
          const cur = char.maxHp || 0;
          const delta = Math.floor(baseHp * m.value);
          icon = "❤"; label = "HP"; color = "#7fef7f";
          formatted = `${cur.toLocaleString()} → ${(cur + delta).toLocaleString()}`;
          break;
        }
        default:
          continue;
      }

      rows.push(`<div class="st-tip__dps-row">`
        + `<span class="st-tip__dps-name">${icon} ${label}</span>`
        + `<span class="st-tip__dps-vals" style="color:${color}">${formatted}</span>`
        + `</div>`);
    }

    if (rows.length === 0) return "";

    return `<div class="st-tip__dps-impact">`
      + `<div class="st-tip__dps-header">Defense</div>${rows.join("")}</div>`;
  }

  _hideTooltip(): void { if (this._tooltip) this._tooltip.classList.add("hidden"); }

  /* -- Pan & Zoom ----------------------------------------- */

  _wireEvents(): void {
    const vp = this.container.querySelector("#st-viewport") as HTMLElement;
    this._onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".st-node")) return;
      this._onEmptyTap();
      this._dragging = true;
      this._lastPointer = { x: e.clientX, y: e.clientY };
    };
    this._onPointerMove = (e: PointerEvent) => {
      if (!this._dragging || !this._lastPointer) return;
      this._vx += e.clientX - this._lastPointer.x;
      this._vy += e.clientY - this._lastPointer.y;
      this._lastPointer = { x: e.clientX, y: e.clientY };
      this._applyTransform();
    };
    this._onPointerUp = () => { this._dragging = false; this._lastPointer = null; };
    this._onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.15 : 0.87;
      const r = vp.getBoundingClientRect();
      this._zoomAt(f, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    this._onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) this._pinchDist = touchDist(e.touches);
    };
    this._onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && this._pinchDist) {
        e.preventDefault();
        const nd = touchDist(e.touches);
        const f = nd / this._pinchDist;
        this._pinchDist = nd;
        const r = vp.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
        this._zoomAt(f, { x: cx, y: cy });
      }
    };
    this._onTouchEnd = () => { this._pinchDist = null; };

    vp.addEventListener("pointerdown", this._onPointerDown);
    vp.addEventListener("pointermove", this._onPointerMove);
    vp.addEventListener("pointerup", this._onPointerUp);
    vp.addEventListener("pointercancel", this._onPointerUp);
    vp.addEventListener("wheel", this._onWheel, { passive: false });
    vp.addEventListener("touchstart", this._onTouchStart, { passive: true });
    vp.addEventListener("touchmove", this._onTouchMove, { passive: false });
    vp.addEventListener("touchend", this._onTouchEnd);
  }

  _zoomAt(factor: number, center: { x: number; y: number } | null): void {
    const old = this._scale;
    this._scale = Math.min(3, Math.max(0.15, this._scale * factor));
    const af = this._scale / old;
    if (center) {
      this._vx = center.x - (center.x - this._vx) * af;
      this._vy = center.y - (center.y - this._vy) * af;
    } else {
      const vp = this.container.querySelector("#st-viewport") as HTMLElement | null;
      if (vp) {
        const r = vp.getBoundingClientRect();
        this._vx = r.width / 2 - (r.width / 2 - this._vx) * af;
        this._vy = r.height / 2 - (r.height / 2 - this._vy) * af;
      }
    }
    this._applyTransform();
  }

  _applyTransform(): void {
    if (this._graphG) {
      this._graphG.setAttribute("transform", `translate(${this._vx},${this._vy}) scale(${this._scale})`);
    }
  }

  /* -- Save / Load ---------------------------------------- */

  _loadAllocated(char: any): void {
    // Load from server-backed allocatedNodes on the character
    this._allocated = char?.allocatedNodes?.length
      ? new Set(char.allocatedNodes as number[])
      : new Set();
  }

  /** Send current allocations to the backend (with FE pre-validation). */
  async _onAccept(): Promise<void> {
    const char = this.state.getActiveCharacter();
    if (!char || !char.id) return;

    // Client-side pre-validation
    const allocArr = [...this._allocated];
    const validation = validateAllocations(char.classId, char.level, allocArr);
    if (!validation.valid) {
      console.error("[SkillTree] FE validation failed:", validation.errors);
      if (this._acceptBtn) {
        this._acceptBtn.textContent = `\u2716 ${validation.errors[0] || "Invalid"}`;
        setTimeout(() => {
          if (this._acceptBtn) this._acceptBtn.textContent = "\u2714 Accept";
        }, 3000);
      }
      return;
    }

    if (this._acceptBtn) {
      this._acceptBtn.disabled = true;
      this._acceptBtn.textContent = "Saving\u2026";
    }

    try {
      await api.skillTree.accept(char.id, allocArr);

      // Refresh full state from server so unlockedActiveSkills + equippedSkills stay in sync
      await this.state.refreshState();

      if (this._acceptBtn) {
        this._acceptBtn.textContent = "\u2714 Saved!";
        setTimeout(() => {
          if (this._acceptBtn) this._acceptBtn.textContent = "\u2714 Accept";
        }, 1500);
      }
    } catch (err: any) {
      console.error("[SkillTree] Accept failed:", err);
      const msg = err?.response?.data?.message || err?.message || "Error";
      if (this._acceptBtn) {
        this._acceptBtn.textContent = `\u2716 ${msg}`;
        setTimeout(() => {
          if (this._acceptBtn) this._acceptBtn.textContent = "\u2714 Accept";
        }, 3000);
      }
    } finally {
      if (this._acceptBtn) this._acceptBtn.disabled = false;
    }
  }

  /* -- Cleanup -------------------------------------------- */

  unmount(): void {
    const vp = this.container.querySelector("#st-viewport") as HTMLElement | null;
    if (vp) {
      vp.removeEventListener("pointerdown", this._onPointerDown!);
      vp.removeEventListener("pointermove", this._onPointerMove!);
      vp.removeEventListener("pointerup", this._onPointerUp!);
      vp.removeEventListener("pointercancel", this._onPointerUp!);
      vp.removeEventListener("wheel", this._onWheel!);
      vp.removeEventListener("touchstart", this._onTouchStart!);
      vp.removeEventListener("touchmove", this._onTouchMove!);
      vp.removeEventListener("touchend", this._onTouchEnd!);
    }
    this._svg = null;
    this._graphG = null;
    this._tooltip = null;
    this._pointsEl = null;
    this._classPtsEl = null;
    this._acceptBtn = null;
    this._tree = null;
    this.container.innerHTML = "";
  }
}
