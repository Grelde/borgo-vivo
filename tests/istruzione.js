// v65: istruzione. La scuola ha 10 posti (iscrizione dai 6 ai 14 anni, chi non trova posto non studia),
// alcuni edifici (Ufficio delle Tasse, Scuola, Merceria) hanno solo addetti istruiti, e ogni bottega con
// almeno un addetto istruito rende il 30% in più.
const Sim=require('../src/sim.js');const S=Sim.S;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
Sim.init(7,'lake');S.stock.wood=600;S.stock.stone=400;S.stock.planks=80;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);Sim.paintDistrict(60,60,90,92,5);
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);S.stock.iron=Math.max(S.stock.iron,60);S.stock.flour=Math.max(S.stock.flour,60);S.stock.planks=Math.max(S.stock.planks,60);};
let strip=false;const wl=new Set(); // strip: toglie l'istruzione agli adulti nuovi arrivati (25% sono istruiti) per rendere deterministico il controllo
const run=d=>{for(let i=0;i<d*Sim.DAY/0.4;i++){Sim.step(0.4);if(i%10===0)hold();if(strip)for(const v of Sim.villagers())if(!v.child&&!wl.has(v.id))v.schooled=false;}};
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

console.log('1) regole');
ok(Sim.SCHOOL_CAP===10,'la scuola ha 10 posti');
ok(Sim.EDUREQ.taxoffice&&Sim.EDUREQ.school&&Sim.EDUREQ.mercery&&!Sim.EDUREQ.mason&&!Sim.EDUREQ.smithy,'per istruiti: esattore, maestro, merciaio; fabbro e muratore no');
ok(Sim.EDU_BLD===1.3,'bonus di bottega +30%');
ok(!Sim.canWorkAt({schooled:false},'taxoffice')&&Sim.canWorkAt({schooled:true},'taxoffice')&&Sim.canWorkAt({schooled:false},'smithy'),'canWorkAt: solo gli istruiti negli edifici per istruiti, tutti gli altri mestieri aperti a tutti');
ok(Sim.villagers().length===3&&Sim.villagers().every(v=>v.schooled),'i primi tre della carovana sanno leggere e scrivere (si può avviare il borgo)');

for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108]])Sim.place(t,x,y,0);
run(4);
console.log('Abitanti',Sim.villagers().length,'case',hs().length);

console.log('2) edificio per istruiti: senza istruiti resta senza addetti');
const lit=Sim.villagers().filter(v=>v.schooled);
for(const v of Sim.villagers())v.schooled=false;strip=true;
const to=put('taxoffice',96,100);ok(!!to,'ufficio delle tasse piazzato');
run(3);
const off=done('taxoffice')[0];
ok(!!off,'ufficio completato');
ok(off&&off.workers.length===0,'nessun istruito in paese: l\'ufficio non ha esattore ('+(off&&off.workers.length)+')');
const cands=Sim.villagers().filter(v=>!v.child&&!v.ill).slice(0,4); // alcune persone istruite libere (qualcuna potrebbe essere di turno in giardino)
for(const c of cands){if(c.job){const jb=Sim.buildings().get(c.job);if(jb)jb.workers=jb.workers.filter(x=>x!==c.id);c.job=null;c.state='idle';c.carry=null;}c.duty=false;c.schooled=true;wl.add(c.id);}
run(3);
ok(off&&off.workers.length===1,'con una persona istruita libera l\'esattore c\'è ('+(off&&off.workers.length)+')');
ok(off&&off.workers.every(id=>Sim._t.vmap.get(id).schooled),'chi ci lavora è istruito');
// un non istruito messo a forza nell'ufficio viene mandato via
const intruder=Sim.villagers().find(v=>!v.child&&!v.schooled&&!v.job);
if(intruder){intruder.job=off.id;off.want=2;off.workers.push(intruder.id);}
run(1);
ok(!off.workers.some(id=>!Sim._t.vmap.get(id).schooled),'un non istruito non resta a lavorare nell\'ufficio');

strip=false;
console.log('3) bonus del 30% in bottega');
const ms=put('mason',104,96);ok(!!ms,'bottega del muratore piazzata');
run(3);
const mason=done('mason')[0];
ok(!!mason&&mason.workers.length>=1,'la bottega ha addetti ('+(mason&&mason.workers.length)+')');
const wk=mason.workers.map(id=>Sim._t.vmap.get(id));
for(const w of wk)w.schooled=false;
ok(Sim.eduBld(mason)===1,'senza istruiti rende normale (x1)');
wk[0].schooled=true;
ok(Sim.eduBld(mason)===1.3,'con un istruito rende il 30% in più (x1.3)');
ok(Sim.eduBld({workers:[]})===0,'edificio senza addetti propri (famiglia): torna il bonus personale');

console.log('4) scuola: 10 posti, iscrizioni');
for(const c of Sim.villagers().filter(v=>v.child))Sim._t.killV(c,'left'); // solo i bambini del test
for(const v of Sim.villagers())if(!v.child)v.schooled=true; // abbastanza maestri
const sc=put('school',100,118);ok(!!sc,'scuola piazzata');
run(3);
const school=done('school')[0];
ok(!!school&&school.workers.length===1,'la scuola ha un maestro istruito');
const home=hs()[0];
const kids=[];
for(let k=0;k<14;k++){const c=Sim._t.addVillager(school.cell%Sim.N+0.5,((school.cell/Sim.N)|0)+0.5,8);c.home=home.id;home.members.push(c.id);kids.push(c);}
run(1);
const seated=kids.filter(c=>c.seat===school.id);
ok(seated.length===10,'14 bambini, 10 posti: ne sono iscritti '+seated.length);
ok(kids.filter(c=>!c.seat).length===4,'gli altri 4 restano senza posto');
ok((school.enr|0)===10,'la scuola conta 10 iscritti ('+school.enr+')');
run(2);
ok(kids.filter(c=>!c.seat).every(c=>c.edu===0),'chi non ha il posto non impara nulla (edu 0)');
ok(seated.some(c=>c.edu>0),'chi è iscritto impara');

console.log('5) una seconda scuola accoglie gli altri');
const sc2=put('school',70,70);ok(!!sc2,'seconda scuola piazzata');
run(3);
const schools=done('school');
ok(schools.length===2&&schools.every(b=>b.workers.length===1),'due scuole, ognuna con un maestro');
ok(kids.every(c=>c.seat),'ora tutti i 14 hanno un posto (senza posto: '+kids.filter(c=>!c.seat).length+', bambini >=6 anni in paese: '+Sim.villagers().filter(v=>v.child&&v.age>=6).length+', iscritti: '+schools.map(b=>b.enr).join('+')+')');
ok(schools.every(b=>(b.enr|0)<=10),'nessuna scuola oltre 10 iscritti ('+schools.map(b=>b.enr).join('+')+')');

console.log('6) a 14 anni il posto si libera');
const first=seated[0];first.age=14.01;
run(1);
ok(!first.child&&!first.seat,'chi compie 14 anni lascia la scuola e libera il posto');

console.log('7) assunzione di un istruito da fuori');
ok(Sim.IMM_LIT<=0.1&&Sim.HIRE_COST>0,'gli immigrati istruiti sono pochi (<=10%) e assumere da fuori costa ('+Sim.IMM_LIT+', '+Sim.HIRE_COST+')');
for(const id of mason.workers)Sim._t.vmap.get(id).schooled=false;
ok(Sim.hireNeeded(mason)&&!Sim.hireNeeded(done('store')[0]),'si assume nelle botteghe, non nel magazzino');
// libera qualche posto nelle case
let freed=0;for(const v of Sim.villagers().slice())if(!v.child&&!mason.workers.includes(v.id)&&freed<6){Sim._t.killV(v,'left');freed++;}
S.coins=Sim.HIRE_COST-1;
let r=Sim.hireEducated(mason.id);
ok(!r.ok&&S.coins===Sim.HIRE_COST-1,'senza abbastanza denari non si assume e non si paga');
S.coins=Sim.HIRE_COST+10;const w0=mason.workers.length,fin0=S.fin.hired|0;
r=Sim.hireEducated(mason.id);
ok(r.ok&&!!r.v,'con i denari l\'assunzione riesce ('+(r.msg||'')+')');
ok(S.coins===10&&(S.fin.hired|0)===fin0+Sim.HIRE_COST,'pagati '+Sim.HIRE_COST+' argento');
ok(r.v&&r.v.schooled&&r.v.hired&&mason.workers.includes(r.v.id)&&r.v.job===mason.id,'l\'assunto è istruito e ha già il posto in bottega');
ok(Sim.eduBld(mason)===1.3,'la bottega ora rende il 30% in più');
ok(mason.workers.length>=w0&&mason.workers.length<=mason.want,'nessun addetto oltre i posti voluti ('+mason.workers.length+'/'+mason.want+')');
r=Sim.hireEducated(mason.id);
ok(!r.ok,'con un istruito già al lavoro non si assume un secondo');
run(2);
ok(Sim._t.vmap.get(mason.workers[0])&&mason.workers.some(id=>Sim._t.vmap.get(id).schooled),'dopo qualche giorno l\'istruito lavora ancora in bottega');

console.log(fails?'ISTRUZIONE_FAIL '+fails:'ISTRUZIONE_OK');
process.exit(fails?1:0);
