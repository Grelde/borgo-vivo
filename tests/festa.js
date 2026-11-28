// v37: festa di paese. Prova con DOM finto (la grafica WebGL non viene verificata): indizione, raccolta risorse, festa, partecipanti, effetto sulla felicità.
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
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__begin=begin;global.__ents=ents;global.__animFest=animFest;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');
__begin(process.argv[2]||'lake');
const S=Sim.S,N=Sim.N,CS=Sim.CS,W=Sim.W;let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
// v53: le scorte contano solo se stoccate: si rifornisce fino alla capacità, non oltre; il cibo della festa viene dal Granaio
const top=(k,n)=>{S.stock[k]=Math.max(S.stock[k],Math.min(n,Sim.capRes(k)));};
let foodOn=false;
const hold=()=>{top('wood',300);top('stone',200);if(foodOn)top('bread',40);};
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(60,60,90,92,5);
const dist=Sim.grids.dist;
const run=(sec,f)=>{for(let t=0;t<sec;t+=0.1){hold();Sim.step(0.1);if(f&&f())return true;}return false;};
console.log('1) piazza e abitanti');
for(let i=0;i<600&&Sim.villagers().length<6;i++){Sim.step(0.5);hold();}
ok(Sim.villagers().length>=6,'abitanti: '+Sim.villagers().length);
let pz=null;
for(let r=0;r<40&&!pz;r+=3)for(let dy=-r;dy<=r&&!pz;dy+=3)for(let dx=-r;dx<=r&&!pz;dx+=3){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;hold();const q=Sim.place('plaza',90+dx,60+dy,0);if(q.ok)pz=q.b;}
ok(!!pz,'piazza piazzata');
if(!pz){console.log('FALLITO');process.exit(1);}
run(800,()=>pz.state==='done');
ok(pz.state==='done','piazza completata');

console.log('2) indizione e cancellazione');
let r=Sim.callFest(pz.id);ok(r.ok&&pz.fest.st==='prep','festa indetta: preparativi');
r=Sim.callFest(pz.id);ok(!r.ok,'seconda indizione rifiutata: '+r.msg);
const w0=S.stock.wood;run(150);
ok(pz.fest.have.wood>0,'dopo 150 s raccolto legno: '+pz.fest.have.wood+' e cibo '+pz.fest.have.food);
ok(Sim.cancelFest(pz.id)&&pz.fest.st==='','annullata: la piazza torna libera');
ok(Sim.callFest(pz.id).ok,'si può indire di nuovo dopo l\'annullamento');

console.log('3) preparativi e festa');
// cibo abbondante nel Granaio (il cibo nelle case non conta per la festa)
{let gr=null;for(let r=0;r<40&&!gr;r+=3)for(let dy=-r;dy<=r&&!gr;dy+=3)for(let dx=-r;dx<=r&&!gr;dx+=3){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;hold();const q=Sim.place('granary',100+dx,90+dy,0);if(q.ok)gr=q.b;}
 ok(!!gr,'Granaio piazzato');run(800,()=>gr&&gr.state==='done');ok(gr&&gr.state==='done','Granaio completato');foodOn=true;hold();}
const wood0=S.stock.wood;
run(Sim.FEST.prep+400,()=>pz.fest.st==='ready'||pz.fest.st==='on');
ok(pz.fest.st==='ready'||pz.fest.st==='on','preparativi terminati');
ok(pz.fest.have.wood===Sim.FEST.need.wood,'legno raccolto completo: '+pz.fest.have.wood+'/'+Sim.FEST.need.wood);
ok(pz.fest.have.food>=Sim.FEST.need.food*0.5,'cibo raccolto: '+pz.fest.have.food+'/'+Sim.FEST.need.food);
const joyBefore=Sim.stats().avgJoy;
run(400,()=>pz.fest.st==='on');
ok(pz.fest.st==='on','la festa comincia (q='+pz.fest.q.toFixed(2)+')');
let maxFest=0;
run(120,()=>{const n=Sim.villagers().filter(v=>v.state==='fest').length;if(n>maxFest)maxFest=n;return pz.fest.st!=='on';});
ok(maxFest>=3,'abitanti in piazza durante la festa (massimo '+maxFest+')');
const joyDuring=Sim.stats().avgJoy;
run(200,()=>pz.fest.st==='cool');
ok(pz.fest.st==='cool','la festa finisce di notte');
ok(pz.fest.att>=3,'partecipanti contati: '+pz.fest.att);
ok(S.fests===1,'festa contata');
const joyAfter=Sim.stats().avgJoy;
console.log('   felicità media: prima '+joyBefore.toFixed(1)+', durante '+joyDuring.toFixed(1)+', dopo '+joyAfter.toFixed(1));
ok(Math.max(joyDuring,joyAfter)>joyBefore,'la felicità sale con la festa');
ok(!Sim.callFest(pz.id).ok,'subito dopo non si può indire un\'altra festa');
run(Sim.FEST.glowT+Sim.DAY);
ok(Sim.S.festA.length===0,'l\'effetto svanisce dopo qualche giorno');
run(Sim.FEST.cool,()=>pz.fest.st==='');
ok(pz.fest.st==='','finito il tempo di pausa la piazza è libera');
ok(Sim.callFest(pz.id).ok,'una nuova festa si può indire');

console.log('4) salvataggio e caricamento');
{const pz2=[...Sim.buildings().values()].find(b=>b.type==='plaza'&&b.fest&&b.fest.st==='prep');
 ok(!!pz2,'festa in preparazione prima del salvataggio');
 const old=pz2.fest.seq,have=pz2.fest.have.wood;
 const d=JSON.parse(JSON.stringify(Sim.exportState()));Sim.importState(d);
 const pz3=[...Sim.buildings().values()].find(b=>b.type==='plaza');
 ok(pz3.fest&&pz3.fest.st==='prep'&&pz3.fest.seq===old&&pz3.fest.have.wood===have,'la festa sopravvive al salvataggio');
 Sim.cancelFest(pz3.id);ok(Sim.callFest(pz3.id).ok&&pz3.fest.seq>old,'dopo il caricamento una nuova festa ha un numero nuovo ('+pz3.fest.seq+')');}
console.log(fails?'FALLITI '+fails:'TUTTO OK');process.exit(fails?1:0);
