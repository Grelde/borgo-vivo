// v88: il granaiolo ritira pescato e caccia dalle capanne con la cariola; la Merceria paga 0,75 del prezzo di rivendita; dal Granaio si compra solo l'eccedenza a metà prezzo.
const Sim=require('../src/sim.js');const S=Sim.S;const T=Sim._t;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fail++;};
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);S.stock.planks=Math.max(S.stock.planks||0,100);S.frozen=false;};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
function put(type,x0,y0){for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;for(const rot of [0,1,2,3]){const q=Sim.place(type,x0+dx,y0+dy,rot);if(q.ok)return q.b;}}return null;}
// 0) prezzi
for(const g of ['fish','meat','game']){
  ok(Math.abs(T.FOOD_P[g]*T.MERC_PAY-T.FOOD_P[g]*0.75)<1e-9&&T.MERC_PAY===0.75,g+': la Merceria paga 0,75 del prezzo di rivendita ('+T.FOOD_P[g]*T.MERC_PAY+' su '+T.FOOD_P[g]+')');
  ok(T.gPrice(g)===T.FOOD_P[g]*0.5,g+': dal Granaio si paga la metà del prezzo di Merceria ('+T.gPrice(g)+')');
  ok(Number.isInteger(T.FOOD_P[g]*T.MERC_PAY)&&Number.isInteger(T.gPrice(g)),g+': prezzi interi');
}
Math.random=mulberry(33);Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(60,60,90,92,5);
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(12);
const fi=put('fisher',120,141),hu=put('hunter',70,78);
ok(!!fi&&!!hu,'capanne piazzate');
run(8);
// 1) senza granaio: vale ancora la consegna diretta (le capanne si svuotano)
ok(!T.granaryOpen(),'senza granaio non c\'è granaiolo');
const gr=put('granary',90,120);ok(!!gr,'granaio piazzato');
run(10);
const g1=B().find(b=>b.type==='granary'&&b.state==='done');
ok(!!g1&&g1.workers.length>=1,'il granaio ha un addetto (granaiolo): '+(g1?g1.workers.length:0));
ok(T.granaryOpen(),'granaio con addetti');
// 2) la capanna tiene il prodotto e il granaiolo lo ritira
const id=g1.workers[0];
let toHut=0,toStock=0,maxOut=0,maxCargo=0;
const huts=()=>B().filter(b=>(b.type==='fisher'||b.type==='hunter')&&b.state==='done');
const s0=(S.stock.fish||0)+(S.stock.game||0);
for(let i=0;i<10*Sim.DAY/0.2;i++){
  Sim.step(0.2);if(i%10===0)hold();
  for(const h of huts()){const g=h.type==='fisher'?'fish':'game';maxOut=Math.max(maxOut,h.out[g]);}
  const v=Sim.villagers().find(q=>q.id===id);if(!v||v.job!==g1.id)continue;
  if(v.state==='toHut')toHut++;if(v.state==='toStockG')toStock++;
  if(v.cargo&&v.cargo.q)maxCargo=Math.max(maxCargo,v.cargo.q);
}
ok(toHut>0,'il granaiolo va a ritirare alle capanne ('+toHut+' passi)');
ok(toStock>0,'e porta al granaio ('+toStock+' passi)');
ok(maxCargo>0&&maxCargo<=T.BARROW_LOAD,'carico con la cariola entro '+T.BARROW_LOAD+' (massimo visto '+maxCargo+')');
ok(maxOut<=T.HUTCAP+2,'la capanna tiene al massimo '+T.HUTCAP+' (+1 ciclo): visto '+maxOut);
ok((S.stock.fish||0)+(S.stock.game||0)>s0,'pesce e selvaggina arrivano nel granaio ('+s0+' → '+((S.stock.fish||0)+(S.stock.game||0))+')');
// 3) la famiglia compra a metà prezzo solo l'eccedenza
const hs=B().filter(b=>b.type==='house'&&b.state==='done'&&b.members.length);
const h=hs[0];
S.stock.fish=0;S.stock.meat=0;S.stock.game=0;
const sur0=T.foodSurplus('fish');ok(sur0<=0,'con poco pesce in granaio non c\'è eccedenza da vendere ('+sur0+')');
S.stock.fish=900;
ok(T.foodSurplus('fish')>0,'con molto pesce c\'è eccedenza ('+T.foodSurplus('fish')+')');
// 4) la Merceria compra dal granaiolo (se si apre) e rivende al prezzo pieno
const me=put('mercery',100,100);
run(12);
const m=B().find(b=>b.type==='mercery'&&b.state==='done');
if(m){
  const fake=Sim.villagers()[0].id;
  const keep=()=>{if(!m.workers.length)m.workers.push(fake);};
  S.stock.fish=600;m.shelf.fish=0;const sold0=S.foodSold|0,coins0=S.coins;
  for(let i=0;i<6*Sim.DAY/0.2;i++){keep();Sim.step(0.2);if(i%10===0){hold();S.stock.fish=Math.max(S.stock.fish,500);}}
  console.log('  vendita: pezzi',(S.foodSold|0)-sold0,'scaffale',JSON.stringify(m.shelf));
  ok((S.foodSold|0)>sold0,'il granaiolo vende cibo in eccedenza alla Merceria ('+((S.foodSold|0)-sold0)+' pezzi)');
  m.workers.length=0;
}
// 5) acquisto di una famiglia
for(const x of hs){x.goods.fish=0;x.goods.game=0;x.goods.meat=0;x.cash=50;x.fbTry=0;}
S.stock.fish=150;S.stock.game=150;
const coins0=S.coins,cash0=hs.reduce((a,x)=>a+(x.cash|0),0),fs0=S.foodSales|0;
run(4);
ok((S.foodSales|0)>fs0,'le famiglie pagano il cibo del Granaio (incassi '+((S.foodSales|0)-fs0)+')');
ok(hs.reduce((a,x)=>a+(x.cash|0),0)<cash0,'le famiglie hanno speso denari');
console.log(fail?'GRANAIOLO_FAIL ('+fail+')':'GRANAIOLO_OK');process.exit(fail?1:0);
