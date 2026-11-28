// v57: argilla -> fornace (mattoni) e calcinaio (calce) come materiali di cantiere di fucina, fonderia, forno, mulino, chiesa, caserma; posto nell'albero dei blueprint.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=20;S.stock.iron=40;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,Math.min(300,Sim.capRes('wood')));S.stock.stone=Math.max(S.stock.stone,Math.min(200,Sim.capRes('stone')));};
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
put('store',96,112);put('granary',112,116); // v89: il centro tiene solo 30 materie prime, il resto sta nel Magazzino
run(10);
console.log('1) senza fornace e calcinaio si paga in pietra');
const c0=Sim.costOf('smithy'),c1=Sim.costOf('smelter'),c2=Sim.costOf('church');
ok(c0.bricks===0&&c0.stone===2+Math.ceil(6*1.5),'fucina: mattoni in pietra '+JSON.stringify(c0));
ok(c1.bricks===0&&c1.lime===0&&c1.stone===4+Math.ceil(8*1.5)+Math.ceil(2*1.5),'fonderia: mattoni e calce in pietra '+JSON.stringify(c1));
ok(c2.lime===0&&c2.stone===16+Math.ceil(8*1.5),'chiesa: calce in pietra '+JSON.stringify(c2));
console.log('2) cava, fornace e calcinaio');
ok(Sim.place('claypit',20,20,0).ok===false,'la cava d\'argilla lontano dall\'acqua è rifiutata');
const cp=put('claypit',118,138),bw=put('brickworks',108,112),lk=put('limekiln',104,104);
ok(!!cp&&!!bw&&!!lk,'cava, fornace e calcinaio piazzati');
run(14);
ok(done('claypit').length===1&&done('brickworks').length===1&&done('limekiln').length===1,'tutti e tre completati');
ok(done('brickworks')[0].workers.length>=1,'fornaciaio al lavoro');
run(14);
ok(S.stock.clay>0||S.stock.bricks>0,'argilla prodotta: '+S.stock.clay+' (mattoni '+S.stock.bricks+')');
ok((S.made.brickworks|0)>0&&S.stock.bricks>0,'mattoni cotti: '+S.stock.bricks+' ('+(S.made.brickworks|0)+' cicli)');
ok((S.made.limekiln|0)>0&&S.stock.lime>0,'calce cotta: '+S.stock.lime+' ('+(S.made.limekiln|0)+' cicli)');
console.log('3) i cantieri usano mattoni e calce');
const d0=Sim.costOf('smithy'),d1=Sim.costOf('smelter');
ok(d0.bricks===6&&d0.stone===2,'ora la fucina chiede 6 mattoni e 2 pietre: '+JSON.stringify(d0));
ok(d1.bricks===8&&d1.lime===2&&d1.stone===4,'la fonderia chiede mattoni e calce: '+JSON.stringify(d1));
const br0=S.stock.bricks;
const sm=put('smithy',112,100);ok(!!sm&&sm.cost.bricks===6,'il cantiere della fucina chiede mattoni');
run(12);
ok(done('smithy').length===1,'la fucina è stata costruita');
ok(sm.state==='done','cantiere completato');
ok(S.stock.bricks<br0+6,'mattoni usati dal cantiere (prima '+br0+', ora '+S.stock.bricks+')');
const sl=put('smelter',116,108);ok(!!sl&&sl.cost.lime===2,'il cantiere della fonderia chiede la calce');
run(14);
ok(done('smelter').length===1,'la fonderia è stata costruita con mattoni e calce');
console.log('4) demolire un cantiere restituisce i materiali');
const ch=put('barracks',72,76);
ok(!!ch&&ch.cost.bricks===6&&ch.cost.lime===4,'caserma: mattoni e calce nel cantiere');
ch.got.bricks=3;ch.got.lime=2;const bb=S.stock.bricks,ll=S.stock.lime;
Sim.demolishAt(ch.x,ch.y);
ok(S.stock.bricks===bb+3&&S.stock.lime===ll+2,'mattoni e calce del cantiere tornano in magazzino');
console.log('5) albero dei blueprint');
const by=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));
ok(by.claypit.req.includes('mason'),'cava d\'argilla dopo il muratore');
ok(by.brickworks.req.includes('claypit')&&by.brickworks.rank>=by.claypit.rank,'fornace dopo la cava');
ok(by.limekiln.req.includes('mason'),'calcinaio dopo il muratore');
ok(by.smithy.req.includes('brickworks')&&by.smithy.req.includes('mine'),'fucina dopo miniera e fornace');
ok(by.smelter.req.includes('brickworks')&&by.smelter.req.includes('charcoal')&&by.smelter.req.includes('mine'),'fonderia dopo miniera, carbonaia e fornace');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>by[q].rank<=p.rank)),'nessun blueprint dipende da uno di titolo più alto');
console.log('6) salvataggio e vecchi salvataggi');
const st=put('mill',76,84);
const dump=JSON.parse(JSON.stringify(Sim.exportState()));
Sim.init(9,'lake');Sim.importState(dump);
ok(!!B().find(b=>b.type==='brickworks'),'fornace salvata');
const old=JSON.parse(JSON.stringify(dump));
for(const b of old.buildings){if(b.got){delete b.got.bricks;delete b.got.lime;}if(b.fly){delete b.fly.bricks;delete b.fly.lime;}}
Sim.importState(old);
const site=B().find(b=>b.state==='site');
ok(!site||(site.got.bricks===0&&site.got.lime===0),'vecchi cantieri: mattoni e calce a zero');
ok(Object.keys(S.stock).every(k=>Number.isFinite(S.stock[k])),'scorte tutte numeriche');
console.log(fails===0?'LATERIZI_OK':'LATERIZI_FAIL ('+fails+')');process.exit(fails===0?0:1);
