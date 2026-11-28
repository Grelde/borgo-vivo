// v40: salvataggio e caricamento dal lato interfaccia, con DOM finto e localStorage finto (richiede ./build.sh).
// Controlla: salvataggio nei posti, caricamento che ripristina partita e livello, Ctrl+S, salvataggio automatico alla chiusura della pagina,
// memoria piena, salvataggi rovinati (la partita in corso resta intatta), esportazione in un file, e che i fotogrammi dopo il caricamento non diano errori.
const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;return mk();},apply:()=>mk(),construct:()=>mk(),set:()=>true});
global.THREE=new Proxy({},{get:(t,k)=>mk()});
const els={};
const el=(id)=>els[id]||(els[id]={id,hidden:false,style:{},classList:{toggle(){},add(){},remove(){}},dataset:{s:'1'},appendChild(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],setPointerCapture(){},focus(){},innerHTML:'',textContent:'',clientWidth:900,clientHeight:600,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),lastChild:{textContent:''},getContext:()=>mk()});
const created=[];
global.document={getElementById:el,createElement:()=>{const e=Object.assign({},el('x'+Math.random()),{click(){e.clicked=true;}});created.push(e);return e;},querySelectorAll:()=>[el('b1')]};
global.window={innerWidth:900,devicePixelRatio:1,matchMedia:()=>({matches:false})};
global.matchMedia=()=>({matches:false});
global.document.body={classList:{contains(){return false},add(){},remove(){},toggle(){}},appendChild(){},removeChild(){}};
const handlers={};global.addEventListener=(t,f)=>{(handlers[t]=handlers[t]||[]).push(f);};
let frames=0;
global.requestAnimationFrame=(f)=>{if(frames++<300)setTimeout(()=>f(performance.now()+frames*16),0);};
global.performance=require('perf_hooks').performance;
global.ResizeObserver=class{observe(){}};
global.setTimeout=setTimeout;
const store=new Map();let quota=false;
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{if(quota)throw new Error('QuotaExceededError');store.set(k,String(v));},removeItem:k=>{store.delete(k);}};
let confirms=0;global.confirm=()=>{confirms++;return true;};
global.Blob=class{constructor(p,o){this.p=p;this.o=o;}};global.URL={createObjectURL:()=>'blob:x',revokeObjectURL(){}};
const errs=[];console.error=(...a)=>{errs.push(a.map(x=>x&&x.stack||String(x)).join(' '));};
process.on('uncaughtException',e=>{console.log('ERRORE',e.stack);process.exit(1)});
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../dist/all.js','utf8').replace('requestAnimationFrame(frame);\n})();','global.__begin=begin;global.__t={writeSlot,readSlot,applySave,makeSave,quickSave,newestSave,renderSaves,loadFrom,saveTo,exportFile,autoSave,setLvl:n=>{Sim.S.rank=n;showLevel();},ui:()=>({lvl:Sim.S.rank,speed,started})};requestAnimationFrame(frame);\n})();')+';global.Sim=Sim;');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
const T=global.__t,S=Sim.S;

console.log('0) schermata iniziale');
ok(T.newestSave()===null&&T.readSlot('auto')===null,'nessun salvataggio all\'inizio');
__begin('river');
ok(confirms===0,'nessuna conferma se non c\'è nulla da perdere');
const put=(type,cx,cy,r)=>{S.stock.wood=Math.max(S.stock.wood,60);S.stock.stone=Math.max(S.stock.stone,60);for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)for(let rr=0;rr<4;rr++)if(Sim.canPlace(type,cx+dx,cy+dy,rr)===''&&Sim.place(type,cx+dx,cy+dy,rr).ok)return true;return false;};
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(114,84,135,114,2);Sim.paintDistrict(81,114,102,126,3);Sim.paintDistrict(72,36,102,60,4);
put('wood',72,78,24);put('quarry',132,90,24);put('well',99,87,18);put('church',120,120,30);
for(let t=0;t<900;t+=0.05)Sim.step(0.05);
const snap=()=>{const s=Sim.stats();return JSON.stringify({pop:s.pop,houses:s.houses,day:s.day,b:Sim.buildings().size,wood:Math.round(S.stock.wood),t:Math.round(S.t)});};
const A=snap();console.log('   partita di prova',A);

console.log('1) salvare in un posto');
T.setLvl(2);
ok(T.writeSlot('1')===true,'scrittura nel posto 1');
const w1=T.readSlot('1');
ok(!!w1&&w1.meta.pop===Sim.villagers().length&&w1.meta.lvl===3,'il posto 1 si rilegge: '+w1.meta.pop+' abitanti, livello '+w1.meta.lvl+', "'+w1.meta.date+'"');
ok(w1.ui.lvl===2,'il livello dell\'interfaccia è nel salvataggio');
console.log('   dimensione:',Math.round(store.get('borgovivo.slot.1').length/1024),'KB');

console.log('2) caricare ripristina partita e livello');
put('inn',96,102,48);for(let t=0;t<400;t+=0.05)Sim.step(0.05);T.setLvl(0);
ok(snap()!==A,'la partita è andata avanti ('+snap()+')');
T.loadFrom('1');
ok(snap()===A,'dopo il caricamento la partita è quella salvata ('+snap()+')');
ok(T.ui().lvl===2,'livello ripristinato: '+(T.ui().lvl+1));
ok(confirms===1,'chiesta conferma prima di sostituire la partita in corso');
ok(el('story').hidden===true,'la schermata iniziale resta chiusa');

console.log('3) Ctrl+S e salvataggio automatico');
const at0=T.readSlot('1').at;await_(5);
function await_(ms){const e=Date.now()+ms;while(Date.now()<e);}
let pd=0;for(const h of handlers.keydown)h({key:'s',ctrlKey:true,preventDefault(){pd++;}});
ok(pd===1&&T.readSlot('1').at>at0,'Ctrl+S salva nel posto 1 e blocca il salvataggio della pagina');
ok(T.readSlot('auto')===null,'prima della chiusura non c\'è ancora l\'automatico');
handlers.pagehide[0]();
ok(!!T.readSlot('auto'),'alla chiusura della pagina si scrive l\'automatico');
ok(!!T.newestSave(),'newestSave trova un salvataggio');

console.log('4) elenco dei salvataggi');
T.renderSaves();const html=el('svList').innerHTML;
ok(html.includes('Posto 1')&&html.includes('Salvataggio automatico')&&html.includes('data-sv="load"')&&html.includes('data-sv="del"'),'l\'elenco mostra automatico e posti, con Carica ed Elimina');
ok(html.includes('Vuoto'),'i posti vuoti sono segnati');

console.log('5) memoria piena');
quota=true;ok(T.writeSlot('2')===false,'scrittura rifiutata senza far cadere il gioco');
ok(String(el('toast').textContent).includes('Salvataggio non riuscito'),'avviso all\'utente: "'+el('toast').textContent.slice(0,40)+'…"');
quota=false;ok(T.readSlot('2')===null,'nessun salvataggio a metà');

console.log('6) salvataggi rovinati');
const keep=snap();
store.set('borgovivo.slot.3','{non e json');
ok(T.readSlot('3')===null,'JSON rovinato → il posto risulta vuoto');
T.loadFrom('3');ok(snap()===keep&&String(el('toast').textContent).includes('non trovato'),'caricamento rifiutato, partita intatta');
{const w=JSON.parse(JSON.stringify(T.makeSave()));w.sim.buildings[0].type='castello';store.set('borgovivo.slot.3',JSON.stringify(w));}
T.loadFrom('3');ok(snap()===keep,'salvataggio con edificio impossibile rifiutato, partita intatta');
ok(String(el('toast').textContent).includes('non valido'),'messaggio: "'+el('toast').textContent+'"');
let thrown=null;try{T.applySave({ciao:1});}catch(e){thrown=e;}ok(!!thrown&&/non è un salvataggio/.test(thrown.message),'un file qualsiasi non è accettato: "'+(thrown&&thrown.message)+'"');
thrown=null;try{T.applySave(null);}catch(e){thrown=e;}ok(!!thrown,'dati nulli non accettati');
store.delete('borgovivo.slot.3');

console.log('7) file esportato e reimportato');
T.exportFile();
const a=created.find(x=>x.download);ok(!!a&&a.clicked===true&&/^borgo-vivo-annata\d+-giorno\d+\.json$/.test(a.download),'esportazione: file "'+(a&&a.download)+'"');
const viaFile=JSON.parse(JSON.stringify(T.makeSave()));
put('forester',90,66,18);for(let t=0;t<200;t+=0.05)Sim.step(0.05);
T.applySave(viaFile);ok(snap()===keep,'importando il contenuto del file la partita torna com\'era');

console.log('8) i fotogrammi dopo il caricamento non danno errori');
setTimeout(()=>{
  const real=errs.filter(e=>!/Salvataggio non valido|QuotaExceeded|non trovato/.test(e));
  ok(real.length===0,'nessun errore di disegno ('+real.length+')'+(real[0]?'\n'+real[0].slice(0,400):''));
  console.log('   fotogrammi eseguiti:',frames);
  console.log(fails?'\nFALLITI: '+fails:'\nSAVE_RENDER_OK');process.exit(fails?1:0);
},2500);
