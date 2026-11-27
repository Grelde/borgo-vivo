const Sim=(function(){
'use strict';
const SC=3,N=64*SC,W=128,CS=W/N;
// Sentieri a livelli (v19): 0 erba, 1-3 terreno che si scolorisce, 4 sentiero vero. NEEDP[L] = passaggi necessari nella finestra del livello L per salire a L+1; DUR[L] = secondi di durata del livello L prima di scendere a L-1.
const PATH=3,ROADT=20,WMAX=28,MAXP=4,NEEDP=[1,2,4,8],DUR=[0,20,40,80,240],PCOST=[1,0.92,0.8,0.62,0.5],PSPD=[1,1.04,1.1,1.2,1.25];
// v26: il giorno dura DAY secondi (era 100). TK riporta ai ritmi 'per giorno' di prima i fenomeni calcolati a ogni secondo (produzione, malattie, rischi, immigrazione).
const DAY=150,DK=DAY/100,TK=100/DAY,STORE_CAP=1000,CENTER_CAP=80,BUFCAP=8,GRAIN_CAP=1000,FLOUR_CAP=40,SAPLING_T=140;
const TYPES=['veg','eggs','grain','fish','meat','bread'];
const GN={veg:'ortaggi',eggs:'uova',grain:'grano',fish:'pesce',meat:'carne',bread:'pane',firewood:'legna da ardere',tools:'attrezzi',iron:'ferro',flour:'farina',wool:'lana',cloth:'tessuto',clothes:'abiti'};
const GOODS=TYPES.concat(['firewood','tools','iron','flour','wool','cloth','clothes']);
const TRADE=TYPES.concat(['firewood','tools','cloth','clothes']);
const CAPS=[3,4,5,6,7],MAXLV=5,QUAL5=3,WELL_R=30,CHURCH_R=54,SCHOOL_R=45,KEEP=2,LVNAME=['Capanna','Casa','Casa a due piani','Casa signorile','Palazzo'];
const BT={
  wood:{name:'Taglialegna',w:6,h:6,cost:{wood:6,stone:0},time:8,slots:3,want:2,need:'tree'},
  quarry:{name:'Cava di pietra',w:6,h:6,cost:{wood:8,stone:0},time:10,slots:3,want:2,need:'rock'},
  mine:{name:'Miniera di ferro',w:6,h:6,cost:{wood:10,stone:6},time:12,slots:3,want:2,need:'ore'},
  forester:{name:'Guardaboschi',w:6,h:6,cost:{wood:6,stone:0},time:7,slots:2,want:1},
  store:{name:'Magazzino',w:6,h:6,cost:{wood:12,stone:4,planks:4},time:12,slots:3,want:3},
  granary:{name:'Granaio',w:6,h:6,cost:{wood:10,stone:2},time:9,slots:0,want:0},
  mill:{name:'Mulino',w:6,h:6,cost:{wood:10,stone:8,planks:4},time:12,slots:2,want:1},
  inn:{name:'Locanda',w:9,h:6,cost:{wood:14,stone:8,planks:6},time:14,slots:2,want:1},
  // v32: ovile costruibile dal giocatore, con pastori (gli ovili fondati dalle famiglie restano senza addetti propri: li servono i membri della casa)
  sheepfold:{name:'Ovile',w:6,h:6,cost:{wood:8,stone:0},time:9,slots:2,want:1},
  // v32: edifici di lavoro. Ogni addetto compie cicli di WS[tipo].t secondi: una bottega vera rende più della bottega di un giardino.
  carpenter:{name:'Falegnameria',w:6,h:6,cost:{wood:10,stone:2},time:10,slots:3,want:2},
  mason:{name:'Bottega del muratore',w:6,h:6,cost:{wood:8,stone:8},time:12,slots:3,want:2},
  smithy:{name:'Fucina del fabbro',w:6,h:6,cost:{wood:10,stone:8,planks:2},time:12,slots:2,want:1},
  bakery:{name:'Forno del panettiere',w:6,h:6,cost:{wood:10,stone:8,planks:2},time:12,slots:2,want:1},
  weaver:{name:'Telaio del tessitore',w:6,h:6,cost:{wood:10,stone:4,planks:2},time:11,slots:2,want:1},
  tailor:{name:'Sartoria',w:6,h:6,cost:{wood:10,stone:4,planks:2},time:11,slots:2,want:1},
  fisher:{name:'Capanna del pescatore',w:6,h:6,cost:{wood:8,stone:0},time:8,slots:2,want:1,need:'water'},
  hunter:{name:'Capanna del cacciatore',w:6,h:6,cost:{wood:8,stone:0},time:8,slots:2,want:1,need:'forest'},
  // v38: la Merceria vende i prodotti lavorati delle botteghe (attrezzi, pane, tessuto, abiti): le botteghe li portano qui, le famiglie vengono a prenderli
  mercery:{name:'Merceria',w:6,h:6,cost:{wood:10,stone:6,planks:4},time:12,slots:2,want:1},
  tavern:{name:'Taverna',w:9,h:6,cost:{wood:12,stone:8,planks:4},time:14,slots:2,want:1},
  hall:{name:'Sala delle feste',w:9,h:9,cost:{wood:14,stone:14,planks:6},time:18,slots:2,want:1},
  plaza:{name:'Piazza con fontana',w:9,h:9,cost:{wood:0,stone:14},time:10,slots:0,want:0},
  flowers:{name:'Aiuola',w:3,h:3,cost:{wood:2,stone:0},time:2,slots:0,want:0},
  statue:{name:'Statua',w:3,h:3,cost:{wood:0,stone:8},time:5,slots:0,want:0},
  school:{name:'Scuola',w:6,h:6,cost:{wood:14,stone:8,planks:4},time:14,slots:1,want:1},
  infirmary:{name:'Ospizio',w:6,h:6,cost:{wood:12,stone:8,planks:4},time:12,slots:1,want:1},
  cemetery:{name:'Cimitero',w:9,h:4,cost:{wood:6,stone:10},time:12,slots:0,want:0},
  church:{name:'Chiesa',w:9,h:9,cost:{wood:10,stone:24,planks:8},time:20,slots:0,want:0},
  well:{name:'Pozzo',w:2,h:2,cost:{wood:2,stone:6},time:6,slots:0,want:0},
  house:{name:'Casa',w:3,h:3,cost:{wood:4,stone:0},time:6,slots:0,want:0},
  farm:{name:'Fattoria',w:6,h:6,cost:{wood:8,stone:0},time:9,slots:0,want:0},
  stall:{name:'Banco del mercato',w:2,h:2,cost:{wood:0,stone:0},time:0,slots:0,want:0}
};
// attrattiva: [forza, raggio in celle]. Positivo = piacevole, negativo = rumore e disagio.
const ATTR={church:[4,36],well:[2.5,24],stall:[1.2,18],wood:[-3,24],quarry:[-4.5,33],mine:[-5,36],farm:[-1.5,18],forester:[0.6,18],granary:[-0.8,15],mill:[-1.5,21],inn:[1,21],sheepfold:[-0.8,15],school:[1,18],infirmary:[0.5,15],cemetery:[-0.5,15],plaza:[3.2,30],flowers:[0.9,12],statue:[2,21],carpenter:[-1.2,18],mason:[-1.2,18],smithy:[-1.8,21],bakery:[0.4,15],weaver:[-0.3,12],tailor:[0.2,12],mercery:[0.8,18],fisher:[-0.3,12],hunter:[-0.4,12],tavern:[1.6,24],hall:[2.6,30]};
const DECO={flowers:1,statue:1};
const NOGATE={house:1,stall:1,flowers:1,statue:1,plaza:1,well:1,cemetery:1};
// Tempo (v20): 1 anno di vita = AGEY secondi; un'annata del calendario (4 stagioni) = YEARL secondi = 10 anni di vita.
const AGEY=240*DK;
const UPC={2:{wood:4,stone:0},3:{wood:4,stone:4},4:{wood:6,stone:8},5:{wood:8,stone:14}};
const SEASON_DAYS=6,SEASONS=['Primavera','Estate','Autunno','Inverno'],DUSK=0.68;
const YEARL=SEASON_DAYS*4*DAY;
const SCHOOL_CAP=12,HEAL_R=45;
// malattie: durata [min,max] in secondi, mortalità al secondo
const DIS={
  fever:{n:'Febbre invernale',dur:[40,80],mort:0.0005},
  flux:{n:'Dissenteria',dur:[30,60],mort:0.0007},
  plague:{n:'Peste',dur:[70,120],mort:0.0035}
};
const TRADENAME={wood:'taglialegna',quarry:'cavatore',mine:'minatore',forester:'guardaboschi',farm:'contadino',store:'magazziniere',mill:'mugnaio',school:'maestro',inn:'oste',sheepfold:'pastore',infirmary:'erborista',carpenter:'falegname',mason:'muratore',smithy:'fabbro',bakery:'panettiere',weaver:'tessitore',tailor:'sarto',fisher:'pescatore',hunter:'cacciatore',tavern:'taverniere',hall:'musicante',mercery:'merciaio'};
// tratti di carattere (negativi): ogni abitante ne ha al massimo uno; i figli lo ereditano da un genitore con probabilità 35%
const TRAITS={pigro:{n:'Pigro',d:'Lavora più lentamente e controvoglia.'},cagionevole:{n:'Cagionevole',d:'Si ammala più facilmente.'},brontolone:{n:'Brontolone',d:'Si lamenta di tutto: è sempre meno felice degli altri.'},litigioso:{n:'Litigioso',d:'Litiga con chi vive in casa e ne abbassa la felicità.'}};
const TRAITK=Object.keys(TRAITS);
const rollTrait=()=>Math.random()<0.35?TRAITK[(Math.random()*TRAITK.length)|0]:null;
const CAUSETXT={age:'Muore di vecchiaia.',cold:'Muore di freddo, in una casa senza legna.',hunger:'Muore di fame.',ill:'Muore di malattia.'};
const MNAMES=['Bartolo','Benedetto','Bruno','Corrado','Domenico','Dino','Enrico','Federico','Fulvio','Giovanni','Guido','Jacopo','Lorenzo','Matteo','Nicola','Odoardo','Pietro','Rinaldo','Tommaso','Ugo','Vitale','Aldo','Carlo','Elia','Gino','Ivo','Leone','Martino'];
const FNAMES=['Agnese','Beatrice','Chiara','Diana','Elisabetta','Francesca','Giulia','Ginevra','Ilaria','Lucia','Margherita','Matilde','Orsola','Piera','Rosa','Sibilla','Tecla','Vittoria','Alba','Bianca','Dora','Elena','Flora','Gemma','Nora','Costanza','Livia','Berta'];
const FAMS=['Rocca','Valdoro','Fontana','Marini','Boschetti','Guarnieri','Cavalli','Fabbri','Ferrari','Campana','Serra','Bellandi','Orsini','Contini','Pellegrini','Sartori','Molinari','Tessari','Del Colle','Della Valle'];
const pick=a=>a[(Math.random()*a.length)|0];
const reg=new Map(); // registro anagrafico: vivi e defunti
let ignoreFrozen=false,occStamp=0;
const wb=i=>water[i]===1&&(ignoreFrozen||!S.frozen);
const DX=[1,-1,0,0,1,1,-1,-1],DY=[0,0,1,-1,1,-1,1,-1];
const rs=new Uint32Array(N*N),rq=new Int32Array(N*N);let rstamp=0;
const ROTD=[[0,1],[-1,0],[0,-1],[1,0]];
const hooks={building(){},done(){},removed(){},villager(){},trees(){},rocks(){},saps(){},gone(){},season(){},ground(){},toast(){},upgraded(){},regarden(){}};
let seed=7;
const tree=new Uint8Array(N*N),rock=new Uint8Array(N*N),ore=new Uint8Array(N*N),water=new Uint8Array(N*N),sap=new Uint8Array(N*N),road=new Uint8Array(N*N),dist=new Uint8Array(N*N),occ=new Int32Array(N*N),field=new Int32Array(N*N),door=new Uint8Array(N*N),cen=new Uint8Array(N*N),gate=new Int32Array(N*N);const gatedSet=new Set();
// wear: solo per le strade tracciate dal giocatore (usura lenta). plev/phit/pexp: livello del sentiero, passaggi nella finestra corrente, istante di scadenza del livello.
const wear=new Float32Array(N*N),jit=new Float32Array(N*N),attr=new Float32Array(N*N),sapT=new Float32Array(N*N),plev=new Uint8Array(N*N),phit=new Uint8Array(N*N),pexp=new Float32Array(N*N);
const EDICT0=()=>({noUpgrade:false,noImmig:false,birthBonus:false,schoolMandatory:false,quarantine:false,woodDuty:false});
const S={t:0,mode:'lake',stock:{wood:40,stone:10,iron:0,grain:0,flour:0,planks:0,tools:0,cloth:0,clothes:0,bread:0,fish:0,meat:0},inflight:{wood:0,stone:0,iron:0},grow:0,barters:0,helps:0,visits:0,settled:0,season:0,year:1,frozen:false,day:0,f:0.06,ph:'work',wh:{wood:0,stone:0,iron:0},xf:{wood:0,stone:0,iron:0},edicts:EDICT0(),births:0,deaths:0,buried:0,unburied:0,
  deathsBy:{age:0,cold:0,hunger:0,ill:0},plague:{on:false,since:0,dead:0},inherits:0,cured:0,sickTot:0,moves:0,left:0,att:{joy:0,unemp:0,a:0,bonus:0},made:{},delivered:0};
const guests=[];const buildings=new Map();let villagers=[];const vmap=new Map();const resv=new Map();const plantResv=new Set();let nextId=1;
const acc={a1:0,a05:0,farm:0,attr:99};
const told={};
function tell(k,msg){if(told[k])return;told[k]=1;hooks.toast(msg);}
const JOBSTATES=new Set(['toCenterT','toWhT','toTree','toRock','chop','mine','toWork','wait','toField','till','toHomeF','toGranary','toPlant','plant','toMill','mill','toShop','shop','toGraze','graze','toSupply','toInnSup']);
const ERRKEY={wool:'wool',cloth:'cloth',iron:'iron',flour:'flour',wood:'firewood',hunt:'meat',fish:'fish'};
// fabbisogno di legna da ardere per casa: scorta minima per stare tranquilli (più alta d'autunno e d'inverno)
const fuelNeed=()=>S.season>=2?4:2;
const fuelCap=()=>S.edicts.woodDuty?20:12;
// scorta che la famiglia vuole avere: il fabbisogno, doppio con l'editto del dovere di legna
const fuelTarget=()=>S.edicts.woodDuty?fuelNeed()*2:fuelNeed();
// v23: la coltura del giardino è una sola: 'veg' (orto), 'eggs' (galline), 'herd' (allevamento) o 'wood' (legna da ardere). Il bene prodotto dal giardino:
const gardenGood=c=>c==='herd'?'meat':c==='wood'?'firewood':c;
const gardenCap=c=>c==='wood'?fuelCap():12;

function hash(x,y){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+seed)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const cx2w=cx=>(cx+0.5)*CS-W/2,cy2w=cy=>(cy+0.5)*CS-W/2;
function w2cell(x,z){const cx=Math.min(N-1,Math.max(0,Math.floor((x+W/2)/CS))),cy=Math.min(N-1,Math.max(0,Math.floor((z+W/2)/CS)));return cy*N+cx;}
function setFine(arr,cx,cy,val,k){const x=cx*SC+((hash(cx,cy+k)*SC)|0),y=cy*SC+((hash(cx+k,cy)*SC)|0);arr[y*N+x]=val;}
function blob(arr,cx,cy,r,val){const M=N/SC;for(let y=0;y<M;y++)for(let x=0;x<M;x++){if(Math.hypot(x-cx,y-cy)<=r*(0.75+hash(x,y)*0.45)&&hash(x+9,y+4)>0.2)setFine(arr,x,y,val,3);}}
function buildSAT(f){const T=new Int32Array((N+1)*(N+1));for(let y=0;y<N;y++){let row=0;for(let x=0;x<N;x++){row+=f(y*N+x);T[(y+1)*(N+1)+x+1]=T[y*(N+1)+x+1]+row;}}return T;}
function rect(T,x,y,w,h){const x0=Math.max(0,x),y0=Math.max(0,y),x1=Math.min(N,x+w),y1=Math.min(N,y+h);if(x1<=x0||y1<=y0)return 0;return T[y1*(N+1)+x1]-T[y0*(N+1)+x1]-T[y1*(N+1)+x0]+T[y0*(N+1)+x0];}
const capOf=b=>CAPS[b.level-1];
const countDone=type=>{let n=0;for(const b of buildings.values())if(b.type===type&&b.state==='done')n++;return n;};
const heldCenter=r=>Math.max(0,S.stock[r]-S.wh[r]-S.xf[r]);
// ---- v36: Magazzino e Granaio con regole di accettazione e massimali configurabili ----
// Ogni Magazzino (non il centro) tiene al massimo STORE_CAP unità in tutto, il Granaio GRAN_TOTAL: il totale è condiviso fra le merci accettate.
// Per ogni merce il giocatore sceglie se accettarla (on) e il massimale (max). Accettano solo merci di edifici veri: i giardini delle case non depositano mai.
// Magazzino: materiali da costruzione + prodotti degli artigiani (fabbro, tessitore, sarto). Granaio: cibo che non viene dai giardini (fattorie, mulino, forno, pesca, caccia).
// Il centro cittadino resta com'era: 80 per ogni materiale, non configurabile. Le scorte restano un contatore per merce (S.stock); la loro suddivisione fra edifici è calcolata da layout().
const GRAN_TOTAL=1000;
const STORE_KEYS=['wood','stone','iron','planks','tools','cloth','clothes'];
const GRAN_KEYS=['grain','flour','bread','fish','meat'];
const CENTER_KEYS=['wood','stone','iron','planks'];
const ALLKEYS=STORE_KEYS.concat(GRAN_KEYS);
const keysOf=b=>b.type==='granary'?GRAN_KEYS:(b.center?CENTER_KEYS:STORE_KEYS);
const totalOf=b=>b.type==='granary'?GRAN_TOTAL:(b.center?Infinity:STORE_CAP);
const polOf=b=>{if(!b.pol){b.pol={};for(const k of keysOf(b))b.pol[k]={on:true,max:b.type==='granary'?GRAN_TOTAL:STORE_CAP};}return b.pol;};
const polMax=(b,k)=>{if(!keysOf(b).includes(k))return 0;if(b.center)return CENTER_CAP;const p=polOf(b)[k];return p&&p.on?p.max:0;};
let stCache=null;
const storages=()=>stCache||(stCache=[...buildings.values()].filter(b=>b.state==='done'&&(b.type==='store'||b.type==='granary')));
// suddivisione "virtuale" delle scorte fra gli edifici: il centro tiene ciò che non è stato trasferito, il resto si riempie per merce e per edificio (ordine di costruzione)
function layout(){
  const L=new Map(),left={};for(const k of ALLKEYS)left[k]=Math.max(0,Math.floor(S.stock[k]||0));
  const bs=storages();
  for(const b of bs)L.set(b.id,{inv:{},tot:0});
  for(const b of bs){if(!b.center)continue;const e=L.get(b.id);
    for(const k of ['wood','stone','iron']){const q=Math.min(heldCenter(k),polMax(b,k),left[k]);if(q>0){e.inv[k]=q;e.tot+=q;left[k]-=q;}}}
  for(const k of ALLKEYS)for(const b of bs){
    if(b.center&&(k==='wood'||k==='stone'||k==='iron'))continue;
    const m=polMax(b,k);if(!m)continue;const e=L.get(b.id);
    const q=Math.min(left[k],Math.max(0,Math.min(m,totalOf(b)-e.tot)));
    if(q>0){e.inv[k]=(e.inv[k]||0)+q;e.tot+=q;left[k]-=q;}
  }
  return {L,left,bs};
}
// spazio per una merce: quanta ne tengono gli edifici che la accettano (held) e quanta ne possono ancora accogliere (room)
function spaceOf(k,pred){
  const {L,bs}=layout();let held=0,room=0;
  for(const b of bs){if(pred&&!pred(b))continue;const m=polMax(b,k);if(!m)continue;const e=L.get(b.id),h=e.inv[k]||0;held+=h;room+=Math.max(0,Math.min(m-h,totalOf(b)-e.tot));}
  return {held,room};
}
const stockRoom=k=>spaceOf(k).room;
const capRes=k=>{const s=spaceOf(k);return s.held+s.room;};
const capSec=k=>{const s=spaceOf(k,b=>!b.center);return s.held+s.room;};
const capTotal=()=>capRes('wood');
const capGrain=()=>capRes('grain');
const capFlour=()=>countDone('mill')*FLOUR_CAP+capRes('flour');
// il giocatore cambia accettazione e massimale di una merce; il centro non si configura
function setPolicy(id,k,patch){
  const b=buildings.get(id);if(!b||(b.type!=='store'&&b.type!=='granary')||b.center||!keysOf(b).includes(k))return false;
  const p=polOf(b)[k];
  if(patch&&patch.on!==undefined)p.on=!!patch.on;
  if(patch&&patch.max!==undefined){const m=Math.round(+patch.max);if(Number.isFinite(m))p.max=Math.max(0,Math.min(totalOf(b),m));}
  return true;
}
function storeInfo(b){const {L}=layout(),e=L.get(b.id)||{inv:{},tot:0};return {keys:keysOf(b),inv:e.inv,tot:e.tot,total:totalOf(b),pol:keysOf(b).map(k=>({k,on:b.center?true:polOf(b)[k].on,max:polMax(b,k)||(b.center?0:polOf(b)[k].max),held:e.inv[k]||0}))};}
function phaseOf(f){if(f<0.06||f>=0.88)return 'night';if(f<0.42)return 'work';if(f<0.54)return 'meal';if(f<0.76)return 'work';return 'evening';}
const SEASON_MSG=['Primavera: il ghiaccio si scioglie e i giardini tornano a produrre.','Estate: giornate lunghe e raccolti abbondanti.','Autunno: ultimo raccolto. Fate scorta di cibo e di legna da ardere prima del gelo!','Inverno: lago e fiume ghiacciano, i giardini rendono poco e le case hanno bisogno di legna da ardere.'];
function updClock(){const tt=S.t+6;S.day=Math.floor(tt/DAY);S.f=(tt%DAY)/DAY;S.ph=phaseOf(S.f);
  const si=Math.floor(S.day/SEASON_DAYS)%4;S.year=Math.floor(S.day/(SEASON_DAYS*4))+1;
  if(si!==S.season){S.season=si;S.frozen=si===3;hooks.season(si);hooks.ground();hooks.trees();hooks.toast(SEASON_MSG[si]);}}
function dateStr(t){const tt=Math.max(0,t)+6,day=Math.floor(tt/DAY),si=Math.floor(day/SEASON_DAYS)%4,yr=Math.floor(day/(SEASON_DAYS*4))+1;return SEASONS[si]+', annata '+yr;}
function logV(v,txt){const r=reg.get(v.id);if(!r)return;r.log.push({t:S.t,txt});if(r.log.length>40)r.log.shift();}

// v42: mappe organiche. Il seme decide tutto: forma e posizione di lago o fiume, boschi, cave e ferro. Ogni partita ha un seme nuovo.
function mulberry(a){return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
// un tentativo di terreno: riempie tree/rock/ore/water. Il tentativo n usa un seme derivato, così il risultato dipende solo dal seme di partenza.
function genTerrain(mode,sd,att){
  seed=(sd+Math.imul(att,7919))|0;
  const R=mulberry((Math.imul(sd|0,2654435761)^Math.imul(att+1,40503))>>>0);
  const rr=(a,b)=>a+(b-a)*R(),ri=(a,b)=>Math.floor(rr(a,b+1)),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const M=N/SC,CX=32,CY=32;
  for(const a of [tree,rock,ore,water])a.fill(0);
  // boschi e rocce di fondo: soglia e scala del rumore cambiano da mappa a mappa (valli più fitte o più aperte)
  const tth=rr(0.585,0.655),rth=rr(0.70,0.76),fq=rr(0.10,0.15);
  for(let y=0;y<M;y++)for(let x=0;x<M;x++){
    const d=Math.hypot(x-CX,y-CY);
    const n=vnoise(x*fq,y*fq)*0.65+vnoise(x*fq*2.75+40,y*fq*2.75)*0.35;
    if(d>8&&n>tth&&hash(x,y+7)>0.25)setFine(tree,x,y,1,1);
    const m=vnoise(x*0.1+200,y*0.1+90);
    if(d>11&&m>rth&&hash(x+3,y)>0.3)setFine(rock,x,y,10,2);
  }
  // macchie: posti diversi a ogni mappa, ma sempre almeno una a portata di mano
  const spot=(dmin,dmax,mg)=>{for(let k=0;k<40;k++){const a=R()*6.2832,d=rr(dmin,dmax),x=CX+Math.cos(a)*d,y=CY+Math.sin(a)*d;if(x>mg&&y>mg&&x<M-mg&&y<M-mg)return [x|0,y|0];}return [(CX+(R()<0.5?-1:1)*dmin)|0,CY];};
  const nT=ri(4,6);for(let k=0;k<nT;k++){const [x,y]=k<2?spot(12,20,3):spot(14,30,3);blob(tree,x,y,rr(3.4,6),1);}
  const nR=ri(2,3);for(let k=0;k<nR;k++){const [x,y]=k<1?spot(10,18,3):spot(14,28,3);blob(rock,x,y,rr(2.6,3.8),10);}
  const nO=ri(2,3);for(let k=0;k<nO;k++){const [x,y]=k<1?spot(20,28,4):spot(22,32,4);blob(ore,x,y,rr(2.8,3.4),10);}
  if(mode==='lake'){
    const a=R()*6.2832,d=rr(19,28),lx=cl(CX+Math.cos(a)*d,10,M-10),ly=cl(CY+Math.sin(a)*d,10,M-10);
    const rx=rr(6.5,11),ry=rr(5.2,8),th=R()*Math.PI,ct=Math.cos(th),st=Math.sin(th),amp=rr(0.45,0.8),nf=rr(0.22,0.34);
    const pond=R()<0.4?spot(18,30,6):null,pr=rr(2.5,4);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const xc=x/SC,yc=y/SC,u=(xc-lx)*ct+(yc-ly)*st,v=-(xc-lx)*st+(yc-ly)*ct;
      let e=(u/rx)**2+(v/ry)**2+(vnoise(xc*nf,yc*nf)-0.5)*amp;
      if(e>=1&&pond)e=((xc-pond[0])**2+(yc-pond[1])**2)/(pr*pr)+(vnoise(xc*0.4+90,yc*0.4)-0.5)*0.5;
      if(e<1)water[y*N+x]=1;
    }
  }else{
    // fiume: una retta di direzione casuale che serpeggia (due onde + rumore), larghezza variabile, due guadi
    const phi=R()*6.2832,dx=Math.cos(phi),dy=Math.sin(phi),nx=-dy,ny=dx,off=rr(12,21)*(R()<0.5?-1:1),bx=CX+nx*off,by=CY+ny*off;
    const A1=rr(2.5,6),A2=rr(0.8,2.2),f1=rr(0.7,1.4),f2=rr(2,3.4),p1=R()*6.2832,p2=R()*6.2832;
    const pts=[];
    for(let s=-80;s<=80;s+=0.25){
      const px=bx+dx*s,py=by+dy*s;if(px<-3||py<-3||px>M+3||py>M+3)continue;
      const lat=A1*Math.sin(s*0.09*f1+p1)+A2*Math.sin(s*0.21*f2+p2)+(vnoise(s*0.08+300,off)-0.5)*3;
      pts.push([px+nx*lat,py+ny*lat,1.6+1.4*vnoise(s*0.12+500,3)]);
    }
    const disc=(qx,qy,hw,val,onlyWater)=>{const r=hw*SC,cx=qx*SC,cy=qy*SC;for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(N-1,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(N-1,Math.ceil(cx+r));x++){if((x-cx)**2+(y-cy)**2>r*r)continue;const i=y*N+x;if(onlyWater){if(water[i])water[i]=val;}else water[i]=val;}};
    for(const p of pts)disc(p[0],p[1],p[2],1,false);
    if(pts.length>20)for(const fr of [rr(0.15,0.4),rr(0.6,0.85)]){const p=pts[Math.floor(pts.length*fr)];disc(p[0],p[1],p[2]+0.7,2,true);}
  }
  for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0;if(Math.hypot(x/SC-CX,y/SC-CY)<8){tree[i]=0;rock[i]=0;ore[i]=0;}if(water[i]){tree[i]=0;rock[i]=0;ore[i]=0;}}
}
// la mappa è giocabile? acqua lontana dal punto di partenza, quantità d'acqua sensata, legno, pietra e ferro raggiungibili
function terrainOK(mode){
  let wc=0,mw=1e9,t26=0,t18=0,r26=0,r18=0,oT=0,o32=0;
  for(let i=0;i<N*N;i++){const x=(i%N)/SC,y=((i/N)|0)/SC,d=Math.hypot(x-32,y-32);
    if(water[i]){wc++;if(d<mw)mw=d;}
    if(tree[i]){if(d<26)t26++;if(d<18)t18++;}
    if(rock[i]){if(d<26)r26++;if(d<18)r18++;}
    if(ore[i]){oT++;if(d<32)o32++;}}
  return mw>=(mode==='lake'?11:9)&&wc>=1500&&wc<=3600&&t26>=330&&t18>=100&&r26>=200&&r18>=60&&oT>=30&&o32>=12;
}

function init(sd,mode){
  seed=sd||7;S.mode=mode==='river'?'river':'lake';
  for(const a of [tree,rock,ore,water,sap,road,dist,door,cen])a.fill(0);
  gate.fill(0);gatedSet.clear();
  occ.fill(0);field.fill(0);wear.fill(0);plev.fill(0);phit.fill(0);pexp.fill(0);attr.fill(0);sapT.fill(0);
  buildings.clear();stCache=null;villagers=[];vmap.clear();reg.clear();resv.clear();plantResv.clear();nextId=1;guests.length=0;
  S.t=0;S.festA=[];S.fests=0;festSeq=0;S.edicts=EDICT0();S.births=0;S.deaths=0;S.buried=0;S.unburied=0;S.wh={wood:0,stone:0,iron:0};S.xf={wood:0,stone:0,iron:0};S.stock={wood:40,stone:10,iron:0,grain:0,flour:0,planks:0,tools:0,cloth:0,clothes:0,bread:0,fish:0,meat:0};S.inflight={wood:0,stone:0,iron:0};S.grow=0;S.left=0;S.att={joy:0,unemp:0,a:0,bonus:0};S.barters=0;S.helps=0;S.visits=0;S.settled=0;S.season=0;S.year=1;S.frozen=false;acc.a1=0;acc.a05=0;acc.farm=0;acc.attr=99;for(const k in told)delete told[k];
  S.deathsBy={age:0,cold:0,hunger:0,ill:0};S.plague={on:false,since:0,dead:0};S.inherits=0;S.cured=0;S.sickTot=0;S.moves=0;S.made={};S.delivered=0;
  let okT=false,att=0;const base=(sd||7)|0;
  for(;att<48&&!okT;att++){genTerrain(S.mode,base,att);okT=terrainOK(S.mode);}
  S.seed=base;S.mapTries=att;S.mapOK=okT;
  for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0;jit[i]=hash(x,y+500)*0.15;}
  updClock();
  addBuilding('store',31*SC,31*SC,true,{center:true});
  for(let k=0;k<3;k++){const v=addVillager(cx2w(31*SC+1+k*2),cy2w(31*SC+9),22+k*4);logV(v,'Partito da Rocca Nera con la carovana: uno dei primi abitanti del borgo.');}
  computeAttr();
  hooks.trees();hooks.rocks();hooks.saps();hooks.ground();
}

const dimsOf=(t,rot)=>(rot&1)?[t.h,t.w]:[t.w,t.h];
function entranceOf(x,y,w,h,rot){
  switch(rot|0){case 0:return [x+(w>>1),y+h];case 1:return [x-1,y+(h>>1)];case 2:return [x+(w>>1),y-1];default:return [x+w,y+(h>>1)];}
}
const BLOCKED=i=>occ[i]||water[i]||tree[i]||rock[i]||ore[i]||door[i]||field[i]||sap[i]||cen[i]===2;
function entOK(ex,ey){if(ex<0||ey<0||ex>=N||ey>=N)return false;return !BLOCKED(ey*N+ex);}
// v32: la casa è un rettangolo (hw×hh, da 3×3 a 6×4), il giardino è un insieme libero di celle (b.gcells: a lato, a L, a U, intorno alla casa, triangolare)
// taglio diagonale: n = normale verso l'esterno, k = offset; diagVal(b,X,Y) > 0 fuori dal taglio
function diagOf(p,gcs){const dx=p[2]-p[0],dy=p[3]-p[1],L=Math.hypot(dx,dy);let nx=dy/L,ny=-dx/L,k=nx*p[0]+ny*p[1];let mx=0,my=0;for(const i of gcs){mx+=i%N+.5;my+=((i/N)|0)+.5;}mx/=gcs.length;my/=gcs.length;if(nx*mx+ny*my-k>0){nx=-nx;ny=-ny;k=-k;}return {p,n:[nx,ny],k};}
const diagVal=(b,X,Y)=>b.diag.n[0]*X+b.diag.n[1]*Y-b.diag.k;
function lotCells(b){const c=[];for(let yy=b.hy;yy<b.hy+b.hh;yy++)for(let xx=b.hx;xx<b.hx+b.hw;xx++)c.push(yy*N+xx);for(const i of b.gcells)c.push(i);return c;}
function addBuilding(type,x,y,done,o){
  const t=BT[type];o=o||{};stCache=null;
  const rot=o.rot|0;let w,h;
  if(o.w){w=o.w;h=o.h;}else{[w,h]=dimsOf(t,rot);}
  const b={id:nextId++,type,x,y,w,h,rot,state:done?'done':'site',got:{wood:0,stone:0,planks:0},fly:{wood:0,stone:0,planks:0},cost:done?null:costOf(type),prog:done?1:0,workers:[],want:(type==='sheepfold'&&o&&o.owner)?0:t.want,
    cell:(y+(h>>1))*N+(x+(w>>1)),entrance:-1,zone:null};
  if(type==='house'){
    const goods={};for(const g of GOODS)goods[g]=0;const ate={};for(const g of TYPES)ate[g]=-999;
    const gcs=o.gcells.slice(),gxs=gcs.map(i=>i%N),gys=gcs.map(i=>(i/N)|0),gx0=Math.min(...gxs),gy0=Math.min(...gys);
    let mx=0,my=0;for(const i of gcs){mx+=i%N;my+=(i/N)|0;}mx/=gcs.length;my/=gcs.length;
    let gcc=gcs[0],gbd=1e9;for(const i of gcs){const d=Math.hypot(i%N-mx,((i/N)|0)-my);if(d<gbd){gbd=d;gcc=i;}}
    Object.assign(b,{hx:o.hx,hy:o.hy,hw:o.hw||3,hh:o.hh||3,gcells:gcs,shape:o.shape||'rect',diag:o.diag?diagOf(o.diag,gcs):null,gx:gx0,gy:gy0,gw:Math.max(...gxs)-gx0+1,gh:Math.max(...gys)-gy0+1,door:o.door,cell:(o.hy+((o.hh||3)>>1))*N+o.hx+((o.hw||3)>>1),gc:gcc,variant:o.variant|0,level:1,up:0,crop:o.crop,side:o.side||'none',pure:!!o.pure,craft:false,bake:false,weave:false,tailor:false,ovile:null,warm:true,heatDay:-1,ext:[],members:[],pa:{g:0,c:0,b:0,w:0,t:0},hungry:0,tradeCool:0,stall:null,farm:null,attr:0,
      birthT:S.t+DAY*2,goods,ate,head:null,legacy:null,well:50,flags:{food:false,water:false,church:false,attr:true,tools:true,heat:true,mat:true,fuel:true}});
    b.goods[gardenGood(b.crop)]=3;
    // la famiglia del giardino della legna non ha orto né galline: arriva con una piccola scorta di ortaggi, poi mangia solo ciò che baratta al mercato (o che pesca/caccia)
    if(b.crop==='wood')b.goods.veg=3;
    door[o.door]=1;gate[o.door]=b.id;gatedSet.add(b.id);b.entrance=o.door;
    b.cells=lotCells(b);
  }
  if(type==='stall')Object.assign(b,{owner:o.owner,open:false,keeper:null});
  if(type==='farm')Object.assign(b,{owner:o.owner||null,fields:[]});
  if(type==='sheepfold')Object.assign(b,{owner:o.owner||null,fields:[],pen:[],buf:0});
  if(type==='inn')Object.assign(b,{pantry:0,guestsIn:0,horses:0});
  if(type==='school'||type==='infirmary')b.pupils=0;
  if(WS[type])b.out={tools:0,bread:0,cloth:0,clothes:0,fish:0,meat:0};
  if(type==='mercery')b.shelf={tools:0,bread:0,cloth:0,clothes:0};
  if(type==='church')b.cem=null;
  if(type==='cemetery')b.owner=o.owner;
  if(type==='wood'||type==='quarry'||type==='mine')b.buf=0;
  if(type==='store'){b.center=!!o.center;b.stage=0;
    if(b.center){
      for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)cen[yy*N+xx]=1;
      const g0=x+((w-4)>>1);
      if(y+h<N)for(let xx=g0;xx<g0+4;xx++)cen[(y+h)*N+xx]=2;
    }}
  if(!NOGATE[type]&&!b.center){const [ex,ey]=entranceOf(x,y,w,h,rot);if(entOK(ex,ey)){const e=ey*N+ex;b.entrance=e;door[e]=1;gate[e]=b.id;gatedSet.add(b.id);}}
  if(b.cells){for(const i of b.cells){occ[i]=b.id;wear[i]=0;road[i]=0;plev[i]=0;phit[i]=0;pexp[i]=0;}}
  else for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=yy*N+xx;occ[i]=b.id;wear[i]=0;road[i]=0;plev[i]=0;phit[i]=0;pexp[i]=0;}
  buildings.set(b.id,b);occStamp++;hooks.building(b);hooks.ground();acc.attr=99;
  return b;
}
function addVillager(x,z,age,fam,parTrait){
  if(age===undefined)age=20+Math.random()*20;
  const sex=Math.random()<0.5?'M':'F',name=pick(sex==='M'?MNAMES:FNAMES),fm=fam||pick(FAMS);
  const v={age,child:age<14,edu:0,schooled:false,sd:false,life:62+Math.random()*20,xr:null,id:nextId++,x,z,cell:w2cell(x,z),path:[],state:'idle',carry:null,cq:0,cargo:null,task:null,job:null,home:null,stall:null,timer:0,cool:0,fa:0,moving:false,inside:false,
    target:-1,day:-1,ate:false,drew:false,prayed:false,next:'sleep',sleepPh:'',helpH:0,err:null,duty:false,
    name,fam:fm,sex,ill:null,immT:0,trade:null,sk:{},inh:false,sch:null,trait:parTrait!==undefined?parTrait:rollTrait(),joy:50,sad:0};
  reg.set(v.id,{id:v.id,name,fam:fm,sex,born:S.t-age*AGEY,died:null,cause:null,ageD:null,par:[],kids:[],log:[],trade:null,sk:null,inh:false,schooled:false,trait:v.trait});
  villagers.push(v);vmap.set(v.id,v);hooks.villager(v);return v;
}

function nearAny(arr,x,y,r){for(let yy=Math.max(0,y-r);yy<=Math.min(N-1,y+r);yy++)for(let xx=Math.max(0,x-r);xx<=Math.min(N-1,x+r);xx++)if(arr[yy*N+xx]>0)return true;return false;}
function countNear(arr,x,y,r,val){let c=0;for(let yy=Math.max(0,y-r);yy<=Math.min(N-1,y+r);yy++)for(let xx=Math.max(0,x-r);xx<=Math.min(N-1,x+r);xx++)if(val?arr[yy*N+xx]===val:arr[yy*N+xx]>0)c++;return c;}
function centerCell(){let c=-1;for(const b of buildings.values())if(b.type==='store'&&b.state==='done'){if(b.center)return b.cell;c=b.cell;}return c;}
// regole di passaggio condivise da A* e dalla propagazione di raggiungibilità
function canStep(cur,cx,cy,k,ni,nx,ny,sOcc,tocc){
  if(wb(ni))return false;
  const co=occ[ni];if(co&&co!==tocc&&co!==sOcc)return false;
  {const cc=cen[cur]===1,cn=cen[ni]===1;if(cc!==cn){if(k>=4)return false;if(cen[cc?ni:cur]!==2)return false;}}
  {const a=occ[cur];if(co!==a){if(a>0&&gatedSet.has(a)&&(k>=4||gate[ni]!==a))return false;if(co>0&&gatedSet.has(co)&&(k>=4||gate[cur]!==co))return false;}}
  if(k>=4){const oa=occ[cy*N+nx],ob=occ[ny*N+cx];if((oa&&oa!==tocc&&oa!==sOcc)||(ob&&ob!==tocc&&ob!==sOcc))return false;if(wb(cy*N+nx)||wb(ny*N+cx))return false;}
  return true;
}
function flood(marks){
  const c=centerCell();if(c<0)return false;
  const saved=marks.map(i=>occ[i]);for(const i of marks)occ[i]=-9;
  ignoreFrozen=true;rstamp++;const sOcc=occ[c];
  let qh=0,qt=0;rq[qt++]=c;rs[c]=rstamp;
  while(qh<qt){const cur=rq[qh++],cx=cur%N,cy=(cur/N)|0;
    for(let k=0;k<8;k++){const nx=cx+DX[k],ny=cy+DY[k];if(nx<0||ny<0||nx>=N||ny>=N)continue;const ni=ny*N+nx;if(rs[ni]===rstamp)continue;
      if(!canStep(cur,cx,cy,k,ni,nx,ny,sOcc,0))continue;rs[ni]=rstamp;rq[qt++]=ni;}}
  ignoreFrozen=false;marks.forEach((i,k)=>{occ[i]=saved[k];});return true;
}
function reachable(goal,marks){if(!flood(marks))return true;return rs[goal]===rstamp;}
function doorsAfterFlood(x0,y0,x1,y1,marks){
  for(let y=Math.max(0,y0-4);y<=Math.min(N-1,y1+4);y++)for(let x=Math.max(0,x0-4);x<=Math.min(N-1,x1+4);x++){
    const i=y*N+x;if(door[i]&&!marks.includes(i)&&rs[i]!==rstamp)return false;
  }
  return true;
}
function doorsOK(x0,y0,x1,y1,marks){if(!flood(marks))return true;return doorsAfterFlood(x0,y0,x1,y1,marks);}
const connCache=new Map();let connStamp=-1;
function connectMsg(w,h,x,y,ent){
  if(centerCell()<0)return '';
  if(connStamp!==occStamp){connCache.clear();connStamp=occStamp;}
  const key=w+','+h+','+x+','+y+','+ent;if(connCache.has(key))return connCache.get(key);
  const marks=[];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)marks.push(yy*N+xx);
  flood(marks);
  let ok=false;
  if(ent>=0)ok=rs[ent]===rstamp;
  else{
    const chk=(xx,yy)=>{if(xx<0||yy<0||xx>=N||yy>=N)return false;const i=yy*N+xx;return !BLOCKED(i)&&rs[i]===rstamp;};
    for(let xx=x;xx<x+w&&!ok;xx++)if(chk(xx,y-1)||chk(xx,y+h))ok=true;
    for(let yy=y;yy<y+h&&!ok;yy++)if(chk(x-1,yy)||chk(x+w,yy))ok=true;
  }
  let msg=ok?'':"Nessun accesso: l'ingresso deve poter essere raggiunto dalle altre vie";
  if(!msg&&!doorsAfterFlood(x,y,x+w-1,y+h-1,marks))msg="Bloccherebbe l'ingresso di una casa vicina";
  connCache.set(key,msg);return msg;
}
function canPlace(type,x,y,rot){
  const t=BT[type];rot=rot|0;const [w,h]=dimsOf(t,rot);
  if(x<0||y<0||x+w>N||y+h>N)return 'Fuori dal territorio';
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    const i=yy*N+xx;
    if(water[i])return "Non si può costruire sull'acqua";
    if(occ[i])return 'Spazio già occupato';
    if(tree[i]||sap[i])return 'Ci sono alberi: serve spazio libero';
    if(rock[i]||ore[i])return 'Ci sono rocce o minerale: serve spazio libero';
    if(field[i])return 'Campo coltivato di una fattoria';
    if(door[i])return "Ingresso di un edificio: lascialo libero";
    if(cen[i]===2)return "Cancello del centro cittadino: lascialo libero";
    if(type==='sheepfold'&&dist[i]!==5)return "L'ovile va costruito dentro una zona Pascolo: disegnala prima (tasto P)";
  }
  if(t.need==='tree'&&!nearAny(tree,x,y,36))return 'Servono alberi nelle vicinanze';
  if(t.need==='rock'&&!nearAny(rock,x,y,36))return 'Servono rocce nelle vicinanze';
  if(t.need==='ore'&&!nearAny(ore,x,y,36))return 'Serve una zona mineraria (ferro) nelle vicinanze';
  if(t.need==='water'&&countNear(water,x,y,14,1)<20)return 'Serve un lago o un fiume vicino';
  if(t.need==='forest'&&countNear(tree,x,y,15)<16)return 'Serve un bosco fitto nelle vicinanze';
  let ent=-1;
  if(!NOGATE[type]){const [ex,ey]=entranceOf(x,y,w,h,rot);if(!entOK(ex,ey))return "L'ingresso è bloccato: ruota l'edificio (R) o scegli un altro punto";ent=ey*N+ex;}
  return connectMsg(w,h,x,y,ent);
}
// rotazione automatica per gli edifici fondati dagli abitanti: ingresso verso il centro, raggiungibile
function autoRot(type,x,y){
  const t=BT[type],c=centerCell(),cx=c>=0?c%N:N/2,cy=c>=0?(c/N)|0:N/2;
  const order=[0,1,2,3].map(r=>{const [w,h]=dimsOf(t,r);return [-((cx-(x+w/2))*ROTD[r][0]+(cy-(y+h/2))*ROTD[r][1]),r];}).sort((a,b)=>a[0]-b[0]);
  for(const [,r] of order){
    const [w,h]=dimsOf(t,r);if(x+w>N||y+h>N)continue;
    const [ex,ey]=entranceOf(x,y,w,h,r);if(!entOK(ex,ey))continue;
    const marks=[];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)marks.push(yy*N+xx);
    if(!flood(marks))return r;
    if(rs[ey*N+ex]===rstamp&&doorsAfterFlood(x,y,x+w-1,y+h-1,marks))return r;
  }
  return -1;
}
function addCemetery(cid){
  const ch=buildings.get(cid);if(!ch||ch.type!=='church'||ch.state!=='done')return {ok:false,msg:'Serve una chiesa completata'};
  if(ch.cem&&buildings.get(ch.cem))return {ok:false,msg:'La chiesa ha già un cimitero'};
  const c=BT.cemetery.cost;if(uncommitted('wood')<c.wood||uncommitted('stone')<c.stone)return {ok:false,msg:'Risorse insufficienti'};
  const f=ROTD[ch.rot|0],bx0=ch.x,by0=ch.y,W0=ch.w,H0=ch.h;
  const strip=(dx,dy)=>{if(dx===0){const w=9,h=4;return {x:bx0+((W0-w)>>1),y:dy>0?by0+H0:by0-h,w,h};}const w=4,h=9;return {x:dx>0?bx0+W0:bx0-w,y:by0+((H0-h)>>1),w,h};};
  const rects=[strip(-f[0],-f[1]),strip(-f[1],f[0]),strip(f[1],-f[0])];
  for(const r of rects){
    if(r.x<0||r.y<0||r.x+r.w>N||r.y+r.h>N)continue;
    let bad=false;
    for(let yy=r.y;yy<r.y+r.h&&!bad;yy++)for(let xx=r.x;xx<r.x+r.w;xx++){const i=yy*N+xx;if(occ[i]||water[i]||tree[i]||sap[i]||rock[i]||ore[i]||field[i]||door[i]||cen[i]===2){bad=true;break;}}
    if(bad||connectMsg(r.w,r.h,r.x,r.y,-1))continue;
    const cb=addBuilding('cemetery',r.x,r.y,false,{w:r.w,h:r.h,owner:cid});ch.cem=cb.id;return {ok:true,b:cb};
  }
  return {ok:false,msg:"Non c'è spazio libero accanto alla chiesa per un cimitero"};
}
// v32: gli edifici con assi nel costo le chiedono alla falegnameria; senza una falegnameria completata le assi si pagano in legno (2 legni per asse), così nessun cantiere si blocca.
const PLANK_CAP=24,PLANK_WOOD=2;
function costOf(type){
  const c=BT[type].cost;if(!c.planks)return {wood:c.wood,stone:c.stone,planks:0};
  return countDone('carpenter')?{wood:c.wood,stone:c.stone,planks:c.planks}:{wood:c.wood+PLANK_WOOD*c.planks,stone:c.stone,planks:0};
}
const costRes=b=>b.cost||costOf(b.type);
function uncommitted(res){
  let v=S.stock[res]||0;
  for(const b of buildings.values())if(b.state==='site'){const c=costRes(b);v-=(c[res]||0)-b.got[res]-b.fly[res];}
  return v;
}
function afford(type){const c=costOf(type);return uncommitted('wood')>=c.wood&&uncommitted('stone')>=c.stone&&uncommitted('planks')>=c.planks;}
function place(type,x,y,rot){
  const m=canPlace(type,x,y,rot);if(m)return {ok:false,msg:m};
  if(!afford(type))return {ok:false,msg:'Risorse insufficienti (parte del materiale è già destinata ad altri cantieri)'};
  return {ok:true,b:addBuilding(type,x,y,false,{rot:rot|0})};
}

function dropMarket(v){
  if(v.cargo&&v.state==='toMarket'){const h=buildings.get(v.home),o=buildings.get(v.cargo.owner);if(h)h.goods[v.cargo.s]+=v.cargo.q;if(o)o.goods[v.cargo.t]+=v.cargo.q;}
  v.cargo=null;v.carry=null;v.stall=null;v.path=[];v.state='idle';v.moving=false;
}
function release(vid){
  const v=vmap.get(vid);if(!v)return;
  v.job=null;
  if(v.state==='toDeliver'||v.state==='toStockG'||v.state==='shop'||v.state==='toShop'){abortTask(v);return;}
  if((v.state==='toCenterT'||v.state==='toWhT')&&v.xr){S.xf[v.xr]=Math.max(0,S.xf[v.xr]-1);v.xr=null;}
  if(JOBSTATES.has(v.state)){resv.delete(v.target);plantResv.delete(v.target);v.path=[];v.carry=null;v.state='idle';v.moving=false;v.inside=false;}
}
function removeBuilding(id){
  const b=buildings.get(id);if(!b)return;
  const t=BT[b.type];
  if(b.state==='site'){S.stock.wood+=b.got.wood;S.stock.stone+=b.got.stone;S.stock.planks+=b.got.planks||0;}
  else if(!b.center){S.stock.wood+=Math.floor(t.cost.wood/2);S.stock.stone+=Math.floor(t.cost.stone/2);S.stock.planks+=Math.floor((t.cost.planks||0)/2);}
  for(const vid of b.workers.slice())release(vid);
  for(const v of villagers){
    if(v.home===id)v.home=null;
    if(v.job===id)release(v.id);
    if(b.type==='stall'&&(v.stall===id||(v.cargo&&v.cargo.stall===id&&v.state==='toMarket')))dropMarket(v);
  }
  buildings.delete(id);
  if(b.type==='church'&&b.cem)removeBuilding(b.cem);
  if(b.type==='cemetery'){const ch=buildings.get(b.owner);if(ch)ch.cem=null;}
  if(b.center){for(let yy=b.y;yy<=b.y+b.h&&yy<N;yy++)for(let xx=b.x;xx<b.x+b.w;xx++)cen[yy*N+xx]=0;}
  if(b.cells){for(const i of b.cells)occ[i]=0;}
  else for(let yy=b.y;yy<b.y+b.h;yy++)for(let xx=b.x;xx<b.x+b.w;xx++)occ[yy*N+xx]=0;
  if(b.ext)for(const i of b.ext)occ[i]=0;
  if(b.entrance>=0){door[b.entrance]=0;gate[b.entrance]=0;gatedSet.delete(b.id);}
  if(b.type==='house'){door[b.door]=0;if(b.stall)removeBuilding(b.stall);if(b.farm)removeBuilding(b.farm);if(b.ovile)removeBuilding(b.ovile);}
  if(b.type==='farm'){for(const i of b.fields)if(field[i]===id)field[i]=0;const h=b.owner&&buildings.get(b.owner);if(h)h.farm=null;}
  if(b.type==='stall'){const h=buildings.get(b.owner);if(h)h.stall=null;}
  if(b.type==='sheepfold'){const h=b.owner&&buildings.get(b.owner);if(h)h.ovile=null;}
  occStamp++;stCache=null;hooks.removed(b);hooks.ground();acc.attr=99;
}
function canDemolish(b){
  if(b.center&&b.state==='done'&&['wood','stone','iron'].some(r=>S.stock[r]-S.wh[r]>0))return 'Il centro cittadino si può demolire solo quando non contiene più materiali: un magazzino secondario li porta via a poco a poco';
  return '';
}
function demolishAt(cx,cy){
  if(cx<0||cy<0||cx>=N||cy>=N)return '';
  const i=cy*N+cx;
  if(occ[i]){const b=buildings.get(occ[i]);if(b){const m=canDemolish(b);if(m)return m;removeBuilding(b.id);return 'ok';}}
  if(road[i]){road[i]=0;wear[i]=0;hooks.ground();return 'ok';}
  if(sap[i]){sap[i]=0;hooks.saps();return 'ok';}
  if(plev[i]>0){plev[i]=0;phit[i]=0;pexp[i]=0;hooks.ground();return 'ok';}
  return '';
}
function paintDistrict(x0,y0,x1,y1,type){
  let n=0;
  for(let y=Math.max(0,Math.min(y0,y1));y<=Math.min(N-1,Math.max(y0,y1));y++)for(let x=Math.max(0,Math.min(x0,x1));x<=Math.min(N-1,Math.max(x0,x1));x++){
    const i=y*N+x;if(water[i]===1)continue;if(dist[i]!==type){dist[i]=type;n++;}
  }
  if(n)hooks.ground();return n;
}
function paintRoad(cx,cy){
  if(cx<0||cy<0||cx>=N||cy>=N)return;
  const i=cy*N+cx;if(occ[i]||tree[i]||rock[i]||ore[i]||road[i]||field[i]||water[i]||sap[i])return;
  road[i]=1;wear[i]=WMAX;plev[i]=0;phit[i]=0;pexp[i]=0;hooks.ground();
}
const ZONED={wood:1,quarry:1,mine:1,forester:1};
function setZone(id,cell,r){const b=buildings.get(id);if(!b||!ZONED[b.type])return;b.zone=cell<0?null:{c:cell,r:Math.max(6,Math.min(60,r|0))};}
function setEdict(k,v){if(k in S.edicts)S.edicts[k]=!!v;}
function setWant(id,n){const b=buildings.get(id);if(!b)return;b.want=Math.max(0,Math.min(BT[b.type].slots,n));}

// ---- attrattiva ----
function computeAttr(){
  attr.fill(0);
  const add=(cx,cy,s,r)=>{
    for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(N-1,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(N-1,Math.ceil(cx+r));x++){
      const d=Math.hypot(x-cx,y-cy);if(d<r)attr[y*N+x]+=s*(1-d/r);}
  };
  for(const b of buildings.values()){
    const cx=b.x+(b.w-1)/2,cy=b.y+(b.h-1)/2;let a=null;
    if(b.state==='site')a=b.type==='house'?[-0.3,3]:[-0.8,4];
    else if(b.type==='house')a=b.level>1?[0.4*(b.level-1),3]:null;
    else if(b.type==='store')a=b.center?[0.5,6]:[-1.5,6];
    else a=ATTR[b.type]||null;
    if(a)add(cx,cy,a[0],a[1]);
    // v36.1: il giardino fisso (generico) abbellisce lo spazio intorno, tanto più quanto è grande
    if(b.type==='house'&&b.state==='done'&&b.pure){const gn=b.gcells.length+b.ext.length;add(b.gx+(b.gw-1)/2,b.gy+(b.gh-1)/2,0.3+0.05*(gn-9),6+(gn>>2));}
  }
  const unb=Math.min(1.5,S.unburied*0.15);if(unb>0)for(let i=0;i<N*N;i++)attr[i]-=unb;
  const ts=buildSAT(i=>tree[i]?1:0),ws=buildSAT(i=>water[i]===1?1:0),R=10;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const c=rect(ts,x-R,y-R,2*R+1,2*R+1),w=rect(ws,x-R,y-R,2*R+1,2*R+1);
    attr[y*N+x]+=Math.min(1.5,c*0.06)+Math.min(1.5,w*0.0056);
  }
}
const attrLabel=a=>a>=3?'Ottima':a>=1?'Buona':a>=-1?'Discreta':a>=-3?'Rumorosa':'Pessima';

// ---- pathfinding ----
const gS=new Float32Array(N*N),came=new Int32Array(N*N),seen=new Uint32Array(N*N),closed=new Uint32Array(N*N);let stamp=0;
let hf=[],hi=[];
function hpush(f,i){let k=hf.length;hf.push(f);hi.push(i);while(k>0){const p=(k-1)>>1;if(hf[p]<=f)break;hf[k]=hf[p];hi[k]=hi[p];k=p;}hf[k]=f;hi[k]=i;}
function hpop(){const top=hi[0],lf=hf.pop(),li=hi.pop();const n=hf.length;if(n>0){let k=0;while(true){let c=2*k+1;if(c>=n)break;if(c+1<n&&hf[c+1]<hf[c])c++;if(hf[c]>=lf)break;hf[k]=hf[c];hi[k]=hi[c];k=c;}hf[k]=lf;hi[k]=li;}return top;}
function astar(s,g,tocc){
  if(s===g)return [];
  stamp++;const sOcc=occ[s];const gx=g%N,gy=(g/N)|0;
  hf=[];hi=[];hpush(0,s);gS[s]=0;seen[s]=stamp;came[s]=-1;
  while(hf.length){
    const cur=hpop();if(closed[cur]===stamp)continue;closed[cur]=stamp;if(cur===g)break;
    const cx=cur%N,cy=(cur/N)|0;
    for(let k=0;k<8;k++){
      const nx=cx+DX[k],ny=cy+DY[k];if(nx<0||ny<0||nx>=N||ny>=N)continue;
      const ni=ny*N+nx;if(closed[ni]===stamp)continue;
      if(!canStep(cur,cx,cy,k,ni,nx,ny,sOcc,tocc))continue;
      let c=1;if(road[ni])c=0.3;else c=PCOST[plev[ni]];
      if(tree[ni])c+=3;if(rock[ni]||ore[ni])c+=3;if(water[ni]===2)c+=1.2;else if(water[ni]===1)c+=0.8;c+=jit[ni];if(k>=4)c*=1.4142;
      const ng=gS[cur]+c;
      if(seen[ni]!==stamp||ng<gS[ni]){seen[ni]=stamp;gS[ni]=ng;came[ni]=cur;const ddx=Math.abs(nx-gx),ddy=Math.abs(ny-gy);hpush(ng+(ddx>ddy?ddx+0.4142*ddy:ddy+0.4142*ddx)*0.5,ni);}
    }
  }
  if(closed[g]!==stamp)return null;
  const p=[];let c=g;while(c!==s){p.push(c);c=came[c];}p.reverse();return p;
}
// Chi esce da casa passa dall'ingresso; chi rientra a casa arriva dall'ingresso.
function route(v,goal,tocc){
  // gli edifici con ingresso si raggiungono dalla porta: lavoratori e carichi restano visibili all'esterno
  if(tocc>0){const tb=buildings.get(tocc);if(tb&&tb.entrance>=0&&tb.type!=='house'&&goal===tb.cell){goal=tb.entrance;tocc=0;}}
  const p=astar(v.cell,goal,tocc);if(!p)return false;v.path=p;return true;
}

// ---- abitanti ----
// Ogni passaggio su una cella libera conta per il livello del sentiero: 0 -> 1 con 1 passaggio (dura 20 s), 1 -> 2 con 2 passaggi in quei 20 s (dura 40 s), 2 -> 3 con 4 passaggi (dura 80 s), 3 -> 4 con 8 passaggi (dura 240 s). Alla scadenza il livello scende di uno e riparte la durata di quello inferiore. Al livello 4 ogni passaggio rinnova la scadenza.
function stepOn(i){
  if(road[i])return;
  if(occ[i]||tree[i]||rock[i]||ore[i]||field[i]||water[i])return;
  const L=plev[i];
  if(L<MAXP){
    phit[i]++;
    if(phit[i]>=NEEDP[L]){
      plev[i]=L+1;phit[i]=0;pexp[i]=S.t+DUR[L+1];
      if(L+1===PATH)tell('path','Il passaggio degli abitanti ha formato un sentiero.');
      else if(L+1===MAXP)tell('path4','Un sentiero molto battuto: il terreno è ormai nudo e l\'erba impiegherà molto tempo a ricrescere.');
    }
  }else pexp[i]=S.t+DUR[MAXP];
  hooks.ground();
}
// movimento lungo il percorso (v38): agli angoli l'abitante taglia dolcemente la curva (SMOOTH_R) invece di girare di scatto sul centro della cella,
// e il corpo ruota gradualmente verso la direzione di marcia. L'ultima cella del percorso si raggiunge sempre esattamente.
const SMOOTH_R=0.6,SMOOTH_REACH=0.25;
function moveV(v,dt){
  if(!v.path.length){v.moving=false;return true;}
  v.inside=false;
  const ti=v.path[0],tx=cx2w(ti%N),tz=cy2w((ti/N)|0),ni=v.path[1];
  let sp=3.0;if(road[ti])sp*=1.45;else if(tree[ti]||water[ti]===2)sp*=0.6;else if(water[ti]===1)sp*=0.85;else sp*=PSPD[plev[ti]];
  if(v.ill)sp*=0.7;
  const dx=tx-v.x,dz=tz-v.z,d=Math.hypot(dx,dz),step=sp*dt;v.moving=true;
  const last=ni===undefined,reach=last?step:Math.max(step,SMOOTH_REACH);
  if(d<=reach){
    if(last){v.x=tx;v.z=tz;}
    v.cell=ti;v.path.shift();stepOn(ti);
    if(last){v.moving=false;return true;}
    if(d>step)return false; // curva: continua verso la cella successiva senza scattare sul centro
    v.x=tx;v.z=tz;
  }
  // punto di mira: vicino a un angolo si sposta verso la cella successiva (curva morbida)
  let ax=tx,az=tz;
  if(!last&&d<SMOOTH_R){const t=0.5*(1-d/SMOOTH_R);ax=tx+(cx2w(ni%N)-tx)*t;az=tz+(cy2w((ni/N)|0)-tz)*t;}
  const mx=ax-v.x,mz=az-v.z,md=Math.hypot(mx,mz);
  if(md>1e-6){
    const mv=Math.min(step,md);v.x+=mx/md*mv;v.z+=mz/md*mv;
    const want=Math.atan2(mx,mz);
    if(v.fa===undefined)v.fa=want;
    else{const df=Math.atan2(Math.sin(want-v.fa),Math.cos(want-v.fa));v.fa+=df*Math.min(1,dt*12);}
  }
  return false;
}
function nearestOf(type,cell,maxd){
  let best=null,bd=maxd*maxd;const cx=cell%N,cy=(cell/N)|0;
  for(const b of buildings.values()){if(b.type!==type||b.state!=='done')continue;const d=(b.cell%N-cx)**2+((b.cell/N|0)-cy)**2;if(d<bd){bd=d;best=b;}}
  return best;
}
const nearestStore=cell=>nearestOf('store',cell,600);
// magazziniere: porta dal magazzino ai cantieri
function findHaul(v){
  const st=nearestStore(v.cell);if(!st)return false;
  for(const s of buildings.values()){
    if(s.state!=='site')continue;const t=costRes(s);
    for(const r of ['wood','stone','planks']){
      const need=(t[r]||0)-s.got[r]-s.fly[r];
      if(need>0&&S.stock[r]>0){
        if(!route(v,st.cell,st.id))return false;
        S.stock[r]--;s.fly[r]++;v.task={res:r,site:s.id};v.state='toStore';return true;
      }
    }
  }
  return false;
}
const RESOF={wood:'wood',quarry:'stone',mine:'iron'};
const spaceForRes=res=>stockRoom(res)-S.inflight[res];
function tryCollect(v){
  if(!nearestStore(v.cell))return false;
  let best=null,bs=1;
  for(const p of buildings.values()){
    const res=RESOF[p.type];if(!res||p.state!=='done'||p.buf<2)continue;
    if(spaceForRes(res)<1)continue;
    if(p.buf>bs){bs=p.buf;best=p;}
  }
  if(!best)return false;
  const res=RESOF[best.type];
  const q=Math.min(best.buf,4,spaceForRes(res));
  if(!route(v,best.cell,best.id))return false;
  best.buf-=q;S.inflight[res]+=q;v.cargo={res,q,from:best.id};v.state='toCollect';return true;
}
function helpFamily(v){
  let best=null,bs=1e9;
  for(const h of buildings.values()){
    if(h.type!=='house'||h.state!=='done')continue;
    let tot=0;for(const tp of TYPES)tot+=h.goods[tp];if(tot>=8)continue;
    const d=Math.hypot(h.cell%N-v.cell%N,(h.cell/N|0)-(v.cell/N|0));if(d>120)continue;
    const sc=tot*2+d*0.07;if(sc<bs){bs=sc;best=h;}
  }
  if(!best)return false;
  if(!route(v,best.gc,best.id))return false;
  v.helpH=best.id;v.state='toHelp';return true;
}
function siteReady(st){const c=costRes(st);return st.got.wood>=c.wood&&st.got.stone>=c.stone&&st.got.planks>=(c.planks||0);}
function buildersAt(id){let n=0;for(const v of villagers)if((v.state==='build'||v.state==='toBuild')&&v.target===id)n++;return n;}
function findBuild(v,first){
  // first=true: solo cantieri con materiali completi e ancora senza costruttori (priorità: almeno un costruttore per cantiere pronto)
  for(const st of buildings.values()){
    if(st.state!=='site')continue;
    if(!siteReady(st))continue;
    if(first?buildersAt(st.id)>=1:buildersAt(st.id)>=3)continue;
    if(!route(v,st.cell,st.id))continue;
    v.target=st.id;v.state='toBuild';return true;
  }
  return false;
}
function helpMode(v){
  if(findBuild(v,true))return;if(findHaul(v))return;if(findBuild(v))return;if(tryCollect(v))return;if(helpFamily(v))return;
  v.state='wait';v.timer=4;
}
function plantTarget(b){
  const pr=b.zone?b.zone.r:72,zc=b.zone?b.zone.c:b.cell;let best=-1,bd=pr*pr;const bx=zc%N,by=(zc/N)|0;
  for(let y=Math.max(0,by-pr);y<=Math.min(N-1,by+pr);y++)for(let x=Math.max(0,bx-pr);x<=Math.min(N-1,bx+pr);x++){
    const i=y*N+x;
    if(dist[i]!==4||tree[i]||sap[i]||rock[i]||ore[i]||occ[i]||road[i]||water[i]||field[i]||door[i]||plantResv.has(i)||plev[i]>=2)continue;
    const d=(x-bx)**2+(y-by)**2+hash(x,y)*36;if(d<bd){bd=d;best=i;}
  }
  return best;
}
function blocked(b){
  if(b.type==='farm'){const h=buildings.get(b.owner);return !h||(h.goods.grain>=10&&!(countDone('granary')&&S.stock.grain<capGrain()));}
  if(b.type==='forester')return S.stock.wood>=capRes('wood')*0.9;
  if(b.type==='sheepfold')return b.buf>=BUFCAP;
  const res=RESOF[b.type];
  return b.buf>=BUFCAP||(S.stock[res]>=capRes(res)*0.9&&b.buf>=2);
}
function findResource(arr,b,r,v){
  if(b.zone)r=b.zone.r;const zc=b.zone?b.zone.c:b.cell;
  const bx=zc%N,by=(zc/N)|0;let best=-1,bd=1e9;
  for(let y=Math.max(0,by-r);y<=Math.min(N-1,by+r);y++)for(let x=Math.max(0,bx-r);x<=Math.min(N-1,bx+r);x++){
    const i=y*N+x;if(arr[i]<=0)continue;
    if(arr===tree){const o=resv.get(i);if(o!==undefined&&o!==v.id)continue;}
    const d=(x-bx)**2+(y-by)**2;if(d<bd){bd=d;best=i;}
  }
  return best;
}
function startTransfer(v,b){
  const ctr=[...buildings.values()].find(q=>q.type==='store'&&q.center&&q.state==='done');if(!ctr)return false;
  for(const r of ['wood','stone','iron']){
    if(heldCenter(r)<1||S.wh[r]+S.xf[r]>=capSec(r))continue;
    if(!route(v,ctr.cell,ctr.id))return false;
    S.xf[r]++;v.xr=r;v.state='toCenterT';return true;
  }
  return false;
}

// ---- v32: botteghe e laboratori ----
// Ogni addetto compie cicli di WS[tipo].t secondi dentro l'edificio; il prodotto resta in b.out e lo porta a casa chi ne ha più bisogno.
// A parità di tempo una bottega vera rende molto più di quella di un giardino (fabbro: 3 attrezzi per ferro ogni 10 s contro 1 ogni ~30 s).
const OUTCAP=30,BAND=135,PROD={smithy:'tools',bakery:'bread',weaver:'cloth',tailor:'clothes',fisher:'fish',hunter:'meat'};
// v38: Merceria. Con un merciaio al lavoro, le botteghe portano qui attrezzi, pane, tessuto e abiti (scaffali fino a SHELFCAP per merce) invece di consegnarli alle case; le famiglie
// mandano un adulto a ritirare ciò che manca (commissione 'merc'). Pesce e carne restano consegne dirette. Se la merceria è chiusa o lo scaffale è pieno si consegna alle case come prima.
const MERC=['tools','bread','cloth','clothes'],SHELFCAP=40,MERC_LOT=6,MERC_LOW={tools:1,bread:2,cloth:2,clothes:1};
const merceryOpen=o=>o.type==='mercery'&&o.state==='done'&&o.workers.length>0;
function merceryFor(cell,g){let best=null,bd=1e9;for(const o of buildings.values()){if(!merceryOpen(o))continue;const d=cellDist(o.cell,cell);if(d>BAND||o.shelf[g]>=SHELFCAP)continue;if(d<bd){bd=d;best=o;}}return best;}
function merceryErrand(h){
  if(S.edicts.quarantine)return null;
  let pick=null,bs=0;
  for(const o of buildings.values()){
    if(!merceryOpen(o))continue;
    const d=cellDist(o.cell,h.cell);if(d>BAND)continue;
    for(const g of MERC){
      if(o.shelf[g]<1||h.goods[g]>=MERC_LOW[g])continue;
      const n=needOfGood(h,g);if(n<=0)continue;
      const sc=n*3-d*0.02;if(!pick||sc>bs){bs=sc;pick={b:o,g};}
    }
  }
  return pick;
}
function woolSrc(b){let best=null;for(const o of buildings.values())if(o.type==='sheepfold'&&o.state==='done'&&o.buf>=1&&cellDist(o.cell,b.cell)<BAND&&(!best||o.buf>best.buf))best=o;return best;}
// il sarto prende il tessuto dai telai oppure dagli scaffali della merceria (se è aperta)
function clothSrc(b){let best=null,bn=0;for(const o of buildings.values()){let n=0;if(o.type==='weaver'&&o.state==='done')n=o.out.cloth;else if(merceryOpen(o))n=o.shelf.cloth;if(n>=1&&cellDist(o.cell,b.cell)<BAND&&n>bn){best=o;bn=n;}}return best;}
function planksWanted(){for(const b of buildings.values())if(b.state==='site'){const c=costRes(b);if((c.planks||0)-b.got.planks-b.fly.planks>0)return true;}return false;}
const WS={
  carpenter:{t:6,why:'Serve legno nel magazzino (o il magazzino delle assi è pieno)',can:b=>S.stock.wood>=1&&S.stock.planks<PLANK_CAP&&stockRoom('planks')>=2&&(S.stock.wood>=10||planksWanted()),run:b=>{S.stock.wood--;S.stock.planks=Math.min(PLANK_CAP,S.stock.planks+2);}},
  smithy:{t:10,why:'Serve ferro nel magazzino (miniera) o le scorte di attrezzi sono piene',can:b=>S.stock.iron>=1&&b.out.tools<OUTCAP,run:b=>{S.stock.iron--;b.out.tools+=3;}},
  bakery:{t:8,why:'Serve farina dal mulino o le scorte di pane sono piene',can:b=>S.stock.flour>=1&&b.out.bread<OUTCAP,run:b=>{S.stock.flour--;b.out.bread+=3;}},
  weaver:{t:9,why:'Serve lana: costruisci un ovile con i pastori e una zona di pascolo',can:b=>b.out.cloth<OUTCAP&&!!woolSrc(b),run:b=>{const o=woolSrc(b);if(o){o.buf--;b.out.cloth+=2;}}},
  tailor:{t:10,why:'Serve tessuto: costruisci un telaio del tessitore',can:b=>b.out.clothes<OUTCAP&&!!clothSrc(b),run:b=>{const o=clothSrc(b);if(o){if(o.type==='mercery')o.shelf.cloth--;else o.out.cloth--;b.out.clothes+=2;}}},
  fisher:{t:7,why:'Con il ghiaccio non si pesca (o le scorte di pesce sono piene)',can:b=>!S.frozen&&b.out.fish<OUTCAP,run:b=>{b.out.fish+=2;}},
  hunter:{t:8,why:"D'inverno la selvaggina è scarsa (o le scorte di carne sono piene)",can:b=>b.out.meat<OUTCAP&&(S.season!==3||Math.random()<0.5),run:b=>{b.out.meat+=2;}},
  tavern:{t:12,can:b=>true,run:b=>{}},
  hall:{t:14,can:b=>true,run:b=>{}},
  mercery:{t:10,can:b=>true,run:b=>{}}
};
// quanto serve un bene a una casa (0 = niente)
function needOfGood(h,g){
  const gd=h.goods[g];
  switch(g){
    case 'tools':return Math.max(0,2-gd);
    case 'bread':return Math.max(0,5-gd);
    case 'fish':case 'meat':return Math.max(0,5-gd);
    case 'cloth':return h.tailor?Math.max(0,4-gd):0;
    case 'clothes':return h.level>=3&&!h.tailor?Math.max(0,2-gd):0;
  }
  return 0;
}
function startDeliver(v,b,g){
  if(MERC.includes(g)){
    const m=merceryFor(b.cell,g);
    if(m){
      // la merce si prende prima da quella pronta nella bottega, poi dalla scorta di Magazzino/Granaio (stk = quanta viene dalla scorta)
      const avail=b.out[g]+Math.max(0,Math.floor(S.stock[g]||0));
      const q=Math.min(avail,MERC_LOT,SHELFCAP-m.shelf[g]);
      if(q>=1&&route(v,m.cell,m.id)){const fo=Math.min(q,b.out[g]);b.out[g]-=fo;S.stock[g]-=q-fo;v.cargo={g,q,h:m.id,from:b.id,stk:q-fo};v.carry=g;v.cq=q;v.state='toDeliver';return true;}
      return false;
    }
  }
  let best=null,bs=-1e9;
  for(const h of buildings.values()){
    if(h.type!=='house'||h.state!=='done'||!h.members.length)continue;
    const d=cellDist(h.cell,b.cell);if(d>BAND)continue;
    const n=needOfGood(h,g);if(n<=0)continue;
    const sc=n*3-d*0.02;if(sc>bs){bs=sc;best=h;}
  }
  if(!best)return false;
  // v36: la merce si prende prima da quella pronta nella bottega, poi dalla scorta di Magazzino/Granaio (stk = quanta viene dalla scorta)
  const avail=b.out[g]+Math.max(0,Math.floor(S.stock[g]||0));
  const q=Math.min(avail,3,Math.max(1,Math.ceil(needOfGood(best,g))));
  if(q<1||!route(v,best.cell,best.id))return false;
  const fo=Math.min(q,b.out[g]);b.out[g]-=fo;S.stock[g]-=q-fo;
  v.cargo={g,q,h:best.id,from:b.id,stk:q-fo};v.carry=g;v.cq=q;v.state='toDeliver';return true;
}
// v36: l'eccedenza di una bottega va al Magazzino o al Granaio più vicino che accetta quella merce e ha posto
const STOCKAT=6;
function startStock(v,b,g){
  const room=stockRoom(g);if(room<1)return false;
  let best=null,bd=1e9;
  for(const s of storages()){if(polMax(s,g)<=0)continue;const d=cellDist(s.cell,b.cell);if(d<bd){bd=d;best=s;}}
  if(!best)return false;
  const q=Math.min(b.out[g],4,room);
  if(q<1||!route(v,best.cell,best.id))return false;
  b.out[g]-=q;v.cargo={g,q,s:best.id,from:b.id};v.carry=g;v.cq=q;v.state='toStockG';return true;
}
function startShop(v,b){
  const sp=WS[b.type],g=PROD[b.type];
  v.carry=null;
  if(g&&b.out[g]+S.stock[g]>=2&&startDeliver(v,b,g))return;
  if(g&&b.out[g]>=STOCKAT&&startStock(v,b,g))return;
  if(!sp.can(b)){
    b.why=sp.why||'';
    if(g&&b.out[g]+S.stock[g]>=1&&startDeliver(v,b,g))return;
    helpMode(v);return;
  }
  b.why='';
  if(route(v,b.cell,b.id))v.state='toShop';else{v.state='wait';v.timer=3;}
}
function endShop(v){
  const b=v.job&&buildings.get(v.job),sp=b&&WS[b.type];
  v.inside=false;v.state='idle';
  if(!sp||b.state!=='done')return;
  if(sp.can(b)){sp.run(b);S.made[b.type]=(S.made[b.type]||0)+1;if(b.out)for(const k in b.out)b.out[k]=Math.min(OUTCAP,b.out[k]);}
}
// taverna e sala delle feste: chi vive vicino a un edificio con addetti è più contento
const FUN={tavern:{r:36,joy:4},hall:{r:45,joy:6}};
function funOf(h){
  let f=0;
  for(const b of buildings.values()){const q=FUN[b.type];if(!q||b.state!=='done'||!b.workers.length)continue;if(cellDist(h.cell,b.cell)<=q.r)f+=q.joy;}
  return f;
}
// ---- v37: festa di paese ----
// Si indice cliccando sulla piazza. Per FEST.prep secondi (6 giorni di gioco = una stagione: "un paio di settimane" con la settimana di gioco di 3 giorni) il paese
// raccoglie legno (dal magazzino) e cibo (dalle case che ne hanno in più di KEEP). Poi la festa dura dal dopopranzo alla notte: gli abitanti si radunano attorno
// alla piazza e chi abita entro FEST.r celle è più contento (FEST.joy durante la festa, FEST.glow per FEST.glowT dopo), in proporzione ai preparativi (q = 0..1).
const FEST={prep:6*DAY,need:{wood:8,food:16},joy:12,glow:8,glowT:2*DAY,cool:SEASON_DAYS*2*DAY,r:45,minPop:6,maxExt:3,from:0.54};
let festSeq=0;
const festQ=f=>(Math.min(1,f.have.wood/FEST.need.wood)+Math.min(1,f.have.food/FEST.need.food))/2;
function festSync(){
  const a=[];
  for(const b of buildings.values()){const f=b.fest;if(b.type!=='plaza'||b.state!=='done'||!f||!f.st)continue;
    const on=f.st==='on';if(on||(f.st==='cool'&&S.t<f.glowT))a.push({cell:b.cell,q:f.q,on});}
  S.festA=a;
}
function festJoy(h){
  const a=S.festA;if(!a||!a.length)return 0;let s=0;
  for(const q of a){if(cellDist(h.cell,q.cell)>FEST.r)continue;const j=(q.on?FEST.joy:FEST.glow)*q.q;if(j>s)s=j;}
  return s;
}
function callFest(id){
  const b=buildings.get(id);
  if(!b||b.type!=='plaza'||b.state!=='done')return {ok:false,msg:'La festa si indice dalla piazza.'};
  const f=b.fest;
  if(f&&(f.st==='prep'||f.st==='ready'||f.st==='on'))return {ok:false,msg:'La festa è già in programma.'};
  if(f&&f.st==='cool'&&S.t<f.coolT)return {ok:false,msg:"Il paese ha appena festeggiato: potrai indire un'altra festa tra "+Math.ceil((f.coolT-S.t)/DAY)+' giorni.'};
  if(villagers.length<FEST.minPop)return {ok:false,msg:'Servono almeno '+FEST.minPop+' abitanti per fare festa.'};
  b.fest={st:'prep',seq:++festSeq,t0:S.t,due:S.t+FEST.prep,have:{wood:0,food:0},ext:0,q:0,att:0,warned:false};
  hooks.toast('La festa di paese è indetta: tra '+Math.round(FEST.prep/DAY)+' giorni si farà in piazza. Intanto il paese raccoglie legno e cibo.');
  return {ok:true,b};
}
function cancelFest(id){
  const b=buildings.get(id),f=b&&b.fest;
  if(!f||(f.st!=='prep'&&f.st!=='ready'))return false;
  S.stock.wood+=f.have.wood;b.fest={st:''};festSync();return true;
}
// prende 1 pezzo di cibo da una casa che ne ha più di KEEP (la scorta di famiglia resta)
function festTakeFood(){
  let best=null,bq=KEEP;
  for(const h of buildings.values()){if(h.type!=='house'||h.state!=='done')continue;for(const tp of TYPES)if(h.goods[tp]>bq){bq=h.goods[tp];best=[h,tp];}}
  if(!best)return false;best[0].goods[best[1]]--;return true;
}
function festTick(){
  for(const b of buildings.values()){
    const f=b.fest;if(b.type!=='plaza'||!f||!f.st||b.state!=='done')continue;
    if(f.st==='prep'){
      const k=f.ext>0?1:Math.min(1,((S.t-f.t0)/(f.due-f.t0))/0.9);
      const tw=Math.ceil(FEST.need.wood*k),tf=Math.ceil(FEST.need.food*k);
      let g=0;while(f.have.wood<tw&&g++<4&&uncommitted('wood')>=1&&S.stock.wood>=1){S.stock.wood--;f.have.wood++;}
      g=0;while(f.have.food<tf&&g++<4&&festTakeFood())f.have.food++;
      if(S.t>=f.due){
        if(festQ(f)<0.5&&f.ext<FEST.maxExt){
          f.ext++;f.due=S.t+DAY;
          if(!f.warned){f.warned=true;hooks.toast('I preparativi della festa sono in ritardo: mancano legno o cibo. La festa slitta di qualche giorno.');}
        }else f.st='ready';
      }
    }
    if(f.st==='ready'&&((S.ph==='work'&&S.f>=FEST.from)||S.ph==='evening')){
      f.st='on';f.q=festQ(f);f.att=0;
      hooks.toast(f.q>=0.9?'Comincia la festa di paese! La piazza è addobbata e tutti si radunano.':'Comincia la festa di paese, ma i preparativi sono stati scarsi: sarà una festa modesta.');
    }else if(f.st==='on'&&S.ph==='night'){
      f.st='cool';f.glowT=S.t+FEST.glowT;f.coolT=S.t+FEST.cool;S.fests=(S.fests|0)+1;
      hooks.toast('La festa è finita: '+f.att+' abitanti hanno partecipato. Il paese resterà di buon umore per qualche giorno.');
    }else if(f.st==='cool'&&S.t>=f.coolT)f.st='';
  }
  festSync();
}
// celle libere attorno alla piazza dove si radunano gli abitanti
function festSpot(b){
  for(let k=0;k<10;k++){
    const x=b.x-2+((Math.random()*(b.w+4))|0),y=b.y-2+((Math.random()*(b.h+4))|0);
    if(x<0||y<0||x>=N||y>=N||(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h))continue;
    const i=y*N+x;if(!occ[i]&&!water[i]&&!tree[i]&&!rock[i]&&!ore[i]&&!field[i]&&!sap[i])return i;
  }
  return -1;
}
function goFest(v){
  let best=null,bd=130;
  for(const b of buildings.values()){const f=b.fest;if(b.type!=='plaza'||!f||f.st!=='on'||v.festSeq===f.seq)continue;const d=cellDist(v.cell,b.cell);if(d<bd){bd=d;best=b;}}
  if(!best)return false;
  const c=festSpot(best);
  if(c<0||!route(v,c,0)){v.festCool=S.t+8;return false;}
  v.festB=best.id;v.state='toFest';return true;
}
function startWork(v){
  const b=buildings.get(v.job);
  if(!b||b.state!=='done'){v.job=null;return;}
  if(b.type==='mason'){b.why='';helpMode(v);return;}
  if(WS[b.type]){startShop(v,b);return;}
  if(b.type==='store'){if(findBuild(v,true))return;if(findHaul(v))return;if(findBuild(v))return;if(tryCollect(v))return;if(!b.center&&startTransfer(v,b))return;v.state='wait';v.timer=2.5;return;}
  if(b.type==='school'||b.type==='infirmary'){
    if(v.cell===b.entrance){v.state='wait';v.timer=3;}else if(route(v,b.cell,b.id))v.state='toWork';else{v.state='wait';v.timer=3;}
    return;
  }
  if(b.type==='mill'){
    if(S.stock.grain>=2&&S.stock.flour<=capFlour()-2){
      if(v.cell===b.cell){v.inside=true;v.state='mill';v.timer=6;}
      else if(route(v,b.cell,b.id))v.state='toMill';else{v.state='wait';v.timer=3;}
    }else{v.state='wait';v.timer=3;}
    return;
  }
  if(v.carry){
    if(b.type==='farm'){
      const h=buildings.get(v.home),gr=nearestOf('granary',v.cell,180);
      if(h&&h.goods.grain>=5&&gr&&S.stock.grain<capGrain()&&route(v,gr.cell,gr.id)){v.state='toGranary';return;}
      if(h&&route(v,h.cell,h.id)){v.state='toHomeF';return;}
    }else if(route(v,b.cell,b.id)){v.state='toWork';return;}
    v.carry=null;v.state='wait';v.timer=3;return;
  }
  if(b.type==='inn'){
    if(b.pantry<14){const sp=supplyHouse(v);if(sp){v.sup=sp;v.state='toSupply';return;}}
    helpMode(v);return;
  }
  if(blocked(b)){b.why='Scorte piene: gli addetti aiutano gli altri';helpMode(v);return;}
  b.why='';
  if(b.type==='farm'&&S.season===3&&Math.random()<0.6){v.state='wait';v.timer=4;return;}
  if(b.type==='sheepfold'){
    if(!b.fields.length){b.why='Nessun pascolo libero dentro il recinto: allarga la zona Pascolo intorno all\'ovile';v.state='wait';v.timer=3;return;}
    if(Math.random()<0.2){v.state='wait';v.timer=3;return;}
    const c=b.fields[(Math.random()*b.fields.length)|0];
    if(!route(v,c,0)){v.state='wait';v.timer=3;return;}
    v.target=c;v.state='toGraze';return;
  }
  if(b.type==='farm'){
    let best=-1,bd=1e9;const bx=b.cell%N,by=(b.cell/N)|0;
    for(const i of b.fields){if(field[i]!==b.id)continue;const d=(i%N-bx)**2+((i/N|0)-by)**2+Math.random()*3;if(d<bd){bd=d;best=i;}}
    if(best<0||!route(v,best,0)){v.state='wait';v.timer=3;return;}
    v.target=best;v.state='toField';return;
  }
  if(b.type==='forester'){
    const tg=plantTarget(b);
    if(tg<0){helpMode(v);return;}
    if(!route(v,tg,0)){v.state='wait';v.timer=3;return;}
    v.target=tg;plantResv.add(tg);v.state='toPlant';return;
  }
  const isW=b.type==='wood';
  const target=findResource(isW?tree:b.type==='mine'?ore:rock,b,39,v);
  if(target<0){b.why=isW?'Nessun albero nella zona di lavoro':b.type==='mine'?'Nessun filone di ferro nella zona di lavoro':'Nessuna roccia nella zona di lavoro';v.state='wait';v.timer=3;return;}
  v.target=target;if(isW)resv.set(target,v.id);
  if(!route(v,target,0)){b.why='La risorsa più vicina non è raggiungibile (acqua o ostacoli)';if(isW)resv.delete(target);v.state='wait';v.timer=3;return;}
  v.state=isW?'toTree':'toRock';
}
function supplyHouse(v){
  let best=null,bs=0,btp=null;
  for(const h of buildings.values()){
    if(h.type!=='house'||h.state!=='done')continue;
    if(Math.hypot(h.cell%N-v.cell%N,(h.cell/N|0)-(v.cell/N|0))>135)continue;
    for(const tp of TYPES){const sur=h.goods[tp]-KEEP-1;if(sur>bs){bs=sur;best=h;btp=tp;}}
  }
  if(!best||!route(v,best.cell,best.id))return null;
  return {h:best.id,tp:btp,q:Math.min(3,bs)};
}
function inHouse(h,cell){const x=cell%N,y=(cell/N)|0;return x>=h.hx&&x<h.hx+h.hw&&y>=h.hy&&y<h.hy+h.hh;}
function startGarden(v){
  const h=buildings.get(v.home);if(!h||h.state!=='done')return;
  const tgt=inHouse(h,v.cell)?h.gc:h.cell;
  if(route(v,tgt,h.id))v.state='toGarden';
}
// ---- commissioni delle famiglie: legna, caccia, pesca, ferro, farina ----
function shoreTarget(cell,maxd){
  const cx=cell%N,cy=(cell/N)|0;let best=-1,bd=maxd*maxd;
  for(let y=Math.max(1,cy-maxd);y<=Math.min(N-2,cy+maxd);y++)for(let x=Math.max(1,cx-maxd);x<=Math.min(N-2,cx+maxd);x++){
    const i=y*N+x;if(water[i]||occ[i]||tree[i]||rock[i]||ore[i])continue;
    let adj=false;for(let k=0;k<4;k++)if(water[(y+DY[k])*N+x+DX[k]]===1){adj=true;break;}
    if(!adj)continue;const d=(x-cx)**2+(y-cy)**2;if(d<bd){bd=d;best=i;}
  }
  return best;
}
function treeTarget(cell,maxd,deep){
  const cx=cell%N,cy=(cell/N)|0;let best=-1,bd=maxd*maxd;
  for(let y=Math.max(0,cy-maxd);y<=Math.min(N-1,cy+maxd);y++)for(let x=Math.max(0,cx-maxd);x<=Math.min(N-1,cx+maxd);x++){
    const i=y*N+x;if(!tree[i])continue;
    if(deep&&countNear(tree,x,y,4)<5)continue;
    const d=(x-cx)**2+(y-cy)**2+hash(x,y)*45;if(d<bd){bd=d;best=i;}
  }
  return best;
}
const NOISY={wood:1,quarry:1,mine:1};
function quietSpot(x,y,r){for(const b of buildings.values())if(NOISY[b.type]&&Math.hypot(b.x-x,b.y-y)<=r)return false;return true;}
function huntOK(x,y){return countNear(tree,x,y,15)>=16&&quietSpot(x,y,36);}
function fishOK(x,y){return countNear(water,x,y,18,1)>=27;}
function startErrand(v,h){
  let kind=null,tgt=-1,tocc=0,src=0,mg=null;
  if(h.craft&&h.goods.iron<1&&S.stock.iron>0){const st=nearestStore(v.cell);if(st){kind='iron';tgt=st.cell;tocc=st.id;}}
  if(!kind&&h.bake&&h.goods.flour<1&&S.stock.flour>0){const m=nearestOf('mill',v.cell,240);if(m){kind='flour';tgt=m.cell;tocc=m.id;}}
  if(!kind&&h.weave&&h.goods.wool<1){let ov=null;for(const o of buildings.values())if(o.type==='sheepfold'&&o.state==='done'&&o.buf>=1&&(!ov||o.buf>ov.buf))ov=o;if(ov){kind='wool';tgt=ov.cell;tocc=ov.id;src=ov.id;}}
  if(!kind&&h.tailor&&h.goods.cloth<1){for(const o of buildings.values())if(o.type==='house'&&o!==h&&o.state==='done'&&o.weave&&o.goods.cloth>=2&&Math.hypot(o.cell%N-h.cell%N,(o.cell/N|0)-(h.cell/N|0))<135){kind='cloth';tgt=o.cell;tocc=o.id;src=o.id;break;}}
  if(!kind){const mc=merceryErrand(h);if(mc){kind='merc';tgt=mc.b.cell;tocc=mc.b.id;src=mc.b.id;mg=mc.g;}}
  // v23: la legna da ardere non si raccoglie più con una commissione: la produce il giardino delle case con la coltura 'wood' (vedi la produzione dei giardini). Qui restano solo pesca e caccia.
  if(!kind&&Math.random()<0.3){
    if(h.side==='fish'&&h.goods.fish<8&&!S.frozen&&fishOK(h.hx,h.hy)){tgt=shoreTarget(h.cell,66);if(tgt>=0)kind='fish';}
    else if(h.side==='hunt'&&h.goods.meat<8&&huntOK(h.hx,h.hy)){tgt=treeTarget(h.cell,48,true);if(tgt>=0)kind='hunt';}
  }
  if(!kind||!route(v,tgt,tocc))return false;
  v.err={kind,q:0,src,g:mg};v.state='toErr';return true;
}
// ---- vita quotidiana ----
function eatOne(b,v){
  let pick=null,old=1e9;
  for(const tp of TYPES)if(b.goods[tp]>0&&b.ate[tp]<old){old=b.ate[tp];pick=tp;}
  if(pick){if(!(v&&v.schooled&&Math.random()<EDU_SAVE))b.goods[pick]--;b.ate[pick]=S.t;b.hungry=Math.max(0,b.hungry-15);}
  else b.hungry=Math.min(300,b.hungry+30);
}
function goHome(v,kind){
  const h=buildings.get(v.home);if(!h||h.state!=='done')return false;
  v.next=kind;
  if(inHouse(h,v.cell)){arriveHome(v,h);return true;}
  if(!route(v,h.cell,h.id))return false;
  v.state='toHomeLife';return true;
}
function arriveHome(v,h){
  v.inside=true;v.carry=null;v.path=[];v.moving=false;
  if(v.next==='eat'){eatOne(h,v);v.ate=true;v.state='eat';v.timer=5;}
  else{v.state='sleep';v.sleepPh=S.ph;}
}
function goTo(v,type,h,state){
  const t=nearestOf(type,h.cell,105);if(!t)return false;
  if(!route(v,t.cell,t.id))return false;v.state=state;return true;
}
function goHomeAfter(v){
  const h=buildings.get(v.home);v.next='sleep';
  if(h&&route(v,h.cell,h.id))v.state='toHomeLife';else{v.carry=null;v.state='idle';}
}
// lezioni: al mattino; con la scuola obbligatoria anche al pomeriggio
const inClass=()=>S.ph==='work'&&(S.f<0.42||(S.edicts.schoolMandatory&&S.f<DUSK));
function schoolFor(v){let best=null,bd=1e9;for(const b of buildings.values()){if(b.type!=='school'||b.state!=='done'||!b.workers.length||(b.pupils|0)>=SCHOOL_CAP)continue;const d=Math.hypot(b.cell%N-v.cell%N,(b.cell/N|0)-(v.cell/N|0));if(d<bd){bd=d;best=b;}}return best;}
function decide(v){
  const h=v.home&&buildings.get(v.home),ph=S.ph,dusk=ph==='work'&&S.f>=DUSK&&!!h;
  // i malati restano a letto
  if(v.ill){
    if(h&&h.state==='done'&&goHome(v,ph==='meal'&&!v.ate?'eat':'sleep'))return;
    v.state='wait';v.timer=3;return;
  }
  // v37: durante la festa di paese tutti vanno in piazza (una volta a festa)
  if(ph!=='night'&&(v.festCool||0)<=S.t&&S.festA&&S.festA.some(q=>q.on)&&goFest(v))return;
  if(ph!=='work'||dusk){
    // al calare della sera tutti si avvicinano a casa; pasto, sera e notte si passano lì
    if(!h||h.state!=='done'){
      if(ph==='night'){const st=nearestStore(v.cell);if(st&&route(v,st.cell,st.id)){v.state='toStoreSleep';return;}}
      v.state='wait';v.timer=3;return;
    }
    if(ph==='meal'){if(!v.ate&&goHome(v,'eat'))return;}
    else if(ph==='evening'||dusk){
      if(h.level>=3&&!v.drew&&goTo(v,'well',h,'toWell'))return;
      if(h.level>=2&&!v.prayed&&goTo(v,'church',h,'toChurch'))return;
      if(goHome(v,'sleep'))return;
    }else if(ph==='night'){if(goHome(v,'sleep'))return;}
    v.state='wait';v.timer=3;return;
  }
  if(v.child){
    if(v.cool<=0){v.cool=1.5+Math.random()*2;
      const sc=schoolFor(v);
      if(sc&&v.age>=6&&inClass()&&!v.sd&&route(v,sc.cell,sc.id)){v.sch=sc.id;sc.pupils=(sc.pupils|0)+1;v.state='toSchool';return;}
      if(v.home&&Math.random()<0.5&&!(S.edicts.schoolMandatory&&v.age>=6&&sc))startGarden(v);
    }
    return;
  }
  if(v.job){startWork(v);return;}
  if(v.cool<=0){
    v.cool=1+Math.random()*1.2;
    if(!v.duty&&(findBuild(v,true)||findHaul(v)||findBuild(v)))return;
    if(h&&h.state==='done'&&startErrand(v,h))return;
    if(v.home&&Math.random()<(v.duty?0.85:0.35))startGarden(v);
  }
}
function onArrive(v){
  switch(v.state){
    case 'toCenterT':{const b=v.job&&buildings.get(v.job);v.carry=v.xr;if(b&&route(v,b.cell,b.id))v.state='toWhT';else{S.xf[v.xr]=Math.max(0,S.xf[v.xr]-1);v.xr=null;v.carry=null;v.state='idle';}break;}
    case 'toWhT':{if(v.xr){S.xf[v.xr]=Math.max(0,S.xf[v.xr]-1);S.wh[v.xr]=Math.min(S.stock[v.xr],S.wh[v.xr]+1);}v.xr=null;v.carry=null;v.state='idle';break;}
    case 'toSchool':v.inside=true;v.state='learn';break;
    case 'toTree':v.state='chop';v.timer=2.4;break;
    case 'toRock':v.state='mine';v.timer=3.0;break;
    case 'toField':v.state='till';v.timer=5;break;
    case 'toBuild':v.state='build';break;
    case 'toGraze':v.state='graze';v.timer=6;break;
    case 'toStoreSleep':v.inside=true;v.state='sleep';v.sleepPh=S.ph;break;
    case 'toSupply':{
      const sp=v.sup,hh=sp&&buildings.get(sp.h),inn=v.job&&buildings.get(v.job);
      const take=hh?Math.min(sp.q,hh.goods[sp.tp]-KEEP):0;
      if(take<=0||!inn||inn.type!=='inn'){v.sup=null;v.state='idle';break;}
      hh.goods[sp.tp]-=take;v.carry=sp.tp;v.cq=take;
      if(route(v,inn.cell,inn.id))v.state='toInnSup';else{hh.goods[sp.tp]+=take;v.carry=null;v.state='idle';}
      break;}
    case 'toInnSup':{const inn=v.job&&buildings.get(v.job);if(inn&&inn.type==='inn')inn.pantry=Math.min(20,inn.pantry+(v.cq||1));v.carry=null;v.sup=null;v.state='idle';break;}
    case 'toPlant':v.state='plant';v.timer=3;break;
    case 'toMill':v.inside=true;v.state='mill';v.timer=6;break;
    case 'toShop':{const sb=v.job&&buildings.get(v.job),sp=sb&&WS[sb.type];if(!sp){v.state='idle';break;}v.inside=true;v.state='shop';v.timer=sp.t;break;}
    case 'toDeliver':{
      const c=v.cargo,h=c&&buildings.get(c.h);
      if(c&&h&&h.type==='mercery'){h.shelf[c.g]=Math.min(SHELFCAP,h.shelf[c.g]+c.q);S.stocked=(S.stocked|0)+c.q;}
      else if(c&&h)h.goods[c.g]=Math.min(12,h.goods[c.g]+c.q);
      else if(c){const fb=buildings.get(c.from);if(fb&&fb.out)fb.out[c.g]+=c.q-(c.stk|0);S.stock[c.g]+=c.stk|0;}
      if(c)S.delivered=(S.delivered|0)+c.q;
      v.cargo=null;v.carry=null;v.state='idle';break;}
    case 'toGarden':v.state='tend';v.timer=3+Math.random()*3;break;
    case 'toWell':v.state='draw';v.timer=4;break;
    case 'toChurch':v.state='pray';v.timer=6;break;
    case 'toFest':{const fb=buildings.get(v.festB),f=fb&&fb.fest;if(f&&f.st==='on'){v.festSeq=f.seq;f.att++;v.state='fest';v.timer=20+Math.random()*30;v.moving=false;}else v.state='idle';break;}
    case 'toHelp':v.state='helpTend';v.timer=5;break;
    case 'toGranary':S.stock.grain+=Math.min(v.cq||1,stockRoom('grain'));v.carry=null;v.state='idle';break;
    case 'toStockG':{const c=v.cargo;
      if(c){const room=Math.min(c.q,stockRoom(c.g));S.stock[c.g]+=room;const fb=buildings.get(c.from);if(c.q>room&&fb&&fb.out)fb.out[c.g]+=c.q-room;}
      v.cargo=null;v.carry=null;v.state='idle';break;}
    case 'toWork':{const b=buildings.get(v.job)||null;if(b&&b.buf!==undefined)b.buf=Math.min(BUFCAP+2,b.buf+1);v.carry=null;v.state='idle';break;}
    case 'toHomeF':{const h=buildings.get(v.home);if(h)h.goods.grain=Math.min(12,h.goods.grain+(v.cq||1));v.carry=null;v.state='idle';break;}
    case 'toHomeLife':{const h=buildings.get(v.home);if(h)arriveHome(v,h);else{v.carry=null;v.state='idle';}break;}
    case 'toErr':{
      const h=buildings.get(v.home);if(!h){v.state='idle';break;}
      const k=v.err.kind;
      if(k==='merc'){
        const so=buildings.get(v.err.src),g=v.err.g;
        if(!so||!so.shelf||!g){v.err=null;v.state='idle';break;}
        const n=needOfGood(h,g),q=Math.min(3,so.shelf[g]|0,Math.ceil(n));
        if(n<=0||q<=0){v.err=null;v.state='idle';break;}
        so.shelf[g]-=q;v.carry=g;v.cq=q;
        if(route(v,h.cell,h.id))v.state='toHomeErr';else{so.shelf[g]+=q;v.carry=null;v.err=null;v.state='idle';}
      }else if(k==='wool'||k==='cloth'){
        const so=buildings.get(v.err.src);if(!so){v.state='idle';break;}
        let q=0;
        if(k==='wool'){q=Math.min(3,so.buf|0);so.buf-=q;}else{q=Math.min(2,so.goods.cloth-1);if(q>0)so.goods.cloth-=q;}
        if(q<=0){v.state='idle';break;}
        v.carry=k==='wool'?'wool':'cloth';v.cq=q;
        if(route(v,h.cell,h.id))v.state='toHomeErr';else{if(k==='wool')so.buf+=q;else so.goods.cloth+=q;v.carry=null;v.state='idle';}
      }else if(k==='iron'||k==='flour'){
        const q=Math.min(3,Math.floor(S.stock[k]));
        if(q<=0){v.state='idle';break;}
        S.stock[k]-=q;v.carry=k;v.cq=q;
        if(route(v,h.cell,h.id))v.state='toHomeErr';else{S.stock[k]+=q;v.carry=null;v.state='idle';}
      }else{v.state='doErr';v.timer=k==='wood'?4:6;}
      break;}
    case 'toHomeErr':{
      const h=buildings.get(v.home);
      if(h&&v.err){const key=v.err.kind==='merc'?v.err.g:ERRKEY[v.err.kind],cp=key==='firewood'?fuelCap():12;h.goods[key]=Math.min(cp,h.goods[key]+(v.cq||1));if(v.err.kind==='merc')S.fetched=(S.fetched|0)+(v.cq||1);}
      v.carry=null;v.err=null;v.state='idle';break;}
    case 'toCollect':{
      const c=v.cargo,st=nearestStore(v.cell);v.carry=c.res;v.cq=c.q;
      if(st&&route(v,st.cell,st.id))v.state='toStoreC';
      else{const p=buildings.get(c.from);if(p)p.buf+=c.q;S.inflight[c.res]-=c.q;v.carry=null;v.cargo=null;v.state='idle';}
      break;}
    case 'toStoreC':{const c=v.cargo;if(c){S.stock[c.res]+=Math.min(c.q,stockRoom(c.res));S.inflight[c.res]-=c.q;}v.carry=null;v.cargo=null;v.state='idle';break;}
    case 'toStall':{const st=buildings.get(v.stall);if(!st){v.state='idle';v.stall=null;break;}st.open=true;v.state='keep';v.timer=150;tell('stall','Una famiglia ha aperto un banco al mercato.');break;}
    case 'toMarket':{
      const c=v.cargo,o=buildings.get(c.owner),h=buildings.get(v.home);
      if(o)o.goods[c.s]=Math.min(12,o.goods[c.s]+c.q);else if(h)h.goods[c.s]+=c.q;
      v.carry=c.t==='firewood'?'wood':c.t==='tools'?'iron':c.t;
      if(h&&route(v,h.cell,h.id))v.state='toHomeT';
      else{if(h)h.goods[c.t]+=c.q;S.barters++;v.cargo=null;v.carry=null;v.state='idle';}
      break;}
    case 'toHomeT':{
      const c=v.cargo,h=buildings.get(v.home);
      if(c){if(h)h.goods[c.t]=Math.min(12,h.goods[c.t]+c.q);S.barters++;tell('barter','Primo baratto: due famiglie si sono scambiate i prodotti dei loro giardini.');}
      v.cargo=null;v.carry=null;v.state='idle';break;}
    case 'toStore':{
      const task=v.task,s=task&&buildings.get(task.site);
      if(!s||s.state!=='site'){if(task)S.stock[task.res]++;v.task=null;v.state='idle';break;}
      v.carry=task.res;
      if(route(v,s.cell,s.id))v.state='toSite';
      else{S.stock[task.res]++;s.fly[task.res]--;v.carry=null;v.task=null;v.state='idle';v.cool=2;}
      break;}
    case 'toSite':{
      const task=v.task,s=task&&buildings.get(task.site);
      if(s&&s.state==='site'){s.got[task.res]++;s.fly[task.res]--;}else if(task)S.stock[task.res]++;
      v.carry=null;v.task=null;v.state='idle';break;}
  }
}
function endGather(v){
  const b=buildings.get(v.job);
  if(v.state==='till'){
    if(!b){v.job=null;v.state='idle';return;}
    v.carry='grain';v.cq=1;const h=buildings.get(v.home),gr=nearestOf('granary',v.cell,180);
    if(h&&h.goods.grain>=5&&gr&&S.stock.grain<capGrain()&&route(v,gr.cell,gr.id)){v.state='toGranary';return;}
    if(h&&route(v,h.cell,h.id))v.state='toHomeF';else{v.carry=null;v.state='wait';v.timer=3;}
    return;
  }
  if(v.state==='chop'){if(tree[v.target]){tree[v.target]=0;hooks.trees();}resv.delete(v.target);v.carry='wood';}
  else if(b&&b.type==='mine'){if(ore[v.target]>0){ore[v.target]--;hooks.rocks();}v.carry='iron';}
  else{if(rock[v.target]>0){rock[v.target]--;hooks.rocks();}v.carry='stone';}
  if(!b){v.job=null;v.carry=null;v.state='idle';return;}
  if(route(v,b.cell,b.id))v.state='toWork';else{v.carry=null;v.state='wait';v.timer=3;}
}
function closeStall(v){
  const st=buildings.get(v.stall),h=buildings.get(v.home);
  if(st){st.open=false;st.keeper=null;}
  v.stall=null;v.cargo=null;
  if(h&&route(v,h.cell,h.id))v.state='toHomeT';else v.state='idle';
}
function abortTask(v){
  const h=v.home&&buildings.get(v.home);
  switch(v.state){
    case 'toMarket':dropMarket(v);break;
    case 'toHomeT':{const c=v.cargo;if(c&&h){h.goods[c.t]=Math.min(12,h.goods[c.t]+c.q);S.barters++;}break;}
    case 'toCollect':{const c=v.cargo;if(c){const p=buildings.get(c.from);if(p)p.buf+=c.q;S.inflight[c.res]-=c.q;}break;}
    case 'toStoreC':{const c=v.cargo;if(c){S.stock[c.res]+=Math.min(c.q,stockRoom(c.res));S.inflight[c.res]-=c.q;}break;}
    case 'toStore':{const t=v.task;if(t){const st=buildings.get(t.site);S.stock[t.res]++;if(st&&st.fly[t.res]>0)st.fly[t.res]--;}break;}
    case 'toSite':{const t=v.task,st=t&&buildings.get(t.site);if(st&&st.state==='site'){st.got[t.res]++;st.fly[t.res]--;}else if(t)S.stock[t.res]++;break;}
    case 'toHomeErr':{if(h&&v.err){const key=v.err.kind==='merc'?v.err.g:ERRKEY[v.err.kind],cp=key==='firewood'?fuelCap():12;h.goods[key]=Math.min(cp,h.goods[key]+(v.cq||1));}break;}
    case 'toHomeF':{if(h)h.goods.grain=Math.min(12,h.goods.grain+(v.cq||1));break;}
    case 'toGranary':S.stock.grain+=Math.min(v.cq||1,stockRoom('grain'));break;
    case 'toStockG':{const c=v.cargo;if(c){const fb=buildings.get(c.from);if(fb&&fb.out)fb.out[c.g]+=c.q;}break;}
    case 'toWork':{const b=v.job&&buildings.get(v.job);if(b&&b.buf!==undefined)b.buf=Math.min(BUFCAP+2,b.buf+1);break;}
    case 'toInnSup':{const b=v.job&&buildings.get(v.job);if(b&&b.type==='inn')b.pantry=Math.min(20,b.pantry+(v.cq||1));break;}
    case 'toSupply':break;
    case 'toDeliver':{const c=v.cargo;if(c){const fb=buildings.get(c.from);if(fb&&fb.out)fb.out[c.g]+=c.q-(c.stk|0);S.stock[c.g]+=c.stk|0;}break;}
    case 'shop':v.inside=false;break;
    case 'toCenterT':case 'toWhT':if(v.xr){S.xf[v.xr]=Math.max(0,S.xf[v.xr]-1);v.xr=null;}break;
    case 'toTree':case 'chop':resv.delete(v.target);break;
    case 'toPlant':case 'plant':plantResv.delete(v.target);break;
    case 'toStall':case 'keep':{const st=buildings.get(v.stall);if(st){st.open=false;st.keeper=null;}v.stall=null;break;}
  }
  v.carry=null;v.cargo=null;v.err=null;v.task=null;v.sup=null;v.path=[];v.moving=false;v.state='idle';
}
const NIGHTOK=new Set(['toHomeLife','sleep','toStoreSleep','idle','wait']);
function updV(v,dt){
  if(S.ph==='night'&&v.home&&!v.inside&&!NIGHTOK.has(v.state))abortTask(v);
  if(v.day!==S.day){v.day=S.day;v.ate=false;v.drew=false;v.prayed=false;v.sd=false;}
  v.cool=Math.max(0,v.cool-dt);
  switch(v.state){
    case 'idle':v.moving=false;decide(v);break;
    case 'toSchool':case 'toCenterT':case 'toWhT':case 'toStore':case 'toSite':case 'toTree':case 'toRock':case 'toWork':case 'toField':case 'toHomeF':case 'toGarden':case 'toStall':case 'toMarket':case 'toHomeT':
    case 'toHomeLife':case 'toWell':case 'toChurch':case 'toHelp':case 'toCollect':case 'toStoreC':case 'toErr':case 'toHomeErr':case 'toPlant':case 'toMill':case 'toShop':case 'toDeliver':case 'toStockG':case 'toGranary':case 'toGraze':case 'toBuild':case 'toStoreSleep':case 'toSupply':case 'toInnSup':case 'toFest':
      if(moveV(v,dt))onArrive(v);break;
    case 'fest':{v.moving=false;v.timer-=dt;const fb=buildings.get(v.festB);if(v.timer<=0||!fb||!fb.fest||fb.fest.st!=='on')v.state='idle';break;}
    case 'chop':case 'mine':case 'till':
      v.timer-=dt*workRate(v);if(v.timer<=0)endGather(v);break;
    case 'build':{v.moving=false;const bb=buildings.get(v.target);if(!bb||bb.state!=='site'||S.ph!=='work'||(S.f>=DUSK&&v.home))v.state='idle';break;}
    case 'graze':v.timer-=dt*workRate(v);if(v.timer<=0){const b=buildings.get(v.job);if(b&&b.buf!==undefined)b.buf=Math.min(BUFCAP+2,b.buf+2);v.state='idle';}break;
    case 'plant':v.timer-=dt*workRate(v);if(v.timer<=0){const i=v.target;if(!tree[i]&&!sap[i]&&!occ[i]){sap[i]=1;sapT[i]=0;hooks.saps();}plantResv.delete(i);v.state='idle';}break;
    case 'shop':v.timer-=dt*workRate(v);if(v.timer<=0)endShop(v);break;
    case 'mill':v.timer-=dt*workRate(v);if(v.timer<=0){if(S.stock.grain>=2){S.stock.grain-=2;S.stock.flour=Math.min(capFlour(),S.stock.flour+2);}v.inside=false;v.state='idle';}break;
    case 'doErr':v.timer-=dt;if(v.timer<=0){
      const h=buildings.get(v.home),k=v.err&&v.err.kind;
      v.carry=k==='fish'?'fish':k==='hunt'?'meat':'wood';v.cq=k==='fish'?2:1;
      if(h&&route(v,h.cell,h.id))v.state='toHomeErr';else{v.carry=null;v.err=null;v.state='idle';}
    }break;
    case 'tend':
      v.moving=false;v.timer-=dt;if(v.timer<=0)v.state='idle';break;
    case 'learn':{v.moving=false;const sc=v.sch&&buildings.get(v.sch);{const tc=sc&&sc.workers.length?vmap.get(sc.workers[0]):null;v.edu+=dt*(S.edicts.schoolMandatory?1.6:1)*(1+SK_WORK*(tc?skLevel(tc,'school'):0));}if(!inClass()||!sc||sc.state!=='done'||!sc.workers.length){v.inside=false;v.sd=!(S.edicts.schoolMandatory&&S.ph==='meal');v.sch=null;v.state='idle';}break;}
    case 'draw':v.timer-=dt;if(v.timer<=0){v.drew=true;v.carry='water';goHomeAfter(v);}break;
    case 'pray':v.timer-=dt;if(v.timer<=0){v.prayed=true;v.prayT=S.t;goHomeAfter(v);}break;
    case 'helpTend':v.timer-=dt;if(v.timer<=0){const h=buildings.get(v.helpH);if(h){const k=gardenGood(h.crop);h.goods[k]=Math.min(gardenCap(h.crop),h.goods[k]+2);S.helps++;}v.state='idle';}break;
    case 'eat':v.timer-=dt;if(v.timer<=0){v.inside=false;v.state='idle';}break;
    case 'sleep':if(S.ph!==v.sleepPh){v.inside=false;v.state='idle';}break;
    case 'keep':{
      v.moving=false;v.timer-=dt;
      const st=buildings.get(v.stall),h=buildings.get(v.home);
      if(!st||!h||v.timer<=0||S.ph!=='work'||S.f>=DUSK||S.edicts.quarantine||!TRADE.some(tp=>h.goods[tp]>=KEEP+1))closeStall(v);
      break;}
    case 'wait':
      v.moving=false;v.timer-=dt;if(v.timer<=0)v.state='idle';break;
  }
}

// ---- economia, famiglie, mercato ----
function setJob(v,b){
  v.job=b.id;
  if(v.trade!==b.type){v.trade=b.type;v.inh=false;logV(v,'Inizia a lavorare come '+TRADENAME[b.type]+'.');}
}
function assignJobs(){
  const all=[...buildings.values()].filter(b=>b.state==='done'&&BT[b.type].slots>0);
  const order=all.filter(b=>b.type==='store').concat(all.filter(b=>b.type!=='store'));
  let free=villagers.filter(v=>!v.job&&!v.duty&&!v.child&&!v.ill);
  const reserve=0;
  const wantOf=b=>(b.type==='store'&&b.center&&villagers.length<9)?Math.min(b.want,Math.max(1,Math.floor(villagers.length/3))):b.want;
  for(const b of order){const wn=wantOf(b);while(b.workers.length>wn){const id=b.workers.pop();release(id);}}
  // un addetto per edificio alla volta, cosi' con pochi abitanti nessun mestiere resta scoperto
  for(let pass=1;pass<=3;pass++)for(const b of order){
    const isStore=b.type==='store',wn=Math.min(wantOf(b),pass);
    while(b.workers.length<wn&&(isStore||free.length>reserve)){
      const cand=free.filter(v=>(v.state==='idle'||v.state==='sleep'||v.state==='eat'||v.state==='wait')&&!v.carry);if(!cand.length)break;
      // chi ha già il mestiere (o lo ha ereditato dalla famiglia) ha la precedenza
      let best=null,bd=1e9;for(const v of cand){const d=(v.x-cx2w(b.cell%N))**2+(v.z-cy2w((b.cell/N)|0))**2-(v.trade===b.type?1500:0)-skLevel(v,b.type)*1500+(v.trade&&v.trade!==b.type?skLevel(v,v.trade)*1200:0);if(d<bd){bd=d;best=v;}}
      setJob(best,b);b.workers.push(best.id);free=free.filter(v=>v!==best);
    }
  }
  for(const b of order){
    if(b.workers.length>0||wantOf(b)<1||free.length>0)continue;
    let donor=null;for(const d of order)if(d!==b&&d.type!=='store'&&d.workers.length>=2&&(!donor||d.workers.length>donor.workers.length))donor=d;
    if(!donor)break;
    const id=donor.workers.pop();release(id);const v=vmap.get(id);if(v){setJob(v,b);b.workers.push(id);}
  }
  for(const b of buildings.values())if(b.workers.length){b.workers=b.workers.filter(id=>{const v=vmap.get(id);return v&&v.job===b.id;});}
}
const cellFree=(i,dt)=>cen[i]!==2&&!occ[i]&&!tree[i]&&!rock[i]&&!ore[i]&&!road[i]&&!field[i]&&!door[i]&&!water[i]&&!sap[i]&&plev[i]<2&&dist[i]===dt;
const GX=[1,-1,0,0],GY=[0,0,1,-1];
const doorFree=i=>!(occ[i]||tree[i]||rock[i]||ore[i]||field[i]||door[i]||water[i]||sap[i]||cen[i]===2);
// v44: tra due lotti resta sempre almeno una cella libera (passaggio per gli abitanti)
function foreignNear(i,id){const x=i%N,y=(i/N)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const o=occ[ny*N+nx];if(o>0&&o!==id)return true;}return false;}
const GMAX=24; // il giardino di base arriva al massimo a 24 celle; fino alla strada può arrivare a ROADMAX
const ROADMAX=36;
// v32: forme organiche dei lotti. La casa è un rettangolo hw×hh in (0,0); il giardino è un insieme di celle "dietro" (y>=hh), ai lati o intorno.
// Poi tutto viene specchiato/ruotato a caso e riportato nel riquadro minimo. Ritorna anche le celle libere attorno al lotto (candidati ingresso).
const SHAPE_NAME={organic:'organica (segue gli spazi tra i sentieri)',rect:'a lato',L:'a L',U:'a ferro di cavallo',ring:'intorno alla casa',tri:'triangolare'};
function lotShape(hw,hh,r){
  const kr=r(0),want=kr<.1?'rect':kr<.34?'L':kr<.54?'U':kr<.66?'ring':'tri';
  const build=(kind,v)=>{
    const g=[],add=(x0,y0,w,h)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)g.push([x,y]);};
    if(kind==='rect'){const gw=3+(v&1),gh=3+((v>>1)&1);add((hw-gw)>>1,hh,gw,gh);}
    else if(kind==='L'){const ts=1+(v&1),tb=3-((v>>1)&1);add(0,hh,hw+ts,tb);add(hw,0,ts,hh);}
    else if(kind==='U'){const tb=2+(v&1);add(-1,hh,hw+2,tb);add(-1,0,1,hh);add(hw,0,1,hh);}
    else if(kind==='ring'){const tb=1+(v&1);add(-1,-1,hw+2,1);add(-1,hh,hw+2,tb);add(-1,0,1,hh);add(hw,0,1,hh);}
    else{const bs=5+(v&1);for(let i=0;i<bs;i++)add(0,hh+i,bs-i,1);g.diag=[bs,hh,0,hh+bs];}
    return g;
  };
  const ok=g=>g.length>=9&&g.length<=GMAX;
  let kind=want,g=null;const v0=(r(1)*4)|0;
  for(const k of [want,want==='ring'?'U':want,'L','rect']){for(let t=0;t<4&&!g;t++){const c=build(k,(v0+t)&3);if(ok(c)){g=c;kind=k;}}if(g)break;}
  if(!g){g=build('rect',0);kind='rect';}
  // trasformazione: specchio + rotazione
  const mir=r(2)<.5,rot=(r(3)*4)|0;
  const tf=([x,y])=>{if(mir)x=-x;for(let k=0;k<rot;k++){const t=x;x=-y;y=t;}return [x,y];};
  const hc=[];for(let y=0;y<hh;y++)for(let x=0;x<hw;x++)hc.push(tf([x,y]));
  const gt=g.map(tf);
  // v35.1: nel triangolo il bordo è un taglio diagonale della griglia (angoli di cella: specchio X→1-X, rotazione (X,Y)→(1-Y,X))
  let dg=null;if(g.diag){const tc=([X,Y])=>{if(mir)X=1-X;for(let k=0;k<rot;k++){const t=X;X=1-Y;Y=t;}return [X,Y];};dg=[tc([g.diag[0],g.diag[1]]),tc([g.diag[2],g.diag[3]])];}
  const all=hc.concat(gt),mx=Math.min(...all.map(c=>c[0])),my=Math.min(...all.map(c=>c[1]));
  const H=hc.map(c=>[c[0]-mx,c[1]-my]),G=gt.map(c=>[c[0]-mx,c[1]-my]);
  const hx=Math.min(...H.map(c=>c[0])),hy=Math.min(...H.map(c=>c[1]));
  const set=new Set(H.concat(G).map(c=>c[0]+','+c[1])),hset=new Set(H.map(c=>c[0]+','+c[1]));
  const dc=[],seen=new Set();
  for(const [x,y] of H.concat(G))for(let k=0;k<4;k++){const nx=x+GX[k],ny=y+GY[k],key=nx+','+ny;if(set.has(key)||seen.has(key))continue;seen.add(key);dc.push({x:nx,y:ny,house:hset.has(x+','+y)});}
  if(dg)dg=[dg[0][0]-mx,dg[0][1]-my,dg[1][0]-mx,dg[1][1]-my];
  return {kind,diag:dg,hx,hy,hw:Math.max(...H.map(c=>c[0]))-hx+1,hh:Math.max(...H.map(c=>c[1]))-hy+1,g:G,w:Math.max(...all.map(c=>c[0]))-mx+1,h:Math.max(...all.map(c=>c[1]))-my+1,dc};
}
function expandGarden(b){
  // il giardino si allarga dalle sue celle di bordo (non da quelle verso la casa) fino alla strada/sentiero (meno di 3 tile = 9 celle) o al giardino di un vicino:
  // con una strada diagonale il bordo segue la diagonale. Dalla v32 funziona su giardini di forma qualsiasi e non supera 24 celle in tutto.
  const room=ROADMAX-b.gcells.length-b.ext.length;if(room<=0)return false;
  const G=b.gcells.concat(b.ext),lot=new Set(b.cells.concat(b.ext));
  const cands=[];
  for(let d=0;d<4;d++){
    const ux=GX[d],uy=GY[d],add=new Set();let minD=99;
    for(const c of G){
      const cx=c%N,cy=(c/N)|0;
      if(lot.has((cy+uy)*N+cx+ux)&&cx+ux>=0&&cx+ux<N)continue;
      if(b.diag&&diagVal(b,cx+ux+.5,cy+uy+.5)>0)continue;
      const walk=[];let hit=0;
      for(let s2=1;s2<=6;s2++){
        const x=cx+ux*s2,y=cy+uy*s2;
        if(x<0||y<0||x>=N||y>=N)break;
        const i=y*N+x;
        if(road[i]||plev[i]>=PATH){if(s2>1)hit=s2-1;break;}
        if(dist[i]!==1)break; // il giardino non esce dalla zona residenziale
        if(!road[i]&&plev[i]<PATH&&doorFree(i)&&foreignNear(i,b.id))break; // lascia una cella di passaggio verso gli altri lotti
        if(!doorFree(i)){
          if(occ[i]>0&&s2>1){const ob=buildings.get(occ[i]);if(ob&&ob.type==='house'&&ob.id!==b.id)hit=s2-1;}
          break;
        }
        walk.push(i);
      }
      if(hit){for(let k=0;k<hit;k++)add.add(walk[k]);minD=Math.min(minD,hit);}
    }
    if(add.size)cands.push({cells:[...add],sc:minD});
  }
  cands.sort((a,c)=>a.sc-c.sc);
  for(const c of cands){
    let cells=c.cells.filter(i=>!lot.has(i));
    if(cells.length>room)cells=cells.slice(0,room);
    if(!cells.length||!reachable(b.door,cells))continue;
    const xs=cells.map(i=>i%N),ys=cells.map(i=>(i/N)|0);
    if(!doorsOK(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys),cells))continue;
    for(const i of cells){b.ext.push(i);occ[i]=b.id;}
    occStamp++;hooks.ground();hooks.regarden(b);return true;
  }
  return false;
}
// v43: il giardino cresce dalla casa cella per cella, come toft e croft medievali: la casa sta sul fronte (verso il sentiero, dove si apre la porta), l'orto/giardino
// si allunga DIETRO la casa con fronte stretto (poco oltre la larghezza della casa), il cortile davanti è piccolo. Si appoggia ai sentieri vicini e non tocca altri lotti.
function growGarden(hcs,doorCell,hx,hy,hw,hh,target,seed,pp){
  const lot=new Set(hcs),g=[],cx=hx+(hw-1)/2,cy=hy+(hh-1)/2;
  const dxr=doorCell%N-cx,dyr=((doorCell/N)|0)-cy,horiz=Math.abs(dxr)>Math.abs(dyr);
  const ux=horiz?Math.sign(dxr):0,uy=horiz?0:Math.sign(dyr);        // verso il fronte (la porta)
  const hd=(horiz?hw:hh)/2,hwid=(horiz?hh:hw)/2;                  // mezza profondità e mezza larghezza della casa rispetto al fronte
  const nbr=(c,k)=>{const x=c%N;if(k===0)return x<N-1?c+1:-1;if(k===1)return x>0?c-1:-1;if(k===2)return c+N<N*N?c+N:-1;return c-N>=0?c-N:-1;};
  const okc=i=>{if(i<0||lot.has(i)||i===doorCell||!cellFree(i,1))return false;
    return !foreignNear(i,-1);};
  while(g.length<target){
    let best=-1,bs=1e9;const seen=new Set();
    for(const c of (g.length?g:hcs))for(let k=0;k<4;k++){ // il giardino resta in un pezzo solo: parte dalla casa e poi cresce da se stesso
      const i=nbr(c,k);if(i<0||seen.has(i))continue;seen.add(i);if(!okc(i))continue;
      const x=i%N,y=(i/N)|0,rx=x-cx,ry=y-cy,f=rx*ux+ry*uy,a=Math.abs(horiz?ry:rx);
      let nb=0;for(let m=0;m<4;m++){const j=nbr(i,m);if(j>=0&&lot.has(j))nb++;}
      const sc=hash(i,seed)*1.0+0.9*Math.max(0,a-(hwid+0.5))+(f>hd?2.6*(f-hd):0)+0.25*Math.max(0,-f-hd)+0.3*Math.hypot(rx,ry)-(nb-1)*0.55-(rect(pp,x-2,y-2,5,5)>0?1.2:0);
      if(sc<bs){bs=sc;best=i;}
    }
    if(best<0)break;
    lot.add(best);g.push(best);
  }
  return g.length>=9?g:null;
}
function trySpawnHouse(){
  const t=BT.house;if(uncommitted('wood')<t.cost.wood||uncommitted('stone')<t.cost.stone)return;
  let sx=0,sy=0,n=0,mk=0;for(let i=0;i<N*N;i++){if(dist[i]===3)mk++;if(dist[i]===1){sx+=i%N;sy+=(i/N)|0;n++;}}
  if(!n)return;sx/=n;sy/=n;
  let veg=0,eggs=0;
  let nh=0,nw=0,np=0;
  for(const b of buildings.values())if(b.type==='house'){nh++;if(b.crop==='eggs')eggs++;else if(b.crop!=='wood')veg++;if(b.crop==='wood')nw++;if(b.pure)np++;}
  const blk=buildSAT(i=>cellFree(i,1)?0:1),oc=buildSAT(i=>occ[i]>0?1:0),pp=buildSAT(i=>(road[i]||plev[i]>=PATH)?1:0);
  const picky=-1-hash(S.t|0,7)*5;
  const rnd=hash(S.t|0,11)*3;
  // v32: dimensioni e forma casuali. Casa da 3×3 a 6×4 (e ruotata); giardino di 9-24 celle: a lato, a L, a ferro di cavallo, intorno alla casa o triangolare
  const HS=[[3,3],[4,3],[4,4],[5,3],[5,4],[6,3],[6,4]];
  let [hw0,hh0]=HS[Math.min(HS.length-1,Math.floor(Math.pow(hash(S.t|0,23),1.4)*HS.length))];
  if(hw0!==hh0&&hash(S.t|0,29)<0.5)[hw0,hh0]=[hh0,hw0];
  const roadAt=(x,y,w,h)=>rect(pp,x,y,w,h);
  // v43: placement organico. La casa si appoggia a un sentiero con la porta verso di esso; il giardino non ha una forma predefinita: "cresce" dalla casa
  // riempiendo le celle libere vicine (preferisce quelle accanto ai sentieri, evita i vicini), così prende la forma dello spazio tra sentieri, alberi e altre case.
  for(const tol of [picky,-6]){
    const top=[];
    for(let y=0;y<=N-hh0;y++)for(let x=0;x<=N-hw0;x++){
      if(((x*7+y*13+(S.t|0))%3)!==0)continue;
      if(attr[(y+(hh0>>1))*N+x+(hw0>>1)]<tol)continue;
      if(rect(blk,x,y,hw0,hh0))continue;
      if(rect(oc,x-1,y-1,hw0+2,hh0+2))continue;
      const A=(hw0+6)*(hh0+6);if(A-rect(blk,x-3,y-3,hw0+6,hh0+6)-hw0*hh0<14)continue; // spazio libero per il giardino
      let dr=-1,ds=-1e9,dadj=0;
      const per=[];for(let i2=0;i2<hw0;i2++){per.push([x+i2,y-1,Math.abs(i2-(hw0-1)/2)],[x+i2,y+hh0,Math.abs(i2-(hw0-1)/2)]);}
      for(let j2=0;j2<hh0;j2++){per.push([x-1,y+j2,Math.abs(j2-(hh0-1)/2)],[x+hw0,y+j2,Math.abs(j2-(hh0-1)/2)]);}
      for(const [dx,dy,off] of per){
        if(dx<0||dy<0||dx>=N||dy>=N)continue;
        const i=dy*N+dx;if(!doorFree(i))continue;
        const adj=roadAt(dx,dy,1,1)*3+rect(pp,dx-1,dy-1,3,3)+rect(pp,dx-2,dy-2,5,5)*0.3;
        const sc=-Math.hypot(dx-sx,dy-sy)*0.02+adj*2-off*0.25+hash(dx,dy)*0.5;
        if(sc>ds){ds=sc;dr=i;dadj=adj;}
      }
      if(dr<0)continue;
      const p=rect(pp,x-6,y-6,15,15)/3,q=rect(oc,x-6,y-6,15,15)/9;
      const sc=p*2+q-Math.hypot(x+hw0/2-sx,y+hh0/2-sy)/3*0.15+attr[(y+(hh0>>1))*N+x+(hw0>>1)]*1.5+hash(x*3,y+(S.t|0))*3+(dadj>0?4:0);
      if(top.length<10||sc>top[top.length-1].sc){top.push({sc,x,y,dr});top.sort((a,c)=>c.sc-a.sc);if(top.length>10)top.pop();}
    }
    for(const cd of top){
      const hcs=[];for(let yy=0;yy<hh0;yy++)for(let xx=0;xx<hw0;xx++)hcs.push((cd.y+yy)*N+cd.x+xx);
      const gcs=growGarden(hcs,cd.dr,cd.x,cd.y,hw0,hh0,9+Math.floor(hash(cd.x,cd.y+7)*10),(S.t|0)+cd.x*3,pp);
      if(!gcs)continue;
      const marks=hcs.concat(gcs),mxs=marks.map(i=>i%N),mys=marks.map(i=>(i/N)|0);
      const bx0=Math.min(...mxs),by0=Math.min(...mys),bx1=Math.max(...mxs),by1=Math.max(...mys);
      if(!flood(marks))continue;
      if(rs[cd.dr]!==rstamp||!doorsAfterFlood(bx0,by0,bx1,by1,marks))continue;
      // v23: circa il 12% delle case (una ogni 8) ha il giardino della legna: la sua coltura è la legna da ardere, al posto di ortaggi, uova o allevamento. La domanda di legna è piccola (1 al giorno per casa, solo d'inverno): con più giardini della legna non troverebbero chi baratta il cibo.
      // Serve una zona mercato (la famiglia baratta la legna con il cibo) e le prime due case coltivano cibo.
      const wood=mk>0&&nh>=2&&nw<Math.ceil((nh+1)*0.12);
      let crop=wood?'wood':veg<eggs?'veg':eggs<veg?'eggs':(hash(cd.x,cd.y)<.5?'veg':'eggs');
      // attività secondaria (indipendente dal giardino): pesca vicino all'acqua, caccia vicino a un bosco tranquillo; altrimenti nessuna
      const r=hash(cd.x*5,cd.y*3);let side='none';
      if(fishOK(cd.x,cd.y)&&r<0.5)side='fish';
      else if(huntOK(cd.x,cd.y)&&r<0.7)side='hunt';
      // circa il 35% dei giardini di cibo è "puro": non diventa mai allevamento né bottega (il giardino della legna è già fisso)
      const pt=(nh-nw+1)*0.35;
      const pure=!wood&&(np<pt-0.5||(np<pt+0.5&&hash(cd.x*3,cd.y*7)<0.5));
      if(pure&&crop==='eggs')crop='veg'; // un giardino fisso non ha galline né uova: solo orto e fiori
      addBuilding('house',bx0,by0,false,{w:bx1-bx0+1,h:by1-by0+1,hx:cd.x,hy:cd.y,hw:hw0,hh:hh0,gcells:gcs,shape:'organic',diag:null,door:cd.dr,crop,side,pure,variant:(hash(cd.x*11,cd.y*7)*4)|0})
      {const nb2=buildings.get(nextId-1);if(nb2)for(let g2=0;g2<8;g2++)if(!expandGarden(nb2))break;} // il giardino nasce già attaccato alla strada: riempie lo spazio fino alla strada più vicina
      return;
    }
  }
}
function nearDone(type,cell,r){
  const cx=cell%N,cy=(cell/N)|0;
  for(const b of buildings.values()){if(b.type!==type||b.state!=='done')continue;if(Math.hypot(b.cell%N-cx,(b.cell/N|0)-cy)<=r)return true;}
  return false;
}
function chooseTier(b,shopOnly){
  // v21: i giardini "puri" restano sempre orto o galline: niente allevamento e niente bottega
  if(b.pure||b.crop==='wood')return;
  const hs=[...buildings.values()].filter(h=>h.type==='house'&&h.state==='done'&&h!==b);
  const n=hs.length+1;
  const cnt=k=>hs.filter(h=>k==='herd'?h.crop==='herd':h[k]).length;
  const cap={herd:n*0.4+1,weave:Math.max(1,n*0.25),craft:Math.max(1,n*0.3),tailor:Math.max(1,n*0.2),bake:Math.max(1,n*0.25)};
  const pre={weave:b.level>=3&&countDone('sheepfold')>0,craft:b.level>=3&&countDone('mine')>0,tailor:b.level>=4&&hs.some(h=>h.weave),bake:b.level>=4&&countDone('mill')>0};
  const SHOP=['weave','craft','tailor','bake'];
  const MSG={weave:'Una famiglia ha messo su un telaio: il tessitore trasforma la lana in tessuto.',craft:'Una famiglia ha aperto una bottega di artigianato: lavora il ferro e consuma legna da ardere.',tailor:'Una famiglia ha aperto una sartoria: cuce abiti con il tessuto dei tessitori.',bake:'Una famiglia ha aperto un panificio: usa farina e legna da ardere.'};
  // il giardino (e le sue espansioni) segue sempre la coltura della casa
  if(shopOnly){}
  else if(b.crop==='herd'&&cnt('herd')+1>cap.herd){b.crop='veg';b.goods.veg=Math.max(b.goods.veg,2);tell('backveg','Troppi allevamenti: una famiglia è tornata a coltivare verdure.');}
  else if(b.crop!=='herd'&&b.level>=2){
    const c=cnt('herd');
    if((c===0&&Math.random()<0.8)||(c+1<=cap.herd&&Math.random()<0.4)){b.crop='herd';b.goods.meat=Math.max(b.goods.meat,2);tell('herd','Una famiglia ha trasformato il giardino in un piccolo allevamento di maiali e pecore.');}
  }
  // bottega: si lascia se mancano i presupposti o ce ne sono troppe uguali
  let cur=SHOP.find(k=>b[k])||null;
  if(cur&&(!pre[cur]||cnt(cur)+1>cap[cur])){b[cur]=false;tell('backgard','Troppe botteghe uguali: una famiglia è tornata a lavorare il giardino.');cur=null;}
  const needed=SHOP.filter(k=>k!==cur&&pre[k]&&cnt(k)===0);
  const free=SHOP.filter(k=>k!==cur&&pre[k]&&cnt(k)>0&&cnt(k)+1<=cap[k]);
  let pick=null;
  if(cur){if(needed.length&&Math.random()<0.4)pick=needed[(Math.random()*needed.length)|0];}
  else if(Math.random()>=0.25){
    if(needed.length)pick=needed[(Math.random()*needed.length)|0];
    else if(free.length&&Math.random()<0.6)pick=free[(Math.random()*free.length)|0];
  }
  if(pick){if(cur)b[cur]=false;b[pick]=true;tell(pick,MSG[pick]);}
}
function roomFor(b){return b.members.length<capOf(b);}
function adultsIn(b){let n=0;for(const id of b.members){const v=vmap.get(id);if(v&&!v.child)n++;}return n;}
// una famiglia con un solo adulto (vedovo, giovane) è più attraente per chi cerca casa: può nascere una nuova coppia
const lone=b=>adultsIn(b)===1?0.8:0;
function schooledIn(b){for(const id of b.members){const v=vmap.get(id);if(v&&v.schooled)return true;}return false;}
// felicità/benessere della casa (0-100) = quattro bisogni: cibo (30), casa (25: caldo, legna, quiete, spazio), acqua (25),
// chiesa (20, solo dal livello 2 in poi: ai livelli bassi non conta e il punteggio si calcola sugli altri tre)
function needsOf(b){
  const f=b.flags,ch=b.level>=2;
  const food=(f.food?20:0)+(b.hungry<10?10:0);
  const home=(f.heat?10:0)+8*Math.min(1,b.goods.firewood/fuelNeed())+(f.attr?4:0)+(b.members.length<=capOf(b)?3:0);
  const water=f.water?25:0,church=ch&&f.church?20:0;
  return {food,home,water,church,hasChurch:ch,max:ch?100:80};
}
function wellOf(b){const n=needsOf(b);return Math.round((n.food+n.home+n.water+n.church)/n.max*100);}
// felicità del singolo: quella della casa, corretta da malattia e carattere
// distanza casa-lavoro (v31): oltre COMMUTE_OK celle il lavoratore è scontento (COMMUTE_PEN punti per cella, al massimo COMMUTE_MAX)
const COMMUTE_OK=30,COMMUTE_PEN=0.4,COMMUTE_MAX=25;
const cellDist=(a,b)=>Math.hypot(a%N-b%N,((a/N)|0)-((b/N)|0));
function commuteOf(v){const h=v.home&&buildings.get(v.home),j=v.job&&buildings.get(v.job);return h&&j?cellDist(h.cell,j.cell):0;}
// quanto una casa conviene a chi la cerca: vicinanza al lavoro, pozzo, chiesa (dal livello 2), qualità
function fitScore(h,v){
  let s=h.well*0.05+h.attr*0.3;
  const jb=v&&v.job&&buildings.get(v.job);
  if(jb)s-=Math.min(80,cellDist(h.cell,jb.cell))*0.12;
  if(h.flags.water)s+=3;
  if(h.level>=2&&h.flags.church)s+=2.5;
  return s;
}
function joyOf(v){
  const h=v.home&&buildings.get(v.home);
  let s=(!h||h.state!=='done')?20:h.well;
  if(v.ill)s-=15;
  {const cd=commuteOf(v);if(cd>COMMUTE_OK)s-=Math.min(COMMUTE_MAX,(cd-COMMUTE_OK)*COMMUTE_PEN);}
  if(h&&h.level>=2&&v.prayT!==undefined&&S.t-v.prayT<DAY*2)s+=6; // andare in chiesa consola
  if(h&&h.state==='done'){s+=h.fun||0;s+=festJoy(h);if(h.level>=3&&h.goods.clothes>=1)s+=3;} // v32: taverna e sala delle feste vicine, abiti in casa
  if(v.trait==='brontolone')s-=18;
  else if(v.trait==='litigioso')s-=6;
  if(h){let q=0;for(const id of h.members){if(id===v.id)continue;const o=vmap.get(id);if(o&&o.trait==='litigioso')q++;}s-=Math.min(3,q)*5;}
  return Math.max(0,Math.min(100,Math.round(s)));
}
// chi sa leggere e scrivere (scuola) lavora meglio (+25%) e a tavola consuma meno cibo (25% dei pasti non toglie nulla dalla scorta)
const EDU_WORK=1.25,EDU_SAVE=0.25;
// bravura (v32): ogni ora di lavoro in un edificio dà esperienza in quel mestiere; ogni XPL secondi di lavoro sale un livello (max SKMAX).
// +12% di resa per livello nel proprio mestiere; chi è bravo in un mestiere è più portato a riprenderlo e meno ad accettarne un altro.
const XPL=DAY*12,SKMAX=4,SK_WORK=0.12,SKNAME=['Apprendista','Praticante','Esperto','Provetto','Maestro'];
const skLevel=(v,type)=>Math.min(SKMAX,Math.floor(((v.sk&&v.sk[type])||0)/XPL));
function skillTick(v){
  const jb=v.job&&buildings.get(v.job);if(!jb||v.child||v.ill||S.ph!=='work')return;
  const t=jb.type,before=skLevel(v,t);v.sk[t]=(v.sk[t]||0)+1;
  const after=skLevel(v,t);
  if(after>before){logV(v,'Diventa '+SKNAME[after].toLowerCase()+' come '+TRADENAME[t]+' (livello '+after+').');if(after>=SKMAX)tell('master','Un abitante è diventato maestro del suo mestiere: lavora molto meglio e chi ha quel mestiere lo riprende volentieri.');}
}
const jobSkill=v=>{const jb=v.job&&buildings.get(v.job);return jb?skLevel(v,jb.type):0;};
const workRate=v=>(v.trait==='pigro'?0.6:1)*(v.joy<35?0.8:1)*(v.schooled?EDU_WORK:1)*(1+SK_WORK*jobSkill(v));
function birthTick(b){
  if(S.t<b.birthT)return;
  const bonus=S.edicts.birthBonus;
  b.birthT=S.t+DAY*(bonus?(1+Math.random()*2):(2+Math.random()*3));
  if(b.members.length>=capOf(b)+2||b.hungry>=30||!b.flags.heat||b.well<30)return;
  const ad=b.members.map(id=>vmap.get(id)).filter(v=>v&&!v.child&&v.age>=17&&v.age<50&&!v.ill);
  if(ad.length<2||Math.random()>(bonus?0.9:0.7))return;
  const hd=b.head&&vmap.get(b.head);
  const pt=[ad[0].trait,ad[1].trait].filter(Boolean);
  const c=addVillager(cx2w(b.door%N),cy2w((b.door/N)|0),0,hd?hd.fam:undefined,pt.length&&Math.random()<0.35?pt[(Math.random()*pt.length)|0]:rollTrait());c.home=b.id;b.members.push(c.id);S.births++;
  const r=reg.get(c.id);r.par=[ad[0].id,ad[1].id];
  for(const p of [ad[0],ad[1]]){const pr=reg.get(p.id);if(pr)pr.kids.push(c.id);}
  logV(c,'Nato da '+ad[0].name+' e '+ad[1].name+'.'+(c.trait?' Carattere: '+TRAITS[c.trait].n.toLowerCase()+'.':''));
  tell('birth','È nato un bambino! I figli crescono, vanno a scuola (se c\'è un maestro) e a 14 anni diventano adulti.');
}
function transfer(v,from,to,msg){
  abortTask(v);
  from.members=from.members.filter(id=>id!==v.id);
  to.members.push(v.id);v.home=to.id;v.duty=false;
  if(from.head===v.id)from.head=null;
  logV(v,msg);acc.attr=99;
}
// i giovani adulti lasciano una casa affollata per cercarne un'altra: così nascono nuove famiglie
function tryMoveOut(b,m){
  if(Math.random()>0.006)return;
  const ad=m.filter(v=>!v.child);
  if(b.members.length<=capOf(b)&&ad.length<3)return;
  const cand=ad.filter(v=>v.age>=18&&v.age<40&&v.id!==b.head&&!v.ill&&(v.moveT||0)<S.t&&(v.state==='idle'||v.state==='wait'||v.state==='tend')&&!v.carry);
  if(!cand.length)return;
  cand.sort((a,c)=>a.age-c.age);const v=cand[0];
  let best=null,bs=-1e9;
  for(const h2 of buildings.values()){
    if(h2.type!=='house'||h2.state!=='done'||h2===b||h2.members.length>=capOf(h2)||h2.attr<=-4.5)continue;
    const d=Math.hypot(h2.cell%N-b.cell%N,(h2.cell/N|0)-(b.cell/N|0));if(d>110)continue;
    const nad=adultsIn(h2),sc=(nad===1?3:nad===0?1:0.3)-d*0.01+fitScore(h2,v)*0.3;
    if(sc>bs){bs=sc;best=h2;}
  }
  if(!best)return;
  v.moveT=S.t+DAY*4;transfer(v,b,best,'Lascia la casa di famiglia e si trasferisce in un\'altra casa.');
  S.moves++;tell('moveout','Un giovane adulto ha lasciato la casa di famiglia per cercarne un\'altra: così nascono nuove famiglie.');
}
// chi lavora lontano da casa (o vive senza pozzo/chiesa vicini) cerca una casa più comoda con posto libero
function tryCloser(b,m){
  if(Math.random()>0.004||adultsIn(b)<2)return;
  const needy=!b.flags.water||(b.level>=2&&!b.flags.church);
  const cand=m.filter(v=>!v.child&&!v.ill&&v.id!==b.head&&(v.moveT||0)<S.t&&(v.state==='idle'||v.state==='wait'||v.state==='tend')&&!v.carry&&(commuteOf(v)>COMMUTE_OK||needy));
  if(!cand.length)return;
  cand.sort((a,c)=>commuteOf(c)-commuteOf(a));const v=cand[0];
  let best=null,bs=fitScore(b,v)+2.5;
  for(const h2 of buildings.values()){
    if(h2.type!=='house'||h2.state!=='done'||h2===b||h2.members.length>=capOf(h2)||h2.attr<=-4.5)continue;
    const sc=fitScore(h2,v);if(sc>bs){bs=sc;best=h2;}
  }
  if(!best)return;
  v.moveT=S.t+DAY*4;transfer(v,b,best,'Si trasferisce in una casa più comoda'+(v.job?', più vicina al lavoro':'')+'.');
  S.moves++;tell('closer','Una famiglia si è trasferita in una casa più vicina al lavoro e ai servizi (pozzo, chiesa): chi lavora lontano da casa è scontento.');
}
function orphanCare(b,m){
  let best=null,bs=1e9;
  for(const h2 of buildings.values()){
    if(h2.type!=='house'||h2.state!=='done'||h2===b)continue;
    if(adultsIn(h2)<1||h2.members.length+m.length>capOf(h2)+2)continue;
    const d=Math.hypot(h2.cell%N-b.cell%N,(h2.cell/N|0)-(b.cell/N|0));if(d<bs){bs=d;best=h2;}
  }
  if(!best)return;
  for(const v of m)transfer(v,b,best,'Rimasto senza adulti in casa, è accolto da un\'altra famiglia.');
  tell('orphan','Dei bambini sono rimasti senza adulti: un\'altra famiglia li ha accolti.');
}
// mestiere di famiglia: quello degli adulti di casa (o del defunto, se non ce ne sono)
function famTrade(h){
  const cnt={};let best=null,bn=0;
  for(const id of h.members){const x=vmap.get(id);if(x&&!x.child&&x.trade){cnt[x.trade]=(cnt[x.trade]||0)+1;if(cnt[x.trade]>bn){bn=cnt[x.trade];best=x.trade;}}}
  return best||h.legacy||null;
}
// eredità: capofamiglia, posto di lavoro e mestiere passano a un familiare adulto
function inherit(v,h,jobId,wasHead){
  if(!h)return;
  const ms=h.members.map(id=>vmap.get(id)).filter(x=>x&&!x.child).sort((a,b)=>b.age-a.age);
  if(v.trade&&!v.child)h.legacy=v.trade;
  const heir=ms.find(x=>!x.ill)||ms[0]||null;
  if(!heir)return;
  if(wasHead){h.head=heir.id;S.inherits++;logV(heir,'Diventa capofamiglia dopo la morte di '+v.name+'.');tell('heirhead','Il capofamiglia è morto: il ruolo passa al più anziano degli adulti di casa.');}
  const jb=jobId&&buildings.get(jobId);
  if(jb&&jb.state==='done'&&BT[jb.type].slots>0&&!heir.job&&!heir.ill){
    setJob(heir,jb);heir.duty=false;heir.inh=true;jb.workers.push(heir.id);S.inherits++;
    logV(heir,'Eredita il posto di '+TRADENAME[jb.type]+' di '+v.name+'.');
    tell('heirjob','Il posto di lavoro di un defunto è passato a un familiare: il mestiere resta in famiglia.');
  }
}
function killV(v,cause){
  const h=v.home&&buildings.get(v.home),jobId=v.job,wasHead=!!(h&&h.head===v.id);
  const illk=v.ill?v.ill.k:null;
  abortTask(v);release(v.id);
  if(h)h.members=h.members.filter(id=>id!==v.id);
  const j=jobId&&buildings.get(jobId);if(j)j.workers=j.workers.filter(id=>id!==v.id);
  villagers=villagers.filter(x=>x!==v);vmap.delete(v.id);hooks.gone(v);
  const left=cause==='left';
  if(left)S.left++;else{S.deaths++;S.deathsBy[cause]=(S.deathsBy[cause]||0)+1;}
  if(illk==='plague'&&!left)S.plague.dead++;
  const r=reg.get(v.id);if(r){r.died=S.t;r.cause=cause;r.ageD=v.age|0;r.trade=v.trade;r.inh=v.inh;r.schooled=v.schooled;r.sk=Object.assign({},v.sk);}
  logV(v,left?'Infelice, lascia il paese in cerca di una vita migliore.':cause==='ill'&&illk?'Muore di '+DIS[illk].n.toLowerCase()+'.':CAUSETXT[cause]);
  inherit(v,h,jobId,wasHead);
  if(left){tell('left','Un abitante infelice ha lasciato il paese. Cibo, una casa calda, acqua vicina e (dal livello 2) una chiesa vicina tengono la gente contenta.');acc.attr=99;return;}
  if(cause==='ill')tell('deathill','Una malattia ha ucciso un abitante: un ospizio con un erborista, un pozzo e la legna in casa riducono il rischio.');
  if([...buildings.values()].some(b=>b.type==='cemetery'&&b.state==='done')){S.buried++;tell('death1','Un abitante è morto ed è stato sepolto nel cimitero della chiesa.');}
  else{S.unburied++;tell('death0','Un abitante è morto. Senza un cimitero accanto alla chiesa i morti sono sepolti nei campi, e la gente ne soffre.');}
  acc.attr=99;
}
function lifeTick(){
  const dead=[],leavers=[];
  for(const v of villagers){
    v.age+=1/AGEY;
    const h=v.home&&buildings.get(v.home);
    v.joy=joyOf(v);skillTick(v);
    // chi resta a lungo molto infelice se ne va (mai sotto gli 8 abitanti)
    if(!v.child&&v.joy<25)v.sad++;else v.sad=Math.max(0,v.sad-2);
    if(v.sad>=DAY*1.5&&villagers.length-leavers.length>8)leavers.push(v);
    if(v.child&&v.age>=14){
      v.child=false;v.schooled=v.edu>=300;
      const ft=h?famTrade(h):null;
      if(ft){v.trade=ft;v.inh=true;S.inherits++;v.sk[ft]=Math.max(v.sk[ft]||0,XPL);}
      logV(v,'Compie 14 anni: '+(v.schooled?'sa leggere e scrivere.':'lascia la scuola senza saper leggere e scrivere.')+(ft?' Eredita il mestiere di famiglia: '+TRADENAME[ft]+'.':''));
      tell('grown','Un bambino è diventato adulto'+(v.schooled?' e sa leggere e scrivere: una persona istruita lavora meglio, consuma meno cibo e fa migliorare la casa più in fretta.':'.')+(ft?' Ha ereditato il mestiere di famiglia.':''));
    }
    let a=0,bc=0,c=0,d=0,e=0;
    if(v.age>55)a=Math.pow((v.age-55)/22,2)*0.0006;
    if(S.season===3&&h&&h.state==='done'&&!h.warm&&(v.age>45||v.age<3))bc=0.0006;
    if(h&&h.hungry>=250)c=0.0004;
    if(v.ill)d=DIS[v.ill.k].mort*(v.age>55?2:1)*(v.age<4?2:1)*(h&&careNear(h.cell)?0.4:1)*(h&&h.hungry>=30?1.5:1);
    if(v.age>=v.life)e=0.05;
    a*=TK;bc*=TK;c*=TK;d*=TK;
    const p=a+bc+c+d+e;
    if(p>0&&Math.random()<p){
      let r=Math.random()*p,cause;
      if((r-=e)<0||(r-=a)<0)cause='age';else if((r-=bc)<0)cause='cold';else if((r-=c)<0)cause='hunger';else cause='ill';
      dead.push([v,cause]);
    }
  }
  for(const [v,cause] of dead)killV(v,cause);
  for(const v of leavers)if(vmap.has(v.id))killV(v,'left');
}

// ---- malattie ed epidemie ----
// un ospizio con un erborista entro HEAL_R celle accelera la guarigione e dimezza il rischio di morte
function careNear(cell){
  const cx=cell%N,cy=(cell/N)|0;
  for(const b of buildings.values()){
    if(b.type!=='infirmary'||b.state!=='done'||!b.workers.length)continue;
    if(Math.hypot(b.cell%N-cx,(b.cell/N|0)-cy)<=HEAL_R)return true;
  }
  return false;
}
function fallIll(v,k){
  if(v.ill||v.immT>S.t)return false;
  const d=DIS[k];v.ill={k,left:(d.dur[0]+Math.random()*(d.dur[1]-d.dur[0]))*DK};
  S.sickTot++;v.duty=false;abortTask(v);release(v.id);
  logV(v,'Si ammala: '+d.n.toLowerCase()+'.');
  if(k==='fever')tell('ill_fever','Un abitante ha la febbre: resta a letto finché non guarisce. Il freddo in casa e la mancanza di legna aumentano il rischio.');
  else if(k==='flux')tell('ill_flux','Dissenteria: colpisce soprattutto dove manca un pozzo vicino e dove restano morti insepolti.');
  return true;
}
function startPlague(src){
  const hs=[...buildings.values()].filter(b=>b.type==='house'&&b.state==='done'&&b.members.length);
  if(!hs.length)return;
  let pk=null;for(let k=0;k<3;k++){const c=hs[(Math.random()*hs.length)|0];if(!pk||c.well<pk.well)pk=c;}
  const m=pk.members.map(id=>vmap.get(id)).filter(v=>v&&!v.ill&&v.immT<=S.t);
  if(!m.length)return;
  const v=m[(Math.random()*m.length)|0];
  if(!fallIll(v,'plague'))return;
  S.plague={on:true,since:S.t,dead:0};
  hooks.toast((src==='viandante'?'Un viandante malato è passato dalla locanda: ':'')+'scoppia un\'epidemia di peste! I malati restano a letto e il contagio passa di casa in casa. Ospizio, pozzo, chiesa e la quarantena riducono i danni.');
}
function outbreakP(hs){
  let f=1+0.5*Math.min(6,S.unburied),crowd=0,hung=0;
  for(const h of hs){if(h.members.length>capOf(h))crowd++;if(h.hungry>=30)hung++;}
  if(crowd*3>hs.length)f+=0.5;
  if(hung*3>hs.length)f+=0.5;
  if(countDone('church'))f*=0.6;
  if(countDone('infirmary'))f*=0.6;
  if(S.edicts.quarantine)f*=0.5;
  return 0.00015*f;
}
function diseaseTick(){
  const q=S.edicts.quarantine;
  const hs=[];for(const b of buildings.values())if(b.type==='house'&&b.state==='done')hs.push(b);
  // guarigioni
  for(const v of villagers){
    if(!v.ill)continue;
    const h=v.home&&buildings.get(v.home),care=!!(h&&careNear(h.cell));
    v.ill.left-=care?2.2:1;
    if(v.ill.left<=0){
      const nm=DIS[v.ill.k].n.toLowerCase();v.ill=null;v.immT=S.t+YEARL*0.6;S.cured++;
      logV(v,'Guarisce da '+nm+(care?', curato all\'ospizio':'')+'.');
      tell('cured','Un malato è guarito: per un po\' sarà immune.');
    }
  }
  let plague=0;const ps=new Map();
  for(const v of villagers)if(v.ill&&v.ill.k==='plague'){plague++;ps.set(v.home,(ps.get(v.home)||0)+1);}
  if(!S.plague.on){
    if(villagers.length>=14&&S.t>YEARL*0.8&&Math.random()<outbreakP(hs)*TK)startPlague('');
  }else if(plague===0){
    S.plague.on=false;
    hooks.toast('L\'epidemia di peste è finita'+(S.plague.dead?': '+S.plague.dead+' vittime.':'.'));
  }
  // contagio: nella stessa casa e tra case vicine
  const sickHouses=[...ps.keys()].map(id=>buildings.get(id)).filter(Boolean);
  const expo=new Map();
  const exposure=h=>{
    if(expo.has(h.id))return expo.get(h.id);
    let e=Math.min(3,ps.get(h.id)||0)*0.012;
    for(const o of sickHouses){if(o===h)continue;if(Math.hypot(o.cell%N-h.cell%N,(o.cell/N|0)-(h.cell/N|0))<=14)e+=Math.min(3,ps.get(o.id)||0)*0.00035;}
    e*=TK*(q?0.25:1)*(careNear(h.cell)?0.6:1)*(h.flags.church?0.85:1);
    expo.set(h.id,e);return e;
  };
  // nuovi malati
  for(const v of villagers){
    if(v.ill||v.immT>S.t)continue;
    const h=v.home&&buildings.get(v.home);if(!h||h.state!=='done')continue;
    const wf=1+Math.max(0,60-h.well)/60,crowd=h.members.length>capOf(h)?1.4:1,frail=(v.age>55||v.age<4)?1.6:1,k=wf*crowd*frail*(v.trait==='cagionevole'?2:1);
    if(S.plague.on&&Math.random()<exposure(h)*k){fallIll(v,'plague');continue;}
    const p1=S.season===3?0.00012*TK*(h.warm?1:4):0;
    if(p1&&Math.random()<p1*k){fallIll(v,'fever');continue;}
    const p2=((S.season===3?0.00002:(h.flags.water?0.00001:0.00008))+0.00004*Math.min(5,S.unburied))*TK;
    if(Math.random()<p2*k)fallIll(v,'flux');
  }
}
function houseTick(b){
  const m=b.members.map(id=>vmap.get(id)).filter(Boolean);b.members=m.map(v=>v.id);
  if(!(b.head&&m.some(v=>v.id===b.head&&!v.child))){const c=m.filter(v=>!v.child).sort((a,c2)=>c2.age-a.age)[0];b.head=c?c.id:null;}
  if(m.length&&m.every(v=>v.child))orphanCare(b,m);
  if(S.ph==='work'){
    let tenders=0,kids=0;
    for(const v of m){
      if(v.duty&&!v.job&&(v.state==='idle'||v.state==='toGarden'||v.state==='tend'||v.state==='wait'||v.state==='toErr'||v.state==='doErr'||v.state==='toHomeErr'))tenders+=workRate(v);
      else if(v.child&&v.age>=9&&(v.state==='toGarden'||v.state==='tend'))kids++;
    }
    tenders=Math.min(3*EDU_WORK,tenders)+Math.min(1,kids*0.4);
    const canCraft=b.craft&&b.goods.iron>=1&&b.goods.firewood>=1,canBake=b.bake&&b.goods.flour>=1&&b.goods.firewood>=1;
    const canWeave=b.weave&&b.goods.wool>=1,canTail=b.tailor&&b.goods.cloth>=1;
    const share=TK*tenders/(1+(canCraft?1:0)+(canBake?1:0)+(canWeave?1:0)+(canTail?1:0))*(S.edicts.woodDuty?0.85:1);
    const sf=S.season===3?(b.crop==='veg'?0.35:b.crop==='eggs'?0.6:0.8):S.season===2?1.25:1;
    b.pa.g+=share/(b.crop==='herd'?26:16)*(b.level>=3?1.5:1)*sf*(1+0.25*Math.max(0,Math.min(GMAX,b.gcells.length+b.ext.length)-9))*(b.goods.tools>=1?1.1:1);
    const gk=gardenGood(b.crop),gcap=gardenCap(b.crop);
    while(b.pa.g>=1){b.pa.g-=1;if(b.goods[gk]<gcap)b.goods[gk]++;}
    if(canCraft){b.pa.c+=share/20;while(b.pa.c>=1&&b.goods.iron>=1&&b.goods.firewood>=1){b.pa.c-=1;b.goods.iron--;b.goods.firewood--;b.goods.tools=Math.min(12,b.goods.tools+1);}}
    if(canWeave){b.pa.w+=share/18;while(b.pa.w>=1&&b.goods.wool>=1){b.pa.w-=1;b.goods.wool--;b.goods.cloth=Math.min(12,b.goods.cloth+1);}}
    if(canTail){b.pa.t+=share/22;while(b.pa.t>=1&&b.goods.cloth>=1){b.pa.t-=1;b.goods.cloth--;b.goods.clothes=Math.min(12,b.goods.clothes+1);}}
    if(canBake){b.pa.b+=share/25;while(b.pa.b>=1&&b.goods.flour>=1&&b.goods.firewood>=1){b.pa.b-=1;b.goods.flour--;b.goods.firewood--;b.goods.bread=Math.min(12,b.goods.bread+2);}}
    tryMoveOut(b,m);tryCloser(b,m);
  }
  if(b.heatDay!==S.day){b.heatDay=S.day;
    // v27: un giardino normale può diventare bottega anche dopo, appena ha il livello e la filiera (miniera, ovile, mulino)
    if(b.level>=3&&!b.pure&&b.crop!=='wood'&&Math.random()<0.25){const had=b.craft||b.bake||b.weave||b.tailor;if(!had){chooseTier(b,true);if(b.craft||b.bake||b.weave||b.tailor){hooks.upgraded(b);}}}
    if(S.season===3){if(b.goods.firewood>=1){b.goods.firewood--;b.warm=true;}else{b.warm=false;if(b.crop!=='wood')tell('cold','Una casa è rimasta senza legna da ardere: solo le famiglie con il giardino della legna la producono, le altre la comprano al banco del mercato. Disegna una zona mercato.');}}else{b.warm=true;if(S.day%2===0&&b.goods.firewood>=1)b.goods.firewood--;}}  // v23: cucina tutto l'anno: fuori dall'inverno 1 legna ogni 2 giorni
  b.attr=attr[b.cell];b.fun=funOf(b);
  // v36.1: il giardino cresce piano piano verso la strada più vicina (non solo al salto di livello)
  if(b.gcells.length+b.ext.length<ROADMAX&&hash(S.t|0,b.id*13)<0.25)expandGarden(b);
  birthTick(b);
  const f=b.flags;f.heat=b.warm;
  f.food=TYPES.filter(tp=>S.t-b.ate[tp]<DAY*2).length>=(b.level>=3?3:2)&&b.hungry<30;
  f.water=nearDone('well',b.cell,WELL_R);f.church=nearDone('church',b.cell,CHURCH_R);
  f.attr=b.level<2||b.attr>=(b.level>=3?0.5:-2);
  f.tools=b.level<3||b.goods.tools>=1;
  f.fuel=b.goods.firewood>=fuelNeed();
  // v24: requisiti per salire di livello (cumulativi). Livello 1: cibo, acqua, legna. Livello 2: + chiesa e 2 tipi di cibo. Livello 3: + scuola vicina e 3 tipi di cibo.
  f.school=nearDone('school',b.cell,SCHOOL_R);
  f.foodUp=TYPES.filter(tp=>S.t-b.ate[tp]<DAY*2).length>=Math.min(3,b.level)&&b.hungry<30;
  f.quality=b.attr>=QUAL5;
  b.well=wellOf(b);
  if(b.level<MAXLV){
    const ok=f.foodUp&&f.water&&f.fuel&&(b.level<2||f.church)&&(b.level<3||f.school)&&(b.level<4||f.quality);
    const uc=UPC[b.level+1];f.mat=!uc||(uncommitted('wood')>=uc.wood&&uncommitted('stone')>=uc.stone);
    if(ok&&S.edicts.noUpgrade){b.up=Math.min(b.up,24);}
    else if(ok){b.up=Math.min(25,b.up+(schooledIn(b)?2:1)+(b.well>=90?1:0));
      if(b.up>=25){
        if(f.mat){
          if(uc){S.stock.wood-=uc.wood;S.stock.stone-=uc.stone;}
          b.level++;b.up=0;chooseTier(b);expandGarden(b);hooks.upgraded(b);acc.attr=99;
          tell('upg','Una casa è stata migliorata: più spazio per la famiglia e nuove attività nel giardino. Se il passaggio tra le case non è diventato un sentiero, il giardino si allarga.');
        }else if(uc&&uc.stone>0)tell('needStone','Le case di livello 3 e 4 hanno bisogno anche di pietra per essere migliorate: servono cave attive e scorte nel magazzino.');
        else tell('needWood','Per migliorare le case serve legno nel magazzino.');
      }
    }
    else b.up=Math.max(0,b.up-1);
  }
}
const freeMember=h=>{for(const id of h.members){const v=vmap.get(id);if(v&&!v.child&&!v.job&&!v.duty&&!v.ill&&v.state==='idle'&&!v.carry)return v;}return null;};
const dutyIdle=h=>{for(const id of h.members){const v=vmap.get(id);if(v&&!v.child&&!v.job&&v.duty&&!v.ill&&(v.state==='idle'||v.state==='tend'||v.state==='wait')&&!v.carry)return v;}return null;};
const marketMember=h=>freeMember(h)||dutyIdle(h);
function dutyPass(){
  // se un mestiere produttivo (taglialegna, cava...) è senza addetti, ogni casa lascia almeno un adulto libero per il lavoro
  let unmet=0;for(const b of buildings.values())if(b.state==='done'&&BT[b.type].slots>0&&b.type!=='store'&&b.want>=1&&b.workers.length<1)unmet++;
  for(const h of buildings.values()){
    if(h.type!=='house'||h.state!=='done')continue;
    const m=h.members.map(id=>vmap.get(id)).filter(v=>v&&!v.child&&!v.ill);
    const extras=(h.craft?1:0)+(h.bake?1:0)+(h.weave?1:0)+(h.tailor?1:0);
    let want=Math.min(m.length,2+extras);if(unmet>0)want=Math.min(want,Math.max(1,m.length-1));let have=0;
    for(const v of m)if(v.duty)have++;
    for(const v of m){if(have>=want)break;if(!v.duty&&!v.job&&v.state!=='toStall'&&v.state!=='keep'){v.duty=true;have++;}}
    for(let i=m.length-1;i>=0&&have>want;i--)if(m[i].duty){m[i].duty=false;have--;}
  }
}
function spawnStall(h){
  let cx=0,cy=0,n=0;
  for(const b of buildings.values())if(b.type==='stall'){cx+=b.x;cy+=b.y;n++;}
  if(!n)for(let i=0;i<N*N;i++)if(dist[i]===3){cx+=i%N;cy+=(i/N)|0;n++;}
  if(!n)return;cx/=n;cy/=n;
  // v31.1: banchi 2×2, posati cella per cella e molto vicini tra loro (mercato affollato)
  const fr=buildSAT(i=>cellFree(i,3)?0:1),c=[];
  for(let y=0;y<=N-2;y++)for(let x=0;x<=N-2;x++){if(rect(fr,x,y,2,2))continue;c.push([(x+0.5-cx)**2+(y+0.5-cy)**2+hash(x,y+(S.t|0))*6,x,y]);}
  c.sort((a,b)=>a[0]-b[0]);
  for(const [,x,y] of c.slice(0,14)){
    if(connectMsg(2,2,x,y,-1))continue;
    const st=addBuilding('stall',x,y,true,{owner:h.id});h.stall=st.id;return;
  }
}
const keepOf=tp=>tp==='tools'?1:KEEP;
function marketTick(){
  if(S.ph!=='work'||S.edicts.quarantine)return;
  const houses=[...buildings.values()].filter(b=>b.type==='house'&&b.state==='done');
  for(const h of houses){
    const sur=TRADE.some(tp=>h.goods[tp]>=keepOf(tp)+3);
    const st=h.stall&&buildings.get(h.stall);
    if(!st){if(sur&&h.members.length)spawnStall(h);continue;}
    if(!st.open&&st.keeper===null&&sur){
      const m=marketMember(h);
      if(m&&route(m,st.cell,st.id)){m.stall=st.id;st.keeper=m.id;m.state='toStall';}
    }
  }
  for(const h of houses){
    if(S.t<h.tradeCool)continue;const m=marketMember(h);if(!m)continue;
    const wants=TYPES.filter(tp=>h.goods[tp]<2&&S.t-h.ate[tp]>40).sort((a,b)=>h.ate[a]-h.ate[b]);
    if((h.craft||h.bake)&&h.goods.firewood<2)wants.unshift('firewood');
    if(h.level>=3&&h.goods.tools<1)wants.unshift('tools');
    if(h.goods.firewood<fuelTarget()&&!wants.includes('firewood'))wants.unshift('firewood');
    if(h.tailor&&h.goods.cloth<2)wants.unshift('cloth');
    else if(h.level>=4&&!h.tailor&&h.goods.clothes<1)wants.unshift('clothes');
    if(!wants.length)continue;
    let pickS=null,bd=1e9;
    for(const st of buildings.values()){
      if(st.type!=='stall'||!st.open)continue;const o=buildings.get(st.owner);if(!o||o===h)continue;
      for(const want of wants)for(const s of TRADE){
        if(s===want||wants.includes(s)||h.goods[s]<keepOf(s)+2||o.goods[want]-keepOf(want)<1||o.goods[s]>=8)continue;
        const d=(st.cell%N-h.cell%N)**2+((st.cell/N|0)-(h.cell/N|0))**2;if(d<bd){bd=d;pickS={st,o,s,want};}
      }
    }
    if(!pickS)continue;
    const q=Math.min(3,pickS.o.goods[pickS.want]-keepOf(pickS.want),h.goods[pickS.s]-keepOf(pickS.s));if(q<1)continue;
    if(!route(m,pickS.st.cell,pickS.st.id)){h.tradeCool=S.t+10;continue;}
    h.goods[pickS.s]-=q;pickS.o.goods[pickS.want]-=q;
    m.cargo={t:pickS.want,s:pickS.s,q,owner:pickS.o.id,stall:pickS.st.id};m.carry=pickS.s==='firewood'?'wood':pickS.s==='tools'?'iron':pickS.s;m.state='toMarket';h.tradeCool=S.t+15;
  }
}
function siteSearch(type,dt,ref){
  const t=BT[type],fr=buildSAT(i=>cellFree(i,dt)?0:1),bx=ref.cell%N,by=(ref.cell/N)|0,c=[];
  for(let y=0;y<=N-t.h;y+=2)for(let x=0;x<=N-t.w;x+=2){if(rect(fr,x,y,t.w,t.h))continue;c.push([(x-bx)**2+(y-by)**2,x,y]);}
  c.sort((a,b)=>a[0]-b[0]);
  for(const [,x,y] of c.slice(0,10)){const r=autoRot(type,x,y);if(r>=0)return {x,y,r};}
  return null;
}
function farmTick(){
  for(const b of buildings.values())if(b.type==='farm'&&b.state==='site')return;
  if(uncommitted('wood')<BT.farm.cost.wood||Math.random()>0.5)return;
  let hh=null,hm=2;
  for(const h of buildings.values())if(h.type==='house'&&h.state==='done'&&!h.farm&&h.members.length>hm){hh=h;hm=h.members.length;}
  if(!hh)return;
  const best=siteSearch('farm',2,hh);
  if(!best)return;
  const f=addBuilding('farm',best.x,best.y,false,{owner:hh.id,rot:best.r});hh.farm=f.id;
}
// v36: il recinto dell'ovile è la zona Pascolo contigua all'ovile (impronta compresa): la staccionata ne segue il contorno e le pecore restano dentro
const PEN_FREE=90;
function buildPen(b){
  const seen=new Set(),q=[],pen=[],free=[];
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){const i=y*N+x;seen.add(i);q.push(i);pen.push(i);}
  for(let k=0;k<q.length&&free.length<PEN_FREE;k++){
    const i=q[k],x=i%N,y=(i/N)|0;
    for(let d=0;d<4&&free.length<PEN_FREE;d++){
      const nx=x+GX[d],ny=y+GY[d];if(nx<0||ny<0||nx>=N||ny>=N)continue;
      const j=ny*N+nx;if(seen.has(j))continue;seen.add(j);
      if(!cellFree(j,5))continue;
      pen.push(j);free.push(j);q.push(j);
    }
  }
  b.pen=pen;b.fields=free;
}
function sheepTick(){
  for(const b of buildings.values())if(b.type==='sheepfold'&&b.state==='site')return;
  if(uncommitted('wood')<BT.sheepfold.cost.wood||Math.random()>0.5)return;
  const hs=[...buildings.values()].filter(h=>h.type==='house'&&h.state==='done');
  const n=countDone('sheepfold');if(n>=Math.max(1,Math.floor(hs.length/8)))return;
  let hh=null,hm=1;for(const h of hs)if(!h.ovile&&h.level>=2&&h.members.length>hm){hh=h;hm=h.members.length;}
  if(!hh)return;
  const best=siteSearch('sheepfold',5,hh);
  if(!best)return;
  const f=addBuilding('sheepfold',best.x,best.y,false,{owner:hh.id,rot:best.r});hh.ovile=f.id;
}
// ---- ospiti della locanda ----
function endGuest(g){
  if(g.res){const inn=buildings.get(g.inn);if(inn){inn.guestsIn=Math.max(0,inn.guestsIn-1);if(g.horse)inn.horses=Math.max(0,inn.horses-1);}g.res=false;}
  const i=guests.indexOf(g);if(i>=0)guests.splice(i,1);hooks.gone(g);
}
function settleG(g){
  if(S.edicts.noImmig||S.edicts.quarantine)return false;
  let pk=null,ps=-1e9;
  for(const b of buildings.values())if(b.type==='house'&&b.state==='done'&&roomFor(b)&&b.attr>-4.5){const sc=b.attr+(capOf(b)-b.members.length)*0.3+lone(b)+b.well*0.01;if(sc>ps){ps=sc;pk=b;}}
  if(!pk)return false;
  const v=addVillager(g.x,g.z,22+Math.random()*16);v.home=pk.id;pk.members.push(v.id);S.settled++;
  logV(v,'Viandante ospitato alla locanda: ha deciso di fermarsi in paese.');
  tell('settle','Un viandante ospitato alla locanda ha deciso di fermarsi in paese: una nuova famiglia!');
  endGuest(g);return true;
}
function startLeave(g,mayStay){
  const inn=buildings.get(g.inn);
  if(g.res){if(inn){inn.guestsIn=Math.max(0,inn.guestsIn-1);if(g.horse)inn.horses=Math.max(0,inn.horses-1);}g.res=false;}
  if(mayStay&&Math.random()<(g.kind==='pilgrim'?0.4:g.kind==='craftsman'?0.3:0.1)&&settleG(g))return;
  const p=astar(g.cell,g.exit,0);if(!p){endGuest(g);return;}
  g.path=p;g.state='gLeave';g.inside=false;
}
function payG(g){
  if(g.kind==='merchant'){const r=['wood','stone','iron'][(Math.random()*3)|0];S.stock[r]+=Math.min(3,stockRoom(r));tell('merch','Un mercante ha pagato il pasto con merci: legno, pietra o ferro per il villaggio.');}
  else if(g.kind==='craftsman'){S.stock.stone+=Math.min(2,stockRoom('stone'));}
}
function updG(g,dt){
  const inn=buildings.get(g.inn);
  if(!inn&&g.state!=='gLeave'){startLeave(g,false);return;}
  switch(g.state){
    case 'gToInn':if(moveV(g,dt)){g.inside=true;g.state='gEat';g.timer=6;if(inn.pantry>=1)inn.pantry--;else g.hungry=true;if(g.sick&&!S.plague.on&&!S.edicts.quarantine&&villagers.length>=8)startPlague('viandante');}break;
    case 'gEat':g.timer-=dt;if(g.timer<=0){if(g.hungry){tell('hungryG','Un viandante è ripartito a stomaco vuoto: la dispensa della locanda è vuota.');startLeave(g,false);break;}S.visits++;payG(g);g.state='gStay';g.timer=g.stay==='meal'?14:0;}break;
    case 'gStay':
      if(g.stay==='meal'){g.timer-=dt;if(g.timer<=0)startLeave(g,true);}
      else{if(S.ph==='night')g.slept=true;if(g.slept&&S.ph==='work')startLeave(g,true);}
      break;
    case 'gLeave':if(moveV(g,dt))endGuest(g);break;
  }
}
function spawnGuest(){
  if(S.edicts.quarantine)return;
  if(guests.length>=5||(S.ph!=='work'&&S.ph!=='evening'))return;
  const inns=[...buildings.values()].filter(b=>b.type==='inn'&&b.state==='done'&&b.pantry>=2&&b.guestsIn<4);
  if(!inns.length)return;
  const inn=inns[(Math.random()*inns.length)|0];
  const r=Math.random(),kind=r<0.45?'merchant':r<0.75?'pilgrim':'craftsman';
  const horse=kind==='merchant'&&inn.horses<3;
  let cell=-1;for(let k=0;k<8&&cell<0;k++){const y=((14+Math.random()*36)*SC)|0,c=y*N;if(!water[c]&&!occ[c])cell=c;}
  if(cell<0)return;
  const path=astar(cell,inn.cell,inn.id);if(!path)return;
  const g={id:nextId++,guest:true,kind,horse,inn:inn.id,x:cx2w(0),z:cy2w((cell/N)|0),cell,exit:cell,path,state:'gToInn',stay:S.ph==='evening'?'night':'meal',timer:0,moving:false,inside:false,fa:0,carry:null,res:true,hungry:false,slept:false,sick:villagers.length>=14&&Math.random()<0.05};
  inn.guestsIn++;if(horse)inn.horses++;
  guests.push(g);hooks.villager(g);
}
function finish(b){
  b.state='done';b.prog=1;acc.attr=99;stCache=null;
  if(b.type==='house')for(const v of villagers)if(!v.home&&b.members.length<capOf(b)&&!v.job){v.home=b.id;b.members.push(v.id);}
  if(b.type==='farm'){
    const cand=[];
    for(let y=b.y-6;y<b.y+b.h+6;y++)for(let x=b.x-6;x<b.x+b.w+6;x++){
      if(x<0||y<0||x>=N||y>=N)continue;const i=y*N+x;if(cellFree(i,2))cand.push([Math.hypot(x-b.x-b.w/2,y-b.y-b.h/2),i]);
    }
    cand.sort((a,c)=>a[0]-c[0]);
    for(const [,i] of cand.slice(0,81)){field[i]=b.id;b.fields.push(i);}
    tell('farm','Una famiglia ha fondato una fattoria nella zona agricola.');
  }
  if(b.type==='sheepfold'){
    buildPen(b);
    tell('sheep',b.owner?'Una famiglia ha fondato un ovile nella zona di pascolo: la zona è chiusa da un recinto e la lana serve ai tessitori.':'L\'ovile è pronto: la zona Pascolo intorno è chiusa da un recinto e le pecore restano lì dentro.');
  }
  if(b.type==='inn')tell('inn0','La locanda è pronta: serve un oste, e le famiglie con cibo in più lo porteranno alla dispensa. Arriveranno viandanti.');
  if(b.type==='store')tell('store','Il nuovo magazzino ha bisogno di tre addetti.');
  if(b.type==='forester')tell('forester','Il guardaboschi pianta alberi nelle zone forestali: tra poco saranno pronti da tagliare.');
  if(b.type==='mill'&&!countDone('granary'))tell('mill','Il mulino macina il grano del granaio: serve un granaio perché le fattorie portino il grano in eccedenza.');
  if(b.type==='infirmary')tell('inf0','L\'ospizio è pronto: serve un erborista. Cura i malati entro 45 celle: guariscono prima e rischiano meno.');
  if(b.type==='cemetery'&&S.unburied>0){S.buried+=S.unburied;S.unburied=0;tell('burial','Il cimitero accoglie i defunti rimasti nei campi: la zona torna più serena.');}
  hooks.done(b);
}
// CAP (v29) = posti delle case + bonus di attrattiva. Attrattiva A = (felicità media/100) / (1 + adulti senza lavoro/ATT_U):
// direttamente proporzionale alla felicità, inversamente al numero di adulti non impiegati (né in un mestiere né in servizio). Bonus = A * ATT_K * posti delle case.
const ATT_U=10,ATT_K=0.3;
function attractTick(capD){
  let n=0,js=0,un=0;
  for(const v of villagers){n++;js+=v.joy;if(!v.child&&!v.ill&&!v.job&&!v.duty)un++;}
  const joy=n?js/n:50,a=(joy/100)/(1+un/ATT_U);
  S.att={joy,unemp:un,a,bonus:Math.floor(a*ATT_K*capD)};
}
function tick1(){
  updClock();
  if(acc.attr>=3){acc.attr=0;computeAttr();}
  for(let i=0;i<N*N;i++)if(sap[i]&&S.season!==3){sapT[i]+=1;if(sapT[i]>=SAPLING_T){sap[i]=0;tree[i]=1;hooks.trees();hooks.saps();}}
  lifeTick();
  diseaseTick();
  dutyPass();
  festTick();
  assignJobs();
  for(const b of buildings.values())if(b.type==='school')b.pupils=0;
  for(const v of villagers)if(v.sch&&(v.state==='learn'||v.state==='toSchool')){const sb=buildings.get(v.sch);if(sb)sb.pupils=(sb.pupils|0)+1;}
  for(const r of ['wood','stone','iron'])S.wh[r]=Math.max(0,Math.min(S.wh[r],S.stock[r],capSec(r)));
  let capD=0,capP=0,pend=0,hungry=0,nh=0;
  for(const b of buildings.values()){
    if(b.type==='house'){
      if(b.state==='done'){capD+=capOf(b);houseTick(b);nh++;if(b.hungry>=30)hungry++;}else{capP+=3;pend++;}
    }
    if(b.type==='farm'&&b.state==='done'&&b.owner){
      const h=buildings.get(b.owner);
      if(h){let cur=0;for(const id of h.members){const v=vmap.get(id);if(v&&v.job===b.id)cur++;}
        if(cur<(h.members.length>=4?2:1)){const m=freeMember(h)||dutyIdle(h);if(m){setJob(m,b);m.duty=false;}}}
    }
    if(b.type==='sheepfold'&&b.state==='done'&&b.owner){
      const h=buildings.get(b.owner);
      if(h){let cur=0;for(const id of h.members){const v=vmap.get(id);if(v&&v.job===b.id)cur++;}
        if(cur<1){const m=freeMember(h);if(m)setJob(m,b);}}
    }
  }
  for(const b of buildings.values())if(b.type==='store'&&b.center&&b.state==='done'){
    const st=nh>=12?2:nh>=5?1:0;if(st!==b.stage){b.stage=st;hooks.upgraded(b);}
  }
  if(capD+capP<villagers.length+3&&pend<2)trySpawnHouse();
  marketTick();
  if(countDone('inn')&&Math.random()<0.06)spawnGuest();
  acc.farm+=1;if(acc.farm>=5){acc.farm=0;farmTick();sheepTick();}
  S.grow+=TK;
  let openSlots=0;for(const b of buildings.values())if(b.state==='done')openSlots+=b.want-b.workers.length;
  attractTick(capD);
  if(!S.edicts.noImmig&&!S.edicts.quarantine&&villagers.length<capD+S.att.bonus&&hungry*2<=nh&&S.grow>=(openSlots>0?9:16)){
    let pk=null,ps=-1e9;
    // chi arriva preferisce le case vicine ai posti di lavoro liberi e ai servizi
    const openB=[...buildings.values()].filter(x=>x.state==='done'&&BT[x.type].slots>0&&x.workers.length<x.want);
    const imm=b=>{let d=80;for(const o of openB){const q=cellDist(b.cell,o.cell);if(q<d)d=q;}return -d*0.04+(b.flags.water?0.8:0)+(b.level>=2&&b.flags.church?0.6:0);};
    for(const b of buildings.values())if(b.type==='house'&&b.state==='done'&&roomFor(b)&&b.attr>-4.5){
      const sc=b.attr+(capOf(b)-b.members.length)*0.3+lone(b)+b.well*0.01+imm(b);if(sc>ps){ps=sc;pk=b;}
    }
    // case piene: chi arriva per attrattiva (oltre i posti delle case) si adatta in una casa già occupata, ma sovraffollata (max +2)
    if(!pk&&villagers.length>=capD)for(const b of buildings.values())if(b.type==='house'&&b.state==='done'&&b.members.length<capOf(b)+2&&b.attr>-4.5){
      const sc=b.attr+(capOf(b)-b.members.length)*0.3+lone(b)+b.well*0.01+imm(b);if(sc>ps){ps=sc;pk=b;}
    }
    if(pk){S.grow=0;const v=addVillager(cx2w(pk.door%N),cy2w((pk.door/N)|0),18+Math.random()*18);v.home=pk.id;pk.members.push(v.id);logV(v,'Arriva in paese in cerca di casa e lavoro.');}
    else tell('noisy','Nessuno vuole trasferirsi nelle case più rumorose: costruisci pozzi, mercati o chiese per rendere le zone più attraenti.');
  }
}
// Ogni mezzo secondo: i livelli dei sentieri scaduti scendono di uno (e ripartono con la durata del livello inferiore). Le strade tracciate dal giocatore si consumano molto lentamente e, esaurite, tornano sentiero di livello 4.
function decay(){
  let any=false;const now=S.t;
  for(let i=0;i<N*N;i++){
    if(road[i]){const nw=wear[i]-0.0015;wear[i]=nw;if(nw<ROADT){road[i]=0;wear[i]=0;plev[i]=MAXP;phit[i]=0;pexp[i]=now+DUR[MAXP];any=true;}continue;}
    const L=plev[i];
    if(L>0&&now>=pexp[i]){const nl=L-1;plev[i]=nl;phit[i]=0;pexp[i]=nl>0?now+DUR[nl]:0;any=true;}
  }
  if(any)hooks.ground();
}
function step(dt){
  S.t+=dt;
  const bc={},bm={};for(const v of villagers)if(v.state==='build'){bc[v.target]=(bc[v.target]||0)+1;const jb=v.job&&buildings.get(v.job);if(jb&&jb.type==='mason')bm[v.target]=1;}
  for(const b of buildings.values()){
    if(b.state!=='site')continue;const t=BT[b.type];
    const nb=bc[b.id]||0;
    // v32: i muratori (addetti della bottega del muratore) costruiscono il 60% più in fretta
    if(nb>0&&siteReady(b)){b.prog+=dt/t.time*[0,1,1.7,2.2][Math.min(3,nb)]*(bm[b.id]?1.6:1);if(b.prog>=1)finish(b);}
  }
  for(const v of villagers)updV(v,dt);
  for(const g of guests.slice())updG(g,dt);
  acc.a05+=dt;if(acc.a05>=0.5){acc.a05-=0.5;decay();}
  acc.a1+=dt;if(acc.a1>=1){acc.a1-=1;acc.attr+=1;tick1();}
}
function roleText(v){
  if(v.ill&&(v.state==='sleep'||v.state==='eat'||v.state==='wait'||v.state==='idle'))return 'Malato ('+DIS[v.ill.k].n.toLowerCase()+'): a letto';
  switch(v.state){
    case 'sleep':return 'Riposa a casa';
    case 'eat':return 'Mangia a casa';
    case 'toHomeLife':return v.ill?'Torna a casa, malato':v.next==='eat'?'Torna a casa per il pasto':'Torna a casa';
    case 'toWell':case 'draw':return "Prende l'acqua al pozzo";
    case 'toChurch':case 'pray':return 'Prega in chiesa';
    case 'toFest':case 'fest':return 'Alla festa di paese';
    case 'toHelp':case 'helpTend':return "Aiuta un'altra famiglia";
    case 'toCollect':case 'toStoreC':return 'Porta i materiali al magazzino';
    case 'toStore':return v.task?'Va al magazzino a prendere '+(v.task.res==='stone'?'la pietra':'il legno')+' per il cantiere':'Va al magazzino a prendere i materiali';
    case 'toSite':return v.task?'Porta '+(v.task.res==='stone'?'la pietra':'il legno')+' al cantiere':'Porta i materiali al cantiere';
    case 'toStall':case 'keep':return 'Mercante al banco';
    case 'toMarket':return 'Baratta al mercato';
    case 'toHomeT':return v.cargo?'Torna col baratto':'Torna dal mercato';
    case 'toErr':case 'doErr':case 'toHomeErr':{const k=v.err&&v.err.kind;
      return k==='merc'?('Compra '+(GN[v.err.g]||'merce')+' alla merceria'):k==='wool'?'Ritira la lana all\'ovile':k==='cloth'?'Compra tessuto dal tessitore':k==='fish'?'Pesca':k==='hunt'?'Va a caccia':k==='iron'?'Ritira il ferro al magazzino':k==='flour'?'Ritira la farina al mulino':'Raccoglie legna da ardere';}
    case 'toPlant':case 'plant':return 'Pianta alberi';
    case 'toMill':case 'mill':return 'Macina il grano';
    case 'toShop':case 'shop':{const jb=v.job&&buildings.get(v.job);return jb&&TRADENAME[jb.type]?TRADENAME[jb.type][0].toUpperCase()+TRADENAME[jb.type].slice(1)+' al lavoro':'Al lavoro in bottega';}
    case 'toDeliver':{const mh=v.cargo&&buildings.get(v.cargo.h);return mh&&mh.type==='mercery'?'Porta la merce alla merceria':'Porta la merce alle famiglie';}
    case 'toStockG':{const sb=v.cargo&&buildings.get(v.cargo.s);return sb&&sb.type==='granary'?'Porta le scorte al granaio':'Porta le scorte al magazzino';}
    case 'toGranary':return 'Porta il grano al granaio';
    case 'toGraze':case 'graze':return 'Porta le pecore al pascolo';
    case 'toSupply':return 'Compra cibo per la locanda';
    case 'toInnSup':return 'Porta il cibo alla locanda';
    case 'toStoreSleep':return 'Cerca un riparo per la notte';
    case 'toSchool':case 'learn':return 'A scuola';
    case 'toCenterT':case 'toWhT':return 'Porta i materiali dal centro al magazzino';
  }
  if(v.child)return v.age<6?'Gioca in giardino':'Gioca';
  const b=v.job&&buildings.get(v.job);
  if(b){const R={school:'Maestro',inn:'Oste',sheepfold:'Pastore',wood:'Taglialegna',quarry:'Cavatore',mine:'Minatore',forester:'Guardaboschi',mill:'Mugnaio',farm:'Contadino',store:'Magazziniere',infirmary:'Erborista',carpenter:'Falegname',mason:'Muratore',smithy:'Fabbro',bakery:'Panettiere',weaver:'Tessitore',tailor:'Sarto',fisher:'Pescatore',hunter:'Cacciatore',tavern:'Taverniere',hall:'Musicante',mercery:'Merciaio'};if(R[b.type])return R[b.type];}
  const h=v.home&&buildings.get(v.home);
  if(h){if(h.tailor)return 'Sarto';if(h.weave)return 'Tessitore';if(h.bake)return 'Panettiere';if(h.craft)return 'Artigiano';return h.crop==='veg'?"Cura l'orto":h.crop==='eggs'?'Alleva galline':h.crop==='wood'?'Raccoglie legna da ardere':'Alleva maiali e pecore';}
  return 'In cerca di una casa';
}
function stats(){
  let houses=0,sites=0,slots=0,cap=0,food=0,farms=0,stalls=0,hungry=0,asum=0,amax=-99,herds=0,crafters=0,bakers=0,fishers=0,hunters=0,tools=0,weavers=0,tailors=0,clothes=0,wsum=0,fire=0,fireNeed=0;const built={},levels=[0,0,0,0,0,0];
  for(const b of buildings.values()){
    if(b.state==='done'){
      built[b.type]=(built[b.type]||0)+1;
      if(b.type==='house'){houses++;cap+=capOf(b);levels[b.level]++;if(b.hungry>=30)hungry++;for(const tp of TYPES)food+=b.goods[tp];asum+=b.attr;if(b.attr>amax)amax=b.attr;wsum+=b.well;fire+=b.goods.firewood;fireNeed+=fuelNeed();
        if(b.crop==='herd')herds++;if(b.craft)crafters++;if(b.bake)bakers++;if(b.side==='fish')fishers++;if(b.side==='hunt')hunters++;tools+=b.goods.tools;if(b.weave)weavers++;if(b.tailor)tailors++;clothes+=b.goods.clothes;}
      else if(b.type==='sheepfold'){slots+=1;}
      else if(b.type==='farm'){farms++;slots+=2;}
      else if(b.type==='stall'){if(b.open)stalls++;}
      else slots+=b.want;
    }else sites++;
  }
  let masters=0,skSum=0,skN=0;for(const v of villagers){const l=jobSkill(v);if(v.job){skN++;skSum+=l;if(l>=SKMAX)masters++;}}
  let far=0,cdSum=0,cdN=0;for(const v of villagers){const cd=commuteOf(v);if(cd>0){cdN++;cdSum+=cd;if(cd>COMMUTE_OK)far++;}}
  let kids=0,schooled=0,sick=0,plagueN=0,pupils=0;for(const v of villagers){if(v.child)kids++;if(v.schooled)schooled++;if(v.ill){sick++;if(v.ill.k==='plague')plagueN++;}if(v.state==='learn')pupils++;}
  let roads=0,saps=0;const dc=[0,0,0,0,0,0];for(let i=0;i<N*N;i++){roads+=road[i];dc[dist[i]]++;saps+=sap[i];}
  for(let k=0;k<6;k++)dc[k]=Math.round(dc[k]/9);roads=Math.round(roads/SC);
  let jobs=0;for(const v of villagers)if(v.job)jobs++;
  return {pop:villagers.length,jobs,slots,masters,avgSkill:skN?skSum/skN:0,far,avgCommute:cdN?cdSum/cdN:0,commuters:cdN,houses,cap:cap+S.att.bonus,capHouses:cap,capBonus:S.att.bonus,att:S.att,sites,roads,dc,built,levels,food,farms,stalls,hungry,barters:S.barters,helps:S.helps,stock:S.stock,capRes:capTotal(),capStone:capRes('stone'),capGrain:capGrain(),capFlour:capFlour(),
    avgAttr:houses?asum/houses:0,maxAttr:houses?amax:0,day:S.day,ph:S.ph,f:S.f,herds,crafters,bakers,fishers,hunters,tools,saps,weavers,tailors,clothes,season:S.season,year:S.year,visits:S.visits,settled:S.settled,guests:guests.length,children:kids,schooled,births:S.births,deaths:S.deaths,buried:S.buried,
    sick,plagueN,plague:S.plague.on,avgWell:houses?wsum/houses:0,avgJoy:villagers.length?villagers.reduce((a,v)=>a+v.joy,0)/villagers.length:0,unhappy:villagers.filter(v=>v.joy<35).length,left:S.left,fire,fireNeed,inherits:S.inherits,cured:S.cured,moves:S.moves,deathsBy:S.deathsBy,pupils};
}
// ---- v40: salvataggio e caricamento della partita ----
// exportState() restituisce un oggetto pronto per JSON.stringify (da serializzare subito: contiene riferimenti allo stato vivo).
// importState(d) ricostruisce la partita: valida e decodifica tutto PRIMA di toccare lo stato, così un salvataggio rovinato non rovina la partita in corso.
// Compatibilità: SAVE_FMT cambia solo se il formato diventa illeggibile dalle versioni precedenti; i campi nuovi si aggiungono con un valore di riserva in importState.
const SAVE_FMT=1;
const SAVE_GRIDS={tree,rock,ore,water,sap,road,dist,occ,field,door,cen,gate,wear,sapT,plev,phit,pexp};
function b64enc(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function b64dec(str){const s=atob(str),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
// griglie: compressione a run (lunghezza,byte) sui byte grezzi, poi base64
function packGrid(a){const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),out=[];let i=0;while(i<u.length){const v=u[i];let r=1;while(r<255&&i+r<u.length&&u[i+r]===v)r++;out.push(r,v);i+=r;}return b64enc(Uint8Array.from(out));}
function unpackGrid(a,str){const p=b64dec(str),u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let o=0;for(let i=0;i+1<p.length;i+=2){const r=p[i];if(r===0||o+r>u.length)throw new Error('griglia rovinata');u.fill(p[i+1],o,o+r);o+=r;}if(o!==u.length)throw new Error('griglia rovinata');}
function exportState(){
  const grids={};for(const k in SAVE_GRIDS)grids[k]=packGrid(SAVE_GRIDS[k]);
  return {fmt:SAVE_FMT,seed,nextId,S,acc,told,gated:[...gatedSet],reg:[...reg.entries()],resv:[...resv.entries()],plantResv:[...plantResv],guests,buildings:[...buildings.values()],villagers,grids};
}
function importState(d){
  const bad=m=>{throw new Error('Salvataggio non valido: '+m);};
  if(!d||typeof d!=='object')bad('dati assenti');
  if(d.fmt!==SAVE_FMT)bad(d.fmt>SAVE_FMT?'creato da una versione più recente del gioco':'formato sconosciuto');
  for(const k of ['buildings','villagers','guests','gated','reg','resv','plantResv'])if(!Array.isArray(d[k]))bad('manca '+k);
  if(!d.S||typeof d.S!=='object'||!d.acc||!d.told||!d.grids||typeof d.grids!=='object')bad('struttura incompleta');
  if(!Number.isFinite(d.seed)||!Number.isFinite(d.nextId))bad('numeri non validi');
  const tmp={};
  for(const k in SAVE_GRIDS){if(typeof d.grids[k]!=='string')bad('manca la griglia '+k);tmp[k]=new SAVE_GRIDS[k].constructor(N*N);try{unpackGrid(tmp[k],d.grids[k]);}catch(e){bad('griglia '+k+' rovinata');}}
  const cp=x=>JSON.parse(JSON.stringify(x));
  const bl=cp(d.buildings),vl=cp(d.villagers),gl=cp(d.guests),Sx=cp(d.S),ac=cp(d.acc),tl=cp(d.told),ga=cp(d.gated),rg=cp(d.reg),rv=cp(d.resv),pr=cp(d.plantResv);
  const ids=new Set();
  for(const b of bl){if(!b||!Number.isInteger(b.id)||!BT[b.type]||!Number.isFinite(b.x)||!Number.isFinite(b.y)||ids.has(b.id))bad('edificio non valido');ids.add(b.id);}
  for(const v of vl){if(!v||!Number.isInteger(v.id)||!Number.isFinite(v.x)||!Number.isFinite(v.z)||ids.has(v.id))bad('abitante non valido');ids.add(v.id);}
  for(const g of gl){if(!g||!Number.isInteger(g.id)||!Number.isFinite(g.x)||!Number.isFinite(g.z)||ids.has(g.id))bad('viandante non valido');ids.add(g.id);}
  for(const i of ids)if(i>=d.nextId)bad('numerazione incoerente');
  if(typeof Sx.stock!=='object'||!Sx.stock||!Number.isFinite(Sx.t))bad('stato del borgo incompleto');
  // --- da qui lo stato cambia: la grafica viene svuotata e poi ricostruita dagli hook
  for(const b of buildings.values())hooks.removed(b);
  for(const v of villagers)hooks.gone(v);
  for(const g of guests)hooks.gone(g);
  for(const k in SAVE_GRIDS)SAVE_GRIDS[k].set(tmp[k]);
  seed=d.seed;for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0;jit[i]=hash(x,y+500)*0.15;}
  for(const k of Object.keys(S))delete S[k];
  Object.assign(S,Sx);
  S.edicts=Object.assign(EDICT0(),S.edicts);S.stock=Object.assign({wood:0,stone:0,iron:0,grain:0,flour:0,planks:0,tools:0,cloth:0,clothes:0,bread:0,fish:0,meat:0},S.stock);
  for(const k of ['wh','xf','inflight'])S[k]=Object.assign({wood:0,stone:0,iron:0},S[k]);
  S.mode=S.mode==='river'?'river':'lake';
  for(const k of Object.keys(acc))delete acc[k];Object.assign(acc,{a1:0,a05:0,farm:0,attr:99},ac);
  for(const k of Object.keys(told))delete told[k];Object.assign(told,tl);
  gatedSet.clear();for(const i of ga)gatedSet.add(i);
  reg.clear();for(const [k,r] of rg)reg.set(k,r);
  resv.clear();for(const [k,r] of rv)resv.set(k,r);
  plantResv.clear();for(const i of pr)plantResv.add(i);
  buildings.clear();for(const b of bl)buildings.set(b.id,b);
  villagers=vl;vmap.clear();for(const v of vl)vmap.set(v.id,v);
  guests.length=0;for(const g of gl)guests.push(g);
  nextId=d.nextId;stCache=null;connCache.clear();connStamp=-1;occStamp++;
  festSeq=0;for(const b of buildings.values())if(b.fest&&b.fest.seq>festSeq)festSeq=b.fest.seq;for(const v of villagers)if(v.festSeq>festSeq)festSeq=v.festSeq;
  computeAttr();
  for(const b of buildings.values())hooks.building(b);
  for(const v of villagers)hooks.villager(v);
  for(const g of guests)hooks.villager(g);
  hooks.trees();hooks.rocks();hooks.saps();hooks.ground();
}
return {SAVE_FMT,exportState,importState,SHAPE_NAME,diagVal,setEdict,addCemetery,AGEY,YEARL,setZone,ZONED,SC,ROTD,dimsOf,entranceOf,inHouse,UPC,SEASONS,SEASON_DAYS,canDemolish,N,CS,W,BT,PATH,ROADT,S,GN,TYPES,TRADE,CAPS,LVNAME,MAXLV,QUAL5,WELL_R,CHURCH_R,SCHOOL_R,HEAL_R,DAY,STORE_CAP,BUFCAP,SAPLING_T,SCHOOL_CAP,hooks,init,step,canPlace,afford,place,demolishAt,removeBuilding,paintDistrict,paintRoad,setWant,stats,roleText,attrLabel,hash,cx2w,cy2w,
  reg,DIS,TRADENAME,TRAITS,needsOf,commuteOf,COMMUTE_OK,skLevel,SKNAME,XPL,SKMAX,fuelNeed,dateStr,
  WS,PROD,FUN,OUTCAP,PLANK_CAP,SHELFCAP,MERC,costOf,siteReady,FEST,callFest,cancelFest,
  STORE_KEYS,GRAN_KEYS,GRAN_TOTAL,CENTER_CAP,setPolicy,storeInfo,stockRoom,capRes,
  _t:{chooseTier,startPlague,fallIll,killV,tick1,addVillager,addBuilding,vmap,buildings:()=>buildings},
  grids:{tree,rock,ore,water,sap,sapT,road,dist,occ,wear,plev,field,door,attr,cen},guests:()=>guests,buildings:()=>buildings,villagers:()=>villagers};
})();
if(typeof module!=='undefined')module.exports=Sim;
