import { buildSkillTree } from './skill-tree';

const tree = buildSkillTree();
const { nodes, edges, figureMembership } = tree;

function isOuter(n: any): boolean { return n.type !== 'start' && n.type !== 'classSkill'; }
function cr(ax:number,ay:number,bx:number,by:number,cx:number,cy:number) { return(bx-ax)*(cy-ay)-(by-ay)*(cx-ax); }
function onS(ax:number,ay:number,bx:number,by:number,px:number,py:number) { return Math.min(ax,bx)<=px+1e-9&&px<=Math.max(ax,bx)+1e-9&&Math.min(ay,by)<=py+1e-9&&py<=Math.max(ay,by)+1e-9; }
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

const oEdges = edges.filter(([a,b]) => isOuter(nodes[a]) && isOuter(nodes[b]));

let count = 0;
for (let i = 0; i < oEdges.length; i++) {
  const [ai,bi] = oEdges[i];
  const edgeIInFig = sameFig(ai, bi);
  for (let j = i+1; j < oEdges.length; j++) {
    const [ci,di] = oEdges[j];
    if(ai===ci||ai===di||bi===ci||bi===di)continue;
    if(!segsCross(nodes[ai].x,nodes[ai].y,nodes[bi].x,nodes[bi].y,nodes[ci].x,nodes[ci].y,nodes[di].x,nodes[di].y))continue;
    const edgeJInFig = sameFig(ci, di);
    if (edgeIInFig || edgeJInFig) {
      count++;
      const figA = figureMembership.get(ai) ?? figureMembership.get(bi) ?? '-';
      const figB = figureMembership.get(ci) ?? figureMembership.get(di) ?? '-';
      const typeA = `${nodes[ai].type}↔${nodes[bi].type}`;
      const typeB = `${nodes[ci].type}↔${nodes[di].type}`;
      const figFig = (edgeIInFig && edgeJInFig) ? 'FIG↔FIG' : 'FIG↔TREE';
      console.log(`#${count} [${figFig}] fig${figA}: ${nodes[ai].nodeId}↔${nodes[bi].nodeId} (${typeA})  ×  fig${figB}: ${nodes[ci].nodeId}↔${nodes[di].nodeId} (${typeB})`);
    }
  }
}
console.log(`\nTotal: ${count} figure crossings`);
