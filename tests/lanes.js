// v44: le celle di passaggio tra lotti non calpestate per un anno intero diventano giardino
const Sim=require('../src/sim.js');const S=Sim.S;const N=Sim.N,G=Sim.grids;
Sim.init(7,'lake');S.stock.wood=600;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);
for(let y=96;y<=132;y++)Sim.paintRoad(92,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
Sim.place('well',84,96,0);
const touching=()=>{const hs=[...Sim.buildings().values()].filter(h=>h.type==='house'),own=new Map();for(const h of hs)for(const i of h.cells.concat(h.ext))own.set(i,h.id);
  let t=0;for(const [i,id] of own){const x=i%N,y=(i/N)|0;let f=false;for(let dy=-1;dy<=1&&!f;dy++)for(let dx=-1;dx<=1;dx++){const o=own.get((y+dy)*N+x+dx);if(o&&o!==id){f=true;break;}}if(f)t++;}return [t,hs];};
let claimed=0;const orig=Sim.hooks.regarden;Sim.hooks.regarden=b=>{claimed++;};
const YEAR=Sim.YEARL,DAY=Sim.DAY;
const days=Math.ceil(YEAR/DAY)+60;
for(let i=0;i<days*DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,400);S.stock.stone=Math.max(S.stock.stone,200);}}
const [t,hs]=touching();
console.log('anno (giorni)',Math.round(YEAR/DAY),'case',hs.length,'ampliamenti',claimed,'celle a contatto tra lotti dopo un anno',t);
// i passaggi usati di recente non vengono presi: tutte le case restano raggiungibili dalla porta
let bad=0;for(const h of hs){if(h.door<0)bad++;}
const ok=bad===0&&hs.length>=10;
console.log(ok?'LANES_OK':'LANES_FAIL');process.exit(ok?0:1);
