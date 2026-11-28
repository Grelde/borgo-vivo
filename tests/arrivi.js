// i nuovi abitanti arrivano a piedi dal bordo della mappa fino alla casa (non compaiono dal nulla)
const Sim=require('../src/sim.js');
const S=Sim.S,N=Sim.N;Sim.init(7,'lake');
Sim.paintDistrict(70,70,110,100,1);Sim.paintDistrict(60,110,95,130,2);Sim.paintDistrict(40,60,56,75,4);
S.stock.wood=400;S.stock.stone=300;
function tryP(t,x,y){for(let r=0;r<4;r++){const q=Sim.place(t,x,y,r);if(q.ok)return q.b;}return null;}
for(const [t,x,y] of [['wood',60,40],['well',88,96],['church',84,84]]){let b=null;for(let dx=0;dx<30&&!b;dx+=3)for(let dy=0;dy<30&&!b;dy+=3)b=tryP(t,x+dx,y+dy);}
const seen=new Map();let ok=0,edgeStart=0,fromDoor=0,t0=0;const times=[];
for(let i=0;i<Sim.DAY*5*20;i++){Sim.step(0.05);
  for(const v of Sim.villagers()){
    if(v.newc&&!seen.has(v.id)){const c=v.cell,x=c%N,y=(c/N)|0;seen.set(v.id,{t:S.t,edge:x===0||y===0||x===N-1||y===N-1});if(seen.get(v.id).edge)edgeStart++;}
    const r=seen.get(v.id);if(r&&!v.newc&&!r.done){r.done=true;ok++;times.push(S.t-r.t);}
  }}
const total=seen.size;
console.log('nuovi arrivati',total,'partiti dal bordo',edgeStart,'giunti a casa',ok,'tempo medio di cammino',times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length)+' s':'-','pop',Sim.stats().pop);
console.log(total>0&&edgeStart===total&&ok>=total-2?'ARRIVI_OK':'ARRIVI_FAIL');
