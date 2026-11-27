// v46: regole dei cantieri. Il test è deterministico: Math.random viene sostituito da un generatore a seme fisso e la prova
// gira su più semi. Per ogni seme:
// 1) finché mancano materiali un cantiere ha al massimo 1 costruttore; coi materiali completi fino a 3
// 2) la costruzione non va mai più avanti dei materiali consegnati
// 3) chi non costruisce porta il materiale prima ai cantieri senza costruttore
// 4) più cantieri contemporanei: si completano tutti
// Sul totale dei semi: il costruttore va lui al magazzino a prendere i materiali per il suo cantiere (con molti portatori liberi
// può non servire, quindi si chiede almeno un caso su tutte le partite).
const Sim=require('../src/sim.js');const S=Sim.S;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0;const ok=(c,m)=>{if(!c){fail++;if(fail<12)console.log('FALLITO:',m);}};
const need=b=>{const c=b.cost||Sim.costOf(b.type);return (c.wood||0)+(c.stone||0)+(c.planks||0);};
const got=b=>b.got.wood+b.got.stone+(b.got.planks||0);
const ready=b=>{const c=b.cost||Sim.costOf(b.type);return b.got.wood>=c.wood&&b.got.stone>=c.stone&&b.got.planks>=(c.planks||0);};
const sites=()=>[...Sim.buildings().values()].filter(b=>b.state==='site');
const builders=id=>{let n=0;for(const v of Sim.villagers()){
  if((v.state==='build'||v.state==='toBuild')&&v.target===id)n++;
  else if((v.state==='toStore'||v.state==='toSite')&&v.task&&v.task.own&&v.task.site===id)n++;}return n;};
const put=(type,cx,cy,r)=>{for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d){const q=Sim.place(type,cx+dx,cy+dy,0);if(q.ok)return q.b||true;}return false;};
const RES=['wood','stone','planks'];
const outstanding=b=>{const c=b.cost||Sim.costOf(b.type);return {wood:(c.wood||0)-b.got.wood-b.fly.wood,stone:(c.stone||0)-b.got.stone-b.fly.stone,planks:(c.planks||0)-b.got.planks-b.fly.planks};};

function scenario(seed){
  Math.random=mulberry(seed*7919+13);
  Sim.init(seed,'lake');S.stock.wood=40;S.stock.stone=30;
  Sim.paintDistrict(76,76,106,104,1);
  for(let i=0;i<Sim.DAY*2/0.2;i++)Sim.step(0.2);
  S.stock.wood=Math.max(S.stock.wood,150);S.stock.stone=Math.max(S.stock.stone,120);// le case dei primi giorni possono aver consumato le scorte
  const mine=[['well',92,88],['plaza',100,96],['church',84,100],['school',96,102],['wood',70,80],['quarry',112,92]].map(([t,x,y])=>put(t,x,y,28)).filter(Boolean);
  const placed=mine.length;
  const r={seed,placed,maxIncomplete:0,maxReady:0,capViol:0,ownTrips:0,twoSites:0,checks:0,viol:[],sawIncompleteBuilder:0,done:0};
  const prev=new Map(),done=new Set();
  for(let i=0;i<Sim.DAY*10/0.2;i++){
    // stato prima del passo: per ogni cantiere i costruttori e il materiale ancora da portare, più le scorte
    const pre=new Map(sites().map(b=>[b.id,{nb:builders(b.id),out:outstanding(b)}]));
    const stockPre={wood:S.stock.wood,stone:S.stock.stone,planks:S.stock.planks};
    Sim.step(0.2);
    if(i%25===0){S.stock.wood=Math.max(S.stock.wood,30);S.stock.stone=Math.max(S.stock.stone,25);}
    const ss=sites();if(ss.length>=2)r.twoSites++;
    for(const b of ss){
      const nb=builders(b.id);
      if(ready(b))r.maxReady=Math.max(r.maxReady,nb);else{r.maxIncomplete=Math.max(r.maxIncomplete,nb);if(nb===1)r.sawIncompleteBuilder++;}
      if(b.prog>got(b)/need(b)+1e-6)r.capViol++;
    }
    // le decisioni di trasporto vengono prese nell'ordine degli abitanti: per ognuno si tiene conto dei carichi già presi e dei
    // costruttori già assegnati dagli abitanti che lo precedono nello stesso passo
    const claim=new Map(),used={wood:0,stone:0,planks:0},newB=new Map();
    for(const v of Sim.villagers()){
      const was=prev.get(v.id);prev.set(v.id,v.state);
      if((v.state==='build'||v.state==='toBuild')&&v.target&&was!=='build'&&was!=='toBuild')newB.set(v.target,(newB.get(v.target)||0)+1);
      if(!(v.state==='toStore'&&was!=='toStore'&&v.task))continue;
      const t=v.task,site=t.site;
      if(t.own)r.ownTrips++;
      else{
        r.checks++;
        const nbOf=id=>(pre.get(id)?pre.get(id).nb:0)+(newB.get(id)||0);
        if(nbOf(site)>0){
          const other=[...pre.keys()].find(id=>id!==site&&nbOf(id)===0&&RES.some(k=>pre.get(id).out[k]-((claim.get(id)||{})[k]||0)>0&&stockPre[k]-used[k]>0));
          if(other)r.viol.push({t:+S.t.toFixed(1),villager:v.id,scelto:site,senzaCostruttore:other,res:t.res});
        }
      }
      const cl=claim.get(site)||{wood:0,stone:0,planks:0};cl[t.res]++;claim.set(site,cl);used[t.res]++;
    }
    for(const b of Sim.buildings().values())if(b.state==='done')done.add(b.id);
  }
  const bs=Sim.buildings();r.done=mine.filter(b=>bs.get(b.id)&&bs.get(b.id).state==='done').length;r.left=placed-r.done;
  return r;
}

let ownTotal=0;
for(const seed of [2,3,4]){
  const r=scenario(seed);ownTotal+=r.ownTrips;
  console.log(`seme ${seed}: cantieri posati ${r.placed} | costruttori max: incompleto ${r.maxIncomplete}, completo ${r.maxReady} | viaggi propri ${r.ownTrips} | scelte di trasporto ${r.checks} (violazioni priorità ${r.viol.length}) | istanti con 2+ cantieri ${r.twoSites} | oltre i materiali ${r.capViol} | completati ${r.done} su ${r.placed}`);
  if(r.viol.length)console.log('  dettaglio:',JSON.stringify(r.viol.slice(0,3)));
  ok(r.maxIncomplete<=1,`seme ${seed}: cantiere incompleto con più di 1 costruttore (${r.maxIncomplete})`);
  ok(r.maxReady<=3,`seme ${seed}: cantiere completo con più di 3 costruttori (${r.maxReady})`);
  ok(r.capViol===0,`seme ${seed}: la costruzione ha superato i materiali consegnati ${r.capViol} volte`);
  ok(r.viol.length===0,`seme ${seed}: un non costruttore ha servito un cantiere con costruttore mentre ne aspettava uno senza`);
  ok(r.twoSites>0,`seme ${seed}: mai due cantieri contemporanei, prova non significativa`);
  ok(r.sawIncompleteBuilder>0,`seme ${seed}: mai visto un costruttore su un cantiere ancora incompleto`);
  ok(r.placed>=4,`seme ${seed}: scenario non valido, posati solo ${r.placed} edifici (mappa diversa?)`);
  ok(r.left===0,`seme ${seed}: ${r.left} dei cantieri posati dal test non sono stati completati`);
}
ok(ownTotal>0,'nessun costruttore è mai andato al magazzino per il suo cantiere (in nessuna delle partite)');
console.log('viaggi propri dei costruttori sul totale:',ownTotal);
console.log(fail?'ESITO: '+fail+' controlli falliti':'ESITO: tutti i controlli superati');
process.exit(fail?1:0);
