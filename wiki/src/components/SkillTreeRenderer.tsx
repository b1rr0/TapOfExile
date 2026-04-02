import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { buildSkillTree, hexPath, diamondPath, getNodeShape, EMBLEM_RADIUS, NODE_RADIUS } from '@shared/skill-tree';
import type { SkillNode } from '@shared/skill-tree';

/* ── Types ─────────────────────────────────── */

interface Props {
  allocatedNodes?: number[];
  classId?: string;
  height?: string;
  /** Enable interactive allocation mode (click to allocate/dealloc) */
  interactive?: boolean;
}

/* ── Module-level helpers ───────────────────────── */

function touchDist(t: TouchList): number {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ── Cached tree (deterministic, only build once) ── */

let cachedTree: ReturnType<typeof buildSkillTree> | null = null;
function getTree() {
  if (!cachedTree) cachedTree = buildSkillTree();
  return cachedTree;
}


/* ── Component ─────────────────────────────── */

export default function SkillTreeRenderer({
  allocatedNodes,
  classId,
  height = '600px',
  interactive = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const graphRef = useRef<SVGGElement>(null);

  const vxRef = useRef(0);
  const vyRef = useRef(0);
  const scaleRef = useRef(0.3);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pinchDistRef = useRef<number | null>(null);

  const [tooltip, setTooltip] = useState<{ node: SkillNode; x: number; y: number } | null>(null);

  // Interactive allocation state
  const [allocated, setAllocated] = useState<number[]>(allocatedNodes || []);
  // History stack for "undo 1" (stores allocation order)
  const [history, setHistory] = useState<number[]>([]);

  // Sync external allocatedNodes when not interactive
  useEffect(() => {
    if (!interactive) {
      setAllocated(allocatedNodes || []);
    }
  }, [allocatedNodes, interactive]);

  const allocatedSet = useMemo(() => new Set(allocated), [allocated]);

  /* ── Allocation logic ────────────────────── */

  const canAllocate = useCallback((nodeId: number): boolean => {
    if (allocatedSet.has(nodeId)) return false;
    const tree = getTree();
    const node = tree.nodes[nodeId];
    if (!node) return false;

    // Start nodes: can always be taken (they are the entry points)
    if (node.type === 'start') return true;

    // Must be adjacent to at least one allocated node (SkillNode.connections)
    return node.connections.some((cId: number) => allocatedSet.has(cId));
  }, [allocatedSet]);

  // Counts for caps (memoized — avoid recomputing on every render)
  const tree0 = getTree();
  const classSkillCount = useMemo(
    () => allocated.filter(id => tree0.nodes[id]?.type === 'classSkill').length,
    [allocated],
  );
  const regularCount = useMemo(
    () => allocated.filter(id => { const t = tree0.nodes[id]?.type; return t && t !== 'start' && t !== 'classSkill'; }).length,
    [allocated],
  );

  const MAX_CLASS_SKILL = 8;
  const MAX_REGULAR = 60;

  const handleAllocate = useCallback((nodeId: number) => {
    if (!interactive) return;
    const tree = getTree();
    const node = tree.nodes[nodeId];
    if (!node) return;

    if (allocatedSet.has(nodeId)) return;

    // Start node: only 1 start node can be taken
    if (node.type === 'start') {
      const hasStart = allocated.some(id => tree.nodes[id]?.type === 'start');
      if (hasStart) return;
    }

    // Class skill cap
    if (node.type === 'classSkill' && classSkillCount >= MAX_CLASS_SKILL) return;

    // Regular node cap (everything except start & classSkill)
    if (node.type !== 'start' && node.type !== 'classSkill' && regularCount >= MAX_REGULAR) return;

    if (!canAllocate(nodeId)) return;

    setAllocated(prev => [...prev, nodeId]);
    setHistory(prev => [...prev, nodeId]);
  }, [interactive, allocated, allocatedSet, canAllocate, classSkillCount, regularCount]);

  const handleResetAll = useCallback(() => {
    setAllocated([]);
    setHistory([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setAllocated(prev => prev.filter(id => id !== last));
  }, [history]);

  const applyTransform = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.setAttribute(
        'transform',
        `translate(${vxRef.current},${vyRef.current}) scale(${scaleRef.current})`,
      );
    }
  }, []);

  const zoomAt = useCallback((factor: number, center: { x: number; y: number } | null) => {
    const old = scaleRef.current;
    scaleRef.current = Math.min(3, Math.max(0.15, scaleRef.current * factor));
    const af = scaleRef.current / old;
    if (center) {
      vxRef.current = center.x - (center.x - vxRef.current) * af;
      vyRef.current = center.y - (center.y - vyRef.current) * af;
    } else if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      vxRef.current = r.width / 2 - (r.width / 2 - vxRef.current) * af;
      vyRef.current = r.height / 2 - (r.height / 2 - vyRef.current) * af;
    }
    applyTransform();
  }, [applyTransform]);

  /* ── Update SVG classes when allocated changes ── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const tree = getTree();
    const set = new Set(allocated);

    // Update node classes
    svg.querySelectorAll('.st-node').forEach(el => {
      const id = Number(el.getAttribute('data-node-id'));
      el.classList.toggle('st-node--allocated', set.has(id));
      if (interactive) {
        const node = tree.nodes[id];
        let reachable = false;
        if (node?.type === 'start') {
          const hasStart = allocated.some(aid => tree.nodes[aid]?.type === 'start');
          reachable = !hasStart;
        } else if (node) {
          reachable = node.connections.some((cId: number) => set.has(cId));
        }
        el.classList.toggle('st-node--reachable', !set.has(id) && reachable);
      }
    });

    // Update edge classes
    svg.querySelectorAll('.st-edge[data-edge-a]').forEach(el => {
      const a = Number(el.getAttribute('data-edge-a'));
      const b = Number(el.getAttribute('data-edge-b'));
      el.classList.toggle('st-edge--active', set.has(a) && set.has(b));
    });
  }, [allocated, interactive]);

  /* ── Build SVG once on mount ─────────────── */
  useEffect(() => {
    const tree = getTree();
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const initSet = new Set(allocated);

    // Create graph group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'st-graph');
    graphRef.current = g;

    // Defs for emblem clip paths
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    tree.emblems.forEach((em, i) => {
      const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clip.setAttribute('id', `wiki-emblem-clip-${i}`);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(em.cx));
      circle.setAttribute('cy', String(em.cy));
      circle.setAttribute('r', String(em.r - 3));
      clip.appendChild(circle);
      defs.appendChild(clip);
    });
    svg.appendChild(defs);
    svg.appendChild(g);

    // Render emblems
    for (let i = 0; i < tree.emblems.length; i++) {
      const em = tree.emblems[i];
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bg.setAttribute('cx', String(em.cx));
      bg.setAttribute('cy', String(em.cy));
      bg.setAttribute('r', String(em.r));
      bg.classList.add('st-emblem__bg');
      g.appendChild(bg);

      // Class image (clipped to circle)
      if (em.img) {
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        const imgSize = em.r * 2.6;
        img.setAttribute('href', `/assets/${em.img}`);
        img.setAttribute('x', String(em.cx - imgSize / 2));
        img.setAttribute('y', String(em.cy - imgSize / 2));
        img.setAttribute('width', String(imgSize));
        img.setAttribute('height', String(imgSize));
        img.setAttribute('clip-path', `url(#wiki-emblem-clip-${i})`);
        img.setAttribute('opacity', '0.55');
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        g.appendChild(img);
      }

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', String(em.cx));
      ring.setAttribute('cy', String(em.cy));
      ring.setAttribute('r', String(em.r));
      ring.classList.add('st-emblem__ring');
      if (classId && em.classId === classId) ring.classList.add('st-emblem__ring--own');
      g.appendChild(ring);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', String(em.cx));
      txt.setAttribute('y', String(em.cy + em.r + 22));
      txt.setAttribute('text-anchor', 'middle');
      txt.classList.add('st-emblem__label');
      txt.textContent = em.classId[0].toUpperCase() + em.classId.slice(1);
      g.appendChild(txt);
    }

    // Render edges (store edge endpoints for dynamic class updates)
    for (const [aId, bId] of tree.edges) {
      const a = tree.nodes[aId];
      const b = tree.nodes[bId];
      const isClass = a.type === 'classSkill' || b.type === 'classSkill';

      // Class edges: black outline line underneath
      if (isClass) {
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bg.setAttribute('x1', String(a.x)); bg.setAttribute('y1', String(a.y));
        bg.setAttribute('x2', String(b.x)); bg.setAttribute('y2', String(b.y));
        bg.classList.add('st-edge', 'st-edge--class-outline');
        g.appendChild(bg);
      }

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
      line.setAttribute('data-edge-a', String(aId));
      line.setAttribute('data-edge-b', String(bId));
      line.classList.add('st-edge');
      if (isClass) line.classList.add('st-edge--class');
      const feKey = `${Math.min(aId, bId)}-${Math.max(aId, bId)}`;
      if (tree.figureEdgeSet.has(feKey)) line.classList.add('st-edge--figure');
      if (initSet.has(aId) && initSet.has(bId)) line.classList.add('st-edge--active');
      g.appendChild(line);
    }

    // Render nodes
    for (const node of tree.nodes) {
      const ng = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ng.setAttribute('data-node-id', String(node.id));
      ng.classList.add('st-node', `st-node--${node.type}`);
      const isClassConn = node.type === 'classSkill' && (node as any).connector;
      if (isClassConn) ng.classList.add('st-node--classConnector');
      if (initSet.has(node.id)) ng.classList.add('st-node--allocated');

      const r = isClassConn ? 5 : (NODE_RADIUS[node.type] || 8);
      const shape = getNodeShape(node.type, isClassConn);

      if (shape === 'circle') {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(node.x));
        c.setAttribute('cy', String(node.y));
        c.setAttribute('r', String(r));
        ng.appendChild(c);
      } else if (shape === 'hex') {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', hexPath(node.x, node.y, r));
        ng.appendChild(p);
      } else {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', diamondPath(node.x, node.y, r));
        ng.appendChild(p);
      }

      // Node ID numbers removed for production display

      g.appendChild(ng);
    }

    // Initial transform — center on tree center (800, 800)
    const rect = container.getBoundingClientRect();
    scaleRef.current = 0.3;
    vxRef.current = rect.width / 2 - 800 * 0.3;
    vyRef.current = rect.height / 2 - 800 * 0.3;
    applyTransform();

    // Pan & zoom events
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.st-node')) return;
      setTooltip(null);
      draggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || !lastPointerRef.current) return;
      vxRef.current += e.clientX - lastPointerRef.current.x;
      vyRef.current += e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      applyTransform();
    };
    const onPointerUp = () => { draggingRef.current = false; lastPointerRef.current = null; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.15 : 0.87;
      const r2 = container.getBoundingClientRect();
      zoomAt(f, { x: e.clientX - r2.left, y: e.clientY - r2.top });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinchDistRef.current = touchDist(e.touches);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDistRef.current) {
        e.preventDefault();
        const nd = touchDist(e.touches);
        const f = nd / pinchDistRef.current;
        pinchDistRef.current = nd;
        const r2 = container.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r2.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r2.top;
        zoomAt(f, { x: cx, y: cy });
      }
    };
    const onTouchEnd = () => { pinchDistRef.current = null; };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      svg.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  /* ── Node click handler (delegates to SVG) ── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onClick = (e: MouseEvent) => {
      const nodeG = (e.target as HTMLElement).closest('.st-node');
      if (!nodeG) return;
      e.stopPropagation();
      const nodeId = Number(nodeG.getAttribute('data-node-id'));
      const tree = getTree();
      const node = tree.nodes[nodeId];
      if (!node) return;

      if (interactive) {
        handleAllocate(nodeId);
      }

      setTooltip((prev) =>
        prev?.node.id === node.id ? null : { node, x: e.clientX, y: e.clientY },
      );
    };

    svg.addEventListener('click', onClick);
    return () => svg.removeEventListener('click', onClick);
  }, [interactive, handleAllocate]);

  /* ── Zoom buttons ────────────────────────── */
  const handleZoomIn = () => zoomAt(1.3, null);
  const handleZoomOut = () => zoomAt(0.7, null);

  return (
    <div className="skill-tree-wiki">
      {/* Controls: zoom + interactive panel */}
      <div className="skill-tree-wiki__controls">
        <button className="skill-tree-wiki__zoom" onClick={handleZoomIn}>+</button>
        <button className="skill-tree-wiki__zoom" onClick={handleZoomOut}>&minus;</button>
        {interactive && (
          <button
            className="skill-tree-wiki__zoom"
            onClick={() => window.open('/skill-tree/builder', '_blank')}
            title="Open fullscreen"
          >
            {'\u26F6'}
          </button>
        )}
      </div>

      {interactive && (
        <div className="skill-tree-wiki__panel">
          <div className="skill-tree-wiki__counter">
            <span className="skill-tree-wiki__counter-num">{regularCount}</span>
            <span className="skill-tree-wiki__counter-label">/ {MAX_REGULAR} nodes</span>
          </div>
          <div className="skill-tree-wiki__counter skill-tree-wiki__counter--class">
            <span className="skill-tree-wiki__counter-num">{classSkillCount}</span>
            <span className="skill-tree-wiki__counter-label">/ {MAX_CLASS_SKILL} class</span>
          </div>
          <button
            className="skill-tree-wiki__panel-btn"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo last"
          >
            {'\u21A9'} Undo
          </button>
          <button
            className="skill-tree-wiki__panel-btn skill-tree-wiki__panel-btn--reset"
            onClick={handleResetAll}
            disabled={allocated.length === 0}
            title="Reset all"
          >
            {'\u2715'} Reset
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="skill-tree-wiki__viewport"
        style={{ height, touchAction: 'none' }}
      >
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
      {tooltip && (
        <div className="skill-tree-wiki__tooltip">
          {tooltip.node.name && <div className="st-tip__name">{tooltip.node.name}</div>}
          <div className="st-tip__label">{tooltip.node.label}</div>
          <div className="st-tip__type">{tooltip.node.type}</div>
          {allocatedSet.has(tooltip.node.id) && (
            <div className="st-tip__allocated">Allocated</div>
          )}
        </div>
      )}
    </div>
  );
}
