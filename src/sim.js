const Sim=(function(){
'use strict';
// v77: la mappa è di 128×128 tile (era 64×64); dalla v79 il giocatore può scegliere la mappa normale (64×64) dal menu (`bv_mt` in localStorage, il gioco si ricarica). Nei test su Node (senza browser) resta di 64×64, così le coordinate fisse dei vecchi test valgono ancora:
// con BV_MT=128 anche i test usano la mappa grande (tests/mappe.js, falde.js, mare.js e grande.js lo fanno). W cresce con la mappa: una cella misura sempre 2/3 di unità.
const SC=3,MT=(typeof process!=='undefined'&&process.versions&&process.versions.node)?(+process.env.BV_MT||64):(()=>{try{return localStorage.getItem('bv_mt')==='64'?64:128;}catch(e){return 128;}})(),CT=MT/2,CEN=CT*SC,N=MT*SC,W=MT*2,CS=W/N;
// Sentieri a livelli (v19): 0 erba, 1-3 terreno che si scolorisce, 4 sentiero vero. NEEDP[L] = passaggi necessari nella finestra del livello L per salire a L+1; DUR[L] = secondi di durata del livello L prima di scendere a L-1.
const PATH=3,ROADT=20,WMAX=28,MAXP=4,NEEDP=[1,2,4,8],DUR=[0,20,40,80,240],PCOST=[1,0.92,0.8,0.62,0.5],PSPD=[1,1.04,1.1,1.2,1.25];
// v26: il giorno dura DAY secondi (era 100). TK riporta ai ritmi 'per giorno' di prima i fenomeni calcolati a ogni secondo (produzione, malattie, rischi, immigrazione).
// v58: il giorno dura 300 s (era 150) ma la notte resta di 27 s (9 dopo la mezzanotte + 18 prima): in percentuale è il 9% del giorno invece del 18%. Le ore del giorno si ridistribuiscono sui 273 s restanti (tabella TL più sotto).
const DAY=300,DK=DAY/100,TK=100/DAY,STORE_CAP=1000,CENTER_CAP=80,BUFCAP=8,GRAIN_CAP=1000,FLOUR_CAP=40,SAPLING_T=140;
const TYPES=['veg','eggs','grain','fish','meat','game','bread'];
const GN={veg:'ortaggi',eggs:'uova',grain:'grano',fish:'pesce',meat:'carne',game:'selvaggina',bread:'pane',firewood:'legna da ardere',tools:'attrezzi',iron:'ferro',flour:'farina',wool:'lana',cloth:'tessuto',clothes:'abiti'};
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
  mill:{name:'Mulino',w:6,h:6,cost:{wood:10,stone:5,planks:4,lime:3},time:12,slots:2,want:1},
  inn:{name:'Locanda',w:9,h:6,cost:{wood:14,stone:8,planks:6},time:14,slots:2,want:1},
  // v32: ovile costruibile dal giocatore, con pastori (gli ovili fondati dalle famiglie restano senza addetti propri: li servono i membri della casa)
  sheepfold:{name:'Ovile',w:6,h:6,cost:{wood:8,stone:0},time:9,slots:2,want:1},
  // v32: edifici di lavoro. Ogni addetto compie cicli di WS[tipo].t secondi: una bottega vera rende più della bottega di un giardino.
  carpenter:{name:'Falegnameria',w:6,h:6,cost:{wood:10,stone:2},time:10,slots:3,want:2},
  mason:{name:'Bottega del muratore',w:6,h:6,cost:{wood:8,stone:8},time:12,slots:3,want:2},
  smithy:{name:'Fucina del fabbro',w:6,h:6,cost:{wood:10,stone:2,planks:2,bricks:6},time:12,slots:2,want:1},
  bakery:{name:'Forno del panettiere',w:6,h:6,cost:{wood:10,stone:2,planks:2,bricks:6},time:12,slots:2,want:1},
  weaver:{name:'Telaio del tessitore',w:6,h:6,cost:{wood:10,stone:4,planks:2},time:11,slots:2,want:1},
  tailor:{name:'Sartoria',w:6,h:6,cost:{wood:10,stone:4,planks:2},time:11,slots:2,want:1},
  retting:{name:'Maceratoio',w:6,h:6,cost:{wood:10,stone:4,planks:0},time:9,slots:2,want:1,need:'water'},
  ropewalk:{name:'Cordaio',w:6,h:6,cost:{wood:10,stone:2,planks:2},time:10,slots:2,want:1},
  dyehouse:{name:'Tintoria',w:6,h:6,cost:{wood:10,stone:4,planks:2},time:10,slots:2,want:1,need:'water'},
  charcoal:{name:'Carbonaia',w:6,h:6,cost:{wood:10,stone:2,planks:0},time:8,slots:2,want:1,need:'forest'},
  smelter:{name:'Fonderia',w:6,h:6,cost:{wood:8,stone:4,planks:2,bricks:8,lime:2},time:11,slots:2,want:1},
  claypit:{name:"Cava d'argilla",w:6,h:6,cost:{wood:10,stone:2},time:8,slots:2,want:1,need:'water'},
  brickworks:{name:'Fornace',w:6,h:6,cost:{wood:12,stone:10,planks:2},time:11,slots:2,want:1},
  limekiln:{name:'Calcinaio',w:6,h:6,cost:{wood:10,stone:10},time:10,slots:2,want:1},
  saltworks:{name:'Salina',w:6,h:6,cost:{wood:10,stone:4,bricks:4},time:9,slots:2,want:1,need:'water'},
  butcher:{name:'Bottega del macellaio',w:6,h:6,cost:{wood:12,stone:4,planks:2},time:10,slots:2,want:1},
  smokehouse:{name:'Affumicatoio',w:6,h:6,cost:{wood:14,stone:6,bricks:4},time:11,slots:2,want:1},
  dairy:{name:'Caseificio',w:6,h:6,cost:{wood:12,stone:4,planks:2},time:11,slots:2,want:1},
  brewery:{name:'Birrificio',w:6,h:6,cost:{wood:14,stone:6,planks:4},time:12,slots:2,want:1},
  tannery:{name:'Conceria',w:6,h:6,cost:{wood:12,stone:4,bricks:4,lime:2},time:11,slots:2,want:1,need:'water'},
  cobbler:{name:'Bottega del calzolaio',w:6,h:6,cost:{wood:10,stone:2,planks:2},time:10,slots:2,want:1},
  winery:{name:'Cantina',w:6,h:6,cost:{wood:16,stone:6,planks:4,bricks:4,lime:2},time:13,slots:2,want:1},
  fisher:{name:'Capanna del pescatore',w:6,h:6,cost:{wood:8,stone:0},time:8,slots:2,want:1,need:'water'},
  hunter:{name:'Capanna del cacciatore',w:6,h:6,cost:{wood:8,stone:0},time:8,slots:2,want:1,need:'forest'},
  // v38: la Merceria vende i prodotti lavorati delle botteghe (attrezzi, pane, tessuto, abiti): le botteghe li portano qui, le famiglie vengono a prenderli
  mercery:{name:'Merceria',w:6,h:6,cost:{wood:10,stone:6,planks:4},time:12,slots:2,want:1},
  tavern:{name:'Taverna',w:9,h:6,cost:{wood:12,stone:8,planks:4},time:14,slots:2,want:1},
  taxoffice:{name:'Ufficio delle Tasse',w:6,h:6,cost:{wood:12,stone:8,planks:4},time:12,slots:1,want:1},
  hall:{name:'Sala delle feste',w:9,h:9,cost:{wood:14,stone:14,planks:6},time:18,slots:2,want:1},
  plaza:{name:'Piazza con fontana',w:9,h:9,cost:{wood:0,stone:14},time:10,slots:0,want:0},
  flowers:{name:'Aiuola',w:3,h:3,cost:{wood:2,stone:0},time:2,slots:0,want:0},
  statue:{name:'Statua',w:3,h:3,cost:{wood:0,stone:8},time:5,slots:0,want:0},
  school:{name:'Scuola',w:6,h:6,cost:{wood:14,stone:8,planks:4},time:14,slots:1,want:1},
  infirmary:{name:'Ospizio',w:6,h:6,cost:{wood:12,stone:8,planks:4},time:12,slots:1,want:1},
  // v65: il cerusico (barbiere-chirurgo medievale) cura i feriti; l'addetto deve aver frequentato la scuola (sa leggere e scrivere)
  surgeon:{name:'Bottega del cerusico',w:6,h:6,cost:{wood:14,stone:8,planks:4},time:12,slots:1,want:1},
  cemetery:{name:'Cimitero',w:9,h:4,cost:{wood:6,stone:10},time:12,slots:0,want:0},
  church:{name:'Chiesa',w:9,h:9,cost:{wood:10,stone:16,planks:8,lime:8},time:20,slots:0,want:0},
  // v55: tenda dei senza casa (la costruiscono da soli vicino al centro; si smonta, con metà dei materiali recuperati, quando la famiglia si trasferisce in una casa)
  tent:{name:'Tenda',w:2,h:2,cost:{wood:4,stone:0},time:6,slots:0,want:0,auto:true},
  well:{name:'Pozzo',w:2,h:2,cost:{wood:2,stone:6},time:6,slots:0,want:0},
  house:{name:'Casa',w:3,h:3,cost:{wood:4,stone:0},time:6,slots:0,want:0},
  farm:{name:'Fattoria',w:6,h:6,cost:{wood:8,stone:0},time:9,slots:0,want:0},
  stall:{name:'Banco del mercato',w:2,h:2,cost:{wood:0,stone:0},time:0,slots:0,want:0},
  // v48: difesa. La torre tira sui nemici entro TOWER_R celle (TOWER_DPS al secondo). v62: la caserma ha dei guerrieri (abitanti col mestiere di guerriero) che escono incontro ai nemici; armati con le armi del magazzino valgono 5/3 di un predone.
  watchtower:{name:'Torre di guardia',w:4,h:4,cost:{wood:22,stone:18},time:14,slots:0,want:0},
  barracks:{name:'Caserma',w:6,h:6,cost:{wood:26,stone:12,planks:4,bricks:6,lime:4},time:16,slots:3,want:2}
};
// attrattiva: [forza, raggio in celle]. Positivo = piacevole, negativo = rumore e disagio.
const ATTR={church:[4,36],tannery:[-3.5,24],well:[2.5,24],stall:[1.2,18],wood:[-3,24],quarry:[-4.5,33],mine:[-5,36],farm:[-1.5,18],forester:[0.6,18],granary:[-0.8,15],mill:[-1.5,21],inn:[1,21],sheepfold:[-0.8,15],school:[1,18],infirmary:[0.5,15],cemetery:[-0.5,15],plaza:[3.2,30],flowers:[0.9,12],statue:[2,21],carpenter:[-1.2,18],mason:[-1.2,18],smithy:[-1.8,21],bakery:[0.4,15],weaver:[-0.3,12],tailor:[0.2,12],mercery:[0.8,18],fisher:[-0.3,12],hunter:[-0.4,12],tavern:[1.6,24],hall:[2.6,30],taxoffice:[-0.5,15]};
ATTR.watchtower=[0.4,15];ATTR.barracks=[-0.6,15];ATTR.surgeon=[0.3,15];
const DECO={flowers:1,statue:1};
const NOGATE={house:1,stall:1,flowers:1,statue:1,plaza:1,well:1,cemetery:1,tent:1};
// Tempo (v20): 1 anno di vita = AGEY secondi; un'annata del calendario (4 stagioni) = YEARL secondi = 10 anni di vita.
const AGEY=240*DK;
const UPC={2:{wood:4,stone:0},3:{wood:4,stone:4},4:{wood:6,stone:8},5:{wood:8,stone:14}};
const SEASON_DAYS=6,SEASONS=['Primavera','Estate','Autunno','Inverno'];
// Tabella delle ore del giorno (frazioni di DAY). Le frazioni "vecchie" (giorno da 150 s: notte 0-0.06 e 0.88-1, pranzo 0.42-0.54, tramonto 0.68, sera 0.76) vengono rimappate linearmente sulla parte diurna, così la notte dura sempre 27 s.
const NIGHT_AM=9/DAY,NIGHT_PM=1-18/DAY,dayF=o=>NIGHT_AM+(o-0.06)*(NIGHT_PM-NIGHT_AM)/0.82;
const TL={nAm:NIGHT_AM,dawn:dayF(0.12),lunch0:dayF(0.42),lunch1:dayF(0.54),dusk:dayF(0.68),eve:dayF(0.76),nPm:NIGHT_PM},DUSK=TL.dusk;
const YEARL=SEASON_DAYS*4*DAY;
// v65: la scuola ha 10 posti (iscritti dai 6 ai 14 anni); chi non trova posto non studia. EDUREQ = edifici in cui lavora solo chi ha studiato.
// Una bottega con almeno un addetto istruito rende il 30% in più (EDU_BLD). IMM_LIT = probabilità (10%) che chi arriva da fuori sappia già leggere e scrivere; HIRE_COST = argento per assumere da fuori una persona istruita (`hireEducated`).
const SCHOOL_CAP=10,HEAL_R=45;
const EDUREQ={taxoffice:1,school:1,mercery:1,surgeon:1},EDU_BLD=1.3,IMM_LIT=0.10,HIRE_COST=25;
const canWorkAt=(v,type)=>!EDUREQ[type]||!!v.schooled;
function arrivalLit(v,sure){if(sure||Math.random()<IMM_LIT){v.schooled=true;v.edu=300;const r=reg.get(v.id);if(r)r.schooled=true;}}
// malattie: durata [min,max] in secondi, mortalità al secondo
const DIS={
  fever:{n:'Febbre invernale',dur:[40,80],mort:0.0005},
  flux:{n:'Dissenteria',dur:[30,60],mort:0.0007},
  plague:{n:'Peste',dur:[70,120],mort:0.0035}
};
const TRADENAME={wood:'taglialegna',quarry:'cavatore',mine:'minatore',forester:'guardaboschi',farm:'contadino',store:'magazziniere',mill:'mugnaio',school:'maestro',inn:'oste',sheepfold:'pastore',infirmary:'erborista',carpenter:'falegname',mason:'muratore',smithy:'fabbro',bakery:'panettiere',weaver:'tessitore',tailor:'sarto',fisher:'pescatore',hunter:'cacciatore',tavern:'taverniere',hall:'musicante',mercery:'merciaio',claypit:'argillaio',brickworks:'fornaciaio',limekiln:'calcinaio',saltworks:'salinaro',tannery:'conciatore',cobbler:'calzolaio',butcher:'macellaio',smokehouse:'affumicatore',dairy:'casaro',brewery:'birraio',winery:'vinaio',retting:'maceratore',ropewalk:'cordaio',dyehouse:'tintore',charcoal:'carbonaio',smelter:'fonditore',barracks:'guerriero',surgeon:'cerusico',taxoffice:'esattore'};
// tratti di carattere (negativi): ogni abitante ne ha al massimo uno; i figli lo ereditano da un genitore con probabilità 35%
const TRAITS={pigro:{n:'Pigro',d:'Lavora più lentamente e controvoglia.'},cagionevole:{n:'Cagionevole',d:'Si ammala più facilmente.'},brontolone:{n:'Brontolone',d:'Si lamenta di tutto: è sempre meno felice degli altri.'},litigioso:{n:'Litigioso',d:'Litiga con chi vive in casa e ne abbassa la felicità.'}};
const TRAITK=Object.keys(TRAITS);
const rollTrait=()=>Math.random()<0.35?TRAITK[(Math.random()*TRAITK.length)|0]:null;
const CAUSETXT={wolf:'Muore sbranato dai lupi.',raid:'Muore difendendo il borgo dai predoni.',age:'Muore di vecchiaia.',cold:'Muore di freddo, in una casa senza legna.',hunger:'Muore di fame.',ill:'Muore di malattia.'};
const MNAMES=['Bartolo','Benedetto','Bruno','Corrado','Domenico','Dino','Enrico','Federico','Fulvio','Giovanni','Guido','Jacopo','Lorenzo','Matteo','Nicola','Odoardo','Pietro','Rinaldo','Tommaso','Ugo','Vitale','Aldo','Carlo','Elia','Gino','Ivo','Leone','Martino'];
const FNAMES=['Agnese','Beatrice','Chiara','Diana','Elisabetta','Francesca','Giulia','Ginevra','Ilaria','Lucia','Margherita','Matilde','Orsola','Piera','Rosa','Sibilla','Tecla','Vittoria','Alba','Bianca','Dora','Elena','Flora','Gemma','Nora','Costanza','Livia','Berta'];
const FAMS=['Rocca','Valdoro','Fontana','Marini','Boschetti','Guarnieri','Cavalli','Fabbri','Ferrari','Campana','Serra','Bellandi','Orsini','Contini','Pellegrini','Sartori','Molinari','Tessari','Del Colle','Della Valle'];
const pick=a=>a[(Math.random()*a.length)|0];
const reg=new Map(); // registro anagrafico: vivi e defunti
let ignoreFrozen=false,occStamp=0;
const wb=i=>water[i]===3||(water[i]===1&&(ignoreFrozen||!S.frozen)); // v77: il mare (3) non gela e non si attraversa
const DX=[1,-1,0,0,1,1,-1,-1],DY=[0,0,1,-1,1,-1,1,-1];
const rs=new Uint32Array(N*N),rq=new Int32Array(N*N);let rstamp=0;
const ROTD=[[0,1],[-1,0],[0,-1],[1,0]];
const hooks={building(){},done(){},removed(){},villager(){},trees(){},rocks(){},saps(){},gone(){},season(){},ground(){},toast(){},upgraded(){},regarden(){},shot(){}};
let seed=7;
const tree=new Uint8Array(N*N),rock=new Uint8Array(N*N),ore=new Uint8Array(N*N),water=new Uint8Array(N*N),sap=new Uint8Array(N*N),road=new Uint8Array(N*N),dist=new Uint8Array(N*N),occ=new Int32Array(N*N),field=new Int32Array(N*N),door=new Uint8Array(N*N),cen=new Uint8Array(N*N),gate=new Int32Array(N*N);const gatedSet=new Set();
// wear: solo per le strade tracciate dal giocatore (usura lenta). plev/phit/pexp: livello del sentiero, passaggi nella finestra corrente, istante di scadenza del livello.
const lastStep=new Float32Array(N*N); // v44: ultimo passaggio di un abitante su ogni cella libera (non salvato: dopo un caricamento riparte da adesso)
// v63: fertilità del suolo (0 arido, 1 povero, 2 buono, 3 fertile), falde acquifere (aq: c'è acqua sotto; aqK: il giocatore l'ha scoperta; aqV: numero della falda, solo per la generazione)
const aq=new Uint8Array(N*N),aqK=new Uint8Array(N*N),aqV=new Uint8Array(N*N);
// v76: la fertilità (griglia `fert` 0-100 dell'ambiente, v69) conta davvero: resa 0,6 (terra magra) … 1,4 (ottima), 1,0 a metà
const soilF=v=>0.6+0.8*v/100,soilName=v=>v<25?'Arida':v<45?'Povera':v<70?'Buona':'Ottima',AQ_COST=2,AQ_FIND_R=27,AQ_REVEAL_R=54;
const wear=new Float32Array(N*N),jit=new Float32Array(N*N),attr=new Float32Array(N*N),sapT=new Float32Array(N*N),plev=new Uint8Array(N*N),phit=new Uint8Array(N*N),pexp=new Float32Array(N*N);
const EDICT0=()=>({noUpgrade:false,noImmig:false,birthBonus:false,schoolMandatory:false,quarantine:false,woodDuty:false});
// ---- v44: commercio. Le 4 città vicine (una per lato della mappa) mandano carovane alla Merceria, ma solo sulle rotte che il giocatore ha sbloccato.
// Prezzi in denari per pezzo: `sells` = ciò che la città vende al paese, `buys` = ciò che la città compra dal paese.
const TAX_WEEK=7,TAX_POUCH=16,WAGE=1,SILVER_GOLD=10; // v64: 1 denaro = 1 moneta d'argento; 10 d'argento = 1 d'oro
const COINS0=80,VISIT_CAP=6,CARAVAN_GAP=220,TRADE_STAY=8,MAXCARAV=3,BUY_SHARE=0.5; // a ogni visita il merciaio spende al massimo la metà dei denari in cassa (così si può risparmiare per le rotte)
const TOWNS={
  w:{id:'w',name:'Valmora',side:'ovest',desc:'Borgo di fondovalle, famoso per lana e tessuti.',cost:60,sells:{cloth:5,clothes:11,fish:2},buys:{wood:3,stone:4,bread:3,rope:4,cheese:6,beer:4,leather:7,shoes:9}},
  n:{id:'n',name:'Rocca Alta',side:'nord',desc:'Città di montagna con miniere di ferro e fucine.',cost:150,sells:{iron:6,tools:9,stone:3,weapons:16,salt:3},buys:{bread:4,meat:4,clothes:14,wood:3,cured:7,beer:5,wine:10,shoes:8}},
  e:{id:'e',name:'Porto Fiorito',side:'est',desc:'Porto sul fiume: assi di legno, pesce e tessuti da lontano.',cost:300,sells:{planks:4,fish:2,cloth:5,salt:2},buys:{iron:9,tools:12,stone:4,planks:6,rope:7,bars:15,cured:8,cheese:7,wine:11,leather:8,hides:3}},
  s:{id:'s',name:'Campomaggio',side:'sud',desc:'Piana fertile con una grande fiera: pane, carne e attrezzi.',cost:500,sells:{bread:2,meat:3,tools:9,weapons:18},buys:{cloth:7,clothes:14,iron:8,planks:6,fish:3,bars:14,beer:5,wine:12,cured:6,shoes:10,leather:7}}
};
const ROUTE_IDS=['w','n','e','s'];
const TGN={wood:'legno',stone:'pietra',planks:'assi',iron:'ferro',tools:'attrezzi',bread:'pane',fish:'pesce',meat:'carne',cloth:'tessuto',clothes:'abiti',rope:'corde',bars:'barre di ferro',weapons:'armi',hides:'pelli',leather:'cuoio',shoes:'scarpe',salt:'sale',cured:'conserve',cheese:'formaggio',beer:'birra',wine:'vino'};
// si vende solo sopra T_KEEP (più il fabbisogno delle case per cibo, attrezzi e abiti) e si compra solo sotto T_TARGET: così non si compra e vende lo stesso bene
const T_KEEP={hides:16,leather:10,shoes:12,salt:12,cured:16,cheese:10,beer:10,wine:10,weapons:99,bars:10,rope:8,wood:60,stone:45,iron:24,planks:18,tools:14,bread:20,cloth:14,clothes:12,fish:25,meat:25,game:25},T_TARGET={hides:0,leather:0,shoes:0,salt:6,cured:0,cheese:0,beer:0,wine:0,weapons:6,bars:0,rope:0,wood:30,stone:20,iron:10,planks:10,tools:8,bread:10,cloth:6,clothes:6,fish:10,meat:10,game:10};
const mkRoutes=()=>ROUTE_IDS.map(id=>({id,open:false,next:0,visits:0,earned:0,spent:0,last:-1,blocked:false}));
const S={t:0,mode:'lake',extra:{},stock:{wood:40,stone:10,iron:0,grain:0,flour:0,planks:0,tools:0,cloth:0,clothes:0,bread:0,fish:0,meat:0,game:0},inflight:{wood:0,stone:0,iron:0},grow:0,barters:0,helps:0,visits:0,settled:0,season:0,year:1,frozen:false,day:0,f:0.06,ph:'work',wh:{wood:0,stone:0,iron:0},xf:{wood:0,stone:0,iron:0},edicts:EDICT0(),births:0,deaths:0,buried:0,unburied:0,
  deathsBy:{age:0,cold:0,hunger:0,ill:0},plague:{on:false,since:0,dead:0},inherits:0,cured:0,sickTot:0,moves:0,left:0,att:{joy:0,unemp:0,a:0,bonus:0},made:{},delivered:0,
  coins:COINS0,fin:mkFin(),taxDay:-1,taxRate:'normal',ledger:{snap:null,rows:[]},routes:mkRoutes(),tradeOpt:{sell:true,buy:true},tlog:[],trade:{sold:0,bought:0,visits:0},
  story:false,rank:0,proj:{},msgs:[],raid:{next:0,repelled:0,killed:0,lost:0,stolen:0,bands:{},seq:0},wolf:{next:0,seq:0,arm:0,killed:0,lost:0,eaten:0,bitten:0,dead:0,bands:{}},war:{phase:'none',at:0,wave:0,hold:0,defeats:0,killed:0},rk:0};
const guests=[];const buildings=new Map();let villagers=[];const vmap=new Map();const resv=new Map();const plantResv=new Set();let nextId=1;
const acc={a1:0,a05:0,farm:0,attr:99};
const told={};
function tell(k,msg){if(told[k])return;told[k]=1;hooks.toast(msg);}
const JOBSTATES=new Set(['toCenterT','toWhT','toTree','toRock','chop','mine','toWork','wait','toField','till','toHomeF','toGranary','toPlant','plant','toMill','mill','toShop','toShore','shop','toGraze','graze','toSupply','toInnSup','toTax','tax','toTaxDep']);
const ERRKEY={wool:'wool',cloth:'cloth',iron:'iron',flour:'flour',wood:'firewood',hunt:'game',fish:'fish'};
// fabbisogno di legna da ardere per casa: scorta minima per stare tranquilli (più alta d'autunno e d'inverno)
const fuelNeed=()=>S.season>=2?4:2;
const fuelCap=()=>S.edicts.woodDuty?20:12;
// scorta che la famiglia vuole avere: il fabbisogno, doppio con l'editto del dovere di legna
const fuelTarget=()=>S.edicts.woodDuty?fuelNeed()*2:fuelNeed();
// v23: la coltura del giardino è una sola: 'veg' (orto), 'eggs' (galline), 'herd' (allevamento) o 'wood' (legna da ardere). Il bene prodotto dal giardino:
const gardenGood=c=>c==='herd'?'meat':c==='wood'?'firewood':c;
// la scorta di legna è il prodotto della casa della legna: ne tiene molta più delle altre case (che ne tengono fuelCap())
const gardenCap=c=>c==='wood'?fuelCap()+12:12;
const fwCap=h=>h&&h.crop==='wood'?gardenCap('wood'):fuelCap();

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
const STORE_KEYS=['wood','stone','iron','planks','tools','cloth','clothes','rope','charcoal','bars','weapons','clay','bricks','lime','salt','hides','leather','shoes'];
const GRAN_KEYS=['grain','flour','bread','fish','meat','game','cured','cheese','beer','wine'];
const CENTER_KEYS=['wood','stone','iron','planks','charcoal','bars','clay','bricks','lime','salt','cured','cheese','beer','wine','hides','leather','shoes'];
const ALLKEYS=STORE_KEYS.concat(GRAN_KEYS);
const keysOf=b=>b.type==='granary'?GRAN_KEYS:(b.center?CENTER_KEYS:STORE_KEYS);
const totalOf=b=>b.type==='granary'?GRAN_TOTAL:(b.center?Infinity:STORE_CAP);
const polOf=b=>{if(!b.pol)b.pol={};for(const k of keysOf(b))if(!b.pol[k])b.pol[k]={on:true,max:b.type==='granary'?GRAN_TOTAL:STORE_CAP};return b.pol;};
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
// v53: nel conto delle risorse disponibili entra solo ciò che è stoccato in Granai, Magazzini e Centro cittadino.
// S.stock è sempre questo conteggio. Ciò che non trova posto (merce spenta, massimale abbassato, edificio demolito, rimborsi) passa in S.extra:
// non conta e non si può usare, ma non va perso: se torna posto rientra nelle scorte.
function reconcileStock(){
  const {left}=layout();
  for(const k of ALLKEYS){
    const ex=Math.max(0,Math.floor(left[k]||0));
    if(ex>0){S.stock[k]-=ex;S.extra[k]=(S.extra[k]||0)+ex;}
    else if((S.extra[k]||0)>0){const q=Math.min(S.extra[k],spaceOf(k).room);if(q>0){S.stock[k]+=q;S.extra[k]-=q;}}
    if(!(S.extra[k]>0))delete S.extra[k];
  }
}
const extraTotal=()=>{let n=0;for(const k in S.extra)n+=S.extra[k]||0;return n;};
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
function phaseOf(f){if(f<TL.nAm||f>=TL.nPm)return 'night';if(f<TL.lunch0)return 'work';if(f<TL.lunch1)return 'meal';if(f<TL.eve)return 'work';return 'evening';}
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
  const M=N/SC,CX=CT,CY=CT,K=M/64,K2=Math.round(K*K);
  const seaSide=S.sea?Math.floor(R()*4):-1;   // v80: il lato del mare si sceglie prima, perché il fiume sfocia in mare
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
  const nT=ri(4,6)*K2;for(let k=0;k<nT;k++){const [x,y]=k<2?spot(12,20,3):spot(14,30*K,3);blob(tree,x,y,rr(3.4,6),1);}
  const nR=ri(2,3)*K2;for(let k=0;k<nR;k++){const [x,y]=k<1?spot(10,18,3):spot(14,28*K,3);blob(rock,x,y,rr(2.6,3.8),10);}
  const nO=ri(2,3)*K2;for(let k=0;k<nO;k++){const [x,y]=k<1?spot(20,28,4):spot(22,32*K,4);blob(ore,x,y,rr(2.8,3.4),10);}
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
    const phi=seaSide>=0?seaSide*Math.PI/2+(R()-0.5)*1.0:R()*6.2832,dx=Math.cos(phi),dy=Math.sin(phi),nx=-dy,ny=dx,off=rr(12,21)*(R()<0.5?-1:1),bx=CX+nx*off,by=CY+ny*off;
    const A1=rr(2.5,6),A2=rr(0.8,2.2),f1=rr(0.7,1.4),f2=rr(2,3.4),p1=R()*6.2832,p2=R()*6.2832;
    const pts=[];
    for(let s=-80*K;s<=80*K;s+=0.25){
      const px=bx+dx*s,py=by+dy*s;if(px<-3||py<-3||px>M+3||py>M+3)continue;
      const lat=A1*Math.sin(s*0.09*f1+p1)+A2*Math.sin(s*0.21*f2+p2)+(vnoise(s*0.08+300,off)-0.5)*3;
      pts.push([px+nx*lat,py+ny*lat,1.6+1.4*vnoise(s*0.12+500,3)]);
    }
    const disc=(qx,qy,hw,val,onlyWater)=>{const r=hw*SC,cx=qx*SC,cy=qy*SC;for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(N-1,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(N-1,Math.ceil(cx+r));x++){if((x-cx)**2+(y-cy)**2>r*r)continue;const i=y*N+x;if(onlyWater){if(water[i])water[i]=val;}else water[i]=val;}};
    for(const p of pts)disc(p[0],p[1],p[2],1,false);
    if(pts.length>20)for(const fr of [rr(0.15,0.4),rr(0.6,0.85)]){const p=pts[Math.floor(pts.length*fr)];disc(p[0],p[1],p[2]+0.7,2,true);}
  }
  // v77: il mare occupa un lato della mappa (lato, distanza e costa dal seme: baie e promontori) e vale 3 in `water`; fiume o lago restano
  S.sea=S.sea?1:0;S.seaSide=-1;
  if(S.sea){
    const side=seaSide,c0=CT*rr(0.52,0.66),o1=R()*200,ph=R()*6.2832,ph2=R()*6.2832;S.seaSide=side;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const xc=(x+0.5)/SC,yc=(y+0.5)/SC,u=side===0?xc-CX:side===1?yc-CY:side===2?CX-xc:CY-yc,p=side%2===0?yc:xc;
      const b=c0+5*(vnoise(p*0.045+o1,3)-0.5)*2+2.2*Math.sin(p*0.12+ph)+3.2*(vnoise(p*0.13+o1+40,8)-0.5)*2+1.4*Math.sin(p*0.31+ph2);
      if(u>b)water[y*N+x]=3;
    }
  }
  for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0;if(Math.hypot(x/SC-CX,y/SC-CY)<8){tree[i]=0;rock[i]=0;ore[i]=0;}if(water[i]){tree[i]=0;rock[i]=0;ore[i]=0;}}
  // v63: flusso casuale a parte, così la forma di acqua, boschi e rocce per un dato seme resta quella di prima
  const R2=mulberry((Math.imul(sd|0,2246822519)^Math.imul(att+1,3266489917))>>>0);
  enrichDeposits();genAquifers(R2);
}
// ---- v63: giacimenti più o meno ricchi, falde acquifere e fertilità del suolo (tutto dipende solo dal seme)
// Ricchezza: la quantità di roccia e di ferro in ogni cella (prima sempre 10) varia a zone, da circa 5 a 15: i filoni ricchi durano di più e i massi si vedono più grossi. La media resta 10.
function enrichDeposits(){
  for(let i=0;i<N*N;i++){
    if(!rock[i]&&!ore[i])continue;const x=(i%N+0.5)/SC,y=((i/N|0)+0.5)/SC;
    if(rock[i]){const n=vnoise(x*0.09+211,y*0.09+37)*0.5+vnoise(x*0.3+5,y*0.3+81)*0.35+vnoise(x*0.8+60,y*0.8+3)*0.15;rock[i]=Math.max(3,Math.min(24,Math.round(10*(1+2.9*(n-0.5)))));}
    if(ore[i]){const n=vnoise(x*0.09+351,y*0.09+97)*0.5+vnoise(x*0.3+45,y*0.3+11)*0.35+vnoise(x*0.8+20,y*0.8+73)*0.15;ore[i]=Math.max(3,Math.min(24,Math.round(10*(1+2.9*(n-0.5)))));}
  }
}
// Falde: 3-5 corpi d'acqua sotterranei a forma di lente (larghi 3-5 tile, lunghi 40-80, che si assottigliano alle estremità). La prima passa sempre esattamente sotto il Centro Cittadino (al centro della mappa).
function genAquifers(R2){
  aq.fill(0);aqV.fill(0);
  const rr=(a,b)=>a+(b-a)*R2(),ri=(a,b)=>Math.floor(rr(a,b+1)),CX=CT,CY=CT,K=MT/64,nv=ri(3,5)*Math.round(K*K);
  for(let v=0;v<nv;v++){
    let bx=CX,by=CY;if(v>0){const a=R2()*6.2832,d=v<5?rr(9,26):rr(24,52*K);bx=CX+Math.cos(a)*d;by=CY+Math.sin(a)*d;}
    const phi=R2()*Math.PI,dx=Math.cos(phi),dy=Math.sin(phi),nx=-dy,ny=dx;
    const A1=rr(1.8,4.5),A2=rr(0.6,1.6),f1=rr(0.6,1.2),f2=rr(1.8,3),p1=R2()*6.2832,p2=R2()*6.2832,off=R2()*100;
    const wb=rr(1.5,2.3),wv=rr(0.3,0.7),Lh=v===0?rr(30,42):rr(20,38);
    const lat0=A1*Math.sin(p1)+A2*Math.sin(p2)+(vnoise(off,7)-0.5)*3; // la curva passa esattamente dal punto base
    for(let s=-Lh;s<=Lh;s+=0.3){
      const lat=A1*Math.sin(s*0.09*f1+p1)+A2*Math.sin(s*0.21*f2+p2)+(vnoise(s*0.08+off,7)-0.5)*3-lat0;
      const px=bx+dx*s+nx*lat,py=by+dy*s+ny*lat;if(px<-4||py<-4||px>N/SC+4||py>N/SC+4)continue;
      let hw=(wb+wv*(vnoise(s*0.1+off+50,9)-0.5)*2)*Math.min(1,(Lh-Math.abs(s))/7);
      if(v===0&&Math.abs(s)<6)hw=Math.max(hw,2.3); // sotto il centro la falda è sempre larga abbastanza
      if(hw<0.3)continue;
      const r=hw*SC,cx=px*SC,cy=py*SC;
      for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(N-1,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(N-1,Math.ceil(cx+r));x++){
        if((x+0.5-cx)**2+(y+0.5-cy)**2>r*r)continue;const i=y*N+x;aq[i]=1;if(!aqV[i])aqV[i]=v+1;}
    }
  }
}
// la mappa è giocabile? acqua lontana dal punto di partenza, quantità d'acqua sensata, legno, pietra e ferro raggiungibili; falda sotto il centro
function terrainOK(mode){
  let aqn=0,cenOK=true;
  for(let i=0;i<N*N;i++)if(aq[i])aqn++;
  for(let y=CEN-3;y<CEN+4;y++)for(let x=CEN-3;x<CEN+3;x++)if(!aq[y*N+x])cenOK=false;
  if(!cenOK||aqn<3000*Math.round((MT/64)**2)||aqn>11500*Math.round((MT/64)**2))return false;
  let wc=0,mw=1e9,t26=0,t18=0,r26=0,r18=0,oT=0,o32=0;
  for(let i=0;i<N*N;i++){const x=(i%N)/SC,y=((i/N)|0)/SC,d=Math.hypot(x-CT,y-CT);
    if(water[i]){if(water[i]<3)wc++;if(d<mw)mw=d;}
    if(tree[i]){if(d<26)t26++;if(d<18)t18++;}
    if(rock[i]){if(d<26)r26++;if(d<18)r18++;}
    if(ore[i]){oT++;if(d<32)o32++;}}
  return mw>=(mode==='lake'?11:9)&&wc>=1500&&wc<=(mode==='river'?3600*MT/64:3600)&&t26>=330&&t18>=100&&r26>=200&&r18>=60&&oT>=30&&o32>=12;
}

// ---------- v64: ambiente — fertilità del suolo, corrente del fiume, vento ----------
// Tutto si ricava dal seme e dall'acqua della mappa (fertilità, corrente) o dal tempo di gioco (vento, stagione del fiume):
// nessun campo nuovo nei salvataggi. Per ora sono informazione e layer sulla mappa; non cambiano ancora la resa dei campi né i lavori.
const fert=new Uint8Array(N*N);                      // fertilità del suolo 0-100 (0 = acqua o roccia viva)
const flowS=new Float32Array(N*N);                   // forza base della corrente 0-1 (solo fiume, solo celle d'acqua)
const flowX=new Float32Array(N*N),flowY=new Float32Array(N*N);  // verso della corrente (vettore unitario; x = est, y = sud)
let flowAvg=0,windP=null;
const FERT_HIGH=70;                                  // da qui la terra è "ottima" per le colture
// distanza (in celle, approssimata) dalla cella sorgente più vicina: chamfer in due passate
function distField(isSrc){
  const d=new Float32Array(N*N),BIG=1e4,D2=1.4142;
  for(let i=0;i<N*N;i++)d[i]=isSrc(i)?0:BIG;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;let v=d[i];
    if(x>0)v=Math.min(v,d[i-1]+1);
    if(y>0){v=Math.min(v,d[i-N]+1);if(x>0)v=Math.min(v,d[i-N-1]+D2);if(x<N-1)v=Math.min(v,d[i-N+1]+D2);}
    d[i]=v;}
  for(let y=N-1;y>=0;y--)for(let x=N-1;x>=0;x--){const i=y*N+x;let v=d[i];
    if(x<N-1)v=Math.min(v,d[i+1]+1);
    if(y<N-1){v=Math.min(v,d[i+N]+1);if(x<N-1)v=Math.min(v,d[i+N+1]+D2);if(x>0)v=Math.min(v,d[i+N-1]+D2);}
    d[i]=v;}
  return d;
}
// La fertilità dipende dal terreno com'è nato, non da com'è adesso: cava e miniera tolgono rocce e minerali durante la partita, ma il suolo non deve cambiare.
// Dopo un caricamento si rigenera il terreno naturale dal seme (e si rimettono a posto le griglie vive); se non coincide con l'acqua della partita si usa quello attuale.
function naturalTerrain(){
  if(!(S.mapTries>0))return null;
  const live=[tree,rock,ore,water,aq,aqV].map(a=>a.slice()),sd0=seed; // v76: genTerrain rifà anche le falde: si rimettono a posto
  genTerrain(S.mode,S.seed|0,(S.mapTries|0)-1);
  const nat={rock:rock.slice(),ore:ore.slice()};let same=true;for(let i=0;i<N*N;i++)if(water[i]!==live[3][i]){same=false;break;}
  [tree,rock,ore,water,aq,aqV].forEach((a,k)=>a.set(live[k]));seed=sd0;
  return same?nat:null;
}
function computeEnv(nat){
  const nr=nat?nat.rock:rock,no=nat?nat.ore:ore;
  const river=S.mode==='river',dW=distField(i=>water[i]>0),dR=distField(i=>nr[i]>0||no[i]>0);
  // fertilità: macchie di suolo (rumore a tre scale) + terra di riva (più ricca lungo un fiume) − suolo magro vicino a rocce e minerali.
  // Il valore grezzo è poi riportato ai percentili della mappa: ogni valle ha sempre circa un quinto di terra ottima (>= FERT_HIGH) e qualche zona magra
  const raw=new Float32Array(N*N),land=[];
  for(let i=0;i<N*N;i++){
    if(water[i]){fert[i]=0;continue;}
    if(nr[i]||no[i]){fert[i]=Math.round(hash(i,77)*12);continue;}
    const x=(i%N)/SC,y=((i/N)|0)/SC;
    const n=vnoise(x*0.07+700,y*0.07+310)*0.55+vnoise(x*0.19+120,y*0.19+940)*0.30+vnoise(x*0.5+40,y*0.5+10)*0.15;
    const near=Math.exp(-dW[i]/(SC*(river?6:5)))*(river?0.30:0.18),stony=Math.exp(-dR[i]/(SC*2.5))*0.38;
    raw[i]=n+near-stony;land.push(raw[i]);
  }
  if(land.length){
    const sv=Float32Array.from(land).sort(),at=p=>sv[Math.min(sv.length-1,Math.floor(p*(sv.length-1)))];
    const A=[[at(0),6],[at(0.25),32],[at(0.5),50],[at(0.8),FERT_HIGH],[at(1),97]];
    for(let i=0;i<N*N;i++){
      if(water[i]||nr[i]||no[i])continue;
      const v=raw[i];let k=1;while(k<A.length-1&&v>A[k][0])k++;
      const a=A[k-1],b=A[k],t=b[0]>a[0]?Math.max(0,Math.min(1,(v-a[0])/(b[0]-a[0]))):0;
      fert[i]=Math.round(a[1]+(b[1]-a[1])*t);
    }
  }
  // corrente: solo nel fiume. Il verso segue la direzione locale del letto (asse principale dell'acqua intorno alla cella),
  // la forza cresce dove il letto è stretto e verso il centro del canale, cala sui guadi (acqua bassa)
  flowS.fill(0);flowX.fill(0);flowY.fill(0);flowAvg=0;
  if(!river)return;
  const ws=[];for(let i=0;i<N*N;i++)if(water[i]&&water[i]<3)ws.push(i);   // v77: il mare (3) non ha corrente di fiume
  if(ws.length<30)return;
  let mx=0,my=0;for(const i of ws){mx+=i%N;my+=(i/N)|0;}mx/=ws.length;my/=ws.length;
  let sxx=0,syy=0,sxy=0;for(const i of ws){const dx=(i%N)-mx,dy=((i/N)|0)-my;sxx+=dx*dx;syy+=dy*dy;sxy+=dx*dy;}
  const ang=0.5*Math.atan2(2*sxy,sxx-syy);let gx=Math.cos(ang),gy=Math.sin(ang);
  if(S.sea&&S.seaSide>=0){const sx=[1,0,-1,0][S.seaSide],sy=[0,1,0,-1][S.seaSide];if(gx*sx+gy*sy<0){gx=-gx;gy=-gy;}}   // v80: con il mare il fiume scorre verso il mare
  else if(hash(11,17)<0.5){gx=-gx;gy=-gy;}                // il seme decide da che parte scorre il fiume
  const dB=distField(i=>!water[i]),RW=14;
  let sum=0;
  for(const i of ws){
    const c0=i%N,r0=(i/N)|0;let n=0,ax=0,ay=0,axx=0,ayy=0,axy=0,hw=0;
    for(let yy=Math.max(0,r0-RW);yy<=Math.min(N-1,r0+RW);yy++)for(let xx=Math.max(0,c0-RW);xx<=Math.min(N-1,c0+RW);xx++){
      const j=yy*N+xx;if(!water[j])continue;n++;ax+=xx;ay+=yy;axx+=xx*xx;ayy+=yy*yy;axy+=xx*yy;if(dB[j]>hw)hw=dB[j];}
    let tx=gx,ty=gy;
    if(n>=20){
      const m1=ax/n,m2=ay/n,vxx=axx/n-m1*m1,vyy=ayy/n-m2*m2,vxy=axy/n-m1*m2,tr=vxx+vyy,df=Math.sqrt(Math.max(0,(vxx-vyy)*(vxx-vyy)/4+vxy*vxy));
      if(tr>0&&(tr/2+df)/Math.max(1e-6,tr/2-df)>1.3){const a=0.5*Math.atan2(2*vxy,vxx-vyy);tx=Math.cos(a);ty=Math.sin(a);if(tx*gx+ty*gy<0){tx=-tx;ty=-ty;}}  // letto abbastanza allungato: la direzione locale è affidabile
    }
    const narrow=Math.max(0,Math.min(1,(10.5-hw)/6.3)),prof=0.45+0.55*Math.min(1,dB[i]/Math.max(1.5,hw));
    let v=(0.30+0.50*narrow)*prof;if(water[i]===2)v*=0.8;
    flowS[i]=v;flowX[i]=tx;flowY[i]=ty;sum+=v;
  }
  flowAvg=sum/ws.length;
}
// il fiume è magro a fine estate, gonfio in primavera (disgelo), fermo d'inverno col ghiaccio
function flowSeason(){
  if(S.frozen)return 0;
  const yl=SEASON_DAYS*4,yd=(((S.day|0)%yl)+(S.f||0))/yl;
  return Math.max(0.35,1+0.4*Math.cos(2*Math.PI*(yd-0.08)));
}
const FLOW_MS=2.5;                                   // metri al secondo a forza 1 (solo per la scheda)
function flowLabel(v){return v<0.15?'debole':v<0.4?'moderata':v<0.7?'forte':'impetuosa';}
function riverInfo(){
  const on=S.mode==='river'&&flowAvg>0,f=flowSeason(),avg=on?Math.min(1,flowAvg*f):0;
  return {on,frozen:!!S.frozen&&on,factor:f,avg,ms:+(avg*FLOW_MS).toFixed(1),label:!on?'nessuna: il lago è calmo':S.frozen?'ferma: il fiume è ghiacciato':flowLabel(avg)};
}
// vento: direzione e forza dipendono solo dal seme e dal tempo (vira piano nei giorni, rinforza d'autunno e d'inverno)
const COMPASS8=['Nord','Nord-Est','Est','Sud-Est','Sud','Sud-Ovest','Ovest','Nord-Ovest'];
const WIND_NAME=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];
function windLabel(s){return s<0.1?'calmo':s<0.25?'brezza leggera':s<0.45?'brezza tesa':s<0.65?'vento forte':s<0.85?'burrasca':'tempesta';}
function windNow(){
  if(!windP){const R=mulberry(((S.seed|0)^0x57494e44)>>>0);windP={th0:R()*Math.PI*2,p:[R()*6.2832,R()*6.2832,R()*6.2832,R()*6.2832]};}
  const TAU=Math.PI*2,d=(S.t+6)/DAY,P=windP.p;
  const th=windP.th0+0.8*Math.sin(TAU*d/5.3+P[0])+0.35*Math.sin(TAU*d/2.6+P[1]);   // verso cui soffia (rad: 0 = est, 90° = sud)
  let sp=0.36+0.22*Math.sin(TAU*d/2.1+P[2])+0.12*Math.sin(TAU*d/0.55+P[3])+(S.season===3?0.1:S.season===2?0.05:0);
  sp=Math.max(0.03,Math.min(1,sp));
  const vx=Math.cos(th),vy=Math.sin(th),brg=(Math.atan2(vx,-vy)+TAU)%TAU,from=Math.round(((brg+Math.PI)%TAU)/(Math.PI/4))%8;
  return {vx,vy,sp,kmh:Math.round(sp*60),from,fromName:COMPASS8[from],trad:WIND_NAME[from],label:windLabel(sp)};
}
// vento in una cella: i boschi lo frenano, l'acqua aperta lo lascia correre, il terreno lo devia di poco
function windAt(cx,cy,w){
  w=w||windNow();let tr=0,n=0;
  for(let yy=Math.max(0,cy-4);yy<=Math.min(N-1,cy+4);yy++)for(let xx=Math.max(0,cx-4);xx<=Math.min(N-1,cx+4);xx++){n++;if(tree[yy*N+xx])tr++;}
  const sh=Math.min(1,tr/n/0.22),a=Math.atan2(w.vy,w.vx)+(vnoise(cx/SC*0.12+400,cy/SC*0.12+250)-0.5)*0.7*(1-sh*0.5);
  return {vx:Math.cos(a),vy:Math.sin(a),sp:Math.max(0.02,Math.min(1,w.sp*(water[cy*N+cx]?1.12:1)*(1-0.6*sh)))};
}

function init(sd,mode,diff,opt){
  seed=sd||7;S.mode=mode==='river'?'river':'lake';S.sea=(opt&&opt.sea)?1:0;S.diff=DIFFS[diff]?diff:'normale';S.repairs=0;S.ruined=0;
  for(const a of [tree,rock,ore,water,sap,road,dist,door,cen])a.fill(0);
  gate.fill(0);gatedSet.clear();
  occ.fill(0);field.fill(0);lastStep.fill(0);wear.fill(0);plev.fill(0);phit.fill(0);pexp.fill(0);attr.fill(0);sapT.fill(0);
  buildings.clear();stCache=null;villagers=[];vmap.clear();reg.clear();resv.clear();plantResv.clear();nextId=1;guests.length=0;
  S.t=0;S.festA=[];S.fests=0;festSeq=0;S.edicts=EDICT0();S.births=0;S.deaths=0;S.buried=0;S.unburied=0;S.extra={};S.wh={wood:0,stone:0,iron:0};S.xf={wood:0,stone:0,iron:0};S.stock={wood:40,stone:10,iron:0,grain:0,flour:0,planks:0,tools:0,cloth:0,clothes:0,bread:0,fish:0,meat:0,game:0,rope:0,charcoal:0,bars:0,weapons:0,clay:0,bricks:0,lime:0,salt:0,cured:0,cheese:0,beer:0,wine:0,hides:0,leather:0,shoes:0};S.inflight={wood:0,stone:0,iron:0};S.grow=0;S.left=0;S.att={joy:0,unemp:0,a:0,bonus:0};S.pet=[];S.petNext=0;S.petSeq=0;S.petOk=0;S.petNo=0;S.petLate=0;S.arrivedFam=0;S.barters=0;S.helps=0;S.visits=0;S.settled=0;S.season=0;S.year=1;S.frozen=false;acc.a1=0;acc.a05=0;acc.farm=0;acc.attr=99;for(const k in told)delete told[k];
  S.deathsBy={age:0,cold:0,hunger:0,ill:0};S.plague={on:false,since:0,dead:0};S.inherits=0;S.cured=0;S.sickTot=0;S.moves=0;S.made={};S.delivered=0;S.coins=COINS0;S.fin=mkFin();S.taxDay=-1;S.taxRate='normal';S.ledger={snap:null,rows:[]};S.routes=mkRoutes();S.tradeOpt={sell:true,buy:true};S.tlog=[];S.trade={sold:0,bought:0,visits:0};
  S.story=!!(opt&&opt.story);S.rank=0;S.proj={};S.msgs=[];S.raid=raid0();S.wolf=wolf0();S.war=war0();S.rk=0;
  let okT=false,att=0;const base=(sd||7)|0;
  for(;att<48&&!okT;att++){genTerrain(S.mode,base,att);okT=terrainOK(S.mode);}
  S.seed=base;S.mapTries=att;S.mapOK=okT;
  // v63: nelle partite nuove il pozzo si scava solo su una falda scoperta; all'inizio è nota la parte della falda che passa sotto il Centro Cittadino
  S.aqRule=!!(opt&&opt.aquifers);S.dowsed=0;aqK.fill(0);
  for(let i=0;i<N*N;i++)if(aq[i]&&aqV[i]===1&&Math.hypot(i%N-CEN,((i/N)|0)-CEN)<=AQ_REVEAL_R)aqK[i]=1;
  for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0;jit[i]=hash(x,y+500)*0.15;}
  windP=null;computeEnv();
  updClock();
  addBuilding('store',(CT-1)*SC,(CT-1)*SC,true,{center:true});
  for(let k=0;k<3;k++){const v=addVillager(cx2w((CT-1)*SC+1+k*2),cy2w((CT-1)*SC+9),22+k*4);arrivalLit(v,true);logV(v,'Partito da Rocca Nera con la carovana: uno dei primi abitanti del borgo.');}
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
  const b={id:nextId++,type,x,y,w,h,rot,state:done?'done':'site',got:mkMat(),fly:mkMat(),cost:done?null:costOf(type),prog:done?1:0,workers:[],want:(type==='sheepfold'&&o&&o.owner)?0:t.want,
    cell:(y+(h>>1))*N+(x+(w>>1)),entrance:-1,zone:null};
  if(type==='house'){
    const goods={};for(const g of GOODS)goods[g]=0;const ate={};for(const g of TYPES)ate[g]=-999;
    const gcs=o.gcells.slice(),gxs=gcs.map(i=>i%N),gys=gcs.map(i=>(i/N)|0),gx0=Math.min(...gxs),gy0=Math.min(...gys);
    let mx=0,my=0;for(const i of gcs){mx+=i%N;my+=(i/N)|0;}mx/=gcs.length;my/=gcs.length;
    let gcc=gcs[0],gbd=1e9;for(const i of gcs){const d=Math.hypot(i%N-mx,((i/N)|0)-my);if(d<gbd){gbd=d;gcc=i;}}
    Object.assign(b,{hx:o.hx,hy:o.hy,hw:o.hw||3,hh:o.hh||3,gfull:o.gfull!==false,gcells:gcs,shape:o.shape||'rect',diag:o.diag?diagOf(o.diag,gcs):null,gx:gx0,gy:gy0,gw:Math.max(...gxs)-gx0+1,gh:Math.max(...gys)-gy0+1,door:o.door,cell:(o.hy+((o.hh||3)>>1))*N+o.hx+((o.hw||3)>>1),gc:gcc,variant:o.variant|0,level:1,up:0,crop:o.crop,side:o.side||'none',pure:!!o.pure,dens:!!o.dens,craft:false,bake:false,weave:false,tailor:false,ovile:null,warm:true,heatDay:-1,ext:[],members:[],pa:{g:0,c:0,b:0,w:0,t:0},hungry:0,tradeCool:0,stall:null,farm:null,attr:0,
      birthT:S.t+DAY*2,taxT:TAX_WEEK,cash:0,wk:0,goods,ate,head:null,legacy:null,well:50,flags:{food:false,water:false,church:false,attr:true,tools:true,heat:true,mat:true,fuel:true}});
    if(b.dens){b.goods.veg=3;b.goods.firewood=2;}else b.goods[gardenGood(b.crop)]=3; // v66: la casa ad alta densità non ha orto: parte con una piccola scorta
    // la famiglia del giardino della legna non ha orto né galline: arriva con una piccola scorta di ortaggi, poi mangia solo ciò che baratta al mercato (o che pesca/caccia)
    if(b.crop==='wood')b.goods.veg=3;
    door[o.door]=1;gate[o.door]=b.id;gatedSet.add(b.id);b.entrance=o.door;
    b.cells=lotCells(b);
    if(o.plan&&o.plan.length){b.plan=o.plan.slice();for(const i of b.plan)occ[i]=b.id;} // v57: area del giardino futuro, riservata (non costruita) fino al livello 2
  }
  if(type==='stall')Object.assign(b,{owner:o.owner,open:false,keeper:null});
  if(type==='farm')Object.assign(b,{owner:o.owner||null,fields:[]});
  if(type==='sheepfold')Object.assign(b,{owner:o.owner||null,fields:[],pen:[],buf:0});
  if(type==='inn')Object.assign(b,{pantry:0,guestsIn:0,horses:0});
  if(type==='school'||type==='infirmary')b.pupils=0;
  if(WS[type])b.out={tools:0,bread:0,cloth:0,clothes:0,fish:0,meat:0,game:0,rope:0,flaxf:0,hempf:0,dyed:0};
  if(type==='retting'||type==='dyehouse'||type==='winery')b.inp={flax:0,hemp:0,dye:0,vine:0};
  if(type==='farm')b.crop='grain';
  if(type==='mercery')b.shelf={tools:0,bread:0,cloth:0,clothes:0};
  if(type==='taxoffice')Object.assign(b,{visits:0,collected:0});
  if(type==='surgeon')b.healed=0;
  if(type==='church')b.cem=null;
  if(type==='cemetery')b.owner=o.owner;
  if(type==='wood'||type==='quarry'||type==='mine')b.buf=0;
  if(type==='sheepfold')b.milk=0;
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
    target:-1,day:-1,next:'sleep',n:{water:55+Math.random()*45,food:55+Math.random()*45,rest:60+Math.random()*40,church:50+Math.random()*50,social:50+Math.random()*50},nv:0.85+Math.random()*0.3,nc:null,helpH:0,err:null,duty:false,
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
    if(type==='well'&&S.aqRule&&!aqK[i])return "Qui non conosci nessuna falda: il pozzo si scava sull'acqua scoperta (zone azzurre). Cercala con il Rabdomante (B)";
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
// v57: materiali di cantiere. Legno e pietra sempre; assi dalla falegnameria, mattoni dalla fornace, calce dal calcinaio. Senza la bottega che li produce si pagano in legno o pietra (più cari).
const MATS=['wood','stone','planks','bricks','lime'];
const mkMat=()=>({wood:0,stone:0,planks:0,bricks:0,lime:0});
const BRICK_STONE=1.5;
function costOf(type){
  const c=BT[type].cost;let wood=c.wood,stone=c.stone,planks=c.planks||0,bricks=c.bricks||0,lime=c.lime||0;
  if(planks&&!countDone('carpenter')){wood+=PLANK_WOOD*planks;planks=0;}
  if(bricks&&!countDone('brickworks')){stone+=Math.ceil(bricks*BRICK_STONE);bricks=0;}
  if(lime&&!countDone('limekiln')){stone+=Math.ceil(lime*BRICK_STONE);lime=0;}
  return {wood,stone,planks,bricks,lime};
}
const costRes=b=>b.cost||costOf(b.type);
// v56: un cantiere è un edificio in costruzione (state 'site') oppure una casa con un lavoro in corso (b.work: miglioramento o giardino): stessi costruttori, stessi trasporti
const isSite=b=>b.state==='site'||!!b.work;
const siteCell=s=>s.type==='house'?s.gc:s.cell;
function uncommitted(res){
  let v=S.stock[res]||0;
  for(const b of buildings.values())if(isSite(b)){const c=costRes(b);v-=(c[res]||0)-(b.got[res]||0)-(b.fly[res]||0);}   // v65.1: got/fly non hanno corde, barre, armi: prima davano NaN (e denari NaN al commercio) con un cantiere aperto
  return v;
}
function afford(type){const c=costOf(type);return MATS.every(k=>uncommitted(k)>=(c[k]||0));}
function place(type,x,y,rot){
  const m=canPlace(type,x,y,rot);if(m)return {ok:false,msg:m};
  if(!afford(type))return {ok:false,msg:'Risorse insufficienti (parte del materiale è già destinata ad altri cantieri)'};
  return {ok:true,b:addBuilding(type,x,y,false,{rot:rot|0})};
}

// v63: il rabdomante cerca acqua in un raggio di AQ_FIND_R celle e rivela le falde che trova (costa AQ_COST legni). Non rivela nulla a chi prova a piazzare un pozzo a caso: il messaggio è lo stesso con falda non scoperta e senza falda.
function dowse(cx,cy){
  cx=cx|0;cy=cy|0;if(cx<0||cy<0||cx>=N||cy>=N)return {ok:false,msg:'Fuori dal territorio'};
  const R=AQ_FIND_R,cells=[];let any=0;
  for(let y=Math.max(0,cy-R);y<=Math.min(N-1,cy+R);y++)for(let x=Math.max(0,cx-R);x<=Math.min(N-1,cx+R);x++){
    if(Math.hypot(x-cx,y-cy)>R)continue;const i=y*N+x;if(!aq[i])continue;any++;if(!aqK[i])cells.push(i);}
  if(any&&!cells.length)return {ok:false,msg:'Le falde di questa zona le conosci già: guarda le zone azzurre.'};
  if(uncommitted('wood')<AQ_COST)return {ok:false,msg:'Il rabdomante vuole '+AQ_COST+' legni (parte del legno è già destinata ai cantieri).'};
  S.stock.wood-=AQ_COST;S.dowsed=(S.dowsed|0)+1;
  if(!cells.length)return {ok:true,found:0,msg:'Il rabdomante non sente acqua qui sotto: prova più in là.'};
  for(const i of cells)aqK[i]=1;hooks.ground();stCache=null;
  return {ok:true,found:cells.length,msg:'Il rabdomante ha trovato una falda: ora puoi scavare il pozzo sulle zone azzurre.'};
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
function removeBuilding(id,noRefund){
  const b=buildings.get(id);if(!b)return;
  const t=BT[b.type];
  if(b.state==='site'||b.work){for(const k of MATS)S.stock[k]+=b.got[k]|0;if(b.work&&b.work.cells)for(const i of b.work.cells)if(occ[i]===b.id)occ[i]=0;}
  if(b.state==='site'){}
  else if(!b.center&&!noRefund){S.stock.wood+=Math.floor(t.cost.wood/2);S.stock.stone+=Math.floor(t.cost.stone/2);for(const k of ['planks','bricks','lime'])S.stock[k]+=Math.floor((t.cost[k]||0)/2);}
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
  if(b.plan)for(const i of b.plan)if(occ[i]===b.id)occ[i]=0;
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
    const i=y*N+x;if(water[i]===1||water[i]===3)continue;if(dist[i]!==type){dist[i]=type;n++;}
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
    else if(b.work&&b.type==='house'&&b.level>1)a=[0.4*(b.level-1),3];
    else if(b.type==='house')a=b.level>1?[0.4*(b.level-1),3]:null;
    else if(b.type==='store')a=b.center?[0.5,6]:[-1.5,6];
    else a=ATTR[b.type]||null;
    if(a)add(cx,cy,a[0],a[1]);
    // v36.1: il giardino fisso (generico) abbellisce lo spazio intorno, tanto più quanto è grande
    if(b.type==='house'&&b.state==='done'&&b.pure){const gn=b.gcells.length+b.ext.length;add(b.gx+(b.gw-1)/2,b.gy+(b.gh-1)/2,0.3+0.05*(gn-9),6+(gn>>2));}
  }
  const unb=Math.min(1.5,S.unburied*0.15);if(unb>0)for(let i=0;i<N*N;i++)attr[i]-=unb;
  const ts=buildSAT(i=>tree[i]?1:0),ws=buildSAT(i=>water[i]===1||water[i]===3?1:0),R=10;
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
      if(tree[ni])c+=3;if(rock[ni]||ore[ni])c+=3;if(water[ni]===2)c+=1.2;else if(water[ni]===1||water[ni]===3)c+=0.8;c+=jit[ni];if(k>=4)c*=1.4142;
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
  lastStep[i]=S.t;
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
// v57.1: SMOOTH_REACH deve superare il punto fisso della curva morbida (distanza d dal centro cella con d=0,5·L·(1-d/SMOOTH_R), L = distanza al centro della cella successiva:
// 0,667 ortogonale → 0,21; 0,943 diagonale → 0,264). Con 0,25 e passi piccoli (browser: 0,05 s) l'abitante restava fermo per sempre su certe curve diagonali.
const SMOOTH_R=0.6,SMOOTH_REACH=0.3;
function moveV(v,dt){
  if(!v.path.length){v.moving=false;return true;}
  v.inside=false;
  const ti=v.path[0],tx=cx2w(ti%N),tz=cy2w((ti/N)|0),ni=v.path[1];
  let sp=3.0;if(road[ti])sp*=1.45;else if(tree[ti]||water[ti]===2)sp*=0.6;else if(water[ti]===1||water[ti]===3)sp*=0.85;else sp*=PSPD[plev[ti]];
  if(v.ill)sp*=0.7;
  if(v.spd)sp*=v.spd;
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
// v46: chi porta un carico lo prende al magazzino e lo porta a UN cantiere preciso. own=true: lo porta il costruttore di quel cantiere
// v47: a mano si porta 1 pezzo per viaggio, col carretto 3. Il carretto ce l'hanno solo gli abitanti che lavorano in un Magazzino o nel centro
// (stessa regola della grafica: isWhWorker in render.js). Mai più di quanto serve al cantiere o di quanto c'è in magazzino.
const CART_LOAD=3,HAND_LOAD=1;
function haulCap(v){const jb=v.job&&buildings.get(v.job);return jb&&jb.type==='store'?CART_LOAD:HAND_LOAD;}
function haulTo(v,s,own){
  const t=costRes(s);let r=null,need=0;
  for(const k of MATS){const nd=(t[k]||0)-(s.got[k]|0)-(s.fly[k]|0);if(nd>0&&S.stock[k]>0){r=k;need=nd;break;}}
  if(!r)return false;
  const st=nearestStore(v.cell);if(!st||!route(v,st.cell,st.id))return false;
  const n=Math.max(1,Math.min(haulCap(v),need,Math.floor(S.stock[r])));
  S.stock[r]-=n;s.fly[r]+=n;v.task={res:r,site:s.id,own:!!own,n};v.state='toStore';return true;
}
// gli altri (non costruttori) portano il materiale prima ai cantieri che non hanno ancora un costruttore, poi agli altri
function findHaul(v){
  for(const pass of [0,1])for(const s of buildings.values()){
    if(!isSite(s))continue;
    if(pass===0&&buildersAt(s.id)>0)continue;
    if(haulTo(v,s,false))return true;
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
function siteReady(st){const c=costRes(st);return MATS.every(k=>(st.got[k]|0)>=(c[k]||0));}
// v46: la costruzione avanza solo fin dove sono arrivati i materiali (quota di materiali consegnati sul totale)
const siteNeed=st=>{const c=costRes(st);return MATS.reduce((a,k)=>a+(c[k]||0),0);};
const siteGot=st=>MATS.reduce((a,k)=>a+(st.got[k]|0),0);
const siteCap=st=>Math.min(1,siteGot(st)/Math.max(1,siteNeed(st)));
const siteFly=st=>MATS.reduce((a,k)=>a+(st.fly[k]|0),0);
const siteIdle=st=>!siteReady(st)&&st.prog>=siteCap(st)-1e-6;// niente da costruire coi materiali che ci sono
// costruttori di un cantiere: chi costruisce, chi ci sta andando e chi è andato al magazzino a prendere i materiali per il suo cantiere
// contati una volta a ogni passo (BA); chi diventa costruttore nello stesso passo si aggiunge subito (findBuild)
let BA=new Map();
function countBuilders(){BA=new Map();for(const v of villagers){
  let id=0;
  if((v.state==='build'||v.state==='toBuild')&&v.target)id=v.target;
  else if((v.state==='toStore'||v.state==='toSite')&&v.task&&v.task.own)id=v.task.site;
  if(id)BA.set(id,(BA.get(id)||0)+1);
}}
const buildersAt=id=>BA.get(id)||0;
function findBuild(v,first){
  // first=true: cantieri senza costruttore che hanno materiali da usare (o completi). Finché mancano materiali il costruttore è uno solo; coi materiali completi si aggiungono fino a 3
  for(const st of buildings.values()){
    if(!isSite(st))continue;
    if(first?siteIdle(st):!siteReady(st))continue;
    const nb=buildersAt(st.id);
    if(first?nb>=1:nb>=3)continue;
    if(!route(v,siteCell(st),st.id))continue;
    v.target=st.id;v.state='toBuild';BA.set(st.id,nb+1);return true;
  }
  return false;
}
function helpMode(v){
  if(findBuild(v,true))return;if(findHaul(v))return;if(findBuild(v))return;if(tryRepair(v))return;if(tryCollect(v))return;if(helpFamily(v))return;
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
  if(b.type==='farm'){if(sinkOf(b)){const ri=retInfo(sinkOf(b));if(ri.any)return !ri.room;}const h=buildings.get(b.owner);return !h||(h.goods.grain>=10&&!(countDone('granary')&&S.stock.grain<capGrain()));}
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
// v71: pesca. Il pescatore fa FISH_CYCLE pesci ogni WS.fisher.t secondi. Chi pesca per la famiglia (qualsiasi casa vicina a lago o fiume) rende la metà:
// FAM_FISH_RATE = 0,5 della resa del pescatore (pesci al secondo di pesca). Una gita porta FAM_FISH_Q pesci e dura quanto serve per quella resa.
const FISH_CYCLE=2,FAM_FISH_RATE=0.5,FAM_FISH_Q=2;
const famFishTime=()=>WS.fisher.t*(FAM_FISH_Q/FISH_CYCLE)/FAM_FISH_RATE;
const OUTCAP=30,BAND=135,PROD={smithy:'tools',bakery:'bread',weaver:'cloth',tailor:'clothes',fisher:'fish',hunter:'game',ropewalk:'rope'};
// v38: Merceria. Con un merciaio al lavoro, le botteghe portano qui attrezzi, pane, tessuto e abiti (scaffali fino a SHELFCAP per merce) invece di consegnarli alle case; le famiglie
// mandano un adulto a ritirare ciò che manca (commissione 'merc'). Pesce e carne restano consegne dirette. Se la merceria è chiusa o lo scaffale è pieno si consegna alle case come prima.
const MERC=['tools','bread','cloth','clothes'],SHELFCAP=40,MERC_LOT=6,MERC_LOW={tools:1,bread:2,cloth:2,clothes:1};
// v47: manutenzione. Ogni edificio finito ha una condizione 0-100 che cala col tempo (più in fretta ai livelli difficili).
// Gli attrezzi del fabbro (magazzino) servono a ripararli: muratori e abitanti senza lavoro li portano agli edifici più logori; le case usano i propri attrezzi.
const DIFFS={facile:{n:'Facile',decay:1.5,min:0.5,ruin:false,d:'Gli edifici si logorano piano e, anche rovinati, lavorano a metà ritmo. Nulla crolla.'},
  normale:{n:'Normale',decay:3,min:0.15,ruin:false,d:'Gli edifici si logorano e, se non riparati, quasi smettono di lavorare. Nulla crolla.'},
  difficile:{n:'Difficile',decay:5,min:0,ruin:true,d:'Gli edifici si logorano in fretta: senza riparazioni smettono di lavorare e poi crollano.'}};
const MAINT_SKIP=new Set(['flowers','statue','plaza','well','cemetery','stall']);
const REPAIR_AMT=30,REPAIR_MASON=45,REPAIR_T=8,REPAIR_BELOW=70,WORN_AT=60,WARN_AT=25;
const diffOf=()=>DIFFS[S.diff]||DIFFS.normale;
const maintainable=b=>!!b&&b.state==='done'&&!b.center&&!MAINT_SKIP.has(b.type);
const condOf=b=>b.cond===undefined?100:b.cond;
function condF(b){
  if(!maintainable(b))return 1;const c=condOf(b);
  if(c>=WORN_AT)return 1;if(c>=30)return 0.85;if(c>0)return 0.6;return diffOf().min;
}
function condLabel(b){const c=condOf(b);return c>=80?'ottimo':c>=WORN_AT?'buono':c>=30?'logoro':c>0?'in rovina':'a pezzi';}
// v70: la taverna con addetti serve un boccale (vino, altrimenti birra) al giorno: finché ne ha, chi abita vicino è più contento
function drinkTick(){
  for(const b of buildings.values()){
    if(b.type!=='tavern'||b.state!=='done'||!b.workers.length)continue;
    if((b.drink||0)>S.t||S.t<(b.drinkT||0))continue;
    b.drinkT=S.t+DAY;
    if(S.stock.wine>=1){S.stock.wine--;b.drink=S.t+DAY;S.drunk=(S.drunk|0)+1;}
    else if(S.stock.beer>=1){S.stock.beer--;b.drink=S.t+DAY;S.drunk=(S.drunk|0)+1;}
  }
}
function maintTick(){
  const D=diffOf(),r=D.decay*0.5/DAY;
  for(const b of [...buildings.values()]){
    if(!maintainable(b))continue;
    if(b.cond===undefined)b.cond=100;
    b.cond=Math.max(0,b.cond-r);
    // le famiglie riparano la propria casa con gli attrezzi che hanno
    if(b.type==='house'&&b.goods.tools>=1&&b.cond<REPAIR_BELOW&&(b.fixAt||0)<=S.t){b.goods.tools--;b.cond=Math.min(100,b.cond+REPAIR_AMT);b.fixAt=S.t+10;S.repairs=(S.repairs|0)+1;}
    if(b.cond>=WORN_AT)b.warn=false;
    if(b.cond<WARN_AT&&!b.warn){b.warn=true;hooks.toast((BT[b.type].name)+(b.type==='house'?' di una famiglia':'')+' è in rovina: servono attrezzi del fabbro per ripararla'+(D.ruin?', o crollerà.':'.'));}
    if(b.cond<=0&&D.ruin){hooks.toast((BT[b.type].name)+' è crollata per mancanza di manutenzione.');S.ruined=(S.ruined|0)+1;removeBuilding(b.id,true);}
  }
}
function setFarmCrop(id,crop){
  const b=buildings.get(id);if(!b||b.type!=='farm'||!['grain','flax','hemp','dye','vine'].includes(crop))return 'Scelta non valida.';
  b.crop=crop;return 'ok';
}
function maintStats(){
  let worn=0,total=0,sum=0;
  for(const b of buildings.values()){if(!maintainable(b))continue;total++;const c=condOf(b);sum+=c;if(c<WORN_AT)worn++;}
  return {worn,total,avg:total?Math.round(sum/total):100,repairs:S.repairs|0,ruined:S.ruined|0,diff:S.diff,tools:S.stock.tools|0};
}
function tryRepair(v){
  if(S.stock.tools<1)return false;
  let best=null,bs=1e9;
  for(const b of buildings.values()){
    if(!maintainable(b)||b.type==='house'&&b.goods.tools>=1)continue;
    const c=condOf(b);if(c>=REPAIR_BELOW||(b.fixUntil||0)>S.t)continue;
    const sc=c+cellDist(v.cell,b.cell)*0.15;if(sc<bs){bs=sc;best=b;}
  }
  if(!best||!route(v,best.cell,best.id))return false;
  S.stock.tools--;const rp=S.stock.rope>=1&&best.type!=='house';if(rp)S.stock.rope--;best.fixUntil=S.t+90;v.rep={id:best.id,rope:rp};v.state='toRepair';return true;
}
function endRepair(v){
  const r=v.rep,b=r&&buildings.get(r.id);
  if(b&&maintainable(b)){
    const jb=v.job&&buildings.get(v.job);
    b.cond=Math.min(100,condOf(b)+(jb&&jb.type==='mason'?REPAIR_MASON:REPAIR_AMT)*(r.rope?1.5:1));b.fixUntil=0;S.repairs=(S.repairs|0)+1;if(b.cond>=WORN_AT)b.warn=false;
  }else S.stock.tools++;
  v.rep=null;v.state='idle';
}
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
// v48: fibra del maceratoio (flaxf = lino, hempf = canapa), presa dalla bottega vicina senza trasporto, come la lana
function fibreSrc(b,k){let best=null,bn=0;for(const o of buildings.values())if(o.type==='retting'&&o.state==='done'&&o.out[k]>=1&&cellDist(o.cell,b.cell)<BAND&&o.out[k]>bn){best=o;bn=o.out[k];}return best;}
const RET_CAP=24,CHAR_CAP=30,BAR_CAP=30,CLAY_CAP=40,BRICK_CAP=40,LIME_CAP=30;
// v70: conserve e bevande. KEEP = riserva fresca che il paese non trasforma (le conserve nascono solo dall'eccedenza)
// v79: concia e cuoio. Pelli da cacciatore e macellaio -> conceria (con calce e legna) -> cuoio -> calzolaio -> scarpe. Le scarpe si consumano e danno benessere a tutto il paese.
const HIDE_CAP=30,LEATHER_CAP=30,SHOE_CAP=30,SHOE_PER=10,SHOE_JOY=3,SHOE_COVER=0.4;
const shoeCover=()=>{const pop=villagers.length;return pop?Math.min(1,(S.stock.shoes||0)/Math.max(1,pop*SHOE_COVER)):0;};
function shoeTick(){
  if(S.t<(S.shoeT||0))return;S.shoeT=S.t+DAY;
  S.shoeAcc=Math.min(50,(S.shoeAcc||0)+villagers.length/SHOE_PER);
  while(S.shoeAcc>=1){S.shoeAcc--;if(S.stock.shoes>=1)S.stock.shoes--;}
}
const hideRoom=()=>S.stock.hides<HIDE_CAP&&stockRoom('hides')>=1;
const SALT_CAP=40,CURED_CAP=40,CHEESE_CAP=30,BEER_CAP=30,WINE_CAP=30,MILK_CAP=12,MEAT_KEEP=6,FISH_KEEP=6,GRAIN_KEEP=10;
function milkSrc(b){let best=null;for(const o of buildings.values())if(o.type==='sheepfold'&&o.state==='done'&&(o.milk|0)>=2&&cellDist(o.cell,b.cell)<BAND&&(!best||o.milk>best.milk))best=o;return best;}
const charcoalWanted=()=>S.stock.charcoal<6&&countDone('smelter')>0;
const inpTot=o=>(o.inp.flax|0)+(o.inp.hemp|0)+(o.inp.dye|0)+(o.inp.vine|0);
// dove un contadino porta il raccolto: lino e canapa al maceratoio, piante tintorie alla tintoria
const sinkOf=b=>b.crop==='vine'?'winery':b.crop==='dye'?'dyehouse':(b.crop==='flax'||b.crop==='hemp')?'retting':null;
function retInfo(type){type=type||'retting';let any=false,room=false;for(const o of buildings.values())if(o.type===type&&o.state==='done'){any=true;if(inpTot(o)<RET_CAP)room=true;}return {any,room};}
function dyedSrc(b){let best=null,bn=0;for(const o of buildings.values())if(o.type==='dyehouse'&&o.state==='done'&&o.out.dyed>=1&&cellDist(o.cell,b.cell)<BAND&&o.out.dyed>bn){best=o;bn=o.out.dyed;}return best;}
function matWanted(k){for(const b of buildings.values())if(isSite(b)){const c=costRes(b);if((c[k]||0)-(b.got[k]|0)-(b.fly[k]|0)>0)return true;}return false;}
const planksWanted=()=>matWanted('planks');
// v62: armi. Ogni guerriero schierato ne usa una; il fabbro ne forgia finché le scorte non arrivano a WEAPON_TARGET per posto di guerriero (o le si importa da Rocca Alta e Campomaggio).
const WEAPON_PER_POST=2;
const warriorPosts=()=>{let n=0;for(const b of buildings.values())if(b.type==='barracks'&&b.state==='done')n+=b.want;return n;};
function weaponsWanted(){const posts=warriorPosts();return posts>0&&S.stock.weapons<posts*WEAPON_PER_POST&&stockRoom('weapons')>=1;}
const WS={
  carpenter:{t:6,why:'Serve legno nel magazzino (o il magazzino delle assi è pieno)',can:b=>S.stock.wood>=1&&S.stock.planks<PLANK_CAP&&stockRoom('planks')>=2&&(S.stock.wood>=10||planksWanted()),run:b=>{S.stock.wood--;S.stock.planks=Math.min(PLANK_CAP,S.stock.planks+2);}},
  smithy:{t:10,why:'Serve ferro nel magazzino (miniera), meglio se già fuso in barre dalla fonderia, o le scorte di attrezzi sono piene',can:b=>(S.stock.bars>=1||S.stock.iron>=1)&&(b.out.tools<OUTCAP||weaponsWanted()),run:b=>{
    // v62: se c'è una caserma che ha bisogno di armi il fabbro forgia prima quelle (1 barra o 2 ferri per un'arma), direttamente nel magazzino
    if(weaponsWanted()){if(S.stock.bars>=1){S.stock.bars--;S.stock.weapons++;return;}if(S.stock.iron>=2){S.stock.iron-=2;S.stock.weapons++;return;}}
    if(b.out.tools>=OUTCAP)return;
    if(S.stock.bars>=1){S.stock.bars--;b.out.tools+=5;}else if(S.stock.iron>=1){S.stock.iron--;b.out.tools+=3;}}},
  barracks:{t:12,can:b=>true,run:b=>{}},
  surgeon:{t:10,can:b=>true,run:b=>{}},
  charcoal:{t:10,why:'Serve legno nel magazzino (la carbonaia lavora quando ce n\'è in abbondanza o la fonderia ha bisogno di carbone) o il magazzino del carbone è pieno',can:b=>S.stock.wood>=3&&S.stock.charcoal<CHAR_CAP&&stockRoom('charcoal')>=2&&(S.stock.wood>=30||charcoalWanted()),run:b=>{S.stock.wood-=3;S.stock.charcoal=Math.min(CHAR_CAP,S.stock.charcoal+2);}},
  smelter:{t:11,why:'Servono ferro (minerale della miniera) e carbone (carbonaia) nel magazzino, o il magazzino delle barre è pieno',can:b=>S.stock.iron>=2&&S.stock.charcoal>=1&&S.stock.bars<BAR_CAP&&stockRoom('bars')>=2,run:b=>{S.stock.iron-=2;S.stock.charcoal--;S.stock.bars=Math.min(BAR_CAP,S.stock.bars+2);}},
  claypit:{t:8,why:"Il magazzino dell'argilla è pieno",can:b=>S.stock.clay<CLAY_CAP&&stockRoom('clay')>=3,run:b=>{S.stock.clay=Math.min(CLAY_CAP,S.stock.clay+3);}},
  brickworks:{t:10,why:'Servono argilla (cava) e combustibile (carbone, o legno in abbondanza) nel magazzino, o il magazzino dei mattoni è pieno',can:b=>S.stock.clay>=2&&(S.stock.charcoal>=1||S.stock.wood>=30)&&S.stock.bricks<BRICK_CAP&&stockRoom('bricks')>=3,run:b=>{S.stock.clay-=2;if(S.stock.charcoal>=1)S.stock.charcoal--;else S.stock.wood-=3;S.stock.bricks=Math.min(BRICK_CAP,S.stock.bricks+3);}},
  limekiln:{t:10,why:'Servono pietra in abbondanza (o un cantiere che chiede calce) e combustibile (carbone, o legno in abbondanza), o il magazzino della calce è pieno',can:b=>S.stock.stone>=3&&(S.stock.stone>=25||matWanted('lime'))&&(S.stock.charcoal>=1||S.stock.wood>=30)&&S.stock.lime<LIME_CAP&&stockRoom('lime')>=2,run:b=>{S.stock.stone-=3;if(S.stock.charcoal>=1)S.stock.charcoal--;else S.stock.wood-=3;S.stock.lime=Math.min(LIME_CAP,S.stock.lime+2);}},
  saltworks:{t:8,why:'Il magazzino del sale è pieno',can:b=>S.stock.salt<SALT_CAP&&stockRoom('salt')>=3,run:b=>{S.stock.salt=Math.min(SALT_CAP,S.stock.salt+3);}},
  butcher:{t:9,why:'Servono carne in eccedenza nei Granai (oltre alla riserva fresca) e sale, o il magazzino delle conserve è pieno',can:b=>S.stock.meat+S.stock.game>=MEAT_KEEP+2&&S.stock.salt>=1&&S.stock.cured<CURED_CAP&&stockRoom('cured')>=4,run:b=>{if(S.stock.game>=2)S.stock.game-=2;else if(S.stock.meat>=2)S.stock.meat-=2;else{S.stock.game=0;S.stock.meat=Math.max(0,S.stock.meat-1);}S.stock.salt--;S.stock.cured=Math.min(CURED_CAP,S.stock.cured+4);if(hideRoom())S.stock.hides++;}},
  smokehouse:{t:10,why:'Servono pesce in eccedenza nei Granai (oltre alla riserva fresca), sale e legna in abbondanza, o il magazzino delle conserve è pieno',can:b=>S.stock.fish>=FISH_KEEP+2&&S.stock.salt>=1&&S.stock.wood>=20&&S.stock.cured<CURED_CAP&&stockRoom('cured')>=4,run:b=>{S.stock.fish-=2;S.stock.salt--;S.stock.wood--;S.stock.cured=Math.min(CURED_CAP,S.stock.cured+4);}},
  dairy:{t:10,why:'Servono latte (ovile con i pastori vicino) e sale, o il magazzino dei formaggi è pieno',can:b=>!!milkSrc(b)&&S.stock.salt>=1&&S.stock.cheese<CHEESE_CAP&&stockRoom('cheese')>=2,run:b=>{const o=milkSrc(b);if(o){o.milk-=2;S.stock.salt--;S.stock.cheese=Math.min(CHEESE_CAP,S.stock.cheese+2);}}},
  brewery:{t:10,why:'Servono grano in eccedenza nei Granai (oltre alla riserva del mulino) e legna in abbondanza, o il magazzino della birra è pieno',can:b=>S.stock.grain>=GRAIN_KEEP+2&&S.stock.wood>=20&&S.stock.beer<BEER_CAP&&stockRoom('beer')>=3,run:b=>{S.stock.grain-=2;S.stock.wood--;S.stock.beer=Math.min(BEER_CAP,S.stock.beer+3);}},
  winery:{t:10,why:'Serve uva: scegli la coltura vigna nel pannello di una fattoria (o il magazzino del vino è pieno)',can:b=>(b.inp.vine|0)>=3&&S.stock.wine<WINE_CAP&&stockRoom('wine')>=2,run:b=>{b.inp.vine-=3;S.stock.wine=Math.min(WINE_CAP,S.stock.wine+2);}},
  tannery:{t:11,why:'Servono pelli (cacciatore e macellaio), calce del calcinaio (non quella dei cantieri) e legna in abbondanza, o il magazzino del cuoio è pieno',can:b=>S.stock.hides>=2&&uncommitted('lime')>=1&&S.stock.wood>=20&&S.stock.leather<LEATHER_CAP&&stockRoom('leather')>=2,run:b=>{S.stock.hides-=2;S.stock.lime--;S.stock.wood--;S.stock.leather=Math.min(LEATHER_CAP,S.stock.leather+2);}},
  cobbler:{t:9,why:'Serve cuoio dalla conceria, o il magazzino delle scarpe è pieno',can:b=>S.stock.leather>=1&&S.stock.shoes<SHOE_CAP&&stockRoom('shoes')>=2,run:b=>{S.stock.leather--;S.stock.shoes=Math.min(SHOE_CAP,S.stock.shoes+2);}},
  bakery:{t:8,why:'Serve farina dal mulino o le scorte di pane sono piene',can:b=>S.stock.flour>=1&&b.out.bread<OUTCAP,run:b=>{S.stock.flour--;b.out.bread+=3;}},
  weaver:{t:9,why:'Serve lana (ovile con i pastori) o fibra di lino (fattoria con lino e maceratoio)',can:b=>b.out.cloth<OUTCAP&&(!!fibreSrc(b,'flaxf')||!!woolSrc(b)),run:b=>{const f=fibreSrc(b,'flaxf');if(f){f.out.flaxf--;b.out.cloth+=3;return;}const o=woolSrc(b);if(o){o.buf--;b.out.cloth+=2;}}},
  retting:{t:8,why:'Servono steli di lino o canapa dalle fattorie (scegli la coltura nel pannello della fattoria) o la fibra pronta è troppa',can:b=>b.inp.flax+b.inp.hemp>=1&&b.out.flaxf+b.out.hempf<OUTCAP,run:b=>{const k=b.inp.flax>=b.inp.hemp?'flax':'hemp';b.inp[k]--;b.out[k+'f']++;}},
  ropewalk:{t:9,why:'Serve fibra di canapa: coltiva canapa in una fattoria e costruisci un maceratoio',can:b=>b.out.rope<OUTCAP&&!!fibreSrc(b,'hempf'),run:b=>{const o=fibreSrc(b,'hempf');if(o){o.out.hempf--;b.out.rope+=3;}}},
  tailor:{t:10,why:'Serve tessuto: costruisci un telaio del tessitore',can:b=>b.out.clothes<OUTCAP&&(!!dyedSrc(b)||!!clothSrc(b)),run:b=>{const d=dyedSrc(b);if(d){d.out.dyed--;b.out.clothes+=3;return;}const o=clothSrc(b);if(o){if(o.type==='mercery')o.shelf.cloth--;else o.out.cloth--;b.out.clothes+=2;}}},
  dyehouse:{t:10,why:'Servono piante tintorie (fattoria con la coltura tintorie) e tessuto dal telaio',can:b=>b.inp.dye>=1&&b.out.dyed<OUTCAP&&!!clothSrc(b),run:b=>{const o=clothSrc(b);if(o){if(o.type==='mercery')o.shelf.cloth--;else o.out.cloth--;b.inp.dye--;b.out.dyed++;}}},
  fisher:{t:7,why:'Con il ghiaccio non si pesca (o le scorte di pesce sono piene)',can:b=>!S.frozen&&b.out.fish<OUTCAP,run:b=>{b.out.fish+=FISH_CYCLE;}},
  hunter:{t:8,why:"D'inverno la selvaggina è scarsa (o le scorte di carne sono piene)",can:b=>b.out.game<OUTCAP&&(S.season!==3||Math.random()<0.5),run:b=>{b.out.game+=2;if(hideRoom())S.stock.hides++;}},
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
    case 'fish':case 'meat':case 'game':return Math.max(0,5-gd);
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
  // v66.1: il pescatore pesca sulla riva vicino alla capanna (cella ricordata in b.shore); se non c'è una riva raggiungibile resta in bottega come prima
  // v74: il cacciatore fa lo stesso nel bosco: va in un albero del folto vicino alla capanna (b.shore, rifatto se l'albero viene tagliato) e caccia là fuori
  if(b.type==='fisher'||b.type==='hunter'){
    const hunt=b.type==='hunter',spotOK=i=>i>=0&&(!hunt||tree[i]);
    if(!spotOK(b.shore)&&S.t>=(b.shoreTry||0)){b.shore=hunt?treeTarget(b.cell,40,true):shoreTarget(b.cell,40);if(b.shore<0)b.shoreTry=S.t+40;}
    if(spotOK(b.shore)){
      if(v.cell===b.shore){v.inside=false;v.moving=false;v.state='shop';v.timer=sp.t;return;}
      if(route(v,b.shore,0)){v.state='toShore';return;}
      b.shore=-1;b.shoreTry=S.t+20;
    }
  }
  if(route(v,b.cell,b.id))v.state='toShop';else{v.state='wait';v.timer=3;}
}
function endShop(v){
  const b=v.job&&buildings.get(v.job),sp=b&&WS[b.type];
  v.inside=false;v.state='idle';
  if(!sp||b.state!=='done')return;
  if(sp.can(b)){sp.run(b);S.made[b.type]=(S.made[b.type]||0)+1;if(b.out)for(const k in b.out)b.out[k]=Math.min(OUTCAP,b.out[k]);}
}
// taverna e sala delle feste: chi vive vicino a un edificio con addetti è più contento
const FUN={tavern:{r:36,joy:4},hall:{r:45,joy:6}},DRINK_JOY=2;
function funOf(h){
  let f=0;
  for(const b of buildings.values()){const q=FUN[b.type];if(!q||b.state!=='done'||!b.workers.length)continue;if(cellDist(h.cell,b.cell)<=q.r)f+=q.joy+(b.type==='tavern'&&(b.drink||0)>S.t?DRINK_JOY:0);}
  return f;
}
// ---- v37: festa di paese ----
// Si indice cliccando sulla piazza. Per FEST.prep secondi (6 giorni di gioco = una stagione: "un paio di settimane" con la settimana di gioco di 3 giorni) il paese
// raccoglie legno (dal magazzino) e cibo (dalle case che ne hanno in più di KEEP). Poi la festa dura dal dopopranzo alla notte: gli abitanti si radunano attorno
// alla piazza e chi abita entro FEST.r celle è più contento (FEST.joy durante la festa, FEST.glow per FEST.glowT dopo), in proporzione ai preparativi (q = 0..1).
const FEST={prep:6*DAY,need:{wood:8,food:16},joy:12,glow:8,glowT:2*DAY,cool:SEASON_DAYS*2*DAY,r:45,minPop:6,maxExt:3,from:TL.lunch1};
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
  // v53: il cibo della festa viene dalle scorte dei Granai (pane, pesce, carne), non dalle case
  let best=null,bq=0;
  for(const k of ['bread','fish','meat','game','cured','cheese'])if(Math.floor(S.stock[k]||0)>bq){bq=Math.floor(S.stock[k]);best=k;}
  if(!best)return false;S.stock[best]--;return true;
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
  if(b.type==='taxoffice'){startCollect(v,b);return;}
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
function woodOK(x,y){return countNear(tree,x,y,15)>=8;}
function fishOK(x,y){return countNear(water,x,y,18,1)>=27;}
function startErrand(v,h){
  let kind=null,tgt=-1,tocc=0,src=0,mg=null;
  if(h.craft&&h.goods.iron<1&&S.stock.iron>0){const st=nearestStore(v.cell);if(st){kind='iron';tgt=st.cell;tocc=st.id;}}
  if(!kind&&h.dens){ // v61: senza orto la famiglia fa la spesa al magazzino (cibo vario e legna)
    const fc=TYPES.reduce((a,t2)=>a+h.goods[t2],0);
    if(fc<5&&TYPES.some(t2=>S.stock[t2]>=1)){const st=nearestStore(v.cell);if(st){kind='food';tgt=st.cell;tocc=st.id;}}
    else if(h.goods.firewood<fuelNeed()&&S.stock.wood>=30){const st=nearestStore(v.cell);if(st){kind='fuel';tgt=st.cell;tocc=st.id;}}
  }
  if(!kind&&h.bake&&h.goods.flour<1&&S.stock.flour>0){const m=nearestOf('mill',v.cell,240);if(m){kind='flour';tgt=m.cell;tocc=m.id;}}
  if(!kind&&h.weave&&h.goods.wool<1){let ov=null;for(const o of buildings.values())if(o.type==='sheepfold'&&o.state==='done'&&o.buf>=1&&(!ov||o.buf>ov.buf))ov=o;if(ov){kind='wool';tgt=ov.cell;tocc=ov.id;src=ov.id;}}
  if(!kind&&h.tailor&&h.goods.cloth<1){for(const o of buildings.values())if(o.type==='house'&&o!==h&&o.state==='done'&&o.weave&&o.goods.cloth>=2&&Math.hypot(o.cell%N-h.cell%N,(o.cell/N|0)-(h.cell/N|0))<135){kind='cloth';tgt=o.cell;tocc=o.id;src=o.id;break;}}
  if(!kind){const mc=merceryErrand(h);if(mc){kind='merc';tgt=mc.b.cell;tocc=mc.b.id;src=mc.b.id;mg=mc.g;}}
  if(!kind){const ms=merceryBuyer(h);if(ms){kind='msell';tgt=ms.b.cell;tocc=ms.b.id;src=ms.b.id;mg=ms.g;}}
  // v42.1: il giardino della legna non produce da solo: chi se ne occupa (v.duty) va a raccogliere la legna nel bosco, prima nel folto, poi anche un albero isolato; porta a casa un fascio da 3
  // l'albero scelto è sempre lo stesso per la casa: lo si ricorda (finché esiste) e, se non c'è un bosco raggiungibile, si riprova solo dopo 40 s (la ricerca è costosa)
  if(!kind&&h.crop==='wood'&&v.duty&&h.goods.firewood<gardenCap('wood')-2&&S.t>=(h.woodTry||0)){
    if(!(h.woodSpot>=0&&tree[h.woodSpot])){h.woodSpot=treeTarget(h.cell,64,true);if(h.woodSpot<0)h.woodSpot=treeTarget(h.cell,64,false);if(h.woodSpot<0)h.woodTry=S.t+40;}
    if(h.woodSpot>=0){tgt=h.woodSpot;kind='wood';}
  }
  if(!kind&&Math.random()<0.3){
    // v71: tutte le case vicine a un lago o a un fiume pescano (anche le vecchie con side diverso); chi ha anche un bosco tranquillo alterna con la caccia
    const wantFish=h.goods.fish<8&&!S.frozen&&fishOK(h.hx,h.hy),wantHunt=h.side==='hunt'&&h.goods.game<8&&huntOK(h.hx,h.hy);
    if(wantFish&&(!wantHunt||Math.random()<0.5)){tgt=shoreTarget(h.cell,66);if(tgt>=0)kind='fish';}
    if(!kind&&wantHunt){tgt=treeTarget(h.cell,48,true);if(tgt>=0)kind='hunt';}
  }
  if(!kind)return false;
  if(!route(v,tgt,tocc)){if(kind==='wood'){h.woodSpot=-1;h.woodTry=S.t+20;}return false;}
  v.err={kind,q:0,src,g:mg};v.state='toErr';return true;
}
// ---- vita quotidiana ----
function eatOne(b,v){
  let pick=null,old=1e9;
  for(const tp of TYPES)if(b.goods[tp]>0&&b.ate[tp]<old){old=b.ate[tp];pick=tp;}
  if(pick){if(!(v&&v.schooled&&Math.random()<EDU_SAVE))b.goods[pick]--;b.ate[pick]=S.t;b.hungry=Math.max(0,b.hungry-15);return true;}
  // v70: senza cibo fresco la famiglia attinge alle conserve dei Granai (salumi, pesce affumicato, formaggio): consumo astratto, uno per volta
  for(const k of ['cured','cheese'])if(S.stock[k]>=1){S.stock[k]--;b.ate[k==='cured'?'meat':'eggs']=S.t;b.hungry=Math.max(0,b.hungry-15);S.eatenCured=(S.eatenCured|0)+1;return true;}
  b.hungry=Math.min(300,b.hungry+10); // senza cibo ci riprova più tardi
  return false;
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
  if(v.next==='eat'){const ok=eatOne(h,v);v.n.food=ok?100:Math.max(v.n.food,45);v.state='eat';v.timer=5;}
  else v.state='sleep';
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
const inClass=()=>S.ph==='work'&&(S.f<TL.lunch0||(S.edicts.schoolMandatory&&S.f<DUSK));
// v65: iscrizione. Dai 6 anni un bambino prende un posto (SCHOOL_CAP per scuola) nella scuola più vicina con maestro e lo tiene fino ai 14 anni;
// chi non trova posto non studia (serve un'altra scuola). Va a lezione solo nella scuola dove è iscritto.
function schoolFor(v){const b=v.seat&&buildings.get(v.seat);return b&&b.type==='school'&&b.state==='done'&&b.workers.length?b:null;}
function enrolPass(){
  const open=[];for(const b of buildings.values())if(b.type==='school'&&b.state==='done'){b.enr=0;open.push(b);}
  for(const v of villagers){
    if(v.seat){const b=buildings.get(v.seat);if(!v.child||!b||b.type!=='school'||b.state!=='done')v.seat=null;else b.enr++;}
  }
  if(!open.length)return;
  for(const v of villagers){
    if(!v.child||v.age<6||v.seat)continue;
    let best=null,bd=1e9;
    for(const b of open){if(!b.workers.length||b.enr>=SCHOOL_CAP)continue;const d=Math.hypot(b.cell%N-v.cell%N,(b.cell/N|0)-(v.cell/N|0));if(d<bd){bd=d;best=b;}}
    if(best){v.seat=best.id;best.enr++;logV(v,'Si iscrive alla scuola.');}
  }
}
function decide(v){
  const h=v.home&&buildings.get(v.home);
  // i malati restano a letto: mangiano e dormono a casa
  if(v.ill){
    if(h&&h.state==='done'&&goHome(v,v.n.food<NEED_LOW?'eat':'sleep'))return;
    v.state='wait';v.timer=3;return;
  }
  // v37: durante la festa di paese tutti vanno in piazza (una volta a festa)
  if(S.ph!=='night'&&(v.festCool||0)<=S.t&&S.festA&&S.festA.some(q=>q.on)&&goFest(v))return;
  // v58: i bisogni (acqua, cibo, riposo, chiesa, compagnia) guidano la giornata; il più basso sotto il 20% passa avanti a tutto
  const nk=pickNeed(v);
  if(nk&&doNeed(v,nk,h))return;
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
    case 'toField':v.state='till';v.timer=5/soilF(fert[v.target]);break; // v63: su terra fertile si lavora più in fretta
    case 'toBuild':v.state='build';break;
    case 'toGraze':v.state='graze';v.timer=6;break;
    case 'toStoreSleep':v.inside=true;v.state='sleep';break;
    case 'toPlaza':v.state='chat';v.timer=6+Math.random()*4;break;
    case 'toSupply':{
      const sp=v.sup,hh=sp&&buildings.get(sp.h),inn=v.job&&buildings.get(v.job);
      const take=hh?Math.min(sp.q,hh.goods[sp.tp]-KEEP):0;
      if(take<=0||!inn||inn.type!=='inn'){v.sup=null;v.state='idle';break;}
      hh.goods[sp.tp]-=take;v.carry=sp.tp;v.cq=take;
      if(route(v,inn.cell,inn.id))v.state='toInnSup';else{hh.goods[sp.tp]+=take;v.carry=null;v.state='idle';}
      break;}
    case 'toInnSup':{const inn=v.job&&buildings.get(v.job);if(inn&&inn.type==='inn')inn.pantry=Math.min(20,inn.pantry+(v.cq||1));v.carry=null;v.sup=null;v.state='idle';break;}
    case 'toPlant':v.state='plant';v.timer=3;break;
    case 'toTax':{if(buildings.get(v.taxH)){v.state='tax';v.timer=2.5;v.moving=false;}else{v.taxH=null;v.state='idle';}break;}
    case 'toTaxDep':taxDeposit(v);v.state='idle';break;
    case 'toMill':v.inside=true;v.state='mill';v.timer=6;break;
    case 'toShop':{const sb=v.job&&buildings.get(v.job),sp=sb&&WS[sb.type];if(!sp){v.state='idle';break;}v.inside=true;v.state='shop';v.timer=sp.t;break;}
    case 'toShore':{const sb=v.job&&buildings.get(v.job),sp=sb&&WS[sb.type];if(!sp){v.state='idle';break;}v.inside=false;v.moving=false;v.state='shop';v.timer=sp.t;break;}
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
    case 'toRetting':{const c=v.cargo,r=c&&buildings.get(c.ret);if(r&&r.inp)r.inp[c.k]=Math.min(RET_CAP+2,(r.inp[c.k]|0)+1);v.carry=null;v.cargo=null;v.state='idle';break;}
    case 'toRepair':v.state='repair';v.timer=REPAIR_T;v.moving=false;break;
    case 'toGranary':S.stock.grain+=Math.min(v.cq||1,stockRoom('grain'));v.carry=null;v.state='idle';break;
    case 'toStockG':{const c=v.cargo;
      if(c){const room=Math.min(c.q,stockRoom(c.g));S.stock[c.g]+=room;const fb=buildings.get(c.from);if(c.q>room&&fb&&fb.out)fb.out[c.g]+=c.q-room;}
      v.cargo=null;v.carry=null;v.state='idle';break;}
    case 'toWork':{const b=buildings.get(v.job)||null;if(b&&b.buf!==undefined)b.buf=Math.min(BUFCAP+2,b.buf+1);v.carry=null;v.state='idle';break;}
    case 'toHomeF':{const h=buildings.get(v.home);if(h)h.goods.grain=Math.min(12,h.goods.grain+(v.cq||1));v.carry=null;v.state='idle';break;}
    case 'toHomeLife':{
      if(v.newc){ // nuovo arrivato: è giunto a piedi in paese, ora comincia la sua vita (casa, bisogni, lavoro)
        v.newc=false;v.path=[];v.moving=false;v.state='idle';logV(v,v.home?'Arriva alla sua nuova casa.':'Arriva in paese senza una casa.');S.arrived=(S.arrived||0)+1;break;
      }
      const h=buildings.get(v.home);if(h)arriveHome(v,h);else{v.carry=null;v.state='idle';}break;}
    case 'toErr':{
      const h=buildings.get(v.home);if(!h){v.state='idle';break;}
      const k=v.err.kind;
      if(k==='msell'){
        const so=buildings.get(v.err.src),g=v.err.g;
        if(so&&g&&merceryOpen(so))merceryBuy(so,h,g);
        v.err=null;v.state='idle';
      }else if(k==='merc'){
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
      }else if(k==='food'||k==='fuel'){
        let key=null,q=0;
        if(k==='food'){let old=1e9;for(const t2 of TYPES)if(Math.floor(S.stock[t2]||0)>=1&&h.ate[t2]<old){old=h.ate[t2];key=t2;}if(key)q=Math.min(3,Math.floor(S.stock[key]));if(q>0){S.stock[key]-=q;v.carry=key;}}
        else{key='firewood';q=Math.min(3,Math.floor(S.stock.wood-25));if(q>0){S.stock.wood-=q;v.carry='wood';}}
        if(q<=0){v.err=null;v.state='idle';break;}
        v.err.g=key;v.cq=q;
        if(route(v,h.cell,h.id))v.state='toHomeErr';else{if(k==='food')S.stock[key]+=q;else S.stock.wood+=q;v.carry=null;v.err=null;v.state='idle';}
      }else if(k==='iron'||k==='flour'){
        const q=Math.min(3,Math.floor(S.stock[k]));
        if(q<=0){v.state='idle';break;}
        S.stock[k]-=q;v.carry=k;v.cq=q;
        if(route(v,h.cell,h.id))v.state='toHomeErr';else{S.stock[k]+=q;v.carry=null;v.state='idle';}
      }else{v.state='doErr';v.timer=k==='wood'?4:k==='fish'?famFishTime():6;}
      break;}
    case 'toHomeErr':{
      const h=buildings.get(v.home);
      if(h&&v.err){const key=(v.err.kind==='merc'||v.err.kind==='food'||v.err.kind==='fuel')?v.err.g:ERRKEY[v.err.kind],cp=key==='firewood'?fwCap(h):12;h.goods[key]=Math.min(cp,h.goods[key]+(v.cq||1));if(v.err.kind==='merc')S.fetched=(S.fetched|0)+(v.cq||1);}
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
      if(!s||!isSite(s)){if(task)S.stock[task.res]+=task.n||1;v.task=null;v.state='idle';break;}
      v.carry=task.res;v.cq=task.n||1;
      if(route(v,siteCell(s),s.id))v.state='toSite';
      else{S.stock[task.res]+=task.n||1;s.fly[task.res]=Math.max(0,s.fly[task.res]-(task.n||1));v.carry=null;v.cq=0;v.task=null;v.state='idle';v.cool=2;}
      break;}
    case 'toSite':{
      const task=v.task,s=task&&buildings.get(task.site);
      const n=(task&&task.n)||1;
      if(s&&isSite(s)){s.got[task.res]+=n;s.fly[task.res]=Math.max(0,s.fly[task.res]-n);}else if(task)S.stock[task.res]+=n;
      v.carry=null;v.cq=0;v.task=null;
      // il costruttore che ha portato il carico al suo cantiere si rimette a costruire
      if(task&&task.own&&s&&isSite(s)){v.target=s.id;v.bw=0;v.state='build';}else v.state='idle';
      break;}
  }
}
function endGather(v){
  const b=buildings.get(v.job);
  if(v.state==='till'){
    if(!b){v.job=null;v.state='idle';return;}
    if(sinkOf(b)&&retInfo(sinkOf(b)).any){let rt=null,bd2=1e9;for(const o of buildings.values()){if(o.type!==sinkOf(b)||o.state!=='done'||inpTot(o)>=RET_CAP)continue;const d=cellDist(v.cell,o.cell);if(d<bd2){bd2=d;rt=o;}}
      if(rt&&route(v,rt.cell,rt.id)){v.carry=b.crop;v.cq=1;v.cargo={ret:rt.id,k:b.crop};v.state='toRetting';return;}}
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
    case 'toStore':{const t=v.task;if(t){const n=t.n||1,st=buildings.get(t.site);S.stock[t.res]+=n;if(st)st.fly[t.res]=Math.max(0,st.fly[t.res]-n);}break;}
    case 'toSite':{const t=v.task,n=(t&&t.n)||1,st=t&&buildings.get(t.site);if(st&&isSite(st)){st.got[t.res]+=n;st.fly[t.res]=Math.max(0,st.fly[t.res]-n);}else if(t)S.stock[t.res]+=n;break;}
    case 'toHomeErr':{if(h&&v.err){const key=v.err.kind==='merc'?v.err.g:ERRKEY[v.err.kind],cp=key==='firewood'?fwCap(h):12;h.goods[key]=Math.min(cp,h.goods[key]+(v.cq||1));}break;}
    case 'toHomeF':{if(h)h.goods.grain=Math.min(12,h.goods.grain+(v.cq||1));break;}
    case 'toGranary':S.stock.grain+=Math.min(v.cq||1,stockRoom('grain'));break;
    case 'toStockG':{const c=v.cargo;if(c){const fb=buildings.get(c.from);if(fb&&fb.out)fb.out[c.g]+=c.q;}break;}
    case 'toWork':{const b=v.job&&buildings.get(v.job);if(b&&b.buf!==undefined)b.buf=Math.min(BUFCAP+2,b.buf+1);break;}
    case 'toInnSup':{const b=v.job&&buildings.get(v.job);if(b&&b.type==='inn')b.pantry=Math.min(20,b.pantry+(v.cq||1));break;}
    case 'toSupply':break;
    case 'toTax':case 'tax':{const th=buildings.get(v.taxH);if(th&&th.taxRes===v.id)th.taxRes=null;v.taxH=null;break;}
    case 'toRetting':{const c=v.cargo,r=c&&buildings.get(c.ret);if(r&&r.inp)r.inp[c.k]=(r.inp[c.k]|0)+1;break;}
    case 'toRepair':case 'repair':{const rb=v.rep&&buildings.get(v.rep.id);S.stock.tools++;if(v.rep&&v.rep.rope)S.stock.rope++;if(rb)rb.fixUntil=0;break;}
    case 'toDeliver':{const c=v.cargo;if(c){const fb=buildings.get(c.from);if(fb&&fb.out)fb.out[c.g]+=c.q-(c.stk|0);S.stock[c.g]+=c.stk|0;}break;}
    case 'shop':v.inside=false;break;
    case 'toCenterT':case 'toWhT':if(v.xr){S.xf[v.xr]=Math.max(0,S.xf[v.xr]-1);v.xr=null;}break;
    case 'toTree':case 'chop':resv.delete(v.target);break;
    case 'toPlant':case 'plant':plantResv.delete(v.target);break;
    case 'toStall':case 'keep':{const st=buildings.get(v.stall);if(st){st.open=false;st.keeper=null;}v.stall=null;break;}
  }
  v.carry=null;v.cargo=null;v.err=null;v.task=null;v.sup=null;v.rep=null;v.path=[];v.moving=false;v.state='idle';
}
function updV(v,dt){
  // bisogno critico (sotto il 6%): lascia ciò che sta facendo
  if(!v.inside&&!LIFEST.has(v.state)&&(v.n.rest<6||v.n.food<6||v.n.water<6))abortTask(v);
  if(v.day!==S.day){v.day=S.day;v.sd=false;}
  v.cool=Math.max(0,v.cool-dt);
  switch(v.state){
    case 'idle':v.moving=false;decide(v);break;
    case 'toSchool':case 'toCenterT':case 'toWhT':case 'toStore':case 'toSite':case 'toTree':case 'toRock':case 'toWork':case 'toField':case 'toHomeF':case 'toGarden':case 'toStall':case 'toMarket':case 'toHomeT':
    case 'toHomeLife':case 'toWell':case 'toChurch':case 'toPlaza':case 'toHelp':case 'toCollect':case 'toStoreC':case 'toErr':case 'toHomeErr':case 'toPlant':case 'toMill':case 'toShop':case 'toShore':case 'toDeliver':case 'toStockG':case 'toGranary':case 'toGraze':case 'toBuild':case 'toStoreSleep':case 'toSupply':case 'toInnSup':case 'toFest':case 'toRepair':case 'toRetting':case 'toTax':case 'toTaxDep':
      if(moveV(v,dt))onArrive(v);break;
    case 'tax':v.moving=false;v.timer-=dt;if(v.timer<=0)taxCollectAt(v);break;
    case 'war':{v.moving=false;if(!guests.some(x=>x.id===v.fid&&x.hp>0)){v.inside=false;v.state='idle';v.fid=0;}break;}
    case 'fest':{v.moving=false;v.timer-=dt;const fb=buildings.get(v.festB);if(v.timer<=0||!fb||!fb.fest||fb.fest.st!=='on')v.state='idle';break;}
    case 'chop':case 'mine':case 'till':
      v.timer-=dt*workRate(v);if(v.timer<=0)endGather(v);break;
    case 'build':{v.moving=false;const bb=buildings.get(v.target);
      if(!bb||!isSite(bb)){v.state='idle';v.bw=0;break;}
      if(siteIdle(bb)){
        // niente da costruire con i materiali arrivati: il costruttore va al magazzino a prendere quelli per il suo cantiere
        if(haulTo(v,bb,true)){v.bw=0;break;}
        // niente in magazzino e niente in arrivo: dopo un po' lascia il posto (si riprende il cantiere quando c'è materiale)
        v.bw=(v.bw||0)+dt;if(v.bw>8&&siteFly(bb)===0){v.state='idle';v.bw=0;}
      }else v.bw=0;
      break;}
    case 'graze':v.timer-=dt*workRate(v);if(v.timer<=0){const b=buildings.get(v.job);if(b&&b.buf!==undefined){b.buf=Math.min(BUFCAP+2,b.buf+2);if(b.type==='sheepfold')b.milk=Math.min(MILK_CAP,(b.milk|0)+1);}v.state='idle';}break;
    case 'plant':v.timer-=dt*workRate(v);if(v.timer<=0){const i=v.target;if(!tree[i]&&!sap[i]&&!occ[i]){sap[i]=1;sapT[i]=0;hooks.saps();}plantResv.delete(i);v.state='idle';}break;
    case 'shop':v.timer-=dt*workRate(v);if(v.timer<=0)endShop(v);break;
    case 'mill':v.timer-=dt*workRate(v);if(v.timer<=0){if(S.stock.grain>=2){S.stock.grain-=2;S.stock.flour=Math.min(capFlour(),S.stock.flour+2);}v.inside=false;v.state='idle';}break;
    case 'doErr':v.timer-=dt;if(v.timer<=0){
      const h=buildings.get(v.home),k=v.err&&v.err.kind;
      v.carry=k==='fish'?'fish':k==='hunt'?'game':'wood';v.cq=k==='fish'?FAM_FISH_Q:k==='wood'?3:1;
      if(h&&route(v,h.cell,h.id))v.state='toHomeErr';else{v.carry=null;v.err=null;v.state='idle';}
    }break;
    case 'tend':
      v.moving=false;v.timer-=dt;if(v.timer<=0)v.state='idle';break;
    case 'learn':{v.moving=false;const sc=v.sch&&buildings.get(v.sch);{const tc=sc&&sc.workers.length?vmap.get(sc.workers[0]):null;v.edu+=dt*(S.edicts.schoolMandatory?1.6:1)*(1+SK_WORK*(tc?skLevel(tc,'school'):0));}if(!inClass()||!sc||sc.state!=='done'||!sc.workers.length){v.inside=false;v.sd=!(S.edicts.schoolMandatory&&S.ph==='meal');v.sch=null;v.state='idle';}break;}
    case 'draw':v.timer-=dt;if(v.timer<=0){v.n.water=100;v.carry='water';goHomeAfter(v);}break;
    case 'chat':v.moving=false;v.timer-=dt;if(v.timer<=0){v.n.social=100;v.state='idle';}break;
    case 'pray':v.timer-=dt;if(v.timer<=0){v.n.church=100;v.prayT=S.t;goHomeAfter(v);}break;
    case 'repair':v.moving=false;v.timer-=dt;if(v.timer<=0)endRepair(v);break;
    case 'helpTend':v.timer-=dt;if(v.timer<=0){const h=buildings.get(v.helpH);if(h){if(h.crop!=='wood'){const k=gardenGood(h.crop);h.goods[k]=Math.min(gardenCap(h.crop),h.goods[k]+2);}S.helps++;}v.state='idle';}break;
    case 'eat':v.timer-=dt;if(v.timer<=0){v.inside=false;v.state='idle';}break;
    case 'sleep':v.n.rest=Math.min(100,v.n.rest+dt*REST_REC);if(!v.ill&&((v.n.rest>=100&&S.ph!=='night'&&S.ph!=='evening')||v.n.food<8||v.n.water<8)){v.inside=false;v.state='idle';}break;
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
  // v62: chi è in prestito (eccedenza della sua merce) conserva il mestiere di base
  if(v.loan){if(v.loan===b.type)v.loan=null;else return;}
  if(v.trade!==b.type){v.trade=b.type;v.inh=false;logV(v,'Inizia a lavorare come '+TRADENAME[b.type]+'.');}
}
// ---- v62: il lavoro resta fisso; si cambia solo per eccedenza di merce ----
// Chi lavora in un edificio produttivo tiene il suo mestiere. Se la scorta della merce che produce supera il fabbisogno + 50%,
// gli addetti di quell'edificio vanno a lavorare altrove (in prestito: `v.loan` = mestiere di base, che non cambia) e tornano
// al loro edificio appena la scorta scende sotto la soglia. Per non far cambiare lavoro a ogni istante, l'edificio può cambiare
// stato (`b.sur`) al massimo ogni JOB_DWELL secondi. Vale per tutti i mestieri che producono una merce con scorta (non per
// maestro, oste, muratore, magazziniere, contadini di famiglia e simili, che non hanno una scorta da pareggiare).
const JOBRES={wood:'wood',forester:'wood',quarry:'stone',mine:'iron',carpenter:'planks',smithy:'tools',bakery:'bread',weaver:'cloth',tailor:'clothes',fisher:'fish',hunter:'game',ropewalk:'rope',charcoal:'charcoal',smelter:'bars'};
const JOB_MARGIN=1.5,JOB_DWELL=DAY*2;
// fabbisogno = riserva del paese (T_KEEP, la stessa che il commercio non vende) + ciò che manca ai cantieri + ciò che chiedono le case
function jobNeed(r){
  let n=r==='charcoal'?6:(T_KEEP[r]||0);
  for(const b of buildings.values())if(b.state==='site'){const c=costRes(b);n+=Math.max(0,(c[r]||0)-((b.got&&b.got[r])||0)-((b.fly&&b.fly[r])||0));}
  return n+needAll(r);
}
const jobStock=r=>(S.stock[r]||0)+((TRADE_STOCK[r]||TRADE_FOOD[r])?0:shelfTotal(r));
const jobSurplus=r=>jobStock(r)>jobNeed(r)*JOB_MARGIN;
function rebalanceJobs(){
  // prestito senza più edifici del mestiere di base: il lavoro attuale diventa il mestiere
  for(const v of villagers)if(v.loan&&!countDone(v.loan)){v.loan=null;const jb=v.job&&buildings.get(v.job);if(jb&&v.trade!==jb.type){v.trade=jb.type;v.inh=false;}}
  const sur={};
  for(const b of buildings.values()){
    const r=JOBRES[b.type];if(!r||b.state!=='done')continue;
    if(S.t-(b.surT===undefined?-1e9:b.surT)<JOB_DWELL)continue;
    if(sur[r]===undefined)sur[r]=jobSurplus(r);
    if(sur[r]===!!b.sur)continue;
    b.sur=sur[r];b.surT=S.t;
    if(b.sur){
      for(const id of b.workers.slice()){const v=vmap.get(id);if(v){v.loan=b.type;release(id);logV(v,'Troppa merce in paese: lavora altrove finché serve.');}}
      b.workers=[];b.why='Scorte oltre il fabbisogno: gli addetti lavorano altrove';
    }else b.why='';
  }
  // l'eccedenza è finita: chi era in prestito torna al suo edificio (il più vicino ottiene i primi posti)
  for(const b of buildings.values()){
    const r=JOBRES[b.type];if(!r||b.state!=='done'||b.sur)continue;
    while(b.workers.length<b.want){
      let best=null,bd=1e9;
      for(const v of villagers){
        if(v.loan!==b.type||v.child||v.ill)continue;
        // chi è senza posto finisce ciò che sta facendo e poi va al lavoro; chi lavora altrove lascia solo a mani vuote
        if(v.job&&v.carry)continue;
        const d=(v.x-cx2w(b.cell%N))**2+(v.z-cy2w((b.cell/N)|0))**2;if(d<bd){bd=d;best=v;}
      }
      if(!best)break;
      const old=best.job&&buildings.get(best.job);
      if(old)old.workers=old.workers.filter(id=>id!==best.id);
      if(best.job)release(best.id);
      best.loan=null;best.job=b.id;b.workers.push(best.id);
      logV(best,'Torna al suo mestiere: '+TRADENAME[b.type]+'.');
    }
  }
  // chi è in prestito ma nel suo mestiere non c'è più posto (edificio al completo o posti tolti) non resta in prestito per sempre:
  // il lavoro che ha adesso (o la disoccupazione) diventa la sua condizione normale
  const stay={};
  for(const b of buildings.values()){const r=JOBRES[b.type];if(r&&b.state==='done'&&(b.sur||b.workers.length<b.want))stay[b.type]=true;}
  for(const v of villagers)if(v.loan&&!stay[v.loan]){
    v.loan=null;const jb=v.job&&buildings.get(v.job);
    if(jb&&v.trade!==jb.type){v.trade=jb.type;v.inh=false;logV(v,'Inizia a lavorare come '+TRADENAME[jb.type]+'.');}
  }
}
function assignJobs(){
  const all=[...buildings.values()].filter(b=>b.state==='done'&&BT[b.type].slots>0);
  const order=all.filter(b=>b.type==='store').concat(all.filter(b=>b.type!=='store'));
  let free=villagers.filter(v=>!v.job&&!v.duty&&!v.child&&!v.ill);
  const reserve=0;
  const wantOf=b=>b.sur?0:(b.type==='store'&&b.center&&villagers.length<9)?Math.min(b.want,Math.max(1,Math.floor(villagers.length/3))):b.want;
  for(const b of order){const wn=wantOf(b);while(b.workers.length>wn){const id=b.workers.pop();release(id);}}
  // v65: negli edifici per istruiti non può restare chi non ha studiato (salvataggi vecchi, eredità)
  for(const b of order)if(EDUREQ[b.type])for(const id of b.workers.slice()){const w=vmap.get(id);if(w&&!w.schooled){b.workers=b.workers.filter(x=>x!==id);release(id);}}
  // un addetto per edificio alla volta, cosi' con pochi abitanti nessun mestiere resta scoperto
  for(let pass=1;pass<=3;pass++)for(const b of order){
    const isStore=b.type==='store',wn=Math.min(wantOf(b),pass);
    while(b.workers.length<wn&&(isStore||free.length>reserve)){
      const cand=free.filter(v=>(v.state==='idle'||v.state==='sleep'||v.state==='eat'||v.state==='wait')&&!v.carry&&canWorkAt(v,b.type));if(!cand.length)break;
      // chi ha già il mestiere (o lo ha ereditato dalla famiglia) ha la precedenza
      let best=null,bd=1e9;for(const v of cand){const d=(v.x-cx2w(b.cell%N))**2+(v.z-cy2w((b.cell/N)|0))**2-(v.trade===b.type?1500:0)-(EDU_JOBS.has(b.type)?(v.schooled?2000:-2000):0)-skLevel(v,b.type)*1500+(v.trade&&v.trade!==b.type?skLevel(v,v.trade)*1200:0);if(d<bd){bd=d;best=v;}}
      setJob(best,b);b.workers.push(best.id);free=free.filter(v=>v!==best);
    }
  }
  for(const b of order){
    if(b.workers.length>0||wantOf(b)<1||free.length>0||b.type==='surgeon')continue;
    let donor=null;for(const d of order)if(d!==b&&d.type!=='store'&&d.workers.length>=2&&(!donor||d.workers.length>donor.workers.length))donor=d;
    if(!donor)break;
    const di=donor.workers.findLastIndex(x=>{const w=vmap.get(x);return w&&canWorkAt(w,b.type);});if(di<0)continue;
    const id=donor.workers.splice(di,1)[0];release(id);const v=vmap.get(id);if(v){setJob(v,b);b.workers.push(id);}
  }
  for(const b of buildings.values())if(b.workers.length){b.workers=b.workers.filter(id=>{const v=vmap.get(id);return v&&v.job===b.id;});}
}
const fibreCrop=b=>b.crop==='flax'||b.crop==='hemp';
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
// v45.1: contorno del giardino (gcells+ext) come poligoni in coordinate d'angolo di cella. Dove il bordo è a scaletta (almeno due gradini 1×1) diventa un taglio diagonale
// che passa per gli angoli rientranti: la staccionata e il terreno seguono la diagonale. Ritorna {loops:[[{x0,y0,x1,y1,skip,diag}]], cut:Map(cella -> [dx,dy] verso l'angolo tagliato)}.
const outlineCache=new WeakMap();
function lotOutline(b){
  const key=b.gcells.length+':'+b.ext.length+':'+b.door;
  const c0=outlineCache.get(b);if(c0&&c0.key===key)return c0.v;
  const Gs=new Set(b.gcells.concat(b.ext)),sk=new Set([b.door]);
  for(let yy=b.hy;yy<b.hy+b.hh;yy++)for(let xx=b.hx;xx<b.hx+b.hw;xx++)sk.add(yy*N+xx);
  const out=new Map(),E=[];
  const add=(x0,y0,x1,y1,skip)=>{const e={x0,y0,x1,y1,skip};E.push(e);const k=x0+','+y0;let l=out.get(k);if(!l){l=[];out.set(k,l);}l.push(e);};
  for(const c of Gs){const x=c%N,y=(c/N)|0;
    if(!Gs.has(c-N))add(x,y,x+1,y,sk.has(c-N));
    if(!Gs.has(c+1))add(x+1,y,x+1,y+1,sk.has(c+1));
    if(!Gs.has(c+N))add(x+1,y+1,x,y+1,sk.has(c+N));
    if(!Gs.has(c-1))add(x,y+1,x,y,sk.has(c-1));}
  const used=new Set(),raw=[];
  for(const e0 of E){if(used.has(e0))continue;
    const loop=[];let e=e0;
    while(e&&!used.has(e)){used.add(e);loop.push(e);
      const cand=(out.get(e.x1+','+e.y1)||[]).filter(f=>!used.has(f));
      if(!cand.length)break;
      if(cand.length===1)e=cand[0];
      else{const dx=e.x1-e.x0,dy=e.y1-e.y0;let best=cand[0],bs=-9;
        for(const f of cand){const fx=f.x1-f.x0,fy=f.y1-f.y0,cr=dx*fy-dy*fx,dt=dx*fx+dy*fy,sc=cr>0?2:dt>0?1:0;if(sc>bs){bs=sc;best=f;}}
        e=best;}
    }
    if(loop.length>=4)raw.push(loop);}
  const cut=new Map(),loops=[];
  const dirOf=e=>[e.x1-e.x0,e.y1-e.y0],crs=(a,b2)=>{const [ax,ay]=dirOf(a),[bx,by]=dirOf(b2);return ax*by-ay*bx;};
  const isU=e=>!e.skip&&Math.abs(e.x1-e.x0)+Math.abs(e.y1-e.y0)===1;
  for(const loop of raw){
    const n=loop.length;let st=-1;
    for(let i=0;i<n;i++){const a=loop[(i+n-1)%n],b2=loop[i];if(!(isU(a)&&isU(b2)&&crs(a,b2)!==0)){st=i;break;}}
    if(st<0){loops.push(loop.map(e=>({...e,diag:false})));continue;}
    const res=[];let cnt=0;
    while(cnt<n){
      const idx=(st+cnt)%n;let len=1,last=0;
      while(cnt+len<n){const a=loop[(idx+len-1)%n],b2=loop[(idx+len)%n];if(!(isU(a)&&isU(b2)))break;const c=crs(a,b2);if(c===0)break;const sg=c>0?1:-1;if(last!==0&&sg===last)break;last=sg;len++;}
      if(len>=4){
        const es=[];for(let k=0;k<len;k++)es.push(loop[(idx+k)%n]);
        const pts=[[es[0].x0,es[0].y0]];
        for(let k=1;k<len;k++){const a=es[k-1],b2=es[k],c=crs(a,b2),vx=a.x1,vy=a.y1;
          if(c<0)pts.push([vx,vy]); // angolo rientrante: resta
          else{ // angolo sporgente: tagliato; la cella d'angolo sposta dentro i suoi oggetti
            const [ax,ay]=dirOf(a),[bx,by]=dirOf(b2),cx=Math.floor(vx+0.5*(-ax+bx)),cy=Math.floor(vy+0.5*(-ay+by));
            cut.set(cy*N+cx,[ax-bx,ay-by]);}}
        pts.push([es[len-1].x1,es[len-1].y1]);
        for(let k=0;k<pts.length-1;k++){const dx=pts[k+1][0]-pts[k][0],dy=pts[k+1][1]-pts[k][1];res.push({x0:pts[k][0],y0:pts[k][1],x1:pts[k+1][0],y1:pts[k+1][1],skip:false,diag:dx!==0&&dy!==0});}
      }else for(let k=0;k<len;k++){const e=loop[(idx+k)%n];res.push({...e,diag:false});}
      cnt+=len;
    }
    loops.push(res);
  }
  const v={loops,cut};outlineCache.set(b,{key,v});return v;
}
function expandGarden(b){
  if(b.work)return false;
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
    if(beginGardenWork(b,'ext',cells))return true;
  }
  return false;
}
// v43: il giardino cresce dalla casa cella per cella, come toft e croft medievali: la casa sta sul fronte (verso il sentiero, dove si apre la porta), l'orto/giardino
// si allunga DIETRO la casa con fronte stretto (poco oltre la larghezza della casa), il cortile davanti è piccolo. Si appoggia ai sentieri vicini e non tocca altri lotti.
function growGarden(hcs,doorCell,hx,hy,hw,hh,target,seed,pp,start,minLen,selfId){
  const g=start?start.slice():[],lot=new Set(hcs.concat(g)),cx=hx+(hw-1)/2,cy=hy+(hh-1)/2;
  const dxr=doorCell%N-cx,dyr=((doorCell/N)|0)-cy,horiz=Math.abs(dxr)>Math.abs(dyr);
  const ux=horiz?Math.sign(dxr):0,uy=horiz?0:Math.sign(dyr);        // verso il fronte (la porta)
  const hd=(horiz?hw:hh)/2,hwid=(horiz?hh:hw)/2;                  // mezza profondità e mezza larghezza della casa rispetto al fronte
  const nbr=(c,k)=>{const x=c%N;if(k===0)return x<N-1?c+1:-1;if(k===1)return x>0?c-1:-1;if(k===2)return c+N<N*N?c+N:-1;return c-N>=0?c-N:-1;};
  const okc=i=>{if(i<0||lot.has(i)||i===doorCell||!cellFree(i,1))return false;
    return !foreignNear(i,selfId||-1);};
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
  return g.length>=(minLen||9)?g:null;
}
// v44: le celle di passaggio tra due lotti (a contatto con l'altro lotto) che per un anno intero nessuno ha calpestato diventano giardino
function claimLane(b){
  if(b.work)return false;
  const room=ROADMAX-b.gcells.length-b.ext.length;if(room<=0||S.t<YEARL)return false;
  const lot=new Set(b.cells.concat(b.ext)),cand=new Set();
  for(const c of b.gcells.concat(b.ext))for(let k=0;k<4;k++){
    const x=c%N+GX[k],y=((c/N)|0)+GY[k];if(x<0||y<0||x>=N||y>=N)continue;const i=y*N+x;
    if(lot.has(i)||dist[i]!==1||road[i]||plev[i]>=PATH||!doorFree(i)||!foreignNear(i,b.id))continue;
    if(S.t-lastStep[i]<YEARL)continue;
    cand.add(i);
  }
  const cells=[...cand].slice(0,Math.min(room,3));
  if(!cells.length||!reachable(b.door,cells))return false;
  const xs=cells.map(i=>i%N),ys=cells.map(i=>(i/N)|0);
  if(!doorsOK(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys),cells))return false;
  return beginGardenWork(b,'ext',cells);
}
// v55: tende. I cittadini senza casa si costruiscono da soli una tenda (2 per tenda) vicino al centro del villaggio: la tenda è un cantiere come gli altri (il materiale lo porta chi costruisce).
// Appena tutti i suoi occupanti hanno una casa la tenda viene smontata e metà del materiale torna in magazzino.
const TENT_CAP=2;
function tentTick(){
  const tents=[...buildings.values()].filter(b=>b.type==='tent');
  for(const t of tents){
    t.members=(t.members||[]).filter(id=>{const v=vmap.get(id);return v&&!v.home&&v.tentId===t.id;});
    if(!t.members.length){
      const was=t.state==='done';
      for(const v of villagers)if(v.tentId===t.id)v.tentId=0;
      removeBuilding(t.id);
      if(was)tell('tentDown','Una famiglia ha lasciato la tenda per una casa: la tenda è stata smontata e metà del legno è tornato al magazzino.');
    }
  }
  const homeless=villagers.filter(v=>!v.home&&(!v.tentId||!buildings.get(v.tentId))).sort((a,b)=>(a.child?1:0)-(b.child?1:0)); // v79: anche i bambini senza casa (con la famiglia)
  if(!homeless.length)return;
  const adultsIn=t=>t.members.reduce((n,id)=>{const m=vmap.get(id);return n+(m&&!m.child?1:0);},0);
  const open=[...buildings.values()].filter(b=>b.type==='tent'&&adultsIn(b)<TENT_CAP);
  let pending=false;for(const b of buildings.values())if(b.type==='tent'&&b.state==='site')pending=true;
  for(const v of homeless){
    let t=v.child?(open.find(b=>b.members.some(id=>{const m=vmap.get(id);return m&&m.fam===v.fam;}))||open.find(b=>b.members.length)||[...buildings.values()].find(b=>b.type==='tent'&&b.members.length)):open.find(b=>adultsIn(b)<TENT_CAP);
    if(v.child&&!t)continue; // un bambino senza tenda aspetta che i genitori ne abbiano una
    if(!t){
      if(pending||uncommitted('wood')<BT.tent.cost.wood)break;
      const c=centerCell();if(c<0)break;
      const best=siteSearch('tent',0,{cell:c});if(!best)break;
      t=addBuilding('tent',best.x,best.y,false,{rot:best.r});t.members=[];open.push(t);pending=true;
    }
    t.members.push(v.id);v.tentId=t.id;
  }
}
// v61: zona ALTA DENSITÀ: case di mattoni addossate l'una all'altra (muri in comune), senza giardino; il cibo e la legna si prendono al magazzino
function trySpawnDense(){
  const t=BT.house;if(uncommitted('wood')<t.cost.wood||uncommitted('stone')<t.cost.stone)return false;
  let n=0,sx=0,sy=0;for(let i=0;i<N*N;i++)if(dist[i]===6){n++;sx+=i%N;sy+=(i/N)|0;}
  if(n<9)return false;
  const cc=centerCell(),cx0=cc>=0?cc%N:sx/n,cy0=cc>=0?(cc/N)|0:sy/n;
  const pp=buildSAT(i=>(road[i]||plev[i]>=PATH)?1:0),dn=buildSAT(i=>{const o=occ[i];if(o>0){const b2=buildings.get(o);return b2&&b2.dens?1:0;}return 0;});
  const HS=[[3,3],[4,3],[3,4],[4,4]];
  let [hw0,hh0]=HS[Math.floor(hash(S.t|0,31)*HS.length)];
  const top=[];
  for(let y=1;y<N-hh0-1;y++)for(let x=1;x<N-hw0-1;x++){
    if(((x*5+y*11+(S.t|0))%2)!==0)continue;
    let ok=true;for(let yy=0;yy<hh0&&ok;yy++)for(let xx=0;xx<hw0;xx++)if(!cellFree((y+yy)*N+x+xx,6)){ok=false;break;}
    if(!ok)continue;
    if(attr[(y+(hh0>>1))*N+x+(hw0>>1)]<-6)continue;
    let dr=-1,ds=-1e9;
    const per=[];for(let i2=0;i2<hw0;i2++)per.push([x+i2,y-1],[x+i2,y+hh0]);for(let j2=0;j2<hh0;j2++)per.push([x-1,y+j2],[x+hw0,y+j2]);
    for(const [dx,dy] of per){const i=dy*N+dx;if(!doorFree(i))continue;const adj=rect(pp,dx,dy,1,1)*3+rect(pp,dx-1,dy-1,3,3);const sc=adj*2+hash(dx,dy)*0.5;if(sc>ds){ds=sc;dr=i;}}
    if(dr<0)continue;
    const nbD=rect(dn,x-1,y-1,hw0+2,hh0+2),rdn=rect(pp,x-2,y-2,hw0+4,hh0+4);
    if(!nbD&&!rdn&&n>9&&top.length)continue;
    const sc=nbD*1.5+rdn*0.3-Math.hypot(x+hw0/2-cx0,y+hh0/2-cy0)*0.15+hash(x*3,y+(S.t|0))*2;
    if(top.length<8||sc>top[top.length-1].sc){top.push({sc,x,y,dr});top.sort((a,c)=>c.sc-a.sc);if(top.length>8)top.pop();}
  }
  for(const cd of top){
    const hcs=[];for(let yy=0;yy<hh0;yy++)for(let xx=0;xx<hw0;xx++)hcs.push((cd.y+yy)*N+cd.x+xx);
    if(!flood(hcs)||rs[cd.dr]!==rstamp||!doorsAfterFlood(cd.x,cd.y,cd.x+hw0-1,cd.y+hh0-1,hcs))continue;
    addBuilding('house',cd.x,cd.y,false,{w:hw0,h:hh0,hx:cd.x,hy:cd.y,hw:hw0,hh:hh0,gcells:[hcs[hcs.length-1]],gfull:true,shape:'rect',diag:null,door:cd.dr,crop:'dens',side:'none',pure:false,dens:true,variant:(hash(cd.x*11,cd.y*7)*4)|0});
    return true;
  }
  return false;
}
// v61: dal Borgo fortificato, in centro (zona iniziale) due case vicine possono fondersi: la famiglia dell'una si trasferisce in un'altra casa libera e il suo terreno va ad allargare il giardino dell'altra
function mergeTick(){
  const c=centerCell();if(c<0)return false;const cx=c%N,cy=(c/N)|0;
  const hs=[...buildings.values()].filter(b=>b.type==='house'&&!b.dens&&b.state==='done'&&!b.work&&b.gfull!==false&&Math.hypot(b.cell%N-cx,((b.cell/N)|0)-cy)<=28);
  if(hs.length<4)return false;
  const ord=hs.slice().sort((a,b2)=>hash(a.id,S.t|0)-hash(b2.id,S.t|0));
  for(const A of ord){
    const lotA=new Set(A.cells.concat(A.ext||[]));
    for(const B of ord){
      if(B===A||B.level>A.level)continue;
      const cb=B.cells.concat(B.ext||[]);let touch=false;
      for(const i of cb){const x=i%N,y=(i/N)|0;for(let k=0;k<4&&!touch;k++){const nx=x+GX[k],ny=y+GY[k];if(nx>=0&&ny>=0&&nx<N&&ny<N&&lotA.has(ny*N+nx))touch=true;}if(touch)break;}
      if(!touch)continue;
      const mem=B.members.map(id=>vmap.get(id)).filter(Boolean);
      let tgt=null;
      if(mem.length){
        const head=mem.find(v=>v.id===B.head)||mem[0],base=fitScore(B,head);
        for(const h2 of buildings.values()){
          if(h2.type!=='house'||h2.state!=='done'||h2===A||h2===B||h2.work||h2.attr<=-4.5)continue;
          if(capOf(h2)-h2.members.length<mem.length)continue;
          const sc=fitScore(h2,head);if(sc>=base&&(!tgt||sc>tgt.sc))tgt={h:h2,sc};
        }
        if(!tgt)continue;
      }
      for(const v of mem)transfer(v,B,tgt.h,'La sua casa è stata accorpata a quella accanto: si trasferisce.');
      removeBuilding(B.id,true);
      A.ext=(A.ext||[]).concat(cb.filter(i=>!occ[i]&&dist[i]===1));
      for(const i of A.ext)occ[i]=A.id;
      A.merged=(A.merged|0)+1;occStamp++;stCache=null;acc.attr=99;
      hooks.regarden(A);hooks.ground();
      tell('merged','Due case del centro sono state unite: un solo giardino più grande e una famiglia si è trasferita altrove.');
      return true;
    }
  }
  return false;
}
function trySpawnHouse(){
  const t=BT.house;if(uncommitted('wood')<t.cost.wood||uncommitted('stone')<t.cost.stone)return;
  let sx=0,sy=0,n=0,mk=0;for(let i=0;i<N*N;i++){if(dist[i]===3)mk++;if(dist[i]===1){sx+=i%N;sy+=(i/N)|0;n++;}}
  if(!n)return;sx/=n;sy/=n;
  let veg=0,eggs=0;
  let nh=0,nw=0,np=0;
  for(const b of buildings.values())if(b.type==='house'){nh++;if(b.dens)continue;if(b.crop==='eggs')eggs++;else if(b.crop!=='wood')veg++;if(b.crop==='wood')nw++;if(b.pure)np++;}
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
  // v58: le prime case stanno più distanti (3 celle libere intorno, NON riservate al giardino futuro); se non c'è posto ci si accontenta di 1
  for(const mg of [3,1])for(const tol of [picky,-6]){
    const top=[];
    for(let y=0;y<=N-hh0;y++)for(let x=0;x<=N-hw0;x++){
      if(((x*7+y*13+(S.t|0))%3)!==0)continue;
      if(attr[(y+(hh0>>1))*N+x+(hw0>>1)]<tol)continue;
      if(rect(blk,x,y,hw0,hh0))continue;
      if(rect(oc,x-mg,y-mg,hw0+2*mg,hh0+2*mg))continue;
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
      const fullG0=S.rank>=4; // v61: dal Borgo fortificato le case nascono già col giardino completo
      const gcs=growGarden(hcs,cd.dr,cd.x,cd.y,hw0,hh0,fullG0?9+Math.floor(hash(cd.x,cd.y+7)*10):4,(S.t|0)+cd.x*3,pp,null,fullG0?9:4); // v57: all'inizio solo un piccolo orto di 4 celle; v58: l'area del giardino futuro NON viene riservata
      if(!gcs)continue;
      const marks=hcs.concat(gcs),mxs=marks.map(i=>i%N),mys=marks.map(i=>(i/N)|0);
      const bx0=Math.min(...mxs),by0=Math.min(...mys),bx1=Math.max(...mxs),by1=Math.max(...mys);
      if(!flood(marks))continue;
      if(rs[cd.dr]!==rstamp||!doorsAfterFlood(bx0,by0,bx1,by1,marks))continue;
      // v23: circa il 12% delle case (una ogni 8) ha il giardino della legna: la sua coltura è la legna da ardere, al posto di ortaggi, uova o allevamento. La domanda di legna è piccola (1 al giorno per casa, solo d'inverno): con più giardini della legna non troverebbero chi baratta il cibo.
      // Serve una zona mercato (la famiglia baratta la legna con il cibo) e le prime due case coltivano cibo.
      const wood=mk>0&&nh>=2&&nw<Math.ceil((nh+1)*0.12)&&woodOK(cd.x,cd.y); // v81: la legna da ardere si raccoglie solo vicino a un bosco
      let crop=wood?'wood':veg<eggs?'veg':eggs<veg?'eggs':(hash(cd.x,cd.y)<.5?'veg':'eggs');
      // attività secondaria (indipendente dal giardino): pesca vicino all'acqua, caccia vicino a un bosco tranquillo; altrimenti nessuna
      const r=hash(cd.x*5,cd.y*3);let side='none';
      if(fishOK(cd.x,cd.y))side='fish';
      else if(huntOK(cd.x,cd.y)&&r<0.7)side='hunt';
      // circa il 35% dei giardini di cibo è "puro": non diventa mai allevamento né bottega (il giardino della legna è già fisso)
      const pt=(nh-nw+1)*0.35;
      const pure=!wood&&(np<pt-0.5||(np<pt+0.5&&hash(cd.x*3,cd.y*7)<0.5));
      if(pure&&crop==='eggs')crop='veg'; // un giardino fisso non ha galline né uova: solo orto e fiori
      addBuilding('house',bx0,by0,false,{w:bx1-bx0+1,h:by1-by0+1,hx:cd.x,hy:cd.y,hw:hw0,hh:hh0,gcells:gcs,gfull:fullG0,shape:'organic',diag:null,door:cd.dr,crop,side,pure,variant:(hash(cd.x*11,cd.y*7)*4)|0})
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
  if(h&&h.level>=2&&h.flags.church&&v.n.church>=40)s+=6; // andare in chiesa consola
  for(const k of NK)if(v.n[k]<25)s-=(25-v.n[k])*0.4; // bisogni insoddisfatti pesano (fino a 10 punti ciascuno)
  if(h&&h.state==='done'){s+=h.fun||0;s+=festJoy(h);if(h.level>=3&&h.goods.clothes>=1)s+=3;s+=Math.round(SHOE_JOY*shoeCover());} // v32: taverna e sala delle feste vicine, abiti in casa
  if(taxAct)s+=TAX_JOY[S.taxRate]||0; // v80: editto delle tasse
  if(h&&(h.owed|0)>0&&wagePayer()==='town')s-=h.owed>=WAGE_OWE_CAP?15:h.owed>=11?10:4; // v80: stipendi arretrati
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
  const jb=v.job&&buildings.get(v.job);if(!jb||v.child||v.ill||LIFEST.has(v.state)||v.inside)return;
  const t=jb.type,before=skLevel(v,t);v.sk[t]=(v.sk[t]||0)+1;
  const after=skLevel(v,t);
  if(after>before){logV(v,'Diventa '+SKNAME[after].toLowerCase()+' come '+TRADENAME[t]+' (livello '+after+').');if(after>=SKMAX)tell('master','Un abitante è diventato maestro del suo mestiere: lavora molto meglio e chi ha quel mestiere lo riprende volentieri.');}
}
const jobSkill=v=>{const jb=v.job&&buildings.get(v.job);return jb?skLevel(v,jb.type):0;};
// ---- bisogni per abitante (v58) ----
// Ogni abitante ha indicatori 0-100 che calano nel tempo, ciascuno con un proprio decadimento: giorni (di DAY secondi) per scendere da 100 a 20.
// Sotto NEED_LOW cerca di soddisfare il bisogno; completato, torna a 100. Acqua, cibo e riposo sono quotidiani; chiesa e compagnia hanno ritmi più lunghi.
const NEEDS={water:{days:0.8,n:'Acqua'},food:{days:1.0,n:'Cibo'},rest:{days:0.75,n:'Riposo'},church:{days:4,n:'Chiesa'},social:{days:6,n:'Compagnia'}};
const NEED_LOW=20,BEDTIME=65,NK=Object.keys(NEEDS),REST_REC=100/(0.4*DAY);
const LIFEST=new Set(['toHomeLife','sleep','eat','toWell','draw','toChurch','pray','toPlaza','chat','toStoreSleep','wait','idle']);
function needsTick(v,hasPlaza){
  const n=v.n,h=v.home&&buildings.get(v.home),sl=v.state==='sleep',c=80/DAY*v.nv;
  const act=(v.state==='chop'||v.state==='mine'||v.state==='till'||v.state==='build')?1.3:1;
  const circ=S.ph==='night'?2.2:S.ph==='evening'?1.5:S.ph==='meal'?1:0.8; // di notte si è più stanchi
  n.food=Math.max(0,n.food-c/NEEDS.food.days*(sl?0.5:1)*act);
  n.water=Math.max(0,n.water-c/NEEDS.water.days*(sl?0.5:1)*act);
  if(!sl)n.rest=Math.max(0,n.rest-c/NEEDS.rest.days*circ*act);
  if(h&&h.state==='done'&&h.level>=2)n.church=Math.max(0,n.church-c/NEEDS.church.days);else n.church=100; // la chiesa conta dal livello 2
  if(hasPlaza)n.social=Math.max(0,n.social-c/NEEDS.social.days);else n.social=100;
  if(!h||h.state!=='done'){n.food=Math.max(n.food,30);n.water=Math.max(n.water,30);} // chi non ha casa si arrangia
}
function pickNeed(v,onlyHome){
  // la sera e la notte si va a letto già a riposo medio (65%): è l'ora di dormire; di giorno solo quando si è davvero stanchi (20%)
  const bed=S.ph==='night'||S.ph==='evening';
  let bk=null,bm=1e9;
  for(const k of NK){
    if(onlyHome&&k!=='food'&&k!=='rest')continue;
    const lim=k==='rest'&&bed?BEDTIME:NEED_LOW,val=v.n[k];
    if(val<lim&&((v.nc&&v.nc[k])||0)<=S.t&&val-lim<bm){bm=val-lim;bk=k;}
  }
  return bk;
}
const needCool=(v,k,sec)=>{if(!v.nc)v.nc={};v.nc[k]=S.t+sec;};
function nearTo(v,type,cell,maxd,state){
  const t=nearestOf(type,cell,maxd);if(!t||!route(v,t.cell,t.id))return false;v.state=state;return true;
}
// prova a soddisfare un bisogno; true se ha iniziato un'azione
function doNeed(v,k,h){
  const home=h&&h.state==='done';
  switch(k){
    case 'food':if(home&&goHome(v,'eat'))return true;needCool(v,k,DAY*0.15);return false;
    case 'rest':
      if(home&&goHome(v,'sleep'))return true;
      {const tn=v.tentId&&buildings.get(v.tentId);if(tn&&tn.state==='done'&&route(v,tn.cell,tn.id)){v.state='toStoreSleep';return true;}
       const st=nearestStore(v.cell);if(st&&route(v,st.cell,st.id)){v.state='toStoreSleep';return true;}}
      v.inside=false;v.state='sleep';v.moving=false;return true; // dorme dove si trova
    case 'water':if(nearTo(v,'well',home?h.cell:v.cell,105,'toWell'))return true;v.n.water=Math.max(v.n.water,45);return false; // senza pozzo: acqua di botte
    case 'church':if(home&&h.level>=2&&nearTo(v,'church',h.cell,105,'toChurch'))return true;needCool(v,k,DAY*0.5);return false;
    case 'social':if(nearTo(v,'plaza',home?h.cell:v.cell,105,'toPlaza'))return true;needCool(v,k,DAY*0.5);return false;
  }
  return false;
}
// v65: in una bottega con almeno un addetto istruito tutti rendono il 30% in più (EDU_BLD); fuori dalle botteghe (famiglia, giardino) resta il +25% personale
function eduBld(b){if(!b)return 1;if(!b.workers.length)return 0;for(const id of b.workers){const w=vmap.get(id);if(w&&w.schooled)return EDU_BLD;}return 1;}
const eduMul=v=>{const b=v.job&&buildings.get(v.job),e=b?eduBld(b):0;return e?e:v.schooled?EDU_WORK:1;};
const hpOf=v=>v.hp===undefined?100:v.hp;
const workRate=v=>(hpOf(v)<100?0.6+0.4*hpOf(v)/100:1)*(v.trait==='pigro'?0.6:1)*(v.joy<35?0.8:1)*eduMul(v)*(1+SK_WORK*jobSkill(v))*(v.job?condF(buildings.get(v.job)):1);
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
  const jh=jb&&EDUREQ[jb.type]&&!heir.schooled?ms.find(x=>!x.ill&&!x.job&&x.schooled):heir;
  if(jb&&jh&&jb.state==='done'&&BT[jb.type].slots>0&&!jh.job&&!jh.ill){
    setJob(jh,jb);jh.duty=false;jh.inh=true;jb.workers.push(jh.id);S.inherits++;
    logV(jh,'Eredita il posto di '+TRADENAME[jb.type]+' di '+v.name+'.');
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
  let hasPlaza=false;for(const b of buildings.values())if(b.type==='plaza'&&b.state==='done'){hasPlaza=true;break;}
  for(const v of villagers){
    v.age+=1/AGEY;
    const h=v.home&&buildings.get(v.home);
    needsTick(v,hasPlaza);v.joy=joyOf(v);skillTick(v);wageTick(v);
    // chi resta a lungo molto infelice se ne va (mai sotto gli 8 abitanti)
    if(!v.child&&v.joy<25)v.sad++;else v.sad=Math.max(0,v.sad-2);
    if(v.sad>=DAY*1.5&&villagers.length-leavers.length>8)leavers.push(v);
    if(v.child&&v.age>=14){
      v.child=false;v.schooled=v.edu>=300;
      const ft0=h?famTrade(h):null,ft=ft0&&canWorkAt(v,ft0)?ft0:null;
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
// v56: lavori su una casa già abitata. kind 'up' = miglioramento di livello (la casa resta abitata mentre i costruttori lavorano).
function startHouseWork(b,kind,cost,time,extra){
  b.work=Object.assign({kind,time,st:0},extra||{});
  b.cost=Object.assign(mkMat(),{wood:cost.wood||0,stone:cost.stone||0});b.got=mkMat();b.fly=mkMat();b.prog=0;
  hooks.regarden(b);
}
function endWork(b){b.work=null;b.cost=null;b.prog=1;b.got=mkMat();b.fly=mkMat();}
function workDone(b){
  const w=b.work;endWork(b);
  if(w.kind==='up'){
    b.level++;b.up=0;chooseTier(b);hooks.upgraded(b);acc.attr=99;
    tell('upg','Una casa è stata migliorata dai costruttori: più spazio per la famiglia e nuove attività nel giardino.');
  }
  else if(w.kind==='garden'||w.kind==='ext'){
    if(w.kind==='garden'){b.gcells=b.gcells.concat(w.cells);b.gfull=true;setGardenBox(b);b.cells=lotCells(b);}
    else b.ext=b.ext.concat(w.cells);
    occStamp++;hooks.ground();
    tell(w.kind==='garden'?'gardenBuilt':'gardenExt',w.kind==='garden'?'Una famiglia ha costruito il suo giardino: i costruttori hanno portato il legno e hanno steccato il terreno.':'Un giardino è stato ampliato dai costruttori.');
  }
  hooks.regarden(b);
}
// v57: produzione in proporzione alla grandezza: un orto iniziale (4 celle, nessun giardino costruito) rende il 75%; un giardino costruito 100% a 9 celle, +25% per ogni cella oltre (tetto 24)
// v63: fertilità del suolo: media sulle celle del giardino (con gli ampliamenti); il giardino cresce più o meno in fretta
function soilOf(b){let s=0,n=0;for(const c of b.gcells){s+=soilF(fert[c]);n++;}if(b.ext)for(const c of b.ext){s+=soilF(fert[c]);n++;}return n?s/n:1;}
const gardenFactor=b=>b.gfull===false?0.75:1+0.25*Math.max(0,Math.min(GMAX,b.gcells.length+b.ext.length)-9);
function setGardenBox(b){const xs=b.gcells.map(i=>i%N),ys=b.gcells.map(i=>(i/N)|0);b.gx=Math.min(...xs);b.gy=Math.min(...ys);b.gw=Math.max(...xs)-b.gx+1;b.gh=Math.max(...ys)-b.gy+1;}
// v57: ogni ampliamento del giardino è un lavoro: celle prenotate, il costruttore porta il legno e costruisce (staccionata e piante compaiono a fine lavori)
function beginGardenWork(b,kind,cells){
  if(b.work||!cells.length)return false;
  const n=cells.length,cost={wood:1+Math.ceil(n/4),stone:0};
  if(uncommitted('wood')<cost.wood)return false;
  for(const i of cells)occ[i]=b.id;
  occStamp++;
  startHouseWork(b,kind,cost,10+3*n,{cells:cells.slice()});
  return true;
}
// dal livello 2 la casa si costruisce il giardino vero (9-18 celle in tutto) intorno all'orto iniziale
function planGarden(b){
  const house=[];for(let yy=b.hy;yy<b.hy+b.hh;yy++)for(let xx=b.hx;xx<b.hx+b.hw;xx++)house.push(yy*N+xx);
  const pp=buildSAT(i=>(road[i]||plev[i]>=PATH)?1:0);
  const target=9+Math.floor(hash(b.x,b.y+7)*10);
  const full=growGarden(house,b.door,b.hx,b.hy,b.hw,b.hh,target,(S.t|0)+b.id*3,pp,b.gcells,b.gcells.length+3,b.id);
  if(!full){b.gfull=true;return false;} // niente spazio libero: l'orto resta com'è
  const have=new Set(b.gcells),cells=full.filter(i=>!have.has(i));
  const xs=cells.map(i=>i%N),ys=cells.map(i=>(i/N)|0);
  if(!reachable(b.door,cells)||!doorsOK(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys),cells))return false;
  return beginGardenWork(b,'garden',cells);
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
    if(b.crop!=='wood'&&!b.dens)b.pa.g+=share/(b.crop==='herd'?26:16)*(b.level>=3?1.5:1)*sf*gardenFactor(b)*soilOf(b)*(b.goods.tools>=1?1.1:1);
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
    if(b.level>=3&&!b.pure&&!b.dens&&b.crop!=='wood'&&Math.random()<0.25){const had=b.craft||b.bake||b.weave||b.tailor;if(!had){chooseTier(b,true);if(b.craft||b.bake||b.weave||b.tailor){hooks.upgraded(b);}}}
    if(b.dens){ // v61: se in famiglia nessuno ha fatto la spesa (tutti al lavoro), un carrettiere del magazzino porta una razione: 2 pezzi a persona per tipo di cibo, fino a 3 tipi; e 2 legni se servono
      const fc=TYPES.reduce((a2,t2)=>a2+b.goods[t2],0);
      if(fc<b.members.length*6){const ks=TYPES.filter(t2=>Math.floor(S.stock[t2]||0)>=2).sort((a2,c2)=>b.ate[a2]-b.ate[c2]).slice(0,3);for(const k of ks){const q=Math.min(Math.floor(S.stock[k]),Math.max(2,Math.ceil(b.members.length*2)),12-b.goods[k]);if(q>0){S.stock[k]-=q;b.goods[k]+=q;S.fetched=(S.fetched|0)+q;}}}
      if(b.goods.firewood<fuelNeed()&&S.stock.wood>=30){S.stock.wood-=2;b.goods.firewood+=2;}
    }
    if(S.season===3){if(b.goods.firewood>=1){b.goods.firewood--;b.warm=true;}else{b.warm=false;if(b.crop!=='wood')tell('cold','Una casa è rimasta senza legna da ardere: solo le famiglie con il giardino della legna la producono, le altre la comprano al banco del mercato. Disegna una zona mercato.');}}else{b.warm=true;if(S.day%2===0&&b.goods.firewood>=1)b.goods.firewood--;}}  // v23: cucina tutto l'anno: fuori dall'inverno 1 legna ogni 2 giorni
  b.attr=attr[b.cell];b.fun=funOf(b);
  // v36.1: il giardino cresce piano piano verso la strada più vicina (non solo al salto di livello)
  if(!b.work&&!b.dens){
    if(b.gfull===false){if(b.level>=2&&hash(S.t|0,b.id*7)<0.6)planGarden(b);}
    else if(b.gcells.length+b.ext.length<ROADMAX){
      if(hash(S.t|0,b.id*13)<0.25)expandGarden(b);
      else if(hash(S.t|0,b.id*29)<0.2)claimLane(b);
    }
  }
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
    else if(ok&&taxRefuses(b)){b.up=Math.min(b.up,24);b.noUp=true;}
    else if(ok){b.noUp=false;b.up=Math.min(25,b.up+(schooledIn(b)?2:1)+(b.well>=90?1:0));
      if(b.up>=25&&!b.work){
        if(f.mat){
          // v56: il miglioramento è un lavoro vero: il costruttore porta il materiale alla casa e la costruisce; il livello sale a fine lavori
          startHouseWork(b,'up',uc||{wood:0,stone:0},20+8*b.level);
          tell('upgStart','Una famiglia ha i requisiti per migliorare la casa: un costruttore deve portare il materiale e costruire. Servono abitanti liberi e scorte nel magazzino.');
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
  let unmet=0;for(const b of buildings.values())if(b.state==='done'&&BT[b.type].slots>0&&b.type!=='store'&&!b.sur&&b.want>=1&&b.workers.length<1)unmet++;
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
  const v=addVillager(g.x,g.z,22+Math.random()*16);arrivalLit(v);v.home=pk.id;pk.members.push(v.id);S.settled++;
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
  if(g.mil){updMil(g,dt);return;}
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
    case 'cToPost':if(moveV(g,dt)){g.inside=true;g.state='cTrade';g.timer=TRADE_STAY;}break;
    case 'cTrade':g.timer-=dt;if(g.timer<=0){g.inside=false;if(tradeStatus().ok)doTrade(g);startLeave(g,false);}break;
  }
}
function spawnGuest(){
  if(S.edicts.quarantine)return;
  if(guests.filter(x=>!x.caravan&&!x.mil).length>=5||(S.ph!=='work'&&S.ph!=='evening'))return;
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
// ---- v44: commercio, carovane e rotte (tramite la Merceria) ----
// Il merciaio tratta con le carovane: vende ciò che il paese ha in più e compra ciò che manca, a denari. Attrezzi, pane, tessuto e abiti passano dagli scaffali della merceria
// (e dalle scorte dei magazzini); legno, pietra, ferro e assi dal magazzino; pesce e carne dalle scorte del granaio.
const TRADE_STOCK={wood:1,stone:1,iron:1,planks:1,rope:1,bars:1,weapons:1,salt:1,cured:1,cheese:1,beer:1,wine:1,hides:1,leather:1,shoes:1},TRADE_FOOD={fish:1,meat:1,game:1};
const heldOf=g=>g==='wood'||g==='stone'||g==='iron'?heldCenter(g):S.stock[g];
const openMerceries=()=>{const r=[];for(const o of buildings.values())if(merceryOpen(o))r.push(o);return r;};
function needAll(g){let n=0;for(const h of buildings.values())if(h.type==='house'&&h.state==='done'&&h.members.length)n+=Math.ceil(needOfGood(h,g));return n;}
const shelfTotal=g=>{let n=0;for(const o of openMerceries())n+=o.shelf[g]||0;return n;};
const shelfRoom=g=>{let n=0;for(const o of openMerceries())n+=Math.max(0,SHELFCAP-(o.shelf[g]||0));return n;};
const tradeKeep=g=>T_KEEP[g]+(TRADE_STOCK[g]?0:needAll(g));
function poolOf(g){
  if(TRADE_STOCK[g])return Math.min(heldOf(g),uncommitted(g));
  if(TRADE_FOOD[g])return Math.floor(S.stock[g]||0);
  return shelfTotal(g)+Math.floor(S.stock[g]||0);
}
// quanto il paese può vendere senza restare a corto / quanto comprerebbe volentieri
function surplusOf(g){return Math.max(0,Math.floor(poolOf(g)-tradeKeep(g)));}
function demandOf(g){
  if(TRADE_STOCK[g]){if(g==='planks'&&!countDone('carpenter'))return 0;if(g==='weapons'&&!countDone('barracks'))return 0;return Math.max(0,Math.min(T_TARGET[g]-S.stock[g],stockRoom(g)));}
  const need=needAll(g);if(need<=0)return 0;
  if(TRADE_FOOD[g])return Math.max(0,Math.min(T_TARGET[g]-poolOf(g),need));
  return Math.max(0,Math.min(T_TARGET[g]-poolOf(g),shelfRoom(g),need));
}
function takeGood(g,q){
  q=Math.min(q,surplusOf(g));if(q<=0)return 0;
  if(TRADE_STOCK[g]||TRADE_FOOD[g]){S.stock[g]-=q;return q;}
  let left=q;const st=Math.min(Math.floor(S.stock[g]||0),left);S.stock[g]-=st;left-=st;
  for(const o of openMerceries()){if(left<=0)break;const n=Math.min(left,o.shelf[g]||0);o.shelf[g]-=n;left-=n;}
  return q-left;
}
function receiveGood(g,q){
  q=Math.min(q,demandOf(g));if(q<=0)return 0;
  if(TRADE_STOCK[g]){S.stock[g]+=q;return q;}
  let left=q;
  if(TRADE_FOOD[g]){
    const hs=[...buildings.values()].filter(h=>h.type==='house'&&h.state==='done'&&h.members.length&&needOfGood(h,g)>0).sort((a,b)=>needOfGood(b,g)-needOfGood(a,g));
    for(const h of hs){const n=Math.min(left,Math.ceil(needOfGood(h,g)));h.goods[g]+=n;left-=n;if(left<=0)break;}
  }else{
    for(const o of openMerceries().sort((a,b)=>(a.shelf[g]||0)-(b.shelf[g]||0))){const n=Math.min(left,SHELFCAP-(o.shelf[g]||0));if(n>0){o.shelf[g]+=n;left-=n;}if(left<=0)break;}
  }
  return q-left;
}
function logTrade(e){S.tlog.unshift(e);if(S.tlog.length>12)S.tlog.length=12;}
// la carovana arriva alla merceria: vende le eccedenze del paese (prezzi della città, ±10%) e compra il necessario con i denari in cassa
function doTrade(g){
  const T=TOWNS[g.route],r=S.routes.find(x=>x.id===g.route);if(!T||!r)return null;
  const jit=()=>0.9+Math.random()*0.2;
  const sold=[],bought=[];let earned=0,spent=0;
  if(S.tradeOpt.sell){
    for(const k of Object.keys(T.buys).sort((a,b)=>T.buys[b]-T.buys[a])){
      const p=Math.max(1,Math.round(T.buys[k]*jit())),q=takeGood(k,VISIT_CAP);if(q<=0)continue;
      S.coins+=q*p;earned+=q*p;sold.push({k,q,p});
    }
  }
  if(S.tradeOpt.buy){
    let budget=Math.floor(S.coins*BUY_SHARE);
    for(const k of Object.keys(T.sells).sort((a,b)=>demandOf(b)*T.sells[b]-demandOf(a)*T.sells[a])){
      const p=Math.max(1,Math.round(T.sells[k]*jit())),aff=Math.floor(budget/p),q=receiveGood(k,Math.min(VISIT_CAP,aff));if(q<=0)continue;
      S.coins-=q*p;budget-=q*p;spent+=q*p;bought.push({k,q,p});
    }
  }
  r.visits++;r.earned+=earned;r.spent+=spent;r.last=S.t;S.trade.visits++;S.trade.sold+=earned;S.trade.bought+=spent;
  const e={t:S.t,route:g.route,sold,bought,earned,spent};logTrade(e);
  if(sold.length||bought.length)tell('trade1','La prima carovana di '+T.name+' ha commerciato alla Merceria: guarda il registro delle rotte (clic sui Denari) per i dettagli.');
  return e;
}
// una cella percorribile sul bordo della mappa, nella fascia centrale del lato della città
function edgeCell(id){
  for(let k=0;k<14;k++){
    const t=((CT-18+Math.random()*36)*SC)|0;let x,y;
    if(id==='w'){x=0;y=t;}else if(id==='e'){x=N-1;y=t;}else if(id==='n'){x=t;y=0;}else{x=t;y=N-1;}
    const c=y*N+x;if(!water[c]&&!occ[c]&&!tree[c]&&!rock[c])return c;
  }
  return -1;
}
// stato del commercio, per pannelli e test: perché le carovane non arrivano
function tradeStatus(){
  const ms=[...buildings.values()].filter(b=>b.type==='mercery');
  if(!ms.length)return {ok:false,why:"Costruisci una Merceria (categoria Botteghe): senza di essa nessuna carovana arriva e nessuna rotta si può aprire."};
  if(!ms.some(b=>b.state==='done'))return {ok:false,why:'La Merceria è ancora in costruzione.'};
  if(!ms.some(merceryOpen))return {ok:false,why:"La Merceria non ha un merciaio: servono abitanti liberi che ci lavorino."};
  if(S.edicts.quarantine)return {ok:false,why:'Quarantena in vigore: il commercio è fermo.'};
  return {ok:true,why:''};
}
function unlockRoute(id){
  const r=S.routes.find(x=>x.id===id),T=TOWNS[id];
  if(!r||!T)return {ok:false,msg:'Rotta sconosciuta.'};
  if(r.open)return {ok:false,msg:'Questa rotta è già aperta.'};
  if(!countDone('mercery'))return {ok:false,msg:'Prima costruisci una Merceria.'};
  if(S.coins<T.cost)return {ok:false,msg:'Servono '+T.cost+' denari per aprire la rotta di '+T.name+' (ne hai '+S.coins+').'};
  S.coins-=T.cost;r.open=true;r.next=15;r.blocked=false;
  return {ok:true,msg:'Rotta aperta: le carovane di '+T.name+' (da '+T.side+') arriveranno presto alla Merceria.'};
}
function setTradeOpt(k,v){if(k in S.tradeOpt)S.tradeOpt[k]=!!v;}
function tradeTick(){
  for(const r of S.routes)if(r.open&&r.next>0)r.next--;
  if(!S.routes.some(r=>r.open))return;
  if(!tradeStatus().ok)return;
  if(S.ph!=='work'&&S.ph!=='evening')return;
  const hubs=openMerceries();if(!hubs.length)return;
  let live=0;for(const g of guests)if(g.caravan)live++;
  if(live>=MAXCARAV)return;
  for(const r of S.routes){
    if(!r.open||r.next>0)continue;
    if(guests.some(g=>g.caravan&&g.route===r.id))continue;
    const c=edgeCell(r.id);if(c<0){r.blocked=true;r.next=20;continue;}
    const hub=hubs[(Math.random()*hubs.length)|0];
    const path=astar(c,hub.cell,hub.id);if(!path){r.blocked=true;r.next=20;continue;}
    r.blocked=false;r.next=Math.round(CARAVAN_GAP*(0.8+Math.random()*0.5));
    const g={id:nextId++,guest:true,caravan:true,kind:'merchant',horse:true,route:r.id,inn:hub.id,x:cx2w(c%N),z:cy2w((c/N)|0),cell:c,exit:c,path,state:'cToPost',stay:'meal',timer:0,moving:false,inside:false,fa:0,carry:null,res:false,hungry:false,slept:false,sick:false};
    guests.push(g);hooks.villager(g);return;
  }
}
// ---- v48: il Regno. Titoli (da Accampamento a Capitale del Regno), progetti del Re, predoni e guerra ----
// In modalità storia (S.story) si parte con pochi strumenti: gli altri sono "progetti" che il Re concede a ogni nuovo titolo e che si comprano con risorse e, più avanti, anche con denari.
// Fuori dalla modalità storia (test) tutto è disponibile e non arrivano né messi né nemici. S.msgs è la coda delle pergamene del messo (le legge l'interfaccia).
const RANK_NAMES=['Accampamento','Casale','Villaggio','Borgo','Borgo fortificato','Terra murata','Città','Capitale del Regno'];
// v52: albero della conoscenza. Ogni progetto sta in un ramo (br) e può avere prerequisiti (req): per comprarlo bisogna già possedere quei progetti oltre ad avere il titolo giusto.
const BRANCHES=[{id:'vita',n:'Vita e comunità'},{id:'legno',n:'Legno, pietra e ferro'},{id:'campi',n:'Campi e cibo'},{id:'tessile',n:'Tessile e cuoio'},{id:'commercio',n:'Commercio e ospitalità'},{id:'difesa',n:'Difesa'},{id:'decoro',n:'Decoro e feste'}];
const PROJ=[
  {id:'well',br:'vita',rank:1,cost:{wood:10,stone:6}},{id:'d3',br:'commercio',rank:1,cost:{wood:12}},{id:'store',br:'commercio',rank:1,cost:{wood:18,stone:8}},{id:'d4',br:'legno',rank:1,cost:{wood:8}},{id:'forester',br:'legno',rank:1,req:['d4'],cost:{wood:10}},
  {id:'church',br:'vita',rank:2,cost:{wood:20,stone:30}},{id:'d2',br:'campi',rank:2,cost:{wood:14}},{id:'granary',br:'campi',rank:2,req:['d2'],cost:{wood:16,stone:8}},{id:'carpenter',br:'legno',rank:2,req:['d4'],cost:{wood:16,stone:8}},{id:'mason',br:'legno',rank:2,cost:{wood:12,stone:16}},{id:'claypit',br:'legno',rank:2,req:['mason'],cost:{wood:10,stone:6}},{id:'fisher',br:'campi',rank:2,cost:{wood:12}},{id:'hunter',br:'campi',rank:2,cost:{wood:12}},
  {id:'watchtower',br:'difesa',rank:3,cost:{wood:22,stone:18}},{id:'brickworks',br:'legno',rank:3,req:['claypit'],cost:{wood:16,stone:12}},{id:'limekiln',br:'legno',rank:3,req:['mason'],cost:{wood:14,stone:14}},{id:'mine',br:'legno',rank:3,req:['mason'],cost:{wood:20,stone:14}},{id:'mill',br:'campi',rank:3,req:['granary'],cost:{wood:20,stone:20}},{id:'school',br:'vita',rank:3,req:['church'],cost:{wood:24,stone:16}},{id:'infirmary',br:'vita',rank:3,req:['church'],cost:{wood:22,stone:16}},{id:'surgeon',br:'vita',rank:3,req:['school'],cost:{wood:20,stone:12}},{id:'smithy',br:'legno',rank:3,req:['mine','brickworks'],cost:{wood:20,stone:20}},{id:'cemetery',br:'vita',rank:3,req:['church'],cost:{wood:12,stone:16}},
  {id:'saltworks',br:'campi',rank:3,req:['fisher'],cost:{wood:14,stone:10}},{id:'butcher',br:'campi',rank:4,req:['hunter','saltworks'],cost:{wood:16,stone:10}},{id:'smokehouse',br:'campi',rank:4,req:['fisher','saltworks'],cost:{wood:16,stone:12}},{id:'bakery',br:'campi',rank:4,req:['mill'],cost:{wood:20,stone:20}},{id:'d5',br:'campi',rank:4,cost:{wood:12}},{id:'d6',br:'vita',rank:4,cost:{wood:20,stone:12}},{id:'sheepfold',br:'campi',rank:4,req:['d5'],cost:{wood:16,stone:4}},{id:'inn',br:'commercio',rank:4,req:['store'],cost:{wood:26,stone:18}},{id:'tavern',br:'commercio',rank:4,req:['inn'],cost:{wood:24,stone:16}},{id:'mercery',br:'commercio',rank:4,req:['store','d3'],cost:{wood:22,stone:16}},{id:'taxoffice',br:'commercio',rank:5,req:['mercery'],cost:{wood:20,stone:14}},{id:'barracks',br:'difesa',rank:4,req:['watchtower'],cost:{wood:30,stone:28}},
  {id:'charcoal',br:'legno',rank:4,req:['forester'],cost:{wood:14,stone:4}},{id:'smelter',br:'legno',rank:4,req:['mine','charcoal','brickworks'],cost:{wood:16,stone:24}},
  {id:'retting',br:'tessile',rank:5,cost:{wood:16,stone:6,coins:20}},{id:'ropewalk',br:'tessile',rank:5,req:['retting'],cost:{wood:18,stone:6,coins:30}},
  {id:'weaver',br:'tessile',rank:5,cost:{wood:20,stone:10,coins:30}},{id:'tailor',br:'tessile',rank:5,req:['weaver'],cost:{wood:20,stone:10,coins:30}},{id:'plaza',br:'decoro',rank:5,cost:{stone:30,coins:40}},{id:'hall',br:'decoro',rank:5,req:['plaza'],cost:{wood:30,stone:30,coins:60}},
  {id:'dairy',br:'campi',rank:5,req:['sheepfold'],cost:{wood:18,stone:8,coins:30}},{id:'brewery',br:'campi',rank:5,req:['mill'],cost:{wood:20,stone:10,coins:30}},{id:'winery',br:'campi',rank:6,req:['brewery'],cost:{wood:22,stone:12,coins:40}},
  {id:'tannery',br:'tessile',rank:5,cost:{wood:16,stone:8,coins:30}},{id:'cobbler',br:'tessile',rank:6,req:['tannery'],cost:{wood:14,stone:6,coins:40}},
  {id:'dyehouse',br:'tessile',rank:6,req:['retting','weaver'],cost:{wood:20,stone:10,coins:40}},
  {id:'flowers',br:'decoro',rank:6,req:['plaza'],cost:{wood:4,coins:10}},{id:'statue',br:'decoro',rank:6,req:['plaza'],cost:{stone:16,coins:50}}
];
const PROJ_BY=Object.fromEntries(PROJ.map(p=>[p.id,p]));
const PROJ_NAMES=Object.fromEntries(PROJ.map(p=>[p.id,({d2:'Zona agricola',d3:'Zona di mercato',d4:'Zona forestale',d5:'Zona di pascolo',d6:'Zona ad alta densità'})[p.id]||(BT[p.id]?BT[p.id].name:p.id)]));
const owns=id=>!S.story||!PROJ_BY[id]||!!S.proj[id];
const TOWER_R=24,TOWER_DPS=6,SIEGE_HOLD=90,SIDE_TXT={w:'ovest',n:'nord',e:'est',s:'sud'};
// v62: forza relativa ai predoni (un predone = 1): cittadino 1/3, guerriero 1, guerriero armato 5/3 (sia punti ferita sia danno al secondo).
// I valori qui sono quelli di un predone di forza 1 (24 pf, 4 danni/s): la banda del momento ha un moltiplicatore `pow` e i difensori scendono in campo con lo stesso moltiplicatore, così i rapporti restano sempre quelli.
const FRATIO={wolf:1/6,citizen:1/3,warrior:1,armed:5/3,soldier:5/3};
const ENEMY={raider:{hp:24,dps:4,spd:0.9},royal:{hp:90,dps:6,spd:0.9},soldier:{hp:40,dps:7,spd:1.1},
  wolf:{hp:24*FRATIO.wolf,dps:4*FRATIO.wolf,spd:1.15},
  citizen:{hp:24*FRATIO.citizen,dps:4*FRATIO.citizen,spd:1},warrior:{hp:24*FRATIO.warrior,dps:4*FRATIO.warrior,spd:1.1},armed:{hp:24*FRATIO.armed,dps:4*FRATIO.armed,spd:1.1}};
const WOUND_WAR=35,WOUND_CIT=60,HEAL_HOME=0.05,HEAL_CER=0.35,PREY_R=14; // v65: sotto WOUND_WAR/WOUND_CIT di salute guerrieri e cittadini non scendono in campo; guarigione al secondo a casa e vicino a un cerusico; raggio di caccia dei lupi (celle)
const DRAFT_R=28,DRAFT_MAX=8,DRAFT_SHARE=0.2; // v62: tetto ai cittadini chiamati alle armi per ogni banda (non solo in campo insieme): così un assalto non svuota il paese
const wolf0=()=>({next:0,seq:0,arm:0,killed:0,lost:0,eaten:0,bitten:0,dead:0,bands:{}});
const raid0=()=>({next:0,repelled:0,killed:0,lost:0,stolen:0,bands:{},seq:0,pow:1,fallen:0,drafted:0,arm:0,last:null});
const war0=()=>({phase:'none',at:0,wave:0,hold:0,defeats:0,killed:0});
const nd=(t,cur,n)=>({t,cur:Math.min(cur,n),n});
const openRoutes=()=>S.routes.filter(r=>r.open).length;
// requisiti per il titolo successivo: RANK_NEEDS[r+1] = ciò che il Re vuole vedere per concedere il titolo r+1
const RANK_NEEDS=[null,
  st=>[nd('Abitanti',st.pop,8),nd('Taglialegna',st.built.wood||0,1),nd('Cava di pietra',st.built.quarry||0,1),nd('Case',st.houses,3)],
  st=>[nd('Abitanti',st.pop,16),nd('Pozzo',st.built.well||0,1),nd('Lotti di mercato',st.dc[3],4)],
  st=>[nd('Abitanti',st.pop,28),nd('Chiesa',st.built.church||0,1),nd('Fattoria',st.farms,1)],
  st=>[nd('Abitanti',st.pop,40),nd('Torre di guardia',st.built.watchtower||0,1),nd('Assalti respinti',S.raid.repelled,1)],
  st=>[nd('Abitanti',st.pop,60),nd('Merceria',st.built.mercery||0,1),nd('Locanda',st.built.inn||0,1),nd('Caserma',st.built.barracks||0,1)],
  st=>[nd('Abitanti',st.pop,85),nd('Sala delle feste',st.built.hall||0,1),nd('Piazza',st.built.plaza||0,1),nd('Rotte aperte',openRoutes(),2)]];
const WAR_NEEDS=st=>[nd('Abitanti',st.pop,110),nd('Case signorili',st.levels[4]+st.levels[5],3),nd('Rotte aperte',openRoutes(),3)];
const needsMet=a=>a.every(x=>x.cur>=x.n);
function regnoTick(){
  if(!S.story)return;
  S.rk=(S.rk|0)+1;
  if(S.rk%4===0){
    if(S.rank<6){
      if(needsMet(RANK_NEEDS[S.rank+1](stats()))){S.rank++;S.msgs.push({k:'rank',r:S.rank});if(S.rank===3)S.raid.next=Math.round(DAY*1.5);}
    }else if(S.rank===6&&S.war.phase==='none'&&needsMet(WAR_NEEDS(stats()))){
      S.war.phase='warn';S.war.at=S.t+3*DAY;S.msgs.push({k:'war'});
    }
  }
  raidTick();wolfTick();warTick();deployTick();
  if(S.aqRule&&S.t>25)tell('aq0','Acqua: sotto il Centro Cittadino passa una falda già nota (zone azzurre sulla mappa del suolo, tasto L). Per scavare altri pozzi cerca le falde con il Rabdomante (B).');
}
// progetti del Re
function projectState(id){
  const p=PROJ_BY[id];if(!p)return {known:false};
  const owned=!!S.proj[id]||!S.story,locked=S.rank<p.rank,miss=[];
  for(const r of ['wood','stone','iron'])if(p.cost[r]&&uncommitted(r)<p.cost[r])miss.push(r);
  if(p.cost.coins&&S.coins<p.cost.coins)miss.push('coins');
  const need=(p.req||[]).filter(q=>!(S.proj[q]||!S.story));
  return {known:true,owned,locked,need,afford:!miss.length,miss,rank:p.rank,br:p.br,req:p.req||[],cost:p.cost};
}
function buyProject(id){
  const p=PROJ_BY[id];if(!p)return {ok:false,msg:'Progetto sconosciuto.'};
  const ps=projectState(id);
  if(ps.owned)return {ok:false,msg:'Questo progetto è già tuo.'};
  if(ps.locked)return {ok:false,msg:'Il Re concede questo progetto solo al titolo di '+RANK_NAMES[p.rank]+'.'};
  if(ps.need.length)return {ok:false,msg:'Prima serve il progetto precedente nell\'albero: '+ps.need.map(q=>PROJ_NAMES[q]||q).join(' e ')+'.',need:ps.need};
  if(!ps.afford){const nm={wood:'legno',stone:'pietra',iron:'ferro',coins:'denari'};return {ok:false,msg:'Non basta: servono '+ps.miss.map(r=>p.cost[r]+' di '+nm[r]).join(' e ')+' (parte del materiale è già destinata ai cantieri).'};}
  for(const r of ['wood','stone','iron'])if(p.cost[r])S.stock[r]-=p.cost[r];
  if(p.cost.coins)S.coins-=p.cost.coins;
  S.proj[id]=true;
  return {ok:true,msg:'Progetto acquistato: ora puoi costruirlo.'};
}
const msgCount=()=>S.msgs.length,peekMsg=()=>S.msgs[0]||null,takeMsg=()=>S.msgs.shift()||null;
function regnoInfo(st0){
  const st=st0||stats(),nx=S.rank<6?RANK_NEEDS[S.rank+1](st):(S.rank===6&&S.war.phase==='none')?WAR_NEEDS(st):null;
  return {story:S.story,rank:S.rank,name:RANK_NAMES[S.rank],nextName:S.rank<6?RANK_NAMES[S.rank+1]:S.rank===6?RANK_NAMES[7]:null,needs:nx,warNeeds:S.rank===6,war:S.war,raid:S.raid,raiders:enemiesOf('raid').length,wolves:enemiesOf('wolf').length,wolf:S.wolf,royals:enemiesOf('royal').length};
}
// truppe: predoni (side 'raid'), esercito del Re ('royal') e soldati della caserma ('mine') vivono in `guests` con mil:true, così si salvano e si disegnano come i viandanti
function enemiesOf(side){const r=[];for(const g of guests)if(g.mil&&g.side===side)r.push(g);return r;}
function newMil(side,kind,cell,path,target,mult){
  const E=ENEMY[kind],m=mult||1;
  return {id:nextId++,guest:true,mil:true,side,kind,hp:E.hp*m,mhp:E.hp*m,dps:E.dps*m,pw:m,spd:E.spd,target,x:cx2w(cell%N),z:cy2w((cell/N)|0),cell,exit:cell,path,state:'mGo',timer:0,hold:0,moving:false,inside:false,fa:0,carry:null,res:false,horse:false,caravan:false,band:0,loot:0,home:0,tgt:0};
}
function pickTarget(){
  const c=[];for(const b of buildings.values())if(b.state==='done'&&(b.type==='store'||b.type==='granary'||b.type==='mercery'))c.push(b);
  return c.length?c[(Math.random()*c.length)|0]:null;
}
function pickCenter(){let c=null;for(const b of buildings.values())if(b.type==='store'&&b.state==='done'){if(b.center)return b;c=b;}return c;}
function raidTick(){
  const R=S.raid;
  if(S.rank<3||S.war.phase==='warn'||S.war.phase==='fight')return;
  if(enemiesOf('raid').length)return;
  if(!R.seq&&!R.next&&!R.arm){R.arm=1;R.next=Math.round(DAY*1.5);} // v62: il primo timer si arma una volta sola (ora che si attacca di notte scade spesso di giorno)
  R.next=Math.max(0,R.next-1);
  if(R.next>0||S.ph!=='night')return; // v62: i briganti attaccano di notte
  if(!spawnRaid())R.next=15;
}
// v62: forza della banda. Cresce con il benessere (felicità media: un borgo ricco fa gola) e con le difese (torri, guerrieri, armi: i briganti si organizzano).
// pow va da 0,7 a 1,7 e moltiplica punti ferita e danno dei predoni; dv (0-1) aggiunge anche qualche predone in più.
function raidPower(){
  let tw=0;for(const b of buildings.values())if(b.state==='done'&&b.type==='watchtower')tw++;
  const dv=Math.min(1,tw*0.15+warriorPosts()*0.1+Math.min(S.stock.weapons||0,10)*0.02);
  let js=0;for(const v of villagers)js+=v.joy;
  const joy=villagers.length?js/villagers.length:50;
  return {pow:0.7+0.5*joy/100+0.5*dv,dv,joy};
}
function spawnRaid(){
  const t=pickTarget();if(!t)return false;
  const P=raidPower(),side=['w','n','e','s'][(Math.random()*4)|0],n=Math.max(2,Math.min(8,S.rank+Math.round(2*P.dv))),R=S.raid,bid=++R.seq;let made=0;
  for(let k=0;k<n;k++){
    const c=edgeCell(side);if(c<0)continue;
    const path=astar(c,t.cell,t.id);if(!path)continue;
    const g=newMil('raid','raider',c,path,t.id,P.pow);g.band=bid;guests.push(g);hooks.villager(g);made++;
  }
  if(!made)return false;
  R.bands[bid]={n:made,k:0,l:0};R.pow=P.pow;R.drafted=0;R.last={n:made,pow:P.pow,side};
  R.next=Math.round(DAY*(1.6+Math.random()*1.4));
  const how=P.pow>=1.35?'molto forti':P.pow>=1.05?'agguerriti':'male in arnese';
  hooks.toast('Briganti nella notte! Sono '+made+', '+how+', e arrivano da '+SIDE_TXT[side]+' verso '+BT[t.type].name.toLowerCase()+'. Guerrieri armati e torri di guardia difendono il borgo; i cittadini combattono solo se serve, ma rischiano la vita.');
  return true;
}
// ---- v65: i lupi. Di notte arrivano in branco (almeno 4), forza 1/6 di un brigante ciascuno (metà di un cittadino). Cercano allevamenti e pascoli (giardini con
// allevamento o galline, ovili) e azzannano chi si è attardato fuori di sera e di notte. Torri e guerrieri li combattono come i briganti; un guerriero da solo li batte, ma si ferisce.
function pickWolfTarget(){
  const c=[];
  for(const b of buildings.values()){
    if(b.state!=='done')continue;
    if(b.type==='sheepfold'||(b.type==='house'&&!b.pure&&(b.crop==='herd'||b.crop==='eggs')))c.push(b);
  }
  if(!c.length)for(const b of buildings.values())if(b.state==='done'&&b.type==='house')c.push(b);
  return c.length?c[(Math.random()*c.length)|0]:null;
}
function wolfTick(){
  const Wf=S.wolf;
  if(S.rank<2||S.war.phase==='warn'||S.war.phase==='fight')return;
  if(enemiesOf('wolf').length||enemiesOf('raid').length)return;
  if(!Wf.seq&&!Wf.next&&!Wf.arm){Wf.arm=1;Wf.next=Math.round(DAY*2);}
  Wf.next=Math.max(0,Wf.next-1);
  if(Wf.next>0||S.ph!=='night')return; // i lupi arrivano di notte
  if(!spawnWolves())Wf.next=15;
}
function spawnWolves(){
  const t=pickWolfTarget();if(!t)return false;
  const R=S.raid,Wf=S.wolf,pow=enemiesOf('raid').length?(R.pow||1):raidPower().pow;
  const side=['w','n','e','s'][(Math.random()*4)|0],n=4+((Math.random()*3)|0)+(S.rank>=4?1:0),bid=++Wf.seq;let made=0;
  for(let k=0;k<n;k++){
    const c=edgeCell(side);if(c<0)continue;
    const path=astar(c,t.cell,t.id);if(!path)continue;
    const g=newMil('wolf','wolf',c,path,t.id,pow);g.band=bid;g.prey=0;g.eat=0;guests.push(g);hooks.villager(g);made++;
  }
  if(made<4){ // un branco ha almeno 4 lupi: se non c'è posto per tutti il branco non esce
    for(const g of guests.filter(x=>x.mil&&x.side==='wolf'&&x.band===bid))endGuest(g);
    return false;
  }
  Wf.bands[bid]={n:made,k:0,l:0};R.pow=pow;R.drafted=0;
  Wf.next=Math.round(DAY*(2.2+Math.random()*2.5));
  hooks.toast('Ululati nella notte! Un branco di '+made+' lupi arriva da '+SIDE_TXT[side]+': cerca '+(t.type==='sheepfold'?"l'ovile":'gli animali delle case')+' e azzanna chi è rimasto fuori. Un guerriero li batte da solo, ma ne esce ferito: serve un cerusico.');
  return true;
}
// la preda: l'abitante più vicino rimasto fuori di sera o di notte (non chi è in casa, al lavoro dentro un edificio o già in battaglia)
function preyFor(g){
  if(S.ph!=='night'&&S.ph!=='evening')return null;
  let best=null,bd=PREY_R*CS;
  for(const v of villagers){
    if(v.inside||v.state==='war')continue;
    const d=Math.hypot(v.x-g.x,v.z-g.z);if(d<bd){bd=d;best=v;}
  }
  return best;
}
function wolfRepath(g){
  const t=buildings.get(g.target);
  if(!t){milLeave(g);return;}
  const p=astar(g.cell,t.cell,t.id);
  if(p){g.path=p;g.state='mGo';}else milLeave(g);
}
function wolfMaul(g,t){
  let n=0;
  if(t.type==='house'){const k=t.crop==='eggs'?'eggs':'meat';n=Math.min(t.goods[k]||0,2);t.goods[k]=(t.goods[k]||0)-n;}
  else if(t.type==='sheepfold'){n=Math.min(t.buf||0,3);t.buf=(t.buf||0)-n;}
  S.wolf.eaten+=n;
  if(n>0)tell('wolf1','I lupi hanno sbranato degli animali: torri di guardia e guerrieri vicino agli allevamenti e ai pascoli li tengono lontani.');
}
function wolfBite(g,v,dt){
  const hpMax=ENEMY.citizen.hp*(g.pw||1);
  v.hp=hpOf(v)-100*g.dps*dt/hpMax;
  if(!v.child)g.hp-=ENEMY.citizen.dps*(g.pw||1)*dt; // l'adulto si difende con la forza di un cittadino (1/3 di un brigante)
  v.cool=Math.max(v.cool,1);
  if(!v.bitten||S.t-v.bitten>20){v.bitten=S.t;S.wolf.bitten++;tell('wolf2','Un lupo ha azzannato un abitante rimasto fuori di notte: chi si attarda rischia la vita.');}
  if(v.hp<=0){S.wolf.dead++;g.prey=0;killV(v,'wolf');wolfRepath(g);}
}
function updWolf(g,dt){
  if(g.hp<=0){milGone(g,'dead');return;}
  if(g.hold>0){g.hold-=dt;g.moving=false;return;}
  if(g.state==='mFlee'){if(moveV(g,dt))milGone(g,'fled');return;}
  if(g.state==='mEat'){g.moving=false;g.eat+=dt;if(g.eat>=5)milLeave(g);return;}
  g.timer-=dt;
  if(g.timer<=0){
    g.timer=1.4;
    const v=preyFor(g);
    if(v){g.prey=v.id;const p=astar(g.cell,v.cell,0);if(p){g.path=p;g.state='mPrey';}}
    else if(g.state==='mPrey'){g.prey=0;wolfRepath(g);}
  }
  if(g.state==='mPrey'){
    const v=g.prey&&vmap.get(g.prey);
    if(!v||v.inside||v.state==='war'){g.prey=0;wolfRepath(g);return;}
    if(Math.hypot(v.x-g.x,v.z-g.z)>1.4){moveV(g,dt);return;}
    g.moving=false;wolfBite(g,v,dt);return;
  }
  if(g.state==='mGo'){
    if(!buildings.get(g.target)){const nt=pickWolfTarget();if(!nt){milLeave(g);return;}g.target=nt.id;wolfRepath(g);return;}
    if(moveV(g,dt)){g.state='mEat';g.eat=0;wolfMaul(g,buildings.get(g.target));}
  }
}
// ---- v65: ferite. La salute degli abitanti (v.hp, 100 se sano) cala in battaglia e per i morsi; guarisce piano a casa e in fretta entro HEAL_R celle da un cerusico (addetto istruito)
function surgeonOpen(b){
  if(b.type!=='surgeon'||b.state!=='done')return false;
  for(const id of b.workers){const w=vmap.get(id);if(w&&w.schooled)return true;}
  return false;
}
function surgeonFor(v){
  const hb=v.home&&buildings.get(v.home),cell=hb?hb.cell:v.cell,cx=cell%N,cy=(cell/N)|0;
  let best=null,bd=1e9;
  for(const b of buildings.values()){
    if(!surgeonOpen(b))continue;
    const d=Math.hypot(b.cell%N-cx,(b.cell/N|0)-cy);if(d<=HEAL_R&&d<bd){bd=d;best=b;}
  }
  return best;
}
function healTick(){
  for(const v of villagers){
    const h=hpOf(v);if(h>=100||v.state==='war')continue;
    const sg=surgeonFor(v),r=sg?HEAL_CER:HEAL_HOME,nh=Math.min(100,h+r);
    if(sg)sg.healed=(sg.healed||0)+(nh-h);
    v.hp=nh>=100?100:nh;
  }
}
function milGone(g,why){
  if(g.side==='raid'){
    const R=S.raid,bd=R.bands[g.band];
    if(why==='dead'){R.killed++;if(bd)bd.k++;}else{R.lost++;if(bd)bd.l++;}
    if(bd&&bd.k+bd.l>=bd.n){
      delete R.bands[g.band];
      if(bd.k>=Math.ceil(bd.n/2)){R.repelled++;hooks.toast('Assalto respinto: i briganti sono stati cacciati!');}
      else hooks.toast('I briganti sono fuggiti col bottino. Servono più guerrieri armati e torri di guardia.');
    }
  }else if(g.side==='royal'&&why==='dead')S.war.killed++;
  else if(g.side==='wolf'){
    const Wf=S.wolf,bd=Wf.bands[g.band];
    if(why==='dead'){Wf.killed++;if(bd)bd.k++;}else{Wf.lost++;if(bd)bd.l++;}
    if(bd&&bd.k+bd.l>=bd.n){
      delete Wf.bands[g.band];
      hooks.toast(bd.k>=Math.ceil(bd.n/2)?'Il branco di lupi è stato messo in fuga.':'Il branco di lupi si è ritirato nel bosco con la preda.');
    }
  }else if(g.side==='mine'){
    // un'arma torna in magazzino se il guerriero sopravvive; se muore va perduta
    if(g.armed&&why!=='dead')S.stock.weapons=(S.stock.weapons||0)+1;
    const v=g.vid&&vmap.get(g.vid);
    if(v){
      if(why==='dead'){
        S.raid.fallen=(S.raid.fallen|0)+1;
        hooks.toast((g.kind==='citizen'?'Un cittadino':'Un guerriero')+' è caduto in combattimento: '+v.name+'.');
        killV(v,'raid');
      }else{
        // v65: le ferite restano: la salute in battaglia diventa la salute dell'abitante (guarisce piano a casa, in fretta dal cerusico)
        const f=Math.max(0,g.hp)/g.mhp;v.hp=f>=0.99?100:Math.max(1,Math.round(100*f));
        v.inside=false;v.state='idle';v.fid=0;v.x=g.x;v.z=g.z;v.cell=g.cell;v.path=[];v.moving=false;
      }
    }
  }
  endGuest(g);
}
function milLeave(g){
  const p=astar(g.cell,g.exit,0);
  if(!p){milGone(g,'fled');return;}
  g.path=p;g.state='mFlee';g.spd=(g.spd||1)*1.05;
}
function loot(g){
  const k=Math.max(1,S.rank),take={wood:8+2*k,stone:5+k};let got=0;
  for(const r of ['wood','stone']){const q=Math.max(0,Math.min(S.stock[r],take[r]));S.stock[r]-=q;got+=q;}
  const cq=Math.min(S.coins,4*k);S.coins-=cq;got+=cq;
  g.loot=got;S.raid.stolen+=got;
}
function nearestEnemy(g){
  let best=null,bd=1e9;
  for(const e of guests){if(!e.mil||e.side==='mine'||e.hp<=0)continue;const d=Math.hypot(e.x-g.x,e.z-g.z);if(d<bd){bd=d;best=e;}}
  return best;
}
function goHomeMil(g){
  const b=buildings.get(g.home);if(!b){milGone(g,'home');return;}
  const p=astar(g.cell,b.entrance>=0?b.entrance:b.cell,0);if(!p){milGone(g,'home');return;}
  g.path=p;g.state='mHome';
}
function updMil(g,dt){
  if(g.side==='wolf'){updWolf(g,dt);return;}
  if(g.hp<=0){milGone(g,'dead');return;}
  if(g.hold>0){g.hold-=dt;g.moving=false;return;}
  switch(g.state){
    case 'mGo':{
      let t=buildings.get(g.target);
      if(!t){const nt=g.side==='royal'?pickCenter():pickTarget();if(!nt){milLeave(g);break;}g.target=nt.id;const p=astar(g.cell,nt.cell,nt.id);if(p)g.path=p;else milLeave(g);break;}
      if(moveV(g,dt)){
        if(g.side==='raid'){loot(g);milLeave(g);}
        else{g.state='mSiege';g.moving=false;}
      }
      break;}
    case 'mSiege':g.moving=false;break;
    case 'mFlee':if(moveV(g,dt))milGone(g,'fled');break;
    case 'mHunt':{
      g.timer-=dt;
      let e=g.tgt?guests.find(x=>x.id===g.tgt&&x.hp>0):null;
      if(!e||g.timer<=0){
        e=nearestEnemy(g);g.tgt=e?e.id:0;g.timer=1.4;
        if(!e){goHomeMil(g);break;}
        const p=astar(g.cell,e.cell,0);if(p)g.path=p;
      }
      if(e&&Math.hypot(e.x-g.x,e.z-g.z)>1.5)moveV(g,dt);else g.moving=false;
      break;}
    case 'mHome':{if(!buildings.get(g.home)){milGone(g,'home');break;}if(moveV(g,dt))milGone(g,'home');break;}
  }
}
// v62: i difensori sono abitanti veri. Il guerriero (mestiere della caserma) e il cittadino chiamato alle armi escono come figure militari e il loro abitante resta 'in guerra' (invisibile, fermo)
// finché la figura è in campo; se la figura cade, l'abitante muore. Il guerriero prende un'arma dal magazzino se c'è (poi vale 5/3 di un predone), il cittadino combatte a mani nude (1/3).
function sendFighter(v,homeId,kind,pow){
  const job=v.job; // release() toglie il posto di lavoro: chi va in battaglia lo mantiene (v63: senza questo la caserma si riempiva di nuovi guerrieri a ogni secondo)
  abortTask(v);release(v.id);v.job=job;
  if(kind==='warrior'&&(S.stock.weapons||0)>=1){S.stock.weapons--;kind='armed';}
  const g=newMil('mine',kind,v.cell,[],0,pow);
  g.home=homeId;g.vid=v.id;g.armed=kind==='armed';g.x=v.x;g.z=v.z;g.state='mHunt';g.timer=0;g.hp=g.mhp*hpOf(v)/100; // chi è già ferito scende in campo con la salute che ha
  v.state='war';v.inside=true;v.moving=false;v.fid=g.id;
  guests.push(g);hooks.villager(g);
  return g;
}
function deployTick(){
  const en=[];for(const g of guests)if(g.mil&&g.side!=='mine'&&g.hp>0)en.push(g);
  if(!en.length)return;
  const R=S.raid,hostile=enemiesOf('raid').length>0||enemiesOf('wolf').length>0,pow=hostile?(R.pow||1):1;
  // 1) i guerrieri della caserma escono tutti (di giorno e di notte)
  for(const b of buildings.values()){
    if(b.type!=='barracks'||b.state!=='done')continue;
    for(const id of b.workers){const v=vmap.get(id);if(!v||v.state==='war'||v.ill||v.child||hpOf(v)<WOUND_WAR)continue;sendFighter(v,b.id,'warrior',pow);}
  }
  // 2) i cittadini vengono chiamati solo se i difensori in campo non bastano (forza dei nemici: un predone = 1, un soldato del Re = 3) e solo quelli vicini al nemico
  let E=0;for(const e of en)E+=e.kind==='royal'?3:e.kind==='wolf'?FRATIO.wolf:1;
  let D=0,cit=0;for(const g of guests)if(g.mil&&g.side==='mine'&&g.hp>0){D+=FRATIO[g.kind]||1;if(g.kind==='citizen')cit++;}
  let adults=0;for(const v of villagers)if(!v.child)adults++;
  const cap=Math.min(DRAFT_MAX,Math.floor(adults*DRAFT_SHARE)),left=hostile?cap-(R.drafted|0):cap;
  for(let k=0;k<3&&D<E&&cit<cap&&k<left;k++){
    let best=null,bd=DRAFT_R*CS;
    for(const v of villagers){
      if(v.child||v.ill||v.state==='war'||!v.home||hpOf(v)<WOUND_CIT)continue;
      for(const e of en){const d=Math.hypot(e.x-v.x,e.z-v.z);if(d<bd){bd=d;best=v;}}
    }
    if(!best)break;
    sendFighter(best,best.home,'citizen',pow);D+=FRATIO.citizen;cit++;if(hostile)R.drafted=(R.drafted|0)+1;
  }
}
// combattimento: le torri tirano sul nemico più vicino entro TOWER_R celle; i difensori vengono alle mani con chi hanno a 1,7 passi (ognuno col proprio danno al secondo)
function milTick(dt){
  let any=false;for(const g of guests)if(g.mil){any=true;break;}
  if(!any)return;
  const en=[],sol=[];
  for(const g of guests){if(!g.mil||g.hp<=0)continue;(g.side==='mine'?sol:en).push(g);}
  if(en.length)for(const b of buildings.values()){
    if(b.state!=='done')continue;
    if(b.type==='watchtower'){
      b.shotT=(b.shotT||0)-dt;
      const bx=(b.x+b.w/2)*CS-W/2,bz=(b.y+b.h/2)*CS-W/2;let best=null,bd=TOWER_R*CS;
      for(const e of en){const d=Math.hypot(e.x-bx,e.z-bz);if(d<bd){bd=d;best=e;}}
      if(best){best.hp-=TOWER_DPS*dt;if(b.shotT<=0){b.shotT=0.7;hooks.shot(bx,bz,best.x,best.z);}}
    }
  }
  for(const s of sol){
    let best=null,bd=1.7;for(const e of en){const d=Math.hypot(e.x-s.x,e.z-s.z);if(d<bd){bd=d;best=e;}}
    if(best){best.hp-=(s.dps||ENEMY[s.kind].dps)*dt;
      // i lupi circondano: tutti quelli a portata mordono il difensore; degli altri nemici colpisce solo quello che affronta
      if(best.kind==='wolf'){for(const e of en)if(e.kind==='wolf'&&Math.hypot(e.x-s.x,e.z-s.z)<1.7)s.hp-=e.dps*dt;}
      else s.hp-=(best.dps||ENEMY[best.kind].dps)*dt;best.hold=Math.max(best.hold,0.25);s.hold=Math.max(s.hold,0.25);}
  }
}
// guerra del Re: tre giorni dopo la dichiarazione arriva l'esercito; se tiene il centro per SIEGE_HOLD punti d'assedio il borgo perde parte delle scorte e il Re ritorna dopo due giorni
function spawnArmy(){
  const t=pickCenter();if(!t)return false;
  const side=['w','n','e','s'][(Math.random()*4)|0],n=10+2*S.war.wave;let made=0;
  for(let k=0;k<n;k++){
    const c=edgeCell(side);if(c<0)continue;
    const path=astar(c,t.cell,t.id);if(!path)continue;
    const g=newMil('royal','royal',c,path,t.id);guests.push(g);hooks.villager(g);made++;
  }
  if(!made)return false;
  hooks.toast('L\'esercito del Re è alle porte, da '+SIDE_TXT[side]+': difendi il centro del borgo!');
  return true;
}
function warTick(){
  const Wr=S.war;
  if(Wr.phase==='warn'&&S.t>=Wr.at){if(spawnArmy()){Wr.phase='fight';Wr.hold=0;}else Wr.at=S.t+20;}
  if(Wr.phase!=='fight')return;
  const roy=enemiesOf('royal');
  let sieging=0;for(const g of roy)if(g.state==='mSiege')sieging++;
  if(sieging)Wr.hold+=Math.min(sieging,8)*0.5;else Wr.hold=Math.max(0,Wr.hold-1);
  if(!roy.length){Wr.phase='done';S.rank=7;S.msgs.push({k:'victory'});return;}
  if(Wr.hold>=SIEGE_HOLD){
    Wr.defeats++;Wr.wave++;Wr.phase='warn';Wr.at=S.t+2*DAY;Wr.hold=0;
    for(const r of ['wood','stone','iron','planks','tools'])S.stock[r]=Math.floor((S.stock[r]||0)*0.6);
    S.coins=Math.floor(S.coins*0.5);
    for(const g of roy)milLeave(g);
    S.msgs.push({k:'defeat'});
  }
}
// salvataggi precedenti alla v48: niente titolo né messi; si parte dal titolo che il borgo merita già, con tutti i progetti relativi e quelli degli edifici già costruiti
function regnoNormalize(){
  const legacy=S.story===undefined;
  if(legacy){S.story=true;S.rank=0;S.proj={};}
  S.story=!!S.story;S.rank=Number.isFinite(S.rank)?Math.max(0,Math.min(7,S.rank|0)):0;
  S.proj=(S.proj&&typeof S.proj==='object')?S.proj:{};
  S.msgs=Array.isArray(S.msgs)?S.msgs:[];
  S.raid=Object.assign(raid0(),S.raid||{});S.raid.bands=Object.assign({},S.raid.bands);
  S.wolf=Object.assign(wolf0(),S.wolf||{});S.wolf.bands=Object.assign({},S.wolf.bands);
  S.war=Object.assign(war0(),S.war||{});S.rk=S.rk|0;
  if(legacy){
    while(S.rank<6&&needsMet(RANK_NEEDS[S.rank+1](stats())))S.rank++;
    for(const p of PROJ)if(p.rank<=S.rank)S.proj[p.id]=true;
    const have={};for(const b of buildings.values())have[b.type]=1;
    for(const p of PROJ)if(have[p.id])S.proj[p.id]=true;
    S.raid.next=S.rank>=3?DAY*3:0;
  }
}
function finish(b){
  b.state='done';b.prog=1;acc.attr=99;stCache=null;
  if(b.type==='house')for(const v of villagers)if(!v.home&&b.members.length<capOf(b)&&!v.job){v.home=b.id;b.members.push(v.id);}
  if(b.type==='farm'){
    const cand=[];
    for(let y=b.y-6;y<b.y+b.h+6;y++)for(let x=b.x-6;x<b.x+b.w+6;x++){
      if(x<0||y<0||x>=N||y>=N)continue;const i=y*N+x;if(cellFree(i,2))cand.push([Math.hypot(x-b.x-b.w/2,y-b.y-b.h/2)-0.066*fert[i],i]); // v63: i campi preferiscono la terra fertile
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
  if(b.type==='surgeon')tell('cer0','La bottega del cerusico è pronta: serve una persona istruita (che ha frequentato la scuola). Cura i feriti entro '+HEAL_R+' celle molto più in fretta che a casa.');
  if(b.type==='infirmary')tell('inf0','L\'ospizio è pronto: serve un erborista. Cura i malati entro 45 celle: guariscono prima e rischiano meno.');
  if(b.type==='cemetery'&&S.unburied>0){S.buried+=S.unburied;S.unburied=0;tell('burial','Il cimitero accoglie i defunti rimasti nei campi: la zona torna più serena.');}
  hooks.done(b);
}
// CAP (v29) = posti delle case + bonus di attrattiva. Attrattiva A = (felicità media/100) / (1 + adulti senza lavoro/ATT_U):
// direttamente proporzionale alla felicità, inversamente al numero di adulti non impiegati (né in un mestiere né in servizio). Bonus = A * ATT_K * posti delle case.
const ATT_U=10,ATT_K=0.3;
function attractTick(capD){
  let n=0,js=0,un=0;
  for(const v of villagers){n++;js+=v.joy;if(!v.child&&!v.ill&&!v.job&&!v.duty&&!v.loan)un++;}
  const joy=n?js/n:50,a=(joy/100)/(1+un/ATT_U);
  S.att={joy,unemp:un,a,bonus:Math.floor(a*ATT_K*capD)};
}
// ---- v64: tasse e paghe ----
// Valuta: S.coins è in monete d'argento (1 denaro = 1 moneta d'argento); 10 d'argento = 1 d'oro.
// Paghe: chi ha un posto in un edificio della città (non nella fattoria o nell'ovile di una famiglia) riceve WAGE (1 d'argento) per ogni giorno di lavoro vero,
// cioè con almeno WAGE_SEC secondi di lavoro quel giorno. Paga il Re (non la cassa del giocatore) e i soldi vanno alla cassa della famiglia (b.cash).
// Tasse: ogni casa ha un contatore di TAX_WEEK giorni (b.taxT); a zero è da riscuotere. L'esattore dell'Ufficio delle Tasse la visita di persona, incassa
// taxOf(livello) = 1, 3, 5, 10, 20 d'argento a settimana (TAX_TABLE) (quanto ha in cassa, se meno), porta il gruzzolo all'ufficio e lo versa nelle casse del paese.
// Le case che l'esattore non riesce a visitare non pagano. Senza ufficio aperto non c'è tassazione e le case salgono di livello come prima.
// Chi non lavora per il Re può vendere alla Merceria ciò che produce (attrezzi, pane, tessuto, abiti): la Merceria lo rifiuta se ne ha già in abbondanza.
const WAGE_SEC=DAY*0.2,TAX_MARGIN=1.5,TAX_THRIFT=0.2;
// v65: stipendio al giorno secondo il mestiere. Lavori manuali 1 d'argento (WAGE), artigiani e servizi 2, lavori che richiedono istruzione 3:
// chi non sa leggere e scrivere (non ha fatto la scuola) in un lavoro da istruiti prende lo stipendio da artigiano. Finché il paese non è una Città paga il Re;
// dal titolo di Città (CITY_RANK) pagano gli stipendi le casse del paese; se non bastano il resto diventa un arretrato della famiglia (b.owed, al massimo WAGE_OWE_CAP).
const WAGE_JOB={wood:1,quarry:1,mine:1,forester:1,farm:1,sheepfold:1,fisher:1,hunter:1,store:1,mill:1,charcoal:1,retting:1,claypit:1,limekiln:1,saltworks:1,
  carpenter:2,mason:2,butcher:2,tannery:2,cobbler:2,smokehouse:2,dairy:2,brewery:2,winery:2,brickworks:2,smithy:2,bakery:2,weaver:2,tailor:2,ropewalk:2,dyehouse:2,smelter:2,inn:2,tavern:2,hall:2,barracks:2,
  school:3,infirmary:3,mercery:3,taxoffice:3};
const EDU_JOBS=new Set(['school','infirmary','mercery','taxoffice']),WAGE_UNLETTERED=2,CITY_RANK=6,WAGE_OWE_CAP=21;
const wageJob=type=>WAGE_JOB[type]||WAGE;
const wageOf=(v,jb)=>{const w=wageJob(jb.type);return EDU_JOBS.has(jb.type)&&!v.schooled?Math.min(w,WAGE_UNLETTERED):w;};
const wagePayer=()=>S.story&&S.rank>=CITY_RANK?'town':'king';
const MSELL={tools:3,bread:1,cloth:2,clothes:5},MSELL_KEEP={tools:2,bread:3,cloth:2,clothes:1},MSELL_PROD={tools:'smithy',bread:'bakery',cloth:'weaver',clothes:'tailor'},MSELL_LIM=[12,30],MSELL_LOT=4;
function mkFin(){return {wages:0,king:0,town:0,unpaid:0,bill:0,tax:0,due:0,short:0,visits:0,bought:0,refused:0,sold:0};}
// v77: tassa settimanale per livello della casa (d'argento): il raddoppio 1, 2, 4, 8, 16 più 25% (arrotondato), così con l'aliquota normale le tasse coprono circa 3/4 degli stipendi di una Città media
const TAX_TABLE=[1,3,5,10,20];
// v80: editto delle tasse. Aliquota bassa (la gente è più contenta), normale (copre circa 3/4 degli stipendi), alta (doppia, scontenta e fa rinunciare a migliorare la casa)
const TAX_RATES={low:[0,1,2,5,10],normal:TAX_TABLE,high:[2,6,10,20,40]},TAX_JOY={low:2,normal:0,high:-6};
const taxOf=lv=>(TAX_RATES[S.taxRate]||TAX_TABLE)[Math.min(TAX_TABLE.length,Math.max(1,lv|0))-1];
function setTaxRate(k){if(!TAX_RATES[k])return {ok:false};S.taxRate=k;taxAct=taxActive();return {ok:true};}
// v80: registro settimanale della cassa (ultime 8 settimane): entrate e uscite ricavate dai contatori
const LEDGER_KEEP=8;
const ledgerSnap=()=>({day:S.day,coins:S.coins,tax:S.fin.tax,sold:S.trade.sold,tbought:S.trade.bought,town:S.fin.town,mbought:S.fin.bought,hired:S.fin.hired|0});
function ledgerTick(){
  if(!S.ledger)S.ledger={snap:null,rows:[]};const L=S.ledger;
  if(!L.snap){L.snap=ledgerSnap();return;}
  if(S.day-L.snap.day<TAX_WEEK)return;
  const a=L.snap,b=ledgerSnap();
  const r={wk:L.rows.length?L.rows[0].wk+1:1,day:b.day,tax:b.tax-a.tax,trade:b.sold-a.sold,wages:b.town-a.town,buy:b.mbought-a.mbought,spent:b.tbought-a.tbought,hired:b.hired-a.hired,rate:S.taxRate};
  r.in=r.tax+r.trade;r.out=r.wages+r.buy+r.spent+r.hired;r.net=Math.round(b.coins-a.coins);r.other=r.net-(r.in-r.out);
  L.rows.unshift(r);if(L.rows.length>LEDGER_KEEP)L.rows.length=LEDGER_KEEP;L.snap=b;
}
// previsione: tasse attese (circa 78% di quanto dovuto) contro il conto degli stipendi di una settimana
function taxForecast(){
  let weekly=0;for(const o of buildings.values())if(o.type==='house'&&o.state==='done')weekly+=taxOf(o.level);
  const exp=Math.round(weekly*0.78),wages=((S.fin&&S.fin.bill)|0)*TAX_WEEK;
  return {weekly,expect:exp,wages,cover:wages>0?exp/wages:null};
}
const money=n=>{n=Math.max(0,Math.floor(n)|0);const g=Math.floor(n/SILVER_GOLD),a=n%SILVER_GOLD;return g?g+' oro'+(a?' '+a+' arg':''):a+' arg';};
const taxOpen=o=>o.type==='taxoffice'&&o.state==='done'&&o.workers.length>0;
const taxActive=()=>{for(const o of buildings.values())if(taxOpen(o))return true;return false;};
const taxDue=h=>h.type==='house'&&h.state==='done'&&(Number.isFinite(h.taxT)?h.taxT:TAX_WEEK)<=0;
function wageTick(v){
  const jb=v.job&&buildings.get(v.job);
  if(!jb||jb.state!=='done'||jb.owner||!v.home||v.child||v.ill||v.state==='war'||LIFEST.has(v.state))return;
  v.wsec=(v.wsec|0)+1;
}
let taxAct=false;
function taxDayTick(){
  taxAct=taxActive();
  if(!Number.isFinite(S.taxDay)||S.taxDay<0){S.taxDay=S.day;S.payer=wagePayer();return;}
  const n=S.day-S.taxDay;if(n<=0)return;S.taxDay=S.day;
  if(!S.fin)S.fin=mkFin();
  ledgerTick();
  const town=wagePayer()==='town';
  if(S.payer!==undefined&&S.payer!==wagePayer()&&town)tell('cityPays',"Siete diventati una Città: il Re non paga più gli stipendi, d'ora in poi li paga la cassa del paese con le tasse e il commercio. Se la cassa non basta, gli stipendi restano arretrati.");
  S.payer=wagePayer();
  const due=new Map();let bill=0;
  for(const v of villagers){
    const worked=(v.wsec|0)>=WAGE_SEC&&!v.child;v.wsec=0;
    if(!worked)continue;
    const jb=v.job&&buildings.get(v.job),h=v.home&&buildings.get(v.home);
    if(!jb||!h||h.state!=='done'||jb.owner)continue;
    const w=wageOf(v,jb);v.wd=(v.wd|0)+1;v.pay=(v.pay|0)+w;
    due.set(h.id,(due.get(h.id)|0)+w);bill+=w;
  }
  S.fin.bill=bill;
  const credit=(h,x)=>{h.cash=(h.cash|0)+x;h.wk=(h.wk|0)+x;S.fin.wages+=x;};
  if(!town){for(const [id,w] of due){credit(buildings.get(id),w);S.fin.king+=w;}}
  else{
    // prima gli arretrati, poi gli stipendi di oggi, sempre nello stesso ordine; paga la cassa del paese
    let short=0;
    for(const h of buildings.values()){const o=h.owed|0;if(h.type!=='house'||o<=0)continue;const x=Math.min(o,Math.max(0,Math.floor(S.coins)));if(x>0){S.coins-=x;h.owed=o-x;credit(h,x);S.fin.town+=x;}}
    for(const id of [...due.keys()].sort((a,b)=>a-b)){
      const h=buildings.get(id),w=due.get(id),x=Math.min(w,Math.max(0,Math.floor(S.coins)));
      if(x>0){S.coins-=x;credit(h,x);S.fin.town+=x;}
      if(x<w){h.owed=Math.min(WAGE_OWE_CAP,(h.owed|0)+(w-x));S.fin.unpaid+=w-x;short+=w-x;}
    }
    if(short>0)tell('noWages','La cassa del paese non basta a pagare gli stipendi: le famiglie restano in credito. Vendi le eccedenze ai mercanti o riscuoti più tasse.');
  }
  for(const b of buildings.values())if(b.type==='house'&&b.state==='done'){
    if(!Number.isFinite(b.taxT))b.taxT=TAX_WEEK;
    b.taxT=Math.max(0,b.taxT-n);
  }
}
// una famiglia può decidere di non migliorare la casa se con la tassa del livello dopo non ci starebbe dentro, o per carattere
function taxRefuses(b){
  if(!taxActive())return false;
  const next=taxOf(b.level+1);
  if(Number.isFinite(b.lastInc)&&b.lastInc<TAX_MARGIN*next)return true;
  return hash(b.id*13,b.level*7+1)<TAX_THRIFT;
}
function startCollect(v,b){
  b.why='';
  let best=null,bd=1e9;
  for(const h of buildings.values()){
    if(!taxDue(h)||S.t<(h.taxSkip||0))continue;
    if(h.taxRes&&h.taxRes!==v.id&&vmap.has(h.taxRes))continue;
    if(cellDist(h.cell,b.cell)>BAND)continue;
    const d=cellDist(h.cell,v.cell);if(d<bd){bd=d;best=h;}
  }
  const pouch=v.pouch|0;
  if(best&&pouch<TAX_POUCH){
    if(route(v,best.cell,best.id)){best.taxRes=v.id;v.taxH=best.id;v.state='toTax';return;}
    best.taxSkip=S.t+60;
  }
  if(pouch>0){
    if(v.cell===b.entrance){taxDeposit(v);}
    else if(route(v,b.cell,b.id)){v.state='toTaxDep';return;}
  }
  b.why=best?'':'Nessuna casa da visitare: il contatore di ogni casa conta 7 giorni';
  v.state='wait';v.timer=3;
}
function taxCollectAt(v){
  const h=buildings.get(v.taxH),b=v.job&&buildings.get(v.job);v.taxH=null;v.state='idle';
  if(!h)return;
  if(h.taxRes===v.id)h.taxRes=null;
  if(!taxDue(h))return;
  const due=taxOf(h.level),pay=Math.min(due,h.cash|0);
  h.cash=(h.cash|0)-pay;v.pouch=(v.pouch|0)+pay;
  h.lastInc=h.wk|0;h.wk=0;h.taxT=TAX_WEEK;h.lastTax={day:S.day,due,pay};
  if(!S.fin)S.fin=mkFin();
  S.fin.visits++;S.fin.due+=due;S.fin.short+=due-pay;
  if(b&&b.type==='taxoffice')b.visits=(b.visits|0)+1;
}
function taxDeposit(v){
  const n=v.pouch|0;v.pouch=0;if(n<=0)return;
  S.coins+=n;if(!S.fin)S.fin=mkFin();S.fin.tax+=n;
  const b=v.job&&buildings.get(v.job);if(b&&b.type==='taxoffice')b.collected=(b.collected|0)+n;
}
function taxStats(){
  let houses=0,due=0,weekly=0,offices=0;
  for(const o of buildings.values()){
    if(o.type==='taxoffice'&&o.state==='done')offices++;
    if(o.type==='house'&&o.state==='done'){houses++;weekly+=taxOf(o.level);if(taxDue(o))due++;}
  }
  let owed=0;for(const o of buildings.values())if(o.type==='house')owed+=o.owed|0;
  return Object.assign({active:taxActive(),offices,houses,due,weekly,payer:wagePayer(),owed},S.fin||mkFin());
}
// Merceria che compra dalle famiglie: rifiuta ciò che ha già in abbondanza (meno quando la città lo produce con le sue botteghe)
const kingJob=v=>{const jb=v.job&&buildings.get(v.job);return !!jb&&jb.state==='done'&&!jb.owner;};
const jobless=h=>{for(const id of h.members){const v=vmap.get(id);if(v&&!v.child&&kingJob(v))return false;}return true;};
const cityMakes=g=>{const t=MSELL_PROD[g];for(const o of buildings.values())if(o.type===t&&o.state==='done'&&o.workers.length>0)return true;return false;};
const merceryTakes=(m,g)=>Math.max(0,Math.min(MSELL_LIM[cityMakes(g)?0:1],SHELFCAP)-(m.shelf[g]|0));
function merceryBuyer(h){
  if(S.edicts.quarantine||S.t<(h.msTry||0)||!jobless(h))return null;
  let pick=null,bs=0;
  for(const o of buildings.values()){
    if(!merceryOpen(o)||cellDist(o.cell,h.cell)>BAND)continue;
    for(const g of MERC){
      const sur=(h.goods[g]|0)-MSELL_KEEP[g];
      if(sur<1||merceryTakes(o,g)<1||S.coins<MSELL[g])continue;
      const sc=sur*MSELL[g]-cellDist(o.cell,h.cell)*0.02;if(!pick||sc>bs){bs=sc;pick={b:o,g};}
    }
  }
  return pick;
}
// la vendita al banco: restituisce quanti pezzi la Merceria ha preso (0 = rifiutato)
function merceryBuy(m,h,g){
  if(!S.fin)S.fin=mkFin();
  const sur=(h.goods[g]|0)-MSELL_KEEP[g];
  let q=Math.min(sur,MSELL_LOT,merceryTakes(m,g),Math.floor(S.coins/MSELL[g]));
  if(q<=0){S.fin.refused++;h.msTry=S.t+DAY*0.5;return 0;}
  h.goods[g]-=q;m.shelf[g]+=q;S.stocked=(S.stocked|0)+q;
  const pay=q*MSELL[g];S.coins-=pay;h.cash=(h.cash|0)+pay;h.wk=(h.wk|0)+pay;S.fin.bought+=pay;S.fin.sold+=q;h.msTry=S.t+20;
  return q;
}
// v69: chi si trasferisce non compare dal nulla: arriva a piedi dal bordo della mappa (dal lato più vicino alla casa scelta) e cammina fino alla porta
function arriveNewcomer(pk,lit){
  const hx=pk.door%N,hy=(pk.door/N)|0,dist={w:hx,e:N-1-hx,n:hy,s:N-1-hy};
  const sides=['w','e','n','s'].sort((a,b)=>dist[a]-dist[b]);
  let c=-1,path=null;
  for(const sd of sides){const e=edgeCell(sd);if(e<0)continue;const p=astar(e,pk.cell,pk.id);if(p&&p.length){c=e;path=p;break;}}
  const age=18+Math.random()*18;
  if(!path){ // nessun cammino dal bordo (mappa chiusa): compare alla porta come prima
    const v=addVillager(cx2w(pk.door%N),cy2w((pk.door/N)|0),age);arrivalLit(v,lit);v.home=pk.id;pk.members.push(v.id);logV(v,'Arriva in paese in cerca di casa e lavoro.');return v;
  }
  const v=addVillager(cx2w(c%N),cy2w((c/N)|0),age);arrivalLit(v,lit);
  v.home=pk.id;pk.members.push(v.id);v.newc=true;v.path=path;v.state='toHomeLife';v.moving=true;v.next='sleep';
  logV(v,'Arriva in paese dalla strada in cerca di casa e lavoro.');
  if(!lit)tell('newcomer','I nuovi abitanti arrivano a piedi dai confini della mappa e raggiungono le case libere: più il paese è felice e ha lavoro, più gente arriva.');
  return v;
}
// v79: famiglie in arrivo. Ogni tanto una famiglia (1-2 adulti e 0-3 bambini) si presenta ai confini e chiede di fermarsi: il giocatore sceglie se accettarla.
// Arrivano anche se non ci sono case libere: chi non trova posto si accampa in una tenda (tentTick) e, se la casa non arriva, prima o poi se ne va.
// Più il paese è felice e ha lavoro (S.att.a), più spesso arrivano. Se nessuno risponde entro PET_LIFE la famiglia riparte.
const PET_LIFE=DAY*3,PET_MAX=2,PET_MINPOP=8;
function petitionRate(){return Math.max(0.25,Math.min(2,0.4+S.att.a*1.6));}
function newPetition(){
  const ad=Math.random()<0.6?2:1,kids=Math.random()<0.25?0:1+((Math.random()*3)|0);
  const p={id:(S.petSeq=(S.petSeq|0)+1),fam:pick(FAMS),ad,kids:Math.min(kids,5-ad),t:S.t,exp:S.t+PET_LIFE};
  S.pet.push(p);return p;
}
function petitionTick(){
  if(!Array.isArray(S.pet))S.pet=[];
  for(const p of S.pet.slice())if(S.t>=p.exp){S.pet=S.pet.filter(x=>x!==p);S.petLate=(S.petLate|0)+1;hooks.toast('La famiglia '+p.fam+' non ha avuto risposta e si è rimessa in cammino.');}
  if(S.edicts.noImmig||S.edicts.quarantine||villagers.length<PET_MINPOP||S.pet.length>=PET_MAX)return;
  if(!S.petNext){S.petNext=S.t+DAY*(1+Math.random()*2);return;}
  if(S.t<S.petNext)return;
  S.petNext=S.t+DAY*(4+Math.random()*4)/petitionRate();
  const p=newPetition();
  tell('petition1','Una famiglia chiede di fermarsi in paese (riquadro in alto a sinistra): accettala o rifiutala. Arrivano anche se non hai case libere, ma senza casa vivono in tenda e, se stanno male, se ne vanno.');
  hooks.toast('La famiglia '+p.fam+' ('+famText(p)+') bussa alle porte del paese.');
}
function famText(p){return (p.ad===1?'1 adulto':p.ad+' adulti')+(p.kids?' e '+(p.kids===1?'1 bambino':p.kids+' bambini'):'');}
function refusePetition(id){
  const p=(S.pet||[]).find(x=>x.id===id);if(!p)return {ok:false,msg:'La famiglia è già ripartita.'};
  S.pet=S.pet.filter(x=>x!==p);S.petNo=(S.petNo|0)+1;
  return {ok:true,msg:'Hai rifiutato la famiglia '+p.fam+': riprende la strada.'};
}
function acceptPetition(id){
  const p=(S.pet||[]).find(x=>x.id===id);if(!p)return {ok:false,msg:'La famiglia è già ripartita.'};
  S.pet=S.pet.filter(x=>x!==p);S.petOk=(S.petOk|0)+1;
  const ms=arriveFamily(p);
  const homed=ms.filter(v=>v.home).length;
  return {ok:true,msg:'La famiglia '+p.fam+' è la benvenuta: '+(homed===ms.length?'ha trovato casa.':homed?'solo una parte trova casa, gli altri dormiranno in tenda.':'non ci sono case libere: dormiranno in tenda finché non ne costruisci una.'),members:ms};
}
function bestHouseFor(n,excl){
  let pk=null,ps=-1e9;
  for(const b of buildings.values())if(b.type==='house'&&b.state==='done'&&b.attr>-4.5&&capOf(b)-b.members.length>=n){
    const sc=b.attr+(capOf(b)-b.members.length)*0.3+lone(b)+b.well*0.01+(b.flags.water?0.8:0)+(b.level>=2&&b.flags.church?0.6:0);if(sc>ps){ps=sc;pk=b;}
  }
  return pk;
}
function centerStore(){for(const b of buildings.values())if(b.type==='store'&&b.state==='done'&&b.center)return b;for(const b of buildings.values())if(b.type==='store'&&b.state==='done')return b;return null;}
function arriveFamily(p){
  const whole=bestHouseFor(p.ad+p.kids);
  const st=centerStore();
  const ref=whole||st;
  let sides=['w','e','n','s'];
  if(ref){const hx=ref.cell%N,hy=(ref.cell/N)|0,dd={w:hx,e:N-1-hx,n:hy,s:N-1-hy};sides.sort((a,b)=>dd[a]-dd[b]);}
  else sides.sort(()=>Math.random()-0.5);
  let e=-1;for(const sd of sides){e=edgeCell(sd);if(e>=0)break;}
  const ms=[];const adults=[],kids=[];
  for(let i=0;i<p.ad+p.kids;i++){
    const child=i>=p.ad,age=child?1+Math.random()*11:20+Math.random()*18;
    const x=e>=0?cx2w(e%N):cx2w(CEN),z=e>=0?cy2w((e/N)|0):cy2w(CEN);
    const v=addVillager(x+(Math.random()-0.5)*0.6,z+(Math.random()-0.5)*0.6,age,p.fam);
    if(e<0&&st){v.x=cx2w(st.door%N);v.z=cy2w((st.door/N)|0);v.cell=w2cell(v.x,v.z);}
    arrivalLit(v);
    (child?kids:adults).push(v);ms.push(v);
  }
  for(const v of ms){
    const h=whole&&roomFor(whole)?whole:bestHouseFor(1);
    if(h){v.home=h.id;h.members.push(v.id);}
    let path=null;
    if(e>=0){const tgt=h||st;if(tgt)path=astar(e,tgt.cell,tgt.id);}
    if(path&&path.length){v.newc=true;v.path=path;v.state='toHomeLife';v.moving=true;v.next='sleep';}
    else if(h){v.x=cx2w(h.door%N);v.z=cy2w((h.door/N)|0);v.cell=w2cell(v.x,v.z);}
    logV(v,h?'Arriva in paese con la sua famiglia e trova casa.':'Arriva in paese con la sua famiglia ma non c\'è una casa libera: dormirà in tenda.');
    const r=reg.get(v.id);if(r){if(v.child)r.par=adults.map(a=>a.id);else r.kids=kids.map(k=>k.id);}
  }
  S.arrivedFam=(S.arrivedFam|0)+ms.length;
  acc.attr=99;
  return ms;
}
// v74: assunzione da fuori. Per HIRE_COST argento arriva a piedi una persona che sa leggere e scrivere, già destinata a questo edificio
// (utile per gli edifici solo per istruiti e per il +30% delle botteghe). Serve una casa con un posto libero. Se l'edificio è al completo,
// l'istruito prende il posto di un addetto non istruito, che torna libero.
const hireNeeded=b=>!!b&&b.state==='done'&&BT[b.type].slots>0&&b.type!=='store'&&!(b.owner&&(b.type==='farm'||b.type==='sheepfold'))&&!b.sur;
function hireEducated(bid){
  const b=buildings.get(bid);
  if(!hireNeeded(b))return {ok:false,msg:'In questo edificio non si assume.'};
  for(const id of b.workers){const w=vmap.get(id);if(w&&w.schooled)return {ok:false,msg:'Qui lavora già una persona istruita.'};}
  if(S.coins<HIRE_COST)return {ok:false,msg:'Servono '+money(HIRE_COST)+' per far venire una persona istruita da fuori (ne hai '+money(S.coins)+').'};
  let pk=null,pd=1e9;
  for(const h of buildings.values())if(h.type==='house'&&h.state==='done'&&roomFor(h)){const d=cellDist(h.cell,b.cell);if(d<pd){pd=d;pk=h;}}
  if(!pk)return {ok:false,msg:'Nessuna casa ha un posto libero: costruisci o amplia le case.'};
  S.coins-=HIRE_COST;S.fin.hired=(S.fin.hired|0)+HIRE_COST;
  const v=arriveNewcomer(pk,true);
  if(b.workers.length>=b.want&&b.want<BT[b.type].slots)b.want++;
  if(b.workers.length>=b.want){const oi=b.workers.findLastIndex(id=>{const w=vmap.get(id);return w&&!w.schooled;});if(oi>=0){const id=b.workers.splice(oi,1)[0];release(id);}}
  setJob(v,b);b.workers.push(v.id);v.hired=true;
  logV(v,'Assunto da fuori come '+TRADENAME[b.type]+': sa leggere e scrivere.');
  tell('hire','Una persona istruita è stata chiamata da fuori: arriverà a piedi e prenderà subito servizio.');
  return {ok:true,v};
}

function tick1(){
  updClock();
  taxDayTick();
  if(acc.attr>=3){acc.attr=0;computeAttr();}
  for(let i=0;i<N*N;i++)if(sap[i]&&S.season!==3){sapT[i]+=soilF(fert[i]);if(sapT[i]>=SAPLING_T){sap[i]=0;tree[i]=1;hooks.trees();hooks.saps();}}
  lifeTick();
  diseaseTick();
  dutyPass();
  festTick();
  rebalanceJobs();
  assignJobs();
  enrolPass();
  for(const b of buildings.values())if(b.type==='school')b.pupils=0;
  for(const v of villagers)if(v.sch&&(v.state==='learn'||v.state==='toSchool')){const sb=buildings.get(v.sch);if(sb)sb.pupils=(sb.pupils|0)+1;}
  reconcileStock();
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
  if(capD+capP<villagers.length+3&&pend<2){if(!(hash(S.t|0,41)<0.6&&trySpawnDense()))trySpawnHouse();if(S.rank>=4&&S.t>=(S.mergeT||0)){S.mergeT=S.t+DAY*0.5;mergeTick();}}
  marketTick();
  if(countDone('inn')&&Math.random()<0.06)spawnGuest();
  tradeTick();
  regnoTick();healTick();
  acc.farm+=1;if(acc.farm>=5){acc.farm=0;farmTick();sheepTick();tentTick();}
  S.grow+=TK;
  let openSlots=0;for(const b of buildings.values())if(b.state==='done'&&!b.sur)openSlots+=b.want-b.workers.length;
  attractTick(capD);
  petitionTick();
  if(!S.edicts.noImmig&&!S.edicts.quarantine&&villagers.length<capD+S.att.bonus&&hungry*2<=nh&&S.grow>=(openSlots>0?9:16)){
    let pk=null,ps=-1e9;
    // chi arriva preferisce le case vicine ai posti di lavoro liberi e ai servizi
    const openB=[...buildings.values()].filter(x=>x.state==='done'&&BT[x.type].slots>0&&!x.sur&&x.workers.length<x.want);
    const imm=b=>{let d=80;for(const o of openB){const q=cellDist(b.cell,o.cell);if(q<d)d=q;}return -d*0.04+(b.flags.water?0.8:0)+(b.level>=2&&b.flags.church?0.6:0);};
    for(const b of buildings.values())if(b.type==='house'&&b.state==='done'&&roomFor(b)&&b.attr>-4.5){
      const sc=b.attr+(capOf(b)-b.members.length)*0.3+lone(b)+b.well*0.01+imm(b);if(sc>ps){ps=sc;pk=b;}
    }
    // case piene: chi arriva per attrattiva (oltre i posti delle case) si adatta in una casa già occupata, ma sovraffollata (max +2)
    if(!pk&&villagers.length>=capD)for(const b of buildings.values())if(b.type==='house'&&b.state==='done'&&b.members.length<capOf(b)+2&&b.attr>-4.5){
      const sc=b.attr+(capOf(b)-b.members.length)*0.3+lone(b)+b.well*0.01+imm(b);if(sc>ps){ps=sc;pk=b;}
    }
    if(pk){S.grow=0;arriveNewcomer(pk);}
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
  maintTick();drinkTick();shoeTick();
}
function step(dt){
  S.t+=dt;countBuilders();
  const bc={},bm={};for(const v of villagers)if(v.state==='build'){bc[v.target]=(bc[v.target]||0)+1;const jb=v.job&&buildings.get(v.job);if(jb&&jb.type==='mason')bm[v.target]=1;}
  for(const b of buildings.values()){
    if(!isSite(b))continue;const t=b.work?{time:b.work.time}:BT[b.type];
    const nb=bc[b.id]||0;
    // v32: i muratori (addetti della bottega del muratore) costruiscono il 60% più in fretta
    if(nb>0){
      const lim=siteCap(b);
      if(b.prog<lim)b.prog=Math.min(lim,b.prog+dt/t.time*[0,1,1.7,2.2][Math.min(3,nb)]*(bm[b.id]?1.6:1));
      if(b.work){const st=Math.floor(b.prog*4);if(st!==b.work.st){b.work.st=st;hooks.regarden(b);}}
      if(b.prog>=1&&siteReady(b)){if(b.work)workDone(b);else finish(b);}
    }
  }
  for(const v of villagers)updV(v,dt);
  for(const g of guests.slice())updG(g,dt);
  milTick(dt);
  acc.a05+=dt;if(acc.a05>=0.5){acc.a05-=0.5;decay();}
  acc.a1+=dt;if(acc.a1>=1){acc.a1-=1;acc.attr+=1;tick1();}
}
const RESNAME={wood:'il legno',stone:'la pietra',planks:'le assi',bricks:'i mattoni',lime:'la calce'};
function roleText(v){
  if(v.ill&&(v.state==='sleep'||v.state==='eat'||v.state==='wait'||v.state==='idle'))return 'Malato ('+DIS[v.ill.k].n.toLowerCase()+'): a letto';
  switch(v.state){
    case 'war':return 'Combatte contro i nemici';
    case 'sleep':return 'Riposa a casa';
    case 'eat':return 'Mangia a casa';
    case 'toHomeLife':return v.newc?'Sta arrivando in paese, in cerca di casa e lavoro':v.ill?'Torna a casa, malato':v.next==='eat'?'Torna a casa per il pasto':'Torna a casa';
    case 'toWell':case 'draw':return "Prende l'acqua al pozzo";
    case 'toPlaza':case 'chat':return 'Si ferma a chiacchierare in piazza';
    case 'toChurch':case 'pray':return 'Prega in chiesa';
    case 'toFest':case 'fest':return 'Alla festa di paese';
    case 'toHelp':case 'helpTend':return "Aiuta un'altra famiglia";
    case 'toRepair':case 'repair':return 'Ripara un edificio con gli attrezzi';
    case 'toRetting':return v.cargo&&v.cargo.k==='vine'?"Porta l'uva alla cantina":v.cargo&&v.cargo.k==='dye'?'Porta le piante tintorie alla tintoria':'Porta gli steli al maceratoio';
    case 'toCollect':case 'toStoreC':return 'Porta i materiali al magazzino';
    case 'toStore':return v.task?'Va al magazzino a prendere '+RESNAME[v.task.res]+(v.task.n>1?' (col carretto, '+v.task.n+' pezzi)':' (a mano, 1 pezzo)')+(v.task.own?' per il suo cantiere':' per un cantiere'):'Va al magazzino a prendere i materiali';
    case 'toSite':return v.task?'Porta '+RESNAME[v.task.res]+(v.task.n>1?' ('+v.task.n+' pezzi, col carretto)':' (1 pezzo, a mano)')+(v.task.own?' al suo cantiere':' al cantiere'):'Porta i materiali al cantiere';
    case 'toBuild':return 'Va al cantiere';
    case 'build':{const tb=buildings.get(v.target);return tb&&isSite(tb)&&siteIdle(tb)?'Aspetta i materiali al cantiere':'Costruisce';}
    case 'toStall':case 'keep':return 'Mercante al banco';
    case 'toMarket':return 'Baratta al mercato';
    case 'toHomeT':return v.cargo?'Torna col baratto':'Torna dal mercato';
    case 'toErr':case 'doErr':case 'toHomeErr':{const k=v.err&&v.err.kind;
      return k==='msell'?('Vende '+(GN[v.err.g]||'merce')+' alla merceria'):k==='merc'?('Compra '+(GN[v.err.g]||'merce')+' alla merceria'):k==='wool'?'Ritira la lana all\'ovile':k==='cloth'?'Compra tessuto dal tessitore':k==='fish'?'Pesca':k==='hunt'?'Va a caccia':k==='iron'?'Ritira il ferro al magazzino':k==='flour'?'Ritira la farina al mulino':v.state==='toErr'?'Va nel bosco a raccogliere la legna':v.state==='toHomeErr'?'Porta la legna a casa':'Raccoglie legna da ardere';}
    case 'toPlant':case 'plant':return 'Pianta alberi';
    case 'toTax':return 'Va a riscuotere le tasse';
    case 'tax':return 'Riscuote le tasse in una casa';
    case 'toTaxDep':return "Porta le tasse all'ufficio";
    case 'toMill':case 'mill':return 'Macina il grano';
    case 'toShore':{const jb=v.job&&buildings.get(v.job);return jb&&jb.type==='hunter'?'Va a caccia nel bosco':'Va a pescare sulla riva';}
    case 'shop':if(!v.inside){const fb=v.job&&buildings.get(v.job);if(fb&&fb.type==='fisher')return 'Pesca sulla riva';}
    case 'toShop':{const jb=v.job&&buildings.get(v.job);return jb&&TRADENAME[jb.type]?TRADENAME[jb.type][0].toUpperCase()+TRADENAME[jb.type].slice(1)+' al lavoro':'Al lavoro in bottega';}
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
  if(b){const R={school:'Maestro',inn:'Oste',sheepfold:'Pastore',wood:'Taglialegna',quarry:'Cavatore',mine:'Minatore',forester:'Guardaboschi',mill:'Mugnaio',farm:'Contadino',store:'Magazziniere',infirmary:'Erborista',carpenter:'Falegname',mason:'Muratore',smithy:'Fabbro',bakery:'Panettiere',weaver:'Tessitore',tailor:'Sarto',fisher:'Pescatore',hunter:'Cacciatore',tavern:'Taverniere',hall:'Musicante',mercery:'Merciaio',retting:'Maceratore',ropewalk:'Cordaio',dyehouse:'Tintore',charcoal:'Carbonaio',smelter:'Fonditore',claypit:'Argillaio',brickworks:'Fornaciaio',limekiln:'Calcinaio',saltworks:'Salinaro',tannery:'Conciatore',cobbler:'Calzolaio',butcher:'Macellaio',smokehouse:'Affumicatore',dairy:'Casaro',brewery:'Birraio',winery:'Vinaio',barracks:'Guerriero',surgeon:'Cerusico',taxoffice:'Esattore'};if(R[b.type])return R[b.type]+(v.loan?' (in prestito)':'');}
  if(v.loan)return 'Senza posto: troppa merce ('+TRADENAME[v.loan]+')';
  const h=v.home&&buildings.get(v.home);
  if(h){if(h.tailor)return 'Sarto';if(h.weave)return 'Tessitore';if(h.bake)return 'Panettiere';if(h.craft)return 'Artigiano';return h.dens?'Fa la spesa e le faccende di casa':h.crop==='veg'?"Cura l'orto":h.crop==='eggs'?'Alleva galline':h.crop==='wood'?'Raccoglie legna da ardere':'Alleva maiali e pecore';}
  return 'In cerca di una casa';
}
function stats(){
  let houses=0,sites=0,slots=0,cap=0,food=0,farms=0,stalls=0,hungry=0,asum=0,amax=-99,herds=0,crafters=0,bakers=0,fishers=0,hunters=0,tools=0,weavers=0,tailors=0,clothes=0,wsum=0,fire=0,fireNeed=0;const built={},levels=[0,0,0,0,0,0];
  for(const b of buildings.values()){
    if(b.state==='done'){
      built[b.type]=(built[b.type]||0)+1;
      if(b.type==='house'){houses++;cap+=capOf(b);levels[b.level]++;if(b.hungry>=30)hungry++;asum+=b.attr;if(b.attr>amax)amax=b.attr;wsum+=b.well;fire+=b.goods.firewood;fireNeed+=fuelNeed();
        if(b.crop==='herd')herds++;if(b.craft)crafters++;if(b.bake)bakers++;if(b.side==='fish')fishers++;if(b.side==='hunt')hunters++;tools+=b.goods.tools;if(b.weave)weavers++;if(b.tailor)tailors++;clothes+=b.goods.clothes;}
      else if(b.type==='sheepfold'){slots+=1;}
      else if(b.type==='farm'){farms++;slots+=2;}
      else if(b.type==='stall'){if(b.open)stalls++;}
      else slots+=b.sur?0:b.want;
    }else sites++;
  }
  let masters=0,skSum=0,skN=0;for(const v of villagers){const l=jobSkill(v);if(v.job){skN++;skSum+=l;if(l>=SKMAX)masters++;}}
  let far=0,cdSum=0,cdN=0;for(const v of villagers){const cd=commuteOf(v);if(cd>0){cdN++;cdSum+=cd;if(cd>COMMUTE_OK)far++;}}
  let kids=0,schooled=0,sick=0,plagueN=0,pupils=0;for(const v of villagers){if(v.child)kids++;if(v.schooled)schooled++;if(v.ill){sick++;if(v.ill.k==='plague')plagueN++;}if(v.state==='learn')pupils++;}
  let roads=0,saps=0;const dc=[0,0,0,0,0,0,0];for(let i=0;i<N*N;i++){roads+=road[i];dc[dist[i]]++;saps+=sap[i];}
  for(let k=0;k<7;k++)dc[k]=Math.round(dc[k]/9);roads=Math.round(roads/SC);
  let jobs=0;for(const v of villagers)if(v.job)jobs++;
  food=Math.floor((S.stock.bread||0)+(S.stock.fish||0)+(S.stock.meat||0)+(S.stock.game||0)+(S.stock.cured||0)+(S.stock.cheese||0)); // v53: viveri pronti nei Granai (il grano e la farina hanno il loro contatore)
  return {pop:villagers.length,jobs,slots,masters,avgSkill:skN?skSum/skN:0,far,avgCommute:cdN?cdSum/cdN:0,commuters:cdN,houses,cap:cap+S.att.bonus,capHouses:cap,capBonus:S.att.bonus,att:S.att,sites,roads,dc,built,levels,food,farms,stalls,hungry,barters:S.barters,helps:S.helps,stock:S.stock,extra:extraTotal(),capRes:capTotal(),capStone:capRes('stone'),capGrain:capGrain(),capFlour:capFlour(),
    avgAttr:houses?asum/houses:0,maxAttr:houses?amax:0,day:S.day,ph:S.ph,f:S.f,herds,crafters,bakers,fishers,hunters,tools,saps,weavers,tailors,clothes,season:S.season,year:S.year,visits:S.visits,settled:S.settled,guests:guests.length,children:kids,schooled,births:S.births,deaths:S.deaths,buried:S.buried,
    sick,plagueN,plague:S.plague.on,avgWell:houses?wsum/houses:0,avgJoy:villagers.length?villagers.reduce((a,v)=>a+v.joy,0)/villagers.length:0,unhappy:villagers.filter(v=>v.joy<35).length,left:S.left,fire,fireNeed,inherits:S.inherits,cured:S.cured,moves:S.moves,deathsBy:S.deathsBy,pupils,coins:S.coins,routesOpen:S.routes.filter(r=>r.open).length};
}
// ---- v40: salvataggio e caricamento della partita ----
// exportState() restituisce un oggetto pronto per JSON.stringify (da serializzare subito: contiene riferimenti allo stato vivo).
// importState(d) ricostruisce la partita: valida e decodifica tutto PRIMA di toccare lo stato, così un salvataggio rovinato non rovina la partita in corso.
// Compatibilità: SAVE_FMT cambia solo se il formato diventa illeggibile dalle versioni precedenti; i campi nuovi si aggiungono con un valore di riserva in importState.
const SAVE_FMT=1;
const SAVE_GRIDS={tree,rock,ore,water,sap,road,dist,occ,field,door,cen,gate,wear,sapT,plev,phit,pexp};
// v63: suolo e falde si salvano a parte e sono facoltativi: un salvataggio precedente non li ha e li ricostruisce dal seme
const SOIL_GRIDS={aq,aqK};
function b64enc(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function b64dec(str){const s=atob(str),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
// griglie: compressione a run (lunghezza,byte) sui byte grezzi, poi base64
function packGrid(a){const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),out=[];let i=0;while(i<u.length){const v=u[i];let r=1;while(r<255&&i+r<u.length&&u[i+r]===v)r++;out.push(r,v);i+=r;}return b64enc(Uint8Array.from(out));}
function unpackGrid(a,str){const p=b64dec(str),u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let o=0;for(let i=0;i+1<p.length;i+=2){const r=p[i];if(r===0||o+r>u.length)throw new Error('griglia rovinata');u.fill(p[i+1],o,o+r);o+=r;}if(o!==u.length)throw new Error('griglia rovinata');}
function exportState(){
  const grids={};for(const k in SAVE_GRIDS)grids[k]=packGrid(SAVE_GRIDS[k]);for(const k in SOIL_GRIDS)grids[k]=packGrid(SOIL_GRIDS[k]);
  return {fmt:SAVE_FMT,n:N,seed,nextId,S,acc,told,gated:[...gatedSet],reg:[...reg.entries()],resv:[...resv.entries()],plantResv:[...plantResv],guests,buildings:[...buildings.values()],villagers,grids};
}
function importState(d){
  const bad=m=>{throw new Error('Salvataggio non valido: '+m);};
  if(!d||typeof d!=='object')bad('dati assenti');
  if((d.n||192)!==N)bad('è di una mappa di altre dimensioni ('+((d.n||192)/SC)+'×'+((d.n||192)/SC)+' tile contro '+MT+'×'+MT+'): dalla v77 la mappa è più grande e i vecchi salvataggi non si possono caricare');
  if(d.fmt!==SAVE_FMT)bad(d.fmt>SAVE_FMT?'creato da una versione più recente del gioco':'formato sconosciuto');
  for(const k of ['buildings','villagers','guests','gated','reg','resv','plantResv'])if(!Array.isArray(d[k]))bad('manca '+k);
  if(!d.S||typeof d.S!=='object'||!d.acc||!d.told||!d.grids||typeof d.grids!=='object')bad('struttura incompleta');
  if(!Number.isFinite(d.seed)||!Number.isFinite(d.nextId))bad('numeri non validi');
  const tmp={};
  for(const k in SAVE_GRIDS){if(typeof d.grids[k]!=='string')bad('manca la griglia '+k);tmp[k]=new SAVE_GRIDS[k].constructor(N*N);try{unpackGrid(tmp[k],d.grids[k]);}catch(e){bad('griglia '+k+' rovinata');}}
  const sg={};for(const k in SOIL_GRIDS)if(typeof d.grids[k]==='string'){sg[k]=new Uint8Array(N*N);try{unpackGrid(sg[k],d.grids[k]);}catch(e){sg[k]=null;}}
  const cp=x=>JSON.parse(JSON.stringify(x));
  const bl=cp(d.buildings),vl=cp(d.villagers),gl=cp(d.guests),Sx=cp(d.S),ac=cp(d.acc),tl=cp(d.told),ga=cp(d.gated),rg=cp(d.reg),rv=cp(d.resv),pr=cp(d.plantResv);
  const ids=new Set();
  for(const b of bl){if(!b||!Number.isInteger(b.id)||!BT[b.type]||!Number.isFinite(b.x)||!Number.isFinite(b.y)||ids.has(b.id))bad('edificio non valido');ids.add(b.id);}
  for(const v of vl){if(!v||!Number.isInteger(v.id)||!Number.isFinite(v.x)||!Number.isFinite(v.z)||ids.has(v.id))bad('abitante non valido');ids.add(v.id);}
  // v74: la selvaggina è un cibo a sé. Nei salvataggi vecchi la caccia dava carne: la carne dei cacciatori diventa selvaggina, le case ricevono la voce nuova
  for(const b of bl){
    if(b.goods&&typeof b.goods==='object'&&!Number.isFinite(b.goods.game)){b.goods.game=0;if(b.type==='house'&&b.side==='hunt'&&b.crop!=='herd'){b.goods.game=b.goods.meat|0;b.goods.meat=0;}}
    if(b.ate&&typeof b.ate==='object'&&!Number.isFinite(b.ate.game))b.ate.game=-999;
    if(b.out&&typeof b.out==='object'&&!Number.isFinite(b.out.game)){b.out.game=0;if(b.type==='hunter'){b.out.game=b.out.meat|0;b.out.meat=0;}}
  }
  // v60.1: i salvataggi precedenti alla v59 non hanno i bisogni dell'abitante (n, nv, nc): si danno valori di riserva, altrimenti il gioco si ferma a ogni passo
  for(const v of vl){
    if(!v.n||typeof v.n!=='object')v.n={};
    for(const [k,lo,sp] of [['water',55,45],['food',55,45],['rest',60,40],['church',50,50],['social',50,50]])if(!Number.isFinite(v.n[k]))v.n[k]=lo+Math.random()*sp;
    if(!Number.isFinite(v.nv))v.nv=0.85+Math.random()*0.3;
    if(v.nc===undefined)v.nc=null;
  }
  for(const g of gl){if(!g||!Number.isInteger(g.id)||!Number.isFinite(g.x)||!Number.isFinite(g.z)||ids.has(g.id))bad('viandante non valido');ids.add(g.id);}
  for(const i of ids)if(i>=d.nextId)bad('numerazione incoerente');
  if(typeof Sx.stock!=='object'||!Sx.stock||!Number.isFinite(Sx.t))bad('stato del borgo incompleto');
  // --- da qui lo stato cambia: la grafica viene svuotata e poi ricostruita dagli hook
  for(const b of buildings.values())hooks.removed(b);
  for(const v of villagers)hooks.gone(v);
  for(const g of guests)hooks.gone(g);
  for(const k in SAVE_GRIDS)SAVE_GRIDS[k].set(tmp[k]);
  seed=d.seed;for(let i=0;i<N*N;i++){const x=i%N,y=(i/N)|0;jit[i]=hash(x,y+500)*0.15;}
  if(sg.aq&&sg.aqK){aq.set(sg.aq);aqK.set(sg.aqK);}
  else{const R2=mulberry((Math.imul(d.seed|0,2246822519)^0x9e3779b9)>>>0);genAquifers(R2);aqK.set(aq);} // salvataggio precedente alla v76: le falde si ricreano dal seme (la fertilità si ricava da sola, v69); le falde sono tutte note e i pozzi già costruiti restano dove sono
  for(const k of Object.keys(S))delete S[k];
  Object.assign(S,Sx);lastStep.fill(S.t||0);
  S.extra=(S.extra&&typeof S.extra==='object')?S.extra:{};S.edicts=Object.assign(EDICT0(),S.edicts);S.stock=Object.assign({wood:0,stone:0,iron:0,grain:0,flour:0,planks:0,tools:0,cloth:0,clothes:0,bread:0,fish:0,meat:0,game:0,rope:0,charcoal:0,bars:0,weapons:0,clay:0,bricks:0,lime:0,salt:0,cured:0,cheese:0,beer:0,wine:0,hides:0,leather:0,shoes:0},S.stock);
  for(const k of ['wh','xf','inflight'])S[k]=Object.assign({wood:0,stone:0,iron:0},S[k]);
  S.coins=Number.isFinite(S.coins)?S.coins:COINS0;S.fin=Object.assign(mkFin(),S.fin);if(!TAX_RATES[S.taxRate])S.taxRate='normal';if(!S.ledger||!Array.isArray(S.ledger.rows))S.ledger={snap:null,rows:[]};S.taxDay=Number.isFinite(S.taxDay)?S.taxDay:-1;{const rt=Array.isArray(S.routes)?S.routes:[];S.routes=mkRoutes().map(r=>Object.assign(r,rt.find(x=>x&&x.id===r.id)||{}));}S.tradeOpt=Object.assign({sell:true,buy:true},S.tradeOpt);S.tlog=Array.isArray(S.tlog)?S.tlog:[];S.trade=Object.assign({sold:0,bought:0,visits:0},S.trade);
  S.pet=Array.isArray(S.pet)?S.pet.filter(p=>p&&Number.isFinite(p.id)&&Number.isFinite(p.exp)):[];S.petNext=S.petNext||0;S.petSeq=S.petSeq|0;S.petOk=S.petOk|0;S.petNo=S.petNo|0;S.petLate=S.petLate|0;S.arrivedFam=S.arrivedFam|0;
  S.mode=S.mode==='river'?'river':'lake';S.diff=DIFFS[S.diff]?S.diff:'facile';S.repairs=S.repairs|0;S.ruined=S.ruined|0;
  windP=null;computeEnv(naturalTerrain());   // v64: fertilità e corrente si ricavano dall'acqua e dal seme, il vento dal seme: niente da salvare
  for(const k of Object.keys(acc))delete acc[k];Object.assign(acc,{a1:0,a05:0,farm:0,attr:99},ac);
  for(const k of Object.keys(told))delete told[k];Object.assign(told,tl);
  gatedSet.clear();for(const i of ga)gatedSet.add(i);
  reg.clear();for(const [k,r] of rg)reg.set(k,r);
  resv.clear();for(const [k,r] of rv)resv.set(k,r);
  plantResv.clear();for(const i of pr)plantResv.add(i);
  buildings.clear();for(const b of bl)buildings.set(b.id,b);
  for(const b of buildings.values()){if(b.type==='sheepfold')b.milk=b.milk|0;if(b.inp)b.inp.vine=b.inp.vine|0;}
  // v57: i salvataggi vecchi non hanno mattoni e calce nei cantieri
  for(const b of buildings.values()){if(b.got)for(const k of MATS)b.got[k]=b.got[k]|0;if(b.fly)for(const k of MATS)b.fly[k]=b.fly[k]|0;}
  villagers=vl;vmap.clear();for(const v of vl)vmap.set(v.id,v);
  guests.length=0;for(const g of gl)guests.push(g);
  nextId=d.nextId;stCache=null;connCache.clear();connStamp=-1;occStamp++;
  festSeq=0;for(const b of buildings.values())if(b.fest&&b.fest.seq>festSeq)festSeq=b.fest.seq;for(const v of villagers)if(v.festSeq>festSeq)festSeq=v.festSeq;
  computeAttr();regnoNormalize();
  for(const b of buildings.values())hooks.building(b);
  for(const v of villagers)hooks.villager(v);
  for(const g of guests)hooks.villager(g);
  hooks.trees();hooks.rocks();hooks.saps();hooks.ground();
}
return {capOf,PET_LIFE,petitionTick,acceptPetition,refusePetition,arriveFamily,famText,newPetition,MT,CT,CEN,dowse,soilOf,soilF,soilName,AQ_FIND_R,AQ_COST,TL,hpOf,surgeonOpen,HEAL_R,HEAL_CER,HEAL_HOME,FRATIO,raidPower,weaponsWanted,WEAPON_PER_POST,startHouseWork,mergeTick,trySpawnDense,owns,PROJ,BRANCHES,PROJ_NAMES,RANK_NAMES,projectState,buyProject,regnoInfo,msgCount,peekMsg,takeMsg,TOWER_R,TOWER_DPS,SIEGE_HOLD,lotOutline,claimLane,SAVE_FMT,exportState,importState,SHAPE_NAME,diagVal,setEdict,addCemetery,AGEY,YEARL,setZone,ZONED,SC,ROTD,dimsOf,entranceOf,inHouse,UPC,SEASONS,SEASON_DAYS,canDemolish,N,CS,W,BT,PATH,ROADT,S,GN,TYPES,TRADE,CAPS,LVNAME,MAXLV,QUAL5,WELL_R,CHURCH_R,SCHOOL_R,HEAL_R,DAY,STORE_CAP,BUFCAP,SAPLING_T,SCHOOL_CAP,EDUREQ,EDU_BLD,IMM_LIT,HIRE_COST,canWorkAt,eduBld,hireEducated,hireNeeded,hooks,init,step,canPlace,afford,place,demolishAt,removeBuilding,paintDistrict,paintRoad,setWant,stats,roleText,attrLabel,hash,cx2w,cy2w,
  reg,DIS,TRADENAME,TRAITS,needsOf,commuteOf,COMMUTE_OK,NEEDS,NEED_LOW,skLevel,SKNAME,XPL,SKMAX,fuelNeed,dateStr,
  WS,PROD,FUN,OUTCAP,PLANK_CAP,SHELFCAP,MERC,costOf,siteReady,FEST,callFest,cancelFest,
  TOWNS,ROUTE_IDS,TGN,T_KEEP,T_TARGET,VISIT_CAP,CARAVAN_GAP,COINS0,BUY_SHARE,WAGE_JOB,EDU_JOBS,CITY_RANK,WAGE_OWE_CAP,wageJob,wageOf,wagePayer,TAX_TABLE,TAX_WEEK,TAX_POUCH,WAGE,WAGE_SEC,SILVER_GOLD,TAX_MARGIN,MSELL,MSELL_KEEP,MSELL_LIM,taxOf,joyOf,TAX_RATES,TAX_JOY,setTaxRate,taxForecast,ledgerTick,money,taxActive,taxStats,taxDue,taxRefuses,merceryTakes,merceryBuy,merceryBuyer,jobless,kingJob,cityMakes,unlockRoute,setTradeOpt,tradeStatus,surplusOf,demandOf,needAll,
  setFarmCrop,fibreCrop,sinkOf,CHAR_CAP,BAR_CAP,CLAY_CAP,BRICK_CAP,LIME_CAP,MATS,BAND,HIDE_CAP,LEATHER_CAP,SHOE_CAP,shoeCover,SALT_CAP,CURED_CAP,CHEESE_CAP,BEER_CAP,WINE_CAP,MILK_CAP,MEAT_KEEP,FISH_KEEP,GRAIN_KEEP,retInfo,RET_CAP,DIFFS,diffOf,maintStats,condOf,condLabel,maintainable,REPAIR_BELOW,WORN_AT,
  STORE_KEYS,GRAN_KEYS,GRAN_TOTAL,CENTER_CAP,setPolicy,storeInfo,stockRoom,capRes,reconcileStock,extraTotal,festTakeFood,
  _t:{joyOf,eatOne,drinkTick,shoeTick,FISH_CYCLE,FAM_FISH_RATE,FAM_FISH_Q,famFishTime,jobNeed,jobSurplus,rebalanceJobs,JOBRES,JOB_MARGIN,JOB_DWELL,tradeTick,doTrade,chooseTier,startPlague,fallIll,killV,tick1,addVillager,addBuilding,vmap,buildings:()=>buildings},
  env:{fert,flowS,flowX,flowY,FERT_HIGH,flowSeason,riverInfo,windNow,windAt,flowLabel,windLabel,COMPASS8,WIND_NAME,FLOW_MS},
  grids:{aq,aqK,tree,rock,ore,water,sap,sapT,road,dist,occ,wear,plev,field,door,attr,cen},guests:()=>guests,buildings:()=>buildings,villagers:()=>villagers};
})();
if(typeof module!=='undefined')module.exports=Sim;
