/**
 * Test server for the skill tree - serves tree data as JSON and an interactive HTML viewer.
 *
 * Usage:  npx tsx shared/serve-tree.ts          (from project root)
 *         npx tsx shared/serve-tree.ts 3001      (custom port)
 *
 * Endpoints:
 *   GET /           - interactive canvas viewer
 *   GET /api/tree   - full tree JSON (nodes, edges, emblems, figures)
 *   GET /api/stats  - tree statistics summary
 */

/* eslint-disable no-console */

import * as http from "http";
import { buildSkillTree, CLASS_IDS, NODE_RADIUS } from "./skill-tree";
import type { SkillTreeResult } from "./skill-tree";

const PORT = parseInt(process.argv[2] || "3333", 10);

// ── Build tree once ──────────────────────────────────────

console.log("Building skill tree...");
const tree: SkillTreeResult = buildSkillTree();
console.log(`  Nodes: ${tree.nodes.length}`);
console.log(`  Edges: ${tree.edges.length}`);
console.log(`  Emblems: ${tree.emblems.length}`);

// ── Serialize for JSON ───────────────────────────────────

const treeJson = JSON.stringify({
  nodes: tree.nodes.map(n => ({
    id: n.id,
    nodeId: n.nodeId,
    type: n.type,
    classAffinity: n.classAffinity,
    x: n.x,
    y: n.y,
    label: n.label,
    name: n.name,
    stat: n.stat,
    value: n.value,
    mods: n.mods.map(m => ({ stat: m.stat, value: m.value, mode: m.mode })),
    connections: n.connections,
    connector: n.connector,
  })),
  edges: tree.edges,
  emblems: tree.emblems,
  figureEdges: [...tree.figureEdgeSet],
  figureMembership: Object.fromEntries(tree.figureMembership),
  classIds: CLASS_IDS,
  nodeRadius: NODE_RADIUS,
});

// ── Stats ────────────────────────────────────────────────

function getStats() {
  const byType: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  for (const n of tree.nodes) {
    byType[n.type] = (byType[n.type] || 0) + 1;
    byClass[n.classAffinity] = (byClass[n.classAffinity] || 0) + 1;
  }
  return {
    totalNodes: tree.nodes.length,
    totalEdges: tree.edges.length,
    totalEmblems: tree.emblems.length,
    figureEdges: tree.figureEdgeSet.size,
    figureMemberNodes: tree.figureMembership.size,
    byType,
    byClass,
  };
}

// ── HTML viewer ──────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Skill Tree Viewer</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #101524; color: #F9CF87; font-family: monospace; overflow: hidden; }
  canvas { display: block; cursor: grab; }
  canvas:active { cursor: grabbing; }
  #info {
    position: fixed; top: 10px; left: 10px; background: rgba(16,21,36,0.9);
    border: 1px solid #A40239; padding: 8px 12px; border-radius: 4px;
    font-size: 12px; pointer-events: none; z-index: 10;
  }
  #tooltip {
    position: fixed; display: none; background: rgba(16,21,36,0.95);
    border: 1px solid #F9CF87; padding: 8px 12px; border-radius: 4px;
    font-size: 12px; pointer-events: none; z-index: 20; max-width: 280px;
  }
  #tooltip .name { color: #DFFFFE; font-weight: bold; margin-bottom: 4px; }
  #tooltip .type { color: #B9508D; font-size: 11px; }
  #tooltip .mods { margin-top: 4px; }
  #tooltip .mod { color: #7ef27e; font-size: 11px; }
</style>
</head>
<body>
<div id="info">Loading...</div>
<div id="tooltip"></div>
<canvas id="c"></canvas>
<script>
(async () => {
  const res = await fetch('/api/tree');
  const data = await res.json();
  const { nodes, edges, emblems, figureEdges, figureMembership, nodeRadius } = data;

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const info = document.getElementById('info');
  const tooltip = document.getElementById('tooltip');

  // ── Resize ──
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; draw(); }
  window.addEventListener('resize', resize);

  // ── Camera ──
  let camX = 800, camY = 800, zoom = 0.45;
  let dragging = false, lastMx = 0, lastMy = 0;

  canvas.addEventListener('mousedown', e => { dragging = true; lastMx = e.clientX; lastMy = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', e => {
    if (dragging) {
      camX -= (e.clientX - lastMx) / zoom;
      camY -= (e.clientY - lastMy) / zoom;
      lastMx = e.clientX; lastMy = e.clientY;
      draw();
    }
    updateTooltip(e);
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(0.1, Math.min(5, zoom * factor));
    draw();
  }, { passive: false });

  // ── Colors ──
  const CLASS_COLORS = {
    samurai: '#A40239',
    warrior: '#F9CF87',
    mage:    '#B9508D',
    archer:  '#DFFFFE',
  };
  const TYPE_COLORS = {
    start:       '#FFFFFF',
    classSkill:  '#FF8C00',
    minor:       '#888888',
    notable:     '#F9CF87',
    keystone:    '#A40239',
    figureEntry: '#B9508D',
  };

  const figureEdgeSet = new Set(figureEdges);

  // ── Draw ──
  function worldToScreen(x, y) {
    return [
      (x - camX) * zoom + canvas.width / 2,
      (y - camY) * zoom + canvas.height / 2,
    ];
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Edges
    for (const [a, b] of edges) {
      const na = nodes[a], nb = nodes[b];
      const [x1, y1] = worldToScreen(na.x, na.y);
      const [x2, y2] = worldToScreen(nb.x, nb.y);

      const key = a < b ? a + ':' + b : b + ':' + a;
      const isFigure = figureEdgeSet.has(key);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isFigure ? 'rgba(185,80,141,0.4)' : 'rgba(249,207,135,0.15)';
      ctx.lineWidth = isFigure ? 1.5 : 0.8;
      ctx.stroke();
    }

    // Nodes
    for (const n of nodes) {
      const [sx, sy] = worldToScreen(n.x, n.y);
      const r = (nodeRadius[n.type] || 7) * zoom;

      if (sx < -r || sx > canvas.width + r || sy < -r || sy > canvas.height + r) continue;

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);

      const isConnector = n.connector;
      if (n.type === 'classSkill' && !isConnector) {
        ctx.fillStyle = '#FF8C00';
      } else if (n.type === 'keystone') {
        ctx.fillStyle = '#A40239';
      } else if (n.type === 'notable') {
        ctx.fillStyle = '#F9CF87';
      } else if (n.type === 'start') {
        ctx.fillStyle = '#FFFFFF';
      } else if (n.type === 'figureEntry') {
        ctx.fillStyle = '#B9508D';
      } else {
        ctx.fillStyle = '#555';
      }
      ctx.fill();

      // Border for keystones/notables
      if (n.type === 'keystone' || n.type === 'notable') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Emblems
    for (const em of emblems) {
      const [sx, sy] = worldToScreen(em.cx, em.cy);
      const r = em.r * zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.strokeStyle = CLASS_COLORS[em.classId] || '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = CLASS_COLORS[em.classId] || '#fff';
      ctx.font = Math.max(10, 14 * zoom) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(em.classId.toUpperCase(), sx, sy);
    }

    info.textContent = 'Nodes: ' + nodes.length + ' | Edges: ' + edges.length +
      ' | Zoom: ' + zoom.toFixed(2) + ' | Drag to pan, scroll to zoom';
  }

  // ── Tooltip ──
  function updateTooltip(e) {
    const mx = e.clientX, my = e.clientY;
    let found = null;
    for (const n of nodes) {
      const [sx, sy] = worldToScreen(n.x, n.y);
      const r = (nodeRadius[n.type] || 7) * zoom + 4;
      if (Math.hypot(mx - sx, my - sy) < r) { found = n; break; }
    }
    if (found) {
      let html = '<div class="type">' + found.type + (found.connector ? ' (connector)' : '') +
        ' | ' + found.classAffinity + ' | #' + found.id + '</div>';
      if (found.name) html += '<div class="name">' + found.name + '</div>';
      html += '<div>' + found.label + '</div>';
      if (found.mods && found.mods.length) {
        html += '<div class="mods">';
        for (const m of found.mods) {
          const val = m.mode === 'percent' ? (m.value * 100).toFixed(1) + '%' : m.value;
          html += '<div class="mod">' + (m.value > 0 ? '+' : '') + val + ' ' + m.stat + ' (' + m.mode + ')</div>';
        }
        html += '</div>';
      }
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (mx + 15) + 'px';
      tooltip.style.top = (my + 15) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  }

  resize();
  info.textContent = 'Nodes: ' + nodes.length + ' | Edges: ' + edges.length +
    ' | Zoom: ' + zoom.toFixed(2) + ' | Drag to pan, scroll to zoom';
})();
</script>
</body>
</html>`;

// ── Server ───────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = req.url?.split("?")[0];

  if (url === "/api/tree") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(treeJson);
    return;
  }

  if (url === "/api/stats") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(getStats(), null, 2));
    return;
  }

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`\nSkill Tree Server running:`);
  console.log(`  Viewer:  http://localhost:${PORT}/`);
  console.log(`  API:     http://localhost:${PORT}/api/tree`);
  console.log(`  Stats:   http://localhost:${PORT}/api/stats`);
});
