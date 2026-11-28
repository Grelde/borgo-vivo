const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}}};
global.addEventListener=()=>{};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};global.location={search:'?seme=7'};
let frames=0;global.__frames=0;
global.requestAnimationFrame=(f)=>{if(frames++<300)setTimeout(()=>f(performance.now()+frames*16),0);};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
global.setTimeout=setTimeout;
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__select=select;global.__begin=begin;global.__renderTrade=renderTrade;global.__openTrade=openTrade;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');
// v44: grafica del commercio (con DOM finto): pannello della Merceria con denari e link, registro delle rotte, carovane con il carro.
__begin(process.argv[2]||'lake');
const S=Sim.S;let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(114,84,135,114,3);
function put(type,x0,y0){for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;for(const rot of [0,1,2,3]){S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,200);const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}}return null;}
for(let i=0;i<8000;i++)Sim.step(0.05);
const mer=put('mercery',100,100);ok(!!mer,'merceria piazzata');
for(let i=0;i<8000;i++){Sim.step(0.05);if(i%200===0){S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,200);S.stock.planks=Math.max(S.stock.planks,10);}}
ok([...Sim.buildings().values()].some(b=>b.type==='mercery'&&b.state==='done'),'merceria completata');
// pannello di selezione della merceria
__select(mer.id);
const info=String(document.getElementById('selInfo').textContent),list=String(document.getElementById('selList').innerHTML);
ok(/denari/.test(info)&&/scaffali/.test(info),'pannello merceria: '+info);
ok(/data-trade/.test(list)&&/rotte/.test(list)&&!/undefined/.test(list),'pannello merceria con link al registro, senza "undefined"');
// registro delle rotte
__openTrade(true);
let html=String(document.getElementById('trList').innerHTML);
ok(['Valmora','Rocca Alta','Porto Fiorito','Campomaggio'].every(n=>html.includes(n)),'registro: le 4 città');
ok((html.match(/data-route=/g)||[]).length===4,'registro: 4 pulsanti di sblocco');
ok(html.includes('Denari in cassa: <b>'+Sim.money(Sim.S.coins)+'</b>'),'registro: la cassa mostrata è quella vera ('+Sim.money(Sim.S.coins)+')');
ok(!/undefined|NaN/.test(html),'registro senza undefined/NaN');
const res=Sim.unlockRoute('w');ok(res.ok,'sblocco di Valmora: '+res.msg);
__renderTrade(true);html=String(document.getElementById('trList').innerHTML);
ok((html.match(/data-route=/g)||[]).length===3&&/Rotta aperta/.test(html),'registro: una rotta aperta, tre da aprire');
// carovane in arrivo con il carro
S.stock.wood=220;S.stock.stone=160;let car=false;
for(let i=0;i<24000;i++){Sim.step(0.05);if(Sim.guests().some(g=>g.caravan))car=true;if(S.trade.visits>=1)break;}
ok(car,'è comparsa una carovana (con modello e carro)');
ok(S.trade.visits>=1,'la carovana ha commerciato');
__renderTrade(true);html=String(document.getElementById('trList').innerHTML);
ok(/Valmora<\/b> ·/.test(html)&&/vendute|comprate/.test(html),'registro: ultima carovana descritta');
ok(!/undefined|NaN/.test(html),'registro con carovane senza undefined/NaN');
// merceria senza merciaio e quarantena
S.edicts.quarantine=true;__renderTrade(true);html=String(document.getElementById('trList').innerHTML);
ok(/Quarantena/.test(html),'registro avvisa della quarantena');S.edicts.quarantine=false;
const st=Sim.stats();ok(st.built.mercery>=1&&st.coins===S.coins,'stats: merceria e denari');
setTimeout(()=>{console.log(fails===0?'COMMERCIO_RENDER_OK frames '+frames:'COMMERCIO_RENDER_FAIL '+fails);process.exit(fails===0?0:1)},800);
