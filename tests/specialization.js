const Sim=require('../src/sim.js');Sim.init(7,'lake');Sim.paintDistrict(110,60,150,100,1);
for(let i=0;i<20*900;i++)Sim.step(0.05);
const H=[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');console.log('houses',H.length);
// finta: sheepfold, mine, mill presenti
for(const t of['sheepfold','mine','mill']){const b=Sim.addBuilding?null:null;}
const fake=['sheepfold','mine','mill'];
const orig=Sim.buildings();
let id=9000;for(const t of fake){orig.set(id,{id:id++,type:t,state:'done',cell:0,workers:[],members:[]});}
const cnt=k=>H.filter(h=>k==='herd'?h.crop==='herd':h[k]).length;
for(let round=0;round<4;round++){for(const h of H){h.level=Math.min(4,2+round);Sim._ct(h);}
 console.log('round',round,'herd',cnt('herd'),'weave',cnt('weave'),'craft',cnt('craft'),'tailor',cnt('tailor'),'bake',cnt('bake'),'plain',H.filter(h=>!h.weave&&!h.craft&&!h.tailor&&!h.bake).length);}
