import { buildSkillTree, getClassStartNode, EMBLEM_RADIUS, MAX_CLASS_SKILLS } from "../data/skill-tree.js";
import type { SharedDeps, SkillTreeResult, NodeType } from "../types.js";

interface SkillNode {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  label: string;
  name?: string;
  connections: number[];
}

/**
 * SkillTreeScene — circular passive skill tree (PoE2-style).
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
  _selectedNode: SkillNode | null;   // node currently showing tooltip (tap-to-inspect)

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
    this._selectedNode = null;

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

    this._tree = buildSkillTree();
    this._startNodeId = getClassStartNode(this._classId);
    this._loadAllocated(char);
    this._allocated.add(this._startNodeId);

    const totalPoints = this._getTotalPoints();
    const usedPoints = this._allocated.size - 1;
    const classUsed = this._getClassSkillCount();

    this.container.innerHTML = `
      <div class="skill-tree">
        <div class="skill-tree__topbar">
          <button class="skill-tree__back" id="st-back">&#x2190; Back</button>
          <span class="skill-tree__title">Passive Tree</span>
          <div class="skill-tree__pts-wrap">
            <span class="skill-tree__points" id="st-points">${totalPoints - usedPoints} pts</span>
            <span class="skill-tree__class-pts" id="st-class-pts">${classUsed}/${MAX_CLASS_SKILLS} class</span>
          </div>
        </div>
        <div class="skill-tree__viewport" id="st-viewport">
          <svg id="st-svg" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div class="skill-tree__tooltip hidden" id="st-tooltip"></div>
        <div class="skill-tree__controls">
          <button class="skill-tree__zoom-btn" id="st-zoom-in">+</button>
          <button class="skill-tree__zoom-btn" id="st-zoom-out">&minus;</button>
          <button class="skill-tree__reset-btn" id="st-reset">Reset</button>
        </div>
      </div>
    `;

    this._svg = this.container.querySelector("#st-svg") as SVGSVGElement;
    this._tooltip = this.container.querySelector("#st-tooltip");
    this._pointsEl = this.container.querySelector("#st-points");
    this._classPtsEl = this.container.querySelector("#st-class-pts");

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
      this._saveAllocated();
      this.sceneManager.switchTo("hideout");
    });
    (this.container.querySelector("#st-zoom-in") as HTMLButtonElement).addEventListener("click", () => this._zoomAt(1.3, null));
    (this.container.querySelector("#st-zoom-out") as HTMLButtonElement).addEventListener("click", () => this._zoomAt(0.7, null));
    (this.container.querySelector("#st-reset") as HTMLButtonElement).addEventListener("click", () => {
      this._allocated.clear();
      this._allocated.add(this._startNodeId);
      this._saveAllocated();
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

      // Class image (clipped to circle — image is large so circle is inscribed in it)
      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      const imgSize = em.r * 2.6;
      img.setAttribute("href", `./src/assets/${em.img}`);
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
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(a.x));
      line.setAttribute("y1", String(a.y));
      line.setAttribute("x2", String(b.x));
      line.setAttribute("y2", String(b.y));
      line.setAttribute("data-edge", `${aId}-${bId}`);
      line.classList.add("st-edge");
      if (a.type === "classSkill" || b.type === "classSkill") line.classList.add("st-edge--class");
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

      if (this._allocated.has(node.id)) {
        g.classList.add("st-node--allocated");
      } else if (this._isReachable(node.id)) {
        g.classList.add("st-node--reachable");
      }

      const r = ({ keystone: 16, notable: 12, start: 14, classSkill: 9, minor: 8 } as Record<string, number>)[node.type] || 8;
      const shape: string = node.type === "keystone" ? "diamond"
        : node.type === "notable" ? "hex"
        : node.type === "classSkill" ? "hex"
        : "circle";

      if (shape === "circle") {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", String(node.x)); c.setAttribute("cy", String(node.y)); c.setAttribute("r", String(r));
        g.appendChild(c);
      } else if (shape === "hex") {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", this._hexPath(node.x, node.y, r));
        g.appendChild(p);
      } else {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", this._diamondPath(node.x, node.y, r));
        g.appendChild(p);
      }

      g.addEventListener("click", (e: MouseEvent) => { e.stopPropagation(); this._onNodeTap(node); });
      frag.appendChild(g);
    }
    this._graphG!.appendChild(frag);
  }

  _hexPath(cx: number, cy: number, r: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    return `M${pts.join("L")}Z`;
  }

  _diamondPath(cx: number, cy: number, r: number): string {
    return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`;
  }

  _updateAllNodes(): void {
    for (const g of this._graphG!.querySelectorAll(".st-node")) {
      const id = parseInt((g as HTMLElement).dataset.nodeId!);
      g.classList.remove("st-node--allocated", "st-node--reachable");
      if (this._allocated.has(id)) g.classList.add("st-node--allocated");
      else if (this._isReachable(id)) g.classList.add("st-node--reachable");
    }
    for (const line of this._graphG!.querySelectorAll(".st-edge")) {
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
        this._saveAllocated();
        this._updateAllNodes();
        this._updatePoints();
      }
      return;
    }

    // Class skill cap check
    if (node.type === "classSkill" && this._getClassSkillCount() >= MAX_CLASS_SKILLS) return;

    const totalPoints = this._getTotalPoints();
    const usedOuter = this._getOuterUsedCount();
    // Class skills don't consume normal points (they're free picks, limited to 6)
    if (node.type !== "classSkill" && usedOuter >= totalPoints) return;
    if (!this._isReachable(node.id)) return;

    this._allocated.add(node.id);
    this._saveAllocated();
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

  _getClassSkillCount(): number {
    let c = 0;
    for (const id of this._allocated) {
      if (this._tree!.nodes[id] && this._tree!.nodes[id].type === "classSkill") c++;
    }
    return c;
  }

  _getOuterUsedCount(): number {
    // All allocated except start and classSkills
    let c = 0;
    for (const id of this._allocated) {
      const n = this._tree!.nodes[id];
      if (n && n.type !== "start" && n.type !== "classSkill") c++;
    }
    return c;
  }

  _updatePoints(): void {
    const total = this._getTotalPoints();
    const usedOuter = this._getOuterUsedCount();
    const classUsed = this._getClassSkillCount();
    if (this._pointsEl) this._pointsEl.textContent = `${total - usedOuter} pts`;
    if (this._classPtsEl) this._classPtsEl.textContent = `${classUsed}/${MAX_CLASS_SKILLS} class`;
  }

  /* -- Tooltip -------------------------------------------- */

  _showTooltip(node: SkillNode): void {
    if (!this._tooltip) return;
    let html = "";
    if (node.name) html += `<div class="st-tip__name">${node.name}</div>`;
    html += `<div class="st-tip__label">${node.label}</div>`;
    if (node.type === "classSkill") html += `<div class="st-tip__type">class skill</div>`;
    else if (node.type !== "start") html += `<div class="st-tip__type">${node.type}</div>`;

    // Status hint
    if (this._allocated.has(node.id)) {
      html += `<div class="st-tip__hint">tap to remove</div>`;
    } else if (node.type !== "start") {
      html += `<div class="st-tip__hint">tap to allocate</div>`;
    }

    this._tooltip.innerHTML = html;
    this._tooltip.classList.remove("hidden");
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
      if (e.touches.length === 2) this._pinchDist = this._touchDist(e.touches);
    };
    this._onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && this._pinchDist) {
        e.preventDefault();
        const nd = this._touchDist(e.touches);
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

  _touchDist(t: TouchList): number {
    const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
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

  _saveAllocated(): void {
    const char = this.state.getActiveCharacter();
    if (!char) return;
    if (!char.skillTree) char.skillTree = {};
    char.skillTree.allocated = [...this._allocated];
    this.state.scheduleSave();
  }

  _loadAllocated(char: any): void {
    this._allocated = char?.skillTree?.allocated
      ? new Set(char.skillTree.allocated)
      : new Set();
  }

  /* -- Cleanup -------------------------------------------- */

  unmount(): void {
    this._saveAllocated();
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
    this._tree = null;
    this.container.innerHTML = "";
  }
}
