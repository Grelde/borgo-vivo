// v74: il cacciatore va nel bosco (come il pescatore sulla riva dalla v66.1): caccia all'aperto, vicino a un albero del folto, non chiuso nella capanna.
const Sim=require('../src/sim.js');const S=Sim.S;const G=Sim.grids;const N=Sim.N;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fail++;};
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,100);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const nearTree=i=>{const x=i%N,y=(i/N)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(G.tree[(y+dy)*N+x+dx])return true;return false;};
for(const seed of [7,12]){
  Math.random=mulberry(seed*7+3);
  Sim.init(seed,'lake');S.stock.wood=200;S.stock.stone=100;
  Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(60,60,90,92,5);run(3);
  let hb=null;
  for(let r=0;r<70&&!hb;r+=3)for(let dy=-r;dy<=r&&!hb;dy+=3)for(let dx=-r;dx<=r&&!hb;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const q=Sim.place('hunter',70+dx,78+dy,rot);if(q.ok){hb=q.b;break;}}
  }
  ok(!!hb,'seed '+seed+': capanna del cacciatore piazzata');if(!hb)continue;
  run(12);
  const b=[...Sim.buildings().values()].find(q=>q.type==='hunter'&&q.state==='done');
  ok(!!b&&b.workers.length>=1,'seed '+seed+': cacciatore al lavoro');if(!b||!b.workers.length)continue;
  // senza bosco raggiungibile: lavora in bottega come prima
  S.season=1;b.shore=-1;b.shoreTry=S.t+1e9;b.out.game=0;S.stock.game=0;const m0=S.made.hunter|0;run(3);
  ok((S.made.hunter|0)>m0,'seed '+seed+': senza bosco il cacciatore lavora comunque in bottega ('+((S.made.hunter|0)-m0)+' cicli)');
  b.shore=undefined;b.shoreTry=0;
  const id=b.workers[0];
  let inWood=0,inside=0,toWood=0;
  for(let i=0;i<8*Sim.DAY/0.2;i++){
    Sim.step(0.2);if(i%10===0){hold();S.season=1;}
    const v=Sim.villagers().find(q=>q.id===id);if(!v||v.job!==b.id)continue;
    if(v.state==='toShore')toWood++;
    if(v.state==='shop'&&!v.inside&&nearTree(v.cell))inWood++;
    if(v.state==='shop'&&v.inside)inside++;
  }
  ok(inWood>0,'seed '+seed+': il cacciatore caccia nel bosco ('+inWood+' passi)');
  ok(toWood>0,'seed '+seed+': il cacciatore cammina verso il bosco ('+toWood+' passi)');
  ok(inside===0,'seed '+seed+': non caccia chiuso in capanna ('+inside+' passi)');
  ok((S.made.hunter|0)>0,'seed '+seed+': carne prodotta ('+(S.made.hunter|0)+' cicli)');
}
console.log(fail?'CACCIATORE_FAIL ('+fail+')':'CACCIATORE_OK');process.exit(fail?1:0);
