// v64: bussola e layer ambientali nella grafica (src/render.js). Con il finto DOM di smoke-render: accende fertilità, vento e corrente
// (mappa col fiume e mappa col lago), fa girare i fotogrammi e controlla che nulla vada in errore, che la bussola segua la telecamera
// e che sul lago la corrente non si accenda.
const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={},toasts=[];
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{_on:{},toggle(c,f){this._on[c]=f===undefined?!this._on[c]:!!f;},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
global.document={getElementById:el,createElement:()=>el('x'+Math.random()),querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}}};
global.addEventListener=()=>{};
global.requestAnimationFrame=()=>{};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__begin=begin;global.__cam=cam;global.__setLayer=setLayer;global.__toggleLayers=toggleLayers;global.__refresh=refreshLayers;global.__envFrame=envFrame;global.__toasts=()=>el("toast").textContent;global.__lay=()=>({f:layFert,w:layWind,c:layFlow,o:layOpen});\n})();')+';global.Sim=Sim;');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};

for(const mode of ['river','lake']){
  console.log('mappa:',mode);
  __begin(mode);
  if(!__lay().o)__toggleLayers();   // il pannello resta aperto da una partita all'altra
  ok(__lay().o&&el('layers').hidden===false,'il pannello Layer si apre');
  for(const k of ['fert','wind','flow'])__setLayer(k);
  const L=__lay();
  ok(L.f&&L.w,'fertilità e vento si accendono');
  ok(mode==='river'?L.c:!L.c,mode==='river'?'la corrente si accende sul fiume':'sul lago la corrente non si accende');
  if(mode==='lake')ok(/lago calmo/.test(__toasts()),'sul lago un avviso dice che la corrente non c\'è');
  __refresh();
  ok(/Da (Nord|Sud|Est|Ovest)/.test(els.lgWind.innerHTML)&&/km\/h/.test(els.lgWind.innerHTML),'legenda del vento: da dove soffia e forza');
  ok(mode==='river'?/Corrente/.test(els.lgFlow.innerHTML):/lago calmo/.test(els.lgFlow.innerHTML),'legenda della corrente');
  ok(/bar/.test(els.lgFert.innerHTML),'legenda della fertilità');
  // alcuni giorni di gioco con i layer accesi, in ogni stagione (compreso l'inverno col ghiaccio)
  let now=1000;
  for(let d=0;d<30;d++){Sim.S.t+=Sim.DAY;Sim.step(0.05);now+=500;__envFrame(now);__refresh();}
  ok(true,'30 giorni di gioco con i layer accesi senza errori (stagioni comprese)');
  // la bussola segue la telecamera: la N ruota con lo yaw
  for(const yaw of [0,Math.PI/2,-0.8,3.9]){
    __cam.yaw=yaw;now+=500;__envFrame(now);
    const m=/rotate\((-?[\d.]+)deg\)/.exec(els.compRose.style.transform||'');
    ok(m&&Math.abs(+m[1]-yaw*180/Math.PI)<0.02,'bussola: rotazione '+(yaw*180/Math.PI).toFixed(1)+'° per yaw '+yaw.toFixed(2));
    const nx=parseFloat(els.compN.style.left),ny=parseFloat(els.compN.style.top);
    ok(Math.abs(nx-(50+Math.sin(yaw)*37.5))<0.1&&Math.abs(ny-(50-Math.cos(yaw)*37.5))<0.1,'bussola: la lettera N sta dalla parte del nord');
  }
  // a yaw 0 il nord è in alto: la N sta sopra il centro
  __cam.yaw=0;__envFrame(now+500);
  ok(parseFloat(els.compN.style.top)<50&&Math.abs(parseFloat(els.compN.style.left)-50)<0.1,'yaw 0: nord in alto');
  // spegnere i layer li toglie dalla scena
  for(const k of ['fert','wind','flow'])__setLayer(k);
  __envFrame(now+1000);
  const L2=__lay();ok(!L2.f&&!L2.w&&!L2.c,'i layer si spengono');
}
console.log(fails?'FALLITO: '+fails+' controlli':'AMBIENTE_RENDER_OK');process.exit(fails?1:0);
