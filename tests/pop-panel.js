// Pannello dettagli Abitanti/Felicità (v27): apre le due schede su una partita vera e controlla il contenuto.
// Interfaccia con DOM finto, come smoke-render.js: la resa grafica non è provata in un browser.
const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1',tab:'pop'},appendChild(){},addEventListener(){},setPointerCapture(){},focus(){},innerHTML:'',textContent:'',scrollTop:0,clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}}};
global.addEventListener=()=>{};
let frames=0;
global.requestAnimationFrame=(f)=>{if(frames++<60)setTimeout(()=>f(performance.now()+frames*16),0);};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__pop={openPop,renderPop,closePop};global.__begin=begin;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');

__begin('river');
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(114,84,135,114,2);Sim.paintDistrict(81,114,102,126,3);
function put(type,cx,cy,r){Sim.S.stock.wood=Math.max(Sim.S.stock.wood,60);Sim.S.stock.stone=Math.max(Sim.S.stock.stone,60);for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)for(let rr=0;rr<4;rr++)if(Sim.canPlace(type,cx+dx,cy+dy,rr)===''&&Sim.place(type,cx+dx,cy+dy,rr).ok)return true;return false;}
put('wood',72,78,24);put('quarry',132,90,24);
for(let t=0;t<1200;t+=0.05){Sim.step(0.05);if(Math.abs(t-400)<0.01){put('well',99,87,18);put('church',120,120,30);}}
const fail=m=>{console.log('FALLITO:',m);process.exit(1);};
const body=()=>els.popBody.innerHTML;
const bad=h=>/undefined|NaN|\[object/.test(h);
// scheda Abitanti
__pop.openPop('pop');
let h=body();
if(els.pop.hidden!==false)fail('il pannello non risulta aperto');
for(const s of ['Per età','Mestieri degli adulti','Nascite, arrivi e partenze','Tutti gli abitanti'])if(!h.includes(s))fail('manca "'+s+'" nella scheda Abitanti');
if(bad(h))fail('valori non validi nella scheda Abitanti: '+h.match(/.{30}(undefined|NaN|\[object).{30}/)[0]);
const n=Sim.villagers().length;
if((h.match(/data-v="/g)||[]).length!==n)fail('la lista non ha tutti gli '+n+' abitanti');
// scheda Felicità
__pop.openPop('joy');
h=body();
for(const s of ['Felicità media','Come stanno gli abitanti','I bisogni delle case','Problemi nelle case','I più scontenti'])if(!h.includes(s))fail('manca "'+s+'" nella scheda Felicità');
if(bad(h))fail('valori non validi nella scheda Felicità: '+h.match(/.{30}(undefined|NaN|\[object).{30}/)[0]);
const avg=Math.round(Sim.stats().avgJoy);
if(!h.includes(avg+'/100'))fail('la felicità media mostrata non coincide con quella del cruscotto ('+avg+')');
// nome ostile: deve essere reso innocuo
const v=Sim.villagers()[0];v.name='<img src=x onerror=alert(1)>';
__pop.openPop('pop');if(body().includes('<img'))fail('nome non protetto');
__pop.openPop('joy');if(body().includes('<img'))fail('nome non protetto (Felicità)');
// aggiornamento senza errori e chiusura
for(let i=0;i<20;i++){Sim.step(0.5);__pop.renderPop();}
__pop.closePop();if(els.pop.hidden!==true)fail('il pannello non si chiude');
__pop.renderPop();
console.log('POP_PANEL_OK abitanti',n,'felicità media',avg);
process.exit(0);
