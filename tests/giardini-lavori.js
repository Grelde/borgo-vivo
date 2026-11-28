// v57: i giardini veri nascono dal livello 2, con materiale e costruttori
const Sim=require('../src/sim.js');const S=Sim.S,N=Sim.N,G=Sim.grids;
Sim.init(7,'lake');let regs=0,garW=0;Sim.hooks.regarden=()=>{regs++;};
S.stock.wood=600;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);
for(let y=96;y<=132;y++)Sim.paintRoad(92,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
Sim.place('well',84,96,0);
let bad=0,seenWork=0,workerLog=0;
for(let i=0;i<90*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,400);S.stock.stone=Math.max(S.stock.stone,200);S.stock.food=Math.max(S.stock.food||0,200);}
  if(i===Math.floor(30*Sim.DAY/0.2))for(const h of Sim.buildings().values())if(h.type==='house'&&h.state==='done'&&h.level<2)h.level=2; // forza il livello 2 (i requisiti sono provati in tier.js)
  if(i%50===0)for(const h of Sim.buildings().values()){if(h.type!=='house')continue;
    if(h.level<2&&h.gfull!==false){bad++;console.log('giardino completo a livello 1',h.id);}
    if(h.work&&h.work.kind==='garden'){seenWork++;if(h.level<2){bad++;console.log('lavoro giardino a livello 1');}}}}
const hs=[...Sim.buildings().values()].filter(h=>h.type==='house');
const full=hs.filter(h=>h.gfull!==false),small=hs.filter(h=>h.gfull===false);
console.log('case',hs.length,'giardini completi',full.length,'orti piccoli',small.length,'lavori giardino visti',seenWork);
for(const h of small)if(h.gcells.length<4||h.gcells.length>6){bad++;console.log('orto piccolo anomalo',h.gcells.length);}
for(const h of full)if(h.level>=2&&h.gcells.length<7){bad++;console.log('giardino completo troppo piccolo',h.gcells.length);}
const ok=bad===0&&full.length>0&&seenWork>0;console.log(ok?'GIARDINI_LAVORI_OK':'GIARDINI_LAVORI_FAIL');process.exit(ok?0:1);
