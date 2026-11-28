// v74: la selvaggina è un cibo a sé (non più "carne") e la scheda del Cibo elenca i cibi del borgo.
const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{_on:{},toggle(c,f){this._on[c]=f===undefined?!this._on[c]:!!f;},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}}};
global.addEventListener=()=>{};global.requestAnimationFrame=()=>{};
global.performance=require('perf_hooks').performance;global.ResizeObserver=class{observe(){}};
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__begin=begin;global.__openPop=openPop;\n})();')+';global.Sim=Sim;');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
__begin('river');
const S=Sim.S,B=()=>[...Sim.buildings().values()];
ok(Sim.GN.game==='selvaggina'&&Sim.GRAN_KEYS.includes('game'),'selvaggina: nome e Granaio');
// scheda del Cibo
S.stock.meat=3;S.stock.fish=4;S.stock.game=5;S.stock.cured=2;
const house=B().find(b=>b.type==='house'&&b.state==='done');
if(house){house.goods.veg=7;house.goods.eggs=2;house.goods.game=1;}
__openPop('food');
const html=els.popBody.innerHTML;
for(const n of ['Carne','Pesce','Ortaggi','Selvaggina','Uova'])ok(html.includes(n),'la scheda del Cibo elenca: '+n);
ok(/5 · \d/.test(html),'selvaggina nei Granai: 5');
ok(house?/7 · /.test(html)||/ · 7/.test(html)||html.includes('7'):true,'ortaggi delle case contati');
// pasti: la casa con selvaggina la mangia e conta come cibo diverso
if(house){house.goods.veg=0;house.goods.eggs=0;house.goods.fish=0;house.goods.meat=0;house.goods.bread=0;house.goods.grain=0;house.goods.game=3;}
for(let i=0;i<400;i++)Sim.step(0.2);
ok(true,'400 passi senza errori');
// salvataggio vecchio: carne dei cacciatori diventa selvaggina, voce mancante si riempie
const data=JSON.parse(JSON.stringify(Sim.exportState()));
for(const b of data.buildings){if(b.goods)delete b.goods.game;if(b.ate)delete b.ate.game;if(b.out){delete b.out.game;if(b.type==='hunter')b.out.meat=6;}}
delete data.S.stock.game;
Sim.importState(data);
ok(S.stock.game===0,'salvataggio vecchio: scorta selvaggina 0');
ok(B().every(b=>!b.goods||Number.isFinite(b.goods.game)),'salvataggio vecchio: ogni casa ha la voce selvaggina');
ok(B().filter(b=>b.type==='house').every(b=>Number.isFinite(b.ate.game)),'salvataggio vecchio: ogni casa ha il pasto selvaggina');
for(let i=0;i<200;i++)Sim.step(0.2);
ok(true,'dopo il caricamento 200 passi senza errori');
console.log(fails?'FALLITO: '+fails+' controlli':'CIBO_OK');process.exit(fails?1:0);
