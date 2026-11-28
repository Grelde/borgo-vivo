// v64: tasse e paghe. Paga di 1 moneta d'argento per giorno di lavoro, contatore di 7 giorni per casa,
// Ufficio delle Tasse con un esattore che visita le case di persona, tassa che raddoppia a ogni livello,
// case che decidono di non migliorare, Merceria che compra dalle famiglie e rifiuta ciò che ha in abbondanza.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,60);S.stock.flour=Math.max(S.stock.flour,60);S.stock.planks=Math.max(S.stock.planks,60);};
let sawTax=false,sawDep=false;
const run=d=>{for(let i=0;i<d*Sim.DAY/0.4;i++){Sim.step(0.4);if(i%10===0)hold();for(const v of Sim.villagers()){if(v.state==='tax'||v.state==='toTax')sawTax=true;if(v.state==='toTaxDep')sawDep=true;}}};
const B=()=>[...Sim.buildings().values()];
const of=t=>B().filter(b=>b.type===t);
const done=t=>of(t).filter(b=>b.state==='done');
const hs=()=>B().filter(b=>b.type==='house'&&b.state==='done');
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(12);
console.log('Abitanti',Sim.villagers().length,'case',hs().length);

console.log('1) regole e monete');
ok([1,2,3,4,5].map(Sim.taxOf).join()==='1,3,5,10,20','la tassa settimanale per livello è 1, 3, 5, 10, 20 d\'argento (il raddoppio 1,2,4,8,16 più 25%, arrotondato)');
ok(Sim.TAX_WEEK===7&&Sim.WAGE===1&&Sim.SILVER_GOLD===10,'contatore di 7 giorni, paga di 1 d\'argento, 1 oro = 10 argento');
ok(Sim.money(7)==='7 arg'&&Sim.money(10)==='1 oro'&&Sim.money(25)==='2 oro 5 arg'&&Sim.money(0)==='0 arg','formato oro/argento');
ok(!!Sim.BT.taxoffice&&Sim.BT.taxoffice.name==='Ufficio delle Tasse'&&Sim.TRADENAME.taxoffice==='esattore','Ufficio delle Tasse e mestiere di esattore definiti');
ok(Sim.PROJ.some(p=>p.id==='taxoffice'),'l\'ufficio è fra i blueprint del Re');
ok(hs().every(h=>Number.isFinite(h.taxT)&&h.taxT<=Sim.TAX_WEEK&&Number.isFinite(h.cash)),'ogni casa ha contatore e cassa propria');

console.log('2) paghe: 1 d\'argento per giorno di lavoro, pagate dal Re');
const carp=put('carpenter',100,100),wd0=S.fin.wages,cash0=hs().reduce((a,h)=>a+(h.cash|0),0),coin0=S.coins;
ok(!!carp,'falegnameria piazzata');
run(14);
const cashN=hs().reduce((a,h)=>a+(h.cash|0),0),days=Sim.villagers().reduce((a,v)=>a+(v.wd|0),0),earned=Sim.villagers().reduce((a,v)=>a+(v.pay|0),0);
ok(S.fin.wages>wd0,'paghe versate: '+(S.fin.wages-wd0)+' d\'argento');
ok(days>0&&earned===S.fin.wages&&earned>=days,'almeno una moneta per ogni giorno di lavoro (giorni '+days+', paghe '+S.fin.wages+')');
ok(cashN-cash0===S.fin.wages-wd0,'il denaro va alle casse delle famiglie');
ok(S.coins===coin0,'la cassa del paese non paga gli stipendi (paga il Re)');
ok(S.fin.tax===0&&!Sim.taxActive(),'senza Ufficio delle Tasse non si riscuote nulla');
ok(hs().filter(h=>h.taxT<=0).length>0,'senza esattore i contatori restano a zero: case da riscuotere '+hs().filter(h=>h.taxT<=0).length);
ok(Sim.villagers().filter(v=>v.child&&v.wd>0).length===0,'i bambini non sono pagati');
ok(hs().every(h=>h.lastTax===undefined),'nessuna casa ha pagato');

console.log('3) l\'esattore riscuote di persona');
const to=put('taxoffice',96,100);ok(!!to,'ufficio piazzato');
ok(to&&to.cost.planks===4&&to.visits===0&&to.collected===0,'costo '+JSON.stringify(to&&to.cost));
const c1=S.coins;
run(14);
const off=done('taxoffice')[0];
ok(!!off&&off.workers.length===1,'ufficio finito con un esattore');
ok(Sim.taxActive(),'tassazione attiva');
ok(sawTax,'l\'esattore è andato a piedi alle case');
ok(sawDep,'l\'esattore è tornato a portare il gruzzolo all\'ufficio');
ok(S.fin.visits>0&&S.fin.tax>0,'visite '+S.fin.visits+', riscosso '+S.fin.tax+' d\'argento');
ok(S.coins-c1===S.fin.tax,'la cassa del paese cresce esattamente di ciò che è stato versato ('+(S.coins-c1)+')');
ok(off.collected===S.fin.tax&&off.visits===S.fin.visits,'l\'ufficio tiene il conto: incassato '+off.collected+', visite '+off.visits);
const visited=hs().filter(h=>h.lastTax);
ok(visited.length>0&&visited.every(h=>h.lastTax.pay<=h.lastTax.due),'ogni casa visitata paga al massimo la sua tassa');
ok(visited.every(h=>Sim.TAX_TABLE.includes(h.lastTax.due)),'tasse sempre uno dei valori della tabella (1,3,5,10,20)');
ok(visited.every(h=>h.taxT>=0&&h.taxT<=Sim.TAX_WEEK),'dopo la visita il contatore riparte da 7');

console.log('4) contatore di 7 giorni e case non visitate');
const [A,Bh,Cc]=hs().filter(h=>cellOkNear(h));
function cellOkNear(h){return Math.hypot(h.cell%192-off.cell%192,((h.cell/192)|0)-((off.cell/192)|0))<120;}
ok(!!A&&!!Bh&&!!Cc,'tre case vicine all\'ufficio');
for(const h of hs()){h.taxT=Sim.TAX_WEEK;h.lastTax=undefined;}
A.taxT=0;A.cash=10;A.wk=5;Bh.taxT=0;Bh.cash=0;Cc.taxT=0;Cc.cash=10;Cc.taxSkip=S.t+99999;
const fin0=Object.assign({},S.fin),lvA=A.level;
run(2);
ok(A.lastTax&&A.lastTax.due===Sim.taxOf(lvA)&&A.lastTax.pay===Math.min(10,Sim.taxOf(lvA)),'la casa A ha pagato la tassa del suo livello ('+lvA+'): '+JSON.stringify(A.lastTax));
ok(A.cash===10-A.lastTax.pay,'la cassa della famiglia è scesa di ciò che ha pagato');
ok(A.taxT>=4&&A.taxT<=Sim.TAX_WEEK,'il contatore di A riparte da 7 e scende di un giorno alla volta ('+A.taxT+')');
ok(A.lastInc===5&&A.wk<=5,'l\'incasso della settimana passa a lastInc ('+A.lastInc+')');
ok(Bh.lastTax&&Bh.lastTax.pay===0&&Bh.cash===0,'chi non ha soldi paga solo ciò che ha (0) e la cassa non va sotto zero');
ok(S.fin.short>fin0.short,'tasse mancate registrate: '+(S.fin.short-fin0.short));
ok(!Cc.lastTax&&Cc.cash===10,'una casa che l\'esattore non riesce a visitare non paga');
Cc.taxSkip=0;

console.log('5) una famiglia può decidere di non migliorare la casa');
const H=hs();
const poor=H[0];poor.lastInc=0;
ok(Sim.taxRefuses(poor),'con un reddito troppo basso per la tassa del livello dopo rifiuta');
let rich=null;for(const h of H){h.lastInc=9999;if(!Sim.taxRefuses(h)){rich=h;break;}}
ok(!!rich,'con reddito alto la maggior parte delle famiglie accetta');
const thrifty=H.filter(h=>{h.lastInc=9999;return Sim.taxRefuses(h);}).length;
ok(thrifty<=Math.ceil(H.length*0.5),'per carattere ne rifiuta solo una minoranza ('+thrifty+' su '+H.length+')');
const yes=H.filter(h=>{h.lastInc=undefined;return Sim.taxRefuses(h);}).length;
ok(yes<=thrifty,'prima della prima riscossione conta solo il carattere');

console.log('6) la Merceria compra dalle famiglie e rifiuta l\'abbondanza');
const me=put('mercery',104,110);ok(!!me,'merceria piazzata');
run(14);
const m=done('mercery')[0];ok(!!m&&m.workers.length>0,'merceria aperta con un merciaio');
const h0=hs()[0];
h0.goods.bread=10;m.shelf.bread=0;S.coins=100;h0.cash=0;
const f1=S.fin.refused;
const took=Sim.merceryBuy(m,h0,'bread');
ok(took===Math.min(4,10-Sim.MSELL_KEEP.bread),'compra un lotto di '+took+' pani al prezzo di '+Sim.MSELL.bread+' d\'argento l\'uno');
ok(m.shelf.bread===took&&h0.goods.bread===10-took,'il pane passa dalla casa allo scaffale');
ok(S.coins===100-took*Sim.MSELL.bread&&h0.cash===took*Sim.MSELL.bread,'la Merceria paga dalla cassa del paese e la famiglia incassa');
const lim=Sim.cityMakes('bread')?Sim.MSELL_LIM[0]:Sim.MSELL_LIM[1];
m.shelf.bread=lim;h0.goods.bread=10;
ok(Sim.merceryBuy(m,h0,'bread')===0&&S.fin.refused===f1+1,'con abbondanza di pane ('+lim+') la Merceria rifiuta');
m.shelf.bread=0;S.coins=0;
ok(Sim.merceryBuy(m,h0,'bread')===0,'senza denari in cassa la Merceria non compra');
S.coins=100;
// preferenza per i prodotti degli edifici della città
const ba=put('bakery',112,104);run(14);
const bk=done('bakery')[0];
if(bk&&bk.workers.length>0){
  ok(Sim.cityMakes('bread')&&Sim.merceryTakes(m,'bread')===Sim.MSELL_LIM[0]-m.shelf.bread,'con un forno cittadino al lavoro la soglia scende a '+Sim.MSELL_LIM[0]+' pezzi');
}else console.log('  (forno senza addetti: confronto soglie saltato)');
m.shelf.bread=Sim.MSELL_LIM[0];h0.goods.bread=10;
ok(Sim.merceryBuy(m,h0,'bread')===0,'a '+Sim.MSELL_LIM[0]+' pani la Merceria ne ha già abbastanza (se la città lo produce)')||0;
// chi lavora per il Re non va a vendere
const mem=h0.members.map(id=>Sim.villagers().find(v=>v.id===id)).filter(Boolean);
const saved=mem.map(v=>v.job);
for(const v of mem)v.job=null;h0.goods.bread=10;m.shelf.bread=0;S.coins=100;h0.msTry=0;
ok(Sim.jobless(h0)&&!!Sim.merceryBuyer(h0),'una famiglia senza posti di lavoro manda qualcuno a vendere');
m.shelf.bread=Sim.MSELL_LIM[1];
ok(!Sim.merceryBuyer(h0),'ma non parte se la Merceria ha già abbondanza');
m.shelf.bread=0;
const jb=B().find(b=>b.type==='carpenter'&&b.state==='done');
if(jb&&mem.length){mem[0].job=jb.id;ok(!Sim.jobless(h0)&&!Sim.merceryBuyer(h0),'una famiglia con un membro che lavora per il Re non vende alla Merceria');}
mem.forEach((v,i)=>{v.job=saved[i];});

console.log('7) salvataggio');
const hh=hs()[1];hh.cash=17;hh.taxT=3;S.fin.tax+=0;
const snap=JSON.parse(JSON.stringify(Sim.exportState()));
const fin=Object.assign({},S.fin);
let imp=true;try{Sim.importState(JSON.parse(JSON.stringify(snap)));}catch(e){imp=false;console.log(e.message);}
ok(imp,'importazione riuscita');
const h2=B().find(b=>b.id===hh.id);
ok(h2&&h2.cash===17&&h2.taxT===3,'cassa e contatore della casa nel salvataggio');
ok(JSON.stringify(S.fin)===JSON.stringify(fin),'conti delle tasse nel salvataggio');
// vecchio salvataggio senza campi nuovi
const old=JSON.parse(JSON.stringify(snap));
delete old.S.fin;delete old.S.taxDay;
for(const b of old.buildings||[]){if(b.type==='house'){delete b.taxT;delete b.cash;delete b.wk;}}
let loadOld=true;try{Sim.importState(old);run(1.2);}catch(e){loadOld=false;console.log(e.message);}
ok(loadOld&&Number.isFinite(S.fin.tax)&&hs().every(h=>Number.isFinite(h.taxT)&&h.taxT>=0&&h.taxT<=Sim.TAX_WEEK),'un salvataggio vecchio si carica con valori di riserva');

console.log(fails?('FALLITI '+fails):'TUTTO OK');
process.exit(fails?1:0);
