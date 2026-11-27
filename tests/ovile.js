// v36: l'ovile si costruisce solo dentro una zona Pascolo, la zona contigua diventa un recinto e le pecore restano dentro.
// Prova con DOM finto (la grafica WebGL non viene verificata): regole di posa, recinto contiguo, movimento delle pecore.
const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}}};
global.addEventListener=()=>{};
let frames=0;
global.requestAnimationFrame=(f)=>{if(frames++<300)setTimeout(()=>f(performance.now()+frames*16),0);};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__begin=begin;global.__ents=ents;global.__animSheep=animSheep;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');
__begin(process.argv[2]||'lake');
const S=Sim.S,N=Sim.N,CS=Sim.CS,W=Sim.W;let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(60,60,90,92,5);
const dist=Sim.grids.dist;

console.log('1) posa solo dentro il pascolo');
let msgOut=null;
for(let y=0;y<N-8&&msgOut===null;y+=4)for(let x=0;x<N-8&&msgOut===null;x+=4){if(dist[y*N+x]===5)continue;const m=Sim.canPlace('sheepfold',x,y,0);if(/Pascolo/.test(m))msgOut=m;}
ok(msgOut!==null,'fuori dal pascolo la posa è rifiutata: '+msgOut);
let sf=null;
for(let r=0;r<40&&!sf;r+=2)for(let dy=-r;dy<=r&&!sf;dy+=2)for(let dx=-r;dx<=r&&!sf;dx+=2){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;hold();for(let rot=0;rot<4&&!sf;rot++){const q=Sim.place('sheepfold',70+dx,70+dy,rot);if(q.ok)sf=q.b;}}
ok(!!sf,'dentro il pascolo la posa riesce');
if(!sf){console.log('FALLITO');process.exit(1);}
let inside=true;for(let y=sf.y;y<sf.y+sf.h;y++)for(let x=sf.x;x<sf.x+sf.w;x++)if(dist[y*N+x]!==5)inside=false;
ok(inside,'tutta l\'impronta dell\'ovile è in zona Pascolo');

console.log('2) recinto contiguo');
for(let i=0;i<4000&&sf.state!=='done';i++){Sim.step(0.05);if(i%20===0)hold();}
ok(sf.state==='done','ovile completato');
const pen=new Set(sf.pen);
ok(sf.pen.length>sf.w*sf.h&&sf.fields.length>0,'recinto: '+sf.pen.length+' celle, di cui '+sf.fields.length+' di pascolo libero');
let fp=true;for(let y=sf.y;y<sf.y+sf.h;y++)for(let x=sf.x;x<sf.x+sf.w;x++)if(!pen.has(y*N+x))fp=false;
ok(fp,'il recinto comprende l\'impronta dell\'ovile');
ok(sf.fields.every(i=>dist[i]===5&&pen.has(i)),'ogni cella di pascolo libero è zona Pascolo e sta nel recinto');
const seen=new Set([sf.pen[0]]),q=[sf.pen[0]];
for(let k=0;k<q.length;k++){const i=q[k],x=i%N,y=(i/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const j=ny*N+nx;if(pen.has(j)&&!seen.has(j)){seen.add(j);q.push(j);}}}
ok(seen.size===pen.size,'il recinto è un\'unica zona connessa');
ok(sf.fields.length<=90,'pascolo libero entro il limite (90)');

console.log('3) pecore dentro il recinto');
const e=__ents.get(sf.id);
ok(!!e&&!!e.pen&&!!e.sheep,'recinto grafico e pecore creati al completamento');
ok(e.sheep.list.length>=2,'pecore nel recinto: '+e.sheep.list.length);
let out=0,steps=0;
const cellOf=(x,z)=>Math.floor((z+W/2)/CS)*N+Math.floor((x+W/2)/CS);
for(let i=0;i<6000;i++){__animSheep(e,0.1);steps++;for(const s of e.sheep.list){if(!pen.has(cellOf(s.x,s.z))||!e.sheep.free.has(s.c))out++;}}
ok(out===0,'in '+steps+' passi nessuna pecora esce dal recinto (violazioni '+out+')');
const moved=e.sheep.list.filter(s=>s.c!==undefined).length;
ok(moved===e.sheep.list.length,'tutte le pecore hanno una cella');

console.log('4) pastore e lana');
const w=Sim.villagers().filter(v=>v.job===sf.id);
for(let i=0;i<6000;i++){Sim.step(0.05);if(i%20===0)hold();}
ok(sf.buf>0||Sim.villagers().some(v=>v.job===sf.id),'ovile con pastore o lana pronta (lana '+sf.buf+')');

console.log(fails?('FALLITI '+fails):'OVILE_OK');
process.exit(fails?1:0);
