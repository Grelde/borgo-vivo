// v34: carichi visibili. Controlla che chi costruisce vada davvero al magazzino a prendere i materiali (stato toStore) e che
// il modello di carico scelto dal render (loadKind) sia quello giusto per costruttori e magazzinieri.
const fs=require('fs');
const Sim=require('../src/sim.js');const S=Sim.S;
// loadKind e loadQty vivono nell'IIFE del render (che richiede WebGL): le prendo dal sorgente
const src=fs.readFileSync(__dirname+'/../src/render.js','utf8');
const a=src.indexOf('const CART_AT='),b=src.indexOf('function makeRig');
if(a<0||b<0){console.log('FALLITO: loadKind non trovata in src/render.js');process.exit(1);}
const {loadKind,loadQty}=new Function(src.slice(a,b)+';return {loadKind,loadQty};')();

let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FALLITO:',m);}};
const T=(carry,state,cq,wh)=>loadKind({carry,state,cq},wh);
// tabella dei carichi (v39: i carretti sono solo dei magazzinieri, wh = true)
ok(T('wood','toSite')==='plank','legno al cantiere = assi');
ok(T('stone','toSite',0,true)==='cartStone','magazziniere: pietra al cantiere = carretto di pietre');
ok(T('stone','toSite',0,false)==='rock','altri: pietra al cantiere = sasso in braccio, mai carretto');
ok(T('stone','toStoreC',3,true)==='cartStone','magazziniere: pietra raccolta alla cava = carretto di pietre');
ok(T('stone','toStoreC',3,false)==='rock','altri: pietra raccolta = sasso in braccio');
ok(T('wood','toStoreC',1,true)==='log'&&T('wood','toStoreC',2,true)==='log','poco legno raccolto = tronco sulla spalla');
ok(T('wood','toStoreC',4,true)==='cartWood','magazziniere: molto legno raccolto = carretto di tronchi');
ok(T('wood','toStoreC',4,false)==='log','altri: molto legno = tronco sulla spalla, mai carretto');
ok(T('wood','toWhT',0,true)==='cartWood'&&T('stone','toWhT',0,true)==='cartStone'&&T('iron','toCenterT',0,true)==='cartOre','trasferimento tra magazzini = carretto');
ok(T('iron','toStoreC',0,false)==='box','altri: il ferro non va nel carretto');
for(const [c,st] of [['wood','toStoreC'],['wood','toWhT'],['stone','toSite'],['stone','toStoreC'],['stone','toWhT'],['iron','toStoreC'],['iron','toCenterT']])ok(!/^cart/.test(T(c,st,4,false)||''),'senza magazzino niente carretto: '+c+' '+st);
ok(T('wood','toWork')==='log','il taglialegna porta un tronco');
ok(T('stone','toWork')==='rock','il cavatore porta un sasso in braccio');
ok(T('iron','toWork')==='box'&&T('veg','toHomeF')==='box'&&T('water','toHomeLife')==='box','gli altri carichi restano il blocchetto di prima');
ok(T('wood','toHomeErr')==='box','la legna da ardere portata a casa resta un fascio');
ok(T(null,'toSite')===null,'senza carico non si vede nulla');
ok(loadQty({state:'toStoreC',cq:9})===4&&loadQty({state:'toStoreC',cq:0})===1&&loadQty({state:'toSite',cq:9})===3,'quantità nel carretto');

// partita vera: stesso carico per chi lavora al magazzino e per gli altri costruttori
Sim.init(11,'river');S.stock.wood=400;S.stock.stone=250;
Sim.paintDistrict(78,78,111,108,1);Sim.paintDistrict(114,84,135,114,2);
const put=(type,cx,cy,r)=>{for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d){const q=Sim.place(type,cx+dx,cy+dy,0);if(q.ok)return true;}return false;};
const seen={toStore:{store:0,other:0},toSite:{store:0,other:0}},kinds={store:{},other:{}};let walkToStore=0,roleTxt=null;
const isStoreWorker=v=>{const bb=v.job&&Sim.buildings().get(v.job);return !!bb&&bb.type==='store';};
const sample=()=>{for(const v of Sim.villagers()){
  const who=isStoreWorker(v)?'store':'other';
  if(v.state==='toStore'){seen.toStore[who]++;walkToStore++;if(!roleTxt)roleTxt=Sim.roleText(v);ok(!v.carry,'verso il magazzino si va a mani vuote');}
  if(v.state==='toSite'){seen.toSite[who]++;const k=loadKind(v,who==='store');kinds[who][k]=(kinds[who][k]||0)+1;ok(who==='store'?(k==='plank'||k==='cartStone'):(k==='plank'||k==='rock'),'carico al cantiere ('+who+'): '+k);}
}};
for(const [t,x,y] of [['wood',70,80],['quarry',130,90],['well',96,90],['plaza',100,96],['church',104,110],['school',96,100]])put(t,x,y,30);
for(let i=0;i<Sim.DAY*6/0.2;i++){Sim.step(0.2);sample();if(i%20===0){S.stock.wood=Math.max(S.stock.wood,150);S.stock.stone=Math.max(S.stock.stone,100);}}
console.log('verso il magazzino a mani vuote (campioni): magazzinieri',seen.toStore.store,'altri',seen.toStore.other);
console.log('verso il cantiere col carico (campioni): magazzinieri',seen.toSite.store,JSON.stringify(kinds.store),'| altri',seen.toSite.other,JSON.stringify(kinds.other));
console.log('testo del ruolo verso il magazzino:',roleTxt);
ok(walkToStore>0,'nessuno è andato al magazzino a prendere i materiali');
ok(seen.toSite.store+seen.toSite.other>0,'nessuno ha portato materiali a un cantiere');
ok(!roleTxt||/magazzino/.test(roleTxt),'testo del ruolo verso il magazzino');
console.log(fail?'ESITO: '+fail+' controlli falliti':'ESITO: tutti i controlli superati');
process.exit(fail?1:0);
