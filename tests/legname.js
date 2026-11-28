// v88: segheria, bottaio, carradore. Segheria 3 assi/legno; botti (+1 a birra/vino/conserve); carri (carico 2 per chi non è al Magazzino, usura).
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=30;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(60,30,100,58,2);Sim.paintDistrict(100,94,125,99,2);
const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
const hold=()=>{top('wood',300);top('stone',200);top('iron',20);top('bars',6);top('planks',22);};
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
const sw=put('sawmill',118,138),co=put('cooper',108,112),ww=put('wheelwright',104,104);
console.log('1) albero');
const by=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));
ok(by.sawmill&&by.sawmill.br==='legno'&&by.sawmill.rank===5&&by.sawmill.req.includes('carpenter'),'segheria: Legno, titolo 5, dopo il falegname');
ok(by.cooper&&by.cooper.rank===6&&by.cooper.req.includes('sawmill'),'bottaio: titolo 6, dopo la segheria');
ok(by.wheelwright&&by.wheelwright.rank===6&&by.wheelwright.req.includes('sawmill'),'carradore: titolo 6, dopo la segheria');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>by[q].rank<=p.rank)),'nessun blueprint dipende da uno di titolo più alto');
console.log('2) piazzamento');
ok(Sim.place('sawmill',20,20,0).ok===false,'la segheria lontano dall\'acqua è rifiutata');
for(const [n,b] of [['segheria',sw],['bottaio',co],['carradore',ww]])ok(!!b,'piazzato: '+n);
console.log('3) produzione');
run(35);
for(const t of ['sawmill','cooper','wheelwright'])ok(done(t).length>=1&&done(t)[0].workers.length>=1,'completato e con addetto: '+t);
console.log('   scorte',JSON.stringify({planks:S.stock.planks,barrels:S.stock.barrels,carts:S.stock.carts}),'cicli',JSON.stringify(S.made));
ok((S.made.sawmill|0)>0,'la segheria ha lavorato');
ok((S.stock.barrels|0)>0||(S.made.cooper|0)>0,'il bottaio ha fatto botti');
ok((S.stock.carts|0)>0||(S.made.wheelwright|0)>0,'il carradore ha fatto carri');
console.log('4) carri e botti');
S.stock.carts=0;const v=Sim.villagers().find(x=>x.job&&Sim.buildings().get(x.job)&&Sim.buildings().get(x.job).type!=='store');
ok(v&&Sim.haulCap(v)===1,'senza carri si porta 1 pezzo a mano');
S.stock.carts=3;ok(Sim.haulCap(v)===Sim.CART_AUX,'con un carro si portano '+Sim.CART_AUX+' pezzi');
S.cartTrips=Sim.CART_TRIPS-1;Sim._t.useCart(v);ok(S.stock.carts===2,'il carro si consuma dopo '+Sim.CART_TRIPS+' viaggi');
const sn=Sim.exportState?Sim.exportState():null;ok(!sn||JSON.stringify(sn).includes('barrels'),'botti e carri nel salvataggio');
console.log(fails?'LEGNAME_FALLITO '+fails:'LEGNAME_OK');process.exit(fails?1:0);
