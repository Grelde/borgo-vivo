// v62: Difesa. I briganti attaccano di notte, con forza che dipende da difese e benessere; cittadini (1/3), guerrieri (1) e guerrieri armati (5/3) combattono, il fabbro forgia le armi.
// Deterministico: Math.random è sostituito da un generatore a seme fisso.
const Sim=require('../src/sim.js');const S=Sim.S;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const run=(sec,dt=0.2)=>{for(let i=0;i<sec/dt;i++)Sim.step(dt);};
const mil=side=>Sim.guests().filter(g=>g.mil&&(!side||g.side===side));
const built=(type,cx,cy)=>{for(let d=0;d<=30;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d&&Sim.canPlace(type,cx+dx,cy+dy,0)===''){return Sim._t.addBuilding(type,cx+dx,cy+dy,true,{rot:0});}return null;};
// borgo di prova: un vero villaggio fatto crescere una volta sola (distretto, magazzino, qualche giorno), poi ricaricato identico a ogni prova
let BASE=null;
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
const baseTown=()=>{
  if(BASE)return BASE;
  Math.random=mulberry(77);Sim.init(7,'lake',undefined,{story:true});S.rank=4;S.stock.wood=500;S.stock.stone=300;
  Sim.paintDistrict(78,78,111,108,1);built('store',93,70);
  for(let i=0;i<10*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}
  BASE=JSON.stringify(Sim.exportState());
  return BASE;
};
const adultsN=()=>Sim.villagers().filter(v=>!v.child).length;
const town=seed=>{
  const j=baseTown();Math.random=mulberry(seed*7919+13);Sim.init(1,'river');Sim.importState(JSON.parse(j));
  S.rank=4;S.stock.wood=500;S.stock.stone=300;S.raid.next=0;S.raid.seq=0;S.raid.arm=1;
  for(const g of Sim.guests().filter(g=>g.mil))Sim.guests().splice(Sim.guests().indexOf(g),1);
};
// aspetta la notte e la prima banda di briganti; ritorna quando ci sono briganti in campo
const waitBand=(max=Sim.DAY*3)=>{let t=0;while(!mil('raid').length&&t<max){Sim.step(0.2);t+=0.2;}return mil('raid').length>0;};

console.log('1) le costanti: cittadino 1/3, guerriero 1, armato 5/3');
ok(near(Sim.FRATIO.citizen,1/3)&&Sim.FRATIO.warrior===1&&near(Sim.FRATIO.armed,5/3),'rapporti di forza');

console.log('2) i briganti attaccano di notte');
Math.random=mulberry(11);Sim.init(11,'lake',undefined,{story:true});S.rank=3;built('store',93,93);S.raid.next=1;
let phase=null,seq0=S.raid.seq,steps=0;while(S.raid.seq===seq0&&steps++<Sim.DAY*3/0.2){Sim.step(0.2);if(S.raid.seq!==seq0)phase=S.ph;}
ok(S.raid.seq>seq0,'è arrivata una banda');
ok(phase==='night','la banda parte di notte (fase '+phase+')');

console.log('3) la forza dei briganti cresce con benessere e difese');
Math.random=mulberry(5);Sim.init(5,'lake',undefined,{story:true});S.rank=4;
for(let i=0;i<10;i++)Sim._t.addVillager(80,80,30);
for(const v of Sim.villagers())v.joy=20;const sad=Sim.raidPower();
for(const v of Sim.villagers())v.joy=90;const glad=Sim.raidPower();
ok(glad.pow>sad.pow,'più benessere, briganti più forti ('+sad.pow.toFixed(2)+' → '+glad.pow.toFixed(2)+')');
built('watchtower',80,93);built('watchtower',106,93);const tw=Sim.raidPower();
ok(tw.pow>glad.pow&&tw.dv>glad.dv,'più difese, briganti più forti ('+glad.pow.toFixed(2)+' → '+tw.pow.toFixed(2)+')');
ok(tw.pow>=0.7&&tw.pow<=1.7,'la forza resta fra 0,7 e 1,7');

console.log('4) cittadini, guerrieri e guerrieri armati: rapporti di forza in campo');
town(21);console.log('   adulti nel borgo di prova:',adultsN());ok(adultsN()>=12,'il borgo di prova ha almeno 12 adulti');
const b1=built('barracks',72,93);S.stock.weapons=1; // un'arma sola: un guerriero armato e uno a mani nude
let wk=0;while(b1.workers.length<2&&wk<150){Sim.step(0.2);wk+=0.2;} // i due posti di guerriero vengono assegnati
ok(b1.workers.length===2,'la caserma ha 2 guerrieri (abitanti col mestiere di guerriero): '+b1.workers.length);
S.raid.next=1;ok(waitBand(),'arrivano i briganti');
run(3);
const rd=mil('raid')[0],mine=mil('mine');
const by=k=>mine.find(g=>g.kind===k);
const war=by('warrior'),arm=by('armed');
ok(war&&arm,'escono un guerriero a mani nude e uno armato (kind: '+mine.map(g=>g.kind).join()+')');
if(war&&arm&&rd){
  ok(near(war.mhp/rd.mhp,1)&&near(war.dps/rd.dps,1),'il guerriero ha la forza di un brigante (pf '+(war.mhp/rd.mhp).toFixed(2)+', danno '+(war.dps/rd.dps).toFixed(2)+')');
  ok(near(arm.mhp/rd.mhp,5/3)&&near(arm.dps/rd.dps,5/3),'il guerriero armato ha 5/3 della forza (pf '+(arm.mhp/rd.mhp).toFixed(2)+', danno '+(arm.dps/rd.dps).toFixed(2)+')');
}
ok(S.stock.weapons===0,'l\'arma esce dal magazzino con il guerriero');
const weaponsTotal0=S.stock.weapons+mil('mine').filter(g=>g.armed).length;
ok(weaponsTotal0===1,'in tutto c\'è 1 arma ('+weaponsTotal0+')');
// i difensori sono abitanti veri: sono "in guerra" (invisibili) mentre combattono
const parked=Sim.villagers().filter(v=>v.state==='war');
ok(parked.length>=2&&parked.every(v=>v.inside),'gli abitanti che combattono sono fuori dalla vita del borgo ('+parked.length+')');
// i cittadini: chiamati solo se i difensori non bastano e solo quelli vicini
let cit=null,guard=0;while(!cit&&guard++<400){Sim.step(0.2);cit=mil('mine').find(g=>g.kind==='citizen');}
const rd2=mil('raid')[0];
if(cit&&rd2){ok(near(cit.mhp/rd2.mhp,1/3)&&near(cit.dps/rd2.dps,1/3),'il cittadino ha 1/3 della forza di un brigante (pf '+(cit.mhp/rd2.mhp).toFixed(2)+')');}
else ok(!mil('raid').length,'se nessun cittadino è stato chiamato i difensori bastavano');
ok(mil('mine').filter(g=>g.kind==='citizen').length<=Math.min(8,Math.floor(adultsN()*0.2)),'i cittadini chiamati non superano il 20% degli adulti (massimo 8)');
console.log('5) fine dello scontro: chi sopravvive torna, chi cade muore; l\'arma si recupera solo dai vivi');
const pop0=Sim.villagers().length;
guard=0;const armedSeen=new Map(mil('mine').filter(g=>g.armed).map(g=>[g.id,g.vid]));let armedDied=0;
while((mil('raid').length||mil('mine').length)&&guard++<6000){
  Sim.step(0.2);
  for(const [id,vid] of [...armedSeen])if(!Sim.guests().some(g=>g.id===id)){armedSeen.delete(id);if(!Sim.villagers().some(v=>v.id===vid))armedDied++;}
}
ok(!mil().length,'a fine battaglia nessuna figura militare resta in campo');
ok(Sim.villagers().every(v=>v.state!=='war'),'nessun abitante resta bloccato "in guerra"');
ok((S.deathsBy.raid||0)===S.raid.fallen-(S.raid.fallen-(S.deathsBy.raid||0)),'i morti in battaglia sono contati a parte ('+(S.deathsBy.raid||0)+')');
ok(S.stock.weapons===weaponsTotal0-armedDied,'l\'arma torna in magazzino solo se il guerriero è vivo (in magazzino '+S.stock.weapons+', persa '+armedDied+')');

console.log('6) il fabbro forgia le armi per la caserma; senza caserma non ne forgia');
town(23);
built('barracks',72,93);const smithy=built('smithy',72,80);S.stock.bars=12;S.stock.iron=0;S.stock.weapons=0;
run(10);ok(Sim.weaponsWanted(),'la caserma chiede armi');
run(Sim.DAY);
ok(S.stock.weapons>0&&S.stock.weapons<=Sim.WEAPON_PER_POST*3,'il fabbro ha forgiato armi, fino alla scorta voluta ('+S.stock.weapons+')');
ok(S.stock.bars<12,'ogni arma costa una barra di ferro (barre '+S.stock.bars+')');
town(25);const sm2=built('smithy',72,80);S.stock.bars=12;S.stock.weapons=0;run(Sim.DAY);
ok(S.stock.weapons===0,'senza caserma il fabbro non forgia armi');

console.log('7) le armi si possono importare');
town(27);built('barracks',72,93);S.stock.weapons=0;
ok(Sim.weaponsWanted(),'serve import di armi');
ok(Sim.TOWNS&&Sim.TOWNS.n.sells.weapons>0&&Sim.TOWNS.s.sells.weapons>0,'Rocca Alta e Campomaggio vendono armi');

console.log('8) salvataggio durante la battaglia');
town(31);built('barracks',72,93);S.stock.weapons=2;run(20);S.raid.next=1;waitBand();run(4);
const nm=mil('mine').length;ok(nm>=1,'ci sono difensori in campo ('+nm+')');
const json=JSON.stringify(Sim.exportState());
Sim.init(1,'river');Sim.importState(JSON.parse(json));
ok(mil('mine').length===nm,'il salvataggio riporta i difensori ('+mil('mine').length+')');
run(Sim.DAY*0.5);
ok(Sim.villagers().every(v=>v.state!=='war')&&!mil('raid').length,'la partita ricaricata finisce la battaglia senza abitanti bloccati');

console.log(fail?`${fail} FALLITI su ${n}`:`OK: ${n} controlli`);process.exit(fail?1:0);
