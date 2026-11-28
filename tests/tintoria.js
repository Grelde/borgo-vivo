// v51: tintoria: fattoria con piante tintorie -> tintoria (con tessuto del telaio) -> pezze tinte -> il sarto cuce 3 abiti invece di 2.
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
let farms=done('farm');for(let k=0;k<20&&!farms.length;k++){run(3);farms=done('farm');}
ok(farms.length>=1,'esiste una fattoria');
const f=farms[0];
ok(Sim.setFarmCrop(f.id,'dye')==='ok'&&f.crop==='dye','coltura tintorie scelta');
ok(!Sim.retInfo('dyehouse').any,'senza tintoria il raccolto va come grano');
console.log('1) tintoria e telaio');
ok(Sim.place('dyehouse',20,20,0).ok===false,'la tintoria lontano dall\'acqua è rifiutata');
const dh=put('dyehouse',118,138),wv=put('weaver',112,112),tl=put('tailor',116,100);
ok(!!dh&&!!wv&&!!tl,'tintoria, telaio e sartoria piazzati');
run(12);
const D=done('dyehouse')[0],W=done('weaver')[0],T=done('tailor')[0];
ok(!!D&&D.workers.length>=1,'tintore al lavoro');ok(!!W&&!!T,'telaio e sartoria completati');
console.log('2) piante e tessuto');
for(let k=0;k<6;k++){W.out.cloth=Math.max(W.out.cloth,10);run(3);}
console.log('   piante in attesa',D.inp.dye,'pezze tinte',D.out.dyed,'cicli',JSON.stringify(S.made));
ok((S.made.dyehouse|0)>0,'la tintoria ha tinto tessuto: '+(S.made.dyehouse|0)+' cicli');
ok(D.inp.dye+(S.made.dyehouse|0)>0,'i contadini hanno portato piante tintorie');
console.log('3) il sarto usa le pezze tinte');
D.out.dyed=10;D.inp.dye=0;W.out.cloth=0;T.out.clothes=0;S.stock.cloth=0;
for(const o of B())if(o.type==='mercery')o.shelf.cloth=0;
const c0=S.made.tailor|0,d0=S.made.dyehouse|0;run(6);
const cyc=(S.made.tailor|0)-c0;
const used=10+((S.made.dyehouse|0)-d0)-D.out.dyed;
ok(cyc>0&&used>0,'il sarto consuma le pezze tinte: '+used+' usate, '+cyc+' cicli di sartoria');
console.log('4) salvataggio');
const dump=JSON.parse(JSON.stringify(Sim.exportState()));
Sim.init(9,'lake');Sim.importState(dump);
const f2=B().find(b=>b.type==='farm');ok(f2&&f2.crop==='dye','coltura salvata e ripristinata');
ok(!!done('dyehouse')[0]&&done('dyehouse')[0].inp,'tintoria salvata con le sue scorte');
console.log(fails===0?'TINTORIA_OK':'TINTORIA_FAIL ('+fails+')');process.exit(fails===0?0:1);
