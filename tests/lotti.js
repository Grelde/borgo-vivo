// v29: case da 3×3 a 6×4 con giardino da 3×3 (fino a 4×6); l'ingresso guarda la strada se ce n'è una accanto.
const Sim=require('../src/sim.js');const S=Sim.S;const N=Sim.N,G=Sim.grids;
Sim.init(7,'lake');S.stock.wood=600;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);
// due strade tracciate dal giocatore, prima che nascano le case
for(let y=96;y<=132;y++)Sim.paintRoad(92,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
Sim.place('well',84,96,0);
const ROADS=new Set();for(let i=0;i<N*N;i++)if(G.road[i])ROADS.add(i); // le strade si consumano col tempo: si usa il tracciato originale
for(let i=0;i<30*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,400);S.stock.stone=Math.max(S.stock.stone,200);}}
const hs=[...Sim.buildings().values()].filter(b=>b.type==='house');
let bad=0,sizes={},gs={};
const side=h=>{const x=h.door%N,y=(h.door/N)|0;return x>=h.hx+h.hw?0:x<h.hx?1:y>=h.hy+h.hh?2:3;};
const roadIn=(x0,y0,w,h)=>{let n=0;for(let y=Math.max(0,y0);y<Math.min(N,y0+h);y++)for(let x=Math.max(0,x0);x<Math.min(N,x0+w);x++){const i=y*N+x;if(ROADS.has(i))n++;}return n;};
let withRoad=0,facing=0;
for(const h of hs){
  const k=h.hw+'x'+h.hh;sizes[k]=(sizes[k]||0)+1;
  const gk=h.gw+'x'+h.gh;gs[gk]=(gs[gk]||0)+1;
  const ok=Math.min(h.hw,h.hh)>=3&&Math.max(h.hw,h.hh)<=6&&Math.min(h.hw,h.hh)>=3&&(h.hw*h.hh<=24)&&h.gw>=3&&h.gh>=3&&h.gw*h.gh+h.ext.length<=24;
  if(!ok){bad++;console.log('dimensioni fuori range',k,gk,h.ext.length);}
  for(const i of h.cells)if(G.occ[i]!==h.id){bad++;console.log('cella non occupata',h.id);break;}
  // la porta confina con la casa
  const dx=h.door%N,dy=(h.door/N)|0,adj=(dx>=h.hx-1&&dx<=h.hx+h.hw&&dy>=h.hy&&dy<h.hy+h.hh)||(dy>=h.hy-1&&dy<=h.hy+h.hh&&dx>=h.hx&&dx<h.hx+h.hw);
  if(!adj){bad++;console.log('porta lontana dalla casa',h.id);}
  const st=[roadIn(h.hx+h.hw,h.hy,2,h.hh),roadIn(h.hx-2,h.hy,2,h.hh),roadIn(h.hx,h.hy+h.hh,h.hw,2),roadIn(h.hx,h.hy-2,h.hw,2)];
  if(Math.max(...st)>0){const gside=h.gx>=h.hx+h.hw?0:h.gx+h.gw<=h.hx?1:h.gy>=h.hy+h.hh?2:3;const cand=st.map((v,k)=>k===gside?0:v);if(Math.max(...cand)>0){withRoad++;if(st[side(h)]>0)facing++;else console.log('ingresso non verso la strada',h.hx,h.hy,h.hw+'x'+h.hh,'strisce',st.join(','),'porta lato',side(h),'giardino lato',gside);}}
}
// nessuna cella occupata da due case
const seen=new Map();for(const h of hs)for(const i of h.cells){if(seen.has(i)){bad++;console.log('sovrapposizione');break;}seen.set(i,h.id);}
console.log('case',hs.length,'dimensioni casa',JSON.stringify(sizes),'giardino base',JSON.stringify(gs));
console.log('case con una strada accanto',withRoad,'con ingresso verso la strada',facing);
const okR=withRoad===0||facing/withRoad>=0.8;
console.log(bad===0&&okR&&Object.keys(sizes).length>=3?'LOTTI_OK':'LOTTI_FAIL');process.exit(bad===0&&okR&&Object.keys(sizes).length>=3?0:1);
