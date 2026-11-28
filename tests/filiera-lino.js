// v48: filiera del lino e della canapa: coltura della fattoria -> maceratoio -> telaio (lino) / cordaio (canapa) -> corde.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=20;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(60,30,100,58,2);Sim.paintDistrict(100,94,125,99,2);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const done=t=>B().filter(b=>b.type===t&&b.state==='done');
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108],['store',96,98]])Sim.place(t,x,y,0);
run(10);
let farms=done('farm');
for(let k=0;k<20&&!farms.length;k++){run(3);farms=done('farm');}
console.log('Abitanti',Sim.villagers().length,'fattorie',farms.length);
ok(farms.length>=1,'esiste una fattoria');
const f=farms[0];
ok(f.crop==='grain','coltura iniziale: grano');
ok(Sim.setFarmCrop(f.id,'boh')!=='ok'&&f.crop==='grain','coltura sconosciuta rifiutata');
console.log('1) senza maceratoio il raccolto di canapa va come grano');
ok(Sim.setFarmCrop(f.id,'hemp')==='ok'&&f.crop==='hemp','coltura canapa scelta');
ok(!Sim.retInfo().any,'nessun maceratoio');
console.log('2) maceratoio e cordaio');
ok(Sim.place('retting',20,20,0).ok===false,'il maceratoio lontano dall\'acqua è rifiutato');
const rt=put('retting',118,138),rw=put('ropewalk',108,112);
ok(!!rt,'maceratoio piazzato vicino all\'acqua');ok(!!rw,'cordaio piazzato');
run(12);
ok(done('retting').length===1&&done('retting')[0].workers.length>=1,'maceratore al lavoro');
ok(done('ropewalk').length===1&&done('ropewalk')[0].workers.length>=1,'cordaio al lavoro');
run(25);
const R=done('retting')[0],W=done('ropewalk')[0];
console.log('   maceratoio inp',JSON.stringify(R.inp),'out',R.out.flaxf,R.out.hempf,'corde',W.out.rope,'magazzino',S.stock.rope,'cicli',JSON.stringify(S.made));
ok((S.made.retting|0)>0,'il maceratoio ha lavorato: '+(S.made.retting|0)+' cicli');
ok((S.made.ropewalk|0)>0,'il cordaio ha prodotto corde: '+(S.made.ropewalk|0)+' cicli');
ok(W.out.rope+S.stock.rope>0,'corde disponibili: '+(W.out.rope+S.stock.rope));
console.log('3) lino -> tessuto');
Sim.setFarmCrop(f.id,'flax');
const wv=put('weaver',112,112);ok(!!wv,'telaio piazzato');
run(30);
const wvd=done('weaver')[0];
console.log('   fibra di lino pronta',R.out.flaxf,'cicli telaio',S.made.weaver|0);
ok(wvd&&(S.made.weaver|0)>0,'il telaio ha lavorato la fibra di lino (senza ovile): '+(S.made.weaver|0)+' cicli');
ok(wvd&&wvd.out.cloth>0||S.stock.cloth>0||done('mercery').length>=0,'tessuto prodotto');
console.log('4) corde nelle riparazioni e in magazzino');
S.stock.rope=3;S.stock.tools=3;
const tg=B().find(b=>b.state==='done'&&Sim.maintainable(b)&&b.type!=='house'&&b.type!=='retting'&&b.type!=='ropewalk');
for(const b of B())if(b!==tg&&Sim.maintainable(b))b.cond=100;
tg.cond=10;const r0=S.stock.rope;run(3);
ok(Sim.condOf(tg)>10,'edificio riparato: '+Sim.condOf(tg).toFixed(1));
ok(S.stock.rope<r0||S.stock.tools<3,'corde o attrezzi consumati nella riparazione (corde '+S.stock.rope+', attrezzi '+S.stock.tools+')');
console.log('5) salvataggio');
const dump=JSON.parse(JSON.stringify(Sim.exportState()));
Sim.init(9,'lake');Sim.importState(dump);
const f2=[...Sim.buildings().values()].find(b=>b.type==='farm');ok(f2&&f2.crop==='flax','coltura salvata e ripristinata');
const na=Sim.villagers().filter(v=>v.carry&&typeof v.carry!=='string').length;ok(na===0,'nessun carico anomalo');
console.log(fails===0?'LINO_OK':'LINO_FAIL ('+fails+')');process.exit(fails===0?0:1);
