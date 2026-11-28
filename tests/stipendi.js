// v65: stipendi per mestiere e chi li paga.
// Lavori manuali 1 d'argento al giorno, artigiani e servizi 2, lavori da istruiti 3 (senza scuola 2).
// Il Re paga gli stipendi finché il paese non è una Città; dal titolo di Città li paga la cassa del paese e, se non basta, restano arretrati.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,100,124,1);Sim.paintDistrict(100,70,125,90,3);Sim.paintDistrict(60,60,90,90,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,60);S.stock.flour=Math.max(S.stock.flour,60);S.stock.planks=Math.max(S.stock.planks,60);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.5;i++){Sim.step(0.5);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const hs=()=>B().filter(b=>b.type==='house'&&b.state==='done');
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(10);
console.log('Abitanti',Sim.villagers().length,'case',hs().length);

console.log('1) stipendi per mestiere');
ok(Sim.wageJob('wood')===1&&Sim.wageJob('quarry')===1&&Sim.wageJob('store')===1,'lavori manuali: 1 d\'argento al giorno');
ok(Sim.wageJob('carpenter')===2&&Sim.wageJob('smithy')===2&&Sim.wageJob('bakery')===2,'artigiani: 2 d\'argento al giorno');
ok(['school','infirmary','mercery','taxoffice'].every(t=>Sim.wageJob(t)===3&&Sim.EDU_JOBS.has(t)),'maestro, erborista, merciaio, esattore: 3 d\'argento, lavori da istruiti');
ok(Sim.wageOf({schooled:true},{type:'school'})===3&&Sim.wageOf({schooled:false},{type:'school'})===2,'chi non sa leggere e scrivere in un lavoro da istruiti prende 2');
ok(Sim.wageOf({schooled:false},{type:'wood'})===1&&Sim.wageOf({schooled:true},{type:'wood'})===1,'nei lavori manuali l\'istruzione non cambia la paga');
ok(Object.keys(Sim.WAGE_JOB).every(t=>Sim.BT[t]&&(Sim.BT[t].slots>0||t==='farm')),'ogni mestiere pagato è un edificio con posti di lavoro (la fattoria è servita dai membri della famiglia)');

console.log('2) finché non è una Città paga il Re');
ok(Sim.wagePayer()==='king'&&!S.story,'senza titoli paga il Re');
const smi=put('smithy',100,100),car=put('carpenter',108,100),qua=put('quarry',70,110);
ok(!!smi&&!!car,'fucina e falegnameria piazzate');
run(12);
const c0=S.coins,w0=S.fin.wages,k0=S.fin.king,t0=S.fin.town,pay0=Sim.villagers().reduce((a,v)=>a+(v.pay|0),0);
run(6);
const pay1=Sim.villagers().reduce((a,v)=>a+(v.pay|0),0);
ok(S.fin.wages>w0,'stipendi versati: '+(S.fin.wages-w0));
ok(S.fin.king-k0===S.fin.wages-w0&&S.fin.town===t0,'li ha pagati il Re');
ok(S.coins===c0,'la cassa del paese non si tocca');
ok(pay1-pay0===S.fin.wages-w0,'lo stipendio guadagnato dagli abitanti ('+(pay1-pay0)+') è quello versato');
const wk=Sim.villagers().filter(v=>(v.wd|0)>0);
ok(wk.length>0&&wk.every(v=>v.pay>=v.wd&&v.pay<=3*v.wd),'ogni abitante guadagna fra 1 e 3 d\'argento per giorno lavorato');
ok(wk.some(v=>v.pay>v.wd),'chi ha fatto un mestiere da artigiano ha guadagnato più di 1 al giorno');
ok(S.fin.bill>0,'conto degli stipendi dell\'ultimo giorno: '+S.fin.bill);

console.log('3) dalla Città paga la cassa del paese');
S.story=true;S.rank=6;S.raid.next=1e9;S.coins=1000;
ok(Sim.wagePayer()==='town','con il titolo di Città paga il paese');
const a0=S.coins,wA=S.fin.wages,kA=S.fin.king,tA=S.fin.town;
run(4);
ok(S.fin.wages>wA,'stipendi versati: '+(S.fin.wages-wA));
ok(S.fin.king===kA,'il Re non paga più');
ok(S.fin.town-tA===S.fin.wages-wA,'li paga il paese ('+(S.fin.town-tA)+')');
ok(a0-S.coins===S.fin.town-tA,'la cassa cala esattamente di ciò che è stato pagato');
ok(hs().every(h=>(h.owed|0)===0),'nessun arretrato con la cassa piena');
const ts=Sim.taxStats();ok(ts.payer==='town'&&ts.owed===0,'le statistiche dicono chi paga');

console.log('4) cassa vuota: gli stipendi restano arretrati');
S.coins=0;const un0=S.fin.unpaid,cash0=hs().reduce((a,h)=>a+(h.cash|0),0);
run(4);
const owed1=hs().reduce((a,h)=>a+(h.owed|0),0);
ok(S.fin.unpaid>un0&&owed1>0,'stipendi non pagati diventano arretrati: '+owed1+' d\'argento');
ok(S.coins===0&&hs().reduce((a,h)=>a+(h.cash|0),0)===cash0,'senza soldi le famiglie non incassano e la cassa non va sotto zero');
ok(hs().every(h=>(h.owed|0)<=Sim.WAGE_OWE_CAP),'gli arretrati di una famiglia hanno un tetto ('+Sim.WAGE_OWE_CAP+')');
S.coins=1000;const tB=S.fin.town;
run(2);
const owed2=hs().reduce((a,h)=>a+(h.owed|0),0);
ok(owed2<owed1,'con la cassa di nuovo piena gli arretrati si pagano per primi ('+owed1+' → '+owed2+')');
ok(S.fin.town-tB>0,'pagati dal paese: '+(S.fin.town-tB));

console.log('5) salvataggio');
const h1=hs()[0];h1.owed=5;const fin=JSON.stringify(S.fin);
const snap=JSON.parse(JSON.stringify(Sim.exportState()));
let imp=true;try{Sim.importState(JSON.parse(JSON.stringify(snap)));}catch(e){imp=false;console.log(e.message);}
ok(imp,'importazione riuscita');
ok(Sim.buildings().get(h1.id).owed===5&&JSON.stringify(S.fin)===fin&&S.rank===6,'arretrati, conti e titolo nel salvataggio');
const old=JSON.parse(JSON.stringify(snap));delete old.S.fin;delete old.S.payer;
let oldOk=true;try{Sim.importState(old);run(1.2);}catch(e){oldOk=false;console.log(e.message);}
ok(oldOk&&Number.isFinite(S.fin.king)&&Number.isFinite(S.fin.town),'un salvataggio della v64 si carica con valori di riserva');

console.log(fails?('FALLITI '+fails):'TUTTO OK');
process.exit(fails?1:0);
