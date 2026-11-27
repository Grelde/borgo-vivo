// v32: edifici lavorativi (falegnameria con le assi, muratore, fabbro, forno, telaio, sartoria, pescatore, cacciatore, taverna, sala delle feste, ovile con pastori).
// Prova in simulazione senza grafica: ogni edificio ha addetti, produce, e i prodotti arrivano alle case. Confronto con la bottega del giardino.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const of=t=>B().filter(b=>b.type===t);
const done=t=>of(t).filter(b=>b.state==='done');
const hs=()=>B().filter(b=>b.type==='house'&&b.state==='done');
// cerca un posto libero per l'edificio, a partire da (x0,y0) a spirale
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(12);
console.log('Abitanti',Sim.villagers().length,'case',hs().length);

console.log('1) falegnameria e assi');
// senza falegnameria le assi si pagano in legno
const c0=Sim.costOf('school');ok(c0.planks===0&&c0.wood===14+2*4,'senza falegnameria la scuola costa legno al posto delle assi: '+JSON.stringify(c0));
const carp=put('carpenter',100,100);ok(!!carp,'falegnameria piazzata');
run(8);
ok(done('carpenter').length===1,'falegnameria completata');
ok(done('carpenter')[0].workers.length>=1,'la falegnameria ha addetti: '+done('carpenter')[0].workers.length);
run(6);
ok(S.stock.planks>0,'le assi vengono prodotte: '+S.stock.planks);
const c1=Sim.costOf('school');ok(c1.planks===4&&c1.wood===14,'con la falegnameria la scuola chiede 4 assi: '+JSON.stringify(c1));
const sc=put('school',96,100);ok(!!sc&&sc.cost.planks===4,'il cantiere della scuola chiede assi');
const p0=S.stock.planks;run(10);
ok(done('school').length===1,'la scuola è stata costruita con le assi');
ok(sc.got.planks===4,'assi consegnate al cantiere: '+sc.got.planks);

console.log('2) muratore');
const ms=put('mason',104,110);ok(!!ms,'bottega del muratore piazzata');
run(8);
ok(done('mason').length===1&&done('mason')[0].workers.length>=1,'muratori al lavoro: '+(done('mason')[0]&&done('mason')[0].workers.length));
const inf=put('infirmary',98,112);run(10);
ok(done('infirmary').length===1,'cantiere con muratori completato');

console.log('3) fabbro, forno');
S.stock.iron=60;S.stock.flour=60;
const sm=put('smithy',108,100),ba=put('bakery',112,104);ok(!!sm&&!!ba,'fucina e forno piazzati');
run(12);hold();S.stock.iron=Math.max(S.stock.iron,60);S.stock.flour=Math.max(S.stock.flour,60);run(10);
const smd=done('smithy')[0],bad=done('bakery')[0];
ok(smd&&smd.workers.length>=1,'fabbro con addetti');ok(bad&&bad.workers.length>=1,'panettiere con addetti');
ok((S.made.smithy|0)>0&&(S.made.bakery|0)>0,'cicli di lavoro: fucina '+S.made.smithy+', forno '+S.made.bakery);
const withTools=hs().filter(h=>h.goods.tools>=1).length;
ok(withTools>0,'attrezzi consegnati alle case: '+withTools+' su '+hs().length);
ok(S.delivered>0,'merci consegnate: '+S.delivered);
// resa a confronto con la bottega del giardino: la fucina fa 3 attrezzi per ferro ogni 10 s per addetto, il giardino 1 ogni 20 unità di lavoro
const sp=Sim.WS.smithy;ok(sp.t<=10,'fucina: ciclo '+sp.t+' s, 3 attrezzi per ferro');

console.log('4) ovile, telaio, sartoria');
const sf=put('sheepfold',70,70);ok(!!sf&&sf.want===1&&sf.owner===null,'ovile del giocatore con pastore (want '+(sf&&sf.want)+')');
run(10);
const sfd=done('sheepfold').filter(b=>!b.owner)[0];
ok(sfd&&sfd.workers.length>=1,'pastori assegnati: '+(sfd&&sfd.workers.length));
ok(sfd&&sfd.fields.length>0,'pascolo trovato: '+(sfd&&sfd.fields.length)+' celle');
const wv=put('weaver',112,112),tl=put('tailor',116,100);ok(!!wv&&!!tl,'telaio e sartoria piazzati');
run(20);
ok((S.made.weaver|0)>0,'il telaio ha lavorato lana: '+S.made.weaver+' cicli');
ok((S.made.tailor|0)>0,'la sartoria ha cucito: '+S.made.tailor+' cicli');

console.log('5) pescatore e cacciatore');
const fi=put('fisher',120,141),hu=put('hunter',70,78);
ok(!!fi,'capanna del pescatore piazzata vicino all\'acqua');ok(!!hu,'capanna del cacciatore piazzata vicino al bosco');
// il pescatore non si può piazzare lontano dall'acqua
ok(Sim.place('fisher',20,20,0).ok===false,'il pescatore lontano dall\'acqua è rifiutato');
run(15);
ok((S.made.fisher|0)>0||S.frozen,'pesca: '+(S.made.fisher|0)+' cicli');
ok((S.made.hunter|0)>0,'caccia: '+(S.made.hunter|0)+' cicli');

console.log('6) taverna e sala delle feste');
const j0=Sim.villagers().reduce((a,v)=>a+v.joy,0)/Math.max(1,Sim.villagers().length);
const tv=put('tavern',100,86),hl=put('hall',92,80);ok(!!tv&&!!hl,'taverna e sala piazzate');
run(10);
ok(done('tavern')[0]&&done('tavern')[0].workers.length>=1,'taverniere al lavoro');
ok(done('hall')[0]&&done('hall')[0].workers.length>=1,'musicante al lavoro');
const funHouses=hs().filter(h=>h.fun>0).length;ok(funHouses>0,'case con bonus di svago: '+funHouses);
const j1=Sim.villagers().reduce((a,v)=>a+v.joy,0)/Math.max(1,Sim.villagers().length);
console.log('  felicità media prima/dopo:',j0.toFixed(1),j1.toFixed(1));

console.log('7) stato');
const st=Sim.stats();console.log('  abitanti',st.pop,'occupati',st.jobs,'posti',st.slots,'assi',S.stock.planks);
ok(st.jobs>0,'abitanti occupati');
const na=Sim.villagers().filter(v=>v.carry&&typeof v.carry!=='string').length;ok(na===0,'nessun carico anomalo');
console.log(fails===0?'WORKSHOPS_OK':'WORKSHOPS_FAIL ('+fails+')');process.exit(fails===0?0:1);
