// v36: Magazzino e Granaio con accettazione e massimali configurabili (1000 unità in tutto per edificio, condivise fra le merci accettate).
// Il Magazzino accoglie materiali da costruzione e prodotti degli artigiani; il Granaio il cibo che non viene dai giardini; il centro resta com'era (80 per materiale).
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}};
const B=()=>[...Sim.buildings().values()];
const done=t=>B().filter(b=>b.type===t&&b.state==='done');
function put(type,x0,y0){
  for(let r=0;r<70;r+=3)for(let dy=-r;dy<=r;dy+=3)for(let dx=-r;dx<=r;dx+=3){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    for(const rot of [0,1,2,3]){const res=Sim.place(type,x0+dx,y0+dy,rot);if(res.ok)return res.b;}
  }
  return null;
}
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(12);

console.log('1) regole di base');
const ctr=B().find(b=>b.type==='store'&&b.center);
ok(!!ctr,'centro cittadino presente');
ok(Sim.setPolicy(ctr.id,'wood',{on:false})===false,'il centro non si configura');
ok(Sim.capRes('wood')===Sim.CENTER_CAP&&Sim.capRes('tools')===0&&Sim.capRes('grain')===0,'senza Magazzino e Granaio: legno '+Sim.capRes('wood')+' (80 come prima), attrezzi e grano 0');
const M=put('store',100,100),G=put('granary',108,100);
ok(!!M&&!!G,'Magazzino e Granaio piazzati');
run(10);
ok(M.state==='done'&&G.state==='done','Magazzino e Granaio completati');
const mi=Sim.storeInfo(M),gi=Sim.storeInfo(G);
ok(mi.total===1000&&gi.total===1000,'1000 unità in tutto per edificio');
ok(JSON.stringify(mi.keys)===JSON.stringify(['wood','stone','iron','planks','tools','cloth','clothes','rope']),'il Magazzino accoglie materiali e prodotti degli artigiani: '+mi.keys.join(','));
ok(JSON.stringify(gi.keys)===JSON.stringify(['grain','flour','bread','fish','meat']),'il Granaio accoglie cibo di fattorie e filiera: '+gi.keys.join(','));
ok(!mi.keys.concat(gi.keys).some(k=>['veg','eggs','firewood'].includes(k)),'nessuna merce dei giardini (ortaggi, uova, legna da ardere)');
ok(mi.pol.every(p=>p.on&&p.max===1000)&&gi.pol.every(p=>p.on&&p.max===1000),'di base tutto acceso con massimale 1000');
ok(Sim.setPolicy(G.id,'tools',{on:false})===false&&Sim.setPolicy(M.id,'bread',{on:true})===false,'una merce non adatta all\'edificio non si configura (attrezzi al Granaio, pane al Magazzino)');

console.log('2) accettazione e massimale per merce');
const w0=Sim.capRes('wood');
// il posto del Magazzino è condiviso: la capacità per il legno è 1000 meno quanto occupano le altre merci
const miw=Sim.storeInfo(M),usedOther=miw.tot-miw.pol.find(p=>p.k==='wood').held;
ok(w0===Sim.CENTER_CAP+1000-usedOther,'legno: centro 80 + Magazzino (1000 meno '+usedOther+' occupati da altre merci) = '+w0);
Sim.setPolicy(M.id,'wood',{on:false});
ok(Sim.capRes('wood')===Sim.CENTER_CAP,'legno spento nel Magazzino: resta solo il centro ('+Sim.capRes('wood')+')');
Sim.setPolicy(M.id,'wood',{on:true});
Sim.setPolicy(M.id,'stone',{max:200});
ok(Sim.capRes('stone')===Sim.CENTER_CAP+200,'massimale pietra 200: '+Sim.capRes('stone'));
Sim.setPolicy(M.id,'stone',{max:99999});ok(Sim.storeInfo(M).pol.find(p=>p.k==='stone').max===1000,'massimale limitato a 1000');
Sim.setPolicy(M.id,'stone',{max:-5});ok(Sim.storeInfo(M).pol.find(p=>p.k==='stone').max===0,'massimale negativo diventa 0');
Sim.setPolicy(M.id,'stone',{max:'abc'});ok(Sim.storeInfo(M).pol.find(p=>p.k==='stone').max===0,'valore non numerico ignorato');
Sim.setPolicy(M.id,'stone',{max:1000});

console.log('3) totale condiviso di 1000 per edificio');
const keep={wood:S.stock.wood,stone:S.stock.stone};
Sim.setPolicy(M.id,'wood',{max:700});Sim.setPolicy(M.id,'stone',{max:700});
S.stock.wood=700;S.stock.stone=700;
const mi2=Sim.storeInfo(M);
ok(mi2.tot<=1000,'il Magazzino non supera 1000 in tutto: '+mi2.tot);
ok(Sim.stockRoom('stone')===0||mi2.tot===1000||mi2.pol.find(p=>p.k==='stone').held===700-Sim.CENTER_CAP,'la pietra trova posto solo finché il totale non è pieno: spazio '+Sim.stockRoom('stone'));
S.stock.wood=keep.wood;S.stock.stone=keep.stone;Sim.setPolicy(M.id,'wood',{max:1000});Sim.setPolicy(M.id,'stone',{max:1000});

console.log('4) prodotti degli artigiani: solo se accettati');
for(const b of B())if(b.type==='house'&&b.state==='done')for(const g of ['tools','bread'])b.goods[g]=12;
const sm=put('smithy',112,104),ba=put('bakery',116,108);ok(!!sm&&!!ba,'fucina e forno piazzati');
// spento tutto: nessuna merce entra in magazzino
Sim.setPolicy(M.id,'tools',{on:false});Sim.setPolicy(G.id,'bread',{on:false});
S.stock.iron=80;S.stock.flour=80;
const feed=()=>{S.stock.iron=Math.max(S.stock.iron,60);S.stock.flour=Math.max(S.stock.flour,60);};
for(let i=0;i<18*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){hold();feed();for(const h of B())if(h.type==='house'&&h.state==='done'){h.goods.tools=12;h.goods.bread=12;}}}
ok((S.made.smithy|0)>0&&(S.made.bakery|0)>0,'fucina e forno lavorano: '+S.made.smithy+' e '+S.made.bakery+' cicli');
ok(S.stock.tools===0&&S.stock.bread===0,'accettazione spenta: attrezzi '+S.stock.tools+', pane '+S.stock.bread);
// acceso: l'eccedenza (le case sono piene) va a Magazzino e Granaio
Sim.setPolicy(M.id,'tools',{on:true});Sim.setPolicy(G.id,'bread',{on:true});
for(let i=0;i<18*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){hold();feed();for(const h of B())if(h.type==='house'&&h.state==='done'){h.goods.tools=12;h.goods.bread=12;}}}
ok(S.stock.tools>0,'attrezzi nel Magazzino: '+S.stock.tools);
ok(S.stock.bread>0,'pane nel Granaio: '+S.stock.bread);
const giN=Sim.storeInfo(G),miN=Sim.storeInfo(M);
ok(giN.pol.find(p=>p.k==='bread').held===S.stock.bread&&miN.pol.find(p=>p.k==='tools').held===S.stock.tools,'la scorta compare nell\'edificio che l\'accoglie');
// massimale: con massimale 5 la scorta si ferma lì
Sim.setPolicy(M.id,'tools',{max:5});
const cap5=Sim.capRes('tools');
ok(cap5===5,'massimale attrezzi 5: capacità '+cap5);
for(let i=0;i<10*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){hold();feed();for(const h of B())if(h.type==='house'&&h.state==='done'){h.goods.tools=12;h.goods.bread=12;}}}
ok(Sim.storeInfo(M).pol.find(p=>p.k==='tools').held<=5||Sim.stockRoom('tools')===0,'con massimale 5 la merce non cresce oltre: spazio '+Sim.stockRoom('tools'));

console.log('5) coerenza');
ok(Object.values(S.stock).every(v=>v>=0&&Number.isFinite(v)),'nessuna scorta negativa o non numerica');
ok(Sim.storeInfo(M).tot<=1000&&Sim.storeInfo(G).tot<=1000,'mai più di 1000 in un edificio');
const st=Sim.stats();ok(st.capRes>0&&st.capStone>0&&st.capGrain>0,'stats: capacità legno '+st.capRes+', pietra '+st.capStone+', grano '+st.capGrain);
console.log(fails?'STORAGE_FALLITO '+fails:'STORAGE_OK');
process.exit(fails?1:0);
