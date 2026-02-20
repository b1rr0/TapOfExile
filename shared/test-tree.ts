import { buildSkillTree, NODE_RADIUS } from './skill-tree';

const tree = buildSkillTree();
const { nodes, edges, figureMembership, figureEdgeSet } = tree;

function isOuter(n: any): boolean { return n.type !== 'start' && n.type !== 'classSkill'; }

// Geometry
function cr(ax:number,ay:number,bx:number,by:number,cx:number,cy:number) {return(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);}
function onS(ax:number,ay:number,bx:number,by:number,px:number,py:number) {return Math.min(ax,bx)<=px+1e-9&&px<=Math.max(ax,bx)+1e-9&&Math.min(ay,by)<=py+1e-9&&py<=Math.max(ay,by)+1e-9;}
function segsCross(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number,x4:number,y4:number):boolean{
  if((x1===x3&&y1===y3)||(x1===x4&&y1===y4)||(x2===x3&&y2===y3)||(x2===x4&&y2===y4))return false;
  const d1=cr(x3,y3,x4,y4,x1,y1),d2=cr(x3,y3,x4,y4,x2,y2),d3=cr(x1,y1,x2,y2,x3,y3),d4=cr(x1,y1,x2,y2,x4,y4);
  if(((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0)))return true;
  if(d1===0&&onS(x3,y3,x4,y4,x1,y1))return true;if(d2===0&&onS(x3,y3,x4,y4,x2,y2))return true;
  if(d3===0&&onS(x1,y1,x2,y2,x3,y3))return true;if(d4===0&&onS(x1,y1,x2,y2,x4,y4))return true;
  return false;
}

function sameFig(a: number, b: number): boolean {
  const fa = figureMembership.get(a), fb = figureMembership.get(b);
  return fa !== undefined && fb !== undefined && fa === fb;
}

console.log(`Total nodes: ${nodes.length}`);
console.log(`Total edges: ${edges.length}`);

// Node counts
const counts: Record<string, number> = {};
for (const n of nodes) counts[n.type] = (counts[n.type] || 0) + 1;
console.log('Node counts:', counts);

// --- Edge crossings (outer only, skip edges fully within a figure) ---
const oEdges = edges.filter(([a,b]) => isOuter(nodes[a]) && isOuter(nodes[b]));
console.log(`Outer edges: ${oEdges.length} / ${edges.length}`);

let xCount = 0;
let xCountFigInternal = 0;
for (let i = 0; i < oEdges.length; i++) {
  const [ai,bi] = oEdges[i];
  const edgeIInFig = sameFig(ai, bi);
  for (let j = i+1; j < oEdges.length; j++) {
    const [ci,di] = oEdges[j];
    if(ai===ci||ai===di||bi===ci||bi===di)continue;
    if(!segsCross(nodes[ai].x,nodes[ai].y,nodes[bi].x,nodes[bi].y,nodes[ci].x,nodes[ci].y,nodes[di].x,nodes[di].y))continue;
    const edgeJInFig = sameFig(ci, di);
    if (edgeIInFig || edgeJInFig) { xCountFigInternal++; continue; }
    xCount++;
    if(xCount<=15)console.log(`  X: ${nodes[ai].nodeId}↔${nodes[bi].nodeId} x ${nodes[ci].nodeId}↔${nodes[di].nodeId}`);
  }
}
console.log(`Outer edge crossings: ${xCount} (+ ${xCountFigInternal} figure-internal, exempt)`);

// --- Distance violations (outer only, skip keystones, figure-aware) ---
const outerNodes = nodes.filter(n => isOuter(n));
let dCount = 0;
for(let i=0;i<outerNodes.length;i++)for(let j=i+1;j<outerNodes.length;j++){
  const a=outerNodes[i],b=outerNodes[j];
  // Skip keystones entirely (positions are shape-determined)
  if (a.type === 'keystone' || b.type === 'keystone') continue;
  if (a.connections.includes(b.id)) continue;
  // Same-figure: skip
  if (sameFig(a.id, b.id)) continue;
  // Cross-figure: reduced mult
  const fa = figureMembership.get(a.id), fb = figureMembership.get(b.id);
  let mult = 8;
  if (fa !== undefined || fb !== undefined) mult = 2;
  const minD=mult*Math.max(NODE_RADIUS[a.type]||8,NODE_RADIUS[b.type]||8);
  const dist=Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
  if(dist<minD-0.5){dCount++;if(dCount<=10)console.log(`  D: ${a.nodeId} & ${b.nodeId} (${dist.toFixed(1)}<${minD})`)}
}
console.log(`Outer distance violations: ${dCount}`);

// --- Leaf minors (degree-1 minor nodes) ---
let leafCount = 0;
for (const n of nodes) {
  if (n.type === 'minor' && n.connections.length < 2) {
    leafCount++;
    console.log(`  Leaf minor: ${n.nodeId} (connections: ${n.connections.length})`);
  }
}
console.log(`Leaf minors: ${leafCount}`);

// --- Outer leaves must be keystones in figures ---
let badLeaves = 0;
for (const n of nodes) {
  if (!isOuter(n)) continue;
  if (n.connections.length === 1) {
    if (n.type !== 'keystone') { badLeaves++; console.log(`  Bad leaf: ${n.nodeId} (${n.type}, not keystone)`); }
  }
}
console.log(`Bad leaves (not keystone in figure): ${badLeaves}`);

// --- Triangles (skip same-figure) ---
const adjSet = new Set<string>();
for (const [a,b] of edges) { adjSet.add(`${a}-${b}`); adjSet.add(`${b}-${a}`); }
let triCount = 0;
let triFigCount = 0;
for (const n of nodes) {
  if (!isOuter(n)) continue;
  const conns = n.connections;
  for (let i = 0; i < conns.length; i++) for (let j = i+1; j < conns.length; j++) {
    if (adjSet.has(`${conns[i]}-${conns[j]}`)) {
      const fa = figureMembership.get(n.id);
      const fb = figureMembership.get(conns[i]);
      const fc = figureMembership.get(conns[j]);
      if (fa !== undefined && fa === fb && fa === fc) { triFigCount++; continue; }
      triCount++;
      if(triCount<=10) console.log(`  Tri: ${n.nodeId} - ${nodes[conns[i]].nodeId} - ${nodes[conns[j]].nodeId}`);
    }
  }
}
console.log(`Triangles (outer): ${triCount / 3} (+ ${triFigCount / 3} figure-internal, exempt)`);

// --- Notable→FigureEntry BFS ---
let maxNFE = 0; let worstNFE = '';
const nfeViolations: string[] = [];
for (const n of nodes) {
  if (n.type !== 'notable') continue;
  const vis = new Set<number>([n.id]);
  const q: [number, number][] = [[n.id, 0]];
  let bestD = Infinity, bestTarget = '';
  while (q.length) {
    const [cur, d] = q.shift()!;
    if (nodes[cur].type === 'figureEntry' && d > 0) {
      bestD = d; bestTarget = nodes[cur].nodeId; break;
    }
    for (const nb of nodes[cur].connections) {
      if (!vis.has(nb)) { vis.add(nb); q.push([nb, d+1]); }
    }
  }
  if (bestD > maxNFE) { maxNFE = bestD; worstNFE = `${n.nodeId}->${bestTarget}=${bestD}`; }
  if (bestD > 4) nfeViolations.push(`  ${n.nodeId} -> ${bestTarget} = ${bestD}`);
}
console.log(`Max notable→figureEntry: ${maxNFE} (${worstNFE})`);
if (nfeViolations.length) console.log(`  Violations (>4): ${nfeViolations.length}`);

// --- Figure stats ---
const figEntries = nodes.filter(n => n.type === 'figureEntry');
const fStats: Record<string, number> = {};
for (const fe of figEntries) {
  const ksCount = fe.connections.filter((c: number) => nodes[c].type === 'keystone').length;
  fStats[`${ksCount}ks`] = (fStats[`${ksCount}ks`] || 0) + 1;
}
console.log(`Figures: ${figEntries.length}`, fStats);

// --- Connectivity: BFS from each start node ---
const classIds = ['warrior', 'mage', 'archer', 'samurai'];
for (const cls of classIds) {
  const startNode = nodes.find(n => n.type === 'start' && n.classAffinity === cls);
  if (!startNode) { console.log(`  No start for ${cls}!`); continue; }

  const visited = new Set<number>();
  const queue = [startNode.id];
  visited.add(startNode.id);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of nodes[cur].connections) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }

  const classSkillOther = nodes.filter(n => n.type === 'classSkill' && n.classAffinity !== cls);
  const expected = nodes.length - classSkillOther.length;
  const unreached = nodes.filter(n => !visited.has(n.id) && !(n.type === 'classSkill' && n.classAffinity !== cls));

  console.log(`BFS ${cls}: reached ${visited.size}/${nodes.length} (expected ≥${expected}, unreached own: ${unreached.length})`);
  if (unreached.length > 0 && unreached.length <= 10) {
    for (const u of unreached) console.log(`  Unreached: ${u.nodeId} (type=${u.type}, class=${u.classAffinity})`);
  }
}

console.log('\n=== ALL CHECKS DONE ===');
