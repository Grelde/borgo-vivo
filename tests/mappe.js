// v42: mappe organiche. Stesso seme = stessa mappa; semi diversi = mappe diverse; sempre giocabili.
const Sim=require('../src/sim.js');const {N,SC,grids:G,S}=Sim;const CT=Sim.CT,K=Sim.MT/64; // v77: vale per la mappa di 64 tile (predefinita nei test) e per quella di 128 (BV_MT=128)
let fail=0;const ok=(c,m)=>{if(!c){console.log('FALLITO:',m);fail++;}};
const sig=()=>{let h=0;for(const a of [G.water,G.tree,G.rock,G.ore])for(let i=0;i<N*N;i+=7)h=(Math.imul(h,31)+a[i]+1)|0;return h;};
const stat=()=>{let w=0,mw=1e9,t26=0,r26=0,o=0,sx=0,sy=0,ford=0;
  for(let i=0;i<N*N;i++){const x=(i%N)/SC,y=((i/N)|0)/SC,d=Math.hypot(x-CT,y-CT);
    if(G.water[i]){w++;sx+=x;sy+=y;if(G.water[i]===2)ford++;if(d<mw)mw=d;}
    if(G.tree[i]&&d<26)t26++;if(G.rock[i]&&d<26)r26++;if(G.ore[i])o++;}
  return {w,mw,t26,r26,o,cx:sx/w,cy:sy/w,ford};};
for(const mode of ['lake','river']){
  const sigs=new Set(),cxs=[],cys=[];let falliti=0,tries=0;
  for(let k=0;k<40;k++){
    const sd=1000+k*131;Sim.init(sd,mode);const s=stat(),g=sig();
    sigs.add(g);cxs.push(s.cx);cys.push(s.cy);tries+=S.mapTries;if(!S.mapOK)falliti++;
    ok(S.seed===sd,mode+' seme registrato');
    ok(s.mw>=(mode==='lake'?11:9),mode+' seme '+sd+': acqua troppo vicina alla partenza ('+s.mw.toFixed(1)+')');
    ok(s.w>=1500&&s.w<=3600*(mode==='river'?K:1),mode+' seme '+sd+': quantità d\'acqua '+s.w);
    ok(s.t26>=330&&s.r26>=200&&s.o>=30,mode+' seme '+sd+': risorse insufficienti '+JSON.stringify(s));
    if(mode==='river')ok(s.ford>0,mode+' seme '+sd+': nessun guado');
    // l'area di partenza è libera e il centro cittadino è stato posato
    let blocked=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(Math.hypot(x/SC-CT,y/SC-CT)<8&&(G.water[i]||G.rock[i]||G.ore[i]||G.tree[i]))blocked++;}
    ok(blocked===0,mode+' seme '+sd+': area di partenza non libera ('+blocked+')');
    // stessa mappa se si rigioca lo stesso seme
    if(k<5){Sim.init(sd,mode);ok(sig()===g,mode+' seme '+sd+': non riproducibile');}
  }
  const sd=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);};
  ok(sigs.size===40,mode+': mappe uguali tra semi diversi ('+sigs.size+'/40)');
  ok(sd(cxs)>6*K&&sd(cys)>6*K,mode+': l\'acqua sta sempre nello stesso posto (dev. '+sd(cxs).toFixed(1)+','+sd(cys).toFixed(1)+')');
  ok(falliti===0,mode+': mappe che non hanno passato i controlli '+falliti);
  console.log(mode,'ok: 40 mappe distinte, tentativi medi',(tries/40).toFixed(2),'dispersione acqua',sd(cxs).toFixed(1),sd(cys).toFixed(1));
}
// la simulazione parte e gira su una mappa nuova senza errori
Sim.init(4242,'river');for(let i=0;i<1200;i++)Sim.step(0.05);
ok(Sim.villagers().length>=3,'abitanti presenti dopo 60 s di gioco');
console.log(fail?'MAPPE: '+fail+' FALLIMENTI':'MAPPE OK');process.exit(fail?1:0);
