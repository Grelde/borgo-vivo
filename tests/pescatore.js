// v66.1: il pescatore va a pescare sulla riva (non resta chiuso nella capanna).
// 1) con la capanna vicino all'acqua il pescatore passa del tempo fuori, in una cella a contatto con l'acqua
// 2) intanto il pesce viene prodotto e portato alle case
// 3) senza una riva raggiungibile (ghiaccio o acqua lontana) non si blocca: lavora in bottega come prima
const Sim=require('../src/sim.js');const S=Sim.S;const G=Sim.grids;const N=Sim.N;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fail++;};
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,100);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const nearWater=i=>{const x=i%N,y=(i/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(G.water[(y+dy)*N+x+dx]===1)return true;return false;};
for(const seed of [7,12]){
  Math.random=mulberry(seed*7+3);
  Sim.init(seed,'lake');S.stock.wood=200;S.stock.stone=100;
  Sim.paintDistrict(76,76,106,104,1);run(3);
  // capanna: spirale attorno alla cella d'acqua più vicina al quartiere
  let wx=-1,wy=-1,bd=1e9;
  for(let i=0;i<N*N;i++)if(G.water[i]===1){const x=i%N,y=(i/N)|0,d=(x-91)**2+(y-90)**2;if(d<bd){bd=d;wx=x;wy=y;}}
  let fb=null;
  for(let r=0;r<40&&!fb;r+=2)for(let dy=-r;dy<=r&&!fb;dy+=2)for(let dx=-r;dx<=r&&!fb;dx+=2){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const q=Sim.place('fisher',wx+dx,wy+dy,rot);if(q.ok){fb=q.b;break;}}
  }
  ok(!!fb,'seed '+seed+': capanna del pescatore piazzata');if(!fb)continue;
  run(12);
  const b=[...Sim.buildings().values()].find(q=>q.type==='fisher'&&q.state==='done');
  ok(!!b&&b.workers.length>=1,'seed '+seed+': pescatore al lavoro');if(!b||!b.workers.length)continue;
  // senza riva: lavora in bottega come prima (3 giorni, senza ghiaccio)
  S.frozen=false;b.shore=-1;b.shoreTry=S.t+1e9;b.out.fish=0;S.stock.fish=0;const m0=S.made.fisher|0;run(3);
  ok((S.made.fisher|0)>m0,'seed '+seed+': senza riva il pescatore lavora comunque in bottega ('+((S.made.fisher|0)-m0)+' cicli)');
  b.shore=undefined;b.shoreTry=0;S.frozen=false;
  const id=b.workers[0];
  let onShore=0,inside=0,toShore=0,fishingInside=0,n=0;
  for(let i=0;i<8*Sim.DAY/0.2;i++){
    Sim.step(0.2);if(i%10===0)hold();
    const v=Sim.villagers().find(q=>q.id===id);if(!v||v.job!==b.id)continue;n++;
    if(v.state==='toShore')toShore++;
    if(v.state==='shop'&&!v.inside&&nearWater(v.cell))onShore++;
    if(v.state==='shop'&&v.inside)fishingInside++;
  }
  ok(onShore>0,'seed '+seed+': il pescatore pesca sulla riva ('+onShore+' passi)');
  ok(toShore>0,'seed '+seed+': il pescatore cammina verso la riva ('+toShore+' passi)');
  ok(fishingInside===0,'seed '+seed+': non pesca chiuso in bottega ('+fishingInside+' passi)');
  ok((S.made.fisher|0)>0,'seed '+seed+': pesce prodotto ('+(S.made.fisher|0)+' cicli)');
  ok(Sim.roleText&&true,'ruolo');
}
console.log(fail?'PESCATORE_FAIL ('+fail+')':'PESCATORE_OK');process.exit(fail?1:0);
