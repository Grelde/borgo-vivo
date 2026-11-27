// v25 (livello 5 = palazzo, solo con qualità della zona >= 3). v24: requisiti per salire di livello (cumulativi): L1 cibo+acqua+legna; L2 +chiesa e 2 tipi di cibo; L3 +scuola vicina e 3 tipi di cibo.
const Sim=require('../src/sim.js');const S=Sim.S;
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);
const pl=[];const NOS=process.argv[3]==='senzascuola';for(const [t,x,y] of [...(NOS?[]:[['school',96,100]]),['plaza',90,90],['statue',100,98],['flowers',104,104],['well',84,96],['church',90,108],['wood',30,60],['quarry',140,90]])pl.push(t+':'+(Sim.place(t,x,y,0).ok?'ok':'no'));
console.log('place',pl.join(' '));
let up=[0,0,0,0,0,0],bad=0;
Sim.hooks.upgraded=b=>{if(b.type!=='house')return;const L=b.level-1,f=b.flags;up[b.level]++;
  const ok=f.foodUp&&f.water&&f.fuel&&(L<2||f.church)&&(L<3||f.school)&&(L<4||f.quality);if(!ok){bad++;console.log('VIOLAZIONE livello',L,'->',b.level,JSON.stringify(f));}};
const DAYS=+process.argv[2]||30;
for(let i=0;i<DAYS*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);}}
const hs=[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
console.log('case',hs.length,'livelli',[1,2,3,4,5].map(l=>hs.filter(h=>h.level===l).length).join(','),'salite verso 2/3/4/5:',up[2],up[3],up[4],up[5]);
// controllo diretto: nessuna casa a livello >=3 senza chiesa vicina, nessuna a livello 4 senza scuola vicina (al momento del salto)
console.log(bad?'TIER_FAIL '+bad:'TIER_OK');process.exit(bad?1:0);
