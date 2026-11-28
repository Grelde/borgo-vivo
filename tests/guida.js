// v49: la guida dei cittadini c'è a ogni titolo, si può spegnere, e gli allarmi restano.
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
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__g={CITIZEN,citizenMsg,guideLine,adviceLine,alertLine,setAdvice,ADVICE,TIPS,GUIDE,SEASON_TIP,on:()=>adviceOn};global.__begin=begin;requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');

let fails=0,n=0;const ok=(c,m)=>{n++;if(!c){fails++;console.log('FALLITO:',m);}};
const G=global.__g,S=Sim.S;
__begin('river');
const st0=()=>Sim.stats();
console.log('1) ogni titolo ha sempre una frase di guida');
ok(G.on()===true,'i consigli sono accesi di default');
ok(G.TIPS.length===8&&G.GUIDE.length===8,'testi per tutti gli 8 titoli');
for(let r=0;r<=7;r++){
  S.rank=r;S.war.phase=r===7?'done':'none';
  for(const d of [0,2,4,6,8,10,12,14]){S.day=d;S.season=(d/2)%4|0;const l=G.guideLine(st0(),Sim.regnoInfo(st0()));ok(l&&l.t&&l.t.length>10,`titolo ${r}, giorno ${d}: "${l&&l.t}"`);}
}
console.log('2) le frasi cambiano con il tempo (rotazione)');
S.rank=2;S.war.phase='none';for(const p of Sim.PROJ)S.proj[p.id]=true;
const seen=new Set();for(const d of [0,2,4,6,8,10]){S.day=d;S.season=0;const a=G.adviceLine({...st0(),pop:99,dc:[0,99,99,99,99,99],houses:9,farms:9,built:{wood:1,quarry:1,well:1,church:1,infirmary:1},hungry:0,fireNeed:0,fire:0,sick:0,unhappy:0,sites:0,att:{unemp:0},slots:0,jobs:0,plague:false,capRes:80,cap:999},Sim.regnoInfo(st0()));seen.add(a.t);}
ok(seen.size>=3,'a titolo fermo le frasi ruotano: '+seen.size);
console.log('3) consigli urgenti');
const base={...st0(),pop:20,houses:8,built:{wood:1,quarry:1,well:1,church:1,infirmary:1,smithy:1},cap:99,att:{unemp:0},slots:0,jobs:0,sites:0,hungry:0,fire:0,fireNeed:0,sick:0,unhappy:0,plague:false,capRes:80};
const inf=Sim.regnoInfo(st0());
ok(/fame/.test(G.adviceLine({...base,hungry:3},inf).t),'fame');
ok(/legna/i.test(G.adviceLine({...base,fireNeed:20,fire:2},inf).t),'legna');
ok(/Epidemia/.test(G.adviceLine({...base,plague:true},inf).t),'epidemia');
ok(/scontenti/.test(G.adviceLine({...base,unhappy:4},inf).t),'scontenti');
S.stock.wood=0;ok(/legno è finito/.test(G.adviceLine({...base,sites:2},inf).t),'legno finito');S.stock.wood=50;
ok(/senza lavoro/.test(G.adviceLine({...base,att:{unemp:4}},inf).t),'disoccupati');
ok(/non c.è più posto/.test(G.adviceLine({...base,pop:30,cap:30},inf).t),'case piene');
console.log('4) consigli spenti: tace tutto tranne gli allarmi');
G.setAdvice(false);S.rank=3;S.war.phase='none';
ok(G.guideLine({...base,hungry:3},Sim.regnoInfo(st0())).t==='','nessun consiglio quando sono spenti');
S.war.phase='warn';S.war.at=S.t+Sim.DAY*2;
const al=G.guideLine(base,Sim.regnoInfo(st0()));ok(al.war&&/guerra/.test(al.t),'la guerra si legge anche con i consigli spenti');
S.war.phase='none';G.setAdvice(true);ok(G.on()===true,'si riaccendono');
console.log('4) i cittadini chiedono solo ciò che reputano necessario');
const forbid=/guardaboschi|magazzino\b|granaio|mulino|scuola|fucina|miniera|ospizio/i;
for(let r=1;r<=6;r++){const c=G.citizenMsg(r);ok(c&&c.x.length>=1&&c.f==='I tuoi abitanti','pergamena dei cittadini al titolo '+r);ok(!forbid.test(c.x.join(' ')),'titolo '+r+': i cittadini non chiedono edifici non necessari');}
const c1=G.citizenMsg(1).x.join(' ');
ok(/acqua fresca/.test(c1)&&/pozzo/.test(c1)&&/mercato/.test(c1)&&/barattare|scambiar/.test(c1),'titolo 1: acqua fresca, pozzo e mercato');
ok(/fiume/.test(c1),'in partita sul fiume si parla del fiume');
ok(G.citizenMsg(7)===null,'nessuna pergamena dei cittadini a titolo 7');
S.rank=1;S.war.phase='none';S.proj={};for(const id of ['d1','wood','quarry','select','road','well','d3','store','d4','forester'])S.proj[id]=true;
for(const d of [0,2,4,6,8,10,12,14]){S.day=d;S.season=(d/2)%4|0;const l=G.adviceLine({...base,pop:99,dc:[0,99,99,99,99,99],houses:9,built:{wood:1,quarry:1,well:1}},Sim.regnoInfo(st0()));ok(!/guardaboschi|magazzin/i.test(l.t),'titolo 1, giorno '+d+': nessun consiglio su guardaboschi o magazzino: '+l.t);}
ok(!/guardaboschi|magazzin/i.test(G.adviceLine({...base,sites:2},Sim.regnoInfo(st0())).t),'legno finito: niente guardaboschi');
console.log(fails?`${fails} FALLITI su ${n}`:`GUIDA_OK ${n} controlli`);process.exit(fails?1:0);
