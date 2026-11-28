// v48: il Regno. Titoli, progetti del Re, predoni, soldati, guerra del Re, salvataggi.
// Deterministico: Math.random è sostituito da un generatore a seme fisso.
const Sim=require('../src/sim.js');const S=Sim.S;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
const run=(sec,dt=0.2)=>{for(let i=0;i<sec/dt;i++)Sim.step(dt);};
const mil=side=>Sim.guests().filter(g=>g.mil&&(!side||g.side===side));
// costruisce subito (senza cantiere) l'edificio vicino al punto indicato
const built=(type,cx,cy)=>{for(let d=0;d<=30;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d&&Sim.canPlace(type,cx+dx,cy+dy,0)===''){return Sim._t.addBuilding(type,cx+dx,cy+dy,true,{rot:0});}return null;};
const story=seed=>{Math.random=mulberry(seed*7919+13);Sim.init(seed,'lake',undefined,{story:true});S.stock.wood=400;S.stock.stone=400;};
const defend=()=>{for(const [x,y] of [[80,93],[106,93],[93,80],[93,108],[78,78],[108,108]])built('watchtower',x,y);};

console.log('1) fuori dalla modalità storia tutto è disponibile e non arriva nessun messo');
Math.random=mulberry(5);Sim.init(5,'lake');
ok(!S.story&&Sim.owns('church')&&Sim.owns('mercery')&&Sim.owns('barracks'),'tutti i progetti sono disponibili');
run(300);ok(Sim.msgCount()===0&&mil().length===0,'nessun messo e nessuna truppa');

console.log('2) modalità storia: progetti e acquisti');
story(3);
ok(S.story&&S.rank===0,'si parte da Accampamento');
ok(Sim.owns('d1')&&Sim.owns('wood')&&Sim.owns('quarry')&&Sim.owns('select')&&Sim.owns('road'),'strumenti iniziali: quartiere residenziale, taglialegna, cava, strade');
ok(!Sim.owns('church')&&!Sim.owns('well')&&!Sim.owns('d2')&&!Sim.owns('watchtower'),'gli edifici avanzati non sono ancora tuoi');
let r=Sim.buyProject('church');ok(!r.ok&&/Villaggio/.test(r.msg),'chiesa bloccata fino al titolo di Villaggio: '+r.msg);
S.rank=2;S.stock.wood=5;S.stock.stone=5;r=Sim.buyProject('church');ok(!r.ok&&/Non basta/.test(r.msg),'senza risorse non si compra: '+r.msg);
S.stock.wood=100;S.stock.stone=100;r=Sim.buyProject('church');
ok(r.ok&&Sim.owns('church')&&S.stock.wood===80&&S.stock.stone===70,'acquisto della chiesa paga 20 legno e 30 pietra ('+S.stock.wood+'/'+S.stock.stone+')');
r=Sim.buyProject('church');ok(!r.ok&&/già tuo/.test(r.msg),'non si compra due volte');
r=Sim.buyProject('well');ok(r.ok,'i progetti dei titoli precedenti restano acquistabili');
r=Sim.buyProject('weaver');ok(!r.ok,'il telaio è del titolo Terra murata');
S.rank=5;S.coins=0;r=Sim.buyProject('weaver');ok(!r.ok&&/denari/.test(r.msg),'i progetti alti chiedono denari: '+r.msg);
S.coins=100;const w0=S.stock.wood;r=Sim.buyProject('weaver');ok(r.ok&&S.coins===70&&S.stock.wood===w0-20,'il telaio costa 30 denari e 20 legno');
ok(Sim.projectState('hall').afford===false||Sim.projectState('hall').afford===true,'projectState risponde');
ok(Sim.PROJ.every(p=>Sim.RANK_NAMES[p.rank]&&p.rank>=1&&p.rank<=6),'ogni progetto ha un titolo valido');

console.log('3) il Re concede i titoli quando il borgo cresce');
story(7);Sim.paintDistrict(78,78,111,108,1);
for(let tries=0;tries<10&&S.rank<1;tries++){
  if(!Sim.stats().built.wood)built('wood',72,78);if(!Sim.stats().built.quarry)built('quarry',132,90);
  S.stock.wood=Math.max(S.stock.wood,200);S.stock.stone=Math.max(S.stock.stone,100);run(Sim.DAY);}
ok(S.rank>=1,'dopo qualche giorno arriva il titolo di Casale (titolo '+S.rank+', abitanti '+Sim.stats().pop+')');
const m=Sim.takeMsg();ok(m&&m.k==='rank'&&m.r===1,'il messo ha lasciato una pergamena per il titolo 1');
ok(Sim.msgCount()===0||Sim.peekMsg().k==='rank','la coda dei messi si svuota a un messaggio per volta');
const inf=Sim.regnoInfo();ok(inf.rank>=1&&inf.name===Sim.RANK_NAMES[inf.rank]&&Array.isArray(inf.needs),'regnoInfo dà titolo e requisiti');

console.log('4) predoni: senza difese rubano, con le torri vengono respinti');
story(11);S.rank=3;S.raid.next=1;
run(Sim.DAY*2);
ok(S.raid.seq>=1,'dal Borgo in poi arrivano i predoni (bande: '+S.raid.seq+')');
const stock0=S.stock.wood+S.stock.stone;
run(60);
ok(S.raid.stolen>0&&S.raid.lost>0,'senza difese i predoni scappano col bottino (rubato '+S.raid.stolen+', fuggiti '+S.raid.lost+')');
ok(mil('raid').length<=6,'le bande sono piccole (max 6 predoni vivi: '+mil('raid').length+')');
story(11);S.rank=3;defend();S.raid.next=1;
let guard=0;while(S.raid.repelled<1&&guard++<4000)Sim.step(0.2);
ok(S.raid.repelled>=1&&S.raid.killed>=2,'con le torri l\'assalto è respinto (uccisi '+S.raid.killed+', rubato '+S.raid.stolen+')');
ok(S.raid.stolen<S.raid.killed*40,'le torri limitano i furti');

console.log('5) la caserma manda i soldati solo quando ci sono nemici');
story(13);S.rank=4;built('barracks',80,93);S.stock.wood=500;S.stock.stone=500;
run(30);ok(mil('mine').length===0,'senza nemici la caserma resta vuota');
S.raid.next=1;let soldiers=0,g2=0;while(g2++<3000&&!(soldiers>=1&&S.raid.bands&&!mil('raid').length)){Sim.step(0.2);soldiers=Math.max(soldiers,mil('mine').length);}
ok(soldiers>=1&&soldiers<=3,'la caserma manda da 1 a 3 soldati (visti '+soldiers+')');
run(80);ok(mil('mine').length===0,'finita la minaccia i soldati rientrano');

console.log('6) guerra del Re: dichiarazione, battaglia, vittoria e sconfitta');
story(17);S.rank=6;S.stock.wood=500;S.stock.stone=500;
S.war.phase='warn';S.war.at=S.t+5;defend();built('barracks',80,100);built('barracks',106,100);
let gw=0;while(S.war.phase!=='done'&&gw++<9000)Sim.step(0.2);
ok(S.war.phase==='done'&&S.rank===7,'difeso il borgo, il Re è sconfitto e il titolo è Capitale del Regno (fase '+S.war.phase+', titolo '+S.rank+')');
ok(S.war.killed>=8,'l\'esercito è stato battuto sul campo ('+S.war.killed+' caduti)');
let sawV=false;while(Sim.msgCount()){if(Sim.takeMsg().k==='victory')sawV=true;}ok(sawV,'il messo porta la pergamena della vittoria');
story(17);S.rank=6;S.stock.wood=500;S.stock.stone=500;S.coins=200;
S.war.phase='warn';S.war.at=S.t+5;
const wd0=S.stock.wood;gw=0;while(S.war.defeats<1&&gw++<9000)Sim.step(0.2);
ok(S.war.defeats===1&&S.war.phase==='warn'&&S.rank===6,'senza difese l\'assedio riesce: sconfitta, il Re tornerà (fase '+S.war.phase+')');
ok(S.coins<=100&&S.stock.wood<wd0,'la sconfitta costa scorte e denari (denari '+S.coins+', legno '+Math.round(S.stock.wood)+')');
let sawD=false;while(Sim.msgCount()){if(Sim.takeMsg().k==='defeat')sawD=true;}ok(sawD,'il messo porta la pergamena della sconfitta');
ok(S.war.at>S.t+Sim.DAY*1.5,'la nuova ondata è tra circa due giorni');

console.log('7) salvataggio: titolo, progetti e truppe in marcia');
story(19);S.rank=4;Sim.buyProject('well');S.rank=4;S.raid.next=1;let gs=0;while(!mil('raid').length&&gs++<2000)Sim.step(0.2);
ok(mil('raid').length>0,'ci sono predoni in marcia');
const raiders=mil('raid').length,proj=Object.keys(S.proj).join(),rk=S.rank;
const json=JSON.stringify(Sim.exportState());
Sim.init(1,'river');ok(S.rank===0&&!S.story,'una nuova partita azzera il titolo');
Sim.importState(JSON.parse(json));
ok(S.story&&S.rank===rk&&Object.keys(S.proj).join()===proj&&mil('raid').length===raiders,'il salvataggio riporta titolo, progetti e predoni ('+S.rank+', '+raiders+')');
run(60);ok(true,'la partita ricaricata prosegue senza errori');
const old=JSON.parse(json);delete old.S.story;delete old.S.rank;delete old.S.proj;delete old.S.raid;delete old.S.war;delete old.S.msgs;old.guests=old.guests.filter(g=>!g.mil);
Sim.importState(old);
ok(S.story===true&&S.rank>=0&&S.msgs.length===0,'un salvataggio precedente alla v48 si carica con il titolo che merita (titolo '+S.rank+') e nessuna pergamena');
ok(Sim.PROJ.filter(p=>p.rank<=S.rank).every(p=>Sim.owns(p.id)),'e con tutti i progetti dei titoli già raggiunti');

console.log(fail?`${fail} FALLITI su ${n}`:`OK: ${n} controlli`);process.exit(fail?1:0);
