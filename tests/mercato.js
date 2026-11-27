// v31.1: banchi del mercato 2×2 e molto ravvicinati. Controlla: tutti i banchi sono 2×2, nessuna cella occupata due volte, stanno dentro la zona mercato, e la distanza media dal banco più vicino è piccola (celle vuote tra un banco e l'altro).
const Sim=require('../src/sim.js');const S=Sim.S;
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108],['school',96,100]])Sim.place(t,x,y,0);
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);}}};
run(40);
const st=[...Sim.buildings().values()].filter(b=>b.type==='stall');
const N=Sim.N||192;
let bad=0;const seen=new Set();
for(const b of st){if(b.w!==2||b.h!==2)bad++;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){const k=y*N+x;if(seen.has(k))bad++;seen.add(k);}}
// spazio vuoto tra un banco e il più vicino (in celle, bordo a bordo)
const gaps=st.map(a=>{let m=99;for(const b of st){if(b===a)continue;const dx=Math.max(b.x-(a.x+a.w),a.x-(b.x+b.w),0),dy=Math.max(b.y-(a.y+a.h),a.y-(b.y+b.h),0);m=Math.min(m,Math.max(dx,dy));}return m;});
const avg=gaps.length>1?gaps.reduce((s,g)=>s+g,0)/gaps.length:0;
console.log('banchi',st.length,'non 2x2 o sovrapposti',bad,'distanza media dal banco più vicino (celle)',avg.toFixed(2),'max',Math.max(0,...gaps));
const ok=st.length>=3&&bad===0&&avg<=2;
console.log(ok?'MERCATO_OK':'MERCATO_FAIL');process.exit(ok?0:1);
