// v44: commercio. La Merceria (con un merciaio) riceve le carovane delle 4 città: 4 rotte da sbloccare con i denari, vendita delle eccedenze e acquisto del necessario.
// Prova in simulazione senza grafica (lento: ~1 minuto).
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
const run=(d,h)=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(h&&i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const of=t=>B().filter(b=>b.type===t);
const done=t=>of(t).filter(b=>b.state==='done');
const hs=()=>B().filter(b=>b.type==='house'&&b.state==='done');
const caravans=()=>Sim.guests().filter(g=>g.caravan);
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(12,true);
console.log('Abitanti',Sim.villagers().length,'case',hs().length);

console.log('1) senza merceria non si commercia');
ok(S.coins===Sim.COINS0&&S.coins>0,'denari iniziali: '+S.coins);
ok(S.routes.length===4&&S.routes.every(r=>!r.open),'4 rotte, tutte bloccate');
ok(Object.keys(Sim.TOWNS).length===4&&Sim.ROUTE_IDS.join('')==='wnes','4 città, una per lato');
ok(!Sim.BT.emporium,'nessun edificio nuovo: il commercio passa dalla Merceria');
const u0=Sim.unlockRoute('w');ok(!u0.ok&&/Merceria/.test(u0.msg),'sblocco rifiutato senza merceria: '+u0.msg);
ok(!Sim.tradeStatus().ok&&/Merceria/.test(Sim.tradeStatus().why),'stato commercio: '+Sim.tradeStatus().why);
run(2,true);ok(caravans().length===0,'nessuna carovana');

console.log('2) merceria aperta e rotta sbloccata');
const carp=put('carpenter',104,112);
const sm=put('smithy',108,100),ba=put('bakery',112,104);
const me=put('mercery',100,100);ok(!!me,'merceria piazzata');
run(10,true);
ok(done('mercery').length===1,'merceria completata');
ok(done('mercery')[0].workers.length>=1,'la merceria ha un merciaio: '+done('mercery')[0].workers.length);
ok(Sim.tradeStatus().ok,'stato commercio ok');
const bad=Sim.unlockRoute('s');ok(!bad.ok&&/denari/.test(bad.msg),'rotta costosa rifiutata con pochi denari: '+bad.msg);
const c0=S.coins;const u1=Sim.unlockRoute('w');
ok(u1.ok&&S.coins===c0-Sim.TOWNS.w.cost&&S.routes[0].open,'rotta di Valmora aperta, denari '+c0+' -> '+S.coins);
ok(!Sim.unlockRoute('w').ok,'non si apre due volte');
ok(!Sim.unlockRoute('x').ok,'rotta inesistente rifiutata');

console.log('3) le carovane arrivano alla merceria e commerciano');
S.stock.wood=220;S.stock.stone=160;const coinsA=S.coins;
let seen=false,toMerc=false;
for(let i=0;i<4*Sim.DAY/0.2;i++){Sim.step(0.2);const cv=caravans();if(cv.length){seen=true;if(cv.every(g=>g.inn===done('mercery')[0].id))toMerc=true;}if(S.trade.visits>=1&&caravans().length===0)break;}
ok(seen,'è comparsa una carovana');
ok(toMerc,'la carovana è diretta alla merceria');
ok(S.trade.visits>=1,'visite concluse: '+S.trade.visits);
ok(S.coins>coinsA,'il paese ha guadagnato denari: '+coinsA+' -> '+S.coins);
ok(S.tlog.length>=1&&S.tlog[0].route==='w'&&S.tlog[0].sold.length>0,'registro: '+JSON.stringify(S.tlog[0]&&S.tlog[0].sold));
ok(S.stock.wood>=60-5,'non si vende sotto la scorta da tenere: legno '+S.stock.wood);
ok(S.routes[0].visits>=1&&S.routes[0].earned>0,'statistiche della rotta aggiornate');
ok(Sim.stats().coins===S.coins&&Sim.stats().routesOpen===1,'stats: denari e rotte');
run(1);ok(caravans().every(g=>g.route==='w'),'solo la rotta aperta manda carovane');

console.log('4) regole di compravendita (carovane simulate)');
S.routes.forEach(r=>{r.open=true;r.next=1e9;});
S.edicts.quarantine=false;S.coins=500;
const mer=done('mercery')[0];
// vendita dal magazzino: solo sopra la scorta da tenere
S.stock.wood=Sim.T_KEEP.wood-10;S.stock.stone=Sim.T_KEEP.stone+30;
const e1=Sim._t.doTrade({route:'w'});
ok(e1&&!e1.sold.some(x=>x.k==='wood'),'sotto la scorta da tenere il legno non si vende');
ok(e1.sold.some(x=>x.k==='stone')&&e1.sold.find(x=>x.k==='stone').q<=Sim.VISIT_CAP,'la pietra in eccedenza si vende, al massimo '+Sim.VISIT_CAP+' pezzi per visita');
ok(S.stock.stone>=Sim.T_KEEP.stone,'la pietra non scende sotto la soglia: '+S.stock.stone);
// vendita dagli scaffali della merceria: pane oltre il fabbisogno delle case
for(const h of hs())h.goods.bread=5;
mer.shelf.bread=40;S.stock.bread=0;
const need=Sim.needAll('bread'),keep=Sim.T_KEEP.bread+need;
ok(Sim.surplusOf('bread')===Math.max(0,40-keep),'eccedenza di pane = scaffale - (scorta da tenere + bisogno delle case): '+Sim.surplusOf('bread'));
const b0=mer.shelf.bread;const e1b=Sim._t.doTrade({route:'w'});
const soldBread=(e1b.sold.find(x=>x.k==='bread')||{q:0}).q;
ok(soldBread===Math.min(Sim.VISIT_CAP,Math.max(0,40-keep))&&mer.shelf.bread===b0-soldBread,'pane venduto dagli scaffali: '+soldBread+' (scaffale '+b0+' -> '+mer.shelf.bread+')');
// se le case hanno bisogno di pane non si vende oltre il necessario
for(const h of hs())h.goods.bread=0;mer.shelf.bread=10;
ok(Sim.surplusOf('bread')===0,'con le case a corto di pane non si vende pane');
// acquisto: ferro mancante da Rocca Alta, fino al fabbisogno e mai oltre
S.stock.iron=0;S.coins=500;
for(const h of hs())h.goods.tools=0;mer.shelf.tools=0;S.stock.tools=0;
let spentTot=0;for(let k=0;k<6;k++){const c=S.coins;const e=Sim._t.doTrade({route:'n'});spentTot+=c-S.coins;ok(e.earned>=0&&e.spent>=0,'visita '+k+' ok');}
ok(S.stock.iron>0&&S.stock.iron<=Sim.T_TARGET.iron,'ferro comprato fino al fabbisogno: '+S.stock.iron+' (max '+Sim.T_TARGET.iron+')');
ok(mer.shelf.tools>=1&&mer.shelf.tools<=Sim.T_TARGET.tools,'attrezzi comprati e messi sugli scaffali della merceria: '+mer.shelf.tools+' (max '+Sim.T_TARGET.tools+')');
ok(spentTot>0,'denari spesi per gli acquisti: '+spentTot);
// senza denari non si compra
S.coins=0;S.stock.iron=0;const e2=Sim._t.doTrade({route:'n'});
ok(e2.spent===0&&S.coins>=0,'senza denari non si compra');
// si spende al massimo metà della cassa a visita
S.coins=100;S.stock.iron=0;mer.shelf.tools=0;S.stock.tools=0;for(const h of hs())h.goods.tools=0;
const r5=Sim._t.doTrade({route:'n'});ok(r5.spent<=50+r5.earned*0,'a ogni visita si spende al massimo metà della cassa: '+r5.spent+' su 100');
// interruttori
S.coins=300;S.stock.stone=Sim.T_KEEP.stone+30;S.stock.iron=0;
Sim.setTradeOpt('sell',false);const r3=Sim._t.doTrade({route:'e'});
ok(r3.earned===0&&r3.sold.length===0,'vendita automatica spenta: nessuna vendita');
Sim.setTradeOpt('sell',true);Sim.setTradeOpt('buy',false);S.stock.stone=Sim.T_KEEP.stone+30;S.stock.iron=Sim.T_KEEP.iron+20;
const r4=Sim._t.doTrade({route:'e'});
ok(r4.spent===0&&r4.bought.length===0&&r4.earned>0,'acquisto automatico spento: solo vendite ('+r4.earned+' denari)');
Sim.setTradeOpt('buy',true);
// i beni non si comprano e vendono insieme
ok(Sim.surplusOf('iron')>0&&Sim.demandOf('iron')===0,'ferro in eccedenza: nessuna domanda');
S.stock.iron=2;ok(Sim.surplusOf('iron')===0&&Sim.demandOf('iron')>0,'ferro scarso: nessuna eccedenza, c\'è domanda');
for(const g of ['tools','bread','cloth','clothes','fish','meat','wood','stone','planks','iron'])ok(Sim.T_TARGET[g]<Sim.T_KEEP[g],'soglie senza sovrapposizione: '+g+' '+Sim.T_TARGET[g]+'<'+Sim.T_KEEP[g]);
const carpDone=done('carpenter').length>0;
S.stock.planks=0;ok(carpDone?Sim.demandOf('planks')>0:Sim.demandOf('planks')===0,'assi: domanda coerente con la falegnameria');
// la merceria chiusa non commercia
const wk=mer.workers.slice();mer.workers.length=0;
ok(!Sim.tradeStatus().ok&&/merciaio/.test(Sim.tradeStatus().why),'senza merciaio: '+Sim.tradeStatus().why);
mer.workers.push(...wk);ok(Sim.tradeStatus().ok,'con il merciaio il commercio riparte');

console.log('5) quarantena e carovane');
S.routes.forEach(r=>{r.open=true;r.next=0;});S.edicts.quarantine=true;
ok(!Sim.tradeStatus().ok&&/Quarantena/.test(Sim.tradeStatus().why),'quarantena ferma il commercio');
const vBefore=S.trade.visits;run(2,true);
ok(caravans().length===0&&S.trade.visits===vBefore,'nessuna carovana in quarantena');
S.edicts.quarantine=false;

console.log('6) le quattro rotte e le carovane tornano a casa');
S.routes.forEach(r=>{r.open=true;r.next=5;r.visits=0;r.blocked=false;});
let maxLive=0;
for(let i=0;i<8*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){hold();S.coins=Math.min(S.coins,5000);}maxLive=Math.max(maxLive,caravans().length);}
ok(maxLive>=1&&maxLive<=3,'carovane contemporanee al massimo 3: '+maxLive);
console.log('  visite per rotta:',S.routes.map(r=>r.id+'='+r.visits+(r.blocked?'(bloccata)':'')).join(' '));
ok(S.routes.filter(r=>r.visits>0).length>=3,'almeno tre rotte hanno mandato carovane');
S.routes.forEach(r=>{r.next=1e9;});run(1,true);
ok(caravans().length===0,'le carovane ripartono tutte: '+caravans().length);
ok(Sim.guests().filter(g=>!g.caravan).length<=5,'i viandanti della locanda non sono scalzati');

console.log('7) salvataggio e caricamento');
const dump=JSON.stringify(Sim.exportState());
S.coins=7;S.routes[0].visits=999;
Sim.importState(JSON.parse(dump));
ok(S.coins!==7&&S.routes[0].visits!==999&&S.routes.length===4,'denari e rotte tornano come nel salvataggio');
// salvataggio di una versione precedente (senza commercio): valori di riserva
const old=JSON.parse(dump);for(const k of ['coins','routes','tradeOpt','tlog','trade'])delete old.S[k];
Sim.importState(old);
ok(S.coins===Sim.COINS0&&S.routes.length===4&&S.routes.every(r=>!r.open)&&S.tradeOpt.sell&&S.tradeOpt.buy&&Array.isArray(S.tlog),'vecchio salvataggio: valori di riserva del commercio');
Sim.importState(JSON.parse(dump));

console.log('8) merceria demolita: le carovane se ne vanno');
const me2=done('mercery')[0];
S.routes.forEach(r=>{r.next=0;});run(0.5,true);
Sim.removeBuilding(me2.id);run(1,true);
ok(!Sim.tradeStatus().ok,'senza merceria lo stato lo dice: '+Sim.tradeStatus().why);
ok(caravans().length===0,'nessuna carovana resta senza merceria');

console.log(fails?('\n'+fails+' ERRORI'):'\nTutto ok');
process.exit(fails?1:0);
