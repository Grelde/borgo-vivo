const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1};
global.addEventListener=()=>{};
let frames=0;global.__frames=0;
global.requestAnimationFrame=(f)=>{if(frames++<300)setTimeout(()=>f(performance.now()+frames*16),0);};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
global.setTimeout=setTimeout;
console.error=(e)=>{console.log('FRAME_ERR',e&&e.stack);process.exit(1)};process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__select=select;global.__begin=begin;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');


setTimeout(()=>{console.log('PRE_BEGIN_OK frames',frames);process.exit(0)},1500);
