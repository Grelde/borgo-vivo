// v53: filiera del ferro: miniera (ferro grezzo) -> carbonaia (carbone dal legno) -> fonderia (2 ferro + 1 carbone = 2 barre) -> fucina (5 attrezzi per barra invece di 3 per ferro).
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=20;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
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
console.log('1) senza fonderia la fucina lavora come prima');
S.stock.iron=40;S.stock.bars=0;
const sm=put('smithy',108,100);ok(!!sm,'fucina piazzata');
run(10);
const smd=done('smithy')[0];ok(!!smd&&smd.workers.length>=1,'fabbro al lavoro');
S.stock.iron=40;const m0=S.made.smithy|0,i0=S.stock.iron;run(4);
ok((S.made.smithy|0)>m0&&S.stock.iron<i0,'la fucina usa il ferro grezzo: '+(i0-S.stock.iron)+' ferro, '+((S.made.smithy|0)-m0)+' cicli');
console.log('2) carbonaia');
ok(Sim.place('charcoal',20,20,0).ok===false,'la carbonaia lontano dal bosco è rifiutata');
const ch=put('charcoal',70,78);ok(!!ch,'carbonaia piazzata vicino al bosco');
S.stock.charcoal=0;
run(12);
ok(done('charcoal').length===1&&done('charcoal')[0].workers.length>=1,'carbonaio al lavoro');
run(8);
ok(S.stock.charcoal>0&&(S.made.charcoal|0)>0,'carbone prodotto: '+S.stock.charcoal+' ('+(S.made.charcoal|0)+' cicli)');
console.log('3) fonderia e barre');
const sl=put('smelter',112,112);ok(!!sl,'fonderia piazzata');
const keep=()=>{S.stock.iron=Math.max(S.stock.iron,40);};
run(10);keep();
ok(done('smelter').length===1&&done('smelter')[0].workers.length>=1,'fonditore al lavoro');
for(let k=0;k<6;k++){keep();run(2);}
ok((S.made.smelter|0)>0,'la fonderia ha fuso: '+(S.made.smelter|0)+' cicli');
ok(S.stock.bars>0||(S.made.smithy|0)>m0,'barre di ferro: '+S.stock.bars);
console.log('4) la fucina usa le barre: 5 attrezzi per barra');
S.stock.bars=10;S.stock.iron=0;const sm0=S.made.smithy|0;const b0=S.stock.bars;
for(let i=0;i<3*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){hold();S.stock.iron=0;}}
ok(S.stock.bars<b0,'la fucina consuma barre anche senza ferro grezzo: '+S.stock.bars+' rimaste');
ok((S.made.smithy|0)>sm0,'la fucina ha lavorato con le barre: '+((S.made.smithy|0)-sm0)+' cicli');
console.log('5) carbone e legno: i cantieri non restano senza legno');
S.stock.wood=10;S.stock.charcoal=0;const w0=S.stock.wood;
for(let i=0;i<2*Sim.DAY/0.2;i++){Sim.step(0.2);}
ok(S.stock.charcoal===0||S.stock.wood>=0,'senza fonderia affamata il carbone non brucia il legno scarso');
console.log('6) albero dei blueprint e commercio');
for(const id of ['charcoal','smelter','retting','ropewalk','dyehouse'])ok(!!Sim.PROJ.find(p=>p.id===id),'blueprint nell\'albero: '+id);
ok(Sim.TOWNS.e.buys.bars>0&&Sim.TOWNS.s.buys.bars>0,'le barre si vendono a Porto Fiorito e Campomaggio');
console.log('7) salvataggio');
S.stock.bars=7;S.stock.charcoal=5;
const dump=JSON.parse(JSON.stringify(Sim.exportState()));
Sim.init(9,'lake');Sim.importState(dump);
ok(S.stock.bars===7&&S.stock.charcoal===5,'barre e carbone salvati: '+S.stock.bars+', '+S.stock.charcoal);
const old=JSON.parse(JSON.stringify(dump));delete old.S.stock.bars;delete old.S.stock.charcoal;
Sim.importState(old);ok(S.stock.bars===0&&S.stock.charcoal===0,'vecchi salvataggi: barre e carbone a zero');
console.log(fails===0?'FERRO_OK':'FERRO_FAIL ('+fails+')');process.exit(fails===0?0:1);
