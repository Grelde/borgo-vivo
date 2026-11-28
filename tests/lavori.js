// v56: i miglioramenti delle case sono lavori veri: il costruttore porta il materiale e costruisce; il livello sale solo a fine lavori
const Sim=require('../src/sim.js');const S=Sim.S,N=Sim.N;
Sim.init(7,'lake');S.stock.wood=300;S.stock.stone=200;
Sim.paintDistrict(60,100,125,128,1);
for(let y=96;y<=132;y++)Sim.paintRoad(92,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
let bad=0;const chk=(c,m)=>{if(!c){bad++;console.log('FALLITO:',m);}};
let ev=[];Sim.hooks.regarden=b=>{ev.push(b.work?b.work.kind+':'+b.work.st:'fine');};
for(let i=0;i<6*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);}}
const hs=[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
chk(hs.length>=3,'poche case '+hs.length);
const h=hs[0],L0=h.level,cost={wood:6,stone:8};
const w0=S.stock.wood,s0=S.stock.stone;
Sim.startHouseWork(h,'up',cost,30);
chk(h.level===L0,'livello cambiato all\'avvio');
chk(S.stock.wood===w0&&S.stock.stone===s0,'materiali tolti dal magazzino all\'avvio (devono essere portati)');
let tFirstGot=-1,tDone=-1,t0=S.t,maxBuilders=0;
for(let i=0;i<400/0.2&&tDone<0;i++){
  Sim.step(0.2);
  if(tFirstGot<0&&(h.got.wood+h.got.stone)>0)tFirstGot=S.t-t0;
  if(!h.work&&tDone<0)tDone=S.t-t0;
  const nb=[...Sim.villagers()].filter(v=>(v.state==='build'||v.state==='toBuild')&&v.target===h.id).length;maxBuilders=Math.max(maxBuilders,nb);
  chk(h.level===L0||!h.work,'livello salito prima della fine dei lavori');
}
console.log('primo materiale consegnato dopo',tFirstGot.toFixed(0),'s; lavori finiti dopo',tDone.toFixed(0),'s; costruttori contemporanei',maxBuilders,'eventi grafica',ev.length);
chk(tFirstGot>0,'nessun materiale consegnato');
chk(tDone>0,'lavori mai finiti');
chk(h.level===L0+1,'livello non salito a fine lavori');
chk(maxBuilders>=1,'nessun costruttore al lavoro');
const dw=w0-S.stock.wood,ds=s0-S.stock.stone;
chk(!h.work&&h.cost===null,'lavoro non chiuso');
chk(ev.some(e=>e==='fine'),'grafica non avvisata a fine lavori');
console.log(bad===0?'LAVORI_OK':'LAVORI_FAIL');process.exit(bad?1:0);
