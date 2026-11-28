// v87.1: se muore un addetto di un mestiere produttivo (taglialegna...), qualcun altro prende il suo posto.
// Prima `dutyPass` liberava un adulto dai lavori di casa solo a edificio SENZA addetti: con 1 posto vuoto su 2 e nessun adulto libero
// il taglialegna restava a metà per sempre (caso seme 7).
// 1) senza erede e senza adulti liberi, morto 1 dei 2 taglialegna: il posto è ripreso entro 1 giorno (semi 3, 7, 11); idem con 2 morti
// 2) dopo la sostituzione le case riprendono i lavori domestici (il rilascio non è permanente)
// 3) un edificio che non è mai stato al completo non registra un posto perso (paese a corto di braccia: niente rilasci permanenti)
// 4) il posto perso conta solo per VAC_DAYS giorni e solo se mancano ancora addetti; `dutyPass` libera adulti solo finché conta
const Sim=require('../src/sim.js');const S=Sim.S;const T=Sim._t;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{if(!c){fail++;if(fail<15)console.log('FALLITO:',m);}};
const put=(type,cx,cy,r)=>{for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d){const q=Sim.place(type,cx+dx,cy+dy,0);if(q.ok)return q.b||true;}return false;};
const run=(days,hold)=>{const n=Math.round(Sim.DAY*days/0.2);for(let i=0;i<n;i++){if(hold)hold();Sim.step(0.2);}};
const done=t=>[...Sim.buildings().values()].filter(b=>b.type===t&&b.state==='done');
const freeAdults=()=>Sim.villagers().filter(v=>!v.job&&!v.duty&&!v.child&&!v.ill);
const keep=()=>{S.stock.stone=Math.max(S.stock.stone,50);S.stock.wood=Math.min(S.stock.wood,25);S.edicts.noImmig=true;};   // legna scarsa (niente eccedenza), niente arrivi

// paese con taglialegna al completo e nessun adulto libero (manodopera scarsa)
function setup(seed){
  Math.random=mulberry(seed*104729+5);
  Sim.init(seed,'lake');S.stock.wood=70;S.stock.stone=50;
  Sim.paintDistrict(76,76,106,104,1);
  run(2,()=>{S.stock.wood=Math.max(S.stock.wood,70);S.stock.stone=Math.max(S.stock.stone,50);});
  put('well',92,88,28);put('wood',70,80,28);put('quarry',112,92,28);
  run(8,()=>{S.stock.wood=Math.max(S.stock.wood,70);S.stock.stone=Math.max(S.stock.stone,50);});
  const wc=done('wood')[0];if(!wc)return null;
  S.stock.wood=20;run(0.2,keep);
  for(let i=0;i<2;i++){for(const v of freeAdults())T.killV(v,'left');run(0.25,keep);}
  return wc;
}
// morte senza erede: la casa non ha familiari a cui passare il posto
const killNoHeir=(wc,n)=>{for(const id of wc.workers.slice(0,n)){const v=Sim.villagers().find(q=>q.id===id);if(v){v.home=null;T.killV(v,'wolf');}}};
const dutyCount=()=>Sim.villagers().filter(v=>v.duty&&!v.child).length;

for(const seed of [3,7,11]){
  for(const n of [1,2]){
    const wc=setup(seed);ok(!!wc,'seed '+seed+': taglialegna completato');if(!wc)continue;
    ok(wc.workers.length>=n,'seed '+seed+': il taglialegna ha almeno '+n+' addetti prima ('+wc.workers.length+')');
    const want=wc.want;
    killNoHeir(wc,n);
    ok(wc.workers.length<want,'seed '+seed+' n='+n+': dopo la morte manca almeno un addetto');
    let back=null;for(let h=0;h<=12&&back===null;h++){if(wc.workers.length>=want)back=h/12;else run(1/12,keep);}
    ok(back!==null,'seed '+seed+' n='+n+': il posto è ripreso entro 1 giorno (addetti '+wc.workers.length+'/'+want+')');
    // 2) i lavori domestici riprendono: passato un po' di tempo gli adulti in dovere tornano numerosi
    if(back!==null){const d0=dutyCount();run(2,keep);const d1=dutyCount();ok(wc.workers.length>=want,'seed '+seed+' n='+n+': dopo 2 giorni il taglialegna è sempre al completo');
      ok(d1>=d0-2,'seed '+seed+' n='+n+': il rilascio non è permanente (dovere '+d0+' → '+d1+')');}
  }
}

// 3) mai al completo: nessun posto perso registrato
{
  const wc=setup(7);ok(!!wc,'prova 3: taglialegna completato');
  if(wc){
    wc.full=false;wc.vacT=undefined;killNoHeir(wc,1);run(1,keep);
    ok(wc.vacT===undefined&&!T.vacancyOpen(wc),'prova 3: un edificio mai al completo non registra un posto perso');
  }
}

// 4) finestra di VAC_DAYS e rilascio in dutyPass
{
  const wc=setup(7);ok(!!wc,'prova 4: taglialegna completato');
  if(wc){
    // porta il taglialegna a 1/2 senza che nessuno possa riempirlo subito (nessun adulto libero, tutti occupati)
    killNoHeir(wc,1);
    S.edicts.noImmig=true;
    wc.full=true;wc.vacT=S.t;wc.workers=wc.workers.slice(0,1);
    for(const v of Sim.villagers())if(v.job===wc.id&&!wc.workers.includes(v.id))v.job=null;
    ok(T.vacancyOpen(wc)===(wc.workers.length<wc.want),'prova 4: posto perso recente e mancano addetti: conta');
    wc.vacT=S.t-Sim.DAY*(T.VAC_DAYS+1);
    ok(!T.vacancyOpen(wc),'prova 4: oltre VAC_DAYS giorni non conta più');
    // dutyPass: con il posto perso scaduto non libera nessuno, con quello recente libera adulti
    for(const v of freeAdults()){v.duty=true;}
    T.dutyPass();const dExp=dutyCount();
    wc.vacT=S.t;T.dutyPass();const dFresh=dutyCount();
    ok(dFresh<dExp,'prova 4: con un posto perso recente dutyPass libera adulti ('+dExp+' → '+dFresh+')');
    wc.vacT=S.t;wc.workers=wc.workers.slice();const full=wc.want;
    while(wc.workers.length<full)wc.workers.push(-1);   // posti coperti: non conta
    ok(!T.vacancyOpen(wc),'prova 4: a edificio completo il posto perso non conta');
    wc.workers=wc.workers.filter(id=>id!==-1);
  }
}

console.log(fail?'FALLITI '+fail:'OK posti-vuoti');
process.exit(fail?1:0);
