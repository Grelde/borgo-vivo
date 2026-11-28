// v71: pesca di famiglia. Ogni casa vicina a un lago o a un fiume può mandare qualcuno a pescare da solo, con metà della resa del pescatore
// (pesci al secondo di pesca). Il test misura le gite di pesca: tempo passato a pescare, pesci portati a casa, posizione (sulla riva).
const Sim=require('../src/sim.js');const S=Sim.S;const G=Sim.grids;const N=Sim.N;const T=Sim._t;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fail++;};
const WSf=Sim.WS.fisher;
ok(T.FAM_FISH_RATE===0.5,'la resa della pesca di famiglia è metà di quella del pescatore (costante '+T.FAM_FISH_RATE+')');
const fisherRate=T.FISH_CYCLE/WSf.t;                         // pesci al secondo del pescatore
const famRate=T.FAM_FISH_Q/T.famFishTime();                  // pesci al secondo della gita di famiglia
ok(Math.abs(famRate/fisherRate-0.5)<1e-9,'una gita rende '+famRate.toFixed(3)+' pesci/s contro '+fisherRate.toFixed(3)+' del pescatore (rapporto '+(famRate/fisherRate).toFixed(3)+')');
const nearW=(x,y,r)=>{let n=0;for(let yy=Math.max(0,y-r);yy<=Math.min(N-1,y+r);yy++)for(let xx=Math.max(0,x-r);xx<=Math.min(N-1,x+r);xx++)if(G.water[yy*N+xx]===1)n++;return n;};
for(const seed of [7,12]){
  Math.random=mulberry(seed*13+1);
  Sim.init(seed,'lake');S.stock.wood=300;S.stock.stone=100;
  let wx=-1,wy=-1,bd=1e9;
  for(let i=0;i<N*N;i++)if(G.water[i]===1){const x=i%N,y=(i/N)|0,d=(x-91)**2+(y-90)**2;if(d<bd){bd=d;wx=x;wy=y;}}
  Sim.paintDistrict(Math.max(4,wx-18),Math.max(4,wy-16),Math.min(N-5,wx+18),Math.min(N-5,wy+16),1);
  let famTime=0,famFish=0,onShore=0,trips=0;const prev=new Map();
  const near=(c)=>{const x=c%N,y=(c/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(G.water[(y+dy)*N+x+dx]===1)return true;return false;};
  const days=14;
  for(let i=0;i<days*Sim.DAY/0.2;i++){
    Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,200);}
    if(S.frozen)continue;
    for(const v of Sim.villagers()){
      const fishing=v.state==='doErr'&&v.err&&v.err.kind==='fish';
      if(fishing){famTime+=0.2;if(near(v.cell))onShore++;}
      if(prev.get(v.id)&&v.state==='toHomeErr'&&v.err&&v.err.kind==='fish'){famFish+=v.cq||0;trips++;}
      prev.set(v.id,fishing);
    }
  }
  const hs=[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
  const wet=hs.filter(h=>nearW(h.hx,h.hy,18)>=40),dry=hs.filter(h=>nearW(h.hx,h.hy,18)===0);
  console.log('seed',seed,'case',hs.length,'vicine all\'acqua',wet.length,'gite',trips,'pesci',famFish,'tempo di pesca',famTime.toFixed(0)+' s');
  ok(wet.length>0,'seed '+seed+': ci sono case vicine all\'acqua');
  ok(wet.every(h=>h.side==='fish'),'seed '+seed+': tutte le case molto vicine all\'acqua pescano ('+wet.filter(h=>h.side==='fish').length+'/'+wet.length+')');
  ok(dry.every(h=>h.side!=='fish'),'seed '+seed+': le case lontane dall\'acqua non pescano');
  ok(trips>0,'seed '+seed+': gite di pesca fatte in autonomia ('+trips+')');
  ok(onShore>0&&onShore===Math.round(famTime/0.2),'seed '+seed+': si pesca sempre sulla riva ('+onShore+' passi su '+Math.round(famTime/0.2)+')');
  if(famTime>0){const rate=famFish/famTime;ok(rate>=0.5*fisherRate*0.9&&rate<=0.5*fisherRate*1.1,'seed '+seed+': resa misurata '+rate.toFixed(3)+' pesci/s = '+(rate/fisherRate).toFixed(2)+' volte il pescatore (attesa 0,5)');}
}
console.log(fail?'PESCA_FAMIGLIE_FAIL ('+fail+')':'PESCA_FAMIGLIE_OK');process.exit(fail?1:0);
