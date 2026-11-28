// v79: concia e cuoio. Pelli (cacciatore, macellaio) -> conceria (calce + legna) -> cuoio -> calzolaio -> scarpe che consumano e rallegrano il paese.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=20;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(60,30,100,58,2);Sim.paintDistrict(100,94,125,99,2);
const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
let feed=false;
const hold=()=>{top('wood',300);top('stone',200);if(feed){top('meat',20);}};
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
const ct=Sim.costOf('tannery'); // senza fornace e calcinaio, prima di costruirli
// le botteghe si piazzano subito, a mappa ancora libera
const ta=put('tannery',118,138),co=put('cobbler',108,112),lk=put('limekiln',104,104),hu=put('hunter',70,70);
run(10);
console.log('Abitanti',Sim.villagers().length);
console.log('1) costi e albero');
ok(ct.bricks===0&&ct.lime===0&&ct.stone===4+Math.ceil(4*1.5)+Math.ceil(2*1.5),'conceria senza fornace e calcinaio: mattoni e calce in pietra '+JSON.stringify(ct));
const by=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));
ok(by.tannery&&by.tannery.br==='tessile'&&by.tannery.rank===5,'conceria: ramo Tessile e cuoio, titolo 5');
ok(by.cobbler&&by.cobbler.br==='tessile'&&by.cobbler.rank===6&&by.cobbler.req.includes('tannery'),'calzolaio: titolo 6, dopo la conceria');
ok(Sim.BRANCHES.find(b=>b.id==='tessile').n==='Tessile e cuoio','il ramo si chiama «Tessile e cuoio»');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>by[q].rank<=p.rank)),'nessun blueprint dipende da uno di titolo più alto');
console.log('2) piazzamento');
ok(Sim.place('tannery',20,20,0).ok===false,'la conceria lontano dall\'acqua è rifiutata');
for(const [n,b] of [['conceria',ta],['calzolaio',co],['calcinaio',lk],['cacciatore',hu]])ok(!!b,'piazzato: '+n);
console.log('3) dalla pelle alle scarpe');
feed=true;run(30);
for(const t of ['tannery','cobbler','limekiln','hunter'])ok(done(t).length>=1&&done(t)[0].workers.length>=1,'completato e con addetto: '+t);
console.log('   scorte',JSON.stringify({hides:S.stock.hides,lime:S.stock.lime,leather:S.stock.leather,shoes:S.stock.shoes}),'cicli',JSON.stringify(S.made));
ok((S.made.hunter|0)>0,'il cacciatore ha lavorato: '+(S.made.hunter|0)+' cicli');
ok((S.made.tannery|0)>0,'la conceria ha lavorato: '+(S.made.tannery|0)+' cicli');
ok((S.made.cobbler|0)>0&&S.stock.shoes>0,'scarpe fatte: '+S.stock.shoes+' ('+(S.made.cobbler|0)+' cicli)');
feed=false;
console.log('4) regole di lavoro');
const T=done('tannery')[0],C=done('cobbler')[0];
S.stock.hides=1;S.stock.lime=5;S.stock.wood=Math.max(S.stock.wood,30);ok(!Sim.WS.tannery.can(T),'la conceria non lavora con meno di 2 pelli');
S.stock.hides=4;S.stock.wood=10;ok(!Sim.WS.tannery.can(T),'né con poca legna (resta alle case e ai cantieri)');
S.stock.wood=Math.max(S.stock.wood,30);S.stock.leather=0;ok(!Sim.WS.cobbler.can(C),'il calzolaio non lavora senza cuoio');
const h0=S.stock.hides;S.stock.leather=Sim.LEATHER_CAP;ok(!Sim.WS.tannery.can(T)&&S.stock.hides===h0,'con il magazzino del cuoio pieno la conceria si ferma');
console.log('5) scarpe: consumo e benessere');
const pop=Sim.villagers().length;
S.stock.shoes=0;ok(Sim.shoeCover()===0,'senza scarpe copertura 0');
S.stock.shoes=Math.min(Sim.SHOE_CAP,Math.ceil(pop*0.4));ok(Sim.shoeCover()>=Math.min(1,Sim.SHOE_CAP/(pop*0.4))-1e-9,'con scarpe per il 40% copertura piena (o massima): '+Sim.shoeCover().toFixed(2));
const v=Sim.villagers().find(x=>{S.stock.shoes=0;return Sim._t.joyOf(x)<=90;});
if(v&&Sim.shoeCover()===0){const a=Sim._t.joyOf(v);S.stock.shoes=Sim.SHOE_CAP;const b2=Sim._t.joyOf(v);const exp=Math.round(Sim.SHOE_CAP>=pop*0.4?3:3*Sim.SHOE_CAP/(pop*0.4));ok(b2-a===exp||b2===100,'le scarpe danno benessere: '+a+' -> '+b2+' (atteso +'+exp+')');}else ok(false,'trovato un abitante con benessere ≤90');
S.stock.shoes=20;S.shoeT=0;S.shoeAcc=0;Sim._t.shoeTick();
const worn=Math.floor(pop/10);ok(S.stock.shoes===Math.max(0,20-worn),'ogni giorno si consumano '+worn+' scarpe: '+S.stock.shoes);
S.stock.shoes=0;S.shoeT=0;S.shoeAcc=0;Sim._t.shoeTick();ok(S.stock.shoes===0,'senza scarpe il consumo non va sotto zero');
console.log('6) commercio, magazzini e salvataggi');
S.stock.shoes=30;S.stock.leather=20;
ok(Sim.TOWNS.w.buys.leather>0&&Sim.TOWNS.w.buys.shoes>0&&Sim.TOWNS.e.buys.hides>0&&Sim.TOWNS.s.buys.shoes>0,'le città comprano cuoio, scarpe e pelli');
ok(Sim.surplusOf('shoes')>0&&Sim.surplusOf('leather')>0,'scarpe e cuoio in eccedenza da vendere: '+Sim.surplusOf('shoes')+', '+Sim.surplusOf('leather'));
const mi=Sim.storeInfo(done('store')[0]);ok(['hides','leather','shoes'].every(k=>mi.keys.includes(k)),'il Magazzino accoglie pelli, cuoio e scarpe');
S.stock.hides=7;
const dump=JSON.parse(JSON.stringify(Sim.exportState()));
Sim.init(9,'lake');Sim.importState(dump);
ok(S.stock.hides===7&&S.stock.leather===20&&S.stock.shoes===30,'scorte salvate');
const old=JSON.parse(JSON.stringify(dump));for(const k of ['hides','leather','shoes'])delete old.S.stock[k];delete old.S.shoeT;delete old.S.shoeAcc;
Sim.importState(old);
ok(['hides','leather','shoes'].every(k=>S.stock[k]===0),'vecchi salvataggi: pelli, cuoio e scarpe a zero');
ok(Object.keys(S.stock).every(k=>Number.isFinite(S.stock[k])),'scorte tutte numeriche');
console.log(fails===0?'CUOIO_OK':'CUOIO_FAIL ('+fails+')');process.exit(fails===0?0:1);
