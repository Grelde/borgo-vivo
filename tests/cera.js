// v93: cera, miele e candele. Apiario (miele, cera), ceraiolo (candele, benessere), idromele dal birrificio.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=30;S.stock.iron=20;S.stock.bars=10;S.stock.rope=10;S.stock.charcoal=10;S.stock.leather=10;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(60,30,100,58,2);Sim.paintDistrict(100,94,125,99,2);
const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
let feedHoney=false;const hold=()=>{top('wood',60);top('stone',30);top('iron',20);top('bars',6);top('planks',22);if(feedHoney)top('honey',6);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const done=t=>B().filter(b=>b.type===t&&b.state==='done');
function put1(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
const put=(type,x0,y0)=>put1(type,x0,y0)||[[90,125],[115,80],[75,100],[120,115],[65,115],[95,70],[110,135]].map(o=>put1(type,o[0],o[1])).find(Boolean)||null;
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108],['store',96,98]])Sim.place(t,x,y,0);
const stM=put('store',96,125);
const gr=put('granary',80,45),ap=put('apiary',70,100),ch=put('chandler',108,112),br=put('brewery',104,104);
S.stock.wood=Math.min(S.stock.wood,60);S.stock.stone=Math.min(S.stock.stone,30);S.extra={};
console.log('1) albero');
const by=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));
ok(by.apiary&&by.apiary.br==='campi'&&by.apiary.rank===4&&by.apiary.req.includes('sheepfold'),'apiario: Campi, titolo 4, dopo l\'ovile');
ok(by.chandler&&by.chandler.br==='campi'&&by.chandler.rank===5&&by.chandler.req.includes('apiary'),'ceraiolo: Campi, titolo 5, dopo l\'apiario');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>by[q].rank<=p.rank)),'nessun blueprint dipende da uno di titolo più alto');
console.log('2) piazzamento');
ok(!!stM,'piazzato: secondo Magazzino');
for(const [n,b] of [['granaio',gr],['apiario',ap],['ceraiolo',ch],['birrificio',br]])ok(!!b,'piazzato: '+n);
console.log('3) produzione');
run(40);
for(const t of ['apiary','chandler','brewery'])ok(done(t).length>=1&&done(t)[0].workers.length>=1,'completato e con addetto: '+t);
console.log('   scorte',JSON.stringify({honey:S.stock.honey,wax:S.stock.wax,candles:S.stock.candles,mead:S.stock.mead}),'cicli',JSON.stringify(S.made));
ok((S.made.apiary|0)>0&&((S.stock.honey|0)>0||(S.stock.mead|0)>0),'l\'apiario ha fatto miele');
ok((S.made.chandler|0)>0||(S.stock.candles|0)>0,'il ceraiolo ha fatto candele');
ok((S.stock.mead|0)>0||(S.made.brewery|0)>0,'il birrificio ha fatto idromele o birra');
console.log('4) effetti');
S.stock.candles=0;const j0=Sim.candleCover();ok(j0===0,'senza candele copertura 0');
S.stock.candles=Sim.villagers().length*Sim.CANDLE_COVER+1;ok(Sim.candleCover()===1,'con candele per il 30% copertura piena');
S.stock.candles=10;S.candleT=0;S.candleAcc=0;S.t+=Sim.DAY*2;Sim._t.candleTick();ok(S.stock.candles<10||Sim.villagers().length<Sim.CANDLE_PER,'le candele si consumano');
ok(Sim.S.stock.honey!==undefined&&Sim.STORE_KEYS.includes('candles')&&Sim.GRAN_KEYS.includes('honey')&&Sim.GRAN_KEYS.includes('mead'),'chiavi di magazzino presenti');
console.log(fails?'CERA_FALLITO '+fails:'CERA_OK');process.exit(fails?1:0);
