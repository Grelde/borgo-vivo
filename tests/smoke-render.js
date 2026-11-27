const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}}};
global.addEventListener=()=>{};
let frames=0;global.__frames=0;
global.requestAnimationFrame=(f)=>{if(frames++<300)setTimeout(()=>f(performance.now()+frames*16),0);};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
global.setTimeout=setTimeout;
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__select=select;global.__begin=begin;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');

__begin(process.argv[2]||'river');
const g=Sim.grids,N=192;
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(114,84,135,114,2);Sim.paintDistrict(81,114,102,126,3);Sim.paintDistrict(72,36,102,60,4);
function put(type,cx,cy,r){Sim.S.stock.wood=Math.max(Sim.S.stock.wood,60);Sim.S.stock.stone=Math.max(Sim.S.stock.stone,60);for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)for(let rr=0;rr<4;rr++)if(Sim.canPlace(type,cx+dx,cy+dy,rr)===''&&Sim.place(type,cx+dx,cy+dy,rr).ok)return true;return false;}
put('wood',72,78,24);put('quarry',132,90,24);
for(let t=0;t<1800;t+=0.05){Sim.step(0.05);if(Math.abs(t-1500)<0.01){put('inn',96,102,48);}if(Math.abs(t-600)<0.01){put('forester',90,66,18);put('well',99,87,18);put('church',120,120,30);put('mine',42,48,24);put('granary',90,132,24);put('mill',102,132,24);put('inn',108,102,24);put('plaza',99,99,24);put('flowers',90,90,18);put('statue',108,90,18);Sim.paintDistrict(42,102,72,120,5);}}
const s=Sim.stats();console.log('guests',Sim.guests().length,'visits',Sim.S.visits);console.log('stats',JSON.stringify({pop:s.pop,houses:s.houses,levels:s.levels,craft:s.crafters,bake:s.bakers,fish:s.fishers,saps:s.saps}));
const seen={};for(const b of Sim.buildings().values()){if(seen[b.type])continue;seen[b.type]=1;__select(b.id);}
const ids=[...Sim.buildings().values()].map(b=>b.id);
let k=0;const iv=setInterval(()=>{if(k<ids.length)__select(ids[k++]);},5);
setTimeout(()=>{console.log('SMOKE_OK frames',frames,'tipi selezionati',Object.keys(seen).join(','));process.exit(0)},1800);
