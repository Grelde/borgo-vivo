const Sim=require('../src/sim.js');const S=Sim.S;Sim.init(7,'lake');
Sim.paintDistrict(70,70,110,100,1);Sim.paintDistrict(60,110,95,130,2);Sim.paintDistrict(100,110,120,125,3);Sim.paintDistrict(40,60,56,75,4);
function tryP(t,x,y){for(let r=0;r<4;r++){const q=Sim.place(t,x,y,r);if(q.ok)return q.b;}return null;}
S.stock.wood=400;S.stock.stone=300;
for(const [t,x,y] of [['wood',60,40],['quarry',130,60],['well',88,96],['church',84,84]]){let b=null;for(let dx=0;dx<30&&!b;dx+=3)for(let dy=0;dy<30&&!b;dy+=3)b=tryP(t,x+dx,y+dy);}
for(let a=1;a<=3;a++){for(let i=0;i<2400*20;i++)Sim.step(0.05);
 const hs=[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
 const w=hs.filter(h=>h.side==='wood').length,p=hs.filter(h=>h.pure).length,cold=hs.filter(h=>!h.warm).length;
 console.log('annata',a,'case',hs.length,'legna-side',w,'pure',p,'fredde',cold,'legna tot',hs.reduce((s,h)=>s+h.goods.firewood,0),'benessere',Sim.stats().avgWell.toFixed(0),'stagione',S.season);}
