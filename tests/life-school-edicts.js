const Sim=require('../src/sim.js');const N=Sim.N;
Sim.init(7,'lake');Sim.paintDistrict(110,60,150,100,1);Sim.paintDistrict(120,130,170,170,2);
function tryP(type,x0,y0,R){for(let d=0;d<R;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==d)continue;for(let r=0;r<4;r++){const x=x0+dx,y=y0+dy;if(!Sim.canPlace(type,x,y,r)){const o=Sim.place(type,x,y,r);if(o.ok)return [x,y,r];}}}return null;}
Sim.S.stock.wood=400;Sim.S.stock.stone=300;
tryP('wood',75,80,40);tryP('quarry',122,98,40);tryP('well',112,100,10);
let church=tryP('church',104,104,30);console.log('church',church);
console.log('school',tryP('school',100,120,20));
const B=Sim.buildings();let cem=null;
for(let i=0;i<20*4400;i++){Sim.step(0.05);
 if(i===20*900){const c=[...B.values()].find(b=>b.type==='church');console.log('cemetery',JSON.stringify(Sim.addCemetery(c.id).ok));}
 if(i>20*3600&&i%2000===0){const s=Sim.stats();const sc=[...B.values()].find(b=>b.type==='school');console.log(i/20|0,'pop',s.pop,'kids',s.children,'schooled',s.schooled,'births',s.births,'deaths',s.deaths,'buried',s.buried,'school',sc&&sc.state,sc&&sc.workers.length,'learn',Sim.villagers().filter(v=>v.state==='learn').length,'ages',Sim.villagers().slice(0,4).map(v=>v.age.toFixed(1)).join(','));}}
Sim.setEdict('noImmig',true);Sim.setEdict('noUpgrade',true);console.log('edicts ok',JSON.stringify(Sim.S.edicts));
