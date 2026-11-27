const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
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
// v32: grafica dei nuovi edifici lavorativi (con DOM finto): modelli, pannelli di selezione, menu a categorie e costi con le assi.
__begin(process.argv[2]||'lake');
const S=Sim.S;let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(114,84,135,114,3);Sim.paintDistrict(60,60,90,92,5);
const NEW=['carpenter','mason','smithy','bakery','weaver','tailor','fisher','hunter','sheepfold','tavern','hall','mercery'];
const placed={};
function put(type,x0,y0){for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;for(const rot of [0,1,2,3]){S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,20);S.stock.flour=Math.max(S.stock.flour,20);const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}}return null;}
const pos={carpenter:[96,96],mason:[100,100],smithy:[104,96],bakery:[108,100],weaver:[96,106],tailor:[100,108],fisher:[120,141],hunter:[70,78],sheepfold:[70,70],tavern:[110,90],hall:[90,86],mercery:[104,84]};
let t=0;
for(const k of NEW){placed[k]=put(k,pos[k][0],pos[k][1]);for(let i=0;i<(k==='carpenter'||k==='mason'?3000:400);i++){Sim.step(0.05);t+=0.05;}}
for(let i=0;i<20000;i++){Sim.step(0.05);if(i%200===0){S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,20);S.stock.flour=Math.max(S.stock.flour,20);}}
for(const k of NEW)ok(!!placed[k],'piazzato '+k);
const done=k=>[...Sim.buildings().values()].filter(b=>b.type===k&&b.state==='done').length;
for(const k of NEW)ok(done(k)>=1,'completato '+k+' ('+done(k)+')');
// selezione di ogni edificio: nessuna eccezione, pannello compilato
const sel=document.getElementById('selInfo');
const ids={};for(const b of Sim.buildings().values())if(NEW.includes(b.type)&&!ids[b.type])ids[b.type]=b.id;
for(const k of NEW){try{__select(ids[k]);ok(true,'pannello '+k+': '+String(document.getElementById('selInfo').textContent).slice(0,70));}catch(e){ok(false,'pannello '+k+' '+e.message);}}
const cs=document.getElementById('tools');
ok(Sim.costOf('school').planks===4,'la scuola chiede assi con la falegnameria');
const st=Sim.stats();ok(st.built.carpenter>=1&&st.built.tavern>=1,'stats contano i nuovi edifici');
setTimeout(()=>{console.log(fails===0?'WORKSHOPS_RENDER_OK frames '+frames:'WORKSHOPS_RENDER_FAIL '+fails);process.exit(fails===0?0:1)},800);
