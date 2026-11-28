// v92: cantiere navale. Pece dalla carbonaia; barche da pesca (+1 pesce/ciclo) e chiatte (+2 pezzi per visita), con usura.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=30;S.stock.iron=20;S.stock.bars=10;S.stock.rope=10;S.stock.charcoal=10;S.stock.leather=10;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(60,30,100,58,2);Sim.paintDistrict(100,94,125,99,2);
const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
const hold=()=>{top('wood',60);top('stone',30);top('iron',20);top('bars',6);top('planks',22);top('rope',6);top('pitch',6);top('bars',4);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const done=t=>B().filter(b=>b.type===t&&b.state==='done');
function put1(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
const put=(type,x0,y0)=>put1(type,x0,y0)||[[90,125],[115,80],[75,100],[120,115],[65,115],[95,70],[110,135]].map(o=>put1(type,o[0],o[1])).find(Boolean)||null;
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108],['store',96,98]])Sim.place(t,x,y,0);
const stM=put('store',96,125);
const sy=put('shipyard',118,138),fi=put('fisher',112,140),ch=put('charcoal',70,70);
S.stock.wood=Math.min(S.stock.wood,60);S.stock.stone=Math.min(S.stock.stone,30);S.extra={};
console.log('1) albero');
const by=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));
ok(by.shipyard&&by.shipyard.br==='legno'&&by.shipyard.rank===6&&by.shipyard.req.includes('sawmill')&&by.shipyard.req.includes('charcoal'),'cantiere: Legno, titolo 6, dopo segheria e carbonaia');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>by[q].rank<=p.rank)),'nessun blueprint dipende da uno di titolo più alto');
console.log('2) piazzamento');
ok(!!stM,'piazzato: secondo Magazzino');ok(Sim.place('shipyard',20,20,0).ok===false,'il cantiere lontano dall\'acqua è rifiutato');
for(const [n,b] of [['cantiere',sy],['pescatore',fi]])ok(!!b,'piazzato: '+n);
console.log('3) produzione');
run(40);
ok(done('shipyard').length&&done('shipyard')[0].workers.length>=1,'calafato al lavoro');
console.log('   scorte',JSON.stringify({boats:S.stock.boats,barges:S.stock.barges,pitch:S.stock.pitch}),'cicli',JSON.stringify(S.made));
ok((S.made.shipyard|0)>0,'il cantiere ha lavorato');
ok((S.stock.boats|0)>=1,'ci sono barche da pesca: '+S.stock.boats);
ok((S.stock.barges|0)>=1,'ci sono chiatte: '+S.stock.barges);
console.log('4) effetti');
S.stock.boats=0;ok(Sim._t.boatBonus()===0,'senza barche nessun bonus di pesca');
S.stock.boats=3;S.fishN=0;ok(Sim._t.boatBonus()===Sim.BOAT_FISH,'con una barca il pescatore prende +'+Sim.BOAT_FISH+' pesce');
S.boatWear=Sim.BOAT_TRIPS-1;Sim._t.boatBonus();ok(S.stock.boats===2,'una barca si consuma dopo '+Sim.BOAT_TRIPS+' cicli');
S.stock.barges=0;ok(Sim._t.visitCap()===Sim.VISIT_CAP,'senza chiatte la visita porta '+Sim.VISIT_CAP+' pezzi');
S.stock.barges=2;ok(Sim._t.visitCap()===Sim.VISIT_CAP+2*Sim.BARGE_VISIT,'con 2 chiatte la visita porta '+(Sim.VISIT_CAP+2*Sim.BARGE_VISIT));
console.log(fails?'CANTIERE_FALLITO '+fails:'CANTIERE_OK');process.exit(fails?1:0);
