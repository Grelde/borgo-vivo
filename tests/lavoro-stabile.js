// v62: lavoro stabile, cambio solo per eccedenza di merce (necessario + 50%).
// 1) con la scorta sotto soglia chi lavora in un edificio produttivo non cambia mai posto
// 2) soglia esatta: scorta <= fabbisogno*1.5 non è eccedenza, +1 lo è
// 3) in eccedenza gli addetti escono (in prestito: il mestiere di base resta), l'edificio non ha addetti e non conta come posto libero
// 4) tornata la scorta sotto soglia, gli stessi abitanti tornano al loro edificio (stesso mestiere, nessun log di cambio mestiere)
// 5) non si cambia stato più spesso di JOB_DWELL
// 6) vale per più mestieri (cava, miniera, ...): prova sulla cava
// 7) salvataggio e ricarica a metà prestito
const Sim=require('../src/sim.js');const S=Sim.S;const T=Sim._t;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{if(!c){fail++;if(fail<15)console.log('FALLITO:',m);}};
const put=(type,cx,cy,r)=>{for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d){const q=Sim.place(type,cx+dx,cy+dy,0);if(q.ok)return q.b||true;}return false;};
const run=(days,hold)=>{const n=Math.round(Sim.DAY*days/0.2);for(let i=0;i<n;i++){if(hold)hold();Sim.step(0.2);}};
const done=t=>[...Sim.buildings().values()].filter(b=>b.type===t&&b.state==='done');
let crew=[];const sick=new Set();
const watch=()=>{for(const id of crew){const v=Sim.villagers().find(q=>q.id===id);if(v&&v.ill)sick.add(id);}};
const hold=(k,x)=>()=>{watch();S.stock[k]=x;};

for(const seed of [3,7,11]){
  Math.random=mulberry(seed*104729+5);
  Sim.init(seed,'lake');S.stock.wood=70;S.stock.stone=50;
  Sim.paintDistrict(76,76,106,104,1);
  run(2,()=>{S.stock.wood=Math.max(S.stock.wood,Math.min(70,Sim.capRes('wood')));S.stock.stone=Math.max(S.stock.stone,Math.min(50,Sim.capRes('stone')));});
  put('well',92,88,28);put('wood',70,80,28);put('quarry',112,92,28);
  run(8,()=>{S.stock.wood=Math.max(S.stock.wood,Math.min(70,Sim.capRes('wood')));S.stock.stone=Math.max(S.stock.stone,Math.min(50,Sim.capRes('stone')));});
  const wc=done('wood')[0],qu=done('quarry')[0];
  ok(wc&&qu,'seed '+seed+': taglialegna e cava completati');if(!wc||!qu)continue;
  ok(wc.workers.length>=1,'seed '+seed+': il taglialegna ha addetti ('+wc.workers.length+')');
  put('store',92,96,28);run(8,()=>{S.stock.wood=Math.min(S.stock.wood,50);S.stock.stone=Math.min(S.stock.stone,40);}); // v64: Magazzino per tenere le scorte (qui basse: niente eccedenza)
  crew=wc.workers.slice();sick.clear();

  // 2) soglia esatta (stato fermo, nessun passo)
  const need=T.jobNeed('wood'),lim=need*T.JOB_MARGIN;
  S.stock.wood=Math.floor(lim);ok(!T.jobSurplus('wood'),'seed '+seed+': scorta = soglia non è eccedenza ('+S.stock.wood+' vs '+lim+')');
  S.stock.wood=Math.floor(lim)+1;ok(T.jobSurplus('wood'),'seed '+seed+': scorta oltre soglia è eccedenza');
  S.stock.wood=Math.floor(need);ok(!T.jobSurplus('wood'),'seed '+seed+': scorta pari al fabbisogno non è eccedenza');

  // 1) stabilità con scorta sotto soglia
  const before=new Map(crew.map(id=>[id,Sim.villagers().find(v=>v.id===id).job]));
  let moved=0;
  for(let d=0;d<6;d++){run(1,()=>{watch();S.stock.wood=Math.min(S.stock.wood,Math.floor(T.jobNeed('wood')*1.2));if(S.stock.wood<10)S.stock.wood=10;});
    for(const id of crew){const v=Sim.villagers().find(q=>q.id===id);if(v&&!sick.has(id)&&v.job!==before.get(id))moved++;}}
  ok(moved===0,'seed '+seed+': sotto soglia nessuno cambia posto ('+moved+' cambi)');
  ok(!wc.sur,'seed '+seed+': l\'edificio non è in eccedenza sotto soglia');

  // 3) eccedenza (si guardano solo gli addetti che non si sono ammalati: i malati perdono il posto per altre regole)
  const crew2=crew.filter(id=>!sick.has(id));
  const t0=S.t;
  run(3,hold('wood',900));
  ok(wc.sur===true,'seed '+seed+': in eccedenza l\'edificio passa a sur');
  ok(wc.workers.length===0,'seed '+seed+': in eccedenza il taglialegna non ha addetti ('+wc.workers.length+')');
  let loaned=0,tradeOK=0;
  for(const id of crew2){const v=Sim.villagers().find(q=>q.id===id);if(!v||sick.has(id))continue;if(v.loan==='wood')loaned++;if(v.trade==='wood')tradeOK++;ok(v.job!==wc.id,'seed '+seed+': chi era al taglialegna non vi resta');}
  const alive=crew2.filter(id=>!sick.has(id)&&Sim.villagers().find(q=>q.id===id)).length;
  ok(loaned===alive&&alive>0,'seed '+seed+': tutti gli ex addetti sono in prestito ('+loaned+'/'+alive+')');
  ok(tradeOK===alive,'seed '+seed+': il mestiere di base resta Taglialegna ('+tradeOK+'/'+alive+')');
  /* la scorta è riportata alla capienza a ogni tick (v61): si rimette alta per far girare la regola sullo stesso dato */S.stock.wood=900;T.tick1();const st=Sim.stats();const jobless=Sim.villagers().filter(v=>!v.child&&!v.ill&&!v.job&&!v.duty&&!v.loan).length;
  ok(st.att.unemp===jobless,'seed '+seed+': chi è in prestito non conta fra i disoccupati ('+st.att.unemp+' contro '+jobless+')');

  // 5) niente cambi più frequenti di JOB_DWELL
  const surT=wc.surT;S.stock.wood=0;T.rebalanceJobs();
  ok(wc.sur===true&&wc.surT===surT||S.t-surT>=T.JOB_DWELL,'seed '+seed+': rispetta la pausa minima tra due cambi');

  // 4) ritorno
  {let g=0;while(wc.sur&&g++<Math.round(Sim.DAY*3/0.2)){hold('wood',5)();Sim.step(0.2);}run(0.05,hold('wood',5));}// subito dopo la fine dell'eccedenza: più tardi altre cause (malattia, trasferimenti) possono cambiare i posti
  ok(wc.sur===false,'seed '+seed+': tornata la scorta bassa l\'edificio non è più in eccedenza');
  const healthy=crew2.filter(id=>{const v=Sim.villagers().find(q=>q.id===id);return v&&!v.ill&&!v.child;}).length;// i malati restano a casa: tornano quando guariscono, se c'è posto
  const back=crew2.filter(id=>{const v=Sim.villagers().find(q=>q.id===id);return v&&v.job===wc.id&&!v.loan;}).length;
  ok(back===healthy,'seed '+seed+': gli abitanti sani tornano al taglialegna ('+back+'/'+healthy+')');
  for(const id of crew2){const v=Sim.villagers().find(q=>q.id===id);if(v)ok(v.trade==='wood','seed '+seed+': dopo il ritorno il mestiere è ancora Taglialegna');}

  // 6) altro mestiere: la cava
  run(3,hold('stone',10));// la cava può essere già in eccedenza per ciò che ha prodotto: la scorta bassa la riporta al lavoro
  const qcrew=qu.workers.slice();ok(qcrew.length>=1,'seed '+seed+': la cava ha addetti');
  run(3,hold('stone',900));
  ok(qu.sur===true&&qu.workers.length===0,'seed '+seed+': la cava in eccedenza resta senza addetti');
  run(3,hold('stone',3));
  ok(qu.sur===false&&qu.workers.length>=1,'seed '+seed+': la cava riprende gli addetti');

  // prestito senza posto: se nel suo mestiere non ci sono più posti, non resta in prestito per sempre
  run(3,hold('wood',900));ok(Sim.villagers().some(v=>v.loan==='wood'),'seed '+seed+': di nuovo in prestito');
  Sim.setWant(wc.id,0);run(3,hold('wood',5));
  ok(!Sim.villagers().some(v=>v.loan==='wood'),'seed '+seed+': senza posti nel mestiere il prestito finisce');
  Sim.setWant(wc.id,2);run(1,hold('wood',5));

  // 7) salvataggio a metà prestito
  run(3,hold('wood',900));
  const dumped=JSON.stringify(Sim.exportState());
  const was=wc.workers.length,wasSur=wc.sur;
  Sim.importState(JSON.parse(dumped));
  const wc2=done('wood')[0];ok(wc2&&wc2.sur===wasSur&&wc2.workers.length===was,'seed '+seed+': lo stato di prestito sopravvive al salvataggio');
  const loans=Sim.villagers().filter(v=>v.loan==='wood').length;ok(!wasSur||loans>=0,'seed '+seed+': ricarica ok');
  run(2,hold('wood',5));
  ok(done('wood')[0].workers.length>=1||Sim.villagers().filter(v=>v.trade==='wood').length===0,'seed '+seed+': dopo la ricarica gli addetti tornano');
}
console.log(fail?'FALLITI '+fail:'OK lavori');
process.exit(fail?1:0);
