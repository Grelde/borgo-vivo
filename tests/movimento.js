// misura la fluidità del movimento: variazione di direzione per passo (0,05 s) e passi con scatto > 1 rad
const Sim=require(process.env.SIMPATH||'../src/sim.js');
const S=Sim.S;Sim.init(7,'lake');
Sim.paintDistrict(70,70,110,100,1);Sim.paintDistrict(60,110,95,130,2);Sim.paintDistrict(40,60,56,75,4);
S.stock.wood=400;S.stock.stone=300;
function tryP(t,x,y){for(let r=0;r<4;r++){const q=Sim.place(t,x,y,r);if(q.ok)return q.b;}return null;}
for(const [t,x,y] of [['wood',60,40],['well',88,96],['church',84,84]]){let b=null;for(let dx=0;dx<30&&!b;dx+=3)for(let dy=0;dy<30&&!b;dy+=3)b=tryP(t,x+dx,y+dy);}
const prev=new Map();let steps=0,jerk=0,max=0,sum=0;
for(let i=0;i<Sim.DAY*3*20;i++){Sim.step(0.05);
  for(const v of Sim.villagers()){if(!v.moving||v.fa===undefined){prev.delete(v.id);continue;}
    const p=prev.get(v.id);if(p!==undefined){const d=Math.abs(Math.atan2(Math.sin(v.fa-p),Math.cos(v.fa-p)));steps++;sum+=d;if(d>max)max=d;if(d>1)jerk++;}
    prev.set(v.id,v.fa);}}
console.log('passi',steps,'scatti>1rad',jerk,'rotazione media',(sum/steps).toFixed(3),'max',max.toFixed(2),'pop',Sim.stats().pop);
// nessuno deve camminare dentro una cella occupata (edifici): confronto con il percorso
const occ=Sim.grids.occ,w2c=Sim.w2cell||((x,z)=>{const c=Math.floor((x+Sim.W/2)/Sim.CS),r=Math.floor((z+Sim.W/2)/Sim.CS);return r*Sim.N+c;});{let bad=0,tot=0;for(let i=0;i<Sim.DAY*20;i++){Sim.step(0.05);for(const v of Sim.villagers()){if(!v.moving||v.inside)continue;tot++;if(occ[w2c(v.x,v.z)])bad++;}}console.log('in cella occupata:',bad,'su',tot);}
