// v38: Merceria. Le botteghe (fucina, forno, sartoria, telaio) portano attrezzi, pane, tessuto e abiti agli scaffali della merceria;
// le famiglie mandano qualcuno a ritirare ciò che manca. Senza merciaio, o con lo scaffale pieno, si consegna alle case come prima.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,60);S.stock.flour=Math.max(S.stock.flour,60);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const of=t=>B().filter(b=>b.type===t);
const done=t=>of(t).filter(b=>b.state==='done');
const hs=()=>B().filter(b=>b.type==='house'&&b.state==='done');
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

console.log('1) definizione');
ok(!!Sim.BT.mercery&&Sim.BT.mercery.name==='Merceria','edificio Merceria definito');
ok(Sim.WS.mercery&&Sim.WS.mercery.can({}),'la merceria è un luogo di lavoro con addetti');
ok(Sim.MERC.join()==='tools,bread,cloth,clothes','merce venduta: attrezzi, pane, tessuto, abiti (non materie prime, non pesce/carne)');

console.log('2) senza merceria le botteghe consegnano alle case');
const carp=put('carpenter',100,100);run(10);
const sm=put('smithy',108,100),ba=put('bakery',112,104);ok(!!sm&&!!ba,'fucina e forno piazzati');
run(14);
const d0=S.delivered|0;
ok(d0>0,'consegne dirette alle case senza merceria: '+d0);
ok(!(S.stocked|0),'nessuno scaffale usato senza merceria');

console.log('3) con la merceria aperta');
const me=put('mercery',96,104);ok(!!me&&me.cost.planks===4&&me.shelf&&me.shelf.tools===0,'merceria piazzata con scaffali vuoti, costo '+JSON.stringify(me&&me.cost));
run(14);
const m=done('mercery')[0];
ok(!!m,'merceria completata');
ok(m&&m.workers.length>=1,'merciaio al lavoro: '+(m&&m.workers.length));
const role=m&&m.workers.length?Sim.roleText(Sim.villagers().find(v=>v.job===m.id)):'';
console.log('  ruolo:',role);
run(14);
ok((S.stocked|0)>0,'le botteghe portano la merce alla merceria: '+(S.stocked|0)+' pezzi');
const sh=m?m.shelf:{};
ok((sh.tools|0)+(sh.bread|0)>0||(S.fetched|0)>0,'scaffali: attrezzi '+sh.tools+', pane '+sh.bread+', tessuto '+sh.cloth+', abiti '+sh.clothes);
ok((S.fetched|0)>0,'le famiglie ritirano la merce alla merceria: '+(S.fetched|0)+' pezzi');
const dd=S.delivered|0;
let capOk=true;for(const g of Sim.MERC)if(m.shelf[g]>Sim.SHELFCAP||m.shelf[g]<0)capOk=false;
ok(capOk,'scaffali entro 0 e '+Sim.SHELFCAP);
const withTools=hs().filter(h=>h.goods.tools>=1).length;ok(withTools>0,'case con attrezzi: '+withTools+' su '+hs().length);
const errs=Sim.villagers().filter(v=>v.err&&v.err.kind==='merc').map(v=>Sim.roleText(v));
console.log('  commissioni in corso:',errs.length,errs[0]||'');

console.log('4) scaffale pieno: si consegna alle case');
for(const g of Sim.MERC)m.shelf[g]=Sim.SHELFCAP;
const st0=S.stocked|0,dl0=S.delivered|0;
run(8);
ok((S.delivered|0)>dl0,'con gli scaffali pieni la merce va alle case: '+((S.delivered|0)-dl0));
ok(Sim.MERC.every(g=>m.shelf[g]<=Sim.SHELFCAP),'nessun scaffale oltre il limite');

console.log('5) il sarto compra il tessuto alla merceria');
m.shelf.cloth=20;
const tl=put('tailor',116,100);ok(!!tl,'sartoria piazzata');
run(14);
ok(done('tailor').length===1&&done('tailor')[0].workers.length>=1,'sarto al lavoro');
ok(m.shelf.cloth<20,'il tessuto degli scaffali viene usato dal sarto: '+m.shelf.cloth+'/20');
ok((S.made.tailor|0)>0,'la sartoria ha cucito: '+(S.made.tailor|0)+' cicli');

console.log('6) merceria chiusa senza merciaio');
Sim.setWant(m.id,0);
run(3);
ok(m.workers.length===0,'senza posti per il merciaio la merceria resta senza addetti');
run(2);
const f0=S.fetched|0,s1=S.stocked|0,dl1=S.delivered|0;
run(8);
ok((S.fetched|0)===f0,'nessun ritiro a merceria chiusa: '+((S.fetched|0)-f0));
ok((S.stocked|0)===s1,'nessuna merce portata a merceria chiusa: '+((S.stocked|0)-s1));
ok((S.delivered|0)>dl1,'a merceria chiusa le botteghe consegnano di nuovo alle case: '+((S.delivered|0)-dl1));
console.log(fails===0?'MERCERIA_OK':'MERCERIA_FAIL ('+fails+')');process.exit(fails===0?0:1);
