// v40: salvataggio e caricamento della partita (Sim.exportState / Sim.importState).
// Controlla: il ciclo esporta → importa → riesporta è identico, nessun numero non finito, i salvataggi rovinati vengono rifiutati
// senza toccare la partita in corso, gli hook della grafica ricevono tutti gli edifici e gli abitanti, la partita continua dopo il caricamento.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'river');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(40,40,70,60,4);
Sim.paintRoad(90,100);Sim.paintRoad(91,100);Sim.paintRoad(92,100);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,20);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108],['store',100,100],['granary',108,100],['carpenter',70,100],['smithy',76,100],['school',84,112],['infirmary',96,116],['inn',96,102],['wood',48,50],['forester',52,56]])put(t,x,y);
run(30);
Sim.setEdict&&Sim.setEdict('woodDuty',true);
const st0=Sim.stats();
console.log('partita di prova: abitanti',st0.pop,'edifici',Sim.buildings().size,'viandanti',Sim.guests().length,'giorno',S.day);
ok(st0.pop>=6&&Sim.buildings().size>=10,'partita abbastanza ricca da provare (abitanti '+st0.pop+', edifici '+Sim.buildings().size+')');

console.log('1) esportazione');
let nonFinite=0;
const A=JSON.stringify(Sim.exportState(),(k,v)=>{if(typeof v==='number'&&!Number.isFinite(v)){nonFinite++;console.log('   numero non finito in',k);}return v;});
ok(nonFinite===0,'nessun numero non finito (NaN o Infinity) nello stato');
ok(A.length>1000,'salvataggio di '+Math.round(A.length/1024)+' KB');
ok(JSON.parse(A).fmt===Sim.SAVE_FMT,'formato '+Sim.SAVE_FMT);

console.log('2) ciclo esporta → importa → riesporta');
const calls={building:0,villager:0,removed:0,gone:0,trees:0,rocks:0,saps:0,ground:0};
for(const k of Object.keys(calls))Sim.hooks[k]=()=>{calls[k]++;};
const nb=Sim.buildings().size,nv=Sim.villagers().length+Sim.guests().length;
Sim.importState(JSON.parse(A));
const B=JSON.stringify(Sim.exportState());
ok(A===B,'lo stato riesportato è identico byte per byte ('+(A===B?'uguale':'DIVERSO: '+A.length+' contro '+B.length)+')');
if(A!==B){let i=0;while(i<A.length&&A[i]===B[i])i++;console.log('   prima differenza alla posizione',i,':',A.slice(Math.max(0,i-80),i+80),'|||',B.slice(Math.max(0,i-80),i+80));}
ok(calls.removed===nb&&calls.gone===nv,'la grafica vecchia viene svuotata ('+calls.removed+' edifici, '+calls.gone+' abitanti)');
ok(calls.building===nb&&calls.villager===nv,'la grafica nuova riceve tutto ('+calls.building+' edifici, '+calls.villager+' abitanti)');
ok(calls.trees>=1&&calls.rocks>=1&&calls.saps>=1&&calls.ground>=1,'alberi, rocce, piantine e terreno da ridisegnare');
const st1=Sim.stats();
ok(st1.pop===st0.pop&&st1.houses===st0.houses&&st1.day===st0.day&&st1.roads===st0.roads,'statistiche uguali dopo il caricamento (abitanti '+st1.pop+', case '+st1.houses+', giorno '+st1.day+', strade '+st1.roads+')');
ok(S.edicts.woodDuty===true,'gli editti sono conservati');
{const b=[...Sim.buildings().values()].find(x=>x.type==='store'&&!x.center);ok(!!b&&!!b.pol||!b,'le regole del Magazzino sono conservate');}

console.log('3) la partita continua dopo il caricamento');
let err=null;try{run(15);}catch(e){err=e;console.log(e.stack);}
ok(!err,'15 giorni di simulazione dopo il caricamento senza errori');
const st2=Sim.stats();
ok(st2.pop>0&&st2.day>st1.day+10,'il borgo vive (abitanti '+st2.pop+', giorno '+st2.day+')');
{const bad=[...Sim.villagers()].filter(v=>v.home!=null&&v.home>=0&&!Sim.buildings().get(v.home));ok(bad.length===0,'nessun abitante con la casa sparita ('+bad.length+')');}
{const bad=[...Sim.villagers()].filter(v=>!Sim.reg.get(v.id));ok(bad.length===0,'ogni abitante ha la sua voce nel registro anagrafico');}
ok(!JSON.stringify(Sim.exportState(),(k,v)=>typeof v==='number'&&!Number.isFinite(v)?'NF':v).includes('"NF"'),'ancora nessun numero non finito dopo la simulazione');
// salvare di nuovo e ricaricare una seconda volta (salvataggio di un salvataggio)
const C=JSON.stringify(Sim.exportState());Sim.importState(JSON.parse(C));ok(JSON.stringify(Sim.exportState())===C,'secondo ciclo di salvataggio identico');

console.log('4) salvataggi rovinati: rifiutati senza toccare la partita');
const keep=JSON.stringify(Sim.exportState());
const mut=(m,f)=>{const d=JSON.parse(keep);f(d);let thrown=null;try{Sim.importState(d);}catch(e){thrown=e;}ok(!!thrown,m+' → rifiutato'+(thrown?' ("'+thrown.message+'")':''));ok(JSON.stringify(Sim.exportState())===keep,'  la partita in corso è intatta');};
mut('formato più recente',d=>{d.fmt=Sim.SAVE_FMT+1;});
mut('formato assente',d=>{delete d.fmt;});
mut('niente edifici',d=>{delete d.buildings;});
mut('griglia troncata',d=>{d.grids.tree=d.grids.tree.slice(0,40);});
mut('griglia mancante',d=>{delete d.grids.occ;});
mut('griglia con base64 rovinato',d=>{d.grids.water='@@@@';});
mut('edificio di tipo sconosciuto',d=>{d.buildings[0].type='castello';});
mut('id doppi',d=>{d.villagers[0].id=d.buildings[0].id;});
mut('numerazione incoerente',d=>{d.nextId=1;});
mut('stato del borgo incompleto',d=>{delete d.S.stock;});
{let thrown=null;try{Sim.importState(null);}catch(e){thrown=e;}ok(!!thrown,'dati nulli → rifiutati');}
{let thrown=null;try{Sim.importState({});}catch(e){thrown=e;}ok(!!thrown,'oggetto vuoto → rifiutato');}

console.log(fails?'\nFALLITI: '+fails:'\nSAVE_OK');process.exit(fails?1:0);
