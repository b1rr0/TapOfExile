import { buildSkillTree, NODE_RADIUS } from './skill-tree';

const tree = buildSkillTree();
const { nodes, edges } = tree;

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

console.log(`Total nodes: ${nodes.length}`);
console.log(`Total edges: ${edges.length}`);

// --- Edge crossings (outer only) ---
const oEdges = edges.filter(([a,b]) => isOuter(nodes[a]) && isOuter(nodes[b]));
console.log(`Outer edges: ${oEdges.length} / ${edges.length}`);

let xCount = 0;
for (let i = 0; i < oEdges.length; i++) {
  const [ai,bi] = oEdges[i];
  for (let j = i+1; j < oEdges.length; j++) {
    const [ci,di] = oEdges[j];
    if(ai===ci||ai===di||bi===ci||bi===di)continue;
    if(segsCross(nodes[ai].x,nodes[ai].y,nodes[bi].x,nodes[bi].y,nodes[ci].x,nodes[ci].y,nodes[di].x,nodes[di].y)){
      xCount++;
      if(xCount<=15)console.log(`  X: ${nodes[ai].nodeId}↔${nodes[bi].nodeId} x ${nodes[ci].nodeId}↔${nodes[di].nodeId}`);
    }
  }
}
console.log(`Outer edge crossings: ${xCount}`);

// --- Distance violations (outer only) ---
const outerNodes = nodes.filter(n => isOuter(n));
let dCount = 0;
for(let i=0;i<outerNodes.length;i++)for(let j=i+1;j<outerNodes.length;j++){
  const a=outerNodes[i],b=outerNodes[j];
  const minD=8*Math.max(NODE_RADIUS[a.type]||8,NODE_RADIUS[b.type]||8);
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

// --- Triangles ---
const adjSet = new Set<string>();
for (const [a,b] of edges) { adjSet.add(`${a}-${b}`); adjSet.add(`${b}-${a}`); }
let triCount = 0;
for (const n of nodes) {
  if (!isOuter(n)) continue;
  const conns = n.connections;
  for (let i = 0; i < conns.length; i++) for (let j = i+1; j < conns.length; j++) {
    if (adjSet.has(`${conns[i]}-${conns[j]}`)) {
      triCount++;
      if(triCount<=10) console.log(`  Tri: ${n.nodeId} - ${nodes[conns[i]].nodeId} - ${nodes[conns[j]].nodeId}`);
    }
  }
}
console.log(`Triangles (outer): ${triCount / 3}`); // each triangle counted 3 times

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

  // Foreign classSkill nodes can't be reached from this class — that's expected
  const classSkillOther = nodes.filter(n => n.type === 'classSkill' && n.classAffinity !== cls);
  const expected = nodes.length - classSkillOther.length;
  const unreached = nodes.filter(n => !visited.has(n.id) && !(n.type === 'classSkill' && n.classAffinity !== cls));

  console.log(`BFS ${cls}: reached ${visited.size}/${nodes.length} (expected ≥${expected}, unreached own: ${unreached.length})`);
  if (unreached.length > 0 && unreached.length <= 10) {
    for (const u of unreached) console.log(`  Unreached: ${u.nodeId} (type=${u.type}, class=${u.classAffinity})`);
  }
}

console.log('\n=== ALL CHECKS DONE ===');
