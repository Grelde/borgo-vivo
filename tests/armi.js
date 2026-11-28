// v91: armi. Armeria (lance, spade) e arcaio (archi) riforniscono le armi della caserma.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake','facile');S.stock.wood=500;S.stock.stone=300;S.stock.planks=30;S.stock.iron=20;S.stock.bars=10;S.stock.rope=10;S.stock.charcoal=10;S.stock.leather=10;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);Sim.paintDistrict(60,30,100,58,2);Sim.paintDistrict(100,94,125,99,2);
const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
let smith=true;const hold=()=>{top('wood',60);top('stone',30);top('planks',22);top('rope',6);if(smith){top('iron',20);top('bars',6);top('charcoal',6);top('leather',6);}};
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
const bk=put('barracks',112,112),tw=put('watchtower',100,82),ar=put('armory',108,120),bo=put('bowyer',80,100);
S.stock.wood=Math.min(S.stock.wood,60);S.stock.stone=Math.min(S.stock.stone,30);S.extra={};
console.log('1) albero');
const by=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));
ok(by.armory&&by.armory.br==='difesa'&&by.armory.rank===5&&by.armory.req.includes('barracks'),'armeria: Difesa, titolo 5, dopo la caserma');
ok(by.bowyer&&by.bowyer.br==='difesa'&&by.bowyer.rank===5&&by.bowyer.req.includes('watchtower'),'arcaio: Difesa, titolo 5, dopo la torre');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>by[q].rank<=p.rank)),'nessun blueprint dipende da uno di titolo più alto');
console.log('2) piazzamento');ok(!!stM,'piazzato: secondo Magazzino');
for(const [n,b] of [['caserma',bk],['torre',tw],['armeria',ar],['arcaio',bo]])ok(!!b,'piazzato: '+n);
console.log('3) produzione');
S.stock.weapons=0;run(40);
for(const t of ['barracks','armory','bowyer'])ok(done(t).length>=1,'completato: '+t);
ok(done('armory').length&&done('armory')[0].workers.length>=1,'armaiolo al lavoro');
ok(done('bowyer').length&&done('bowyer')[0].workers.length>=1,'arcaio al lavoro');
const w=Sim._t.wt();console.log('   armi',S.stock.weapons,JSON.stringify(w),'cicli',JSON.stringify(S.made));
ok((S.made.armory|0)>0&&(w.spear+w.sword)>0,'l\'armaiolo ha fatto armi');
smith=false;S.stock.iron=0;S.stock.bars=0;S.stock.charcoal=0;S.stock.leather=0;S.stock.weapons=0;S.extra={};run(12);
ok((S.made.bowyer|0)>0&&w.bow>0,'senza ferro l\'arcaio rifornisce la caserma di archi ('+w.bow+')');
ok(S.stock.weapons>=1,'la caserma ha le sue armi: '+S.stock.weapons);
console.log(fails?'ARMI_FALLITO '+fails:'ARMI_OK');process.exit(fails?1:0);
