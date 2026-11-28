// v47: manutenzione degli edifici con gli attrezzi, per livello di difficoltà.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
const B=()=>[...Sim.buildings().values()];
const done=t=>B().filter(b=>b.type===t&&b.state==='done');
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
function village(diff){
  Sim.init(7,'lake',diff);S.stock.wood=500;S.stock.stone=300;
  Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
  for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
  // v53: le scorte contano solo se stoccate: il test rifornisce fino alla capacità, non oltre
  const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
  return (d)=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){top('wood',300);top('stone',200);}}};
}
console.log('1) il livello di difficoltà si sceglie e si salva');
let run=village('difficile');ok(S.diff==='difficile','difficoltà scelta all\'avvio: '+S.diff);
Sim.init(7,'lake','boh');ok(S.diff==='normale','valore sconosciuto -> normale');
const dec={};
for(const d of ['facile','normale','difficile']){
  run=village(d);run(14);
  const hs=B().filter(b=>b.type==='house'&&b.state==='done');
  ok(hs.length>0,d+': case costruite '+hs.length);
  const c=hs.reduce((a,b)=>a+Sim.condOf(b),0)/hs.length;dec[d]=c;
  console.log('   condizione media case dopo 14 giorni senza attrezzi:',c.toFixed(1));
}
ok(dec.facile>dec.normale&&dec.normale>dec.difficile,'più è difficile, più gli edifici si logorano: '+JSON.stringify(dec));
console.log('2) attrezzi: i muratori riparano gli edifici logori');
run=village('normale');run(10);
const mill=put('mason',104,110);run(8);
const ms=done('mason')[0];ok(!!ms&&ms.workers.length>=1,'muratori al lavoro');
const target=B().find(b=>b.state==='done'&&Sim.maintainable(b)&&b.type!=='house'&&b.type!=='mason')||done('church')[0];
ok(!!target,'edificio da riparare: '+(target&&target.type));
// v53: gli attrezzi contano solo se stoccati in un Magazzino
put('store',112,104);run(8);
for(const b of B())if(b.state==='done'&&Sim.maintainable(b)&&b.type==='house')b.goods.tools=0;
target.cond=20;S.stock.tools=0;run(3);
ok(Sim.condOf(target)<20,'senza attrezzi nessuno ripara: '+Sim.condOf(target).toFixed(1));
S.stock.tools=5;const r0=S.repairs|0;run(3);
ok(Sim.condOf(target)>40,'con gli attrezzi l\'edificio viene riparato: '+Sim.condOf(target).toFixed(1));
ok((S.repairs|0)>r0&&S.stock.tools<5,'attrezzi consumati: '+S.stock.tools+' rimasti, riparazioni '+S.repairs);
console.log('3) effetti sul lavoro');
const fb=done('church')[0];
fb.cond=100;ok(Sim.condOf(fb)===100,'edificio in ottimo stato');
console.log('4) crollo solo a difficile');
for(const [d,expect] of [['facile',false],['normale',false],['difficile',true]]){
  run=village(d);run(8);
  const tgt=B().find(b=>b.state==='done'&&Sim.maintainable(b));
  const id=tgt.id;tgt.cond=0.01;S.stock.tools=0;
  for(const b of B())if(b.type==='house')b.goods.tools=0;
  run(0.3);
  ok(Sim.buildings().has(id)!==expect,d+': edificio a zero '+(expect?'crolla':'resta in piedi')+' (ruined '+(S.ruined|0)+')');
}
console.log('5) salvataggio');
run=village('difficile');run(6);
const t2=B().find(b=>b.state==='done'&&Sim.maintainable(b));t2.cond=42;
const dump=JSON.parse(JSON.stringify(Sim.exportState()));
Sim.init(9,'lake','facile');Sim.importState(dump);
ok(S.diff==='difficile','difficoltà ripristinata dal salvataggio');
ok(Math.abs(Sim.condOf(Sim.buildings().get(t2.id))-42)<1,'condizione salvata e ripristinata');
const old=JSON.parse(JSON.stringify(Sim.exportState()));delete old.S.diff;for(const b of old.buildings)delete b.cond;
Sim.importState(old);ok(S.diff==='facile','vecchi salvataggi: difficoltà facile');
ok(Sim.condOf([...Sim.buildings().values()][0])===100,'vecchi salvataggi: edifici in ordine');
console.log(fails===0?'MANUTENZIONE_OK':'MANUTENZIONE_FAIL ('+fails+')');process.exit(fails===0?0:1);
