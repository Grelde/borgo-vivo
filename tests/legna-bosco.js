// v81: il giardino della legna da ardere nasce solo vicino a un bosco (almeno 8 alberi entro 15 celle); case lontane dal bosco non lo ricevono.
const Sim=require('../src/sim.js');const S=Sim.S;const N=Sim.N;const G=Sim.grids;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fail++;};
const cnt=(x,y)=>{let n=0;for(let j=y-15;j<=y+15;j++)for(let i=x-15;i<=x+15;i++)if(i>=0&&j>=0&&i<N&&j<N&&G.tree[j*N+i])n++;return n;};
let woods=0,bad=0;
for(const seed of [7,12,21]){
  Math.random=mulberry(seed);Sim.init(seed,'lake');S.stock.wood=400;S.stock.stone=200;
  Sim.paintDistrict(70,70,110,100,1);Sim.paintDistrict(60,110,95,130,2);Sim.paintDistrict(100,110,120,125,3);Sim.paintDistrict(40,60,56,75,4);Sim.place('well',88,96,0);Sim.place('church',84,84,0);
  for(let i=0;i<Sim.YEARL*10;i++){Sim.step(0.1);if(i%20===0)S.stock.wood=Math.max(S.stock.wood,300);}
  for(const b of Sim.buildings().values())if(b.type==='house'&&b.crop==='wood'&&b.hx!==undefined){woods++;if(cnt(b.hx,b.hy)<8)bad++;}
}
console.log('giardini della legna',woods,'senza bosco',bad);
ok(woods>0,'ci sono giardini della legna ('+woods+')');
ok(bad===0,'nessun giardino della legna lontano dal bosco');
console.log(fail?'LEGNA_BOSCO_FAIL':'LEGNA_BOSCO_OK');process.exit(fail?1:0);
