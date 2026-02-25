import { useMemo } from 'react';
import SkillTreeRenderer from '../components/SkillTreeRenderer';
import { buildSkillTree, INNER_SHAPES, OUTER_SHAPES, NODE_RADIUS } from '@shared/skill-tree';
import type { ConstellationShape } from '@shared/skill-tree';

/* ── Geometry helpers for crossing detection ───── */

function crossVal(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSeg(ax: number, ay: number, bx: number, by: number, px: number, py: number): boolean {
  return Math.min(ax, bx) <= px + 1e-9 && px <= Math.max(ax, bx) + 1e-9 &&
         Math.min(ay, by) <= py + 1e-9 && py <= Math.max(ay, by) + 1e-9;
}

function segsCross(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
      (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) return false;
  const d1 = crossVal(x3, y3, x4, y4, x1, y1);
  const d2 = crossVal(x3, y3, x4, y4, x2, y2);
  const d3 = crossVal(x1, y1, x2, y2, x3, y3);
  const d4 = crossVal(x1, y1, x2, y2, x4, y4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSeg(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSeg(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSeg(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSeg(x1, y1, x2, y2, x4, y4)) return true;
  return false;
}

/* ── Shape self-crossing check ──────────────── */

function findShapeCrossings(shape: ConstellationShape): number {
  let count = 0;
  for (let i = 0; i < shape.edges.length; i++) {
    const [ai, bi] = shape.edges[i];
    const [ax, ay] = shape.points[ai];
    const [bx, by] = shape.points[bi];
    for (let j = i + 1; j < shape.edges.length; j++) {
      const [ci, di] = shape.edges[j];
      const [cx, cy] = shape.points[ci];
      const [dx, dy] = shape.points[di];
      if (segsCross(ax, ay, bx, by, cx, cy, dx, dy)) count++;
    }
  }
  return count;
}

/* ── Full tree edge crossing check ──────────── */

function checkTreeCrossings() {
  const tree = buildSkillTree();
  const { nodes, edges, figureMembership } = tree;

  // Build ID → node map (IDs may have gaps after patching)
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  function isOuter(id: number) {
    const n = nodeMap.get(id);
    if (!n) return false;
    const t = n.type;
    return t !== 'start' && t !== 'classSkill';
  }

  const oEdges = edges.filter(([a, b]) => isOuter(a) && isOuter(b));
  let crossCount = 0;
  let figCrossCount = 0;
  const crossDetails: string[] = [];

  function sameFig(a: number, b: number): boolean {
    const fa = figureMembership.get(a), fb = figureMembership.get(b);
    return fa !== undefined && fb !== undefined && fa === fb;
  }

  for (let i = 0; i < oEdges.length; i++) {
    const [ai, bi] = oEdges[i];
    const nai = nodeMap.get(ai), nbi = nodeMap.get(bi);
    if (!nai || !nbi) continue;
    const edgeIInFig = sameFig(ai, bi);
    for (let j = i + 1; j < oEdges.length; j++) {
      const [ci, di] = oEdges[j];
      const nci = nodeMap.get(ci), ndi = nodeMap.get(di);
      if (!nci || !ndi) continue;
      if (ai === ci || ai === di || bi === ci || bi === di) continue;
      if (!segsCross(
        nai.x, nai.y, nbi.x, nbi.y,
        nci.x, nci.y, ndi.x, ndi.y,
      )) continue;
      const edgeJInFig = sameFig(ci, di);
      if (edgeIInFig || edgeJInFig) { figCrossCount++; continue; }
      crossCount++;
      if (crossDetails.length < 10) {
        crossDetails.push(`${nai.nodeId}\u2194${nbi.nodeId} \u00d7 ${nci.nodeId}\u2194${ndi.nodeId}`);
      }
    }
  }

  // Distance violations
  const outerNodes = nodes.filter(n => isOuter(n.id));
  let distViols = 0;
  for (let i = 0; i < outerNodes.length; i++) {
    for (let j = i + 1; j < outerNodes.length; j++) {
      const a = outerNodes[i], b = outerNodes[j];
      if (a.type === 'keystone' || b.type === 'keystone') continue;
      if (a.connections.includes(b.id)) continue;
      if (sameFig(a.id, b.id)) continue;
      const fa = figureMembership.get(a.id), fb = figureMembership.get(b.id);
      const mult = (fa !== undefined || fb !== undefined) ? 2 : 8;
      const minD = mult * Math.max(NODE_RADIUS[a.type] || 8, NODE_RADIUS[b.type] || 8);
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist < minD - 0.5) distViols++;
    }
  }

  // Node counts
  const counts: Record<string, number> = {};
  for (const n of nodes) counts[n.type] = (counts[n.type] || 0) + 1;

  return { crossCount, figCrossCount, distViols, crossDetails, counts, total: nodes.length, edgeCount: edges.length };
}

/* ── Shape card SVG ────────────────────────── */

const CARD_SIZE = 200;
const CARD_PAD = 28;

function ShapeCard({ shape, tier }: { shape: ConstellationShape; tier: string }) {
  const pts = shape.points;
  const crossings = findShapeCrossings(shape);
  const hasCrossing = crossings > 0;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const usable = CARD_SIZE - CARD_PAD * 2;
  const sc = Math.min(usable / bw, usable / bh);
  const offX = CARD_PAD + (usable - bw * sc) / 2;
  const offY = CARD_PAD + (usable - bh * sc) / 2;
  const tx = (x: number) => offX + (x - minX) * sc;
  const ty = (y: number) => offY + (y - minY) * sc;

  return (
    <div className={`fm-card${hasCrossing ? ' fm-card--error' : ''}`}>
      <svg width={CARD_SIZE} height={CARD_SIZE} viewBox={`0 0 ${CARD_SIZE} ${CARD_SIZE}`}>
        {shape.edges.map(([ai, bi], idx) => (
          <line key={`e${idx}`}
            x1={tx(pts[ai][0])} y1={ty(pts[ai][1])}
            x2={tx(pts[bi][0])} y2={ty(pts[bi][1])}
            stroke={hasCrossing ? '#ff4444' : '#F9CF87'} strokeWidth={1.5} strokeOpacity={0.7}
          />
        ))}
        {pts.map(([x, y], idx) => {
          const isGw = idx === shape.gatewayIdx;
          return (
            <g key={`p${idx}`}>
              <circle cx={tx(x)} cy={ty(y)} r={isGw ? 8 : 6}
                fill={isGw ? '#A40239' : '#DFFFFE'}
                stroke={isGw ? '#F9CF87' : '#B9508D'} strokeWidth={isGw ? 2 : 1}
              />
              <text x={tx(x)} y={ty(y) + 1} textAnchor="middle" dominantBaseline="middle"
                fill={isGw ? '#fff' : '#101524'} fontSize={8} fontWeight="bold"
              >{idx}</text>
            </g>
          );
        })}
      </svg>
      <div className="fm-card__name">{shape.name}</div>
      <div className="fm-card__meta">
        <span className={`fm-card__tier fm-card__tier--${tier}`}>{tier}</span>
        <span>{pts.length}pts / {shape.edges.length}e</span>
      </div>
      {hasCrossing && <div className="fm-card__error">{crossings} crossings!</div>}
    </div>
  );
}

/* ── Page ───────────────────────────────────── */

export default function FigureMapPage() {
  const treeStats = useMemo(() => checkTreeCrossings(), []);
  const innerCross = INNER_SHAPES.reduce((s, sh) => s + findShapeCrossings(sh), 0);
  const outerCross = OUTER_SHAPES.reduce((s, sh) => s + findShapeCrossings(sh), 0);
  const shapeCross = innerCross + outerCross;

  return (
    <div className="fm-page">
      {/* ── Header ── */}
      <div className="fm-topbar">
        <h1 className="fm-topbar__title">Skill Tree &mdash; Figure Test</h1>
        <div className="fm-topbar__badges">
          <span className="fm-badge">{treeStats.total} nodes</span>
          <span className="fm-badge">{treeStats.edgeCount} edges</span>
          <span className={`fm-badge ${treeStats.crossCount === 0 ? 'fm-badge--ok' : 'fm-badge--err'}`}>
            {treeStats.crossCount === 0 ? 'No tree crossings' : `${treeStats.crossCount} tree crossings!`}
          </span>
          <span className={`fm-badge ${treeStats.figCrossCount === 0 ? 'fm-badge--ok' : 'fm-badge--err'}`}>
            {treeStats.figCrossCount === 0 ? 'No fig crossings' : `${treeStats.figCrossCount} fig crossings!`}
          </span>
          <span className={`fm-badge ${treeStats.distViols === 0 ? 'fm-badge--ok' : 'fm-badge--err'}`}>
            {treeStats.distViols === 0 ? 'No distance violations' : `${treeStats.distViols} too close!`}
          </span>
        </div>
      </div>

      {/* ── Full tree ── */}
      <div className="fm-tree">
        <SkillTreeRenderer height="100%" interactive />
      </div>

      {/* ── Stats panel ── */}
      <div className="fm-stats">
        <div className="fm-stats__section">
          <h3>Node counts</h3>
          <div className="fm-stats__grid">
            {Object.entries(treeStats.counts).map(([t, c]) => (
              <div key={t} className="fm-stats__item">
                <span className={`fm-stats__dot fm-stats__dot--${t}`} />
                <span>{t}</span>
                <span className="fm-stats__num">{c}</span>
              </div>
            ))}
          </div>
        </div>
        {treeStats.crossDetails.length > 0 && (
          <div className="fm-stats__section fm-stats__section--err">
            <h3>Edge crossings</h3>
            {treeStats.crossDetails.map((d, i) => <div key={i} className="fm-stats__cross">{d}</div>)}
          </div>
        )}
      </div>

      {/* ── Shape cards ── */}
      <div className="fm-shapes">
        <h2 className="fm-shapes__title">
          Constellation Shapes
          <span className={`fm-badge ${shapeCross === 0 ? 'fm-badge--ok' : 'fm-badge--err'}`}>
            {shapeCross === 0 ? 'All clean' : `${shapeCross} crossings`}
          </span>
        </h2>
        <div className="fm-shapes__row">
          <div className="fm-shapes__group">
            <h3>Inner ({INNER_SHAPES.length})</h3>
            <div className="fm-grid">
              {INNER_SHAPES.map(s => <ShapeCard key={s.name} shape={s} tier="inner" />)}
            </div>
          </div>
          <div className="fm-shapes__group">
            <h3>Outer ({OUTER_SHAPES.length})</h3>
            <div className="fm-grid">
              {OUTER_SHAPES.map(s => <ShapeCard key={s.name} shape={s} tier="outer" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
