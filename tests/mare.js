// v77: mappa di 128×128 tile con il mare su un lato (e un fiume o un lago). Sempre sulla mappa grande.
process.env.BV_MT='128';
const Sim=require('../src/sim.js');const {N,SC,MT,CT,grids:G,S}=Sim;
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
ok(MT===128&&N===384&&Sim.W===256&&Math.abs(Sim.CS-2/3)<1e-9,'mappa 128×128 tile, 384×384 celle, una cella misura sempre 2/3 di unità');
const sides=[0,0,0,0];let tries=0,count=0;
for(const mode of ['lake','river'])for(let k=0;k<20;k++){
  const sd=2000+k*211;Sim.init(sd,mode,undefined,{sea:true,aquifers:true});count++;tries+=S.mapTries;
  const tag=mode+' '+sd+': ';ok(S.mapOK,tag+'la mappa ha passato i controlli');ok(S.sea===1&&S.seaSide>=0&&S.seaSide<4,tag+'lato del mare registrato');sides[S.seaSide]++;
  let sea=0,fresh=0,mw=1e9,ms=1e9,seaEdge=0;
  for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0,d=Math.hypot(x/SC-CT,y/SC-CT);
    if(G.water[i]===3){sea++;if(d<ms)ms=d;}else if(G.water[i]){fresh++;if(d<mw)mw=d;}}
  ok(sea>=0.12*N*N*0.5&&sea<=0.4*N*N,tag+'il mare occupa un lato, non tutta la mappa ('+(100*sea/(N*N)).toFixed(1)+'%)');
  ok(fresh>=1500,tag+'ci sono anche acque dolci: '+(mode==='river'?'fiume':'lago')+' ('+fresh+' celle)');
  ok(ms>=0.35*CT,tag+'la costa non è addosso alla partenza (a '+ms.toFixed(1)+' tile)');
  ok(ms<=0.75*CT,tag+'la costa non è lontanissima (a '+ms.toFixed(1)+' tile)');
  ok(!G.water[CT*SC*N+CT*SC],tag+'il Centro Cittadino è sulla terraferma');
  // l'area di partenza è libera
  let blocked=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(Math.hypot(x/SC-CT,y/SC-CT)<8&&(G.water[i]||G.rock[i]||G.ore[i]||G.tree[i]))blocked++;}
  ok(blocked===0,tag+'area di partenza libera');
  // nessun albero o roccia nel mare
  let bad=0;for(let i=0;i<N*N;i++)if(G.water[i]&&(G.tree[i]||G.rock[i]||G.ore[i]))bad++;ok(bad===0,tag+'niente alberi o rocce sott\'acqua');
  // falda sotto il centro anche qui
  let a=0;for(let y=CT*SC-3;y<=CT*SC+3;y++)for(let x=CT*SC-3;x<=CT*SC+3;x++)if(G.aq[y*N+x])a++;ok(a>=40,tag+'falda sotto il centro ('+a+'/49)');
  if(k<4){// stessa mappa con lo stesso seme
    const sig=()=>{let h=0;for(const q of [G.water,G.tree,G.rock,G.ore])for(let i=0;i<N*N;i+=11)h=(Math.imul(h,31)+q[i]+1)|0;return h;};
    const g1=sig();Sim.init(sd,mode,undefined,{sea:true,aquifers:true});ok(sig()===g1,tag+'riproducibile');}
}
ok(sides.every(v=>v>=2),'tutti e quattro i lati compaiono tra le mappe ('+sides.join('/')+')');
console.log('tentativi medi',(tries/count).toFixed(2),'lati',sides.join('/'));

console.log('2) il mare non si attraversa e non si costruisce');
Sim.init(2211,'lake',undefined,{sea:true});
let sc=-1;for(let i=0;i<N*N;i++)if(G.water[i]===3){const x=i%N,y=(i/N)|0;if(x>3&&y>3&&x<N-4&&y<N-4){sc=i;break;}}
ok(sc>=0,'c\'è una cella di mare');
ok(/acqua/.test(Sim.canPlace('house',sc%N,(sc/N)|0,0)),'sul mare non si costruisce');
// senza opzione mare la mappa non ha acqua di valore 3
Sim.init(2211,'lake');let any3=0;for(let i=0;i<N*N;i++)if(G.water[i]===3)any3++;ok(any3===0&&S.sea===0,'senza l\'opzione non c\'è mare');

console.log('3) la partita gira e si salva');
Sim.init(2311,'river',undefined,{sea:true,aquifers:true,story:true});
for(let i=0;i<600;i++)Sim.step(0.1);
ok(Sim.villagers().length>=3,'abitanti presenti dopo 60 s');
const json=JSON.stringify(Sim.exportState());const w0=Array.from(G.water).join();
Sim.init(5,'lake');Sim.importState(JSON.parse(json));
ok(Array.from(G.water).join()===w0&&S.sea===1,'il salvataggio riporta mare e acque');
for(let i=0;i<100;i++)Sim.step(0.1);ok(true,'la partita ricaricata prosegue');
const old=JSON.parse(json);old.n=192;let msg='';try{Sim.importState(old);}catch(e){msg=e.message;}
ok(/altre dimensioni/.test(msg),'un salvataggio della mappa piccola è rifiutato con un messaggio chiaro: '+msg);

console.log(fail?'MARE: '+fail+' FALLIMENTI su '+n:'MARE OK ('+n+' controlli)');process.exit(fail?1:0);
