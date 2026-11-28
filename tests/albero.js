// v52: albero della conoscenza. Rami, prerequisiti tra blueprint, acquisti in ordine, salvataggi vecchi.
// Deterministico: Math.random è sostituito da un generatore a seme fisso.
const Sim=require('../src/sim.js');const S=Sim.S;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
const story=seed=>{Math.random=mulberry(seed*7919+13);Sim.init(seed,'lake',undefined,{story:true});S.stock.wood=900;S.stock.stone=900;S.stock.iron=900;S.coins=900;};
const byId=Object.fromEntries(Sim.PROJ.map(p=>[p.id,p]));

console.log('1) struttura dell\'albero');
const brIds=new Set(Sim.BRANCHES.map(b=>b.id));
ok(Sim.PROJ.every(p=>brIds.has(p.br)),'ogni progetto sta in un ramo conosciuto');
ok(Sim.BRANCHES.every(b=>Sim.PROJ.some(p=>p.br===b.id)),'ogni ramo ha almeno un progetto');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>byId[q])),'ogni prerequisito è un progetto che esiste');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>byId[q].br===p.br)),'i prerequisiti restano dentro lo stesso ramo (linee chiare nell\'albero)');
ok(Sim.PROJ.every(p=>(p.req||[]).every(q=>byId[q].rank<=p.rank)),'un prerequisito non è mai di un titolo successivo');
// niente cicli: ogni progetto si raggiunge partendo dai prerequisiti
const depth=(id,seen=[])=>{if(seen.includes(id))throw new Error('ciclo su '+id);return 1+Math.max(0,...(byId[id].req||[]).map(q=>depth(q,[...seen,id])));};
let cyc=false;try{for(const p of Sim.PROJ)depth(p.id);}catch(e){cyc=true;}
ok(!cyc,'nessun ciclo tra i prerequisiti');
// dentro la stessa colonna (titolo) il prerequisito viene prima del figlio, così la linea scende senza incrociare altri blocchi
let order=true;for(const p of Sim.PROJ)for(const q of(p.req||[]))if(byId[q].rank===p.rank&&Sim.PROJ.indexOf(byId[q])>Sim.PROJ.indexOf(p))order=false;
ok(order,'nella stessa colonna il prerequisito precede il figlio');
ok(Sim.PROJ.every(p=>Sim.PROJ_NAMES[p.id]&&Sim.PROJ_NAMES[p.id]!==p.id),'ogni progetto ha un nome leggibile');

console.log('2) acquisto in ordine');
story(4);S.rank=6;
let r=Sim.buyProject('mill');
ok(!r.ok&&/Granaio/.test(r.msg)&&r.need&&r.need[0]==='granary','il mulino chiede prima il granaio: '+r.msg);
ok(Sim.projectState('mill').need.join()==='granary','projectState elenca i prerequisiti mancanti');
r=Sim.buyProject('granary');ok(!r.ok&&/Zona agricola/.test(r.msg),'il granaio chiede prima la zona agricola: '+r.msg);
r=Sim.buyProject('d2');ok(r.ok,'la zona agricola non ha prerequisiti');
r=Sim.buyProject('granary');ok(r.ok,'poi il granaio si compra');
r=Sim.buyProject('mill');ok(r.ok,'poi il mulino');
r=Sim.buyProject('bakery');ok(r.ok&&Sim.owns('bakery'),'poi il forno: catena granaio → mulino → forno completa');
ok(Sim.projectState('mill').need.length===0&&Sim.projectState('mill').owned,'a progetto acquistato non restano prerequisiti mancanti');

console.log('3) prerequisiti con più progetti, e ordine dei controlli');
story(5);S.rank=6;
r=Sim.buyProject('mercery');ok(!r.ok&&r.need.length===2,'la merceria chiede magazzino e zona di mercato: '+r.msg);
Sim.buyProject('store');r=Sim.buyProject('mercery');ok(!r.ok&&r.need.join()==='d3','ne manca ancora uno: '+r.msg);
Sim.buyProject('d3');r=Sim.buyProject('mercery');ok(r.ok,'con entrambi si compra');
// il titolo viene controllato prima dei prerequisiti
story(6);S.rank=1;r=Sim.buyProject('tailor');ok(!r.ok&&/Terra murata/.test(r.msg),'prima il titolo del Re: '+r.msg);
S.rank=5;r=Sim.buyProject('tailor');ok(!r.ok&&r.need&&r.need[0]==='weaver','poi il prerequisito (il sarto vuole il telaio): '+r.msg);
Sim.buyProject('weaver');S.coins=0;r=Sim.buyProject('tailor');ok(!r.ok&&/denari/.test(r.msg),'infine le risorse: '+r.msg);
S.coins=500;r=Sim.buyProject('tailor');ok(r.ok,'sarto acquistato');
// un acquisto rifiutato non toglie nulla
story(7);S.rank=6;const w0=S.stock.wood,c0=S.coins;Sim.buyProject('hall');
ok(S.stock.wood===w0&&S.coins===c0&&!Sim.owns('hall'),'un acquisto rifiutato per prerequisito non costa nulla');
Sim.buyProject('plaza');r=Sim.buyProject('hall');ok(r.ok,'sala delle feste dopo la piazza');
r=Sim.buyProject('statue');ok(r.ok,'la statua dipende solo dalla piazza');

console.log('4) catene delle difese e della fede');
story(8);S.rank=6;
r=Sim.buyProject('barracks');ok(!r.ok&&r.need[0]==='watchtower','la caserma vuole la torre di guardia');
Sim.buyProject('watchtower');ok(Sim.buyProject('barracks').ok,'poi la caserma');
r=Sim.buyProject('school');ok(!r.ok&&r.need[0]==='church','la scuola vuole la chiesa');
r=Sim.buyProject('infirmary');ok(!r.ok&&r.need[0]==='church','l\'ospizio vuole la chiesa');
r=Sim.buyProject('cemetery');ok(!r.ok&&r.need[0]==='church','il cimitero vuole la chiesa');
Sim.buyProject('church');ok(Sim.buyProject('school').ok&&Sim.buyProject('infirmary').ok&&Sim.buyProject('cemetery').ok,'con la chiesa si comprano tutti e tre');

console.log('5) la strada per ogni titolo resta percorribile');
// ciò che il Re chiede per ogni titolo si può costruire comprando solo progetti di titoli già concessi e dei loro prerequisiti
const NEED_BLDG={1:['wood','quarry'],2:['well'],3:['church','farm'],4:['watchtower'],5:['mercery','inn','barracks'],6:['hall','plaza']};
const toProj={farm:'d2',wood:null,quarry:null};
let reachable=true;
for(let rk=1;rk<=6;rk++){
  for(const b of NEED_BLDG[rk]){
    const id=b in toProj?toProj[b]:b;if(!id)continue;
    const chain=[];const walk=x=>{chain.push(x);for(const q of(byId[x].req||[]))walk(q);};walk(id);
    // il titolo r+1 si ottiene avendo costruito b: serve poter comprare b e i suoi prerequisiti entro il titolo r
    if(chain.some(x=>byId[x].rank>rk))reachable=false,console.log('  non raggiungibile in tempo:',b,'(titolo',rk,')');
  }
}
ok(reachable,'gli edifici richiesti per ogni titolo e i loro prerequisiti sono tutti concessi prima del titolo che li chiede');

console.log('6) salvataggi');
story(9);S.rank=6;Sim.buyProject('d4');Sim.buyProject('forester');
const snap=JSON.stringify(Sim.exportState());
ok(snap&&snap!=='null','il gioco si salva');
Math.random=mulberry(1234);const data=JSON.parse(snap);
Sim.importState(data);
ok(Sim.owns('d4')&&Sim.owns('forester')&&!Sim.owns('carpenter'),'dopo il caricamento i progetti acquistati restano');
ok(Sim.projectState('carpenter').need.length===0&&!Sim.projectState('carpenter').owned,'il falegname ora si può comprare: ha la zona forestale');
// un salvataggio vecchio con un figlio senza il padre non perde nulla e non si blocca
story(10);S.rank=6;S.proj.mill=true;
ok(Sim.owns('mill')&&Sim.projectState('mill').owned,'un progetto già posseduto resta tuo anche senza il suo prerequisito (salvataggi della v50)');
r=Sim.buyProject('mill');ok(!r.ok&&/già tuo/.test(r.msg),'e non si compra due volte');
// fuori dalla modalità storia (test) tutto è disponibile e nessun prerequisito blocca
Math.random=mulberry(11);Sim.init(11,'lake');
ok(Sim.PROJ.every(p=>Sim.projectState(p.id).need.length===0),'fuori dalla modalità storia nessun prerequisito manca');

console.log('7) editti nell\'albero (v87)');
const EDP=Sim.PROJ.filter(p=>p.ed);
story(12);
ok(EDP.length===5&&EDP.every(p=>p.br==='editti'&&p.id==='e_'+p.ed),'cinque editti nel ramo «Editti del Re», id e_<chiave>');
ok(Object.keys(S.edicts).every(k=>k==='noUpgrade'||EDP.some(p=>p.ed===k)),'ogni editto, tranne il divieto di avanzamento, ha il suo progetto');
ok(!EDP.some(p=>p.ed==='noUpgrade'),'il divieto di avanzamento delle case non è nell\'albero');
ok(EDP.every(p=>Sim.PROJ_NAMES[p.id]&&/^Editto: /.test(Sim.PROJ_NAMES[p.id])),'nomi leggibili «Editto: …»');
ok(Sim.setEdict('noUpgrade',true)&&S.edicts.noUpgrade===true,'il divieto di avanzamento si emana subito, senza comprare nulla');
ok(Sim.setEdict('noUpgrade',false)&&S.edicts.noUpgrade===false,'e si ritira');
for(const p of EDP){ok(!Sim.setEdict(p.ed,true)&&S.edicts[p.ed]===false,'senza il progetto non si emana: '+p.ed);}
ok(Sim.setEdict('nonEsiste',true)===false,'un editto sconosciuto è ignorato');
S.rank=1;r=Sim.buyProject('e_noImmig');ok(!r.ok&&/Villaggio/.test(r.msg),'prima il titolo del Re: '+r.msg);
S.rank=2;S.stock.wood=0;r=Sim.buyProject('e_noImmig');ok(!r.ok&&/Non basta/.test(r.msg),'servono le risorse: '+r.msg);
S.stock.wood=500;S.stock.stone=500;
const w1=S.stock.wood;r=Sim.buyProject('e_noImmig');ok(r.ok&&/editto/i.test(r.msg)&&S.stock.wood===w1-6,'il blocco immigrazione costa 6 legno: '+r.msg);
ok(Sim.setEdict('noImmig',true)&&S.edicts.noImmig===true,'ora si emana');
ok(Sim.setEdict('noImmig',false)&&S.edicts.noImmig===false,'e si ritira');
ok(!Sim.setEdict('woodDuty',true),'gli altri restano bloccati');
r=Sim.buyProject('e_quarantine');ok(!r.ok&&/Borgo fortificato/.test(r.msg),'la quarantena è del titolo Borgo fortificato: '+r.msg);
S.rank=4;S.proj={};r=Sim.buyProject('e_quarantine');ok(!r.ok&&r.need&&r.need[0]==='e_noImmig','la quarantena vuole il blocco dell\'immigrazione: '+r.msg);
Sim.buyProject('e_noImmig');r=Sim.buyProject('e_quarantine');ok(r.ok,'poi si compra');
ok(Sim.setEdict('quarantine',true)&&S.edicts.quarantine,'e si emana');
// ritirare è sempre permesso, anche se (per un salvataggio strano) l'editto è attivo e non è tuo
S.edicts.woodDuty=true;ok(Sim.setEdict('woodDuty',false)&&!S.edicts.woodDuty,'un editto attivo ma non posseduto si può sempre ritirare');
// il badge del pulsante non dipende dagli editti (controllato in render): qui verifichiamo solo che projectState esponga il tipo
ok(Sim.projectState('e_noImmig').ed==='noImmig'&&Sim.projectState('well').ed===null,'projectState dice se è un editto');
// la strada dei titoli non dipende da nessun editto
ok(!EDP.some(p=>Object.values(NEED_BLDG).flat().includes(p.id)),'nessun titolo del Re richiede un editto');

console.log('8) salvataggi precedenti: gli editti già disponibili non si perdono');
story(13);S.rank=3;S.edicts.quarantine=true;S.edicts.noUpgrade=true;
const old=JSON.parse(JSON.stringify(Sim.exportState()));delete old.S.edp;old.S.proj={well:true};
Math.random=mulberry(77);Sim.importState(old);
ok(S.edp===1,'il salvataggio viene marcato come migrato');
ok(Sim.owns('dowse'),'il Rabdomante, prima sempre disponibile, resta tuo');
ok(Sim.owns('nocut')&&Sim.owns('cutok'),'il bosco protetto (e togliere la protezione), prima sempre disponibili, restano tuoi');
ok(['e_noImmig','e_woodDuty','e_birthBonus','e_schoolMandatory'].every(id=>Sim.owns(id)),'editti dei titoli già raggiunti (fino a Borgo) concessi');
ok(Sim.owns('e_quarantine')&&S.edicts.quarantine===true,'e quello in vigore resta tuo e in vigore');
ok(S.edicts.noUpgrade===true,'il divieto di avanzamento resta com\'era');
const again=JSON.parse(JSON.stringify(Sim.exportState()));Math.random=mulberry(78);Sim.importState(again);
ok(Sim.owns('e_quarantine')&&S.edp===1,'un secondo caricamento non cambia nulla');
// un salvataggio nuovo (con il flag) non regala niente
story(14);S.rank=5;const fresh=JSON.parse(JSON.stringify(Sim.exportState()));Math.random=mulberry(79);Sim.importState(fresh);
ok(EDP.every(p=>!Sim.owns(p.id)),'un salvataggio della v87 non concede editti non comprati');
// fuori dalla modalità storia tutto resta emanabile (test e prove)
Math.random=mulberry(15);Sim.init(15,'lake');
ok(EDP.every(p=>Sim.setEdict(p.ed,true)),'fuori dalla modalità storia ogni editto si emana');

console.log('8b) Rabdomante');
story(17);ok(!Sim.owns('dowse'),'all\'inizio il Rabdomante non è tuo');
S.rank=0;r=Sim.buyProject('dowse');ok(!r.ok&&/Casale/.test(r.msg),'è un progetto del titolo Casale: '+r.msg);
S.rank=1;const wd=S.stock.wood;r=Sim.buyProject('dowse');ok(r.ok&&S.stock.wood===wd-6&&Sim.owns('dowse'),'costa 6 legno e non ha prerequisiti');
ok(Sim.PROJ_NAMES.dowse==='Rabdomante'&&Sim.projectState('dowse').br==='vita','si chiama Rabdomante, ramo Vita e comunità');
console.log('8c) Bosco protetto');
story(18);ok(!Sim.owns('nocut')&&!Sim.owns('cutok'),'all\'inizio né il bosco protetto né «Togli protezione» sono tuoi');
S.rank=2;r=Sim.buyProject('nocut');ok(!r.ok&&r.need&&r.need[0]==='d4','il bosco protetto vuole la zona forestale: '+r.msg);
Sim.buyProject('d4');const wn=S.stock.wood;r=Sim.buyProject('nocut');ok(r.ok&&S.stock.wood===wn-6,'costa 6 legno');
ok(Sim.owns('nocut')&&Sim.owns('cutok'),'e con esso si possiede anche «Togli protezione»');
ok(Sim.PROJ_NAMES.nocut==='Bosco protetto'&&Sim.projectState('nocut').br==='legno','nome e ramo giusti');
console.log('9) copertura: ogni strumento della palette sta nell\'albero (tranne quelli iniziali)');
{
  const src=require('fs').readFileSync(__dirname+'/../src/render.js','utf8');
  const a=src.indexOf('const TOOLS=['),b=src.indexOf('const TOOL=Object.fromEntries');
  const tools=[...src.slice(a,b).matchAll(/\{id:'([a-z0-9]+)',label:/g)].map(m=>m[1]);
  const START=['select','pan','demolish','d1','undistrict','road','wood','quarry'];
  const free=tools.filter(t=>!Sim.PROJ.some(p=>p.id===t)&&!(Sim.OWN_VIA[t]&&Sim.PROJ.some(p=>p.id===Sim.OWN_VIA[t])));
  ok(tools.length>=50,'letti gli strumenti della palette ('+tools.length+')');
  ok(free.every(t=>START.includes(t)),'strumenti fuori dall\'albero oltre a quelli iniziali: '+free.filter(t=>!START.includes(t)).join(', ')+' (ogni novità va messa nell\'albero con titolo e ramo)');
  ok(START.every(t=>tools.includes(t)),'gli strumenti iniziali esistono davvero');
  story(16);ok(START.every(t=>Sim.owns(t)),'e all\'inizio della storia sono tuoi');
  ok(tools.filter(t=>!START.includes(t)).every(t=>!Sim.owns(t)),'tutti gli altri all\'inizio non sono tuoi');
}

console.log(fail?`FALLITI ${fail} su ${n}`:`OK: ${n} controlli`);
process.exit(fail?1:0);
