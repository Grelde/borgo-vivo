// v33: lotti organici: casa rettangolare 3×3..6×4 + giardino di 9-24 celle di forma libera (a lato, L, ferro di cavallo, intorno alla casa, triangolare).
const Sim=require('../src/sim.js');const S=Sim.S;const N=Sim.N,G=Sim.grids;
Sim.init(7,'lake');let regs=0;Sim.hooks.regarden=()=>{regs++;};S.stock.wood=600;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);
for(let y=96;y<=132;y++)Sim.paintRoad(92,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
Sim.place('well',84,96,0);
const ROADS=new Set();for(let i=0;i<N*N;i++)if(G.road[i])ROADS.add(i);
for(let i=0;i<40*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,400);S.stock.stone=Math.max(S.stock.stone,200);}}
const hs=[...Sim.buildings().values()].filter(h=>h.type==='house');
let bad=0;const sizes={},shapes={};
const nb=i=>[i+1,i-1,i+N,i-N];
for(const h of hs){
  sizes[h.hw+'x'+h.hh]=(sizes[h.hw+'x'+h.hh]||0)+1;shapes[h.shape]=(shapes[h.shape]||0)+1;
  const gn=h.gcells.length+h.ext.length;
  if(!(Math.min(h.hw,h.hh)>=3&&Math.max(h.hw,h.hh)<=6&&h.hw*h.hh<=24&&h.gcells.length>=9&&h.gcells.length<=24&&gn<=36)){bad++;console.log('dimensioni fuori range',h.hw,h.hh,gn);}
  for(const i of h.cells)if(G.occ[i]!==h.id){bad++;console.log('cella non occupata',h.id);break;}
  const lot=new Set(h.cells.concat(h.ext));
  // il giardino è connesso (4 direzioni) e tocca la casa
  const gset=new Set(h.gcells.concat(h.ext)),st=[h.gcells[0]],vis=new Set(st);
  while(st.length){const c=st.pop();for(const n of nb(c))if(gset.has(n)&&!vis.has(n)){vis.add(n);st.push(n);}}
  if(vis.size!==gset.size){bad++;console.log('giardino non connesso',h.id,h.shape);}
  const hset=new Set();for(let y=h.hy;y<h.hy+h.hh;y++)for(let x=h.hx;x<h.hx+h.hw;x++)hset.add(y*N+x);
  if(![...gset].some(c=>nb(c).some(n=>hset.has(n)))){bad++;console.log('giardino staccato dalla casa',h.id,h.shape);}
  // la porta è fuori dal lotto e confina ortogonalmente con esso
  if(lot.has(h.door)||!nb(h.door).some(n=>lot.has(n))){bad++;console.log('porta non adiacente al lotto',h.id);}
  // ogni cella di giardino ha almeno un blocco 2×2 o 1 cella ancora (per la grafica): se non c'è 3×3 o 2×2 va bene solo per anello/U sottili
  if(h.shape==='ring'&&h.hw>4)console.log('anello con casa larga',h.hw);
}
// triangolo: taglio diagonale: tutte le celle del giardino sono dentro (o sul) taglio e il taglio passa per almeno 4 celle
let tris=0;
for(const h of hs)if(h.diag){tris++;let on=0;for(const i of h.gcells){const v=Sim.diagVal(h,i%N+.5,((i/N)|0)+.5);if(v>1e-6){bad++;console.log('cella oltre il taglio',h.id,v);break;}if(Math.abs(v)<.1)on++;}
  if(on<4){bad++;console.log('taglio diagonale troppo corto',h.id,on);}
  const p=h.diag.p;if(Math.abs(Math.abs(p[2]-p[0])-Math.abs(p[3]-p[1]))>1e-9){bad++;console.log('taglio non a 45 gradi',h.id);}}
console.log('triangoli con taglio diagonale',tris);
// v36.1: il giardino generico (fisso) non ha uova
const pures=hs.filter(h=>h.pure);for(const h of pures)if(h.crop==='eggs'){bad++;console.log('giardino fisso con uova',h.id);}
console.log('giardini fissi',pures.length,'case con giardino ampliato',hs.filter(h=>h.ext.length).length);
// il giardino riempie lo spazio fino alla strada: nessun varco libero di 1-5 celle in linea retta tra il bordo del giardino e una strada
const GXs=[1,-1,0,0],GYs=[0,0,1,-1];let gaps=0;
for(const h of hs){const lot=new Set(h.cells.concat(h.ext));let gap=false;
  for(const c of h.gcells.concat(h.ext)){for(let d=0;d<4&&!gap;d++){if(lot.has(c+GXs[d]+GYs[d]*N))continue;
    for(let k=1;k<=6;k++){const x=c%N+GXs[d]*k,y=((c/N)|0)+GYs[d]*k;if(x<0||y<0||x>=N||y>=N)break;const i=y*N+x;if(G.road[i]||G.plev[i]>=Sim.PATH){if(k>1)gap=true;break;}if(G.occ[i]||G.tree[i]||G.rock[i]||G.water[i]||G.door[i])break;}}if(gap)break;}
  if(gap)gaps++;}
console.log('case con varco libero fino alla strada',gaps,'su',hs.length);
// ogni ampliamento avvisa la grafica (ricostruisce modello e staccionata)
const extTot=hs.reduce((a,h)=>a+(h.ext.length?1:0),0);console.log('ampliamenti notificati alla grafica',regs);if(extTot>0&&regs<extTot){bad++;console.log('ampliamenti senza notifica');}
let irregular=0;for(const h of hs){const gs=h.gcells,xs=gs.map(i=>i%N),ys=gs.map(i=>(i/N)|0);const area=(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);if(area!==gs.length)irregular++;}
console.log('giardini non rettangolari',irregular,'su',hs.length);
// toft e croft: la maggior parte delle celle del giardino sta dietro o ai lati della casa, non tra la casa e la porta
let behind=0,tot=0;for(const h of hs){const cx=h.hx+(h.hw-1)/2,cy=h.hy+(h.hh-1)/2,dx=h.door%N-cx,dy=((h.door/N)|0)-cy,hor=Math.abs(dx)>Math.abs(dy),ux=hor?Math.sign(dx):0,uy=hor?0:Math.sign(dy),hd=(hor?h.hw:h.hh)/2;
  for(const c of h.gcells){tot++;const f=((c%N)-cx)*ux+(((c/N)|0)-cy)*uy;if(f<=hd)behind++;}}
console.log('celle di giardino dietro/ai lati della casa',(behind/tot*100).toFixed(0)+'%');
if(behind/tot<0.7){bad++;console.log('troppe celle davanti alla casa');}
// i giardini restano nella zona residenziale
let fuori=0;for(const h of hs)for(const i of h.gcells.concat(h.ext))if(G.dist[i]!==1)fuori++;
console.log('celle di giardino fuori dalla zona residenziale',fuori);if(fuori){bad++;}
// passaggio: nessuna cella di un lotto è a contatto (anche in diagonale) con un altro lotto
const own=new Map();for(const h of hs)for(const i of h.cells.concat(h.ext))own.set(i,h.id);
let touch=0;for(const [i,id] of own){const x=i%N,y=(i/N)|0;let t2=false;for(let dy=-1;dy<=1&&!t2;dy++)for(let dx=-1;dx<=1;dx++){const j=(y+dy)*N+x+dx,o=own.get(j);if(o&&o!==id){t2=true;break;}}if(t2)touch++;}
console.log('celle di lotto a contatto con un altro lotto',touch);if(touch)bad++;
const seen=new Map();for(const h of hs)for(const i of h.cells){if(seen.has(i)){bad++;console.log('sovrapposizione');break;}seen.set(i,h.id);}
// ingresso verso la strada: se una strada tracciata tocca il lotto, la porta sta sulla strada o accanto
let withRoad=0,facing=0;
for(const h of hs){
  const lot=new Set(h.cells);let touch=false;for(const c of lot)if(nb(c).some(n=>ROADS.has(n)&&!lot.has(n)))touch=true;
  if(!touch)continue;withRoad++;
  if(ROADS.has(h.door)||nb(h.door).some(n=>ROADS.has(n)))facing++;
}
console.log('case',hs.length,'casa',JSON.stringify(sizes),'forme',JSON.stringify(shapes));
console.log('lotti a contatto con una strada',withRoad,'con ingresso sulla strada',facing);
const ok=bad===0&&hs.length>=10&&irregular/hs.length>=0.5&&(withRoad===0||facing/withRoad>=0.7)&&gaps<=hs.length*0.3;
console.log(ok?'LOTTI_OK':'LOTTI_FAIL');process.exit(ok?0:1);
