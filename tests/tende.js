// v55: i cittadini senza casa si costruiscono da soli delle tende vicino al centro; le tende si smontano (metà materiali recuperati) quando si trasferiscono in casa
const Sim=require('../src/sim.js');const S=Sim.S,N=Sim.N;
Sim.init(7,'lake');
const tents=()=>[...Sim.buildings().values()].filter(b=>b.type==='tent');
let bad=0;const chk=(c,m)=>{if(!c){bad++;console.log('FALLITO:',m);}};
for(let i=0;i<60/0.2;i++)Sim.step(0.2);
let ts=tents();console.log('dopo 60 s: tende',ts.length,'finite',ts.filter(t=>t.state==='done').length);
chk(ts.length>=1,'nessuna tenda');
const c=[...Sim.buildings().values()].find(b=>b.type==='store'&&b.center).cell,cx=c%N,cy=(c/N)|0;
for(const t of ts)chk(Math.hypot(t.x-cx,t.y-cy)<=24,'tenda lontana dal centro '+Math.hypot(t.x-cx,t.y-cy).toFixed(0));
for(let i=0;i<240/0.2;i++)Sim.step(0.2);
ts=tents();chk(ts.some(t=>t.state==='done'),'nessuna tenda finita');
chk(ts.every(t=>t.members.length>=1&&t.members.length<=2),'occupanti per tenda');
const sleepers=[...Sim.villagers()].filter(v=>v.tentId);chk(sleepers.length===[...Sim.villagers()].filter(v=>!v.child&&!v.home).length,'tutti i senza casa hanno una tenda');
const wood0=S.stock.wood;
// arrivo delle case
Sim.paintDistrict(60,100,125,128,1);
for(let y=96;y<=132;y++)Sim.paintRoad(92,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
for(let i=0;i<12*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,100);S.stock.stone=Math.max(S.stock.stone,40);}}
const homeless=[...Sim.villagers()].filter(v=>!v.child&&!v.home).length;
console.log('dopo le case: senza casa',homeless,'tende',tents().length);
chk(tents().every(t=>t.members.length>=1),'tenda vuota rimasta');
chk(tents().length<=Math.ceil(homeless/2),'tende in più');
console.log(bad===0?'TENDE_OK':'TENDE_FAIL');process.exit(bad?1:0);
